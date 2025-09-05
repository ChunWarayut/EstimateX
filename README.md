EstimateX – Role-based Planning Poker

Tech Stack
- Frontend: Next.js 14 + TailwindCSS (Gradient + Glow + Glassmorphism), Google Font: Prompt
- Backend: NestJS + Prisma (MongoDB)

Monorepo
- apps/web – Next.js app
- apps/api – NestJS API + Prisma schema

Quick Start
1) Create .env files
- apps/api/.env
  - DATABASE_URL=mongodb connection string
  - PORT=4000
- apps/web/.env
  - NEXT_PUBLIC_API_URL=http://localhost:4000

2) Install deps and generate Prisma client
   pnpm install
   pnpm --filter @estimatex/api prisma:generate
   pnpm --filter @estimatex/api prisma:push

3) Run dev servers
   pnpm dev:api
   pnpm dev:web

API Endpoints
- POST /sessions { title, description? } -> { id, code, ... }
- GET  /sessions/:code -> session
- POST /sessions/:code/join { name, role } -> { user, sessionId }
- POST /sessions/:code/vote { userId, value }
- GET  /sessions/:code/votes?includeHidden=true -> { votes, stats.byRole }
- POST /sessions/:code/reveal -> set hidden=false
- POST /sessions/:code/clear -> delete votes

Notes
- Votes aggregate by role with counts and averages.
- Frontend polls every 2.5s (simple, can upgrade to WebSocket later).
- Tailwind theme includes glassmorphism, gradient background, and glow shadow.
- Basic SEO: metadata, OpenGraph, robots.txt, sitemap.xml.

