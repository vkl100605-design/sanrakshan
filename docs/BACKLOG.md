# Sanrakshan Project Backlog (24-Week Master Plan)

## Project Overview
Sanrakshan is a human-in-the-loop disaster decision-support platform for flood and fire incidents. It aggregates signals from satellite, weather, CCTV, IoT, citizen reports, and emergency helplines to generate calibrated spatial confidence scores, trigger targeted verification tasks (TMVN) when uncertainty is high, and empower emergency operations centre (EOC) operators with explainable, audited decision support.

---

## Phase 1: Foundations (Weeks 1–4)
**Exit Gate**: Reproducible repo, local stack, and standards. A new contributor can clone the repository, run `docker compose up`, run mock events, inspect structured logs, and pass CI checks without manual database configuration.

### Week 1: Project Setup, Governance & Architecture
- [x] **TSK-101**: Initialize monorepo directory layout (`frontend/`, `backend/`, `ml-services/`, `infra/`, `docs/`, `test/`).
- [x] **TSK-102**: Author Core Architecture Decision Records (ADR-0001 to ADR-0006).
- [x] **TSK-103**: Define Contribution Guidelines, Git Workflow, Branch Protection Rules, and Issue/PR templates (`CONTRIBUTING.md`).
- [x] **TSK-104**: Define Requirements Traceability Matrix linking FR-01–FR-05 and NFRs to tests and review milestones.
- [x] **TSK-105**: Configure root repository settings, `.gitignore`, `.gitattributes`.

### Week 2: Infrastructure as Code & Service Skeletons
- [x] **TSK-106**: Orchestrate local multi-container development environment via Docker Compose (PostgreSQL 16 + PostGIS, Kafka in KRaft mode, Neo4j, MinIO, API Gateway).
- [x] **TSK-107**: Establish secretless environment template (`infra/.env.example`).
- [x] **TSK-108**: Scaffold Spring Boot backend application with Maven, Actuator health endpoints, and security filters.
- [x] **TSK-109**: Scaffold Python ML inference service with FastAPI, Uvicorn, health checks, and test runner.
- [x] **TSK-110**: Scaffold dual React PWAs (`operator-pwa` and `verifier-pwa`) with Vite, modern CSS styling, and build pipelines.

### Week 3: Database Migrations, API Contracts & Eventing
- [x] **TSK-111**: Author Flyway database migrations (`V1__init_extensions_and_tables.sql`) for PostGIS spatial tables, transactional outbox, and audit logs.
- [x] **TSK-112**: Create OpenAPI 3.0.3 specification (`docs/openapi.yaml`) defining `/api/v1` contracts.
- [x] **TSK-113**: Implement Correlation ID tracing filter (`X-Correlation-ID`) across backend and ML service boundaries.
- [x] **TSK-114**: Define Kafka topic naming conventions, serialization standards (CloudEvents JSON), and DLQ rules (`docs/KAFKA_CONVENTIONS.md`).
- [x] **TSK-115**: Implement synthetic mock-source event generator (`test/mock-source-generator/generate_mock_events.py`).

### Week 4: CI/CD Automation, Security Scans & Staging Baseline
- [x] **TSK-116**: Implement GitHub Actions matrix CI workflow (`.github/workflows/ci.yml`) covering backend, frontend, and ML service builds and tests.
- [x] **TSK-117**: Integrate SAST, secret leak prevention, and dependency vulnerability scans.
- [x] **TSK-118**: Document quickstart walkthrough and acceptance verification procedure (`README.md`).

---

## Phase 2: Core Platform & Systems of Record (Weeks 5–8)
**Exit Gate**: Audited incident lifecycle passes automated integration suite with role enforcement and zero data loss.
- [x] **Week 5**: PostGIS incident/observation/confidence tables, spatial GiST indexing, Neo4j verifier graph relations.
- [x] **Week 6**: Kafka transactional outbox publisher (`OutboxService`), idempotent consumer (`IdempotencyService`), CloudEvents envelopes.
- [x] **Week 7**: OAuth2/JWT token issuance and validation, role matrix (Operator, Verifier, Admin, Responder), immutable audit events (`AuditService`), S3 presigned upload policy.
- [x] **Week 8**: Full integration test suite (`IncidentLifecycleIntegrationTest`), duplicate replay tests, and RBAC denial gate.

---

## Phase 3: User Experience & PWAs (Weeks 9–12)
**Exit Gate**: End-to-end task, evidence capture, confidence display, and operator decision flow demonstrated on desktop and mobile.
- [x] **Week 9**: Integrated Disaster Command Center dashboard matching reference design with dark mode, tactical map, and live digital clock.
- [x] **Week 10**: Selected incident inspector, 87% confidence gauge, stacked signal contribution bar, and approve/adjust/override modal with mandatory audit justification.
- [x] **Week 11**: Verifier mobile PWA task invitation, safety protocol consent screen, GPS coordinate lock, camera evidence intake, water depth slider, and offline storage queue.
- [x] **Week 12**: Real-time events stream drawer, nearby verifiers tracker, live telemetry feeds, responsive/accessibility testing.

---

## Phase 4: Machine Learning Intelligence (Weeks 13–16)
**Exit Gate**: Reproducible evaluation and model cards; calibrated Bayesian fusion outperforms baseline.
- **Week 13**: Dataset intake manifests, spatial split pipeline (by event/region to prevent leakage).
- **Week 14**: YOLOv8-S vs RT-DETR fire/smoke model training; U-Net vs DeepLabV3+ flood segmentation.
- **Week 15**: DistilBERT NLP severity triage; baseline calibrated XGBoost fusion pipeline.
- **Week 16**: PyMC Bayesian confidence fusion model, credible interval estimation, drift detection metrics.

---

## Phase 5: TMVN, Simulation & Explainability (Weeks 17–20)
**Exit Gate**: Interactive simulation demonstrating ambiguous-case detection, verifier routing, evidence fusion, and operator review.
- **Week 17**: OSMnx/NetworkX routing engine, SimPy event simulator, verifier score ranking.
- **Week 18**: Task timeout, escalation, and conflict resolution rules.
- **Week 19**: Explainable recommendation generator, Shapley/signal contribution display, audit trails.
- **Week 20**: Operator override controls, simulated multi-agency dispatch planner (police, fire, ambulance).

---

## Phase 6: AWS Staging, Hardening & Final Evaluation (Weeks 21–24)
**Exit Gate**: Hardened staging pilot, load tests, security penetration drill, automated restore drill, and comprehensive academic review pack.
- **Week 21**: AWS Terraform/IaC configuration (VPC, ECS Fargate, RDS PostGIS, MSK Kafka, S3, Secrets Manager).
- **Week 22**: Observability dashboards (CloudWatch/Prometheus), SLO alerts, API rate limiting, point-in-time recovery drill.
- **Week 23**: Security audit, dependency remediation, chaos testing, cost analysis dashboard.
- **Week 24**: Academic pilot scenarios, evaluation metrics compilation, user guides, final demonstration package.
