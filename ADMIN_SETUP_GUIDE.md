# Admin Panel Setup Guide
## tzvetomir.dev — Site Management Dashboard

---

## What You're Getting

The admin panel gives you a password-protected dashboard at `yoursite.dev/admin` where you can manage all the interactive content on your portfolio without touching the database directly. You can view, hide, or permanently delete guestbook entries, see all newsletter subscribers and remove any, and read, mark, or delete contact form submissions. The whole thing uses JWT tokens for session auth and bcrypt for password hashing — industry standard for a production portfolio.

---

## File Placement Guide

Drop these files into your existing repo structure:

```
tzvetomir-portfolio/
├── client/
│   ├── src/
│   │   ├── App.jsx            ← (your existing file, no changes needed)
│   │   ├── AdminPanel.jsx     ← NEW: admin dashboard component
│   │   └── main.jsx           ← UPDATED: adds /admin route
│   └── vercel.json            ← NEW: SPA rewrite for /admin path
│
└── server/
    ├── .env.example            ← UPDATED: new admin env vars added
    ├── .env                    ← UPDATE THIS with your credentials
    └── src/
        ├── index.js            ← UPDATED: registers admin routes
        ├── middleware/
        │   ├── auth.js         ← NEW: JWT verification middleware
        │   └── rateLimiter.js  ← (no changes needed)
        ├── routes/
        │   ├── admin.js        ← NEW: all admin API endpoints
        │   ├── guestbook.js    ← (no changes needed)
        │   ├── newsletter.js   ← (no changes needed)
        │   └── contact.js      ← (no changes needed)
        └── utils/
            ├── hashPassword.js ← NEW: one-time password hash tool
            ├── prisma.js       ← (no changes needed)
            └── validation.js   ← (no changes needed)
```

---

## Step-by-Step Setup

### Step 1: Install new server dependencies

From your `server/` directory:

```bash
cd server
npm install jsonwebtoken bcrypt
```

These are the only two new packages needed. `jsonwebtoken` handles JWT creation and verification, and `bcrypt` handles secure password hashing.


### Step 2: Generate your admin password hash

Pick a strong password (16+ characters, mixed case, numbers, symbols), then run:

```bash
node src/utils/hashPassword.js "YourSuperSecurePassword123!"
```

This outputs a bcrypt hash that looks like `$2b$12$xxxxx...`. Copy it — you'll need it in the next step.


### Step 3: Generate a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This outputs a random 64-character hex string. Copy it.


### Step 4: Update your .env file

Add these three lines to your `server/.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$your_hash_from_step_2_here
JWT_SECRET=your_random_hex_from_step_3_here
JWT_EXPIRES_IN=8h
```

The username defaults to `admin` if you don't set it. The `JWT_EXPIRES_IN` controls how long you stay logged in before needing to re-authenticate — 8 hours is a good default.


### Step 5: Update Railway environment variables

In your Railway dashboard, add the same three variables:

1. Go to your server service → Variables
2. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, and `JWT_EXPIRES_IN`
3. Railway will auto-redeploy with the new vars


### Step 6: Deploy

Commit and push everything:

```bash
./scaffold-commits.sh "feat: admin panel — JWT auth, guestbook/newsletter/contact management"
```

---

## Using the Admin Panel

### Accessing it

Navigate to `https://tzvetomir.dev/admin` (or `localhost:5173/admin` in dev). You'll see a terminal-themed login screen.

### Login

Enter your admin username and password. On success, you'll get a JWT token that's stored in sessionStorage — meaning it persists across page refreshes within the same browser tab, but automatically clears when you close the tab. This is an intentional security measure.

### Dashboard

The dashboard shows three stat cards at the top (guestbook count, newsletter subs, contact messages) and three tabbed sections below:

**Guestbook tab** shows every entry including hidden ones. Each entry has a "Hide" button (soft-hide — removes from public view but keeps the data) and a "Delete" button (permanent removal with a confirmation dialog).

**Newsletter tab** lists all subscribers with their confirmation status and signup date. Each subscriber has a "Remove" button.

**Messages tab** shows all contact form submissions. Unread messages are highlighted with a gold "NEW" badge and a stronger left border. You can mark messages as read/unread and delete them.

### Security Features

The login endpoint has its own rate limiter: 5 attempts per 15 minutes per IP. Every admin action requires a valid JWT. If the token expires mid-session, the panel automatically logs you out and shows the login screen. All delete operations require a confirmation dialog to prevent accidents.

---

## Quick Reference: API Endpoints

```
POST   /api/admin/login           → Authenticate, get JWT
GET    /api/admin/verify          → Check token validity
GET    /api/admin/stats           → Dashboard overview counts

GET    /api/admin/guestbook       → All entries (incl. hidden)
PATCH  /api/admin/guestbook/:id   → Toggle visibility
DELETE /api/admin/guestbook/:id   → Permanent delete

GET    /api/admin/newsletter      → All subscribers
DELETE /api/admin/newsletter/:id  → Remove subscriber

GET    /api/admin/contacts        → All contact messages
PATCH  /api/admin/contacts/:id    → Toggle read/unread
DELETE /api/admin/contacts/:id    → Delete message
```

All endpoints except `/login` require the `Authorization: Bearer <token>` header.

---

## Troubleshooting

**"Admin login is not configured"** → Your `.env` is missing `ADMIN_PASSWORD_HASH` or `JWT_SECRET`. Run Steps 2 and 3 above.

**"Invalid credentials"** → Double-check your password and make sure the hash in `.env` was generated from the same password you're typing. Re-run `hashPassword.js` if unsure.

**Token expires too quickly** → Increase `JWT_EXPIRES_IN` in `.env` (e.g., `24h` or `7d`).

**404 on /admin in production** → Your hosting platform needs SPA rewrites. The included `vercel.json` handles Vercel. For Netlify, add a `_redirects` file with `/* /index.html 200`.

**/api/admin routes return 500** → Check Railway logs. Most likely a missing environment variable or a Prisma connection issue.
