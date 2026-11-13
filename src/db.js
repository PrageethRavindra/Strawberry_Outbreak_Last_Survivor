const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// SQLite database (built into Node.js 22.5+). Location can be overridden with DB_FILE or DATA_DIR.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'strawberry.db');

if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS runs (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stage            INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 3),
    status           TEXT NOT NULL CHECK (status IN ('playing', 'awaiting_rescue', 'won', 'lost')),
    revives_used     INTEGER NOT NULL DEFAULT 0 CHECK (revives_used BETWEEN 0 AND 3),
    puzzle_question  TEXT,
    puzzle_solution  INTEGER CHECK (puzzle_solution BETWEEN 0 AND 9),
    stage_started_at INTEGER NOT NULL,
    score            INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id, created_at);

  CREATE TABLE IF NOT EXISTS rescue_attempts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id     TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    question   TEXT NOT NULL,
    solution   INTEGER NOT NULL,
    answer     INTEGER NOT NULL,
    correct    INTEGER NOT NULL CHECK (correct IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scores (
    run_id       TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username     TEXT NOT NULL,
    score        INTEGER NOT NULL,
    revives_used INTEGER NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
`);

// Runs fn inside a transaction; rolls back if it throws.
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// One-time import of data saved by the earlier JSON-file storage.
function migrateJsonFiles() {
  const readJson = name => {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
    catch { return null; }
  };
  if (DB_FILE === ':memory:') return; // throwaway databases (tests) start empty
  if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) return;
  const users = readJson('users.json');
  if (!Array.isArray(users) || users.length === 0) return;
  const runs = readJson('runs.json') || {};
  const scores = readJson('scores.json') || [];

  transaction(() => {
    const addUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password_hash) VALUES (?, ?, ?)');
    for (const u of users) addUser.run(u.id, u.username, u.passwordHash);

    const addRun = db.prepare(`INSERT OR IGNORE INTO runs (id, user_id, stage, status, revives_used, puzzle_question,
      puzzle_solution, stage_started_at, score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const [userId, r] of Object.entries(runs)) {
      if (!r || !users.some(u => u.id === userId)) continue;
      addRun.run(r.id, userId, r.stage, r.status, r.revivesUsed, r.pendingPuzzle ? r.pendingPuzzle.question : null,
        r.pendingPuzzle ? r.pendingPuzzle.solution : null, r.stageStartedAt, r.score || 0);
    }

    const addScore = db.prepare(`INSERT OR IGNORE INTO scores (run_id, user_id, username, score, revives_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`);
    for (const s of scores) {
      if (users.some(u => u.id === s.userId)) addScore.run(s.runId, s.userId, s.username, s.score, s.revivesUsed, s.createdAt);
    }
  });
  console.log(`Imported ${users.length} users from the old JSON files into SQLite.`);
}
migrateJsonFiles();

module.exports = { db, transaction, DB_FILE };
