(function () {
  const ids = ['authSection', 'menu', 'gameScreen', 'resultScreen'];
  const byId = id => document.getElementById(id);
  const notify = message => { byId('globalMessage').textContent = message; };
  let player = null;
  let currentRun = null;

  function show(screen) {
    for (const id of ids) byId(id).hidden = id !== screen;
    notify('');
    if (screen === 'authSection') window.AuthUI.onShow();
    if (screen === 'menu') loadMenu();
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
    window.SurvivalGame.start(stage, { onDeath, onComplete, avatar: player && player.avatar });
  }
  function end(text) {
    window.SurvivalGame.stop();
    window.GameRescue.close();
    byId('resultText').textContent = text;
    show('resultScreen');
  }

  byId('authForm').addEventListener('submit', async e => {
    e.preventDefault();
    const auth = window.AuthUI;
    const problem = auth.validate();
    if (problem) return auth.showError(problem);
    auth.setBusy(true);
    try {
      const data = await window.GameApi.post(`/api/auth/${auth.mode()}`, auth.credentials());
      auth.rememberAccount();
      player = data.user;
      byId('accountName').textContent = player.username;
      show('menu');
    } catch (error) {
      auth.showError(error.message);
    } finally {
      auth.setBusy(false);
    }
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
  // ---- Menu (landing page after login) ------------------------------------
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const stageColors = ['#16a34a', '#2563eb', '#9333ea'];

  function stageObjective(stage) {
    if (stage.goalKills) return `Defeat ${stage.goalKills} enemies · ${stage.seconds}s`;
    if (stage.bossHp) return `Defeat the boss (${stage.bossHp} HP) · ${stage.seconds}s`;
    return `Survive the waves · ${stage.seconds}s`;
  }

  function renderRun(run) {
    const active = run && ['playing', 'awaiting_rescue'].includes(run.status);
    const currentStage = active ? run.stage : 1;
    const rescuing = active && run.status === 'awaiting_rescue';

    byId('startLabel').textContent = active ? `Resume — Stage ${run.stage}` : 'Start survival';
    byId('startHint').textContent = rescuing ? '🍌 A rescue puzzle is waiting'
      : active ? `${window.SurvivalStages.get(run.stage).name}` : '3 stages · 3 rescues';
    byId('menuStatus').textContent = rescuing
      ? 'You were caught! Solve the Banana puzzle to get back into the fight.'
      : active ? 'Your run is still alive. Jump back in before the outbreak spreads.'
        : 'Survive 3 stages with one life. Get caught and solve a Banana puzzle to revive, up to 3 times per run.';

    byId('runPills').hidden = !active;
    if (active) {
      byId('pillStage').textContent = `📍 Stage ${run.stage} of 3`;
      byId('pillRescues').textContent = `❤️ ${run.revivesRemaining} rescue${run.revivesRemaining === 1 ? '' : 's'} left`;
      byId('pillScore').textContent = `⭐ ${run.score} pts`;
    }

    byId('stageList').replaceChildren(...window.SurvivalStages.all.map((stage, i) => {
      const state = !active ? (i === 0 ? 'current' : 'locked')
        : stage.id < currentStage ? 'done' : stage.id === currentStage ? 'current' : 'locked';
      const li = el('li', `stage ${state}`);
      const num = el('span', 'stage-num', state === 'done' ? '✓' : String(stage.id));
      num.style.background = stageColors[i];
      const info = el('div');
      info.append(el('strong', '', stage.name), el('small', '', stageObjective(stage)));
      const label = { done: 'Cleared', current: active ? 'You are here' : 'Start here', locked: 'Locked' }[state];
      li.append(num, info, el('span', 'stage-state', label));
      return li;
    }));
  }

  function renderStats(stats) {
    byId('statRuns').textContent = stats.runsPlayed;
    byId('statWins').textContent = stats.wins;
    byId('statBest').textContent = stats.bestScore;
    byId('statPuzzles').textContent = stats.puzzlesAttempted
      ? `${stats.puzzlesSolved}/${stats.puzzlesAttempted}` : '0';
  }

  function renderBoard(entries) {
    const medals = ['🥇', '🥈', '🥉'];
    byId('leaderboardList').replaceChildren(...entries.map((entry, i) => {
      const li = el('li', player && entry.username === player.username ? 'me' : '');
      const name = el('span', 'name', entry.username);
      name.append(el('small', '', `${entry.revivesUsed} rescue${entry.revivesUsed === 1 ? '' : 's'}`));
      li.append(el('span', 'rank', medals[i] || String(i + 1)), window.SurvivalAvatars.canvas(entry.avatar, 30),
        name, el('span', 'pts', String(entry.score)));
      return li;
    }));
    byId('boardEmpty').hidden = entries.length > 0;
  }

  // ---- Avatar ---------------------------------------------------------------
  const Avatars = window.SurvivalAvatars;
  const avatarDialog = byId('avatarDialog');
  let avatarChoice = null;

  function renderMyAvatar() {
    const id = player.avatar || Avatars.DEFAULT;
    byId('avatarChip').replaceChildren(Avatars.canvas(id, 34));
    byId('heroAvatarArt').replaceChildren(Avatars.canvas(id, 92));
    byId('heroAvatar').title = `${Avatars.info(id).name} — click to change`;
  }

  function openAvatarDialog() {
    byId('avatarError').textContent = '';
    avatarChoice = Avatars.picker(byId('avatarGrid'), { selected: player.avatar, size: 72, taglines: true });
    avatarDialog.showModal();
    const current = byId('avatarGrid').querySelector('.selected');
    if (current) current.focus();
  }

  byId('avatarChip').addEventListener('click', openAvatarDialog);
  byId('heroAvatar').addEventListener('click', openAvatarDialog);
  byId('avatarCancel').addEventListener('click', () => avatarDialog.close());
  avatarDialog.addEventListener('click', e => { if (e.target === avatarDialog) avatarDialog.close(); }); // backdrop
  byId('avatarForm').addEventListener('submit', async e => {
    e.preventDefault();
    const save = byId('avatarSave');
    save.disabled = true;
    try {
      const { user } = await window.GameApi.post('/api/me/avatar', { avatar: avatarChoice.value });
      player = { ...player, avatar: user.avatar };
      avatarDialog.close();
      loadMenu();
    } catch (error) {
      byId('avatarError').textContent = error.message;
    } finally {
      save.disabled = false;
    }
  });

  async function loadMenu() {
    if (!player) return;
    byId('accountName').textContent = player.username;
    renderMyAvatar();
    byId('menuGreeting').textContent = `Ready, ${player.username}?`;
    renderRun(currentRun);
    const [status, stats, board] = await Promise.allSettled([
      window.GameApi.get('/api/run/status'),
      window.GameApi.get('/api/me/stats'),
      window.GameApi.get('/api/leaderboard')
    ]);
    if (status.status === 'fulfilled') { sync(status.value.run); renderRun(status.value.run); }
    byId('statsError').hidden = stats.status === 'fulfilled';
    if (stats.status === 'fulfilled') renderStats(stats.value.stats);
    else byId('statsError').textContent = `Stats could not be loaded: ${stats.reason.message}`;
    if (board.status === 'fulfilled') renderBoard(board.value.entries);
  }

  (async function init() {
    try {
      const { user } = await window.GameApi.get('/api/auth/me');
      player = user;
      if (!user) return show('authSection');
      byId('accountName').textContent = user.username;
      show('menu');
    } catch (error) { show('authSection'); window.AuthUI.showError(error.message); }
  })();
})();