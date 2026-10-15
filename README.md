# AHSAS — Activity Management & Ranking System

Anwarul Huda Students' Association platform to manage activities, track points, and celebrate excellence across all classes.

## 🚀 Architecture Overview

This project is built using a modern **MERN-style** architecture with **Supabase PostgreSQL** as the single source of truth:

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Lucide Icons (located in `frontend/`)
- **Backend API:** Node.js, Express, TypeScript (located in `api/`)
- **Database:** Supabase PostgreSQL (`units`, `reports`, `members`, `students`, `notifications`, `unit_messages`, `global_settings`, `admin_users`)
- **File Storage:** Supabase Storage (`activity-images` bucket)
- **Deployment:** Vercel (Frontend SPA + Serverless Express API)

---

## 🛠️ Project Structure

```
├── api/                        # Express API (Vercel Serverless Functions)
│   ├── index.ts                # Express app entry
│   ├── lib/supabaseServer.ts   # Server-side Supabase client
│   ├── middleware/             # Auth & error handling middleware
│   └── routes/                 # API routes (/api/health, etc.)
│
├── frontend/                   # React + Vite Frontend Application
│   ├── public/                 # Static assets (favicon, images)
│   ├── src/                    # Components, pages, hooks, lib
│   ├── index.html              # Vite entry point
│   ├── vite.config.ts          # Bundler & proxy configuration
│   └── tailwind.config.js      # AHSAS brand design tokens
│
├── shared/                     # Shared TypeScript interfaces
│   └── types/index.ts          # Database models & enums
│
├── supabase/                   # Database schemas & documentation
│   ├── migrations/             # Schema definitions
│   └── documentation/          # Architecture & recovery guide
│
├── .env.example                # Safe environment variable template
├── .gitignore                  # Git ignore rules protecting credentials & data
├── package.json                # Root package & scripts (npm run dev, build, typecheck)
└── vercel.json                 # Vercel deployment configuration
```

---

## 💻 Local Development

1. **Clone repository & copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd frontend && npm install
   ```

3. **Run both Frontend and Backend concurrently:**
   ```bash
   npm run dev
   ```
   - Frontend runs at: `http://localhost:5173`
   - Express API runs at: `http://localhost:3001` (proxied by Vite at `/api`)

4. **Typecheck:**
   ```bash
   npm run typecheck
   ```

5. **Production Build:**
   ```bash
   npm run build
   ```

---

## 🔒 Security & Data Safety

- Never expose Supabase `service_role` secrets in frontend client code or `VITE_` variables.
- The authoritative production database remains strictly preserved and untruncated.
- All backup snapshots and credentials are excluded from Git tracking via `.gitignore`.
