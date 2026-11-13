(function () {
  const SAFE_DISTANCE = 150;

  // Never spawn right next to the player, so deaths are never unavoidable.
  function spawn(width, height, stage, boss = false, player = null) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const enemy = spawnAtEdge(width, height, stage, boss);
      if (!player || Math.hypot(enemy.x - player.x, enemy.y - player.y) >= SAFE_DISTANCE) return enemy;
    }
    // Fallback: the edge point opposite the player.
    const enemy = spawnAtEdge(width, height, stage, boss);
    enemy.x = player.x < width / 2 ? width - 15 : 15;
    enemy.y = player.y < height / 2 ? height - 15 : 15;
    return enemy;
  }

  function spawnAtEdge(width, height, stage, boss) {
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

    if (boss) {
      return {
        x,
        y,
        radius: 34,
        speed: stage.enemySpeed * 0.55,
        hp: stage.bossHp,
        maxHp: stage.bossHp,
        boss: true,
        flash: 0
      };
    }

    // Enemy variants: fast "runners" and tough "tanks" make later stages harder.
    const roll = Math.random();
    const runnerChance = stage.runnerChance || 0;
    const tankChance = stage.tankChance || 0;
    let kind = 'normal';
    if (roll < runnerChance) kind = 'runner';
    else if (roll < runnerChance + tankChance) kind = 'tank';

    const variants = {
      normal: { radius: 13, speed: 1, hp: 1, color: '#fb923c' },
      runner: { radius: 10, speed: 1.6, hp: 1, color: '#ef4444' },
      tank: { radius: 18, speed: 0.75, hp: 3, color: '#65a30d' }
    };
    const v = variants[kind];

    return {
      x,
      y,
      kind,
      color: v.color,
      radius: v.radius,
      speed: stage.enemySpeed * v.speed * (0.9 + Math.random() * 0.2),
      hp: v.hp,
      maxHp: v.hp,
      boss: false,
      flash: 0
    };
  }

  function update(enemies, player, dt) {
    for (const enemy of enemies) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;

      const distance = Math.hypot(dx, dy) || 1;

      enemy.x += dx / distance * enemy.speed * dt;
      enemy.y += dy / distance * enemy.speed * dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
    }
  }

  function draw(ctx, enemies, player) {
    for (const enemy of enemies) {
      const base = enemy.boss ? '#a855f7' : enemy.color;
      ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : base;

      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // Eyes that look toward the player
      const angle = player ? Math.atan2(player.y - enemy.y, player.x - enemy.x) : 0;
      const eyeOffset = enemy.radius * 0.35;
      const eyeSize = enemy.radius * 0.22;
      ctx.fillStyle = '#111827';
      for (const side of [-1, 1]) {
        const ex = enemy.x + Math.cos(angle) * eyeOffset + Math.cos(angle + Math.PI / 2) * side * eyeOffset * 0.8;
        const ey = enemy.y + Math.sin(angle) * eyeOffset + Math.sin(angle + Math.PI / 2) * side * eyeOffset * 0.8;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.boss || enemy.maxHp > 1) {
        const w = enemy.radius * 2;
        ctx.fillStyle = '#00000088';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 14, w, 6);
        ctx.fillStyle = '#f0abfc';
        ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 14, w * (enemy.hp / enemy.maxHp), 6);
      }
    }
  }

  window.SurvivalEnemies = {
    spawn,
    update,
    draw
  };
})();
