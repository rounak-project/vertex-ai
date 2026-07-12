type IncomingMessage = { role: "user" | "assistant"; content: string };

const prompts: Record<string, string> = {
  general: "You are Vertex, Rounak's personal AI collaborator. Sound warm, natural, observant and confident—not robotic, overly formal or fake-cheerful. Understand casual language and typos. Lead with the answer. Be concise by default, remember the visible conversation, and ask a clarifying question only when the missing detail truly changes the answer. Never claim you performed an action you did not perform. Use bullets only when they improve scanning.",
  study: "You are Vertex Study Mode for a Class 7 student. Be an encouraging human-like tutor. Diagnose what the student understands, explain one idea at a time in simple language, use relatable examples, correct mistakes kindly, and give a tiny check-for-understanding when useful. Do not dump a textbook-sized answer.",
  build: "You are Vertex Build Mode, a senior product engineer pairing with Rounak. First understand the desired outcome, then give complete working and secure code. Explain decisions briefly, anticipate common errors, preserve existing behavior, and never pretend code was executed when it was not. When the user asks to create a playable website, recommend the Website Builder instead of returning Python.",
  creative: "You are Vertex Create Mode, a sharp and playful creative partner. Produce original ideas with strong taste, concrete details and variety. Avoid generic AI slogans and repetitive layouts. Help turn the chosen idea into a finished result.",
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: IncomingMessage[]; mode?: string; responseLength?: string; customInstructions?: string };
    const messages = Array.isArray(body.messages) ? body.messages.filter((item) => item?.content && ["user", "assistant"].includes(item.role)).slice(-12) : [];
    if (!messages.length) return Response.json({ message: "Please type a message first." }, { status: 400 });

    const groqKey = request.headers.get("x-groq-api-key")?.trim() || process.env.GROQ_API_KEY;
    if (!groqKey) {
      const latest = messages[messages.length - 1].content;
      return Response.json({
        connected: false,
        message: `Demo mode is working perfectly. You asked: “${latest.slice(0, 120)}”\n\nOpen Settings and add your free Groq API key to unlock real answers.`,
      });
    }

    const lengthTokens: Record<string, number> = { short: 500, medium: 1000, detailed: 1800 };
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(45000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: `${prompts[body.mode ?? "general"] ?? prompts.general}\nResponse length: ${body.responseLength ?? "short"}.\nUser preferences: ${(body.customInstructions ?? "").slice(0, 700)}` }, ...messages],
        temperature: body.mode === "creative" ? 0.9 : 0.55,
        max_tokens: lengthTokens[body.responseLength ?? "short"] ?? 500,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq error", response.status, detail.slice(0, 300));
      return Response.json({ connected: false, message: "Groq rejected this key or reached its free limit. Check the key in Settings and try again." }, { status: 502 });
    }
    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    return Response.json({ connected: true, message: data.choices?.[0]?.message?.content ?? "I could not generate a response." });
  } catch {
    return Response.json({ message: "That request could not be processed." }, { status: 400 });
  }
}
