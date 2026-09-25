# ADR-0003: Polyglot Persistence (PostgreSQL/PostGIS, Neo4j, MinIO)

## Status
Accepted

## Context
Disaster management involves distinct data structures and query patterns:
1. Geospatial indexing, transactions, ACID consistency, and historical audit logs.
2. Network topology, volunteer verifier proximity routing, and multi-hop spatial dependency graphs.
3. High-volume unstructured evidence media (incident photos, UAV video feeds, satellite tiles).

A single database model cannot satisfy all these requirements effectively without severe tradeoffs.

## Decision
We implement a polyglot persistence architecture:
1. **PostgreSQL 16 with PostGIS Extension**:
   - Primary operational system of record.
   - Stores users, roles, incidents, observations, confidence snapshots, operator decisions, and immutable audit logs.
   - Uses PostGIS spatial geometries (`GEOMETRY(Point, 4326)`) and GiST indexes for sub-millisecond bounding box and nearest-neighbor clustering.
2. **Neo4j Community Graph Database**:
   - Manages verifier-to-geographic-cell, verifier-to-task, and infrastructure dependency relationships.
   - Provides efficient traversal for the Trusted Mobile Verification Network (TMVN) tasking algorithm.
3. **MinIO (S3-compatible Object Storage)**:
   - Stores encrypted multimedia evidence files under structured paths: `evidence/{incidentId}/{taskId}/{sha256}`.
   - Provides time-limited presigned upload and download URLs so media traffic bypasses application server memory.

## Consequences
### Positive
- Optimal tool for each distinct storage workload.
- PostGIS provides battle-tested spatial queries with industry standards.
- MinIO ensures 100% AWS S3 API compatibility for transparent deployment to AWS S3 in staging/production.

### Negative
- Local multi-service resource footprint is higher.
- Requires distinct migration and backup strategies for relational, graph, and blob storage.
