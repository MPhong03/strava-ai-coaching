# Quickstart: AI Coach Dashboard

## Prerequisites
- Node.js 20+
- Docker (for local SQL Server) or Azure SQL instance
- Strava Developer Account (Client ID & Secret)
- Google Cloud Project with Gemini API enabled

## 1. Environment Setup
Create a `.env` file in the root directory:

```bash
# General
NODE_ENV=development
PORT=3000

# Database (Prisma)
DATABASE_URL="sqlserver://localhost:1433;database=ai_coach;user=SA;password={Password123!};encrypt=true;trustServerCertificate=true;"

# Security (AES-256)
ENCRYPTION_KEY=32_BYTE_HEX_STRING_HERE # Example: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
JWT_SECRET=YOUR_SECURE_JWT_SECRET

# Strava
STRAVA_CLIENT_ID=YOUR_CLIENT_ID
STRAVA_CLIENT_SECRET=YOUR_CLIENT_SECRET
STRAVA_REDIRECT_URI=http://localhost:3000/auth/strava/callback

# Google AI
GOOGLE_AI_API_KEY=YOUR_GEMINI_API_KEY
```

## 2. Installation
```bash
npm install
```

## 3. Database Initialization
```bash
npx prisma migrate dev --name init
```

## 4. Run the Application
```bash
npm run start:dev
```

## 5. First Sync
1. Open `http://localhost:3000` in your browser (once frontend is ready).
2. Click "Connect with Strava".
3. Authorize the application.
4. Your dashboard will automatically fetch your last 10 activities and display AI-powered insights.
