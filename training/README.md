# Training a real disease-detection model

The web app never fabricates a diagnosis. Until a real trained model is
connected, `/scan` will show "No trained model connected yet" instead of a
made-up result. This folder is how you close that gap for real.

## 1. Train

```bash
pip install tensorflow datasets pillow tensorflowjs
python train_plant_disease.py
```

This trains an EfficientNetB0 classifier on the actual PlantVillage dataset
(38 real classes, ~54k real labeled leaf images) via transfer learning. On a
free Colab GPU this takes roughly 20–40 minutes for the 12 epochs in the
script. It prints the **real validation accuracy** at the end — write that
number down. That is the number (if any) you're allowed to show users, and
only in a "model accuracy on validation data" context, not as a per-scan
guarantee.

Expand it with your own labeled images (the app's admin-approval queue in
Firestore is designed to collect these) and retrain periodically — this is
the "continuous learning" loop from the original brief, done for real:
new images go into a review queue, an admin approves them, and they get
added to the training set for the next run.

## 2. Convert for the browser

```bash
tensorflowjs_converter --input_format=tf_saved_model ./saved_model ./tfjs_model
```

This produces `model.json` plus one or more `.bin` weight shard files.

## 3. Host it

Upload the whole `tfjs_model/` folder to Firebase Storage, e.g. under
`models/plant-disease-v1/`. Make the files publicly readable (or serve
through a signed URL scheme if you want access control), then copy the
public URL to `model.json` into `.env.local`:

```
NEXT_PUBLIC_MODEL_URL=https://firebasestorage.googleapis.com/.../model.json
```

## 4. Keep labels in sync

`src/lib/labels.json` must list classes in the exact index order the model
was trained on (the script writes `labels.json` alongside your saved model
— diff it against the one in the app and update the app's copy).

## A note on severity

The app derives a rough "severity" indicator from how confident the model
is in its top prediction. That is a heuristic, not a second trained model.
If you want real severity grading (e.g. % of leaf area affected), that's a
separate model — typically a segmentation model trained with pixel-level
disease masks — and is a good next step, not something to fake in the
meantime.
