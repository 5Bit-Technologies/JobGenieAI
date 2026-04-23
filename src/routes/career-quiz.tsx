import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Sparkles, RotateCcw, Share2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { callJson } from "@/lib/ai";
import { profileSystemExtra, useProfile } from "@/lib/profile";
import { markToolUsed } from "@/lib/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/career-quiz")({
  head: () => ({
    meta: [
      { title: "Career Quiz — JobGenie" },
      { name: "description", content: "10 questions to discover careers that fit you." },
      { property: "og:title", content: "Career Quiz — JobGenie" },
      { property: "og:description", content: "Find your career path in 5 minutes." },
    ],
  }),
  component: CareerQuiz,
});

const QUESTIONS: { q: string; options: string[] }[] = [
  { q: "When you have free time, you'd rather…", options: ["Be around lots of people", "Spend time alone or with one friend", "Make or fix things with your hands", "Read, watch videos, or learn"] },
  { q: "At school, which subject felt easiest?", options: ["Maths or Science", "Languages or History", "Practical/Tech subjects", "Arts or Music"] },
  { q: "If a friend has a problem, you usually…", options: ["Listen and comfort them", "Give them practical advice", "Help them fix it directly", "Make them laugh"] },
  { q: "Which of these would you enjoy most?", options: ["Running a stall at a market", "Coding an app", "Helping patients in a clinic", "Building or repairing something"] },
  { q: "When working in a group you tend to…", options: ["Lead and organise", "Come up with ideas", "Do the work quietly", "Keep everyone's mood up"] },
  { q: "How important is a steady salary vs your own freedom?", options: ["Steady salary every time", "Mostly steady, some freedom", "Mostly freedom, some risk", "I want to run my own thing"] },
  { q: "You see a problem in your community. You…", options: ["Start a project to fix it", "Tell people who can help", "Quietly do something useful", "Write/post about it to raise awareness"] },
  { q: "Which feels closer to your dream day?", options: ["Helping someone learn or heal", "Building something new", "Closing a deal or making sales", "Designing or creating something beautiful"] },
  { q: "How do you feel about being on a computer most of the day?", options: ["I love it", "It's fine", "I'd rather be moving", "I'd hate it"] },
  { q: "What matters MOST to you in a job?", options: ["Helping people", "Making good money", "Learning new things", "Being respected and trusted"] },
];

interface QuizResult {
  paths: { name: string; whyFit: string; entryRoles: string[]; learnerships: string[] }[];
  motivation: string;
  vibe: string;
}

function CareerQuiz() {
  const { profile } = useProfile();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(""));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => { markToolUsed("career-quiz"); }, []);

  function pick(opt: string) {
    const next = [...answers];
    next[idx] = opt;
    setAnswers(next);
    if (idx < QUESTIONS.length - 1) {
      setTimeout(() => setIdx((i) => i + 1), 150);
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const data = await callJson<QuizResult>({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Career-fit quiz answers from a young South African:\n${QUESTIONS.map((q, i) => `Q${i + 1}: ${q.q}\nA: ${answers[i]}`).join("\n\n")}\n\nReturn ONLY JSON:
{
  "vibe": "a 4-6 word description of their personality vibe (e.g. 'Caring builder with quiet drive')",
  "paths": [
    { "name": "Career Path Name", "whyFit": "1-2 sentences why it fits them", "entryRoles": ["entry-level role 1", "..."], "learnerships": ["specific SETA/programme to look at"] }
  ],
  "motivation": "warm 2-3 sentence message"
}
Give EXACTLY 3 paths. Each path: 3 entryRoles, 2 learnerships. Use real SA SETAs/programmes when relevant.`,
          },
        ],
      });
      setResult(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate result");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setIdx(0);
    setAnswers(Array(QUESTIONS.length).fill(""));
    setResult(null);
  }

  function share() {
    if (!result) return;
    const text = `🌟 My JobGenie career vibe: "${result.vibe}"\n\nTop paths:\n${result.paths.map((p) => `• ${p.name}`).join("\n")}\n\n${result.motivation}`;
    if (navigator.share) navigator.share({ title: "My Career Path", text }).catch(() => {});
    else { navigator.clipboard.writeText(text); toast.success("Copied!"); }
  }

  const allAnswered = answers.every(Boolean);
  const progress = ((idx + (allAnswered ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">Career Quiz</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">10 questions. 1 path forward.</h1>

      {!result && (
        <>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-primary/10">
            <div className="h-full bg-gradient-sun transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Question {idx + 1} of {QUESTIONS.length}</p>

          <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h2 className="font-display text-xl font-bold leading-snug sm:text-2xl">{QUESTIONS[idx].q}</h2>
            <div className="mt-5 grid gap-3">
              {QUESTIONS[idx].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => pick(opt)}
                  className={`rounded-2xl border-2 p-4 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft ${
                    answers[idx] === opt ? "border-primary bg-primary-soft shadow-warm" : "border-border bg-background"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}>
                Previous
              </Button>
              {idx < QUESTIONS.length - 1 ? (
                <Button variant="default" disabled={!answers[idx]} onClick={() => setIdx((i) => i + 1)}>Next</Button>
              ) : (
                <Button variant="gold" size="lg" disabled={!allAnswered || loading} onClick={submit}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  See my paths
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-warm">
            <Compass className="h-10 w-10 text-accent" />
            <p className="mt-3 font-display text-sm uppercase tracking-widest text-accent">Your Vibe</p>
            <p className="mt-1 font-display text-3xl font-bold sm:text-4xl">{result.vibe}</p>
          </div>

          <div className="space-y-4">
            {result.paths.map((p, i) => (
              <div key={i} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wider text-clay">Path #{i + 1}</p>
                <h3 className="mt-1 font-display text-2xl font-bold">{p.name}</h3>
                <p className="mt-2 text-sm text-foreground">{p.whyFit}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">Entry-level roles</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {p.entryRoles.map((r, j) => <li key={j}>• {r}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-accent">Learnerships / courses</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {p.learnerships.map((r, j) => <li key={j}>• {r}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-accent/30 bg-accent-soft p-6 text-center">
            <p className="font-display text-xl font-bold text-primary">{result.motivation}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" onClick={share}><Share2 className="h-4 w-4" /> Share</Button>
            <Button variant="outline" size="lg" onClick={reset}><RotateCcw className="h-4 w-4" /> Retake</Button>
          </div>
        </div>
      )}
    </div>
  );
}
