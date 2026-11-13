(function () {
  const ids = ['authSection', 'menu', 'gameScreen', 'resultScreen'];
  const byId = id => document.getElementById(id);
  const notify = message => { byId('globalMessage').textContent = message; };
  let player = null;
  let currentRun = null;

  function show(screen) {
    for (const id of ids) byId(id).hidden = id !== screen;
    notify('');
  }
  function sync(run) {
    currentRun = run;
    byId('revives').textContent = `Rescues left: ${run ? run.revivesRemaining : 3}`;
  }
  async function onDeath(reason) {
    try {
      notify(reason + '. Checking your revival allowance...');
      const { run } = await window.GameApi.post('/api/run/death');
      sync(run);
      if (run.status === 'lost') return end('Game Over — you used all 3 revivals.');
      notify('');
      window.GameRescue.open(onCorrectRescue, () => end('Wrong Banana answer. Game Over!'));
    } catch (error) { notify(error.message); }
  }
  function onCorrectRescue(run) {
    sync(run);
    notify('Correct! Life restored. You have 3 seconds of protection.');
    window.SurvivalGame.revive();
  }
  async function onComplete(stage) {
    try {
      const { run } = await window.GameApi.post('/api/run/complete-stage', { stage });
      sync(run);
      if (run.status === 'won') return end('Victory! You escaped the island.');
      launchStage(run.stage);
    } catch (error) { notify(error.message); }
  }
  function launchStage(stage) {
    byId('stageTitle').textContent = window.SurvivalStages.get(stage).name;
    show('gameScreen');
    window.SurvivalGame.start(stage, { onDeath, onComplete });
  }
  function end(text) {
    window.SurvivalGame.stop();
    window.GameRescue.close();
    byId('resultText').textContent = text;
    show('resultScreen');
  }

  byId('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      const mode = byId('authMode').value;
      const data = await window.GameApi.post(`/api/auth/${mode}`, {
        username: byId('username').value.trim(), password: byId('password').value
      });
      player = data.user;
      byId('accountName').textContent = player.username;
      show('menu');
    } catch (error) { notify(error.message); }
  });

  byId('startBtn').addEventListener('click', async () => {
    try {
      const { run } = await window.GameApi.post('/api/run/start');
      sync(run);
      launchStage(run.stage);
      if (run.status === 'awaiting_rescue') {
        window.SurvivalGame.pause();
        window.GameRescue.open(onCorrectRescue, () => end('Wrong Banana answer. Game Over!'));
      }
    } catch (error) { notify(error.message); }
  });

  byId('backBtn').addEventListener('click', async () => {
    try {
      await window.GameApi.post('/api/run/forfeit');
      window.SurvivalGame.stop();
      window.GameRescue.close();
      show('menu');
    } catch (error) { notify(error.message); }
  });

  byId('againBtn').addEventListener('click', () => show('menu'));
  byId('logoutBtn').addEventListener('click', async () => {
    await window.GameApi.post('/api/auth/logout');
    player = null;
    show('authSection');
  });
  byId('leaderboardBtn').addEventListener('click', async () => {
    try {
      const { entries } = await window.GameApi.get('/api/leaderboard');
      byId('leaderboardList').replaceChildren(...entries.map((e, i) => {
        const li = document.createElement('li');
        li.textContent = `${i + 1}. ${e.username} — ${e.score} points (${e.revivesUsed} rescues)`;
        return li;
      }));
      byId('leaderboardList').hidden = false;
    } catch (error) { notify(error.message); }
  });

  (async function init() {
    try {
      const { user } = await window.GameApi.get('/api/auth/me');
      player = user;
      if (!user) return show('authSection');
      byId('accountName').textContent = user.username;
      show('menu');
    } catch (error) { show('authSection'); notify(error.message); }
  })();
})();