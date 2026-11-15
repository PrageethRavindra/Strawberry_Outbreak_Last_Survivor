const crypto = require('node:crypto');
const session = require('express-session');
const { db } = require('./db');

const ONE_DAY = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 15 * 60 * 1000;

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid     TEXT PRIMARY KEY,
    sess    TEXT NOT NULL,
    expires INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Expiry time in ms: the cookie's own expiry, or one day for browser-session cookies.
function expiryOf(sess) {
  const expires = sess && sess.cookie && sess.cookie.expires;
  return expires ? new Date(expires).getTime() : Date.now() + ONE_DAY;
}

// express-session store that keeps sessions in the SQLite database, so logins survive restarts.
class SqliteStore extends session.Store {
  constructor({ cleanupInterval = CLEANUP_INTERVAL } = {}) {
    super();
    this.stmts = {
      get: db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expires > ?'),
      set: db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      all: db.prepare('SELECT sid, sess FROM sessions WHERE expires > ?'),
      length: db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE expires > ?'),
      clear: db.prepare('DELETE FROM sessions'),
      prune: db.prepare('DELETE FROM sessions WHERE expires <= ?')
    };
    this.prune();
    if (cleanupInterval > 0) {
      this.timer = setInterval(() => this.prune(), cleanupInterval);
      this.timer.unref(); // never keeps the process alive on its own
    }
  }

  // Runs fn and reports its result or error through the express-session callback.
  run(callback, fn) {
    let result;
    try { result = fn(); }
    catch (error) { if (callback) return callback(error); throw error; }
    if (callback) callback(null, result);
  }

  get(sid, callback) {
    this.run(callback, () => {
      const row = this.stmts.get.get(sid, Date.now());
      return row ? JSON.parse(row.sess) : null;
    });
  }

  set(sid, sess, callback) {
    this.run(callback, () => { this.stmts.set.run(sid, JSON.stringify(sess), expiryOf(sess)); });
  }

  touch(sid, sess, callback) {
    this.run(callback, () => { this.stmts.touch.run(expiryOf(sess), sid); });
  }

  destroy(sid, callback) {
    this.run(callback, () => { this.stmts.destroy.run(sid); });
  }

  all(callback) {
    this.run(callback, () => Object.fromEntries(
      this.stmts.all.all(Date.now()).map(row => [row.sid, JSON.parse(row.sess)])));
  }

  length(callback) {
    this.run(callback, () => this.stmts.length.get(Date.now()).n);
  }

  clear(callback) {
    this.run(callback, () => { this.stmts.clear.run(); });
  }

  prune() {
    return Number(this.stmts.prune.run(Date.now()).changes);
  }

  close() {
    clearInterval(this.timer);
  }
}

// Session signing secret: SESSION_SECRET if set, otherwise one generated once and kept in SQLite,
// so cookies stay valid across restarts.
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'session_secret'").get();
  if (row) return row.value;
  const secret = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('session_secret', ?)").run(secret);
  return db.prepare("SELECT value FROM settings WHERE key = 'session_secret'").get().value;
}

module.exports = { SqliteStore, sessionSecret };
