/* ==========================================
   ZONES.JS — Zone system v2.0
   Safe, self-contained, no external deps
   ========================================== */

// ── Zone State ────────────────────────────
let currentZone      = 1;
let zoneGateOpen     = false;
let killQuota        = 20;
let runsWithoutLeg   = 0;
let elitesSpawned    = false;

// ── Zone X boundaries (world coords) ──────
function ZONE1_END()  { return Math.floor(WORLD_W * 0.55); }
function ZONE2_END()  { return Math.floor(WORLD_W * 0.80); }
function GATE_GAP_TOP(){ return Math.floor(WORLD_H/2 - 100); }
function GATE_GAP_BOT(){ return Math.floor(WORLD_H/2 + 100); }

// ── Calculate kill quota ──────────────────
function calcKillQuota() {
  return Math.floor(20 + (pLevel * 4) + (runCount * 2));
}

// ── Init for new run ──────────────────────
function initZones() {
  try {
    currentZone    = 1;
    zoneGateOpen   = false;
    elitesSpawned  = false;
    killQuota      = calcKillQuota();
    lhBossSpawned  = false;
  } catch(e) { console.warn('initZones error:', e); }
}

// ── Update zones each frame ───────────────
function updateZones(mayhemMult) {
  try {
    if (!lhPlayer || isRaidBoss || isDuel) return;

    // ── Gate opens when kill quota reached ──
    if (currentZone === 1 && lhKills >= killQuota && !zoneGateOpen) {
      zoneGateOpen  = true;
      currentZone   = 2;
      playSound('levelup');
      spawnParticles(ZONE1_END(), WORLD_H/2, '#00ffcc', 60, 8, 60);
      lhDmgText.push({
        x: lhPlayer.x, y: lhPlayer.y - 80,
        txt: '⚠ GATE OPEN — ADVANCE!', life: 180, c: '#00ffcc'
      });
    }

    // ── Spawn elites when entering zone 2 ──
    if (currentZone === 2 && lhPlayer.x > ZONE1_END() + 50 && !elitesSpawned) {
      elitesSpawned = true;
      const baseHp  = Math.max(20, 10 + pLevel * 8);
      for (let i = 0; i < 6; i++) {
        const ex = ZONE1_END() + 100 + Math.random() * (ZONE2_END() - ZONE1_END() - 200);
        const ey = 100 + Math.random() * (WORLD_H - 200);
        lhEnemies.push({
          x:ex, y:ey,
          hp: baseHp * 3 * mayhemMult,
          maxHp: baseHp * 3 * mayhemMult,
          speed: 2.2, type:'normal', pref:'Badass', pC:'#fff',
          w:45, h:45, fT:0, sT:0, aT:0, cd:120, isMarksman:true, flash:0
        });
      }
      lhDmgText.push({
        x: lhPlayer.x, y: lhPlayer.y - 60,
        txt: 'ELITE ENEMIES INCOMING!', life: 120, c: '#ff4500'
      });
      playSound('die', lhPlayer.x);
    }

    // ── Boss spawns when player crosses zone 2 gate ──
    if (currentZone === 2 && lhPlayer.x > ZONE2_END() && !lhBossSpawned) {
      currentZone   = 3;
      lhBossSpawned = true;
      const bossX   = Math.min(WORLD_W - 200, ZONE2_END() + 300);
      const bossY   = WORLD_H / 2;

      if (runCount >= 6) {
        lhEnemies.push({
          x:bossX, y:bossY,
          hp: 10000 * mayhemMult, maxHp: 10000 * mayhemMult,
          speed:2.5, type:'boss_goliath', pref:'', pC:'',
          w:150, h:150, fT:0, sT:0, aT:0, cd:60, flash:0
        });
      } else {
        lhEnemies.push({
          x:bossX, y:bossY,
          hp: (800 + pLevel * 80) * mayhemMult,
          maxHp: (800 + pLevel * 80) * mayhemMult,
          speed:2, type:'boss', pref:'', pC:'',
          w:80, h:80, fT:0, sT:0, aT:0, cd:60, flash:0
        });
      }
      playSound('die', bossX);
      spawnParticles(bossX, bossY, '#800080', 80, 8, 60);
      screenShake = 40;
      lhDmgText.push({
        x: lhPlayer.x, y: lhPlayer.y - 80,
        txt: '⚠ BOSS INCOMING! ⚠', life: 180, c: '#ff0000'
      });
    }

    // ── Soft block zone 1 gate if not open ──
    if (!zoneGateOpen) {
      if (lhPlayer.x > ZONE1_END() - 25) {
        lhPlayer.x = ZONE1_END() - 25;
      }
    }

  } catch(e) { console.warn('updateZones error:', e); }
}

// ── Draw zone gates on world canvas ───────
function drawZones(ctx) {
  try {
    const g1x    = ZONE1_END();
    const g2x    = ZONE2_END();
    const gapTop = GATE_GAP_TOP();
    const gapBot = GATE_GAP_BOT();
    const t      = Date.now();

    // ── Zone 1/2 gate ─────────────────────
    ctx.lineWidth = 5;

    // Wall above gap
    ctx.strokeStyle = zoneGateOpen ? 'rgba(0,255,204,0.25)' : '#00ffcc';
    ctx.setLineDash(zoneGateOpen ? [8,8] : []);
    ctx.beginPath(); ctx.moveTo(g1x, 0); ctx.lineTo(g1x, gapTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g1x, gapBot); ctx.lineTo(g1x, WORLD_H); ctx.stroke();
    ctx.setLineDash([]);

    if (!zoneGateOpen) {
      // Animated gate bars
      for (let gy = gapTop; gy < gapBot; gy += 18) {
        const pulse = Math.sin(t/200 + gy * 0.05) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(g1x-10, gy); ctx.lineTo(g1x+10, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      // Progress display
      const prog  = Math.min(lhKills, killQuota);
      const pct   = prog / killQuota;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(g1x - 55, gapTop - 70, 110, 55);
      ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 1;
      ctx.strokeRect(g1x - 55, gapTop - 70, 110, 55);
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 18px Courier'; ctx.textAlign = 'center';
      ctx.fillText(`${prog} / ${killQuota}`, g1x, gapTop - 44);
      ctx.font = '11px Courier';
      ctx.fillStyle = 'rgba(0,255,204,0.7)';
      ctx.fillText('KILLS TO OPEN', g1x, gapTop - 26);
      // Progress bar
      ctx.fillStyle = '#111';
      ctx.fillRect(g1x - 45, gapTop - 18, 90, 8);
      ctx.fillStyle = '#00ffcc';
      ctx.fillRect(g1x - 45, gapTop - 18, 90 * pct, 8);
      ctx.textAlign = 'left';
    } else {
      // Open — arrow
      ctx.fillStyle = 'rgba(0,255,204,0.5)';
      ctx.font = '30px Arial'; ctx.textAlign = 'center';
      ctx.fillText('▶▶', g1x, WORLD_H/2 + 12);
      ctx.textAlign = 'left';
    }

    // ── Zone 2/3 gate ─────────────────────
    const z2col = currentZone >= 3 ? 'rgba(255,69,0,0.25)' : (currentZone >= 2 ? '#ff4500' : '#555');
    ctx.strokeStyle = z2col;
    ctx.lineWidth = currentZone >= 3 ? 3 : 5;
    ctx.setLineDash(currentZone >= 3 ? [8,8] : []);
    ctx.beginPath(); ctx.moveTo(g2x, 0); ctx.lineTo(g2x, gapTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(g2x, gapBot); ctx.lineTo(g2x, WORLD_H); ctx.stroke();
    ctx.setLineDash([]);

    if (currentZone >= 2 && currentZone < 3) {
      for (let gy = gapTop; gy < gapBot; gy += 18) {
        const pulse = Math.sin(t/150 + gy * 0.05) * 0.3 + 0.7;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ff4500'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(g2x-10, gy); ctx.lineTo(g2x+10, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(g2x - 55, gapTop - 45, 110, 35);
      ctx.strokeStyle = '#ff4500'; ctx.lineWidth = 1;
      ctx.strokeRect(g2x - 55, gapTop - 45, 110, 35);
      ctx.fillStyle = '#ff4500';
      ctx.font = 'bold 13px Courier'; ctx.textAlign = 'center';
      ctx.fillText('⚠ BOSS ZONE ⚠', g2x, gapTop - 24);
      ctx.font = '10px Courier';
      ctx.fillStyle = 'rgba(255,100,0,0.8)';
      ctx.fillText('ENTER TO FIGHT', g2x, gapTop - 8);
      ctx.textAlign = 'left';
    }

    // ── Zone labels (faint) ───────────────
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 80px Arial'; ctx.textAlign = 'center';
    ctx.fillText('1', g1x/2, WORLD_H/2 + 30);
    ctx.fillText('2', g1x + (g2x-g1x)/2, WORLD_H/2 + 30);
    ctx.fillText('BOSS', g2x + (WORLD_W-g2x)/2, WORLD_H/2 + 30);
    ctx.globalAlpha = 1.0;
    ctx.textAlign = 'left';

  } catch(e) { console.warn('drawZones error:', e); }
}

// ── Minimap ───────────────────────────────
function drawMinimap() {
  try {
    if (!lhPlayer || !gCanvas) return;

    const mmW = 160, mmH = 80;
    const mmX = gCanvas.width  - mmW - 8;
    const mmY = gCanvas.height - mmH - 8;
    const sx  = mmW / WORLD_W;
    const sy  = mmH / WORLD_H;
    const ctx2 = gCanvas.getContext('2d');

    // BG
    ctx2.fillStyle   = 'rgba(0,0,0,0.8)';
    ctx2.strokeStyle = '#333'; ctx2.lineWidth = 1;
    ctx2.fillRect(mmX, mmY, mmW, mmH);
    ctx2.strokeRect(mmX, mmY, mmW, mmH);

    // Zone tints
    ctx2.fillStyle = 'rgba(0,60,30,0.5)';
    ctx2.fillRect(mmX, mmY, ZONE1_END()*sx, mmH);
    ctx2.fillStyle = 'rgba(60,30,0,0.5)';
    ctx2.fillRect(mmX + ZONE1_END()*sx, mmY, (ZONE2_END()-ZONE1_END())*sx, mmH);
    ctx2.fillStyle = 'rgba(60,0,0,0.5)';
    ctx2.fillRect(mmX + ZONE2_END()*sx, mmY, (WORLD_W-ZONE2_END())*sx, mmH);

    // Gate lines
    ctx2.strokeStyle = zoneGateOpen ? 'rgba(0,255,204,0.4)' : '#00ffcc';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(mmX + ZONE1_END()*sx, mmY);
    ctx2.lineTo(mmX + ZONE1_END()*sx, mmY+mmH);
    ctx2.stroke();
    ctx2.strokeStyle = currentZone >= 2 ? '#ff4500' : '#444';
    ctx2.beginPath();
    ctx2.moveTo(mmX + ZONE2_END()*sx, mmY);
    ctx2.lineTo(mmX + ZONE2_END()*sx, mmY+mmH);
    ctx2.stroke();

    // Enemies
    lhEnemies.forEach(e => {
      const boss = e.type.includes('boss')||e.type==='crawmerax'||e.type==='pete'||e.type==='terramorphous';
      ctx2.fillStyle = boss ? '#ff0000' : '#ff6600';
      ctx2.beginPath();
      ctx2.arc(mmX + e.x*sx, mmY + e.y*sy, boss ? 3 : 1.5, 0, Math.PI*2);
      ctx2.fill();
    });

    // Exit portal
    if (lhExitPortal) {
      ctx2.fillStyle = '#0ff';
      ctx2.beginPath();
      ctx2.arc(mmX + lhExitPortal.x*sx, mmY + lhExitPortal.y*sy, 3, 0, Math.PI*2);
      ctx2.fill();
    }

    // Player dot
    const pulse = Math.sin(Date.now()/200) * 0.35 + 0.65;
    ctx2.fillStyle = `rgba(0,255,204,${pulse})`;
    ctx2.beginPath();
    ctx2.arc(mmX + lhPlayer.x*sx, mmY + lhPlayer.y*sy, 3.5, 0, Math.PI*2);
    ctx2.fill();

    // Viewport rect
    ctx2.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx2.lineWidth = 1;
    ctx2.strokeRect(mmX + lhCam.x*sx, mmY + lhCam.y*sy, 800*sx, 450*sy);

    // Label
    ctx2.fillStyle = 'rgba(255,255,255,0.45)';
    ctx2.font = '9px Arial'; ctx2.textAlign = 'right';
    ctx2.fillText(`Z${currentZone} | ${Math.min(lhKills,killQuota)}/${killQuota}`, mmX+mmW-3, mmY-2);
    ctx2.textAlign = 'left';

  } catch(e) { console.warn('drawMinimap error:', e); }
}

// ── Legendary drop chance ─────────────────
function getLegendaryChance(sourceType) {
  const blp = Math.min(0.25, runsWithoutLeg * 0.05);
  switch(sourceType) {
    case 'normal': return 0.002 + blp * 0.05;
    case 'elite':  return 0.02  + blp * 0.15;
    case 'boss':   return Math.max(0.05, 0.25 - runCount * 0.004) + blp;
    case 'raid':   return 1.0;
    default:       return 0.01;
  }
}

function onLegendaryDrop() {
  runsWithoutLeg = 0;
  localStorage.setItem('runsWithoutLeg', 0);
  if (typeof unlockAchievement === 'function') unlockAchievement('legendary');
}

function onRunComplete() {
  runsWithoutLeg++;
  localStorage.setItem('runsWithoutLeg', runsWithoutLeg);
}

function loadZoneData() {
  runsWithoutLeg = parseInt(localStorage.getItem('runsWithoutLeg')) || 0;
}

loadZoneData();