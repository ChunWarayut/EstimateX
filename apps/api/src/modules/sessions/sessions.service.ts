import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSessionDto, JoinDto, VoteDto } from './dto.js';
import { Prisma } from '@prisma/client';

function codeGen() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSessionDto) {
    const code = codeGen();
    const facilitatorSecret = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const session = await this.prisma.session.create({
      data: {
        code,
        title: dto.title,
        description: dto.description ?? null,
        facilitatorSecret,
        deck: dto.deck ? (dto.deck as unknown as Prisma.InputJsonValue) : undefined,
        roleDecks: dto.roleDecks ? (dto.roleDecks as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
    // Return secret to creator only once via creation response
    return { ...session, facilitatorSecret };
  }

  async getByCode(code: string) {
    const session = await this.prisma.session.findFirst({ where: { code } });
    if (!session) throw new NotFoundException('Session not found');
    // Do not leak facilitatorSecret in general GET
    const { facilitatorSecret, ...safe } = session as any;
    return safe;
  }

  async getFullByCode(code: string) {
    const session = await this.prisma.session.findFirst({ where: { code } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async join(code: string, dto: JoinDto) {
    const session = await this.getByCode(code);
    // create or reuse user by name+role within this session's scope by creating a vote holder later
    const user = await this.prisma.user.create({ data: { name: dto.name, role: dto.role } });
    return { sessionId: session.id, user };
  }

  async vote(code: string, dto: VoteDto) {
    const session = await this.getByCode(code);
    // Upsert by user+session
    const dimension = dto.dimension ?? 'point';
    const existing = await this.prisma.vote.findFirst({
      where: { sessionId: session.id, userId: dto.userId, dimension },
      orderBy: { createdAt: 'desc' },
    });
    const data: Prisma.VoteUncheckedCreateInput = {
      value: dto.value,
      userId: dto.userId,
      sessionId: session.id,
      hidden: true,
      dimension,
    };
    const vote = existing
      ? await this.prisma.vote.update({ where: { id: existing.id }, data })
      : await this.prisma.vote.create({ data });
    return vote;
  }

  async votes(code: string, includeHidden = false, dimension?: string) {
    const session = await this.getByCode(code);
    const raw = await this.prisma.vote.findMany({
      where: { sessionId: session.id, ...(includeHidden ? {} : { hidden: false }), ...(dimension ? { dimension } : {}) },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    // Deduplicate by userId (keep latest) to avoid duplicates from older records
    const seen = new Set<string>();
    const votes = [] as typeof raw;
    for (const v of raw) {
      const uid = (v as any).userId as string;
      if (!seen.has(uid)) {
        votes.push(v);
        seen.add(uid);
      }
    }

    // aggregate by role
    const byRole: Record<string, { count: number; avg: number; values: number[] }> = {};
    for (const v of votes) {
      const role = v.user.role;
      byRole[role] ??= { count: 0, avg: 0, values: [] };
      byRole[role].count += 1;
      byRole[role].values.push(v.value);
    }
    for (const k of Object.keys(byRole)) {
      const values = byRole[k].values;
      byRole[k].avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    }

    return { session, votes, stats: { byRole } };
  }

  async reveal(code: string) {
    const session = await this.prisma.session.findFirst({ where: { code } });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.vote.updateMany({ where: { sessionId: session.id }, data: { hidden: false } });
    return { ok: true };
  }

  async clear(code: string) {
    const session = await this.prisma.session.findFirst({ where: { code } });
    if (!session) throw new NotFoundException('Session not found');
    await this.prisma.vote.deleteMany({ where: { sessionId: session.id } });
    return { ok: true };
  }

  validateFacilitator(session: { facilitatorSecret?: string | null } | null, secret?: string) {
    if (!session) throw new NotFoundException('Session not found');
    const s = session.facilitatorSecret ?? null;
    if (!s) {
      // Backward compatibility: sessions created before facilitator feature
      return;
    }
    if (!secret || secret !== s) {
      throw new ForbiddenException('Invalid facilitator secret');
    }
  }
}
