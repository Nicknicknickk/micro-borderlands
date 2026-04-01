/* ==========================================
   STATE.JS — All global variables & save data
   ========================================== */

// ── Canvas & Core ──────────────────────────
const mainMenu      = document.getElementById('main-menu');
const gameContainer = document.getElementById('game-container');
const gCanvas       = document.getElementById('game-canvas');
const ctx           = gCanvas.getContext('2d');
const bossScreen    = document.getElementById('boss-screen');
const statusText    = document.getElementById('status-text');

// ── Input ──────────────────────────────────
let keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true;  keys[e.key] = true;  });
window.addEventListener('keyup',   e => { keys[e.code] = false; keys[e.key] = false; });

// ── Game Flags ─────────────────────────────
let animId       = null;
let inSanctuary  = false;
let isBossMode   = false;
let inBank       = false;
let inBadass     = false;
let inInventory  = false;
let inSkills     = false;
let isRaidBoss   = false;
let isDuel       = false;
let duelOpponent = '';
let inVehicle    = false;
let inDialog     = false;
let dialogStep   = 0;
let isUnderdome  = false;

// ── World ──────────────────────────────────
const WORLD_W = 2000;
const WORLD_H = 1500;
let lhCam     = { x: 0, y: 0 };
let lhMouse   = { screenX: 400, screenY: 225 };
let screenShake   = 0;
let dayNightTimer = 0;
const DAY_LENGTH  = 3600;

// ── Timers ─────────────────────────────────
let slotsSpinTimer   = 0;
let underdomeWave    = 1;
let underdomeEnemies = 0;
let waveDelay        = 0;

// ── Game Objects ───────────────────────────
let lhPlayer       = null;
let lhEnemies      = [];
let lhBullets      = [];
let lhEnemyBullets = [];
let lhGrenades     = [];
let lhLoot         = [];
let lhDmgText      = [];
let lhAllies       = [];
let lhCraters      = [];
let lhParticles    = [];
let lhShooting     = false;
let lhKills        = 0;
let lhBossSpawned  = false;
let lhGoliathsSpawned = 0;
let lhExitPortal   = null;
let nearNPC        = null;

// ── Persistent Save Data ───────────────────
let runCount      = parseInt(localStorage.getItem('borderRuns'))    || 0;
let moxxiTips     = parseInt(localStorage.getItem('moxxiTips'))     || 0;
let playerCoins   = parseInt(localStorage.getItem('borderCoins'))   || 0;
let hasVehicle    = parseInt(localStorage.getItem('borderVehicle')) || 0;
let mayhemMode    = parseInt(localStorage.getItem('borderMayhem'))  || 0;
let activeMapIndex= parseInt(localStorage.getItem('borderMap'))     || 0;
let pLevel        = parseInt(localStorage.getItem('borderLevel'))   || 1;
let pExp          = parseInt(localStorage.getItem('borderExp'))     || 0;
let badassTokens  = parseInt(localStorage.getItem('badassTokens'))  || 0;
let rankHP        = parseInt(localStorage.getItem('rankHP'))        || 0;
let rankSpeed     = parseInt(localStorage.getItem('rankSpeed'))     || 0;
let rankFireRate  = parseInt(localStorage.getItem('rankFireRate'))  || 0;
let rankDmg       = parseInt(localStorage.getItem('rankDmg'))      || 0;
let fireLvl       = parseInt(localStorage.getItem('borderFire'))   || 0;
let shockLvl      = parseInt(localStorage.getItem('borderShock'))  || 0;
let acidLvl       = parseInt(localStorage.getItem('borderAcid'))   || 0;
let shieldLvl     = parseInt(localStorage.getItem('borderShield')) || 0;
let activeQuest   = parseInt(localStorage.getItem('borderQuest'))  || 0;
let questProgress = parseInt(localStorage.getItem('borderQProg'))  || 0;
let playerGrenades= localStorage.getItem('borderGrenades') !== null ? parseInt(localStorage.getItem('borderGrenades')) : 3;
let equippedCMod  = localStorage.getItem('borderCMod') || 'None';
let equippedGMod  = localStorage.getItem('borderGMod') || 'Standard';

let charSkills = JSON.parse(localStorage.getItem('borderSkills')) || {
  zero:[0,0,0], maya:[0,0,0], axton:[0,0,0], salvador:[0,0,0], krieg:[0,0,0], gaige:[0,0,0]
};

let bankGuns      = [];
let inventoryMods = [];
let backpackGuns  = [];
let equippedGun    = { name: 'Starter Pistol', c: '#fff', dmg: 20, fr: 12, spd: 10, timer: 0 };
let equippedArmor  = { name: 'None', dmgRed: 0, hpBonus: 0 };
let equippedRelic  = null;
let inventoryRelics = [];

try {
  let s = localStorage.getItem('borderBank');        if(s) bankGuns        = JSON.parse(s);
  let m = localStorage.getItem('borderInvMods');     if(m) inventoryMods   = JSON.parse(m);
  let b = localStorage.getItem('borderBackpackGuns');if(b) backpackGuns    = JSON.parse(b);
  let g = localStorage.getItem('borderGun');         if(g) equippedGun     = JSON.parse(g);
  let a = localStorage.getItem('borderArmor');       if(a) equippedArmor   = JSON.parse(a);
  let r = localStorage.getItem('borderRelic');       if(r) equippedRelic   = JSON.parse(r);
  let ri= localStorage.getItem('borderRelics');      if(ri) inventoryRelics = JSON.parse(ri);
} catch(e) { console.warn('Save data issue:', e); }

// ── Skill Definitions ──────────────────────
const sDefs = {
  zero:    [{n:"Headsh0t",   d:"+10% Gun Dmg/Lv",       m:0.1},{n:"0ptics",     d:"-10% Skill CD/Lv",    m:0.1},{n:"B0re",      d:"+10% Crit/Lv",         m:0.1}],
  maya:    [{n:"Flicker",    d:"+20% Elem Dmg/Lv",      m:0.2},{n:"Ward",       d:"+20% Shield/Lv",      m:0.2},{n:"Mind's Eye",d:"+10% Gun Dmg/Lv",      m:0.1}],
  axton:   [{n:"Sentry",     d:"+20% Turret Dmg/Lv",    m:0.2},{n:"Ready",      d:"+10% Fire Rate/Lv",   m:0.1},{n:"Healthy",   d:"+20% HP/Lv",           m:0.2}],
  salvador:[{n:"Inconceivable",d:"+10% Fire Rate/Lv",   m:0.1},{n:"Hard to Kill",d:"+20% HP/Lv",         m:0.2},{n:"Juggernaut",d:"-10% Skill CD/Lv",     m:0.1}],
  krieg:   [{n:"Bloodlust",  d:"+20% Melee/Lv",         m:0.2},{n:"Feed the Meat",d:"+20% HP/Lv",        m:0.2},{n:"Embrace Pain",d:"-10% Skill CD/Lv",   m:0.1}],
  gaige:   [{n:"Best Friends",d:"+20% Pet Dmg/Lv",      m:0.2},{n:"My Shields", d:"+20% Shield/Lv",      m:0.2},{n:"Typecast",  d:"+10% Gun Dmg/Lv",      m:0.1}]
};

// ── Map Definitions ────────────────────────
const mapData = [
  { name:'WASTELAND',       bg:'#2b2118', dot:'#221912', line:'#423325', req:1,  desc:"Standard Combat" },
  { name:'THE FRIDGE',      bg:'#8bb8d6', dot:'#c4dceb', line:'#5c8eb3', req:10, desc:"Ice Terrain: +3 Movement Speed" },
  { name:'CAUSTIC CAVERNS', bg:'#2d3b24', dot:'#48ff00', line:'#1e2618', req:20, desc:"Toxic: Craters melt enemies!" },
  { name:'MOON BASE',       bg:'#2a2a2a', dot:'#111111', line:'#444444', req:30, desc:"Low Gravity: 3x Enemy Knockback" }
];

// ── Moxxi Dialog ───────────────────────────
const moxxiLines = [
  "Well hello there, sugar. Looking for a little... excitement?",
  "The Underdome is open for business. No rules, no mercy,\njust endless slaughter for my amusement.",
  "Survive as long as you can. If you die...\nwell, it makes for great television!",
  "So, you ready to step into the arena and make mama proud?\n\n[Y] ENTER ARENA   [N] LATER"
];

// ── EXP Helpers ────────────────────────────
function getExpRequired(lvl) { return Math.floor(100 * Math.pow(1.5, lvl - 1)); }

function gainExp(amount) {
  if (pLevel >= 72) return;
  const expMult = 1 + (lhPlayer?.mods?.expBoost || 0);
  pExp += Math.floor(amount * expMult);
  while (pExp >= getExpRequired(pLevel) && pLevel < 72) {
    pExp -= getExpRequired(pLevel);
    pLevel++;
    playSound('levelup');
    lhDmgText.push({ x: lhPlayer.x, y: lhPlayer.y - 60, txt: `LEVEL UP! ${pLevel}`, life: 120, c: '#0ff' });
    spawnParticles(lhPlayer.x, lhPlayer.y, '#0ff', 100, 10, 60);
    if (lhPlayer) { lhPlayer.hp = lhPlayer.maxHp; lhPlayer.shield = lhPlayer.maxShield; }
    localStorage.setItem('borderLevel', pLevel);
  }
  localStorage.setItem('borderExp', pExp);
}

// ── Mod Description Helper ─────────────────
function getModDesc(name) {
  const map = {
    'Sniper':       '+30% Gun Damage (Zer0)',
    'Ninja':        'Double Skill Cooldown Speed (Zer0)',
    'Survivor':     '+100 HP, Regen +1 HP/sec',
    'Cat':          '+30% Fire Rate (Maya)',
    'Binder':       'Double Skill Cooldown Speed (Maya)',
    'Nurse':        'Regen +2 HP/sec in Combat (Maya)',
    'Rifleman':     '+30% Gun Damage (Axton)',
    'Berserker':    '+30% Fire Rate (Salvador)',
    'Meat':         'Heal on Kill, +50% Melee (Krieg)',
    'Anarchist':    'Double Deathtrap Duration (Gaige)',
    'Witch':        'Double Elem DMG & Duration (Maya)',
    'Fastball':     'Tiny radius, 3X Damage',
    'Bonus Package':'Massive explosion radius'
  };
  return map[name] || 'Unknown Mod';
}

// ── Stats Display ──────────────────────────
function updateMenuStats() {
  const charName = (localStorage.getItem('borderClass') || 'zero').toUpperCase();
  const mayhemTxt = mayhemMode === 0 ? '<span style="color:#7a7060">OFF</span>'
    : `<span style="color:#e8321a;font-weight:700">M${mayhemMode}</span>`;
  const row = (label, value, color='#f0e6c8') =>
    `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value" style="color:${color}">${value}</span></div>`;
  document.getElementById('stats-display').innerHTML =
    row('Vault Hunter', charName, '#f5c518') +
    row('Level', `${pLevel} <span style="color:#7a7060;font-size:.75rem;font-weight:400">/ 72</span>`) +
    row('EXP', `${pExp} / ${getExpRequired(pLevel)}`, '#00e5ff') +
    row('Runs Completed', runCount, '#39ff14') +
    row('Credits', `$${playerCoins.toLocaleString()}`, '#f5c518') +
    row('Badass Tokens', badassTokens, '#ff6a00') +
    row('Elements', `🔥${fireLvl} ⚡${shockLvl} 🧪${acidLvl}`) +
    row('Mayhem Mode', mayhemTxt);
}