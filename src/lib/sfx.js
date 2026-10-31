let ctx;

function tone(freqs, dur = 0.12, type = 'sine', gain = 0.08) {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const f of freqs) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur);
      t += dur * 0.8;
    }
  } catch {
    /* sem áudio */
  }
}

export const sfx = {
  enabled: true,
  correct() { this.enabled && tone([660, 880], 0.1, 'triangle'); },
  wrong() { this.enabled && tone([220, 180], 0.14, 'sawtooth', 0.04); },
  finish() { this.enabled && tone([523, 659, 784, 1047], 0.14, 'triangle'); },
};
