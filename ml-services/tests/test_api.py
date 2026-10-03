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


def test_simulation_scenarios_endpoint():
    resp = client.get("/ml/v1/simulation/scenarios")
    assert resp.status_code == 200
    data = resp.json()
    assert "available_scenarios" in data
    scenarios = data["available_scenarios"]
    assert len(scenarios) >= 3
    ids = [s["id"] for s in scenarios]
    assert "FLOOD_MUMBRA_ESCALATION" in ids
    assert "FIRE_AIROLI_SCRUB" in ids


def test_simulation_run_endpoint():
    resp = client.post("/ml/v1/simulation/run", json={"scenario_id": "FLOOD_MUMBRA_STANDARD"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario_id"] == "FLOOD_MUMBRA_STANDARD"
    assert len(data["event_log"]) > 0
    assert "dispatch_plan" in data
    assert "operator_decision" in data
    assert data["final_posterior_confidence"] > 0.5


def test_tmvn_route_endpoint():
    resp = client.post("/ml/v1/tmvn/route", json={
        "origin_node": "RETIBUNDER_CIRCLE",
        "destination_node": "MUMBRA_STATION"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["origin"] == "RETIBUNDER_CIRCLE"
    assert data["destination"] == "MUMBRA_STATION"
    assert data["total_distance_meters"] > 0
    assert data["route_status"] == "OPTIMAL"
    assert len(data["steps"]) > 0


def test_tmvn_rank_endpoint():
    resp = client.post("/ml/v1/tmvn/rank", json={
        "incident_node": "MUMBRA_STATION",
        "hazard_type": "FLOOD"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["incident_node"] == "MUMBRA_STATION"
    assert len(data["ranked_candidates"]) > 0
    top_cand = data["ranked_candidates"][0]
    assert top_cand["rank"] == 1
    assert top_cand["composite_score"] > 0
    assert "tier" in top_cand


def test_dispatch_plan_endpoint():
    resp = client.post("/ml/v1/dispatch/plan", json={
        "incident_id": "FLD-TEST-99",
        "hazard_type": "FLOOD",
        "target_node": "MUMBRA_STATION",
        "posterior_confidence": 0.92,
        "water_depth_cm": 50.0
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["incident_id"] == "FLD-TEST-99"
    assert len(data["resources"]) >= 1
    assert "simulation_boundary_notice" in data
    assert data["evacuation_zone_radius_meters"] > 0

