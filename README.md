# AI Crop Rescue Advisor

AI Crop Rescue Advisor is a Next.js frontend with a FastAPI inference backend. The frontend handles crop scans, Firebase authentication and scan history; the backend serves PyTorch predictions and the farming chat endpoint.

## Project structure

```text
frontend/       Next.js application, Firebase configuration and Firestore rules
backend/        FastAPI application and Python dependencies
training/       PyTorch model training script and instructions
dataset/        Local PlantVillage data (not committed)
checkpoints/    Locally trained model and labels (not committed)
```

## Requirements

- Node.js and npm
- Python 3.10 or newer
- A PlantVillage dataset arranged as `dataset/PlantVillage/train` and `dataset/PlantVillage/val` to train a model
- A Firebase project for authentication and cloud scan storage

## Install

From the repository root, install the frontend dependencies and create a Python environment for the backend:

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

On macOS or Linux, activate the environment with `source .venv/bin/activate` instead.

## Configure

Create `frontend/.env.local` with the Firebase web app values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

For the backend chat endpoint, create `backend/.env` and set either `GROQ_API_KEY` or `GROK_API_KEY`. Keep credentials in local environment files; they are ignored by Git.

Enable Email/Password or Google authentication in Firebase. Deploy the Firestore rules from `frontend/firestore.rules` to your Firebase project.

## Train the model

Place the dataset in the structure described above, then run:

```powershell
python training/train_small.py
```

The script writes `checkpoints/plant_disease_best.pth` and `checkpoints/labels.json`. The model checkpoint and dataset are local-only and are not included in Git. See [training/README.md](training/README.md) for details.

## Run locally

With the Python environment activated, start both applications from the repository root:

```powershell
npm run dev
```

The frontend is available at `http://localhost:3000` and the backend at `http://localhost:8000`. To run them separately, use `npm run dev:frontend` and `npm run dev:backend` in separate terminals.

Without a trained checkpoint, the backend health endpoint reports `model_loaded: false` and predictions return HTTP 503. The application does not fabricate a diagnosis.
