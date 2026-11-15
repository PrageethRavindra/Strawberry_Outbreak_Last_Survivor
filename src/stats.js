const { db } = require('./db');

// Personal statistics for the menu screen, computed from the SQLite tables.
const statsQuery = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM runs WHERE user_id = ?1)                                 AS runsPlayed,
    (SELECT COUNT(*) FROM runs WHERE user_id = ?1 AND status = 'won')             AS wins,
    (SELECT COALESCE(MAX(score), 0) FROM scores WHERE user_id = ?1)               AS bestScore,
    (SELECT COALESCE(MAX(stage), 0) FROM runs WHERE user_id = ?1)                 AS furthestStage,
    (SELECT COUNT(*) FROM rescue_attempts a JOIN runs r ON r.id = a.run_id
       WHERE r.user_id = ?1)                                                      AS puzzlesAttempted,
    (SELECT COALESCE(SUM(a.correct), 0) FROM rescue_attempts a JOIN runs r ON r.id = a.run_id
       WHERE r.user_id = ?1)                                                      AS puzzlesSolved
`);

function forUser(userId) {
  return { ...statsQuery.get(userId) };
}

module.exports = { forUser };
