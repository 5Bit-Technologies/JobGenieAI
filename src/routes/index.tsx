import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  Briefcase,
  MessageSquareHeart,
  Sparkles,
  Quote,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobGenie — Land your first job. No connections needed." },
      {
        name: "description",
        content:
          "Free AI career assistant for South African youth. Build your CV, find learnerships, ace your interview.",
      },
      { property: "og:title", content: "JobGenie — Land your first job. No connections needed." },
      {
        property: "og:description",
        content:
          "Built for SA youth. Build a CV in 10 minutes, find real learnerships, and practise interviews with AI.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: FileText,
    title: "CV Builder",
    desc: "Chat your way to a professional CV. No experience? No problem — we'll help you find your strengths.",
    color: "bg-accent-soft text-primary",
  },
  {
    icon: Briefcase,
    title: "Job & Learnership Finder",
    desc: "Search in plain English. Get matched to learnerships, internships, and entry-level roles in your province.",
    color: "bg-primary-soft text-primary",
  },
  {
    icon: MessageSquareHeart,
    title: "Interview Coach",
    desc: "Practise real questions for your industry. Get instant, kind feedback that actually helps.",
    color: "bg-clay/10 text-clay",
  },
];

const TESTIMONIALS = [
  {
    quote: "I got my first learnership interview in 2 weeks. The CV builder made me sound like myself, just better.",
    name: "Lerato",
    where: "Soweto, Gauteng",
  },
  {
    quote: "I had no idea what to write. JobGenie asked me questions and I had a CV by the end of the chat. Eish!",
    name: "Sipho",
    where: "Durban, KZN",
  },
  {
    quote: "The interview practice gave me confidence. I walked in already knowing what to say.",
    name: "Naledi",
    where: "Polokwane, Limpopo",
  },
];

function Landing() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 pattern-mud opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Made for South African youth
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] text-balance sm:text-6xl md:text-7xl">
              Land your first job. <span className="text-accent">No connections</span> needed.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-primary-foreground/85 sm:text-xl">
              JobGenie is your free AI career assistant. We'll help you build a CV, find real learnerships,
              and practise interviews — all without judgement.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild variant="hero" size="xl">
                <Link to="/onboard">
                  Start Now — It's Free <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-primary-foreground/70">
                ⚡ No login. No fees. No catch.
              </p>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-primary-foreground/80 sm:grid-cols-3">
              {["Works on your phone", "Free, forever", "Built for SA"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Stat card */}
          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-sun opacity-20 blur-2xl" />
              <div className="relative rounded-3xl border border-accent/20 bg-primary-foreground/5 p-8 backdrop-blur-md shadow-glow">
                <p className="font-display text-xs uppercase tracking-widest text-accent">The Reality</p>
                <p className="mt-3 font-display text-7xl font-bold leading-none text-accent sm:text-8xl">
                  32<span className="text-5xl">%</span>
                </p>
                <p className="mt-3 text-base text-primary-foreground/85">
                  of South African youth aged 15–34 are unemployed.
                </p>
                <div className="my-6 h-px bg-primary-foreground/15" />
                <p className="font-display text-3xl font-semibold text-primary-foreground">
                  You're not the problem. The system is.
                </p>
                <p className="mt-3 text-sm text-primary-foreground/75">
                  We can't fix the system overnight. But we can give you the tools that wealthy kids take for granted —
                  a great CV, interview practice, and a way to find real opportunities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">What you get</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-balance sm:text-5xl">
            Three tools. One mission. <span className="text-primary">Your first job.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-warm"
            >
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ${f.color}`}>
                <f.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-display text-2xl font-bold">{f.title}</h3>
              <p className="mt-3 text-muted-foreground">{f.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-gradient-warm">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">Real stories</p>
            <h2 className="mt-3 font-display text-4xl font-bold text-balance sm:text-5xl">
              From "I don't know where to start" to <span className="text-primary">interview booked.</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="rounded-3xl border border-border bg-card p-8 shadow-card"
              >
                <Quote className="h-8 w-8 text-accent" />
                <blockquote className="mt-4 font-display text-xl leading-snug text-foreground">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-sun font-display font-bold text-primary">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.where}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 text-primary-foreground shadow-warm sm:p-14">
          <div className="absolute inset-0 pattern-mud opacity-50" aria-hidden />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Ready in 10 minutes. <span className="text-accent">Free, forever.</span>
              </h2>
              <p className="mt-3 text-primary-foreground/80">
                Build your first CV today. We'll be here every step.
              </p>
            </div>
            <Button asChild variant="gold" size="xl" className="shrink-0">
              <Link to="/onboard">
                Start Now <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
