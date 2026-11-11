(function () {
  function spawn(width, height, stage) {
    const side = Math.floor(Math.random() * 4);

    const x = side === 0
      ? 15
      : side === 1
        ? width - 15
        : Math.random() * width;

    const y = side === 2
      ? 15
      : side === 3
        ? height - 15
        : Math.random() * height;

    return {
      x,
      y,
      radius: 13,
      speed: stage.enemySpeed,
      hp: 1
    };
  }

  function update(enemies, player, dt) {
    for (const enemy of enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;

      const distance = Math.hypot(dx, dy) || 1;

      enemy.x += dx / distance * enemy.speed * dt;
      enemy.y += dy / distance * enemy.speed * dt;
    }
  }

  function draw(ctx, enemies) {
    for (const enemy of enemies) {
      ctx.fillStyle = "#fb923c";

      ctx.beginPath();
      ctx.arc(
        enemy.x,
        enemy.y,
        enemy.radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  window.SurvivalEnemies = {
    spawn,
    update,
    draw
  };
})();