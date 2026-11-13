(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const dashBtn = document.getElementById('dashBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const soundBtn = document.getElementById('soundBtn');
  const keys = new Set();
  const pointer = { x: 0, y: 0, inside: false, down: false };
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
  let state = null, frame = null, last = 0, callbacks = {};
  const P = window.SurvivalPlayer;
  const E = window.SurvivalEnemies;
  const B = window.SurvivalProjectiles;
  const U = window.SurvivalPowerups;
  const FX = window.SurvivalEffects;
  const MOVE_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
  const INTRO_SECONDS = 3;

  // ---- Keyboard ---------------------------------------------------------
  const isTyping = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);

  window.addEventListener('keydown', e => {
    if (isTyping(e)) return;
    const k = e.key.toLowerCase();
    if (state && !state.paused && (MOVE_KEYS.includes(k) || k === ' ')) e.preventDefault();
    if (state && !e.repeat) {
      if (k === ' ' || k === 'shift') dash();
      else if (k === 'p' || k === 'escape') togglePause();
      else if (k === 'm') toggleMute();
    }
    keys.add(k);
  });
  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => {
    releaseInput();
    // Auto-pause when the player switches away from the game.
    if (state && !state.paused) togglePause();
  });

  // ---- Mouse (aim + hold to fire) and touch (drag joystick) -------------
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (state && state.userPaused) { togglePause(); return; }
    const p = toCanvas(e);
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      Object.assign(pointer, p, { inside: true, down: true });
    } else if (stick.id === null) {
      stick.id = e.pointerId;
      stick.ox = stick.x = p.x;
      stick.oy = stick.y = p.y;
    } else {
      dash(); // second finger taps to dash
    }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const p = toCanvas(e);
    if (e.pointerId === stick.id) { stick.x = p.x; stick.y = p.y; }
    else if (e.pointerType === 'mouse') Object.assign(pointer, p, { inside: true });
  });
  function releasePointer(e) {
    if (e.pointerId === stick.id) stick.id = null;
    if (e.pointerType === 'mouse') pointer.down = false;
  }
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pointer.inside = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function releaseInput() {
    keys.clear();
    pointer.down = false;
    stick.id = null;
  }

  function moveVector() {
    let x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    let y = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    if (stick.id !== null) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy, len = Math.hypot(dx, dy);
      if (len > 8) {
        const strength = Math.min(1, len / 50);
        x += dx / len * strength;
        y += dy / len * strength;
      }
    }
    return { x, y };
  }

  // ---- On-screen buttons ------------------------------------------------
  dashBtn.addEventListener('pointerdown', e => { e.preventDefault(); dash(); });
  pauseBtn.addEventListener('click', e => { e.currentTarget.blur(); togglePause(); });
  soundBtn.addEventListener('click', e => { e.currentTarget.blur(); toggleMute(); });

  function updateControls() {
    pauseBtn.textContent = state && state.userPaused ? '▶ Resume (P)' : '⏸ Pause (P)';
    soundBtn.textContent = FX.isMuted() ? '🔇 Sound off (M)' : '🔊 Sound on (M)';
  }
  updateControls();

  // ---- Game lifecycle ---------------------------------------------------
  function start(stageId, handlers = {}) {
    stop();
    const level = window.SurvivalStages.get(stageId);
    if (!level) throw new Error('Unknown stage');
    callbacks = handlers;
    state = { level, player: P.create(400, 240), enemies: [], bullets: [], powerups: [], elapsed: 0,
      spawnClock: 0, shootClock: 0, kills: 0, combo: 0, comboTimer: 0, intro: INTRO_SECONDS, goFlash: 0,
      paused: false, userPaused: false, finished: false };
    if (level.bossHp) state.enemies.push(E.spawn(canvas.width, canvas.height, level, true, state.player));
    FX.sound('tick');
    updateControls();
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
    state.userPaused = false;
    updateControls();
    last = performance.now();
    if (frame === null) frame = requestAnimationFrame(loop);
  }

  // Player-controlled pause. Ignored while a death/rescue is in progress.
  function togglePause() {
    if (!state || state.finished) return;
    if (state.userPaused) return resume();
    if (state.paused) return;
    pause();
    state.userPaused = true;
    releaseInput();
    updateControls();
    draw();
  }

  function toggleMute() {
    FX.toggleMute();
    updateControls();
    if (state && state.paused) draw();
  }

  function dash() {
    if (!state || state.paused || state.intro > 0) return;
    if (P.dash(state.player)) {
      FX.sound('dash');
      FX.burst(state.player.x, state.player.y, '#fda4af', 10, 120);
    }
  }

  function revive() {
    if (!state) return;
    state.player.x = canvas.width / 2;
    state.player.y = canvas.height / 2;
    state.player.shield = 3;
    // Give some time back if the failed objective was the countdown.
    state.elapsed = Math.min(state.elapsed, state.level.seconds - 12);
    state.enemies = state.enemies.filter(enemy => enemy.boss);
    state.combo = 0;
    releaseInput();
    FX.float(state.player.x, state.player.y - 30, 'REVIVED!', '#86efac');
    FX.sound('power');
    resume();
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    releaseInput();
    FX.reset();
    state = null;
    updateControls();
  }

  function die(reason) {
    if (!state || state.paused || state.finished) return;
    FX.shake(14);
    FX.burst(state.player.x, state.player.y, '#f43f5e', 26, 240);
    FX.sound('hurt');
    draw();
    pause();
    if (callbacks.onDeath) callbacks.onDeath(reason);
  }

  function complete() {
    if (!state || state.finished) return;
    state.finished = true;
    pause();
    if (callbacks.onComplete) callbacks.onComplete(state.level.id);
  }

  // ---- Gameplay ---------------------------------------------------------
  function onKill(enemy) {
    const s = state;
    s.kills++;
    s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
    s.comboTimer = 2;
    FX.sound('kill');
    if (enemy.boss) {
      FX.burst(enemy.x, enemy.y, '#c084fc', 50, 300);
      FX.shake(16);
      FX.float(enemy.x, enemy.y - 40, 'BOSS DOWN!', '#f0abfc');
    } else {
      FX.burst(enemy.x, enemy.y, '#fb923c', 14, 170);
      if (s.combo >= 3) FX.float(enemy.x, enemy.y - 20, `${s.combo}x COMBO!`, '#fde047');
    }
    const drop = U.maybeDrop(enemy.x, enemy.y, enemy.boss ? 1 : 0.12);
    if (drop) s.powerups.push(drop);
  }

  function collect(powerup) {
    const info = U.TYPES[powerup.type];
    const player = state.player;
    if (powerup.type === 'shield') player.shield = Math.max(player.shield, info.duration);
    else player.buffs[powerup.type] = info.duration;
    FX.float(player.x, player.y - 30, info.name, info.color);
    FX.burst(powerup.x, powerup.y, info.color, 12, 140);
    FX.sound('power');
  }

  function update(dt) {
    const s = state, level = s.level;
    FX.update(dt);
    s.goFlash = Math.max(0, s.goFlash - dt);

    if (s.intro > 0) {
      const before = Math.ceil(s.intro);
      s.intro -= dt;
      const after = Math.ceil(s.intro);
      if (after !== before) FX.sound(after > 0 ? 'tick' : 'go');
      if (s.intro <= 0) s.goFlash = 0.7;
      return;
    }

    s.elapsed += dt;
    P.update(s.player, moveVector(), dt, canvas.width, canvas.height);
    s.spawnClock += dt;
    s.shootClock += dt;
    s.comboTimer = Math.max(0, s.comboTimer - dt);
    if (s.comboTimer === 0) s.combo = 0;

    if (s.spawnClock >= level.spawnEvery) {
      s.spawnClock = 0;
      if (s.enemies.length < level.maxEnemies) s.enemies.push(E.spawn(canvas.width, canvas.height, level, false, s.player));
    }

    // Waves: a group of enemies rushes in together from one side.
    s.waveClock = (s.waveClock || 0) + dt;
    if (level.waveEvery && s.waveClock >= level.waveEvery) {
      s.waveClock = 0;
      const leader = E.spawn(canvas.width, canvas.height, level, false, s.player);
      s.enemies.push(leader);
      for (let i = 1; i < level.waveSize; i++) {
        const enemy = E.spawn(canvas.width, canvas.height, level, false, s.player);
        enemy.x = Math.max(10, Math.min(canvas.width - 10, leader.x + (Math.random() - 0.5) * 120));
        enemy.y = Math.max(10, Math.min(canvas.height - 10, leader.y + (Math.random() - 0.5) * 120));
        s.enemies.push(enemy);
      }
      FX.float(canvas.width / 2, 110, '⚠ WAVE INCOMING!', '#f87171');
      FX.sound('tick');
    }
    E.update(s.enemies, s.player, dt);

    // Holding the mouse aims manually and fires faster than auto-fire.
    const rapid = s.player.buffs.rapid > 0;
    const manual = pointer.down;
    const interval = manual ? (rapid ? 0.1 : 0.18) : (rapid ? 0.15 : 0.33);
    if (s.shootClock >= interval) {
      const bullet = manual ? B.fireAt(s.player, pointer.x, pointer.y) : B.fire(s.player, s.enemies);
      if (bullet) {
        s.shootClock = 0;
        s.bullets.push(bullet);
        FX.sound('shoot');
      }
    }
    s.bullets = B.update(s.bullets, dt, canvas.width, canvas.height);

    for (const bullet of s.bullets) {
      if (bullet.hit) continue;
      for (const enemy of s.enemies) {
        if (enemy.hp > 0 && P.touching(bullet, enemy)) {
          enemy.hp -= 1;
          enemy.flash = 0.08;
          bullet.hit = true;
          if (enemy.hp <= 0) onKill(enemy);
          else {
            FX.sound('hit');
            FX.burst(bullet.x, bullet.y, '#fde047', 5, 100);
          }
          break;
        }
      }
    }
    s.bullets = s.bullets.filter(b => !b.hit);
    s.enemies = s.enemies.filter(e => e.hp > 0);

    s.powerups = U.update(s.powerups, dt).filter(p => {
      if (!P.touching(p, s.player)) return true;
      collect(p);
      return false;
    });

    // Slightly forgiving hitbox: enemies must overlap the player a little to count as a catch.
    const caught = enemy => Math.hypot(s.player.x - enemy.x, s.player.y - enemy.y) < (s.player.radius + enemy.radius) * 0.85;
    if (s.player.shield <= 0 && s.enemies.some(caught)) {
      die('An enemy caught you');
      return;
    }
    if (s.elapsed >= level.seconds) {
      const bossAlive = s.enemies.some(e => e.boss);
      if (s.kills >= level.goalKills && !bossAlive) complete();
      else die('Time is up or the objective was not completed');
    }
  }

  // ---- Rendering --------------------------------------------------------
  function drawBar(x, y, w, h, fraction, color) {
    ctx.fillStyle = '#00000080';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
  }

  function bigText(text, color = '#ffffff') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = '#000000aa';
    ctx.fillText(text, canvas.width / 2 + 3, canvas.height / 2 + 23);
    ctx.fillStyle = color;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 20);
  }

  function drawHud(s) {
    const W = canvas.width, H = canvas.height, level = s.level;
    const remaining = Math.max(0, Math.ceil(level.seconds - s.elapsed));

    ctx.textAlign = 'left';
    ctx.font = '18px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`Stage ${level.id}: ${level.name}  |  Kills ${s.kills}`, 14, 26);

    ctx.textAlign = 'right';
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = remaining <= 10 ? '#f87171' : '#ffffff';
    ctx.fillText(`⏱ ${remaining}s`, W - 14, 28);
    drawBar(W - 164, 36, 150, 5, 1 - s.elapsed / level.seconds, remaining <= 10 ? '#f87171' : '#4ade80');

    // Objective with live progress
    ctx.textAlign = 'left';
    ctx.font = '14px Arial';
    if (level.goalKills) {
      const done = s.kills >= level.goalKills;
      ctx.fillStyle = done ? '#86efac' : '#ffffff';
      ctx.fillText(`Objective: defeat ${level.goalKills} enemies (${Math.min(s.kills, level.goalKills)}/${level.goalKills})${done ? ' ✔' : ''}`, 14, 48);
    } else if (level.bossHp) {
      const boss = s.enemies.find(e => e.boss);
      ctx.fillStyle = boss ? '#ffffff' : '#86efac';
      ctx.fillText(boss ? 'Objective: defeat the purple boss and survive' : 'Boss defeated ✔ — survive until extraction!', 14, 48);
      if (boss) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0abfc';
        ctx.fillText('BOSS', W / 2, 62);
        drawBar(W / 2 - 150, 68, 300, 10, boss.hp / boss.maxHp, '#c084fc');
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Objective: survive until the timer ends', 14, 48);
    }

    // Combo
    if (s.combo >= 2) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`${s.combo}x combo`, W - 14, 66);
      drawBar(W - 114, 72, 100, 4, s.comboTimer / 2, '#fde047');
    }

    // Dash cooldown and active power-ups (bottom-left)
    const p = s.player;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = p.dashCooldown > 0 ? '#94a3b8' : '#fda4af';
    ctx.fillText(p.dashCooldown > 0 ? 'DASH' : 'DASH READY (Space)', 14, H - 30);
    drawBar(14, H - 24, 120, 8, 1 - p.dashCooldown / P.DASH_COOLDOWN, '#fda4af');

    let bx = 150;
    const active = [['rapid', p.buffs.rapid], ['speed', p.buffs.speed], ['shield', p.shield > 0.5 ? p.shield : 0]];
    for (const [type, time] of active) {
      if (time <= 0) continue;
      const info = U.TYPES[type];
      ctx.fillStyle = info.color;
      ctx.fillText(`${info.icon} ${info.name.replace('!', '')} ${time.toFixed(1)}s`, bx, H - 18);
      bx += 150;
    }
  }

  function drawStick() {
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(stick.ox, stick.oy, 50, 0, Math.PI * 2);
    ctx.stroke();
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, 50 / len);
    ctx.fillStyle = '#ffffff88';
    ctx.beginPath();
    ctx.arc(stick.ox + dx * k, stick.oy + dy * k, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
  }

  function drawAimLine(s) {
    ctx.strokeStyle = '#fde04766';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(s.player.x, s.player.y);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    if (!state) return;
    const s = state, W = canvas.width, H = canvas.height;

    ctx.save();
    FX.applyShake(ctx);
    ctx.fillStyle = s.level.background;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = '#ffffff12';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    U.draw(ctx, s.powerups, s.elapsed);
    if (pointer.down && !s.paused) drawAimLine(s);
    E.draw(ctx, s.enemies, s.player);
    B.draw(ctx, s.bullets);
    P.draw(ctx, s.player);
    FX.draw(ctx);
    ctx.restore();

    drawHud(s);
    if (stick.id !== null) drawStick();

    if (s.intro > 0) bigText(String(Math.ceil(s.intro)));
    else if (s.goFlash > 0) bigText('GO!', '#86efac');

    if (s.userPaused) {
      ctx.fillStyle = '#0f172acc';
      ctx.fillRect(0, 0, W, H);
      bigText('PAUSED', '#fde68a');
      ctx.font = '18px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Press P / Esc or click the game to resume', W / 2, H / 2 + 60);
      ctx.font = '14px Arial';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Move: WASD / arrows / drag  ·  Aim + hold mouse: manual fire  ·  Dash: Space / Shift  ·  Sound: M', W / 2, H / 2 + 92);
    }
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

  window.SurvivalGame = { start, stop, pause, resume, revive, dash, togglePause, getState: () => state };
})();
