import { NextResponse } from "next/server";

// Strip markdown formatting characters like **, *, #, __ from AI responses
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")       // bold **text**
    .replace(/\*(.+?)\*/g, "$1")            // italic *text*
    .replace(/_{2}(.+?)_{2}/g, "$1")        // bold __text__
    .replace(/_(.+?)_/g, "$1")              // italic _text_
    .replace(/#{1,6}\s+/g, "")             // headings
    .replace(/`{3}[\s\S]*?`{3}/g, "")      // code blocks
    .replace(/`(.+?)`/g, "$1")             // inline code
    .replace(/^\s*[-*+]\s+/gm, "• ")       // bullet lists
    .replace(/^\s*\d+\.\s+/gm, (m, idx) => m) // numbered lists keep numbers
    .trim();
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "gemma3:1b";

    const systemPrompt = {
      role: "system",
      content:
        "You are CropRescue AI, a friendly and knowledgeable agricultural assistant for Indian farmers. " +
        "Always answer in plain text and prefer concise, point-wise responses. Start with a one-line summary (optional), " +
        "then provide the information as short bullet points or a numbered list — each point should be a single clear sentence or phrase. " +
        "Avoid long paragraphs; keep bullets practical and actionable. You may use simple hyphen (-) or numbered prefixes for points. " +
        "Do not include markdown code fences, rich formatting, or excessive punctuation. Give example-rich, actionable guidance when relevant " +
        "(e.g., for disease treatment include dosage and frequency). Only answer questions about crops, plant diseases, farming, soil, irrigation, weather, and agriculture. " +
        "If asked anything unrelated to agriculture, politely say: I am only able to help with crop and farming topics.",
    };

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [systemPrompt, ...messages],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 600,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Ollama returned an error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawReply = data.message?.content || "No response received from local AI.";
    const cleanReply = stripMarkdown(rawReply);

    return NextResponse.json({ reply: cleanReply });
  } catch (error: any) {
    console.error("Error in /api/chat route:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to local Ollama. Make sure Ollama is running with gemma3:1b pulled.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
