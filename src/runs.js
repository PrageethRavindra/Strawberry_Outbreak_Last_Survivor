const crypto = require('node:crypto');
const { db, transaction } = require('./db');
const MAX_REVIVES = 3;

const latestRun = db.prepare('SELECT * FROM runs WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1');
const saveRun = db.prepare(`
  INSERT INTO runs (id, user_id, stage, status, revives_used, puzzle_question, puzzle_solution, stage_started_at, score)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    stage = excluded.stage, status = excluded.status, revives_used = excluded.revives_used,
    puzzle_question = excluded.puzzle_question, puzzle_solution = excluded.puzzle_solution,
    stage_started_at = excluded.stage_started_at, score = excluded.score, updated_at = datetime('now')`);
const logAttempt = db.prepare(`INSERT INTO rescue_attempts (run_id, question, solution, answer, correct)
  VALUES (?, ?, ?, ?, ?)`);

function toRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    stage: row.stage,
    status: row.status,
    revivesUsed: row.revives_used,
    pendingPuzzle: row.puzzle_question === null ? null : { question: row.puzzle_question, solution: row.puzzle_solution },
    stageStartedAt: row.stage_started_at,
    score: row.score
  };
}

function get(userId) {
  return toRun(latestRun.get(userId));
}

// Reads the user's latest run, applies transform, and saves the result atomically.
function update(userId, transform) {
  return transaction(() => {
    const run = get(userId);
    const next = transform(run);
    if (next && next !== run) {
      saveRun.run(next.id, userId, next.stage, next.status, next.revivesUsed,
        next.pendingPuzzle ? next.pendingPuzzle.question : null,
        next.pendingPuzzle ? next.pendingPuzzle.solution : null,
        next.stageStartedAt, next.score);
    }
    return next;
  });
}

function start(userId) {
  return update(userId, existing => {
    if (existing && ['playing', 'awaiting_rescue'].includes(existing.status)) return existing;
    return { id: crypto.randomUUID(), stage: 1, status: 'playing',
      revivesUsed: 0, pendingPuzzle: null, stageStartedAt: Date.now(), score: 0 };
  });
}
function die(userId) {
  return update(userId, run => {
    if (!run || run.status !== 'playing') throw new Error('No active gameplay to lose');
    if (run.revivesUsed >= MAX_REVIVES) return { ...run, status: 'lost' };
    return { ...run, status: 'awaiting_rescue', pendingPuzzle: null };
  });
}
function pendingPuzzle(userId, question) {
  return update(userId, run => {
    if (!run || run.status !== 'awaiting_rescue') throw new Error('No pending rescue');
    if (run.pendingPuzzle) return run;
    return { ...run, pendingPuzzle: question };
  });
}
function answer(userId, value) {
  return update(userId, run => {
    if (!run || run.status !== 'awaiting_rescue' || !run.pendingPuzzle) throw new Error('No unanswered puzzle');
    if (!Number.isInteger(value) || value < 0 || value > 9) throw new Error('Answer must be a digit from 0 to 9');
    const { question, solution } = run.pendingPuzzle;
    const correct = value === solution;
    if (correct && run.revivesUsed >= MAX_REVIVES) throw new Error('No revivals remaining');
    logAttempt.run(run.id, question, solution, value, correct ? 1 : 0);
    if (!correct) return { ...run, status: 'lost', pendingPuzzle: null };
    return { ...run, status: 'playing', revivesUsed: run.revivesUsed + 1,
      pendingPuzzle: null };
  });
}
function completeStage(userId, stage) {
  return update(userId, run => {
    if (!run || run.status !== 'playing' || stage !== run.stage) throw new Error('Invalid stage completion');
    // Demonstration-level check: not proof that browser gameplay was genuine.
    if (Date.now() - run.stageStartedAt < 10000) throw new Error('Stage cannot finish this quickly');
    const score = run.score + stage * 100;
    if (stage === 3) return { ...run, score, status: 'won' };
    return { ...run, stage: stage + 1, stageStartedAt: Date.now(), score };
  });
}
function forfeit(userId) {
  return update(userId, run => {
    if (!run || !['playing', 'awaiting_rescue'].includes(run.status)) return run;
    return { ...run, status: 'lost', pendingPuzzle: null };
  });
}
function publicRun(run) {
  if (!run) return null;
  const { pendingPuzzle, ...safe } = run;
  return { ...safe, revivesRemaining: MAX_REVIVES - run.revivesUsed };
}
module.exports = { MAX_REVIVES, get, start, die, pendingPuzzle, answer, completeStage, forfeit, publicRun };
