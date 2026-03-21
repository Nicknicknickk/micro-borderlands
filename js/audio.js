/* ==========================================
   AUDIO.JS — Procedural Audio Engine v2.0
   ==========================================
   Features:
   - Adaptive BGM layers (calm → combat → boss)
   - Positional stereo panning on SFX
   - Procedural drum loop that intensifies
   - Per-weapon-type shoot sounds
   - Smooth crossfade between music states
   - Hit confirmation sounds (crit vs normal)
   ========================================== */

// ── YouTube fallback BGM ───────────────────
const TRACK_LOOT = '8aWJ0f0oE0c';
let ytPlayer, isYtReady = false, currentVideoId = '', queuedVideo = '';

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    height: '200', width: '200', videoId: '',
    playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0 },
    events: {
      onReady: () => {
        isYtReady = true;
        if (queuedVideo && soundEnabled) { ytPlayer.loadVideoById(queuedVideo); ytPlayer.playVideo(); }
      },
      onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) ytPlayer.playVideo(); }
    }
  });
};

window.playBGM = function (videoId) {
  currentVideoId = videoId;
  if (!isYtReady) { queuedVideo = videoId; return; }
  ytPlayer.loadVideoById(videoId);
  if (soundEnabled) ytPlayer.playVideo();
};

window.stopBGM = function () {
  if (isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
};

// ── Core Audio Context ─────────────────────
let audioCtx     = null;
let soundEnabled = false;
let masterGain   = null;
let musicGain    = null;
let sfxGain      = null;

// ── Procedural Music State ─────────────────
let drumGain      = null;
let bassGain      = null;
let ambienceGain  = null;
let bossGain      = null;
let currentMusicState = 'calm';
let musicIntensity    = 0;
let intensityTarget   = 0;
let bossScheduled     = false;
const BPM             = 140;
const BEAT_INTERVAL   = 60 / BPM;

// ── Init ───────────────────────────────────
function initAudio() {
  if (audioCtx) return;
  audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain(); masterGain.gain.value = 0.8;
  musicGain  = audioCtx.createGain(); musicGain.gain.value  = 0.4;
  sfxGain    = audioCtx.createGain(); sfxGain.gain.value    = 0.7;
  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  drumGain     = audioCtx.createGain(); drumGain.gain.value     = 0.0; drumGain.connect(musicGain);
  bassGain     = audioCtx.createGain(); bassGain.gain.value     = 0.0; bassGain.connect(musicGain);
  ambienceGain = audioCtx.createGain(); ambienceGain.gain.value = 0.08; ambienceGain.connect(musicGain);
  bossGain     = audioCtx.createGain(); bossGain.gain.value     = 0.0; bossGain.connect(musicGain);

  startAmbienceLoop();
  scheduleDrumBeats();
  scheduleBassNotes();
}

// ── Ambience ──────────────────────────────
function startAmbienceLoop() {
  const bufSize = audioCtx.sampleRate * 4;
  const buf     = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data    = buf.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  for (let i = 0; i < bufSize; i++) {
    const w = Math.random()*2-1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
    b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
    b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.08; b6=w*0.115926;
  }
  const filt = audioCtx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=180;
  const src  = audioCtx.createBufferSource(); src.buffer=buf; src.loop=true;
  src.connect(filt); filt.connect(ambienceGain); src.start();
}

// ── Bass ──────────────────────────────────
function scheduleBassNotes() {
  if (!audioCtx || !soundEnabled) { setTimeout(scheduleBassNotes, 500); return; }
  const notes = [55,55,65.4,55]; const now = audioCtx.currentTime;
  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    osc.type='sawtooth'; osc.frequency.value=freq;
    const t = now + i*BEAT_INTERVAL*2;
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.6,t+0.02); g.gain.exponentialRampToValueAtTime(0.001,t+BEAT_INTERVAL*1.8);
    osc.connect(g); g.connect(bassGain); osc.start(t); osc.stop(t+BEAT_INTERVAL*2);
  });
  setTimeout(scheduleBassNotes, BEAT_INTERVAL*8*1000);
}

// ── Drums ─────────────────────────────────
function scheduleDrumBeats() {
  if (!audioCtx) { setTimeout(scheduleDrumBeats, 100); return; }
  const now = audioCtx.currentTime;
  // Kick
  [0, BEAT_INTERVAL*2].forEach(offset => {
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    osc.type='sine'; osc.frequency.setValueAtTime(150,now+offset); osc.frequency.exponentialRampToValueAtTime(0.001,now+offset+0.3);
    g.gain.setValueAtTime(musicIntensity*0.8,now+offset); g.gain.exponentialRampToValueAtTime(0.001,now+offset+0.3);
    osc.connect(g); g.connect(drumGain); osc.start(now+offset); osc.stop(now+offset+0.35);
  });
  // Snare
  [BEAT_INTERVAL, BEAT_INTERVAL*3].forEach(offset => {
    const bsz=Math.floor(audioCtx.sampleRate*0.15); const buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate); const d=buf.getChannelData(0);
    for(let i=0;i<bsz;i++) d[i]=(Math.random()*2-1)*(1-i/bsz);
    const src=audioCtx.createBufferSource(); const g=audioCtx.createGain(); const filt=audioCtx.createBiquadFilter();
    filt.type='bandpass'; filt.frequency.value=1800; filt.Q.value=0.8; src.buffer=buf;
    g.gain.setValueAtTime(musicIntensity*0.5,now+offset); g.gain.exponentialRampToValueAtTime(0.001,now+offset+0.12);
    src.connect(filt); filt.connect(g); g.connect(drumGain); src.start(now+offset); src.stop(now+offset+0.15);
  });
  // Hi-hat
  if (musicIntensity > 0.5) {
    for(let h=0;h<4;h++){
      const offset=BEAT_INTERVAL*h; const bsz=Math.floor(audioCtx.sampleRate*0.05); const buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate); const d=buf.getChannelData(0);
      for(let i=0;i<bsz;i++) d[i]=(Math.random()*2-1)*(1-i/bsz);
      const src=audioCtx.createBufferSource(); const g=audioCtx.createGain(); const filt=audioCtx.createBiquadFilter();
      filt.type='highpass'; filt.frequency.value=8000; src.buffer=buf;
      g.gain.setValueAtTime((musicIntensity-0.5)*0.3,now+offset); g.gain.exponentialRampToValueAtTime(0.001,now+offset+0.04);
      src.connect(filt); filt.connect(g); g.connect(drumGain); src.start(now+offset); src.stop(now+offset+0.05);
    }
  }
  setTimeout(scheduleDrumBeats, BEAT_INTERVAL*4*1000);
}

// ── Boss music ────────────────────────────
function scheduleBossMusic() {
  if (!audioCtx || !soundEnabled || currentMusicState !== 'boss') { bossScheduled=false; return; }
  const now  = audioCtx.currentTime;
  const riff = [110,110,130.8,110,98,110,146.8,130.8];
  riff.forEach((freq,i) => {
    const osc=audioCtx.createOscillator(); const g=audioCtx.createGain();
    const dist=audioCtx.createWaveShaper(); const curve=new Float32Array(256);
    for(let k=0;k<256;k++){const x=(k*2)/256-1;curve[k]=(Math.PI+400)*x/(Math.PI+400*Math.abs(x));}
    dist.curve=curve; osc.type='sawtooth'; osc.frequency.value=freq;
    const t=now+i*BEAT_INTERVAL;
    g.gain.setValueAtTime(0.4,t); g.gain.exponentialRampToValueAtTime(0.001,t+BEAT_INTERVAL*0.9);
    osc.connect(dist); dist.connect(g); g.connect(bossGain); osc.start(t); osc.stop(t+BEAT_INTERVAL);
  });
  setTimeout(scheduleBossMusic, riff.length*BEAT_INTERVAL*1000);
}

// ── Music State Machine ───────────────────
window.setMusicState = function (state) {
  if (!audioCtx || !soundEnabled || state === currentMusicState) return;
  currentMusicState = state; const now=audioCtx.currentTime; const fade=1.5;
  if (state==='calm') {
    intensityTarget=0;
    bassGain.gain.linearRampToValueAtTime(0,now+fade); drumGain.gain.linearRampToValueAtTime(0,now+fade);
    bossGain.gain.linearRampToValueAtTime(0,now+fade); ambienceGain.gain.linearRampToValueAtTime(0.08,now+fade);
  } else if (state==='combat') {
    intensityTarget=0.7;
    bassGain.gain.linearRampToValueAtTime(0.5,now+fade); drumGain.gain.linearRampToValueAtTime(0.6,now+fade);
    bossGain.gain.linearRampToValueAtTime(0,now+fade); ambienceGain.gain.linearRampToValueAtTime(0.03,now+fade);
  } else if (state==='boss') {
    intensityTarget=1.0;
    bassGain.gain.linearRampToValueAtTime(0.7,now+fade); drumGain.gain.linearRampToValueAtTime(0.9,now+fade);
    bossGain.gain.linearRampToValueAtTime(0.5,now+fade); ambienceGain.gain.linearRampToValueAtTime(0,now+fade);
    if (!bossScheduled) { bossScheduled=true; scheduleBossMusic(); }
  }
};

window.updateMusicIntensity = function (enemyCount, hasBoss) {
  if (!audioCtx || !soundEnabled) return;
  if (hasBoss)           { window.setMusicState('boss'); }
  else if (enemyCount>0) { window.setMusicState('combat'); intensityTarget=Math.min(1.0,0.4+enemyCount*0.08); }
  else                   { window.setMusicState('calm'); }
  musicIntensity += (intensityTarget - musicIntensity) * 0.02;
};

// ── Positional panner ─────────────────────
function createPanner(sourceX) {
  const panner=audioCtx.createStereoPanner();
  const playerX=lhPlayer?lhPlayer.x:400;
  panner.pan.value=Math.max(-1,Math.min(1,(sourceX-playerX)/400));
  return panner;
}

// ── Sound Toggle ──────────────────────────
window.toggleSound = function () {
  soundEnabled = !soundEnabled;
  const btn=document.getElementById('sound-toggle');
  btn.innerText=soundEnabled?'🔊 Sound: ON':'🔇 Sound: OFF';
  btn.style.color=soundEnabled?'#00ffcc':'#ffcc00';
  btn.style.borderColor=soundEnabled?'#00ffcc':'#ffcc00';
  if (soundEnabled) {
    initAudio(); if(audioCtx.state==='suspended') audioCtx.resume(); playSound('coin');
    if(currentVideoId&&isYtReady) ytPlayer.playVideo();
  } else {
    if(audioCtx) masterGain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.3);
    stopBGM(); setTimeout(()=>{if(!soundEnabled&&audioCtx)masterGain.gain.value=0.8;},400);
  }
};

// ── Main SFX ──────────────────────────────
window.playSound = function (type, sourceX) {
  if (!soundEnabled) return;
  if (!audioCtx) initAudio();
  if (audioCtx.state==='suspended') audioCtx.resume();
  const osc=audioCtx.createOscillator(); const gain=audioCtx.createGain();
  const pan=sourceX!==undefined?createPanner(sourceX):null;
  const now=audioCtx.currentTime;
  osc.connect(gain); if(pan){gain.connect(pan);pan.connect(sfxGain);}else gain.connect(sfxGain);

  switch(type) {
    case 'shoot_pistol': case 'shoot':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(320,now); osc.frequency.exponentialRampToValueAtTime(80,now+0.08);
      gain.gain.setValueAtTime(0.18,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(now); osc.stop(now+0.12);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='square'; o2.frequency.value=1200; g2.gain.setValueAtTime(0.06,now); g2.gain.exponentialRampToValueAtTime(0.001,now+0.02); o2.connect(g2); g2.connect(sfxGain); o2.start(now); o2.stop(now+0.025); } break;
    case 'shoot_smg':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(500,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.05);
      gain.gain.setValueAtTime(0.12,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.06); osc.start(now); osc.stop(now+0.07); break;
    case 'shoot_shotgun':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(120,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.25);
      gain.gain.setValueAtTime(0.35,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.3); osc.start(now); osc.stop(now+0.32);
      { const bsz=Math.floor(audioCtx.sampleRate*0.25),buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate),d=buf.getChannelData(0); for(let i=0;i<bsz;i++)d[i]=(Math.random()*2-1)*(1-i/bsz); const ns=audioCtx.createBufferSource(),ng=audioCtx.createGain(),nf=audioCtx.createBiquadFilter(); nf.type='lowpass';nf.frequency.value=800; ng.gain.setValueAtTime(0.25,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.25); ns.buffer=buf;ns.connect(nf);nf.connect(ng);ng.connect(sfxGain);ns.start(now); } break;
    case 'shoot_sniper':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(800,now); osc.frequency.exponentialRampToValueAtTime(150,now+0.04);
      gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.08); osc.start(now); osc.stop(now+0.1);
      { const o3=audioCtx.createOscillator(),g3=audioCtx.createGain(); o3.type='sawtooth';o3.frequency.setValueAtTime(800,now+0.18);o3.frequency.exponentialRampToValueAtTime(150,now+0.22); g3.gain.setValueAtTime(0.12,now+0.18);g3.gain.exponentialRampToValueAtTime(0.001,now+0.26); o3.connect(g3);g3.connect(sfxGain);o3.start(now+0.18);o3.stop(now+0.28); } break;
    case 'shoot_launcher':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(200,now); osc.frequency.linearRampToValueAtTime(80,now+0.6);
      gain.gain.setValueAtTime(0.2,now); gain.gain.linearRampToValueAtTime(0.001,now+0.6); osc.start(now); osc.stop(now+0.62); break;
    case 'hit':
      osc.type='square'; osc.frequency.setValueAtTime(500,now); osc.frequency.exponentialRampToValueAtTime(60,now+0.08);
      gain.gain.setValueAtTime(0.12,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.09); osc.start(now); osc.stop(now+0.1); break;
    case 'hit_crit':
      osc.type='square'; osc.frequency.setValueAtTime(900,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.06);
      gain.gain.setValueAtTime(0.2,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.08); osc.start(now); osc.stop(now+0.1);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='sine';o2.frequency.value=2400; g2.gain.setValueAtTime(0.08,now);g2.gain.exponentialRampToValueAtTime(0.001,now+0.05); o2.connect(g2);g2.connect(sfxGain);o2.start(now);o2.stop(now+0.06); } break;
    case 'die':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(40,now+0.4);
      gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.4); osc.start(now); osc.stop(now+0.42); break;
    case 'explosion':
      osc.type='sine'; osc.frequency.setValueAtTime(80,now); osc.frequency.exponentialRampToValueAtTime(20,now+0.6);
      gain.gain.setValueAtTime(0.4,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.7); osc.start(now); osc.stop(now+0.72);
      { const bsz=Math.floor(audioCtx.sampleRate*0.5),buf=audioCtx.createBuffer(1,bsz,audioCtx.sampleRate),d=buf.getChannelData(0); for(let i=0;i<bsz;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/bsz,1.5); const ns=audioCtx.createBufferSource(),ng=audioCtx.createGain(),nf=audioCtx.createBiquadFilter(); nf.type='lowpass';nf.frequency.value=1200; ng.gain.setValueAtTime(0.35,now);ng.gain.exponentialRampToValueAtTime(0.001,now+0.5); ns.buffer=buf;ns.connect(nf);nf.connect(ng);ng.connect(sfxGain);ns.start(now); } break;
    case 'coin':
      [880,1100,1320].forEach((f,i)=>{ const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type='sine';o.frequency.value=f; const t=now+i*0.06; g.gain.setValueAtTime(0.08,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.1); o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+0.12); }); osc.disconnect(); break;
    case 'ability':
      osc.type='sine'; osc.frequency.setValueAtTime(300,now); osc.frequency.linearRampToValueAtTime(900,now+0.35);
      gain.gain.setValueAtTime(0.15,now); gain.gain.linearRampToValueAtTime(0,now+0.4); osc.start(now); osc.stop(now+0.42);
      { const o2=audioCtx.createOscillator(),g2=audioCtx.createGain(); o2.type='sine';o2.frequency.setValueAtTime(600,now);o2.frequency.linearRampToValueAtTime(1800,now+0.35); g2.gain.setValueAtTime(0.06,now);g2.gain.linearRampToValueAtTime(0,now+0.35); o2.connect(g2);g2.connect(sfxGain);o2.start(now);o2.stop(now+0.37); } break;
    case 'levelup':
      [523,659,784,1047].forEach((f,i)=>{ const o=audioCtx.createOscillator(),g=audioCtx.createGain(); o.type='square';o.frequency.value=f; const t=now+i*0.15; g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.2); o.connect(g);g.connect(sfxGain);o.start(t);o.stop(t+0.22); }); osc.disconnect(); break;
    case 'shield_hit':
      osc.type='sine'; osc.frequency.setValueAtTime(1200,now); osc.frequency.exponentialRampToValueAtTime(400,now+0.15);
      gain.gain.setValueAtTime(0.1,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.18); osc.start(now); osc.stop(now+0.2); break;
    case 'shield_break':
      osc.type='sawtooth'; osc.frequency.setValueAtTime(600,now); osc.frequency.exponentialRampToValueAtTime(50,now+0.5);
      gain.gain.setValueAtTime(0.25,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.55); osc.start(now); osc.stop(now+0.57); break;
    default:
      osc.type='sine'; osc.frequency.value=440; gain.gain.setValueAtTime(0.05,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.1); osc.start(now); osc.stop(now+0.12);
  }
};

// ── Helpers ───────────────────────────────
window.playShootSound = function (wType, sourceX) {
  switch(wType) {
    case 'SMG':      playSound('shoot_smg',     sourceX); break;
    case 'Shotgun':  playSound('shoot_shotgun',  sourceX); break;
    case 'Sniper':   playSound('shoot_sniper',   sourceX); break;
    case 'Launcher': playSound('shoot_launcher', sourceX); break;
    default:         playSound('shoot_pistol',   sourceX); break;
  }
};

window.playDamageSound = function (hitShield, sourceX) {
  if (hitShield) playSound('shield_hit', sourceX);
  else           playSound('hit',        sourceX);
};