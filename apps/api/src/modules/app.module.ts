import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionsModule } from './sessions/sessions.module.js';

@Module({
  imports: [
    SessionsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
