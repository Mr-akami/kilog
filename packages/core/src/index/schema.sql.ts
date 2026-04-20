export const CREATE_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS logs (
  id VARCHAR PRIMARY KEY,
  timestamp VARCHAR NOT NULL,
  runtime VARCHAR NOT NULL,
  session VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  level VARCHAR,
  message VARCHAR,
  name VARCHAR,
  stack VARCHAR,
  method VARCHAR,
  url VARCHAR,
  normalized_path VARCHAR,
  status INTEGER,
  duration DOUBLE,
  size INTEGER,
  failed BOOLEAN,
  error_message VARCHAR,
  raw_json VARCHAR,
  project VARCHAR
)`;

export const DROP_LOGS_TABLE = `DROP TABLE IF EXISTS logs`;

// Migration for DBs created before `project` was added.
export const ADD_LOGS_PROJECT_COLUMN = `ALTER TABLE logs ADD COLUMN IF NOT EXISTS project VARCHAR`;

export const CREATE_SOURCES_TABLE = `
CREATE TABLE IF NOT EXISTS sources (
  abs_path VARCHAR PRIMARY KEY,
  last_offset BIGINT NOT NULL DEFAULT 0,
  last_mtime VARCHAR,
  project VARCHAR
)`;

export const DROP_SOURCES_TABLE = `DROP TABLE IF EXISTS sources`;

export const ADD_SOURCES_PROJECT_COLUMN = `ALTER TABLE sources ADD COLUMN IF NOT EXISTS project VARCHAR`;
