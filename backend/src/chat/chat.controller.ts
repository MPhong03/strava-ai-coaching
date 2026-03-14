import { Controller, Get, Post, Body, Query, UseGuards, Request, Sse } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { Observable, map, filter } from 'rxjs';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('session')
  async getSession(@Request() req: any) {
    const userId = BigInt(req.user.userId);
    return this.chatService.getSession(userId);
  }

  @Get('history')
  async getHistory(
    @Query('sessionId') sessionId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.chatService.getHistory(BigInt(sessionId), Number(page), Number(limit));
  }

  @Post('message')
  async sendMessage(
    @Request() req: any,
    @Body() body: { sessionId: string; message: string },
  ) {
    const userId = BigInt(req.user.userId);
    return this.chatService.sendMessage(userId, BigInt(body.sessionId), body.message);
  }

  @Sse('status/:sessionId')
  status(@Request() req: any): Observable<any> {
    const sessionId = req.params.sessionId;
    return this.chatService.status$.asObservable().pipe(
      filter(event => event.sessionId === sessionId),
      map(event => ({ data: { status: event.status, toolName: event.toolName } }))
    );
  }
}
