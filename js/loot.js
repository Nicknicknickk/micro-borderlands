/* ==========================================
   LOOT.JS — Loot & item generation
   ========================================== */

function genLoot(x, y, forcedLegendary = false, isMoxxi = false, isCasino = false, isLootPref = false) {

  // ── Mod Drop ──────────────────────────────
  if (!forcedLegendary && !isMoxxi && !isCasino && Math.random() < 0.20) {
    if (Math.random() < 0.5) {
      const cMods = ['Sniper','Ninja','Survivor','Cat','Binder','Nurse','Rifleman','Berserker','Meat','Anarchist','Witch'];
      const mName = cMods[Math.floor(Math.random() * cMods.length)];
      lhLoot.push({ x, y, isMod: true, type: 'Class', name: mName, desc: getModDesc(mName), c: '#0ff', life: 1800 });
    } else {
      const gMods = ['Fastball','Bonus Package'];
      const mName = gMods[Math.floor(Math.random() * gMods.length)];
      lhLoot.push({ x, y, isMod: true, type: 'Grenade', name: mName, desc: getModDesc(mName), c: '#0f0', life: 1800 });
    }
    spawnParticles(x, y, '#fff', 20, 3, 20);
    return;
  }

  // ── Gun Drop ──────────────────────────────
  const rRoll  = Math.random();
  let rarity   = forcedLegendary ? 4
    : rRoll > 0.98 ? 6 : rRoll > 0.94 ? 5 : rRoll > 0.85 ? 4
    : rRoll > 0.70 ? 3 : rRoll > 0.40 ? 2 : rRoll > 0.15 ? 1 : 0;

  if (isLootPref && rarity < 3) rarity = 3;

  const colors = ['#ffffff','#00ff00','#0099ff','#800080','#ffa500','#ff00ff','#00ffff'];
  let type = isMoxxi ? 1 : Math.floor(Math.random() * 5);

  const wTypes = ['Pistol','SMG','Shotgun','Sniper','Launcher'];
  const nameMatrix = [
    ['Peashooter',   'Scrap SMG',    'Boomstick',       'Broken Sniper', 'Dud Pipe'],
    ['Sidearm',      'Tactical SMG', 'Riot Sweeper',    'Service Rifle', 'RPG'],
    ['Magnum',       'Rapid Caster', 'Breacher',        'Longbow',       'Bazooka'],
    ['Elite Cannon', 'Plasma Spitter','Devastator',     'Assassin',      'Nukem'],
    ['The Infinity', 'Hellfire',     'Conference Call', 'Volcano',       'Mongol'],
    ['Spiker',       'Plasma Caster','Splatgun',        'Railgun',       'P-Fusty'],
    ['Unforgiven',   'Avenger',      'Butcher',         'Storm',         'Tunguska']
  ];

  const wType = wTypes[type];
  let finalName = nameMatrix[rarity][type];
  let dmg = Math.floor(15 + rarity * 25 + Math.random() * 20);
  let fr  = Math.max(2, Math.floor(22 - rarity * 3 + Math.random() * 8));
  let spd = 8 + rarity + Math.random() * 4;

  // ── Weapon type modifiers ─────────────────
  if (wType === 'Shotgun')  { dmg *= 0.6; fr += 20; spd -= 2; }
  if (wType === 'SMG')      { dmg  = Math.floor(dmg * 0.4); fr = Math.max(2, fr - 10); }
  if (wType === 'Sniper')   { dmg *= 4.5; fr += 30; spd += 8; }
  if (wType === 'Launcher') { dmg *= 6;   fr += 45; spd -= 4; }

  // ── Rarity prefixes ───────────────────────
  if (rarity === 5) { finalName = 'E-TECH ' + finalName; dmg *= 1.2; }
  if (rarity === 6) { finalName = 'PEARL '  + finalName; dmg *= 2; fr += 5; }
  if (forcedLegendary) { dmg *= 1.5; finalName = 'LEGENDARY ' + finalName; }

  // ── Special sources ───────────────────────
  if (isMoxxi) {
    const moxxiNames = ['Good Touch','Bad Touch','Hail','Crit','Heart Breaker','Kitten','Creamer'];
    finalName = "MOXXI'S " + moxxiNames[Math.floor(Math.random() * moxxiNames.length)].toUpperCase();
    dmg *= 1.8; fr = 2; colors[rarity] = '#ff007f';
  }

  if (isCasino) {
    const casinoNames = ['Snake Eyes','The Dealer','High Roller','Jackpot','All-In'];
    rarity    = Math.random() > 0.9 ? 4 : (Math.random() > 0.7 ? 3 : 2);
    dmg       = Math.floor(30 + rarity * 25 + Math.random() * 20);
    finalName = 'CASINO ' + casinoNames[Math.floor(Math.random() * casinoNames.length)];
  }

  // ── Mayhem scaling ────────────────────────
  if (mayhemMode === 50) { dmg *= 2500; finalName = 'M50 '  + finalName; }
  else if (mayhemMode === 20) { dmg *= 50; finalName = 'M20 '  + finalName; }
  else if (mayhemMode === 10) { dmg *= 5;  finalName = 'M10 '  + finalName; }

  spawnParticles(x, y, colors[rarity], 20, 3, 20);
  lhLoot.push({
    x, y,
    isMod: false,
    gun: { name: finalName, c: colors[rarity], dmg, fr, spd, rarity, wType, timer: 0 },
    life: (forcedLegendary || isMoxxi || isCasino) ? 9999 : 1800
  });
}

// ── Draw & pickup loot ────────────────────────────────────
function updateAndDrawLoot(isInSanctuary = false) {
  let nearestLoot = null;
  let nearestDist = 999;

  for (let i = lhLoot.length - 1; i >= 0; i--) {
    const l     = lhLoot[i];
    l.life--;
    const lColor = l.isMod ? l.c : l.gun.c;

    ctx.fillStyle  = lColor;
    ctx.shadowColor = lColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(l.x - 5, l.y - 5, 10, 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#fff';
    ctx.font       = 'bold 12px Arial';
    const lName    = l.isMod ? `[${l.type}] ${l.name}` : l.gun.name;
    ctx.fillText(lName, l.x - 10, l.y - 15);

    const d = Math.hypot(lhPlayer.x - l.x, lhPlayer.y - l.y);
    if (d < 40 && d < nearestDist && (isInSanctuary || !inVehicle)) {
      nearestDist = d;
      nearestLoot = { index: i, lootObj: l };
    }
    if (l.life <= 0) lhLoot.splice(i, 1);
  }

  if (!nearestLoot) return;

  ctx.fillStyle  = '#ffcc00';
  ctx.font       = 'bold 16px Arial';
  ctx.textAlign  = 'center';
  const pickTxt  = nearestLoot.lootObj.isMod
    ? `[F] Pick Up ${nearestLoot.lootObj.name}`
    : `[F] Pick Up: ${nearestLoot.lootObj.gun.name} | [B] Beam to Vault`;
  ctx.fillText(pickTxt, lhPlayer.x, lhPlayer.y - 30);
  ctx.textAlign = 'left';

  // ── Beam to Vault ─────────────────────────
  if ((keys['KeyB'] || keys['b']) && !nearestLoot.lootObj.isMod) {
    keys['KeyB'] = false; keys['b'] = false;
    if (bankGuns.length < 100) {
      playSound('coin');
      bankGuns.push(JSON.parse(JSON.stringify(nearestLoot.lootObj.gun)));
      localStorage.setItem('borderBank', JSON.stringify(bankGuns));
      lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 40, txt: 'BEAMED TO VAULT!', life: 40, c: '#00ffcc' });
      spawnParticles(lhPlayer.x, lhPlayer.y, nearestLoot.lootObj.gun.c, 25, 4, 25);
      lhLoot.splice(nearestLoot.index, 1);
    } else {
      playSound('hit');
      lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 40, txt: 'VAULT FULL!', life: 40, c: '#f00' });
    }
    return;
  }

  // ── Pick Up ───────────────────────────────
  if (keys['KeyF'] || keys['f']) {
    keys['KeyF'] = false; keys['f'] = false;
    playSound('coin');
    const lootColor = nearestLoot.lootObj.isMod ? nearestLoot.lootObj.c : nearestLoot.lootObj.gun.c;
    spawnParticles(lhPlayer.x, lhPlayer.y, lootColor, 25, 4, 25);

    if (nearestLoot.lootObj.isMod) {
      inventoryMods.push({
        type:   nearestLoot.lootObj.type,
        name:   nearestLoot.lootObj.name,
        desc:   nearestLoot.lootObj.desc,
        dmgRed: nearestLoot.lootObj.dmgRed,
        hpBonus:nearestLoot.lootObj.hpBonus
      });
      localStorage.setItem('borderInvMods', JSON.stringify(inventoryMods));
      lhLoot.splice(nearestLoot.index, 1);
      lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 40, txt: 'STORED IN ECHO!', life: 40, c: '#0f0' });
    } else {
      if (backpackGuns.length < 100) {
        backpackGuns.push(JSON.parse(JSON.stringify(nearestLoot.lootObj.gun)));
        localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
        lhLoot.splice(nearestLoot.index, 1);
        lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 40, txt: 'ADDED TO BACKPACK!', life: 40, c: '#0f0' });
      } else {
        playSound('hit');
        lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 40, txt: 'BACKPACK FULL!', life: 40, c: '#f00' });
      }
    }
  }
}