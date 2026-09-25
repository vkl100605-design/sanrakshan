"""
Master Benchmark Runner for Sanrakshan Phase 4 (ML Intelligence).
Runs evaluations and chart generation across all four core perception & fusion pillars:
  1. Fire & Smoke Object Detection (YOLOv8 vs RT-DETR) - using D:\\MAJOR PROJECT\\project\\datasets\\fire_yolo
  2. Flood Inundation Semantic Segmentation (U-Net vs DeepLabV3+) - synthetic in-memory (no external files)
  3. Emergency Text Urgency Triage (DistilBERT vs TF-IDF + Logistic Regression)
  4. Multi-Sensor Confidence Fusion (Bayesian Beta-Binomial vs Calibrated XGBoost)

Generates unified JSON benchmark report: ml-services/reports/phase4_ml_benchmarks_master.json
"""

import sys
import os
import json
import subprocess
from datetime import datetime, timezone

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(BASE_DIR, "src")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")


def run_step(description: str, cmd: list) -> bool:
    print(f"\n[RUNNING] {description}...")
    proc_env = os.environ.copy()
    proc_env["PYTHONPATH"] = BASE_DIR
    try:
        res = subprocess.run(cmd, cwd=BASE_DIR, env=proc_env, check=True, text=True, capture_output=True)
        print(f"[SUCCESS] {description}")
        if res.stdout:
            # Print brief preview of stdout
            lines = res.stdout.strip().split("\n")
            preview = "\n  ".join(lines[-4:] if len(lines) > 4 else lines)
            print(f"  {preview}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Failed: {description}")
        print(f"Error output:\n{e.stderr}")
        return False


def main():
    print("=" * 80)
    print("SANRAKSHAN PHASE 4: MASTER ML BENCHMARK & EVALUATION SUITE")
    print("=" * 80)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"Python Executable: {sys.executable}")
    print(f"Working Directory: {BASE_DIR}")

    steps = [
        ("Fire Perception Evaluation (YOLOv8 vs RT-DETR)", [sys.executable, "src/fire/evaluate_fire.py"]),
        ("Fire Perception Chart Generation", [sys.executable, "src/fire/generate_charts.py"]),
        ("Flood Perception Evaluation (U-Net vs DeepLabV3+)", [sys.executable, "src/flood/evaluate_flood.py"]),
        ("Flood Perception Chart Generation", [sys.executable, "src/flood/generate_flood_charts.py"]),
        ("NLP Triage Evaluation (DistilBERT vs TF-IDF+LR)", [sys.executable, "src/nlp/evaluate_nlp.py"]),
        ("NLP Triage Chart Generation", [sys.executable, "src/nlp/generate_nlp_charts.py"]),
        ("Decision Fusion Evaluation (Bayesian vs XGBoost)", [sys.executable, "src/fusion/evaluate_fusion.py"]),
        ("Decision Fusion Chart Generation", [sys.executable, "src/fusion/generate_fusion_charts.py"]),
    ]

    successes = 0
    for desc, cmd in steps:
        if run_step(desc, cmd):
            successes += 1

    print("\n" + "=" * 80)
    print(f"BENCHMARK EXECUTION SUMMARY: {successes}/{len(steps)} components completed successfully.")
    print("=" * 80)

    # Compile master JSON
    master_report = {
        "suite": "Sanrakshan Phase 4 ML Benchmarks",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "fire_dataset_location": "D:\\MAJOR PROJECT\\project\\datasets\\fire_yolo",
        "flood_dataset_mode": "Synthetic In-Memory SAR/Optical (Zero Disk Additions)",
        "domains": {}
    }

    report_files = {
        "fire_detection": "fire_model_comparison.json",
        "flood_segmentation": "flood_model_comparison.json",
        "nlp_triage": "nlp_model_comparison.json",
        "decision_fusion": "fusion_model_comparison.json"
    }

    for domain, fname in report_files.items():
        fpath = os.path.join(REPORTS_DIR, fname)
        if os.path.exists(fpath):
            with open(fpath) as f:
                master_report["domains"][domain] = json.load(f)

    master_path = os.path.join(REPORTS_DIR, "phase4_ml_benchmarks_master.json")
    with open(master_path, "w") as f:
        json.dump(master_report, f, indent=2)

    # Sync master JSON to frontend
    frontend_master = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "operator-pwa", "public", "ml-reports", "phase4_ml_benchmarks_master.json"))
    with open(frontend_master, "w") as f:
        json.dump(master_report, f, indent=2)

    print(f"\n[OK] Master Benchmark Report written to: {master_path}")
    print(f"[OK] Synced Master Report to Frontend: {frontend_master}")


if __name__ == "__main__":
    main()
