/* ==========================================
   ACHIEVEMENTS.JS — Trophy System v1.0
   PlayStation-style popup notifications
   ========================================== */

// ── Achievement Definitions ───────────────
const ACHIEVEMENTS = {
  first_blood:     { id:'first_blood',     name:'First Blood',      desc:'Kill your first enemy',           icon:'🎯', rarity:'bronze'  },
  serial_killer:   { id:'serial_killer',   name:'Serial Killer',    desc:'100 total kills',                 icon:'💀', rarity:'silver'  },
  mass_murderer:   { id:'mass_murderer',   name:'Mass Murderer',    desc:'1000 total kills',                icon:'☠️', rarity:'gold'    },
  moneybags:       { id:'moneybags',       name:'Moneybags',        desc:'Earn 10,000 credits',             icon:'💰', rarity:'silver'  },
  vault_hunter:    { id:'vault_hunter',    name:'Vault Hunter',     desc:'Complete 10 runs',                icon:'🏆', rarity:'silver'  },
  raid_slayer:     { id:'raid_slayer',     name:'Raid Boss Slayer', desc:'Defeat a Raid Boss',              icon:'👑', rarity:'gold'    },
  pyromaniac:      { id:'pyromaniac',      name:'Pyromaniac',       desc:'Max out Fire element',            icon:'🔥', rarity:'silver'  },
  shock_and_awe:   { id:'shock_and_awe',   name:'Shock and Awe',    desc:'Max out Shock element',           icon:'⚡', rarity:'silver'  },
  acid_rain:       { id:'acid_rain',       name:'Acid Rain',        desc:'Max out Acid element',            icon:'🧪', rarity:'silver'  },
  jackpot:         { id:'jackpot',         name:'Jackpot!',         desc:'Win the slot machine',            icon:'🎰', rarity:'bronze'  },
  road_warrior:    { id:'road_warrior',    name:'Road Warrior',     desc:'Unlock the vehicle',              icon:'🚗', rarity:'bronze'  },
  legendary:       { id:'legendary',       name:'Legendary',        desc:'Find a Legendary weapon',         icon:'💎', rarity:'gold'    },
  platinum:        { id:'platinum',        name:'Platinum Trophy',  desc:'Unlock all other achievements',   icon:'🏅', rarity:'platinum'},
  crit_master:     { id:'crit_master',     name:'Crit Master',      desc:'Land 500 critical hits',         icon:'🎯', rarity:'silver'  },
  survivor:        { id:'survivor',        name:'Survivor',         desc:'Survive 10 minutes in one run',  icon:'❤️', rarity:'bronze'  },
  underdome_champ: { id:'underdome_champ', name:'Underdome Champ',  desc:'Reach wave 10 in Underdome',     icon:'🥊', rarity:'gold'    },
  badass:          { id:'badass',          name:'Badass',           desc:'Earn 50 Badass tokens',          icon:'💪', rarity:'silver'  },
  explorer:        { id:'explorer',        name:'Explorer',         desc:'Unlock all maps',                icon:'🗺️', rarity:'bronze'  },
};

// ── State ─────────────────────────────────
let unlockedAchievements = {};
let achievementQueue     = [];
let currentPopup         = null;
let popupTimer           = 0;
let totalKills           = 0;
let totalCrits           = 0;
let surviveTimer         = 0;

// ── Load from localStorage ─────────────────
function loadAchievements() {
  try {
    const saved = localStorage.getItem('achievements');
    if (saved) unlockedAchievements = JSON.parse(saved);
    totalKills = parseInt(localStorage.getItem('totalKills')) || 0;
    totalCrits = parseInt(localStorage.getItem('totalCrits')) || 0;
  } catch(e) { unlockedAchievements = {}; }
}

// ── Unlock achievement ─────────────────────
function unlockAchievement(id) {
  if (unlockedAchievements[id]) return; // already unlocked
  const ach = ACHIEVEMENTS[id];
  if (!ach) return;
  unlockedAchievements[id] = Date.now();
  localStorage.setItem('achievements', JSON.stringify(unlockedAchievements));
  achievementQueue.push(ach);

  // Check for platinum
  const nonPlatinum = Object.keys(ACHIEVEMENTS).filter(k => k !== 'platinum');
  const allUnlocked = nonPlatinum.every(k => unlockedAchievements[k]);
  if (allUnlocked && !unlockedAchievements['platinum']) {
    setTimeout(() => unlockAchievement('platinum'), 2000);
  }
}

// ── Check achievements each frame ─────────
function checkAchievements() {
  // Kill milestones
  if (totalKills >= 1   && !unlockedAchievements['first_blood'])   unlockAchievement('first_blood');
  if (totalKills >= 100 && !unlockedAchievements['serial_killer'])  unlockAchievement('serial_killer');
  if (totalKills >= 1000&& !unlockedAchievements['mass_murderer'])  unlockAchievement('mass_murderer');

  // Crit master
  if (totalCrits >= 500 && !unlockedAchievements['crit_master'])   unlockAchievement('crit_master');

  // Run milestones
  if (runCount >= 10    && !unlockedAchievements['vault_hunter'])   unlockAchievement('vault_hunter');

  // Coin milestone
  if (playerCoins >= 10000 && !unlockedAchievements['moneybags'])  unlockAchievement('moneybags');

  // Elements maxed
  if (fireLvl  >= 33    && !unlockedAchievements['pyromaniac'])     unlockAchievement('pyromaniac');
  if (shockLvl >= 33    && !unlockedAchievements['shock_and_awe'])  unlockAchievement('shock_and_awe');
  if (acidLvl  >= 33    && !unlockedAchievements['acid_rain'])      unlockAchievement('acid_rain');

  // Vehicle
  if (hasVehicle        && !unlockedAchievements['road_warrior'])   unlockAchievement('road_warrior');

  // Badass tokens
  if (badassTokens >= 50&& !unlockedAchievements['badass'])         unlockAchievement('badass');

  // All maps unlocked (level 35+)
  if (pLevel >= 35      && !unlockedAchievements['explorer'])       unlockAchievement('explorer');
}

// ── Draw PlayStation-style popup ──────────
function drawAchievementPopup() {
  // Process queue
  if (!currentPopup && achievementQueue.length > 0) {
    currentPopup = achievementQueue.shift();
    popupTimer   = 280; // frames to show
  }
  if (!currentPopup) return;

  popupTimer--;
  if (popupTimer <= 0) { currentPopup = null; return; }

  const canvas  = gCanvas;
  const ctx2    = canvas.getContext('2d');

  // Animation — slide in from right
  const slideInFrames  = 30;
  const slideOutFrames = 30;
  const totalFrames    = 280;
  const elapsed        = totalFrames - popupTimer;

  let offsetX = 0;
  if (elapsed < slideInFrames) {
    // Slide in
    offsetX = 320 * (1 - elapsed / slideInFrames);
  } else if (popupTimer < slideOutFrames) {
    // Slide out
    offsetX = 320 * (1 - popupTimer / slideOutFrames);
  }

  const popW  = 300;
  const popH  = 70;
  const popX  = canvas.width - popW - 15 + offsetX;
  const popY  = 75;

  // Rarity colors
  const rarityColors = {
    bronze:   { bg:'#2a1a0a', border:'#cd7f32', glow:'rgba(205,127,50,0.4)',  text:'#cd7f32'  },
    silver:   { bg:'#1a1a2a', border:'#c0c0c0', glow:'rgba(192,192,192,0.4)', text:'#c0c0c0'  },
    gold:     { bg:'#2a2200', border:'#ffd700', glow:'rgba(255,215,0,0.4)',   text:'#ffd700'  },
    platinum: { bg:'#1a0a2a', border:'#e5e4e2', glow:'rgba(229,228,226,0.6)', text:'#e5e4e2'  }
  };
  const col = rarityColors[currentPopup.rarity] || rarityColors.bronze;

  ctx2.save();

  // Outer glow
  ctx2.shadowColor = col.glow;
  ctx2.shadowBlur  = 20;

  // Background
  const grad = ctx2.createLinearGradient(popX, popY, popX + popW, popY + popH);
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
  ctx2.beginPath();
  ctx2.roundRect(popX, popY, 4, popH, [8, 0, 0, 8]);
  ctx2.fill();

  // Trophy icon background
  ctx2.fillStyle = 'rgba(255,255,255,0.08)';
  ctx2.beginPath();
  ctx2.arc(popX + 35, popY + popH/2, 22, 0, Math.PI*2);
  ctx2.fill();
  ctx2.strokeStyle = col.border;
  ctx2.lineWidth   = 1;
  ctx2.stroke();

  // Trophy icon
  ctx2.font      = '24px Arial';
  ctx2.textAlign = 'center';
  ctx2.fillText(currentPopup.icon, popX + 35, popY + popH/2 + 9);

  // "Trophy Unlocked" label
  ctx2.font      = 'bold 10px Arial';
  ctx2.fillStyle = col.text;
  ctx2.textAlign = 'left';
  ctx2.letterSpacing = '2px';
  ctx2.fillText('TROPHY UNLOCKED', popX + 65, popY + 22);

  // Achievement name
  ctx2.font      = 'bold 16px Arial';
  ctx2.fillStyle = '#ffffff';
  ctx2.fillText(currentPopup.name, popX + 65, popY + 42);

  // Description
  ctx2.font      = '11px Arial';
  ctx2.fillStyle = 'rgba(255,255,255,0.6)';
  ctx2.fillText(currentPopup.desc, popX + 65, popY + 58);

  // Rarity label top right
  ctx2.font      = 'bold 10px Arial';
  ctx2.fillStyle = col.text;
  ctx2.textAlign = 'right';
  ctx2.fillText(currentPopup.rarity.toUpperCase(), popX + popW - 10, popY + 22);

  // Shimmer effect on platinum
  if (currentPopup.rarity === 'platinum') {
    const shimmerX = ((Date.now() / 8) % (popW + 100)) - 50;
    const shimmer  = ctx2.createLinearGradient(popX + shimmerX, popY, popX + shimmerX + 50, popY + popH);
    shimmer.addColorStop(0,   'rgba(255,255,255,0)');
    shimmer.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    shimmer.addColorStop(1,   'rgba(255,255,255,0)');
    ctx2.fillStyle = shimmer;
    ctx2.beginPath();
    ctx2.roundRect(popX, popY, popW, popH, 8);
    ctx2.fill();
  }

  ctx2.restore();
}

// ── Achievement screen for main menu ──────
function drawAchievementScreen(ctx2, canvasW, canvasH) {
  const unlocked = Object.keys(unlockedAchievements).length;
  const total    = Object.keys(ACHIEVEMENTS).length;

  ctx2.fillStyle = 'rgba(0,0,0,0.95)';
  ctx2.fillRect(0, 0, canvasW, canvasH);

  // Title
  ctx2.fillStyle = '#ffd700';
  ctx2.font      = 'bold 28px Arial';
  ctx2.textAlign = 'center';
  ctx2.fillText('🏆 TROPHIES', canvasW/2, 45);

  // Progress bar
  ctx2.fillStyle = '#222';
  ctx2.fillRect(50, 60, canvasW-100, 12);
  ctx2.fillStyle = '#ffd700';
  ctx2.fillRect(50, 60, (canvasW-100)*(unlocked/total), 12);
  ctx2.fillStyle = '#fff';
  ctx2.font      = '12px Arial';
  ctx2.fillText(`${unlocked} / ${total} Unlocked`, canvasW/2, 88);

  // Grid of achievements
  const cols  = 2;
  const itemW = (canvasW - 60) / cols;
  const itemH = 55;
  let   idx   = 0;

  Object.values(ACHIEVEMENTS).forEach(ach => {
    const col   = idx % cols;
    const row   = Math.floor(idx / cols);
    const x     = 30 + col * itemW;
    const y     = 100 + row * (itemH + 8);
    const done  = !!unlockedAchievements[ach.id];

    const rarityColors = {
      bronze:'#cd7f32', silver:'#c0c0c0', gold:'#ffd700', platinum:'#e5e4e2'
    };
    const col2 = rarityColors[ach.rarity];

    // Background
    ctx2.fillStyle = done ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
    ctx2.beginPath(); ctx2.roundRect(x, y, itemW-10, itemH, 6); ctx2.fill();

    // Border
    ctx2.strokeStyle = done ? col2 : 'rgba(255,255,255,0.15)';
    ctx2.lineWidth   = done ? 1.5 : 1;
    ctx2.beginPath(); ctx2.roundRect(x, y, itemW-10, itemH, 6); ctx2.stroke();

    // Icon
    ctx2.globalAlpha = done ? 1.0 : 0.3;
    ctx2.font        = '22px Arial';
    ctx2.textAlign   = 'center';
    ctx2.fillText(ach.icon, x + 28, y + 33);

    // Name
    ctx2.globalAlpha = done ? 1.0 : 0.4;
    ctx2.font        = `bold 13px Arial`;
    ctx2.fillStyle   = done ? '#fff' : '#888';
    ctx2.textAlign   = 'left';
    ctx2.fillText(ach.name, x + 50, y + 22);

    // Desc
    ctx2.font      = '10px Arial';
    ctx2.fillStyle = done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)';
    ctx2.fillText(ach.desc, x + 50, y + 37);

    // Rarity
    ctx2.font      = 'bold 9px Arial';
    ctx2.fillStyle = done ? col2 : 'rgba(255,255,255,0.2)';
    ctx2.textAlign = 'right';
    ctx2.fillText(ach.rarity.toUpperCase(), x + itemW - 15, y + 22);

    // Lock icon if not done
    if (!done) {
      ctx2.font      = '16px Arial';
      ctx2.textAlign = 'center';
      ctx2.fillStyle = 'rgba(255,255,255,0.2)';
      ctx2.fillText('🔒', x + 28, y + 35);
    }

    ctx2.globalAlpha = 1.0;
    idx++;
  });
}

// ── Init ──────────────────────────────────
loadAchievements();