"""
Synthetic In-Memory Flood Scene Generator for Sen1Floods11 & FloodNet Pipelines.
Generates realistic multi-spectral SAR / aerial inundation tiles on-the-fly without requiring disk storage.
"""

from typing import Tuple
import numpy as np
import torch
from torch.utils.data import Dataset


class SyntheticFloodDataset(Dataset):
    """
    Simulates Sentinel-1 SAR (VV/VH polarizations) & aerial RGB flood inundation scenes.
    Requires ZERO external dataset downloads.
    """

    def __init__(self, num_samples: int = 200, img_size: int = 128, seed: int = 42):
        self.num_samples = num_samples
        self.img_size = img_size
        self.rng = np.random.RandomState(seed)

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        # Generate background terrain texture
        img = self.rng.uniform(0.1, 0.6, (3, self.img_size, self.img_size)).astype(np.float32)

        # Generate smooth continuous water mask using radial Gaussian basins
        mask = np.zeros((1, self.img_size, self.img_size), dtype=np.float32)
        center_x = self.rng.randint(int(0.2 * self.img_size), int(0.8 * self.img_size))
        center_y = self.rng.randint(int(0.2 * self.img_size), int(0.8 * self.img_size))
        radius = self.rng.randint(int(0.15 * self.img_size), int(0.4 * self.img_size))

        y, x = np.ogrid[:self.img_size, :self.img_size]
        dist_from_center = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        flood_region = dist_from_center <= radius
        mask[0, flood_region] = 1.0

        # Water in SAR shows low backscatter (dark specular reflection)
        img[0, flood_region] = self.rng.uniform(0.02, 0.15, size=np.sum(flood_region))
        img[1, flood_region] = self.rng.uniform(0.05, 0.20, size=np.sum(flood_region))
        img[2, flood_region] = self.rng.uniform(0.20, 0.45, size=np.sum(flood_region))

        return torch.from_numpy(img), torch.from_numpy(mask)
