#!/usr/bin/env python3
"""
Sanrakshan Mock Source Generator.
Simulates heterogeneous disaster observation feeds (FIRMS satellite, weather radar,
IoT water level sensors, CCTV AI alerts, and citizen reports) for local testing and CI acceptance.
"""

import sys
import json
import uuid
import time
import argparse
from datetime import datetime, timezone
import urllib.request
import urllib.error

SCENARIOS = {
    "flood_urban_basin": {
        "title": "Severe Urban Basin Inundation (High Confidence -> Operator Review)",
        "hazard_type": "FLOOD",
        "location": {"latitude": 12.9716, "longitude": 77.5946},
        "source": "IOT_WATER_SENSOR_UNDERPASS",
        "initial_confidence": 0.82,
        "severity": "CRITICAL",
        "description": "Sensors report 55cm water accumulation at Central Underpass. Drain pumps overwhelmed.",
    },
    "ambiguous_wildfire": {
        "title": "Ambiguous Thermal Anomaly (Ambiguity Band -> TMVN Verifier Task)",
        "hazard_type": "WILDFIRE",
        "location": {"latitude": 13.0827, "longitude": 77.5877},
        "source": "NASA_FIRMS_SATELLITE",
        "initial_confidence": 0.54,
        "severity": "HIGH",
        "description": "Thermal hotspot detected in dry scrub buffer. Visual clarity hindered by cloud shadow.",
    },
    "spurious_smoke_anomaly": {
        "title": "Low Confidence Noise (Low Risk -> Monitor Only)",
        "hazard_type": "SMOKE",
        "location": {"latitude": 12.9352, "longitude": 77.6245},
        "source": "CITIZEN_SOCIAL_FEED",
        "initial_confidence": 0.22,
        "severity": "LOW",
        "description": "Single uncorroborated post mentioning smell of smoke near industrial boundary.",
    },
}


def create_cloud_event(scenario: dict, correlation_id: str) -> dict:
    return {
        "specversion": "1.0",
        "id": f"urn:uuid:{uuid.uuid4()}",
        "source": "sanrakshan.test.mock-generator",
        "type": "sanrakshan.ingestion.observation.raw",
        "time": datetime.now(timezone.utc).isoformat(),
        "datacontenttype": "application/json",
        "correlationid": correlation_id,
        "data": {
            "hazardType": scenario["hazard_type"],
            "location": scenario["location"],
            "source": scenario["source"],
            "initialConfidence": scenario["initial_confidence"],
            "severityHint": scenario["severity"],
            "description": scenario["description"],
            "observedAt": datetime.now(timezone.utc).isoformat(),
        },
    }


def send_to_backend(target_url: str, event_data: dict, correlation_id: str, idempotency_key: str):
    url = f"{target_url.rstrip('/')}/incidents"
    payload = json.dumps(event_data["data"]).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Correlation-ID": correlation_id,
            "Idempotency-Key": idempotency_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            return status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, body
    except urllib.error.URLError as e:
        return None, str(e)


def main():
    parser = argparse.ArgumentParser(description="Sanrakshan Synthetic Disaster Event Generator")
    parser.add_argument("--target-url", default="http://localhost:8080/api/v1", help="Backend API base URL")
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()) + ["all"], default="all", help="Scenario to run")
    parser.add_argument("--dry-run", action="store_true", help="Print CloudEvents without sending network requests")
    parser.add_argument("--test-idempotency", action="store_true", help="Send duplicate requests to test idempotency")
    args = parser.parse_args()

    selected = list(SCENARIOS.keys()) if args.scenario == "all" else [args.scenario]

    print("======================================================================")
    print(" SANRAKSHAN SYNTHETIC DISASTER MOCK EVENT GENERATOR")
    print(f" Target: {args.target_url} | Dry Run: {args.dry_run}")
    print("======================================================================\n")

    for key in selected:
        scenario = SCENARIOS[key]
        correlation_id = str(uuid.uuid4())
        idempotency_key = f"mock-key-{uuid.uuid4().hex[:12]}"
        cloud_event = create_cloud_event(scenario, correlation_id)

        print(f"[*] Scenario: {scenario['title']}")
        print(f"    Correlation ID:  {correlation_id}")
        print(f"    Idempotency Key: {idempotency_key}")
        print(f"    Hazard / Conf:   {scenario['hazard_type']} @ {scenario['initial_confidence']:.2f}")

        if args.dry_run:
            print("    [DRY RUN] Generated CloudEvent payload:")
            print(json.dumps(cloud_event, indent=2))
        else:
            status, res = send_to_backend(args.target_url, cloud_event, correlation_id, idempotency_key)
            if status == 201:
                print(f"    [SUCCESS] HTTP 201 Created -> Incident ID: {res.get('id')} | State: {res.get('state')}")
            else:
                print(f"    [NOTICE] Response Status: {status} (Backend offline or returned: {res})")

            if args.test_idempotency:
                print("    [*] Re-sending identical payload with identical Idempotency-Key...")
                status_dup, res_dup = send_to_backend(args.target_url, cloud_event, correlation_id, idempotency_key)
                print(f"    [IDEMPOTENCY RESULT] Status: {status_dup}")

        print("-" * 70)

    print("\n[OK] Mock event generation cycle finished.")


if __name__ == "__main__":
    main()
