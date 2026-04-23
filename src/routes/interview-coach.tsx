import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, ArrowRight, Trophy, RotateCcw, Share2, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { callJson } from "@/lib/ai";
import { profileSystemExtra, useProfile, INDUSTRIES, EXPERIENCES } from "@/lib/profile";
import { markToolUsed } from "@/lib/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/interview-coach")({
  head: () => ({
    meta: [
      { title: "Interview Coach — JobGenie" },
      { name: "description", content: "Practise interview questions for your industry. Get instant kind feedback." },
      { property: "og:title", content: "Interview Coach — JobGenie" },
      { property: "og:description", content: "AI-powered interview practice for SA youth." },
    ],
  }),
  component: InterviewCoach,
});

const ROLES = [
  "Internship", "Entry-Level Job", "Learnership", "Apprenticeship", "First Management Role",
];

interface Feedback {
  good: string;
  improve: string;
  modelAnswer: string;
}

interface FinalScore {
  overall: number;
  confidence: number;
  clarity: number;
  relevance: number;
  summary: string;
  motivation: string;
}

function InterviewCoach() {
  const { profile } = useProfile();
  const [stage, setStage] = useState<"setup" | "questions" | "result">("setup");
  const [industry, setIndustry] = useState(profile.industry || "Retail");
  const [roleType, setRoleType] = useState("Entry-Level Job");
  const [experience, setExperience] = useState(profile.experience || "None");
  const [mockMode, setMockMode] = useState(false);

  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<Record<number, Feedback>>({});
  const [loading, setLoading] = useState(false);
  const [final, setFinal] = useState<FinalScore | null>(null);
  const [timer, setTimer] = useState(60);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    markToolUsed("interview-coach");
  }, []);

  // Mock interview timer
  useEffect(() => {
    if (stage !== "questions" || !mockMode) return;
    setTimer(60);
    intervalRef.current = window.setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          window.clearInterval(intervalRef.current!);
          // auto-advance
          setTimeout(() => nextQuestion(), 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, mockMode, stage]);

  async function startInterview() {
    setLoading(true);
    try {
      const data = await callJson<{ questions: string[] }>({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Generate exactly 8 interview questions for a South African candidate applying for a ${roleType} in ${industry}. Their experience level: ${experience}. Mix of: 2 introductory, 3 behavioural, 2 industry-specific, 1 closing/why-us. Use simple language. Return ONLY JSON: { "questions": ["q1", "q2", ..., "q8"] }`,
          },
        ],
      });
      const qs = data.questions?.slice(0, 8) ?? [];
      if (qs.length < 8) throw new Error("Couldn't generate enough questions");
      setQuestions(qs);
      setAnswers(Array(qs.length).fill(""));
      setFeedback({});
      setCurrentIdx(0);
      setStage("questions");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    const ans = answers[currentIdx]?.trim();
    if (!ans) {
      toast.info("Try writing something — even a short answer counts.");
      return;
    }
    if (mockMode) {
      // skip per-question feedback in mock mode
      nextQuestion();
      return;
    }
    setLoading(true);
    try {
      const fb = await callJson<Feedback>({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Interview question: "${questions[currentIdx]}"
Candidate's answer: "${ans}"
Industry: ${industry}, Role type: ${roleType}, Experience: ${experience}.

Give kind, specific feedback. Return ONLY JSON:
{
  "good": "1-2 sentences on what they did well",
  "improve": "1-2 sentences with a specific tip to improve",
  "modelAnswer": "A short, strong example answer (60-100 words) in their voice"
}`,
          },
        ],
      });
      setFeedback((prev) => ({ ...prev, [currentIdx]: fb }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Feedback failed");
    } finally {
      setLoading(false);
    }
  }

  async function finishInterview() {
    setLoading(true);
    try {
      const transcript = questions
        .map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || "(no answer)"}`)
        .join("\n\n");
      const score = await callJson<FinalScore>({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Score this mock interview for a ${roleType} in ${industry}.

${transcript}

Return ONLY JSON:
{
  "overall": 0-100,
  "confidence": 0-100,
  "clarity": 0-100,
  "relevance": 0-100,
  "summary": "2-3 sentences on overall performance",
  "motivation": "A short warm motivational message — under 30 words"
}`,
          },
        ],
      });
      setFinal(score);
      setStage("result");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scoring failed");
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      finishInterview();
    }
  }

  function reset() {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
    setFeedback({});
    setFinal(null);
    setCurrentIdx(0);
  }

  function share() {
    if (!final) return;
    const text = `🎯 I just scored ${final.overall}/100 on a mock interview with JobGenie!\n\nConfidence: ${final.confidence} · Clarity: ${final.clarity} · Relevance: ${final.relevance}\n\n${final.motivation}`;
    if (navigator.share) {
      navigator.share({ title: "My JobGenie Interview Score", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">Interview Coach</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Practise. Get feedback. Win.</h1>

      {stage === "setup" && (
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Industry">
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm">
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Role type">
              <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Experience level">
              <select value={experience} onChange={(e) => setExperience(e.target.value as typeof experience)} className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm">
                {EXPERIENCES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Mode">
              <button
                onClick={() => setMockMode((m) => !m)}
                className={`flex h-12 items-center gap-3 rounded-2xl border-2 px-4 text-sm font-semibold transition-all ${mockMode ? "border-clay bg-clay/10 text-clay" : "border-border"}`}
              >
                <Timer className="h-4 w-4" />
                {mockMode ? "Mock Mode (60s/question)" : "Practice Mode (no timer)"}
              </button>
            </Field>
          </div>
          <Button size="xl" className="mt-6 w-full" onClick={startInterview} disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Start interview
          </Button>
        </div>
      )}

      {stage === "questions" && (
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Question {currentIdx + 1} of {questions.length}</p>
            {mockMode && (
              <p className={`flex items-center gap-1 font-display text-2xl font-bold ${timer < 15 ? "text-destructive" : "text-primary"}`}>
                <Timer className="h-5 w-5" />{timer}s
              </p>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full bg-gradient-sun transition-all" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>

          <h2 className="mt-6 font-display text-2xl font-bold leading-snug">{questions[currentIdx]}</h2>

          <Textarea
            value={answers[currentIdx]}
            onChange={(e) => {
              const next = [...answers];
              next[currentIdx] = e.target.value;
              setAnswers(next);
            }}
            placeholder="Type your answer here. Take your time, breathe, then write."
            className="mt-4 min-h-40 rounded-2xl"
          />

          {feedback[currentIdx] && !mockMode && (
            <div className="mt-4 space-y-3">
              <FeedbackBlock label="✅ What worked" body={feedback[currentIdx].good} tone="primary" />
              <FeedbackBlock label="💡 To improve" body={feedback[currentIdx].improve} tone="accent" />
              <FeedbackBlock label="⭐ Model answer" body={feedback[currentIdx].modelAnswer} tone="clay" />
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <div className="flex gap-2">
              {!mockMode && !feedback[currentIdx] && (
                <Button variant="default" onClick={submitAnswer} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Get feedback
                </Button>
              )}
              <Button variant="gold" onClick={nextQuestion} disabled={loading}>
                {currentIdx === questions.length - 1 ? "Finish" : "Next"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === "result" && final && (
        <div className="mt-8 space-y-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-warm sm:p-12">
            <div className="absolute inset-0 pattern-mud opacity-50" />
            <div className="relative text-center">
              <Trophy className="mx-auto h-12 w-12 text-accent" />
              <p className="mt-4 font-display text-sm uppercase tracking-widest text-accent">Your Interview Readiness Score</p>
              <p className="mt-2 font-display text-7xl font-bold sm:text-8xl">{final.overall}<span className="text-3xl">/100</span></p>
              <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">{final.summary}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ScoreCard label="Confidence" value={final.confidence} />
            <ScoreCard label="Clarity" value={final.clarity} />
            <ScoreCard label="Relevance" value={final.relevance} />
          </div>

          <div className="rounded-3xl border border-accent/30 bg-accent-soft p-6 text-center">
            <p className="font-display text-2xl font-bold text-primary">{final.motivation}</p>
            <p className="mt-2 text-sm text-foreground">You're more ready than you think. Keep going. 💚</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" onClick={share}><Share2 className="h-4 w-4" /> Share result</Button>
            <Button variant="outline" size="lg" onClick={reset}><RotateCcw className="h-4 w-4" /> Try again</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-display text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}

function FeedbackBlock({ label, body, tone }: { label: string; body: string; tone: "primary" | "accent" | "clay" }) {
  const cls = tone === "primary" ? "border-primary/20 bg-primary-soft" : tone === "accent" ? "border-accent/30 bg-accent-soft" : "border-clay/30 bg-clay/10";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="font-display text-sm font-bold">{label}</p>
      <p className="mt-1 text-sm text-foreground">{body}</p>
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 text-center shadow-card">
      <p className="font-display text-xs uppercase tracking-widest text-clay">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold text-primary">{value}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full bg-gradient-sun" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
