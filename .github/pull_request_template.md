## Description of Change
<!-- Provide a concise description of the functional change and its motivation -->

## Related Backlog / Issue
Closes #

## Domain & Ownership
- [ ] Backend & Ingestion (`/backend`, API contracts)
- [ ] ML & Bayesian Fusion (`/ml-services`)
- [ ] Operator PWA (`/frontend/operator-pwa`)
- [ ] Verifier PWA (`/frontend/verifier-pwa`)
- [ ] Infrastructure & CI (`/infra`, `/.github`)

## Definition of Done (DoD) Checklist
- [ ] Acceptance criteria in ticket verified.
- [ ] Unit & integration tests added and passing locally.
- [ ] Zero secrets, tokens, or credentials committed.
- [ ] Distributed `X-Correlation-ID` preserved in new endpoints/consumers.
- [ ] Changes adhere to OpenAPI specification (`docs/openapi.yaml`) and database migrations.
- [ ] Simulation boundary respected: No live emergency dispatch systems contacted.
- [ ] Rollback strategy identified.
