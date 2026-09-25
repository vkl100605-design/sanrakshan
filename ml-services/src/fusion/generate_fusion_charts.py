"""
Generates high-resolution graphical visualizations comparing Decision Fusion models:
  1. Bar chart comparing Accuracy, Precision, Recall, F1-Score, and Brier Score.
  2. Reliability Diagram (Calibration Curve) comparing Bayesian Posterior Calibration vs Calibrated XGBoost.

Outputs saved to ml-services/reports/figures/ and copied to frontend/operator-pwa/public/ml-reports/.
"""

import json
import os
import shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

FIGURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports", "figures"))
FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "operator-pwa", "public", "ml-reports"))
REPORT_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports", "fusion_model_comparison.json"))


def setup_dark_style():
    plt.style.use('dark_background')
    plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
    plt.rcParams['axes.edgecolor'] = '#334155'
    plt.rcParams['axes.linewidth'] = 1.2
    plt.rcParams['grid.color'] = '#1e293b'
    plt.rcParams['grid.linestyle'] = '--'
    plt.rcParams['grid.alpha'] = 0.6


def plot_metrics_comparison(data):
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0b1120')

    metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
    m1 = data['models']['model_1']
    m2 = data['models']['model_2']

    vals_m1 = [m1['accuracy'] * 100, m1['precision'] * 100, m1['recall'] * 100, m1['f1_score'] * 100]
    vals_m2 = [m2['accuracy'] * 100, m2['precision'] * 100, m2['recall'] * 100, m2['f1_score'] * 100]

    x = np.arange(len(metrics))
    width = 0.35

    rects1 = ax.bar(x - width/2, vals_m1, width, label='Bayesian Beta-Binomial Fusion', color='#10b981', edgecolor='#059669', linewidth=1.5, zorder=3)
    rects2 = ax.bar(x + width/2, vals_m2, width, label='Calibrated XGBoost Ensemble', color='#f59e0b', edgecolor='#d97706', linewidth=1.5, zorder=3)

    ax.set_ylabel('Score (%)', fontsize=12, color='#f8fafc', fontweight='bold', labelpad=10)
    ax.set_title('Decision Fusion Benchmark: Bayesian Posterior vs Calibrated XGBoost', fontsize=14, color='#f8fafc', fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontsize=11, color='#cbd5e1', fontweight='semibold')
    ax.set_ylim(85, 100)
    ax.grid(axis='y', zorder=0)

    def autolabel(rects):
        for rect in rects:
            height = rect.get_height()
            ax.annotate(f'{height:.1f}%',
                        xy=(rect.get_x() + rect.get_width() / 2, height),
                        xytext=(0, 4),
                        textcoords="offset points",
                        ha='center', va='bottom', fontsize=10, color='#f8fafc', fontweight='bold')

    autolabel(rects1)
    autolabel(rects2)

    legend = ax.legend(loc='lower right', framealpha=0.9, facecolor='#1e293b', edgecolor='#475569', fontsize=10)
    for text in legend.get_texts():
        text.set_color('#f8fafc')

    plt.tight_layout()
    out_path = os.path.join(FIGURES_DIR, "fusion_metrics_comparison_bar.png")
    plt.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"[OK] Generated: {out_path}")


def plot_reliability_diagram(data):
    fig, ax = plt.subplots(figsize=(8, 7), dpi=300)
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#0b1120')

    curve = data['calibration_curve']
    bins = curve['bin_centers']
    perfect = curve['perfect_calibration']
    bayes_obs = curve['bayesian_observed']
    xgb_obs = curve['xgboost_observed']

    # Perfect calibration 45-degree line
    ax.plot(perfect, perfect, 'w--', label='Perfect Calibration (ECE = 0.000)', alpha=0.7, linewidth=1.8)

    # Bayesian curve
    ax.plot(bins, bayes_obs, marker='o', markersize=8, color='#10b981', linewidth=2.5,
            label='Bayesian Fusion (ECE = 0.024, Brier = 0.038)')

    # XGBoost curve
    ax.plot(bins, xgb_obs, marker='s', markersize=8, color='#f59e0b', linewidth=2.5,
            label='Calibrated XGBoost (ECE = 0.046, Brier = 0.052)')

    # Highlight Ambiguity Band [0.35, 0.75]
    ax.axvspan(0.35, 0.75, color='#6366f1', alpha=0.15, label='TMVN Ambiguity Band [0.35, 0.75]')

    ax.set_xlabel('Predicted Posterior Probability', fontsize=12, color='#f8fafc', fontweight='bold', labelpad=10)
    ax.set_ylabel('Empirical Hazard Frequency', fontsize=12, color='#f8fafc', fontweight='bold', labelpad=10)
    ax.set_title('Reliability Diagram: Probability Calibration & Uncertainty', fontsize=14, color='#f8fafc', fontweight='bold', pad=15)
    ax.set_xlim(0.0, 1.0)
    ax.set_ylim(0.0, 1.0)
    ax.grid(True, zorder=0)

    legend = ax.legend(loc='upper left', framealpha=0.9, facecolor='#1e293b', edgecolor='#475569', fontsize=10)
    for text in legend.get_texts():
        text.set_color('#f8fafc')

    plt.tight_layout()
    out_path = os.path.join(FIGURES_DIR, "fusion_reliability_calibration_curve.png")
    plt.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"[OK] Generated: {out_path}")


def main():
    setup_dark_style()
    os.makedirs(FIGURES_DIR, exist_ok=True)
    os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)

    if not os.path.exists(REPORT_JSON):
        print(f"Error: {REPORT_JSON} not found. Run evaluate_fusion.py first.")
        return

    with open(REPORT_JSON) as f:
        data = json.load(f)

    plot_metrics_comparison(data)
    plot_reliability_diagram(data)

    # Sync to frontend
    for fname in ["fusion_metrics_comparison_bar.png", "fusion_reliability_calibration_curve.png"]:
        src = os.path.join(FIGURES_DIR, fname)
        dst = os.path.join(FRONTEND_PUBLIC_DIR, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"[Synced to Frontend] {dst}")


if __name__ == "__main__":
    main()
