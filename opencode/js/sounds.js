// ===== Sound Effects via Web Audio API =====

const SFX = (() => {
  let ctx = null;
  let muted = localStorage.getItem('hamsterMuted') === 'true';

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type = 'sine', vol = 0.15, detune = 0) {
    if (muted) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  }

  function playNoise(duration, vol = 0.05) {
    if (muted) return;
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * vol;
    }
    const source = c.createBufferSource();
    source.buffer = buffer;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    source.connect(gain);
    gain.connect(c.destination);
    source.start();
  }

  return {
    // Short coin tap sound
    tap() {
      playTone(880, 0.08, 'sine', 0.12);
      playTone(1320, 0.06, 'sine', 0.06);
    },

    // Purchase / upgrade success
    purchase() {
      playTone(523, 0.1, 'sine', 0.12);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 60);
      setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 120);
    },

    // Achievement unlocked
    achievement() {
      playTone(523, 0.12, 'square', 0.08);
      setTimeout(() => playTone(659, 0.12, 'square', 0.08), 80);
      setTimeout(() => playTone(784, 0.12, 'square', 0.08), 160);
      setTimeout(() => playTone(1047, 0.25, 'square', 0.06), 240);
    },

    // Daily reward
    daily() {
      playTone(440, 0.1, 'sine', 0.1);
      setTimeout(() => playTone(554, 0.1, 'sine', 0.1), 70);
      setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 140);
      setTimeout(() => playTone(880, 0.2, 'sine', 0.08), 210);
    },

    // Error / fail
    error() {
      playTone(200, 0.15, 'sawtooth', 0.08);
      setTimeout(() => playTone(160, 0.2, 'sawtooth', 0.06), 100);
    },

    // Level up
    levelUp() {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 80);
      });
    },

    // Coin rain (multiple taps)
    coinRain() {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          playTone(800 + Math.random() * 600, 0.05, 'sine', 0.06);
        }, i * 40);
      }
    },

    // Boost activate
    boost() {
      playTone(330, 0.08, 'sawtooth', 0.06);
      setTimeout(() => playTone(440, 0.08, 'sawtooth', 0.06), 50);
      setTimeout(() => playTone(660, 0.12, 'sawtooth', 0.05), 100);
      playNoise(0.1, 0.03);
    },

    // Referral bonus
    referral() {
      playTone(660, 0.1, 'sine', 0.1);
      setTimeout(() => playTone(880, 0.1, 'sine', 0.1), 80);
      setTimeout(() => playTone(1100, 0.15, 'sine', 0.08), 160);
    },

    // Init (must be called from user gesture)
    init() {
      getCtx();
    },

    // Vibration
    vibrate(ms = 15) {
      if (navigator.vibrate && !muted) navigator.vibrate(ms);
    },
    vibrateWin() {
      if (navigator.vibrate && !muted) navigator.vibrate([100, 30, 50]);
    },

    // Mute controls
    isMuted() { return muted; },
    setMuted(val) {
      muted = !!val;
      localStorage.setItem('hamsterMuted', String(muted));
    },
    toggleMute() {
      muted = !muted;
      localStorage.setItem('hamsterMuted', String(muted));
      return muted;
    }
  };
})();
