(function () {
  function fire(player, enemies) {
    if (!enemies.length) return null;
    const target = enemies.reduce((best, current) =>
      Math.hypot(current.x - player.x, current.y - player.y) < Math.hypot(best.x - player.x, best.y - player.y) ? current : best);
    const dx = target.x - player.x, dy = target.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    return { x: player.x, y: player.y, radius: 5, vx: dx / distance * 460, vy: dy / distance * 460 };
  }

  function update(bullets, dt, width, height) {
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
    return bullets.filter(b => b.x > -10 && b.y > -10 && b.x < width + 10 && b.y < height + 10);
  }

  function draw(ctx, bullets) {
    ctx.fillStyle = '#fde047';
    for (const b of bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill(); }
  }

  window.SurvivalProjectiles = { fire, update, draw };
})();