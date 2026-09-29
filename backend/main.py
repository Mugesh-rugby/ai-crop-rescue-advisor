"""
AI Crop Rescue Advisor – Python Inference Backend
=================================================
Serves real plant-disease predictions using the PyTorch model
trained by training/train_small.py (EfficientNetV2-S via timm).

Endpoints
---------
GET  /health       → {"status": "ok", "model_loaded": bool}
POST /predict      → multipart/form-data  field: file (image)
                     returns ClassificationResult JSON

Setup
-----
1. Train the model:       cd .. && python training/train_small.py
2. Install requirements:  pip install -r requirements.txt
3. Start server:          uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import io
import json
import os
from pathlib import Path
from typing import Literal, Optional

import httpx
import torch
import torch.nn.functional as F
import timm
from dotenv import load_dotenv
from torchvision import transforms
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# PATHS
# ============================================================

BACKEND_DIR = Path(__file__).parent
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.local")
load_dotenv(PROJECT_DIR / ".env")
load_dotenv(PROJECT_DIR / ".env.local")
CHECKPOINT_DIR = PROJECT_DIR / "checkpoints"
MODEL_PATH = CHECKPOINT_DIR / "plant_disease_best.pth"
LABELS_PATH = CHECKPOINT_DIR / "labels.json"

# ============================================================
# CONSTANTS
# ============================================================

IMAGE_SIZE = 224

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="AI Crop Rescue – Inference API",
    description="PyTorch EfficientNetV2-S plant disease classifier",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Next.js dev server calls this locally
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# MODEL STATE  (loaded once at startup)
# ============================================================

_model: Optional[torch.nn.Module] = None
_class_names: list[str] = []
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


@app.on_event("startup")
def load_model() -> None:
    global _model, _class_names

    if not MODEL_PATH.exists():
        print(
            f"[WARNING] Trained model not found at {MODEL_PATH}.\n"
            "Run  python training/train_small.py  first.\n"
            "The /predict endpoint will return a 503 until the model is present."
        )
        return

    print(f"Loading model from {MODEL_PATH} …")
    checkpoint = torch.load(MODEL_PATH, map_location=_device)

    model_name: str = checkpoint.get("model_name", "tf_efficientnetv2_s")
    num_classes: int = checkpoint.get("num_classes", 38)
    _class_names = checkpoint.get("class_names", [])

    # If labels.json exists alongside, prefer it (same order as training)
    if LABELS_PATH.exists():
        with open(LABELS_PATH, encoding="utf-8") as f:
            _class_names = json.load(f)

    _model = timm.create_model(model_name, pretrained=False, num_classes=num_classes)
    _model.load_state_dict(checkpoint["model_state_dict"])
    _model.to(_device)
    _model.eval()

    train_acc = checkpoint.get("accuracy", None)
    epoch = checkpoint.get("epoch", "?")
    print(f"Model loaded — epoch {epoch}, val accuracy: {train_acc * 100:.2f}%" if train_acc else "Model loaded.")
    print(f"Classes: {num_classes}  |  Device: {_device}")


# ============================================================
# HELPERS
# ============================================================

def _parse_label(raw: str) -> dict:
    """Convert e.g. 'Tomato___Early_blight' into structured fields."""
    parts = raw.split("___")
    crop = (parts[0] or "Unknown").replace("_", " ")
    condition_raw = parts[1] if len(parts) > 1 else "Healthy"
    condition = condition_raw.replace("_", " ")
    is_healthy = condition_raw.lower() == "healthy"
    return {"crop": crop, "condition": condition, "isHealthy": is_healthy}


# ============================================================
# RESPONSE SCHEMA
# ============================================================

class TopKItem(BaseModel):
    className: str
    confidence: float


class PredictResponse(BaseModel):
    className: str
    crop: str
    condition: str
    isHealthy: bool
    confidence: float
    topK: list[TopKItem]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


# ============================================================
# ROUTES
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "num_classes": len(_class_names),
        "device": str(_device),
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Send a conversation to Groq or xAI without exposing its API key."""
    groq_key = os.getenv("GROQ_API_KEY")
    grok_key = os.getenv("GROK_API_KEY")

    if groq_key:
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        configured_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        retired_models = {
            "llama-3.1-8b-instant",
            "llama-3.1-70b-versatile",
            "llama-3.3-70b-versatile",
        }
        model = "openai/gpt-oss-20b" if configured_model in retired_models else configured_model
        api_key = groq_key
        provider = "Groq"
    elif grok_key:
        endpoint = "https://api.x.ai/v1/chat/completions"
        model = os.getenv("GROK_MODEL", "grok-3-mini")
        api_key = grok_key
        provider = "Grok"
    else:
        raise HTTPException(
            status_code=503,
            detail="Set GROQ_API_KEY or GROK_API_KEY in backend/.env and restart the backend.",
        )

    system_message = {
        "role": "system",
        "content": (
            "You are CropRescue AI, a friendly agricultural assistant for Indian farmers. "
            "Answer in plain text with short, clear, point-wise guidance. Start with a one-line "
            "summary if helpful, then provide 3 to 5 concise bullet points. Each bullet must be "
            "one short sentence or phrase. Avoid markdown headings, code fences, or long paragraphs. "
            "For unrelated questions, politely say you only help with crop and farming topics."
        ),
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                endpoint,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": model,
                    "messages": [system_message] + [message.model_dump() for message in request.messages],
                    "temperature": 0.7,
                    "max_tokens": 600,
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not connect to {provider}: {exc}") from exc

    if response.status_code >= 400:
        try:
            provider_error = response.json().get("error", response.text)
        except ValueError:
            provider_error = response.text
        raise HTTPException(
            status_code=502,
            detail=f"{provider} API error ({response.status_code}): {provider_error}",
        )

    try:
        data = response.json()
        reply = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="The AI provider returned an unexpected response.") from exc

    if not isinstance(reply, str) or not reply.strip():
        raise HTTPException(status_code=502, detail="The AI provider returned an empty response.")

    return ChatResponse(reply=reply.strip())


@app.post("/predict", response_model=PredictResponse)
async def predict(file: UploadFile = File(...)) -> PredictResponse:
    """
    Accept any image (JPEG / PNG / WEBP) and return the top plant-disease class
    with real softmax confidence from the trained PyTorch model.
    """
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Model is not loaded. "
                "Please run  python training/train_small.py  to train the model first."
            ),
        )

    # --- Read & decode image ---
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")

    # --- Preprocess ---
    tensor = _val_transform(image).unsqueeze(0).to(_device)  # (1, C, H, W)

    # --- Inference ---
    with torch.no_grad():
        logits = _model(tensor)                    # (1, num_classes)
        probs = F.softmax(logits, dim=1)[0]        # (num_classes,)

    probs_list = probs.cpu().tolist()

    # --- Build top-5 ---
    scored = sorted(
        [{"className": _class_names[i], "confidence": float(p)} for i, p in enumerate(probs_list)],
        key=lambda x: x["confidence"],
        reverse=True,
    )

    top = scored[0]
    parsed = _parse_label(top["className"])

    return PredictResponse(
        className=top["className"],
        crop=parsed["crop"],
        condition=parsed["condition"],
        isHealthy=parsed["isHealthy"],
        confidence=round(top["confidence"], 6),
        topK=[TopKItem(**item) for item in scored[:5]],
    )
