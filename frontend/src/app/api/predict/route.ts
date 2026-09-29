/**
 * /api/predict
 *
 * Proxy route: accepts an image upload from the browser, forwards it to
 * the Python FastAPI backend (localhost:8000/predict), and returns the
 * real PyTorch EfficientNetV2-S classification result.
 *
 * If the Python backend is unavailable the route returns a 503 so the
 * frontend can fall back to the client-side TFJS classifier gracefully.
 */

import { NextResponse } from "next/server";

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    // Read the raw multipart body and forward it directly
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded. Send multipart/form-data with field 'file'." },
        { status: 400 }
      );
    }

    // Build a new FormData to proxy to Python
    const proxyForm = new FormData();
    proxyForm.append("file", file, file.name || "image.jpg");

    const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/predict`, {
      method: "POST",
      body: proxyForm,
      // timeout-friendly: FastAPI inference is typically < 2s on CPU
      signal: AbortSignal.timeout(30_000),
    });

    if (!pythonRes.ok) {
      const err = await pythonRes.text();
      console.error("[/api/predict] Python backend error:", err);
      return NextResponse.json(
        { error: `Python inference server returned an error: ${err}` },
        { status: pythonRes.status }
      );
    }

    const result = await pythonRes.json();
    return NextResponse.json(result);
  } catch (error: any) {
    // ECONNREFUSED → Python server not running
    const isConnectionError =
      error?.cause?.code === "ECONNREFUSED" ||
      error?.message?.includes("ECONNREFUSED") ||
      error?.name === "TimeoutError";

    if (isConnectionError) {
      return NextResponse.json(
        {
          error:
            "Python inference backend is not running. " +
            "Start it with: cd backend && uvicorn main:app --reload --port 8000",
        },
        { status: 503 }
      );
    }

    console.error("[/api/predict] Unexpected error:", error);
    return NextResponse.json(
      { error: "Prediction failed.", details: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
