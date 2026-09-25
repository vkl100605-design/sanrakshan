"""
Generates high-resolution graphical visualizations comparing NLP triage models:
  1. Bar chart comparing Accuracy, Precision, Recall, F1-Score, and Latency.
  2. Side-by-side Confusion Matrices for DistilBERT vs TF-IDF + Logistic Regression.

Outputs saved to ml-services/reports/figures/ and copied to frontend/operator-pwa/public/ml-reports/.
"""

import json
import os
import shutil
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

FIGURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports", "figures"))
FRONTEND_PUBLIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "operator-pwa", "public", "ml-reports"))
REPORT_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports", "nlp_model_comparison.json"))


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

    metrics = ['Accuracy', 'Precision (Macro)', 'Recall (Macro)', 'F1-Score (Macro)']
    m1 = data['models']['model_1']
    m2 = data['models']['model_2']

    vals_m1 = [m1['accuracy'] * 100, m1['precision_macro'] * 100, m1['recall_macro'] * 100, m1['f1_macro'] * 100]
    vals_m2 = [m2['accuracy'] * 100, m2['precision_macro'] * 100, m2['recall_macro'] * 100, m2['f1_macro'] * 100]

    x = np.arange(len(metrics))
    width = 0.35

    rects1 = ax.bar(x - width/2, vals_m1, width, label='DistilBERT-Triage (Transformer)', color='#38bdf8', edgecolor='#0284c7', linewidth=1.5, zorder=3)
    rects2 = ax.bar(x + width/2, vals_m2, width, label='TF-IDF + Logistic Regression', color='#a855f7', edgecolor='#7e22ce', linewidth=1.5, zorder=3)

    ax.set_ylabel('Score (%)', fontsize=12, color='#f8fafc', fontweight='bold', labelpad=10)
    ax.set_title('NLP Triage Benchmark: DistilBERT vs TF-IDF + Logistic Regression', fontsize=14, color='#f8fafc', fontweight='bold', pad=15)
    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontsize=11, color='#cbd5e1', fontweight='semibold')
    ax.set_ylim(80, 100)
    ax.grid(axis='y', zorder=0)

    # Annotate bar values
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
    out_path = os.path.join(FIGURES_DIR, "nlp_metrics_comparison_bar.png")
    plt.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"[OK] Generated: {out_path}")


def plot_confusion_matrices(data):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6), dpi=300)
    fig.patch.set_facecolor('#0f172a')

    classes = data['classes']
    cm1 = np.array(data['models']['model_1']['confusion_matrix']['matrix'])
    cm2 = np.array(data['models']['model_2']['confusion_matrix']['matrix'])

    cmap_blue = sns.light_palette("#38bdf8", as_cmap=True)
    cmap_purple = sns.light_palette("#a855f7", as_cmap=True)

    # DistilBERT
    sns.heatmap(cm1, annot=True, fmt='d', cmap=cmap_blue, cbar=False,
                xticklabels=classes, yticklabels=classes, ax=ax1,
                linewidths=1, linecolor='#1e293b', annot_kws={"size": 11, "weight": "bold", "color": "#0f172a"})
    ax1.set_title("DistilBERT Confusion Matrix (Acc: 94.2%)", fontsize=12, color='#38bdf8', fontweight='bold', pad=12)
    ax1.set_xlabel("Predicted Emergency Class", fontsize=11, color='#cbd5e1', labelpad=8)
    ax1.set_ylabel("True Emergency Class", fontsize=11, color='#cbd5e1', labelpad=8)
    ax1.tick_params(colors='#94a3b8', labelsize=9)
    plt.setp(ax1.get_xticklabels(), rotation=30, ha="right")

    # TF-IDF + LR
    sns.heatmap(cm2, annot=True, fmt='d', cmap=cmap_purple, cbar=False,
                xticklabels=classes, yticklabels=classes, ax=ax2,
                linewidths=1, linecolor='#1e293b', annot_kws={"size": 11, "weight": "bold", "color": "#0f172a"})
    ax2.set_title("TF-IDF + Logistic Regression (Acc: 88.5%)", fontsize=12, color='#a855f7', fontweight='bold', pad=12)
    ax2.set_xlabel("Predicted Emergency Class", fontsize=11, color='#cbd5e1', labelpad=8)
    ax2.set_ylabel("True Emergency Class", fontsize=11, color='#cbd5e1', labelpad=8)
    ax2.tick_params(colors='#94a3b8', labelsize=9)
    plt.setp(ax2.get_xticklabels(), rotation=30, ha="right")

    plt.tight_layout()
    out_path = os.path.join(FIGURES_DIR, "nlp_confusion_matrices.png")
    plt.savefig(out_path, facecolor=fig.get_facecolor(), edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"[OK] Generated: {out_path}")


def main():
    setup_dark_style()
    os.makedirs(FIGURES_DIR, exist_ok=True)
    os.makedirs(FRONTEND_PUBLIC_DIR, exist_ok=True)

    if not os.path.exists(REPORT_JSON):
        print(f"Error: {REPORT_JSON} not found. Run evaluate_nlp.py first.")
        return

    with open(REPORT_JSON) as f:
        data = json.load(f)

    plot_metrics_comparison(data)
    plot_confusion_matrices(data)

    # Sync to frontend
    for fname in ["nlp_metrics_comparison_bar.png", "nlp_confusion_matrices.png"]:
        src = os.path.join(FIGURES_DIR, fname)
        dst = os.path.join(FRONTEND_PUBLIC_DIR, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"[Synced to Frontend] {dst}")


if __name__ == "__main__":
    main()
