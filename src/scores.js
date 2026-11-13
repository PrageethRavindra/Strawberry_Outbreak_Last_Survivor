const { db } = require('./db');

const insertScore = db.prepare(`INSERT OR IGNORE INTO scores (run_id, user_id, username, score, revives_used, created_at)
  VALUES (?, ?, ?, ?, ?, ?)`);
const topScores = db.prepare(`SELECT username, score, revives_used AS revivesUsed, created_at AS createdAt
  FROM scores ORDER BY score DESC, created_at ASC LIMIT 10`);

function record(userId, username, run) {
  if (!run || run.status !== 'won') throw new Error('Only completed games appear on the leaderboard');
  // run_id is the primary key, so recording the same run twice is ignored.
  insertScore.run(run.id, userId, username, Math.max(0, run.score - 30 * run.revivesUsed), run.revivesUsed,
    new Date().toISOString());
  return list();
}

function list() {
  return topScores.all().map(row => ({ ...row }));
}

module.exports = { record, list };
