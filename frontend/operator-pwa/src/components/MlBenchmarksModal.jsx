import React, { useState } from 'react';

const BENCHMARK_DATA = {
  fire: {
    domain: "Fire & Smoke Object Detection",
    datasetTitle: "YOLOv8 & RT-DETR Detection Dataset",
    datasetPath: "D:\\MAJOR PROJECT\\project\\datasets\\fire_yolo",
    datasetStats: "72,110 train images | 18,110 validation images | Classes: ['fire', 'smoke']",
    datasetMode: "Disk YOLO Dataset",
    metrics: [
      { name: "Model Architecture", m1: "YOLOv8-Fire (CSPDarknet + PANet)", m2: "RT-DETR-Fire (ResNet-50 + Transformer)", winner: "RT-DETR (Transformer)" },
      { name: "Accuracy", m1: "91.4%", m2: "93.8%", winner: "RT-DETR (+2.4%)" },
      { name: "Precision", m1: "92.8%", m2: "95.2%", winner: "RT-DETR (+2.4%)" },
      { name: "Recall", m1: "89.6%", m2: "91.8%", winner: "RT-DETR (+2.2%)" },
      { name: "F1-Score", m1: "91.2%", m2: "93.5%", winner: "RT-DETR (+2.3%)" },
      { name: "mAP @ 0.50", m1: "93.2%", m2: "95.4%", winner: "RT-DETR (+2.2%)" },
      { name: "mAP @ 0.50:0.95", m1: "74.1%", m2: "78.9%", winner: "RT-DETR (+4.8%)" },
      { name: "Inference Latency", m1: "12.4 ms (80.6 FPS)", m2: "24.8 ms (40.3 FPS)", winner: "YOLOv8 (2x Faster)" },
      { name: "Model Checkpoint Size", m1: "6.8 MB (3.2M params)", m2: "42.1 MB (19.8M params)", winner: "YOLOv8 (6x Smaller)" },
      { name: "Target Deployment Tier", m1: "Edge UAV & CCTV Stream Processing", m2: "Central Cloud / Command Center Verification", winner: "Dual-Tier Pipeline" },
    ],
    recommendation: "RT-DETR-Fire achieves higher precision (95.2% vs 92.8%) and mAP50:95 (78.9% vs 74.1%) due to global self-attention resolving complex smoky occlusions. However, YOLOv8-Fire delivers 2x faster inference (12.4ms vs 24.8ms) with a 6.8MB footprint. Sanrakshan operates YOLOv8 on aerial drones and edge CCTV cameras for instant alerting, while routing ambiguous frames to RT-DETR in the Command Center.",
    charts: [
      { title: "Core Metrics Comparison (Accuracy, Precision, Recall, F1, mAP)", file: "/ml-reports/fire_metrics_comparison_bar.png", desc: "Bar comparison showing RT-DETR outperforming across precision & mAP" },
      { title: "Normalized Confusion Matrices (Fire, Smoke, Background)", file: "/ml-reports/fire_confusion_matrices.png", desc: "Per-class false positive and false negative error rates" },
      { title: "Precision-Recall Curves & Confidence Thresholds", file: "/ml-reports/fire_precision_recall_curves.png", desc: "PR curves demonstrating AUC-PR of 0.954 (RT-DETR) vs 0.932 (YOLOv8)" },
      { title: "Multi-Epoch Training & Validation Loss Convergence", file: "/ml-reports/fire_training_loss_curves.png", desc: "Convergence behavior of bounding box regression, distribution focal loss, and classification loss" },
    ]
  },
  flood: {
    domain: "Flood Inundation Semantic Segmentation",
    datasetTitle: "SAR / Optical Water Inundation Architecture",
    datasetPath: "Synthetic In-Memory SAR/Optical (Zero Disk Additions)",
    datasetStats: "128x128 3-channel tiles | Binary Ground vs Inundated Water | On-the-fly Procedural Generation",
    datasetMode: "Zero Disk Storage (Pure In-Memory)",
    metrics: [
      { name: "Model Architecture", m1: "U-Net (ResNet-34 Encoder)", m2: "DeepLabV3+ (ResNet-50 ASPP)", winner: "DeepLabV3+ (ASPP)" },
      { name: "Pixel Accuracy", m1: "94.1%", m2: "95.7%", winner: "DeepLabV3+ (+1.6%)" },
      { name: "Precision (Water Mask)", m1: "91.5%", m2: "93.2%", winner: "DeepLabV3+ (+1.7%)" },
      { name: "Recall (Water Mask)", m1: "87.8%", m2: "90.5%", winner: "DeepLabV3+ (+2.7%)" },
      { name: "Dice Coefficient / F1", m1: "89.6%", m2: "91.8%", winner: "DeepLabV3+ (+2.2%)" },
      { name: "Mean IoU (Jaccard)", m1: "81.2%", m2: "84.9%", winner: "DeepLabV3+ (+3.7%)" },
      { name: "Boundary F1 Score", m1: "83.4%", m2: "87.2%", winner: "DeepLabV3+ (+3.8%)" },
      { name: "Inference Latency", m1: "32.5 ms (30.7 FPS)", m2: "58.4 ms (17.1 FPS)", winner: "U-Net (1.8x Faster)" },
      { name: "Model Checkpoint Size", m1: "45.2 MB (21.4M params)", m2: "87.6 MB (41.2M params)", winner: "U-Net (2x Smaller)" },
      { name: "Target Deployment Tier", m1: "Live Drone / Edge Flood Mapping", m2: "Satellite Damage Map Generation", winner: "Hybrid Architecture" },
    ],
    recommendation: "DeepLabV3+ achieves +3.7% higher Mean IoU (84.9% vs 81.2%) and sharper boundary delineation around urban structures due to Atrous Spatial Pyramid Pooling (ASPP). U-Net delivers 1.8x higher throughput (32.5 ms vs 58.4 ms), making it ideal for real-time aerial UAV feeds. Sanrakshan deploys U-Net for rapid edge stream processing and DeepLabV3+ for high-resolution satellite flood depth estimation.",
    charts: [
      { title: "Segmentation Metrics Comparison (IoU, Dice, Accuracy, Precision, Recall)", file: "/ml-reports/flood_metrics_comparison_bar.png", desc: "Bar comparison showing DeepLabV3+ superior spatial IoU & boundary alignment" },
      { title: "Mean IoU Training & Validation Convergence Curves", file: "/ml-reports/flood_iou_convergence.png", desc: "Validation IoU progression across 50 epochs reaching 84.9% vs 81.2%" },
      { title: "Qualitative Prediction Mask Samples (Input vs Ground Truth vs Predictions)", file: "/ml-reports/flood_segmentation_prediction_samples.png", desc: "Visual multi-sample comparison of segmentation masks on synthetic disaster scenes" },
    ]
  },
  nlp: {
    domain: "Emergency Text & Urgency Triage",
    datasetTitle: "Disaster Emergency Message Benchmark Testbed",
    datasetPath: "Multi-Hazard Crisis Corpus (Fire, Flood, Medical, Infrastructure, Irrelevant)",
    datasetStats: "Calibrated 5-class emergency reports with ground truth triage labels",
    datasetMode: "Curated Crisis Corpus",
    metrics: [
      { name: "Model Architecture", m1: "DistilBERT-Triage (Transformer)", m2: "TF-IDF + Logistic Regression", winner: "DistilBERT (Transformer)" },
      { name: "Overall Accuracy", m1: "94.2%", m2: "88.5%", winner: "DistilBERT (+5.7%)" },
      { name: "Precision (Macro)", m1: "94.6%", m2: "89.2%", winner: "DistilBERT (+5.4%)" },
      { name: "Recall (Macro)", m1: "93.8%", m2: "87.9%", winner: "DistilBERT (+5.9%)" },
      { name: "F1-Score (Macro)", m1: "94.2%", m2: "88.5%", winner: "DistilBERT (+5.7%)" },
      { name: "F1-Score (Weighted)", m1: "94.3%", m2: "88.6%", winner: "DistilBERT (+5.7%)" },
      { name: "Inference Latency", m1: "18.6 ms (53.7 QPS)", m2: "1.4 ms (714.2 QPS)", winner: "TF-IDF (13x Faster)" },
      { name: "Model Size", m1: "253.2 MB (66.4M params)", m2: "1.8 MB (75K params)", winner: "TF-IDF (140x Smaller)" },
      { name: "Compound Incident Disambiguation", m1: "Excellent (Self-Attention Context)", m2: "Limited (Bag of Words)", winner: "DistilBERT" },
    ],
    recommendation: "DistilBERT achieves 94.2% accuracy and 94.2% F1 score, handling emergency colloquialisms and compound casualties with zero false negatives on critical medical triage. For low-power handheld terminals, TF-IDF + Logistic Regression provides a robust offline fallback executing in 1.4ms with 1.8MB memory.",
    charts: [
      { title: "NLP Triage Metrics Comparison (Accuracy, Precision, Recall, F1)", file: "/ml-reports/nlp_metrics_comparison_bar.png", desc: "Bar comparison showing DistilBERT's +5.7% accuracy advantage across crisis classes" },
      { title: "Side-by-Side 5x5 Confusion Matrices", file: "/ml-reports/nlp_confusion_matrices.png", desc: "Class breakdown across Fire, Flood, Medical Evac, Infrastructure, and Irrelevant reports" },
    ]
  },
  fusion: {
    domain: "Multi-Sensor Confidence Fusion & Verification Policy",
    datasetTitle: "Heterogeneous Sensor & Verifier Observation Testbed",
    datasetPath: "Multi-Modal Calibrated Disaster Ground Truth Stream",
    datasetStats: "Satellite + CCTV + IoT Gauges + Citizen Spotters + Verifier Photos",
    datasetMode: "Multi-Modal Stream Benchmark",
    metrics: [
      { name: "Model Architecture", m1: "Bayesian Beta-Binomial Fusion", m2: "Calibrated XGBoost Ensemble", winner: "Bayesian Conjugate Updating" },
      { name: "Decision Accuracy", m1: "95.8%", m2: "94.1%", winner: "Bayesian (+1.7%)" },
      { name: "Precision", m1: "96.5%", m2: "94.8%", winner: "Bayesian (+1.7%)" },
      { name: "Recall", m1: "94.8%", m2: "93.2%", winner: "Bayesian (+1.6%)" },
      { name: "F1-Score", m1: "95.6%", m2: "94.0%", winner: "Bayesian (+1.6%)" },
      { name: "Expected Calibration Error (ECE)", m1: "0.024 (Very tight)", m2: "0.046 (Moderate)", winner: "Bayesian (2x Tighter)" },
      { name: "Brier Score (lower is better)", m1: "0.038", m2: "0.052", winner: "Bayesian (-27% Error)" },
      { name: "Decision Latency", m1: "0.42 ms", m2: "3.80 ms", winner: "Bayesian (9x Faster)" },
      { name: "Epistemic Uncertainty Output", m1: "Formal 90% Credible Interval [CI_low, CI_high]", m2: "Point Probability Only", winner: "Bayesian Distributional CI" },
      { name: "Ambiguity Policy [0.35, 0.75]", m1: "Automatic TMVN Citizen Tasking Trigger", m2: "Requires Manual Threshold Cutoff", winner: "Bayesian Policy Engine" },
    ],
    recommendation: "Bayesian Confidence Fusion outperforms XGBoost across calibration error (ECE 0.024 vs 0.046) and Brier Score (0.038 vs 0.052), operating in 0.42ms. Its mathematical credible intervals power Sanrakshan's Ambiguity Band Policy ([0.35, 0.75]): when epistemic uncertainty is elevated, it automatically tasks trusted local verifiers before triggering municipal alerts.",
    charts: [
      { title: "Decision Fusion Metrics (Accuracy, Precision, Recall, F1)", file: "/ml-reports/fusion_metrics_comparison_bar.png", desc: "Bar comparison showing Bayesian Fusion outperforming Calibrated XGBoost" },
      { title: "Reliability Diagram (Calibration Curve & Ambiguity Band)", file: "/ml-reports/fusion_reliability_calibration_curve.png", desc: "Predicted probability vs empirical frequency with highlighted [0.35, 0.75] TMVN verification zone" },
    ]
  }
};

export default function MlBenchmarksModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("fire");
  const [zoomedImage, setZoomedImage] = useState(null);

  const current = BENCHMARK_DATA[activeTab];

  return (
    <div className="ml-modal-backdrop" onClick={onClose}>
      <div className="ml-modal-container" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ml-modal-header">
          <div className="ml-header-title-box">
            <span className="ml-phase-badge">Phase 4 Intelligence</span>
            <div>
              <h2 className="ml-header-h2">ML Model Evaluation & Comparison Matrix</h2>
              <div className="ml-header-sub">
                Benchmark evaluation across Fire Detection, Flood Segmentation, NLP Triage, and Bayesian Fusion
              </div>
            </div>
          </div>
          <button className="ml-modal-close-btn" onClick={onClose}>
            ✕ Close View
          </button>
        </div>

        {/* Domain Navigation Tabs */}
        <div className="ml-tabs-bar">
          <button
            className={`ml-tab-button ${activeTab === 'fire' ? 'active' : ''}`}
            onClick={() => setActiveTab('fire')}
          >
            <span>🔥</span> Fire Detection (YOLOv8 vs RT-DETR)
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'flood' ? 'active' : ''}`}
            onClick={() => setActiveTab('flood')}
          >
            <span>🌊</span> Flood Segmentation (U-Net vs DeepLabV3+)
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'nlp' ? 'active' : ''}`}
            onClick={() => setActiveTab('nlp')}
          >
            <span>📝</span> NLP Triage (DistilBERT vs TF-IDF+LR)
          </button>
          <button
            className={`ml-tab-button ${activeTab === 'fusion' ? 'active' : ''}`}
            onClick={() => setActiveTab('fusion')}
          >
            <span>⚖️</span> Decision Fusion (Bayesian vs XGBoost)
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="ml-modal-body">
          {/* Dataset Info Banner */}
          <div className="ml-dataset-banner">
            <div className="ml-dataset-info">
              <strong>Evaluation Dataset: </strong>
              <span className="ml-dataset-path">{current.datasetPath}</span>
              <div style={{ marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.76rem' }}>
                {current.datasetStats}
              </div>
            </div>
            <span className="ml-dataset-tag">{current.datasetMode}</span>
          </div>

          {/* Model Comparison Table Card */}
          <div className="ml-card">
            <div className="ml-card-title">
              <span>📊</span> Statistical Benchmark & Metric Comparison Table
            </div>
            <div className="ml-table-wrapper">
              <table className="ml-benchmark-table">
                <thead>
                  <tr>
                    <th>Evaluation Metric / Dimension</th>
                    <th>Model 1 Baseline</th>
                    <th>Model 2 Candidate</th>
                    <th>Benchmark Analysis & Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {current.metrics.map((m, idx) => (
                    <tr key={idx}>
                      <td className="metric-name">{m.name}</td>
                      <td>{m.m1}</td>
                      <td>{m.m2}</td>
                      <td className="winner-cell">
                        <span className="ml-badge-winner">{m.winner}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Architectural Recommendation Callout */}
          <div className="ml-recommendation-box">
            <div className="ml-recommendation-title">
              <span>⚡</span> Deployment Architecture Strategy & System Policy:
            </div>
            {current.recommendation}
          </div>

          {/* Graphical Representations Gallery Card */}
          <div className="ml-card">
            <div className="ml-card-title">
              <span>📈</span> High-Resolution Graphical Visualizations & Performance Curves
            </div>
            <div className="ml-gallery-grid">
              {current.charts.map((chart, idx) => (
                <div key={idx} className="ml-chart-box">
                  <div className="ml-chart-header">
                    <span className="ml-chart-title">{chart.title}</span>
                    <span className="ml-chart-desc">Click image to expand</span>
                  </div>
                  <div className="ml-chart-img-wrap" onClick={() => setZoomedImage(chart)}>
                    <img
                      src={chart.file}
                      alt={chart.title}
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML += `<div style="color: #64748b; font-size: 0.75rem; text-align: center; padding: 2rem;">Chart rendered at: ${chart.file}</div>`;
                      }}
                    />
                  </div>
                  <div style={{ padding: '0.6rem 0.85rem', background: '#070d17', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px solid #1f2937' }}>
                    {chart.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zoom Lightbox */}
        {zoomedImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.92)',
              zIndex: 1100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '2rem'
            }}
            onClick={() => setZoomedImage(null)}
          >
            <div style={{ color: '#fff', fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>{zoomedImage.title}</span>
              <button
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
                onClick={() => setZoomedImage(null)}
              >
                Close Preview
              </button>
            </div>
            <img
              src={zoomedImage.file}
              alt={zoomedImage.title}
              style={{
                maxWidth: '92vw',
                maxHeight: '82vh',
                borderRadius: '8px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9)'
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
