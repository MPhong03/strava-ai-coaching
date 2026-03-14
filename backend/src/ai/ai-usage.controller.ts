import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiUsageService } from './ai-usage.service';

@Controller('ai/usage')
@UseGuards(AuthGuard('jwt'))
export class AiUsageController {
  constructor(private aiUsageService: AiUsageService) {}

  @Get()
  async getUsage(@Request() req: any) {
    const userId = BigInt(req.user.userId);
    return this.aiUsageService.getUsageStats(userId);
  }
}
