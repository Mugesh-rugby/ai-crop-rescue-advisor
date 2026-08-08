"""
train_plant_disease.py

Trains a real EfficientNetB0 classifier on the local PlantVillage dataset
located in dataset/PlantVillage/train and dataset/PlantVillage/val, and
exports it in a form convertible to TensorFlow.js for the web app.

Run this locally (or in Google Colab with folders uploaded):

    pip install tensorflow pillow numpy

    python train_plant_disease.py

Output:
    ./saved_model/            (Keras SavedModel)
    ./labels.json             (class list, copied to src/lib/labels.json)

Then convert for the browser:
    pip install tensorflowjs
    tensorflowjs_converter --input_format=tf_saved_model ./saved_model ../public/model

This will output model.json and weight shards directly to public/model/
which is served locally by the Next.js development server.
"""

import json
import os
import shutil
import tensorflow as tf

IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 12

# 1. Paths to local dataset
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "..", "dataset", "PlantVillage")
TRAIN_DIR = os.path.join(DATASET_DIR, "train")
VAL_DIR = os.path.join(DATASET_DIR, "val")

if not os.path.exists(TRAIN_DIR) or not os.path.exists(VAL_DIR):
    raise FileNotFoundError(
        f"Dataset directories not found. Make sure dataset/PlantVillage/train and val exist. "
        f"Checked path: {DATASET_DIR}"
    )

print("Loading local datasets...")
train_ds = tf.keras.utils.image_dataset_from_directory(
    TRAIN_DIR,
    labels="inferred",
    label_mode="int",
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_ds = tf.keras.utils.image_dataset_from_directory(
    VAL_DIR,
    labels="inferred",
    label_mode="int",
    image_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    shuffle=False
)

# Extract and save class names
label_names = train_ds.class_names
print(f"Detected {len(label_names)} classes: {label_names}")

labels_path = os.path.join(BASE_DIR, "labels.json")
with open(labels_path, "w") as f:
    json.dump(label_names, f, indent=2)

# Copy labels.json to the frontend lib folder so they match perfectly
frontend_labels_path = os.path.join(BASE_DIR, "..", "src", "lib", "labels.json")
os.makedirs(os.path.dirname(frontend_labels_path), exist_ok=True)
shutil.copyfile(labels_path, frontend_labels_path)
print(f"Exported labels list to {frontend_labels_path}")

# Normalize inputs to [0, 1] matching frontend's div(255.0) in client model.ts
normalization_layer = tf.keras.layers.Rescaling(1./255)
train_ds = train_ds.map(lambda x, y: (normalization_layer(x), y)).prefetch(tf.data.AUTOTUNE)
val_ds = val_ds.map(lambda x, y: (normalization_layer(x), y)).prefetch(tf.data.AUTOTUNE)

# 2. Build transfer-learning model on top of pre-trained ImageNet EfficientNetB0
print("Building transfer-learning model using EfficientNetB0...")
base_model = tf.keras.applications.EfficientNetB0(
    include_top=False,
    weights="imagenet",
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    pooling="avg"
)
base_model.trainable = False  # Freeze backbone for initial training

model = tf.keras.Sequential([
    base_model,
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(256, activation="relu"),
    tf.keras.layers.Dropout(0.3),
    tf.keras.layers.Dense(len(label_names), activation="softmax")
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)

# 3. Train
print(f"Starting training for {EPOCHS} epochs...")
history = model.fit(
    train_ds,
    validation_data=val_ds,
    epochs=EPOCHS
)

final_val_acc = history.history["val_accuracy"][-1]
print(f"\nFINAL VALIDATION ACCURACY: {final_val_acc:.4f}")

# Save the model
model_save_path = os.path.join(BASE_DIR, "saved_model")
model.save(model_save_path, save_format="tf")
print(f"Saved model to {model_save_path}")
print("\nTo convert this model for the browser, run:")
print("  pip install tensorflowjs")
print("  tensorflowjs_converter --input_format=tf_saved_model ./saved_model ../public/model")
