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
    const existing = await this.prisma.vote.findFirst({
      where: { sessionId: session.id, userId: dto.userId },
    });
    const data: Prisma.VoteUncheckedCreateInput = {
      value: dto.value,
      userId: dto.userId,
      sessionId: session.id,
      hidden: true,
    };
    const vote = existing
      ? await this.prisma.vote.update({ where: { id: existing.id }, data })
      : await this.prisma.vote.create({ data });
    return vote;
  }

  async votes(code: string, includeHidden = false) {
    const session = await this.getByCode(code);
    const votes = await this.prisma.vote.findMany({
      where: { sessionId: session.id, ...(includeHidden ? {} : { hidden: false }) },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

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

  validateFacilitator(session: { facilitatorSecret?: string } | null, secret?: string) {
    if (!session) throw new NotFoundException('Session not found');
    if (!secret || secret !== session.facilitatorSecret) {
      throw new ForbiddenException('Invalid facilitator secret');
    }
  }
}
