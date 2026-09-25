from src.fusion.bayesian_fusion import BayesianConfidenceFusionEngine, SignalInput


def test_empty_signals_returns_prior():
    engine = BayesianConfidenceFusionEngine(prior_alpha=1.5, prior_beta=3.5)
    out = engine.fuse_signals([])
    assert out.posterior_probability == 0.3
    assert out.state_recommendation == "REPORTED"


def test_ambiguity_band_recommendation():
    engine = BayesianConfidenceFusionEngine()
    signals = [
        SignalInput("SATELLITE_FIRMS", 0.55, 0.7, "Moderate thermal anomaly"),
        SignalInput("WEATHER_RADAR", 0.60, 0.5, "Moderate rain cell"),
    ]
    out = engine.fuse_signals(signals)
    # Posterior should fall squarely in the ambiguity band [0.35, 0.75]
    assert 0.35 <= out.posterior_probability <= 0.75
    assert out.state_recommendation == "VERIFYING"
    assert out.credible_interval[0] < out.posterior_probability < out.credible_interval[1]


def test_high_confidence_triggers_review_ready():
    engine = BayesianConfidenceFusionEngine()
    signals = [
        SignalInput("CCTV_AI", 0.95, 0.9, "Clear flame plume visible"),
        SignalInput("CITIZEN_REPORT", 0.90, 0.8, "Multiple calls from residents"),
        SignalInput("VERIFIER_EVIDENCE", 0.98, 0.95, "Geotagged ground truth photo"),
    ]
    out = engine.fuse_signals(signals)
    assert out.posterior_probability > 0.75
    assert out.state_recommendation == "REVIEW_READY"
    assert len(out.top_contributions) == 3
