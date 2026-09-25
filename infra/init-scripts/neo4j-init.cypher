// =============================================================================
// SANRAKSHAN NEO4J GRAPH INITIALIZATION SCRIPT (TMVN NETWORK)
// =============================================================================

CREATE CONSTRAINT verifier_id_unique IF NOT EXISTS
FOR (v:Verifier) REQUIRE v.id IS UNIQUE;

CREATE CONSTRAINT incident_id_unique IF NOT EXISTS
FOR (i:Incident) REQUIRE i.id IS UNIQUE;

CREATE CONSTRAINT task_id_unique IF NOT EXISTS
FOR (t:Task) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT region_code_unique IF NOT EXISTS
FOR (r:Region) REQUIRE r.code IS UNIQUE;

CREATE INDEX verifier_location_idx IF NOT EXISTS
FOR (v:Verifier) ON (v.latitude, v.longitude);
