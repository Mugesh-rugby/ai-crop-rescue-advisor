# AI Crop Rescue Advisor — Core Scan Flow (v1)

This is the first real, working slice of the full project brief: **capture or
upload a leaf photo → real AI classification → save to Firestore → dashboard
built from actual scan history.** Firebase (Auth + Firestore + Storage) is
the only backend/database used — no Postgres, no Prisma, no other DB.

## What's real here (and what isn't yet)

- **Real:** Firebase Auth, Firestore reads/writes, Storage uploads, the TFJS
  inference pipeline, dashboard math (all computed from your actual Firestore
  documents).
- **Honestly incomplete, not faked:** until you train and host a model (see
  `/training/README.md`), the scan page tells the user plainly that no model
  is connected — it does **not** show a placeholder disease or confidence
  number. There is no hardcoded accuracy anywhere in this codebase.
- **Not built yet** (from the original brief, intentionally out of scope for
  this slice): pest detection, nutrient deficiency detection, weather API
  integration, Gemini chat assistant, crop/soil recommendation, notifications,
  nearby-center maps, knowledge center, admin panel UI, multi-language,
  PDF/CSV export. Each is a clean addition on top of this foundation — say
  which one you want next and it'll be built the same way: real integration,
  no mocked data.

## Setup

```bash
npm install
cp .env.example .env.local
```

1. Create a Firebase project → enable **Authentication** (Email/Password +
   Google), **Firestore**, and **Storage**.
2. Copy your web app config into `.env.local`.
3. Deploy the security rules: `firebase deploy --only firestore:rules`
   (uses `firestore.rules` in this repo).
4. Train a model (`/training/README.md`) and set `NEXT_PUBLIC_MODEL_URL`, or
   leave it unset to see the honest "no model connected" state.
5. `npm run dev`

## Project structure

```
src/
  app/            Next.js App Router pages (home, login, scan, dashboard)
  components/     ImageCapture, ScanResult, Navbar
  lib/
    firebase.ts    Firebase init (Auth/Firestore/Storage only)
    model.ts       Real TFJS inference — throws honestly if no model configured
    labels.json    Class list, must match the trained model's output order
    diseaseInfo.ts Curated agronomic reference content (review before production use)
    scans.ts       Firestore data layer + real dashboard stat computation
    useAuth.tsx    Firebase Auth context
training/
  train_plant_disease.py   Real EfficientNetB0 transfer-learning script
  README.md                 Train → convert → host → connect, step by step
firestore.rules   Per-user scan access control
```

## Next steps

Tell me which feature to add next (pest detection, weather risk, the Gemini
chat assistant, admin approval queue, etc.) and I'll build it against this
same foundation.
