/* ==========================================
   AUDIO.JS — Music Engine v3.0
   Real MP3 tracks with adaptive shuffling
   + Procedural SFX engine
   ========================================== */

// ── Track Lists ───────────────────────────
const TRACKS = {
  sanctuary: [
    'sanctuary_1.mp3',
    'sanctuary_2.mp3'
  ],
  combat: [
    'combat_1.mp3',
    'combat_2.mp3',
    'combat_3.mp3',
    'combat_4.mp3'
  ],
  boss: [
    'boss_1.mp3',
    'boss_2.mp3',
    'boss_3.mp3',
    'boss_4.mp3',
    'boss_5.mp3'
  ]
};

// ── Music State ───────────────────────────
let currentMusicState  = 'none';
let currentAudio       = null;
let nextAudio          = null;
let lastTrackIndex     = { sanctuary: -1, combat: -1, boss: -1 };
let musicEnabled       = false;
let fadeInterval       = null;
let musicVolume        = 0.4;

// ── SFX Audio Context ─────────────────────
let audioCtx           = null;
let soundEnabled       = false;
let sfxGain            = null;
let masterGain         = null;
let musicIntensity     = 0;
let intensityTarget    = 0;

// ── Pick a random track, no repeats ───────
function pickTrack(state) {
  const list  = TRACKS[state];
  let idx;
  do { idx = Math.floor(Math.random() * list.length); }
  while (list.length > 1 && idx === lastTrackIndex[state]);
  lastTrackIndex[state] = idx;
  return list[idx];
}

// ── Create & preload an Audio element ─────
function createAudio(filename) {
  const audio     = new Audio(filename);
  audio.loop      = true;
  audio.volume    = 0;
  audio.preload   = 'auto';
  return audio;
}

// ── Crossfade from current to next track ──
function crossfadeTo(filename, onComplete) {
  if (fadeInterval) clearInterval(fadeInterval);

  const incoming = createAudio(filename);
  incoming.volume = 0;
  incoming.play().catch(() => {});

  const outgoing  = currentAudio;
  const fadeSteps = 40;
  const fadeMs    = 2000 / fadeSteps;
  let   step      = 0;

  fadeInterval = setInterval(() => {
    step++;
    const progress = step / fadeSteps;
    if (incoming) incoming.volume = Math.min(musicVolume, musicVolume * progress);
    if (outgoing) outgoing.volume = Math.max(0, musicVolume * (1 - progress));

    if (step >= fadeSteps) {
      clearInterval(fadeInterval);
      fadeInterval = null;
      if (outgoing) { outgoing.pause(); outgoing.src = ''; }
      currentAudio = incoming;
      if (onComplete) onComplete();
    }
  }, fadeMs);

  currentAudio = incoming;
}

// ── Fade out current track ─────────────────
function fadeOut(onComplete) {
  if (!currentAudio) { if (onComplete) onComplete(); return; }
  if (fadeInterval) clearInterval(fadeInterval);

  const outgoing  = currentAudio;
  const fadeSteps = 30;
  const fadeMs    = 1500 / fadeSteps;
  let   step      = 0;

  fadeInterval = setInterval(() => {
    step++;
    outgoing.volume = Math.max(0, musicVolume * (1 - step / fadeSteps));
    if (step >= fadeSteps) {
      clearInterval(fadeInterval);
      fadeInterval = null;
      outgoing.pause(); outgoing.src = '';
      currentAudio = null;
      if (onComplete) onComplete();
    }
  }, fadeMs);
}

// ── Main music state switcher ──────────────
window.setMusicState = function (state) {
  if (!musicEnabled)                  return;
  if (state === currentMusicState)    return;
  currentMusicState = state;

  if (state === 'none') {
    fadeOut(); return;
  }

  const track = pickTrack(state);
  crossfadeTo(track);
};

// ── Called every frame from combat loop ───
window.updateMusicIntensity = function (enemyCount, hasBoss) {
  if (!musicEnabled) return;

  if (hasBoss)            window.setMusicState('boss');
  else if (enemyCount > 0) window.setMusicState('combat');
  else                     window.setMusicState('sanctuary');

  intensityTarget = hasBoss ? 1.0 : Math.min(1.0, 0.3 + enemyCount * 0.08);
  musicIntensity += (intensityTarget - musicIntensity) * 0.02;
};

// ── Play sanctuary music in hub ────────────
window.playBGM = function () {
  if (!musicEnabled) return;
  window.setMusicState('sanctuary');
};

window.stopBGM = function () {
  fadeOut();
  currentMusicState = 'none';
};

// ── Init SFX audio context ─────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx    = new (window.AudioContext || window.webkitAudioContext)();
  masterGain  = audioCtx.createGain(); masterGain.gain.value = 0.8;
  sfxGain     = audioCtx.createGain(); sfxGain.gain.value    = 0.7;
  sfxGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);
}

// ── Positional stereo panner ───────────────
function createPanner(sourceX) {
  const panner      = audioCtx.createStereoPanner();
  const playerX     = lhPlayer ? lhPlayer.x : 400;
  panner.pan.value  = Math.max(-1, Math.min(1, (sourceX - playerX) / 400));
  return panner;
}

// ── Sound Toggle ───────────────────────────
window.toggleSound = function () {
  soundEnabled  = !soundEnabled;
  musicEnabled  = soundEnabled;
  const btn     = document.getElementById('sound-toggle');
  btn.innerText         = soundEnabled ? '🔊 Sound: ON'  : '🔇 Sound: OFF';
  btn.style.color       = soundEnabled ? '#00ffcc' : '#ffcc00';
  btn.style.borderColor = soundEnabled ? '#00ffcc' : '#ffcc00';

  if (soundEnabled) {
    initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playSound('coin');
    // Resume whatever state we were in
    if (inSanctuary) window.setMusicState('sanctuary');
    else if (currentMusicState !== 'none') window.setMusicState(currentMusicState);
  } else {
    fadeOut();
    currentMusicState = 'none';
  }
};

// ── Weapon shoot sound helper ──────────────
window.playShootSound = function (wType, sourceX) {
  switch (wType) {
    case 'SMG':      playSound('shoot_smg',      sourceX); break;
    case 'Shotgun':  playSound('shoot_shotgun',   sourceX); break;
    case 'Sniper':   playSound('shoot_sniper',    sourceX); break;
    case 'Launcher': playSound('shoot_launcher',  sourceX); break;
    default:         playSound('shoot_pistol',    sourceX); break;
  }
};

// ── Damage sound helper ────────────────────
window.playDamageSound = function (hitShield, sourceX) {
  if (hitShield) playSound('shield_hit', sourceX);
  else           playSound('hit',        sourceX);
};

// ── Main SFX player ────────────────────────
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
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now); osc.frequency.exponentialRampToValueAtTime(80, now+0.08);
      gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.1);
      osc.start(now); osc.stop(now+0.12);
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