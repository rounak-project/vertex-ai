"use client";

import { useEffect, useState } from "react";

export default function Builder({ apiKey }: { apiKey: string }) {
  const [prompt, setPrompt] = useState("");
  const [html, setHtml] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("vertex-builder-html") ?? "");
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.source === "vertex-preview" && event.data?.error) setPreviewError(String(event.data.error).slice(0, 180));
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    if (!apiKey) { setError("Add your Groq API key in Settings first."); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/build", { method: "POST", headers: { "Content-Type": "application/json", "X-Groq-Api-Key": apiKey }, body: JSON.stringify({ prompt, currentHtml: html || undefined, action: html ? "refine" : "generate" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Generation failed");
      setHtml(data.html); localStorage.setItem("vertex-builder-html", data.html); setTab("preview"); setPreviewError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Generation failed"); }
    finally { setLoading(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a"); link.href = url; link.download = "vertex-site.html"; link.click(); URL.revokeObjectURL(url);
  };

  return <section className="builder-view">
    <div className="builder-head"><div><p className="overline">VERTEX WEBSITE BUILDER</p><h1>Idea to website in <em>seconds.</em></h1><p>Describe it. Vertex designs, writes and renders a complete browser-ready site.</p></div><span>POWERED BY GROQ</span></div>
    <div className="builder-prompt"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={html ? "Describe the change: make the buttons larger, add sound and improve mobile layout..." : "Create a futuristic Hangman game with neon animations, score, hints and mobile controls..."} /><button onClick={generate} disabled={!prompt.trim() || loading}>{loading ? "BUILDING..." : html ? "✦ APPLY CHANGES" : "✦ GENERATE SITE"}</button></div>
    {error && <div className="builder-error">⚠ {error}</div>}
    <div className="builder-stage">
      <div className="stage-toolbar"><div><button className={tab === "preview" ? "active" : ""} onClick={() => setTab("preview")}>◉ PREVIEW</button><button className={tab === "code" ? "active" : ""} onClick={() => setTab("code")}>⌘ CODE</button></div><div>{html && <><button onClick={() => navigator.clipboard.writeText(html)}>COPY</button><button onClick={download}>DOWNLOAD</button><button onClick={() => { setHtml(""); setPrompt(""); setPreviewError(""); localStorage.removeItem("vertex-builder-html"); }}>NEW</button></>}</div></div>
      {previewError && <div className="preview-warning">⚠ Preview script reported: {previewError}</div>}
      <div className="stage-body">{loading ? <div className="build-loader"><div className="mini-orb">V</div><b>VERTEX IS BUILDING</b><span>Planning · Styling · Coding · Checking</span></div> : html ? tab === "preview" ? <iframe title="Generated website preview" sandbox="allow-scripts" srcDoc={html} /> : <pre><code>{html}</code></pre> : <div className="empty-stage"><span>◇</span><b>Your website will appear here</b><small>Try asking for a game, portfolio, landing page or study tool.</small></div>}</div>
    </div>
  </section>;
}
