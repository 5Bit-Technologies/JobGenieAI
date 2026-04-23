import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2, Bookmark, BookmarkCheck, Lightbulb, Briefcase, MapPin, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { callJson, callText } from "@/lib/ai";
import { profileSystemExtra, useProfile, PROVINCES, INDUSTRIES, QUALIFICATIONS } from "@/lib/profile";
import { useLocalStorage } from "@/lib/storage";
import { markToolUsed } from "@/lib/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/find-jobs")({
  head: () => ({
    meta: [
      { title: "Find Jobs & Learnerships — JobGenie" },
      { name: "description", content: "Search learnerships, internships and entry-level jobs in plain English." },
      { property: "og:title", content: "Find Jobs & Learnerships — JobGenie" },
      { property: "og:description", content: "AI-powered job search for South African youth." },
    ],
  }),
  component: FindJobs,
});

interface Listing {
  id: string;
  title: string;
  organisation: string;
  location: string;
  type: string; // Learnership / Internship / Entry-level
  requirements: string[];
  description: string;
  closingDate?: string;
  applyUrl?: string;
}

function FindJobs() {
  const { profile } = useProfile();
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState(profile.province || "");
  const [industry, setIndustry] = useState(profile.industry || "");
  const [qualification, setQualification] = useState(profile.qualification || "");
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"results" | "saved">("results");
  const [saved, setSaved] = useLocalStorage<Listing[]>("jobgenie:saved-jobs", []);
  const [tipFor, setTipFor] = useState<string | null>(null);
  const [tip, setTip] = useState<string>("");
  const [tipLoading, setTipLoading] = useState(false);

  useEffect(() => {
    markToolUsed("find-jobs");
  }, []);

  async function search() {
    if (loading) return;
    setLoading(true);
    setResults([]);
    try {
      const data = await callJson<{ listings: Listing[] }>({
        systemExtra: `${profileSystemExtra(profile)}
Generate REALISTIC FICTIONAL South African opportunities clearly labelled as samples. Use real-style names: SETAs (MerSETA, BANKSETA, MICT SETA, W&RSETA, HWSETA, FoodBev SETA, Services SETA, INSETA), employers (Shoprite, Pick n Pay, Capitec, FNB, MTN, Vodacom, Eskom, Transnet, Sasol, SAB), Harambee, YES Programme, NYDA, government departments. Use real provinces and cities. Salaries/stipends in Rand (R3,500/month etc). Closing dates in next 1-3 months.

Return ONLY valid JSON:
{
  "listings": [
    {
      "id": "1",
      "title": "...",
      "organisation": "...",
      "location": "City, Province",
      "type": "Learnership" | "Internship" | "Entry-Level Job" | "YES Programme" | "Apprenticeship",
      "requirements": ["...", "..."],
      "description": "2-3 sentence description, includes stipend if relevant",
      "closingDate": "DD Month YYYY"
    }
  ]
}

Generate 6 listings. Match the user's filters and search query.`,
        messages: [
          {
            role: "user",
            content: `Search query: ${query || "any opportunities for me"}
Filters: Province=${province || "any"}, Industry=${industry || "any"}, Qualification=${qualification || "any"}.`,
          },
        ],
      });
      setResults(data.listings || []);
      if (!data.listings?.length) toast.info("No matches — try a broader search.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleSave(l: Listing) {
    const exists = saved.some((s) => s.id === l.id && s.title === l.title);
    if (exists) {
      setSaved(saved.filter((s) => !(s.id === l.id && s.title === l.title)));
      toast.success("Removed from saved");
    } else {
      setSaved([...saved, l]);
      toast.success("Saved! View in 'Saved' tab.");
    }
  }

  async function getTips(l: Listing) {
    setTipFor(`${l.id}-${l.title}`);
    setTip("");
    setTipLoading(true);
    try {
      const text = await callText({
        systemExtra: profileSystemExtra(profile),
        messages: [
          {
            role: "user",
            content: `Give me 3 short, specific tips (max 25 words each, bullet list) on how to apply for this opportunity:

Title: ${l.title}
Organisation: ${l.organisation}
Type: ${l.type}
Requirements: ${l.requirements.join(", ")}
Description: ${l.description}

Tips should be practical: what to mention in the application, what skills to highlight, what mistakes to avoid.`,
          },
        ],
      });
      setTip(text);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't get tips");
    } finally {
      setTipLoading(false);
    }
  }

  const list = tab === "results" ? results : saved;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div>
        <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">Find Jobs</p>
        <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
          Real opportunities, plain English search.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Try: "IT learnerships in Gauteng for matric holders" or "Retail jobs near me, no experience".
        </p>
      </div>

      {/* Search */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="What are you looking for?"
              className="h-14 rounded-2xl pl-12 text-base"
            />
          </div>
          <Button size="xl" onClick={search} disabled={loading} className="sm:w-auto">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Search
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Select value={province} onChange={setProvince} options={["", ...PROVINCES]} placeholder="Any province" />
          <Select value={industry} onChange={setIndustry} options={["", ...INDUSTRIES]} placeholder="Any industry" />
          <Select value={qualification} onChange={setQualification} options={["", ...QUALIFICATIONS]} placeholder="Any qualification" />
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        <TabBtn active={tab === "results"} onClick={() => setTab("results")}>Results ({results.length})</TabBtn>
        <TabBtn active={tab === "saved"} onClick={() => setTab("saved")}>Saved ({saved.length})</TabBtn>
      </div>

      {/* Sample label */}
      {tab === "results" && results.length > 0 && (
        <div className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft px-4 py-2 text-xs text-foreground">
          ⚡ <strong>Sample Opportunities</strong> — These are AI-generated examples to show what's out there. For live applications, search SAYouth.mobi, Indeed SA, or the Harambee Hub.
        </div>
      )}

      {/* Results */}
      <div className="mt-4 grid gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-3xl bg-muted/50" />
        ))}
        {!loading && list.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-display text-lg font-bold">
              {tab === "results" ? "Run a search to see opportunities" : "No saved jobs yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === "results" ? "Try the example queries above." : "Hit the bookmark on a result to save it."}
            </p>
          </div>
        )}
        {list.map((l) => {
          const isSaved = saved.some((s) => s.id === l.id && s.title === l.title);
          const tipKey = `${l.id}-${l.title}`;
          return (
            <article key={`${l.id}-${l.title}`} className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-clay">{l.type}</p>
                  <h3 className="mt-1 font-display text-xl font-bold">{l.title}</h3>
                  <p className="text-sm text-muted-foreground">{l.organisation}</p>
                </div>
                <button
                  onClick={() => toggleSave(l)}
                  className="rounded-xl p-2 hover:bg-primary-soft"
                  aria-label={isSaved ? "Unsave" : "Save"}
                >
                  {isSaved ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5 text-muted-foreground" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {l.location}</span>
                {l.closingDate && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Closes {l.closingDate}</span>}
              </div>
              <p className="mt-3 text-sm">{l.description}</p>
              {l.requirements?.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {l.requirements.map((r, i) => (
                    <li key={i} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs text-primary">{r}</li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => getTips(l)} disabled={tipLoading && tipFor === tipKey}>
                  {tipLoading && tipFor === tipKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                  Apply Tips
                </Button>
              </div>

              {tipFor === tipKey && tip && (
                <div className="mt-3 rounded-2xl border border-accent/30 bg-accent-soft p-4">
                  <p className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-primary">
                    <Lightbulb className="h-4 w-4" /> JobGenie's tips
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{tip}</pre>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Select({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o || placeholder}</option>
      ))}
    </select>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary-soft"
      }`}
    >
      {children}
    </button>
  );
}
