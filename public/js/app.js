const menu = document.getElementById('menu');
const screen = document.getElementById('gameScreen');
let stage = 1;
function launchStage(number) {
  stage = number;
  document.querySelector('#gameScreen h2').textContent = window.SurvivalStages.get(stage).name;
  menu.hidden = true;
  screen.hidden = false;
  window.SurvivalGame.start(stage, {
    onDeath: reason => { alert('You lost your one life: ' + reason); window.SurvivalGame.stop(); screen.hidden = true; menu.hidden = false; },
    onComplete: completed => {
      if (completed < 3) launchStage(completed + 1);
      else { alert('You escaped! (Banana revival will be added later.)'); window.SurvivalGame.stop(); screen.hidden = true; menu.hidden = false; }
    }
  });
}
document.getElementById('startBtn').addEventListener('click', () => launchStage(1));
document.getElementById('backBtn').addEventListener('click', () => { window.SurvivalGame.stop(); screen.hidden = true; menu.hidden = false; });