import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker(label) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${label}-${process.pid}-${Date.now()}`);
  const entry = (await import(workerUrl.href)).default;
  return typeof entry?.fetch === "function" ? entry : { fetch: entry };
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

test("renders development preview metadata", async () => {
  const worker = await loadWorker("page");

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("chat falls back safely when no API key is configured", async () => {
  const worker = await loadWorker("chat");
  const response = await worker.fetch(new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Hello" }], mode: "general" }),
  }), env, context);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.connected, false);
  assert.match(body.message, /Demo mode/i);
});

test("builder rejects generation without a Groq key", async () => {
  const worker = await loadWorker("builder");
  const response = await worker.fetch(new Request("http://localhost/api/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "Create a game" }),
  }), env, context);
  assert.equal(response.status, 401);
  assert.match((await response.json()).message, /Groq key/i);
});
