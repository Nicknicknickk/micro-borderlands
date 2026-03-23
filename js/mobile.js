/* ==========================================
   MOBILE.JS — Touch Controls v2.1
   Overlay at body level — fixed position
   All coords mapped to actual canvas rect
   Optimized for iPhone 13 / Android landscape
   ========================================== */

let mobileMode  = localStorage.getItem('mobileMode') === '1';
let sticksRafId = null;

const leftStick  = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const rightStick = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const RADIUS = 60, DEAD = 10;
const btnTouches = {};

// ── Menu button ───────────────────────────
window.toggleMobileMode = function () {
  mobileMode = !mobileMode;
  localStorage.setItem('mobileMode', mobileMode ? '1' : '0');
  updateMobileMenuBtn();
  if (!mobileMode) destroyOverlay();
};

function updateMobileMenuBtn() {
  const btn = document.getElementById('mobile-mode-btn');
  if (!btn) return;
  btn.textContent = mobileMode ? '📱  MOBILE MODE: ON' : '📱  MOBILE MODE: OFF';
  btn.style.color       = mobileMode ? '#00ffcc' : '#555';
  btn.style.borderColor = mobileMode ? '#00ffcc' : '#333';
  btn.style.boxShadow   = mobileMode ? '0 0 10px #00ffcc44' : 'none';
}

// ── Get canvas screen rect ─────────────────
function cr() {
  const c = document.getElementById('game-canvas');
  return c ? c.getBoundingClientRect() : { left:0, top:0, width:window.innerWidth, height:window.innerHeight };
}

// ── Map viewport coords → canvas coords ───
function toCanvas(vx, vy) {
  const r = cr();
  const c = document.getElementById('game-canvas');
  if (!c) return { x: vx, y: vy };
  return {
    x: (vx - r.left) * (c.width  / r.width),
    y: (vy - r.top)  * (c.height / r.height)
  };
}

// ── Init ──────────────────────────────────
window.initMobileIfNeeded = function () {
  if (!mobileMode) return;
  destroyOverlay();

  const ov = document.createElement('div');
  ov.id = 'mob-ov';
  ov.style.cssText = `
    position:fixed; top:0; left:0;
    width:100vw; height:100vh;
    z-index:9000; pointer-events:none;
    touch-action:none; user-select:none;
  `;

  // Stick draw canvas — full screen
  const sc = document.createElement('canvas');
  sc.id = 'mob-sc';
  sc.width = window.innerWidth;
  sc.height = window.innerHeight;
  sc.style.cssText = `
    position:absolute; top:0; left:0;
    width:100%; height:100%;
    pointer-events:none;
  `;
  ov.appendChild(sc);

  window.addEventListener('resize', () => {
    sc.width  = window.innerWidth;
    sc.height = window.innerHeight;
  });
  // Also update on orientation settle
  window.addEventListener('resize', handleMobileResize);

  // Touch zones — left and right halves, full height
  ['mob-lz','mob-rz'].forEach((id, i) => {
    const z = document.createElement('div');
    z.id = id;
    z.style.cssText = `
      position:absolute; top:0;
      ${i===0 ? 'left:0' : 'right:0'};
      width:50%; height:100%;
      pointer-events:auto; touch-action:none;
    `;
    ov.appendChild(z);
  });

  // Action buttons
  const btns = [
    { id:'mob-e',  label:'E',    key:'KeyE', color:'#ffcc00', bottom:'18%', right:'2%',  size:50 },
    { id:'mob-g',  label:'G',    key:'KeyG', color:'#ff4400', bottom:'18%', right:'14%', size:50 },
    { id:'mob-sk', label:'SKLL', key:'KeyE', color:'#00ffcc', bottom:'18%', right:'26%', size:50 },
    { id:'mob-i',  label:'INV',  key:'KeyI', color:'#aaaaff', bottom:'18%', right:'38%', size:42 },
    { id:'mob-b',  label:'VLT',  key:'KeyB', color:'#00ff88', bottom:'18%', right:'49%', size:42 },
    { id:'mob-f',  label:'F',    key:'KeyF', color:'#ffaa00', bottom:'18%', left:'2%',   size:50 },
  ];

  btns.forEach(b => {
    const el = document.createElement('div');
    el.id = b.id;
    el.dataset.key = b.key;
    el.textContent = b.label;
    const side = b.left ? `left:${b.left}` : `right:${b.right}`;
    el.style.cssText = `
      position:absolute; bottom:${b.bottom}; ${side};
      width:${b.size}px; height:${b.size}px;
      border-radius:50%;
      background:rgba(0,0,0,0.72);
      border:2px solid ${b.color};
      color:${b.color};
      font-size:${b.size>46?13:10}px;
      font-weight:bold;
      font-family:'Courier New',monospace;
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none;
      box-shadow:0 0 10px ${b.color}55;
    `;
    ov.appendChild(el);
  });

  document.body.appendChild(ov);

  ov.addEventListener('touchstart',  onTS, { passive:false });
  ov.addEventListener('touchmove',   onTM, { passive:false });
  ov.addEventListener('touchend',    onTE, { passive:false });
  ov.addEventListener('touchcancel', onTE, { passive:false });

  drawSticks();
};

function destroyOverlay() {
  if (sticksRafId) { cancelAnimationFrame(sticksRafId); sticksRafId = null; }
  const ov = document.getElementById('mob-ov');
  if (ov) ov.remove();
  leftStick.active  = false; leftStick.dx  = 0; leftStick.dy  = 0;
  rightStick.active = false; rightStick.dx = 0; rightStick.dy = 0;
  if (typeof lhShooting !== 'undefined') lhShooting = false;
  keys['KeyW']=false; keys['KeyS']=false;
  keys['KeyA']=false; keys['KeyD']=false;
}

function updateBtnVisibility() {
  const isTut = typeof inTutorial !== 'undefined' && inTutorial;
  ['mob-e','mob-g','mob-sk','mob-i','mob-b','mob-f'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isTut ? 'none' : 'flex';
  });
}

// ── Touch start ───────────────────────────
function onTS(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const isTut = typeof inTutorial !== 'undefined' && inTutorial;

    if (isTut) {
      // Map touch to canvas coords for aiming
      const pos = toCanvas(t.clientX, t.clientY);
      if (window.lhMouse) { lhMouse.screenX = pos.x; lhMouse.screenY = pos.y; }
      // Forward mousedown to canvas
      const c = document.getElementById('game-canvas');
      if (c) c.dispatchEvent(new MouseEvent('mousedown', {
        bubbles:true, cancelable:true,
        clientX:t.clientX, clientY:t.clientY, button:0
      }));
      // Direct shoot on step 4
      if (typeof tutorialStep !== 'undefined' && tutorialStep === 4 && typeof shootTutorial === 'function') {
        shootTutorial();
      }
      // Left half = movement stick
      if (t.clientX < window.innerWidth/2 && !leftStick.active) {
        leftStick.active=true; leftStick.id=t.identifier;
        leftStick.baseX=t.clientX; leftStick.baseY=t.clientY;
        leftStick.dx=0; leftStick.dy=0;
      }
      return;
    }

    // Buttons
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.dataset && el.dataset.key) {
      btnTouches[el.id] = t.identifier;
      keys[el.dataset.key] = true;
      el.style.background = 'rgba(255,255,255,0.25)';
      return;
    }

    if (t.clientX < window.innerWidth/2 && !leftStick.active) {
      leftStick.active=true; leftStick.id=t.identifier;
      leftStick.baseX=t.clientX; leftStick.baseY=t.clientY;
      leftStick.dx=0; leftStick.dy=0;
      if (typeof inSanctuary !== 'undefined' && inSanctuary) {
        keys['KeyE'] = true;
        setTimeout(() => { keys['KeyE'] = false; }, 120);
      }
      return;
    }

    if (t.clientX >= window.innerWidth/2 && !rightStick.active) {
      rightStick.active=true; rightStick.id=t.identifier;
      rightStick.baseX=t.clientX; rightStick.baseY=t.clientY;
      rightStick.dx=0; rightStick.dy=0;
      lhShooting = true;
    }
  });
}

// ── Touch move ────────────────────────────
function onTM(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const isTut = typeof inTutorial !== 'undefined' && inTutorial;

    if (isTut) {
      const pos = toCanvas(t.clientX, t.clientY);
      if (window.lhMouse) { lhMouse.screenX = pos.x; lhMouse.screenY = pos.y; }
      if (leftStick.active && t.identifier === leftStick.id) {
        applyLS(t.clientX, t.clientY);
        if (lhPlayer) {
          const n = Math.hypot(leftStick.dx, leftStick.dy);
          if (n > DEAD) {
            lhPlayer.x = Math.max(250, Math.min(780, lhPlayer.x + (leftStick.dx/n)*4));
            lhPlayer.y = Math.max(200, Math.min(370, lhPlayer.y + (leftStick.dy/n)*4));
          }
        }
      }
      return;
    }

    if (leftStick.active && t.identifier === leftStick.id) applyLS(t.clientX, t.clientY);

    if (rightStick.active && t.identifier === rightStick.id) {
      let dx = t.clientX - rightStick.baseX;
      let dy = t.clientY - rightStick.baseY;
      const dist = Math.hypot(dx,dy);
      if (dist > RADIUS) { dx=(dx/dist)*RADIUS; dy=(dy/dist)*RADIUS; }
      rightStick.dx=dx; rightStick.dy=dy;
      if (dist > DEAD && lhPlayer) {
        const ang = Math.atan2(dy, dx);
        lhMouse.screenX = lhPlayer.x + Math.cos(ang)*200;
        lhMouse.screenY = lhPlayer.y + Math.sin(ang)*200;
      }
    }
  });
}

// ── Touch end ─────────────────────────────
function onTE(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const isTut = typeof inTutorial !== 'undefined' && inTutorial;

    if (isTut) {
      const c = document.getElementById('game-canvas');
      if (c) c.dispatchEvent(new MouseEvent('mouseup', {
        bubbles:true, cancelable:true,
        clientX:t.clientX, clientY:t.clientY, button:0
      }));
      if (leftStick.active && t.identifier === leftStick.id) {
        leftStick.active=false; leftStick.dx=0; leftStick.dy=0;
        keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
      }
      return;
    }

    for (const bid in btnTouches) {
      if (btnTouches[bid] === t.identifier) {
        const el = document.getElementById(bid);
        if (el) { keys[el.dataset.key]=false; el.style.background='rgba(0,0,0,0.72)'; }
        delete btnTouches[bid];
      }
    }
    if (leftStick.active && t.identifier === leftStick.id) {
      leftStick.active=false; leftStick.dx=0; leftStick.dy=0;
      keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
    }
    if (rightStick.active && t.identifier === rightStick.id) {
      rightStick.active=false; rightStick.dx=0; rightStick.dy=0;
      lhShooting=false;
    }
  });
}

// ── Helpers ───────────────────────────────
function applyLS(cx, cy) {
  let dx = cx - leftStick.baseX;
  let dy = cy - leftStick.baseY;
  const d = Math.hypot(dx,dy);
  if (d > RADIUS) { dx=(dx/d)*RADIUS; dy=(dy/d)*RADIUS; }
  leftStick.dx=dx; leftStick.dy=dy;
  keys['KeyW'] = dy < -DEAD;
  keys['KeyS'] = dy >  DEAD;
  keys['KeyA'] = dx < -DEAD;
  keys['KeyD'] = dx >  DEAD;
}

// ── Draw sticks ───────────────────────────
function drawSticks() {
  const sc = document.getElementById('mob-sc');
  if (!sc || !mobileMode) return;
  const sx = sc.getContext('2d');
  sx.clearRect(0, 0, sc.width, sc.height);

  const draw = (st, label) => {
    if (!st.active) return;
    // Outer ring
    sx.beginPath(); sx.arc(st.baseX, st.baseY, RADIUS, 0, Math.PI*2);
    sx.strokeStyle='rgba(255,255,255,0.22)'; sx.lineWidth=2; sx.stroke();
    sx.fillStyle='rgba(255,255,255,0.04)'; sx.fill();
    // Thumb nub
    sx.beginPath(); sx.arc(st.baseX+st.dx, st.baseY+st.dy, 26, 0, Math.PI*2);
    sx.fillStyle='rgba(255,255,255,0.3)'; sx.fill();
    sx.strokeStyle='rgba(255,255,255,0.6)'; sx.lineWidth=2; sx.stroke();
    // Label
    sx.fillStyle='rgba(255,255,255,0.45)';
    sx.font='bold 12px Courier New'; sx.textAlign='center';
    sx.fillText(label, st.baseX, st.baseY+RADIUS+18);
  };

  draw(leftStick,  'MOVE');
  draw(rightStick, 'AIM+FIRE');
  updateBtnVisibility();
  sticksRafId = requestAnimationFrame(drawSticks);
}

// ── Orientation ───────────────────────────
window.checkMobileOrientation = function () {
  if (!mobileMode) return;
  const w = document.getElementById('orientation-warn');
  if (!w) return;
  w.style.display = window.innerWidth > window.innerHeight ? 'none' : 'flex';
};
window.addEventListener('resize', window.checkMobileOrientation);

// Debounced resize handler — rebuilds overlay after viewport settles
let _mobileResizeTimer = null;
function handleMobileResize() {
  if (!mobileMode) return;
  clearTimeout(_mobileResizeTimer);
  _mobileResizeTimer = setTimeout(() => {
    window.checkMobileOrientation();
    window.initMobileIfNeeded();
  }, 500);
}

window.addEventListener('resize', handleMobileResize);

window.addEventListener('orientationchange', () => {
  window.checkMobileOrientation();
  if (!mobileMode) return;
  // iOS needs ~800ms to finish viewport resize after rotation
  setTimeout(() => {
    window.checkMobileOrientation();
    window.initMobileIfNeeded();
  }, 800);
});

// ── Init ──────────────────────────────────
updateMobileMenuBtn();