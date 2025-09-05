import { OnModuleDestroy } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from './sessions.service.js';

type PresenceUser = { id: string; name: string; role: string };

@WebSocketGateway({ cors: true, namespace: '/sessions' })
export class SessionsGateway implements OnModuleDestroy, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private presence = new Map<string, Map<string, PresenceUser>>(); // code -> socketId -> user
  private socketRoom = new Map<string, string>(); // socketId -> code

  constructor(private sessions: SessionsService) {}

  onModuleDestroy() {
    this.presence.clear();
  }

  private broadcastPresence(code: string) {
    const values = Array.from(this.presence.get(code)?.values() ?? []);
    // Deduplicate by user.id in case multiple sockets for same user
    const map = new Map<string, PresenceUser>();
    for (const u of values) {
      if (u?.id && !map.has(u.id)) map.set(u.id, u);
    }
    const list = Array.from(map.values());
    this.server.to(code).emit('presence:update', { code, users: list });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() payload: { code: string; user: PresenceUser },
    @ConnectedSocket() client: Socket,
  ) {
    const { code, user } = payload;
    client.join(code);
    const room = this.presence.get(code) ?? new Map();
    room.set(client.id, user);
    this.presence.set(code, room);
    this.socketRoom.set(client.id, code);
    this.broadcastPresence(code);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @MessageBody() payload: { code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { code } = payload;
    client.leave(code);
    const room = this.presence.get(code);
    if (room) {
      room.delete(client.id);
      this.broadcastPresence(code);
    }
    this.socketRoom.delete(client.id);
  }

  handleDisconnect(client: Socket) {
    const code = this.socketRoom.get(client.id);
    if (!code) return;
    const room = this.presence.get(code);
    if (room && room.has(client.id)) {
      room.delete(client.id);
      this.broadcastPresence(code);
    }
    this.socketRoom.delete(client.id);
  }

  @SubscribeMessage('vote')
  async handleVote(
    @MessageBody() payload: { code: string; userId: string; value: number; dimension?: string },
  ) {
    const v = await this.sessions.vote(payload.code, { userId: payload.userId, value: payload.value, dimension: payload.dimension } as any);
    // Broadcast updated votes and who voted for live feedback
    this.server.to(payload.code).emit('votes:update', { code: payload.code, voteId: v.id, userId: v.userId, dimension: v.dimension });
  }

  @SubscribeMessage('reveal')
  async handleReveal(@MessageBody() payload: { code: string; secret?: string }) {
    const session = await this.sessions.getFullByCode(payload.code);
    this.sessions.validateFacilitator(session, payload.secret);
    await this.sessions.reveal(payload.code);
    this.server.to(payload.code).emit('votes:reveal', { code: payload.code });
  }

  @SubscribeMessage('clear')
  async handleClear(@MessageBody() payload: { code: string; secret?: string }) {
    const session = await this.sessions.getFullByCode(payload.code);
    this.sessions.validateFacilitator(session, payload.secret);
    await this.sessions.clear(payload.code);
    this.server.to(payload.code).emit('votes:clear', { code: payload.code });
  }
}
