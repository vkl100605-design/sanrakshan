import sys
from pathlib import Path
import pytest

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.simulation.tmvn_graph import DisasterCorridorRoadGraph
from src.simulation.verifier_ranking import VerifierRankingEngine
from src.simulation.escalation_engine import TaskEscalationEngine, VerifierSubmission
from src.simulation.xai_explainer import ExplainableRecommendationGenerator
from src.simulation.dispatch_planner import MultiAgencyDispatchPlanner
from src.simulation.simpy_simulator import SanrakshanSimPySimulator


@pytest.fixture
def road_graph():
    return DisasterCorridorRoadGraph()


@pytest.fixture
def ranking_engine(road_graph):
    return VerifierRankingEngine(road_graph)


@pytest.fixture
def escalation_engine():
    return TaskEscalationEngine()


@pytest.fixture
def xai_engine():
    return ExplainableRecommendationGenerator()


@pytest.fixture
def dispatch_planner(road_graph):
    return MultiAgencyDispatchPlanner(road_graph)


@pytest.fixture
def simulator():
    return SanrakshanSimPySimulator()


def test_road_network_routing(road_graph):
    # Route from Retibunder Circle to Mumbra Station
    route = road_graph.calculate_route("RETIBUNDER_CIRCLE", "MUMBRA_STATION")
    assert route.route_status in ["OPTIMAL", "DETOUR_DUE_TO_HAZARD"]
    assert route.total_distance_meters > 0
    assert route.total_travel_time_seconds > 0
    assert len(route.path_nodes) >= 2
    assert route.path_nodes[0] == "RETIBUNDER_CIRCLE"
    assert route.path_nodes[-1] == "MUMBRA_STATION"

    # Test dynamic hazard closure
    road_graph.set_hazard_impedance("RETIBUNDER_CIRCLE", "MUMBRA_STATION", 10.0, is_closed=True)
    detour_route = road_graph.calculate_route("RETIBUNDER_CIRCLE", "MUMBRA_STATION")
    assert detour_route.route_status in ["DETOUR_DUE_TO_HAZARD", "OPTIMAL", "UNREACHABLE"]
    road_graph.reset_impedances()


def test_verifier_ranking(ranking_engine):
    candidates = ranking_engine.rank_candidates_for_incident("MUMBRA_STATION", "FLOOD")
    assert len(candidates) > 0
    # Ranked in descending order of composite score
    assert candidates[0].composite_score >= candidates[-1].composite_score
    assert candidates[0].rank == 1
    assert candidates[0].tier == "PRIMARY_RECOMMENDED"
    assert "proximity" in candidates[0].score_breakdown
    assert "accuracy" in candidates[0].score_breakdown


def test_task_escalation_engine(escalation_engine):
    task = escalation_engine.create_task(
        task_id="TSK-001",
        incident_id="FLD-2847",
        hazard_type="FLOOD",
        target_node="MUMBRA_STATION",
        coords=(19.20, 73.03),
        sim_time=0.0
    )
    assert task.state == "CREATED"
    assert task.ttl_seconds == 720  # 12 min for Flood
    assert task.escalation_tier == 1

    escalation_engine.invite_verifier(task, "V-101", "Riya Sharma", sim_time=10.0)
    assert task.state == "INVITED"

    # Check timeout after 135s (exceeding 120s acceptance window)
    escalated = escalation_engine.check_and_escalate_timeouts(
        task, current_sim_time=145.0, next_candidate=("V-102", "Aman Kulkarni")
    )
    assert escalated is True
    assert task.escalation_tier == 2
    assert task.assigned_verifier_id == "V-102"
    assert task.state == "INVITED"


def test_conflict_resolution(escalation_engine):
    # Two conflicting verifier submissions
    sub1 = VerifierSubmission(
        verifier_id="V-101",
        hazard_present=True,
        observed_severity="CRITICAL",
        water_depth_cm=45.0,
        has_valid_gps_exif=True,
        gps_distance_to_centroid_meters=30.0,
        historical_accuracy=0.96
    )
    sub2 = VerifierSubmission(
        verifier_id="V-102",
        hazard_present=False,
        observed_severity="FALSE_ALARM",
        water_depth_cm=0.0,
        has_valid_gps_exif=False,  # Unverified GPS
        gps_distance_to_centroid_meters=200.0,
        historical_accuracy=0.85
    )
    res = escalation_engine.resolve_conflicting_reports([sub1, sub2])
    assert res["conflicts_detected"] is True
    assert res["resolved_presence"] is True  # V-101 has higher weight and verified GPS
    assert res["consensus_severity"] == "CRITICAL"


def test_xai_explainer(xai_engine):
    signals = [
        {"source_type": "Satellite SAR Inundation", "category": "SATELLITE", "raw_score": 0.85, "weight": 0.80, "description": "High backscatter anomaly"},
        {"source_type": "IoT River Level Gauge", "category": "IOT_SENSOR", "raw_score": 0.78, "weight": 0.70, "description": "Danger level exceeded"},
        {"source_type": "Citizen 112 Call", "category": "CALL_HELPLINE", "raw_score": 0.40, "weight": 0.30, "description": "Unconfirmed inquiry"},
    ]
    explanation = xai_engine.generate_explanation(
        incident_id="FLD-2847",
        hazard_type="FLOOD",
        signals=signals,
        posterior_prob=0.88,
        credible_interval=(0.82, 0.94)
    )
    assert explanation.state_recommendation == "REVIEW_READY"
    assert len(explanation.signal_attributions) == 3
    # Check that percentage shares sum approximately to 100%
    total_pct = sum(a.percentage_attribution for a in explanation.signal_attributions)
    assert abs(total_pct - 100.0) < 0.5
    assert len(explanation.audit_provenance_hash) == 64  # SHA-256


def test_multi_agency_dispatch_planner(dispatch_planner):
    plan = dispatch_planner.generate_dispatch_plan(
        incident_id="FLD-2847",
        hazard_type="FLOOD",
        target_node="MUMBRA_STATION",
        posterior_confidence=0.88,
        water_depth_cm=45.0
    )
    assert plan.hazard_type == "FLOOD"
    assert plan.severity == "CRITICAL"
    assert len(plan.recommended_resources) >= 4
    agencies = {r.agency for r in plan.recommended_resources}
    assert "NDRF_RESCUE" in agencies
    assert "MUNICIPAL_DRAINAGE" in agencies
    assert "AMBULANCE_EMS" in agencies
    assert "TRAFFIC_POLICE" in agencies
    assert "STRICT ACADEMIC SIMULATION" in plan.simulation_boundary_notice


def test_simpy_simulation_scenarios(simulator):
    # Scenario 1: Flood Escalation
    res_esc = simulator.run_scenario("FLOOD_MUMBRA_ESCALATION")
    assert res_esc.hazard_type == "FLOOD"
    assert len(res_esc.event_log) >= 10
    assert res_esc.task_summary["escalation_tier"] == 2
    assert res_esc.operator_decision["action"] == "APPROVE_DISPATCH_PLAN"

    # Scenario 2: Fire Scrub
    res_fire = simulator.run_scenario("FIRE_AIROLI_SCRUB")
    assert res_fire.hazard_type == "FIRE"
    assert len(res_fire.event_log) >= 10
    assert res_fire.dispatch_plan["severity"] in ["CRITICAL", "MODERATE"]
