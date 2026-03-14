# Implementation Plan: AI Coach Dashboard

**Branch**: `001-ai-coach-dashboard` | **Date**: 2026-03-14 | **Spec**: `/specs/001-ai-coach-dashboard/spec.md`
**Input**: Feature specification from `/specs/001-ai-coach-dashboard/spec.md`

## Summary

The AI Coach Dashboard is a running club intelligence platform designed to help runners analyze their performance. It integrates with Strava via OAuth2 to sync activity data (specifically runs), stores this data in Azure SQL, and leverages Gemini AI to provide personalized coaching insights. The system uses a modern 3-tier architecture with a NestJS backend and a ReactJS frontend.

## Technical Context

**Language/Version**: TypeScript (NestJS 10+, React 18+)
**Primary Dependencies**: 
- Backend: `@nestjs/common`, `@prisma/client`, `strava-v3` (or direct axios), `@google/generative-ai`
- Frontend: `react`, `react-query`, `zustand`, `recharts`, `tailwindcss`
**Storage**: Azure SQL (Managed Instance/Database) using Prisma ORM
**Testing**: Jest for Unit/Integration, Playwright for E2E
**Target Platform**: Azure (Static Web Apps for Frontend, App Service for Backend)
**Project Type**: Web Application (Dashboard/SaaS)
**Performance Goals**: 
- Dashboard load: < 2s
- Strava sync (10 activities): < 5s
- Gemini insight generation: < 8s
- API response time: < 300ms (p95)
**Constraints**: 
- AES-256 encryption for OAuth tokens
- HTTPS only (TLS 1.2+)
- Strava rate limits: 200 req / 15 min
- Row-level security for user data
**Scale/Scope**: 50 users (Beta) | 500 users (Scale)

## Constitution Check

*GATE: PASSED*

1. **Security First**: AES-256-GCM encryption for all sensitive tokens (Strava Access/Refresh). Azure Key Vault for secret management. Verified in Data Model and Research.
2. **Performance SLA**: Polling with `after` timestamp and `per_page=200` ensures minimal sync time. Dashboard uses React Query for efficient caching.
3. **Reliability**: Graceful degradation handled via Gemini fallback (raw data display) and Strava error handling.
4. **Data Integrity**: Idempotent sync logic using `strava_activity_id` UNIQUE constraint in Azure SQL. Verified in Data Model.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-coach-dashboard/
├── spec.md           # Original SRS
├── plan.md           # This document
├── research.md       # Research findings (Phase 0)
├── data-model.md     # Entity definitions (Phase 1)
├── quickstart.md     # Setup instructions (Phase 1)
└── contracts/        # API/Interface definitions (Phase 1)
```

## Phase 0: Research & Outline

1. **Research Task: Strava OAuth2 & API**: Verify exact scopes needed (`activity:read_all`, `profile:read_all`) and token refresh flow.
2. **Research Task: Gemini Prompt Engineering**: Design the prompt for "3-block insights" (Praise, Improvement, Warning) and verify JSON response format.
3. **Research Task: Azure SQL + Prisma**: Best practices for Azure SQL connection strings and migrations.
4. **Research Task: AES-256 in NestJS**: Identify preferred library for encryption/decryption of tokens.
5. **Research Task: Polling vs Webhooks**: Confirm if polling is sufficient or if Strava Webhooks are preferred for real-time updates (SRS mentions Polling).

## Phase 1: Design & Contracts

1. **Data Model**: Define `User`, `Activity`, `Insight`, `Token` entities.
2. **API Contracts**: Define `/auth/strava`, `/activities`, `/ai/insights` endpoints.
3. **Agent Context**: Update with NestJS, Prisma, and Azure details.

## Phase 2: Implementation (Summary)

1. Scaffold NestJS & React.
2. Implement Strava OAuth2.
3. Data Sync module.
4. Dashboard UI development.
5. Gemini AI integration.
6. Reports & Analytics.
7. Testing & Launch.
