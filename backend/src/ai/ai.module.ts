import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiUsageController } from './ai-usage.controller';
import { InsightService } from './insight.service';
import { GeminiApiService } from './gemini-api.service';
import { AiUsageService } from './ai-usage.service';

@Module({
  controllers: [AiController, AiUsageController],
  providers: [InsightService, GeminiApiService, AiUsageService],
  exports: [InsightService, GeminiApiService],
})
export class AiModule {}
