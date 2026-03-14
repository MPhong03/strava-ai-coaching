import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const chatTools: FunctionDeclaration[] = [
  {
    name: 'get_activities',
    description: 'Get a list of running activities for the user with optional date filtering.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: SchemaType.STRING, description: 'End date in YYYY-MM-DD format' },
        page: { type: SchemaType.NUMBER, description: 'Page number for pagination' },
        limit: { type: SchemaType.NUMBER, description: 'Number of items per page' },
      }
    },
  },
  {
    name: 'get_profile',
    description: 'Get the user profile information, including goals and health preferences.',
  },
  {
    name: 'update_today_journal',
    description: 'Update the daily journal for today with nutrition, feelings, or extra workouts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: { type: SchemaType.STRING, description: 'The content of the journal entry' },
      },
      required: ['content']
    },
  },
  {
    name: 'get_daily_journal',
    description: 'Read the daily journal for a specific date.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'Date in YYYY-MM-DD format' },
      },
      required: ['date']
    },
  },
  {
    name: 'sync_recent',
    description: 'Trigger a synchronization of the most recent activities from Strava.',
  },
  {
    name: 'get_performance_report',
    description: 'Get an aggregated performance report for a specific date range.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        startDate: { type: SchemaType.STRING, description: 'Start date in YYYY-MM-DD format' },
        endDate: { type: SchemaType.STRING, description: 'End date in YYYY-MM-DD format' },
      }
    },
  },
  {
    name: 'update_profile_preferences',
    description: 'Update user goals, body stats, or other preferences.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        preferences: { 
          type: SchemaType.ARRAY, 
          description: 'Array of preference objects with id, key, and value',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
              key: { type: SchemaType.STRING },
              value: { type: SchemaType.STRING },
            }
          }
        },
      },
      required: ['preferences']
    },
  }
];
