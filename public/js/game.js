
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const player = {
  x: 400,
  y: 240,
  radius: 16,
  speed: 220
};

const keys = new Set();

let playing = false;
let frameId = null;
let lastTime = 0;

// Detect keyboard input
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (
    playing &&
    ["arrowup", "arrowdown", "arrowleft", "arrowright",
     "w", "a", "s", "d"].includes(key)
  ) {
    event.preventDefault();
  }

  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

// Update player position
function update(deltaTime) {
  let dx = 0;
  let dy = 0;

  if (keys.has("w") || keys.has("arrowup")) dy--;
  if (keys.has("s") || keys.has("arrowdown")) dy++;
  if (keys.has("a") || keys.has("arrowleft")) dx--;
  if (keys.has("d") || keys.has("arrowright")) dx++;

  const length = Math.hypot(dx, dy);

  if (length > 0) {
    player.x += (dx / length) * player.speed * deltaTime;
    player.y += (dy / length) * player.speed * deltaTime;
  }

  // Keep player inside the game area
  player.x = Math.max(
    player.radius,
    Math.min(canvas.width - player.radius, player.x)
  );

  player.y = Math.max(
    player.radius,
    Math.min(canvas.height - player.radius, player.y)
  );
}

// Draw game
function draw() {
  ctx.fillStyle = "#173b2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Strawberry body
  ctx.fillStyle = "#ff477e";
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
  ctx.fillStyle = "#39d98a";
  ctx.fillRect(player.x - 4, player.y - 24, 8, 12);

  // Eyes
  ctx.fillStyle = "white";
  ctx.fillRect(player.x - 7, player.y - 4, 4, 4);
  ctx.fillRect(player.x + 3, player.y - 4, 4, 4);
}

// Game loop
function gameLoop(timestamp) {
  if (!playing) return;

  const deltaTime = Math.min(
    (timestamp - lastTime) / 1000,
    0.05
  );

  lastTime = timestamp;

  update(deltaTime);
  draw();

  frameId = requestAnimationFrame(gameLoop);
}

function startGame() {
  stopGame();

  player.x = canvas.width / 2;
  player.y = canvas.height / 2;

  keys.clear();
  playing = true;

  lastTime = performance.now();
  frameId = requestAnimationFrame(gameLoop);
}

function stopGame() {
  playing = false;
  keys.clear();

  if (frameId !== null) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
}

window.SurvivalGame = {
  start: startGame,
  stop: stopGame
};
