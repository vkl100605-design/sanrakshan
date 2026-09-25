from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_check():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "UP"
    assert "models" in data
    assert "X-Correlation-ID" in resp.headers


def test_fire_prediction_stub():
    resp = client.post("/ml/v1/predict/fire", json={"frame_id": "cctv-cam-4", "thermal_frp": 35.0})
    assert resp.status_code == 200
    data = resp.json()
    assert "calibrated_confidence" in data
    assert data["calibrated_confidence"] > 0.5


def test_flood_prediction_stub():
    resp = client.post("/ml/v1/predict/flood", json={"water_depth_cm": 45.0, "rainfall_rate_mm": 60.0})
    assert resp.status_code == 200
    data = resp.json()
    assert data["inundation_severity"] == "HIGH"


def test_nlp_triage_stub():
    resp = client.post("/ml/v1/predict/nlp", json={"text": "Large smoke and fire breaking out near underpass!"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["hazard_type"] == "FIRE"


def test_posterior_fusion_endpoint():
    payload = {
        "signals": [
            {"source_type": "SATELLITE_FIRMS", "raw_score": 0.6, "weight": 0.8, "description": "Thermal alert"},
            {"source_type": "CITIZEN_REPORT", "raw_score": 0.7, "weight": 0.5, "description": "Smell of smoke"}
        ]
    }
    resp = client.post("/ml/v1/fusion/posterior", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "posterior_probability" in data
    assert "credible_interval" in data
    assert "top_contributions" in data
