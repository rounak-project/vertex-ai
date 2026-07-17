# Vertex AI

Vertex AI is Rounak's personal Next.js assistant app for Vercel. It includes:

- a multi-mode AI chat interface
- a Website Builder that generates single-file HTML sites
- server-side Groq proxy routes that use each visitor's own request key
- local browser storage for chat history, preferences, and generated builder HTML

## Prerequisites

- Node.js `>=22.13.0`
Every visitor enters their own free Groq API key in Vertex Settings. The key is stored only in that visitor's browser localStorage and is sent to the API routes as `X-Groq-Api-Key` for the single request being made.

## Scripts

- `npm run dev`: start the Next.js development server
- `npm run build`: create a production Next.js build
- `npm run start`: start the production server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript without emitting files
- `npm test`: run Node tests for the API routes

## Deploying to Vercel

Create a Vercel project from this repository and deploy with the default Next.js framework settings.

Set `TAVILY_API_KEY` in Vercel project environment variables for Vertex Search. No shared Groq environment variable is required because visitors provide their own Groq API key in Settings.
