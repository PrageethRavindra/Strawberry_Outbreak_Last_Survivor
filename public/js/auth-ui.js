(function () {
  // Behaviour for the Login / Sign up screen. Submitting is handled in app.js.
  const $ = id => document.getElementById(id);
  const section = $('authSection');
  const card = $('authCard');
  const username = $('username');
  const password = $('password');
  const confirm = $('passwordConfirm');
  const submit = $('authSubmit');
  const errorBox = $('authError');
  const USERNAME_RULE = /^[a-zA-Z0-9_]{3,20}$/;
  const ACCOUNT_FLAG = 'strawberry-has-account';

  const copy = {
    login: {
      heading: 'Welcome back, survivor',
      sub: 'Log in to continue your run.',
      submit: 'Log in',
      switchText: 'New here?',
      switchBtn: 'Create an account',
      passwordPlaceholder: 'Your password',
      autocomplete: 'current-password'
    },
    register: {
      heading: 'Join the survivors',
      sub: 'Create a player name to save your runs and leaderboard scores.',
      submit: 'Create account',
      switchText: 'Already have an account?',
      switchBtn: 'Log in instead',
      passwordPlaceholder: 'At least 8 characters',
      autocomplete: 'new-password'
    }
  };

  let mode = 'register';
  try { if (localStorage.getItem(ACCOUNT_FLAG) === '1') mode = 'login'; } catch { /* storage unavailable */ }

  // ---- Mode switching (tabs) ----------------------------------------------
  function setMode(next, focus = true) {
    mode = next;
    const text = copy[mode];
    section.dataset.mode = mode;
    for (const tab of document.querySelectorAll('.auth-tabs [role="tab"]')) {
      const selected = tab.dataset.mode === mode;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    $('authHeading').textContent = text.heading;
    $('authSub').textContent = text.sub;
    $('switchText').textContent = text.switchText;
    $('switchBtn').textContent = text.switchBtn;
    submit.textContent = text.submit;
    password.placeholder = text.passwordPlaceholder;
    password.autocomplete = text.autocomplete;
    clearError();
    refresh();
    if (focus) (username.value ? password : username).focus();
  }

  const tabs = Array.from(document.querySelectorAll('.auth-tabs [role="tab"]'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const other = tabs.find(t => t !== tab);
      other.focus();
      setMode(other.dataset.mode, false);
    });
  }
  $('switchBtn').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

  // ---- Live validation feedback -------------------------------------------
  function setState(wrap, status, hint, state, message) {
    wrap.classList.toggle('valid', state === 'ok');
    wrap.classList.toggle('invalid', state === 'bad');
    if (status) {
      status.textContent = state === 'ok' ? '✓' : state === 'bad' ? '!' : '';
      status.className = 'input-status' + (state ? ' ' + state : '');
    }
    if (hint && message !== undefined) {
      hint.textContent = message;
      hint.className = 'hint' + (state ? ' ' + state : '');
    }
  }

  function passwordStrength(value) {
    if (value.length < 8) return { score: 0, label: `Too short — ${8 - value.length} more character${value.length === 7 ? '' : 's'}` };
    let score = 1;
    if (value.length >= 12) score++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^a-zA-Z0-9]/.test(value)) score++;
    score = Math.min(score, 4);
    return { score, label: ['', 'Weak — try adding numbers or symbols', 'Okay', 'Good', 'Strong password'][score] };
  }

  function refresh() {
    const register = mode === 'register';
    const name = username.value.trim();

    // Username
    const nameWrap = username.closest('.input-wrap');
    if (!register || name === '') {
      setState(nameWrap, $('usernameStatus'), $('usernameHint'), '',
        register ? '3–20 letters, numbers or underscores.' : '');
    } else if (USERNAME_RULE.test(name)) {
      setState(nameWrap, $('usernameStatus'), $('usernameHint'), 'ok', 'Looks good!');
    } else {
      const reason = name.length < 3 ? 'At least 3 characters.' : 'Only letters, numbers and underscores.';
      setState(nameWrap, $('usernameStatus'), $('usernameHint'), 'bad', reason);
    }

    // Password strength (sign up only)
    const bar = $('strengthBar');
    if (register && password.value) {
      const { score, label } = passwordStrength(password.value);
      const colors = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#4ade80'];
      bar.style.width = `${Math.max(12, score * 25)}%`;
      bar.style.background = colors[score];
      $('passwordHint').textContent = label;
      $('passwordHint').className = 'hint' + (score === 0 ? ' bad' : score >= 3 ? ' ok' : '');
    } else {
      bar.style.width = '0';
      $('passwordHint').textContent = 'At least 8 characters.';
      $('passwordHint').className = 'hint';
    }

    // Confirm password
    const confirmWrap = confirm.closest('.input-wrap');
    if (!register || confirm.value === '') {
      setState(confirmWrap, $('confirmStatus'), $('confirmHint'), '', '');
    } else if (confirm.value === password.value) {
      setState(confirmWrap, $('confirmStatus'), $('confirmHint'), 'ok', 'Passwords match.');
    } else {
      setState(confirmWrap, $('confirmStatus'), $('confirmHint'), 'bad', 'Passwords do not match yet.');
    }
  }

  for (const input of [username, password, confirm]) {
    input.addEventListener('input', () => { clearError(); refresh(); });
  }

  // ---- Show / hide password -----------------------------------------------
  for (const button of document.querySelectorAll('.toggle-visibility')) {
    button.addEventListener('click', () => {
      const showing = password.type === 'text';
      password.type = confirm.type = showing ? 'password' : 'text';
      button.textContent = showing ? 'Show' : 'Hide';
      button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  }

  // ---- Caps Lock warning --------------------------------------------------
  function checkCaps(e) {
    if (typeof e.getModifierState === 'function') $('capsWarning').hidden = !e.getModifierState('CapsLock');
  }
  for (const input of [password, confirm]) {
    input.addEventListener('keydown', checkCaps);
    input.addEventListener('keyup', checkCaps);
    input.addEventListener('blur', () => { $('capsWarning').hidden = true; });
  }

  // ---- Falling strawberries -----------------------------------------------
  const rain = $('authRain');
  const icons = ['🍓', '🍓', '🍓', '🍌', '🍃'];
  for (let i = 0; i < 18; i++) {
    const drop = document.createElement('span');
    drop.textContent = icons[i % icons.length];
    drop.style.left = `${Math.random() * 100}%`;
    drop.style.fontSize = `${18 + Math.random() * 22}px`;
    drop.style.animationDuration = `${9 + Math.random() * 10}s`;
    drop.style.animationDelay = `${-Math.random() * 18}s`;
    rain.appendChild(drop);
  }

  // ---- Top survivors preview ----------------------------------------------
  async function loadTop() {
    try {
      const { entries } = await window.GameApi.get('/api/leaderboard');
      const list = $('authTopList');
      const medals = ['🥇', '🥈', '🥉'];
      list.replaceChildren(...entries.slice(0, 3).map((entry, i) => {
        const li = document.createElement('li');
        const medal = document.createElement('span');
        medal.className = 'medal';
        medal.textContent = medals[i];
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = entry.username;
        const pts = document.createElement('span');
        pts.className = 'pts';
        pts.textContent = `${entry.score} pts`;
        li.append(medal, name, pts);
        return li;
      }));
      $('authTop').hidden = entries.length === 0;
    } catch {
      $('authTop').hidden = true;
    }
  }

  // ---- API used by app.js -------------------------------------------------
  function validate() {
    const name = username.value.trim();
    if (!name) { username.focus(); return 'Enter your player name.'; }
    if (!password.value) { password.focus(); return 'Enter your password.'; }
    if (mode === 'register') {
      if (!USERNAME_RULE.test(name)) { username.focus(); return 'Player name must be 3–20 letters, numbers or underscores.'; }
      if (password.value.length < 8) { password.focus(); return 'Password must be at least 8 characters.'; }
      if (password.value !== confirm.value) { confirm.focus(); return 'The two passwords do not match.'; }
    }
    return '';
  }

  function showError(message) {
    errorBox.textContent = message;
    card.classList.remove('shake');
    void card.offsetWidth; // restart the animation
    card.classList.add('shake');
  }

  function clearError() { errorBox.textContent = ''; }

  function setBusy(busy) {
    submit.disabled = busy;
    submit.classList.toggle('loading', busy);
    submit.setAttribute('aria-busy', String(busy));
  }

  function rememberAccount() {
    try { localStorage.setItem(ACCOUNT_FLAG, '1'); } catch { /* ignore */ }
  }

  // Called whenever the auth screen is shown.
  function onShow() {
    password.value = '';
    confirm.value = '';
    setBusy(false);
    setMode(mode, false);
    loadTop();
    (username.value ? password : username).focus();
  }

  setMode(mode, false);

  window.AuthUI = {
    mode: () => mode,
    credentials: () => ({ username: username.value.trim(), password: password.value }),
    validate, showError, clearError, setBusy, rememberAccount, onShow
  };
})();
