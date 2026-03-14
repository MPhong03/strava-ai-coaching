# Research: AI Coach Dashboard

## Decision Log

### Decision: Strava OAuth2 & API Scopes
- **Choice**: Use `activity:read_all` and `profile:read_all`.
- **Rationale**: `activity:read_all` is required to see private activities and detailed metrics (HR, Cadence). `profile:read_all` allows access to athlete profile details.
- **Refresh Flow**: Access tokens expire in 6 hours. The system must check `expires_at` before each API call and refresh if needed. The *new* refresh token returned by Strava must always replace the old one in the database.

### Decision: Gemini Prompt Engineering for "3-Block Insights"
- **Choice**: Use Gemini 1.5 Pro or Flash with `response_mime_type: "application/json"` and a structured JSON schema.
- **Rationale**: Ensures deterministic output that the backend can parse reliably.
- **Prompt Structure**:
  - Persona: Senior Running Coach.
  - Block 1: **Praise** (What went well, focus on metrics like Pace/HR stability).
  - Block 2: **Improvement** (Where to focus next, e.g., Cadence, Zone 2 consistency).
  - Block 3: **Warning** (Potential injury risks or overtraining detection).

### Decision: Token Encryption (AES-256-GCM)
- **Choice**: Node.js `crypto` module using `aes-256-gcm`.
- **Rationale**: GCM provides both encryption and integrity (authentication tag).
- **Format**: Store in database as a string: `iv:authTag:encryptedText`.
- **Key Storage**: 32-byte master key stored in Azure Key Vault (accessed via environment variable).

### Decision: Azure SQL + Prisma Configuration
- **Choice**: Standard JDBC-style connection string with mandatory `encrypt=true`.
- **Rationale**: Azure SQL requires encrypted connections.
- **Connection String**: `sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password={<pass>};encrypt=true;trustServerCertificate=false;loginTimeout=30;`

### Decision: Incremental Activity Sync
- **Choice**: Polling with `after` timestamp parameter + `per_page=200`.
- **Rationale**: Polling is requested in SRS. Using `after` ensures we only fetch new data since the last successful sync.
- **Scaling**: For POC, polling on dashboard load is fine. For production, a background job (e.g., NestJS Cron or Azure Function) is recommended.

## Alternatives Considered

- **Strava Webhooks**: Better for real-time but more complex to setup (requires public endpoint + validation). Postponed to Phase 2.
- **PostgreSQL**: Considered but Azure SQL is the client's preferred choice for compliance and existing infrastructure.
- **OpenAI GPT-4o**: High performance but Gemini is chosen for cost-effectiveness and integration with Google ecosystem.

## Needs Clarification (Resolved)
- **Q**: How to handle missing HR data?
- **A**: (From SRS) Fallback to Pace and Cadence analysis. The Gemini prompt will include a "data_quality" flag to indicate missing metrics.
- **Q**: Strava Rate Limits?
- **A**: 100 requests per 15 mins (Default). We will implement a simple throttle/cache to avoid hitting this during demo.
