/* ==========================================
   ACHIEVEMENTS.JS — Trophy System v1.1
   PlayStation-style popup notifications
   Bulletproof version - won't crash game
   ========================================== */

const ACHIEVEMENTS = {
  first_blood:     { id:'first_blood',     name:'First Blood',      desc:'Kill your first enemy',          icon:'🎯', rarity:'bronze'  },
  serial_killer:   { id:'serial_killer',   name:'Serial Killer',    desc:'100 total kills',                icon:'💀', rarity:'silver'  },
  mass_murderer:   { id:'mass_murderer',   name:'Mass Murderer',    desc:'1000 total kills',               icon:'☠️', rarity:'gold'    },
  moneybags:       { id:'moneybags',       name:'Moneybags',        desc:'Earn 10,000 credits',            icon:'💰', rarity:'silver'  },
  vault_hunter:    { id:'vault_hunter',    name:'Vault Hunter',     desc:'Complete 10 runs',               icon:'🏆', rarity:'silver'  },
  raid_slayer:     { id:'raid_slayer',     name:'Raid Boss Slayer', desc:'Defeat a Raid Boss',             icon:'👑', rarity:'gold'    },
  pyromaniac:      { id:'pyromaniac',      name:'Pyromaniac',       desc:'Max out Fire element',           icon:'🔥', rarity:'silver'  },
  shock_and_awe:   { id:'shock_and_awe',   name:'Shock and Awe',    desc:'Max out Shock element',          icon:'⚡', rarity:'silver'  },
  acid_rain:       { id:'acid_rain',       name:'Acid Rain',        desc:'Max out Acid element',           icon:'🧪', rarity:'silver'  },
  jackpot:         { id:'jackpot',         name:'Jackpot!',         desc:'Win the slot machine',           icon:'🎰', rarity:'bronze'  },
  road_warrior:    { id:'road_warrior',    name:'Road Warrior',     desc:'Unlock the vehicle',             icon:'🚗', rarity:'bronze'  },
  legendary:       { id:'legendary',       name:'Legendary',        desc:'Find a Legendary weapon',        icon:'💎', rarity:'gold'    },
  crit_master:     { id:'crit_master',     name:'Crit Master',      desc:'Land 500 critical hits',        icon:'🎯', rarity:'silver'  },
  badass:          { id:'badass',          name:'Badass',           desc:'Earn 50 Badass tokens',         icon:'💪', rarity:'silver'  },
  explorer:        { id:'explorer',        name:'Explorer',         desc:'Unlock all maps',               icon:'🗺️', rarity:'bronze'  },
  platinum:        { id:'platinum',        name:'Platinum Trophy',  desc:'Unlock all other achievements', icon:'🏅', rarity:'platinum'},
};

// ── State ─────────────────────────────────
let unlockedAchievements = {};
let achievementQueue     = [];
let currentPopup         = null;
let popupTimer           = 0;
let totalKills           = 0;
let totalCrits           = 0;

// ── Load ──────────────────────────────────
function loadAchievements() {
  try {
    const saved = localStorage.getItem('achievements');
    if (saved) unlockedAchievements = JSON.parse(saved);
    totalKills = parseInt(localStorage.getItem('totalKills')) || 0;
    totalCrits = parseInt(localStorage.getItem('totalCrits')) || 0;
  } catch(e) { unlockedAchievements = {}; }
}

// ── Unlock ────────────────────────────────
function unlockAchievement(id) {
  try {
    if (unlockedAchievements[id]) return;
    const ach = ACHIEVEMENTS[id];
    if (!ach) return;
    unlockedAchievements[id] = Date.now();
    localStorage.setItem('achievements', JSON.stringify(unlockedAchievements));
    achievementQueue.push(ach);
    // Check platinum
    const nonPlatinum = Object.keys(ACHIEVEMENTS).filter(k => k !== 'platinum');
    if (nonPlatinum.every(k => unlockedAchievements[k]) && !unlockedAchievements['platinum']) {
      setTimeout(() => unlockAchievement('platinum'), 2500);
    }
  } catch(e) { console.warn('unlockAchievement error:', e); }
}

// ── Check each frame ──────────────────────
function checkAchievements() {
  try {
    if (totalKills >= 1    && !unlockedAchievements['first_blood'])   unlockAchievement('first_blood');
    if (totalKills >= 100  && !unlockedAchievements['serial_killer']) unlockAchievement('serial_killer');
    if (totalKills >= 1000 && !unlockedAchievements['mass_murderer']) unlockAchievement('mass_murderer');
    if (totalCrits >= 500  && !unlockedAchievements['crit_master'])   unlockAchievement('crit_master');
    if (runCount   >= 10   && !unlockedAchievements['vault_hunter'])  unlockAchievement('vault_hunter');
    if (playerCoins >= 10000 && !unlockedAchievements['moneybags'])   unlockAchievement('moneybags');
    if (fireLvl  >= 33     && !unlockedAchievements['pyromaniac'])    unlockAchievement('pyromaniac');
    if (shockLvl >= 33     && !unlockedAchievements['shock_and_awe']) unlockAchievement('shock_and_awe');
    if (acidLvl  >= 33     && !unlockedAchievements['acid_rain'])     unlockAchievement('acid_rain');
    if (hasVehicle         && !unlockedAchievements['road_warrior'])  unlockAchievement('road_warrior');
    if (badassTokens >= 50 && !unlockedAchievements['badass'])        unlockAchievement('badass');
    if (pLevel >= 35       && !unlockedAchievements['explorer'])      unlockAchievement('explorer');
  } catch(e) { console.warn('checkAchievements error:', e); }
}

// ── Draw popup ────────────────────────────
function drawAchievementPopup() {
  try {
    // Process queue
    if (!currentPopup && achievementQueue.length > 0) {
      currentPopup = achievementQueue.shift();
      popupTimer   = 280;
    }
    if (!currentPopup) return;

    popupTimer--;
    if (popupTimer <= 0) { currentPopup = null; return; }

    const canvas = gCanvas;
    const ctx2   = canvas.getContext('2d');

    const slideInFrames  = 30;
    const slideOutFrames = 30;
    const totalFrames    = 280;
    const elapsed        = totalFrames - popupTimer;

    let offsetX = 0;
    if (elapsed < slideInFrames) {
      offsetX = 320 * (1 - elapsed / slideInFrames);
    } else if (popupTimer < slideOutFrames) {
      offsetX = 320 * (1 - popupTimer / slideOutFrames);
    }

    const popW = 300, popH = 70;
    const popX = canvas.width - popW - 15 + offsetX;
    const popY = 75;

    const rarityColors = {
      bronze:   { bg:'#2a1a0a', border:'#cd7f32', text:'#cd7f32' },
      silver:   { bg:'#1a1a2a', border:'#c0c0c0', text:'#c0c0c0' },
      gold:     { bg:'#2a2200', border:'#ffd700', text:'#ffd700' },
      platinum: { bg:'#1a0a2a', border:'#e5e4e2', text:'#e5e4e2' }
    };
    const col = rarityColors[currentPopup.rarity] || rarityColors.bronze;

    ctx2.save();

    // Glow
    ctx2.shadowColor = col.border;
    ctx2.shadowBlur  = 15;

    // Background
    const grad = ctx2.createLinearGradient(popX, popY, popX+popW, popY+popH);
    grad.addColorStop(0, col.bg);
    grad.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx2.fillStyle = grad;
    ctx2.beginPath();
    ctx2.roundRect(popX, popY, popW, popH, 8);
    ctx2.fill();

    // Border
    ctx2.shadowBlur  = 0;
    ctx2.strokeStyle = col.border;
    ctx2.lineWidth   = 2;
    ctx2.beginPath();
    ctx2.roundRect(popX, popY, popW, popH, 8);
    ctx2.stroke();

    // Left accent bar
    ctx2.fillStyle = col.border;
    ctx2.fillRect(popX, popY+8, 4, popH-16);

    // Icon circle
    ctx2.fillStyle = 'rgba(255,255,255,0.08)';
    ctx2.beginPath();
    ctx2.arc(popX+35, popY+popH/2, 22, 0, Math.PI*2);
    ctx2.fill();
    ctx2.strokeStyle = col.border; ctx2.lineWidth = 1;
    ctx2.stroke();

    // Icon
    ctx2.font      = '22px Arial';
    ctx2.textAlign = 'center';
    ctx2.fillStyle = '#fff';
    ctx2.fillText(currentPopup.icon, popX+35, popY+popH/2+8);

    // Trophy Unlocked label
    ctx2.font      = 'bold 10px Arial';
    ctx2.fillStyle = col.text;
    ctx2.textAlign = 'left';
    ctx2.fillText('TROPHY UNLOCKED', popX+65, popY+22);

    // Name
    ctx2.font      = 'bold 15px Arial';
    ctx2.fillStyle = '#ffffff';
    ctx2.fillText(currentPopup.name, popX+65, popY+40);

    // Desc
    ctx2.font      = '11px Arial';
    ctx2.fillStyle = 'rgba(255,255,255,0.6)';
    ctx2.fillText(currentPopup.desc, popX+65, popY+57);

    // Rarity
    ctx2.font      = 'bold 10px Arial';
    ctx2.fillStyle = col.text;
    ctx2.textAlign = 'right';
    ctx2.fillText(currentPopup.rarity.toUpperCase(), popX+popW-10, popY+22);

    ctx2.restore();
  } catch(e) { console.warn('drawAchievementPopup error:', e); }
}

// ── Achievement screen ────────────────────
function drawAchievementScreen(ctx2, canvasW, canvasH) {
  try {
    const unlocked = Object.keys(unlockedAchievements).length;
    const total    = Object.keys(ACHIEVEMENTS).length;

    ctx2.fillStyle = 'rgba(0,0,0,0.97)';
    ctx2.fillRect(0, 0, canvasW, canvasH);

    // Title
    ctx2.fillStyle = '#ffd700';
    ctx2.font      = 'bold 28px Arial';
    ctx2.textAlign = 'center';
    ctx2.fillText('🏆 TROPHIES', canvasW/2, 42);

    // Progress bar
    ctx2.fillStyle = '#222';
    ctx2.fillRect(50, 55, canvasW-100, 10);
    ctx2.fillStyle = '#ffd700';
    ctx2.fillRect(50, 55, (canvasW-100)*(unlocked/total), 10);
    ctx2.fillStyle = '#fff';
    ctx2.font      = '12px Arial';
    ctx2.fillText(`${unlocked} / ${total} Unlocked`, canvasW/2, 82);

    // Grid
    const cols  = 2;
    const itemW = (canvasW - 60) / cols;
    const itemH = 52;

    Object.values(ACHIEVEMENTS).forEach((ach, idx) => {
      const col  = idx % cols;
      const row  = Math.floor(idx / cols);
      const x    = 30 + col * itemW;
      const y    = 95 + row * (itemH + 6);
      const done = !!unlockedAchievements[ach.id];

      const rc = { bronze:'#cd7f32', silver:'#c0c0c0', gold:'#ffd700', platinum:'#e5e4e2' };
      const c  = rc[ach.rarity];

      ctx2.fillStyle = done ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)';
      ctx2.beginPath(); ctx2.roundRect(x, y, itemW-10, itemH, 5); ctx2.fill();

      ctx2.strokeStyle = done ? c : 'rgba(255,255,255,0.1)';
      ctx2.lineWidth   = done ? 1.5 : 1;
      ctx2.beginPath(); ctx2.roundRect(x, y, itemW-10, itemH, 5); ctx2.stroke();

      ctx2.globalAlpha = done ? 1.0 : 0.25;
      ctx2.font = '20px Arial'; ctx2.textAlign = 'center';
      ctx2.fillStyle = '#fff';
      ctx2.fillText(done ? ach.icon : '🔒', x+25, y+33);

      ctx2.globalAlpha = done ? 1.0 : 0.35;
      ctx2.font = 'bold 13px Arial'; ctx2.fillStyle = done ? '#fff' : '#666';
      ctx2.textAlign = 'left';
      ctx2.fillText(ach.name, x+45, y+20);

      ctx2.font = '10px Arial'; ctx2.fillStyle = done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.2)';
      ctx2.fillText(ach.desc, x+45, y+35);

      ctx2.font = 'bold 9px Arial'; ctx2.fillStyle = done ? c : 'rgba(255,255,255,0.15)';
      ctx2.textAlign = 'right';
      ctx2.fillText(ach.rarity.toUpperCase(), x+itemW-15, y+20);

      ctx2.globalAlpha = 1.0;
    });

    // Click to go back hint
    ctx2.fillStyle = 'rgba(255,255,255,0.4)';
    ctx2.font = '13px Arial'; ctx2.textAlign = 'center';
    ctx2.fillText('Click anywhere to go back', canvasW/2, canvasH - 15);

  } catch(e) { console.warn('drawAchievementScreen error:', e); }
}

// ── Init ──────────────────────────────────
loadAchievements();