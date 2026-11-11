const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('./storage');

async function register(username, password) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username))
    throw new Error('Username must be 3–20 letters, numbers or underscores');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72)
    throw new Error('Password must contain 8–72 characters');
  const users = db.read('users.json', []);
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase()))
    throw new Error('Username already exists');
  const user = { id: crypto.randomUUID(), username, passwordHash: await bcrypt.hash(password, 10) };
  users.push(user);
  db.write('users.json', users);
  return { id: user.id, username: user.username };
}

async function login(username, password) {
  const users = db.read('users.json', []);
  const user = users.find(u => u.username === username);
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash)))
    throw new Error('Incorrect username or password');
  return { id: user.id, username: user.username };
}

module.exports = { register, login };