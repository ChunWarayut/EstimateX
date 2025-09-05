import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { CreateSessionDto, JoinDto, VoteDto } from './dto.js';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @Get(':code')
  get(@Param('code') code: string) {
    return this.sessions.getByCode(code);
  }

  @Post(':code/join')
  join(@Param('code') code: string, @Body() dto: JoinDto) {
    return this.sessions.join(code, dto);
  }

  @Post(':code/vote')
  vote(@Param('code') code: string, @Body() dto: VoteDto) {
    return this.sessions.vote(code, dto);
  }

  @Get(':code/votes')
  votes(@Param('code') code: string, @Query('includeHidden') includeHidden?: string) {
    return this.sessions.votes(code, includeHidden === 'true');
  }

  @Post(':code/reveal')
  reveal(@Param('code') code: string, @Headers('x-facilitator-secret') secret?: string) {
    return this.sessions.getFullByCode(code).then((full) => {
      this.sessions.validateFacilitator(full, secret);
      return this.sessions.reveal(code);
    });
  }

  @Post(':code/clear')
  clear(@Param('code') code: string, @Headers('x-facilitator-secret') secret?: string) {
    return this.sessions.getFullByCode(code).then((full) => {
      this.sessions.validateFacilitator(full, secret);
      return this.sessions.clear(code);
    });
  }
}
