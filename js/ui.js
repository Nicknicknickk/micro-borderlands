/* ==========================================
   UI.JS — All overlay screens & UI functions
   ========================================== */

// ── Menu Stats ─────────────────────────────

// ════════════════════════════════════════════
// CHARACTER SELECT
// ════════════════════════════════════════════
const CHAR_DATA = {
  zero:    { name:'ZER0',     color:'#00e5ff', icon:'⚔️',  desc:'Assassin. Deadly at range and close quarters.',  skills:['Headsh0t +10% Dmg/Lv','0ptics -10% CD/Lv','B0re +10% Crit/Lv'],          special:'Phase Shift: Vanish & deal burst crit damage' },
  maya:    { name:'MAYA',     color:'#cc44ff', icon:'🔮',  desc:'Siren. Elemental specialist, powerful shields.',  skills:['Flicker +20% Elem/Lv','Ward +20% Shield/Lv','Mind\'s Eye +10% Dmg/Lv'],   special:'Phase Shield: Deflects bullets, blasts nearby foes' },
  axton:   { name:'AXTON',    color:'#00ee44', icon:'💣',  desc:'Commando. Deploys a turret to cover the field.',  skills:['Sentry +20% Turret/Lv','Ready +10% FR/Lv','Healthy +20% HP/Lv'],          special:'Sabre Turret: Deploys an auto-firing turret' },
  salvador:{ name:'SALVADOR', color:'#ff3333', icon:'🔫',  desc:'Gunzerker. Guns down anything in his path.',      skills:['Inconceivable +10% FR/Lv','Hard to Kill +20% HP/Lv','Juggernaut -10% CD/Lv'], special:'Gunzerking: Double fire rate, take half damage' },
  krieg:   { name:'KRIEG',    color:'#ff8800', icon:'🪓',  desc:'Psycho. Melee destroyer, insane survivability.',  skills:['Bloodlust +20% Melee/Lv','Feed the Meat +20% HP/Lv','Embrace Pain -10% CD/Lv'],special:'Rampage: Massive melee damage + speed boost' },
  gaige:   { name:'GAIGE',    color:'#00ddff', icon:'🤖',  desc:'Mechromancer. Summons Deathtrap robot companion.', skills:['Best Friends +20% Pet/Lv','My Shields +20% Shield/Lv','Typecast +10% Dmg/Lv'], special:'Deathtrap: Deploys electric robot combat pet' }
};

let selectedChar = null;

window.openCharSelect = function() {
  selectedChar = localStorage.getItem('borderClass') || 'zero';
  renderCharSelect();
  document.getElementById('char-select-screen').style.display = 'flex';
};

window.closeCharSelect = function() {
  document.getElementById('char-select-screen').style.display = 'none';
};

window.selectChar = function(id) {
  selectedChar = id;
  renderCharSelect();
};

window.confirmCharSelect = function() {
  if (!selectedChar) return;
  localStorage.setItem('borderClass', selectedChar);
  window.closeCharSelect();
  mainMenu.style.display      = 'none';
  gameContainer.style.display = 'flex';
  if (shouldRunTutorial()) startTutorial();
  else startSanctuary();
};

function renderCharSelect() {
  const grid = document.getElementById('char-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.entries(CHAR_DATA).forEach(([id, ch]) => {
    const isSel = id === selectedChar;
    const card  = document.createElement('div');
    card.style.cssText = [
      'padding:16px 14px','border-radius:4px','cursor:pointer',
      'transition:border-color 0.1s','position:relative','overflow:hidden',
      'border:3px solid ' + (isSel ? ch.color : '#2a1e0e'),
      'background:'       + (isSel ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.03)'),
      'box-shadow:'       + (isSel ? '0 0 18px '+ch.color+'66,inset 0 0 12px '+ch.color+'22' : 'none')
    ].join(';');
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;left:0;top:0;width:4px;height:100%;background:'+ch.color;
    card.appendChild(bar);
    card.innerHTML += `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-left:8px;">
        <div style="font-size:1.8rem;">${ch.icon}</div>
        <div>
          <div style="font-family:'Bebas Neue',monospace;font-size:1.4rem;color:${ch.color};letter-spacing:2px;">${ch.name}</div>
          <div style="color:#666;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;">Vault Hunter</div>
        </div>
        ${isSel ? '<div style="margin-left:auto;color:'+ch.color+';font-size:0.75rem;font-weight:bold;letter-spacing:1px;">✓ SELECTED</div>' : ''}
      </div>
      <div style="color:#aaa;font-size:0.78rem;padding-left:8px;margin-bottom:10px;line-height:1.4;">${ch.desc}</div>
      <div style="padding-left:8px;margin-bottom:10px;">${ch.skills.map(s=>`<div style="color:#665533;font-size:0.68rem;margin-bottom:3px;">▸ ${s}</div>`).join('')}</div>
      <div style="padding:8px;background:${ch.color}18;border:1px solid ${ch.color}44;border-radius:3px;margin:0 0 0 8px;">
        <div style="color:${ch.color};font-size:0.7rem;font-weight:bold;letter-spacing:1px;margin-bottom:3px;">ACTION SKILL</div>
        <div style="color:#ccc;font-size:0.72rem;">${ch.special}</div>
      </div>`;
    card.onclick      = () => window.selectChar(id);
    card.onmouseover  = () => { if (id !== selectedChar) card.style.borderColor = ch.color+'88'; };
    card.onmouseout   = () => { if (id !== selectedChar) card.style.borderColor = '#2a1e0e'; };
    grid.appendChild(card);
  });
  const info = document.getElementById('char-select-info');
  if (info && selectedChar) {
    const saved = localStorage.getItem('borderClass') || 'zero';
    info.textContent = selectedChar === saved
      ? `Currently playing as ${CHAR_DATA[selectedChar].name} — select to continue`
      : `Switching to ${CHAR_DATA[selectedChar].name}`;
    info.style.color = selectedChar === saved ? '#665533' : '#ffa500';
  }
}

window.launchGame = function () {
  window.openCharSelect();
};


window.showAchievements = function () {
  // Stop any running game loop
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  inSanctuary = false;
  gCanvas.onmousedown = null;
  gCanvas.onmouseup   = null;
  gCanvas.onmousemove = null;
  gCanvas.onclick     = null;

  mainMenu.style.display = 'none';
  renderAchievementOverlay();
  document.getElementById('ach-screen').style.display = 'flex';
};

window.closeAchievements = function () {
  document.getElementById('ach-screen').style.display = 'none';
  mainMenu.style.display = 'flex';
};

function renderAchievementOverlay() {
  const unlocked = Object.keys(unlockedAchievements).length;
  const total    = Object.keys(ACHIEVEMENTS).length;
  const pct      = unlocked / total * 100;

  document.getElementById('ach-progress-text').textContent = unlocked + ' / ' + total + ' Unlocked';
  document.getElementById('ach-progress-bar').style.width  = pct + '%';

  const rarityColors = { bronze:'#cd7f32', silver:'#c0c0c0', gold:'#ffd700', platinum:'#e5e4e2' };
  const rarityBg     = { bronze:'#1a0d00', silver:'#0d0d1a', gold:'#1a1500', platinum:'#0f0f14' };

  const grid = document.getElementById('ach-grid');
  grid.innerHTML = '';

  Object.values(ACHIEVEMENTS).forEach(ach => {
    const done  = !!unlockedAchievements[ach.id];
    const col   = rarityColors[ach.rarity] || '#aaa';
    const bg    = rarityBg[ach.rarity]    || '#111';

    const card = document.createElement('div');
    card.style.cssText = [
      'display:flex', 'align-items:center', 'gap:12px',
      'padding:12px 14px',
      'border-radius:4px',
      'border:2px solid ' + (done ? col : '#2a2a2a'),
      'background:' + (done ? bg : 'rgba(255,255,255,0.02)'),
      'box-shadow:' + (done ? '0 0 10px ' + col + '33' : 'none'),
      'opacity:' + (done ? '1' : '0.45'),
      'transition:opacity 0.2s'
    ].join(';');

    card.innerHTML =
      '<div style="font-size:1.8rem;flex-shrink:0;">' + (done ? ach.icon : '🔒') + '</div>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">' +
          '<span style="color:' + (done ? '#fff' : '#666') + ';font-weight:bold;font-size:0.95rem;font-family:Courier New,monospace;">' + ach.name + '</span>' +
          '<span style="color:' + col + ';font-size:0.7rem;font-weight:bold;font-family:Courier New,monospace;flex-shrink:0;">' + ach.rarity.toUpperCase() + '</span>' +
        '</div>' +
        '<div style="color:' + (done ? 'rgba(255,255,255,0.55)' : '#444') + ';font-size:0.78rem;margin-top:3px;font-family:Courier New,monospace;">' + ach.desc + '</div>' +
      '</div>';

    grid.appendChild(card);
  });
}

window.goHome = function () {
  if (animId) cancelAnimationFrame(animId);
  window.closeBank(); window.closeBadass(); window.closeInventory(); window.closeSkills();
  inDialog = false;
  gameContainer.style.display = 'none';
  mainMenu.style.display      = 'flex';
  gCanvas.onmousedown = null; gCanvas.onmousemove = null; gCanvas.onmouseup = null;
  stopBGM();
  updateMenuStats();
};

window.enterBossMode = function () { isBossMode = true;  bossScreen.style.display = 'block'; stopBGM(); };
window.exitBossMode  = function () {
  isBossMode = false; bossScreen.style.display = 'none';
  if (soundEnabled && !inSanctuary && !inBank && !inBadass && !inInventory && !inSkills && !inDialog)
    window.setMusicState('sanctuary');
};

window.exportSave = function () {
  const saveData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('border') || key === 'moxxiTips' || key === 'badassTokens' || key.startsWith('rank'))
      saveData[key] = localStorage.getItem(key);
  }
  prompt('Copy your Save Data (Ctrl+C):', btoa(JSON.stringify(saveData)));
};

window.importSave = function () {
  const s = prompt('Paste your Save Data String:');
  if (!s) return;
  try {
    const data = JSON.parse(atob(s));
    for (const key in data) localStorage.setItem(key, data[key]);
    alert('Save imported! Rebooting ECHO system...');
    location.reload();
  } catch (e) { alert('CORRUPTED DATA: Invalid Save String.'); }
};

// ── Keyboard Shortcut — Escape = Boss Mode ──
window.addEventListener('keydown', e => {
  const uiOpen = inBank || inBadass || inInventory || inSkills || inDialog;
  if (e.key === 'Escape' && gameContainer.style.display === 'flex' && !uiOpen)
    window.enterBossMode();
  if (e.key.toLowerCase() === 'i' && gameContainer.style.display === 'flex' && !isBossMode && !inDialog) {
    if (inInventory) window.closeInventory(); else window.openInventory();
  }
  if (inDialog && dialogStep === moxxiLines.length - 1) {
    if (e.key.toLowerCase() === 'y') { inDialog = false; window.setMusicState('sanctuary'); startLooter(false, null, true); }
    if (e.key.toLowerCase() === 'n') { inDialog = false; playSound('hit'); }
  }
});

// ── BANK ───────────────────────────────────
window.openBank = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('bank-screen').style.display = 'flex';
  inBank = true;
  renderBank();
};
window.closeBank = function () {
  document.getElementById('bank-screen').style.display = 'none';
  inBank = false; keys['KeyE'] = false; keys['e'] = false;
  if (!isBossMode) { if (animId) cancelAnimationFrame(animId); if (inSanctuary) animId = requestAnimationFrame(loopSanctuary); else animId = requestAnimationFrame(loopLooter); }
};
window.depositGun = function () {
  if (bankGuns.length >= 100 || lhPlayer.gun.name === 'Starter Pistol') return;
  playSound('coin');
  bankGuns.push(JSON.parse(JSON.stringify(lhPlayer.gun)));
  lhPlayer.gun = { name: 'Starter Pistol', c: '#fff', dmg: 20, fr: 12, spd: 10, timer: 0 };
  localStorage.setItem('borderBank', JSON.stringify(bankGuns));
  localStorage.setItem('borderGun',  JSON.stringify(lhPlayer.gun));
  renderBank();
};
window.withdrawGun = function (idx) {
  playSound('coin');
  const withdrawn = bankGuns.splice(idx, 1)[0];
  if (lhPlayer.gun.name !== 'Starter Pistol') bankGuns.push(JSON.parse(JSON.stringify(lhPlayer.gun)));
  lhPlayer.gun = JSON.parse(JSON.stringify(withdrawn));
  localStorage.setItem('borderBank', JSON.stringify(bankGuns));
  localStorage.setItem('borderGun',  JSON.stringify(lhPlayer.gun));
  renderBank();
};
function renderBank() {
  document.getElementById('bank-equipped').innerText = `${lhPlayer.gun.name} (DMG: ${lhPlayer.gun.dmg} | FR: ${lhPlayer.gun.fr})`;
  document.getElementById('bank-equipped').style.color = lhPlayer.gun.c;
  const list = document.getElementById('bank-list');
  list.innerHTML = bankGuns.length === 0 ? '<p style="text-align:center; color:#888;">Your Vault is empty.</p>' : '';
  bankGuns.forEach((g, idx) => {
    const div = document.createElement('div'); div.className = 'bank-item';
    div.innerHTML = `<div><span style="color:${g.c}; font-weight:bold; font-size:1.1rem;">${g.name}</span><br><span style="font-size:0.9rem; color:#aaa;">DMG: ${g.dmg} | FR: ${g.fr}</span></div><button class="bank-btn" onclick="window.withdrawGun(${idx})">EQUIP / SWAP</button>`;
    list.appendChild(div);
  });
}

// ── BADASS RANKS ───────────────────────────
window.openBadass = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('badass-screen').style.display = 'flex';
  inBadass = true; renderBadass();
};
window.closeBadass = function () {
  document.getElementById('badass-screen').style.display = 'none';
  inBadass = false; keys['KeyE'] = false; keys['e'] = false;
  if (!isBossMode) { if (animId) cancelAnimationFrame(animId); if (inSanctuary) animId = requestAnimationFrame(loopSanctuary); else animId = requestAnimationFrame(loopLooter); }
};
// ── Badass Rank caps ───────────────────────
const RANK_CAPS = { hp: 20, spd: 10, fr: 15, dmg: 20 };

window.buyRank = function (type) {
  if (badassTokens <= 0) { playSound('hit'); return; }
  const capKey = type;
  const currentRank = type==='hp'?rankHP:type==='spd'?rankSpeed:type==='fr'?rankFireRate:rankDmg;
  if (currentRank >= RANK_CAPS[capKey]) { playSound('hit'); return; }
  badassTokens--; playSound('coin');
  if (type === 'hp')  rankHP++;
  if (type === 'spd') rankSpeed++;
  if (type === 'fr')  rankFireRate++;
  if (type === 'dmg') rankDmg++;
  localStorage.setItem('badassTokens', badassTokens);
  localStorage.setItem('rankHP',        rankHP);
  localStorage.setItem('rankSpeed',     rankSpeed);
  localStorage.setItem('rankFireRate',  rankFireRate);
  localStorage.setItem('rankDmg',       rankDmg);
  renderBadass();
};
function renderBadass() {
  document.getElementById('badass-tokens-display').innerText = badassTokens;
  const mkBtn = (type, rank, cap, label, color, effect) => {
    const maxed = rank >= cap;
    return `<div class="bank-item">
      <div>
        <span style="color:${color}; font-weight:bold;">${label}</span>
        <span style="color:#888; font-size:0.85rem;"> (${rank}/${cap})</span><br>
        <span style="font-size:0.9rem; color:#aaa;">${effect}</span>
      </div>
      <button class="bank-btn" onclick="window.buyRank('${type}')"
        style="${maxed ? 'background:#444;color:#888;cursor:not-allowed;' : ''}">
        ${maxed ? 'MAXED' : 'UPGRADE'}
      </button>
    </div>`;
  };
  document.getElementById('badass-list').innerHTML =
    mkBtn('hp',  rankHP,       20, 'Max Health',       '#0f0',    `+${rankHP*25} HP total`) +
    mkBtn('spd', rankSpeed,    10, 'Movement Speed',   '#0ff',    `+${(rankSpeed*0.3).toFixed(1)} Spd total (base 5)`) +
    mkBtn('fr',  rankFireRate, 15, 'Fire Rate',        '#ffcc00', `-${rankFireRate} fire delay total`) +
    mkBtn('dmg', rankDmg,      20, 'Gun Damage',       '#ff007f', `+${rankDmg*10}% damage total`);
}

// ── SKILL TREE ─────────────────────────────
window.openSkills = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('skills-screen').style.display = 'flex';
  inSkills = true; renderSkills();
};
window.closeSkills = function () {
  document.getElementById('skills-screen').style.display = 'none';
  inSkills = false; keys['KeyE'] = false; keys['e'] = false;
  if (!isBossMode) { if (animId) cancelAnimationFrame(animId); if (inSanctuary) animId = requestAnimationFrame(loopSanctuary); else animId = requestAnimationFrame(loopLooter); }
};
window.buySkill = function (idx) {
  const cClass = lhPlayer.char;
  const spent  = charSkills[cClass].reduce((a, b) => a + b, 0);
  const avail  = (pLevel - 1) - spent;
  if (avail > 0 && charSkills[cClass][idx] < 5) {
    playSound('coin'); charSkills[cClass][idx]++;
    localStorage.setItem('borderSkills', JSON.stringify(charSkills)); renderSkills();
  } else { playSound('hit'); }
};
function renderSkills() {
  const cClass = lhPlayer.char;
  const spent  = charSkills[cClass].reduce((a, b) => a + b, 0);
  const avail  = (pLevel - 1) - spent;
  document.getElementById('skills-avail').innerText = avail;
  document.getElementById('skills-list').innerHTML  = sDefs[cClass].map((s, i) =>
    `<div class="bank-item"><div><span style="color:#0ff; font-weight:bold;">${s.n}</span><br><span style="font-size:0.9rem; color:#aaa;">Rank ${charSkills[cClass][i]}/5 (${s.d})</span></div><button class="bank-btn" onclick="window.buySkill(${i})">UPGRADE</button></div>`
  ).join('');
}

// ── INVENTORY ──────────────────────────────
window.openInventory = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('inv-screen').style.display = 'flex';
  inInventory = true; renderInventory();
};
window.closeInventory = function () {
  document.getElementById('inv-screen').style.display = 'none';
  inInventory = false; keys['KeyI'] = false; keys['i'] = false;
  if (!isBossMode) { if (animId) cancelAnimationFrame(animId); if (inSanctuary) animId = requestAnimationFrame(loopSanctuary); else animId = requestAnimationFrame(loopLooter); }
};
window.equipMod = function (idx) {
  playSound('coin');
  const mod = inventoryMods.splice(idx, 1)[0];
  if (mod.type === 'Class') {
    if (equippedCMod !== 'None') inventoryMods.push({ type: 'Class', name: equippedCMod, desc: getModDesc(equippedCMod) });
    equippedCMod = mod.name; localStorage.setItem('borderCMod', equippedCMod);
  } else if (mod.type === 'Grenade') {
    if (equippedGMod !== 'Standard') inventoryMods.push({ type: 'Grenade', name: equippedGMod, desc: getModDesc(equippedGMod) });
    equippedGMod = mod.name; localStorage.setItem('borderGMod', equippedGMod);
  } else if (mod.type === 'Armor') {
    if (equippedArmor.name !== 'None') inventoryMods.push({ type: 'Armor', name: equippedArmor.name, desc: `...`, dmgRed: equippedArmor.dmgRed, hpBonus: equippedArmor.hpBonus, c: '#00ffff' });
    equippedArmor = { name: mod.name, dmgRed: mod.dmgRed, hpBonus: mod.hpBonus };
    localStorage.setItem('borderArmor', JSON.stringify(equippedArmor));
  }
  localStorage.setItem('borderInvMods', JSON.stringify(inventoryMods));
  renderInventory();
};
window.equipBackpackGun = function (idx) {
  playSound('coin');
  const temp = JSON.parse(JSON.stringify(lhPlayer.gun));
  lhPlayer.gun = backpackGuns.splice(idx, 1)[0];
  if (temp.name !== 'Starter Pistol') backpackGuns.push(temp);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  localStorage.setItem('borderGun',          JSON.stringify(lhPlayer.gun));
  renderInventory();
};
window.dropBackpackGun = function (idx) {
  playSound('hit'); backpackGuns.splice(idx, 1);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  renderInventory();
};
function renderInventory() {
  document.getElementById('inv-gun').innerText    = lhPlayer.gun.name;
  document.getElementById('inv-gun').style.color  = lhPlayer.gun.c;
  document.getElementById('inv-class').innerText  = equippedCMod;
  document.getElementById('inv-grenade').innerText= equippedGMod;
  document.getElementById('inv-armor').innerText  = equippedArmor.name;

  const modList = document.getElementById('inv-list');
  modList.innerHTML = inventoryMods.length === 0 ? '<p style="text-align:center; color:#888;">No Mods.</p>' : '';
  inventoryMods.forEach((mod, idx) => {
    const color = mod.type === 'Class' ? '#0ff' : (mod.type === 'Grenade' ? '#0f0' : '#00ffff');
    const div   = document.createElement('div'); div.className = 'bank-item'; div.style.width = '100%';
    div.innerHTML = `<div><span style="color:${color}; font-weight:bold; font-size:1.1rem;">[${mod.type}] ${mod.name}</span><br><span style="font-size:0.9rem; color:#aaa;">${mod.desc}</span></div><button class="bank-btn" onclick="window.equipMod(${idx})">EQUIP</button>`;
    modList.appendChild(div);
  });

  document.getElementById('inv-gun-count').innerText = backpackGuns.length;
  const gunList = document.getElementById('inv-guns-list');
  gunList.innerHTML = backpackGuns.length === 0 ? '<p style="text-align:center; color:#888;">No Guns in Backpack.</p>' : '';
  backpackGuns.forEach((g, idx) => {
    const div = document.createElement('div'); div.className = 'bank-item'; div.style.width = '100%';
    div.innerHTML = `<div><span style="color:${g.c}; font-weight:bold; font-size:1.1rem;">${g.name}</span><br><span style="font-size:0.9rem; color:#aaa;">DMG: ${g.dmg} | FR: ${g.fr}</span></div><div style="display:flex; gap:5px;"><button class="bank-btn" style="background:#00ffcc;" onclick="window.equipBackpackGun(${idx})">EQUIP</button><button class="bank-btn" style="background:#ff3333; color:#fff;" onclick="window.dropBackpackGun(${idx})">DROP</button></div>`;
    gunList.appendChild(div);
  });
}