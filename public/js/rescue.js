(function () {
  const panel = document.getElementById('rescuePanel');
  const image = document.getElementById('bananaImage');
  const input = document.getElementById('bananaAnswer');
  const info = document.getElementById('rescueMessage');
  const submit = document.getElementById('bananaSubmit');
  const reload = document.getElementById('bananaReload');
  let handlers = null;
  image.addEventListener('error', () => {
    info.textContent = 'Puzzle image failed to load. Try again.';
    submit.disabled = true;
  });

  async function load() {
    info.textContent = 'Loading a real Banana API puzzle...';
    image.hidden = true;
    submit.disabled = true;
    try {
      const { question } = await window.GameApi.get('/api/rescue/question');
      image.src = question;
      image.hidden = false;
      input.value = '';
      info.textContent = 'Find the missing digit (0–9). One attempt only!';
      submit.disabled = false;
      input.focus();
    } catch (error) {
      info.textContent = error.message;
    }
  }

  function open(onCorrect, onWrong) {
    handlers = { onCorrect, onWrong };
    panel.hidden = false;
    load();
  }
  function close() { panel.hidden = true; image.removeAttribute('src'); handlers = null; }

  reload.addEventListener('click', load);
  document.getElementById('rescueForm').addEventListener('submit', async e => {
    e.preventDefault();
    const answer = Number(input.value);
    if (input.value === '' || !Number.isInteger(answer) || answer < 0 || answer > 9) {
      info.textContent = 'Enter one digit between 0 and 9'; return;
    }
    submit.disabled = true;
    try {
      const result = await window.GameApi.post('/api/rescue/answer', { answer });
      const cb = result.correct ? handlers.onCorrect : handlers.onWrong;
      close();
      cb(result.run);
    } catch (error) {
      info.textContent = error.message;
      submit.disabled = false;
    }
  });

  window.GameRescue = { open, close };
})();