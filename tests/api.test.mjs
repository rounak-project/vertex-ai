import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleBuild, handleChat } from "../app/api/groq-service.mjs";

const personalKey = "gsk_test_personal_key";
const missingKeyMessage = "Add your personal Groq API key in Vertex Settings.";
const originalFetch = globalThis.fetch;
const originalTavilyKey = process.env.TAVILY_API_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalTavilyKey === undefined) delete process.env.TAVILY_API_KEY;
  else process.env.TAVILY_API_KEY = originalTavilyKey;
});

test("missing X-Groq-Api-Key returns 401 for chat and builder", async () => {
  const chatResponse = await handleChat(new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
  }));

  assert.equal(chatResponse.status, 401);
  assert.equal((await chatResponse.json()).message, missingKeyMessage);

  const buildResponse = await handleBuild(new Request("http://localhost/api/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "Create a game" }),
  }));

  assert.equal(buildResponse.status, 401);
  assert.equal((await buildResponse.json()).message, missingKeyMessage);
});

test("chat reads the browser key from the request header and does not return it", async () => {
  let authorization = "";
  globalThis.fetch = async (_url, init) => {
    authorization = init.headers.Authorization;
    return Response.json({ choices: [{ message: { content: "Hello from Groq" } }] });
  };

  const response = await handleChat(new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-groq-api-key": personalKey },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
  }));

  const body = await response.json();
  assert.equal(authorization, `Bearer ${personalKey}`);
  assert.equal(body.message, "Hello from Groq");
  assert.doesNotMatch(JSON.stringify(body), new RegExp(personalKey));
});

test("builder reads the browser key from the request header and does not return it", async () => {
  let authorization = "";
  globalThis.fetch = async (_url, init) => {
    authorization = init.headers.Authorization;
    return Response.json({ choices: [{ message: { content: "<!doctype html><html><body><h1>Built</h1></body></html>" } }] });
  };

  const response = await handleBuild(new Request("http://localhost/api/build", {
    method: "POST",
    headers: { "content-type": "application/json", "x-groq-api-key": personalKey },
    body: JSON.stringify({ prompt: "Create a game" }),
  }));

  const body = await response.json();
  assert.equal(authorization, `Bearer ${personalKey}`);
  assert.match(body.html, /<h1>Built<\/h1>/);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(personalKey));
});

test("chat and builder clients send X-Groq-Api-Key from local settings", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const builder = await readFile(new URL("../app/Builder.tsx", import.meta.url), "utf8");

  assert.match(page, /localStorage\.getItem\("vertex-groq-key"\)/);
  assert.match(page, /localStorage\.setItem\("vertex-groq-key", clean\)/);
  assert.match(page, /localStorage\.removeItem\("vertex-groq-key"\)/);
  assert.match(page, /"X-Groq-Api-Key": apiKey/);
  assert.match(builder, /export default function Builder\(\{ apiKey \}: \{ apiKey: string \}\)/);
  assert.match(builder, /"X-Groq-Api-Key": apiKey/);
});

test("search requires Tavily key from server environment only", async () => {
  delete process.env.TAVILY_API_KEY;
  const { handleSearch } = await import("../app/api/search-service.mjs");

  const response = await handleSearch(new Request("http://localhost/api/search?q=vertex"));

  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /Tavily API key/i);
});

test("search sends basic Tavily request without exposing the key", async () => {
  process.env.TAVILY_API_KEY = "tvly_test_secret";
  const { handleSearch } = await import("../app/api/search-service.mjs");
  let requestBody = {};

  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return Response.json({
      answer: "A concise overview.",
      results: [
        { title: "Result **One**", url: "https://example.com/page?b=2&a=1#section", content: "<p>Hello **world** | Menu</p>" },
        { title: "Result **One**", url: "https://duplicate-title.com", content: "Duplicate title" },
        { title: "Second Result", url: "https://example.com/page?a=1&b=2", content: "Duplicate canonical URL" },
        { title: "Third Result", url: "https://third.example/path", content: "[Good source](https://third.example) with useful context." },
      ],
    });
  };

  const response = await handleSearch(new Request("http://localhost/api/search?q=vertex%20ai"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(requestBody.api_key, "tvly_test_secret");
  assert.equal(requestBody.search_depth, "basic");
  assert.equal(requestBody.max_results, 5);
  assert.equal(requestBody.include_answer, true);
  assert.equal(requestBody.include_raw_content, false);
  assert.equal(body.answer, "A concise overview.");
  assert.deepEqual(body.results, [
    {
      title: "Result **One**",
      url: "https://example.com/page?a=1&b=2",
      snippet: "Hello world",
    },
    {
      title: "Third Result",
      url: "https://third.example/path",
      snippet: "Good source with useful context.",
    },
  ]);
  assert.doesNotMatch(JSON.stringify(body), /tvly_test_secret/);
});

test("search UI does not contain category tabs or client-side Tavily key usage", async () => {
  const search = await readFile(new URL("../app/Search.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(search, /TAVILY_API_KEY/);
  assert.doesNotMatch(search, /\["AI",\s*"Web",\s*"News",\s*"Images",\s*"Videos",\s*"Docs",\s*"Shopping",\s*"Maps"\]/);
  assert.doesNotMatch(search, /categoryTabs|searchCategories|activeCategory/);
});
