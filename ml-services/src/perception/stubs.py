"""
Perception model stubs for Fire/Smoke Detection, Flood Segmentation, and NLP Triage.
Provides calibrated confidence outputs and spatial hazard estimation.
"""

from typing import Dict, Any, List
import math


def score_fire_observation(cctv_frame_id: str, thermal_frp: float = 0.0) -> Dict[str, Any]:
    """
    Simulates calibrated fire/smoke detection (YOLOv8-S / RT-DETR baseline).
    """
    # Calibration function using sigmoid on thermal FRP and visual intensity
    logit = (thermal_frp - 25.0) / 10.0
    calibrated_prob = 1.0 / (1.0 + math.exp(-logit))

    return {
        "model": "yolov8s-fire-smoke-v1",
        "frame_id": cctv_frame_id,
        "calibrated_confidence": round(calibrated_prob, 4),
        "detected_classes": [
            {"class": "smoke_plume", "confidence": round(min(1.0, calibrated_prob * 1.1), 3)},
            {"class": "visible_flame", "confidence": round(calibrated_prob, 3)},
        ],
        "latency_ms": 42.5,
    }


def score_flood_observation(water_depth_cm: float, rainfall_rate_mm: float) -> Dict[str, Any]:
    """
    Simulates flood inundation detection (U-Net with ResNet-34 encoder).
    """
    combined_signal = (water_depth_cm / 50.0) * 0.6 + (rainfall_rate_mm / 80.0) * 0.4
    calibrated_prob = min(0.99, max(0.01, combined_signal))

    return {
        "model": "unet-flood-segmentation-v2",
        "calibrated_confidence": round(calibrated_prob, 4),
        "estimated_depth_cm": water_depth_cm,
        "inundation_severity": "HIGH" if water_depth_cm > 30 else "MODERATE" if water_depth_cm > 15 else "LOW",
        "latency_ms": 78.2,
    }


def score_nlp_triage(text: str) -> Dict[str, Any]:
    """
    Simulates NLP triage (Fine-tuned DistilBERT / Logistic Regression baseline).
    """
    lower = text.lower()
    fire_keywords = ["fire", "flames", "smoke", "burning", "blaze"]
    flood_keywords = ["flood", "water", "drowning", "submerged", "underpass", "overflow"]

    fire_hits = sum(1 for k in fire_keywords if k in lower)
    flood_hits = sum(1 for k in flood_keywords if k in lower)

    hazard_type = "UNKNOWN"
    score = 0.2
    if fire_hits > flood_hits:
        hazard_type = "FIRE"
        score = min(0.95, 0.4 + 0.2 * fire_hits)
    elif flood_hits > 0:
        hazard_type = "FLOOD"
        score = min(0.95, 0.4 + 0.2 * flood_hits)

    return {
        "model": "distilbert-nlp-triage-v1",
        "hazard_type": hazard_type,
        "urgency_score": round(score, 3),
        "extracted_entities": {
            "landmarks_mentioned": ["Main Street Underpass"],
            "casualty_reported": "trapped" in lower or "injured" in lower,
        },
        "latency_ms": 19.8,
    }
