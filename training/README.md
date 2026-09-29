# Train the plant disease model

The FastAPI backend loads a PyTorch EfficientNetV2-S checkpoint. This script trains that model on a local PlantVillage dataset; it does not require TensorFlow or TensorFlow.js.

## Dataset

Arrange the dataset at the repository root:

```text
dataset/PlantVillage/
	train/<class-name>/<image files>
	val/<class-name>/<image files>
```

The training and validation folders must contain the same class directories. Dataset contents are excluded from Git.

## Install and train

Create and activate the Python environment as described in the root README, then install `backend/requirements.txt`. From the repository root, run:

```powershell
python training/train_small.py
```

Training uses up to 150 images per class for training and 40 per class for validation. It writes `checkpoints/plant_disease_best.pth` and `checkpoints/labels.json`, which the backend reads at startup. Checkpoints are local artifacts and are excluded from Git.

The script reports validation accuracy measured on its validation subset. This is an evaluation metric, not a guarantee for any individual prediction.
