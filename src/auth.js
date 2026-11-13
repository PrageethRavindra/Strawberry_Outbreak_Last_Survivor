const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const findByName = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
const insertUser = db.prepare('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)');

async function register(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username))
    throw new Error('Username must be 3–20 letters, numbers or underscores');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72)
    throw new Error('Password must contain 8–72 characters');
  // The username column is COLLATE NOCASE, so this check is case-insensitive.
  if (findByName.get(username)) throw new Error('Username already exists');
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    insertUser.run(id, username, passwordHash);
  } catch (error) {
    // Another request registered the same name while the password was hashing.
    if (String(error.message).includes('UNIQUE')) throw new Error('Username already exists');
    throw error;
  }
  return { id, username };
}

async function login(username, password) {
  const user = typeof username === 'string' ? findByName.get(username) : undefined;
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash)))
    throw new Error('Incorrect username or password');
  return { id: user.id, username: user.username };
}

module.exports = { register, login };
