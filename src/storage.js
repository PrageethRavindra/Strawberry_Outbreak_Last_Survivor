const fs = require('node:fs');
const path = require('node:path');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function read(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return fallback; throw err; }
}

function write(name, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const file = path.join(DATA_DIR, name);
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2));
  fs.renameSync(temporary, file);
}

module.exports = { read, write };