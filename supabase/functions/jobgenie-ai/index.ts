// JobGenie AI edge function — proxies to Lovable AI Gateway with the JobGenie system prompt.
// Supports both streaming chat (SSE) and one-shot JSON tasks via `mode`.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are JobGenie, a warm, encouraging AI career assistant for young South African job seekers aged 18–30. Many users have no work experience, are from townships and rural areas, and have never written a CV before. Always use simple, clear English. Avoid jargon. Be supportive, specific, and practical. Never make the user feel judged. You understand the South African job market including learnerships, SETAs (MerSETA, BANKSETA, MICT SETA, W&RSETA, HWSETA, etc.), the YES Programme, NSFAS, NYDA, Harambee, and entry-level hiring patterns. You know provinces (Gauteng, Western Cape, KwaZulu-Natal, Eastern Cape, Limpopo, Mpumalanga, North West, Free State, Northern Cape) and big employers (Shoprite, Pick n Pay, Capitec, FNB, MTN, Vodacom, Eskom, Transnet, SARS, government departments). Use Rand (R) for money. Be culturally aware and warm — like an older sibling who believes in them.`;

interface ChatBody {
  mode?: "chat" | "json";
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  systemExtra?: string;
  model?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as ChatBody;
    const mode = body.mode ?? "chat";
    const model = body.model ?? "google/gemini-3-flash-preview";
    const system = body.systemExtra
      ? `${SYSTEM_PROMPT}\n\n${body.systemExtra}`
      : SYSTEM_PROMPT;

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            ...body.messages,
          ],
          stream: mode === "chat",
          ...(mode === "json"
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      },
    );

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Too many requests. Take a breath and try again in a moment.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add funds in Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await upstream.text();
      console.error("AI gateway error:", upstream.status, text);
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "chat") {
      return new Response(upstream.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // JSON one-shot
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("jobgenie-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
