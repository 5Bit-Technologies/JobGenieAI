import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, FileText, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { callJson, callText } from "@/lib/ai";
import { profileSystemExtra, useProfile } from "@/lib/profile";
import { markToolUsed } from "@/lib/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/cv-check")({
  head: () => ({
    meta: [
      { title: "CV Checker — JobGenie" },
      { name: "description", content: "Paste your CV, get a score plus 5 fixes, then build an updated CV." },
      { property: "og:title", content: "CV Checker — JobGenie" },
      { property: "og:description", content: "Score and improve your CV in seconds." },
    ],
  }),
  component: CVCheck,
});

interface CheckResult {
  score: number;
  strengths: string[];
  improvements: { issue: string; section: string; suggestion: string }[];
  oneLine: string;
}

function CVCheck() {
  const { profile } = useProfile();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [rewrites, setRewrites] = useState<Record<number, string>>({});
  const [rewritingIdx, setRewritingIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [building, setBuilding] = useState(false);
  const [updatedCV, setUpdatedCV] = useState<string>("");

  useEffect(() => { markToolUsed("cv-check"); }, []);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected],
  );

  async function check() {
    if (!text.trim() || text.trim().length < 50) {
      toast.info("Paste your full CV — at least a few sentences.");
      return;
    }
    setLoading(true);
    setResult(null);
    setRewrites({});
    setSelected({});
    setUpdatedCV("");
    try {
      const data = await callJson<CheckResult>({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Analyse this CV for a young South African job seeker. Be kind but honest.

CV TEXT:
"""
${text}
"""

Return ONLY JSON:
{
  "score": 0-10,
  "strengths": ["3 specific things they did well — short, ≤15 words each"],
  "improvements": [
    { "issue": "specific issue", "section": "which section", "suggestion": "how to fix it (≤30 words)" }
  ],
  "oneLine": "a warm one-line summary"
}

Provide exactly 3 strengths and exactly 5 improvements.`,
          },
        ],
      });
      setResult(data);
      // Pre-select all improvements by default
      const initial: Record<number, boolean> = {};
      data.improvements.forEach((_, i) => { initial[i] = true; });
      setSelected(initial);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't analyse");
    } finally {
      setLoading(false);
    }
  }

  async function rewriteSection(idx: number, imp: CheckResult["improvements"][number]) {
    setRewritingIdx(idx);
    try {
      const out = await callText({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Here is a CV:\n"""\n${text}\n"""\n\nRewrite ONLY the "${imp.section}" section to fix this issue: "${imp.issue}".
Use the suggestion: "${imp.suggestion}".
Keep the candidate's voice. Return only the rewritten section text — no labels, no commentary, no markdown headers.`,
          },
        ],
      });
      setRewrites((r) => ({ ...r, [idx]: out.trim() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setRewritingIdx(null);
    }
  }

  async function buildUpdatedCV() {
    if (!result) return;
    const chosen = result.improvements
      .map((imp, i) => ({ imp, i, on: selected[i] }))
      .filter((x) => x.on);
    if (chosen.length === 0) {
      toast.info("Select at least one improvement to apply.");
      return;
    }
    setBuilding(true);
    setUpdatedCV("");
    try {
      const fixesBlock = chosen
        .map(({ imp, i }, n) => {
          const rw = rewrites[i];
          return `Fix ${n + 1} — Section: ${imp.section}
Issue: ${imp.issue}
Suggestion: ${imp.suggestion}${rw ? `\nApproved rewrite for this section:\n"""\n${rw}\n"""` : ""}`;
        })
        .join("\n\n");

      const out = await callText({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `You are JobGenie. Produce a single, clean, fully updated CV by applying the selected fixes to the original CV. Keep the candidate's voice and all factual details. Do not invent experience, jobs, dates, qualifications or skills. Where an "Approved rewrite" is provided, use it (lightly polished for flow); otherwise apply the suggestion in your own words.

Format the output as a clean plain-text CV with clear section headings (e.g. CONTACT, SUMMARY, EDUCATION, EXPERIENCE, SKILLS, REFERENCES). No markdown, no commentary, no preamble — just the CV.

ORIGINAL CV:
"""
${text}
"""

SELECTED FIXES TO APPLY:
${fixesBlock}`,
          },
        ],
      });
      setUpdatedCV(out.trim());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build updated CV");
    } finally {
      setBuilding(false);
    }
  }

  function copyUpdated() {
    if (!updatedCV) return;
    navigator.clipboard.writeText(updatedCV).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed"),
    );
  }

  function downloadUpdated() {
    if (!updatedCV) return;
    const blob = new Blob([updatedCV], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "updated-cv.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">CV Checker</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Score your CV. Fix it on the spot.</h1>
      <p className="mt-2 text-muted-foreground">Paste your existing CV text below. We'll score it out of 10.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your full CV here — name, contact, education, experience, skills, everything..."
          className="min-h-72 rounded-2xl text-sm"
        />
        <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={check} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Check my CV
        </Button>
      </div>

      {result && (
        <div className="mt-8 space-y-6">
          <div className="rounded-3xl bg-gradient-hero p-8 text-primary-foreground shadow-warm">
            <p className="font-display text-sm uppercase tracking-widest text-accent">CV Score</p>
            <p className="mt-2 font-display text-7xl font-bold">{result.score}<span className="text-3xl text-primary-foreground/60">/10</span></p>
            <p className="mt-2 max-w-xl text-primary-foreground/85">{result.oneLine}</p>
          </div>

          <div>
            <h3 className="font-display text-xl font-bold">✅ What's working</h3>
            <ul className="mt-3 space-y-2">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="font-display text-xl font-bold">🛠️ Top fixes</h3>
              <p className="text-xs text-muted-foreground">Tick the fixes you want to apply, then build your updated CV.</p>
            </div>
            <div className="mt-3 space-y-3">
              {result.improvements.map((imp, i) => (
                <div key={i} className="rounded-2xl border border-clay/30 bg-clay/5 p-5">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`fix-${i}`}
                      checked={!!selected[i]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: v === true }))}
                      className="mt-1"
                    />
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
                    <label htmlFor={`fix-${i}`} className="flex-1 cursor-pointer">
                      <p className="text-xs font-semibold uppercase tracking-wider text-clay">{imp.section}</p>
                      <p className="mt-1 font-display text-base font-bold">{imp.issue}</p>
                      <p className="mt-1 text-sm">{imp.suggestion}</p>
                    </label>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => rewriteSection(i, imp)}
                    disabled={rewritingIdx === i}
                  >
                    {rewritingIdx === i ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {rewrites[i] ? "Rewrite again" : "Rewrite this section"}
                  </Button>
                  {rewrites[i] && (
                    <div className="mt-3 rounded-2xl border border-primary/20 bg-background p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Suggested rewrite</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm">{rewrites[i]}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-bold">Build my updated CV</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCount} of {result.improvements.length} fix{result.improvements.length === 1 ? "" : "es"} selected.
                  JobGenie will combine your original CV with the selected fixes.
                </p>
              </div>
              <Button size="lg" onClick={buildUpdatedCV} disabled={building || selectedCount === 0}>
                {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Build updated CV
              </Button>
            </div>

            {updatedCV && (
              <div className="mt-5 rounded-2xl border border-border bg-background p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Your updated CV</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyUpdated}>
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadUpdated}>
                      <Download className="h-4 w-4" /> Download .txt
                    </Button>
                  </div>
                </div>
                <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed">{updatedCV}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
