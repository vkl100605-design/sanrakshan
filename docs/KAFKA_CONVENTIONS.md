# Kafka Messaging Conventions and Topic Catalog

This document establishes the event-driven architecture standards, naming conventions, CloudEvents-compliant message envelopes, and dead-letter queue (DLQ) retry semantics for Sanrakshan.

---

## 1. Topic Naming Convention

All topics follow the hierarchical naming standard:
```
sanrakshan.<domain>.<entity>.<action-or-lifecycle>
```

For environments:
- Local / CI: Prefix `local.` or standard topic name.
- Staging: `staging.sanrakshan...`
- Production: `prod.sanrakshan...`

### Topic Catalog

| Topic Name | Purpose | Key Strategy | Partition Count | Retention |
|---|---|---|---|---|
| `sanrakshan.ingestion.observation.raw` | Ingestion of raw normalized observations from adapters | `sourceId` | 3 | 7 days |
| `sanrakshan.incident.lifecycle.updated` | Incident state transitions (CREATED, VERIFYING, REVIEW_READY, RESOLVED) | `incidentId` | 3 | 30 days |
| `sanrakshan.fusion.confidence.calculated` | Bayesian fusion confidence scores and credible intervals | `incidentId` | 3 | 30 days |
| `sanrakshan.tmvn.task.created` | New verification task generated for ambiguous incident | `taskId` | 3 | 7 days |
| `sanrakshan.tmvn.task.completed` | Verifier evidence submitted and validated | `taskId` | 3 | 30 days |
| `sanrakshan.decision.action.recorded` | Operator decision (APPROVE, ADJUST, OVERRIDE) | `incidentId` | 3 | 365 days |
| `sanrakshan.dispatch.simulated.command` | Simulated emergency unit dispatch command | `dispatchId` | 3 | 365 days |
| `*.dlq` | Dead-Letter Queues for failed message processing | Original Key | 1 | 90 days |

---

## 2. Standard CloudEvents Envelope Schema

All Kafka messages use UTF-8 JSON encoding adhering to the CloudEvents v1.0 specification:

```json
{
  "specversion": "1.0",
  "id": "urn:uuid:6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "source": "sanrakshan.backend.incident-service",
  "type": "sanrakshan.incident.lifecycle.updated",
  "time": "2026-09-25T14:15:30Z",
  "datacontenttype": "application/json",
  "correlationid": "corr-8f92b7c4-001a",
  "causationid": "evt-7e12a4f1-229b",
  "data": {
    "incidentId": "inc-2026-09-0012",
    "hazardType": "FLOOD",
    "state": "VERIFYING",
    "confidence": 0.58,
    "credibleInterval": [0.42, 0.74],
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "occurredAt": "2026-09-25T14:15:00Z"
  }
}
```

---

## 3. Idempotency & Retry Semantics

1. **Transactional Outbox**:
   - Upstream services write their operational changes and Kafka event payloads inside a single ACID database transaction.
   - The outbox publisher polls or streams uncommitted rows, guaranteeing at-least-once publishing.
2. **Consumer Idempotency**:
   - Every consumer checks an `idempotent_event_receipts` table or Redis cache before processing `event.id`.
   - If `event.id` has already been executed, processing is skipped cleanly.
3. **Dead-Letter Queue (DLQ)**:
   - On transient failure (network timeout, temporary service downtime), the consumer retries up to 3 times with exponential backoff (1s, 2s, 4s).
   - On persistent serialization error or business validation failure, the poison pill message is pushed to `<topic>.dlq` with detailed exception metadata in the Kafka message headers:
     - `x-error-message`
     - `x-error-stacktrace`
     - `x-failed-at`
     - `x-original-topic`
