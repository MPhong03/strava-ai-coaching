import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { ActivitiesModule } from '../activities/activities.module';
import { JournalModule } from '../journal/journal.module';
import { UserModule } from '../user/user.module';
import { ReportsModule } from '../reports/reports.module';
import { ActivitySyncService } from '../activities/activity-sync.service';
import { StravaApiService } from '../strava/strava-api.service';
import { JournalService } from '../journal/journal.service';
import { UserService } from '../user/user.service';
import { ReportsService } from '../reports/reports.service';

@Module({
  imports: [AiModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ActivitySyncService,
    StravaApiService,
    JournalService,
    UserService,
    ReportsService,
  ],
})
export class ChatModule {}
