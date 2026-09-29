import { NextResponse } from "next/server";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_{2}(.+?)_{2}/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .trim();
}

export async function POST(req: Request) {
  try {
    const { crop, condition } = await req.json();

    if (!crop || !condition) {
      return NextResponse.json(
        { error: "Crop and condition parameters are required." },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured. Add it to your .env.local file." },
        { status: 500 }
      );
    }

    const isHealthy = condition.toLowerCase() === "healthy";

    const userPrompt = isHealthy
      ? `You are a crop pathologist. The scan shows a HEALTHY ${crop} plant.
Return ONLY a valid JSON object (no markdown, no asterisks, no extra text) with:
{
  "description": "2-3 sentences confirming the plant appears healthy and what that means.",
  "symptoms": ["observable healthy signs like green leaves, no spots"],
  "causes": ["good soil nutrition", "adequate watering"],
  "organicTreatment": ["continue current care routine", "apply compost monthly"],
  "chemicalTreatment": ["no chemical treatment needed for healthy plants"],
  "prevention": ["maintain proper spacing", "monitor weekly for early signs"],
  "recoveryTimeDays": [0, 0]
}`
      : `You are a crop pathologist. Generate a diagnosis for:
Crop: ${crop}
Disease: ${condition}

Return ONLY a valid JSON object (no markdown, no asterisks, no extra text) with these exact keys:
{
  "description": "2-3 plain sentences explaining this disease and its impact on ${crop}.",
  "symptoms": ["symptom 1 with specific detail", "symptom 2", "symptom 3"],
  "causes": ["cause 1 with specific detail", "cause 2"],
  "organicTreatment": ["specific organic step 1 e.g. spray neem oil 5ml per litre every 7 days", "step 2"],
  "chemicalTreatment": ["specific chemical e.g. Mancozeb 75WP at 2.5g per litre", "second option"],
  "prevention": ["prevention tip 1", "tip 2", "tip 3"],
  "recoveryTimeDays": [7, 21]
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          {
            role: "system",
            content:
              "You are an expert crop pathologist. Always respond with valid JSON only — no markdown, no extra text, no code fences.",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Groq API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "";

    let parsedDiagnosis;
    try {
      // Strip any accidental markdown code fences before parsing
      const cleaned = replyText.replace(/```json?/gi, "").replace(/```/g, "").trim();
      parsedDiagnosis = JSON.parse(cleaned);
    } catch {
      console.warn("Groq returned invalid JSON:", replyText);
      return NextResponse.json({ error: "Groq AI returned invalid JSON." }, { status: 500 });
    }

    // Clean markdown from all string values in the response
    function cleanObj(obj: any): any {
      if (typeof obj === "string") return stripMarkdown(obj);
      if (Array.isArray(obj)) return obj.map(cleanObj);
      if (obj && typeof obj === "object") {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, cleanObj(v)]));
      }
      return obj;
    }

    return NextResponse.json(cleanObj(parsedDiagnosis));
  } catch (error: any) {
    console.error("Error in /api/diagnose route:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to Groq AI. Check your GROQ_API_KEY and internet connection.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
