# Data Model: AI Coach Dashboard

## Overview
This document defines the core entities and their relationships for the AI Coach Dashboard. We use **Prisma ORM** with **Azure SQL**.

## Entities

### User
Represents a runner registered in the system.
- `id`: `BigInt` (PK, Identity)
- `email`: `String` (Unique)
- `name`: `String`
- `strava_athlete_id`: `BigInt` (Unique)
- `profile_picture`: `String` (URL)
- `created_at`: `DateTime` (Default: now)

### StravaToken
Stores encrypted OAuth2 tokens for Strava API access.
- `id`: `BigInt` (PK, Identity)
- `user_id`: `BigInt` (FK -> User.id, Unique)
- `access_token`: `String` (Encrypted: iv:authTag:cipher)
- `refresh_token`: `String` (Encrypted: iv:authTag:cipher)
- `expires_at`: `DateTime` (Unix timestamp converted to DateTime)
- `updated_at`: `DateTime` (Updated on setiap refresh)

### Activity
Stores run activity data fetched from Strava.
- `id`: `BigInt` (PK, Identity)
- `strava_activity_id`: `BigInt` (Unique, index)
- `user_id`: `BigInt` (FK -> User.id)
- `name`: `String`
- `type`: `String` (Filtered to 'Run')
- `start_date`: `DateTime`
- `distance`: `Float` (meters)
- `moving_time`: `Int` (seconds)
- `average_speed`: `Float` (m/s)
- `max_speed`: `Float` (m/s)
- `average_heartrate`: `Float` (optional)
- `max_heartrate`: `Float` (optional)
- `average_cadence`: `Float` (optional)
- `total_elevation_gain`: `Float`
- `suffer_score`: `Int` (optional)
- `raw_json`: `String` (Max length, for future-proofing)
- `synced_at`: `DateTime` (Default: now)

### Insight
Stores AI-generated coaching insights for a specific activity.
- `id`: `BigInt` (PK, Identity)
- `activity_id`: `BigInt` (FK -> Activity.id, Unique)
- `user_id`: `BigInt` (FK -> User.id)
- `praise`: `String` (Rich text/Markdown)
- `improvement`: `String` (Rich text/Markdown)
- `warning`: `String` (Rich text/Markdown)
- `created_at`: `DateTime` (Default: now)

## Relationships
- **User (1:1) StravaToken**: Every user has one set of tokens.
- **User (1:N) Activity**: One user can have many activities.
- **Activity (1:1) Insight**: Each activity has at most one AI insight.
- **User (1:N) Insight**: One user can have many insights across different activities.
