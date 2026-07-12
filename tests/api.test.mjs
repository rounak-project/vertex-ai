import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleBuild, handleChat } from "../app/api/groq-service.mjs";

const personalKey = "gsk_test_personal_key";
const missingKeyMessage = "Add your personal Groq API key in Vertex Settings.";
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
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
