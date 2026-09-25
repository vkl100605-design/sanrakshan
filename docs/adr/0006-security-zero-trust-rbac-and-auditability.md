# ADR-0006: Security, Zero-Trust RBAC, and Auditability

## Status
Accepted

## Context
Emergency management systems handle sensitive location data, citizen helpline reports, and critical responder coordination. Unauthorized modifications, malicious uploads, or fabricated incident reports could trigger false emergency mobilizations or expose private citizen information.

## Decision
1. **Authentication & Authorization**:
   - Short-lived JWT access tokens and rotating refresh tokens via OAuth2/OIDC.
   - Strict Role-Based Access Control (RBAC):
     - `ADMIN`: Platform configuration, user management, source thresholds, retention policies.
     - `OPERATOR`: Access to real-time incident queue, confidence explanations, approve/adjust/override actions.
     - `VERIFIER`: Strictly restricted to assigned local verification tasks; cannot view global queue or other users' submissions.
     - `RESPONDER_VIEWER`: Read-only view of approved simulated dispatches and status.
2. **End-to-End Auditability**:
   - Immutable append-only `audit_events` log recorded for every decision, override, task assignment, and credential check.
   - Logs store actor ID, action type, entity identifier, previous state, new state, client IP address, and distributed `correlationId`.
3. **Defense-in-Depth for Evidence Uploads**:
   - Client uploads use short-lived presigned URLs directly to object storage.
   - Backend performs strict MIME-type validation, file signature magic byte checks, SHA-256 integrity validation, and size capping.
4. **OWASP Controls**:
   - Parameterized queries to eliminate SQL injection.
   - Strict HTTP response security headers (CSP, HSTS, X-Content-Type-Options, Referrer-Policy).
   - Rate limiting per IP and per user role.

## Consequences
### Positive
- Prevents privilege escalation and unauthorized data access.
- Provides complete forensic audit trails for post-disaster reviews and academic evaluations.
- Protects cloud storage bandwidth through presigned uploads.

### Negative
- Additional latency overhead from JWT validation and audit event logging.
- Requires rigorous secret rotation and key management in production.
