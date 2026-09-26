"""
TMVN Verifier Score Ranking and Candidate Selection Engine.
Computes multi-criteria ranking for citizen volunteers and trusted spotters:
  - Network proximity & route-aware ETA
  - Historical verification reliability & past precision
  - Rating & response streak
  - Domain equipment / hazard suitability
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import math
from src.simulation.tmvn_graph import DisasterCorridorRoadGraph, RouteResult


@dataclass
class VerifierProfile:
    id: str
    name: str
    phone: str
    current_node: str
    status: str  # 'AVAILABLE', 'EN_ROUTE', 'BUSY', 'OFFLINE'
    rating: float  # 1.0 - 5.0
    completed_tasks: int
    historical_accuracy: float  # 0.0 - 1.0
    equipment: List[str]  # e.g. ['MOTORCYCLE', 'WATERPROOF_BOOTS', 'SMARTPHONE_HD', 'GAS_MASK']
    specialization: str  # 'FLOOD_WATCH', 'FIRE_SCOUT', 'GENERAL_SURVEY'


@dataclass
class RankedCandidate:
    rank: int
    verifier: VerifierProfile
    composite_score: float
    eta_minutes: float
    distance_meters: float
    route: RouteResult
    tier: str  # 'PRIMARY_RECOMMENDED', 'SECONDARY_BACKUP', 'RESERVE'
    score_breakdown: Dict[str, float]


# Pre-populated active verifier roster across Thane & Mumbai disaster corridors
REGISTERED_VERIFIERS: List[VerifierProfile] = [
    VerifierProfile(
        id="V-101",
        name="Riya Sharma",
        phone="+91-98201-11223",
        current_node="RETIBUNDER_CIRCLE",
        status="AVAILABLE",
        rating=4.8,
        completed_tasks=42,
        historical_accuracy=0.96,
        equipment=["MOTORCYCLE", "WATERPROOF_BOOTS", "SMARTPHONE_HD"],
        specialization="FLOOD_WATCH"
    ),
    VerifierProfile(
        id="V-102",
        name="Aman Kulkarni",
        phone="+91-98201-44556",
        current_node="MUMBRA_BYPASS",
        status="AVAILABLE",
        rating=4.6,
        completed_tasks=28,
        historical_accuracy=0.91,
        equipment=["SMARTPHONE_HD", "RAIN_GEAR"],
        specialization="GENERAL_SURVEY"
    ),
    VerifierProfile(
        id="V-103",
        name="Vikram Jadhav",
        phone="+91-98201-77889",
        current_node="AIROLI_SECTOR_8",
        status="AVAILABLE",
        rating=4.9,
        completed_tasks=64,
        historical_accuracy=0.98,
        equipment=["MOTORCYCLE", "GAS_MASK", "SMARTPHONE_HD", "THERMAL_IR_DONGLE"],
        specialization="FIRE_SCOUT"
    ),
    VerifierProfile(
        id="V-104",
        name="Neha Patil",
        phone="+91-98201-99001",
        current_node="THANE_STATION_EAST",
        status="AVAILABLE",
        rating=4.9,
        completed_tasks=51,
        historical_accuracy=0.97,
        equipment=["WATERPROOF_BOOTS", "SMARTPHONE_HD"],
        specialization="FLOOD_WATCH"
    ),
    VerifierProfile(
        id="V-105",
        name="Sunil Deshmukh",
        phone="+91-98201-22334",
        current_node="AIROLI_BRIDGE_TOLL",
        status="AVAILABLE",
        rating=4.7,
        completed_tasks=33,
        historical_accuracy=0.93,
        equipment=["MOTORCYCLE", "SMARTPHONE_HD"],
        specialization="FIRE_SCOUT"
    ),
    VerifierProfile(
        id="V-106",
        name="Rahul Kamble",
        phone="+91-98201-55667",
        current_node="KURLA_LBS_MARG",
        status="AVAILABLE",
        rating=4.8,
        completed_tasks=39,
        historical_accuracy=0.94,
        equipment=["WATERPROOF_BOOTS", "SMARTPHONE_HD"],
        specialization="FLOOD_WATCH"
    ),
    VerifierProfile(
        id="V-107",
        name="Tanmay Chitnis",
        phone="+91-98201-88990",
        current_node="DOMBIVLI_MIDC",
        status="AVAILABLE",
        rating=4.6,
        completed_tasks=19,
        historical_accuracy=0.90,
        equipment=["SMARTPHONE_HD"],
        specialization="GENERAL_SURVEY"
    ),
]


class VerifierRankingEngine:
    def __init__(self, road_graph: Optional[DisasterCorridorRoadGraph] = None):
        self.road_graph = road_graph or DisasterCorridorRoadGraph()

    def rank_candidates_for_incident(
        self,
        incident_node: str,
        hazard_type: str = "FLOOD",
        active_roster: Optional[List[VerifierProfile]] = None
    ) -> List[RankedCandidate]:
        """
        Ranks all available verifiers for a specific incident location.
        Filters out offline or unreachable verifiers, applies multi-criteria weighting.
        """
        roster = active_roster or REGISTERED_VERIFIERS
        candidates: List[RankedCandidate] = []

        # Weights configuration
        W_PROX = 0.40  # Proximity / ETA (fastest on scene)
        W_ACC  = 0.30  # Historical accuracy & reliability
        W_RAT  = 0.15  # Citizen / operator rating
        W_SPEC = 0.15  # Hazard specialization match & equipment

        for v in roster:
            if v.status == "OFFLINE":
                continue

            route = self.road_graph.calculate_route(v.current_node, incident_node)
            if route.route_status == "UNREACHABLE":
                continue

            eta_min = route.estimated_arrival_minutes

            # 1. Proximity decay score: 1.0 for 0 min, ~0.60 for 10 min, ~0.36 for 20 min
            prox_score = math.exp(-0.05 * eta_min)

            # 2. Historical accuracy score (0.0 to 1.0)
            acc_score = v.historical_accuracy

            # 3. Rating score normalized (0.0 to 1.0)
            rat_score = min(1.0, max(0.0, (v.rating - 3.0) / 2.0))

            # 4. Specialization & equipment bonus
            spec_score = 0.5
            if hazard_type == "FLOOD":
                if v.specialization == "FLOOD_WATCH":
                    spec_score += 0.3
                if "WATERPROOF_BOOTS" in v.equipment:
                    spec_score += 0.2
            elif hazard_type == "FIRE":
                if v.specialization == "FIRE_SCOUT":
                    spec_score += 0.3
                if "GAS_MASK" in v.equipment or "THERMAL_IR_DONGLE" in v.equipment:
                    spec_score += 0.2
            spec_score = min(1.0, spec_score)

            # Availability penalty if currently busy
            avail_multiplier = 1.0 if v.status == "AVAILABLE" else 0.5

            composite = avail_multiplier * (
                W_PROX * prox_score +
                W_ACC * acc_score +
                W_RAT * rat_score +
                W_SPEC * spec_score
            )

            candidates.append(RankedCandidate(
                rank=0,  # Will be assigned after sorting
                verifier=v,
                composite_score=round(composite, 3),
                eta_minutes=eta_min,
                distance_meters=route.total_distance_meters,
                route=route,
                tier="RESERVE",
                score_breakdown={
                    "proximity": round(prox_score, 3),
                    "accuracy": round(acc_score, 3),
                    "rating": round(rat_score, 3),
                    "specialization": round(spec_score, 3),
                }
            ))

        # Sort descending by composite score
        candidates.sort(key=lambda c: c.composite_score, reverse=True)

        # Assign ranks and tiers
        for i, c in enumerate(candidates):
            c.rank = i + 1
            if i == 0:
                c.tier = "PRIMARY_RECOMMENDED"
            elif i in [1, 2]:
                c.tier = "SECONDARY_BACKUP"
            else:
                c.tier = "RESERVE"

        return candidates
