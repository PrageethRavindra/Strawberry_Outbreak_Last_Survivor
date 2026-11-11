(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const keys = new Set();
  let state = null, frame = null, last = 0, callbacks = {};
  const P = window.SurvivalPlayer;
  const E = window.SurvivalEnemies;
  const B = window.SurvivalProjectiles;

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (state && !state.paused && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    keys.add(k);
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  function start(stageId, handlers = {}) {
    stop();
    const level = window.SurvivalStages.get(stageId);
    if (!level) throw new Error('Unknown stage');
    callbacks = handlers;
    state = { level, player: P.create(400, 240), enemies: [], bullets: [], elapsed: 0,
      spawnClock: 0, shootClock: 0, kills: 0, paused: false, finished: false };
    if (level.bossHp) state.enemies.push(E.spawn(canvas.width, canvas.height, level, true));
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function pause() {
    if (state) state.paused = true;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }

  function resume() {
    if (!state || state.finished) return;
    state.paused = false;
    last = performance.now();
    if (frame === null) frame = requestAnimationFrame(loop);
  }

  function revive() {
    if (!state) return;
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height / 2;
    state.player.shield = 2;
    // Give some time back if the failed objective was the countdown.
    state.elapsed = Math.min(state.elapsed, state.level.seconds - 12);
    state.enemies = state.enemies.filter(enemy => enemy.boss);
    keys.clear();
    resume();
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    keys.clear();
    state = null;
  }

  function die(reason) {
    if (!state || state.paused || state.finished) return;
    pause();
    if (callbacks.onDeath) callbacks.onDeath(reason);
  }

  function complete() {
    if (!state || state.finished) return;
    state.finished = true;
    pause();
    if (callbacks.onComplete) callbacks.onComplete(state.level.id);
  }

  function update(dt) {
    const s = state, level = s.level;
    s.elapsed += dt;
    P.update(s.player, keys, dt, canvas.width, canvas.height);
    s.spawnClock += dt;
    s.shootClock += dt;

    if (s.spawnClock >= level.spawnEvery) {
      s.spawnClock = 0;
      s.enemies.push(E.spawn(canvas.width, canvas.height, level));
    }
    E.update(s.enemies, s.player, dt);
    if (s.shootClock >= .33) {
      s.shootClock = 0;
      const bullet = B.fire(s.player, s.enemies);
      if (bullet) s.bullets.push(bullet);
    }
    s.bullets = B.update(s.bullets, dt, canvas.width, canvas.height);

    for (const bullet of s.bullets) {
      if (bullet.hit) continue;
      for (const enemy of s.enemies) {
        if (enemy.hp > 0 && P.touching(bullet, enemy)) {
          enemy.hp -= 1;
          bullet.hit = true;
          if (enemy.hp <= 0) s.kills++;
          break;
        }
      }
    }
    s.bullets = s.bullets.filter(b => !b.hit);
    s.enemies = s.enemies.filter(e => e.hp > 0);
    if (s.player.shield <= 0 && s.enemies.some(enemy => P.touching(s.player, enemy))) {
      die('An enemy caught you');
      return;
    }
    if (s.elapsed >= level.seconds) {
      const bossAlive = s.enemies.some(e => e.boss);
      if (s.kills >= level.goalKills && !bossAlive) complete();
      else die('Time is up or the objective was not completed');
    }
  }

  function draw() {
    if (!state) return;
    const s = state;
    ctx.fillStyle = s.level.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffffff12';
    for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
    E.draw(ctx, s.enemies);
    B.draw(ctx, s.bullets);
    P.draw(ctx, s.player);
    ctx.fillStyle = 'white'; ctx.textAlign = 'left'; ctx.font = '18px Arial';
    const remaining = Math.max(0, Math.ceil(s.level.seconds - s.elapsed));
    ctx.fillText(`Stage ${s.level.id}: ${s.level.name}  |  ${remaining}s  |  Kills ${s.kills}`, 14, 26);
    ctx.font = '14px Arial';
    if (s.level.goalKills) ctx.fillText(`Objective: survive and defeat ${s.level.goalKills} enemies`, 14, 48);
    if (s.level.bossHp) ctx.fillText('Objective: defeat the purple boss and survive', 14, 48);
  }

  function loop(now) {
    frame = null;
    if (!state || state.paused) return;
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    update(dt);
    draw();
    if (state && !state.paused) frame = requestAnimationFrame(loop);
  }

  window.SurvivalGame = { start, stop, pause, resume, revive, getState: () => state };
})();