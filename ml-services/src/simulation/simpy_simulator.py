"""
SimPy Discrete-Event Simulation Engine for Sanrakshan Disaster Scenarios.
Orchestrates end-to-end incident lifecycles:
  1. Incident detection & Ambiguity Band detection (0.35 <= P <= 0.75)
  2. Verifier route-aware ranking & task dispatch
  3. Real-time verifier travel, GPS evidence capture & timeout escalation
  4. Bayesian posterior confidence fusion
  5. Explainable AI (XAI) Shapley signal attributions
  6. Simulated Multi-Agency Dispatch Planning with Operator Audit Sign-Off
"""

from typing import Dict, List, Optional, Any, Tuple
import simpy
from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone

from src.simulation.tmvn_graph import DisasterCorridorRoadGraph
from src.simulation.verifier_ranking import VerifierRankingEngine, VerifierProfile, REGISTERED_VERIFIERS
from src.simulation.escalation_engine import TaskEscalationEngine, VerificationTask, VerifierSubmission
from src.simulation.xai_explainer import ExplainableRecommendationGenerator
from src.simulation.dispatch_planner import MultiAgencyDispatchPlanner
from src.fusion.bayesian_fusion import BayesianConfidenceFusionEngine, SignalInput


@dataclass
class SimulationEvent:
    sim_time_seconds: float
    sim_time_formatted: str
    event_type: str
    headline: str
    details: Dict[str, Any]
    incident_id: str
    confidence_at_event: float


@dataclass
class SimulationScenarioResult:
    scenario_id: str
    scenario_name: str
    hazard_type: str
    target_location: str
    total_sim_time_minutes: float
    event_log: List[SimulationEvent]
    initial_confidence: float
    final_posterior_confidence: float
    credible_interval: Tuple[float, float]
    state_transitions: List[Tuple[float, str]]
    task_summary: Dict[str, Any]
    xai_explanation: Dict[str, Any]
    dispatch_plan: Dict[str, Any]
    operator_decision: Dict[str, Any]


class SanrakshanSimPySimulator:
    def __init__(self):
        self.road_graph = DisasterCorridorRoadGraph()
        self.ranking_engine = VerifierRankingEngine(self.road_graph)
        self.escalation_engine = TaskEscalationEngine()
        self.fusion_engine = BayesianConfidenceFusionEngine()
        self.xai_generator = ExplainableRecommendationGenerator()
        self.dispatch_planner = MultiAgencyDispatchPlanner(self.road_graph)

    def run_scenario(
        self,
        scenario_key: str = "FLOOD_MUMBRA_ESCALATION"
    ) -> SimulationScenarioResult:
        """
        Executes a complete SimPy discrete-event simulation run.
        Supported scenarios:
          - 'FLOOD_MUMBRA_STANDARD': Smooth verifier dispatch, photo submission, posterior rise.
          - 'FLOOD_MUMBRA_ESCALATION': Primary verifier times out, automated escalation to secondary.
          - 'FIRE_AIROLI_SCRUB': Satellite FIRMS plume, smoke scout photo, flame confirmation.
        """
        env = simpy.Environment()
        events: List[SimulationEvent] = []
        state_history: List[Tuple[float, str]] = []

        # Scenario definitions
        if scenario_key == "FIRE_AIROLI_SCRUB":
            scenario_name = "Airoli Scrub Fire: Thermal Hotspot with TMVN Corroboration"
            incident_id = "FIR-1192"
            hazard_type = "FIRE"
            target_node = "AIROLI_SECTOR_8"
            target_loc = "Airoli Knowledge Park Sector 8, Navi Mumbai"
            coords = (19.1579, 72.9935)
            initial_signals = [
                {"source_type": "NASA FIRMS Satellite (thermal FRP)", "category": "SATELLITE", "raw_score": 0.58, "weight": 0.70, "description": "Thermal anomaly detected with 32 MW Fire Radiative Power"},
                {"source_type": "CCTV Camera Airoli Toll", "category": "COMPUTER_VISION", "raw_score": 0.52, "weight": 0.50, "description": "Faint grey smoke plume detected by YOLOv8 vision pipeline"},
                {"source_type": "Citizen 112 Helpline", "category": "CALL_HELPLINE", "raw_score": 0.45, "weight": 0.40, "description": "Single caller reported burning smell near highway corridor"},
            ]
            verifier_evidence = {
                "observed_hazard": True,
                "severity": "CRITICAL",
                "flame_height_meters": 2.5,
                "description": "Active scrub fire spreading towards dry brush near transmission tower.",
                "source_type": "TMVN Verifier Ground Photo & Sensor",
                "weight": 0.90,
                "score": 0.92
            }
            simulate_timeout = False

        elif scenario_key == "FLOOD_MUMBRA_ESCALATION":
            scenario_name = "Mumbra Creek Flood: Verifier Timeout & Automated Tier-2 Escalation"
            incident_id = "FLD-2847"
            hazard_type = "FLOOD"
            target_node = "MUMBRA_STATION"
            target_loc = "Mumbra Railway Station Basin, Thane"
            coords = (19.2043, 73.0301)
            initial_signals = [
                {"source_type": "Satellite SAR Inundation (Sentinel-1)", "category": "SATELLITE", "raw_score": 0.55, "weight": 0.65, "description": "Specular backscatter drop indicating standing water"},
                {"source_type": "IoT Ulhas River Level Gauge", "category": "IOT_SENSOR", "raw_score": 0.60, "weight": 0.60, "description": "Water level 2.4m, approaching alert threshold"},
                {"source_type": "Weather Doppler Radar (IMD)", "category": "WEATHER_RADAR", "raw_score": 0.48, "weight": 0.45, "description": "Localized heavy rainfall rate 42 mm/hr"},
            ]
            verifier_evidence = {
                "observed_hazard": True,
                "severity": "CRITICAL",
                "water_depth_cm": 48.0,
                "description": "Underpass submerged up to 48cm with stalled vehicles, rapid inflow.",
                "source_type": "TMVN Verifier Ground Evidence",
                "weight": 0.92,
                "score": 0.94
            }
            simulate_timeout = True  # Will test Week 18 timeout & escalation!

        else:  # FLOOD_MUMBRA_STANDARD
            scenario_name = "Mumbra Flash Flood: Standard Verification & Bayesian Mobilization"
            incident_id = "FLD-2847"
            hazard_type = "FLOOD"
            target_node = "MUMBRA_STATION"
            target_loc = "Mumbra Basin, Thane"
            coords = (19.2043, 73.0301)
            initial_signals = [
                {"source_type": "Satellite SAR Inundation", "category": "SATELLITE", "raw_score": 0.52, "weight": 0.65, "description": "Specular reflection alert"},
                {"source_type": "IoT River Gauge", "category": "IOT_SENSOR", "raw_score": 0.58, "weight": 0.60, "description": "Telemetry elevated above baseline"},
            ]
            verifier_evidence = {
                "observed_hazard": True,
                "severity": "CRITICAL",
                "water_depth_cm": 42.0,
                "description": "Ground water depth measured 42cm.",
                "source_type": "TMVN Verifier Ground Evidence",
                "weight": 0.90,
                "score": 0.90
            }
            simulate_timeout = False

        # Simulation container for intermediate state
        sim_data = {
            "current_confidence": 0.30,
            "credible_interval": (0.10, 0.50),
            "signals": list(initial_signals),
            "task": None,
            "recommendation": None,
            "dispatch_plan": None,
            "operator_decision": None
        }

        def log_event(sim_time_sec: float, ev_type: str, headline: str, details: Dict[str, Any]):
            mins = int(sim_time_sec // 60)
            secs = int(sim_time_sec % 60)
            fmt = f"T+{mins:02d}:{secs:02d}"
            ev = SimulationEvent(
                sim_time_seconds=round(sim_time_sec, 1),
                sim_time_formatted=fmt,
                event_type=ev_type,
                headline=headline,
                details=details,
                incident_id=incident_id,
                confidence_at_event=round(sim_data["current_confidence"], 3)
            )
            events.append(ev)

        # Simulation generator process
        def disaster_process(env: simpy.Environment):
            # Step 1: Initial Observation & Ingestion (T+0s)
            state_history.append((0.0, "REPORTED"))
            log_event(
                env.now, "OBSERVATION_INGESTED",
                f"Multi-sensor observations ingested for incident #{incident_id}",
                {"signals_count": len(initial_signals), "location": target_loc}
            )

            # Step 2: Initial Bayesian Confidence Fusion (T+5s)
            yield env.timeout(5.0)
            domain_signals = [
                SignalInput(s["source_type"], s["raw_score"], s["weight"], s["description"])
                for s in sim_data["signals"]
            ]
            initial_fusion = self.fusion_engine.fuse_signals(domain_signals)
            sim_data["current_confidence"] = initial_fusion.posterior_probability
            sim_data["credible_interval"] = initial_fusion.credible_interval

            state_history.append((env.now, "VERIFYING"))
            log_event(
                env.now, "AMBIGUITY_BAND_DETECTED",
                f"Bayesian posterior calculated: {initial_fusion.posterior_probability*100:.1f}%. Ambiguity band policy triggered.",
                {
                    "posterior_probability": initial_fusion.posterior_probability,
                    "credible_interval": list(initial_fusion.credible_interval),
                    "ambiguity_band": "[0.35, 0.75]",
                    "action": "AUTOMATED_TMVN_TASK_GENERATION"
                }
            )

            # Step 3: Verifier Candidate Ranking (T+10s)
            yield env.timeout(5.0)
            ranked_candidates = self.ranking_engine.rank_candidates_for_incident(
                target_node, hazard_type
            )
            primary = ranked_candidates[0]
            secondary = ranked_candidates[1] if len(ranked_candidates) > 1 else None

            task_id = f"TSK-{uuid.uuid4().hex[:6].upper()}"
            task = self.escalation_engine.create_task(
                task_id, incident_id, hazard_type, target_node, coords, env.now
            )
            sim_data["task"] = task

            log_event(
                env.now, "VERIFIERS_RANKED",
                f"Ranked {len(ranked_candidates)} TMVN verifiers via NetworkX road network. Primary: {primary.verifier.name}",
                {
                    "primary_candidate": {
                        "name": primary.verifier.name,
                        "rating": primary.verifier.rating,
                        "eta_minutes": primary.eta_minutes,
                        "distance_meters": primary.distance_meters,
                        "composite_score": primary.composite_score
                    },
                    "secondary_candidate": secondary.verifier.name if secondary else None
                }
            )

            # Step 4: Dispatch Invitation (T+15s)
            yield env.timeout(5.0)
            self.escalation_engine.invite_verifier(
                task, primary.verifier.id, primary.verifier.name, env.now
            )
            log_event(
                env.now, "INVITATION_DISPATCHED",
                f"Verification task #{task.task_id} sent to Tier-1 verifier {primary.verifier.name} ({primary.verifier.phone})",
                {"verifier": primary.verifier.name, "tier": 1, "ttl_seconds": task.ttl_seconds}
            )

            # Step 5: Handling Timeout / Escalation or Direct Acceptance
            if simulate_timeout and secondary:
                # Verifier 1 does not answer within 125 seconds -> Triggers Week 18 timeout escalation!
                yield env.timeout(125.0)
                escalated = self.escalation_engine.check_and_escalate_timeouts(
                    task, env.now, next_candidate=(secondary.verifier.id, secondary.verifier.name)
                )
                log_event(
                    env.now, "ESCALATION_TRIGGERED",
                    f"Tier-1 Verifier {primary.verifier.name} timed out. Escalated to Tier-2: {secondary.verifier.name}",
                    {
                        "old_verifier": primary.verifier.name,
                        "new_verifier": secondary.verifier.name,
                        "new_eta_minutes": secondary.eta_minutes,
                        "tier": 2
                    }
                )

                # Secondary verifier accepts after 20s
                yield env.timeout(20.0)
                active_verifier = secondary
                task.state = "ACCEPTED"
                task.accepted_at_sim_time = env.now
                log_event(
                    env.now, "INVITATION_ACCEPTED",
                    f"Tier-2 Verifier {secondary.verifier.name} accepted task #{task.task_id}",
                    {"verifier": secondary.verifier.name, "tier": 2}
                )
            else:
                # Direct acceptance after 18 seconds
                yield env.timeout(18.0)
                active_verifier = primary
                task.state = "ACCEPTED"
                task.accepted_at_sim_time = env.now
                log_event(
                    env.now, "INVITATION_ACCEPTED",
                    f"Verifier {primary.verifier.name} accepted task #{task.task_id}",
                    {"verifier": primary.verifier.name, "tier": 1}
                )

            # Step 6: Verifier Travel along Road Network
            travel_sim_seconds = min(180.0, max(45.0, active_verifier.eta_minutes * 20.0))
            task.state = "EN_ROUTE"
            log_event(
                env.now, "VERIFIER_EN_ROUTE",
                f"{active_verifier.verifier.name} en route via {active_verifier.route.steps[0].road_name if active_verifier.route.steps else 'Road Corridor'}",
                {
                    "route_path": active_verifier.route.path_nodes,
                    "distance_meters": active_verifier.distance_meters,
                    "simulated_travel_time": travel_sim_seconds
                }
            )

            yield env.timeout(travel_sim_seconds)
            task.state = "ON_SCENE"
            task.arrived_at_sim_time = env.now
            log_event(
                env.now, "VERIFIER_ON_SCENE",
                f"{active_verifier.verifier.name} arrived at incident perimeter #{incident_id}. Initiating camera evidence capture.",
                {"target_node": target_node, "arrival_time_sec": env.now}
            )

            # Step 7: Ground Evidence Capture & Submission (30s)
            yield env.timeout(30.0)
            submission = VerifierSubmission(
                verifier_id=active_verifier.verifier.id,
                hazard_present=verifier_evidence["observed_hazard"],
                observed_severity=verifier_evidence["severity"],
                water_depth_cm=verifier_evidence.get("water_depth_cm", 0.0),
                flame_height_meters=verifier_evidence.get("flame_height_meters", 0.0),
                has_valid_gps_exif=True,
                gps_distance_to_centroid_meters=28.5,
                media_sha256=uuid.uuid4().hex,
                historical_accuracy=active_verifier.verifier.historical_accuracy
            )

            conflict_resolution = self.escalation_engine.resolve_conflicting_reports([submission])
            task.state = "SUBMITTED"
            task.submitted_at_sim_time = env.now
            task.evidence_payload = {
                "sha256": submission.media_sha256,
                "gps_distance_m": submission.gps_distance_to_centroid_meters,
                "water_depth_cm": submission.water_depth_cm,
                "flame_height_m": submission.flame_height_meters,
                "verifier_notes": verifier_evidence["description"]
            }

            log_event(
                env.now, "EVIDENCE_SUBMITTED",
                f"Field verifier ground evidence submitted with cryptographic SHA-256 fingerprint",
                {
                    "verifier": active_verifier.verifier.name,
                    "media_sha256": submission.media_sha256[:16] + "...",
                    "consensus_severity": conflict_resolution["consensus_severity"],
                    "gps_geofence_verified": True
                }
            )

            # Step 8: Bayesian Posterior Updating with Ground Truth Signal
            sim_data["signals"].append({
                "source_type": verifier_evidence["source_type"],
                "category": "TMVN_VERIFIER",
                "raw_score": verifier_evidence["score"],
                "weight": verifier_evidence["weight"],
                "description": verifier_evidence["description"]
            })

            updated_domain_signals = [
                SignalInput(s["source_type"], s["raw_score"], s["weight"], s["description"])
                for s in sim_data["signals"]
            ]
            final_fusion = self.fusion_engine.fuse_signals(updated_domain_signals)
            sim_data["current_confidence"] = final_fusion.posterior_probability
            sim_data["credible_interval"] = final_fusion.credible_interval

            state_history.append((env.now, "REVIEW_READY"))
            log_event(
                env.now, "BAYESIAN_FUSION_RESOLVED",
                f"Posterior confidence updated to {final_fusion.posterior_probability*100:.1f}% (CI: [{final_fusion.credible_interval[0]*100:.1f}%, {final_fusion.credible_interval[1]*100:.1f}%]). Ambiguity resolved!",
                {
                    "posterior_probability": final_fusion.posterior_probability,
                    "credible_interval": list(final_fusion.credible_interval),
                    "confidence_gain": round(final_fusion.posterior_probability - initial_fusion.posterior_probability, 3),
                    "new_state": "REVIEW_READY"
                }
            )

            # Step 9: Explainable AI (XAI) Attribution & Rationale Generation
            xai_rec = self.xai_generator.generate_explanation(
                incident_id=incident_id,
                hazard_type=hazard_type,
                signals=sim_data["signals"],
                posterior_prob=final_fusion.posterior_probability,
                credible_interval=final_fusion.credible_interval,
                verifier_task_id=task.task_id
            )
            sim_data["recommendation"] = xai_rec

            log_event(
                env.now, "XAI_EXPLANATION_GENERATED",
                f"Shapley-style signal attributions computed. Top driver: {xai_rec.key_drivers[0]}",
                {
                    "top_drivers": xai_rec.key_drivers,
                    "attributions": [
                        {"source": a.source_name, "share_pct": a.percentage_attribution, "delta": a.delta_contribution}
                        for a in xai_rec.signal_attributions
                    ],
                    "audit_hash": xai_rec.audit_provenance_hash[:16] + "..."
                }
            )

            # Step 10: Multi-Agency Simulated Dispatch Planner
            dispatch_plan = self.dispatch_planner.generate_dispatch_plan(
                incident_id=incident_id,
                hazard_type=hazard_type,
                target_node=target_node,
                posterior_confidence=final_fusion.posterior_probability,
                water_depth_cm=verifier_evidence.get("water_depth_cm", 0.0)
            )
            sim_data["dispatch_plan"] = dispatch_plan

            log_event(
                env.now, "DISPATCH_PACKAGE_STAGED",
                f"Multi-Agency dispatch plan generated: {len(dispatch_plan.recommended_resources)} response units staged across 4 agencies.",
                {
                    "plan_id": dispatch_plan.plan_id,
                    "mobilized_personnel": dispatch_plan.total_mobilized_personnel,
                    "evacuation_zone_meters": dispatch_plan.evacuation_zone_radius_meters,
                    "arrival_window": dispatch_plan.estimated_arrival_window,
                    "units": [r.unit_type for r in dispatch_plan.recommended_resources]
                }
            )

            # Step 11: Human Operator Decision & Mandatory Audit Justification (T+45s)
            yield env.timeout(45.0)
            operator_decision = {
                "decision_id": f"DEC-{uuid.uuid4().hex[:6].upper()}",
                "operator_id": "OP-VARUN-782",
                "action": "APPROVE_DISPATCH_PLAN",
                "justification": "Ground verifier photographs and telemetry corroborate active basin inundation (>45cm); approving simulated multi-agency response package.",
                "approved_at_sim_time": env.now,
                "digital_signature": f"SIG-ED25519-{uuid.uuid4().hex}",
                "immutable_audit_logged": True
            }
            sim_data["operator_decision"] = operator_decision
            state_history.append((env.now, "APPROVED_SIMULATED_DISPATCH"))

            log_event(
                env.now, "OPERATOR_APPROVAL_SIGNED",
                f"Operator approved simulated multi-agency dispatch with cryptographic audit signature",
                operator_decision
            )

        # Run SimPy simulation
        env.process(disaster_process(env))
        env.run(until=600.0)

        total_sim_mins = round(env.now / 60.0, 2)
        rec = sim_data["recommendation"]
        plan = sim_data["dispatch_plan"]
        task = sim_data["task"]

        return SimulationScenarioResult(
            scenario_id=scenario_key,
            scenario_name=scenario_name,
            hazard_type=hazard_type,
            target_location=target_loc,
            total_sim_time_minutes=total_sim_mins,
            event_log=events,
            initial_confidence=initial_signals[0]["raw_score"],
            final_posterior_confidence=sim_data["current_confidence"],
            credible_interval=sim_data["credible_interval"],
            state_transitions=state_history,
            task_summary={
                "task_id": task.task_id if task else None,
                "state": task.state if task else None,
                "assigned_verifier": task.assigned_verifier_name if task else None,
                "escalation_tier": task.escalation_tier if task else 1,
                "ttl_seconds": task.ttl_seconds if task else 600,
                "evidence_submitted": task.evidence_payload if task else None
            },
            xai_explanation={
                "executive_summary": rec.executive_summary if rec else "",
                "state_recommendation": rec.state_recommendation if rec else "",
                "key_drivers": rec.key_drivers if rec else [],
                "signal_attributions": [
                    {
                        "source": a.source_name,
                        "raw_score": a.raw_score,
                        "weight": a.weight,
                        "delta": a.delta_contribution,
                        "share_percent": a.percentage_attribution,
                        "summary": a.plain_english_summary
                    } for a in (rec.signal_attributions if rec else [])
                ],
                "audit_provenance_hash": rec.audit_provenance_hash if rec else ""
            },
            dispatch_plan={
                "plan_id": plan.plan_id if plan else None,
                "severity": plan.severity if plan else "",
                "evacuation_zone_radius_m": plan.evacuation_zone_radius_meters if plan else 0,
                "transit_shelter": plan.transit_shelter_assigned if plan else "",
                "total_personnel": plan.total_mobilized_personnel if plan else 0,
                "estimated_arrival_window": plan.estimated_arrival_window if plan else "",
                "resources": [
                    {
                        "unit_id": r.unit_id,
                        "agency": r.agency,
                        "type": r.unit_type,
                        "station": r.origin_station,
                        "eta_min": r.eta_minutes,
                        "status": r.status,
                        "equipment": r.equipment
                    } for r in (plan.recommended_resources if plan else [])
                ]
            },
            operator_decision=sim_data["operator_decision"] or {}
        )
