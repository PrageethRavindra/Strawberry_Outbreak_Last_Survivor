const menu = document.getElementById('menu');
const screen = document.getElementById('gameScreen');
const status = document.getElementById('gameStatus');
const retry = document.getElementById('restartStageBtn');
let stage = 1;
function launchStage(number) {
  stage = number;
  status.textContent = '';
  retry.hidden = true;
  document.querySelector('#gameScreen h2').textContent = window.SurvivalStages.get(stage).name;
  menu.hidden = true;
  screen.hidden = false;
  window.SurvivalGame.start(stage, {
    onDeath: reason => { status.textContent = `Life lost: ${reason}. Banana rescue will be implemented in Commit 14.`; retry.hidden = false; },
    onComplete: completed => {
      if (completed < 3) launchStage(completed + 1);
      else { status.textContent = 'Victory! All three stages survived.'; retry.hidden = false; }
    }
  });
}
document.getElementById('startBtn').addEventListener('click', () => launchStage(1));
document.getElementById('backBtn').addEventListener('click', () => { window.SurvivalGame.stop(); screen.hidden = true; menu.hidden = false; });
retry.addEventListener('click', () => launchStage(stage));