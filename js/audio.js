/* ==========================================
   AUDIO.JS — Sound engine & YouTube BGM
   ========================================== */

const TRACK_LOOT = '8aWJ0f0oE0c';

let ytPlayer, isYtReady = false, currentVideoId = '', queuedVideo = '';
let audioCtx, soundEnabled = false;

// ── YouTube API ────────────────────────────
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

window.playBGM = function playBGM(videoId) {
  currentVideoId = videoId;
  if (!isYtReady) { queuedVideo = videoId; return; }
  ytPlayer.loadVideoById(videoId);
  if (soundEnabled) ytPlayer.playVideo();
};

window.stopBGM = function stopBGM() {
  if (isYtReady && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
};

window.toggleSound = function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('sound-toggle');
  btn.innerText         = soundEnabled ? '🔊 Sound: ON'  : '🔇 Sound: OFF';
  btn.style.color       = soundEnabled ? '#00ffcc' : '#ffcc00';
  btn.style.borderColor = soundEnabled ? '#00ffcc' : '#ffcc00';
  if (soundEnabled) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    playSound('coin');
    if (currentVideoId && isYtReady) ytPlayer.playVideo();
  } else {
    stopBGM();
  }
};

window.playSound = function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  switch (type) {
    case 'coin':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.setValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
    case 'shoot':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
    case 'die':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now); osc.stop(now + 0.4);
      break;
    case 'hit':
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
    case 'ability':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(800, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'explosion':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
      break;
    case 'levelup':
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.setValueAtTime(600, now + 0.2);
      osc.frequency.setValueAtTime(900, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now); osc.stop(now + 0.6);
      break;
  }
};