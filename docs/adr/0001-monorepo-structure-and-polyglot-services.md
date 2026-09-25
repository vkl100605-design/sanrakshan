# ADR-0001: Monorepo Structure and Polyglot Service Architecture

## Status
Accepted

## Context
Sanrakshan integrates multiple distinct subsystems:
1. Core disaster orchestration, incident lifecycle, and relational transactional state.
2. Machine learning inference pipelines for computer vision (fire/smoke object detection, flood water segmentation), NLP triage, and Bayesian confidence fusion.
3. Dual user experience PWAs (Operator Command Dashboard for desktop control rooms and Verifier Portal for mobile field volunteers).
4. Local and cloud infrastructure configurations (Docker Compose, Terraform/IaC, CI workflows).

We evaluated separating these into multi-repositories versus establishing a unified monorepo.

## Decision
We adopt a unified **Monorepo** layout structured by architectural domain:
- `backend/`: Java 21+ / Spring Boot 3 microservices and orchestration engine.
- `ml-services/`: Python 3.11+ / FastAPI services for ML model inference and Bayesian fusion.
- `frontend/`:
  - `operator-pwa/`: React + Vite single-page progressive web application for emergency command rooms.
  - `verifier-pwa/`: React + Vite lightweight, mobile-first progressive web application for field verifiers.
- `infra/`: Docker Compose configurations, database initialization scripts, and IaC templates.
- `docs/`: Architecture decision records, API contracts, Kafka schemas, and project backlog.
- `test/`: End-to-end integration tests, synthetic data generators, and replay suites.

## Consequences
### Positive
- Single point of truth for schemas, API specs, and versioning.
- Atomic commits across contracts, backend implementations, and frontend interfaces.
- Simplified local development setup with one-command Docker Compose orchestration.
- Uniform CI/CD automation and dependency management.

### Negative
- Requires selective CI matrix jobs so a frontend change does not unnecessarily trigger ML model builds.
- Tooling requirements across Java, Python, and Node runtimes on developer machines.
