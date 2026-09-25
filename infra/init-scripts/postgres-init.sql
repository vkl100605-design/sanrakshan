-- =============================================================================
-- SANRAKSHAN POSTGRESQL + POSTGIS INITIALIZATION SCRIPT
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO PUBLIC;

-- Performance settings for spatial queries
ALTER DATABASE sanrakshan_db SET timezone TO 'UTC';
