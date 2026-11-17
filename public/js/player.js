(function () {
  const DASH_TIME = 0.16;
  const DASH_COOLDOWN = 1.2;
  const DASH_SPEED = 720;

  function create(x, y, avatar = 'soldier') {
    return {
      x,
      y,
      avatar,
      radius: 16,
      speed: 225,
      shield: 0,
      dashTime: 0,
      dashCooldown: 0,
      dashDir: { x: 0, y: -1 },
      buffs: { rapid: 0, speed: 0 }
    };
  }

  // move is a direction vector ({x, y}) built from keyboard and touch input.
  function update(player, move, dt, width, height) {
    let dx = move.x;
    let dy = move.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    if (length > 0.1) player.dashDir = { x: dx / Math.max(length, 1), y: dy / Math.max(length, 1) };

    let speed = player.speed * (player.buffs.speed > 0 ? 1.45 : 1);
    if (player.dashTime > 0) {
      const d = Math.hypot(player.dashDir.x, player.dashDir.y) || 1;
      dx = player.dashDir.x / d;
      dy = player.dashDir.y / d;
      speed = DASH_SPEED;
    }

    player.x = Math.max(player.radius, Math.min(width - player.radius, player.x + dx * speed * dt));
    player.y = Math.max(player.radius, Math.min(height - player.radius, player.y + dy * speed * dt));

    player.shield = Math.max(0, player.shield - dt);
    player.dashTime = Math.max(0, player.dashTime - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.buffs.rapid = Math.max(0, player.buffs.rapid - dt);
    player.buffs.speed = Math.max(0, player.buffs.speed - dt);
  }

  // Short burst of speed with a moment of invulnerability.
  function dash(player) {
    if (player.dashCooldown > 0) return false;
    player.dashTime = DASH_TIME;
    player.dashCooldown = DASH_COOLDOWN;
    player.shield = Math.max(player.shield, DASH_TIME + 0.1);
    return true;
  }

  function touching(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
  }

  function draw(ctx, player) {
    const { x, y, radius } = player;

    if (player.buffs.speed > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = player.dashTime > 0 ? 0.6 : 1;

    // Ground shadow, then the player's chosen survivor avatar
    ctx.fillStyle = 'rgba(0, 0, 0, .3)';
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.95, radius * 0.85, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    window.SurvivalAvatars.draw(ctx, player.avatar, x, y, radius);

    ctx.globalAlpha = 1;

    // Shield bubble (blinks when about to expire)
    if (player.shield > 0 && (player.shield > 0.6 || Math.floor(player.shield * 10) % 2 === 0)) {
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  window.SurvivalPlayer = {
    DASH_COOLDOWN,
    create,
    update,
    dash,
    touching,
    draw
  };
})();
