const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.DB_FILE = ':memory:';
const { db } = require('../src/db');
const auth = require('../src/auth');
const runs = require('../src/runs');
const scores = require('../src/scores');

test('registers and logs in users stored in SQLite', async () => {
  const user = await auth.register('Berry_Fan', 'password123');
  const row = db.prepare('SELECT username, password_hash FROM users WHERE id = ?').get(user.id);
  assert.equal(row.username, 'Berry_Fan');
  assert.notEqual(row.password_hash, 'password123'); // only the bcrypt hash is stored
  assert.deepEqual(await auth.login('Berry_Fan', 'password123'), user);
  await assert.rejects(() => auth.login('Berry_Fan', 'wrong-password'), /Incorrect/);
});

test('usernames are unique regardless of letter case', async () => {
  await auth.register('CaseUser', 'password123');
  await assert.rejects(() => auth.register('caseuser', 'password123'), /already exists/);
});

test('every rescue answer is logged for the run', async () => {
  const user = await auth.register('PuzzleLog', 'password123');
  const run = runs.start(user.id);
  runs.die(user.id);
  runs.pendingPuzzle(user.id, { question: 'https://www.sanfoh.com/a.png', solution: 3 });
  runs.answer(user.id, 3);
  runs.die(user.id);
  runs.pendingPuzzle(user.id, { question: 'https://www.sanfoh.com/b.png', solution: 6 });
  runs.answer(user.id, 1);
  const attempts = db.prepare('SELECT answer, correct FROM rescue_attempts WHERE run_id = ? ORDER BY id').all(run.id);
  assert.deepEqual(attempts.map(a => ({ ...a })), [{ answer: 3, correct: 1 }, { answer: 1, correct: 0 }]);
});

test('finished runs are kept as history and a new run starts fresh', async () => {
  const user = await auth.register('History', 'password123');
  const first = runs.start(user.id);
  runs.forfeit(user.id);
  const second = runs.start(user.id);
  assert.notEqual(first.id, second.id);
  assert.equal(second.revivesUsed, 0);
  const count = db.prepare('SELECT COUNT(*) AS n FROM runs WHERE user_id = ?').get(user.id).n;
  assert.equal(count, 2);
});

test('leaderboard records a won run once, highest score first', async () => {
  const a = await auth.register('Winner_A', 'password123');
  const b = await auth.register('Winner_B', 'password123');
  const runA = { ...runs.start(a.id), status: 'won', score: 600, revivesUsed: 2 };
  const runB = { ...runs.start(b.id), status: 'won', score: 600, revivesUsed: 0 };
  scores.record(a.id, a.username, runA);
  scores.record(a.id, a.username, runA); // duplicate is ignored
  scores.record(b.id, b.username, runB);
  const board = scores.list();
  assert.deepEqual(board.map(e => [e.username, e.score]), [['Winner_B', 600], ['Winner_A', 540]]);
  assert.throws(() => scores.record(a.id, a.username, { ...runA, status: 'lost' }), /Only completed games/);
});
