"""
Bayesian Confidence Fusion Engine for Sanrakshan Disaster Decision-Support.
Computes posterior hazard probability and credible uncertainty intervals
from heterogeneous weighted observation sources.
"""

from typing import Dict, List, Tuple
from dataclasses import dataclass
import numpy as np


@dataclass
class SignalInput:
    source_type: str
    raw_score: float  # [0.0, 1.0]
    weight: float      # Reliability weight [0.1, 1.0]
    description: str


@dataclass
class FusionOutput:
    posterior_probability: float
    credible_interval: Tuple[float, float]
    state_recommendation: str
    top_contributions: List[Dict[str, any]]


class BayesianConfidenceFusionEngine:
    def __init__(self, prior_alpha: float = 1.5, prior_beta: float = 3.5):
        """
        Prior distribution Beta(alpha, beta).
        Reflects uninformative baseline: disaster events are relatively rare (prior mean ~ 0.30).
        """
        self.prior_alpha = prior_alpha
        self.prior_beta = prior_beta

    def fuse_signals(self, signals: List[SignalInput]) -> FusionOutput:
        if not signals:
            mean = self.prior_alpha / (self.prior_alpha + self.prior_beta)
            return FusionOutput(
                posterior_probability=round(mean, 4),
                credible_interval=(0.10, 0.50),
                state_recommendation="REPORTED",
                top_contributions=[],
            )

        # Update Beta parameters based on evidence
        # alpha_post = alpha_0 + sum(weight_i * score_i * scaling)
        # beta_post  = beta_0  + sum(weight_i * (1 - score_i) * scaling)
        scaling = 6.0
        alpha_add = sum(s.weight * s.raw_score * scaling for s in signals)
        beta_add = sum(s.weight * (1.0 - s.raw_score) * scaling for s in signals)

        post_alpha = self.prior_alpha + alpha_add
        post_beta = self.prior_beta + beta_add

        # Posterior mean: E[Theta] = alpha / (alpha + beta)
        posterior_mean = post_alpha / (post_alpha + post_beta)

        # Approximate 90% credible interval using normal approximation to Beta distribution
        post_variance = (post_alpha * post_beta) / (
            (post_alpha + post_beta) ** 2 * (post_alpha + post_beta + 1)
        )
        post_std = np.sqrt(post_variance)
        ci_lower = max(0.0, float(posterior_mean - 1.645 * post_std))
        ci_upper = min(1.0, float(posterior_mean + 1.645 * post_std))

        # Ambiguity Band Policy
        if posterior_mean < 0.35:
            recommendation = "REPORTED"  # Monitor only
        elif posterior_mean <= 0.75:
            recommendation = "VERIFYING"  # Ambiguity band: trigger TMVN task
        else:
            recommendation = "REVIEW_READY"  # High confidence: trigger operator approval

        contributions = []
        for s in signals:
            impact = s.weight * (s.raw_score - 0.5)
            contributions.append({
                "source": s.source_type,
                "weight": round(s.weight, 2),
                "score": round(s.raw_score, 2),
                "delta": round(impact, 3),
                "description": s.description,
            })

        contributions.sort(key=lambda x: abs(x["delta"]), reverse=True)

        return FusionOutput(
            posterior_probability=round(float(posterior_mean), 4),
            credible_interval=(round(ci_lower, 4), round(ci_upper, 4)),
            state_recommendation=recommendation,
            top_contributions=contributions,
        )
