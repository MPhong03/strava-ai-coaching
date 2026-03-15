import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JournalService } from './journal.service';

@Controller('journal')
@UseGuards(AuthGuard('jwt'))
export class JournalController {
  constructor(private journalService: JournalService) {}

  @Get()
  async getJournal(@Request() req: any, @Query('date') date: string) {
    const userId = BigInt(req.user.userId);
    return this.journalService.getJournal(userId, date);
  }

  @Post()
  async upsertJournal(
    @Request() req: any,
    @Body() body: { date: string; content: string },
  ) {
    const userId = BigInt(req.user.userId);
    return this.journalService.upsertJournal(userId, body.date, body.content);
  }
}
