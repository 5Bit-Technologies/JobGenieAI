import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Briefcase,
  MessageSquareHeart,
  ClipboardCheck,
  Compass,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useProfile } from "@/lib/profile";
import { ALL_TOOLS, getProgress, type ToolKey } from "@/lib/progress";
import { callText } from "@/lib/ai";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — JobGenie" },
      { name: "description", content: "Your career command centre. CV, jobs, interviews, all in one place." },
    ],
  }),
  component: Dashboard,
});

const TOOLS: { key: ToolKey; to: string; icon: typeof FileText; title: string; desc: string; tone: string }[] = [
  { key: "cv-builder", to: "/cv-builder", icon: FileText, title: "Build your CV", desc: "Chat your way to a polished CV.", tone: "bg-accent-soft text-primary" },
  { key: "find-jobs", to: "/find-jobs", icon: Briefcase, title: "Find Jobs", desc: "Learnerships and entry-level roles.", tone: "bg-primary-soft text-primary" },
  { key: "interview-coach", to: "/interview-coach", icon: MessageSquareHeart, title: "Practise Interviews", desc: "Real questions, real feedback.", tone: "bg-clay/10 text-clay" },
  { key: "cv-check", to: "/cv-check", icon: ClipboardCheck, title: "Check your CV", desc: "Get a score and 5 fixes.", tone: "bg-accent-soft text-primary" },
  { key: "career-quiz", to: "/career-quiz", icon: Compass, title: "Career Quiz", desc: "Discover paths that fit you.", tone: "bg-primary-soft text-primary" },
];

function Dashboard() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ToolKey[]>([]);
  const [quote, setQuote] = useState<string>("");
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    if (!profile.completedOnboarding) {
      navigate({ to: "/onboard" });
    }
  }, [profile.completedOnboarding, navigate]);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const cacheKey = `jobgenie:quote:${today}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          if (!cancelled) {
            setQuote(cached);
            setQuoteLoading(false);
          }
          return;
        }
        const text = await callText({
          messages: [
            {
              role: "user",
              content:
                "Give me ONE short motivational quote (max 18 words) for a young South African job seeker. Africa-rooted, warm, no clichés. Just the quote, no quotes marks, no attribution.",
            },
          ],
        });
        const clean = text.replace(/^["“”']|["“”']$/g, "").trim();
        localStorage.setItem(cacheKey, clean);
        if (!cancelled) {
          setQuote(clean);
          setQuoteLoading(false);
        }
      } catch {
        if (!cancelled) {
          setQuote("The path you're walking is yours alone — and that's why no one else can stop you.");
          setQuoteLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completed = progress.length;
  const total = ALL_TOOLS.length;
  const pct = Math.round((completed / total) * 100);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Greeting */}
      <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-warm sm:p-10">
        <p className="font-display text-sm uppercase tracking-widest text-accent">{greeting}</p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
          Hey {profile.name || "friend"} 👋
        </h1>
        <p className="mt-2 text-primary-foreground/80">
          {profile.province ? `${profile.province} · ` : ""}
          {profile.industry || "Let's find your path"}
        </p>

        {/* Quote */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="font-display text-lg italic">
            {quoteLoading ? "Loading today's spark..." : quote}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-wider text-clay">Your progress</p>
            <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              You've completed <span className="text-primary">{completed}</span> of {total} tools
            </h2>
          </div>
          <p className="font-display text-3xl font-bold text-primary">{pct}%</p>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-sun transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tools */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const done = progress.includes(t.key);
          return (
            <Link
              key={t.key}
              to={t.to}
              className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-warm"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl ${t.tone}`}>
                  <t.icon className="h-6 w-6" />
                </div>
                {done && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    ✓ Done
                  </span>
                )}
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-primary/20 bg-primary-soft/40 p-6">
        <div>
          <p className="font-display text-lg font-bold">Want to redo your setup?</p>
          <p className="text-sm text-muted-foreground">Update your province, industry, or experience.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/onboard">Edit profile</Link>
        </Button>
      </div>
    </div>
  );
}
