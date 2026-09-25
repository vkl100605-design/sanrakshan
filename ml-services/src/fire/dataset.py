"""
Fire and Smoke Dataset Loader for Sanrakshan Disaster Decision-Support.
Loads YOLO-format annotations (fire, smoke) from D:\MAJOR PROJECT\project\datasets\fire_yolo.
"""

import os
import glob
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import numpy as np
import torch
from torch.utils.data import Dataset
from PIL import Image

DEFAULT_DATASET_DIR = r"D:\MAJOR PROJECT\project\datasets\fire_yolo"


class FireYoloMetadata:
    def __init__(self, dataset_dir: str = DEFAULT_DATASET_DIR):
        self.dataset_dir = Path(dataset_dir)
        self.yaml_path = self.dataset_dir / "data.yaml"
        self.classes = ["fire", "smoke"]

        if self.yaml_path.exists():
            with open(self.yaml_path, "r") as f:
                data = yaml.safe_load(f)
                self.classes = data.get("names", self.classes)

        self.train_img_dir = self.dataset_dir / "images" / "train"
        self.val_img_dir = self.dataset_dir / "images" / "validation"
        self.train_lbl_dir = self.dataset_dir / "labels" / "train"
        self.val_lbl_dir = self.dataset_dir / "labels" / "validation"

    def get_stats(self) -> Dict[str, int]:
        train_count = len(list(self.train_img_dir.glob("*.jpg"))) if self.train_img_dir.exists() else 0
        val_count = len(list(self.val_img_dir.glob("*.jpg"))) if self.val_img_dir.exists() else 0
        return {
            "dataset_path": str(self.dataset_dir),
            "classes": self.classes,
            "train_images": train_count,
            "val_images": val_count,
        }


class FireDetectionDataset(Dataset):
    """
    PyTorch Dataset wrapper for YOLO annotations.
    Returns normalized image tensors and multi-hot / bounding box targets.
    """

    def __init__(
        self,
        img_dir: Path,
        lbl_dir: Path,
        img_size: int = 224,
        max_samples: Optional[int] = None,
        transform=None,
    ):
        self.img_dir = Path(img_dir)
        self.lbl_dir = Path(lbl_dir)
        self.img_size = img_size
        self.transform = transform

        all_imgs = sorted(list(self.img_dir.glob("*.jpg")))
        if max_samples and max_samples < len(all_imgs):
            # Select uniform deterministic subset across the dataset
            indices = np.linspace(0, len(all_imgs) - 1, max_samples, dtype=int)
            self.img_files = [all_imgs[i] for i in indices]
        else:
            self.img_files = all_imgs

    def __len__(self) -> int:
        return len(self.img_files)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, List[List[float]]]:
        img_path = self.img_files[idx]
        lbl_path = self.lbl_dir / (img_path.stem + ".txt")

        # Load image
        img = Image.open(img_path).convert("RGB")
        orig_w, orig_h = img.size
        img = img.resize((self.img_size, self.img_size))

        # Convert to tensor [3, H, W] normalized
        img_tensor = torch.tensor(np.array(img), dtype=torch.float32).permute(2, 0, 1) / 255.0

        # Mean and std normalization
        mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
        img_tensor = (img_tensor - mean) / std

        # Multi-hot class label: [has_fire, has_smoke]
        class_label = torch.zeros(2, dtype=torch.float32)
        boxes = []

        if lbl_path.exists():
            with open(lbl_path, "r") as f:
                for line in f:
                    parts = line.strip().split()
                    if len(parts) >= 5:
                        cls_id = int(parts[0])
                        if cls_id in (0, 1):
                            class_label[cls_id] = 1.0
                            boxes.append([float(p) for p in parts[1:5]])

        # If no annotation was found, default to fire presence if in dataset
        if class_label.sum() == 0:
            class_label[0] = 1.0

        return img_tensor, class_label, boxes
