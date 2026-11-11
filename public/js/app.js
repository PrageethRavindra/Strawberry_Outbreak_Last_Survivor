
const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");

const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

// Start button
startBtn.addEventListener("click", () => {
  menu.hidden = true;
  gameScreen.hidden = false;
});

// Back button
backBtn.addEventListener("click", () => {
  gameScreen.hidden = true;
  menu.hidden = false;
});
