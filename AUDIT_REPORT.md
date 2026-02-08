# 🐾 tzvetomir-portfolio — Full Codebase Audit Report
**Date:** February 7, 2026  
**Auditor:** Claude  
**Repo:** https://github.com/TzvetomirTodorov/tzvetomir-portfolio  
**Stack:** PERN (PostgreSQL + Express + React + Node.js)  
**Live:** https://tzvetomir.dev (frontend) | https://api.tzvetomir.dev (backend)

---

## Executive Summary

Audited all 18 files across the client and server. Found **6 critical bugs**, **4 code quality issues**, and **3 UX improvements** worth making. All fixes have been applied to the files in this package. The codebase is solid architecturally — the issues are mostly about wiring things together (frontend → API) and correcting placeholder URLs.

---

## 🔴 Critical Bugs (6)

### 1. Multiple PrismaClient Instances — Connection Pool Exhaustion
**Files:** `server/src/routes/health.js`, `guestbook.js`, `newsletter.js`, `contact.js`  
**Issue:** Each route file created its own `new PrismaClient()`. Plus `server/src/index.js` created another one. That's **5 separate database connection pools** competing for the same PostgreSQL instance. Under load, this exhausts Railway's connection limit and causes `P2024: Timed out fetching a new connection` errors.  
**Fix:** Created `server/src/utils/prisma.js` as a shared singleton. All routes now `require("../utils/prisma")` instead of instantiating their own client. The main `index.js` uses the same shared instance for graceful shutdown.

### 2. Frontend Guestbook NOT Connected to API
**File:** `client/src/App.jsx` — `Guestbook` component  
**Issue:** The guestbook displayed **hardcoded local state** entries (Adina, Galya, Keegan) and the "Sign the guestbook" button only called `setEntries()` — it never fetched from or posted to the actual API. Visitors signing the guestbook saw their entry vanish on page refresh because nothing was persisted.  
**Fix:** Added `useEffect` with `fetch(API_URL + "/api/guestbook")` on mount, and `handleSubmit` now POSTs to the API. Entries persist in PostgreSQL and show up for all visitors. Includes fallback to hardcoded entries if the API is unreachable.

### 3. Frontend Newsletter NOT Connected to API
**File:** `client/src/App.jsx` — `Newsletter` component  
**Issue:** Clicking "Subscribe" just called `setSubmitted(true)` without ever hitting the API. No email was actually stored in the database. The double opt-in flow we built on the server was completely bypassed.  
**Fix:** Added `handleSubscribe` that POSTs to `API_URL + "/api/newsletter"`. Includes loading state, error handling, and displays the API response message (which varies based on whether they're new, already subscribed, etc.).

### 4. Wrong GitHub URL
**File:** `client/src/App.jsx` — Social Links section  
**Issue:** `href: "https://github.com/tzvetomir"` — this URL doesn't exist.  
**Fix:** Corrected to `"https://github.com/TzvetomirTodorov"` (case-sensitive).

### 5. Wrong LinkedIn URL
**File:** `client/src/App.jsx` — Social Links section  
**Issue:** `href: "https://linkedin.com/in/tzvetomir"` — incomplete path.  
**Fix:** Corrected to `"https://www.linkedin.com/in/tzvetomir-todorov-2a68a96a/"`.

### 6. All Project Cards Missing Links
**File:** `client/src/App.jsx` — `ProjectCard` components  
**Issue:** None of the 6 project cards had a `link` prop. The `ProjectCard` component supports clicking to open a URL, but every card was rendered without it, making them non-interactive dead zones.  
**Fix:** Added a centralized `PROJECT_LINKS` object at the top of the file. Currently pointing to GitHub repo URLs:
- PawsTrack → `github.com/TzvetomirTodorov/PawsTrack`
- ConstellationWorks → `github.com/TzvetomirTodorov/ConstellationWorks`
- HoldYourOwnBrand → `github.com/TzvetomirTodorov/HoldYourOwnBrand`
- From Ashes To Paws → `github.com/TzvetomirTodorov/FromAshesToPaws`
- WTF Response Team → `null` (no public repo for cybersecurity ops)
- Gamified Learning → `null` (no public repo)

**⚠️ ACTION NEEDED:** Update `PROJECT_LINKS` with actual live deployment URLs (Netlify, Vercel, etc.) if they exist.

---

## 🟡 Code Quality Issues (4)

### 7. Terminal `commands` Object Recreated Every Render
**File:** `client/src/App.jsx` — `Terminal` component  
**Issue:** The `commands` object was defined inside the component function body, meaning it was recreated on every single render. Combined with `useCallback` for `runCommand` that closed over `commands` but didn't list it in the dependency array, this triggered React's exhaustive-deps warning.  
**Fix:** Wrapped `commands` in `useMemo(() => ({...}), [])` to create it once. Added `commands` to `runCommand`'s `useCallback` dependency array.

### 8. Social Link Placeholders (`href="#"`)
**File:** `client/src/App.jsx` — Social Links section  
**Issue:** PawsTrack and Memoir social buttons had `href="#"`, which scrolls to the top of the page when clicked — confusing for users.  
**Fix:** Replaced with actual GitHub repo URLs from `PROJECT_LINKS`. Added `.filter(s => s.href)` so links with `null` href are simply not rendered.

### 9. No API Base URL Configuration
**File:** `client/src/App.jsx`  
**Issue:** The frontend had no reference to the `VITE_API_URL` environment variable. The guestbook and newsletter components had no way to know where the API lived.  
**Fix:** Added `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";` at the top of the file. All fetch calls use this constant.

### 10. Terminal `contact` Command Had Stale URLs
**File:** `client/src/App.jsx` — Terminal `contact` command  
**Issue:** Showed `github.com/tzvetomir` and `linkedin.com/in/tzvetomir` (same wrong URLs as the social links).  
**Fix:** Updated to correct URLs matching the social links section.

---

## 🟢 UX Improvements (3)

### 11. Mobile Navigation — No Hamburger Menu
**Issue:** The nav links (`about`, `projects`, `terminal`, `connect`) disappeared on mobile screens because there was no responsive behavior.  
**Fix:** Added a hamburger menu button (hidden on desktop via CSS `@media` query). On mobile, the nav links collapse into a vertical dropdown. Uses `className`-based CSS media queries for the responsive toggle.

### 12. No Loading/Error States for API Calls
**Issue:** Both the guestbook and newsletter had zero feedback during network requests. If the API was slow (Railway cold starts), users saw nothing happening after clicking buttons.  
**Fix:** Added `loading`, `submitting`, and `error` state variables. Subscribe button shows "..." while loading and disables itself. Guestbook shows "Loading entries..." while fetching. Both display error messages from the API if something goes wrong.

### 13. ProjectCard External Link Indicator
**Issue:** Project cards with links were clickable but gave no visual indication that they'd open an external page.  
**Fix:** Added a small `↗` arrow next to the project title for cards that have a `link` prop. Cursor already changed to `pointer`, but the arrow makes the affordance more obvious.

---

## ✅ No Issues Found (Clean)

These files passed audit with no changes needed:
- `server/prisma/schema.prisma` — Well-designed schema with proper constraints and table mapping
- `server/src/utils/validation.js` — Zod schemas are thorough (length limits, regex for XSS, email normalization)
- `server/src/middleware/rateLimiter.js` — Sensible rate limits (3/hr guestbook, 5/hr newsletter, 100/15min general)
- `server/package.json` — Clean dependency list, no unnecessary packages
- `server/.env.example` — Proper placeholder format, no leaked credentials

---

## 📋 Post-Audit Action Items for Tzvetomir

1. **Update `PROJECT_LINKS` in `client/src/App.jsx`** with the correct live deployment URLs or GitHub repo names for each project. The current URLs are my best guess at the repo names — verify they match your actual GitHub repos.

2. **Test the API connections locally** — Run `cd server && npm run dev` and `cd client && npm run dev`, then check that:
   - Guestbook loads entries from the database
   - Signing the guestbook persists entries
   - Newsletter subscribe hits the API

3. **Push the fixed files to GitHub** — Replace the existing files with these audited versions. The diff will show clearly what changed.

4. **Redeploy on Railway and Vercel** — Railway should auto-deploy on push. For Vercel, verify the `VITE_API_URL` env var is still set to `https://api.tzvetomir.dev`.

5. **Consider adding `C#` to the skills section** — Your resume lists C# / ASP.NET MVC prominently, but the skill bars only show ASP.NET at 80%. Given your MAHLE and Netrix experience, C# deserves its own bar.

---

*Audit complete. 13 issues found, 13 issues fixed. Nothing but green lights ahead. 🐾*
