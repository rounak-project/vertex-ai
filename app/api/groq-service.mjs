const prompts = {
  general: "You are Vertex, Rounak's personal AI collaborator. Sound warm, natural, observant and confident—not robotic, overly formal or fake-cheerful. Understand casual language and typos. Lead with the answer. Be concise by default, remember the visible conversation, and ask a clarifying question only when the missing detail truly changes the answer. Never claim you performed an action you did not perform. Use bullets only when they improve scanning.",
  study: "You are Vertex Study Mode for a Class 7 student. Be an encouraging human-like tutor. Diagnose what the student understands, explain one idea at a time in simple language, use relatable examples, correct mistakes kindly, and give a tiny check-for-understanding when useful. Do not dump a textbook-sized answer.",
  build: "You are Vertex Build Mode, a senior product engineer pairing with Rounak. First understand the desired outcome, then give complete working and secure code. Explain decisions briefly, anticipate common errors, preserve existing behavior, and never pretend code was executed when it was not. When the user asks to create a playable website, recommend the Website Builder instead of returning Python.",
  creative: "You are Vertex Create Mode, a sharp and playful creative partner. Produce original ideas with strong taste, concrete details and variety. Avoid generic AI slogans and repetitive layouts. Help turn the chosen idea into a finished result.",
};

export function getStatus() {
  return Response.json({ provider: "groq", auth: "byok" });
}

export async function handleChat(request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages)
      ? body.messages.filter((item) => item?.content && ["user", "assistant"].includes(item.role)).slice(-12)
      : [];
    if (!messages.length) return Response.json({ message: "Please type a message first." }, { status: 400 });

    const groqKey = request.headers.get("x-groq-api-key")?.trim();
    if (!groqKey) {
      return Response.json({ message: "Add your personal Groq API key in Vertex Settings." }, { status: 401 });
    }

    const lengthTokens = { short: 500, medium: 1000, detailed: 1800 };
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
      return Response.json({ connected: false, message: "Groq rejected this key or reached its free limit. Check the key in Vertex Settings and try again." }, { status: 502 });
    }
    const data = await response.json();
    return Response.json({ connected: true, message: data.choices?.[0]?.message?.content ?? "I could not generate a response." });
  } catch {
    return Response.json({ message: "That request could not be processed." }, { status: 400 });
  }
}

export async function handleBuild(request) {
  try {
    const key = request.headers.get("x-groq-api-key")?.trim();
    if (!key) return Response.json({ message: "Add your personal Groq API key in Vertex Settings." }, { status: 401 });
    const { prompt, currentHtml, action } = await request.json();
    if (!prompt?.trim()) return Response.json({ message: "Describe the website first." }, { status: 400 });
    const existing = action === "refine" && currentHtml ? `\n\nCURRENT HTML TO IMPROVE:\n${currentHtml.slice(0, 48000)}` : "";
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: action === "refine" ? .45 : .72,
        max_tokens: 7500,
        messages: [
          { role: "system", content: "You are Vertex Website Builder, an expert product designer and frontend engineer. Return ONLY one complete production-quality HTML document with inline CSS and JavaScript. No markdown fences or explanation. Make it visually distinctive, responsive, accessible and fully interactive. Check your own work for broken JavaScript, missing elements, unreadable contrast, overflow and non-working controls before responding. Use no external assets unless absolutely necessary. It must be a single-file app: every navigation item, CTA, form and button must work in-page with JavaScript and must never navigate to a relative URL, submit to a server route, reload the page, use window.location, or open another page. Use sections, modals, state changes or smooth scrolling instead. Preserve working features during refinements. Never output Python or incomplete snippets." },
          { role: "user", content: `${action === "refine" ? "Improve the existing site with this request" : "Create this site"}: ${prompt.slice(0, 2500)}${existing}` },
        ],
      }),
    });
    if (!response.ok) return Response.json({ message: "Groq could not build this site. Check the key in Vertex Settings or free limit." }, { status: 502 });
    const data = await response.json();
    let html = data.choices?.[0]?.message?.content?.trim() ?? "";
    html = html.replace(/^```html\s*/i, "").replace(/```$/, "").trim();
    if (!/^<!doctype html>|^<html/i.test(html)) return Response.json({ message: "The AI returned incomplete code. Try generating again." }, { status: 502 });
    const previewGuard = `<script>(function(){window.addEventListener('error',function(e){parent.postMessage({source:'vertex-preview',error:e.message||'Unknown script error'},'*')});window.addEventListener('unhandledrejection',function(e){parent.postMessage({source:'vertex-preview',error:String(e.reason||'Unhandled error')},'*')});function notice(){var n=document.getElementById('__vertex_notice');if(!n){n=document.createElement('div');n.id='__vertex_notice';n.style.cssText='position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:2147483647;padding:10px 14px;border-radius:8px;background:#111827;color:#fff;font:12px Arial;box-shadow:0 8px 30px #0008';document.body.appendChild(n)}n.textContent='Navigation stays inside the Vertex preview';clearTimeout(window.__vertexTimer);window.__vertexTimer=setTimeout(function(){n.remove()},1800)}document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&a.getAttribute('href')&&!a.getAttribute('href').startsWith('#')){e.preventDefault();e.stopPropagation();notice()}},true);document.addEventListener('submit',function(e){e.preventDefault();e.stopPropagation();notice()},true);window.open=function(){notice();return null};})();<\/script>`;
    html = html.includes("</body>") ? html.replace("</body>", `${previewGuard}</body>`) : `${html}${previewGuard}`;
    return Response.json({ html });
  } catch {
    return Response.json({ message: "The build request failed." }, { status: 400 });
  }
}
