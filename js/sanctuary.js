/* ==========================================
   SANCTUARY.JS — The hub world loop v2.2
   Visual polish: nameplates, proximity glow,
   redesigned HUD, day/night sky tint
   ========================================== */

function startSanctuary() {
  if (animId) cancelAnimationFrame(animId);
  gCanvas.style.cursor = 'default';
  inSanctuary = true; inVehicle = false;
  lhParticles = []; slotsSpinTimer = 0; dayNightTimer = 0;

  refreshMarcusShop();

  const charClass = localStorage.getItem('borderClass') || 'zero';
  lhPlayer = buildPlayer(charClass);
  lhPlayer.x = 400; lhPlayer.y = 225;

  if (typeof equippedShield !== 'undefined' && equippedShield) {
    applyShieldToPlayer(equippedShield);
  }

  lhCam = { x: 0, y: 0 };
  lhLoot = []; lhEnemies = []; lhBullets = []; lhEnemyBullets = [];
  lhDmgText = []; lhGrenades = []; lhAllies = [];
  inDialog = false; dialogStep = 0;

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

// ── NPC accent colors for nameplates ───────
const NPC_COLORS = {
  'Claptrap':     '#ffcc00',
  'Dr. Zed':      '#ff3333',
  'Quick Change': '#00ffff',
  'Portal':       '#00ffff',
  'Raid Portal':  '#cc44ff',
  'Mayhem':       '#ff0000',
  'Slots':        '#ffcc00',
  'Moxxi':        '#ff007f',
  'Bank':         '#00ffcc',
  'Bounty Board': '#ffff00',
  'Lilith':       '#ff4500',
  'Catch-A-Ride': '#ff6600',
  'Marcus':       '#ffcc00',
  'Badass Ranks': '#ff00aa',
  'Skill Tree':   '#00ff88',
};

// ── Draw styled nameplate under NPC ────────
function drawNameplate(n, isNear) {
  const color = NPC_COLORS[n.name] || '#ffffff';
  const pw = 90, ph = 18;
  const px = n.x - pw / 2;
  const py = n.y + 30;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 3);
  ctx.fill();

  // Colored top border
  ctx.fillStyle = color;
  ctx.fillRect(px, py, pw, 2);

  // Name text
  ctx.fillStyle = isNear ? color : '#aaaaaa';
  ctx.font = `bold ${isNear ? 10 : 9}px "Courier New"`;
  ctx.textAlign = 'center';
  ctx.fillText(n.name.toUpperCase(), n.x, py + 13);

  // [E] hint when near
  if (isNear) {
    ctx.fillStyle = color;
    ctx.font = 'bold 8px Arial';
    ctx.fillText('[E]', n.x, py + ph + 10);
  }
  ctx.restore();
}

// ── Draw proximity glow ring ───────────────
function drawProximityGlow(n) {
  const color  = NPC_COLORS[n.name] || '#ffffff';
  const pulse  = 0.4 + Math.sin(Date.now() / 300) * 0.3;
  const radius = 34 + Math.sin(Date.now() / 400) * 4;

  ctx.save();
  ctx.beginPath();
  ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = pulse;
  ctx.stroke();

  const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
  grad.addColorStop(0, color + '22');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.globalAlpha = pulse * 0.5;
  ctx.fill();

  ctx.globalAlpha = 1.0;
  ctx.restore();
}

// ── Day/night sky tint ─────────────────────
function drawDayNightTint() {
  const t     = (dayNightTimer % DAY_LENGTH) / DAY_LENGTH;
  const sunH  = Math.sin(t * Math.PI * 2);

  let r, g, b, alpha;
  if (sunH > 0.5) {
    r=255; g=200; b=100; alpha=0.04;
  } else if (sunH > 0) {
    const f=sunH/0.5; r=255; g=Math.floor(120+f*80); b=50; alpha=0.10-f*0.06;
  } else if (sunH > -0.3) {
    const f=(-sunH)/0.3; r=255; g=Math.floor(80-f*60); b=Math.floor(f*100); alpha=0.12+f*0.05;
  } else {
    const f=Math.min(1,(-sunH-0.3)/0.4); r=20; g=30; b=Math.floor(80+f*60); alpha=0.15+f*0.1;
  }

  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
  ctx.fillRect(0, 0, 800, 450);

  // Stars at night
  if (sunH < -0.2) {
    const starAlpha = Math.min(0.6, (-sunH - 0.2) * 2);
    const stars = [
      [50,30],[150,20],[250,40],[380,15],[470,35],[560,25],[650,10],[730,40],
      [80,60],[200,55],[340,70],[500,50],[620,65],[760,55],[120,80],[420,75]
    ];
    stars.forEach(([sx,sy]) => {
      ctx.globalAlpha = starAlpha * (0.5 + Math.sin(Date.now()/800+sx)*0.5) * 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx, sy, 2, 2);
    });
    ctx.globalAlpha = 1.0;
  }
}

// ── Redesigned HUD bar ─────────────────────
function drawSanctuaryHUD() {
  const barH = 42, barY = 450 - barH;

  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, barY, 800, barH);

  // Orange top accent
  ctx.fillStyle = '#ffa500';
  ctx.fillRect(0, barY, 800, 2);

  // EXP bar just below accent
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, barY + 2, 800, 4);
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(0, barY + 2, (pExp / getExpRequired(pLevel)) * 800, 4);

  // ── Credits ──
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 13px "Courier New"';
  ctx.textAlign = 'left';
  ctx.fillText(`$${playerCoins.toLocaleString()}`, 10, barY + 21);
  ctx.fillStyle = '#555';
  ctx.font = '9px Arial';
  ctx.fillText('CREDITS', 10, barY + 33);

  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(108, barY+8, 1, barH-16);

  // ── Level ──
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 13px "Courier New"';
  ctx.fillText(`LV ${pLevel}`, 118, barY + 21);
  ctx.fillStyle = '#555';
  ctx.font = '9px Arial';
  ctx.fillText(`${pExp}/${getExpRequired(pLevel)} XP`, 118, barY + 33);

  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(215, barY+8, 1, barH-16);

  // ── Gun ──
  const gunColor = lhPlayer.gun.c || '#fff';
  ctx.fillStyle = gunColor;
  ctx.font = 'bold 11px "Courier New"';
  const gunLabel = lhPlayer.gun.name.length > 20
    ? lhPlayer.gun.name.substring(0, 19) + '…'
    : lhPlayer.gun.name;
  ctx.fillText(gunLabel, 225, barY + 20);
  ctx.fillStyle = '#555';
  ctx.font = '9px Arial';
  ctx.fillText(`${lhPlayer.gun.wType || 'Pistol'} | DMG ${Math.floor(lhPlayer.gun.dmg)} | FR ${lhPlayer.gun.fr}`, 225, barY + 33);

  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(500, barY+8, 1, barH-16);

  // ── Shield ──
  const shdName  = (typeof equippedShield !== 'undefined' && equippedShield) ? equippedShield.name : `Shield Lv${shieldLvl}`;
  const shdColor = (typeof equippedShield !== 'undefined' && equippedShield) ? equippedShield.color : '#00aaff';
  ctx.fillStyle = shdColor;
  ctx.font = 'bold 11px "Courier New"';
  const shdLabel = shdName.length > 16 ? shdName.substring(0,15)+'…' : shdName;
  ctx.fillText(shdLabel, 510, barY + 20);
  ctx.fillStyle = '#555';
  ctx.font = '9px Arial';
  ctx.fillText(`${Math.floor(lhPlayer.shield)} / ${Math.floor(lhPlayer.maxShield)}`, 510, barY + 33);

  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(660, barY+8, 1, barH-16);

  // ── Tokens ──
  ctx.fillStyle = '#ff6a00';
  ctx.font = 'bold 13px "Courier New"';
  ctx.fillText(`${badassTokens} TKN`, 670, barY + 21);
  ctx.fillStyle = '#555';
  ctx.font = '9px Arial';
  ctx.fillText('BADASS', 670, barY + 33);

  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────
function loopSanctuary() {
  if (!inSanctuary || isBossMode || inBank || inBadass || inInventory || inSkills || marcusShopOpen) return;
  const zedOpen = document.getElementById('zed-screen') &&
                  document.getElementById('zed-screen').style.display === 'flex';
  if (zedOpen) return;

  ctx.clearRect(0, 0, gCanvas.width, gCanvas.height);
  dayNightTimer++;

  // ── Player movement ──────────────────────
  if (!inDialog) {
    const spd = 4;
    if (keys['KeyW'] || keys['ArrowUp'])    lhPlayer.y = Math.max(20,  lhPlayer.y - spd);
    if (keys['KeyS'] || keys['ArrowDown'])  lhPlayer.y = Math.min(400, lhPlayer.y + spd);
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

  // ── Day/night tint ───────────────────────
  drawDayNightTint();

  // ── Run counter watermark ────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.font = 'bold 55px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`RUN ${runCount + 1}`, 400, 240);
  ctx.textAlign = 'left';

  // ── NPC message builders ─────────────────
  let lilithMsg = fireLvl < 33
    ? `Buy Fire Lv${fireLvl+1} — $200`
    : shockLvl < 33 ? `Buy Shock Lv${shockLvl+1} — $200`
    : acidLvl < 33  ? `Buy Acid Lv${acidLvl+1} — $200`
    : 'All elements maxed out!';

  let bountyMsg = activeQuest===0 ? 'Accept a Bounty Contract'
    : activeQuest===1&&questProgress<25  ? `Kill Psychos (${questProgress}/25)`
    : activeQuest===1&&questProgress>=25 ? 'Claim your reward!'
    : activeQuest===2&&questProgress<10  ? `Destroy Loaders (${questProgress}/10)`
    : 'Claim your tokens!';

  // ── NPC definitions ───────────────────────
  const npcs = [
    { name:'Claptrap',     x:100, y:100, img:clapImg,       fallback:'🤖',      msg:'Buy a Legendary weapon — $5,000' },
    { name:'Dr. Zed',      x:200, y:100, img:zedImg,        fallback:'Zed',     msg:'Shield Shop  |  Q: Refill Grenades $50' },
    { name:'Quick Change', x:300, y:100, img:quickChangeImg, fallback:'🪞',      msg:'Change your Vault Hunter class' },
    { name:'Portal',       x:400, y:80,  img:null,           fallback:'Portal',  msg:`Enter ${mapData[activeMapIndex].name}  |  Q: Switch Map` },
    { name:'Raid Portal',  x:500, y:100, img:null,           fallback:'🟣',      msg:'Enter Raid Boss encounter — $2,000' },
    { name:'Mayhem',       x:600, y:100, img:mayhemImg,      fallback:'💀',      msg:mayhemMode===50?'Disable Mayhem':mayhemMode===20?'→ Mayhem 50':mayhemMode===10?'→ Mayhem 20':'Enable Mayhem 10' },
    { name:'Slots',        x:700, y:80,  img:slotsImg,       fallback:'Slots',   msg:'Spin the slot machine — $200' },
    { name:'Moxxi',        x:700, y:150, img:moxxiImg,       fallback:'💋',      msg:'Tip $100  |  C: Duel  |  Click: Chat' },
    { name:'Bank',         x:100, y:350, img:bankImg,        fallback:'Bank',    msg:'Open the Sanctuary Vault' },
    { name:'Bounty Board', x:200, y:350, img:bountyImg,      fallback:'📋',      msg:bountyMsg },
    { name:'Lilith',       x:300, y:350, img:lilithImg,      fallback:'🔥',      msg:lilithMsg },
    { name:'Catch-A-Ride', x:500, y:350, img:catchARideImg,  fallback:'vehicle', msg:hasVehicle?'Vehicle ready — press V in Combat':'Buy Runner vehicle — $2,000' },
    { name:'Marcus',       x:600, y:350, img:null,           fallback:'🎩',      msg:"Marcus's Munitions — Buy & Sell guns" },
    { name:'Badass Ranks', x:700, y:350, img:badassImg,      fallback:'Badass',  msg:`Spend Badass Tokens (${badassTokens} available)` },
    { name:'Skill Tree',   x:400, y:350, img:null,           fallback:'🧬',      msg:'Upgrade your Skill Tree' },
  ];

  // ── Detect nearest NPC first ─────────────
  nearNPC = null;
  npcs.forEach(n => {
    if (Math.hypot(lhPlayer.x - n.x, lhPlayer.y - n.y) < 50) nearNPC = n;
  });

  // ── Draw NPCs ────────────────────────────
  npcs.forEach(n => {
    const isNear = nearNPC && nearNPC.name === n.name;

    // Glow behind sprite
    if (isNear) drawProximityGlow(n);

    // Sprite / fallback icon
    if (n.img && n.img.src !== '' && n.img.complete && n.img.naturalHeight !== 0) {
      ctx.drawImage(n.img, n.x - 25, n.y - 25, 50, 50);

    } else if (n.name === 'Portal') {
      const pr = 25 + Math.sin(Date.now() / 400) * 3;
      ctx.save();
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,255,255,0.12)';
      ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else if (n.name === 'Raid Portal') {
      const pr = 25 + Math.sin(Date.now() / 350) * 3;
      ctx.save();
      ctx.strokeStyle = '#cc44ff'; ctx.lineWidth = 3;
      ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = 'rgba(180,0,255,0.12)';
      ctx.beginPath(); ctx.arc(n.x, n.y, pr, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else if (n.name === 'Marcus') {
      ctx.fillStyle = '#8b4513';
      ctx.beginPath(); ctx.arc(n.x, n.y - 8, 14, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(n.x-18, n.y-22, 36, 12);
      ctx.fillRect(n.x-12, n.y-38, 24, 18);
      ctx.fillStyle = '#8b0000';
      ctx.fillRect(n.x-16, n.y+6, 32, 20);

    } else if (n.name === 'Bounty Board' || n.name === 'Quick Change' || n.name === 'Skill Tree' || n.name === 'Mayhem') {
      ctx.font = '30px Arial'; ctx.textAlign = 'center';
      ctx.fillText(n.fallback, n.x, n.y + 10);

    } else {
      drawPixelSprite(ctx, n.fallback, n.x, n.y, 45);
    }
    ctx.textAlign = 'left';

    // Nameplate below sprite
    drawNameplate(n, isNear);
  });

  // ── Interact prompt bubble above NPC ─────
  if (nearNPC && !inDialog) {
    const n     = nearNPC;
    const color = NPC_COLORS[n.name] || '#ffcc00';
    const msgW  = Math.min(380, n.msg.length * 6.8 + 24);
    const msgX  = Math.max(8, Math.min(792 - msgW, n.x - msgW / 2));
    const msgY  = n.y - 72;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath(); ctx.roundRect(msgX, msgY, msgW, 26, 4); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(msgX, msgY, msgW, 2);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(n.msg, msgX + msgW / 2, msgY + 17);
    ctx.restore();
  }

  // ── Slots spin animation ─────────────────
  if (slotsSpinTimer > 0) {
    slotsSpinTimer--;
    const symbols = ['🍒','🔔','💎','7️⃣','💀'];
    let s1=symbols[Math.floor(Math.random()*symbols.length)];
    let s2=symbols[Math.floor(Math.random()*symbols.length)];
    let s3=symbols[Math.floor(Math.random()*symbols.length)];
    if (slotsSpinTimer === 0) {
      s1='7️⃣'; s2='7️⃣'; s3='7️⃣';
      playSound('coin'); playSound('coin');
      lhDmgText.push({x:700,y:20,txt:'JACKPOT!',life:60,c:'#ffcc00'});
      genLoot(700, 120, false, false, true);
      unlockAchievement('jackpot');
    }
    ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(670,10,60,30);
    ctx.strokeStyle='#ffcc00'; ctx.lineWidth=2; ctx.strokeRect(670,10,60,30);
    ctx.font='18px Arial'; ctx.textAlign='center';
    ctx.fillText(`${s1}${s2}${s3}`,700,30); ctx.textAlign='left';
  }

  // ── [E] key ───────────────────────────────
  if (!inDialog && (keys['KeyE'] || keys['e'])) {
    keys['KeyE'] = false; keys['e'] = false;
    if (!nearNPC) return;
    const n = nearNPC;

    if (n.name==='Portal') {
      inSanctuary=false; localStorage.setItem('borderRuns',++runCount);
      localStorage.setItem('borderCoins',playerCoins); startLooter();

    } else if (n.name==='Raid Portal') {
      if (playerCoins>=2000) {
        playerCoins-=2000; localStorage.setItem('borderCoins',playerCoins);
        inSanctuary=false; localStorage.setItem('borderRuns',++runCount); startLooter(true);
      } else { playSound('hit'); }

    } else if (n.name==='Bounty Board') {
      if (activeQuest===0) {
        activeQuest=1; questProgress=0;
        localStorage.setItem('borderQuest',activeQuest); localStorage.setItem('borderQProg',questProgress);
        playSound('ability'); lhDmgText.push({x:n.x,y:n.y-40,txt:'BOUNTY ACCEPTED!',life:40,c:'#ff0'});
      } else if ((activeQuest===1&&questProgress>=25)||(activeQuest===2&&questProgress>=10)) {
        if (activeQuest===1) {
          playerCoins+=500; localStorage.setItem('borderCoins',playerCoins);
          genLoot(n.x,n.y+40,false); playSound('coin');
          lhDmgText.push({x:n.x,y:n.y-40,txt:'+500c + LOOT!',life:40,c:'#ff0'});
        } else {
          badassTokens+=3; localStorage.setItem('badassTokens',badassTokens);
          playSound('coin'); lhDmgText.push({x:n.x,y:n.y-40,txt:'+3 TOKENS!',life:40,c:'#0f0'}); gainExp(1000);
        }
        activeQuest=0; questProgress=0;
        localStorage.setItem('borderQuest',0); localStorage.setItem('borderQProg',0);
      } else { playSound('hit'); }

    } else if (n.name==='Bank')         { window.openBank();
    } else if (n.name==='Badass Ranks') { window.openBadass();
    } else if (n.name==='Skill Tree')   { window.openSkills();
    } else if (n.name==='Marcus')       { window.openMarcus();
    } else if (n.name==='Dr. Zed')      { window.openZed();

    } else if (n.name==='Mayhem') {
      if      (mayhemMode===0)  mayhemMode=10;
      else if (mayhemMode===10) mayhemMode=20;
      else if (mayhemMode===20) mayhemMode=50;
      else                      mayhemMode=0;
      localStorage.setItem('borderMayhem',mayhemMode);
      playSound('ability'); spawnParticles(n.x,n.y,'#ff0000',40,5,40);
      lhDmgText.push({x:n.x,y:n.y-40,txt:mayhemMode===0?'MAYHEM OFF':`MAYHEM ${mayhemMode}!`,life:40,c:'#ff0000'});
      updateMenuStats();

    } else if (n.name==='Catch-A-Ride'&&!hasVehicle) {
      if (playerCoins>=2000) {
        playerCoins-=2000; hasVehicle=1;
        localStorage.setItem('borderVehicle',1); localStorage.setItem('borderCoins',playerCoins);
        playSound('ability'); spawnParticles(n.x,n.y,'#ff6600',40,5,40);
        lhDmgText.push({x:n.x,y:n.y-40,txt:'VEHICLE UNLOCKED!',life:40,c:'#ffcc00'});
        unlockAchievement('road_warrior');
      } else { playSound('hit'); }

    } else if (n.name==='Claptrap') {
      if (playerCoins>=5000) {
        playerCoins-=5000; localStorage.setItem('borderCoins',playerCoins);
        playSound('coin'); genLoot(n.x,n.y+40,true);
        spawnParticles(n.x,n.y,'#ffffff',30,4,30);
        lhDmgText.push({x:n.x,y:n.y-40,txt:'LEGENDARY BOUGHT!',life:40,c:'#ffa500'});
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
        playSound('hit'); lhDmgText.push({x:nearNPC.x,y:nearNPC.y-40,txt:'LEVEL UP TO UNLOCK!',life:40,c:'#f00'});
      } else {
        activeMapIndex=nextMap; localStorage.setItem('borderMap',activeMapIndex);
        playSound('ability'); lhDmgText.push({x:nearNPC.x,y:nearNPC.y-40,txt:mapData[activeMapIndex].name,life:40,c:'#0ff'});
      }
    }
  }

  // ── [C] key — Duels ──────────────────────
  if (!inDialog && (keys['KeyC'] || keys['c'])) {
    keys['KeyC'] = false; keys['c'] = false;
    if (nearNPC && nearNPC.name==='Lilith') { inSanctuary=false; startLooter(false,'Lilith'); }
    else if (nearNPC && nearNPC.name==='Moxxi') { inSanctuary=false; startLooter(false,'Moxxi'); }
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
    ctx.fillStyle='rgba(0,0,0,0.9)'; ctx.fillRect(100,300,600,120);
    ctx.strokeStyle='#ff007f'; ctx.lineWidth=3; ctx.strokeRect(100,300,600,120);
    ctx.fillStyle='#ff007f'; ctx.fillRect(100,300,600,2);
    if(moxxiImg.complete&&moxxiImg.naturalHeight!==0){ctx.drawImage(moxxiImg,105,230,80,80);}
    else{drawPixelSprite(ctx,'maya',145,270,50);}
    ctx.fillStyle='#ff007f'; ctx.font='bold 14px "Courier New"'; ctx.textAlign='left';
    ctx.fillText('MAD MOXXI',195,320);
    ctx.fillStyle='#fff'; ctx.font='13px "Courier New"';
    moxxiLines[dialogStep].split('\n').forEach((line,idx)=>ctx.fillText(line,120,345+idx*20));
    if(dialogStep<moxxiLines.length-1){
      ctx.fillStyle='#ff007f'; ctx.font='11px Courier'; ctx.textAlign='right';
      ctx.fillText('[ CLICK TO CONTINUE ]',690,410); ctx.textAlign='left';
    }
  }

  // ── Redesigned HUD ────────────────────────
  drawSanctuaryHUD();

  statusText.innerText='WASD: Move | E: Interact | Q: Alt Action | C: Duel | F: Pick Up | I: Inventory | B: Vault';
  animId = requestAnimationFrame(loopSanctuary);
}