import uuid
import time
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Header, Response, Request
from pydantic import BaseModel, Field

from src.config import settings
from src.fusion.bayesian_fusion import (
    BayesianConfidenceFusionEngine,
    SignalInput,
)
from src.perception.stubs import (
    score_fire_observation,
    score_flood_observation,
    score_nlp_triage,
)

app = FastAPI(
    title="Sanrakshan ML & Bayesian Fusion Services",
    version=settings.version,
    description="Machine Learning perception inference and Bayesian confidence fusion for disaster decision support.",
)

fusion_engine = BayesianConfidenceFusionEngine()


# Correlation ID Middleware
@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-ID")
    if not correlation_id:
        correlation_id = str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    response: Response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response


# Health Endpoint
@app.get("/")
def root():
    return {
        "service": "Sanrakshan AI Perception, Bayesian Fusion & SimPy Simulation Service",
        "status": "OPERATIONAL",
        "version": settings.version,
        "environment": settings.environment,
        "swagger_docs": "/docs",
        "health_check": "/health",
        "simulation_scenarios": "/ml/v1/simulation/scenarios"
    }


@app.get("/health")
def health_check():

    return {
        "status": "UP",
        "service": "sanrakshan-ml-services",
        "version": settings.version,
        "environment": settings.environment,
        "models": {
            "fire_detector": "yolov8s-fire-smoke-v1",
            "flood_segmentation": "unet-flood-segmentation-v2",
            "nlp_triage": "distilbert-nlp-triage-v1",
            "fusion_engine": "pymc-bayesian-beta-binomial-v1.4",
        },
    }


# Schemas
class FireInferenceRequest(BaseModel):
    frame_id: str
    thermal_frp: Optional[float] = 0.0


class FloodInferenceRequest(BaseModel):
    water_depth_cm: float
    rainfall_rate_mm: float


class NlpTriageRequest(BaseModel):
    text: str


class SignalModel(BaseModel):
    source_type: str
    raw_score: float = Field(..., ge=0.0, le=1.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    description: str


class FusionRequest(BaseModel):
    signals: List[SignalModel]


@app.post("/ml/v1/predict/fire")
def predict_fire(req: FireInferenceRequest):
    return score_fire_observation(req.frame_id, req.thermal_frp)


@app.post("/ml/v1/predict/flood")
def predict_flood(req: FloodInferenceRequest):
    return score_flood_observation(req.water_depth_cm, req.rainfall_rate_mm)


@app.post("/ml/v1/predict/nlp")
def predict_nlp(req: NlpTriageRequest):
    return score_nlp_triage(req.text)


@app.post("/ml/v1/fusion/posterior")
def calculate_posterior_fusion(req: FusionRequest):
    domain_signals = [
        SignalInput(
            source_type=s.source_type,
            raw_score=s.raw_score,
            weight=s.weight,
            description=s.description,
        )
        for s in req.signals
    ]
    result = fusion_engine.fuse_signals(domain_signals)
    return {
        "posterior_probability": result.posterior_probability,
        "credible_interval": list(result.credible_interval),
        "state_recommendation": result.state_recommendation,
        "top_contributions": result.top_contributions,
        "model_version": "pymc-bayesian-beta-binomial-v1.4",
    }


# =========================================================================
# PHASE 5: TMVN ROUTING, SIMULATION & EXPLAINABILITY ENDPOINTS
# =========================================================================

from src.simulation.simpy_simulator import SanrakshanSimPySimulator
from src.simulation.tmvn_graph import DisasterCorridorRoadGraph
from src.simulation.verifier_ranking import VerifierRankingEngine
from src.simulation.xai_explainer import ExplainableRecommendationGenerator
from src.simulation.dispatch_planner import MultiAgencyDispatchPlanner

simulator_engine = SanrakshanSimPySimulator()
road_graph = DisasterCorridorRoadGraph()
ranking_engine = VerifierRankingEngine(road_graph)
xai_engine = ExplainableRecommendationGenerator()
dispatch_planner = MultiAgencyDispatchPlanner(road_graph)


class SimulationRunRequest(BaseModel):
    scenario_id: str = "FLOOD_MUMBRA_ESCALATION"


class RouteRequest(BaseModel):
    origin_node: str = "RETIBUNDER_CIRCLE"
    destination_node: str = "MUMBRA_STATION"


class VerifierRankRequest(BaseModel):
    incident_node: str = "MUMBRA_STATION"
    hazard_type: str = "FLOOD"


class DispatchPlanRequest(BaseModel):
    incident_id: str = "FLD-2847"
    hazard_type: str = "FLOOD"
    target_node: str = "MUMBRA_STATION"
    posterior_confidence: float = 0.88
    water_depth_cm: Optional[float] = 45.0


@app.get("/ml/v1/simulation/scenarios")
def list_scenarios():
    return {
        "available_scenarios": [
            {
                "id": "FLOOD_MUMBRA_ESCALATION",
                "name": "Mumbra Creek Flood: Verifier Timeout & Automated Tier-2 Escalation",
                "hazard_type": "FLOOD",
                "description": "Simulates primary verifier non-response within 120s TTL, automated Tier-2 escalation to secondary verifier, and Bayesian evidence mobilization."
            },
            {
                "id": "FIRE_AIROLI_SCRUB",
                "name": "Airoli Scrub Fire: Thermal Hotspot with TMVN Corroboration",
                "hazard_type": "FIRE",
                "description": "Simulates NASA FIRMS thermal anomaly, smoke detector classification, verifier ground confirmation, and fire tender staging."
            },
            {
                "id": "FLOOD_MUMBRA_STANDARD",
                "name": "Mumbra Flash Flood: Standard Verification & Bayesian Mobilization",
                "hazard_type": "FLOOD",
                "description": "Baseline workflow: SAR satellite alert, single verifier dispatch, geotagged photo submission, and operator approval."
            }
        ]
    }


@app.post("/ml/v1/simulation/run")
def run_simulation(req: SimulationRunRequest):
    from src.simulation.run_scenarios import serialize_scenario_result
    result = simulator_engine.run_scenario(req.scenario_id)
    return serialize_scenario_result(result)


@app.post("/ml/v1/tmvn/route")
def calculate_route(req: RouteRequest):
    route = road_graph.calculate_route(req.origin_node, req.destination_node)
    return {
        "origin": req.origin_node,
        "destination": req.destination_node,
        "total_distance_meters": route.total_distance_meters,
        "total_travel_time_seconds": route.total_travel_time_seconds,
        "estimated_arrival_minutes": route.estimated_arrival_minutes,
        "route_status": route.route_status,
        "path_nodes": route.path_nodes,
        "steps": [
            {
                "from_node": s.from_node,
                "to_node": s.to_node,
                "road": s.road_name,
                "distance_m": s.distance_meters,
                "time_sec": s.travel_time_seconds,
                "hazard_affected": s.is_hazard_affected
            }
            for s in route.steps
        ]
    }


@app.post("/ml/v1/tmvn/rank")
def rank_verifiers(req: VerifierRankRequest):
    candidates = ranking_engine.rank_candidates_for_incident(req.incident_node, req.hazard_type)
    return {
        "incident_node": req.incident_node,
        "hazard_type": req.hazard_type,
        "ranked_candidates": [
            {
                "rank": c.rank,
                "tier": c.tier,
                "composite_score": c.composite_score,
                "verifier_id": c.verifier.id,
                "name": c.verifier.name,
                "phone": c.verifier.phone,
                "current_node": c.verifier.current_node,
                "rating": c.verifier.rating,
                "eta_minutes": c.eta_minutes,
                "distance_meters": c.distance_meters,
                "equipment": c.verifier.equipment,
                "score_breakdown": c.score_breakdown
            }
            for c in candidates
        ]
    }


@app.post("/ml/v1/dispatch/plan")
def generate_dispatch_plan(req: DispatchPlanRequest):
    plan = dispatch_planner.generate_dispatch_plan(
        incident_id=req.incident_id,
        hazard_type=req.hazard_type,
        target_node=req.target_node,
        posterior_confidence=req.posterior_confidence,
        water_depth_cm=req.water_depth_cm
    )
    return {
        "plan_id": plan.plan_id,
        "incident_id": plan.incident_id,
        "hazard_type": plan.hazard_type,
        "severity": plan.severity,
        "evacuation_zone_radius_meters": plan.evacuation_zone_radius_meters,
        "transit_shelter_assigned": plan.transit_shelter_assigned,
        "total_mobilized_personnel": plan.total_mobilized_personnel,
        "estimated_arrival_window": plan.estimated_arrival_window,
        "simulation_boundary_notice": plan.simulation_boundary_notice,
        "resources": [
            {
                "unit_id": r.unit_id,
                "agency": r.agency,
                "unit_type": r.unit_type,
                "origin_station": r.origin_station,
                "assigned_node": r.assigned_node,
                "eta_minutes": r.eta_minutes,
                "distance_meters": r.distance_meters,
                "status": r.status,
                "equipment": r.equipment
            }
            for r in plan.recommended_resources
        ]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
