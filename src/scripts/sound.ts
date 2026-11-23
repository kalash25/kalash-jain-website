/* ------------------------------------------------------------------
   Sound design, synthesized live with the Web Audio API.
   No audio files: every effect is built from oscillators and noise,
   so timing locks to the animation and nothing extra downloads.

   Browsers only allow audio after a click or key press. The enter
   screen (Intro.astro) creates the AudioContext inside that gesture
   and leaves it on window.__ac; the speaker toggle can create it too.
   Preference lives in localStorage 'sound' ('on' | 'off', default on).
------------------------------------------------------------------- */

type W = Window & { __ac?: AudioContext; webkitAudioContext?: typeof AudioContext };
const w = window as W;

let master: GainNode | null = null;
let verb: ConvolverNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function wanted() {
  try {
    return localStorage.getItem('sound') !== 'off';
  } catch {
    return true;
  }
}

export function setWanted(on: boolean) {
  try {
    localStorage.setItem('sound', on ? 'on' : 'off');
  } catch {}
  if (master && w.__ac) master.gain.setTargetAtTime(on ? 0.8 : 0, w.__ac.currentTime, 0.05);
  dispatchEvent(new Event('sound:change'));
}

/** Create (or resume) the audio context. Must be called from inside a click or key handler. */
export function unlock() {
  try {
    if (!w.__ac) {
      const AC = window.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      w.__ac = new AC();
    }
    if (w.__ac.state === 'suspended') w.__ac.resume();
    return w.__ac;
  } catch {
    return null;
  }
}

/** The graph, built lazily the first time a sound plays */
function graph() {
  const ac = w.__ac;
  if (!ac || ac.state === 'closed') return null;
  if (!master) {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ac.createGain();
    master.gain.value = wanted() ? 0.8 : 0;
    master.connect(comp).connect(ac.destination);

    // a short, dark room so hits have a tail
    const len = Math.floor(ac.sampleRate * 2.4);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    verb = ac.createConvolver();
    verb.buffer = ir;
    const wet = ac.createGain();
    wet.gain.value = 0.35;
    verb.connect(wet).connect(master);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const n = noiseBuf.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }
  return { ac, out: master, verb: verb! };
}

export const isOn = () => !!w.__ac && w.__ac.state === 'running' && wanted();

function noise(ac: AudioContext) {
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  return s;
}

/** Air moving past: band-passed noise sweeping up and across the stereo field */
export function whoosh({ dur = 1.1, from = 280, to = 2600, gain = 0.5, pan = true, delay = 0 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out } = g;
  const t = ac.currentTime + delay;
  const src = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(from, t);
  bp.frequency.exponentialRampToValueAtTime(to, t + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(from * 0.8, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.5);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const p = ac.createStereoPanner();
  if (pan) {
    p.pan.setValueAtTime(-0.7, t);
    p.pan.linearRampToValueAtTime(0.7, t + dur);
  }
  src.connect(bp).connect(env).connect(p).connect(out);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

/** Tension building into the hit: a rising tone over filtered noise */
export function riser({ dur = 1, gain = 0.22 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out } = g;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(90, t);
  o.frequency.exponentialRampToValueAtTime(420, t + dur);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.exponentialRampToValueAtTime(3200, t + dur);
  const n = noise(ac);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(800, t);
  hp.frequency.exponentialRampToValueAtTime(6000, t + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(gain, t + dur * 0.95);
  env.gain.linearRampToValueAtTime(0, t + dur + 0.02);
  o.connect(lp).connect(env);
  n.connect(hp).connect(env);
  env.connect(out);
  o.start(t);
  n.start(t, Math.random());
  o.stop(t + dur + 0.05);
  n.stop(t + dur + 0.05);
}

/** The heavy one: a sub-bass drop, a dark brass-like swell and a noise punch, into the room */
export function hit({ gain = 0.9 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out, verb } = g;
  const t = ac.currentTime;

  const sub = ac.createOscillator();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(120, t);
  sub.frequency.exponentialRampToValueAtTime(36, t + 0.7);
  const subG = ac.createGain();
  subG.gain.setValueAtTime(0.0001, t);
  subG.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  subG.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  sub.connect(subG).connect(out);

  // "braam": detuned saws through a closing low-pass
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.exponentialRampToValueAtTime(160, t + 2.4);
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(gain * 0.22, t + 0.04);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  lp.connect(bg);
  bg.connect(out);
  bg.connect(verb);
  const saws = [55, 55 * 1.006, 82.4].map((f) => {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    return o;
  });

  const n = noise(ac);
  const nf = ac.createBiquadFilter();
  nf.type = 'lowpass';
  nf.frequency.value = 1200;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(gain * 0.6, t);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  n.connect(nf).connect(ng);
  ng.connect(out);
  ng.connect(verb);

  sub.start(t);
  saws.forEach((o) => o.start(t));
  n.start(t, Math.random());
  sub.stop(t + 2.4);
  saws.forEach((o) => o.stop(t + 3));
  n.stop(t + 0.4);
}

/** A tiny keystroke-like click; p (0–1) raises the pitch. Throttled so bursts stay musical. */
let lastTick = 0;
export function tick(p = 0.5, gain = 0.05) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out } = g;
  const now = performance.now();
  if (now - lastTick < 40) return;
  lastTick = now;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'triangle';
  o.frequency.value = (1400 + p * 1800) * (0.96 + Math.random() * 0.08);
  const e = ac.createGain();
  e.gain.setValueAtTime(gain, t);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
  const pn = ac.createStereoPanner();
  pn.pan.value = Math.random() * 1.2 - 0.6;
  o.connect(e).connect(pn).connect(out);
  o.start(t);
  o.stop(t + 0.04);
}

/** Soft UI blip (toggles, opening things) */
export function soft({ up = true, gain = 0.08 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out } = g;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(up ? 620 : 880, t);
  o.frequency.exponentialRampToValueAtTime(up ? 930 : 560, t + 0.09);
  const e = ac.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(e).connect(out);
  o.start(t);
  o.stop(t + 0.18);
}

/** A low hum under the word stream; returns a stop function */
export function drone({ gain = 0.12 } = {}) {
  const g = graph();
  if (!g || !isOn()) return () => {};
  const { ac, out } = g;
  const t = ac.currentTime;
  const e = ac.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.6);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const os = [55, 110.4, 164.8].map((f, i) => {
    const o = ac.createOscillator();
    o.type = i ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.connect(lp);
    o.start(t);
    return o;
  });
  lp.connect(e).connect(out);
  return (fade = 0.25) => {
    const s = ac.currentTime;
    e.gain.cancelScheduledValues(s);
    e.gain.setValueAtTime(Math.max(0.0001, e.gain.value), s);
    e.gain.exponentialRampToValueAtTime(0.0001, s + fade);
    os.forEach((o) => o.stop(s + fade + 0.05));
  };
}

/** A soft landing: a low, short thump when the camera arrives somewhere */
export function land({ gain = 0.16 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out, verb } = g;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(70, t + 0.22);
  const e = ac.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(e);
  e.connect(out);
  e.connect(verb);
  o.start(t);
  o.stop(t + 0.4);
}

// A pentatonic scale, so notes played while exploring always sound like they belong together
const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880];

/** A soft plucked note; i picks a step of the scale */
export function note(i = 0, { gain = 0.07 } = {}) {
  const g = graph();
  if (!g || !isOn()) return;
  const { ac, out, verb } = g;
  const t = ac.currentTime;
  const f = SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length];
  const e = ac.createGain();
  e.gain.setValueAtTime(0.0001, t);
  e.gain.exponentialRampToValueAtTime(gain, t + 0.006);
  e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  [1, 2.01].forEach((m, k) => {
    const o = ac.createOscillator();
    o.type = k ? 'sine' : 'triangle';
    o.frequency.value = f * m;
    const og = ac.createGain();
    og.gain.value = k ? 0.25 : 1;
    o.connect(og).connect(e);
    o.start(t);
    o.stop(t + 1);
  });
  e.connect(out);
  e.connect(verb);
}

/** Air you hear while dragging the board; set(0–1) follows the drag speed */
export function wind() {
  const g = graph();
  if (!g || !isOn()) return { set: (_: number) => {}, stop: () => {} };
  const { ac, out } = g;
  const src = noise(ac);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.8;
  bp.frequency.value = 500;
  const e = ac.createGain();
  e.gain.value = 0.0001;
  src.connect(bp).connect(e).connect(out);
  src.start(ac.currentTime, Math.random());
  return {
    set: (v: number) => {
      const t = ac.currentTime;
      const k = Math.min(1, Math.max(0, v));
      e.gain.setTargetAtTime(0.0001 + k * 0.09, t, 0.06);
      bp.frequency.setTargetAtTime(400 + k * 1400, t, 0.08);
    },
    stop: () => {
      const t = ac.currentTime;
      e.gain.setTargetAtTime(0.0001, t, 0.12);
      src.stop(t + 0.6);
    },
  };
}
