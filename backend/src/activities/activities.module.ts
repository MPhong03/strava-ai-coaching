import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitySyncService } from './activity-sync.service';
import { StravaApiService } from '../strava/strava-api.service';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitySyncService, StravaApiService],
})
export class ActivitiesModule {}
