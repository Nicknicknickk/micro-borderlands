/* ==========================================
   AUDIO.JS — Music Engine v3.1
   Fixed: no overlapping tracks
   ========================================== */

// ── Track Lists ───────────────────────────
const TRACKS = {
  sanctuary: ['sanctuary_1.mp3','sanctuary_2.mp3'],
  combat:    ['combat_1.mp3','combat_2.mp3','combat_3.mp3','combat_4.mp3','combat_5.mp3','combat_6.mp3'],
  boss:      ['boss_1.mp3','boss_2.mp3','boss_3.mp3','boss_4.mp3','boss_5.mp3','boss_6.mp3','boss_7.mp3','boss_8.mp3']
};

// ── Music State ───────────────────────────
let currentMusicState = 'none';
let currentAudio      = null;
let musicEnabled      = false;
let fadeInterval      = null;
let musicVolume       = 0.4;

// ── Shuffle Bag ────────────────────────────
// Each state gets its own shuffled queue.
// Once the queue is empty it refills and reshuffles,
// so every track plays before any track repeats.
const shuffleBags = { sanctuary: [], combat: [], boss: [] };

function refillBag(state) {
  const list = [...TRACKS[state]];
  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  shuffleBags[state] = list;
}

// ── SFX ───────────────────────────────────
let audioCtx       = null;
let soundEnabled   = false;
let sfxGain        = null;
let masterGain     = null;
let musicIntensity = 0;
let intensityTarget= 0;

// ── Pick next track from shuffle bag ──────
function pickTrack(state) {
  if (!shuffleBags[state] || shuffleBags[state].length === 0) refillBag(state);
  return shuffleBags[state].pop();
}

// ── Kill all audio immediately ─────────────
function killAllAudio() {
  if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }
  if (currentAudio) {
    try { currentAudio.pause(); currentAudio.src = ''; } catch(e) {}
    currentAudio = null;
  }
}

// ── Create audio element ───────────────────
function createAudio(filename) {
  const audio  = new Audio(filename);
  audio.loop   = true;
  audio.volume = 0;
  return audio;
}

// ── Crossfade to new track ─────────────────
function crossfadeTo(filename) {
  killAllAudio();

  const incoming = createAudio(filename);
  incoming.play().catch(() => {});

  const fadeSteps = 40;
  const fadeMs    = 2000 / fadeSteps;
  let   step      = 0;

  currentAudio = incoming;

  fadeInterval = setInterval(() => {
    step++;
    if (incoming) incoming.volume = Math.min(musicVolume, musicVolume * (step / fadeSteps));
    if (step >= fadeSteps) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
  }, fadeMs);
}

// ── Fade out ──────────────────────────────
function fadeOut() {
  if (!currentAudio) return;
  if (fadeInterval) { clearInterval(fadeInterval); fadeInterval = null; }

  const outgoing  = currentAudio;
  currentAudio    = null;
  const fadeSteps = 30;
  const fadeMs    = 1500 / fadeSteps;
  let   step      = 0;

  fadeInterval = setInterval(() => {
    step++;
    if (outgoing) outgoing.volume = Math.max(0, musicVolume * (1 - step / fadeSteps));
    if (step >= fadeSteps) {
      clearInterval(fadeInterval);
      fadeInterval = null;
      try { outgoing.pause(); outgoing.src = ''; } catch(e) {}
    }
  }, fadeMs);
}

// ── Main state switcher ────────────────────
window.setMusicState = function (state) {
  if (!musicEnabled)             return;
  if (state === currentMusicState) return;
  currentMusicState = state;
  if (state === 'none') { fadeOut(); return; }
  crossfadeTo(pickTrack(state));
};

// ── Called every frame from combat loop ───
window.updateMusicIntensity = function (enemyCount, hasBoss) {
  if (!musicEnabled) return;
  if (hasBoss)             window.setMusicState('boss');
  else if (enemyCount > 0) window.setMusicState('combat');
  else                     window.setMusicState('sanctuary');
  intensityTarget = hasBoss ? 1.0 : Math.min(1.0, 0.3 + enemyCount * 0.08);
  musicIntensity += (intensityTarget - musicIntensity) * 0.02;
};

// ── Hub music ─────────────────────────────
window.playBGM = function () {
  if (!musicEnabled) return;
  window.setMusicState('sanctuary');
};

window.stopBGM = function () {
  killAllAudio();
  currentMusicState = 'none';
};

// ── Init SFX context ──────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain(); masterGain.gain.value = 0.8;
  sfxGain    = audioCtx.createGain(); sfxGain.gain.value    = 0.7;
  sfxGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

// ── Positional panner ─────────────────────
function createPanner(sourceX) {
  const panner     = audioCtx.createStereoPanner();
  const playerX    = lhPlayer ? lhPlayer.x : 400;
  panner.pan.value = Math.max(-1, Math.min(1, (sourceX - playerX) / 400));
  return panner;
}

// ── Sound Toggle ──────────────────────────
window.toggleSound = function () {
  soundEnabled = !soundEnabled;
  musicEnabled = soundEnabled;
  const btn = document.getElementById('sound-toggle');
  btn.innerText         = soundEnabled ? '🔊 Sound: ON'  : '🔇 Sound: OFF';
  btn.style.color       = soundEnabled ? '#00ffcc' : '#ffcc00';
  btn.style.borderColor = soundEnabled ? '#00ffcc' : '#ffcc00';
  if (soundEnabled) {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playSound('coin');
    if (inSanctuary) window.setMusicState('sanctuary');
  } else {
    killAllAudio();
    currentMusicState = 'none';
  }
};

// ── Weapon sound helper ───────────────────
window.playShootSound = function (wType, sourceX) {
  switch (wType) {
    case 'SMG':      playSound('shoot_smg',     sourceX); break;
    case 'Shotgun':  playSound('shoot_shotgun',  sourceX); break;
    case 'Sniper':   playSound('shoot_sniper',   sourceX); break;
    case 'Launcher': playSound('shoot_launcher', sourceX); break;
    default:         playSound('shoot_pistol',   sourceX); break;
  }
};

// ── Damage sound helper ───────────────────
window.playDamageSound = function (hitShield, sourceX) {
  if (hitShield) playSound('shield_hit', sourceX);
  else           playSound('hit',        sourceX);
};

// ── Main SFX ──────────────────────────────
window.playSound = function (type, sourceX) {
  if (!soundEnabled) return;
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const pan  = sourceX !== undefined ? createPanner(sourceX) : null;
  const now  = audioCtx.currentTime;

  osc.connect(gain);
  if (pan) { gain.connect(pan); pan.connect(sfxGain); }
  else       gain.connect(sfxGain);

  switch (type) {
    case 'shoot_pistol': case 'shoot':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(320,now); osc.frequency.exponentialRampToValueAtTime(80,now+0.08);
      gain.gain.setValueAtTime(0.18,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(now); osc.stop(now+0.12);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='square'; o2.frequency.value=1200; g2.gain.setValueAtTime(0.06,now); g2.gain.exponentialRampToValueAtTime(0.001,now+0.02); o2.connect(g2); g2.connect(sfxGain); o2.start(now); o2.stop(now+0.025); }
      break;
    case 'shoot_smg':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(500,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.05);
      gain.gain.setValueAtTime(0.12,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.06); osc.start(now); osc.stop(now+0.07); break;
    case 'shoot_shotgun':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(120,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.25);
      gain.gain.setValueAtTime(0.35,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(now); osc.stop(now+0.32);
      { const bsz=Math.floor(audioCtx.sampleRate*0.25),buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate),d=buf.getChannelData(0); for(let i=0;i<bsz;i++)d[i]=(Math.random()*2-1)*(1-i/bsz); const ns=audioCtx.createBufferSource(),ng=audioCtx.createGain(),nf=audioCtx.createBiquadFilter(); nf.type='lowpass';nf.frequency.value=800; ng.gain.setValueAtTime(0.25,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.25); ns.buffer=buf;ns.connect(nf);nf.connect(ng);ng.connect(sfxGain);ns.start(now); }
      break;
    case 'shoot_sniper':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(150,now+0.04);
      gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.08); osc.start(now); osc.stop(now+0.1);
      { const o3=audioCtx.createOscillator(),g3=audioCtx.createGain(); o3.type='sawtooth';o3.frequency.setValueAtTime(800,now+0.18);o3.frequency.exponentialRampToValueAtTime(150,now+0.22); g3.gain.setValueAtTime(0.12,now+0.18);g3.gain.exponentialRampToValueAtTime(0.001,now+0.26); o3.connect(g3);g3.connect(sfxGain);o3.start(now+0.18);o3.stop(now+0.28); }
      break;
    case 'shoot_launcher':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(200,now); osc.frequency.linearRampToValueAtTime(80,now+0.6);
      gain.gain.setValueAtTime(0.2,now); gain.gain.linearRampToValueAtTime(0.001,now+0.6); osc.start(now); osc.stop(now+0.62); break;
    case 'hit':
      osc.type='square'; osc.frequency.setValueAtTime(500,now); osc.frequency.exponentialRampToValueAtTime(60,now+0.08);
      gain.gain.setValueAtTime(0.12,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.09); osc.start(now); osc.stop(now+0.1); break;
    case 'hit_crit':
      osc.type='square'; osc.frequency.setValueAtTime(900,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.06);
      gain.gain.setValueAtTime(0.2,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.08); osc.start(now); osc.stop(now+0.1);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='sine';o2.frequency.value=2400; g2.gain.setValueAtTime(0.08,now);g2.gain.exponentialRampToValueAtTime(0.001,now+0.05); o2.connect(g2);g2.connect(sfxGain);o2.start(now);o2.stop(now+0.06); }
      break;
    case 'die':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.4);
      gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.4); osc.start(now); osc.stop(now+0.42); break;
    case 'explosion':
      osc.type='sine'; osc.frequency.setValueAtTime(80,now); osc.frequency.exponentialRampToValueAtTime(20,now+0.6);
      gain.gain.setValueAtTime(0.4,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.7); osc.start(now); osc.stop(now+0.72);
      { const bsz=Math.floor(audioCtx.sampleRate*0.5),buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate),d=buf.getChannelData(0); for(let i=0;i<bsz;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/bsz,1.5); const ns=audioCtx.createBufferSource(),ng=audioCtx.createGain(),nf=audioCtx.createBiquadFilter(); nf.type='lowpass';nf.frequency.value=1200; ng.gain.setValueAtTime(0.35,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.5); ns.buffer=buf;ns.connect(nf);nf.connect(ng);ng.connect(sfxGain);ns.start(now); }
      break;
    case 'coin':
      [880,1100,1320].forEach((f,i)=>{ const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type='sine';o.frequency.value=f; const t=now+i*0.06; g.gain.setValueAtTime(0.08,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.1); o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+0.12); });
      osc.disconnect(); break;
    case 'ability':
      osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(900,now+0.35);
      gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.4); osc.start(now); osc.stop(now+0.42);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='sine';o2.frequency.setValueAtTime(600,now);o2.frequency.linearRampToValueAtTime(1800,now+0.35); g2.gain.setValueAtTime(0.06,now);g2.gain.linearRampToValueAtTime(0,now+0.35); o2.connect(g2);g2.connect(sfxGain);o2.start(now);o2.stop(now+0.37); }
      break;
    case 'levelup':
      [523,659,784,1047].forEach((f,i)=>{ const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type='square';o.frequency.value=f; const t=now+i*0.15; g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.2); o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+0.22); });
      osc.disconnect(); break;
    case 'shield_hit':
      osc.type='sine'; osc.frequency.setValueAtTime(1200,now); osc.frequency.exponentialRampToValueAtTime(400,now+0.15);
      gain.gain.setValueAtTime(0.1,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.18); osc.start(now); osc.stop(now+0.2); break;
    case 'shield_break':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(600,now); osc.frequency.exponentialRampToValueAtTime(50,now+0.5);
      gain.gain.setValueAtTime(0.25,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.55); osc.start(now); osc.stop(now+0.57); break;
    default:
      osc.type='sine'; osc.frequency.value=440;
      gain.gain.setValueAtTime(0.05,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1);
      osc.start(now); osc.stop(now+0.12);
  }
};