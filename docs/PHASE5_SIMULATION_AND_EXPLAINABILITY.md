# Sanrakshan Phase 5: TMVN Simulation, Explainability & Multi-Agency Dispatch Planning

This document specifies the technical architecture, mathematical models, discrete-event simulation mechanics, and explainability frameworks implemented for **Phase 5 (Weeks 17–20)** of **Sanrakshan (National Disaster Decision-Support Platform)**.

---

## 1. Executive Summary & Exit Gate Fulfillment

Phase 5 delivers the human-in-the-loop operational simulation core, fulfilling the project exit gate:
> **Exit Gate Assertion**: *Interactive simulation demonstrating ambiguous-case detection, verifier routing, evidence fusion, explainable attribution, and human operator review with multi-agency simulated dispatch.*

### Key Deliverables Completed:
1. **Week 17**: NetworkX road network graph for Mumbai-Thane disaster corridors, Dijkstra/A* routing with dynamic hazard closures, multi-criteria verifier ranking engine ($S_v$), and SimPy discrete-event core.
2. **Week 18**: Dynamic task Time-To-Live (TTL), multi-tier verifier escalation policy (Tier-1 $\rightarrow$ Tier-2 $\rightarrow$ Tier-3 Autonomous Drone/Municipal Warden), and multi-verifier conflicting evidence resolution.
3. **Week 19**: Explainable AI (XAI) recommendation generator, Shapley-style additive signal attributions ($\Delta_i$), credible uncertainty interval displays, and cryptographic SHA-256 audit provenance chains.
4. **Week 20**: Operator override controls (Approve, Adjust, Override), simulated multi-agency dispatch planner (NDRF Inflatable Boats, High-Capacity Submersible Pumps, Mobile ICUs, Traffic Escorts, Water Tenders), and interactive Operator PWA **Simulation Studio**.

---

## 2. Road Network Graph & TMVN Routing Engine (Week 17)

### 2.1 Mumbai-Thane Disaster Corridor Network
Implemented in `ml-services/src/simulation/tmvn_graph.py`, the road network models key disaster junctions across the Mumbai Metropolitan Region (MMR):
- Strategic nodes: `MUMBRA_STATION`, `MUMBRA_BYPASS`, `RETIBUNDER_CIRCLE`, `THANE_STATION_EAST`, `MAJHIWADA_FLYOVER`, `KURLA_LBS_MARG`, `KURLA_SUBWAY`, `SION_CIRCLE`, `AIROLI_BRIDGE_TOLL`, `AIROLI_SECTOR_8`, `SHILPHATA_JUNCTION`, `KALYAN_APMC`, `DOMBIVLI_MIDC`, `BHIWANDI_BYPASS`.
- Edge attributes: `distance_meters`, `base_speed_kmh`, `travel_time_seconds`, `hazard_factor`, and `is_closed`.

### 2.2 Dynamic Hazard Impedances & Shortest-Path Routing
When roads become inundated by rising floodwater (e.g. Kurla Subway, Mumbra Creek Link) or blocked by wildfire smoke, the routing engine updates edge weights:
$$\text{Effective Weight} = \begin{cases} \infty & \text{if } \text{is\_closed} = \text{True} \\ t_{\text{nominal}} \times \text{hazard\_factor} & \text{if } \text{hazard\_factor} > 1.0 \\ t_{\text{nominal}} & \text{otherwise} \end{cases}$$

Shortest paths and turn-by-turn routes are computed via Dijkstra/A*, detecting necessary detours and generating real-time ETAs in minutes.

---

## 3. TMVN Verifier Scoring & Ranking Engine (Week 17)

Implemented in `ml-services/src/simulation/verifier_ranking.py`, verifiers in the active roster are scored and ranked for each incident using a multi-criteria utility function:

$$S_v = \alpha \cdot P_v + \beta \cdot R_v + \gamma \cdot \left(\frac{\text{Rating} - 3.0}{2.0}\right) + \delta \cdot \text{SpecBonus}$$

Where:
- **$P_v = \exp(-0.05 \times \text{ETA})$**: Route-aware proximity decay score ($\alpha = 0.40$).
- **$R_v \in [0.0, 1.0]$**: Historical verification accuracy & precision ($\beta = 0.30$).
- **Rating**: Standardized 5-star rating normalized to $[0.0, 1.0]$ ($\gamma = 0.15$).
- **$\text{SpecBonus}$**: Hazard equipment suitability bonus (e.g., waterproof boots & motorcycle for Flood; gas mask & thermal IR dongle for Fire) ($\delta = 0.15$).

### Candidate Tiers:
- **Rank 1**: `PRIMARY_RECOMMENDED` (Target of Tier-1 initial invitation).
- **Ranks 2–3**: `SECONDARY_BACKUP` (Standby candidates for Tier-2 escalation).
- **Ranks 4+**: `RESERVE` (Local volunteer pool).

---

## 4. Task Timeout, Escalation Engine & Conflict Resolution (Week 18)

Implemented in `ml-services/src/simulation/escalation_engine.py`:

### 4.1 Dynamic Task Time-to-Live (TTL)
TTL scales dynamically according to hazard propagation dynamics:
- **Wildfire / Fast Brush Fire**: $TTL = 480\text{ s}$ (8 min).
- **Urban Flash Flood / Underpass Inundation**: $TTL = 720\text{ s}$ (12 min).
- **Landslide / Slope Instability**: $TTL = 900\text{ s}$ (15 min).
- **General Anomaly**: $TTL = 600\text{ s}$ (10 min).

### 4.2 Automated Escalation Policy
- **Tier 1 (Primary Verifier)**: Sent immediate push invitation with a 120-second acceptance window.
- **Tier 2 (Secondary Backup Verifier)**: If Tier-1 verifier does not respond within 120s or declines, task automatically escalates to the Tier-2 candidate.
- **Tier 3 (Autonomous Drone / Municipal Warden)**: If all registered verifiers fail to respond or travel time exceeds TTL, task escalates to an autonomous drone stream request and municipal field warden alert.

### 4.3 Multi-Verifier Conflict Resolution
When multiple verifiers submit divergent ground reports for the same incident, consensus is determined by:
$$P_{\text{consensus}} = \frac{\sum_i w_i \cdot \mathbb{I}(\text{hazard}_i)}{\sum_i w_i}$$
Where individual weights $w_i = R_{v,i} \times G_i$, and $G_i$ represents GPS geofence integrity:
$$G_i = \begin{cases} 1.0 & \text{if EXIF GPS is valid and } d_i \le 100\text{ m} \\ 0.5 & \text{if } 100\text{ m} < d_i \le 150\text{ m} \\ 0.3 & \text{if EXIF GPS is missing or } d_i > 150\text{ m} \end{cases}$$

---

## 5. Explainable AI (XAI) & Audit Provenance (Week 19)

Implemented in `ml-services/src/simulation/xai_explainer.py`:

### 5.1 Shapley-Style Additive Signal Attributions
Computes exact impact of each heterogeneous sensor and verifier observation:
$$\Delta_i = w_i \cdot (s_i - P_{\text{prior}})$$
$$\phi_i = \frac{|\Delta_i|}{\sum_j |\Delta_j|} \times 100\%$$

Each signal is attributed a percentage share, directionality (corroborating vs refuting), and translated into clear plain-English summaries.

### 5.2 Cryptographic Audit Provenance
Every decision and Bayesian transition is sealed with an immutable SHA-256 provenance hash:
$$\text{Hash} = \text{SHA-256}\left(\text{IncidentID} \parallel P_{\text{posterior}} \parallel CI_{90} \parallel \text{Signals} \parallel \text{TaskID} \parallel \text{Timestamp}\right)$$

---

## 6. Simulated Multi-Agency Dispatch Planner (Week 20)

Implemented in `ml-services/src/simulation/dispatch_planner.py`:

### 6.1 Multi-Agency Asset Staging Packages
- **Flood Inundation**:
  - NDRF / SDRF: Inflatable Motorized Rescue Boats (Gemini 8-man) with life jackets and 40HP outboard motors.
  - Municipal Drainage: High-capacity trailer-mounted submersible pumps (500 HP / 2000 LPM) with 400m discharge hoses.
  - EMS / Ambulance: Advanced Life Support 4x4 high-clearance waterborne ambulances with hypothermia warming units.
  - Traffic Police: Flood diversion units with waterproof barricades and strobe cones.
  - Civil Defense: Assigned transit shelters (e.g. Mumbra Municipal Relief Camp).
- **Wildfire / Scrub Fire**:
  - Fire Services: Multi-hazard water tenders (4500L) and heavy foam crash tenders (2000L AFFF).
  - EMS / Trauma: Specialized burn & smoke inhalation ICU units.
  - Traffic Police: Green corridor clearance units.

### 6.2 Strict Academic Simulation Boundary
All dispatches are staged in simulation telemetry only. Digital signatures and operator justification audits are strictly enforced before simulated mobilization.

---

## 7. Interactive Simulation Studio UI (`frontend/operator-pwa`)

The **Simulation Studio** modal (`frontend/operator-pwa/src/components/SimulationStudioModal.jsx`) is directly accessible from the command dashboard via the header button `[⚡ Simulation Studio (Phase 5)]` or the sidebar:
- **Scenario Selector**: Switch between Flash Flood with Escalation, Airoli Scrub Fire, and Baseline Rapid Verification.
- **Playback Controls**: Play, Pause, Step Next, Step Prev, Reset, and Jump to End. Speed options: `1x`, `2x`, `5x`.
- **Discrete Event Chronology**: Live scrolling event stream with color-coded event badges and detailed JSON parameter inspection.
- **Bayesian Confidence & Ambiguity Band**: Real-time gauge tracking posterior shift and ambiguity threshold crossings.
- **TMVN Active Verifier Tracker**: Route path nodes, travel ETA, distance, and geotagged evidence intake.
- **XAI Shapley Attribution Bars**: Relative percentage contribution share per signal.
- **Simulated Multi-Agency Dispatch Package**: Staged emergency apparatus, personnel counts, and signed operator audit confirmation.

---

## 8. Verification & Test Evidence

### 8.1 Automated Test Results
Run the Phase 5 test suite:
```powershell
cd ml-services
python -m pytest tests/test_simulation.py -v
```
**Results**:
- `test_road_network_routing`: PASSED
- `test_verifier_ranking`: PASSED
- `test_task_escalation_engine`: PASSED
- `test_conflict_resolution`: PASSED
- `test_xai_explainer`: PASSED
- `test_multi_agency_dispatch_planner`: PASSED
- `test_simpy_simulation_scenarios`: PASSED
**100% Pass Rate (7/7 tests passed in 0.66s)**.

### 8.2 Frontend Production Bundle
```powershell
cd frontend/operator-pwa
npm run build
```
Built production bundle in 1.17s with zero errors.

### 8.3 Backend Integration Suite
```powershell
cd backend
mvn clean test
```
**100% Pass Rate (11/11 tests passed in 13.085s)**.
