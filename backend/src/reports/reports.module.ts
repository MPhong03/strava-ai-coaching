import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GeminiApiService } from '../ai/gemini-api.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, GeminiApiService],
})
export class ReportsModule {}
