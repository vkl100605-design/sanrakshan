# ADR-0005: Decoupled ML Inference and Bayesian Confidence Fusion

## Status
Accepted

## Context
Raw computer vision object detectors (e.g. YOLO, RT-DETR) and text triage models output heuristic softmax scores that are notoriously uncalibrated and overconfident on out-of-distribution inputs (e.g., reflections mistaken for water, sunset smoke illusions). Relying directly on raw detector probabilities to trigger emergency alarms causes high false-dispatch rates.

## Decision
1. **Separation of Perception from Decision Confidence**:
   - Perception models (fire/smoke object detection, flood water semantic segmentation, text NLP triage) produce raw candidate detections and calibrated vision likelihoods.
   - A distinct **Bayesian Confidence Fusion Engine** combines multi-source signals (calibrated vision, satellite thermal anomalies, weather rainfall/wind indices, IoT gauge levels, source reliability weights, and human verifier reports).
2. **Explicit Uncertainty Modeling**:
   - Fusion outputs not just a point-estimate probability $P(\text{incident})$, but a posterior distribution and **credible interval** $[\text{CI}_{\text{low}}, \text{CI}_{\text{high}}]$.
3. **Threshold Policy**:
   - **Low Confidence ($P < 0.35$)**: Monitor only; auto-retire if no reinforcing signals appear.
   - **Ambiguity Band ($0.35 \le P \le 0.75$)**: Automatically generate a targeted verifier task (TMVN) to resolve uncertainty.
   - **High Confidence ($P > 0.75$)**: Route immediately to operator dashboard with human-in-the-loop approval recommendation.
4. **Zero Autonomous Dispatch**:
   - Under no circumstances does the ML engine issue a direct dispatch to field emergency units. Operator sign-off is mandatory.

## Consequences
### Positive
- Substantially reduces false alarms and emergency resource exhaustion.
- Clear auditability: every recommendation displays top signal contributors and credible intervals.
- Models can be retrained and calibrated independently of downstream orchestration logic.

### Negative
- Requires maintaining Python ML serving pipelines alongside the core backend.
- Inference latency must be carefully monitored to stay within real-time SLA limits.
