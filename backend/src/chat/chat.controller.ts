import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Sse,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';
import { Observable, map, filter } from 'rxjs';
import type { Response } from 'express';

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
    return this.chatService.getHistory(
      BigInt(sessionId),
      Number(page),
      Number(limit),
    );
  }

  @Post('message')
  async sendMessage(
    @Request() req: any,
    @Body() body: { sessionId: string; message: string; model?: string },
    @Res() res: Response,
  ) {
    const userId = BigInt(req.user.userId);

    // Thiết lập header cho Streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    try {
      await this.chatService.sendMessage(
        userId,
        BigInt(body.sessionId),
        body.message,
        (chunk) => {
          res.write(chunk); // Gửi từng phần về client
        },
        body.model,
      );
      res.end(); // Kết thúc stream
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).send(error.message);
      } else {
        res.end();
      }
    }
  }

  @Sse('status/:sessionId')
  status(@Request() req: any): Observable<any> {
    const sessionId = req.params.sessionId;
    return this.chatService.status$.asObservable().pipe(
      filter((event) => event.sessionId === sessionId),
      map((event) => ({
        data: { status: event.status, toolName: event.toolName },
      })),
    );
  }
}
