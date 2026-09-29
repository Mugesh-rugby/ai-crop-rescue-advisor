// src/lib/model.ts
//
// Two-tier plant disease classification:
//
// Tier 1 (preferred) — Python PyTorch backend
//   Sends the image to /api/predict which proxies to the FastAPI Python server
//   (backend/main.py). The server loads the EfficientNetV2-S model trained by
//   training/train_small.py and returns REAL softmax probabilities.
//
// Tier 2 (fallback) — Client-side TFJS model
//   If the Python backend is unavailable (503/ECONNREFUSED) we fall back to a
//   TensorFlow.js model loaded from NEXT_PUBLIC_MODEL_URL. If that URL is also
//   unset, classifyImage() throws ModelUnavailableError — the UI surfaces this
//   honestly (see ScanResult.tsx) — predictions are NEVER fabricated.
//
// How to get the Python backend model:
//   cd training && python train_small.py
//   cd backend   && uvicorn main:app --reload --port 8000

import * as tf from "@tensorflow/tfjs";
import labels from "./labels.json";

export class ModelUnavailableError extends Error {
  constructor() {
    super(
      "No trained model is available. " +
        "Start the Python backend (cd backend && uvicorn main:app --reload) " +
        "or set NEXT_PUBLIC_MODEL_URL to a TFJS model to enable real predictions."
    );
    this.name = "ModelUnavailableError";
  }
}

let cachedTfjsModel: tf.LayersModel | null = null;
let tfjsLoadingPromise: Promise<tf.LayersModel | null> | null = null;

const INPUT_SIZE = 224;

export interface ClassificationResult {
  className: string;         // raw label, e.g. "Tomato___Early_blight"
  crop: string;              // "Tomato"
  condition: string;         // "Early blight" (or "Healthy")
  isHealthy: boolean;
  confidence: number;        // real softmax probability, 0..1
  topK: { className: string; confidence: number }[]; // top-5 distribution
  source: "python-backend" | "tfjs-model"; // which tier was used
}

function parseLabel(raw: string) {
  const parts = raw.split("___");
  const crop = parts[0] || "Unknown";
  const condition = parts[1] || "healthy";
  const readableCondition = condition.replace(/_/g, " ");
  return {
    crop: crop.replace(/_/g, " "),
    condition: readableCondition,
    isHealthy: condition.toLowerCase() === "healthy",
  };
}

// ----------------------------------------------------------------
// TIER 1 — Python PyTorch backend
// ----------------------------------------------------------------

/**
 * Sends a Blob (image) to /api/predict (→ Python FastAPI backend).
 * Returns null if the backend is not running (503).
 * Throws for other error types.
 */
async function classifyViaBackend(
  blob: Blob
): Promise<ClassificationResult | null> {
  const formData = new FormData();
  formData.append("file", blob, "leaf.jpg");

  let res: Response;
  try {
    res = await fetch("/api/predict", { method: "POST", body: formData });
  } catch (networkErr) {
    console.warn("[model.ts] Network error reaching /api/predict:", networkErr);
    return null;
  }

  if (res.status === 503) {
    // Python backend not started — fall through to TFJS
    console.warn("[model.ts] Python backend unavailable (503), trying TFJS fallback.");
    return null;
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "unknown");
    console.error("[model.ts] /api/predict error:", res.status, msg);
    return null;
  }

  const data = await res.json();

  return {
    className: data.className,
    crop: data.crop,
    condition: data.condition,
    isHealthy: data.isHealthy,
    confidence: data.confidence,
    topK: data.topK ?? [],
    source: "python-backend",
  };
}

// ----------------------------------------------------------------
// TIER 2 — Client-side TFJS model
// ----------------------------------------------------------------

async function loadTfjsModel(): Promise<tf.LayersModel | null> {
  const modelUrl = process.env.NEXT_PUBLIC_MODEL_URL || "/model/model.json";

  if (cachedTfjsModel) return cachedTfjsModel;
  if (tfjsLoadingPromise) return tfjsLoadingPromise;

  tfjsLoadingPromise = tf
    .loadLayersModel(modelUrl)
    .then((m) => {
      cachedTfjsModel = m;
      return m;
    })
    .catch((err) => {
      console.warn("[model.ts] Could not load TFJS model:", err.message);
      return null;
    });

  return tfjsLoadingPromise;
}

async function classifyViaTfjs(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<ClassificationResult | null> {
  let model: tf.LayersModel | null = null;
  try {
    model = await loadTfjsModel();
  } catch (err) {
    console.warn("[model.ts] TFJS model loading failed:", err);
    return null;
  }

  if (!model) return null;

  const result = tf.tidy(() => {
    const img = tf.browser.fromPixels(source).toFloat();
    const resized = tf.image.resizeBilinear(img, [INPUT_SIZE, INPUT_SIZE]);
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);
    return model!.predict(batched) as tf.Tensor;
  });

  const probabilities = await result.data();
  result.dispose();

  const scored = Array.from(probabilities).map((p, i) => ({
    className: labels[i] ?? `unknown_class_${i}`,
    confidence: p as number,
  }));
  scored.sort((a, b) => b.confidence - a.confidence);

  const top = scored[0];
  const { crop, condition, isHealthy } = parseLabel(top.className);

  return {
    className: top.className,
    crop,
    condition,
    isHealthy,
    confidence: top.confidence,
    topK: scored.slice(0, 5),
    source: "tfjs-model",
  };
}

// ----------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------

/**
 * Classify a leaf image. Tries the Python PyTorch backend first (Tier 1),
 * then falls back to the TFJS client-side model (Tier 2).
 *
 * @param source  HTMLImageElement / Canvas / Video from the captured photo
 * @param blob    Raw image Blob (needed for the multipart POST to the backend)
 */
export async function classifyImage(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  blob?: Blob
): Promise<ClassificationResult> {
  // Tier 1: Python backend (if blob is available)
  if (blob) {
    const backendResult = await classifyViaBackend(blob);
    if (backendResult) return backendResult;
  }

  // Tier 2: TFJS client-side model
  const tfjsResult = await classifyViaTfjs(source);
  if (tfjsResult) return tfjsResult;

  // Both tiers unavailable
  throw new ModelUnavailableError();
}

export function isModelConfigured(): boolean {
  // True if EITHER the Python backend env is set OR the TFJS model URL is configured
  return Boolean(
    process.env.NEXT_PUBLIC_MODEL_URL ||
      process.env.PYTHON_BACKEND_URL ||
      // default: assume backend is at localhost:8000 unless explicitly disabled
      true
  );
}
