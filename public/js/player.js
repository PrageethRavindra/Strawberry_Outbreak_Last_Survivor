(function () {
  const DASH_TIME = 0.16;
  const DASH_COOLDOWN = 1.2;
  const DASH_SPEED = 720;

  function create(x, y) {
    return {
      x,
      y,
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

    // Strawberry body
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Seeds
    ctx.fillStyle = '#fde68a';
    for (const [sx, sy] of [[-7, -3], [0, -6], [7, -3], [-4, 5], [4, 5], [0, 11]]) {
      ctx.fillRect(x + sx - 1, y + sy - 1, 2, 3);
    }

    // Leaves
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - radius + 2);
    ctx.lineTo(x, y - radius - 8);
    ctx.lineTo(x + 10, y - radius + 2);
    ctx.lineTo(x, y - radius + 5);
    ctx.closePath();
    ctx.fill();

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
