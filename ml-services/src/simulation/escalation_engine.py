"""
TMVN Task Timeout, Escalation Engine, and Conflict Resolution Rules.
Manages verifier task lifecycle, dynamic TTL calculation, escalation tiers,
and multi-verifier report conflict resolution.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import time
from datetime import datetime, timezone


@dataclass
class VerificationTask:
    task_id: str
    incident_id: str
    hazard_type: str
    target_node: str
    target_coords: Tuple[float, float]
    state: str  # 'CREATED', 'INVITED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'SUBMITTED', 'TIMED_OUT', 'ESCALATED', 'DECLINED'
    assigned_verifier_id: Optional[str] = None
    assigned_verifier_name: Optional[str] = None
    escalation_tier: int = 1  # 1 = Primary, 2 = Secondary, 3 = Drone / Warden Fallback
    ttl_seconds: int = 720
    created_at_sim_time: float = 0.0
    accepted_at_sim_time: Optional[float] = None
    arrived_at_sim_time: Optional[float] = None
    submitted_at_sim_time: Optional[float] = None
    evidence_payload: Optional[Dict[str, Any]] = None
    escalation_history: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class VerifierSubmission:
    verifier_id: str
    hazard_present: bool
    observed_severity: str  # 'CRITICAL', 'MODERATE', 'MINOR', 'FALSE_ALARM'
    water_depth_cm: Optional[float] = 0.0
    flame_height_meters: Optional[float] = 0.0
    has_valid_gps_exif: bool = True
    gps_distance_to_centroid_meters: float = 35.0
    media_sha256: str = "a1b2c3d4e5f67890"
    historical_accuracy: float = 0.95


class TaskEscalationEngine:
    def __init__(self):
        # Dynamic TTL by hazard class
        self.hazard_ttl_map = {
            "FIRE": 480,       # 8 minutes
            "FLOOD": 720,      # 12 minutes
            "LANDSLIDE": 900,  # 15 minutes
            "GENERAL": 600,    # 10 minutes
        }
        self.acceptance_window_seconds = 120.0  # 2 minutes to accept invitation

    def create_task(
        self,
        task_id: str,
        incident_id: str,
        hazard_type: str,
        target_node: str,
        coords: Tuple[float, float],
        sim_time: float = 0.0
    ) -> VerificationTask:
        ttl = self.hazard_ttl_map.get(hazard_type.upper(), 600)
        return VerificationTask(
            task_id=task_id,
            incident_id=incident_id,
            hazard_type=hazard_type,
            target_node=target_node,
            target_coords=coords,
            state="CREATED",
            ttl_seconds=ttl,
            created_at_sim_time=sim_time,
            escalation_history=[{
                "timestamp_sim_time": sim_time,
                "event": "TASK_INITIALIZED",
                "tier": 1,
                "note": f"Initial task created with {ttl}s TTL"
            }]
        )

    def invite_verifier(self, task: VerificationTask, verifier_id: str, verifier_name: str, sim_time: float):
        task.assigned_verifier_id = verifier_id
        task.assigned_verifier_name = verifier_name
        task.state = "INVITED"
        task.escalation_history.append({
            "timestamp_sim_time": sim_time,
            "event": "INVITATION_SENT",
            "verifier_id": verifier_id,
            "verifier_name": verifier_name,
            "tier": task.escalation_tier
        })

    def check_and_escalate_timeouts(
        self,
        task: VerificationTask,
        current_sim_time: float,
        next_candidate: Optional[Tuple[str, str]] = None
    ) -> bool:
        """
        Evaluates task timeout conditions.
        If accepted time is exceeded or overall TTL is expired, triggers escalation.
        Returns True if escalation occurred.
        """
        elapsed = current_sim_time - task.created_at_sim_time

        # Condition 1: Overall task TTL exceeded
        if elapsed > task.ttl_seconds and task.state not in ["SUBMITTED", "ESCALATED"]:
            task.state = "TIMED_OUT"
            task.escalation_tier = 3
            task.escalation_history.append({
                "timestamp_sim_time": current_sim_time,
                "event": "TASK_TTL_EXPIRED",
                "tier": 3,
                "action": "TRIGGER_MUNICIPAL_DRONE_OR_WARDEN_FALLBACK"
            })
            return True

        # Condition 2: Verifier failed to accept within acceptance window
        if task.state == "INVITED":
            invite_elapsed = current_sim_time - task.escalation_history[-1]["timestamp_sim_time"]
            if invite_elapsed > self.acceptance_window_seconds:
                old_v = task.assigned_verifier_name
                if task.escalation_tier == 1 and next_candidate:
                    # Escalate to Tier 2 (Backup candidate)
                    task.escalation_tier = 2
                    task.assigned_verifier_id = next_candidate[0]
                    task.assigned_verifier_name = next_candidate[1]
                    task.state = "INVITED"
                    task.escalation_history.append({
                        "timestamp_sim_time": current_sim_time,
                        "event": "ESCALATED_TIER_2",
                        "reason": f"Verifier {old_v} did not respond within {self.acceptance_window_seconds}s",
                        "new_verifier_id": next_candidate[0],
                        "new_verifier_name": next_candidate[1]
                    })
                    return True
                else:
                    # Escalate to Tier 3 (Drone / Emergency Warden)
                    task.escalation_tier = 3
                    task.state = "ESCALATED"
                    task.escalation_history.append({
                        "timestamp_sim_time": current_sim_time,
                        "event": "ESCALATED_TIER_3",
                        "reason": "All available verifier tiers exhausted or timed out",
                        "action": "DISPATCH_AUTONOMOUS_DRONE_FEED"
                    })
                    return True

        return False

    def resolve_conflicting_reports(
        self,
        submissions: List[VerifierSubmission]
    ) -> Dict[str, Any]:
        """
        Resolves conflicting evidence when multiple verifiers submit divergent ground reports.
        Applies GPS geofence validation and historical accuracy Bayesian weighting.
        """
        if not submissions:
            return {"resolved_presence": False, "consensus_severity": "UNKNOWN", "confidence": 0.5}

        if len(submissions) == 1:
            s = submissions[0]
            conf = s.historical_accuracy * (0.95 if s.has_valid_gps_exif and s.gps_distance_to_centroid_meters < 100 else 0.6)
            return {
                "resolved_presence": s.hazard_present,
                "consensus_severity": s.observed_severity,
                "confidence": round(conf, 3),
                "conflicts_detected": False,
                "participating_verifiers": [s.verifier_id]
            }

        # Multi-verifier Bayesian consensus
        total_weight = 0.0
        weighted_presence = 0.0

        for s in submissions:
            # Geofence integrity check
            geofence_weight = 1.0
            if not s.has_valid_gps_exif:
                geofence_weight = 0.3
            elif s.gps_distance_to_centroid_meters > 150:
                geofence_weight = 0.5

            w = s.historical_accuracy * geofence_weight
            total_weight += w
            if s.hazard_present:
                weighted_presence += w

        consensus_prob = weighted_presence / total_weight if total_weight > 0 else 0.5
        is_hazard = consensus_prob >= 0.50

        # Check if there is significant disagreement
        has_conflict = any(s.hazard_present != is_hazard for s in submissions)

        # Consensus severity based on agreeing verifiers
        agreeing = [s for s in submissions if s.hazard_present == is_hazard]
        severity_votes = {}
        for s in agreeing:
            severity_votes[s.observed_severity] = severity_votes.get(s.observed_severity, 0) + 1
        consensus_sev = max(severity_votes, key=severity_votes.get) if severity_votes else "MODERATE"

        return {
            "resolved_presence": is_hazard,
            "consensus_severity": consensus_sev,
            "confidence": round(consensus_prob, 3),
            "conflicts_detected": has_conflict,
            "resolution_method": "Bayesian Historical Accuracy + GPS Geofence Weighting",
            "participating_verifiers": [s.verifier_id for s in submissions]
        }
