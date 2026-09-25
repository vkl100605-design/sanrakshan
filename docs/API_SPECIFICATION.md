# Sanrakshan REST API Specification

## Base URL
`/api/v1`

## Standard Request Headers
- `Content-Type`: `application/json`
- `X-Correlation-ID`: String (UUID v4) tracing requests across services. If omitted, the gateway generates one.
- `Idempotency-Key`: Required for state-mutating requests (`POST`, `PUT`, `PATCH`) to prevent double execution.
- `Authorization`: `Bearer <jwt_token>`

## Error Response Format (RFC 7807)
All error responses return `application/problem+json`:
```json
{
  "type": "https://sanrakshan.gov.in/errors/resource-not-found",
  "title": "Incident Not Found",
  "status": 404,
  "detail": "No incident located with ID 'inc-404'",
  "instance": "/api/v1/incidents/inc-404",
  "correlationId": "corr-8f92b7c4-001a",
  "timestamp": "2026-09-25T14:15:30Z"
}
```

---

## Endpoint Catalog

### 1. Ingestion & Incidents
- `POST /incidents`: Create or merge a normalized incident from sensor/citizen/adapter signals.
- `GET /incidents`: List filtered incidents (hazardType, status, minConfidence, boundingBox).
- `GET /incidents/{id}`: Retrieve detailed incident record, observations, and current status.
- `GET /incidents/{id}/explanation`: Retrieve Bayesian fusion explanation, credible intervals, and top contributing signals.

### 2. Verification (TMVN)
- `GET /verification-tasks`: List assigned verification tasks for the authenticated verifier.
- `GET /verification-tasks/{id}`: Get task details, target coordinates, and instructions.
- `POST /verification-tasks/{id}/evidence`: Submit verifier field evidence (photo/video checksum, observation notes, GPS coordinates).

### 3. Decisions & Dispatches
- `POST /decisions`: Record operator review decision (`APPROVE`, `ADJUST`, `OVERRIDE`, `REJECT`).
- `GET /decisions/{incidentId}`: Retrieve operator decision history and justification for an incident.

### 4. Health & Diagnostics
- `GET /health`: Complete microservice dependency health check (PostgreSQL, Kafka, Neo4j, MinIO).
- `GET /actuator/health`: Standard Spring Boot health probe.
