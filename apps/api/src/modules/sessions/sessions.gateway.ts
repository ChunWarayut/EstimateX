import { OnModuleDestroy } from '@nestjs/common';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionsService } from './sessions.service.js';

type PresenceUser = { id: string; name: string; role: string };

@WebSocketGateway({ cors: true, namespace: '/sessions' })
export class SessionsGateway implements OnModuleDestroy {
  @WebSocketServer() server!: Server;

  private presence = new Map<string, Map<string, PresenceUser>>(); // code -> socketId -> user

  constructor(private sessions: SessionsService) {}

  onModuleDestroy() {
    this.presence.clear();
  }

  private broadcastPresence(code: string) {
    const list = Array.from(this.presence.get(code)?.values() ?? []);
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
  }

  @SubscribeMessage('vote')
  async handleVote(
    @MessageBody() payload: { code: string; userId: string; value: number },
  ) {
    const v = await this.sessions.vote(payload.code, { userId: payload.userId, value: payload.value } as any);
    // Broadcast updated votes (hidden/visible logic handled by client via GET or by reveal event)
    this.server.to(payload.code).emit('votes:update', { code: payload.code, voteId: v.id });
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

