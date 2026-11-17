(function () {
  // Survivor avatars, drawn with canvas shapes so the same art is used in the game,
  // on the menu, on the leaderboard and in the pickers. Ids must match src/avatars.js.
  const LIST = [
    { id: 'soldier', name: 'Soldier', tagline: 'Tough and steady' },
    { id: 'ninja', name: 'Ninja', tagline: 'Silent and swift' },
    { id: 'robot', name: 'Robot', tagline: 'Built to survive' },
    { id: 'astronaut', name: 'Astronaut', tagline: 'Lost in the outbreak' },
    { id: 'knight', name: 'Knight', tagline: 'Armoured hero' },
    { id: 'pirate', name: 'Pirate', tagline: 'Fearless raider' },
    { id: 'wizard', name: 'Wizard', tagline: 'Master of tricks' },
    { id: 'alien', name: 'Alien', tagline: 'Not from here' }
  ];
  const DEFAULT = 'soldier';
  const SKIN = '#f2c49b';
  const DARK = '#111827';

  // ---- Drawing helpers ----------------------------------------------------
  function circle(ctx, x, y, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function ellipse(ctx, x, y, rx, ry, fill, rotation = 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fill();
  }
  function box(ctx, x, y, w, h, fill, radius = 0) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (radius && ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }
  function dome(ctx, x, y, r, fill) { // top half of a circle
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
  function eyes(ctx, x, y, r, eyeY, color = DARK) {
    circle(ctx, x - r * 0.32, y + r * eyeY, r * 0.11, color);
    circle(ctx, x + r * 0.32, y + r * eyeY, r * 0.11, color);
  }
  function mouth(ctx, x, y, r, mouthY, color = '#7c2d12') {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + r * mouthY, r * 0.2, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  function outline(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(0, 0, 0, .35)';
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  function clipCircle(ctx, x, y, r, paint) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    paint();
    ctx.restore();
  }

  // ---- Characters (centre x, y; head radius r) ----------------------------
  const painters = {
    soldier(ctx, x, y, r) {
      circle(ctx, x, y, r, SKIN);
      outline(ctx, x, y, r);
      dome(ctx, x, y - r * 0.02, r * 1.07, '#4d7c0f');
      circle(ctx, x - r * 0.4, y - r * 0.55, r * 0.16, '#365314');
      circle(ctx, x + r * 0.38, y - r * 0.4, r * 0.12, '#365314');
      box(ctx, x - r * 1.18, y - r * 0.12, r * 2.36, r * 0.22, '#3f6212', r * 0.1);
      eyes(ctx, x, y, r, 0.3);
      mouth(ctx, x, y, r, 0.45);
    },

    ninja(ctx, x, y, r) {
      circle(ctx, x, y, r, '#1f2937');
      clipCircle(ctx, x, y, r, () => {
        box(ctx, x - r, y - r * 0.68, r * 2, r * 0.22, '#dc2626');
      });
      // headband tails
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.9, y - r * 0.6);
      ctx.lineTo(x + r * 1.45, y - r * 0.85);
      ctx.lineTo(x + r * 1.35, y - r * 0.45);
      ctx.closePath();
      ctx.fill();
      box(ctx, x - r * 0.78, y - r * 0.3, r * 1.56, r * 0.46, SKIN, r * 0.2);
      eyes(ctx, x, y, r, -0.07);
      outline(ctx, x, y, r);
    },

    robot(ctx, x, y, r) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.8);
      ctx.lineTo(x, y - r * 1.15);
      ctx.stroke();
      circle(ctx, x, y - r * 1.2, r * 0.15, '#ef4444');
      circle(ctx, x - r * 0.95, y - r * 0.05, r * 0.16, '#64748b');
      circle(ctx, x + r * 0.95, y - r * 0.05, r * 0.16, '#64748b');
      box(ctx, x - r * 0.9, y - r * 0.82, r * 1.8, r * 1.68, '#94a3b8', r * 0.32);
      box(ctx, x - r * 0.68, y - r * 0.45, r * 1.36, r * 0.55, '#0f172a', r * 0.22);
      circle(ctx, x - r * 0.32, y - r * 0.17, r * 0.13, '#22d3ee');
      circle(ctx, x + r * 0.32, y - r * 0.17, r * 0.13, '#22d3ee');
      for (let i = -1; i <= 1; i++) box(ctx, x + i * r * 0.28 - r * 0.08, y + r * 0.3, r * 0.16, r * 0.3, '#475569', r * 0.04);
    },

    astronaut(ctx, x, y, r) {
      circle(ctx, x - r, y, r * 0.17, '#cbd5e1');
      circle(ctx, x + r, y, r * 0.17, '#cbd5e1');
      circle(ctx, x, y, r, '#f8fafc');
      outline(ctx, x, y, r);
      ellipse(ctx, x, y + r * 0.05, r * 0.72, r * 0.54, '#f59e0b');
      ellipse(ctx, x, y + r * 0.05, r * 0.64, r * 0.46, '#1e3a8a');
      ellipse(ctx, x - r * 0.25, y - r * 0.1, r * 0.2, r * 0.09, 'rgba(255, 255, 255, .75)', -0.5);
    },

    knight(ctx, x, y, r) {
      ellipse(ctx, x, y - r * 1.0, r * 0.24, r * 0.42, '#dc2626');
      circle(ctx, x, y, r, '#cbd5e1');
      outline(ctx, x, y, r);
      ellipse(ctx, x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, 'rgba(255, 255, 255, .6)', -0.6);
      box(ctx, x - r * 0.72, y - r * 0.12, r * 1.44, r * 0.18, '#1f2937', r * 0.06);
      box(ctx, x - r * 0.08, y - r * 0.12, r * 0.16, r * 0.72, '#1f2937', r * 0.06);
      circle(ctx, x - r * 0.6, y + r * 0.45, r * 0.07, '#64748b');
      circle(ctx, x + r * 0.6, y + r * 0.45, r * 0.07, '#64748b');
    },

    pirate(ctx, x, y, r) {
      circle(ctx, x, y, r, SKIN);
      outline(ctx, x, y, r);
      dome(ctx, x, y - r * 0.08, r * 1.04, '#dc2626');
      for (const [dx, dy] of [[-0.5, -0.45], [0, -0.7], [0.5, -0.45], [-0.15, -0.3], [0.3, -0.25]]) {
        circle(ctx, x + r * dx, y + r * dy, r * 0.07, '#fef2f2');
      }
      circle(ctx, x + r * 1.0, y - r * 0.15, r * 0.14, '#b91c1c');
      circle(ctx, x + r * 1.12, y + r * 0.05, r * 0.11, '#b91c1c');
      ctx.strokeStyle = DARK;
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.9, y - r * 0.15);
      ctx.lineTo(x + r * 0.95, y + r * 0.35);
      ctx.stroke();
      ellipse(ctx, x + r * 0.32, y + r * 0.22, r * 0.2, r * 0.17, DARK);
      circle(ctx, x - r * 0.32, y + r * 0.22, r * 0.11, DARK);
      mouth(ctx, x, y, r, 0.5);
    },

    wizard(ctx, x, y, r) {
      circle(ctx, x, y, r, SKIN);
      outline(ctx, x, y, r);
      ellipse(ctx, x, y + r * 0.62, r * 0.85, r * 0.62, '#e5e7eb');
      ellipse(ctx, x, y + r * 0.42, r * 0.14, r * 0.09, '#7c2d12');
      eyes(ctx, x, y, r, 0.02);
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(x - r * 0.72, y - r * 0.38);
      ctx.lineTo(x + r * 0.72, y - r * 0.38);
      ctx.lineTo(x + r * 0.35, y - r * 1.6);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, x, y - r * 0.36, r * 1.15, r * 0.24, '#6d28d9');
      circle(ctx, x + r * 0.05, y - r * 0.85, r * 0.1, '#fde047');
      circle(ctx, x + r * 0.28, y - r * 1.2, r * 0.06, '#fde047');
    },

    alien(ctx, x, y, r) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = Math.max(1, r * 0.08);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + side * r * 0.3, y - r * 0.85);
        ctx.lineTo(x + side * r * 0.55, y - r * 1.3);
        ctx.stroke();
        circle(ctx, x + side * r * 0.55, y - r * 1.32, r * 0.12, '#bbf7d0');
      }
      ellipse(ctx, x, y, r * 0.92, r * 1.04, '#4ade80');
      ellipse(ctx, x - r * 0.36, y - r * 0.05, r * 0.26, r * 0.4, DARK, 0.5);
      ellipse(ctx, x + r * 0.36, y - r * 0.05, r * 0.26, r * 0.4, DARK, -0.5);
      circle(ctx, x - r * 0.42, y - r * 0.18, r * 0.07, '#ffffff');
      circle(ctx, x + r * 0.3, y - r * 0.18, r * 0.07, '#ffffff');
      mouth(ctx, x, y, r * 0.8, 0.75, '#166534');
    }
  };

  function isValid(id) { return Object.prototype.hasOwnProperty.call(painters, id); }
  function info(id) { return LIST.find(a => a.id === id) || LIST[0]; }

  function draw(ctx, id, x, y, r) {
    ctx.save();
    (painters[id] || painters[DEFAULT])(ctx, x, y, r);
    ctx.restore();
  }

  // A crisp <canvas> showing one avatar at the given CSS size.
  function canvas(id, size) {
    const ratio = window.devicePixelRatio || 1;
    const el = document.createElement('canvas');
    el.width = el.height = Math.round(size * ratio);
    el.style.width = el.style.height = `${size}px`;
    el.className = 'avatar-canvas';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${info(id).name} avatar`);
    const ctx = el.getContext('2d');
    ctx.scale(ratio, ratio);
    draw(ctx, id, size / 2, size * 0.56, size * 0.32);
    return el;
  }

  // Grid of selectable avatars. Returns { value, select(id) }.
  function picker(container, { selected = DEFAULT, size = 56, taglines = false, onSelect } = {}) {
    let value = isValid(selected) ? selected : DEFAULT;
    const buttons = LIST.map(avatar => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'avatar-option';
      button.dataset.avatar = avatar.id;
      button.title = `${avatar.name} — ${avatar.tagline}`;
      const name = document.createElement('strong');
      name.textContent = avatar.name;
      button.append(canvas(avatar.id, size), name);
      if (taglines) {
        const tag = document.createElement('small');
        tag.textContent = avatar.tagline;
        button.append(tag);
      }
      button.addEventListener('click', () => {
        select(avatar.id);
        if (onSelect) onSelect(avatar.id);
      });
      return button;
    });
    container.replaceChildren(...buttons);

    function select(id) {
      value = isValid(id) ? id : DEFAULT;
      for (const button of buttons) {
        const on = button.dataset.avatar === value;
        button.classList.toggle('selected', on);
        button.setAttribute('aria-pressed', String(on));
      }
    }
    select(value);
    return { get value() { return value; }, select };
  }

  window.SurvivalAvatars = { list: LIST, DEFAULT, isValid, info, draw, canvas, picker };
})();
