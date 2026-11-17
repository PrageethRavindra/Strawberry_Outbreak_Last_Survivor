const express = require('express');
const session = require('express-session');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const auth = require('./src/auth');
const runs = require('./src/runs');
const banana = require('./src/banana');
const scores = require('./src/scores');
const stats = require('./src/stats');
const { SqliteStore, sessionSecret } = require('./src/session-store');

const app = express();
const PORT = Number(process.env.PORT || 3443);
const HTTP_PORT = Number(process.env.HTTP_PORT || 3000);
const TLS_KEY_FILE = process.env.TLS_KEY_FILE || path.join(__dirname, 'certs', 'key.pem');
const TLS_CERT_FILE = process.env.TLS_CERT_FILE || path.join(__dirname, 'certs', 'cert.pem');
// Set TRUST_PROXY (e.g. "1") when a reverse proxy terminates HTTPS and forwards X-Forwarded-Proto.
const TRUST_PROXY = process.env.TRUST_PROXY;

app.disable('x-powered-by');
if (TRUST_PROXY) app.set('trust proxy', /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);

// HTTPS only: redirect plain HTTP and tell browsers to stick to HTTPS.
app.use((req, res, next) => {
  if (!req.secure) {
    const host = (req.headers.host || 'localhost').replace(/:\d+$/, '');
    const port = TRUST_PROXY || PORT === 443 ? '' : `:${PORT}`;
    return res.redirect(308, `https://${host}${port}${req.originalUrl}`);
  }
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(express.json({ limit: '12kb' }));
app.use(session({
  name: '__Host-sid', // __Host- prefix: browser only accepts it over HTTPS, host-only, path=/
  secret: sessionSecret(),
  store: new SqliteStore(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

function requireUser(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in' });
  next();
}
function respondError(res, error) { res.status(400).json({ error: error.message }); }

app.get('/api/health', (_, res) => res.json({ status: 'OK', game: 'Strawberry Outbreak' }));
app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await auth.register(req.body.username, req.body.password, req.body.avatar);
    req.session.regenerate(err => {
      if (err) return respondError(res, err);
      req.session.user = user;
      res.json({ user });
    });
  } catch (error) { respondError(res, error); }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await auth.login(req.body.username, req.body.password);
    req.session.regenerate(err => {
      if (err) return respondError(res, err);
      req.session.user = user;
      res.json({ user });
    });
  } catch (error) { respondError(res, error); }
});
app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user ? auth.getUser(req.session.user.id) : null });
});
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.post('/api/run/start', requireUser, (req, res) => {
  try { res.json({ run: runs.publicRun(runs.start(req.session.user.id)) }); }
  catch (error) { respondError(res, error); }
});
app.get('/api/run/status', requireUser, (req, res) => {
  res.json({ run: runs.publicRun(runs.get(req.session.user.id)) });
});
app.post('/api/run/death', requireUser, (req, res) => {
  try { res.json({ run: runs.publicRun(runs.die(req.session.user.id)) }); }
  catch (error) { respondError(res, error); }
});
app.post('/api/run/forfeit', requireUser, (req, res) => {
  try { res.json({ run: runs.publicRun(runs.forfeit(req.session.user.id)) }); }
  catch (error) { respondError(res, error); }
});
app.post('/api/run/complete-stage', requireUser, (req, res) => {
  try {
    const stage = req.body.stage;
    const run = runs.completeStage(req.session.user.id, stage);
    if (run.status === 'won') scores.record(req.session.user.id, req.session.user.username, run);
    res.json({ run: runs.publicRun(run) });
  } catch (error) { respondError(res, error); }
});
app.get('/api/rescue/question', requireUser, async (req, res) => {
  try {
    let run = runs.get(req.session.user.id);
    if (!run || run.status !== 'awaiting_rescue') return res.status(409).json({ error: 'No pending rescue' });
    if (!run.pendingPuzzle) run = runs.pendingPuzzle(req.session.user.id, await banana.getPuzzle());
    res.json({ question: run.pendingPuzzle.question });
  } catch (error) { res.status(503).json({ error: 'Banana API unavailable. Retry loading this puzzle.' }); }
});
app.post('/api/rescue/answer', requireUser, (req, res) => {
  try {
    const run = runs.answer(req.session.user.id, req.body.answer);
    res.json({ correct: run.status === 'playing', run: runs.publicRun(run) });
  } catch (error) { respondError(res, error); }
});
app.post('/api/me/avatar', requireUser, (req, res) => {
  try {
    const user = auth.setAvatar(req.session.user.id, req.body.avatar);
    req.session.user = { ...req.session.user, avatar: user.avatar };
    res.json({ user });
  } catch (error) { respondError(res, error); }
});
app.get('/api/me/stats', requireUser, (req, res) => {
  res.json({ stats: stats.forUser(req.session.user.id) });
});
app.get('/api/leaderboard', (_, res) => res.json({ entries: scores.list() }));

function start() {
  if (TRUST_PROXY) {
    // TLS is handled by the proxy in front of us.
    return app.listen(PORT, () => console.log(`Game listening on port ${PORT} behind an HTTPS proxy`));
  }
  if (!fs.existsSync(TLS_KEY_FILE) || !fs.existsSync(TLS_CERT_FILE)) {
    console.error(`HTTPS certificate not found (${TLS_KEY_FILE}, ${TLS_CERT_FILE}).\n` +
      'Run "npm run cert" for a local self-signed certificate, set TLS_KEY_FILE/TLS_CERT_FILE, ' +
      'or set TRUST_PROXY when running behind an HTTPS reverse proxy.');
    process.exit(1);
  }
  const tls = { key: fs.readFileSync(TLS_KEY_FILE), cert: fs.readFileSync(TLS_CERT_FILE) };
  https.createServer(tls, app).listen(PORT, () => console.log(`Game running at https://localhost:${PORT}`));
  if (HTTP_PORT) {
    // Plain HTTP only redirects to HTTPS (handled by the middleware above).
    http.createServer(app).listen(HTTP_PORT, () =>
      console.log(`Redirecting http://localhost:${HTTP_PORT} to HTTPS`));
  }
}

if (require.main === module) start();
module.exports = app;