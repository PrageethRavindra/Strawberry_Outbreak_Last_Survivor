const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const avatars = require('./avatars');

const findByName = db.prepare('SELECT id, username, password_hash, avatar FROM users WHERE username = ?');
const findById = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT INTO users (id, username, password_hash, avatar) VALUES (?, ?, ?, ?)');
const updateAvatar = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');

async function register(username, password, avatar = avatars.DEFAULT_AVATAR) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,20}$/.test(username))
    throw new Error('Username must be 3–20 letters, numbers or underscores');
  if (typeof password !== 'string' || password.length < 8 || password.length > 72)
    throw new Error('Password must contain 8–72 characters');
  if (avatar === undefined || avatar === null) avatar = avatars.DEFAULT_AVATAR;
  if (!avatars.isValid(avatar)) throw new Error('Unknown avatar');
  // The username column is COLLATE NOCASE, so this check is case-insensitive.
  if (findByName.get(username)) throw new Error('Username already exists');
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    insertUser.run(id, username, passwordHash, avatar);
  } catch (error) {
    // Another request registered the same name while the password was hashing.
    if (String(error.message).includes('UNIQUE')) throw new Error('Username already exists');
    throw error;
  }
  return { id, username, avatar };
}

async function login(username, password) {
  const user = typeof username === 'string' ? findByName.get(username) : undefined;
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash)))
    throw new Error('Incorrect username or password');
  return { id: user.id, username: user.username, avatar: user.avatar };
}

// Current account details (always read fresh, so avatar changes show immediately).
function getUser(id) {
  const user = findById.get(id);
  return user ? { ...user } : null;
}

function setAvatar(id, avatar) {
  if (!avatars.isValid(avatar)) throw new Error('Unknown avatar');
  if (Number(updateAvatar.run(avatar, id).changes) === 0) throw new Error('Account not found');
  return getUser(id);
}

module.exports = { register, login, getUser, setAvatar };
