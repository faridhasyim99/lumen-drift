// LUMEN DRIFT v2 — synthesized sound effects.
// Every sound is built from oscillators and filtered noise at run time; the
// game ships no audio files. The context is created lazily on the first user
// gesture, because browsers will not let audio start before one. v2 adds a
// rising arpeggio for power-ups, a metallic shimmer for a shield breaking
// and a low pop for a splitter bursting.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') void context.resume();
      return true;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
    return true;
  }

  function tone({ type = 'sine', from = 440, to = null, duration = 0.12, volume = 0.5, delay = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise({ duration = 0.2, volume = 0.3, from = 1200, to = 300, delay = 0 }) {
    if (!ensure() || muted) return;
    const start = context.currentTime + delay;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  return {
    // Call from any user gesture so the browser unlocks audio.
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    // The pickup blip climbs in pitch as the combo multiplier grows,
    // capped so a long chain never turns shrill.
    pickup(multiplier) {
      const base = Math.min(1100, 520 + (multiplier - 1) * 90);
      tone({ type: 'sine', from: base, to: base * 1.6, duration: 0.1, volume: 0.45 });
      tone({ type: 'triangle', from: base * 2, to: base * 2.4, duration: 0.07, volume: 0.18 });
    },
    hit() {
      tone({ type: 'sawtooth', from: 180, to: 42, duration: 0.28, volume: 0.5 });
      noise({ duration: 0.22, volume: 0.35, from: 900, to: 120 });
    },
    dash() {
      noise({ duration: 0.16, volume: 0.25, from: 500, to: 3200 });
    },
    wave() {
      tone({ type: 'triangle', from: 392, duration: 0.12, volume: 0.35 });
      tone({ type: 'triangle', from: 587, duration: 0.16, volume: 0.35, delay: 0.1 });
    },
    // A bright three-note rise, the same for every power-up kind.
    powerup() {
      [660, 880, 1320].forEach((note, i) => {
        tone({ type: 'sine', from: note, duration: 0.14, volume: 0.35, delay: i * 0.07 });
      });
    },
    // A metallic shimmer as the shield shell shatters.
    shieldBreak() {
      tone({ type: 'square', from: 1560, to: 220, duration: 0.18, volume: 0.22 });
      noise({ duration: 0.14, volume: 0.2, from: 4200, to: 1800 });
    },
    // A low pop as a splitter comes apart into minis.
    split() {
      tone({ type: 'sine', from: 320, to: 90, duration: 0.16, volume: 0.4 });
      noise({ duration: 0.1, volume: 0.18, from: 700, to: 200 });
    },
    win() {
      [523, 659, 784, 1047].forEach((note, i) => {
        tone({ type: 'triangle', from: note, duration: 0.22, volume: 0.4, delay: i * 0.12 });
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((note, i) => {
        tone({ type: 'sawtooth', from: note, duration: 0.24, volume: 0.28, delay: i * 0.14 });
      });
    },
    click() {
      tone({ type: 'square', from: 660, to: 880, duration: 0.05, volume: 0.2 });
    },
  };
}
