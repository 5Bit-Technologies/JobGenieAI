import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, FileText, Copy, Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { callJson, callText } from "@/lib/ai";
import { profileSystemExtra, useProfile } from "@/lib/profile";
import { markToolUsed } from "@/lib/progress";
import { extractDocument } from "@/lib/extractDoc";
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { markToolUsed("cv-check"); }, []);

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    try {
      const doc = await extractDocument(file);
      setText(doc.text);
      toast.success(
        `Loaded "${doc.name}"${doc.truncated ? " (trimmed to fit)" : ""}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read file");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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

  async function downloadUpdated() {
    if (!updatedCV) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const GREEN: [number, number, number] = [27, 67, 50];
      const GOLD: [number, number, number] = [212, 160, 23];
      const TEXT: [number, number, number] = [38, 38, 38];
      const MUTED: [number, number, number] = [110, 110, 110];

      const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const writeWrapped = (
        text: string,
        opts: { size?: number; style?: "normal" | "bold" | "italic"; color?: [number, number, number]; lineGap?: number; indent?: number } = {},
      ) => {
        const { size = 10, style = "normal", color = TEXT, lineGap = 1.2, indent = 0 } = opts;
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text, contentW - indent);
        for (const line of lines) {
          ensureSpace(size * 0.4 + lineGap);
          doc.text(line, margin + indent, y);
          y += size * 0.4 + lineGap;
        }
      };

      const sectionHeading = (title: string) => {
        ensureSpace(10);
        y += 3;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text(title.toUpperCase(), margin, y);
        y += 1.5;
        doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.setLineWidth(0.3);
        doc.line(margin, y, margin + contentW, y);
        y += 4;
      };

      // Parse the plain-text CV into a header + sections.
      // We treat ALL-CAPS lines (and common section names) as section headings.
      const rawLines = updatedCV.replace(/\r\n/g, "\n").split("\n");
      const isHeading = (line: string) => {
        const t = line.trim();
        if (!t || t.length > 60) return false;
        if (t.endsWith(":")) return /^[A-Z0-9 &/\-()]+:$/.test(t);
        // ALL CAPS heading (allow spaces, &, /, -, digits)
        return /^[A-Z][A-Z0-9 &/\-()]{1,}$/.test(t) && /[A-Z]/.test(t);
      };

      // Split into blocks
      type Block = { heading: string | null; lines: string[] };
      const blocks: Block[] = [];
      let current: Block = { heading: null, lines: [] };
      for (const raw of rawLines) {
        const line = raw.replace(/\s+$/g, "");
        if (isHeading(line)) {
          if (current.heading !== null || current.lines.length > 0) blocks.push(current);
          current = { heading: line.replace(/:$/, "").trim(), lines: [] };
        } else {
          current.lines.push(line);
        }
      }
      blocks.push(current);

      // Header block (no heading) — first non-empty line is the name
      const headerBlock = blocks.shift();
      const headerLines = (headerBlock?.lines ?? []).map((l) => l.trim()).filter(Boolean);
      const name = headerLines[0] || "Your Name";
      const headerRest = headerLines.slice(1);

      // Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(name, margin, y + 8);
      y += 12;

      // Contact / sub-header lines (compact, muted)
      for (const line of headerRest) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        const wrapped = doc.splitTextToSize(line, contentW);
        for (const w of wrapped) {
          ensureSpace(4);
          doc.text(w, margin, y);
          y += 4;
        }
      }

      // Header divider
      doc.setDrawColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.setLineWidth(0.8);
      doc.line(margin, y, margin + contentW, y);
      y += 4;

      // Body blocks
      for (const block of blocks) {
        if (!block.heading && block.lines.every((l) => !l.trim())) continue;
        if (block.heading) sectionHeading(block.heading);

        // Render lines, treating bullet markers nicely
        for (const raw of block.lines) {
          const line = raw.replace(/\s+$/g, "");
          if (!line.trim()) {
            y += 1.5;
            continue;
          }
          const bullet = /^\s*([-•*])\s+(.*)$/.exec(line);
          if (bullet) {
            ensureSpace(5);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
            doc.text("•", margin, y);
            writeWrapped(bullet[2], { size: 10, indent: 4 });
          } else {
            writeWrapped(line, { size: 10 });
          }
        }
      }

      const safeName = (name || "JobGenie").replace(/\s+/g, "-");
      doc.save(`${safeName}-Updated-CV.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error("Couldn't download PDF. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">CV Checker</p>
      <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Score your CV. Fix it on the spot.</h1>
      <p className="mt-2 text-muted-foreground">Paste your existing CV text — or upload a PDF / DOCX. We'll score it out of 10.</p>

      <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your full CV here — name, contact, education, experience, skills, everything..."
          className="min-h-72 rounded-2xl text-sm"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,application/pdf,text/plain"
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={check} disabled={loading || uploading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Check my CV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => fileRef.current?.click()}
            disabled={loading || uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            Upload CV (PDF/DOCX)
          </Button>
          <p className="text-xs text-muted-foreground">We'll read the text out of your file.</p>
        </div>
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
                  {rewrites[i] !== undefined && (
                    <div className="mt-3 rounded-2xl border border-primary/20 bg-background p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Suggested rewrite — edit freely</p>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-saved</span>
                      </div>
                      <Textarea
                        value={rewrites[i]}
                        onChange={(e) => setRewrites((r) => ({ ...r, [i]: e.target.value }))}
                        className="min-h-32 rounded-xl text-sm leading-relaxed"
                      />
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
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">Your updated CV — edit freely</p>
                    <p className="text-[11px] text-muted-foreground">Tweak anything below before copying or downloading.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyUpdated}>
                      <Copy className="h-4 w-4" /> Copy
                    </Button>
                    <Button variant="gold" size="sm" onClick={downloadUpdated}>
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={updatedCV}
                  onChange={(e) => setUpdatedCV(e.target.value)}
                  className="min-h-[600px] rounded-xl font-sans text-sm leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
