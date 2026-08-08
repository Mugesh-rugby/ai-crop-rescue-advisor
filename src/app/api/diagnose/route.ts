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

    const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "gemma3:1b";

    const isHealthy = condition.toLowerCase() === "healthy";

    const prompt = isHealthy
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

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        format: "json",
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 800,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `Ollama error: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const replyText = data.response || "";

    let parsedDiagnosis;
    try {
      // Strip any accidental markdown code fences before parsing
      const cleaned = replyText.replace(/```json?/gi, "").replace(/```/g, "").trim();
      parsedDiagnosis = JSON.parse(cleaned);
    } catch {
      console.warn("Ollama returned invalid JSON:", replyText);
      return NextResponse.json({ error: "Ollama returned invalid JSON." }, { status: 500 });
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
      { error: "Failed to connect to Ollama. Make sure it is running with gemma3:1b.", details: error.message },
      { status: 500 }
    );
  }
}
