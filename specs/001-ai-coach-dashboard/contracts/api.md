# API Contract: AI Coach Dashboard

## Authentication

### POST `/auth/strava/callback`
Exchanges the Strava authorization code for access and refresh tokens.
- **Request Body**:
  ```json
  {
    "code": "string",
    "scope": "string"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "number",
      "name": "string",
      "email": "string"
    },
    "token": "JWT_TOKEN"
  }
  ```

---

## Activities

### GET `/activities`
Returns a paginated list of synced activities for the authenticated user.
- **Query Parameters**:
  - `page`: `number` (Default: 1)
  - `limit`: `number` (Default: 10)
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "number",
        "strava_activity_id": "number",
        "name": "string",
        "type": "Run",
        "start_date": "ISO_DATE",
        "distance": "number",
        "moving_time": "number",
        "average_speed": "number",
        "average_heartrate": "number",
        "average_cadence": "number",
        "total_elevation_gain": "number",
        "suffer_score": "number"
      }
    ],
    "meta": {
      "total": "number",
      "page": "number",
      "last_page": "number"
    }
  }
  ```

### POST `/activities/sync`
Manually triggers a sync with Strava API for new activities.
- **Response (202 Accepted)**:
  ```json
  {
    "message": "Sync started",
    "job_id": "string"
  }
  ```

---

## Insights

### GET `/activities/:id/insight`
Returns the coaching insight for a specific activity. Generates it if it doesn't exist.
- **Path Parameter**: `id` (Activity ID)
- **Response (200 OK)**:
  ```json
  {
    "activity_id": "number",
    "praise": "string (Markdown)",
    "improvement": "string (Markdown)",
    "warning": "string (Markdown)",
    "created_at": "ISO_DATE"
  }
  ```
- **Error (404 Not Found)**: Activity not found or not owned by user.
- **Error (503 Service Unavailable)**: Gemini API failure.

### GET `/reports/monthly`
Returns a monthly summary of running performance and AI-generated trend analysis.
- **Query Parameters**:
  - `month`: `number` (1-12)
  - `year`: `number`
- **Response (200 OK)**:
  ```json
  {
    "month": 3,
    "year": 2026,
    "total_distance": 120500,
    "total_moving_time": 43200,
    "avg_pace": 5.4,
    "trend_insight": "string (Markdown)"
  }
  ```
