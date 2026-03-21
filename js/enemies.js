/* ==========================================
   ENEMIES.JS — New Enemy Types v2.0
   Now with AI generated sprites!
   ========================================== */

const NEW_ENEMY_TYPES = ['skag','bullymong','stalker','surveyor','badass_psycho'];

// ── Draw enemy sprite with fallback ───────
function drawEnemySprite(ctx, img, e, scaleW, scaleH, offsetX, offsetY, flipX) {
  const w = e.w * (scaleW || 1.8);
  const h = e.h * (scaleH || 1.8);
  if (img && img.complete && img.naturalHeight !== 0) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (flipX) ctx.scale(-1, 1);
    // Shadow beneath sprite
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(offsetX||0, h*0.4, w*0.35, h*0.12, 0, 0, Math.PI*2);
    ctx.fill();
    // Draw sprite
    ctx.drawImage(img, (offsetX||0) - w/2, (offsetY||0) - h/2, w, h);
    ctx.restore();
  } else {
    // Fallback canvas shape while loading
    drawNewEnemyFallback(ctx, e);
  }
}

// ── Fallback shapes if image not loaded ───
function drawNewEnemyFallback(ctx, e) {
  ctx.save(); ctx.translate(e.x, e.y);
  switch(e.type) {
    case 'skag':        ctx.fillStyle='#8b6914'; ctx.beginPath(); ctx.ellipse(0,0,e.w/2,e.h/3,0,0,Math.PI*2); ctx.fill(); break;
    case 'bullymong':   ctx.fillStyle='#5c3d1e'; ctx.beginPath(); ctx.arc(0,0,e.w/2,0,Math.PI*2); ctx.fill(); break;
    case 'stalker':     ctx.fillStyle='#1a4a1a'; ctx.beginPath(); ctx.ellipse(0,0,e.w/2,e.h/3,0,0,Math.PI*2); ctx.fill(); break;
    case 'surveyor':    ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(0,0,e.w/2,0,Math.PI*2); ctx.fill(); break;
    case 'badass_psycho': ctx.fillStyle='#cc0000'; ctx.beginPath(); ctx.arc(0,0,e.w/2,0,Math.PI*2); ctx.fill(); break;
  }
  ctx.restore();
}

// ── Main draw function ────────────────────
function drawNewEnemy(ctx, e) {
  // Stalker — fade in/out based on visibility
  if (e.type === 'stalker') {
    ctx.globalAlpha = e.visible ? 1.0 : (e.justFired ? 0.6 : 0.15);
  }

  switch(e.type) {
    case 'skag':
      // Skag faces the player — flip if player is to the left
      const skagFlip = lhPlayer && lhPlayer.x < e.x;
      drawEnemySprite(ctx, skagImg, e, 2.2, 2.0, 0, -5, skagFlip);
      // Charge glow
      if (e.charging) {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
        ctx.beginPath(); ctx.arc(0, 0, e.w/1.5, 0, Math.PI*2); ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1.0;
      }
      break;

    case 'bullymong':
      const bmFlip = lhPlayer && lhPlayer.x < e.x;
      drawEnemySprite(ctx, bullymongImg, e, 2.2, 2.2, 0, -8, bmFlip);
      // Rock indicator
      if (e.hasRock) {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.fillStyle = '#888'; ctx.font = '12px Arial'; ctx.textAlign = 'center';
        ctx.fillText('🪨', 0, -e.h - 5);
        ctx.restore();
      }
      break;

    case 'stalker':
      const stFlip = lhPlayer && lhPlayer.x < e.x;
      drawEnemySprite(ctx, stalkerImg, e, 2.0, 2.0, 0, -5, stFlip);
      // Glowing eyes when visible
      if (e.visible || e.justFired) {
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(-8, -10, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -10, 4, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0; ctx.restore();
      }
      ctx.globalAlpha = 1.0;
      break;

    case 'surveyor':
      // Surveyor hovers — bob up and down
      const surveyorBob = Math.sin(Date.now() / 300) * 6;
      ctx.save();
      ctx.translate(e.x, e.y + surveyorBob);
      // Draw shadow on ground
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, e.h*0.6 - surveyorBob, e.w*0.4, e.h*0.1, 0, 0, Math.PI*2); ctx.fill();
      // Rotation effect on the image
      ctx.rotate(Math.sin(Date.now() / 600) * 0.1);
      if (surveyorImg.complete && surveyorImg.naturalHeight !== 0) {
        const sw = e.w * 2.2, sh = e.h * 2.2;
        ctx.drawImage(surveyorImg, -sw/2, -sh/2, sw, sh);
      } else {
        ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(0,0,e.w/2,0,Math.PI*2); ctx.fill();
      }
      // Shield beam if shielding
      if (e.shielding && e.shieldTarget) {
        ctx.strokeStyle = 'rgba(0,200,255,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.lineTo(e.shieldTarget.x - e.x, e.shieldTarget.y - e.y); ctx.stroke();
      }
      ctx.restore();
      break;

    case 'badass_psycho':
      const bpFlip = lhPlayer && lhPlayer.x < e.x;
      drawEnemySprite(ctx, badasspsychoImg, e, 2.4, 2.4, 0, -10, bpFlip);
      // Slam warning ring
      if (e.slamWarning > 0) {
        const pulse = Math.sin(Date.now() / 80) * 0.5 + 0.5;
        ctx.save(); ctx.translate(e.x, e.y);
        ctx.strokeStyle = `rgba(255,0,0,${pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = `rgba(255,0,0,${pulse * 0.15})`;
        ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
      break;
  }
}

// ── Spawn new enemy ────────────────────────
function spawnNewEnemy(type, x, y, mMult) {
  const base = { x, y, fT:0, sT:0, aT:0, pref:'', pC:'', lastX:x, lastY:y, flash:0 };
  switch(type) {
    case 'skag':
      return {...base, type:'skag', hp:800*mMult, maxHp:800*mMult, speed:3.5, w:40, h:30, cd:180, charging:false, chargeTimer:0, chargeAng:0, chargeSpd:0};
    case 'bullymong':
      return {...base, type:'bullymong', hp:3000*mMult, maxHp:3000*mMult, speed:1.2, w:60, h:60, cd:120, hasRock:true, isMarksman:true};
    case 'stalker':
      return {...base, type:'stalker', hp:1200*mMult, maxHp:1200*mMult, speed:2.5, w:45, h:35, cd:90, visible:false, justFired:false, visTimer:0};
    case 'surveyor':
      return {...base, type:'surveyor', hp:600*mMult, maxHp:600*mMult, speed:2.0, w:35, h:35, cd:60, shielding:false, shieldTarget:null, floatY:y, floatTimer:Math.random()*Math.PI*2};
    case 'badass_psycho':
      return {...base, type:'badass_psycho', hp:8000*mMult, maxHp:8000*mMult, speed:1.8, w:75, h:75, cd:80, slamCd:0, slamWarning:0};
  }
}

// ── Enemy AI ──────────────────────────────
function updateNewEnemyAI(e, lhPlayer, lhEnemyBullets, mayhemMult, lhDmgText, lhParticles, spawnParticles, playSound) {
  const dx = lhPlayer.x - e.x, dy = lhPlayer.y - e.y;
  const dist = Math.hypot(dx, dy);
  const ang  = Math.atan2(dy, dx);

  switch(e.type) {

    case 'skag': {
      if (!e.charging) {
        e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed;
        e.chargeTimer = (e.chargeTimer||0) + 1;
        if (e.chargeTimer > 80 && dist < 300) {
          e.charging = true; e.chargeTimer = 0;
          e.chargeAng = ang; e.chargeSpd = 12;
          playSound('ability', e.x);
          spawnParticles(e.x, e.y, '#ff4400', 10, 3, 15);
        }
      } else {
        e.x += Math.cos(e.chargeAng)*e.chargeSpd;
        e.y += Math.sin(e.chargeAng)*e.chargeSpd;
        e.chargeSpd *= 0.91;
        if (e.chargeSpd < 0.8) { e.charging = false; e.chargeTimer = 0; }
      }
      break;
    }

    case 'bullymong': {
      if (dist > 180) { e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed; }
      if (e.cd !== undefined) e.cd--;
      if ((e.cd||0) <= 0 && dist < 500) {
        const pVelX = lhPlayer.x - (lhPlayer.lastX||lhPlayer.x);
        const pVelY = lhPlayer.y - (lhPlayer.lastY||lhPlayer.y);
        const tTime = dist / 8;
        const predAng = Math.atan2((lhPlayer.y+pVelY*tTime)-e.y, (lhPlayer.x+pVelX*tTime)-e.x);
        lhEnemyBullets.push({x:e.x, y:e.y, vx:Math.cos(predAng)*8, vy:Math.sin(predAng)*8, dmg:35*mayhemMult, c:'#888', isRock:true, size:14});
        playSound('shoot', e.x);
        spawnParticles(e.x, e.y, '#888', 5, 2, 10);
        e.cd = 100 + Math.random()*60;
      }
      break;
    }

    case 'stalker': {
      e.visTimer = (e.visTimer||0) - 1;
      if (e.visTimer <= 0) { e.visible = false; e.justFired = false; }
      if (dist > 120) { e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed; }
      if (e.cd !== undefined) e.cd--;
      if ((e.cd||0) <= 0) {
        e.visible = true; e.justFired = true; e.visTimer = 50;
        for (let s=0; s<3; s++) {
          const sAng = ang + (Math.random()-0.5)*0.25;
          lhEnemyBullets.push({x:e.x, y:e.y, vx:Math.cos(sAng)*7, vy:Math.sin(sAng)*7, dmg:12*mayhemMult, c:'#00ff88'});
        }
        playSound('shoot', e.x);
        e.cd = 80 + Math.random()*40;
      }
      break;
    }

    case 'surveyor': {
      e.floatTimer += 0.02;
      const orbitAng = Math.atan2(e.y-lhPlayer.y, e.x-lhPlayer.x) + 0.015;
      const tX = lhPlayer.x + Math.cos(orbitAng)*220;
      const tY = lhPlayer.y + Math.sin(orbitAng)*220 - 90;
      e.x += (tX-e.x)*0.025; e.y += (tY-e.y)*0.025;
      if (e.cd !== undefined) e.cd--;
      if ((e.cd||0) <= 0) {
        // Repair most damaged nearby ally
        let repaired = false;
        lhEnemies.forEach(ally => {
          if (ally !== e && ally.hp < ally.maxHp*0.6 && Math.hypot(ally.x-e.x,ally.y-e.y)<350) {
            const healAmt = Math.min(ally.maxHp - ally.hp, 300*mayhemMult);
            ally.hp += healAmt;
            e.shielding = true; e.shieldTarget = ally;
            lhDmgText.push({x:ally.x, y:ally.y-30, txt:`+${Math.floor(healAmt)} REPAIRED`, life:40, c:'#00ccff'});
            spawnParticles(ally.x, ally.y, '#00ccff', 10, 2, 20);
            repaired = true;
          }
        });
        if (!repaired) { e.shielding = false; e.shieldTarget = null; }
        e.cd = 150;
      }
      break;
    }

    case 'badass_psycho': {
      e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed;
      e.slamCd = (e.slamCd||0) - 1;
      e.slamWarning = Math.max(0, (e.slamWarning||0) - 1);
      if ((e.slamCd||0) <= 0 && dist < 220) {
        e.slamWarning = 60; e.slamCd = 240;
        playSound('die', e.x);
        lhDmgText.push({x:e.x, y:e.y-70, txt:'⚠ GROUND SLAM!', life:60, c:'#ff0000'});
        spawnParticles(e.x, e.y, '#ff4500', 20, 4, 30);
        setTimeout(() => {
          if (!e || e.hp <= 0) return;
          screenShake = 25;
          spawnParticles(e.x, e.y, '#ff4500', 60, 10, 50);
          playSound('explosion', e.x);
          if (Math.hypot(lhPlayer.x-e.x, lhPlayer.y-e.y) < 160) {
            lhEnemyBullets.push({x:lhPlayer.x, y:lhPlayer.y, vx:0, vy:0, dmg:80*mayhemMult, c:'#f00', instant:true});
          }
        }, 1000);
      }
      break;
    }
  }
}

// ── Draw rock projectile ──────────────────
function drawRockProjectile(ctx, b) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Date.now()/100);
  ctx.fillStyle='#777'; ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
  ctx.fillStyle='#aaa'; ctx.fillRect(-b.size/3,-b.size/3,b.size/3,b.size/3);
  ctx.restore();
}