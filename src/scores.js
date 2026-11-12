const db = require('./storage');
function record(userId, username, run) {
  if (!run || run.status !== 'won') throw new Error('Only completed games appear on the leaderboard');
  const entries = db.read('scores.json', []);
  if (entries.some(entry => entry.runId === run.id)) return entries;
  entries.push({ runId: run.id, userId, username, score: Math.max(0, run.score - 30 * run.revivesUsed), revivesUsed: run.revivesUsed, createdAt: new Date().toISOString() });
  db.write('scores.json', entries);
  return entries;
}
function list() {
  return db.read('scores.json', []).sort((a, b) => b.score - a.score).slice(0, 10)
    .map(({ username, score, revivesUsed, createdAt }) => ({ username, score, revivesUsed, createdAt }));
}
module.exports = { record, list };