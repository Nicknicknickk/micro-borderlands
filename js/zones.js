/* ==========================================
   ZONES.JS — Zone system, minimap, 
   dynamic kill quota, legendary rarity
   ========================================== */

// ── Zone State ────────────────────────────
let currentZone      = 1;   // 1 = normal, 2 = elite, 3 = boss arena
let zoneGateOpen     = false;
let zoneGateX        = 0;
let zoneGateY        = 0;
let bossZoneX        = 0;
let bossZoneY        = 0;
let playerInBossZone = false;
let killQuota        = 20;
let runsWithoutLeg   = 0;   // bad luck protection

// ── Zone boundaries ───────────────────────
// Zone 1: x 0 to WORLD_W*0.55
// Zone 2: x WORLD_W*0.55 to WORLD_W*0.8
// Zone 3 (boss): x WORLD_W*0.8 to WORLD_W
const ZONE1_END  = () => Math.floor(WORLD_W * 0.55);
const ZONE2_END  = () => Math.floor(WORLD_W * 0.80);
const GATE1_X    = () => ZONE1_END();
const GATE2_X    = () => ZONE2_END();
const GATE_Y_MID = () => Math.floor(WORLD_H / 2);

// ── Calculate kill quota ──────────────────
function calcKillQuota() {
  return Math.floor(20 + (pLevel * 4) + (runCount * 2));
}

// ── Init zones for a new run ──────────────
function initZones() {
  currentZone      = 1;
  zoneGateOpen     = false;
  playerInBossZone = false;
  killQuota        = calcKillQuota();
  zoneGateX        = GATE1_X();
  zoneGateY        = GATE_Y_MID();
  bossZoneX        = GATE2_X();
  bossZoneY        = GATE_Y_MID();
  lhBossSpawned    = false;
}

// ── Check zone transitions ────────────────
function updateZones(mayhemMult) {
  if (!lhPlayer) return;

  // Zone 1 → 2: gate opens when kill quota reached
  if (currentZone === 1 && lhKills >= killQuota && !zoneGateOpen) {
    zoneGateOpen = true;
    currentZone  = 2;
    playSound('levelup');
    spawnParticles(zoneGateX, zoneGateY, '#00ffcc', 60, 8, 60);
    lhDmgText.push({ x: zoneGateX, y: zoneGateY - 60,
      txt: `GATE OPEN! (${killQuota} kills)`, life: 120, c: '#00ffcc' });
    // Spawn elites in zone 2
    for (let i = 0; i < 5; i++) {
      const ex = ZONE1_END() + 100 + Math.random() * (ZONE2_END() - ZONE1_END() - 200);
      const ey = 100 + Math.random() * (WORLD_H - 200);
      spawnEnemy(ex, ey, psychoHpForLevel(), 40, mayhemMult * 1.5);
    }
  }

  // Zone 2 → 3: player crosses second gate
  if (currentZone === 2 && lhPlayer.x > ZONE2_END() && !lhBossSpawned) {
    currentZone   = 3;
    lhBossSpawned = true;
    playerInBossZone = true;
    const bossX = ZONE2_END() + 200;
    const bossY = WORLD_H / 2;
    spawnBossForRun(bossX, bossY, mayhemMult);
    playSound('die', bossX);
    spawnParticles(bossX, bossY, '#800080', 80, 8, 60);
    screenShake = 40;
    lhDmgText.push({ x: bossX, y: bossY - 80,
      txt: '⚠ BOSS INCOMING! ⚠', life: 180, c: '#ff0000' });
  }

  // Keep player out of zone 2 until gate open
  if (!zoneGateOpen && lhPlayer.x > ZONE1_END() - 20) {
    lhPlayer.x = ZONE1_END() - 20;
  }
  // Keep player out of zone 3 until in zone 2
  if (currentZone < 2 || !zoneGateOpen) {
    if (lhPlayer.x > ZONE2_END() - 20) lhPlayer.x = ZONE2_END() - 20;
  }
}

// ── HP for current level ──────────────────
function psychoHpForLevel() {
  return Math.max(20, 10 + pLevel * 8);
}

// ── Spawn boss based on run count ─────────
function spawnBossForRun(bx, by, mayhemMult) {
  if (isRaidBoss) return;
  if (runCount >= 6) {
    lhEnemies.push({ x:bx, y:by,
      hp:10000*mayhemMult, maxHp:10000*mayhemMult,
      speed:2.5, type:'boss_goliath', pref:'', pC:'',
      w:150, h:150, fT:0, sT:0, aT:0, cd:60, flash:0 });
  } else {
    lhEnemies.push({ x:bx, y:by,
      hp:(800 + pLevel*80)*mayhemMult,
      maxHp:(800 + pLevel*80)*mayhemMult,
      speed:2, type:'boss', pref:'', pC:'',
      w:80, h:80, fT:0, sT:0, aT:0, cd:60, flash:0 });
  }
}

// ── Draw zone walls and gates ─────────────
function drawZones(ctx) {
  const g1x = ZONE1_END();
  const g2x = ZONE2_END();
  const gapH = 120; // gate opening height
  const gapTop = WORLD_H/2 - gapH/2;
  const gapBot = WORLD_H/2 + gapH/2;

  // ── Zone 1/2 wall ─────────────────────────
  ctx.strokeStyle = zoneGateOpen ? 'rgba(0,255,204,0.3)' : '#00ffcc';
  ctx.lineWidth   = zoneGateOpen ? 3 : 6;
  ctx.setLineDash(zoneGateOpen ? [10,10] : []);

  // Wall above gate
  ctx.beginPath(); ctx.moveTo(g1x, 0); ctx.lineTo(g1x, gapTop); ctx.stroke();
  // Wall below gate
  ctx.beginPath(); ctx.moveTo(g1x, gapBot); ctx.lineTo(g1x, WORLD_H); ctx.stroke();
  ctx.setLineDash([]);

  // Gate opening
  if (!zoneGateOpen) {
    // Closed gate — glowing bars
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth   = 4;
    for (let gy = gapTop; gy < gapBot; gy += 20) {
      const pulse = Math.sin(Date.now()/200 + gy) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.beginPath(); ctx.moveTo(g1x-8, gy); ctx.lineTo(g1x+8, gy); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Kill counter above gate
    const progress = Math.min(lhKills, killQuota);
    ctx.fillStyle = '#00ffcc';
    ctx.font = 'bold 18px Courier'; ctx.textAlign = 'center';
    ctx.fillText(`${progress} / ${killQuota}`, g1x, gapTop - 30);
    ctx.font = '13px Courier';
    ctx.fillStyle = 'rgba(0,255,204,0.7)';
    ctx.fillText('KILLS TO OPEN GATE', g1x, gapTop - 10);

    // Progress bar on gate
    ctx.fillStyle = '#111';
    ctx.fillRect(g1x - 40, gapTop - 55, 80, 10);
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(g1x - 40, gapTop - 55, 80 * (progress/killQuota), 10);
    ctx.textAlign = 'left';
  } else {
    // Open gate — green arrows pointing right
    ctx.fillStyle = 'rgba(0,255,204,0.6)';
    ctx.font = '24px Arial'; ctx.textAlign = 'center';
    ctx.fillText('▶', g1x, WORLD_H/2 + 8);
    ctx.textAlign = 'left';
  }

  // ── Zone 2/3 wall ─────────────────────────
  const z2color = currentZone >= 2 ? '#ff4500' : '#444';
  ctx.strokeStyle = z2color;
  ctx.lineWidth   = currentZone >= 3 ? 3 : 6;
  ctx.setLineDash(currentZone >= 3 ? [10,10] : []);
  ctx.beginPath(); ctx.moveTo(g2x, 0); ctx.lineTo(g2x, gapTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(g2x, gapBot); ctx.lineTo(g2x, WORLD_H); ctx.stroke();
  ctx.setLineDash([]);

  if (currentZone < 3) {
    // Boss door — closed
    for (let gy = gapTop; gy < gapBot; gy += 20) {
      const pulse = Math.sin(Date.now()/150 + gy) * 0.3 + 0.7;
      ctx.globalAlpha = pulse * (currentZone >= 2 ? 1 : 0.3);
      ctx.strokeStyle = z2color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(g2x-8, gy); ctx.lineTo(g2x+8, gy); ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
    if (currentZone >= 2) {
      ctx.fillStyle = '#ff4500';
      ctx.font = 'bold 16px Courier'; ctx.textAlign = 'center';
      ctx.fillText('⚠ BOSS ZONE ⚠', g2x, gapTop - 15);
      ctx.textAlign = 'left';
    }
  }

  // Zone labels
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 60px Arial'; ctx.textAlign = 'center';
  ctx.fillText('ZONE 1', g1x/2, WORLD_H/2 + 25);
  ctx.fillText('ZONE 2', g1x + (g2x-g1x)/2, WORLD_H/2 + 25);
  ctx.fillText('BOSS', g2x + (WORLD_W-g2x)/2, WORLD_H/2 + 25);
  ctx.globalAlpha = 1.0;
  ctx.textAlign = 'left';
}

// ── Draw minimap ──────────────────────────
function drawMinimap() {
  if (!lhPlayer) return;

  const mmW  = 160, mmH = 90;
  const mmX  = gCanvas.width - mmW - 10;
  const mmY  = gCanvas.height - mmH - 10;
  const scaleX = mmW / WORLD_W;
  const scaleY = mmH / WORLD_H;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  // Zone colors
  ctx.fillStyle = 'rgba(0,80,40,0.4)';
  ctx.fillRect(mmX, mmY, ZONE1_END()*scaleX, mmH);
  ctx.fillStyle = 'rgba(80,40,0,0.4)';
  ctx.fillRect(mmX + ZONE1_END()*scaleX, mmY, (ZONE2_END()-ZONE1_END())*scaleX, mmH);
  ctx.fillStyle = 'rgba(80,0,0,0.4)';
  ctx.fillRect(mmX + ZONE2_END()*scaleX, mmY, (WORLD_W-ZONE2_END())*scaleX, mmH);

  // Gate lines
  ctx.strokeStyle = zoneGateOpen ? 'rgba(0,255,204,0.5)' : '#00ffcc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(mmX + ZONE1_END()*scaleX, mmY);
  ctx.lineTo(mmX + ZONE1_END()*scaleX, mmY+mmH);
  ctx.stroke();
  ctx.strokeStyle = currentZone >= 2 ? '#ff4500' : '#444';
  ctx.beginPath();
  ctx.moveTo(mmX + ZONE2_END()*scaleX, mmY);
  ctx.lineTo(mmX + ZONE2_END()*scaleX, mmY+mmH);
  ctx.stroke();

  // Enemies as dots
  lhEnemies.forEach(e => {
    const isBoss = e.type.includes('boss') || e.type==='crawmerax'||e.type==='pete'||e.type==='terramorphous';
    ctx.fillStyle = isBoss ? '#ff0000' : '#ff6600';
    ctx.beginPath();
    ctx.arc(mmX + e.x*scaleX, mmY + e.y*scaleY, isBoss ? 3 : 1.5, 0, Math.PI*2);
    ctx.fill();
  });

  // Exit portal
  if (lhExitPortal) {
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(mmX + lhExitPortal.x*scaleX, mmY + lhExitPortal.y*scaleY, 3, 0, Math.PI*2);
    ctx.fill();
  }

  // Player dot — pulsing
  const pulse = Math.sin(Date.now()/200) * 0.4 + 0.6;
  ctx.fillStyle = `rgba(0,255,204,${pulse})`;
  ctx.beginPath();
  ctx.arc(mmX + lhPlayer.x*scaleX, mmY + lhPlayer.y*scaleY, 3, 0, Math.PI*2);
  ctx.fill();

  // Camera viewport rect
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mmX + lhCam.x*scaleX, mmY + lhCam.y*scaleY,
    800*scaleX, 450*scaleY
  );

  // Label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`ZONE ${currentZone} | ${lhKills}/${killQuota} KILLS`, mmX+mmW-3, mmY-3);
  ctx.textAlign = 'left';
}

// ── Legendary drop chance ─────────────────
function getLegendaryChance(sourceType) {
  // Bad luck protection
  const blpBonus = Math.min(0.3, runsWithoutLeg * 0.05);

  switch(sourceType) {
    case 'normal':       return 0.002 + blpBonus * 0.1;  // 0.2% base
    case 'elite':        return 0.02  + blpBonus * 0.2;  // 2% base
    case 'boss':
      // Starts at 25%, decreases with runs but never below 5%
      return Math.max(0.05, 0.25 - runCount * 0.005) + blpBonus;
    case 'raid':         return 1.0;  // always
    default:             return 0.01;
  }
}

// ── Called when legendary drops ───────────
function onLegendaryDrop() {
  runsWithoutLeg = 0;
  localStorage.setItem('runsWithoutLeg', 0);
  unlockAchievement('legendary');
}

// ── Called at end of run (win) ────────────
function onRunComplete() {
  runsWithoutLeg++;
  localStorage.setItem('runsWithoutLeg', runsWithoutLeg);
}

// ── Load bad luck protection ───────────────
function loadZoneData() {
  runsWithoutLeg = parseInt(localStorage.getItem('runsWithoutLeg')) || 0;
}

loadZoneData();