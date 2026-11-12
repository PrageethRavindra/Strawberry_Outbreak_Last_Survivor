const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getPuzzle } = require('../src/banana');

test('reads a valid Banana API JSON payload', async () => {
  const data = await getPuzzle(async () => ({ ok: true, json: async () => ({
    question: 'https://www.sanfoh.com/uob/banana/example.png', solution: 5
  }) }));
  assert.equal(data.solution, 5);
  assert.match(data.question, /sanfoh\.com/);
});

test('rejects invalid answer data', async () => {
  await assert.rejects(() => getPuzzle(async () => ({ ok: true, json: async () => ({
    question: 'https://www.sanfoh.com/example.png', solution: '5'
  }) })), /Invalid Banana API solution/);
});

test('rejects unsafe image origins', async () => {
  await assert.rejects(() => getPuzzle(async () => ({ ok: true, json: async () => ({
    question: 'https://example.com/fake.png', solution: 5
  }) })), /Unexpected Banana puzzle image URL/);
});

test('reports unavailable API', async () => {
  await assert.rejects(() => getPuzzle(async () => { throw Error('offline'); }), /offline/);
});