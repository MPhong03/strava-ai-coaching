import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiUsageController } from './ai-usage.controller';
import { InsightService } from './insight.service';
import { GeminiApiService } from './gemini-api.service';
import { AiUsageService } from './ai-usage.service';
import { GeminiLoadBalancer } from './gemini-load-balancer.service';

@Module({
  controllers: [AiController, AiUsageController],
  providers: [
    InsightService,
    GeminiApiService,
    AiUsageService,
    GeminiLoadBalancer,
  ],
  exports: [InsightService, GeminiApiService, GeminiLoadBalancer],
})
export class AiModule {}
