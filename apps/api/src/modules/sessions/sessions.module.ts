import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { SessionsController } from './sessions.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionsGateway } from './sessions.gateway.js';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService, SessionsGateway],
})
export class SessionsModule {}
