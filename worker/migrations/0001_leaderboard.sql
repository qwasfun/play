PRAGMA foreign_keys = ON;
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  game_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('normal','daily')),
  challenge_date TEXT NOT NULL DEFAULT '',
  rule_version INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  result_json TEXT,
  receipt_json TEXT,
  submitted_at INTEGER
);
CREATE INDEX runs_expiry ON runs(expires_at);
CREATE TABLE best_entries (
  game_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  challenge_date TEXT NOT NULL,
  rule_version INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  run_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  steps INTEGER,
  rounds INTEGER,
  won INTEGER NOT NULL,
  sort_score INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(game_id,mode,challenge_date,rule_version,player_id)
);
CREATE INDEX leaderboard_order ON best_entries(game_id,mode,challenge_date,rule_version,sort_score,elapsed_ms,achieved_at,player_id);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
