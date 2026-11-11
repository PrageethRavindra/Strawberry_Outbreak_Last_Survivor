(function () {
  function create(x, y) {
    return {
      x,
      y,
      radius: 16,
      speed: 225,
      shield: 0
    };
  }

  function update(player, keys, dt, width, height) {
    let dx = Number(
      keys.has("d") || keys.has("arrowright")
    ) - Number(
      keys.has("a") || keys.has("arrowleft")
    );

    let dy = Number(
      keys.has("s") || keys.has("arrowdown")
    ) - Number(
      keys.has("w") || keys.has("arrowup")
    );

    const length = Math.hypot(dx, dy) || 1;

    player.x = Math.max(
      player.radius,
      Math.min(
        width - player.radius,
        player.x + dx / length * player.speed * dt
      )
    );

    player.y = Math.max(
      player.radius,
      Math.min(
        height - player.radius,
        player.y + dy / length * player.speed * dt
      )
    );

    player.shield = Math.max(0, player.shield - dt);
  }

  function touching(a, b) {
    return Math.hypot(
      a.x - b.x,
      a.y - b.y
    ) < a.radius + b.radius;
  }

  function draw(ctx, player) {
    ctx.fillStyle = "#f43f5e";

    ctx.beginPath();
    ctx.arc(
      player.x,
      player.y,
      player.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Strawberry leaf
    ctx.fillStyle = "#34d399";
    ctx.fillRect(
      player.x - 6,
      player.y - 24,
      12,
      10
    );
  }

  window.SurvivalPlayer = {
    create,
    update,
    touching,
    draw
  };
})();