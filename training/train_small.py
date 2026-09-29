import os
import json
import random
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms
import timm
from tqdm import tqdm


# ============================================================
# AI CROP RESCUE ADVISOR
# Single-file Plant Disease Training
# ============================================================

# -----------------------------
# SETTINGS
# -----------------------------

IMAGE_SIZE = 224

# Maximum images used from EACH class
# 150 x 38 = about 5,700 training images
MAX_TRAIN_PER_CLASS = 150

# Validation images from EACH class
MAX_VAL_PER_CLASS = 40

BATCH_SIZE = 16

EPOCHS = 8

LEARNING_RATE = 0.0001

MODEL_NAME = "tf_efficientnetv2_s"

SEED = 42


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.dirname(BASE_DIR)

TRAIN_DIR = os.path.join(
    PROJECT_DIR,
    "dataset",
    "PlantVillage",
    "train"
)

VAL_DIR = os.path.join(
    PROJECT_DIR,
    "dataset",
    "PlantVillage",
    "val"
)

CHECKPOINT_DIR = os.path.join(
    PROJECT_DIR,
    "checkpoints"
)

os.makedirs(
    CHECKPOINT_DIR,
    exist_ok=True
)

MODEL_PATH = os.path.join(
    CHECKPOINT_DIR,
    "plant_disease_best.pth"
)

LABELS_PATH = os.path.join(
    CHECKPOINT_DIR,
    "labels.json"
)


# ============================================================
# REPRODUCIBILITY
# ============================================================

random.seed(SEED)

torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

print()
print("=" * 60)
print("AI CROP RESCUE ADVISOR")
print("PLANT DISEASE TRAINING")
print("=" * 60)

print("Device :", DEVICE)
print("Model  :", MODEL_NAME)

print()
print("Training dataset :", TRAIN_DIR)
print("Validation dataset:", VAL_DIR)


# ============================================================
# CHECK DATASET
# ============================================================

if not os.path.exists(TRAIN_DIR):

    raise FileNotFoundError(
        f"\nTraining dataset not found:\n{TRAIN_DIR}"
    )


if not os.path.exists(VAL_DIR):

    raise FileNotFoundError(
        f"\nValidation dataset not found:\n{VAL_DIR}"
    )


# ============================================================
# TRANSFORMS
# ============================================================

train_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.RandomHorizontalFlip(),

    transforms.RandomRotation(10),

    transforms.ColorJitter(
        brightness=0.2,
        contrast=0.2,
        saturation=0.2
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )

])


val_transform = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )

])


# ============================================================
# LOAD DATASET
# ============================================================

print()
print("Loading PlantVillage dataset...")

train_full = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transform
)

val_full = datasets.ImageFolder(
    VAL_DIR,
    transform=val_transform
)


# ============================================================
# CLASS NAMES
# ============================================================

class_names = train_full.classes

num_classes = len(class_names)

print()
print("Number of classes :", num_classes)

if num_classes != 38:

    print(
        "WARNING: Expected 38 classes."
    )


# ============================================================
# SAVE LABELS
# ============================================================

with open(
    LABELS_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        class_names,
        f,
        indent=2,
        ensure_ascii=False
    )

print(
    "Labels saved ->",
    LABELS_PATH
)


# ============================================================
# CREATE BALANCED SMALL SUBSET
# ============================================================

def create_small_subset(
    dataset,
    max_per_class
):

    class_indices = {}

    for index, (_, label) in enumerate(
        dataset.samples
    ):

        if label not in class_indices:

            class_indices[label] = []

        class_indices[label].append(index)


    selected_indices = []


    for label in sorted(
        class_indices.keys()
    ):

        indices = class_indices[label]

        random.shuffle(indices)

        selected = indices[
            :max_per_class
        ]

        selected_indices.extend(
            selected
        )


    random.shuffle(
        selected_indices
    )

    return selected_indices


# ============================================================
# SELECT SMALL DATASET
# ============================================================

train_indices = create_small_subset(
    train_full,
    MAX_TRAIN_PER_CLASS
)

val_indices = create_small_subset(
    val_full,
    MAX_VAL_PER_CLASS
)


train_dataset = Subset(
    train_full,
    train_indices
)

val_dataset = Subset(
    val_full,
    val_indices
)


print()
print("=" * 60)
print("DATASET SIZE")
print("=" * 60)

print(
    "Training images   :",
    len(train_dataset)
)

print(
    "Validation images :",
    len(val_dataset)
)

print(
    "Max train/class   :",
    MAX_TRAIN_PER_CLASS
)

print(
    "Max validation/class:",
    MAX_VAL_PER_CLASS
)


# ============================================================
# DATALOADERS
# ============================================================
# num_workers=0 is intentional.
# It avoids Windows multiprocessing problems.
# ============================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0,
    pin_memory=torch.cuda.is_available()
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
    pin_memory=torch.cuda.is_available()
)


# ============================================================
# BUILD MODEL
# ============================================================

print()
print("=" * 60)
print("LOADING PRETRAINED MODEL")
print("=" * 60)

model = timm.create_model(
    MODEL_NAME,
    pretrained=True,
    num_classes=num_classes
)

model = model.to(DEVICE)


# ============================================================
# LOSS + OPTIMIZER
# ============================================================

criterion = nn.CrossEntropyLoss()

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=0.0001
)


scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
    optimizer,
    T_max=EPOCHS
)


# ============================================================
# TRAINING FUNCTION
# ============================================================

def train_one_epoch():

    model.train()

    total_loss = 0.0

    correct = 0

    total = 0


    progress = tqdm(
        train_loader,
        desc="Training"
    )


    for images, labels in progress:

        images = images.to(
            DEVICE
        )

        labels = labels.to(
            DEVICE
        )


        optimizer.zero_grad()


        outputs = model(
            images
        )


        loss = criterion(
            outputs,
            labels
        )


        loss.backward()

        optimizer.step()


        total_loss += (
            loss.item()
            * images.size(0)
        )


        predictions = (
            outputs.argmax(
                dim=1
            )
        )


        correct += (
            predictions == labels
        ).sum().item()


        total += labels.size(0)


        progress.set_postfix(
            loss=f"{loss.item():.4f}"
        )


    average_loss = (
        total_loss / total
    )

    accuracy = (
        correct / total
    )


    return average_loss, accuracy


# ============================================================
# VALIDATION FUNCTION
# ============================================================

def validate():

    model.eval()

    total_loss = 0.0

    correct = 0

    total = 0


    with torch.no_grad():

        for images, labels in tqdm(
            val_loader,
            desc="Validation"
        ):

            images = images.to(
                DEVICE
            )

            labels = labels.to(
                DEVICE
            )


            outputs = model(
                images
            )


            loss = criterion(
                outputs,
                labels
            )


            total_loss += (
                loss.item()
                * images.size(0)
            )


            predictions = (
                outputs.argmax(
                    dim=1
                )
            )


            correct += (
                predictions == labels
            ).sum().item()


            total += labels.size(0)


    average_loss = (
        total_loss / total
    )

    accuracy = (
        correct / total
    )


    return average_loss, accuracy


# ============================================================
# TRAIN
# ============================================================

best_accuracy = 0.0


print()
print("=" * 60)
print("START TRAINING")
print("=" * 60)

print(
    f"Epochs: {EPOCHS}"
)

print(
    f"Training images: {len(train_dataset)}"
)

print(
    f"Validation images: {len(val_dataset)}"
)

print()


for epoch in range(
    EPOCHS
):

    print()
    print(
        f"Epoch {epoch + 1}/{EPOCHS}"
    )

    print("-" * 50)


    train_loss, train_accuracy = (
        train_one_epoch()
    )


    val_loss, val_accuracy = (
        validate()
    )


    scheduler.step()


    print()

    print(
        f"Train Loss      : {train_loss:.4f}"
    )

    print(
        f"Train Accuracy  : "
        f"{train_accuracy * 100:.2f}%"
    )

    print(
        f"Validation Loss : {val_loss:.4f}"
    )

    print(
        f"Validation Acc. : "
        f"{val_accuracy * 100:.2f}%"
    )


    # ========================================================
    # SAVE BEST MODEL
    # ========================================================

    if val_accuracy > best_accuracy:

        best_accuracy = val_accuracy


        torch.save(
            {
                "model_name": MODEL_NAME,
                "num_classes": num_classes,
                "class_names": class_names,
                "image_size": IMAGE_SIZE,
                "model_state_dict": model.state_dict(),
                "accuracy": best_accuracy,
                "epoch": epoch + 1,
            },
            MODEL_PATH
        )


        print()
        print(
            "BEST MODEL SAVED!"
        )

        print(
            f"Accuracy: "
            f"{best_accuracy * 100:.2f}%"
        )

        print(
            "File:",
            MODEL_PATH
        )


# ============================================================
# FINISHED
# ============================================================

print()
print("=" * 60)
print("TRAINING COMPLETE")
print("=" * 60)

print(
    f"Best Validation Accuracy:"
    f" {best_accuracy * 100:.2f}%"
)

print()
print(
    "Model saved:"
)

print(
    MODEL_PATH
)

print()
print(
    "Labels saved:"
)

print(
    LABELS_PATH
)

print()
print("=" * 60)
print("NEXT STEP")
print("=" * 60)

print(
    "Use the .pth model for the diagnosis backend."
)

print(
    "Groq AI can then generate the treatment/rescue advice."
)

print(
    "Firebase can store each diagnosis and update"
)

print(
    "the dashboard counts in real time."
)