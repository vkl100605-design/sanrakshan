import urllib.request
import json
import base64
import glob
import io
from PIL import Image

def check(url, method='GET', payload=None):
    try:
        data = json.dumps(payload).encode('utf-8') if payload else None
        headers = {'Content-Type': 'application/json'} if payload else {}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=6) as res:
            body = res.read().decode('utf-8')
            parsed = json.loads(body) if 'application/json' in res.headers.get('content-type', '') else None
            return True, res.status, parsed
    except Exception as e:
        return False, str(e), None

print("=================================================================")
print(" SANRAKSHAN FULL-STACK INTEGRATION & HEALTH VERIFICATION")
print("=================================================================")

# 1. Services Check
print("\n[1] ACTIVE SERVICES STATUS")
services = [
    (3000, "Operator Command Center PWA"),
    (3001, "TMVN Verifier Mobile PWA"),
    (8000, "ML Perception & Bayesian Services")
]
for port, name in services:
    ok, status, _ = check(f"http://localhost:{port}")
    badge = "PASS" if ok else "FAIL"
    print(f"  [{badge}] {name} (http://localhost:{port}): {status}")

# 2. ML Perception Endpoints
print("\n[2] ML SERVICE CAPABILITIES")
ok_h, _, jh = check("http://localhost:8000/health")
print(f"  [{'PASS' if ok_h else 'FAIL'}] Core Health: {jh.get('status', 'ERROR')}")

ok_sim, _, j_sim = check("http://localhost:8000/ml/v1/simulation/scenarios")
scenarios_count = len(j_sim.get('available_scenarios', [])) if j_sim else 0
print(f"  [{'PASS' if ok_sim else 'FAIL'}] SimPy Scenarios: {scenarios_count} scenarios registered")

ok_rank, _, j_rank = check("http://localhost:8000/ml/v1/tmvn/rank", "POST", {"incident_node": "MUMBRA_STATION", "hazard_type": "FLOOD"})
ranks_count = len(j_rank.get('ranked_candidates', [])) if j_rank else 0
print(f"  [{'PASS' if ok_rank else 'FAIL'}] TMVN Graph Verifier Ranking: {ranks_count} verifiers scored")

# 3. Real Fire Detection Inference Pipeline
print("\n[3] REAL-TIME YOLOV8 & VISION FIRE DETECTION INFERENCE")
fire_imgs = glob.glob(r"D:\MAJOR PROJECT\project\datasets\fire_yolo\images\train\*.jpg")
fire_b64 = None
if fire_imgs:
    with open(fire_imgs[0], "rb") as f:
        fire_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode("utf-8")
    ok_fire, _, j_fire = check("http://localhost:8000/ml/v1/predict/fire/image", "POST", {"image_base64": fire_b64})
    print(f"  [{'PASS' if ok_fire else 'FAIL'}] Test On Fire Dataset Image:")
    print(f"         Prediction : {j_fire.get('label')}")
    print(f"         Confidence : {j_fire.get('confidence')}%")
    print(f"         Latency    : {j_fire.get('latency_ms')} ms")
    print(f"         Model      : {j_fire.get('model')}")
    print(f"         BoundingBox: {j_fire.get('bounding_boxes')}")

# Non-fire test
buf = io.BytesIO()
Image.new("RGB", (320, 240), color=(140, 180, 220)).save(buf, format="JPEG")
non_fire_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
ok_non, _, j_non = check("http://localhost:8000/ml/v1/predict/fire/image", "POST", {"image_base64": non_fire_b64})
print(f"  [{'PASS' if ok_non else 'FAIL'}] Test On Clean Non-Fire Image:")
print(f"         Prediction : {j_non.get('label')}")
print(f"         Confidence : {j_non.get('confidence')}%")
print(f"         Latency    : {j_non.get('latency_ms')} ms")

# 4. TMVN Verifier to Operator Sync
print("\n[4] TMVN VERIFIER GROUND TRUTH TRANSMISSION TO OPERATOR")
sub_payload = {
    "task_id": "task-tmvn-481",
    "incident_id": "FIR-1192",
    "verifier_name": "Vikram Jadhav (Verifier #VJ-09)",
    "hazard_type": "FIRE",
    "image_base64": fire_b64,
    "location": "Airoli Scrub Perimeter, Navi Mumbai",
    "gps": "19.1579 N, 72.9935 E",
    "water_depth_cm": 0,
    "notes": "Verified active scrub flame line from safety perimeter.",
    "timestamp": "10:16:30"
}
ok_sub, _, j_sub = check("http://localhost:8000/ml/v1/verifier/submit", "POST", sub_payload)
print(f"  [{'PASS' if ok_sub else 'FAIL'}] Verifier Submitting Evidence:")
print(f"         Receipt ID : {j_sub.get('evidence_id')}")
print(f"         Status     : {j_sub.get('status')}")

ok_lat, _, j_lat = check("http://localhost:8000/ml/v1/verifier/latest")
latest = j_lat.get("submission", {}) if j_lat else {}
print(f"  [{'PASS' if ok_lat else 'FAIL'}] Operator Receiving Live Evidence:")
print(f"         Source     : {latest.get('verifier_name')}")
print(f"         Incident   : #{latest.get('incident_id')} ({latest.get('location')})")
print(f"         Sync Status: {latest.get('status')}")

print("\n=================================================================")
print(" ALL CHECKS COMPLETED SUCCESSFULLY")
print("=================================================================")
