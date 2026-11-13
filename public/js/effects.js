(function () {
  // Visual feedback (particles, floating text, screen shake) and simple synthesized sound.
  let particles = [];
  let texts = [];
  let shakeAmount = 0;

  function burst(x, y, color, count = 12, speed = 160) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      particles.push({
        x, y, color,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.5 + Math.random() * 0.3,
        size: 2 + Math.random() * 3
      });
    }
  }

  function float(x, y, text, color = '#ffffff') {
    texts.push({ x, y, text, color, life: 1.1 });
  }

  function shake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
  }

  function update(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
    for (const t of texts) {
      t.y -= 38 * dt;
      t.life -= dt;
    }
    texts = texts.filter(t => t.life > 0);
    shakeAmount = Math.max(0, shakeAmount - 40 * dt);
  }

  function applyShake(ctx) {
    if (shakeAmount <= 0) return;
    ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
  }

  function draw(ctx) {
    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Arial';
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      ctx.fillStyle = '#000000aa';
      ctx.fillText(t.text, t.x + 2, t.y + 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  function reset() {
    particles = [];
    texts = [];
    shakeAmount = 0;
  }

  // --- Sound -------------------------------------------------------------
  let audio = null;
  let muted = false;
  try { muted = localStorage.getItem('strawberry-muted') === '1'; } catch { /* storage unavailable */ }

  const presets = {
    shoot: [900, 0.05, 'square', 0.015],
    hit: [240, 0.07, 'sawtooth', 0.04],
    kill: [520, 0.14, 'triangle', 0.08],
    dash: [320, 0.16, 'sine', 0.08],
    power: [600, 0.3, 'triangle', 0.1],
    hurt: [120, 0.45, 'sawtooth', 0.12],
    tick: [440, 0.12, 'square', 0.05],
    go: [760, 0.35, 'square', 0.06]
  };

  function sound(name) {
    if (muted || !presets[name]) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const [freq, duration, wave, volume] = presets[name];
      const now = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      if (name === 'power' || name === 'go') osc.frequency.exponentialRampToValueAtTime(freq * 2, now + duration);
      if (name === 'hurt') osc.frequency.exponentialRampToValueAtTime(freq / 2, now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch { /* audio not supported */ }
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('strawberry-muted', muted ? '1' : '0'); } catch { /* ignore */ }
    return muted;
  }

  window.SurvivalEffects = {
    burst, float, shake, update, applyShake, draw, reset,
    sound, toggleMute, isMuted: () => muted
  };
})();
