(function () {
  // Pickups dropped by defeated enemies. Walk over one to collect it.
  const TYPES = {
    rapid: { name: 'Rapid fire!', icon: '⚡', color: '#facc15', duration: 6 },
    speed: { name: 'Speed boost!', icon: '»', color: '#38bdf8', duration: 6 },
    shield: { name: 'Shield!', icon: '✚', color: '#a78bfa', duration: 4 }
  };
  const names = Object.keys(TYPES);

  function maybeDrop(x, y, chance = 0.15) {
    if (Math.random() > chance) return null;
    const type = names[Math.floor(Math.random() * names.length)];
    return { x, y, radius: 12, type, life: 8 };
  }

  function update(list, dt) {
    for (const p of list) p.life -= dt;
    return list.filter(p => p.life > 0);
  }

  function draw(ctx, list, time) {
    for (const p of list) {
      // Blink when about to disappear.
      if (p.life < 2 && Math.floor(p.life * 8) % 2 === 0) continue;
      const info = TYPES[p.type];
      const bob = Math.sin(time * 5 + p.x) * 3;
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(info.icon, p.x, p.y + bob + 1);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.lineWidth = 1;
  }

  window.SurvivalPowerups = { TYPES, maybeDrop, update, draw };
})();
