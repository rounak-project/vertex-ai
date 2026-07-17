"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Builder from "./Builder";
import Search from "./Search";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "general" | "study" | "build" | "creative";

const starters = [
  "Teach me how black holes work",
  "Build a neon portfolio homepage",
  "Quiz me on Class 7 science",
  "Invent a game idea I can code",
];

const modes: { id: Mode; icon: string; label: string }[] = [
  { id: "general", icon: "✦", label: "Vertex" },
  { id: "study", icon: "◈", label: "Study" },
  { id: "build", icon: "⌘", label: "Build" },
  { id: "creative", icon: "◎", label: "Create" },
];

function formatText(text: string) {
  const chunks = text.split(/(```[\s\S]*?```)/g);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith("```")) {
      const clean = chunk.replace(/^```\w*\n?/, "").replace(/```$/, "");
      return <pre key={index}><code>{clean}</code></pre>;
    }
    return <span key={index}>{chunk}</span>;
  });
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("general");
  const [view, setView] = useState<"chat" | "search" | "builder" | "settings">("chat");
  const [apiKey, setApiKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [responseLength, setResponseLength] = useState("short");
  const [customInstructions, setCustomInstructions] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const connected = Boolean(apiKey);
  const endRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const savedNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const saved = localStorage.getItem("vertex-chat");
      if (saved) {
        try { setMessages(JSON.parse(saved) as Message[]); } catch { setMessages([]); }
      }
      const savedKey = localStorage.getItem("vertex-groq-key") ?? "";
      setApiKey(savedKey);
      setKeyDraft(savedKey);
      setResponseLength(localStorage.getItem("vertex-length") ?? "short");
      setCustomInstructions(localStorage.getItem("vertex-instructions") ?? "");
      setStorageReady(true);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      requestRef.current?.abort();
      if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (storageReady) localStorage.setItem("vertex-chat", JSON.stringify(messages));
  }, [messages, storageReady]);

  const send = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const prompt = (suggested ?? input).trim();
    if (!prompt || loading) return;
    const next: Message[] = [...messages, { role: "user", content: prompt }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", ...(apiKey ? { "X-Groq-Api-Key": apiKey } : {}) },
        body: JSON.stringify({ messages: next.slice(-12), mode, responseLength, customInstructions }),
      });
      const data = await response.json();
      setMessages([...next, { role: "assistant", content: data.message ?? "I hit a temporary error. Try again." }]);
    } catch (cause) {
      const stopped = cause instanceof DOMException && cause.name === "AbortError";
      setMessages([...next, { role: "assistant", content: stopped ? "Generation stopped." : "Vertex could not reach the AI service. Please try again." }]);
    } finally { setLoading(false); requestRef.current = null; }
  };

  const startVoice = () => {
    const SpeechRecognition = (window as typeof window & { webkitSpeechRecognition?: new () => { lang:string; start:()=>void; onresult:(e:{ results: { 0: { 0: { transcript: string } } } })=>void } }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.start();
  };

  const saveKey = () => {
    const clean = keyDraft.trim();
    if (clean) localStorage.setItem("vertex-groq-key", clean);
    else localStorage.removeItem("vertex-groq-key");
    setApiKey(clean);
    setSavedNotice(true);
    if (savedNoticeTimerRef.current) window.clearTimeout(savedNoticeTimerRef.current);
    savedNoticeTimerRef.current = window.setTimeout(() => setSavedNotice(false), 2200);
  };

  return (
    <main className="vertex-app">
      <div className="aurora" />
      <aside className={sidebar ? "sidebar open" : "sidebar"}>
        <div className="logo"><span>V</span><b>VERTEX</b></div>
        <button className="new-chat" onClick={() => { setMessages([]); setSidebar(false); }}>＋ NEW CONVERSATION</button>
        <p className="nav-label">INTELLIGENCE MODES</p>
        <nav>
          {modes.map((item) => <button key={item.id} className={view === "chat" && mode === item.id ? "active" : ""} onClick={() => { setMode(item.id); setView("chat"); setSidebar(false); }}><i>{item.icon}</i>{item.label}<span>›</span></button>)}
          <button className={view === "search" ? "active" : ""} onClick={() => { setView("search"); setSidebar(false); }}><i>⌕</i>Search<span>›</span></button>
          <button className={view === "builder" ? "active" : ""} onClick={() => { setView("builder"); setSidebar(false); }}><i>▣</i>Website Builder<span>›</span></button>
          <button className={view === "settings" ? "active" : ""} onClick={() => { setView("settings"); setSidebar(false); }}><i>⚙</i>Settings<span>›</span></button>
        </nav>
        <div className="system-card">
          <div className="system-title"><span className={connected ? "live-dot" : "live-dot offline"} /> SYSTEM STATUS</div>
          <strong>{connected ? "GROQ READY" : "DEMO MODE"}</strong>
          <small>{connected ? "Personal Groq key saved" : "Open Settings to add key"}</small>
        </div>
        <div className="profile"><div>R</div><span><b>Rounak</b><small>Creator access</small></span><button onClick={() => setView("settings")}>⚙</button></div>
      </aside>

      <section className="workspace">
        <header>
          <button className="menu" onClick={() => setSidebar((value) => !value)}>☰</button>
          <div><span className="pulse" /> VERTEX CORE <small>/ {view === "settings" ? "SETTINGS" : view === "builder" ? "BUILDER" : view === "search" ? "SEARCH" : mode.toUpperCase()}</small></div>
          <div className="header-actions"><span>{connected ? "ENCRYPTED · LIVE" : "LOCAL DEMO"}</span><button onClick={() => setMessages([])}>CLEAR</button></div>
        </header>

        <div className="chat-area">
          {view === "builder" ? <Builder apiKey={apiKey} /> : view === "search" ? <Search /> : view === "settings" ? (
            <section className="settings-view">
              <p className="overline">VERTEX CONFIGURATION</p>
              <h1>Connect your <em>Groq API</em></h1>
              <p className="settings-intro">Your key is saved only in this browser on this device. It is never added to the website code or GitHub.</p>
              <div className="key-panel">
                <div className="key-panel-head"><span>⚡</span><div><strong>GROQ CLOUD</strong><small>Free AI engine</small></div><b className={connected ? "connected-badge" : "connected-badge off"}>{connected ? "READY" : "NOT CONNECTED"}</b></div>
                <label htmlFor="groq-key">GROQ API KEY</label>
                <div className="key-input">
                  <input id="groq-key" type={keyVisible ? "text" : "password"} value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="gsk_••••••••••••••••••••" autoComplete="off" spellCheck={false} />
                  <button onClick={() => setKeyVisible((value) => !value)}>{keyVisible ? "HIDE" : "SHOW"}</button>
                </div>
                <div className="key-actions"><button className="save-key" onClick={saveKey}>{savedNotice ? "✓ SAVED" : "SAVE KEY"}</button>{apiKey && <button className="remove-key" onClick={() => { setKeyDraft(""); localStorage.removeItem("vertex-groq-key"); setApiKey(""); }}>REMOVE</button>}</div>
                <div className="privacy-note"><span>◆</span><p><strong>DEVICE-ONLY STORAGE</strong><br />Clearing browser data removes the key. Never use this feature on a shared computer.</p></div>
                <label>RESPONSE LENGTH</label>
                <div className="length-options">{["short","medium","detailed"].map((item) => <button key={item} className={responseLength === item ? "active" : ""} onClick={() => { setResponseLength(item); localStorage.setItem("vertex-length", item); }}>{item.toUpperCase()}</button>)}</div>
                <label htmlFor="custom-instructions">CUSTOM INSTRUCTIONS</label>
                <textarea className="instruction-box" id="custom-instructions" value={customInstructions} onChange={(event) => setCustomInstructions(event.target.value)} onBlur={() => localStorage.setItem("vertex-instructions", customInstructions)} placeholder="Example: Call me Rounak and explain difficult things simply." />
              </div>
              <button className="back-chat" onClick={() => setView("chat")}>← BACK TO VERTEX CHAT</button>
            </section>
          ) : messages.length === 0 ? (
            <section className="welcome">
              <div className="orb"><div className="orb-core">V</div><span className="ring one" /><span className="ring two" /></div>
              <p className="overline">PERSONAL INTELLIGENCE SYSTEM</p>
              <h1>What will we <em>create</em> today?</h1>
              <p className="intro">Ask questions, master school topics, design websites, write code, or turn a wild idea into something real.</p>
              <div className="starter-grid">
                {starters.map((starter, index) => <button key={starter} onClick={() => send(undefined, starter)}><span>0{index + 1}</span>{starter}<b>↗</b></button>)}
              </div>
            </section>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <article key={index} className={message.role}>
                  <div className="avatar">{message.role === "assistant" ? "V" : "R"}</div>
                  <div className="bubble"><label>{message.role === "assistant" ? "VERTEX" : "YOU"}</label><p>{formatText(message.content)}</p>{message.role === "assistant" && <div className="message-actions"><button onClick={() => navigator.clipboard.writeText(message.content)}>COPY</button>{index === messages.length - 1 && <button onClick={() => { const prior = messages.slice(0, -1); const lastUser = [...prior].reverse().find((item) => item.role === "user"); if (lastUser) { setMessages(prior.slice(0, prior.lastIndexOf(lastUser))); setInput(lastUser.content); } }}>REGENERATE</button>}</div>}</div>
                </article>
              ))}
              {loading && <article className="assistant"><div className="avatar">V</div><div className="bubble"><label>VERTEX</label><div className="thinking"><i /><i /><i /></div></div></article>}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {view === "chat" && <div className="composer-wrap">
          <form className="composer" onSubmit={send}>
            <button type="button" className="attach">＋</button>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Message Vertex ${mode === "general" ? "" : `in ${mode} mode`}...`} rows={1} />
            <button type="button" className="voice" onClick={startVoice} title="Speak">◉</button>
            {loading ? <button type="button" className="send stop" onClick={() => requestRef.current?.abort()}>■</button> : <button className="send" disabled={!input.trim()}>↑</button>}
          </form>
          <p>VERTEX CAN MAKE MISTAKES · CHECK IMPORTANT INFORMATION</p>
        </div>}
      </section>
    </main>
  );
}
