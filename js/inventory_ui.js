/* ==========================================
   INVENTORY_UI.JS — Rebuilt Inventory v2.0
   Left panel: full player stats
   Right panel: gear, mods, guns
   ========================================== */

// ── Replace the openInventory / closeInventory / renderInventory in ui.js ──

window.openInventory = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('inv-screen').style.display = 'flex';
  inInventory = true;
  renderInventoryV2();
};

window.closeInventory = function () {
  document.getElementById('inv-screen').style.display = 'none';
  inInventory = false;
  keys['KeyI'] = false; keys['i'] = false;
  if (!isBossMode) {
    if (animId) cancelAnimationFrame(animId);
    if (inSanctuary) animId = requestAnimationFrame(loopSanctuary);
    else animId = requestAnimationFrame(loopLooter);
  }
};

// ── DPS Calculator ─────────────────────────
function calculateDPS() {
  if (!lhPlayer) return { dps: 0, dmg: 0, fr: 0 };
  const gun = lhPlayer.gun;
  const dmgBonus  = 1 + (lhPlayer.mods.dmg || 0) + (rankDmg * 0.1);
  const frBonus   = Math.max(1, (gun.fr || 12) - (lhPlayer.mods.fr || 0) - rankFireRate);
  const baseDmg   = (gun.dmg || 20) * dmgBonus;

  // Weapon-type specific pellet multipliers
  const pellets   = gun.wType === 'Shotgun' ? 6 : 1;
  const dps       = Math.floor((baseDmg * pellets) / (frBonus / 60));
  return { dps, dmg: Math.floor(baseDmg * pellets), fr: frBonus };
}

// ── Badass rank total summary ──────────────
function getBadassTotal() {
  return rankHP + rankSpeed + rankFireRate + rankDmg;
}

// ── Character class display names ──────────
const CLASS_DISPLAY = {
  zero:    { name: 'ZER0',     color: '#00ffcc', skill: 'Deception',    role: 'Assassin'   },
  maya:    { name: 'MAYA',     color: '#0099ff', skill: 'Phaselock',    role: 'Siren'      },
  axton:   { name: 'AXTON',    color: '#ffcc00', skill: 'Sabre Turret', role: 'Commando'   },
  salvador:{ name: 'SALVADOR', color: '#ff4400', skill: 'Gunzerking',   role: 'Gunzerker'  },
  krieg:   { name: 'KRIEG',    color: '#ff0000', skill: 'Buzz Axe',     role: 'Psycho'     },
  gaige:   { name: 'GAIGE',    color: '#cc00ff', skill: 'Deathtrap',    role: 'Mechromancer'}
};

// ── Element summary string ─────────────────
function getElementStr() {
  const parts = [];
  if (fireLvl  > 0) parts.push(`<span style="color:#ff4500">🔥 Fire Lv${fireLvl}</span>`);
  if (shockLvl > 0) parts.push(`<span style="color:#00ffff">⚡ Shock Lv${shockLvl}</span>`);
  if (acidLvl  > 0) parts.push(`<span style="color:#32cd32">🧪 Acid Lv${acidLvl}</span>`);
  return parts.length ? parts.join(' &nbsp;') : '<span style="color:#555">None</span>';
}

// ── Skill summary for current class ────────
function getSkillSummary() {
  if (!lhPlayer) return '';
  const cClass = lhPlayer.char;
  const skills = charSkills[cClass] || [0,0,0];
  const defs   = sDefs[cClass] || [];
  return defs.map((s, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1a1a2e;">
      <span style="color:#aaa;font-size:0.8rem;">${s.n}</span>
      <div style="display:flex;gap:3px;">
        ${[0,1,2,3,4].map(pt => `<div style="width:10px;height:10px;border-radius:2px;background:${pt < skills[i] ? '#00ffcc' : '#222'};border:1px solid #333;"></div>`).join('')}
      </div>
    </div>
  `).join('');
}

// ── Stat bar helper ────────────────────────
function statBar(val, max, color) {
  const pct = Math.min(100, Math.floor((val / max) * 100));
  return `
    <div style="height:6px;background:#111;border-radius:3px;overflow:hidden;margin-top:3px;">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.3s;"></div>
    </div>
  `;
}

// ── Main render ────────────────────────────
function renderInventoryV2() {
  const screen = document.getElementById('inv-screen');
  if (!screen) return;

  const p      = lhPlayer;
  const cls    = p ? CLASS_DISPLAY[p.char] || CLASS_DISPLAY['zero'] : CLASS_DISPLAY['zero'];
  const dpsInfo = calculateDPS();
  const shield = typeof equippedShield !== 'undefined' ? equippedShield : null;

  const shieldName  = shield ? shield.name : `Shield Lv${shieldLvl}`;
  const shieldColor = shield ? shield.color : '#00aaff';
  const shieldCap   = p ? Math.floor(p.maxShield) : 50 + shieldLvl * 50;

  const rarityNames = ['Common','Uncommon','Rare','Epic','Legendary','E-Tech','Pearl'];
  const rarityGlows = ['#aaa','#00ff00','#0099ff','#800080','#ffa500','#ff00ff','#00ffff'];

  screen.innerHTML = `
  <div style="
    display:flex;width:100%;height:100%;max-height:100vh;
    font-family:'Courier New',monospace;box-sizing:border-box;
  ">

    <!-- ══════════════════════════════════ -->
    <!-- LEFT PANEL — PLAYER STATS         -->
    <!-- ══════════════════════════════════ -->
    <div style="
      width:300px;min-width:280px;flex-shrink:0;
      background:rgba(0,0,0,0.7);
      border-right:2px solid #333;
      overflow-y:auto;padding:16px;box-sizing:border-box;
    ">

      <!-- Class Badge -->
      <div style="
        background:${cls.color}18;border:2px solid ${cls.color};
        border-radius:6px;padding:12px;margin-bottom:16px;text-align:center;
      ">
        <div style="color:${cls.color};font-size:1.5rem;font-weight:bold;letter-spacing:3px;">${cls.name}</div>
        <div style="color:#888;font-size:0.78rem;">${cls.role} &nbsp;·&nbsp; <span style="color:${cls.color}">${cls.skill}</span></div>
      </div>

      <!-- Level & EXP -->
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <span style="color:#0ff;font-weight:bold;font-size:1.1rem;">LEVEL ${pLevel}</span>
          <span style="color:#555;font-size:0.75rem;">/72</span>
        </div>
        <div style="color:#555;font-size:0.78rem;margin-bottom:3px;">${pExp} / ${getExpRequired(pLevel)} XP</div>
        ${statBar(pExp, getExpRequired(pLevel), '#0ff')}
        <div style="color:#555;font-size:0.72rem;margin-top:4px;">${Math.floor(pExp/getExpRequired(pLevel)*100)}% to next level</div>
      </div>

      <!-- HP & Shield -->
      <div style="margin-bottom:14px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">VITALS</div>

        <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
          <span style="color:#ff3333;font-size:0.85rem;">❤ HP</span>
          <span style="color:#fff;font-size:0.85rem;">${p ? Math.floor(Math.max(0, p.hp)) : '—'} / ${p ? Math.floor(p.maxHp) : '—'}</span>
        </div>
        ${p ? statBar(Math.max(0, p.hp), p.maxHp, '#ff3333') : ''}

        <div style="display:flex;justify-content:space-between;margin-top:8px;margin-bottom:2px;">
          <span style="color:${shieldColor};font-size:0.85rem;">🛡 Shield</span>
          <span style="color:#fff;font-size:0.85rem;">${p ? Math.floor(Math.max(0, p.shield)) : '—'} / ${shieldCap}</span>
        </div>
        ${p ? statBar(Math.max(0, p.shield), shieldCap, shieldColor) : ''}
        <div style="color:#555;font-size:0.72rem;margin-top:3px;">${shieldName}</div>
      </div>

      <!-- Combat Stats -->
      <div style="margin-bottom:14px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">COMBAT</div>
        ${statRow('DPS', dpsInfo.dps.toLocaleString(), '#ff9900')}
        ${statRow('Damage/Shot', dpsInfo.dmg.toLocaleString(), '#ffcc00')}
        ${statRow('Fire Rate', `${dpsInfo.fr} frames`, '#00ff88')}
        ${statRow('Crit Chance', `${Math.floor((0.15 + (p ? p.mods.crit : 0)) * 100)}%`, '#ff4444')}
        ${statRow('Move Speed', `${(5 + rankSpeed * 0.3).toFixed(1)}`, '#00ccff')}
        ${statRow('Grenades', `${p ? p.grenades : 0}/3`, '#88ff00')}
      </div>

      <!-- Badass Ranks -->
      <div style="margin-bottom:14px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">BADASS RANKS &nbsp;<span style="color:#ff6a00">(${getBadassTotal()} pts)</span></div>
        ${statRow('Max Health',    `+${rankHP * 25} HP`, '#0f0')}
        ${statRow('Move Speed',    `+${(rankSpeed * 0.3).toFixed(1)}`, '#0ff')}
        ${statRow('Fire Rate',     `-${rankFireRate} delay`, '#ffcc00')}
        ${statRow('Gun Damage',    `+${rankDmg * 10}%`, '#ff007f')}
      </div>

      <!-- Elements -->
      <div style="margin-bottom:14px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">ELEMENTS</div>
        <div style="font-size:0.85rem;line-height:1.8;">${getElementStr()}</div>
      </div>

      <!-- Skill Tree Summary -->
      <div style="margin-bottom:14px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">SKILL TREE</div>
        <div style="color:#888;font-size:0.75rem;margin-bottom:4px;">
          Points spent: ${p ? charSkills[p.char].reduce((a,b)=>a+b,0) : 0} / ${Math.max(0, pLevel - 1)}
        </div>
        ${getSkillSummary()}
      </div>

      <!-- Run Stats -->
      <div>
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:6px;">RUN STATS</div>
        ${statRow('Runs Completed', runCount, '#39ff14')}
        ${statRow('Badass Tokens',  badassTokens, '#ff6a00')}
        ${statRow('Credits',       `$${playerCoins.toLocaleString()}`, '#ffcc00')}
        ${statRow('Kills (session)', typeof lhKills !== 'undefined' ? lhKills : 0, '#ff4444')}
        ${statRow('Total Kills',   typeof totalKills !== 'undefined' ? totalKills : 0, '#ff8800')}
        ${statRow('Mayhem Mode',   mayhemMode === 0 ? 'OFF' : `M${mayhemMode}`, mayhemMode > 0 ? '#ff0000' : '#555')}
      </div>
    </div>

    <!-- ══════════════════════════════════ -->
    <!-- RIGHT PANEL — GEAR & MODS        -->
    <!-- ══════════════════════════════════ -->
    <div style="flex:1;overflow-y:auto;padding:16px 20px;box-sizing:border-box;">

      <!-- Header row -->
      <div style="display:flex;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #333;">
        <div style="color:#ffa500;font-size:1.3rem;font-weight:bold;letter-spacing:2px;">ECHO DEVICE</div>
        <button onclick="window.closeInventory()" style="
          margin-left:auto;background:transparent;color:#888;border:1px solid #555;
          padding:6px 14px;cursor:pointer;font-family:inherit;font-size:0.9rem;width:auto;box-shadow:none;
        ">✕ CLOSE [I]</button>
      </div>

      <!-- Equipped gear row -->
      <div style="margin-bottom:18px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:8px;">EQUIPPED GEAR</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">

          <!-- Weapon -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid ${p ? p.gun.c : '#333'};border-radius:4px;padding:10px;box-shadow:0 0 8px ${p ? p.gun.c + '33' : 'transparent'};">
            <div style="color:#666;font-size:0.7rem;margin-bottom:4px;">🔫 WEAPON</div>
            <div style="color:${p ? p.gun.c : '#fff'};font-weight:bold;font-size:0.9rem;">${p ? p.gun.name : '—'}</div>
            ${p && p.gun.wType ? `<div style="color:#777;font-size:0.75rem;">${p.gun.wType} | DMG ${Math.floor(p.gun.dmg)} | FR ${p.gun.fr}</div>` : ''}
          </div>

          <!-- Shield -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid ${shieldColor}55;border-radius:4px;padding:10px;">
            <div style="color:#666;font-size:0.7rem;margin-bottom:4px;">🛡️ SHIELD</div>
            <div style="color:${shieldColor};font-weight:bold;font-size:0.9rem;">${shieldName}</div>
            <div style="color:#777;font-size:0.75rem;">Cap: ${shieldCap}</div>
          </div>

          <!-- Class Mod -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid #0ff3;border-radius:4px;padding:10px;">
            <div style="color:#666;font-size:0.7rem;margin-bottom:4px;">🔧 CLASS MOD</div>
            <div style="color:#0ff;font-weight:bold;font-size:0.9rem;">${equippedCMod}</div>
            <div style="color:#777;font-size:0.75rem;">${equippedCMod !== 'None' ? getModDesc(equippedCMod) : 'No mod equipped'}</div>
          </div>

          <!-- Grenade Mod -->
          <div style="background:rgba(255,255,255,0.04);border:1px solid #0f03;border-radius:4px;padding:10px;">
            <div style="color:#666;font-size:0.7rem;margin-bottom:4px;">💣 GRENADE MOD</div>
            <div style="color:#0f0;font-weight:bold;font-size:0.9rem;">${equippedGMod}</div>
            <div style="color:#777;font-size:0.75rem;">${equippedGMod !== 'Standard' ? getModDesc(equippedGMod) : 'Standard grenades'}</div>
          </div>
        </div>
      </div>

      <!-- Mods in storage -->
      <div style="margin-bottom:18px;">
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:8px;">STORED MODS (${inventoryMods.length})</div>
        ${inventoryMods.length === 0
          ? '<div style="color:#444;font-size:0.85rem;padding:10px 0;">No mods in ECHO storage.</div>'
          : inventoryMods.map((mod, idx) => {
              const color = mod.type === 'Class' ? '#0ff' : (mod.type === 'Grenade' ? '#0f0' : '#00ffff');
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;
                  border:1px solid #333;border-radius:3px;margin-bottom:5px;background:rgba(255,255,255,0.02);">
                  <div>
                    <span style="color:${color};font-weight:bold;font-size:0.9rem;">[${mod.type}] ${mod.name}</span><br>
                    <span style="color:#666;font-size:0.78rem;">${mod.desc}</span>
                  </div>
                  <button onclick="window.equipMod(${idx})" style="
                    margin-left:auto;background:${color};color:#000;border:none;
                    padding:4px 12px;cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.82rem;width:auto;box-shadow:none;flex-shrink:0;
                  ">EQUIP</button>
                </div>
              `;
            }).join('')
        }
      </div>

      <!-- Backpack Guns -->
      <div>
        <div style="color:#666;font-size:0.72rem;letter-spacing:1px;margin-bottom:8px;">
          BACKPACK (${backpackGuns.length}/100)
        </div>
        ${backpackGuns.length === 0
          ? '<div style="color:#444;font-size:0.85rem;padding:10px 0;">Backpack is empty.</div>'
          : backpackGuns.map((gun, idx) => {
              const glow = rarityGlows[gun.rarity || 0] || '#fff';
              return `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;
                  border:1px solid ${gun.c}55;border-radius:3px;margin-bottom:5px;
                  background:rgba(255,255,255,0.025);">
                  <div style="width:8px;height:8px;border-radius:50%;background:${gun.c};flex-shrink:0;box-shadow:0 0 6px ${gun.c};"></div>
                  <div style="flex:1;">
                    <div style="color:${gun.c};font-weight:bold;font-size:0.88rem;">${gun.name}</div>
                    <div style="color:#666;font-size:0.76rem;">${rarityNames[gun.rarity||0]||'?'} ${gun.wType||''} &nbsp;|&nbsp; DMG: ${Math.floor(gun.dmg)} &nbsp;|&nbsp; FR: ${gun.fr}</div>
                  </div>
                  <div style="display:flex;gap:5px;flex-shrink:0;">
                    <button onclick="window.equipBackpackGun(${idx})" style="
                      background:#00ffcc;color:#000;border:none;padding:4px 10px;
                      cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.8rem;width:auto;box-shadow:none;
                    ">EQUIP</button>
                    <button onclick="window.dropBackpackGun(${idx})" style="
                      background:#ff3333;color:#fff;border:none;padding:4px 10px;
                      cursor:pointer;font-weight:bold;font-family:inherit;font-size:0.8rem;width:auto;box-shadow:none;
                    ">DROP</button>
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    </div>
  </div>
  `;
}

// ── Helper: stat row ──────────────────────
function statRow(label, value, color = '#fff') {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid #111;">
      <span style="color:#666;font-size:0.8rem;">${label}</span>
      <span style="color:${color};font-weight:bold;font-size:0.82rem;">${value}</span>
    </div>
  `;
}

// ── Preserve existing equip/drop functions ─
window.equipMod = function (idx) {
  playSound('coin');
  const mod = inventoryMods.splice(idx, 1)[0];
  if (mod.type === 'Class') {
    if (equippedCMod !== 'None') inventoryMods.push({ type:'Class', name:equippedCMod, desc:getModDesc(equippedCMod) });
    equippedCMod = mod.name; localStorage.setItem('borderCMod', equippedCMod);
  } else if (mod.type === 'Grenade') {
    if (equippedGMod !== 'Standard') inventoryMods.push({ type:'Grenade', name:equippedGMod, desc:getModDesc(equippedGMod) });
    equippedGMod = mod.name; localStorage.setItem('borderGMod', equippedGMod);
  } else if (mod.type === 'Armor') {
    if (equippedArmor.name !== 'None') inventoryMods.push({ type:'Armor', name:equippedArmor.name, desc:'...', dmgRed:equippedArmor.dmgRed, hpBonus:equippedArmor.hpBonus });
    equippedArmor = { name:mod.name, dmgRed:mod.dmgRed, hpBonus:mod.hpBonus };
    localStorage.setItem('borderArmor', JSON.stringify(equippedArmor));
  }
  localStorage.setItem('borderInvMods', JSON.stringify(inventoryMods));
  renderInventoryV2();
};

window.equipBackpackGun = function (idx) {
  playSound('coin');
  const temp = JSON.parse(JSON.stringify(lhPlayer.gun));
  lhPlayer.gun = backpackGuns.splice(idx, 1)[0];
  if (temp.name !== 'Starter Pistol') backpackGuns.push(temp);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  localStorage.setItem('borderGun', JSON.stringify(lhPlayer.gun));
  renderInventoryV2();
};

window.dropBackpackGun = function (idx) {
  playSound('hit');
  backpackGuns.splice(idx, 1);
  localStorage.setItem('borderBackpackGuns', JSON.stringify(backpackGuns));
  renderInventoryV2();
};