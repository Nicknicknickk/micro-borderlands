/* ==========================================
   MOBILE.JS — Touch Controls v1.1
   Dual-stick landscape layout
   Left stick : movement
   Right stick: aim + fire
   Tutorial   : taps forwarded to canvas
   ========================================== */

// ── Mobile state ──────────────────────────
let mobileMode    = localStorage.getItem('mobileMode') === '1';
let mobileOverlay = null;
let sticksRafId   = null; // separate from animId — never touches game loop

// ── Stick state ───────────────────────────
const leftStick  = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };
const rightStick = { active:false, id:null, baseX:0, baseY:0, dx:0, dy:0 };

const STICK_RADIUS    = 55;
const STICK_DEAD_ZONE = 8;

// ── Button touch IDs ─────────────────────
const btnTouches = {};

// ── Main menu toggle ──────────────────────
window.toggleMobileMode = function () {
  mobileMode = !mobileMode;
  localStorage.setItem('mobileMode', mobileMode ? '1' : '0');
  updateMobileMenuBtn();
  if (!mobileMode && mobileOverlay) {
    mobileOverlay.remove();
    mobileOverlay = null;
  }
};

function updateMobileMenuBtn() {
  const btn = document.getElementById('mobile-mode-btn');
  if (!btn) return;
  if (mobileMode) {
    btn.textContent       = '📱  MOBILE MODE: ON';
    btn.style.color       = '#00ffcc';
    btn.style.borderColor = '#00ffcc';
    btn.style.boxShadow   = '0 0 10px #00ffcc44';
  } else {
    btn.textContent       = '📱  MOBILE MODE: OFF';
    btn.style.color       = '#555';
    btn.style.borderColor = '#333';
    btn.style.boxShadow   = 'none';
  }
}

// ── Called from launchGame in ui.js ───────
window.initMobileIfNeeded = function () {
  if (!mobileMode) return;
  if (mobileOverlay) { mobileOverlay.remove(); mobileOverlay = null; }
  buildMobileOverlay();
};

// ── Build overlay ─────────────────────────
function buildMobileOverlay() {
  const container = document.getElementById('game-container');
  if (!container) return;

  mobileOverlay = document.createElement('div');
  mobileOverlay.id = 'mobile-overlay';
  mobileOverlay.style.cssText = `
    position:absolute; top:0; left:0; right:0; bottom:0;
    pointer-events:none; z-index:500;
    touch-action:none; user-select:none;
  `;

  // Stick draw canvas
  const stickCanvas = document.createElement('canvas');
  stickCanvas.id = 'stick-canvas';
  stickCanvas.style.cssText = `
    position:absolute; top:0; left:0;
    width:100%; height:100%; pointer-events:none;
  `;
  mobileOverlay.appendChild(stickCanvas);

  // Left and right touch zones (bottom 45%)
  const leftZone  = makeTouchZone('left-zone',  '0',    'auto', '50%', '45%');
  const rightZone = makeTouchZone('right-zone', 'auto', '0',    '50%', '45%');
  mobileOverlay.appendChild(leftZone);
  mobileOverlay.appendChild(rightZone);

  // Action buttons — right side
  const buttons = [
    { id:'btn-e',     label:'E',    key:'KeyE', color:'#ffcc00', bottom:'52%', right:'3%',  size:44 },
    { id:'btn-g',     label:'G',    key:'KeyG', color:'#ff4400', bottom:'52%', right:'14%', size:44 },
    { id:'btn-skill', label:'SKLL', key:'KeyE', color:'#00ffcc', bottom:'52%', right:'25%', size:44 },
    { id:'btn-i',     label:'INV',  key:'KeyI', color:'#aaaaff', bottom:'52%', right:'36%', size:38 },
    { id:'btn-b',     label:'VLT',  key:'KeyB', color:'#00ff88', bottom:'52%', right:'47%', size:38 },
  ];
  buttons.forEach(b => {
    const el = document.createElement('div');
    el.id = b.id; el.dataset.key = b.key; el.textContent = b.label;
    el.style.cssText = `
      position:absolute; bottom:${b.bottom}; right:${b.right};
      width:${b.size}px; height:${b.size}px; border-radius:50%;
      background:rgba(0,0,0,0.65); border:2px solid ${b.color};
      color:${b.color}; font-family:'Courier New',monospace;
      font-size:${b.size>40?13:10}px; font-weight:bold;
      display:flex; align-items:center; justify-content:center;
      pointer-events:auto; touch-action:none;
      box-shadow:0 0 8px ${b.color}44; transition:background 0.08s;
    `;
    mobileOverlay.appendChild(el);
  });

  // F button — left side
  const btnF = document.createElement('div');
  btnF.id = 'btn-f'; btnF.dataset.key = 'KeyF'; btnF.textContent = 'F';
  btnF.style.cssText = `
    position:absolute; bottom:52%; left:3%;
    width:44px; height:44px; border-radius:50%;
    background:rgba(0,0,0,0.65); border:2px solid #ffaa00;
    color:#ffaa00; font-family:'Courier New',monospace;
    font-size:13px; font-weight:bold;
    display:flex; align-items:center; justify-content:center;
    pointer-events:auto; touch-action:none;
    box-shadow:0 0 8px #ffaa0044;
  `;
  mobileOverlay.appendChild(btnF);

  container.style.position = 'relative';
  container.appendChild(mobileOverlay);

  // Size stick canvas to match game canvas
  const gameCanvas = document.getElementById('game-canvas');
  const resizeSC = () => {
    stickCanvas.width  = gameCanvas.offsetWidth;
    stickCanvas.height = gameCanvas.offsetHeight;
  };
  resizeSC();
  window.addEventListener('resize', resizeSC);

  // Touch events on the whole overlay
  mobileOverlay.addEventListener('touchstart',  onTouchStart,  { passive:false });
  mobileOverlay.addEventListener('touchmove',   onTouchMove,   { passive:false });
  mobileOverlay.addEventListener('touchend',    onTouchEnd,    { passive:false });
  mobileOverlay.addEventListener('touchcancel', onTouchEnd,    { passive:false });

  drawSticks();
}

function makeTouchZone(id, left, right, width, height) {
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = `
    position:absolute; bottom:0; left:${left}; right:${right};
    width:${width}; height:${height};
    pointer-events:auto; touch-action:none;
  `;
  return el;
}

// ── Helper: is tutorial active? ───────────
function isTutorialActive() {
  return typeof inTutorial !== 'undefined' && inTutorial;
}

// ── Forward a tap to the canvas as a synthetic mouse event ──
function forwardTapToCanvas(clientX, clientY, type) {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const evt = new MouseEvent(type, {
    bubbles: true, cancelable: true,
    clientX, clientY, button: 0
  });
  canvas.dispatchEvent(evt);
}

// ── Touch start ───────────────────────────
function onTouchStart(e) {
  e.preventDefault();

  Array.from(e.changedTouches).forEach(t => {

    // ── Tutorial mode: forward ALL taps to canvas ──
    if (isTutorialActive()) {
      // Update mouse position first so aiming works
      updateMouseFromTouch(t);
      forwardTapToCanvas(t.clientX, t.clientY, 'mousedown');

      // Still let movement keys work via left-side touch
      const overlay = document.getElementById('mobile-overlay');
      if (overlay) {
        const rect = overlay.getBoundingClientRect();
        const relX = t.clientX - rect.left;
        if (relX < rect.width / 2 && !leftStick.active) {
          leftStick.active = true;
          leftStick.id     = t.identifier;
          leftStick.baseX  = relX;
          leftStick.baseY  = t.clientY - rect.top;
          leftStick.dx = 0; leftStick.dy = 0;
        }
      }
      return;
    }

    // ── Button touches ──
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.dataset && el.dataset.key) {
      btnTouches[el.id] = t.identifier;
      keys[el.dataset.key] = true;
      el.style.background = 'rgba(255,255,255,0.2)';
      return;
    }

    const overlay = document.getElementById('mobile-overlay');
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const relX = t.clientX - rect.left;
    const relY = t.clientY - rect.top;

    if (relX < rect.width / 2 && !leftStick.active) {
      // Left stick — movement
      leftStick.active = true;
      leftStick.id     = t.identifier;
      leftStick.baseX  = relX;
      leftStick.baseY  = relY;
      leftStick.dx = 0; leftStick.dy = 0;

      // In sanctuary, a left-side tap near an NPC triggers E
      if (inSanctuary) {
        keys['KeyE'] = true;
        setTimeout(() => { keys['KeyE'] = false; }, 120);
      }

    } else if (relX >= rect.width / 2 && !rightStick.active) {
      // Right stick — aim + fire
      rightStick.active = true;
      rightStick.id     = t.identifier;
      rightStick.baseX  = relX;
      rightStick.baseY  = relY;
      rightStick.dx = 0; rightStick.dy = 0;
      lhShooting = true;
    }
  });
}

// ── Touch move ────────────────────────────
function onTouchMove(e) {
  e.preventDefault();

  Array.from(e.changedTouches).forEach(t => {

    // Tutorial: update mouse aim continuously
    if (isTutorialActive()) {
      updateMouseFromTouch(t);
      if (leftStick.active && t.identifier === leftStick.id) {
        updateLeftStickDelta(t);
      }
      return;
    }

    if (leftStick.active && t.identifier === leftStick.id) {
      updateLeftStickDelta(t);
    }

    if (rightStick.active && t.identifier === rightStick.id) {
      const overlay = document.getElementById('mobile-overlay');
      if (!overlay) return;
      const rect = overlay.getBoundingClientRect();
      let dx = (t.clientX - rect.left) - rightStick.baseX;
      let dy = (t.clientY - rect.top)  - rightStick.baseY;
      const dist = Math.hypot(dx, dy);
      if (dist > STICK_RADIUS) { dx = (dx/dist)*STICK_RADIUS; dy = (dy/dist)*STICK_RADIUS; }
      rightStick.dx = dx; rightStick.dy = dy;

      // Aim mouse position
      if (dist > STICK_DEAD_ZONE && lhPlayer) {
        const ang = Math.atan2(dy, dx);
        lhMouse.screenX = lhPlayer.x + Math.cos(ang) * 200;
        lhMouse.screenY = lhPlayer.y + Math.sin(ang) * 200;
      }
    }
  });
}

// ── Touch end ─────────────────────────────
function onTouchEnd(e) {
  e.preventDefault();

  Array.from(e.changedTouches).forEach(t => {

    // Tutorial: forward mouseup to canvas
    if (isTutorialActive()) {
      forwardTapToCanvas(t.clientX, t.clientY, 'mouseup');
      if (leftStick.active && t.identifier === leftStick.id) {
        leftStick.active = false; leftStick.dx = 0; leftStick.dy = 0;
        keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
      }
      return;
    }

    // Buttons
    for (const btnId in btnTouches) {
      if (btnTouches[btnId] === t.identifier) {
        const el = document.getElementById(btnId);
        if (el) { keys[el.dataset.key] = false; el.style.background = 'rgba(0,0,0,0.65)'; }
        delete btnTouches[btnId];
      }
    }

    if (leftStick.active && t.identifier === leftStick.id) {
      leftStick.active = false; leftStick.dx = 0; leftStick.dy = 0;
      keys['KeyW']=false; keys['KeyS']=false; keys['KeyA']=false; keys['KeyD']=false;
    }

    if (rightStick.active && t.identifier === rightStick.id) {
      rightStick.active = false; rightStick.dx = 0; rightStick.dy = 0;
      lhShooting = false;
    }
  });
}

// ── Helpers ───────────────────────────────
function updateMouseFromTouch(t) {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const rect   = canvas.getBoundingClientRect();
  lhMouse.screenX = (t.clientX - rect.left) * (canvas.width  / rect.width);
  lhMouse.screenY = (t.clientY - rect.top)  * (canvas.height / rect.height);
}

function updateLeftStickDelta(t) {
  const overlay = document.getElementById('mobile-overlay');
  if (!overlay) return;
  const rect = overlay.getBoundingClientRect();
  let dx = (t.clientX - rect.left) - leftStick.baseX;
  let dy = (t.clientY - rect.top)  - leftStick.baseY;
  const dist = Math.hypot(dx, dy);
  if (dist > STICK_RADIUS) { dx=(dx/dist)*STICK_RADIUS; dy=(dy/dist)*STICK_RADIUS; }
  leftStick.dx = dx; leftStick.dy = dy;
  keys['KeyW'] = dy < -STICK_DEAD_ZONE;
  keys['KeyS'] = dy >  STICK_DEAD_ZONE;
  keys['KeyA'] = dx < -STICK_DEAD_ZONE;
  keys['KeyD'] = dx >  STICK_DEAD_ZONE;
}

// ── Draw sticks ───────────────────────────
function drawSticks() {
  if (!mobileMode || !mobileOverlay) return;
  const sc = document.getElementById('stick-canvas');
  if (!sc) return;
  const sCtx = sc.getContext('2d');
  sCtx.clearRect(0, 0, sc.width, sc.height);

  const drawStick = (stick, label) => {
    if (!stick.active) return;
    // Outer ring
    sCtx.beginPath();
    sCtx.arc(stick.baseX, stick.baseY, STICK_RADIUS, 0, Math.PI*2);
    sCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    sCtx.lineWidth = 2;
    sCtx.stroke();
    sCtx.fillStyle = 'rgba(255,255,255,0.05)';
    sCtx.fill();
    // Thumb nub
    sCtx.beginPath();
    sCtx.arc(stick.baseX + stick.dx, stick.baseY + stick.dy, 22, 0, Math.PI*2);
    sCtx.fillStyle   = 'rgba(255,255,255,0.3)';
    sCtx.fill();
    sCtx.strokeStyle = 'rgba(255,255,255,0.55)';
    sCtx.lineWidth = 2;
    sCtx.stroke();
    // Label
    sCtx.fillStyle = 'rgba(255,255,255,0.45)';
    sCtx.font = 'bold 11px "Courier New"';
    sCtx.textAlign = 'center';
    sCtx.fillText(label, stick.baseX, stick.baseY + STICK_RADIUS + 16);
  };

  drawStick(leftStick,  'MOVE');
  drawStick(rightStick, 'AIM + FIRE');

  sticksRafId = requestAnimationFrame(drawSticks);
}

// ── Orientation check ─────────────────────
window.checkMobileOrientation = function () {
  if (!mobileMode) return;
  const warn = document.getElementById('orientation-warn');
  if (!warn) return;
  warn.style.display = window.innerWidth > window.innerHeight ? 'none' : 'flex';
};

window.addEventListener('resize', window.checkMobileOrientation);
window.addEventListener('orientationchange', window.checkMobileOrientation);

// ── Init ──────────────────────────────────
updateMobileMenuBtn();