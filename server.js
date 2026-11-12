const express = require('express');
const session = require('express-session');
const crypto = require('node:crypto');
const path = require('node:path');
const auth = require('./src/auth');
const runs = require('./src/runs');
const banana = require('./src/banana');
const scores = require('./src/scores');

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.use(express.json({ limit: '12kb' }));
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({ secret, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 24 * 60 * 60 * 1000 } }));
app.use(express.static(path.join(__dirname, 'public')));

function requireUser(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in' });
  next();
}
function respondError(res, error) { res.status(400).json({ error: error.message }); }

app.get('/api/health', (_, res) => res.json({ status: 'OK', game: 'Strawberry Outbreak' }));
app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await auth.register(req.body.username, req.body.password);
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
app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));
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
app.get('/api/leaderboard', (_, res) => res.json({ entries: scores.list() }));

if (require.main === module) app.listen(PORT, () => console.log(`Game running at http://localhost:${PORT}`));
module.exports = app;