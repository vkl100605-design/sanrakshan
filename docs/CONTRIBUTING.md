# Contributing to Sanrakshan

Welcome to the **Sanrakshan** project. This guide outlines the development standards, branch protections, issue tracking, and code review criteria.

---

## 1. Operating Model & Branch Protections

Sanrakshan follows a trunk-based branch model with short-lived feature branches:

1. **Protected Branch (`main`)**:
   - Direct push to `main` is strictly disabled.
   - All merges require a Pull Request (PR) with at least 1 approving peer review.
   - All CI automated status checks must pass (backend tests, frontend tests, ML tests, SAST/security scan).
   - Branch must be up-to-date with `main` before merging (linear history / rebase or squash).
2. **Feature Branch Convention**:
   - `feat/<issue-id>-<short-description>` (e.g., `feat/TSK-108-spring-boot-skeleton`)
   - `fix/<issue-id>-<short-description>`
   - `docs/<issue-id>-<short-description>`
   - `chore/<issue-id>-<short-description>`

---

## 2. Commit Message Standards

We enforce Conventional Commits:
```
<type>(<scope>): <subject>

[optional body explaining motivation and changes]

[optional footer(s) such as Closes #123]
```

### Allowed Types:
- `feat`: A new user-facing or platform feature
- `fix`: A bug fix
- `docs`: Documentation updates only
- `style`: Formatting, missing semi-colons, no code logic changes
- `refactor`: Refactoring code without altering external behavior
- `test`: Adding or correcting tests
- `chore`: Build processes, auxiliary tools, dependency bumps

---

## 3. Definition of Done (DoD)

A task or pull request is complete only when:
- [ ] Acceptance criteria specified in the ticket are fulfilled.
- [ ] All unit and integration tests pass locally and in CI.
- [ ] Code follows formatting and linting rules (`mvn spotless:check` / `npm run lint` / `ruff check`).
- [ ] Zero secrets, API keys, or unapproved credentials committed.
- [ ] Structured logging with `correlationId` added for new endpoints or consumer events.
- [ ] API or schema changes are documented in OpenAPI / Flyway scripts.
- [ ] Rollback steps are known and documented.
- [ ] Pull request reviewed and approved by an accountable code owner.

---

## 4. Code Ownership Matrix

| Domain | Responsible Role | Key Repositories / Paths |
|---|---|---|
| **Backend & Ingestion** | Backend Lead | `/backend`, `/docs/openapi.yaml`, `/docs/KAFKA_CONVENTIONS.md` |
| **Frontend & UX** | Frontend Lead | `/frontend/operator-pwa`, `/frontend/verifier-pwa` |
| **ML & Decision Intelligence** | ML Lead | `/ml-services`, `/docs/adr/0005*` |
| **Infrastructure & Security** | DevOps / QA Lead | `/infra`, `/.github`, `/test` |

---

## 5. Security & Privacy Guardrails

1. **Zero-Secret Rule**: Never commit secrets, passwords, or cloud credentials. Use `infra/.env.example` as a template for local environment variables.
2. **Academic Simulation Boundary**: All responders and field dispatches are simulated. No live emergency numbers or production APIs are to be connected without explicit institutional authorization.
3. **Data Anonymization**: All geospatial reports, citizen numbers, and user records must be de-identified in test fixtures.
