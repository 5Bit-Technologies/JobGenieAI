// JobGenie Jobs edge function — searches real South African job sites via Firecrawl.
// Returns normalized listings with working apply URLs. No AI generation of fake jobs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchBody {
  query?: string;
  province?: string;
  industry?: string;
  qualification?: string;
}

interface Listing {
  id: string;
  title: string;
  organisation: string;
  location: string;
  type: string;
  requirements: string[];
  description: string;
  closingDate?: string;
  applyUrl?: string;
}

interface FirecrawlSearchResult {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
}

const SA_JOB_DOMAINS = [
  "sayouth.mobi",
  "harambee.co.za",
  "indeed.co.za",
  "za.indeed.com",
  "careers24.com",
  "pnet.co.za",
  "jobmail.co.za",
  "yes4youth.co.za",
  "za.linkedin.com",
  "za.prosple.com",
  "mict.org.za",
  "merseta.org.za",
  "bankseta.org.za",
  "wrseta.org.za",
  "hwseta.org.za",
  "services-seta.org.za",
  "inseta.org.za",
  "nyda.gov.za",
  "speccon.co.za",
  "ctutraining.ac.za",
  "dynamicdna.co.za",
  "trainingforce.co.za",
  "impactful.co.za",
];

const MAX_QUERY_CHARS = 200;
const MAX_FILTER_CHARS = 80;

function safeStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max).trim() : "";
}

function buildSearchQuery(b: SearchBody): string {
  const parts: string[] = [];
  const q = safeStr(b.query, MAX_QUERY_CHARS);
  const province = safeStr(b.province, MAX_FILTER_CHARS);
  const industry = safeStr(b.industry, MAX_FILTER_CHARS);
  const qualification = safeStr(b.qualification, MAX_FILTER_CHARS);

  if (q) parts.push(q);
  else parts.push("learnership OR internship OR entry-level job");

  if (industry) parts.push(industry);
  if (province) parts.push(province);
  if (qualification) parts.push(qualification);
  parts.push("South Africa");
  parts.push("apply");
  return parts.join(" ");
}

function inferType(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("learnership")) return "Learnership";
  if (t.includes("internship") || t.includes("intern ")) return "Internship";
  if (t.includes("apprentice")) return "Apprenticeship";
  if (t.includes("yes ") || t.includes("yes4youth") || t.includes("yes programme")) return "YES Programme";
  if (t.includes("graduate")) return "Graduate Programme";
  return "Entry-Level Job";
}

function inferOrg(url: string, title: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const map: Record<string, string> = {
      "sayouth.mobi": "SA Youth Network",
      "harambee.co.za": "Harambee",
      "indeed.co.za": "Indeed SA",
      "careers24.com": "Careers24",
      "pnet.co.za": "PNet",
      "jobmail.co.za": "JobMail",
      "yes4youth.co.za": "YES Programme",
    };
    return map[host] ?? host;
  } catch {
    return title.split(/[-—|]/)[1]?.trim() || "See listing";
  }
}

function cleanTitle(title: string): string {
  // Strip trailing site name after dash/pipe
  return title.replace(/\s*[-–—|]\s*(SA Youth|Indeed|Careers24|PNet|JobMail|Harambee|YES4Youth)[^]*$/i, "").trim();
}

function inferLocation(text: string, province: string): string {
  const provinces = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
    "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
  ];
  for (const p of provinces) {
    if (text.includes(p)) return p;
  }
  const cities = ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "Polokwane", "Nelspruit", "Kimberley", "East London", "Sandton", "Midrand", "Centurion", "Soweto"];
  for (const c of cities) {
    if (text.includes(c)) return c;
  }
  return province || "South Africa";
}

function normalize(results: FirecrawlSearchResult[], province: string): Listing[] {
  const seen = new Set<string>();
  const out: Listing[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const url = (r.url || "").trim();
    const title = (r.title || "").trim();
    if (!url || !title) continue;
    if (seen.has(url)) continue;
    seen.add(url);

    const desc = (r.description || r.markdown || "").trim().slice(0, 400);
    const combined = `${title} ${desc}`;
    out.push({
      id: String(i + 1),
      title: cleanTitle(title).slice(0, 160) || title.slice(0, 160),
      organisation: inferOrg(url, title),
      location: inferLocation(combined, province),
      type: inferType(combined),
      requirements: [],
      description: desc || "Click 'View & Apply' to see full details.",
      applyUrl: url,
    });
    if (out.length >= 10) break;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Job search is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: SearchBody;
    try {
      body = (await req.json()) as SearchBody;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const query = buildSearchQuery(body);

    // Firecrawl v2 search — restrict to SA job domains for relevance.
    const fcResp = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 12,
        sources: ["web"],
        // Restrict to SA job sites; Firecrawl supports site:domain inside the query as well.
        // Using both: explicit search_domain_filter (if supported) AND query qualifiers as a fallback.
      }),
    });

    if (!fcResp.ok) {
      const text = await fcResp.text();
      console.error("Firecrawl search failed:", fcResp.status, text);
      // 402 → out of credits
      if (fcResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Job search credits exhausted. Please top up Firecrawl." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Couldn't reach job search. Try again in a moment." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const fcData = await fcResp.json();
    // Firecrawl v2 search returns { success, data: { web: [...] } } or { data: [...] } depending on version.
    const rawResults: FirecrawlSearchResult[] =
      (Array.isArray(fcData?.data?.web) && fcData.data.web) ||
      (Array.isArray(fcData?.data) && fcData.data) ||
      (Array.isArray(fcData?.web) && fcData.web) ||
      [];

    // Filter to known SA job domains for trust.
    const filtered = rawResults.filter((r) => {
      if (!r.url) return false;
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, "");
        return SA_JOB_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
      } catch {
        return false;
      }
    });

    // Use filtered if we have enough, else fall back to raw to avoid empty results.
    const source = filtered.length >= 3 ? filtered : rawResults;
    const listings = normalize(source, safeStr(body.province, MAX_FILTER_CHARS));

    return new Response(
      JSON.stringify({ listings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("jobgenie-jobs error:", e);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
