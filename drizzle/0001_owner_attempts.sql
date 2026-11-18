CREATE TABLE owner_attempts (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  minute INTEGER NOT NULL,
  count INTEGER NOT NULL
);
