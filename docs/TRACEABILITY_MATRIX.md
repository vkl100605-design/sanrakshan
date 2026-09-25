# Requirements Traceability Matrix

This document establishes bidirectional traceability between system requirements, architecture components, automated test evidence, and project review milestones.

| Req ID | Requirement Description | Component(s) | Verification Evidence | Review Gate |
|---|---|---|---|---|
| **FR-01** | Ingest and normalise source observations from heterogeneous sources (weather, FIRMS, CCTV, IoT, helpline, citizen reports) | `Ingestion Adapters`, `Incident Service`, `Kafka Topic: raw.observations` | Integration test `ObservationIngestionTest`, schema validation, mock event replay | Review 1 / Final |
| **FR-02** | Cluster observations into geospatial incidents and maintain confidence timeline with spatial-temporal proximity | `Incident Orchestrator`, `PostGIS Engine`, `PostgreSQL: incidents, observations` | Spatiotemporal clustering unit test, GiST index query latency benchmarks | Review 2 |
| **FR-03** | Create, rank, time out, and escalate verifier tasks exclusively in the ambiguity band ($0.35 \le P(\text{hazard}) \le 0.75$) | `TMVN Service`, `Neo4j Graph`, `Kafka Topic: verification.tasked` | Ambiguity band unit tests, SimPy scenario timeout & re-assignment validation | Review 2 |
| **FR-04** | Fuse verifier evidence and generate human-readable recommendation with uncertainty bounds | `ML Confidence Fusion Service`, `PyMC Bayesian Engine` | Calibration report (ECE, Brier score), credible interval coverage, feature attribution output | Review 2 / Final |
| **FR-05** | Record operator approve, adjust, or override actions with actor, reason, before/after values, and immutable audit log | `Decision Service`, `Audit Service`, `PostgreSQL: decisions, audit_events` | Idempotency replay test, RBAC access denial test, immutable audit trail verification | Review 2 / Final |
| **NFR-01** | High Availability: 99.5% staging service availability target | `Docker Compose / ECS Fargate`, health checks (`/actuator/health`, `/health`) | Container health check pass rate, automated restart policies | Final |
| **NFR-02** | Low Latency: P95 read API response time under 500 ms under baseline load | `API Gateway`, `PostGIS GiST indexing`, Spring Boot read replicas | JMeter / k6 load test results | Final |
| **NFR-03** | Traceability: Auditable structured logging with `correlationId` and immutable event audit logs | `CorrelationIdFilter`, SLF4J MDC, `audit_events` table | End-to-end trace verification from HTTP ingress to DB outbox and Kafka message headers | Review 1 / Review 2 |
| **NFR-04** | Safety Simulation Boundary: Prevention of automated or uncontrolled live dispatches | `Simulated Dispatch Service`, Strict Operator Approval Gate | Contract assertion: Zero external emergency dispatch API invocations | Review 1 / Review 2 / Final |
