import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('performance')
  async getPerformanceReport(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('generate') generate?: string,
  ) {
    const userId = BigInt(req.user.userId);
    return this.reportsService.getPerformanceReport(
      userId,
      startDate,
      endDate,
      generate === 'true',
    );
  }
}
