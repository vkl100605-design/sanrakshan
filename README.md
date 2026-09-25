# Sanrakshan (संरक्षण)
### Human-in-the-Loop Disaster Decision-Support Platform for Flood and Fire Incidents

[![Sanrakshan CI](https://github.com/sanrakshan/sanrakshan/actions/workflows/ci.yml/badge.svg)](https://github.com/sanrakshan/sanrakshan/actions/workflows/ci.yml)
[![OpenAPI 3.0.3](https://img.shields.io/badge/OpenAPI-3.0.3-brightgreen.svg)](docs/openapi.yaml)
[![License](https://img.shields.io/badge/License-Academic%20Simulation%20Boundary-blue.svg)](docs/CONTRIBUTING.md)

---

## 1. Executive Overview

Sanrakshan is an open-source, resilient, human-in-the-loop decision-support platform designed for emergency operations centres (EOC) handling flood and wildfire emergencies. It ingests heterogeneous signals (thermal satellite feeds, weather radar, IoT water sensors, CCTV computer vision detections, and citizen helplines), performs calibrated Bayesian confidence fusion with uncertainty quantification, automatically tasks a Trusted Mobile Verification Network (TMVN) when uncertainty is high, and empowers human operators with explainable AI signal attributions before executing simulated emergency dispatches.

> **CRITICAL SIMULATION BOUNDARY**: Sanrakshan is designed for academic demonstration and simulation. It enforces strict operator approvals and never directly triggers live emergency services (police, fire, medical) autonomously.

---

## 2. Monorepo Architecture

```
sanrakshan/
├── .github/                 # CI/CD Workflows, SAST Scans, PR & Issue Templates
│   └── workflows/ci.yml     # Multi-project matrix CI pipeline
├── backend/                 # Core Incident Service & Systems of Record (Spring Boot 3 + Java 21)
│   ├── src/main/java/...    # Correlation IDs, OWASP filters, REST endpoints, RFC 7807 handlers
│   └── src/main/resources/  # Flyway V1 PostGIS database migrations & configs
├── ml-services/             # AI Inference & Bayesian Fusion (Python 3.11 + FastAPI)
│   ├── src/fusion/          # Bayesian beta-binomial fusion with credible intervals
│   └── src/perception/      # Calibrated YOLOv8-S fire & U-Net flood stubs
├── frontend/
│   ├── operator-pwa/        # Desktop Emergency Operations Command Room Dashboard (React + Vite)
│   └── verifier-pwa/        # Mobile-First TMVN Field Verifier Progressive Web App (React + Vite)
├── infra/                   # Infrastructure as Code & Orchestration
│   ├── docker-compose.yml   # PostgreSQL/PostGIS, Kafka KRaft, Neo4j, MinIO, Backend, ML, PWAs
│   ├── .env.example         # Template with secret variable names only
│   └── init-scripts/        # PostGIS extension initialization & Neo4j graph schemas
├── docs/                    # Architecture Governance & Contracts
│   ├── adr/                 # Architecture Decision Records (ADR-0001 through ADR-0006)
│   ├── openapi.yaml         # Complete OpenAPI 3.0.3 REST specification
│   ├── BACKLOG.md           # 24-week master implementation roadmap
│   ├── CONTRIBUTING.md      # Trunk-based workflow, branch rules & DoD checklist
│   ├── TRACEABILITY_MATRIX.md# FR-01–FR-05 & NFR compliance mapping
│   └── KAFKA_CONVENTIONS.md # CloudEvents envelopes, topic catalogs & DLQ semantics
└── test/
    └── mock-source-generator/ # Synthetic multi-hazard event generator for local testing
```

---

## 3. Quickstart: Running the Stack Locally

### Prerequisites
- **Docker Engine & Docker Compose** (v24+)
- **JDK 21+** and **Apache Maven 3.9+** (for backend testing)
- **Node.js 20+** and **npm** (for frontend PWAs)
- **Python 3.11+** (for ML service and synthetic mock generator)

### Option A: Complete Local Multi-Container Stack (One Command)
```bash
# 1. Copy the secretless environment template
cp infra/.env.example infra/.env

# 2. Launch all services via Docker Compose
docker compose -f infra/docker-compose.yml up --build -d

# 3. Verify container health status
docker compose -f infra/docker-compose.yml ps
```

| Service | Local URL / Port | Purpose |
|---|---|---|
| **Operator Command Dashboard** | `http://localhost:3000` | Desktop EOC real-time map, queue & approval modal |
| **Verifier Mobile Portal** | `http://localhost:3001` | Field volunteer task acceptance & photo upload |
| **Backend REST API** | `http://localhost:8080/api/v1` | Core incident system of record |
| **Backend Swagger UI** | `http://localhost:8080/swagger-ui.html` | Interactive API documentation |
| **Backend Health Check** | `http://localhost:8080/api/v1/health` | Comprehensive dependency diagnostic probe |
| **ML Inference Service** | `http://localhost:8001` | Vision scoring & Bayesian fusion |
| **MinIO Console** | `http://localhost:9001` | S3-compatible evidence storage browser |
| **Neo4j Browser** | `http://localhost:7474` | TMVN graph database explorer |
| **Apache Kafka** | `localhost:9092` | KRaft durable event broker |

---

### Option B: Running Individual Services Natively

#### 1. Backend Service (Spring Boot)
```bash
cd backend
mvn clean test
mvn spring-boot:run
```

#### 2. ML & Bayesian Fusion Service (Python)
```bash
cd ml-services
python -m venv venv
# On Windows: .\venv\Scripts\activate | On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m pytest
python -m uvicorn src.main:app --port 8001 --reload
```

#### 3. Operator Command Dashboard (React PWA)
```bash
cd frontend/operator-pwa
npm install
npm run dev
```

#### 4. Verifier Mobile Portal (React PWA)
```bash
cd frontend/verifier-pwa
npm install
npm run dev
```

---

## 4. Generating Synthetic Mock Disaster Events

The repository includes an automated synthetic disaster event generator that simulates heterogeneous sensor feeds, tests distributed `X-Correlation-ID` tracing, and verifies idempotency:

```bash
# Dry run: Inspect CloudEvents v1.0 JSON payloads
python test/mock-source-generator/generate_mock_events.py --dry-run

# Replay against live backend API with idempotency testing
python test/mock-source-generator/generate_mock_events.py --target-url http://localhost:8080/api/v1 --test-idempotency
```

### Pre-Configured Disaster Scenarios
1. **Severe Urban Basin Inundation**: Sensor flood depth 55cm ($P=0.82$) $\rightarrow$ Routes directly to Operator Review.
2. **Ambiguous Thermal Hotspot**: Satellite FIRMS heat plume ($P=0.54$) $\rightarrow$ Within ambiguity band ($0.35 \le P \le 0.75$), triggers TMVN field verifier task.
3. **Low Confidence Anomaly**: Uncorroborated single citizen report ($P=0.22$) $\rightarrow$ Background monitoring only.

---

## 5. Phase 1 Exit Gate Verification Checklist

- [x] **Monorepo Structure**: Fully initialized with `frontend`, `backend`, `ml-services`, `infra`, `docs`, `test`, and `.github`.
- [x] **Docker Compose Stack**: PostgreSQL/PostGIS 16, Kafka KRaft, Neo4j, MinIO S3, Backend, ML, and dual PWAs.
- [x] **Secret Safety**: `infra/.env.example` contains variable names only, zero hardcoded credentials committed.
- [x] **Flyway Database Migrations**: PostGIS schemas, transactional outbox, and immutable audit logs (`V1__init_extensions_and_tables.sql`).
- [x] **OpenAPI Contracts**: Full OpenAPI 3.0.3 specification (`docs/openapi.yaml`) covering all Phase 1 endpoints.
- [x] **Distributed Tracing**: `X-Correlation-ID` generation, propagation, and MDC structured logging in backend & ML services.
- [x] **Bayesian Confidence Fusion**: Beta-binomial fusion engine with credible interval calculation and ambiguity band policy.
- [x] **Dual Modern PWAs**: Desktop Operator Command Room Dashboard and Mobile TMVN Field Verifier Portal built with React and modern responsive aesthetics.
- [x] **CI/CD Quality Gate**: `.github/workflows/ci.yml` matrix pipeline running automated backend unit tests, Python lint/pytest, React production builds, and SAST secret scan.
- [x] **Acceptance Verified**: Zero-dependency mock generator runs cleanly, backend builds and passes all tests, frontends compile to production bundles.
