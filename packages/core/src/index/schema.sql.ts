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
  raw_json VARCHAR
)`;

export const DROP_LOGS_TABLE = `DROP TABLE IF EXISTS logs`;
