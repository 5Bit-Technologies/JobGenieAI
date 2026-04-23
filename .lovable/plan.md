

## Generate README.md for JobGenie

I'll create a comprehensive `README.md` at the project root documenting the JobGenie app — its purpose, features, tech stack, setup, and structure.

### What the README will cover

1. **Hero / intro** — Project tagline ("Land your first job. No connections needed."), short description of the mission (AI career assistant for South African youth aged 18–30), and the SA youth unemployment context.

2. **Features** — All 8 pages with one-line descriptions:
   - Landing (`/`) · Onboarding (`/onboard`) · Dashboard (`/dashboard`)
   - CV Builder (`/cv-builder`) · CV Checker (`/cv-check`)
   - Job & Learnership Finder (`/find-jobs`) · Interview Coach (`/interview-coach`) · Career Quiz (`/career-quiz`)

3. **Tech stack** — TanStack Start v1, React 19, Tailwind v4, Lovable Cloud (Supabase), Lovable AI Gateway (Gemini/GPT-5), shadcn/ui, html2pdf.js, react-markdown.

4. **AI integration** — How `supabase/functions/jobgenie-ai` proxies the Lovable AI Gateway with the JobGenie system prompt, supporting streaming chat and JSON mode via `src/lib/ai.ts`.

5. **Design system** — Brand palette (Deep Forest Green `#1B4332`, Warm Gold `#D4A017`, Warm Off-White `#FFFDF7`), Syne display + DM Sans body fonts, rounded-2xl, soft shadows, mobile-first.

6. **Data & persistence** — localStorage-only by default (no login needed); Lovable Cloud is enabled and available for future sync. Storage helpers in `src/lib/storage.ts` and `src/lib/profile.tsx`.

7. **Project structure** — Tree of `src/routes/`, `src/components/`, `src/lib/`, `supabase/functions/`.

8. **Local development** — `bun install`, `bun run dev`, `bun run build`, lint/format scripts. Note that `.env` is auto-managed by Lovable Cloud (no manual API keys required for AI).

9. **Deployment** — One-click publish via Lovable; live at `https://jobgenieai.lovable.app`.

10. **Roadmap / ideas** — Optional sign-in for cross-device sync, real job board integration (SAYouth, Harambee), WhatsApp share, offline mode.

11. **Credits & license** — Built with Lovable; note that sample job listings are AI-generated for prototype purposes.

### Files to create

- `README.md` (project root) — single Markdown file, ~200 lines, no code changes elsewhere.

### Out of scope

- No code, route, or design changes.
- No new dependencies.
- Won't overwrite any existing README without confirmation if one already exists (I'll check on implementation and back it up if needed).

