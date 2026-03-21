/* ==========================================
   SANCTUARY.JS — The hub world loop v2.0
   ========================================== */

function startSanctuary() {
  if (animId) cancelAnimationFrame(animId);
  gCanvas.style.cursor = 'default';
  inSanctuary = true; inVehicle = false;
  lhParticles = []; slotsSpinTimer = 0; dayNightTimer = 0;

  const charClass = localStorage.getItem('borderClass') || 'zero';
  lhPlayer = buildPlayer(charClass);
  lhPlayer.x = 400; lhPlayer.y = 225;

  lhCam = { x: 0, y: 0 };
  lhLoot = []; lhEnemies = []; lhBullets = []; lhEnemyBullets = [];
  lhDmgText = []; lhGrenades = []; lhAllies = [];
  inDialog = false; dialogStep = 0;

  // ── Start sanctuary music ────────────────
  window.setMusicState('sanctuary');

  gCanvas.onmousemove = (e) => {
    const rect   = gCanvas.getBoundingClientRect();
    const scaleX = gCanvas.width  / rect.width;
    const scaleY = gCanvas.height / rect.height;
    lhMouse.screenX = (e.clientX - rect.left) * scaleX;
    lhMouse.screenY = (e.clientY - rect.top)  * scaleY;
  };

  gCanvas.onmousedown = () => {
    if (inDialog) {
      if (dialogStep < moxxiLines.length - 1) { dialogStep++; playSound('coin'); }
      return;
    }
    if (nearNPC && nearNPC.name === 'Moxxi') {
      inDialog = true; dialogStep = 0; playSound('ability');
      keys['KeyW'] = false; keys['KeyS'] = false;
      keys['KeyA'] = false; keys['KeyD'] = false;
    }
  };

  gCanvas.onmouseup = null;
  loopSanctuary();
}

// ─────────────────────────────────────────────────────────
function loopSanctuary() {
  if (!inSanctuary || isBossMode || inBank || inBadass || inInventory || inSkills) return;

  ctx.clearRect(0, 0, gCanvas.width, gCanvas.height);

  // ── Player movement ──────────────────────
  if (!inDialog) {
    const spd = 4;
    if (keys['KeyW'] || keys['ArrowUp'])    lhPlayer.y = Math.max(20,  lhPlayer.y - spd);
    if (keys['KeyS'] || keys['ArrowDown'])  lhPlayer.y = Math.min(430, lhPlayer.y + spd);
    if (keys['KeyA'] || keys['ArrowLeft'])  lhPlayer.x = Math.max(20,  lhPlayer.x - spd);
    if (keys['KeyD'] || keys['ArrowRight']) lhPlayer.x = Math.min(780, lhPlayer.x + spd);
  }

  // ── Background ───────────────────────────
  if (sancBgImg.complete && sancBgImg.naturalHeight !== 0) {
    ctx.drawImage(sancBgImg, 0, 0, 800, 450);
  } else {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 800, 450);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
    for (let i = 0; i < 800; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 450); ctx.stroke(); }
    for (let i = 0; i < 450; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke(); }
    ctx.globalAlpha = 1.0;
  }

  // ── Run counter watermark ────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.font = 'bold 60px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`CURRENT RUN: ${runCount + 1}`, 400, 240);
  ctx.textAlign = 'left';

  // ── NPC message builders ─────────────────
  let lilithMsg = fireLvl < 33
    ? `Press E: Buy Fire Lv${fireLvl+1} (200c)`
    : shockLvl < 33
      ? `Press E: Buy Shock Lv${shockLvl+1} (200c)`
      : acidLvl < 33
        ? `Press E: Buy Acid Lv${acidLvl+1} (200c)`
        : 'Lilith: You are fully maxed out, Killer!';

  let bountyMsg = '';
  if      (activeQuest === 0)                        bountyMsg = 'Press E: Accept Bounty';
  else if (activeQuest === 1 && questProgress < 25)  bountyMsg = `Kill Psychos (${questProgress}/25)`;
  else if (activeQuest === 1 && questProgress >= 25) bountyMsg = 'Press E: Claim Loot';
  else if (activeQuest === 2 && questProgress < 10)  bountyMsg = `Destroy Loaders (${questProgress}/10)`;
  else if (activeQuest === 2 && questProgress >= 10) bountyMsg = 'Press E: Claim Tokens';

  // ── NPC definitions ───────────────────────
  const npcs = [
    { name: 'Claptrap',      x: 100, y: 100, img: clapImg,        fallback: '🤖',     msg: 'Press E: Buy Legendary (5000c)' },
    { name: 'Dr. Zed',       x: 200, y: 100, img: zedImg,         fallback: 'Zed',    msg: 'E: Shield (+50) 500c | Q: Grenades 50c' },
    { name: 'Quick Change',  x: 300, y: 100, img: quickChangeImg,  fallback: '🪞',     msg: 'Press E: Change Class' },
    { name: 'Portal',        x: 400, y: 80,  img: null,            fallback: 'Portal', msg: `[E] Enter: ${mapData[activeMapIndex].name} | [Q] Change Map` },
    { name: 'Raid Portal',   x: 500, y: 100, img: null,            fallback: '🟣',     msg: 'Press E: Enter Raid Boss (2000c)' },
    { name: 'Mayhem',        x: 600, y: 100, img: mayhemImg,       fallback: '💀',     msg: mayhemMode===50?'E: Disable Mayhem':mayhemMode===20?'E: Mayhem 50 (2500x HP)':mayhemMode===10?'E: Mayhem 20 (500x HP)':'E: Mayhem 10 (25x HP)' },
    { name: 'Slots',         x: 700, y: 80,  img: slotsImg,        fallback: 'Slots',  msg: 'Press E: Spin (200c)' },
    { name: 'Moxxi',         x: 700, y: 150, img: moxxiImg,        fallback: '💋',     msg: 'E: Tip 100c | C: Duel | Click: Chat' },
    { name: 'Bank',          x: 100, y: 350, img: bankImg,         fallback: 'Bank',   msg: 'Press E: Open Vault' },
    { name: 'Bounty Board',  x: 200, y: 350, img: bountyImg,       fallback: '📋',     msg: bountyMsg },
    { name: 'Lilith',        x: 300, y: 350, img: lilithImg,       fallback: '🔥',     msg: lilithMsg + ' | C: Duel' },
    { name: 'Catch-A-Ride',  x: 500, y: 350, img: catchARideImg,   fallback: 'vehicle',msg: hasVehicle?'Vehicle Unlocked! Press V in Combat':'Press E: Buy Runner (2000c)' },
    { name: 'Badass Ranks',  x: 700, y: 350, img: badassImg,       fallback: 'Badass', msg: `Press E: Spend Tokens (${badassTokens})` },
    { name: 'Skill Tree',    x: 400, y: 350, img: null,            fallback: '🧬',     msg: 'Press E: Upgrade Skills' }
  ];

  // ── Draw NPCs ────────────────────────────
  nearNPC = null;
  npcs.forEach(n => {
    if (n.img && n.img.src !== '' && n.img.complete && n.img.naturalHeight !== 0) {
      ctx.drawImage(n.img, n.x - 25, n.y - 25, 50, 50);
    } else if (n.name === 'Portal') {
      ctx.fillStyle = '#0ff'; ctx.beginPath(); ctx.arc(n.x, n.y, 25, 0, Math.PI*2); ctx.fill();
    } else if (n.name === 'Raid Portal') {
      ctx.fillStyle = '#a020f0'; ctx.beginPath(); ctx.arc(n.x, n.y, 25, 0, Math.PI*2); ctx.fill();
    } else if (n.name === 'Bounty Board' || n.name === 'Quick Change') {
      ctx.fillStyle = '#ffff00'; ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.fillText(n.fallback, n.x, n.y + 10);
    } else if (n.name === 'Skill Tree') {
      ctx.fillStyle = '#0f0'; ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.fillText(n.fallback, n.x, n.y + 10);
    } else if (n.name === 'Mayhem') {
      ctx.fillStyle = '#ff0000'; ctx.font = '30px Arial'; ctx.textAlign = 'center'; ctx.fillText('💀', n.x, n.y + 10);
    } else {
      drawPixelSprite(ctx, n.fallback, n.x, n.y, 45);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(n.name, n.x, n.y - 30); ctx.textAlign = 'left';
    if (Math.hypot(lhPlayer.x - n.x, lhPlayer.y - n.y) < 50) nearNPC = n;
  });

  // ── Slots spin animation ─────────────────
  if (slotsSpinTimer > 0) {
    slotsSpinTimer--;
    const symbols = ['🍒','🔔','💎','7️⃣','💀'];
    let s1 = symbols[Math.floor(Math.random()*symbols.length)];
    let s2 = symbols[Math.floor(Math.random()*symbols.length)];
    let s3 = symbols[Math.floor(Math.random()*symbols.length)];
    if (slotsSpinTimer === 0) {
      s1='7️⃣'; s2='7️⃣'; s3='7️⃣';
      playSound('coin'); playSound('coin');
      lhDmgText.push({ x:700, y:20, txt:'JACKPOT!', life:60, c:'#ffcc00' });
      genLoot(700, 120, false, false, true);
    }
    ctx.fillStyle='#111'; ctx.fillRect(670,10,60,30);
    ctx.fillStyle='#fff'; ctx.font='20px Arial'; ctx.textAlign='center';
    ctx.fillText(`${s1}${s2}${s3}`,700,32); ctx.textAlign='left';
  }

  // ── [C] key — Duels ──────────────────────
  if (!inDialog && (keys['KeyC'] || keys['c'])) {
    keys['KeyC'] = false; keys['c'] = false;
    if (nearNPC && nearNPC.name === 'Lilith') { window.setMusicState('combat'); startLooter(false, 'Lilith'); return; }
    if (nearNPC && nearNPC.name === 'Moxxi')  { window.setMusicState('combat'); startLooter(false, 'Moxxi');  return; }
  }

  // ── [E] key — NPC interactions ───────────
  if (!inDialog && (keys['KeyE'] || keys['e'])) {
    keys['KeyE'] = false; keys['e'] = false;
    if (nearNPC) {
      const n = nearNPC;

      if (n.name === 'Portal') {
        window.setMusicState('combat'); startLooter(false); return;

      } else if (n.name === 'Raid Portal') {
        if (playerCoins >= 2000) {
          playerCoins -= 2000; localStorage.setItem('borderCoins', playerCoins);
          window.setMusicState('boss'); startLooter(true); return;
        } else { playSound('hit'); lhDmgText.push({x:n.x,y:n.y-40,txt:'NEED 2000c!',life:40,c:'#f00'}); }

      } else if (n.name === 'Bounty Board') {
        if (activeQuest === 0) {
          activeQuest = Math.random()>0.5?1:2; questProgress=0;
          localStorage.setItem('borderQuest',activeQuest); localStorage.setItem('borderQProg',0);
          playSound('ability'); lhDmgText.push({x:n.x,y:n.y-40,txt:'BOUNTY ACCEPTED!',life:40,c:'#0f0'});
        } else if (activeQuest===1&&questProgress>=25) {
          activeQuest=0; questProgress=0;
          localStorage.setItem('borderQuest',0); localStorage.setItem('borderQProg',0);
          playSound('coin'); genLoot(n.x,n.y+40,true);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'BOUNTY CLEARED!',life:40,c:'#0f0'}); gainExp(1000);
        } else if (activeQuest===2&&questProgress>=10) {
          activeQuest=0; questProgress=0;
          localStorage.setItem('borderQuest',0); localStorage.setItem('borderQProg',0);
          badassTokens+=3; localStorage.setItem('badassTokens',badassTokens);
          playSound('coin'); lhDmgText.push({x:n.x,y:n.y-40,txt:'+3 TOKENS!',life:40,c:'#0f0'}); gainExp(1000);
        } else { playSound('hit'); }

      } else if (n.name==='Bank')         { window.openBank();
      } else if (n.name==='Badass Ranks') { window.openBadass();
      } else if (n.name==='Skill Tree')   { window.openSkills();

      } else if (n.name === 'Mayhem') {
        if      (mayhemMode===0)  mayhemMode=10;
        else if (mayhemMode===10) mayhemMode=20;
        else if (mayhemMode===20) mayhemMode=50;
        else                      mayhemMode=0;
        localStorage.setItem('borderMayhem',mayhemMode);
        playSound('ability'); spawnParticles(n.x,n.y,'#ff0000',40,5,40);
        lhDmgText.push({x:n.x,y:n.y-40,txt:mayhemMode===0?'MAYHEM OFF':`MAYHEM ${mayhemMode} ON!`,life:40,c:'#ff0000'});
        updateMenuStats();

      } else if (n.name==='Catch-A-Ride'&&!hasVehicle) {
        if (playerCoins>=2000) {
          playerCoins-=2000; hasVehicle=1;
          localStorage.setItem('borderVehicle',1); localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); spawnParticles(n.x,n.y,'#ff6600',40,5,40);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'VEHICLE UNLOCKED!',life:40,c:'#ffcc00'});
        } else { playSound('hit'); }

      } else if (n.name==='Claptrap') {
        if (playerCoins>=5000) {
          playerCoins-=5000; localStorage.setItem('borderCoins',playerCoins);
          playSound('coin'); genLoot(n.x,n.y+40,true);
          spawnParticles(n.x,n.y,'#ffffff',30,4,30);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'LEGENDARY BOUGHT!',life:40,c:'#ffa500'});
        } else { playSound('hit'); }

      } else if (n.name==='Dr. Zed') {
        if (playerCoins>=500) {
          playerCoins-=500; shieldLvl++;
          localStorage.setItem('borderShield',shieldLvl); localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); spawnParticles(n.x,n.y,'#00aaff',30,4,30);
          lhPlayer.maxShield=50+(shieldLvl*50); lhPlayer.shield=lhPlayer.maxShield;
          lhDmgText.push({x:n.x,y:n.y-40,txt:'+50 MAX SHIELD!',life:40,c:'#00aaff'});
        } else { playSound('hit'); }

      } else if (n.name==='Moxxi') {
        if (playerCoins>=100) {
          playerCoins-=100; localStorage.setItem('borderCoins',playerCoins);
          moxxiTips+=100; localStorage.setItem('moxxiTips',moxxiTips);
          playSound('coin'); spawnParticles(n.x,n.y,'#ff007f',15,3,20);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'TIP ACCEPTED!',life:30,c:'#ff007f'});
          if(moxxiTips>=1000){genLoot(n.x,n.y+40,false,true);moxxiTips=0;localStorage.setItem('moxxiTips',0);}
        } else { playSound('hit'); }

      } else if (n.name==='Slots') {
        if (playerCoins>=200&&slotsSpinTimer<=0) {
          playerCoins-=200; localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); slotsSpinTimer=120;
        } else if (slotsSpinTimer<=0) { playSound('hit'); }

      } else if (n.name==='Quick Change') {
        playSound('ability');
        const classes=['zero','maya','axton','salvador','krieg','gaige'];
        const nextClass=classes[(classes.indexOf(lhPlayer.char)+1)%classes.length];
        lhPlayer.char=nextClass; localStorage.setItem('borderClass',nextClass);
        spawnParticles(n.x,n.y,'#fff',30,4,30);
        lhDmgText.push({x:n.x,y:n.y-40,txt:`CLASS: ${nextClass.toUpperCase()}`,life:40,c:'#0ff'});
        updateMenuStats();

      } else if (n.name==='Lilith') {
        if (fireLvl<33&&playerCoins>=200) {
          playerCoins-=200; fireLvl++; localStorage.setItem('borderFire',fireLvl); localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); spawnParticles(n.x,n.y,'#ff4500',30,5,30);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'+1 FIRE LVL!',life:40,c:'#ff4500'});
        } else if (fireLvl===33&&shockLvl<33&&playerCoins>=200) {
          playerCoins-=200; shockLvl++; localStorage.setItem('borderShock',shockLvl); localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); spawnParticles(n.x,n.y,'#00ffff',30,5,30);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'+1 SHOCK LVL!',life:40,c:'#00ffff'});
        } else if (fireLvl===33&&shockLvl===33&&acidLvl<33&&playerCoins>=200) {
          playerCoins-=200; acidLvl++; localStorage.setItem('borderAcid',acidLvl); localStorage.setItem('borderCoins',playerCoins);
          playSound('ability'); spawnParticles(n.x,n.y,'#32cd32',30,5,30);
          lhDmgText.push({x:n.x,y:n.y-40,txt:'+1 ACID LVL!',life:40,c:'#32cd32'});
        } else { playSound('hit'); }
      }
    }
  }

  // ── [Q] key ───────────────────────────────
  if (!inDialog && (keys['KeyQ'] || keys['q'])) {
    keys['KeyQ'] = false; keys['q'] = false;
    if (nearNPC && nearNPC.name==='Dr. Zed') {
      if (playerCoins>=50&&lhPlayer.grenades<3) {
        playerCoins-=50; lhPlayer.grenades=3;
        localStorage.setItem('borderGrenades',3); localStorage.setItem('borderCoins',playerCoins);
        playSound('coin'); spawnParticles(nearNPC.x,nearNPC.y,'#0f0',20,3,20);
        lhDmgText.push({x:nearNPC.x,y:nearNPC.y-40,txt:'GRENADES REFILLED!',life:40,c:'#0f0'});
      } else { playSound('hit'); }
    } else if (nearNPC && nearNPC.name==='Portal') {
      let nextMap=(activeMapIndex+1)%mapData.length;
      while(mapData[nextMap].req>pLevel&&nextMap!==activeMapIndex) nextMap=(nextMap+1)%mapData.length;
      if(nextMap===activeMapIndex&&mapData.length>1) {
        playSound('hit'); lhDmgText.push({x:nearNPC.x,y:nearNPC.y-40,txt:'LEVEL UP TO UNLOCK MORE!',life:40,c:'#f00'});
      } else {
        activeMapIndex=nextMap; localStorage.setItem('borderMap',activeMapIndex);
        playSound('ability'); lhDmgText.push({x:nearNPC.x,y:nearNPC.y-40,txt:mapData[activeMapIndex].name,life:40,c:'#0ff'});
      }
    }
  }

  // ── Loot, damage text, particles ─────────
  updateAndDrawLoot(true);
  for(let i=lhDmgText.length-1;i>=0;i--){
    const d=lhDmgText[i]; d.y-=1; d.life--;
    ctx.fillStyle=d.c; ctx.font='bold 16px Courier'; ctx.textAlign='center';
    ctx.fillText(d.txt,d.x,d.y); ctx.textAlign='left';
    if(d.life<=0) lhDmgText.splice(i,1);
  }
  updateAndDrawParticles();

  // ── Draw Player ───────────────────────────
  drawPixelSprite(ctx, lhPlayer.char, lhPlayer.x, lhPlayer.y, 30);

  // ── Moxxi Dialog ─────────────────────────
  if (inDialog) {
    ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(100,320,600,110);
    ctx.strokeStyle='#ff007f'; ctx.lineWidth=3; ctx.strokeRect(100,320,600,110);
    if(moxxiImg.complete&&moxxiImg.naturalHeight!==0){ctx.drawImage(moxxiImg,100,240,90,90);}
    else{drawPixelSprite(ctx,'maya',145,285,50);}
    ctx.fillStyle='#ff007f'; ctx.font='bold 18px Courier'; ctx.fillText('MAD MOXXI',200,345);
    ctx.fillStyle='#fff'; ctx.font='16px Courier';
    moxxiLines[dialogStep].split('\n').forEach((line,idx)=>ctx.fillText(line,120,375+idx*22));
    if(dialogStep<moxxiLines.length-1){
      ctx.fillStyle='#ffcc00'; ctx.font='12px Courier'; ctx.textAlign='right';
      ctx.fillText('Click to continue...',690,420); ctx.textAlign='left';
    }
  }

  // ── HUD ───────────────────────────────────
  ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,410,800,40);
  ctx.fillStyle='#111'; ctx.fillRect(0,445,800,5);
  ctx.fillStyle='#0ff'; ctx.fillRect(0,445,(pExp/getExpRequired(pLevel))*800,5);
  ctx.fillStyle='#fff'; ctx.font='15px Courier New';
  ctx.fillText(`Credits: $${playerCoins} | Tokens: ${badassTokens} | Gun: ${lhPlayer.gun.name} | Lv${pLevel}`,10,435);
  if(nearNPC&&!inDialog){
    ctx.fillStyle='#ffcc00'; ctx.font='bold 20px Arial'; ctx.textAlign='center';
    ctx.fillText(nearNPC.msg,400,200); ctx.textAlign='left';
  }

  statusText.innerText='WASD: Move | E: Interact | Q: Alt Action | C: Duel | F: Pick Up | I: Inventory | B: Vault';
  animId = requestAnimationFrame(loopSanctuary);
}