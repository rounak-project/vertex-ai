"use client";

import { FormEvent, useMemo, useState } from "react";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

function domainFor(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ResultCard({ title, url, snippet }: SearchResult) {
  const domain = domainFor(url);

  return (
    <article className="search-result-card">
      <div className="result-source">
        <span
          className="result-favicon"
          style={{ backgroundImage: `url("https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}")` }}
        />
        <span>{domain}</span>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="result-title">{title}</a>
      {snippet && <p>{snippet}</p>}
      <a href={url} target="_blank" rel="noopener noreferrer" className="source-link">OPEN SOURCE ↗</a>
    </article>
  );
}

function AIOverview({ answer }: { answer: string }) {
  if (!answer) return null;
  return (
    <section className="ai-overview">
      <p className="overline">VERTEX AI OVERVIEW</p>
      <p>{answer}</p>
    </section>
  );
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const statusText = useMemo(() => {
    if (loading) return "SEARCHING THE WEB";
    if (error) return "SEARCH PAUSED";
    if (searched) return `${results.length} SOURCES`;
    return "TAVILY BASIC SEARCH";
  }, [error, loading, results.length, searched]);

  const runSearch = async (event?: FormEvent, override?: string) => {
    event?.preventDefault();
    const nextQuery = (override ?? query).trim();
    if (!nextQuery || loading) return;

    setQuery(nextQuery);
    setSearched(nextQuery);
    setLoading(true);
    setError("");
    setAnswer("");
    setResults([]);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(nextQuery)}`);
      const data = await response.json() as { answer?: string; results?: SearchResult[]; message?: string };
      if (!response.ok) throw new Error(data.message || "Search failed.");
      setAnswer(data.answer ?? "");
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = (window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onstart: () => void;
        onend: () => void;
        onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onstart: () => void;
        onend: () => void;
        onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void;
      };
    }).SpeechRecognition ?? (window as typeof window & {
      webkitSpeechRecognition?: new () => {
        lang: string;
        start: () => void;
        onstart: () => void;
        onend: () => void;
        onresult: (event: { results: { 0: { 0: { transcript: string } } } }) => void;
      };
    }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      void runSearch(undefined, transcript);
    };
    recognition.start();
  };

  return (
    <section className="search-view">
      <div className="search-shell">
        <div className="search-hero">
          <p className="overline">UNIFIED VERTEX SEARCH</p>
          <h1>Vertex</h1>
          <p>Precision web search with one clean result stream and source-backed AI overview.</p>
        </div>

        <form className="search-box" onSubmit={runSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the web with Vertex..."
            autoComplete="off"
          />
          <button type="button" className={isRecording ? "search-voice recording" : "search-voice"} onClick={startVoiceSearch} aria-label="Voice search">◉</button>
          <button disabled={!query.trim() || loading}>{loading ? "..." : "Search"}</button>
        </form>

        <div className="search-status"><span className={loading ? "live-dot" : "live-dot offline"} />{statusText}</div>

        {loading && (
          <div className="search-loading">
            <div className="mini-orb">V</div>
            <b>VERTEX IS SEARCHING</b>
            <span>Querying Tavily · Cleaning snippets · Ranking sources</span>
          </div>
        )}

        {!loading && error && <div className="search-error">⚠ {error}</div>}

        {!loading && !error && searched && !answer && results.length === 0 && (
          <div className="search-empty">
            <span>◇</span>
            <b>No results found</b>
            <small>Try a more specific query or check the spelling.</small>
          </div>
        )}

        {!loading && !error && (answer || results.length > 0) && (
          <div className="search-results">
            <AIOverview answer={answer} />
            {results.map((result) => <ResultCard key={result.url} {...result} />)}
          </div>
        )}
      </div>
    </section>
  );
}
