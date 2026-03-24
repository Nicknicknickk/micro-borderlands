/* ==========================================
   HUD.JS — Borderlands-Style HUD v2.0
   Replaces the inline HUD block in combat.js

   HOW TO INTEGRATE:
   1. Add <script src="hud.js"></script> to your HTML
      (after combat.js)
   2. In combat.js, find the "// ── HUD ──" comment
      block (near the bottom of loopLooter) and
      replace everything from that comment down to
      (but NOT including) the updateMusicIntensity()
      call with a single line:
        drawHUD();
   ========================================== */

// ── HUD constants ─────────────────────────
const HUD_H          = 72;          // top bar height
const BAR_W          = 180;         // hp/shield bar width
const BAR_H          = 14;
const SHIELD_Y       = 10;
const HP_Y           = 28;
const GUN_CARD_X     = 220;
const SKILL_X        = 620;
const GRENADE_X      = 460;

// Cel-shading palette
const HUD_BG         = 'rgba(8,6,4,0.82)';
const HUD_BORDER     = '#1a1410';
const SHIELD_COL     = '#2cd4ff';
const SHIELD_LOW     = '#0077aa';
const HP_COL         = '#e8321a';
const HP_LOW         = '#ff6600';
const HP_CRIT        = '#ff0000';
const EXP_COL        = '#00e5ff';
const MAYHEM_COLS    = { 10:'#ff3322', 20:'#cc00ff', 50:'#ff00ff' };

// Rarity glow colors (matches loot.js)
const RARITY_COLORS  = ['#aaaaaa','#00ff00','#2299ff','#cc44ff','#ff8800','#ff44ff','#00ffee'];
const RARITY_NAMES   = ['Common','Uncommon','Rare','Epic','Legendary','E-Tech','Pearl'];

// ── Rounded rect helper ───────────────────
function hudRR(cx, x, y, w, h, r, fill, stroke, sw) {
  cx.beginPath();
  cx.roundRect(x, y, w, h, r);
  if (fill)  { cx.fillStyle   = fill;  cx.fill();   }
  if (stroke){ cx.strokeStyle = stroke; cx.lineWidth = sw||1; cx.stroke(); }
}

// ── Bar with outlined cel look ────────────
function drawBar(cx, x, y, w, h, pct, fillCol, bgCol, label, valTxt) {
  // Shadow
  cx.fillStyle = 'rgba(0,0,0,0.6)';
  hudRR(cx, x+1, y+1, w+2, h+2, 3);

  // Track
  hudRR(cx, x, y, w, h, 3, bgCol || '#111', '#000', 1);

  // Fill — clamp
  const fw = Math.max(0, Math.min(w-2, (w-2)*pct));
  if (fw > 0) {
    cx.save();
    cx.beginPath(); cx.roundRect(x+1, y+1, w-2, h-2, 2); cx.clip();
    cx.fillStyle = fillCol;
    cx.fillRect(x+1, y+1, fw, h-2);
    // Scanline gloss
    cx.fillStyle = 'rgba(255,255,255,0.10)';
    cx.fillRect(x+1, y+1, fw, Math.floor((h-2)/2));
    cx.restore();
  }

  // Outline
  hudRR(cx, x, y, w, h, 3, null, '#000000', 2);
  hudRR(cx, x, y, w, h, 3, null, pct > 0.25 ? fillCol : '#ff2200', 1);

  // Label
  if (label) {
    cx.fillStyle = '#fff';
    cx.font      = 'bold 9px "Courier New"';
    cx.textAlign = 'left';
    cx.fillText(label, x + 4, y + h - 3);
  }
  // Value
  if (valTxt) {
    cx.fillStyle = 'rgba(255,255,255,0.85)';
    cx.font      = '9px "Courier New"';
    cx.textAlign = 'right';
    cx.fillText(valTxt, x + w - 4, y + h - 3);
  }
}

// ── Pip row (grenades, etc.) ──────────────
function drawPips(cx, x, y, count, max, col, size) {
  for (let i = 0; i < max; i++) {
    const px = x + i * (size + 4);
    const active = i < count;
    // Shadow
    cx.fillStyle = 'rgba(0,0,0,0.7)';
    hudRR(cx, px+1, y+1, size, size, 2);
    // Pip
    hudRR(cx, px, y, size, size, 2,
      active ? col : '#1a1410',
      active ? '#000' : '#333', 1
    );
    if (active) {
      cx.fillStyle = 'rgba(255,255,255,0.25)';
      hudRR(cx, px+1, y+1, size-2, Math.floor(size/2), 1);
    }
  }
}

// ── Skill cooldown arc ────────────────────
function drawSkillButton(cx, x, y, player) {
  const r       = 24;
  const ready   = player.skillCooldown <= 0;
  const active  = player.skillTimer > 0;
  const pct     = ready ? 1 : (1 - player.skillCooldown / getSkillMaxCD(player.char));
  const col     = active ? '#00ffe0' : ready ? '#00ffaa' : '#ff8800';

  // Outer glow when ready
  if (ready || active) {
    cx.save();
    cx.shadowColor = col;
    cx.shadowBlur  = active ? 18 : 10;
    cx.beginPath(); cx.arc(x, y, r+3, 0, Math.PI*2);
    cx.strokeStyle = col; cx.lineWidth = 1.5; cx.stroke();
    cx.restore();
  }

  // Background circle
  cx.fillStyle = 'rgba(0,0,0,0.75)';
  cx.beginPath(); cx.arc(x, y, r, 0, Math.PI*2); cx.fill();
  cx.strokeStyle = '#000'; cx.lineWidth = 2;
  cx.beginPath(); cx.arc(x, y, r, 0, Math.PI*2); cx.stroke();

  // Progress arc
  const start = -Math.PI/2;
  const end   = start + Math.PI*2*pct;
  cx.strokeStyle = col;
  cx.lineWidth   = 4;
  cx.lineCap     = 'round';
  cx.beginPath(); cx.arc(x, y, r-4, start, end); cx.stroke();
  cx.lineCap = 'butt';

  // Inner border
  cx.strokeStyle = '#222'; cx.lineWidth = 1;
  cx.beginPath(); cx.arc(x, y, r-7, 0, Math.PI*2); cx.stroke();

  // Icon / label
  cx.textAlign   = 'center';
  cx.textBaseline= 'middle';
  if (active) {
    cx.fillStyle = '#00ffe0';
    cx.font      = 'bold 8px "Courier New"';
    cx.fillText('ACTIVE', x, y);
  } else if (ready) {
    cx.fillStyle = '#00ffaa';
    cx.font      = 'bold 8px "Courier New"';
    cx.fillText('[E]', x, y-4);
    cx.font      = '7px "Courier New"';
    cx.fillText('READY', x, y+5);
  } else {
    const cd = Math.ceil(player.skillCooldown / 60);
    cx.fillStyle = '#ff8800';
    cx.font      = 'bold 11px "Courier New"';
    cx.fillText(`${cd}s`, x, y-2);
    cx.font      = '7px "Courier New"';
    cx.fillText('CD', x, y+7);
  }
  cx.textBaseline = 'alphabetic';

  // Label below
  cx.fillStyle = col;
  cx.font      = 'bold 8px "Courier New"';
  cx.textAlign = 'center';
  cx.fillText('SKILL', x, y + r + 11);
  cx.textAlign = 'left';
}

// ── Gun card ──────────────────────────────
function drawGunCard(cx, x, y, gun, skillTimer, char) {
  if (!gun) return;
  const rarity    = gun.rarity || 0;
  const rarCol    = RARITY_COLORS[rarity] || '#fff';
  const w = 190, h = 52;

  // Card background + border
  cx.fillStyle = 'rgba(8,6,4,0.88)';
  hudRR(cx, x, y, w, h, 4);
  // Left rarity stripe
  cx.fillStyle = rarCol;
  hudRR(cx, x, y, 5, h, [4,0,0,4]);
  // Outer border
  hudRR(cx, x, y, w, h, 4, null, rarCol, 1.5);
  // Inner border
  hudRR(cx, x+1, y+1, w-2, h-2, 3, null, '#000', 1);

  // Gun name
  cx.fillStyle = rarCol;
  cx.font      = 'bold 11px "Courier New"';
  cx.textAlign = 'left';
  // Truncate long names
  let gName = gun.name || 'Unknown';
  if (gName.length > 20) gName = gName.slice(0, 18) + '…';
  cx.fillText(gName, x + 10, y + 16);

  // Rarity label
  cx.fillStyle = rarCol;
  cx.font      = '8px "Courier New"';
  cx.fillText(RARITY_NAMES[rarity] || 'Common', x + 10, y + 27);

  // Type chip
  if (gun.wType) {
    const chipW = gun.wType.length * 5.5 + 6;
    hudRR(cx, x + 10, y + 31, chipW, 12, 2, 'rgba(255,255,255,0.08)', rarCol, 0.8);
    cx.fillStyle = rarCol;
    cx.font      = '7px "Courier New"';
    cx.fillText(gun.wType, x + 13, y + 40);
  }

  // DMG stat
  cx.fillStyle = '#ffeeaa';
  cx.font      = 'bold 10px "Courier New"';
  cx.fillText(`DMG`, x + 90, y + 27);
  cx.fillStyle = '#fff';
  cx.font      = 'bold 14px "Courier New"';
  cx.fillText(Math.floor(gun.dmg) || '?', x + 90, y + 44);

  // FR stat
  cx.fillStyle = '#aaffee';
  cx.font      = 'bold 10px "Courier New"';
  cx.fillText(`SPD`, x + 145, y + 27);
  cx.fillStyle = '#fff';
  cx.font      = 'bold 14px "Courier New"';
  cx.fillText(Math.floor(gun.fr) || '?', x + 145, y + 44);

  // Gunzerking double gun indicator
  if (char === 'salvador' && skillTimer > 0) {
    cx.fillStyle = '#ff3333';
    cx.font      = 'bold 8px "Courier New"';
    cx.fillText('✕2 GUNZERKING', x + 10, y + h - 4);
  }
}

// ── Boss health bar ────────────────────────
function drawBossBar(cx, boss, canvasW) {
  if (!boss || boss.hp <= 0) return;

  const bw = 520, bh = 22, bx = (canvasW - bw) / 2, by = HUD_H + 4;
  const pct = Math.max(0, boss.hp / boss.maxHp);

  // Name
  const bName = isRaidBoss ? boss.type.toUpperCase() + ' THE INVINCIBLE'
              : isDuel     ? `DUEL: ${duelOpponent.toUpperCase()}`
              : runCount >= 6 ? 'GOLIATH KING'
              : 'PSYCHO KING';

  // Shadow backing
  cx.fillStyle = 'rgba(0,0,0,0.85)';
  hudRR(cx, bx-2, by-18, bw+4, bh+22, 4);

  // Boss name
  cx.fillStyle = '#fff';
  cx.font      = 'bold 11px "Courier New"';
  cx.textAlign = 'center';
  cx.fillText(bName, canvasW/2, by - 4);

  // Bar track
  hudRR(cx, bx, by, bw, bh, 3, '#1a0000', '#000', 2);

  // Bar fill
  cx.save();
  cx.beginPath(); cx.roundRect(bx+1, by+1, bw-2, bh-2, 2); cx.clip();
  // Gradient: fiery red→orange near death
  const grad = cx.createLinearGradient(bx, 0, bx + bw, 0);
  if (isRaidBoss)      { grad.addColorStop(0,'#9900cc'); grad.addColorStop(1,'#ff00ff'); }
  else if (isDuel)     { grad.addColorStop(0,'#0066cc'); grad.addColorStop(1,'#00ccff'); }
  else                 { grad.addColorStop(0,'#cc0000'); grad.addColorStop(1,'#ff6600'); }
  cx.fillStyle = grad;
  cx.fillRect(bx+1, by+1, (bw-2)*pct, bh-2);
  cx.fillStyle = 'rgba(255,255,255,0.08)';
  cx.fillRect(bx+1, by+1, (bw-2)*pct, (bh-2)/2);
  cx.restore();

  // Bar border
  hudRR(cx, bx, by, bw, bh, 3, null, '#000', 2);
  hudRR(cx, bx, by, bw, bh, 3, null, isRaidBoss?'#cc00ff':isDuel?'#00ccff':'#cc0000', 1);

  // HP readout
  cx.fillStyle = '#fff';
  cx.font      = 'bold 10px "Courier New"';
  cx.textAlign = 'center';
  cx.fillText(`${Math.floor(boss.hp).toLocaleString()} / ${boss.maxHp.toLocaleString()}`, canvasW/2, by + bh - 4);
  cx.textAlign = 'left';
}

// ── Wave bar (Underdome) ──────────────────
function drawUnderdomeBar(cx, canvasW, canvasH) {
  const bx = 270, by = HUD_H + 4, bw = 260, bh = 44;
  cx.fillStyle = 'rgba(0,0,0,0.88)';
  hudRR(cx, bx, by, bw, bh, 4);
  cx.strokeStyle = '#ff007f'; cx.lineWidth = 2;
  hudRR(cx, bx, by, bw, bh, 4, null, '#ff007f', 2);
  cx.fillStyle = '#ff007f';
  cx.font      = 'bold 20px "Courier New"';
  cx.textAlign = 'center';
  cx.fillText(`WAVE ${underdomeWave}`, canvasW/2, by + 24);
  cx.fillStyle = '#fff';
  cx.font      = '11px "Courier New"';
  cx.fillText(`Enemies: ${underdomeEnemies + lhEnemies.length}`, canvasW/2, by + 40);
  cx.textAlign = 'left';
}

// ── Mayhem badge ──────────────────────────
function drawMayhemBadge(cx, canvasW) {
  if (!mayhemMode) return;
  const col = MAYHEM_COLS[mayhemMode] || '#ff0000';
  const bx = canvasW - 96, by = 4, bw = 92, bh = HUD_H - 8;
  cx.fillStyle = 'rgba(0,0,0,0.7)';
  hudRR(cx, bx, by, bw, bh, 4);
  hudRR(cx, bx, by, bw, bh, 4, null, col, 2);
  // Pulsing glow
  cx.save();
  cx.shadowColor = col; cx.shadowBlur = 12;
  cx.fillStyle = col;
  cx.font      = 'bold 22px "Courier New"';
  cx.textAlign = 'center';
  cx.fillText(`M${mayhemMode}`, bx + bw/2, by + 28);
  cx.font      = 'bold 9px "Courier New"';
  cx.fillText('MAYHEM', bx + bw/2, by + 42);
  cx.restore();
  cx.textAlign = 'left';
}

// ── EXP bar (bottom strip) ────────────────
function drawExpBar(cx, canvasW, canvasH) {
  const pct = pLevel >= 72 ? 1 : pExp / getExpRequired(pLevel);
  cx.fillStyle = '#0a0604';
  cx.fillRect(0, canvasH - 6, canvasW, 6);
  // Fill
  const grad = cx.createLinearGradient(0, 0, canvasW, 0);
  grad.addColorStop(0, '#0099cc');
  grad.addColorStop(1, '#00e5ff');
  cx.fillStyle = grad;
  cx.fillRect(0, canvasH - 6, canvasW * pct, 6);
  // Sheen
  cx.fillStyle = 'rgba(255,255,255,0.15)';
  cx.fillRect(0, canvasH - 6, canvasW * pct, 3);
  // Top edge
  cx.fillStyle = '#000';
  cx.fillRect(0, canvasH - 7, canvasW, 1);
}

// ── Kill counter / boss progress ──────────
function drawKillProgress(cx, x, y, kills, target, bossSpawned) {
  if (bossSpawned) return; // replaced by boss bar
  cx.fillStyle   = 'rgba(0,0,0,0.7)';
  hudRR(cx, x, y, 120, 20, 3);
  hudRR(cx, x, y, 120, 20, 3, null, '#ff3333', 1);
  // Progress fill
  const pct = Math.min(1, kills / target);
  cx.fillStyle = `rgba(200,0,0,${0.3 + pct * 0.4})`;
  cx.beginPath(); cx.roundRect(x+1, y+1, 118*pct, 18, 2); cx.fill();
  cx.fillStyle   = '#fff';
  cx.font        = 'bold 10px "Courier New"';
  cx.textAlign   = 'center';
  cx.fillText(`💀 BOSS: ${kills} / ${target}`, x + 60, y + 13);
  cx.textAlign   = 'left';
}

// ── Quest chip ────────────────────────────
function drawQuestChip(cx, x, y) {
  if (!activeQuest) return;
  const qtxt = activeQuest === 1
    ? `PSYCHOS ${questProgress}/25`
    : `LOADERS ${questProgress}/10`;
  const goal = activeQuest === 1 ? 25 : 10;
  const pct  = Math.min(1, questProgress / goal);
  cx.fillStyle = 'rgba(0,0,0,0.7)';
  hudRR(cx, x, y, 130, 20, 3);
  hudRR(cx, x, y, 130, 20, 3, null, '#ffcc00', 1);
  cx.fillStyle = 'rgba(255,204,0,0.2)';
  cx.beginPath(); cx.roundRect(x+1, y+1, 128*pct, 18, 2); cx.fill();
  cx.fillStyle   = '#ffcc00';
  cx.font        = 'bold 10px "Courier New"';
  cx.textAlign   = 'center';
  cx.fillText(`📋 ${qtxt}`, x + 65, y + 13);
  cx.textAlign   = 'left';
}

// ── Vehicle armor bar ─────────────────────
function drawVehicleHUD(cx, player) {
  // Armor bar
  const pct = Math.max(0, player.vehicleHp / player.maxVehicleHp);
  const col = pct > 0.5 ? '#ff8800' : pct > 0.25 ? '#ffcc00' : '#ff2200';
  drawBar(cx, 10, SHIELD_Y, BAR_W, BAR_H, pct, col, '#1a0a00', 'VEHICLE', `${Math.floor(player.vehicleHp)}`);
  cx.fillStyle = '#ff6600';
  cx.font      = 'bold 9px "Courier New"';
  cx.fillText('🚗 VEHICLE MODE', 10, 50);
}

// ── Cooldown helper ───────────────────────
function getSkillMaxCD(char) {
  return char === 'axton' || char === 'gaige' ? 700
       : char === 'maya'  ? 400
       : char === 'krieg' ? 500
       : 600;
}

// ── Character color helper ────────────────
function getCharColor(char) {
  return { zero:'#0cf', maya:'#a040f0', axton:'#00ee44',
           salvador:'#ee0000', krieg:'#ff8c00', gaige:'#00ddff' }[char] || '#fff';
}

// ── Shield color from equipped shield ─────
function getShieldColor(player) {
  if (typeof equippedShield !== 'undefined' && equippedShield && equippedShield.color) {
    return equippedShield.color;
  }
  return SHIELD_COL;
}

// ════════════════════════════════════════════
// MAIN DRAW FUNCTION — call this each frame
// ════════════════════════════════════════════
function drawHUD() {
  const cx      = ctx;   // global canvas context from state.js
  const cW      = gCanvas.width;  // 800
  const cH      = gCanvas.height; // 450

  if (!lhPlayer) return;

  // ── Top bar backing ──────────────────────
  cx.fillStyle = HUD_BG;
  cx.fillRect(0, 0, cW, HUD_H);
  // Bottom edge line
  cx.fillStyle = '#000';
  cx.fillRect(0, HUD_H, cW, 2);
  cx.fillStyle = getCharColor(lhPlayer.char);
  cx.fillRect(0, HUD_H, cW, 1);

  // ── HP / Shield ──────────────────────────
  if (inVehicle) {
    drawVehicleHUD(cx, lhPlayer);
  } else {
    // Shield
    const sCol   = getShieldColor(lhPlayer);
    const sPct   = lhPlayer.maxShield > 0 ? lhPlayer.shield / lhPlayer.maxShield : 0;
    const sLow   = sPct < 0.25;
    drawBar(cx, 10, SHIELD_Y, BAR_W, BAR_H,
      sPct,
      sLow ? '#0055aa' : sCol,
      '#001428',
      '🛡',
      `${Math.floor(lhPlayer.shield)} / ${Math.floor(lhPlayer.maxShield)}`
    );

    // HP
    const hPct = Math.max(0, lhPlayer.hp) / lhPlayer.maxHp;
    const hCol = hPct < 0.20 ? HP_CRIT : hPct < 0.40 ? HP_LOW : HP_COL;
    drawBar(cx, 10, HP_Y, BAR_W, BAR_H,
      hPct,
      hCol,
      '#280000',
      '❤',
      `${Math.floor(Math.max(0, lhPlayer.hp))} / ${Math.floor(lhPlayer.maxHp)}`
    );

    // Low health pulse flash on bar outline
    if (hPct < 0.20 && Math.floor(Date.now() / 300) % 2 === 0) {
      hudRR(cx, 10, HP_Y, BAR_W, BAR_H, 3, null, '#ff0000', 2);
    }
  }

  // Level badge
  cx.fillStyle = 'rgba(0,0,0,0.6)';
  hudRR(cx, 10, 46, 58, 18, 3);
  hudRR(cx, 10, 46, 58, 18, 3, null, getCharColor(lhPlayer.char), 1);
  cx.fillStyle = '#fff';
  cx.font      = 'bold 10px "Courier New"';
  cx.textAlign = 'left';
  cx.fillText(`Lv ${pLevel}  ${(lhPlayer.char||'?').toUpperCase()}`, 14, 58);

  // ── Gun card ──────────────────────────────
  drawGunCard(cx, GUN_CARD_X, 8, lhPlayer.gun, lhPlayer.skillTimer, lhPlayer.char);

  // ── Grenades ─────────────────────────────
  cx.fillStyle = '#ffee44';
  cx.font      = 'bold 9px "Courier New"';
  cx.textAlign = 'left';
  cx.fillText('GRENADES', GRENADE_X, 18);
  drawPips(cx, GRENADE_X, 22, lhPlayer.grenades, lhPlayer.maxGrenades || 3, '#ffdd00', 14);
  cx.fillStyle = 'rgba(255,220,0,0.5)';
  cx.font      = '8px "Courier New"';
  cx.fillText('[G] throw', GRENADE_X, 50);

  // Inventory hint
  cx.fillStyle = 'rgba(150,150,150,0.7)';
  cx.font      = '8px "Courier New"';
  cx.fillText('[I] ECHO', GRENADE_X, 62);

  // ── Skill button ──────────────────────────
  drawSkillButton(cx, SKILL_X, 35, lhPlayer);

  // ── Kill / boss progress ──────────────────
  const _bkt = Math.floor(20 + (Math.max(1, pLevel) - 1) * 3.5);
  drawKillProgress(cx, 670, 10, lhKills, _bkt, lhBossSpawned);
  drawQuestChip(cx, 670, 34);

  // Vehicle available hint
  if (hasVehicle) {
    cx.fillStyle = lhPlayer.vehicleCooldown > 0 ? '#555' : '#ffcc00';
    cx.font      = '9px "Courier New"';
    cx.fillText('[V] Vehicle', 670, 58);
  }

  // ── Mayhem badge ──────────────────────────
  // (occupies the far right corner — only when active)
  drawMayhemBadge(cx, cW);

  // ── Boss bar ─────────────────────────────
  if (lhBossSpawned) {
    const theBoss = lhEnemies.find(e =>
      e.type.includes('boss') || e.type === 'crawmerax' ||
      e.type === 'pete'       || e.type === 'terramorphous'
    );
    if (theBoss && theBoss.hp > 0) drawBossBar(cx, theBoss, cW);
  }

  // ── Underdome wave ────────────────────────
  if (isUnderdome) drawUnderdomeBar(cx, cW, cH);

  // ── EXP strip at bottom ───────────────────
  drawExpBar(cx, cW, cH);

  // ── Credits (bottom-left, subtle) ─────────
  cx.fillStyle = 'rgba(255,200,0,0.6)';
  cx.font      = '9px "Courier New"';
  cx.textAlign = 'left';
  cx.fillText(`$${playerCoins.toLocaleString()}`, 10, cH - 10);
  cx.textAlign = 'left';

  // ── Minimap ───────────────────────────────
  drawMinimap();
}

// ════════════════════════════════════════════
// MINIMAP — drawn on separate #minimap-canvas
// ════════════════════════════════════════════

const MM_W      = 160;   // minimap canvas width
const MM_H      = 120;   // minimap canvas height
const MM_SCALE  = MM_W / 2000;  // 0.08  (WORLD_W = 2000)
const MM_PAD    = 6;     // inner padding

function drawMinimap() {
  const mc = document.getElementById('minimap-canvas');
  if (!mc || !lhPlayer) return;
  const mx = mc.getContext('2d');

  // ── Background ────────────────────────────
  mx.clearRect(0, 0, MM_W, MM_H);

  // Outer border glow
  mx.fillStyle   = '#000';
  mx.fillRect(0, 0, MM_W, MM_H);
  mx.strokeStyle = '#ffa500';
  mx.lineWidth   = 2;
  mx.strokeRect(1, 1, MM_W - 2, MM_H - 2);
  // Inner border
  mx.strokeStyle = '#3a2800';
  mx.lineWidth   = 1;
  mx.strokeRect(3, 3, MM_W - 6, MM_H - 6);

  // Subtle dot grid like the main menu bg
  mx.fillStyle = '#1a1208';
  for (let gx = MM_PAD; gx < MM_W - MM_PAD; gx += 12) {
    for (let gy = MM_PAD; gy < MM_H - MM_PAD; gy += 12) {
      mx.fillRect(gx, gy, 1, 1);
    }
  }

  // ── Helper: world → minimap coords ────────
  const wx = x => MM_PAD + x * MM_SCALE * ((MM_W - MM_PAD*2) / MM_W) * (MM_W / (MM_W - MM_PAD*2));
  const wy = y => MM_PAD + y * (MM_H - MM_PAD*2) / 1500;

  // ── Loot dots — only legendary+ shown, no shadow ──
  lhLoot.forEach(l => {
    const lRar = l.isMod ? 2 : (l.gun ? l.gun.rarity : 0);
    if (lRar < 3) return;
    const lc = l.isMod ? l.c : l.gun.c;
    mx.fillStyle = lc;
    mx.fillRect(wx(l.x) - 2, wy(l.y) - 2, 4, 4);
  });

  // ── Exit portal ───────────────────────────
  if (lhExitPortal) {
    const pulse = Math.sin(Date.now() / 300) * 0.4 + 0.6;
    mx.fillStyle   = `rgba(0, 255, 200, ${pulse})`;
    mx.beginPath();
    mx.arc(wx(lhExitPortal.x), wy(lhExitPortal.y), 5, 0, Math.PI * 2);
    mx.fill();
    mx.shadowBlur = 0;
  }

  // ── Enemies ───────────────────────────────
  lhEnemies.forEach(e => {
    const isBoss = e.type.includes('boss') || e.type === 'crawmerax' ||
                   e.type === 'pete'       || e.type === 'terramorphous';
    if (isBoss) {
      // Boss — red pulsing diamond
      const pulse = Math.sin(Date.now() / 200) * 0.5 + 0.5;
      mx.fillStyle   = `rgba(255, 0, 0, ${0.7 + pulse * 0.3})`;
      mx.save();
      mx.translate(wx(e.x), wy(e.y));
      mx.rotate(Math.PI / 4);
      mx.fillRect(-4, -4, 8, 8);
      mx.restore();
      mx.shadowBlur = 0;
    } else {
      // Regular enemy — red dot, size by prefix
      const sz = e.pref === 'Badass' ? 3 : e.pref === 'Armored' ? 2.5 : 2;
      mx.fillStyle = e.pref === 'Armored' ? '#ffcc00'
                   : e.pref === 'Badass'  ? '#ffffff'
                   : e.pref === 'Loot'    ? '#00ff88'
                   : '#ff3333';
      mx.beginPath();
      mx.arc(wx(e.x), wy(e.y), sz, 0, Math.PI * 2);
      mx.fill();
    }
  });

  // ── Player — white arrow pointing toward mouse ──
  const px = wx(lhPlayer.x);
  const py = wy(lhPlayer.y);
  const ang = Math.atan2(
    lhMouse.screenY + lhCam.y - lhPlayer.y,
    lhMouse.screenX + lhCam.x - lhPlayer.x
  );

  mx.save();
  mx.translate(px, py);
  mx.rotate(ang);
  mx.fillStyle   = '#ffffff';
  mx.beginPath();
  mx.moveTo(5, 0);       // tip
  mx.lineTo(-4, -3);     // back left
  mx.lineTo(-2, 0);      // notch
  mx.lineTo(-4,  3);     // back right
  mx.closePath();
  mx.fill();
  mx.shadowBlur = 0;
  mx.restore();

  // ── Camera viewport rect ──────────────────
  mx.strokeStyle = 'rgba(255,165,0,0.35)';
  mx.lineWidth   = 1;
  mx.strokeRect(
    wx(lhCam.x),
    wy(lhCam.y),
    800 * MM_SCALE * ((MM_W - MM_PAD*2) / MM_W) * (MM_W / (MM_W - MM_PAD*2)),
    450 * (MM_H - MM_PAD*2) / 1500
  );

  // ── Label ─────────────────────────────────
  mx.fillStyle = 'rgba(255,165,0,0.5)';
  mx.font      = '7px "Courier New"';
  mx.textAlign = 'center';
  mx.fillText('MINIMAP', MM_W / 2, MM_H - 3);
  mx.textAlign = 'left';

  // ── Legend ────────────────────────────────
  mx.font = '7px "Courier New"';
  mx.fillStyle = '#ff3333'; mx.fillText('● ENE', MM_PAD + 1, MM_PAD + 8);
  mx.fillStyle = '#ffa500'; mx.fillText('◆ BOSS', MM_PAD + 28, MM_PAD + 8);
  if (lhExitPortal) {
    mx.fillStyle = '#00ffcc'; mx.fillText('● EXIT', MM_PAD + 62, MM_PAD + 8);
  }
}