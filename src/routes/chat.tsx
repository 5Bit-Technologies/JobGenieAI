import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Send,
  Paperclip,
  Sparkles,
  Trash2,
  FileText,
  X,
  StopCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { streamChat, type ChatMessage } from "@/lib/ai";
import { profileSystemExtra, useProfile } from "@/lib/profile";
import { extractDocument, type ExtractedDoc } from "@/lib/extractDoc";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Talk to JobGenie — AI Career Chat" },
      {
        name: "description",
        content:
          "Ask JobGenie anything about jobs, CVs, learnerships, motivational letters, interviews. Upload a doc and chat about it.",
      },
      { property: "og:title", content: "Talk to JobGenie" },
      {
        property: "og:description",
        content: "Your AI career chat — for South African youth.",
      },
    ],
  }),
  component: ChatPage,
});

interface UIMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Help me write a motivational letter for a learnership",
  "How do I apply for the YES Programme?",
  "Tips for my first interview at Shoprite",
  "What jobs can I apply for with just Matric?",
  "Write a short cover letter for a retail job",
];

function ChatPage() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [docs, setDocs] = useState<ExtractedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new tokens
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const docContext = useMemo(() => {
    if (docs.length === 0) return "";
    const parts = docs.map(
      (d) => `--- Document: ${d.name}${d.truncated ? " (truncated)" : ""} ---\n${d.text}`,
    );
    return `The user has uploaded the following document(s). Use them when answering:\n\n${parts.join("\n\n")}`;
  }, [docs]);

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || busy) return;
    setInput("");

    const userMsg: UIMessage = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setBusy(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m,
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const apiMessages: ChatMessage[] = next.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const profileExtra = profileSystemExtra(profile);
    const systemExtra = [profileExtra, docContext].filter(Boolean).join("\n\n");

    await streamChat({
      messages: apiMessages,
      systemExtra: systemExtra || undefined,
      onDelta: upsert,
      signal: ctrl.signal,
      onError: (e) => {
        if (e.name === "AbortError") return;
        toast.error(e.message || "Chat failed");
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      },
      onDone: () => {
        setBusy(false);
        abortRef.current = null;
      },
    });
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  function clearChat() {
    if (busy) stop();
    setMessages([]);
    setDocs([]);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const out: ExtractedDoc[] = [];
      for (const f of Array.from(files)) {
        try {
          const doc = await extractDocument(f);
          out.push(doc);
          toast.success(`Loaded "${doc.name}"`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : `Couldn't read ${f.name}`);
        }
      }
      if (out.length) setDocs((d) => [...d, ...out]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeDoc(name: string) {
    setDocs((d) => d.filter((x) => x.name !== name));
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-widest text-clay">
            Talk to JobGenie
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-bold sm:text-3xl">
            Ask me anything 💬
          </h1>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearChat}>
            <Trash2 className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>

      {/* Doc chips */}
      {docs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {docs.map((d) => (
            <span
              key={d.name}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-medium text-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              {d.name}
              {d.truncated && <span className="text-[10px] opacity-70">(trimmed)</span>}
              <button
                onClick={() => removeDoc(d.name)}
                className="ml-1 rounded-full hover:bg-primary/10"
                aria-label={`Remove ${d.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-card sm:p-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-sun shadow-glow">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">
              Hey {profile.name || "friend"} — what's on your mind?
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Ask me about jobs, CVs, motivational letters, learnerships, interviews, or
              upload a document and we'll work through it together.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} />
            ))}
            {busy && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> JobGenie is thinking…
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-3 rounded-3xl border border-border bg-card p-3 shadow-card">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            docs.length
              ? "Ask about your document, or anything else…"
              : "Ask JobGenie anything…  (Shift+Enter for new line)"
          }
          className="min-h-14 resize-none rounded-2xl border-0 bg-transparent text-sm focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md,.rtf,application/pdf,text/plain"
              multiple
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || busy}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              Attach
            </Button>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              PDF, DOCX, TXT — up to 10 MB
            </p>
          </div>
          {busy ? (
            <Button type="button" variant="outline" size="sm" onClick={stop}>
              <StopCircle className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => send()}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" /> Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1 prose-strong:text-primary">
            <ReactMarkdown>{content || "…"}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
