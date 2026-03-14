import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InsightService } from './insight.service';

@Controller('activities')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private insightService: InsightService) {}

  @Get(':id/insight')
  async getInsight(
    @Param('id') id: string, 
    @Request() req: any,
    @Query('generate') generate?: string
  ) {
    const userId = BigInt(req.user.userId);
    const activityId = BigInt(id);
    return this.insightService.getInsight(activityId, userId, generate === 'true');
  }
}
