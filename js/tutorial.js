/* ==========================================
   TUTORIAL.JS — Claptrap Intro Scene
   Triggers only on first ever launch
   ========================================== */

let inTutorial       = false;
let tutorialStep     = 0;
let tutorialComplete = false;
let tutorialTarget   = null;
let tutorialTargetHit= false;
let tutorialTimer    = 0;
let tutorialParticles= [];
let tutorialDone     = parseInt(localStorage.getItem('tutorialDone')) || 0;
let clapX            = -150;
let clapY            = 300;
let clapTargetX      = 200;
let clapSliding      = true;
let clapBobTimer     = 0;
let blizzardParticles= [];

// ── Claptrap dialogue lines ────────────────
const clapLines = [
  "OH BABY BABY BABY! Is someone there?!\nI've been stuck in this blizzard for\nLITERALLY forever! Well... 20 minutes.",
  "The name's CL4P-TP but you can call me\nCLAPTRAP! I'm your BEST FRIEND and also\nyour ONLY friend. Probably.",
  "Welcome to Pandora, vault hunter!\nIt's a beautiful place full of\npsychos, explosions and LOOT!",
  "Before we go to Sanctuary I need to\nmake sure you're not completely useless.\nPress WASD or Arrow Keys to MOVE!",
  "AMAZING! You can walk! You're basically\nalready a legend. Now — see that target?\nSHOOT IT! Click to fire your gun!",
  "WOOHOO! You're a NATURAL born killer!\nNow let's get to Sanctuary!\nCLICK ANYWHERE to follow me!"
];

// ── Init blizzard particles ────────────────
function initBlizzard() {
  blizzardParticles = [];
  for (let i = 0; i < 200; i++) {
    blizzardParticles.push({
      x: Math.random() * 800,
      y: Math.random() * 450,
      vx: -1 - Math.random() * 3,
      vy: 0.5 + Math.random() * 1.5,
      size: Math.random() * 3 + 1,
      alpha: 0.3 + Math.random() * 0.7
    });
  }
}

// ── Check if tutorial should run ──────────
function shouldRunTutorial() {
  return tutorialDone === 0;
}

// ── Start tutorial ────────────────────────
function startTutorial() {
  inTutorial        = true;
  tutorialStep      = 0;
  tutorialTimer     = 0;
  tutorialTargetHit = false;
  tutorialTarget    = null;
  clapX             = -150;
  clapY             = 300;
  clapSliding       = true;
  clapBobTimer      = 0;
  initBlizzard();
  window.setMusicState('sanctuary');
  gCanvas.style.cursor = 'crosshair';

  const charClass = localStorage.getItem('borderClass') || 'zero';
  lhPlayer = {
    x: 500, y: 280,
    hp: 150, maxHp: 150,
    shield: 50, maxShield: 50,
    shieldRechargeDelay: 0,
    grenades: 3, maxGrenades: 3, grenadeCooldown: 0,
    skillTimer: 0, skillCooldown: 0,
    win: false, dead: false,
    char: charClass,
    gun: { name: 'Starter Pistol', c: '#fff', dmg: 20, fr: 12, spd: 10, timer: 0, wType: 'Pistol' },
    vehicleHp: 2500, maxVehicleHp: 2500, vehicleCooldown: 0,
    mods: { dmg: 0, cd: 0, crit: 0, elem: 0, pet: 0, fr: 0, melee: 0 },
    lastX: 500, lastY: 280
  };

  lhBullets = []; lhEnemyBullets = []; lhParticles = []; lhDmgText = [];
  lhCam = { x: 0, y: 0 };

  gCanvas.onmousemove = (e) => {
    const rect = gCanvas.getBoundingClientRect();
    lhMouse.screenX = (e.clientX - rect.left) * (gCanvas.width / rect.width);
    lhMouse.screenY = (e.clientY - rect.top)  * (gCanvas.height / rect.height);
  };

  gCanvas.onmousedown = () => {
    // Step 5 = last line → complete tutorial on click
    if (tutorialStep === 5) {
      completeTutorial();
    // Step 4 = shooting phase → shoot
    } else if (tutorialStep === 4 && !tutorialTargetHit) {
      shootTutorial();
    // Step 3 = movement phase → do nothing, wait for movement
    } else if (tutorialStep === 3) {
      return;
    // All other steps → advance dialogue
    } else {
      advanceTutorial();
    }
  };

  gCanvas.onmouseup = null;
  loopTutorial();
}

// ── Advance dialogue ───────────────────────
function advanceTutorial() {
  playSound('coin');
  tutorialStep++;
  if (tutorialStep === 4) {
    tutorialTarget = { x: 650, y: 230, hp: 3, maxHp: 3, flash: 0 };
  }
}

// ── Shoot in tutorial ─────────────────────
function shootTutorial() {
  if (!tutorialTarget || tutorialTargetHit) return;
  if (lhPlayer.gun.timer > 0) return;
  lhPlayer.gun.timer = 12;
  playShootSound('Pistol', lhPlayer.x);
  const ang = Math.atan2(lhMouse.screenY - lhPlayer.y, lhMouse.screenX - lhPlayer.x);
  lhBullets.push({
    x: lhPlayer.x, y: lhPlayer.y,
    vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10,
    dmg: 20, c: '#fff', pierce: false, isRocket: false,
    isSniper: false, hitList: []
  });
  spawnParticles(lhPlayer.x + Math.cos(ang) * 15, lhPlayer.y + Math.sin(ang) * 15, '#fff', 3, 1.5, 10);
}

// ── Complete tutorial ─────────────────────
function completeTutorial() {
  if (tutorialDone === 1) return;
  tutorialDone = 1;
  localStorage.setItem('tutorialDone', 1);
  inTutorial = false;
  playSound('levelup');
  spawnParticles(400, 225, '#ffcc00', 100, 8, 80);
  gCanvas.onmousedown = null;
  if (animId) cancelAnimationFrame(animId);
  setTimeout(() => {
    startSanctuary();
    setTimeout(() => window.initMobileIfNeeded(), 150);
  }, 1500);
}

// ── Main tutorial loop ────────────────────
function loopTutorial() {
  if (!inTutorial) return;
  ctx.clearRect(0, 0, gCanvas.width, gCanvas.height);
  tutorialTimer++;
  clapBobTimer++;

  // ── Blizzard background ──────────────────
  ctx.fillStyle = '#0a1520';
  ctx.fillRect(0, 0, 800, 450);

  ctx.fillStyle = '#c8dce8';
  ctx.fillRect(0, 380, 800, 70);

  ctx.fillStyle = '#d8ecf8';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(80 + i * 100, 385, 60 + Math.sin(i) * 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#1a2535';
  ctx.beginPath(); ctx.moveTo(0, 320); ctx.lineTo(120, 200); ctx.lineTo(240, 320); ctx.fill();
  ctx.beginPath(); ctx.moveTo(150, 320); ctx.lineTo(300, 160); ctx.lineTo(450, 320); ctx.fill();
  ctx.beginPath(); ctx.moveTo(400, 320); ctx.lineTo(550, 180); ctx.lineTo(700, 320); ctx.fill();
  ctx.beginPath(); ctx.moveTo(600, 320); ctx.lineTo(720, 210); ctx.lineTo(800, 320); ctx.fill();

  ctx.fillStyle = '#c8dce8';
  ctx.beginPath(); ctx.moveTo(100, 215); ctx.lineTo(120, 200); ctx.lineTo(140, 215); ctx.fill();
  ctx.beginPath(); ctx.moveTo(270, 175); ctx.lineTo(300, 160); ctx.lineTo(330, 175); ctx.fill();
  ctx.beginPath(); ctx.moveTo(520, 195); ctx.lineTo(550, 180); ctx.lineTo(580, 195); ctx.fill();
  ctx.beginPath(); ctx.moveTo(695, 225); ctx.lineTo(720, 210); ctx.lineTo(745, 225); ctx.fill();

  blizzardParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < -5) p.x = 805;
    if (p.y > 455) p.y = -5;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1.0;

  ctx.fillStyle = 'rgba(150, 200, 255, 0.04)';
  ctx.fillRect(0, 0, 800, 450);

  // ── Claptrap sliding in ──────────────────
  if (clapSliding) {
    clapX += (clapTargetX - clapX) * 0.08;
    if (Math.abs(clapX - clapTargetX) < 2) { clapX = clapTargetX; clapSliding = false; playSound('ability'); }
  }

  const bobY = clapY + Math.sin(clapBobTimer * 0.05) * 4;
  ctx.save();
  ctx.translate(clapX, bobY);

  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(0, 35, 18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(0, 35, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffcc00';
  for (let s = 0; s < 4; s++) {
    const sa = (Math.PI / 2) * s + tutorialTimer * 0.05;
    ctx.fillRect(Math.cos(sa) * 8 - 3, 35 + Math.sin(sa) * 8 - 3, 6, 6);
  }

  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(-25, -20, 50, 55);
  ctx.fillStyle = '#ff8800';
  ctx.fillRect(-20, -15, 40, 10);

  ctx.fillStyle = '#00ccff';
  ctx.fillRect(-18, -8, 36, 25);
  ctx.fillStyle = '#0066ff';
  ctx.fillRect(-8, -3, 16, 15);

  const eyeAng = Math.atan2(lhMouse.screenY - (bobY - 5), lhMouse.screenX - clapX);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(Math.cos(eyeAng) * 4, -3 + Math.sin(eyeAng) * 4, 5, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, -45); ctx.stroke();
  ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(0, -45, 5, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 6;
  const armSwing = Math.sin(clapBobTimer * 0.08) * 15;
  ctx.beginPath(); ctx.moveTo(-25, 5); ctx.lineTo(-45, 15 + armSwing); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(25, 5); ctx.lineTo(45, 15 - armSwing); ctx.stroke();
  ctx.restore();

  // ── Player movement (steps 3+) ────────────
  if (tutorialStep >= 3) {
    const spd = 4;
    if (keys['KeyW'] || keys['ArrowUp'])    lhPlayer.y = Math.max(200, lhPlayer.y - spd);
    if (keys['KeyS'] || keys['ArrowDown'])  lhPlayer.y = Math.min(370, lhPlayer.y + spd);
    if (keys['KeyA'] || keys['ArrowLeft'])  lhPlayer.x = Math.max(250, lhPlayer.x - spd);
    if (keys['KeyD'] || keys['ArrowRight']) lhPlayer.x = Math.min(780, lhPlayer.x + spd);

    if (tutorialStep === 3) {
      const moved = Math.abs(lhPlayer.x - 500) > 30 || Math.abs(lhPlayer.y - 280) > 20;
      if (moved) {
        playSound('coin');
        tutorialStep = 4;
        tutorialTarget = { x: 650, y: 230, hp: 3, maxHp: 3, flash: 0 };
      }
    }
    drawPixelSprite(ctx, lhPlayer.char, lhPlayer.x, lhPlayer.y, 30);
  }

  // ── Tutorial target ───────────────────────
  if (tutorialTarget && !tutorialTargetHit) {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(tutorialTarget.x - 3, tutorialTarget.y, 6, 50);

    ctx.fillStyle = tutorialTarget.flash > 0 ? '#fff' : '#cc0000';
    ctx.fillRect(tutorialTarget.x - 25, tutorialTarget.y - 40, 50, 40);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(tutorialTarget.x - 25, tutorialTarget.y - 40, 50, 40);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('SHOOT', tutorialTarget.x, tutorialTarget.y - 18);
    ctx.fillText('ME!',   tutorialTarget.x, tutorialTarget.y - 3);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#333'; ctx.fillRect(tutorialTarget.x - 25, tutorialTarget.y - 50, 50, 7);
    ctx.fillStyle = '#f00'; ctx.fillRect(tutorialTarget.x - 25, tutorialTarget.y - 50, (tutorialTarget.hp / tutorialTarget.maxHp) * 50, 7);

    if (tutorialTarget.flash > 0) tutorialTarget.flash--;

    if (lhPlayer.gun.timer > 0) lhPlayer.gun.timer--;
    for (let i = lhBullets.length - 1; i >= 0; i--) {
      const b = lhBullets[i]; b.x += b.vx; b.y += b.vy;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx * 2, b.y - b.vy * 2); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (Math.hypot(b.x - tutorialTarget.x, b.y - tutorialTarget.y) < 30) {
        tutorialTarget.hp--; tutorialTarget.flash = 8;
        playSound('hit', tutorialTarget.x);
        spawnParticles(tutorialTarget.x, tutorialTarget.y, '#f00', 15, 4, 20);
        lhDmgText.push({ x: tutorialTarget.x, y: tutorialTarget.y - 50, txt: '20', life: 30, c: '#fff' });
        lhBullets.splice(i, 1);
        if (tutorialTarget.hp <= 0) {
          tutorialTargetHit = true;
          playSound('die', tutorialTarget.x);
          spawnParticles(tutorialTarget.x, tutorialTarget.y, '#ffcc00', 40, 6, 40);
          lhDmgText.push({ x: tutorialTarget.x, y: tutorialTarget.y - 60, txt: 'TARGET DOWN!', life: 80, c: '#ffcc00' });
          setTimeout(() => { tutorialStep = 5; playSound('coin'); }, 1000);
        }
      }
      if (b.x < 0 || b.x > 800 || b.y < 0 || b.y > 450) lhBullets.splice(i, 1);
    }
  }

  // ── Damage text ───────────────────────────
  for (let i = lhDmgText.length - 1; i >= 0; i--) {
    const d = lhDmgText[i]; d.y -= 1; d.life--;
    ctx.fillStyle = d.c; ctx.font = 'bold 16px Courier'; ctx.textAlign = 'center';
    ctx.fillText(d.txt, d.x, d.y); ctx.textAlign = 'left';
    if (d.life <= 0) lhDmgText.splice(i, 1);
  }

  // ── Particles ─────────────────────────────
  for (let i = lhParticles.length - 1; i >= 0; i--) {
    const p = lhParticles[i]; p.x += p.vx; p.y += p.vy; p.life--;
    ctx.globalAlpha = p.life / p.maxLife; ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    if (p.life <= 0) lhParticles.splice(i, 1);
  }
  ctx.globalAlpha = 1.0;

  // ── Dialogue box ─────────────────────────
  if (tutorialStep < clapLines.length) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 350, 800, 100);
    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3;
    ctx.strokeRect(0, 350, 800, 100);

    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(10, 360, 60, 80);
    ctx.fillStyle = '#00ccff';
    ctx.fillRect(18, 368, 44, 30);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('CL4P-TP', 40, 455);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('CLAPTRAP', 85, 372);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Courier New';
    const lines = clapLines[tutorialStep].split('\n');
    lines.forEach((line, i) => ctx.fillText(line, 85, 392 + i * 20));

    ctx.fillStyle = '#888';
    ctx.font = '12px Arial'; ctx.textAlign = 'right';
    ctx.fillText(`${tutorialStep + 1}/${clapLines.length}`, 790, 442);

    if (tutorialStep === 3) {
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 13px Courier'; ctx.textAlign = 'right';
      ctx.fillText('[ MOVE WITH WASD / ARROW KEYS ]', 790, 458);
    } else if (tutorialStep === 4) {
      ctx.fillStyle = '#ff4500';
      ctx.font = 'bold 13px Courier'; ctx.textAlign = 'right';
      ctx.fillText('[ CLICK TO SHOOT ]', 790, 458);
    } else {
      ctx.fillStyle = Math.floor(tutorialTimer / 20) % 2 === 0 ? '#ffcc00' : '#888';
      ctx.font = '12px Courier'; ctx.textAlign = 'right';
      ctx.fillText('[ CLICK TO CONTINUE ]', 790, 458);
    }
    ctx.textAlign = 'left';
  }

  // Golden flash on step 5
  if (tutorialStep === 5) {
    ctx.fillStyle = `rgba(255,204,0,${0.05 + Math.sin(tutorialTimer * 0.1) * 0.05})`;
    ctx.fillRect(0, 0, 800, 450);
  }

  animId = requestAnimationFrame(loopTutorial);
}