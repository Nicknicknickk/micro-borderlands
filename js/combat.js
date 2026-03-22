/* ==========================================
   COMBAT.JS — Full combat engine v3.1
   Includes: new enemies, new maps,
   hit stop, camera recoil, shell casings,
   muzzle flash, weapon knockback
   ========================================== */

// ── Game Feel State ───────────────────────
let hitStopFrames = 0;
let cameraRecoilX = 0;
let cameraRecoilY = 0;
let muzzleFlashes = [];
let shellCasings  = [];

function spawnMuzzleFlash(x, y, ang, size) {
  muzzleFlashes.push({ x, y, ang, life: 6, maxLife: 6, size });
}

function spawnShellCasing(x, y, ang) {
  const perpAng = ang - Math.PI / 2;
  shellCasings.push({
    x: x + Math.cos(perpAng)*10, y: y + Math.sin(perpAng)*10,
    vx: Math.cos(perpAng)*(2+Math.random()*3),
    vy: Math.sin(perpAng)*(2+Math.random()*3) - 3,
    rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*0.4,
    life: 40+Math.floor(Math.random()*20), maxLife: 60, gravity: 0.25
  });
}

function applyCameraRecoil(ang, strength) {
  cameraRecoilX -= Math.cos(ang)*strength;
  cameraRecoilY -= Math.sin(ang)*strength;
}

function applyHitStop(frames) {
  hitStopFrames = Math.max(hitStopFrames, frames);
}

// ── Vehicle explosion ─────────────────────
function checkVehicleExplosion() {
  if (lhPlayer.vehicleHp <= 0) {
    inVehicle = false; playSound('explosion',lhPlayer.x); screenShake = 30;
    spawnParticles(lhPlayer.x,lhPlayer.y,'#ff4500',100,8,60);
    lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y-20,txt:'VEHICLE DESTROYED!',life:60,c:'#f00'});
    let recoilDmg = 200*(1-equippedArmor.dmgRed);
    if(lhPlayer.shield>0){if(lhPlayer.shield>=recoilDmg){lhPlayer.shield-=recoilDmg;recoilDmg=0;}else{recoilDmg-=lhPlayer.shield;lhPlayer.shield=0;}}
    lhPlayer.hp -= recoilDmg; lhPlayer.vehicleCooldown = 600;
    if(lhPlayer.hp<=0) lhPlayer.dead=true;
  }
}

// ── Enemy factory ─────────────────────────
function spawnEnemy(ex, ey, pBase, pVar, mMult) {
  const randEn = Math.random();
  let prefix='',preMult=1,pColor='';
  if(Math.random()<0.3){
    const pTypes=['Armored','Rabid','Loot','Badass'];
    prefix=pTypes[Math.floor(Math.random()*pTypes.length)];
    if(prefix==='Armored'){preMult=1.5;pColor='#ffcc00';}
    if(prefix==='Rabid')  {preMult=0.8;pColor='#f00';}
    if(prefix==='Loot')   {preMult=2;  pColor='#0f0';}
    if(prefix==='Badass') {preMult=3;  pColor='#fff';}
  }
  if(randEn<0.15){
    lhEnemies.push({x:ex,y:ey,hp:5000*mMult*preMult,maxHp:5000*mMult*preMult,speed:prefix==='Rabid'?2.4:1.2,type:'loader',pref:prefix,pC:pColor,w:prefix==='Badass'?70:50,h:prefix==='Badass'?80:60,fT:0,sT:0,aT:0,cd:100,isMarksman:true});
  } else if(lhGoliathsSpawned<5&&randEn<0.30){
    lhEnemies.push({x:ex,y:ey,hp:3600*mMult*preMult,maxHp:3600*mMult*preMult,speed:prefix==='Rabid'?3:1.5,type:'goliath',pref:prefix,pC:pColor,w:prefix==='Badass'?80:60,h:prefix==='Badass'?80:60,fT:0,sT:0,aT:0,cd:90,isMarksman:Math.random()<0.25});
    lhGoliathsSpawned++;
  } else {
    const finalHp=(pBase+Math.random()*pVar)*mMult*preMult;
    lhEnemies.push({x:ex,y:ey,hp:finalHp,maxHp:finalHp,speed:prefix==='Rabid'?3.6:1.8+Math.random()*1.5,type:'normal',pref:prefix,pC:pColor,w:prefix==='Badass'?45:30,h:prefix==='Badass'?45:30,fT:0,sT:0,aT:0,cd:120,isMarksman:Math.random()<0.25});
  }
}

// ─────────────────────────────────────────────────────────
function startLooter(raid=false,duelTarget=null,underdome=false) {
  if(animId) cancelAnimationFrame(animId);
  gCanvas.style.cursor='crosshair';
  inSanctuary=false;inVehicle=false;dayNightTimer=0;
  lhParticles=[];screenShake=0;lhCraters=[];
  hitStopFrames=0;cameraRecoilX=0;cameraRecoilY=0;muzzleFlashes=[];shellCasings=[];
  initMapSpecials(activeMapIndex);
  isRaidBoss=raid;isDuel=duelTarget!==null;duelOpponent=duelTarget;
  lhExitPortal=null;lhAllies=[];
  isUnderdome=underdome;underdomeWave=1;underdomeEnemies=15;waveDelay=120;
  for(let i=0;i<50;i++) lhCraters.push({x:Math.random()*WORLD_W,y:Math.random()*WORLD_H,r:20+Math.random()*50});

  const charClass=localStorage.getItem('borderClass')||'zero';
  lhPlayer=buildPlayer(charClass);
  lhEnemies=[];lhBullets=[];lhEnemyBullets=[];lhGrenades=[];
  lhLoot=[];lhDmgText=[];lhShooting=false;lhKills=0;
  lhBossSpawned=false;lhGoliathsSpawned=0;
  initZones();
  initMapSpecials(activeMapIndex);
  const mayhemMult=mayhemMode===50?2500:mayhemMode===20?500:mayhemMode===10?25:1;

  if(isRaidBoss){
    lhKills=20;
    const rbType=Math.random()>0.6?'crawmerax':Math.random()>0.5?'pete':'terramorphous';
    lhEnemies.push({x:WORLD_W/2,y:WORLD_H/2-300,hp:1000000*mayhemMult,maxHp:1000000*mayhemMult,speed:rbType==='pete'?2:0,type:rbType,w:200,h:200,fT:0,sT:0,aT:0,cd:100});
    lhBossSpawned=true;playSound('die',WORLD_W/2);screenShake=40;
  } else if(isDuel){
    lhKills=20;
    if(duelOpponent==='Lilith'){lhEnemies.push({x:WORLD_W/2,y:WORLD_H/2-200,hp:200000*mayhemMult,maxHp:200000*mayhemMult,speed:3,type:'lilith_boss',w:150,h:150,fT:0,sT:0,aT:0,cd:90});}
    else{lhEnemies.push({x:WORLD_W/2,y:WORLD_H/2-200,hp:200000*mayhemMult,maxHp:200000*mayhemMult,speed:2,type:'moxxi_boss',w:150,h:150,fT:0,sT:0,aT:0,cd:80});}
    lhBossSpawned=true;playSound('die',WORLD_W/2);screenShake=30;
  }

  gCanvas.onmousemove=(e)=>{const rect=gCanvas.getBoundingClientRect();lhMouse.screenX=(e.clientX-rect.left)*(gCanvas.width/rect.width);lhMouse.screenY=(e.clientY-rect.top)*(gCanvas.height/rect.height);};
  gCanvas.onmousedown=()=>{lhShooting=true;};
  gCanvas.onmouseup=()=>lhShooting=false;
  loopLooter();
}

// ─────────────────────────────────────────────────────────
function loopLooter() {
  if(inSanctuary||isBossMode||inBank||inBadass||inInventory||inSkills) return;

  // ── Hit stop ──────────────────────────────
  if(hitStopFrames>0){hitStopFrames--;animId=requestAnimationFrame(loopLooter);return;}

  ctx.clearRect(0,0,gCanvas.width,gCanvas.height);
  dayNightTimer++;

  const mayhemMult=mayhemMode===50?2500:mayhemMode===20?500:mayhemMode===10?25:1;
  if(!lhPlayer) return;
  const elemDur=(equippedCMod==='Witch'&&lhPlayer.char==='maya')?600:300;
  const elemMult=mayhemMult*((equippedCMod==='Witch'&&lhPlayer.char==='maya')?2:1)*(1+lhPlayer.mods.elem);

  // ── Camera recoil recovery ────────────────
  cameraRecoilX*=0.75; cameraRecoilY*=0.75;
  if(Math.abs(cameraRecoilX)<0.1)cameraRecoilX=0;
  if(Math.abs(cameraRecoilY)<0.1)cameraRecoilY=0;

  // ── Win / Death ───────────────────────────
  if(lhPlayer.dead||lhPlayer.win){
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,800,450);
    ctx.fillStyle=lhPlayer.win?'#00ffcc':'#ff3333';ctx.font='50px Arial';ctx.textAlign='center';
    ctx.fillText(lhPlayer.win?'RETURNING TO SANCTUARY':'FIGHT FOR YOUR LIFE FAILED',400,200);
    if(lhPlayer.win){
      if(lhPlayer.winTimer===undefined){lhPlayer.winTimer=50;runCount++;badassTokens+=2;if(isRaidBoss){badassTokens+=10;unlockAchievement('raid_slayer');}localStorage.setItem('borderRuns',runCount);localStorage.setItem('badassTokens',badassTokens);onRunComplete();}
      lhPlayer.winTimer--;if(lhPlayer.winTimer<=0){startSanctuary();return;}
    } else {ctx.font='25px Arial';ctx.fillText('Click to Play Again',400,260);gCanvas.onclick=()=>{gCanvas.onclick=null;startLooter();};}
    ctx.textAlign='left';animId=requestAnimationFrame(loopLooter);return;
  }

  if(lhPlayer.vehicleCooldown>0)lhPlayer.vehicleCooldown--;
  else if(!inVehicle&&lhPlayer.vehicleHp<=0)lhPlayer.vehicleHp=lhPlayer.maxVehicleHp;

  if(keys['KeyV']||keys['v']){
    keys['KeyV']=false;keys['v']=false;
    if(hasVehicle&&lhPlayer.vehicleCooldown<=0&&!isRaidBoss&&!isDuel){inVehicle=!inVehicle;playSound('ability');spawnParticles(lhPlayer.x,lhPlayer.y,'#ff6600',30,4,20);}
    else if(hasVehicle&&lhPlayer.vehicleCooldown>0){playSound('hit');lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y-40,txt:'VEHICLE REPAIRING...',life:40,c:'#888'});}
    else if(isRaidBoss||isDuel){playSound('hit');lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y-40,txt:'VEHICLES DISABLED!',life:40,c:'#f00'});}
  }

  const baseSpd=inVehicle?12:5;
  let spd=baseSpd+(rankSpeed*0.5)+(activeMapIndex===1?3:0);
  if(lhPlayer.char==='krieg'&&lhPlayer.skillTimer>0)spd*=1.5;
  if(keys['KeyW']||keys['ArrowUp'])   lhPlayer.y=Math.max(15,lhPlayer.y-spd);
  if(keys['KeyS']||keys['ArrowDown']) lhPlayer.y=Math.min(WORLD_H-15,lhPlayer.y+spd);
  if(keys['KeyA']||keys['ArrowLeft']) lhPlayer.x=Math.max(15,lhPlayer.x-spd);
  if(keys['KeyD']||keys['ArrowRight'])lhPlayer.x=Math.min(WORLD_W-15,lhPlayer.x+spd);
  if(inVehicle&&(keys['KeyW']||keys['ArrowUp']||keys['KeyS']||keys['ArrowDown']||keys['KeyA']||keys['ArrowLeft']||keys['KeyD']||keys['ArrowRight']))spawnParticles(lhPlayer.x,lhPlayer.y+15,'#555',1,1,15);

  if(equippedCMod==='Survivor'&&Math.random()<0.05&&lhPlayer.hp<lhPlayer.maxHp)lhPlayer.hp++;
  if(equippedCMod==='Nurse'&&lhPlayer.char==='maya'&&Math.random()<0.1&&lhPlayer.hp<lhPlayer.maxHp)lhPlayer.hp+=2;
  if(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0&&Math.random()<0.2&&lhPlayer.hp<lhPlayer.maxHp)lhPlayer.hp+=5;

  if(lhPlayer.shieldRechargeDelay>0)lhPlayer.shieldRechargeDelay--;
  else if(lhPlayer.shield<lhPlayer.maxShield){lhPlayer.shield+=0.5;if(lhPlayer.shield>lhPlayer.maxShield)lhPlayer.shield=lhPlayer.maxShield;}

  if((keys['KeyE']||keys['e'])&&lhPlayer.skillCooldown<=0&&!inVehicle){
    const onPortal=lhExitPortal&&Math.hypot(lhPlayer.x-lhExitPortal.x,lhPlayer.y-lhExitPortal.y)<50;
    if(!onPortal){
      playSound('ability');
      const cdMult=(1-lhPlayer.mods.cd)*(equippedCMod==='Ninja'&&lhPlayer.char==='zero'?0.5:1)*(equippedCMod==='Binder'&&lhPlayer.char==='maya'?0.5:1);
      if(lhPlayer.char==='zero'){lhPlayer.skillTimer=180;lhPlayer.skillCooldown=600*cdMult;spawnParticles(lhPlayer.x,lhPlayer.y,'#0ff',40,6,30);}
      else if(lhPlayer.char==='maya'){lhPlayer.skillCooldown=400*cdMult;lhPlayer.skillTimer=180;spawnParticles(lhPlayer.x,lhPlayer.y,'#a020f0',50,8,40);lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y,txt:'PHASE SHIELD!',life:60,c:'#a020f0'});lhEnemies.forEach(e=>{if(Math.hypot(lhPlayer.x-e.x,lhPlayer.y-e.y)<500&&!e.type.includes('boss')){e.hp-=500*mayhemMult;playSound('hit',e.x);lhDmgText.push({x:e.x,y:e.y,txt:500*mayhemMult,life:30,c:'#a020f0'});spawnParticles(e.x,e.y,'#a020f0',15,4,20);}});}
      else if(lhPlayer.char==='axton'){lhPlayer.skillCooldown=600*cdMult;lhAllies.push({x:lhPlayer.x,y:lhPlayer.y,life:600,cd:0,type:'turret'});spawnParticles(lhPlayer.x,lhPlayer.y,'#0f0',40,6,30);lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y,txt:'SABRE TURRET!',life:60,c:'#0f0'});}
      else if(lhPlayer.char==='salvador'){lhPlayer.skillTimer=300;lhPlayer.skillCooldown=600*cdMult;spawnParticles(lhPlayer.x,lhPlayer.y,'#f00',50,8,40);lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y,txt:'GUNZERKING!',life:60,c:'#f00'});}
      else if(lhPlayer.char==='krieg'){lhPlayer.skillTimer=240;lhPlayer.skillCooldown=500*cdMult;spawnParticles(lhPlayer.x,lhPlayer.y,'#ffaa00',50,8,40);lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y,txt:'RAMPAGE!',life:60,c:'#ffaa00'});}
      else if(lhPlayer.char==='gaige'){const dtLife=equippedCMod==='Anarchist'?1200:600;lhPlayer.skillCooldown=700*cdMult;lhAllies.push({x:lhPlayer.x,y:lhPlayer.y,life:dtLife,cd:0,type:'deathtrap',tx:lhPlayer.x,ty:lhPlayer.y});spawnParticles(lhPlayer.x,lhPlayer.y,'#0ff',40,6,30);lhDmgText.push({x:lhPlayer.x,y:lhPlayer.y,txt:'DEATHTRAP!',life:60,c:'#0ff'});}
      keys['KeyE']=false;
    }
  }

  if(lhPlayer.char==='krieg'&&lhPlayer.skillTimer>0&&lhPlayer.skillTimer%10===0){
    const meleeDmg=500*(1+rankDmg*0.15)*(mayhemMode>0?mayhemMode/2:1)*(1+lhPlayer.mods.melee)*(equippedCMod==='Meat'?1.5:1);
    lhEnemies.forEach(e=>{if(Math.hypot(lhPlayer.x-e.x,lhPlayer.y-e.y)<100){e.hp-=meleeDmg;playSound('hit',e.x);spawnParticles(e.x,e.y,'#ffaa00',10,4,15);lhDmgText.push({x:e.x,y:e.y,txt:Math.floor(meleeDmg),life:30,c:'#ffaa00'});if(e.hp<=0&&equippedCMod==='Meat'){lhPlayer.hp+=lhPlayer.maxHp*0.1;if(lhPlayer.hp>lhPlayer.maxHp)lhPlayer.hp=lhPlayer.maxHp;}}});
  }
  if(lhPlayer.skillTimer>0)lhPlayer.skillTimer--;
  if(lhPlayer.skillCooldown>0)lhPlayer.skillCooldown--;

  lhCam.x=Math.max(0,Math.min(lhPlayer.x-400,WORLD_W-800));
  lhCam.y=Math.max(0,Math.min(lhPlayer.y-225,WORLD_H-450));
  const targetX=lhMouse.screenX+lhCam.x;
  const targetY=lhMouse.screenY+lhCam.y;

  if(lhPlayer.grenadeCooldown>0)lhPlayer.grenadeCooldown--;
  if((keys['KeyG']||keys['g'])&&lhPlayer.grenades>0&&lhPlayer.grenadeCooldown<=0&&!inVehicle){
    keys['KeyG']=false;keys['g']=false;
    lhPlayer.grenades--;localStorage.setItem('borderGrenades',lhPlayer.grenades);
    lhPlayer.grenadeCooldown=60;playShootSound('Launcher',lhPlayer.x);
    const gAng=Math.atan2(targetY-lhPlayer.y,targetX-lhPlayer.x);
    let gDmg=400*(1+rankDmg*0.15),gRad=150;
    if(equippedGMod==='Fastball'){gDmg*=3;gRad=50;}if(equippedGMod==='Bonus Package')gRad=300;
    if(mayhemMode===50)gDmg*=2500;else if(mayhemMode===20)gDmg*=50;else if(mayhemMode===10)gDmg*=5;
    lhGrenades.push({x:lhPlayer.x,y:lhPlayer.y,vx:Math.cos(gAng)*12,vy:Math.sin(gAng)*12,timer:75,dmg:gDmg,radius:gRad});
  }

  // ── Shooting ──────────────────────────────
  if(lhPlayer.gun.timer>0)lhPlayer.gun.timer--;
  if(lhShooting&&lhPlayer.gun.timer<=0&&!inVehicle&&lhPlayer.char!=='krieg'){
    if(!(lhPlayer.char==='krieg'&&lhPlayer.skillTimer>0)){
      const ang=Math.atan2(targetY-lhPlayer.y,targetX-lhPlayer.x);
      const gType=lhPlayer.gun.wType||'Pistol';
      playShootSound(gType,lhPlayer.x);
      const recoilStr=gType==='Launcher'?8:gType==='Sniper'?6:gType==='Shotgun'?5:gType==='SMG'?1:2;
      applyCameraRecoil(ang,recoilStr);
      screenShake=gType==='Launcher'?12:gType==='Sniper'?8:gType==='Shotgun'?6:gType==='SMG'?1:3;
      const muzzleSize=gType==='Launcher'?35:gType==='Shotgun'?28:gType==='Sniper'?20:gType==='SMG'?14:18;
      spawnMuzzleFlash(lhPlayer.x+Math.cos(ang)*20,lhPlayer.y+Math.sin(ang)*20,ang,muzzleSize);
      if(gType!=='Launcher')spawnShellCasing(lhPlayer.x,lhPlayer.y,ang);
      let frMult=1-lhPlayer.mods.fr;
      if(equippedCMod==='Cat'&&lhPlayer.char==='maya')frMult*=0.7;
      if(equippedCMod==='Berserker'&&lhPlayer.char==='salvador')frMult*=0.7;
      lhPlayer.gun.timer=Math.max(1,(lhPlayer.gun.fr*frMult)-rankFireRate);
      const skillDmgMult=(lhPlayer.char==='zero'&&lhPlayer.skillTimer>0)?4:1;
      if(lhPlayer.char==='zero'&&lhPlayer.skillTimer>0)lhPlayer.skillTimer=0;
      let cModDmg=1;
      if(equippedCMod==='Sniper'&&lhPlayer.char==='zero')cModDmg=1.3;
      if(equippedCMod==='Rifleman'&&lhPlayer.char==='axton')cModDmg=1.3;
      const finalDmg=(lhPlayer.gun.dmg*skillDmgMult*cModDmg*(1+lhPlayer.mods.dmg))*(1+(rankDmg*0.15));
      const isEtech=lhPlayer.gun.rarity===5,isPearl=lhPlayer.gun.rarity===6,isSnipe=gType==='Sniper';
      const fireBullet=(aOff,isRckt)=>{
        lhBullets.push({x:lhPlayer.x,y:lhPlayer.y,vx:Math.cos(ang+aOff)*lhPlayer.gun.spd,vy:Math.sin(ang+aOff)*lhPlayer.gun.spd,dmg:finalDmg,c:lhPlayer.gun.c,pierce:(isEtech||isSnipe),isRocket:isRckt,isSniper:isSnipe,hitList:[]});
        if(!isRckt)spawnParticles(lhPlayer.x+Math.cos(ang+aOff)*15,lhPlayer.y+Math.sin(ang+aOff)*15,'#fff',3,1.5,10);
      };
      if(gType==='Shotgun'){const pellets=isPearl?9:5,count=(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0)?pellets*2:pellets;for(let p=0;p<count;p++)fireBullet((Math.random()-0.5)*0.6,false);}
      else if(gType==='Launcher'){fireBullet(0,true);if(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0)fireBullet(0.2,true);}
      else{
        if(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0){if(isPearl){fireBullet(-0.2,false);fireBullet(0,false);fireBullet(0.2,false);fireBullet(-0.3,false);fireBullet(0.1,false);fireBullet(0.3,false);}else{fireBullet(-0.1,false);fireBullet(0.1,false);}}
        else{if(isPearl){fireBullet(-0.15,false);fireBullet(0,false);fireBullet(0.15,false);}else fireBullet(0,false);}
      }
    }
  }

  // ── Allies ────────────────────────────────
  for(let i=lhAllies.length-1;i>=0;i--){
    const a=lhAllies[i];a.life--;a.cd--;
    drawPixelSprite(ctx,a.type,a.x-lhCam.x,a.y-lhCam.y,a.type==='deathtrap'?40:30);
    let nearest=null,minDist=9999;
    lhEnemies.forEach(e=>{const d=Math.hypot(a.x-e.x,a.y-e.y);if(d<500&&d<minDist){minDist=d;nearest=e;}});
    if(a.type==='deathtrap'){
      if(nearest){a.tx=nearest.x;a.ty=nearest.y;}else{a.tx=lhPlayer.x;a.ty=lhPlayer.y;}
      const dAng=Math.atan2(a.ty-a.y,a.tx-a.x);
      if(Math.hypot(a.tx-a.x,a.ty-a.y)>50){a.x+=Math.cos(dAng)*4;a.y+=Math.sin(dAng)*4;}
      if(a.cd<=0&&nearest){playShootSound('Pistol',a.x);const tDmg=80*mayhemMult*(1+rankDmg*0.15)*(1+lhPlayer.mods.pet);const tAng=Math.atan2(nearest.y-a.y,nearest.x-a.x);lhBullets.push({x:a.x,y:a.y,vx:Math.cos(tAng)*15,vy:Math.sin(tAng)*15,dmg:tDmg,c:'#0ff',hitList:[]});a.cd=10;}
    } else {
      if(a.cd<=0&&nearest){playShootSound('Pistol',a.x);const tDmg=50*mayhemMult*(1+rankDmg*0.15)*(1+lhPlayer.mods.pet);const tAng=Math.atan2(nearest.y-a.y,nearest.x-a.x);lhBullets.push({x:a.x,y:a.y,vx:Math.cos(tAng)*12,vy:Math.sin(tAng)*12,dmg:tDmg,c:'#0f0',hitList:[]});a.cd=15;}
    }
    if(a.life<=0){spawnParticles(a.x,a.y,'#555',30,3,20);lhAllies.splice(i,1);}
  }

  // ── Spawn logic ───────────────────────────
  const psychoBaseHp=runCount>=25?200+Math.floor((runCount-25)/3)*30:runCount>=20?100:20;
  const psychoVarHp=runCount>=20?50:40;
  const newEnemyTypes=['skag','bullymong','stalker','surveyor','badass_psycho'];

  if(isUnderdome){
    if(waveDelay>0){waveDelay--;if(waveDelay===0&&underdomeWave>1){playSound('ability');lhDmgText.push({x:WORLD_W/2,y:WORLD_H/2,txt:`WAVE ${underdomeWave} BEGINS!`,life:100,c:'#ff007f'});}}
    else if(underdomeEnemies>0&&lhEnemies.length<Math.min(25,10+underdomeWave*2)){
      if(Math.random()<0.1){const ex=Math.random()*WORLD_W,ey=Math.random()*WORLD_H;if(Math.hypot(lhPlayer.x-ex,lhPlayer.y-ey)>400){spawnEnemy(ex,ey,psychoBaseHp*(1+underdomeWave*0.2),psychoVarHp,mayhemMult);underdomeEnemies--;}}
    } else if(underdomeEnemies<=0&&lhEnemies.length===0&&waveDelay<=0){
      waveDelay=240;underdomeWave++;badassTokens+=1;localStorage.setItem('badassTokens',badassTokens);
      underdomeEnemies=10+(underdomeWave*5);
      for(let k=0;k<4;k++)genLoot(lhPlayer.x+(Math.random()*100-50),lhPlayer.y+(Math.random()*100-50),false,false,false,true);
    }
  } else {
    // Boss spawning handled by zone system
    // Zone-aware enemy spawn
    if(!isRaidBoss&&!isDuel&&lhEnemies.length<15&&Math.random()<0.02){
      const zoneMaxX = currentZone===1 ? ZONE1_END()-50 : currentZone===2 ? ZONE2_END()-50 : WORLD_W-50;
      const zoneMinX = currentZone===1 ? 50 : currentZone===2 ? ZONE1_END()+50 : ZONE2_END()+50;
      const ex = zoneMinX + Math.random()*(zoneMaxX-zoneMinX);
      const ey = 50 + Math.random()*(WORLD_H-100);
      if(Math.hypot(lhPlayer.x-ex,lhPlayer.y-ey)>400) spawnEnemy(ex,ey,psychoBaseHp,psychoVarHp,mayhemMult);
    }
    // New enemy types spawn (level 10+)
    if(!isRaidBoss&&!isDuel&&!lhBossSpawned&&Math.random()<0.02&&pLevel>=10){
      const ex=Math.random()*WORLD_W,ey=Math.random()*WORLD_H;
      if(Math.hypot(lhPlayer.x-ex,lhPlayer.y-ey)>400){
        const pick=newEnemyTypes[Math.floor(Math.random()*newEnemyTypes.length)];
        const ne=spawnNewEnemy(pick,ex,ey,mayhemMult);
        if(ne)lhEnemies.push(ne);
      }
    }
  }

  // ─────────────────────────────────────────
  // DRAW WORLD
  // ─────────────────────────────────────────
  ctx.save();
  ctx.translate(-lhCam.x+cameraRecoilX,-lhCam.y+cameraRecoilY);
  if(screenShake>0){ctx.translate((Math.random()-0.5)*screenShake,(Math.random()-0.5)*screenShake);screenShake*=0.9;if(screenShake<0.5)screenShake=0;}

  const mD=mapData[activeMapIndex];
  const isNight=(dayNightTimer%DAY_LENGTH)>(DAY_LENGTH/2);
  ctx.fillStyle=isNight?'#0a0806':mD.bg;ctx.fillRect(0,0,WORLD_W,WORLD_H);
  ctx.fillStyle=isNight?'#050403':mD.dot;
  lhCraters.forEach(c=>{ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,Math.PI*2);ctx.fill();});
  ctx.strokeStyle=isNight?'#111':mD.line;ctx.lineWidth=2;
  for(let i=0;i<WORLD_W;i+=100){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,WORLD_H);ctx.stroke();}
  for(let i=0;i<WORLD_H;i+=100){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(WORLD_W,i);ctx.stroke();}
  ctx.strokeStyle=mayhemMode===50?'#ff00ff':mayhemMode===20?'#800080':mayhemMode===10?'#ff0000':'#ff007f';
  ctx.lineWidth=10;ctx.strokeRect(0,0,WORLD_W,WORLD_H);

  // ── Zone walls & gate ────────────────────
  drawZones(ctx);

  // ── Map special layer ─────────────────────
  drawMapSpecialLayer(ctx,lhCam);
  updateMapSpecials(mayhemMult);

  // Shell casings
  for(let i=shellCasings.length-1;i>=0;i--){
    const s=shellCasings[i];s.x+=s.vx;s.y+=s.vy;s.vy+=s.gravity;s.vx*=0.96;s.rot+=s.rotV;s.life--;
    ctx.globalAlpha=s.life/s.maxLife;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);
    ctx.fillStyle='#c8a000';ctx.fillRect(-3,-1.5,6,3);ctx.restore();
    if(s.life<=0)shellCasings.splice(i,1);
  }
  ctx.globalAlpha=1.0;

  // Exit portal
  if(lhExitPortal){
    ctx.fillStyle='#0ff';ctx.beginPath();ctx.arc(lhExitPortal.x,lhExitPortal.y,25,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 16px Arial';ctx.textAlign='center';
    ctx.fillText('PORTAL TO SANCTUARY',lhExitPortal.x,lhExitPortal.y-35);
    ctx.fillText('[E] ENTER',lhExitPortal.x,lhExitPortal.y-15);ctx.textAlign='left';
    if(Math.hypot(lhPlayer.x-lhExitPortal.x,lhPlayer.y-lhExitPortal.y)<50&&(keys['KeyE']||keys['e'])&&!inVehicle){keys['KeyE']=false;keys['e']=false;lhPlayer.win=true;}
  }

  // Grenades
  for(let i=lhGrenades.length-1;i>=0;i--){
    const g=lhGrenades[i];g.x+=g.vx;g.y+=g.vy;g.vx*=0.95;g.vy*=0.95;g.timer--;
    ctx.fillStyle='#0f0';ctx.beginPath();ctx.arc(g.x,g.y,6,0,Math.PI*2);ctx.fill();
    if(g.timer<=0){
      playSound('explosion',g.x);spawnParticles(g.x,g.y,'#ff8c00',60,8,40);screenShake=20;
      lhEnemies.forEach(e=>{if(Math.hypot(g.x-e.x,g.y-e.y)<g.radius){e.hp-=g.dmg;lhDmgText.push({x:e.x,y:e.y,txt:Math.floor(g.dmg),life:40,c:'#ff0'});if(fireLvl>0)e.fT=elemDur;if(shockLvl>0)e.sT=elemDur;if(acidLvl>0)e.aT=elemDur;}});
      lhGrenades.splice(i,1);
    }
  }

  // ── Enemy loop ────────────────────────────
  for(let i=lhEnemies.length-1;i>=0;i--){
    const e=lhEnemies[i];

    // ── New enemy AI ─────────────────────────
    if(newEnemyTypes.includes(e.type)){
      updateNewEnemyAI(e,lhPlayer,lhEnemyBullets,mayhemMult,lhDmgText,lhParticles,spawnParticles,playSound);
    }

    if(activeMapIndex===2&&e.deathTimer===undefined){lhCraters.forEach(c=>{if(Math.hypot(e.x-c.x,e.y-c.y)<c.r){e.hp-=20*mayhemMult;e.aT=60;if(Math.random()<0.1)spawnParticles(e.x,e.y,'#48ff00',1,1,10);}});}

    if(e.type==='loader'&&e.hp<=0&&e.deathTimer===undefined){e.deathTimer=60;e.speed=0;playSound('hit',e.x);continue;}
    if(e.deathTimer!==undefined){
      e.deathTimer--;
      if(e.deathTimer<=0){
        playSound('explosion',e.x);spawnParticles(e.x,e.y,'#ff4500',100,8,50);screenShake=30;
        const dist=Math.hypot(lhPlayer.x-e.x,lhPlayer.y-e.y);
        if(dist<120){if(inVehicle){lhPlayer.vehicleHp-=1000;checkVehicleExplosion();}else{let dmg=200*mayhemMult*(1-equippedArmor.dmgRed);lhPlayer.shieldRechargeDelay=240;if(lhPlayer.shield>0){if(lhPlayer.shield>=dmg){lhPlayer.shield-=dmg;dmg=0;}else{dmg-=lhPlayer.shield;lhPlayer.shield=0;}}lhPlayer.hp-=dmg;spawnParticles(lhPlayer.x,lhPlayer.y,'#ff0000',20,5,20);if(lhPlayer.hp<=0)lhPlayer.dead=true;}}
        if(activeQuest===2){questProgress++;localStorage.setItem('borderQProg',questProgress);}
        gainExp(50*mayhemMult);lhKills++;totalKills++;localStorage.setItem('totalKills',totalKills);playerCoins+=50;localStorage.setItem('borderCoins',playerCoins);checkAchievements();
        if(Math.random()<0.3)genLoot(e.x,e.y,false);lhEnemies.splice(i,1);
      }
      continue;
    }

    if(e.cd!==undefined){e.cd--;
      if(e.cd<=0){
        const bAng=Math.atan2(lhPlayer.y-e.y,lhPlayer.x-e.x);
        if(e.type==='crawmerax'){playSound('die',e.x);screenShake=15;lhEnemyBullets.push({x:lhPlayer.x,y:lhPlayer.y-200,vx:0,vy:10,dmg:100*mayhemMult,c:'#0ff',isSpike:true});e.cd=40;}
        else if(e.type==='pete'){playSound('explosion',e.x);screenShake=20;for(let r=0;r<30;r++){const a=(Math.PI*2/30)*r;lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*8,vy:Math.sin(a)*8,dmg:30*mayhemMult,c:'#ff4500'});}e.cd=120;}
        else if(e.type==='terramorphous'){playSound('die',e.x);for(let r=0;r<16;r++){const a=(Math.PI*2/16)*r;lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*7,vy:Math.sin(a)*7,dmg:50*mayhemMult,c:'#0f0'});}e.cd=60;}
        else if(e.type==='lilith_boss'){playShootSound('SMG',e.x);for(let w=1;w<=5;w++){lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(bAng-0.2*w)*6,vy:Math.sin(bAng-0.2*w)*6,dmg:1.5*mayhemMult,c:'#ff4500'});lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(bAng+0.2*w)*6,vy:Math.sin(bAng+0.2*w)*6,dmg:1.5*mayhemMult,c:'#ff4500'});}e.cd=60;}
        else if(e.type==='moxxi_boss'){playShootSound('Shotgun',e.x);for(let w=-2;w<=2;w++)lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(bAng+w*0.15)*6,vy:Math.sin(bAng+w*0.15)*6,dmg:2*mayhemMult,c:'#ff007f'});const tOff=Date.now()/250;for(let r=0;r<12;r++){const a=(Math.PI*2/12)*r;lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(a+tOff)*3,vy:Math.sin(a+tOff)*3,dmg:2*mayhemMult,c:'#ff00ff'});}e.cd=50;}
        else if(runCount>=3&&!newEnemyTypes.includes(e.type)){
          const bSpd=(e.type==='loader'||runCount>=5)?6:3.5;
          let bDmg=e.type==='loader'?25:10+(runCount*2);
          if(mayhemMode===10)bDmg*=3;if(mayhemMode===20)bDmg*=10;if(mayhemMode===50)bDmg*=50;
          let ang;
          if((runCount>=5||e.type==='loader')&&e.isMarksman){const pvx=lhPlayer.x-lhPlayer.lastX,pvy=lhPlayer.y-lhPlayer.lastY;const dist=Math.hypot(lhPlayer.x-e.x,lhPlayer.y-e.y);const time=dist/bSpd;ang=Math.atan2((lhPlayer.y+pvy*time)-e.y,(lhPlayer.x+pvx*time)-e.x);}
          else{ang=bAng;if(runCount<5&&e.type!=='loader')ang+=(Math.random()-0.5)*0.8;}
          lhEnemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*bSpd,vy:Math.sin(ang)*bSpd,dmg:bDmg,c:e.type==='loader'?'#ffcc00':'#ff4500'});
          playShootSound(e.type==='loader'?'SMG':'Pistol',e.x);
          e.cd=(e.type==='loader'?80:90)-(runCount>=5?20:0)+Math.random()*((e.type==='loader'?40:60)-(runCount>=5?10:0));
        }
      }
    }

    if(e.fT>0){e.fT--;if(e.fT%30===0){const d=Math.floor(10*fireLvl*elemMult);e.hp-=d;lhDmgText.push({x:e.x+(Math.random()*20-10),y:e.y-20,txt:d,life:30,c:'#ff4500'});playSound('hit',e.x);}if(e.fT%5===0)lhParticles.push({x:e.x+(Math.random()*20-10),y:e.y+10,vx:(Math.random()-0.5),vy:-2-Math.random()*2,c:'#ff4500',life:20,maxLife:20,size:Math.random()*4+2});}
    if(e.sT>0){e.sT--;if(e.sT%30===10){const d=Math.floor(10*shockLvl*elemMult);e.hp-=d;lhDmgText.push({x:e.x+(Math.random()*20-10),y:e.y-20,txt:d,life:30,c:'#00ffff'});playSound('hit',e.x);}if(e.sT%8===0)lhParticles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*8,vy:(Math.random()-0.5)*8,c:'#00ffff',life:10,maxLife:10,size:2});}
    if(e.aT>0){e.aT--;if(e.aT%30===20){const d=Math.floor(10*acidLvl*elemMult);e.hp-=d;lhDmgText.push({x:e.x+(Math.random()*20-10),y:e.y-20,txt:d,life:30,c:'#32cd32'});playSound('hit',e.x);}if(e.aT%10===0)lhParticles.push({x:e.x+(Math.random()*20-10),y:e.y+(Math.random()*20-10),vx:0,vy:-0.5,c:'#32cd32',life:40,maxLife:40,size:Math.random()*6+3});}

    if(e.hp<=0){
      spawnParticles(e.x,e.y,'#ff0000',40,5,30);
      const isBoss=e.type==='boss_goliath'||e.type==='boss'||e.type==='raid_boss'||e.type==='crawmerax'||e.type==='pete'||e.type.includes('_boss');
      if(isBoss){
        playerCoins+=1000;lhExitPortal={x:WORLD_W/2,y:WORLD_H/2};gainExp(1500*mayhemMult);
        if(e.type==='raid_boss'||e.type==='crawmerax'||e.type==='pete'||e.type==='terramorphous'){for(let k=0;k<5;k++)genLoot(e.x+(Math.random()*100-50),e.y+(Math.random()*100-50),true);for(let k=0;k<5;k++)genLoot(e.x+(Math.random()*100-50),e.y+(Math.random()*100-50),false,false,false,true);}
        else if(e.type==='lilith_boss'){const mPref=mayhemMode>0?`M${mayhemMode} `:'';lhLoot.push({x:e.x,y:e.y,isMod:false,gun:{name:mPref+'UNIQUE Hellfire',c:'#00ffff',dmg:Math.floor(400*mayhemMult),fr:3,spd:15,timer:0},life:9999});lhLoot.push({x:e.x+40,y:e.y,isMod:true,type:'Armor',name:mPref+"Firehawk's Mantle",desc:`-15% DMG, +${250*mayhemMult} HP`,dmgRed:0.15,hpBonus:250*mayhemMult,c:'#00ffff',life:9999});}
        else if(e.type==='moxxi_boss'){const mPref=mayhemMode>0?`M${mayhemMode} `:'';lhLoot.push({x:e.x,y:e.y,isMod:false,gun:{name:mPref+'UNIQUE Heart Breaker',c:'#00ffff',dmg:Math.floor(600*mayhemMult),fr:15,spd:10,timer:0},life:9999});lhLoot.push({x:e.x+40,y:e.y,isMod:true,type:'Armor',name:mPref+"Moxxi's Corset",desc:`-10% DMG, +${400*mayhemMult} HP`,dmgRed:0.10,hpBonus:400*mayhemMult,c:'#00ffff',life:9999});}
        else genLoot(e.x,e.y,true);
      } else if(e.type==='goliath'){playerCoins+=100;lhKills++;totalKills++;localStorage.setItem('totalKills',totalKills);gainExp(200*mayhemMult);checkAchievements();genLoot(e.x,e.y,false,false,false,e.pref==='Loot');}
      else if(newEnemyTypes.includes(e.type)){
        lhKills++;totalKills++;localStorage.setItem('totalKills',totalKills);playerCoins+=150;gainExp(100*mayhemMult);checkAchievements();
        if(e.type==='badass_psycho'){genLoot(e.x,e.y,true);badassTokens+=1;localStorage.setItem('badassTokens',badassTokens);}
        else if(Math.random()<0.35)genLoot(e.x,e.y,false,false,false,true);
      }
      else{lhKills++;totalKills++;localStorage.setItem('totalKills',totalKills);playerCoins+=20;gainExp(50*mayhemMult);checkAchievements();if(e.pref==='Loot'){genLoot(e.x,e.y,false);genLoot(e.x+10,e.y+10,false);genLoot(e.x-10,e.y-10,false);}else if(Math.random()<0.20)genLoot(e.x,e.y,false);if(activeQuest===1&&e.type==='normal'){questProgress++;localStorage.setItem('borderQProg',questProgress);}}
      localStorage.setItem('borderCoins',playerCoins);lhEnemies.splice(i,1);continue;
    }

    // Movement (skip for new enemies — handled by AI)
    if(!newEnemyTypes.includes(e.type)){
      if(e.pref==='Loot'){const a=Math.atan2(e.y-lhPlayer.y,e.x-lhPlayer.x);e.x+=Math.cos(a)*e.speed;e.y+=Math.sin(a)*e.speed;}
      else if(e.speed>0&&lhPlayer.skillTimer<=0){const a=Math.atan2(lhPlayer.y-e.y,lhPlayer.x-e.x);e.x+=Math.cos(a)*e.speed;e.y+=Math.sin(a)*e.speed;}
      else if(e.speed>0){e.x+=(Math.random()-0.5)*2;e.y+=(Math.random()-0.5)*2;}
    }
    e.x=Math.max(20,Math.min(WORLD_W-20,e.x));e.y=Math.max(20,Math.min(WORLD_H-20,e.y));

    // HP bar
    ctx.fillStyle='#000';ctx.fillRect(e.x-e.w/2-1,e.y-e.h/2-16,e.w+2,10);
    ctx.fillStyle=e.pref==='Armored'?'#ffcc00':'red';ctx.fillRect(e.x-e.w/2,e.y-e.h/2-15,(Math.max(0,e.hp)/e.maxHp)*e.w,8);
    if(e.pref!==''){ctx.fillStyle=e.pC;ctx.font='10px Courier';ctx.fillText(e.pref,e.x-e.w/2,e.y-e.h/2-20);}

    // Draw sprite — new enemies use their own renderer
    if(newEnemyTypes.includes(e.type)){
      drawNewEnemy(ctx,e);
    } else if(e.type==='boss_goliath'){ctx.fillStyle='white';ctx.font='16px Courier';ctx.fillText('BADASS GOLIATH',e.x-e.w/2,e.y-e.h/2-20);if(goliathImg.complete&&goliathImg.naturalHeight!==0)ctx.drawImage(goliathImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'goliath',e.x,e.y,e.w);}
    else if(e.type==='goliath'){if(goliathImg.complete&&goliathImg.naturalHeight!==0)ctx.drawImage(goliathImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'goliath',e.x,e.y,e.w);}
    else if(e.type==='boss'){ctx.fillStyle='white';ctx.font='16px Courier';ctx.fillText('PSYCHO KING',e.x-e.w/2,e.y-e.h/2-20);if(psychoImg.complete&&psychoImg.naturalHeight!==0)ctx.drawImage(psychoImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'boss',e.x,e.y,e.w);}
    else if(e.type==='loader')drawPixelSprite(ctx,'loader',e.x,e.y,e.w);
    else if(e.type==='terramorphous'||e.type==='crawmerax'||e.type==='pete'){ctx.fillStyle='#ff00ff';ctx.font='bold 20px Courier';ctx.fillText(e.type.toUpperCase(),e.x-e.w/2,e.y-e.h/2-20);drawPixelSprite(ctx,e.type,e.x,e.y,e.w);}
    else if(e.type==='lilith_boss'){ctx.fillStyle='#ff4500';ctx.font='bold 20px Courier';ctx.fillText('LILITH',e.x-e.w/2,e.y-e.h/2-20);if(lilithImg.complete&&lilithImg.naturalHeight!==0)ctx.drawImage(lilithImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'maya',e.x,e.y,e.w);}
    else if(e.type==='moxxi_boss'){ctx.fillStyle='#ff007f';ctx.font='bold 20px Courier';ctx.fillText('MAD MOXXI',e.x-e.w/2,e.y-e.h/2-20);if(moxxiImg.complete&&moxxiImg.naturalHeight!==0)ctx.drawImage(moxxiImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'maya',e.x,e.y,e.w);}
    else{if(psychoImg.complete&&psychoImg.naturalHeight!==0)ctx.drawImage(psychoImg,e.x-e.w/2,e.y-e.h/2,e.w,e.h);else drawPixelSprite(ctx,'psycho',e.x,e.y,e.w);}

    if(e.flash>0){e.flash--;ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);}

    const dist=Math.hypot(lhPlayer.x-e.x,lhPlayer.y-e.y);
    if(inVehicle&&dist<(e.w/2+25)){playSound('hit',e.x);e.hp-=100;spawnParticles(e.x,e.y,'#ffcc00',20,6,20);lhDmgText.push({x:e.x,y:e.y-20,txt:'RAM!',life:30,c:'#ffcc00'});const ra=Math.atan2(e.y-lhPlayer.y,e.x-lhPlayer.x);e.x+=Math.cos(ra)*60;e.y+=Math.sin(ra)*60;lhPlayer.vehicleHp-=(e.type.includes('boss')?500:50);checkVehicleExplosion();}
    else if(!inVehicle&&dist<(e.w/2+10)&&lhPlayer.skillTimer<=0){
      let dmgTaken=e.type==='boss_goliath'?25:e.type==='goliath'?10:e.type==='loader'?5:e.type.includes('boss')||e.type==='crawmerax'||e.type==='pete'?100:e.type==='badass_psycho'?15:3;
      dmgTaken*=(1-equippedArmor.dmgRed);
      if(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0)dmgTaken*=0.5;
      if(lhPlayer.char==='krieg'&&lhPlayer.skillTimer>0)dmgTaken*=0.5;
      lhPlayer.shieldRechargeDelay=180;
      const wasShielded=lhPlayer.shield>0;
      if(lhPlayer.shield>0){if(lhPlayer.shield>=dmgTaken){lhPlayer.shield-=dmgTaken;dmgTaken=0;}else{dmgTaken-=lhPlayer.shield;lhPlayer.shield=0;}}
      lhPlayer.hp-=dmgTaken;playDamageSound(wasShielded,e.x);
      if(!wasShielded&&lhPlayer.shield<=0)playSound('shield_break');
      spawnParticles(lhPlayer.x,lhPlayer.y,wasShielded?'#00aaff':'#ff0000',10,4,15);
      e.x-=Math.cos(Math.atan2(lhPlayer.y-e.y,lhPlayer.x-e.x))*(activeMapIndex===3?90:30);
      if(lhPlayer.hp<=0)lhPlayer.dead=true;
    }
  }

  // ── Player bullets ────────────────────────
  for(let i=lhBullets.length-1;i>=0;i--){
    const b=lhBullets[i];b.x+=b.vx;b.y+=b.vy;
    if(b.isRocket){ctx.fillStyle='#ff8c00';ctx.beginPath();ctx.arc(b.x,b.y,8,0,Math.PI*2);ctx.fill();spawnParticles(b.x,b.y,'#ff4500',2,1,15);}
    else{ctx.strokeStyle=b.c;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x-b.vx*2,b.y-b.vy*2);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();}
    if(b.x<0||b.x>WORLD_W||b.y<0||b.y>WORLD_H){lhBullets.splice(i,1);continue;}
    let hitSomething=false;
    for(let j=lhEnemies.length-1;j>=0;j--){
      const e=lhEnemies[j];
      if(e.deathTimer!==undefined||b.hitList.includes(e))continue;
      if(Math.hypot(b.x-e.x,b.y-e.y)<(e.w/2+(b.isRocket?10:4))){
        if(b.isRocket){
          playSound('explosion',b.x);spawnParticles(b.x,b.y,'#ff8c00',40,6,30);screenShake=10;applyHitStop(4);
          lhEnemies.forEach(aoeE=>{if(Math.hypot(b.x-aoeE.x,b.y-aoeE.y)<150&&aoeE.deathTimer===undefined){let rDmg=b.dmg;if(aoeE.pref==='Armored'&&acidLvl===0)rDmg*=0.5;aoeE.hp-=rDmg;aoeE.flash=5;lhDmgText.push({x:aoeE.x,y:aoeE.y-aoeE.h/2,txt:'BOOM! '+Math.floor(rDmg),life:40,c:'#ff8c00'});if(fireLvl>0)aoeE.fT=elemDur;if(shockLvl>0)aoeE.sT=elemDur;if(acidLvl>0)aoeE.aT=elemDur;}});
          lhBullets.splice(i,1);hitSomething=true;break;
        } else {
          const cChance=0.15+lhPlayer.mods.crit+(b.isSniper?0.30:0),cMult=b.isSniper?5:2.5;
          const isCrit=Math.random()<cChance;
          let finalDmg=b.dmg*(isCrit?cMult:1);
          if(e.pref==='Armored'&&acidLvl===0)finalDmg*=0.5;
          // Stalker takes more damage when visible
          if(e.type==='stalker'&&e.visible)finalDmg*=1.5;
          e.hp-=finalDmg;e.flash=5;
          if(isCrit)applyHitStop(b.isSniper?6:3);else if(finalDmg>200)applyHitStop(2);
          const kbType=lhPlayer.gun.wType||'Pistol';
          const kbStr=kbType==='Launcher'?80:kbType==='Shotgun'?50:kbType==='Sniper'?40:kbType==='SMG'?8:15;
          const kbAng=Math.atan2(e.y-lhPlayer.y,e.x-lhPlayer.x);
          e.x+=Math.cos(kbAng)*kbStr;e.y+=Math.sin(kbAng)*kbStr;
          e.x=Math.max(20,Math.min(WORLD_W-20,e.x));e.y=Math.max(20,Math.min(WORLD_H-20,e.y));
          if(isCrit){totalCrits++;localStorage.setItem('totalCrits',totalCrits);playSound('hit_crit',e.x);}else playSound('hit',e.x);
          lhDmgText.push({x:e.x+(Math.random()*30-15),y:e.y-e.h/2,txt:isCrit?`CRIT! ${Math.floor(finalDmg)}`:Math.floor(finalDmg),life:isCrit?45:30,c:isCrit?'#ff0000':e.pref==='Armored'?'#ffaa00':finalDmg>50?'#ff0':'#fff'});
          spawnParticles(b.x,b.y,'#ffff00',6,3,15);
          if(fireLvl>0)e.fT=elemDur;if(shockLvl>0)e.sT=elemDur;if(acidLvl>0)e.aT=elemDur;
          b.hitList.push(e);hitSomething=true;if(!b.pierce){lhBullets.splice(i,1);break;}
        }
      }
    }
    if(b.pierce&&hitSomething)continue;
  }

  // ── Enemy bullets ─────────────────────────
  for(let i=lhEnemyBullets.length-1;i>=0;i--){
    const b=lhEnemyBullets[i];
    if(b.instant){
      let dmgTaken=b.dmg*(1-equippedArmor.dmgRed);
      if(lhPlayer.shield>0){if(lhPlayer.shield>=dmgTaken){lhPlayer.shield-=dmgTaken;dmgTaken=0;}else{dmgTaken-=lhPlayer.shield;lhPlayer.shield=0;}}
      lhPlayer.hp-=dmgTaken;spawnParticles(lhPlayer.x,lhPlayer.y,'#ff0000',20,5,20);
      if(lhPlayer.hp<=0)lhPlayer.dead=true;lhEnemyBullets.splice(i,1);continue;
    }
    b.x+=b.vx;b.y+=b.vy;
    if(b.isRock){drawRockProjectile(ctx,b);}
    else if(b.isSpike){ctx.fillStyle=b.c;ctx.fillRect(b.x-2,b.y-10,4,20);}
    else{ctx.fillStyle=b.c||'#ff4500';ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();}
    if(b.x<0||b.x>WORLD_W||b.y<0||b.y>WORLD_H){lhEnemyBullets.splice(i,1);continue;}
    const dist=Math.hypot(lhPlayer.x-b.x,lhPlayer.y-b.y);
    if(lhPlayer.skillTimer>0&&dist<45&&!inVehicle&&lhPlayer.char==='maya'){spawnParticles(b.x,b.y,'#0ff',6,2,15);lhEnemyBullets.splice(i,1);continue;}
    if(dist<15&&!inVehicle){
      let dmgTaken=b.dmg*(1-equippedArmor.dmgRed);
      if(lhPlayer.char==='salvador'&&lhPlayer.skillTimer>0)dmgTaken*=0.5;
      if(lhPlayer.char==='krieg'&&lhPlayer.skillTimer>0)dmgTaken*=0.5;
      lhPlayer.shieldRechargeDelay=180;
      const wasShielded=lhPlayer.shield>0;
      if(lhPlayer.shield>0){if(lhPlayer.shield>=dmgTaken){lhPlayer.shield-=dmgTaken;dmgTaken=0;}else{dmgTaken-=lhPlayer.shield;lhPlayer.shield=0;}}
      lhPlayer.hp-=dmgTaken;playDamageSound(wasShielded,b.x);
      spawnParticles(lhPlayer.x,lhPlayer.y,wasShielded?'#00aaff':'#ff0000',10,4,15);
      if(lhPlayer.hp<=0)lhPlayer.dead=true;lhEnemyBullets.splice(i,1);
    }else if(inVehicle&&dist<35){playSound('hit',b.x);lhPlayer.vehicleHp-=b.dmg;spawnParticles(b.x,b.y,'#ff6600',5,2,10);lhEnemyBullets.splice(i,1);checkVehicleExplosion();}
  }

  // ── Muzzle flashes ────────────────────────
  for(let i=muzzleFlashes.length-1;i>=0;i--){
    const mf=muzzleFlashes[i];mf.life--;
    const prog=mf.life/mf.maxLife;
    ctx.save();ctx.translate(mf.x,mf.y);ctx.rotate(mf.ang);
    ctx.globalAlpha=prog*0.6;ctx.fillStyle='#ff8800';ctx.beginPath();ctx.arc(0,0,mf.size*prog,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=prog;ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(0,0,mf.size*0.4*prog,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffcc00';ctx.lineWidth=2;ctx.globalAlpha=prog*0.8;
    for(let s=0;s<5;s++){const sa=(Math.PI*2/5)*s;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(sa)*mf.size*prog,Math.sin(sa)*mf.size*prog);ctx.stroke();}
    ctx.restore();ctx.globalAlpha=1.0;
    if(mf.life<=0)muzzleFlashes.splice(i,1);
  }

  for(let i=lhDmgText.length-1;i>=0;i--){const d=lhDmgText[i];d.y-=1;d.life--;ctx.fillStyle=d.c;ctx.font='bold 16px Courier';ctx.textAlign='center';ctx.fillText(d.txt,d.x,d.y);ctx.textAlign='left';if(d.life<=0)lhDmgText.splice(i,1);}
  updateAndDrawParticles();
  updateAndDrawLoot(false);

  if(inVehicle){drawPixelSprite(ctx,'vehicle',lhPlayer.x,lhPlayer.y,35);}
  else{
    drawPixelSprite(ctx,lhPlayer.char,lhPlayer.x,lhPlayer.y,30);
    if(lhPlayer.skillTimer>0&&lhPlayer.char==='maya'){ctx.fillStyle='rgba(0,255,255,0.2)';ctx.beginPath();ctx.arc(lhPlayer.x,lhPlayer.y,45,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0ff';ctx.lineWidth=2;ctx.stroke();}
    if(lhPlayer.skillTimer>0&&lhPlayer.char==='salvador'){ctx.fillStyle='rgba(255,0,0,0.2)';ctx.beginPath();ctx.arc(lhPlayer.x,lhPlayer.y,35,0,Math.PI*2);ctx.fill();}
    if(lhPlayer.skillTimer>0&&lhPlayer.char==='krieg'){ctx.fillStyle='rgba(255,165,0,0.2)';ctx.beginPath();ctx.arc(lhPlayer.x,lhPlayer.y,100,0,Math.PI*2);ctx.fill();}
  }


  // ── HUD ───────────────────────────────────
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,800,60);
  ctx.fillStyle='#111';ctx.fillRect(0,445,800,5);
  ctx.fillStyle='#0ff';ctx.fillRect(0,445,(pExp/getExpRequired(pLevel))*800,5);
  if(inVehicle){
    ctx.fillStyle='#222';ctx.fillRect(10,10,150,15);ctx.fillStyle='#ff6600';ctx.fillRect(10,10,(Math.max(0,lhPlayer.vehicleHp)/lhPlayer.maxVehicleHp)*150,15);ctx.strokeStyle='#fff';ctx.strokeRect(10,10,150,15);
    ctx.fillStyle='#fff';ctx.font='12px Arial';ctx.fillText(`ARMOR: ${Math.floor(lhPlayer.vehicleHp)}/${lhPlayer.maxVehicleHp}`,15,22);ctx.fillText(`Credits: $${playerCoins}`,10,45);
  } else {
    ctx.fillStyle='#00aaff';ctx.fillRect(10,10,(lhPlayer.shield/lhPlayer.maxShield)*150,10);ctx.strokeStyle='#fff';ctx.strokeRect(10,10,150,10);
    ctx.fillStyle='#ff3333';ctx.fillRect(10,25,(Math.max(0,lhPlayer.hp)/lhPlayer.maxHp)*150,10);ctx.strokeStyle='#fff';ctx.strokeRect(10,25,150,10);
    ctx.fillStyle='#fff';ctx.font='12px Arial';ctx.fillText(`SHD: ${Math.floor(lhPlayer.shield)}/${lhPlayer.maxShield} | HP: ${Math.floor(Math.max(0,lhPlayer.hp))}/${lhPlayer.maxHp} | Lv${pLevel}`,10,50);
  }
  ctx.fillStyle=lhPlayer.gun.c;ctx.font='14px Courier New';ctx.fillText(`GUN: ${lhPlayer.gun.name} (DMG: ${Math.floor(lhPlayer.gun.dmg)}) | NADE: ${lhPlayer.grenades}/3`,350,20);
  const questTxt=activeQuest===0?'None':activeQuest===1?`Psychos (${questProgress}/25)`:`Loaders (${questProgress}/10)`;
  ctx.fillStyle='#0ff';ctx.fillText(`[I] ECHO INV. | QUEST: ${questTxt}`,350,40);
  if(hasVehicle){ctx.fillStyle=lhPlayer.vehicleCooldown>0?'#888':'#ffcc00';ctx.fillText('[V] Vehicle',650,40);}
  if(lhPlayer.skillTimer>0){ctx.fillStyle='#0ff';ctx.fillText('SKILL ACTIVE!',650,25);}
  else if(lhPlayer.skillCooldown<=0){ctx.fillStyle='#0f0';ctx.fillText('[E] SKILL READY',650,25);}
  else{ctx.fillStyle='#888';ctx.fillText(`[E] CD: ${Math.ceil(lhPlayer.skillCooldown/60)}s`,650,25);}

  if(lhBossSpawned){
    const theBoss=lhEnemies.find(e=>e.type.includes('boss')||e.type==='crawmerax'||e.type==='pete'||e.type==='terramorphous');
    if(theBoss&&theBoss.hp>0){
      const bName=isRaidBoss?theBoss.type.toUpperCase()+' THE INVINCIBLE':isDuel?`DUELING: ${duelOpponent.toUpperCase()}`:runCount>=6?'GOLIATH THE INVINCIBLE':'PSYCHO KING';
      ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(145,65,510,30);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(145,65,510,30);
      ctx.fillStyle=isRaidBoss?'purple':isDuel?'cyan':'red';ctx.fillRect(150,70,(Math.max(0,theBoss.hp)/theBoss.maxHp)*500,20);
      ctx.fillStyle='#fff';ctx.font='bold 18px Courier';ctx.textAlign='center';ctx.fillText(`${bName} (${Math.floor(theBoss.hp)})`,400,85);ctx.textAlign='left';
    }
  }

  if(isUnderdome){ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(250,60,300,50);ctx.strokeStyle='#ff007f';ctx.lineWidth=2;ctx.strokeRect(250,60,300,50);ctx.fillStyle='#ff007f';ctx.font='bold 24px Courier';ctx.textAlign='center';ctx.fillText(`WAVE ${underdomeWave}`,400,82);ctx.fillStyle='#fff';ctx.font='14px Courier';ctx.fillText(`Enemies Remaining: ${underdomeEnemies+lhEnemies.length}`,400,102);ctx.textAlign='left';}
  if(mayhemMode===50){ctx.fillStyle='#ff00ff';ctx.font='bold 30px Courier';ctx.fillText('MAYHEM 50',630,55);}
  else if(mayhemMode===20){ctx.fillStyle='purple';ctx.font='bold 30px Courier';ctx.fillText('MAYHEM 20',630,55);}
  else if(mayhemMode===10){ctx.fillStyle='red';ctx.font='bold 30px Courier';ctx.fillText('MAYHEM 10',630,55);}

  const hasBoss=lhBossSpawned&&lhEnemies.some(e=>e.type.includes('boss')||e.type==='crawmerax'||e.type==='pete'||e.type==='terramorphous');
  updateMusicIntensity(lhEnemies.length,hasBoss);
  updateZones(mayhemMult);
  drawZones(ctx);
  drawMinimap();
  drawAchievementPopup();
  checkAchievements();
  if(!isRaidBoss&&!isDuel) updateZones(mayhemMult);
  drawAchievementPopup();
  drawMinimap();

  statusText.innerText='WASD: Move | Click: Shoot | E: Skill | G: Grenade | F: Pick Up | B: Vault | I: Inventory';
  animId=requestAnimationFrame(loopLooter);
}