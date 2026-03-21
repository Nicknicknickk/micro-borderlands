/* ==========================================
   MAPS.JS — New Map Definitions v1.0
   Opportunity, Tundra Express,
   Wildlife Preserve
   ========================================== */

// ── Extended map data ──────────────────────
// Adds to the existing mapData array in state.js
const extraMaps = [
  {
    name: 'OPPORTUNITY',
    bg: '#1a1a2e', dot: '#16213e', line: '#0f3460',
    req: 15,
    desc: "Hyperion City: Wall turrets fire at you!",
    special: 'turrets'
  },
  {
    name: 'TUNDRA EXPRESS',
    bg: '#8bb8d6', dot: '#a8d0e6', line: '#6a9bbf',
    req: 25,
    desc: "A train runs through! Get out of the way!",
    special: 'train'
  },
  {
    name: 'WILDLIFE PRESERVE',
    bg: '#1a3a1a', dot: '#2a5a2a', line: '#143014',
    req: 35,
    desc: "Destroy Eridium nests to stop spawning!",
    special: 'nests'
  }
];

// ── Map special objects ────────────────────
let mapTurrets   = [];
let trainX       = -200;
let trainDir     = 1;
let trainSpeed   = 5;
let trainWarning = 0;
let mapNests     = [];

// ── Init map specials ──────────────────────
function initMapSpecials(mapIndex) {
  mapTurrets = []; mapNests = [];
  trainX = -200; trainDir = 1; trainWarning = 0;

  const allMaps = [...mapData, ...extraMaps];
  if (mapIndex >= allMaps.length) return;
  const map = allMaps[mapIndex];

  if (map.special === 'turrets') {
    // Place wall turrets around the edges
    for(let i = 0; i < 8; i++) {
      const side = Math.floor(i/2) % 4;
      let tx, ty;
      if(side===0) { tx=200+i*200; ty=50; }
      else if(side===1) { tx=WORLD_W-50; ty=200+i*150; }
      else if(side===2) { tx=200+i*200; ty=WORLD_H-50; }
      else { tx=50; ty=200+i*150; }
      mapTurrets.push({ x:tx, y:ty, hp:500, maxHp:500, cd:120, active:true });
    }
  }

  if (map.special === 'nests') {
    // Place 4 spawn nests
    for(let n=0; n<4; n++) {
      mapNests.push({
        x: 300 + n*400, y: 300 + (n%2)*600,
        hp: 2000, maxHp: 2000,
        cd: 180, active: true,
        spawnType: ['skag','bullymong','stalker','normal'][n]
      });
    }
  }
}

// ── Draw Opportunity (Hyperion City) ────────
function drawOpportunity(ctx, cam) {
  // Buildings
  const buildings = [
    {x:200,y:100,w:120,h:300},{x:400,y:50,w:80,h:350},
    {x:600,y:120,w:150,h:280},{x:900,y:80,w:100,h:320},
    {x:1100,y:150,w:130,h:250},{x:1400,y:60,w:90,h:340},
    {x:1600,y:100,w:110,h:300},{x:1800,y:80,w:140,h:320}
  ];

  buildings.forEach(b => {
    // Building body
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Hyperion stripes
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(b.x, b.y, b.w, 8);
    ctx.fillRect(b.x, b.y + b.h - 8, b.w, 8);
    // Windows
    ctx.fillStyle = 'rgba(0,200,255,0.3)';
    for(let wr=0; wr<5; wr++) {
      for(let wc=0; wc<3; wc++) {
        ctx.fillRect(b.x+10+wc*35, b.y+20+wr*50, 20, 30);
      }
    }
    // Hyperion logo
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 20px Arial'; ctx.textAlign='center';
    ctx.fillText('H', b.x + b.w/2, b.y + b.h/2);
    ctx.textAlign='left';
  });

  // Active turrets
  mapTurrets.forEach((t, idx) => {
    if(!t.active) return;
    // Turret base
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(t.x-15, t.y-15, 30, 30);
    ctx.fillStyle = '#333';
    ctx.fillRect(t.x-10, t.y-10, 20, 20);
    // HP bar
    ctx.fillStyle = '#000'; ctx.fillRect(t.x-20, t.y-25, 40, 6);
    ctx.fillStyle = '#0f0'; ctx.fillRect(t.x-20, t.y-25, (t.hp/t.maxHp)*40, 6);
    // Barrel pointing at player
    if(lhPlayer) {
      const tAng = Math.atan2(lhPlayer.y - t.y, lhPlayer.x - t.x);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(tAng)*20, t.y + Math.sin(tAng)*20); ctx.stroke();
    }
  });
}

// ── Draw Tundra Express ────────────────────
function drawTundraExpress(ctx, cam) {
  // Train tracks
  ctx.strokeStyle = '#555'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, WORLD_H/2 - 30); ctx.lineTo(WORLD_W, WORLD_H/2 - 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, WORLD_H/2 + 30); ctx.lineTo(WORLD_W, WORLD_H/2 + 30); ctx.stroke();

  // Track ties
  ctx.strokeStyle = '#8b4513'; ctx.lineWidth = 4;
  for(let tx=0; tx<WORLD_W; tx+=60) {
    ctx.beginPath(); ctx.moveTo(tx, WORLD_H/2-35); ctx.lineTo(tx, WORLD_H/2+35); ctx.stroke();
  }

  // Train warning sign
  if(trainWarning > 0) {
    ctx.fillStyle = `rgba(255,0,0,${Math.sin(trainWarning*0.2)*0.5+0.5})`;
    ctx.fillRect(0, WORLD_H/2-80, WORLD_W, 160);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px Arial'; ctx.textAlign='center';
    ctx.fillText('⚠ TRAIN INCOMING! ⚠', WORLD_W/2, WORLD_H/2 + 15);
    ctx.textAlign='left';
  }

  // Draw train
  if(trainX > -300 && trainX < WORLD_W + 300) {
    ctx.save();
    ctx.translate(trainX, WORLD_H/2);
    if(trainDir < 0) { ctx.scale(-1, 1); }

    // Train cars
    const cars = 5;
    for(let c=0; c<cars; c++) {
      const cx = c * 180;
      // Car body
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(cx-5, -40, 170, 80);
      // Windows
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(cx+10, -30, 40, 30);
      ctx.fillRect(cx+70, -30, 40, 30);
      ctx.fillRect(cx+130, -30, 30, 30);
      // Wheels
      ctx.fillStyle = '#333';
      [cx+20, cx+80, cx+140].forEach(wx => {
        ctx.beginPath(); ctx.arc(wx, 42, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(wx, 42, 8, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#333';
      });
    }
    // Engine
    ctx.fillStyle = '#880000';
    ctx.fillRect(-100, -50, 110, 100);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath(); ctx.arc(-90, -50, 20, Math.PI, Math.PI*2); ctx.fill();
    // Smoke
    for(let s=0; s<3; s++) {
      ctx.globalAlpha = 0.4 - s*0.1;
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(-90 - s*20 * trainDir, -70 - s*15, 15+s*5, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

// ── Draw Wildlife Preserve ─────────────────
function drawWildlifePreserve(ctx, cam) {
  // Dense foliage patches
  const foliage = [
    {x:150,y:150},{x:500,y:300},{x:800,y:100},
    {x:1100,y:400},{x:1400,y:200},{x:1700,y:350},
    {x:300,y:700},{x:700,y:900},{x:1000,y:700},
    {x:1300,y:1000},{x:1600,y:800},{x:300,y:1200}
  ];

  foliage.forEach(f => {
    // Bush cluster
    [0,30,-25,15,-15].forEach((ox,i) => {
      const oy = [0,-20,10,-10,20][i];
      ctx.fillStyle = ['#1a5c1a','#2a7a2a','#1e6e1e','#226622','#1a5c1a'][i];
      ctx.beginPath(); ctx.arc(f.x+ox, f.y+oy, 25+i*5, 0, Math.PI*2); ctx.fill();
    });
  });

  // Eridium nest structures
  mapNests.forEach((nest, idx) => {
    if(!nest.active) return;
    // Nest glow
    const pulse = Math.sin(Date.now()/300 + idx) * 0.3 + 0.5;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#a000ff';
    ctx.beginPath(); ctx.arc(nest.x, nest.y, 50, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1.0;
    // Nest structure
    ctx.fillStyle = '#4a0088';
    for(let s=0; s<6; s++) {
      const sa = (Math.PI*2/6)*s;
      ctx.beginPath(); ctx.moveTo(nest.x, nest.y);
      ctx.lineTo(nest.x+Math.cos(sa)*40, nest.y+Math.sin(sa)*40);
      ctx.lineTo(nest.x+Math.cos(sa+0.5)*30, nest.y+Math.sin(sa+0.5)*30);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#8800ff';
    ctx.beginPath(); ctx.arc(nest.x, nest.y, 20, 0, Math.PI*2); ctx.fill();
    // HP bar
    ctx.fillStyle = '#000'; ctx.fillRect(nest.x-30, nest.y-60, 60, 8);
    ctx.fillStyle = '#a000ff'; ctx.fillRect(nest.x-30, nest.y-60, (nest.hp/nest.maxHp)*60, 8);
    // Label
    ctx.fillStyle = '#fff'; ctx.font = '11px Arial'; ctx.textAlign='center';
    ctx.fillText('NEST', nest.x, nest.y-65); ctx.textAlign='left';
  });
}

// ── Update map specials each frame ─────────
function updateMapSpecials(mayhemMult) {
  if(!lhPlayer) return;

  const allMaps = [...mapData, ...extraMaps];
  if(activeMapIndex >= allMaps.length) return;
  const map = allMaps[activeMapIndex];

  // ── OPPORTUNITY TURRETS ──────────────────
  if(map.special === 'turrets') {
    mapTurrets.forEach((t, idx) => {
      if(!t.active) return;
      t.cd--;
      if(t.cd <= 0 && lhPlayer) {
        const dist = Math.hypot(lhPlayer.x - t.x, lhPlayer.y - t.y);
        if(dist < 600) {
          const ang = Math.atan2(lhPlayer.y-t.y, lhPlayer.x-t.x);
          lhEnemyBullets.push({x:t.x, y:t.y, vx:Math.cos(ang)*7, vy:Math.sin(ang)*7, dmg:15*mayhemMult, c:'#ffcc00'});
          playSound('shoot', t.x);
          t.cd = 90;
        }
      }
      // Check if turret was hit by player bullets
      lhBullets.forEach((b, bi) => {
        if(Math.hypot(b.x-t.x, b.y-t.y) < 20) {
          t.hp -= b.dmg;
          lhBullets.splice(bi, 1);
          spawnParticles(t.x, t.y, '#ffcc00', 10, 3, 15);
          if(t.hp <= 0) {
            t.active = false;
            playSound('explosion', t.x);
            spawnParticles(t.x, t.y, '#ff4500', 30, 5, 30);
            playerCoins += 200;
            gainExp(100 * mayhemMult);
          }
        }
      });
    });
  }

  // ── TUNDRA EXPRESS TRAIN ─────────────────
  if(map.special === 'train') {
    trainX += trainSpeed * trainDir;

    // Reverse at edges
    if(trainX > WORLD_W + 200) { trainDir = -1; trainWarning = 0; }
    if(trainX < -1000) {
      trainDir = 1;
      trainWarning = 0;
      // Schedule next warning
      setTimeout(() => { trainWarning = 120; }, 5000);
    }

    // Warn before train arrives
    if(trainWarning > 0) { trainWarning--; trainSpeed = 8; }
    else { trainSpeed = 5; }

    // Train kills enemies it touches
    lhEnemies.forEach((e, ei) => {
      const trainTop = WORLD_H/2 - 50;
      const trainBot = WORLD_H/2 + 50;
      if(e.y > trainTop && e.y < trainBot) {
        const trainLeft  = Math.min(trainX, trainX + 5*180);
        const trainRight = Math.max(trainX, trainX + 5*180);
        if(e.x > trainLeft && e.x < trainRight) {
          e.hp -= 99999; // instant kill
          playSound('explosion', e.x);
          spawnParticles(e.x, e.y, '#ff4500', 30, 6, 30);
          lhDmgText.push({x:e.x, y:e.y-30, txt:'SPLAT!', life:40, c:'#f00'});
        }
      }
    });

    // Train hurts player
    if(lhPlayer) {
      const trainTop = WORLD_H/2 - 50;
      const trainBot = WORLD_H/2 + 50;
      if(lhPlayer.y > trainTop && lhPlayer.y < trainBot) {
        const trainLeft  = Math.min(trainX, trainX + 5*180);
        const trainRight = Math.max(trainX, trainX + 5*180);
        if(lhPlayer.x > trainLeft && lhPlayer.x < trainRight) {
          lhPlayer.hp -= 500;
          screenShake = 30;
          spawnParticles(lhPlayer.x, lhPlayer.y, '#ff0000', 40, 8, 40);
          lhDmgText.push({x:lhPlayer.x, y:lhPlayer.y-40, txt:'TRAIN HIT! -500', life:60, c:'#f00'});
          if(lhPlayer.hp <= 0) lhPlayer.dead = true;
        }
      }
    }
  }

  // ── WILDLIFE PRESERVE NESTS ──────────────
  if(map.special === 'nests') {
    mapNests.forEach((nest, ni) => {
      if(!nest.active) return;
      nest.cd--;
      // Spawn enemies from nest
      if(nest.cd <= 0 && lhEnemies.length < 20) {
        const spawnAng = Math.random() * Math.PI * 2;
        const sx = nest.x + Math.cos(spawnAng)*60;
        const sy = nest.y + Math.sin(spawnAng)*60;
        const newEnemy = spawnNewEnemy(nest.spawnType, sx, sy, mayhemMult);
        if(newEnemy) lhEnemies.push(newEnemy);
        spawnParticles(sx, sy, '#a000ff', 15, 3, 20);
        nest.cd = 300;
      }
      // Check if nest destroyed by player bullets
      lhBullets.forEach((b, bi) => {
        if(Math.hypot(b.x-nest.x, b.y-nest.y) < 45) {
          nest.hp -= b.dmg;
          lhBullets.splice(bi, 1);
          spawnParticles(nest.x, nest.y, '#a000ff', 10, 3, 15);
          if(nest.hp <= 0) {
            nest.active = false;
            playSound('explosion', nest.x);
            spawnParticles(nest.x, nest.y, '#a000ff', 50, 8, 50);
            screenShake = 20;
            lhDmgText.push({x:nest.x, y:nest.y-40, txt:'NEST DESTROYED!', life:60, c:'#a000ff'});
            playerCoins += 500;
            gainExp(500 * mayhemMult);
            genLoot(nest.x, nest.y, false, false, false, true);
          }
        }
      });
    });
  }
}

// ── Draw map special layer ─────────────────
function drawMapSpecialLayer(ctx, cam) {
  const allMaps = [...mapData, ...extraMaps];
  if(activeMapIndex >= allMaps.length) return;
  const map = allMaps[activeMapIndex];
  if(map.special === 'turrets')  drawOpportunity(ctx, cam);
  if(map.special === 'train')    drawTundraExpress(ctx, cam);
  if(map.special === 'nests')    drawWildlifePreserve(ctx, cam);
}

// ── Extend mapData with new maps ───────────
// Call this once after state.js loads
function extendMaps() {
  extraMaps.forEach(m => {
    if(!mapData.find(existing => existing.name === m.name)) {
      mapData.push(m);
    }
  });
}