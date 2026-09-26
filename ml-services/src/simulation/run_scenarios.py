"""
Scenario Execution and Report Generator for Sanrakshan Phase 5.
Executes discrete-event disaster scenarios, compiles timeline logs,
and syncs results to frontend/operator-pwa/public/simulation/.
"""

import sys
from pathlib import Path
import json
import os
import shutil
from datetime import datetime, timezone
from dataclasses import asdict

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.simulation.simpy_simulator import SanrakshanSimPySimulator

REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports"))
FRONTEND_SIM_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "operator-pwa", "public", "simulation"))


def serialize_scenario_result(res) -> dict:
    return {
        "scenario_id": res.scenario_id,
        "scenario_name": res.scenario_name,
        "hazard_type": res.hazard_type,
        "target_location": res.target_location,
        "total_sim_time_minutes": res.total_sim_time_minutes,
        "initial_confidence": res.initial_confidence,
        "final_posterior_confidence": res.final_posterior_confidence,
        "credible_interval": list(res.credible_interval),
        "state_transitions": res.state_transitions,
        "event_log": [
            {
                "sim_time_seconds": e.sim_time_seconds,
                "sim_time_formatted": e.sim_time_formatted,
                "event_type": e.event_type,
                "headline": e.headline,
                "details": e.details,
                "incident_id": e.incident_id,
                "confidence_at_event": e.confidence_at_event
            }
            for e in res.event_log
        ],
        "task_summary": res.task_summary,
        "xai_explanation": res.xai_explanation,
        "dispatch_plan": res.dispatch_plan,
        "operator_decision": res.operator_decision
    }


def main():
    print("=" * 80)
    print("SANRAKSHAN PHASE 5: SIMULATION & EXPLAINABILITY ENGINE")
    print("=" * 80)
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.makedirs(FRONTEND_SIM_DIR, exist_ok=True)

    simulator = SanrakshanSimPySimulator()

    scenarios = [
        ("FLOOD_MUMBRA_ESCALATION", "sim_scenario_escalation.json"),
        ("FIRE_AIROLI_SCRUB", "sim_scenario_fire_airoli.json"),
        ("FLOOD_MUMBRA_STANDARD", "sim_scenario_flood_mumbra.json"),
    ]

    master_sim_manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scenarios": []
    }

    for key, filename in scenarios:
        print(f"\n[RUNNING SCENARIO] {key}...")
        res = simulator.run_scenario(key)
        data = serialize_scenario_result(res)

        out_path = os.path.join(REPORTS_DIR, filename)
        with open(out_path, "w") as f:
            json.dump(data, f, indent=2)

        frontend_path = os.path.join(FRONTEND_SIM_DIR, filename)
        with open(frontend_path, "w") as f:
            json.dump(data, f, indent=2)

        print(f"  [OK] Completed '{res.scenario_name}' ({len(res.event_log)} events, {res.total_sim_time_minutes} min sim)")
        print(f"  [SAVED] {out_path} and {frontend_path}")

        master_sim_manifest["scenarios"].append({
            "id": res.scenario_id,
            "name": res.scenario_name,
            "hazard_type": res.hazard_type,
            "location": res.target_location,
            "events_count": len(res.event_log),
            "file": f"/simulation/{filename}"
        })

    manifest_path = os.path.join(REPORTS_DIR, "simulation_manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(master_sim_manifest, f, indent=2)

    frontend_manifest = os.path.join(FRONTEND_SIM_DIR, "simulation_manifest.json")
    with open(frontend_manifest, "w") as f:
        json.dump(master_sim_manifest, f, indent=2)

    print(f"\n[OK] Simulation Manifest generated: {frontend_manifest}")


if __name__ == "__main__":
    main()
