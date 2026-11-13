(function () {
  const SPEED = 460;

  function bulletToward(player, tx, ty) {
    const dx = tx - player.x, dy = ty - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return null;
    return { x: player.x, y: player.y, radius: 5, vx: dx / distance * SPEED, vy: dy / distance * SPEED };
  }

  // Automatic fire: aim at the closest enemy.
  function fire(player, enemies) {
    if (!enemies.length) return null;
    const target = enemies.reduce((best, current) =>
      Math.hypot(current.x - player.x, current.y - player.y) < Math.hypot(best.x - player.x, best.y - player.y) ? current : best);
    return bulletToward(player, target.x, target.y);
  }

  // Manual fire: aim at a point chosen by the player (mouse cursor).
  function fireAt(player, x, y) {
    return bulletToward(player, x, y);
  }

  function update(bullets, dt, width, height) {
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    return bullets.filter(b => b.x > -10 && b.y > -10 && b.x < width + 10 && b.y < height + 10);
  }

  function draw(ctx, bullets) {
    ctx.fillStyle = '#fde047';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); }
  }

  window.SurvivalProjectiles = { fire, fireAt, update, draw };
})();
