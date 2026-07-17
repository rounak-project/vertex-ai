function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function sanitizeSnippet(value) {
  const cleaned = cleanText(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\*+/g, " ")
    .replace(/\|/g, " ")
    .replace(
      /\b(Menu|Navigation|Home|Contact|About|Investments|Livestream|Gallery|Table of Contents|Contents|Index|Login|Sign up|Privacy|Terms)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 180 ? `${cleaned.slice(0, 180).trim()}...` : cleaned;
}

function canonicalUrl(value) {
  const raw = cleanText(value);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    url.searchParams.sort();
    return url.toString();
  } catch {
    return "";
  }
}

export function sanitizeResults(results) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const sanitized = [];

  for (const result of results) {
    const url = canonicalUrl(result.url);
    const title = cleanText(result.title, "Untitled result");
    const titleKey = title.toLowerCase().replace(/\s+/g, " ");
    if (!url || seenUrls.has(url) || seenTitles.has(titleKey)) continue;

    seenUrls.add(url);
    seenTitles.add(titleKey);
    sanitized.push({
      title,
      url,
      snippet: sanitizeSnippet(result.content),
    });
    if (sanitized.length === 5) break;
  }

  return sanitized;
}

export async function handleSearch(request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ answer: "", results: [] });

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ message: "Tavily API key is not configured.", results: [] }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query.slice(0, 500),
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
        include_raw_content: false,
        include_images: false,
      }),
    });

    if (!response.ok) {
      return Response.json({ message: "Vertex Search could not reach Tavily.", results: [] }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({
      answer: cleanText(data.answer),
      results: sanitizeResults(Array.isArray(data.results) ? data.results : []),
    });
  } catch {
    return Response.json({ message: "Search failed. Please try again.", results: [] }, { status: 500 });
  }
}
