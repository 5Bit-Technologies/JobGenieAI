// Lightweight client for the JobGenie AI edge function.
// Two modes: streaming chat (token-by-token), and one-shot JSON.

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jobgenie-ai`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type Body = {
  mode?: "chat" | "json";
  messages: ChatMessage[];
  systemExtra?: string;
  model?: string;
};

export async function streamChat({
  messages,
  systemExtra,
  model,
  onDelta,
  onDone,
  onError,
  signal,
}: Body & {
  onDelta: (chunk: string) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}) {
  try {
    const resp = await fetch(FN_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({ mode: "chat", messages, systemExtra, model } satisfies Body),
    });

    if (!resp.ok || !resp.body) {
      let msg = "AI request failed";
      try {
        const j = await resp.json();
        msg = j.error ?? msg;
      } catch (_) { /* ignore */ }
      throw new Error(msg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone?.();
  } catch (e) {
    onError?.(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function callJson<T = unknown>({
  messages,
  systemExtra,
  model,
}: Body): Promise<T> {
  const resp = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ mode: "json", messages, systemExtra, model } satisfies Body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error ?? "AI request failed");
  // content is a JSON string; parse it
  try {
    return JSON.parse(data.content) as T;
  } catch {
    throw new Error("AI returned malformed JSON");
  }
}

export async function callText({
  messages,
  systemExtra,
  model,
}: Body): Promise<string> {
  let out = "";
  await new Promise<void>((resolve, reject) => {
    streamChat({
      messages,
      systemExtra,
      model,
      onDelta: (c) => { out += c; },
      onDone: () => resolve(),
      onError: (e) => reject(e),
    });
  });
  return out;
}
