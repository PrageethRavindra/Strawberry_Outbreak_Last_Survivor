const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'strawberry-test-'));
const runs = require('../src/runs');

test('only three correct Banana rescues are allowed', () => {
  const uid = 'tester';
  let run = runs.start(uid);
  assert.equal(run.revivesUsed, 0);
  for (let i = 1; i <= 3; i++) {
    run = runs.die(uid);
    assert.equal(run.status, 'awaiting_rescue');
    runs.pendingPuzzle(uid, { question: 'https://www.sanfoh.com/example.png', solution: 7 });
    run = runs.answer(uid, 7);
    assert.equal(run.status, 'playing');
    assert.equal(run.revivesUsed, i);
  }
  run = runs.die(uid);
  assert.equal(run.status, 'lost');
  assert.equal(run.revivesUsed, 3);
});

test('incorrect answers end the run; answer replay is rejected', () => {
  const uid = 'wrong-answer-user';
  runs.start(uid);
  runs.die(uid);
  runs.pendingPuzzle(uid, { question: 'https://www.sanfoh.com/example.png', solution: 2 });
  assert.equal(runs.answer(uid, 9).status, 'lost');
  assert.throws(() => runs.answer(uid, 2), /No unanswered puzzle/);
});

test('starting a run again does not reset an active rescue limit', () => {
  const uid = 'refresh-user';
  const first = runs.start(uid);
  runs.die(uid);
  runs.pendingPuzzle(uid, { question: 'https://www.sanfoh.com/example.png', solution: 4 });
  runs.answer(uid, 4);
  const second = runs.start(uid);
  assert.equal(first.id, second.id);
  assert.equal(second.revivesUsed, 1);
});

test('cannot complete a stage early or skip its number', () => {
  const uid = 'stage-user';
  runs.start(uid);
  assert.throws(() => runs.completeStage(uid, 2), /Invalid stage/);
  assert.throws(() => runs.completeStage(uid, 1), /quickly/);
});