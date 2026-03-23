/* ==========================================
   ZED_SHIELDS.JS — Named Shield System v1.0
   Real shield types, not just flat upgrades
   ========================================== */

// ── Shield Definitions ────────────────────
// Each shield has a unique mechanic beyond just capacity
const SHIELD_TYPES = [
  {
    id:      'standard',
    name:    'Standard Shield',
    tier:    1,
    price:   300,
    capacity: 100,
    recharge: 1.0,
    delay:    180,   // frames before regen starts
    color:   '#00aaff',
    effect:  'none',
    desc:    'Basic protection. Better than nothing.',
    icon:    '🛡️'
  },
  {
    id:      'adaptive',
    name:    'Adaptive Shield',
    tier:    2,
    price:   800,
    capacity: 150,
    recharge: 1.2,
    delay:    150,
    color:   '#00ffcc',
    effect:  'adaptive',   // gains bonus max shield when hit
    desc:    '+20% max capacity when hit. Adapts to damage.',
    icon:    '🔷'
  },
  {
    id:      'turtle',
    name:    'Turtle Shield',
    tier:    2,
    price:   900,
    capacity: 350,
    recharge: 0.5,
    delay:    240,
    color:   '#88aa00',
    effect:  'turtle',    // very high cap, slow regen, -15% move speed
    desc:    'Massive capacity, slow regen, -15% move speed.',
    icon:    '🐢'
  },
  {
    id:      'spike',
    name:    'Spike Shield',
    tier:    3,
    price:   1500,
    capacity: 200,
    recharge: 1.0,
    delay:    180,
    color:   '#ff4400',
    effect:  'spike',     // reflects 20% damage to attacker
    desc:    'Reflects 20% of absorbed damage back to enemies.',
    icon:    '⚡'
  },
  {
    id:      'nova',
    name:    'Nova Shield',
    tier:    3,
    price:   1800,
    capacity: 180,
    recharge: 1.1,
    delay:    160,
    color:   '#ff00ff',
    effect:  'nova',      // explodes when broken
    desc:    'Explodes in a Nova burst when shield breaks.',
    icon:    '💥'
  },
  {
    id:      'absorption',
    name:    'Absorption Shield',
    tier:    3,
    price:   2000,
    capacity: 220,
    recharge: 1.0,
    delay:    170,
    color:   '#aa00ff',
    effect:  'absorb',    // 25% chance to absorb enemy bullets as ammo
    desc:    '25% chance to absorb enemy bullets (heal on absorb).',
    icon:    '🔮'
  },
  {
    id:      'evolution',
    name:    'Evolution Shield',
    tier:    4,
    price:   4000,
    capacity: 300,
    recharge: 1.5,
    delay:    120,
    color:   '#00ff88',
    effect:  'evolve',    // regenerates HP while shield is active
    desc:    'Regenerates HP while shield is charged.',
    icon:    '🧬'
  },
  {
    id:      'antagonist',
    name:    'Antagonist Shield',
    tier:    4,
    price:   5000,
    capacity: 250,
    recharge: 1.2,
    delay:    150,
    color:   '#ffdd00',
    effect:  'antagonist', // deflects bullets
    desc:    'Deflects enemy projectiles while shield is above 50%.',
    icon:    '🌀'
  }
];

// ── Active shield tracking ─────────────────
let equippedShield = JSON.parse(localStorage.getItem('borderShieldType')) || SHIELD_TYPES[0];

// ── Apply shield stats to player ──────────
function applyShieldToPlayer(shieldDef) {
  if (!lhPlayer) return;
  equippedShield = shieldDef;
  localStorage.setItem('borderShieldType', JSON.stringify(shieldDef));
  const shdBonus = 1 + (lhPlayer.mods ? lhPlayer.mods.dmg || 0 : 0);
  lhPlayer.maxShield = shieldDef.capacity * shdBonus;
  lhPlayer.shield    = lhPlayer.maxShield;
  // Store effect flags on player
  lhPlayer.shieldEffect  = shieldDef.effect;
  lhPlayer.shieldColor   = shieldDef.color;
  lhPlayer.shieldRegenRate = shieldDef.recharge;
  lhPlayer.shieldDelayBase = shieldDef.delay;
}

// ── Zed shop open/close ───────────────────
window.openZed = function () {
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('zed-screen').style.display = 'flex';
  renderZed();
};

window.closeZed = function () {
  document.getElementById('zed-screen').style.display = 'none';
  keys['KeyE'] = false; keys['e'] = false;
  if (!isBossMode) {
    if (animId) cancelAnimationFrame(animId);
    if (inSanctuary) animId = requestAnimationFrame(loopSanctuary);
    else animId = requestAnimationFrame(loopLooter);
  }
};

window.buyShield = function (id) {
  const def = SHIELD_TYPES.find(s => s.id === id);
  if (!def) return;
  if (playerCoins < def.price) { playSound('hit'); return; }
  playerCoins -= def.price;
  localStorage.setItem('borderCoins', playerCoins);
  applyShieldToPlayer(def);
  playSound('ability');
  spawnParticles(200, 100, def.color, 30, 5, 30);
  lhDmgText.push({ x: 200, y: 60, txt: `${def.name} EQUIPPED!`, life: 50, c: def.color });
  renderZed();
};

window.buyGrenadesZed = function () {
  if (playerCoins >= 50 && lhPlayer && lhPlayer.grenades < 3) {
    playerCoins -= 50;
    lhPlayer.grenades = 3;
    localStorage.setItem('borderGrenades', 3);
    localStorage.setItem('borderCoins', playerCoins);
    playSound('coin');
    renderZed();
  } else { playSound('hit'); }
};

// ── Render Zed UI ─────────────────────────
function renderZed() {
  const screen = document.getElementById('zed-screen');
  const tierColors = ['','#aaa','#00ff00','#ff8800','#cc00ff'];
  const tierNames  = ['','Tier 1','Tier 2','Tier 3','Tier 4 — Legendary'];

  const currentName = equippedShield ? equippedShield.name : 'None';
  const currentColor = equippedShield ? equippedShield.color : '#fff';

  const shieldCards = SHIELD_TYPES.map(s => {
    const isEquipped = equippedShield && equippedShield.id === s.id;
    const canAfford  = playerCoins >= s.price;
    return `
      <div style="
        border:2px solid ${isEquipped ? s.color : '#333'};
        background:${isEquipped ? `${s.color}18` : 'rgba(255,255,255,0.03)'};
        padding:12px 16px;margin-bottom:8px;border-radius:4px;
        display:flex;align-items:center;gap:14px;
        box-shadow:${isEquipped ? `0 0 14px ${s.color}44` : 'none'};
      ">
        <div style="font-size:1.8rem;flex-shrink:0;">${s.icon}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="color:${s.color};font-weight:bold;font-size:1rem;">${s.name}</span>
            <span style="color:${tierColors[s.tier]};font-size:0.75rem;">${tierNames[s.tier]}</span>
            ${isEquipped ? '<span style="color:#ffcc00;font-size:0.75rem;font-weight:bold;">✓ EQUIPPED</span>' : ''}
          </div>
          <div style="color:#aaa;font-size:0.82rem;margin-top:2px;">${s.desc}</div>
          <div style="color:#777;font-size:0.78rem;margin-top:2px;">
            Capacity: <span style="color:#00aaff">${s.capacity}</span> &nbsp;|&nbsp;
            Regen: <span style="color:#0f0">${s.recharge}x</span> &nbsp;|&nbsp;
            Delay: <span style="color:#ff9">${(s.delay/60).toFixed(1)}s</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="color:${canAfford ? '#ffcc00' : '#888'};font-weight:bold;margin-bottom:6px;">
            $${s.price.toLocaleString()}
          </div>
          ${!isEquipped
            ? `<button onclick="window.buyShield('${s.id}')" style="
                background:${canAfford ? s.color : '#222'};
                color:${canAfford ? '#000' : '#555'};
                border:none;padding:5px 14px;cursor:${canAfford ? 'pointer' : 'not-allowed'};
                font-weight:bold;font-family:inherit;font-size:0.9rem;width:auto;box-shadow:none;
              ">${canAfford ? 'BUY' : 'BROKE'}</button>`
            : `<div style="color:#555;font-size:0.85rem;">EQUIPPED</div>`
          }
        </div>
      </div>
    `;
  }).join('');

  const grenadesDisabled = !lhPlayer || lhPlayer.grenades >= 3 || playerCoins < 50;

  screen.innerHTML = `
    <div style="width:100%;max-width:800px;padding:10px 20px;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;border-bottom:2px solid #ff3333;padding-bottom:12px;">
        <div style="font-size:2.5rem;">🏥</div>
        <div>
          <div style="color:#ff3333;font-size:1.4rem;font-weight:bold;letter-spacing:2px;">DR. ZED'S MEDICAL SUPPLIES</div>
          <div style="color:#aaa;font-size:0.85rem;font-style:italic;">"I may not have a medical license, but I know a good shield when I see one."</div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div style="color:#ffcc00;font-size:1.2rem;font-weight:bold;">$${playerCoins.toLocaleString()}</div>
          <div style="color:#888;font-size:0.78rem;">YOUR CREDITS</div>
        </div>
      </div>

      <!-- Equipped shield info -->
      <div style="background:rgba(0,170,255,0.1);border:1px solid #00aaff44;padding:10px 14px;border-radius:4px;margin-bottom:14px;display:flex;gap:12px;align-items:center;">
        <div>
          <div style="color:#888;font-size:0.75rem;letter-spacing:1px;">CURRENTLY EQUIPPED</div>
          <div style="color:${currentColor};font-weight:bold;font-size:1rem;">${currentName}</div>
          ${lhPlayer ? `<div style="color:#aaa;font-size:0.8rem;">Shield: ${Math.floor(lhPlayer.shield)} / ${Math.floor(lhPlayer.maxShield)}</div>` : ''}
        </div>
        <div style="margin-left:auto;">
          <button onclick="window.buyGrenadesZed()" style="
            background:${grenadesDisabled ? '#222' : '#00aa44'};
            color:${grenadesDisabled ? '#555' : '#fff'};
            border:1px solid ${grenadesDisabled ? '#333' : '#00aa44'};
            padding:8px 16px;cursor:${grenadesDisabled ? 'not-allowed' : 'pointer'};
            font-family:inherit;font-weight:bold;font-size:0.9rem;width:auto;box-shadow:none;
          ">💣 GRENADES x3 — $50 ${lhPlayer ? `(${lhPlayer.grenades}/3)` : ''}</button>
        </div>
      </div>

      <div style="color:#888;font-size:0.8rem;margin-bottom:10px;font-style:italic;">
        Select a shield to equip. Each has unique properties. Buying replaces your current shield.
      </div>

      <div style="max-height:55vh;overflow-y:auto;padding-right:4px;">
        ${shieldCards}
      </div>

      <button onclick="window.closeZed()" style="
        margin-top:14px;background:transparent;color:#888;border:1px solid #555;
        padding:8px 20px;cursor:pointer;font-family:inherit;width:auto;box-shadow:none;
      ">✕ CLOSE</button>
    </div>
  `;
}

// ── Per-frame shield effects (call from combat loop) ──
function processShieldEffects(mayhemMult) {
  if (!lhPlayer || !lhPlayer.shieldEffect) return;

  // HP regen from Evolution shield
  if (lhPlayer.shieldEffect === 'evolve' && lhPlayer.shield > 0 && lhPlayer.hp < lhPlayer.maxHp) {
    lhPlayer.hp = Math.min(lhPlayer.maxHp, lhPlayer.hp + 0.5);
  }

  // Antagonist deflect — mark bullets for deflection
  if (lhPlayer.shieldEffect === 'antagonist' && lhPlayer.shield > lhPlayer.maxShield * 0.5) {
    for (let i = lhEnemyBullets.length - 1; i >= 0; i--) {
      const b = lhEnemyBullets[i];
      if (Math.hypot(lhPlayer.x - b.x, lhPlayer.y - b.y) < 20 && Math.random() < 0.4) {
        // Deflect: turn bullet around toward nearest enemy
        if (lhEnemies.length > 0) {
          const target = lhEnemies[Math.floor(Math.random() * lhEnemies.length)];
          const ang = Math.atan2(target.y - b.y, target.x - b.x);
          lhBullets.push({ x: b.x, y: b.y, vx: Math.cos(ang)*10, vy: Math.sin(ang)*10, dmg: b.dmg*0.5, c: '#ffdd00', pierce: false, isRocket: false, isSniper: false, hitList: [] });
          spawnParticles(b.x, b.y, '#ffdd00', 8, 3, 12);
          lhEnemyBullets.splice(i, 1);
        }
      }
    }
  }
}

// ── On shield-break effects ────────────────
function onShieldBroken() {
  if (!lhPlayer || !equippedShield) return;
  if (equippedShield.effect === 'nova') {
    // Nova explosion — damages all nearby enemies
    playSound('explosion', lhPlayer.x);
    screenShake = 15;
    spawnParticles(lhPlayer.x, lhPlayer.y, equippedShield.color, 60, 10, 50);
    lhEnemies.forEach(e => {
      if (Math.hypot(e.x - lhPlayer.x, e.y - lhPlayer.y) < 180) {
        const novaDmg = 500 * (typeof mayhemMult !== 'undefined' ? mayhemMult : 1);
        e.hp -= novaDmg;
        e.flash = 8;
        lhDmgText.push({ x: e.x, y: e.y - 30, txt: `NOVA! ${Math.floor(novaDmg)}`, life: 40, c: '#ff00ff' });
      }
    });
  }
}

// ── On bullet absorbed by Absorption shield ──
function onBulletAbsorbed() {
  if (!lhPlayer) return;
  lhPlayer.hp = Math.min(lhPlayer.maxHp, lhPlayer.hp + 15);
  spawnParticles(lhPlayer.x, lhPlayer.y, '#aa00ff', 6, 2, 12);
}