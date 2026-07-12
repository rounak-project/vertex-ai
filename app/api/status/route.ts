export async function GET() {
  return Response.json({ connected: Boolean(process.env.GROQ_API_KEY), provider: "groq" });
}
