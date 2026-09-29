import { NextResponse } from "next/server";

// Strip markdown formatting characters like **, *, #, __ from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{2}(.+?)_{2}/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/^\s*\d+[\.)] \s+/gm, (m) => m.trim() + " ")
    .trim();
}

function enforcePointWiseFormatting(text: string): string {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return "";

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-*•\s]+/, "- ").replace(/^--+\s*/, "- "))
    .filter(Boolean);

  const alreadyBulletStyle = lines.every((line) => /^[\-\*\u2022\d]/.test(line));
  if (alreadyBulletStyle && lines.length > 1) {
    return lines
      .map((line) => line.replace(/^[\*\u2022]\s*/, "- ").replace(/^--+\s*/, "- ").trim())
      .join("\n");
  }

  const sentenceChunks = normalized
    .split(/(?<=[\.!\?])\s+(?=[A-Z0-9])/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const bullets = sentenceChunks.map((chunk) => {
    const cleaned = chunk.replace(/^[\-\*\u2022]\s+/, "").replace(/^--+\s*/, "").trim();
    return `- ${cleaned}`;
  });

  return bullets.join("\n");
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured in frontend/.env.local." },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content:
              "You are CropRescue AI, a friendly agricultural assistant for Indian farmers. " +
              "Answer in plain text with short, clear, point-wise guidance. Start with a one-line " +
              "summary if helpful, then provide 3 to 5 concise bullet points. Each bullet must be " +
              "one short sentence or phrase. Avoid markdown headings, code fences, or long paragraphs. " +
              "For unrelated questions, politely say you only help with crop and farming topics.",
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawReply = data.choices?.[0]?.message?.content || "No response received from Groq AI.";
    const cleanReply = stripMarkdown(rawReply);
    const finalReply = enforcePointWiseFormatting(cleanReply);

    return NextResponse.json({ reply: finalReply });
  } catch (error: any) {
    console.error("Error in /api/chat route:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to Groq AI. Check the GROQ_API_KEY and internet connection.",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
