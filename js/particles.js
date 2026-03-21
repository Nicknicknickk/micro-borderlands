/* ==========================================
   PARTICLES.JS — Particle system
   ========================================== */

function spawnParticles(x, y, color, count, speedStr, lifeStr) {
  for (let i = 0; i < count; i++) {
    const ang  = Math.random() * Math.PI * 2;
    const spd  = Math.random() * speedStr;
    const life = Math.floor(Math.random() * lifeStr) + lifeStr / 2;
    lhParticles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      c: color,
      life,
      maxLife: life,
      size: Math.random() * 4 + 2
    });
  }
}

function updateAndDrawParticles() {
  for (let i = lhParticles.length - 1; i >= 0; i--) {
    const p = lhParticles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    if (p.life <= 0) lhParticles.splice(i, 1);
  }
  ctx.globalAlpha = 1.0;
}