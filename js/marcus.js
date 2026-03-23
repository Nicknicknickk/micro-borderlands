/* ==========================================
   MARCUS.JS — Gun Shop & Sell System v1.0
   "You wanna know how I got these guns?
    Sit down, I'll tell you a story..."
   ========================================== */

// ── Marcus Shop State ─────────────────────
let marcusShopOpen   = false;
let marcusShopGuns   = [];   // 4 guns in rotation, refreshed each run
let marcusSellMode   = false;

// ── Generate Marcus's shop stock ──────────
// Called once per run (from startSanctuary or startLooter reset)
function refreshMarcusShop() {
  marcusShopGuns = [];
  const shopRarities = [1, 2, 3, 4]; // always one of each: uncommon→legendary
  shopRarities.forEach(rarity => {
    const wTypes  = ['Pistol','SMG','Shotgun','Sniper','Launcher'];
    const nameMatrix = [
      ['Peashooter','Scrap SMG','Boomstick','Broken Sniper','Dud Pipe'],
      ['Sidearm','Tactical SMG','Riot Sweeper','Service Rifle','RPG'],
      ['Magnum','Rapid Caster','Breacher','Longbow','Bazooka'],
      ['Elite Cannon','Plasma Spitter','Devastator','Assassin','Nukem'],
      ['The Infinity','Hellfire','Conference Call','Volcano','Mongol'],
    ];
    const colors  = ['#ffffff','#00ff00','#0099ff','#800080','#ffa500'];
    const type    = Math.floor(Math.random() * 5);
    const wType   = wTypes[type];
    let dmg = Math.floor(15 + rarity * 25 + Math.random() * 20);
    let fr  = Math.max(2, Math.floor(22 - rarity * 3 + Math.random() * 8));
    let spd = 8 + rarity + Math.random() * 4;
    if (wType === 'Shotgun')  { dmg *= 0.6; fr += 20; spd -= 2; }
    if (wType === 'SMG')      { dmg = Math.floor(dmg * 0.4); fr = Math.max(2, fr - 10); }
    if (wType === 'Sniper')   { dmg *= 4.5; fr += 30; spd += 8; }
    if (wType === 'Launcher') { dmg *= 6;   fr += 45; spd -= 4; }
    dmg = Math.floor(dmg);

    // Mayhem scaling for shop guns
    let finalName = nameMatrix[rarity][type];
    if (mayhemMode === 50) { dmg *= 2500; finalName = 'M50 ' + finalName; }
    else if (mayhemMode === 20) { dmg *= 50; finalName = 'M20 ' + finalName; }
    else if (mayhemMode === 10) { dmg *= 5;  finalName = 'M10 ' + finalName; }

    // Price: scales with rarity & damage
    const basePrice = [0, 300, 800, 2000, 5000][rarity];
    const price = basePrice + Math.floor(dmg * (rarity < 3 ? 0.5 : 0.2));

    marcusShopGuns.push({
      name: finalName, c: colors[rarity], dmg, fr, spd,
      rarity, wType, timer: 0, price, sold: false
    });
  });
}

// ── Sell value for a gun ──────────────────
function getSellValue(gun) {
  if (!gun || gun.name === 'Starter Pistol') return 0;
  const rarityMult = [50, 150, 400, 1000, 2500, 4000, 8000];
  const base = rarityMult[gun.rarity || 0] || 100;
  return Math.floor(base + gun.dmg * 0.3);
}

// ── Open Marcus Shop ──────────────────────
window.openMarcus = function () {
  if (animId) cancelAnimationFrame(animId);
  marcusShopOpen = true;
  marcusSellMode = false;
  document.getElementById('marcus-screen').style.display = 'flex';
  renderMarcus();
};

window.closeMarcus = function () {
  document.getElementById('marcus-screen').style.display = 'none';
  marcusShopOpen = false;
  keys['KeyE'] = false; keys['e'] = false;
  if (!isBossMode) {
    if (animId) cancelAnimationFrame(animId);
    if (inSanctuary) animId = requestAnimationFrame(loopSanctuary);
    else animId = requestAnimationFrame(loopLooter);
  }
};

window.marcusBuyGun = function (idx) {
  const gun = marcusShopGuns[idx];
  if (!gun || gun.sold) { playSound('hit'); return; }
  if (playerCoins < gun.price) {
    playSound('hit');
    lhDmgText.push({ x: 400, y: 200, txt: 'NOT ENOUGH CREDITS!', life: 40, c: '#f00' });
    renderMarcus(); return;
  }
  if (backpackGuns.length >= 100) {
    playSound('hit');
    lhDmgText.push({ x: 400, y: 200, txt: 'BACKPACK FULL!', life: 40, c: '#f00' });
    renderMarcus(); return;
  }
  playerCoins -= gun.price;
  localStorage.setItem('borderCoins', playerCoins);
  gun.sold = true;
  const purchased = { name: gun.name, c: gun.c, dmg: gun.dmg, fr: gun.fr, spd: gun.spd, rarity: gun.rarity, wType: gun.wType, timer: 0 };
  backpackGuns.push(purchased);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  playSound('coin');
  if (gun.rarity >= 4) unlockAchievement('legendary');
  renderMarcus();
};

window.marcusSellBackpack = function (idx) {
  const gun = backpackGuns[idx];
  if (!gun) return;
  const val = getSellValue(gun);
  playerCoins += val;
  localStorage.setItem('borderCoins', playerCoins);
  backpackGuns.splice(idx, 1);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  playSound('coin');
  renderMarcus();
};

window.marcusSellBank = function (idx) {
  const gun = bankGuns[idx];
  if (!gun) return;
  const val = getSellValue(gun);
  playerCoins += val;
  localStorage.setItem('borderCoins', playerCoins);
  bankGuns.splice(idx, 1);
  localStorage.setItem('borderBank', JSON.stringify(bankGuns));
  playSound('coin');
  renderMarcus();
};

window.marcusSellEquipped = function () {
  if (!lhPlayer || lhPlayer.gun.name === 'Starter Pistol') { playSound('hit'); return; }
  const val = getSellValue(lhPlayer.gun);
  playerCoins += val;
  localStorage.setItem('borderCoins', playerCoins);
  lhPlayer.gun = { name: 'Starter Pistol', c: '#fff', dmg: 20, fr: 12, spd: 10, timer: 0 };
  localStorage.setItem('borderGun', JSON.stringify(lhPlayer.gun));
  playSound('coin');
  renderMarcus();
};

window.toggleMarcusSellMode = function () {
  marcusSellMode = !marcusSellMode;
  renderMarcus();
};

// ── Render Marcus UI ──────────────────────
function renderMarcus() {
  const screen = document.getElementById('marcus-screen');
  const rarityNames = ['Common','Uncommon','Rare','Epic','Legendary','E-Tech','Pearl'];
  const rarityGlows = ['#aaa','#00ff00','#0099ff','#9900cc','#ff8800','#ff00ff','#00ffff'];

  const creditsColor = playerCoins >= 5000 ? '#00ffcc' : playerCoins >= 1000 ? '#ffcc00' : '#ff5555';

  screen.innerHTML = `
    <div style="width:100%;max-width:860px;padding:10px 20px;box-sizing:border-box;">

      <!-- Header -->
      <div style="display:flex;align-items:center;gap:18px;margin-bottom:16px;border-bottom:2px solid #ffcc00;padding-bottom:12px;">
        <div style="font-size:3rem;filter:drop-shadow(0 0 8px #ffcc00);">🎩</div>
        <div>
          <div style="color:#ffcc00;font-size:1.5rem;font-weight:bold;letter-spacing:2px;">MARCUS'S MUNITIONS</div>
          <div style="color:#aaa;font-size:0.85rem;font-style:italic;">"Let me tell you about the time I sold guns to a vault hunter..."</div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="color:${creditsColor};font-size:1.3rem;font-weight:bold;">$${playerCoins.toLocaleString()}</div>
          <div style="color:#888;font-size:0.8rem;">YOUR CREDITS</div>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div style="display:flex;gap:10px;margin-bottom:14px;">
        <button onclick="window.toggleMarcusSellMode()" style="
          background:${!marcusSellMode ? '#ffcc00' : 'transparent'};
          color:${!marcusSellMode ? '#000' : '#ffcc00'};
          border:2px solid #ffcc00;padding:8px 20px;font-size:1rem;
          cursor:pointer;font-family:inherit;font-weight:bold;width:auto;
          box-shadow:${!marcusSellMode ? '0 0 12px #ffcc00' : 'none'};
        ">🛒 BUY GUNS</button>
        <button onclick="window.toggleMarcusSellMode()" style="
          background:${marcusSellMode ? '#ff4444' : 'transparent'};
          color:${marcusSellMode ? '#fff' : '#ff4444'};
          border:2px solid #ff4444;padding:8px 20px;font-size:1rem;
          cursor:pointer;font-family:inherit;font-weight:bold;width:auto;
          box-shadow:${marcusSellMode ? '0 0 12px #ff4444' : 'none'};
        ">💸 SELL GUNS</button>
        <button onclick="window.closeMarcus()" style="
          margin-left:auto;background:transparent;color:#888;border:2px solid #555;
          padding:8px 16px;font-size:1rem;cursor:pointer;font-family:inherit;width:auto;
        ">✕ CLOSE</button>
      </div>

      ${!marcusSellMode ? renderMarcusBuyTab(rarityNames, rarityGlows) : renderMarcusSellTab(rarityNames, rarityGlows)}
    </div>
  `;
}

function renderMarcusBuyTab(rarityNames, rarityGlows) {
  const shopItems = marcusShopGuns.map((gun, idx) => {
    const canAfford = playerCoins >= gun.price;
    const glow = rarityGlows[gun.rarity] || '#fff';
    return `
      <div style="
        display:flex;align-items:center;gap:12px;
        border:2px solid ${gun.sold ? '#333' : glow};
        background:${gun.sold ? 'rgba(255,255,255,0.03)' : `rgba(0,0,0,0.6)`};
        padding:12px 16px;margin-bottom:8px;border-radius:4px;
        box-shadow:${gun.sold ? 'none' : `0 0 10px ${glow}33`};
        opacity:${gun.sold ? 0.4 : 1};
      ">
        <div style="width:14px;height:14px;border-radius:50%;background:${gun.c};
          box-shadow:0 0 8px ${gun.c};flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="color:${gun.c};font-weight:bold;font-size:1.05rem;">${gun.name}</div>
          <div style="color:#aaa;font-size:0.82rem;">
            ${rarityNames[gun.rarity]} ${gun.wType} &nbsp;|&nbsp; DMG: <span style="color:#ff9">${Math.floor(gun.dmg)}</span>
            &nbsp;|&nbsp; FR: <span style="color:#9f9">${gun.fr}</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="color:${canAfford && !gun.sold ? '#ffcc00' : '#888'};font-weight:bold;font-size:1.1rem;">
            $${gun.price.toLocaleString()}
          </div>
          ${!gun.sold
            ? `<button onclick="window.marcusBuyGun(${idx})" style="
                background:${canAfford ? '#ffcc00' : '#333'};
                color:${canAfford ? '#000' : '#666'};
                border:none;padding:5px 14px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
                font-weight:bold;font-family:inherit;font-size:0.9rem;margin-top:4px;width:auto;box-shadow:none;
              ">${canAfford ? 'BUY' : 'BROKE'}</button>`
            : `<div style="color:#555;font-size:0.85rem;margin-top:4px;">SOLD</div>`
          }
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="color:#888;font-size:0.8rem;margin-bottom:10px;font-style:italic;">
      Stock refreshes each new run. Marcus doesn't do returns.
    </div>
    ${shopItems}
  `;
}

function renderMarcusSellTab(rarityNames, rarityGlows) {
  const equippedVal  = lhPlayer ? getSellValue(lhPlayer.gun) : 0;
  const equippedName = lhPlayer ? lhPlayer.gun.name : '—';
  const equippedColor = lhPlayer ? lhPlayer.gun.c : '#fff';

  const equippedRow = equippedName !== 'Starter Pistol' ? `
    <div style="border:2px solid #ffcc00;padding:12px 16px;margin-bottom:8px;background:rgba(255,204,0,0.08);border-radius:4px;display:flex;align-items:center;gap:12px;">
      <div style="flex:1;">
        <div style="color:#ffcc00;font-size:0.75rem;font-weight:bold;letter-spacing:1px;">EQUIPPED</div>
        <div style="color:${equippedColor};font-weight:bold;">${equippedName}</div>
      </div>
      <div style="text-align:right;">
        <div style="color:#00ffcc;font-weight:bold;">+$${equippedVal.toLocaleString()}</div>
        <button onclick="window.marcusSellEquipped()" style="
          background:#ff4444;color:#fff;border:none;padding:5px 14px;
          cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.9rem;margin-top:4px;width:auto;box-shadow:none;
        ">SELL</button>
      </div>
    </div>` : '';

  const backpackRows = backpackGuns.length === 0
    ? '<div style="color:#555;text-align:center;padding:16px;">Backpack is empty.</div>'
    : backpackGuns.map((gun, idx) => {
        const val  = getSellValue(gun);
        const glow = rarityGlows[gun.rarity || 0] || '#fff';
        return `
          <div style="display:flex;align-items:center;gap:12px;border:1px solid #333;padding:10px 14px;
            margin-bottom:6px;border-radius:3px;background:rgba(255,255,255,0.03);">
            <div style="width:10px;height:10px;border-radius:50%;background:${gun.c};flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="color:${gun.c};font-weight:bold;">${gun.name}</div>
              <div style="color:#777;font-size:0.8rem;">${rarityNames[gun.rarity||0]||'?'} ${gun.wType||''} | DMG: ${Math.floor(gun.dmg)}</div>
            </div>
            <div style="text-align:right;">
              <div style="color:#00ffcc;font-weight:bold;">+$${val.toLocaleString()}</div>
              <button onclick="window.marcusSellBackpack(${idx})" style="
                background:#ff4444;color:#fff;border:none;padding:4px 12px;
                cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.85rem;margin-top:3px;width:auto;box-shadow:none;
              ">SELL</button>
            </div>
          </div>
        `;
      }).join('');

  const bankRows = bankGuns.length === 0
    ? '<div style="color:#555;text-align:center;padding:16px;">Vault is empty.</div>'
    : bankGuns.map((gun, idx) => {
        const val  = getSellValue(gun);
        const glow = rarityGlows[gun.rarity || 0] || '#fff';
        return `
          <div style="display:flex;align-items:center;gap:12px;border:1px solid #333;padding:10px 14px;
            margin-bottom:6px;border-radius:3px;background:rgba(0,255,204,0.03);">
            <div style="width:10px;height:10px;border-radius:50%;background:${gun.c};flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="color:${gun.c};font-weight:bold;">${gun.name}</div>
              <div style="color:#777;font-size:0.8rem;">${rarityNames[gun.rarity||0]||'?'} ${gun.wType||''} | DMG: ${Math.floor(gun.dmg)}</div>
            </div>
            <div style="text-align:right;">
              <div style="color:#00ffcc;font-weight:bold;">+$${val.toLocaleString()}</div>
              <button onclick="window.marcusSellBank(${idx})" style="
                background:#ff4444;color:#fff;border:none;padding:4px 12px;
                cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.85rem;margin-top:3px;width:auto;box-shadow:none;
              ">SELL</button>
            </div>
          </div>
        `;
      }).join('');

  return `
    <div style="color:#888;font-size:0.8rem;margin-bottom:10px;font-style:italic;">
      Marcus buys at roughly 30% of item value. He's a businessman, not a charity.
    </div>
    ${equippedRow}
    <div style="color:#ffcc00;font-size:0.85rem;font-weight:bold;margin:10px 0 6px;letter-spacing:1px;">BACKPACK (${backpackGuns.length})</div>
    ${backpackRows}
    <div style="color:#00ffcc;font-size:0.85rem;font-weight:bold;margin:14px 0 6px;letter-spacing:1px;">VAULT (${bankGuns.length})</div>
    ${bankRows}
  `;
}