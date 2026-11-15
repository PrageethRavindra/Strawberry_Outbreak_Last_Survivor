const { test } = require('node:test');
const assert = require('node:assert/strict');
const { promisify } = require('node:util');
process.env.DB_FILE = ':memory:';
const { db } = require('../src/db');
const { SqliteStore, sessionSecret } = require('../src/session-store');

const store = new SqliteStore({ cleanupInterval: 0 });
const get = promisify(store.get.bind(store));
const set = promisify(store.set.bind(store));
const touch = promisify(store.touch.bind(store));
const destroy = promisify(store.destroy.bind(store));
const length = promisify(store.length.bind(store));
const later = ms => new Date(Date.now() + ms).toISOString();

test('stores, reads and destroys sessions in SQLite', async () => {
  const sess = { cookie: { expires: later(60_000), httpOnly: true, secure: true }, user: { id: 'u1', username: 'Berry' } };
  await set('abc', sess);
  assert.deepEqual(await get('abc'), sess);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE sid = ?').get('abc').n, 1);
  await destroy('abc');
  assert.equal(await get('abc'), null);
});

test('expired sessions are not returned and get pruned', async () => {
  await set('old', { cookie: { expires: later(-1000) } });
  await set('new', { cookie: { expires: later(60_000) } });
  assert.equal(await get('old'), null);
  assert.equal(await length(), 1);
  assert.equal(store.prune(), 1);
  await destroy('new');
});

test('touch extends a session expiry', async () => {
  await set('t', { cookie: { expires: later(1000) } });
  const expires = later(3_600_000);
  await touch('t', { cookie: { expires } });
  assert.equal(db.prepare('SELECT expires FROM sessions WHERE sid = ?').get('t').expires, new Date(expires).getTime());
  await destroy('t');
});

test('session secret is generated once and reused', () => {
  delete process.env.SESSION_SECRET;
  const first = sessionSecret();
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(sessionSecret(), first);
});
