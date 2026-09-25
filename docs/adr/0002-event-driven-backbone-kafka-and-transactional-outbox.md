# ADR-0002: Event-Driven Backbone with Apache Kafka and Transactional Outbox

## Status
Accepted

## Context
Emergency management requires high-throughput, non-blocking ingestion of heterogeneous signals (satellite alerts, weather feeds, citizen SMS/helpline transcripts, IoT flood gauge telemetry). Direct synchronous HTTP calls between microservices would introduce cascading latency and tight coupling. Furthermore, losing an incoming disaster signal or double-dispatching due to uncoordinated retries is unacceptable.

## Decision
1. We utilize **Apache Kafka** (KRaft mode for lightweight local dev without ZooKeeper dependencies) as the durable event backbone.
2. We establish the **Transactional Outbox Pattern** in relational databases (PostgreSQL):
   - Whenever an incident or observation state is modified, an outbox record is inserted in the *same local database transaction*.
   - A dedicated asynchronous outbox worker publishes pending messages to Kafka and marks them published.
3. Every Kafka message adheres to a standard CloudEvents-compatible JSON envelope including `eventId`, `eventType`, `correlationId`, `causationId`, `timestamp`, and `payload`.
4. Idempotent consumers use unique message identifiers (`eventId`) recorded in an idempotency table to prevent duplicate side-effects.
5. Irrecoverable failures are routed to dedicated Dead-Letter Queues (DLQ, e.g. `<topic>.dlq`) with exponential backoff retries.

## Consequences
### Positive
- Guaranteed at-least-once delivery with zero message loss across service crashes.
- High ingestion throughput without tying up client connections.
- Clean decoupling between real-time data ingestion, ML scoring, and UI notifications.

### Negative
- Eventual consistency requires UI polling or WebSocket updates.
- Operational complexity of running and monitoring Kafka clusters and consumer offsets.
