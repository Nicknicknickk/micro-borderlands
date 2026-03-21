/* ==========================================
   ENEMIES.JS — New Enemy Types v1.0
   Skag, Bullymong, Stalker, Surveyor,
   Badass Psycho
   ========================================== */

// ── Draw new enemy sprites ─────────────────
function drawNewEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);

  switch(e.type) {

    // ── SKAG ────────────────────────────────
    case 'skag': {
      const t = Date.now() / 100;
      // Body
      ctx.fillStyle = e.pC || '#8b6914';
      ctx.beginPath(); ctx.ellipse(0, 0, e.w/2, e.h/2.5, 0, 0, Math.PI*2); ctx.fill();
      // Head
      ctx.fillStyle = '#a07820';
      ctx.beginPath(); ctx.ellipse(e.w/3, -e.h/6, e.w/3, e.h/3, 0.3, 0, Math.PI*2); ctx.fill();
      // Jaw (opens when charging)
      const jawOpen = e.charging ? 0.4 : 0.1;
      ctx.fillStyle = '#cc2200';
      ctx.beginPath(); ctx.ellipse(e.w/2.2, e.h/8, e.w/4, e.h/6*jawOpen*3, 0.3, 0, Math.PI*2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#ff4400';
      ctx.beginPath(); ctx.arc(e.w/3.5, -e.h/4, 4, 0, Math.PI*2); ctx.fill();
      // Legs
      ctx.strokeStyle = '#8b6914'; ctx.lineWidth = 4;
      const legCycle = Math.sin(t) * 8;
      [-e.w/3, -e.w/6, e.w/6, e.w/3].forEach((lx, i) => {
        ctx.beginPath(); ctx.moveTo(lx, e.h/4);
        ctx.lineTo(lx + (i%2===0?-3:3), e.h/2 + (i%2===0?legCycle:-legCycle)); ctx.stroke();
      });
      break;
    }

    // ── BULLYMONG ───────────────────────────
    case 'bullymong': {
      // Big furry body
      ctx.fillStyle = e.pC || '#5c3d1e';
      ctx.beginPath(); ctx.arc(0, 0, e.w/2, 0, Math.PI*2); ctx.fill();
      // Fur texture
      ctx.fillStyle = '#7a5230';
      for(let f=0; f<8; f++) {
        const fa = (Math.PI*2/8)*f;
        ctx.beginPath(); ctx.arc(Math.cos(fa)*e.w/2.5, Math.sin(fa)*e.w/2.5, 6, 0, Math.PI*2); ctx.fill();
      }
      // Face
      ctx.fillStyle = '#ffe0bd';
      ctx.beginPath(); ctx.arc(e.w/6, -e.h/6, e.w/3.5, 0, Math.PI*2); ctx.fill();
      // Eyes - angry
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.arc(e.w/8, -e.h/5, 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.w/4, -e.h/5, 5, 0, Math.PI*2); ctx.fill();
      // Arms up
      ctx.strokeStyle = '#5c3d1e'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-e.w/2, 0); ctx.lineTo(-e.w/1.2, -e.h/3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.w/2, 0); ctx.lineTo(e.w/1.2, -e.h/3); ctx.stroke();
      // Rock in hand if has rock
      if(e.hasRock) {
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(e.w/1.2, -e.h/2.5, 8, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ── STALKER ─────────────────────────────
    case 'stalker': {
      const alpha = e.visible ? 1 : (e.justFired ? 0.7 : 0.15);
      ctx.globalAlpha = alpha;
      // Sleek body
      ctx.fillStyle = e.pC || '#1a4a1a';
      ctx.beginPath(); ctx.ellipse(0, 0, e.w/2, e.h/3, 0, 0, Math.PI*2); ctx.fill();
      // Carapace
      ctx.fillStyle = '#2a6a2a';
      ctx.beginPath(); ctx.ellipse(0, -e.h/6, e.w/2.5, e.h/4, 0, 0, Math.PI*2); ctx.fill();
      // 4 glowing eyes
      ctx.globalAlpha = e.visible ? 1 : (e.justFired ? 0.9 : 0.3);
      ctx.fillStyle = '#00ff88';
      [[-e.w/4,-e.h/4],[e.w/4,-e.h/4],[-e.w/6,-e.h/3],[e.w/6,-e.h/3]].forEach(([ex,ey]) => {
        ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI*2); ctx.fill();
      });
      // Tentacles
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#1a4a1a'; ctx.lineWidth = 3;
      for(let t2=0; t2<4; t2++) {
        const ta = (Math.PI/4)*t2 - Math.PI/8;
        const wave = Math.sin(Date.now()/200 + t2) * 10;
        ctx.beginPath(); ctx.moveTo(0, e.h/4);
        ctx.quadraticCurveTo(Math.cos(ta)*20+wave, e.h/2+10, Math.cos(ta)*30, e.h/1.5); ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
      break;
    }

    // ── SURVEYOR ────────────────────────────
    case 'surveyor': {
      const t3 = Date.now() / 300;
      // Hover bob
      const hoverY = Math.sin(t3) * 5;
      ctx.translate(0, hoverY);
      // Shield bubble (if shielding another enemy)
      if(e.shielding) {
        ctx.strokeStyle = 'rgba(0,200,255,0.4)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, e.w/1.5, 0, Math.PI*2); ctx.stroke();
      }
      // Body - Hyperion yellow drone
      ctx.fillStyle = e.pC || '#ffcc00';
      ctx.beginPath(); ctx.arc(0, 0, e.w/2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, 0, e.w/3, 0, Math.PI*2); ctx.fill();
      // Eye scanner
      ctx.fillStyle = '#00ccff';
      ctx.beginPath(); ctx.arc(0, 0, e.w/5, 0, Math.PI*2); ctx.fill();
      // Rotating antennae
      for(let a=0; a<3; a++) {
        const aa = (Math.PI*2/3)*a + t3;
        ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(Math.cos(aa)*e.w/3, Math.sin(aa)*e.w/3);
        ctx.lineTo(Math.cos(aa)*e.w/1.8, Math.sin(aa)*e.w/1.8); ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(Math.cos(aa)*e.w/1.8, Math.sin(aa)*e.w/1.8, 3, 0, Math.PI*2); ctx.fill();
      }
      break;
    }

    // ── BADASS PSYCHO ───────────────────────
    case 'badass_psycho': {
      // HUGE body
      ctx.fillStyle = '#cc0000';
      ctx.beginPath(); ctx.arc(0, 0, e.w/2, 0, Math.PI*2); ctx.fill();
      // Spiky mask
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-e.w/3, -e.w/2, e.w*0.65, e.w*0.4);
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(-e.w/4, -e.w/2.5, e.w/10, e.w/5);
      ctx.fillRect(e.w/10, -e.w/2.5, e.w/10, e.w/5);
      // Eyes - glowing
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(-e.w/6, -e.w/4, 8, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.w/6, -e.w/4, 8, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      // Massive axe
      ctx.strokeStyle = '#888'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(e.w/2, -e.w/2); ctx.lineTo(e.w/2, e.w/2); ctx.stroke();
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.moveTo(e.w/2, -e.w/2); ctx.lineTo(e.w, -e.w/4); ctx.lineTo(e.w/2, 0); ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// ── Spawn new enemy types ──────────────────
function spawnNewEnemy(type, x, y, mMult) {
  const base = {
    x, y, fT:0, sT:0, aT:0, pref:'', pC:'',
    lastX:x, lastY:y
  };

  switch(type) {
    case 'skag':
      return { ...base, type:'skag', hp:800*mMult, maxHp:800*mMult,
        speed:3.5, w:35, h:25, cd:180, charging:false, chargeTimer:0,
        packLeader: Math.random() < 0.2 };

    case 'bullymong':
      return { ...base, type:'bullymong', hp:3000*mMult, maxHp:3000*mMult,
        speed:1.2, w:65, h:65, cd:120, hasRock:true, rockCd:0,
        isMarksman:true };

    case 'stalker':
      return { ...base, type:'stalker', hp:1200*mMult, maxHp:1200*mMult,
        speed:2.5, w:40, h:30, cd:90, visible:false, justFired:false,
        visTimer:0 };

    case 'surveyor':
      return { ...base, type:'surveyor', hp:600*mMult, maxHp:600*mMult,
        speed:2.0, w:35, h:35, cd:60, shielding:false, shieldTarget:null,
        floatY:y, floatTimer:Math.random()*Math.PI*2 };

    case 'badass_psycho':
      return { ...base, type:'badass_psycho', hp:8000*mMult, maxHp:8000*mMult,
        speed:1.8, w:80, h:80, cd:80, slamCd:0, slamWarning:0 };
  }
}

// ── Update new enemy AI ────────────────────
function updateNewEnemyAI(e, lhPlayer, lhEnemyBullets, mayhemMult, lhDmgText, lhParticles, spawnParticles, playSound) {
  const dx = lhPlayer.x - e.x;
  const dy = lhPlayer.y - e.y;
  const dist = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);

  switch(e.type) {

    // ── SKAG AI ──────────────────────────────
    case 'skag': {
      if(dist > 300) {
        // Chase
        e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed;
      } else if(!e.charging) {
        // Charge wind-up
        e.chargeTimer = (e.chargeTimer||0) + 1;
        if(e.chargeTimer > 60) {
          e.charging = true; e.chargeTimer = 0;
          e.chargeAng = ang; e.chargeSpd = 10;
          playSound('ability', e.x);
        }
      }
      if(e.charging) {
        e.x += Math.cos(e.chargeAng)*e.chargeSpd;
        e.y += Math.sin(e.chargeAng)*e.chargeSpd;
        e.chargeSpd *= 0.92;
        if(e.chargeSpd < 1) { e.charging = false; e.chargeSpd = 0; }
      }
      break;
    }

    // ── BULLYMONG AI ─────────────────────────
    case 'bullymong': {
      if(dist > 200) { e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed; }
      // Rock throw
      if(e.cd <= 0 && dist < 500 && e.hasRock) {
        playSound('shoot', e.x);
        // Predict player position
        const pVelX = lhPlayer.x - (lhPlayer.lastX||lhPlayer.x);
        const pVelY = lhPlayer.y - (lhPlayer.lastY||lhPlayer.y);
        const tTime = dist / 8;
        const predAng = Math.atan2((lhPlayer.y + pVelY*tTime) - e.y, (lhPlayer.x + pVelX*tTime) - e.x);
        lhEnemyBullets.push({
          x:e.x, y:e.y,
          vx:Math.cos(predAng)*8, vy:Math.sin(predAng)*8,
          dmg:35*mayhemMult, c:'#888', isRock:true, size:12
        });
        e.cd = 100 + Math.random()*60;
      }
      break;
    }

    // ── STALKER AI ───────────────────────────
    case 'stalker': {
      e.visTimer = (e.visTimer||0) - 1;
      // Go invisible when not attacking
      if(e.visTimer <= 0) {
        e.visible = false; e.justFired = false;
      }
      if(dist > 150) {
        e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed;
      }
      if(e.cd <= 0) {
        // Become visible briefly, fire burst
        e.visible = true; e.justFired = true; e.visTimer = 45;
        for(let s=0; s<3; s++) {
          const sAng = ang + (Math.random()-0.5)*0.3;
          lhEnemyBullets.push({x:e.x, y:e.y, vx:Math.cos(sAng)*7, vy:Math.sin(sAng)*7, dmg:12*mayhemMult, c:'#00ff88'});
        }
        playSound('shoot', e.x);
        e.cd = 80 + Math.random()*40;
      }
      break;
    }

    // ── SURVEYOR AI ──────────────────────────
    case 'surveyor': {
      // Float above battlefield
      e.floatTimer += 0.02;
      e.y = e.floatY - 80 + Math.sin(e.floatTimer)*20;
      // Orbit player at distance
      const orbitAng = Math.atan2(e.y - lhPlayer.y, e.x - lhPlayer.x) + 0.02;
      const targetDist = 200;
      const targetX = lhPlayer.x + Math.cos(orbitAng)*targetDist;
      const targetY = lhPlayer.y + Math.sin(orbitAng)*targetDist - 80;
      e.x += (targetX - e.x) * 0.03;
      e.y += (targetY - e.y) * 0.03;
      // Fire repair beam at nearest damaged enemy
      if(e.cd <= 0) {
        playSound('hit', e.x);
        // Find most damaged ally
        lhEnemies.forEach(ally => {
          if(ally !== e && ally.hp < ally.maxHp * 0.5 && Math.hypot(ally.x-e.x,ally.y-e.y)<300) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 500*mayhemMult);
            lhDmgText.push({x:ally.x, y:ally.y-30, txt:'REPAIRED!', life:30, c:'#00ccff'});
          }
        });
        e.cd = 120;
      }
      break;
    }

    // ── BADASS PSYCHO AI ─────────────────────
    case 'badass_psycho': {
      e.x += Math.cos(ang)*e.speed; e.y += Math.sin(ang)*e.speed;
      e.slamCd = (e.slamCd||0) - 1;
      e.slamWarning = (e.slamWarning||0) - 1;
      // Ground slam warning
      if(e.slamCd <= 0 && dist < 200) {
        if(e.slamWarning <= 0) {
          e.slamWarning = 60;
          e.slamCd = 200;
          lhDmgText.push({x:e.x, y:e.y-60, txt:'⚠ GROUND SLAM!', life:60, c:'#ff0000'});
          playSound('die', e.x);
          // After warning, do slam
          setTimeout(() => {
            if(!e || e.hp <= 0) return;
            spawnParticles(e.x, e.y, '#ff4500', 80, 10, 50);
            const slamDist = Math.hypot(lhPlayer.x-e.x, lhPlayer.y-e.y);
            if(slamDist < 150) {
              lhEnemyBullets.push({x:lhPlayer.x, y:lhPlayer.y, vx:0, vy:0, dmg:80*mayhemMult, c:'#f00', instant:true});
              lhDmgText.push({x:lhPlayer.x, y:lhPlayer.y-40, txt:'SLAM!', life:40, c:'#f00'});
            }
          }, 1000);
        }
      }
      break;
    }
  }
}

// ── Draw rock projectile ───────────────────
function drawRockProjectile(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Date.now()/100);
  ctx.fillStyle = '#888';
  ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size);
  ctx.fillStyle = '#aaa';
  ctx.fillRect(-b.size/3, -b.size/3, b.size/3, b.size/3);
  ctx.restore();
}