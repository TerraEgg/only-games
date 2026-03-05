# OnlyGames

A modern, clean gaming platform built with **Next.js 14**, **Prisma**, and **Vercel Postgres**.

## Features

- **Category-based game browsing** — action, puzzle, racing, sports, etc.
- **Full-text search** with category filtering and pagination
- **User authentication** — username/password sign-up and sign-in
- **Admin dashboard** — manage users, games, categories, and view analytics
  - Ban / unban users (persistent cookie-based ban survives logout)
  - Reset user passwords
  - Add / edit / delete games and categories
  - Live user tracking — IP, device info, screen size, geolocation per session
- **Play tracking** — records which games users play, device details, and approximate location
- **Responsive dark-mode UI** — works on desktop, tablet, and mobile

## Tech Stack

| Layer      | Technology                  |
| ---------- | --------------------------- |
| Framework  | Next.js 14 (App Router)     |
| Database   | Vercel Postgres (Neon)      |
| ORM        | Prisma                      |
| Auth       | NextAuth.js v4 (JWT)        |
| Styling    | Tailwind CSS                |
| Icons      | Lucide React                |
| Language   | TypeScript                  |
| Deployment | Vercel                      |

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd only-games
npm install
```

### 2. Set up the database

The project uses **Vercel Postgres** (free tier — 256 MB storage).

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Create a new project and link this repo
3. Go to **Storage → Create Database → Postgres**
4. Copy the connection strings into `.env.local`:

```env
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Push schema and seed

```bash
npx prisma db push
npm run db:seed
```

This creates:
- **Admin account** — `admin` / `admin123`
- **10 game categories**
- **2 sample games**

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add a Postgres storage instance (auto-populates env vars)
4. Add `NEXTAUTH_SECRET` env var (generate with `openssl rand -base64 32`)
5. Deploy — Prisma generates on build automatically
6. Run seed once: `npx vercel env pull .env.local && npx prisma db push && npm run db:seed`

## Admin Dashboard

Navigate to `/admin` (requires ADMIN role).

| Page       | Purpose                                                 |
| ---------- | ------------------------------------------------------- |
| Dashboard  | Overview stats + recent activity feed                   |
| Users      | Search, ban/unban, reset passwords                      |
| Games      | CRUD games with category assignment, feature flags      |
| Categories | Create and manage game categories                       |
| Tracking   | Live + historical session data — IP, device, geo, game  |

## Ban System

When an admin bans a user:
1. The user record is flagged in the database
2. On their next page load, middleware detects the ban via JWT
3. A persistent `__og_banned` cookie is set (10-year expiry, HttpOnly)
4. The user is redirected to `/banned`
5. Even after signing out or clearing their session, the cookie persists — they cannot re-access the site from that browser

## Project Structure

```
├── app/
│   ├── admin/          # Admin dashboard pages
│   ├── api/            # API routes (auth, CRUD, tracking)
│   ├── banned/         # Banned user page
│   ├── categories/     # Category browsing
│   ├── games/          # Game player page
│   ├── login/          # Sign in
│   ├── register/       # Sign up
│   ├── search/         # Search + filter
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx        # Homepage
├── components/         # Shared UI components
├── lib/                # Prisma client, auth config, utils
├── prisma/             # Schema + seed script
├── public/             # Static assets (put onlygames.png here)
├── types/              # TypeScript declarations
└── middleware.ts       # Ban check + admin route protection
```

## Adding Your Logo

Place your `onlygames.png` file in the `public/` directory. It's displayed in the header and footer automatically.
