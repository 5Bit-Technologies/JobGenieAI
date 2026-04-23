import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Download, RotateCcw, Loader2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CVPreview, EMPTY_CV, type CVData } from "@/components/CVPreview";
import { profileSystemExtra, useProfile } from "@/lib/profile";
import { callJson, streamChat, type ChatMessage } from "@/lib/ai";
import { markToolUsed } from "@/lib/progress";
import { useLocalStorage } from "@/lib/storage";
import { toast } from "sonner";

export const Route = createFileRoute("/cv-builder")({
  head: () => ({
    meta: [
      { title: "CV Builder — JobGenie" },
      { name: "description", content: "Chat your way to a downloadable CV. Free, no login required." },
      { property: "og:title", content: "CV Builder — JobGenie" },
      { property: "og:description", content: "Build a professional CV in 10 minutes with AI guidance." },
    ],
  }),
  component: CVBuilder,
});

const INITIAL_GREETING = (name: string, industry: string, experience: string) =>
  `Sawubona ${name || "friend"}! 🌟 I'm your JobGenie. We're going to build your CV together — section by section. No pressure, no judgement.

Let's start simple. Tell me:
1. Your **full name**
2. Your **email address** (or "no email" if you don't have one yet)
3. Your **phone number**
4. The **city/town** you live in

Take your time. I'm right here.`;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function CVBuilder() {
  const { profile } = useProfile();
  const [cv, setCv] = useLocalStorage<CVData>("jobgenie:cv", EMPTY_CV);
  const [messages, setMessages] = useLocalStorage<ChatTurn[]>("jobgenie:cv-chat", []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"chat" | "preview">("chat");

  useEffect(() => {
    markToolUsed("cv-builder");
  }, []);

  // Seed greeting if empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: INITIAL_GREETING(profile.name, profile.industry || "", profile.experience || ""),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userTurn: ChatTurn = { role: "user", content: text };
    const next: ChatTurn[] = [...messages, userTurn, { role: "assistant", content: "" }];
    setMessages(next);
    setStreaming(true);

    const aiMessages: ChatMessage[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    let acc = "";
    await streamChat({
      systemExtra: `${profileSystemExtra(profile)}
You are guiding the user through building a CV, section by section, in this order:
Personal details → Objective → Education → Experience (or skills they have built outside work for users with no experience) → Skills → Hobbies/Interests → References.

Rules:
- Ask ONE small thing at a time. Do not overwhelm.
- For users with NO experience, gently suggest skills based on their industry interest (e.g. for Retail: customer service, cash handling, teamwork).
- If a user writes something poorly, kindly rewrite it for them and explain why your version is stronger.
- After every 1-2 sections, briefly summarise what we have and what's next.
- When the user has covered ALL sections, tell them to click "Generate Full CV".
- Keep responses short and warm — under 120 words. Use emoji sparingly.
- Use simple English. Avoid jargon.`,
      messages: aiMessages,
      onDelta: (chunk) => {
        acc += chunk;
        setMessages((curr) => {
          const copy = [...curr];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      },
      onError: (err) => {
        toast.error(err.message);
        setMessages((curr) => curr.slice(0, -1));
      },
    });
    setStreaming(false);
  }

  async function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const transcript = messages
        .map((m) => `${m.role === "user" ? "USER" : "JOBGENIE"}: ${m.content}`)
        .join("\n");

      const result = await callJson<CVData>({
        systemExtra: `${profileSystemExtra(profile)}
You will be given a conversation between JobGenie and a job seeker. Extract the user's CV details into a clean JSON CV.

Return ONLY valid JSON with this exact shape:
{
  "personal": { "name": "...", "title": "...", "email": "...", "phone": "...", "location": "...", "linkedin": "..." },
  "objective": "2-3 sentence professional summary tailored to their industry interest",
  "education": [ { "school": "...", "qualification": "...", "year": "...", "details": "..." } ],
  "experience": [ { "role": "...", "company": "...", "period": "...", "details": "..." } ],
  "skills": [ "skill1", "skill2", "skill3", "..." ],
  "hobbies": [ "..." ],
  "references": [ { "name": "...", "relation": "...", "contact": "..." } ]
}

Rules:
- If the user has no experience, set "experience": [].
- If the user has no objective, write a strong 2-3 sentence one based on their industry interest, age, and qualification — first person, confident but humble.
- Skills must be 5-10 items, mix of soft + hard skills relevant to their interest.
- Hobbies: only include if the user mentioned them.
- References: include only if the user provided them; otherwise [].
- Keep all text in clear, simple English.
- Use the exact shape above. Do NOT add other fields.`,
        messages: [
          {
            role: "user",
            content: `Conversation:\n${transcript}\n\nNow extract the CV as JSON.`,
          },
        ],
      });
      setCv(result);
      setTab("preview");
      toast.success("Your CV is ready! 🎉");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't generate CV");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPdf() {
    const source = document.getElementById("cv-print-target");
    if (!source) return;
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      // Clone into an isolated, off-screen container so html2pdf never walks
      // ancestor styles that use oklch() (which html2canvas can't parse).
      const clone = source.cloneNode(true) as HTMLElement;
      const sandbox = document.createElement("div");
      sandbox.style.position = "fixed";
      sandbox.style.left = "-10000px";
      sandbox.style.top = "0";
      sandbox.style.width = "820px";
      sandbox.style.background = "#ffffff";
      sandbox.style.color = "#1f2937";
      // Reset CSS custom properties that resolve to oklch() in the design system
      sandbox.style.cssText += `
        --background:#ffffff;--foreground:#1f2937;--card:#ffffff;--card-foreground:#1f2937;
        --popover:#ffffff;--popover-foreground:#1f2937;--primary:#1B4332;--primary-foreground:#ffffff;
        --secondary:#f5f5f4;--secondary-foreground:#1f2937;--muted:#f5f5f4;--muted-foreground:#6b7280;
        --accent:#D4A017;--accent-foreground:#1B4332;--destructive:#dc2626;--destructive-foreground:#ffffff;
        --border:#e5e7eb;--input:#e5e7eb;--ring:#1B4332;
      `;
      sandbox.appendChild(clone);
      document.body.appendChild(sandbox);

      await html2pdf()
        .from(clone)
        .set({
          margin: 0,
          filename: `${cv.personal.name || "JobGenie"}-CV.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();

      document.body.removeChild(sandbox);
    } catch (e) {
      console.error("PDF export failed:", e);
      toast.error("Couldn't download PDF. Please try again.");
    }
  }

  function startOver() {
    if (!confirm("Start over? Your current CV and chat will be cleared.")) return;
    setMessages([]);
    setCv(EMPTY_CV);
    setTimeout(() => {
      setMessages([
        {
          role: "assistant",
          content: INITIAL_GREETING(profile.name, profile.industry || "", profile.experience || ""),
        },
      ]);
    }, 50);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-widest text-clay">CV Builder</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Let's build your CV.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={startOver}>
            <RotateCcw className="h-4 w-4" /> Start over
          </Button>
          <Button variant="default" size="sm" onClick={generate} disabled={generating || messages.length < 3}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Full CV
          </Button>
          <Button variant="gold" size="sm" onClick={downloadPdf} disabled={!cv.personal.name}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
        <button
          onClick={() => setTab("chat")}
          className={`rounded-xl py-2 text-sm font-semibold ${tab === "chat" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Chat
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`rounded-xl py-2 text-sm font-semibold ${tab === "preview" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Preview
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chat */}
        <div className={`${tab === "chat" ? "block" : "hidden"} lg:block`}>
          <div className="flex h-[70vh] flex-col rounded-3xl border border-border bg-card shadow-card lg:h-[78vh]">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-sun">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <p className="font-display font-bold">JobGenie</p>
              <span className="ml-auto text-xs text-muted-foreground">
                {streaming ? "typing..." : "online"}
              </span>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-foreground"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-strong:text-primary">
                      <ReactMarkdown>{m.content || (streaming ? "..." : "")}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type your answer..."
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl"
                  disabled={streaming}
                />
                <Button onClick={send} disabled={streaming || !input.trim()} size="icon" className="h-12 w-12">
                  {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className={`${tab === "preview" ? "block" : "hidden"} lg:block`}>
          <div className="rounded-3xl border border-border bg-gradient-warm p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-4 w-4" /> Live preview
            </div>
            <div className="max-h-[78vh] overflow-y-auto rounded-2xl">
              <div id="cv-print-target">
                <CVPreview cv={cv} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
