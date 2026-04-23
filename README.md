# JobGenie 🧞

> **Land your first job. No connections needed.**

JobGenie is an AI-powered career assistant built for young South African job
seekers aged **18–30** — first-time applicants, matriculants, township and
rural youth, and anyone who has never had access to a career counsellor.

South Africa has the highest youth unemployment rate in the world (over 60%
for ages 15–24). Most young people don't fail because they lack potential —
they fail because nobody ever showed them how to write a CV, find a
learnership, or answer "Tell me about yourself." JobGenie is the patient,
encouraging mentor every young South African deserves.

🌍 **Live app:** [jobgenieai.lovable.app](https://jobgenieai.lovable.app)

---

## ✨ Features

JobGenie is built around 8 mobile-first pages, each powered by AI tuned for
the South African job market (SETAs, NSFAS, NYDA, YES Programme, Harambee,
and major employers like Shoprite, Capitec, MTN, Eskom, SARS, etc.).

| Route | Page | What it does |
|---|---|---|
| `/` | **Landing** | Warm hero, value props, social proof, CTA |
| `/onboard` | **Onboarding** | 4-step wizard captures name, age, province, education, dreams |
| `/dashboard` | **Dashboard** | Progress tracker, daily AI motivation, quick links |
| `/cv-builder` | **CV Builder** | Conversational chat that builds a CV step-by-step + live preview + PDF download |
| `/cv-check` | **CV Checker** | Paste an existing CV, get an AI score and concrete improvements |
| `/find-jobs` | **Job & Learnership Finder** | AI-generated realistic listings (learnerships, entry-level roles) with personalised "Apply Tips" |
| `/interview-coach` | **Interview Coach** | Practice mode + timed Mock mode, with feedback on Confidence, Clarity & Relevance |
| `/career-quiz` | **Career Quiz** | 10-question quiz that recommends 3 career paths with SA-specific next steps |

---

## 🛠 Tech Stack

| Layer | Choice |
|---|---|
| Framework | **TanStack Start v1** (React 19, file-based routing, SSR-ready) |
| Build | **Vite 7** |
| Styling | **Tailwind CSS v4** (native CSS `@import`, `oklch` tokens in `src/styles.css`) |
| UI Kit | **shadcn/ui** + custom button variants (`hero`, `gold`, `clay`) |
| Backend | **Lovable Cloud** (Supabase) |
| AI | **Lovable AI Gateway** — Google Gemini 2.5 Flash + GPT-5 family |
| PDF Export | **html2pdf.js** |
| Markdown | **react-markdown** |
| Runtime | Cloudflare Workers (edge) |

No API keys to manage — Lovable AI is wired in automatically.

---

## 🤖 AI Architecture

All AI traffic flows through a single edge function so the system prompt and
model selection stay consistent across the app.

```
Browser  ──▶  src/lib/ai.ts
                │
                ▼
        supabase/functions/jobgenie-ai
                │  (injects JobGenie system prompt: warm,
                │   SA-aware, simple English, no jargon)
                ▼
        Lovable AI Gateway  ──▶  Gemini / GPT-5
```

Two modes are supported:

- **`mode: "chat"`** — Server-Sent Events streaming. Used by the CV Builder
  and Interview Coach for token-by-token responses.
- **`mode: "json"`** — One-shot structured output (`response_format: json_object`).
  Used for CV scoring, job listings, quiz results, and motivational quotes.

Helpers in `src/lib/ai.ts`:

```ts
streamChat({ messages, onDelta, onDone })   // streaming
callJson<T>({ messages })                   // structured JSON
callText({ messages })                      // collected stream → string
```

The system prompt teaches the model about South African provinces, SETAs
(MerSETA, BANKSETA, MICT SETA, W&RSETA, HWSETA…), the YES Programme, NSFAS,
NYDA, Harambee, and entry-level hiring patterns. All money is in **Rand (R)**.

---

## 🎨 Design System

JobGenie uses an African-inspired palette — warm, grounded, optimistic.

| Token | Value | Use |
|---|---|---|
| Deep Forest Green | `#1B4332` | Primary, headings, hero backgrounds |
| Warm Gold | `#D4A017` | Accents, CTAs, highlights |
| Warm Off-White | `#FFFDF7` | Page background |
| Clay / Terracotta | `#C77B5C` | Secondary accent |
| Success | `#2D6A4F` |  |
| Alert | `#C0392B` |  |

**Typography**

- Display: **Syne** (Google Fonts)
- Body: **DM Sans**

**Style rules**

- `rounded-2xl` everywhere
- Warm, soft shadows (no cold grey)
- Mobile-first — most users are on phones
- All colors are semantic tokens defined in `src/styles.css` using `oklch`.
  Components reference tokens (`bg-primary`, `text-foreground`), never raw
  hex values.

---

## 💾 Data & Persistence

JobGenie is **privacy-first**: no login is required to try anything.

- All user data (profile, CV draft, quiz answers, progress) is stored in the
  browser via **localStorage**.
- Helpers live in `src/lib/storage.ts` (`useLocalStorage` hook + `readLS` /
  `writeLS`) and `src/lib/profile.tsx` (typed profile context).
- **Lovable Cloud** is enabled and ready for future opt-in features like
  cross-device sync or sharing CVs with mentors.

---

## 📁 Project Structure

```
src/
├── routes/                    # File-based routes (TanStack Router)
│   ├── __root.tsx             # Root layout + providers
│   ├── index.tsx              # Landing page
│   ├── onboard.tsx
│   ├── dashboard.tsx
│   ├── cv-builder.tsx
│   ├── cv-check.tsx
│   ├── find-jobs.tsx
│   ├── interview-coach.tsx
│   └── career-quiz.tsx
├── components/
│   ├── SiteChrome.tsx         # Header / nav / footer
│   ├── CVPreview.tsx          # Live CV preview + PDF export
│   └── ui/                    # shadcn primitives
├── lib/
│   ├── ai.ts                  # AI client (streaming + JSON)
│   ├── profile.tsx            # User profile context
│   ├── progress.ts            # Dashboard progress tracking
│   ├── storage.ts             # localStorage helpers
│   └── utils.ts
├── integrations/supabase/     # Auto-generated client (do not edit)
└── styles.css                 # Tailwind v4 tokens & theme

supabase/
├── config.toml
└── functions/
    └── jobgenie-ai/           # AI proxy edge function
        └── index.ts
```

---

## 🚀 Local Development

Requires **Bun** (or Node 20+ with `npm`).

```bash
bun install        # install dependencies
bun run dev        # start dev server (http://localhost:8080)
bun run build      # production build
bun run lint       # ESLint
bun run format     # Prettier
```

The `.env` file is **auto-managed by Lovable Cloud** — `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` are populated
for you. You do **not** need to obtain or paste any AI provider API keys;
the Lovable AI Gateway handles authentication on the edge function side.

---

## 🌐 Deployment

JobGenie is deployed via **Lovable** — one-click publish from the editor.

- Production: <https://jobgenieai.lovable.app>
- Edge functions deploy automatically when you save them.
- Stable preview URL pattern: `project--<project-id>-dev.lovable.app`

---

## 🗺 Roadmap

Ideas being explored:

- 🔐 Optional Google sign-in for cross-device sync
- 📰 Real job board integration (SAYouth, Harambee, government learnership feeds)
- 📱 WhatsApp share — send your CV link to family or a recruiter in one tap
- 📴 Offline mode (PWA + IndexedDB)
- 🗣️ Multilingual support: isiZulu, isiXhosa, Afrikaans, Sesotho
- 🎤 Voice-input interview practice
- 👥 Peer mentor matching

---

## 🙌 Credits & License

Built with ❤️ on [Lovable](https://lovable.dev) using TanStack Start, Tailwind
CSS v4 and the Lovable AI Gateway.

> **Note:** Sample job listings shown in the Job Finder are **AI-generated**
> for prototype purposes and do not represent actual open vacancies. The
> roadmap includes integrating with real South African job boards.

Open to contributions, feedback, and partnerships with organisations
supporting South African youth employment. 🇿🇦
