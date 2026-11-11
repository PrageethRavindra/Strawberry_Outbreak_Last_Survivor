
const menu = document.getElementById("menu");
const gameScreen = document.getElementById("gameScreen");

const startBtn = document.getElementById("startBtn");
const backBtn = document.getElementById("backBtn");

startBtn.addEventListener("click", () => {
  menu.hidden = true;
  gameScreen.hidden = false;

  window.SurvivalGame.start();
});

backBtn.addEventListener("click", () => {
  window.SurvivalGame.stop();

  gameScreen.hidden = true;
  menu.hidden = false;
});
