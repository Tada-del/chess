# RoyalSquare Chess Platform

RoyalSquare is a full-stack chess website with:

- Chess.com-inspired interface and animations
- Bot play with AI selector (`Stockfish`, `Claude`, `Gemini`, `Copilot`, `ChatGPT`, `DeepSeek` personas)
- Stockfish strength slider from **100 to 3200 Elo** in 100-point increments
- Opening variation detection (ECO + opening name)
- Undo + premove support
- Game review labeling: **brilliant, great, best, excellent, good, inaccuracy, mistake, blunder**
- Friend system + challenges + live match rooms
- Bullet / Blitz / Rapid / Classical time controls
- Account signup + Gmail/SMTP email verification + Google OAuth login
- Admin dashboard with account and activity overview

## Tech Stack

- Next.js App Router + custom Node server
- Socket.IO for live matches
- Prisma + SQLite (swap to Postgres for production)
- NextAuth for auth
- Stockfish.js engine integration

## Quick Start

1. Install deps

```bash
npm install
```

2. Configure environment

Create `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-long-random-secret"

# Google OAuth (optional but recommended)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# SMTP for verification links (recommended)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-gmail@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="RoyalSquare <your-gmail@gmail.com>"
```

3. Run DB migration

```bash
npx prisma migrate dev --name init
```

4. Run app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Deployment (public link)

Use Render/Railway/Fly.io with Node server support.

### Render example

- Build command: `npm install && npm run build && npx prisma migrate deploy`
- Start command: `npm run start`
- Environment: set values from `.env.local` (use hosted Postgres instead of SQLite)
- Expose port from `$PORT`

### Postgres in production

Update `DATABASE_URL` to managed Postgres URL and run:

```bash
npx prisma migrate deploy
```

## Admin Access

The first account starts as `USER` role. Promote manually:

```bash
npx prisma studio
```

Set user `role` to `ADMIN`.

## Important Notes

- Review labels are chess.com-style inspired categories based on engine centipawn loss and tactical heuristics.
- "Claude/Gemini/Copilot/ChatGPT/DeepSeek" are style personalities powered by Stockfish strength/profile tuning.
- For high traffic deployment, use Redis for room state + Postgres for persistent storage.
