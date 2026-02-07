# 🐾 tzvetomir.dev — Personal Portfolio

> **"Nothing but green lights ahead"**

Full-stack PERN portfolio for Tzvetomir Todorov — Senior Full Stack Developer, cybersecurity investigator, author, and Bulgarian-American technologist.

## Architecture

```
tzvetomir-portfolio/
├── client/          → React frontend (Vite) — deploys to Vercel
│   ├── src/
│   │   └── App.jsx  → Terminal-themed landing page
│   └── ...
├── server/          → Express API — deploys to Railway
│   ├── src/
│   │   ├── index.js       → Server entry point
│   │   ├── routes/
│   │   │   ├── guestbook.js    → GET/POST guestbook entries
│   │   │   ├── newsletter.js   → POST subscribe/unsubscribe
│   │   │   ├── contact.js      → POST contact form
│   │   │   └── health.js       → GET /api/health
│   │   ├── middleware/
│   │   │   └── rateLimiter.js  → Rate limiting for public endpoints
│   │   └── utils/
│   │       └── validation.js   → Zod schemas for input validation
│   └── prisma/
│       └── schema.prisma       → Database schema
└── README.md
```

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite                     |
| Backend    | Express.js + Node.js                |
| Database   | PostgreSQL (Neon serverless)         |
| ORM        | Prisma                              |
| Validation | Zod                                 |
| Deploy     | Vercel (client) + Railway (server)  |
| Domain     | tzvetomir.dev (Namecheap)           |

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL (local) or Neon connection string

### Server
```bash
cd server
npm install
cp .env.example .env    # Fill in DATABASE_URL
npx prisma generate
npx prisma db push      # Create tables
npm run dev             # http://localhost:3001
```

### Client
```bash
cd client
npm install
npm run dev             # http://localhost:5173
```

## Deployment

### Railway (Backend)
1. Create a new project on Railway
2. Add PostgreSQL service (or use Neon)
3. Connect your GitHub repo, set root directory to `/server`
4. Set environment variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `NODE_ENV=production`
   - `ALLOWED_ORIGINS=https://tzvetomir.dev`
5. Railway auto-detects `npm start`

### Vercel (Frontend)
1. Import repo on Vercel
2. Set root directory to `/client`
3. Set environment variable:
   - `VITE_API_URL=https://api.tzvetomir.dev` (your Railway URL)
4. Vercel auto-detects Vite

### Domain (Namecheap)
- `tzvetomir.dev` → Vercel (A record / CNAME)
- `api.tzvetomir.dev` → Railway (CNAME)

## API Endpoints

| Method | Endpoint               | Description                    | Auth     |
|--------|------------------------|--------------------------------|----------|
| GET    | `/api/health`          | Server health check            | None     |
| GET    | `/api/guestbook`       | List guestbook entries         | None     |
| POST   | `/api/guestbook`       | Add guestbook entry            | None*    |
| POST   | `/api/newsletter`      | Subscribe to newsletter        | None     |
| DELETE | `/api/newsletter`      | Unsubscribe from newsletter    | Token    |
| POST   | `/api/contact`         | Submit contact form            | None*    |

*Rate-limited to prevent spam

---

Built with love, React, Bulgarian coffee, and two dogs 🐾
© 2026 Tzvetomir Todorov — Цветомир Тодоров
