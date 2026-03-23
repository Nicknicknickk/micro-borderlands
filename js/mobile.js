/* ==========================================
   MOBILE.JS — Touch Controls v2.0
   Clean rebuild — overlay at body level
   never touches game container or animId
   ========================================== */

let mobileMode  = localStorage.getItem('mobileMode') === '1';
let sticksRafId = null;

const leftStick  = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const rightStick = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const RADIUS = 55, DEAD = 10;
const btnTouches = {};

// ── Menu button ───────────────────────────
window.toggleMobileMode = function () {
  mobileMode = !mobileMode;
  localStorage.setItem('mobileMode', mobileMode ? '1' : '0');
  updateMobileMenuBtn();
  if (!mobileMode) destroyMobileOverlay();
};

function updateMobileMenuBtn() {
  const btn = document.getElementById('mobile-mode-btn');
  if (!btn) return;
  if (mobileMode) {
    btn.textContent = '📱  MOBILE MODE: ON';
    btn.style.cssText += 'color:#00ffcc;border-color:#00ffcc;box-shadow:0 0 10px #00ffcc44;';
  } else {
    btn.textContent = '📱  MOBILE MODE: OFF';
    btn.style.cssText += 'color:#555;border-color:#333;box-shadow:none;';
  }
}

// ── Build overlay at BODY level ───────────
window.initMobileIfNeeded = function () {
  if (!mobileMode) return;
  destroyMobileOverlay();

  const ov = document.createElement('div');
  ov.id = 'mob-ov';
  ov.style.cssText = `
    position:fixed; top:0; left:0; width:100vw; height:100vh;
    z-index:9000; pointer-events:none;
    touch-action:none; user-select:none;
  `;

  // Stick canvas
  const sc = document.createElement('canvas');
  sc.id = 'mob-sc';
  sc.width  = window.innerWidth;
  sc.height = window.innerHeight;
  sc.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  ov.appendChild(sc);

  window.addEventListener('resize', () => {
    sc.width  = window.innerWidth;
    sc.height = window.innerHeight;
  });

  // Left touch zone — full left half
  const lz = makezone('mob-lz', 'left:0', '50%');
  const rz = makezone('mob-rz', 'right:0', '50%');
  ov.appendChild(lz);
  ov.appendChild(rz);

  // Buttons — only shown outside tutorial
  const btns = [
    { id:'mob-e',    label:'E',    key:'KeyE', color:'#ffcc00', b:'14%', r:'2%',  s:48 },
    { id:'mob-g',    label:'G',    key:'KeyG', color:'#ff4400', b:'14%', r:'13%', s:48 },
    { id:'mob-sk',   label:'SKLL', key:'KeyE', color:'#00ffcc', b:'14%', r:'24%', s:48 },
    { id:'mob-i',    label:'INV',  key:'KeyI', color:'#aaaaff', b:'14%', r:'35%', s:40 },
    { id:'mob-b',    label:'VLT',  key:'KeyB', color:'#00ff88', b:'14%', r:'44%', s:40 },
    { id:'mob-f',    label:'F',    key:'KeyF', color:'#ffaa00', b:'14%', l:'2%',  s:48 },
  ];

  btns.forEach(b => {
    const el = document.createElement('div');
    el.id = b.id; el.dataset.key = b.key; el.textContent = b.label;
    const pos = b.l ? `left:${b.l}` : `right:${b.r}`;
    el.style.cssText = `
      position:absolute; bottom:${b.b}; ${pos};
      width:${b.s}px; height:${b.s}px; border-radius:50%;
      background:rgba(0,0,0,0.7); border:2px solid ${b.color};
      color:${b.color}; font-size:${b.s>44?13:10}px; font-weight:bold;
      font-family:'Courier New',monospace;
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none;
      box-shadow:0 0 8px ${b.color}55;
    `;
    ov.appendChild(el);
  });

  document.body.appendChild(ov);

  ov.addEventListener('touchstart',  onTS, { passive:false });
  ov.addEventListener('touchmove',   onTM, { passive:false });
  ov.addEventListener('touchend',    onTE, { passive:false });
  ov.addEventListener('touchcancel', onTE, { passive:false });

  drawSticks();
  updateBtnVisibility();
};

function makezone(id, side, width) {
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = `
    position:absolute; top:0; ${side}; width:${width}; height:100%;
    pointer-events:auto; touch-action:none;
  `;
  return el;
}

function destroyMobileOverlay() {
  if (sticksRafId) { cancelAnimationFrame(sticksRafId); sticksRafId = null; }
  const ov = document.getElementById('mob-ov');
  if (ov) ov.remove();
  leftStick.active  = false; leftStick.dx  = 0; leftStick.dy  = 0;
  rightStick.active = false; rightStick.dx = 0; rightStick.dy = 0;
  lhShooting = false;
  keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
}

// ── Show/hide buttons based on game state ─
function updateBtnVisibility() {
  const isTut = typeof inTutorial !== 'undefined' && inTutorial;
  ['mob-e','mob-g','mob-sk','mob-i','mob-b','mob-f'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isTut ? 'none' : 'flex';
  });
}

// ── Get canvas rect for coordinate mapping ─
function getCanvasRect() {
  const c = document.getElementById('game-canvas');
  return c ? c.getBoundingClientRect() : null;
}

// ── Touch start ───────────────────────────
function onTS(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const isTut = typeof inTutorial !== 'undefined' && inTutorial;

    // Tutorial — forward tap + set up left stick
    if (isTut) {
      updateAimFromTouch(t);
      // Forward as mousedown to canvas
      const c = document.getElementById('game-canvas');
      if (c) c.dispatchEvent(new MouseEvent('mousedown', { bubbles:true, cancelable:true, clientX:t.clientX, clientY:t.clientY, button:0 }));
      // Direct shoot call on step 4
      if (typeof tutorialStep !== 'undefined' && tutorialStep === 4 && typeof shootTutorial === 'function') {
        shootTutorial();
      }
      // Left stick for movement
      if (t.clientX < window.innerWidth / 2 && !leftStick.active) {
        leftStick.active = true; leftStick.id = t.identifier;
        leftStick.baseX = t.clientX; leftStick.baseY = t.clientY;
        leftStick.dx = 0; leftStick.dy = 0;
      }
      return;
    }

    // Check buttons first
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.dataset && el.dataset.key) {
      btnTouches[el.id] = t.identifier;
      keys[el.dataset.key] = true;
      el.style.background = 'rgba(255,255,255,0.25)';
      return;
    }

    // Left half = move stick
    if (t.clientX < window.innerWidth / 2 && !leftStick.active) {
      leftStick.active = true; leftStick.id = t.identifier;
      leftStick.baseX = t.clientX; leftStick.baseY = t.clientY;
      leftStick.dx = 0; leftStick.dy = 0;
      // Sanctuary: quick E tap
      if (typeof inSanctuary !== 'undefined' && inSanctuary) {
        keys['KeyE'] = true;
        setTimeout(() => { keys['KeyE'] = false; }, 120);
      }
      return;
    }

    // Right half = aim + fire stick
    if (t.clientX >= window.innerWidth / 2 && !rightStick.active) {
      rightStick.active = true; rightStick.id = t.identifier;
      rightStick.baseX = t.clientX; rightStick.baseY = t.clientY;
      rightStick.dx = 0; rightStick.dy = 0;
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
      updateAimFromTouch(t);
      if (leftStick.active && t.identifier === leftStick.id) {
        applyLeftStick(t.clientX, t.clientY);
        // Direct player movement in tutorial
        if (lhPlayer) {
          const norm = Math.hypot(leftStick.dx, leftStick.dy);
          if (norm > DEAD) {
            lhPlayer.x = Math.max(250, Math.min(780, lhPlayer.x + (leftStick.dx/norm)*4));
            lhPlayer.y = Math.max(200, Math.min(370, lhPlayer.y + (leftStick.dy/norm)*4));
          }
        }
      }
      return;
    }

    if (leftStick.active && t.identifier === leftStick.id) {
      applyLeftStick(t.clientX, t.clientY);
    }

    if (rightStick.active && t.identifier === rightStick.id) {
      let dx = t.clientX - rightStick.baseX;
      let dy = t.clientY - rightStick.baseY;
      const dist = Math.hypot(dx, dy);
      if (dist > RADIUS) { dx=(dx/dist)*RADIUS; dy=(dy/dist)*RADIUS; }
      rightStick.dx = dx; rightStick.dy = dy;
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
      if (c) c.dispatchEvent(new MouseEvent('mouseup', { bubbles:true, cancelable:true, clientX:t.clientX, clientY:t.clientY, button:0 }));
      if (leftStick.active && t.identifier === leftStick.id) {
        leftStick.active=false; leftStick.dx=0; leftStick.dy=0;
        keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
      }
      return;
    }

    // Buttons
    for (const bid in btnTouches) {
      if (btnTouches[bid] === t.identifier) {
        const el = document.getElementById(bid);
        if (el) { keys[el.dataset.key]=false; el.style.background='rgba(0,0,0,0.7)'; }
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
function applyLeftStick(cx, cy) {
  let dx = cx - leftStick.baseX;
  let dy = cy - leftStick.baseY;
  const dist = Math.hypot(dx, dy);
  if (dist > RADIUS) { dx=(dx/dist)*RADIUS; dy=(dy/dist)*RADIUS; }
  leftStick.dx=dx; leftStick.dy=dy;
  keys['KeyW'] = dy < -DEAD;
  keys['KeyS'] = dy >  DEAD;
  keys['KeyA'] = dx < -DEAD;
  keys['KeyD'] = dx >  DEAD;
}

function updateAimFromTouch(t) {
  const cr = getCanvasRect();
  if (!cr || !window.lhMouse) return;
  const c = document.getElementById('game-canvas');
  lhMouse.screenX = (t.clientX - cr.left) * (c.width  / cr.width);
  lhMouse.screenY = (t.clientY - cr.top)  * (c.height / cr.height);
}

// ── Draw sticks on overlay canvas ─────────
function drawSticks() {
  const sc = document.getElementById('mob-sc');
  if (!sc || !mobileMode) return;
  const sx = sc.getContext('2d');
  sx.clearRect(0, 0, sc.width, sc.height);

  const draw = (st, label) => {
    if (!st.active) return;
    sx.beginPath(); sx.arc(st.baseX, st.baseY, RADIUS, 0, Math.PI*2);
    sx.strokeStyle='rgba(255,255,255,0.2)'; sx.lineWidth=2; sx.stroke();
    sx.fillStyle='rgba(255,255,255,0.04)'; sx.fill();
    sx.beginPath(); sx.arc(st.baseX+st.dx, st.baseY+st.dy, 24, 0, Math.PI*2);
    sx.fillStyle='rgba(255,255,255,0.28)'; sx.fill();
    sx.strokeStyle='rgba(255,255,255,0.5)'; sx.lineWidth=2; sx.stroke();
    sx.fillStyle='rgba(255,255,255,0.4)';
    sx.font='bold 11px Courier New'; sx.textAlign='center';
    sx.fillText(label, st.baseX, st.baseY+RADIUS+16);
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
window.addEventListener('orientationchange', window.checkMobileOrientation);

// ── Init ──────────────────────────────────
updateMobileMenuBtn();