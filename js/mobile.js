/* ==========================================
   MOBILE.JS — Touch Controls v1.0
   Dual-stick landscape layout
   Left stick: movement
   Right stick: aim + auto-fire
   Bottom buttons: E, G, Skill, I, B
   ========================================== */

// ── Mobile state ──────────────────────────
let mobileMode    = localStorage.getItem('mobileMode') === '1';
let mobileOverlay = null;

// ── Stick state ───────────────────────────
const leftStick  = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
const rightStick = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };

const STICK_RADIUS     = 55;  // outer ring radius
const STICK_DEAD_ZONE  = 8;   // ignore tiny movements

// ── Button touch IDs ─────────────────────
const btnTouches = {}; // buttonId → touchId

// ── Toggle from main menu ─────────────────
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
    btn.textContent  = '📱  MOBILE MODE: ON';
    btn.style.color  = '#00ffcc';
    btn.style.borderColor = '#00ffcc';
    btn.style.boxShadow   = '0 0 10px #00ffcc44';
  } else {
    btn.textContent  = '📱  MOBILE MODE: OFF';
    btn.style.color  = '#555';
    btn.style.borderColor = '#333';
    btn.style.boxShadow   = 'none';
  }
}

// ── Init overlay when game starts ─────────
window.initMobileIfNeeded = function () {
  if (!mobileMode) return;
  if (mobileOverlay) mobileOverlay.remove();
  buildMobileOverlay();
};

// ── Build the touch overlay ───────────────
function buildMobileOverlay() {
  const container = document.getElementById('game-container');
  if (!container) return;

  mobileOverlay = document.createElement('div');
  mobileOverlay.id = 'mobile-overlay';
  mobileOverlay.style.cssText = `
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 500;
    touch-action: none;
    user-select: none;
  `;

  // Canvas for drawing sticks
  const stickCanvas = document.createElement('canvas');
  stickCanvas.id = 'stick-canvas';
  stickCanvas.style.cssText = `
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none;
  `;
  mobileOverlay.appendChild(stickCanvas);

  // Touch capture layer (covers bottom 45% of screen on each side)
  const leftZone = makeTouchZone('left-zone',  '0',    'auto', '50%',  '45%');
  const rightZone= makeTouchZone('right-zone', 'auto', '0',    '50%',  '45%');
  mobileOverlay.appendChild(leftZone);
  mobileOverlay.appendChild(rightZone);

  // Action buttons — right side above right stick
  const buttons = [
    { id: 'btn-e',     label: 'E',    key: 'KeyE',  color: '#ffcc00', bottom: '52%', right: '3%',  size: 44 },
    { id: 'btn-g',     label: 'G',    key: 'KeyG',  color: '#ff4400', bottom: '52%', right: '14%', size: 44 },
    { id: 'btn-skill', label: 'SKLL', key: 'KeyE',  color: '#00ffcc', bottom: '52%', right: '25%', size: 44 },
    { id: 'btn-i',     label: 'INV',  key: 'KeyI',  color: '#aaaaff', bottom: '52%', right: '36%', size: 38 },
    { id: 'btn-b',     label: 'VLT',  key: 'KeyB',  color: '#00ff88', bottom: '52%', right: '47%', size: 38 },
  ];

  buttons.forEach(b => {
    const el = document.createElement('div');
    el.id = b.id;
    el.dataset.key = b.key;
    el.textContent = b.label;
    el.style.cssText = `
      position: absolute;
      bottom: ${b.bottom};
      right: ${b.right};
      width: ${b.size}px;
      height: ${b.size}px;
      border-radius: 50%;
      background: rgba(0,0,0,0.65);
      border: 2px solid ${b.color};
      color: ${b.color};
      font-family: 'Courier New', monospace;
      font-size: ${b.size > 40 ? 13 : 10}px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      touch-action: none;
      box-shadow: 0 0 8px ${b.color}44;
      transition: background 0.1s;
    `;
    mobileOverlay.appendChild(el);
  });

  // F key (pick up) — left side above left stick
  const btnF = document.createElement('div');
  btnF.id = 'btn-f';
  btnF.dataset.key = 'KeyF';
  btnF.textContent = 'F';
  btnF.style.cssText = `
    position: absolute;
    bottom: 52%;
    left: 3%;
    width: 44px; height: 44px;
    border-radius: 50%;
    background: rgba(0,0,0,0.65);
    border: 2px solid #ffaa00;
    color: #ffaa00;
    font-family: 'Courier New', monospace;
    font-size: 13px; font-weight: bold;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto; touch-action: none;
    box-shadow: 0 0 8px #ffaa0044;
  `;
  mobileOverlay.appendChild(btnF);

  container.style.position = 'relative';
  container.appendChild(mobileOverlay);

  // Resize stick canvas to match game canvas
  const gameCanvas = document.getElementById('game-canvas');
  const resizeStickCanvas = () => {
    stickCanvas.width  = gameCanvas.offsetWidth;
    stickCanvas.height = gameCanvas.offsetHeight;
  };
  resizeStickCanvas();
  window.addEventListener('resize', resizeStickCanvas);

  // Wire up touch events
  mobileOverlay.addEventListener('touchstart',  onTouchStart,  { passive: false });
  mobileOverlay.addEventListener('touchmove',   onTouchMove,   { passive: false });
  mobileOverlay.addEventListener('touchend',    onTouchEnd,    { passive: false });
  mobileOverlay.addEventListener('touchcancel', onTouchEnd,    { passive: false });

  // Start draw loop for sticks
  drawSticks();
}

function makeTouchZone(id, left, right, width, height) {
  const el = document.createElement('div');
  el.id = id;
  el.style.cssText = `
    position: absolute;
    bottom: 0;
    left: ${left};
    right: ${right};
    width: ${width};
    height: ${height};
    pointer-events: auto;
    touch-action: none;
  `;
  return el;
}

// ── Touch handlers ────────────────────────
function onTouchStart(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const el = document.elementFromPoint(t.clientX, t.clientY);

    // Button touches
    if (el && el.dataset && el.dataset.key) {
      btnTouches[el.id] = t.identifier;
      keys[el.dataset.key] = true;
      el.style.background = 'rgba(255,255,255,0.2)';
      return;
    }

    const overlay   = document.getElementById('mobile-overlay');
    const rect      = overlay.getBoundingClientRect();
    const relX      = t.clientX - rect.left;
    const relY      = t.clientY - rect.top;
    const midX      = rect.width / 2;

    if (relX < midX && !leftStick.active) {
      // Left stick
      leftStick.active = true;
      leftStick.id     = t.identifier;
      leftStick.baseX  = relX;
      leftStick.baseY  = relY;
      leftStick.dx     = 0;
      leftStick.dy     = 0;
    } else if (relX >= midX && !rightStick.active) {
      // Right stick
      rightStick.active = true;
      rightStick.id     = t.identifier;
      rightStick.baseX  = relX;
      rightStick.baseY  = relY;
      rightStick.dx     = 0;
      rightStick.dy     = 0;
      // Start firing when right thumb goes down
      lhShooting = true;
    }
  });
}

function onTouchMove(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    const overlay = document.getElementById('mobile-overlay');
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    const relX = t.clientX - rect.left;
    const relY = t.clientY - rect.top;

    if (leftStick.active && t.identifier === leftStick.id) {
      let dx = relX - leftStick.baseX;
      let dy = relY - leftStick.baseY;
      const dist = Math.hypot(dx, dy);
      if (dist > STICK_RADIUS) {
        dx = (dx / dist) * STICK_RADIUS;
        dy = (dy / dist) * STICK_RADIUS;
      }
      leftStick.dx = dx;
      leftStick.dy = dy;

      // Map to key presses
      const norm = dist > STICK_DEAD_ZONE ? dist : 0;
      keys['KeyW'] = norm > 0 && dy < -STICK_DEAD_ZONE;
      keys['KeyS'] = norm > 0 && dy >  STICK_DEAD_ZONE;
      keys['KeyA'] = norm > 0 && dx < -STICK_DEAD_ZONE;
      keys['KeyD'] = norm > 0 && dx >  STICK_DEAD_ZONE;
    }

    if (rightStick.active && t.identifier === rightStick.id) {
      let dx = relX - rightStick.baseX;
      let dy = relY - rightStick.baseY;
      const dist = Math.hypot(dx, dy);
      if (dist > STICK_RADIUS) {
        dx = (dx / dist) * STICK_RADIUS;
        dy = (dy / dist) * STICK_RADIUS;
      }
      rightStick.dx = dx;
      rightStick.dy = dy;

      // Aim the mouse toward right stick direction
      if (dist > STICK_DEAD_ZONE && lhPlayer) {
        const gameCanvas = document.getElementById('game-canvas');
        const cRect      = gameCanvas.getBoundingClientRect();
        const scaleX     = gameCanvas.width  / cRect.width;
        const scaleY     = gameCanvas.height / cRect.height;
        const ang        = Math.atan2(dy, dx);
        const aimDist    = 200;
        lhMouse.screenX  = lhPlayer.x + Math.cos(ang) * aimDist;
        lhMouse.screenY  = lhPlayer.y + Math.sin(ang) * aimDist;
      }
    }
  });
}

function onTouchEnd(e) {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => {
    // Check button releases
    for (const btnId in btnTouches) {
      if (btnTouches[btnId] === t.identifier) {
        const el = document.getElementById(btnId);
        if (el) {
          keys[el.dataset.key] = false;
          el.style.background = 'rgba(0,0,0,0.65)';
        }
        delete btnTouches[btnId];
      }
    }

    if (leftStick.active && t.identifier === leftStick.id) {
      leftStick.active = false;
      leftStick.dx = 0; leftStick.dy = 0;
      keys['KeyW'] = false; keys['KeyS'] = false;
      keys['KeyA'] = false; keys['KeyD'] = false;
    }

    if (rightStick.active && t.identifier === rightStick.id) {
      rightStick.active = false;
      rightStick.dx = 0; rightStick.dy = 0;
      lhShooting = false;
    }
  });
}

// ── Draw sticks on overlay canvas ────────
function drawSticks() {
  if (!mobileMode || !mobileOverlay) return;

  const sc  = document.getElementById('stick-canvas');
  if (!sc) return;
  const sCtx = sc.getContext('2d');
  sCtx.clearRect(0, 0, sc.width, sc.height);

  const drawStick = (stick, label) => {
    if (!stick.active) return;
    const bx = stick.baseX, by = stick.baseY;

    // Outer ring
    sCtx.beginPath();
    sCtx.arc(bx, by, STICK_RADIUS, 0, Math.PI * 2);
    sCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    sCtx.lineWidth   = 2;
    sCtx.stroke();
    sCtx.fillStyle   = 'rgba(255,255,255,0.05)';
    sCtx.fill();

    // Thumb nub
    const nx = bx + stick.dx;
    const ny = by + stick.dy;
    sCtx.beginPath();
    sCtx.arc(nx, ny, 22, 0, Math.PI * 2);
    sCtx.fillStyle   = 'rgba(255,255,255,0.35)';
    sCtx.fill();
    sCtx.strokeStyle = 'rgba(255,255,255,0.6)';
    sCtx.lineWidth   = 2;
    sCtx.stroke();

    // Label
    sCtx.fillStyle  = 'rgba(255,255,255,0.5)';
    sCtx.font       = 'bold 11px "Courier New"';
    sCtx.textAlign  = 'center';
    sCtx.fillText(label, bx, by + STICK_RADIUS + 16);
  };

  drawStick(leftStick,  'MOVE');
  drawStick(rightStick, 'AIM');

  requestAnimationFrame(drawSticks);
}

// ── Sanctuary interaction on mobile ───────
// In sanctuary, right stick tap = E (interact)
// We handle this by detecting a quick tap on the right zone
let rightTapTimer = 0;
function checkMobileSanctuaryInteract() {
  if (!mobileMode || !inSanctuary) return;
  if (rightStick.active) {
    rightTapTimer++;
    if (rightTapTimer === 1) {
      // Treat initial right touch as E press in sanctuary
      keys['KeyE'] = true;
      setTimeout(() => { keys['KeyE'] = false; }, 120);
    }
  } else {
    rightTapTimer = 0;
  }
}

// Call this from the sanctuary loop each frame (optional enhancement)
window.mobileFrame = function () {
  if (!mobileMode) return;
  checkMobileSanctuaryInteract();
};

// ── Force landscape orientation ───────────
window.checkMobileOrientation = function () {
  if (!mobileMode) return;
  const warn = document.getElementById('orientation-warn');
  if (!warn) return;
  const isLandscape = window.innerWidth > window.innerHeight;
  warn.style.display = isLandscape ? 'none' : 'flex';
};

window.addEventListener('resize', window.checkMobileOrientation);
window.addEventListener('orientationchange', window.checkMobileOrientation);

// ── Init on page load ─────────────────────
updateMobileMenuBtn();