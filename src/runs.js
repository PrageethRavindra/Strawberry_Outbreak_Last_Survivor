const crypto = require('node:crypto');
const db = require('./storage');
const MAX_REVIVES = 3;

function get(userId) {
  return db.read('runs.json', {})[userId] || null;
}
function update(userId, transform) {
  const all = db.read('runs.json', {});
  const run = all[userId] || null;
  const next = transform(run);
  all[userId] = next;
  db.write('runs.json', all);
  return next;
}
function start(userId) {
  const existing = get(userId);
  if (existing && ['playing', 'awaiting_rescue'].includes(existing.status)) return existing;
  return update(userId, () => ({ id: crypto.randomUUID(), stage: 1, status: 'playing',
    revivesUsed: 0, pendingPuzzle: null, stageStartedAt: Date.now(), score: 0 }));
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
    if (value !== run.pendingPuzzle.solution) return { ...run, status: 'lost', pendingPuzzle: null };
    if (run.revivesUsed >= MAX_REVIVES) throw new Error('No revivals remaining');
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