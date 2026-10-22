/* Saigon Rising — tiny Web Audio sound effects, generated in code (no audio files). */

const SFX = (() => {
  let ctx = null, on = true, rainNode = null, rainGain = null;
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { on = false; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, slide = 0) {
    if (!on || !ac()) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  return {
    get on() { return on; },
    toggle() { on = !on; if (!on) this.rainStop(); return on; },
    click() { tone(660, 0.06, 'triangle', 0.08); },
    build() { tone(392, 0.09, 'triangle', 0.12); setTimeout(() => tone(587, 0.12, 'triangle', 0.1), 70); },
    error() { tone(180, 0.18, 'square', 0.06, 0.8); },
    good() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.1), i * 110)); },
    bad() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.05), i * 140)); },
    thunder() {
      if (!on || !ac()) return;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = noiseBuffer(2.5); f.type = 'lowpass'; f.frequency.value = 180;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      s.connect(f).connect(g).connect(ctx.destination); s.start(t);
    },
    rainStart(intensity = 0.5) {
      if (!on || !ac() || rainNode) return;
      rainNode = ctx.createBufferSource(); rainNode.buffer = noiseBuffer(2); rainNode.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
      rainGain = ctx.createGain(); rainGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      rainGain.gain.exponentialRampToValueAtTime(0.05 + 0.1 * intensity, ctx.currentTime + 0.6);
      rainNode.connect(f).connect(rainGain).connect(ctx.destination); rainNode.start();
    },
    rainStop() {
      if (!rainNode || !ctx) return;
      const n = rainNode, g = rainGain; rainNode = null;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setTimeout(() => { try { n.stop(); } catch (e) { /* already stopped */ } }, 900);
    },
  };
})();
