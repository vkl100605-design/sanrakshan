"""
Explainable AI (XAI) Recommendation Generator & Signal Attribution Engine.
Computes Shapley-style additive signal attributions, credible uncertainty bounds,
and human-readable operational justifications for Emergency Operations Command.
"""

from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass
import hashlib
import json
from datetime import datetime, timezone


@dataclass
class SignalAttribution:
    source_name: str
    category: str  # 'SATELLITE', 'IOT_SENSOR', 'COMPUTER_VISION', 'TMVN_VERIFIER', 'CALL_HELPLINE'
    raw_score: float
    weight: float
    delta_contribution: float  # Absolute impact on probability shift
    percentage_attribution: float  # Normalized share of confidence (sums to 100%)
    plain_english_summary: str


@dataclass
class ExplainableRecommendation:
    incident_id: str
    posterior_probability: float
    credible_interval: Tuple[float, float]
    state_recommendation: str  # 'REPORTED', 'VERIFYING', 'REVIEW_READY', 'REJECTED'
    executive_summary: str
    signal_attributions: List[SignalAttribution]
    key_drivers: List[str]
    divergence_warnings: List[str]
    recommended_operator_actions: List[str]
    audit_provenance_hash: str


class ExplainableRecommendationGenerator:
    def __init__(self, prior_baseline: float = 0.30):
        self.prior_baseline = prior_baseline

    def generate_explanation(
        self,
        incident_id: str,
        hazard_type: str,
        signals: List[Dict[str, Any]],
        posterior_prob: float,
        credible_interval: Tuple[float, float],
        verifier_task_id: Optional[str] = None
    ) -> ExplainableRecommendation:
        """
        Produces fully explainable attribution breakdown and operator advisory.
        """
        # 1. Calculate additive delta contributions
        raw_deltas = []
        for s in signals:
            score = s.get("raw_score", 0.5)
            weight = s.get("weight", 0.5)
            delta = weight * (score - self.prior_baseline)
            raw_deltas.append(delta)

        sum_abs_deltas = sum(abs(d) for d in raw_deltas)
        if sum_abs_deltas == 0:
            sum_abs_deltas = 1.0

        attributions: List[SignalAttribution] = []
        for s, delta in zip(signals, raw_deltas):
            pct = (abs(delta) / sum_abs_deltas) * 100.0
            src = s.get("source_type", "Unknown")
            score = s.get("raw_score", 0.5)
            desc = s.get("description", "")

            # Generate natural language summary per signal
            if score >= 0.75:
                direction = "strongly corroborated active hazard presence"
            elif score >= 0.50:
                direction = "indicated moderate anomaly above background threshold"
            elif score >= 0.30:
                direction = "provided baseline unconfirmed telemetry"
            else:
                direction = "refuted active hazard presence (contradictory evidence)"

            summary = f"{src} ({desc}): score of {score:.2f} {direction} with {pct:.1f}% attribution share."

            attributions.append(SignalAttribution(
                source_name=src,
                category=s.get("category", "SENSOR"),
                raw_score=round(score, 3),
                weight=round(s.get("weight", 0.5), 2),
                delta_contribution=round(delta, 3),
                percentage_attribution=round(pct, 1),
                plain_english_summary=summary
            ))

        # Sort attributions descending by attribution percentage
        attributions.sort(key=lambda a: a.percentage_attribution, reverse=True)

        # 2. Executive Rationale & Key Drivers
        top_drivers = [a.source_name for a in attributions[:2]]
        divergences = []
        for a in attributions:
            if (a.raw_score < 0.40 and posterior_prob > 0.70) or (a.raw_score > 0.70 and posterior_prob < 0.40):
                divergences.append(
                    f"Sensor divergence: {a.source_name} (score {a.raw_score:.2f}) conflicts with consensus posterior ({posterior_prob:.2f})."
                )

        ci_low, ci_high = credible_interval
        ci_width = ci_high - ci_low

        if posterior_prob >= 0.75:
            rec_state = "REVIEW_READY"
            urgency_str = "Critical/High Confidence"
            action_text = [
                f"Review proposed multi-agency simulated dispatch package for {hazard_type} incident #{incident_id}.",
                "Inspect ground verification photo & telemetry attachments before signing authorization.",
                "Broadcast civilian evacuation advisory within 500m perimeter."
            ]
            exec_summary = (
                f"Incident #{incident_id} ({hazard_type}) escalated to {urgency_str} with {posterior_prob*100:.1f}% confidence "
                f"(90% CI: [{ci_low*100:.1f}%, {ci_high*100:.1f}%]). Primary corroboration driven by {', '.join(top_drivers)}. "
                "Confidence exceeds the 0.75 review threshold; human operator sign-off is recommended for resource mobilization."
            )
        elif posterior_prob >= 0.35:
            rec_state = "VERIFYING"
            urgency_str = "Ambiguous (Requires Verification)"
            action_text = [
                "Maintain incident in TMVN Verification queue.",
                "Await primary/secondary verifier ground evidence submission.",
                "Do not dispatch heavy emergency apparatus while in ambiguity band."
            ]
            exec_summary = (
                f"Incident #{incident_id} ({hazard_type}) remains in the Ambiguity Band ({posterior_prob*100:.1f}% confidence, "
                f"CI width: {ci_width*100:.1f}%). Heterogeneous sensor signals show elevated epistemic uncertainty. "
                "Automated TMVN tasking is active to acquire ground-truth photos and prevent false alarms."
            )
        else:
            rec_state = "REPORTED"
            urgency_str = "Low Confidence / Baseline"
            action_text = [
                "Monitor for supplementary telemetry spikes.",
                "Stand down active verification tasks if unconfirmed after 15 minutes."
            ]
            exec_summary = (
                f"Incident #{incident_id} ({hazard_type}) exhibits low hazard probability ({posterior_prob*100:.1f}%). "
                "Telemetry does not corroborate severe impact. Maintained for continuous background monitoring only."
            )

        # 3. Create cryptographic provenance hash for immutable audit
        audit_payload = {
            "incident_id": incident_id,
            "posterior_prob": posterior_prob,
            "credible_interval": list(credible_interval),
            "signals": [{"source": s.get("source_type"), "score": s.get("raw_score")} for s in signals],
            "verifier_task_id": verifier_task_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        prov_hash = hashlib.sha256(json.dumps(audit_payload, sort_keys=True).encode("utf-8")).hexdigest()

        return ExplainableRecommendation(
            incident_id=incident_id,
            posterior_probability=round(posterior_prob, 4),
            credible_interval=(round(ci_low, 4), round(ci_high, 4)),
            state_recommendation=rec_state,
            executive_summary=exec_summary,
            signal_attributions=attributions,
            key_drivers=top_drivers,
            divergence_warnings=divergences,
            recommended_operator_actions=action_text,
            audit_provenance_hash=prov_hash
        )
