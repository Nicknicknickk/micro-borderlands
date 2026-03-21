/* ==========================================
   UI.JS — All overlay screens & UI functions
   ========================================== */

// ── Menu Stats ─────────────────────────────
window.launchGame = function () {
  mainMenu.style.display      = 'none';
  gameContainer.style.display = 'flex';
  if (shouldRunTutorial()) startTutorial();
  else if (runCount > 0) startSanctuary();
  else startLooter();
};

window.showAchievements = function () {
  mainMenu.style.display      = 'none';
  gameContainer.style.display = 'flex';
  ctx.clearRect(0, 0, gCanvas.width, gCanvas.height);
  drawAchievementScreen(ctx, gCanvas.width, gCanvas.height);
  gCanvas.onclick = () => {
    gCanvas.onclick = null;
    gameContainer.style.display = 'none';
    mainMenu.style.display      = 'flex';
  };
};

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
window.buyRank = function (type) {
  if (badassTokens <= 0) { playSound('hit'); return; }
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
  document.getElementById('badass-list').innerHTML = `
    <div class="bank-item"><div><span style="color:#0f0; font-weight:bold;">Max Health</span><br><span style="font-size:0.9rem; color:#aaa;">Rank ${rankHP} (+${rankHP*25} HP)</span></div><button class="bank-btn" onclick="window.buyRank('hp')">UPGRADE</button></div>
    <div class="bank-item"><div><span style="color:#0ff; font-weight:bold;">Movement Speed</span><br><span style="font-size:0.9rem; color:#aaa;">Rank ${rankSpeed} (+${rankSpeed*0.5} Spd)</span></div><button class="bank-btn" onclick="window.buyRank('spd')">UPGRADE</button></div>
    <div class="bank-item"><div><span style="color:#ffcc00; font-weight:bold;">Fire Rate</span><br><span style="font-size:0.9rem; color:#aaa;">Rank ${rankFireRate} (-${rankFireRate} Delay)</span></div><button class="bank-btn" onclick="window.buyRank('fr')">UPGRADE</button></div>
    <div class="bank-item"><div><span style="color:#ff007f; font-weight:bold;">Gun Damage</span><br><span style="font-size:0.9rem; color:#aaa;">Rank ${rankDmg} (+${rankDmg*15}%)</span></div><button class="bank-btn" onclick="window.buyRank('dmg')">UPGRADE</button></div>`;
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