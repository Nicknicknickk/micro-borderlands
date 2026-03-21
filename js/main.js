/* ==========================================
   MAIN.JS — Entry point, ties everything together
   ========================================== */

// ── Boot ───────────────────────────────────
updateMenuStats();

// ── Toggle Sound (exposed to HTML) ─────────
window.toggleSound = toggleSound;

// ── Player builder helper ──────────────────
function buildPlayer(charClass) {
  const cS = charSkills[charClass];
  let hpBonus = 0, shdBonus = 0, cdBonus = 0, dmgBonus = 0, frBonus = 0, critBonus = 0, elemBonus = 0, petBonus = 0, meleeBonus = 0;

  if (charClass === 'zero')    { dmgBonus = cS[0]*0.1; cdBonus = cS[1]*0.1; critBonus = cS[2]*0.1; }
  if (charClass === 'maya')    { elemBonus = cS[0]*0.2; shdBonus = cS[1]*0.2; dmgBonus = cS[2]*0.1; }
  if (charClass === 'axton')   { petBonus = cS[0]*0.2; frBonus = cS[1]*0.1; hpBonus = cS[2]*0.2; }
  if (charClass === 'salvador'){ frBonus = cS[0]*0.1; hpBonus = cS[1]*0.2; cdBonus = cS[2]*0.1; }
  if (charClass === 'krieg')   { meleeBonus = cS[0]*0.2; hpBonus = cS[1]*0.2; cdBonus = cS[2]*0.1; }
  if (charClass === 'gaige')   { petBonus = cS[0]*0.2; shdBonus = cS[1]*0.2; dmgBonus = cS[2]*0.1; }

  let baseMaxHp = ((charClass === 'maya' ? 200 : 150) + (pLevel * 20) + (rankHP * 25) + equippedArmor.hpBonus) * (1 + hpBonus);
  if (equippedCMod === 'Survivor') baseMaxHp += 100;
  const totalMaxShield = (50 + (shieldLvl * 50)) * (1 + shdBonus);

  const savedGunStr = localStorage.getItem('borderGun');
  const currentGun  = savedGunStr ? JSON.parse(savedGunStr) : { name: 'Starter Pistol', c: '#fff', dmg: 20, fr: 12, spd: 10, timer: 0 };

  return {
    x: WORLD_W / 2, y: WORLD_H / 2,
    hp: baseMaxHp, maxHp: baseMaxHp,
    lastX: WORLD_W / 2, lastY: WORLD_H / 2,
    shield: totalMaxShield, maxShield: totalMaxShield,
    shieldRechargeDelay: 0,
    grenades: playerGrenades, maxGrenades: 3, grenadeCooldown: 0,
    skillTimer: 0, skillCooldown: 0,
    win: false, dead: false,
    char: charClass,
    gun: currentGun,
    vehicleHp: 2500, maxVehicleHp: 2500, vehicleCooldown: 0,
    mods: { dmg: dmgBonus, cd: cdBonus, crit: critBonus, elem: elemBonus, pet: petBonus, fr: frBonus, melee: meleeBonus }
  };
}