-- =============================================================================
-- SANRAKSHAN DATABASE SCHEMA V1
-- Operational System of Record for Flood and Fire Decisions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & ROLES (RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO roles (id, name, description) VALUES
    ('ROLE_ADMIN', 'Administrator', 'Configures users, sources, policies, and retention'),
    ('ROLE_OPERATOR', 'EOC Operator', 'Reviews confidence explanations and executes approval/adjust/override actions'),
    ('ROLE_VERIFIER', 'Field Verifier', 'Receives local TMVN verification tasks and submits ground evidence'),
    ('ROLE_RESPONDER', 'Responder Viewer', 'Read-only access to approved simulated dispatches')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    phone_number VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(32) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 2. INCIDENTS (SYSTEM OF RECORD)
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    hazard_type VARCHAR(32) NOT NULL CHECK (hazard_type IN ('FLOOD', 'WILDFIRE', 'URBAN_FIRE', 'SMOKE')),
    state VARCHAR(32) NOT NULL CHECK (state IN ('REPORTED', 'VERIFYING', 'REVIEW_READY', 'APPROVED', 'ADJUSTED', 'OVERRIDDEN', 'REJECTED', 'RESOLVED')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    current_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ci_lower DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ci_upper DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    description TEXT,
    reported_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_state ON incidents(state);
CREATE INDEX IF NOT EXISTS idx_incidents_hazard_type ON incidents(hazard_type);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lon ON incidents(latitude, longitude);

-- 3. OBSERVATIONS (RAW NORMALIZED SIGNALS)
CREATE TABLE IF NOT EXISTS observations (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
    source_type VARCHAR(64) NOT NULL, -- e.g. SATELLITE_FIRMS, SATELLITE_SENTINEL, CCTV_CAMERA, WEATHER_STATION, CITIZEN_REPORT, HELPLINE
    source_identifier VARCHAR(128),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    raw_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    payload_json JSONB,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_incident_id ON observations(incident_id);
CREATE INDEX IF NOT EXISTS idx_observations_source_type ON observations(source_type);
CREATE INDEX IF NOT EXISTS idx_observations_observed_at ON observations(observed_at DESC);

-- 4. CONFIDENCE SNAPSHOTS (BAYESIAN FUSION EXPLANATION HISTORY)
CREATE TABLE IF NOT EXISTS confidence_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    posterior_probability DOUBLE PRECISION NOT NULL,
    ci_lower DOUBLE PRECISION NOT NULL,
    ci_upper DOUBLE PRECISION NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    top_signals JSONB,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conf_snapshots_incident_id ON confidence_snapshots(incident_id);

-- 5. VERIFICATION TASKS (TMVN)
CREATE TABLE IF NOT EXISTS verification_tasks (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    assigned_verifier_id VARCHAR(64) REFERENCES users(id),
    state VARCHAR(32) NOT NULL CHECK (state IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COMPLETED', 'ESCALATED')),
    target_latitude DOUBLE PRECISION NOT NULL,
    target_longitude DOUBLE PRECISION NOT NULL,
    instructions TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_tasks_incident_id ON verification_tasks(incident_id);
CREATE INDEX IF NOT EXISTS idx_tasks_verifier_id ON verification_tasks(assigned_verifier_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON verification_tasks(state);

-- 6. VERIFIER EVIDENCE
CREATE TABLE IF NOT EXISTS evidence (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL REFERENCES verification_tasks(id) ON DELETE CASCADE,
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    verifier_id VARCHAR(64) NOT NULL REFERENCES users(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    media_storage_key VARCHAR(255) NOT NULL,
    media_sha256 VARCHAR(64) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    observation_text TEXT,
    hazard_confirmed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_incident_id ON evidence(incident_id);

-- 7. OPERATOR DECISIONS
CREATE TABLE IF NOT EXISTS decisions (
    id VARCHAR(64) PRIMARY KEY,
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    operator_id VARCHAR(64) NOT NULL REFERENCES users(id),
    action VARCHAR(32) NOT NULL CHECK (action IN ('APPROVE', 'ADJUST', 'OVERRIDE', 'REJECT')),
    justification TEXT NOT NULL,
    adjusted_confidence DOUBLE PRECISION,
    dispatch_plan JSONB,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisions_incident_id ON decisions(incident_id);
CREATE INDEX IF NOT EXISTS idx_decisions_operator_id ON decisions(operator_id);

-- 8. SIMULATED DISPATCHES
CREATE TABLE IF NOT EXISTS dispatches (
    id VARCHAR(64) PRIMARY KEY,
    decision_id VARCHAR(64) NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    incident_id VARCHAR(64) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    unit_type VARCHAR(64) NOT NULL, -- e.g. FIRE_ENGINE_HEAVY, RESCUE_BOAT, AMBULANCE_ALS, FLOOD_PUMP
    assigned_unit_name VARCHAR(128) NOT NULL,
    target_area VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SIMULATED_DISPATCHED' CHECK (status IN ('SIMULATED_DISPATCHED', 'SIMULATED_EN_ROUTE', 'SIMULATED_ON_SCENE', 'SIMULATED_COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. TRANSACTIONAL OUTBOX (RELIABLE KAFKA PUBLISHING)
CREATE TABLE IF NOT EXISTS outbox_events (
    id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(created_at) WHERE published_at IS NULL;

-- 10. IMMUTABLE AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    state_before JSONB,
    state_after JSONB,
    ip_address VARCHAR(45),
    correlation_id VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp DESC);

-- 11. MODEL REGISTRY
CREATE TABLE IF NOT EXISTS model_versions (
    id VARCHAR(64) PRIMARY KEY,
    model_name VARCHAR(64) NOT NULL,
    version VARCHAR(32) NOT NULL,
    architecture VARCHAR(64) NOT NULL,
    metrics JSONB,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
