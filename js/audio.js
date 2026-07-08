// Ambient score for the museum — sampled orchestra edition.
//
// ONE continuous piece: fixed key (A), tempo, an 8-bar harmonic form, and one
// long melodic phrase that run from unlock and never restart. Each room swaps
// only the *orchestration* — which sampled instruments carry the bass / pad /
// arpeggio / melody / percussion, and which mode the shared material is played
// through. Egypt hears it on a double reed over harp in the double-harmonic
// scale; Japan on koto and shakuhachi in a minor pentatonic; the Baroque hall
// on harpsichord and strings. Same song, new voices.
//
// Instruments are real recorded samples: per-note MP3s from the FluidR3 General
// MIDI soundfont, fetched from jsDelivr (the CDN this project already uses for
// Three.js) and pitch-shifted from the nearest sampled note. Samples stream in
// lazily — layers join the mix as their instrument finishes loading, and every
// instrument is prefetched in the background so later rooms are ready on entry.

// ---------------- Shared song (never resets) ----------------

const TEMPO_BPM = 66;
const SECS_PER_BEAT = 60 / TEMPO_BPM;
const STEP_DUR = SECS_PER_BEAT / 2;      // eighth-note grid
const STEPS_PER_BAR = 8;
const LOOP_STEPS = 64;                    // 8-bar form

// A tonal center. Roots as semitone offsets from A: Am F C G / Am Dm F G.
const PROG = [0, -4, 3, -2, 0, 5, -4, -2];

const BASS_MIDI = 33;   // A1
const PAD_MIDI  = 57;   // A3
const ARP_MIDI  = 57;   // A3
const MEL_MIDI  = 69;   // A4

// The melody: one 8-bar phrase (question bars 1–4, answer bars 5–8, peak in
// bar 6) as scale degrees — each palette re-colors it through its own mode.
// { step: { d: degree, v: velocity, len: steps } }
const MOTIF = {
  0:  { d: 0, v: 0.85, len: 3 },  6:  { d: 1, v: 0.55, len: 1 },
  8:  { d: 2, v: 0.75, len: 3 },  14: { d: 1, v: 0.50, len: 1 },
  16: { d: 4, v: 0.85, len: 4 },  22: { d: 3, v: 0.55, len: 1 },
  24: { d: 2, v: 0.70, len: 2 },  28: { d: 1, v: 0.55, len: 1 },
  30: { d: 0, v: 0.50, len: 1 },
  32: { d: 4, v: 0.80, len: 2 },  36: { d: 5, v: 0.70, len: 1 },
  38: { d: 6, v: 0.65, len: 1 },  40: { d: 7, v: 0.90, len: 4 },
  46: { d: 6, v: 0.60, len: 1 },  48: { d: 5, v: 0.75, len: 2 },
  52: { d: 4, v: 0.60, len: 1 },  54: { d: 3, v: 0.55, len: 1 },
  56: { d: 2, v: 0.70, len: 3 },  62: { d: 1, v: 0.45, len: 1 },
};

const VOL = 0.9;
const MUTE_KEY = "museum-muted";

// ---------------- Scales (semitone sets from the key root) ----------------

const SC = {
  major:    [0, 2, 4, 5, 7, 9, 11],
  dorian:   [0, 2, 3, 5, 7, 9, 10],
  pentaMaj: [0, 2, 4, 7, 9],
  pentaMin: [0, 3, 5, 7, 10],
  hijaz:    [0, 1, 4, 5, 7, 8, 10],
  dblharm:  [0, 1, 4, 5, 7, 8, 11],   // double harmonic / raga Bhairav
  shimmer:  [0, 2, 4, 6, 9, 11],      // dreamy, near-whole-tone
  slendro:  [0, 2, 5, 7, 9],          // gamelan-ish
};

// ---------------- Sampled instruments (FluidR3 GM soundfont) ----------------

const SAMPLE_BASES = [
  "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM/",
  "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/",
];
const NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const noteFile = (m) => NOTE_NAMES[m % 12] + (Math.floor(m / 12) - 1);

// friendly key → { gm folder name, sampled range }. Every ~4th semitone is
// fetched; playback pitch-shifts from the nearest sample (≤2 semitones).
const INSTRUMENTS = {
  piano:       { gm: "acoustic_grand_piano",  lo: 36, hi: 84 },
  strings:     { gm: "string_ensemble_1",     lo: 36, hi: 84 },
  cello:       { gm: "cello",                 lo: 26, hi: 60 },
  contrabass:  { gm: "contrabass",            lo: 26, hi: 50 },
  harp:        { gm: "orchestral_harp",       lo: 36, hi: 84 },
  flute:       { gm: "flute",                 lo: 55, hi: 88 },
  panflute:    { gm: "pan_flute",             lo: 55, hi: 86 },
  recorder:    { gm: "recorder",              lo: 58, hi: 86 },
  ocarina:     { gm: "ocarina",               lo: 58, hi: 86 },
  bottle:      { gm: "blown_bottle",          lo: 55, hi: 82 },
  shakuhachi:  { gm: "shakuhachi",            lo: 55, hi: 84 },
  oboe:        { gm: "oboe",                  lo: 55, hi: 84 },
  shanai:      { gm: "shanai",                lo: 55, hi: 82 },
  choir:       { gm: "choir_aahs",            lo: 41, hi: 79 },
  organ:       { gm: "church_organ",          lo: 33, hi: 79 },
  harpsichord: { gm: "harpsichord",           lo: 36, hi: 84 },
  guitar:      { gm: "acoustic_guitar_nylon", lo: 40, hi: 79 },
  sitar:       { gm: "sitar",                 lo: 45, hi: 79 },
  koto:        { gm: "koto",                  lo: 48, hi: 81 },
  dulcimer:    { gm: "dulcimer",              lo: 48, hi: 84 },
  celesta:     { gm: "celesta",               lo: 60, hi: 96 },
  glock:       { gm: "glockenspiel",          lo: 72, hi: 96 },
  vibes:       { gm: "vibraphone",            lo: 53, hi: 89 },
  marimba:     { gm: "marimba",               lo: 48, hi: 84 },
  kalimba:     { gm: "kalimba",               lo: 57, hi: 88 },
  bells:       { gm: "tubular_bells",         lo: 40, hi: 77 },
  taiko:       { gm: "taiko_drum",            lo: 36, hi: 60 },
  tom:         { gm: "melodic_tom",           lo: 38, hi: 62 },
  woodblock:   { gm: "woodblock",             lo: 60, hi: 76 },
};

// ---------------- Per-era orchestration palettes ----------------
// Layers: bass (bar roots) · pad (chord each bar, tails overlap into a bed) ·
// arp (broken-chord pattern) · mel (the shared motif) · perc (16-step pattern).
// tertian: pads/arps may include the in-scale third; modal: open fifths only.

const PALETTES = {
  hub: { scale: SC.major, tertian: true,
    bass: { inst: "cello", gain: 0.30 },
    pad:  { inst: "strings", gain: 0.13, send: 0.55 },
    arp:  { inst: "harp", gain: 0.26, density: 0.7, pattern: [0, 1, 2, 3, 2, 1], pan: -0.25 },
    mel:  { inst: "flute", gain: 0.30, send: 0.5, pan: 0.2 } },

  prehistoric: { scale: SC.pentaMin,
    bass: { inst: "contrabass", gain: 0.26 },
    pad:  { inst: "choir", gain: 0.10, oct: -1, send: 0.6 },
    mel:  { inst: "ocarina", gain: 0.28, send: 0.6, pan: 0.15 },
    perc: [{ inst: "taiko", midi: 43, gain: 0.4, steps: { 0: 0.9, 10: 0.35 } }] },

  andean: { scale: SC.pentaMaj,
    bass: { inst: "guitar", gain: 0.26, oct: 1 },
    arp:  { inst: "guitar", gain: 0.24, density: 0.65, pattern: [0, 2, 1, 2], pan: -0.3 },
    mel:  { inst: "panflute", gain: 0.32, send: 0.55, pan: 0.15 },
    perc: [{ inst: "woodblock", midi: 66, gain: 0.2, steps: { 4: 0.5, 12: 0.4, 15: 0.25 } },
           { inst: "tom", midi: 45, gain: 0.28, steps: { 0: 0.7, 8: 0.55 } }] },

  classical: { scale: SC.dorian, tertian: true,
    bass: { inst: "cello", gain: 0.28 },
    pad:  { inst: "strings", gain: 0.09, send: 0.6 },
    arp:  { inst: "harp", gain: 0.26, density: 0.7, pattern: [0, 1, 2, 3], pan: -0.25 },
    mel:  { inst: "oboe", gain: 0.24, send: 0.5, pan: 0.2 } },

  medieval: { scale: SC.dorian,
    bass: { inst: "organ", gain: 0.20 },
    pad:  { inst: "organ", gain: 0.11, send: 0.65 },
    mel:  { inst: "recorder", gain: 0.26, send: 0.55, pan: 0.15 },
    perc: [{ inst: "bells", midi: 57, gain: 0.12, steps: { 0: 0.5 } }] },

  renaissance: { scale: SC.major, tertian: true,
    bass: { inst: "cello", gain: 0.24 },
    pad:  { inst: "choir", gain: 0.08, send: 0.6 },
    arp:  { inst: "guitar", gain: 0.28, density: 0.75, pattern: [0, 2, 1, 3, 2, 1], pan: -0.25 },
    mel:  { inst: "recorder", gain: 0.24, send: 0.5, pan: 0.2 } },

  baroque: { scale: SC.major, tertian: true,
    bass: { inst: "cello", gain: 0.30 },
    pad:  { inst: "strings", gain: 0.10, send: 0.55 },
    arp:  { inst: "harpsichord", gain: 0.24, density: 0.85, pattern: [0, 2, 1, 2, 3, 2, 1, 2], pan: -0.25 },
    mel:  { inst: "flute", gain: 0.26, send: 0.5, pan: 0.2 } },

  romantic: { scale: SC.major, tertian: true,
    bass: { inst: "cello", gain: 0.30 },
    pad:  { inst: "strings", gain: 0.14, send: 0.6 },
    arp:  { inst: "piano", gain: 0.22, density: 0.5, pattern: [0, 1, 2, 3, 2, 1], pan: -0.2 },
    mel:  { inst: "piano", gain: 0.34, send: 0.5, pan: 0.1 } },

  impressionist: { scale: SC.shimmer, tertian: true,
    bass: { inst: "cello", gain: 0.22 },
    pad:  { inst: "strings", gain: 0.11, send: 0.7 },
    arp:  { inst: "celesta", gain: 0.22, density: 0.55, oct: 1, pattern: [0, 2, 3, 1], pan: -0.3 },
    mel:  { inst: "flute", gain: 0.24, send: 0.6, pan: 0.2 } },

  egyptian: { scale: SC.dblharm,
    bass: { inst: "contrabass", gain: 0.26 },
    pad:  { inst: "choir", gain: 0.08, oct: -1, send: 0.6 },
    arp:  { inst: "harp", gain: 0.24, density: 0.6, pattern: [0, 1, 2, 1], pan: -0.25 },
    mel:  { inst: "oboe", gain: 0.26, send: 0.55, pan: 0.2 },
    perc: [{ inst: "tom", midi: 43, gain: 0.30, steps: { 0: 0.8, 6: 0.3, 8: 0.6, 14: 0.3 } }] },

  persian: { scale: SC.hijaz,
    bass: { inst: "cello", gain: 0.26 },
    pad:  { inst: "strings", gain: 0.08, send: 0.6 },
    arp:  { inst: "dulcimer", gain: 0.28, density: 0.75, pattern: [0, 2, 1, 2, 3, 2], pan: -0.3 },
    mel:  { inst: "flute", gain: 0.26, send: 0.55, pan: 0.2 },
    perc: [{ inst: "tom", midi: 47, gain: 0.26, steps: { 0: 0.7, 5: 0.3, 8: 0.55, 11: 0.3 } }] },

  maqam: { scale: SC.hijaz,
    bass: { inst: "contrabass", gain: 0.26 },
    pad:  { inst: "choir", gain: 0.07, send: 0.6 },
    arp:  { inst: "guitar", gain: 0.28, density: 0.7, pattern: [0, 2, 1, 2], pan: -0.25 },
    mel:  { inst: "shanai", gain: 0.20, send: 0.55, pan: 0.2 },
    perc: [{ inst: "tom", midi: 45, gain: 0.26, steps: { 0: 0.7, 6: 0.35, 8: 0.55, 14: 0.3 } }] },

  indian: { scale: SC.dblharm,
    bass: { inst: "sitar", gain: 0.24, oct: 1 },       // tanpura-ish low sitar
    pad:  { inst: "strings", gain: 0.06, send: 0.6 },
    arp:  { inst: "sitar", gain: 0.28, density: 0.75, pattern: [0, 1, 2, 1, 3, 1], pan: -0.2 },
    mel:  { inst: "sitar", gain: 0.30, oct: 1, send: 0.5, pan: 0.15 },
    perc: [{ inst: "tom", midi: 50, gain: 0.24, steps: { 0: 0.7, 3: 0.3, 8: 0.55, 11: 0.35, 14: 0.25 } }] },

  eastasian: { scale: SC.pentaMin,
    bass: { inst: "cello", gain: 0.20 },
    pad:  { inst: "strings", gain: 0.06, send: 0.65 },
    arp:  { inst: "koto", gain: 0.30, density: 0.65, pattern: [0, 2, 1, 3], pan: -0.25 },
    mel:  { inst: "shakuhachi", gain: 0.28, send: 0.6, pan: 0.2 },
    perc: [{ inst: "woodblock", midi: 64, gain: 0.16, steps: { 6: 0.4, 14: 0.3 } }] },

  gamelan: { scale: SC.slendro,
    bass: { inst: "bells", gain: 0.14 },               // low tubular bell as gong
    arp:  { inst: "vibes", gain: 0.26, density: 0.8, pattern: [0, 2, 1, 3, 2, 1], pan: -0.25 },
    mel:  { inst: "glock", gain: 0.18, oct: 1, send: 0.55, pan: 0.2 },
    perc: [{ inst: "marimba", midi: 55, gain: 0.20, steps: { 2: 0.4, 6: 0.35, 10: 0.4, 14: 0.35 } }] },

  african: { scale: SC.pentaMaj,
    bass: { inst: "marimba", gain: 0.26 },
    arp:  { inst: "kalimba", gain: 0.30, density: 0.8, pattern: [0, 2, 1, 2, 3, 2], pan: -0.25 },
    mel:  { inst: "marimba", gain: 0.28, send: 0.4, pan: 0.15 },
    perc: [{ inst: "taiko", midi: 45, gain: 0.32, steps: { 0: 0.8, 8: 0.6, 12: 0.35 } },
           { inst: "woodblock", midi: 68, gain: 0.18, steps: { 4: 0.5, 10: 0.35, 15: 0.3 } }] },

  oceanic: { scale: SC.pentaMin,
    bass: { inst: "contrabass", gain: 0.24 },
    pad:  { inst: "choir", gain: 0.09, send: 0.65 },
    mel:  { inst: "bottle", gain: 0.30, send: 0.6, pan: 0.15 },   // conch-like
    perc: [{ inst: "woodblock", midi: 62, gain: 0.2, steps: { 4: 0.5, 7: 0.3, 12: 0.45 } },
           { inst: "taiko", midi: 41, gain: 0.3, steps: { 0: 0.75 } }] },

  modern: { scale: SC.major, tertian: true,
    bass: { inst: "contrabass", gain: 0.26 },
    pad:  { inst: "strings", gain: 0.10, send: 0.6 },
    arp:  { inst: "vibes", gain: 0.18, density: 0.45, pattern: [0, 2, 3, 1], pan: -0.25 },
    mel:  { inst: "piano", gain: 0.34, send: 0.5, pan: 0.1 } },
};

// eraKey (from world.locate) → palette id. Similar eras share a palette.
const ERA_PALETTE = {
  prehistoric: "prehistoric",
  hub: "hub",
  // Americas
  mesoamerica: "andean", andes: "andean", nativenorth: "andean",
  americas19: "modern", americasmodern: "modern",
  // Europe
  classical: "classical", medieval: "medieval", neolithic: "medieval",
  renaissance: "renaissance", baroque: "baroque", romantic: "romantic",
  impressionism: "impressionist", euromodern: "modern",
  // Middle East
  mesopotamia: "persian", persia: "persian",
  islamic: "maqam", ottoman: "maqam", memodern: "modern",
  // Asia
  indus: "indian", southasia: "indian",
  china: "eastasian", japan: "eastasian",
  seasia: "gamelan", asiamodern: "modern",
  // Africa
  egypt: "egyptian", kingdoms: "african", traditions: "african",
  // Oceania
  oceancient: "oceanic", ocevoyage: "oceanic", oceliving: "oceanic",
};

// ---------------- Sample loading ----------------

let ctx = null;
let master, reverbIn;
let schedTimer = null;
let stepCount = 0;
let nextStepTime = 0;

let active = PALETTES.hub;
let currentPaletteId = "hub";
let muted = false;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const instCache = new Map();   // key → { buffers: Map<midi, AudioBuffer> }

function loadInstrument(key) {
  let entry = instCache.get(key);
  if (entry) return entry.promise;
  const spec = INSTRUMENTS[key];
  entry = { buffers: new Map() };
  const midis = [];
  for (let m = spec.lo; m < spec.hi; m += 4) midis.push(m);
  midis.push(spec.hi);
  entry.promise = Promise.all(midis.map(async (m) => {
    for (const base of SAMPLE_BASES) {
      try {
        const res = await fetch(`${base}${spec.gm}-mp3/${noteFile(m)}.mp3`);
        if (!res.ok) continue;
        entry.buffers.set(m, await ctx.decodeAudioData(await res.arrayBuffer()));
        return;
      } catch { /* try the next mirror */ }
    }
  }));
  instCache.set(key, entry);
  return entry.promise;
}

function nearestSample(key, midi) {
  const entry = instCache.get(key);
  if (!entry || entry.buffers.size === 0) return null;
  let best = -1, bd = Infinity;
  for (const m of entry.buffers.keys()) {
    const d = Math.abs(m - midi);
    if (d < bd) { bd = d; best = m; }
  }
  return { buffer: entry.buffers.get(best), rate: Math.pow(2, (midi - best) / 12) };
}

function paletteInstruments(pal) {
  const keys = new Set();
  for (const layer of ["bass", "pad", "arp", "mel"]) if (pal[layer]) keys.add(pal[layer].inst);
  for (const p of pal.perc || []) keys.add(p.inst);
  return [...keys];
}

// Load the active palette first, then trickle in every other instrument so
// each room's ensemble is decoded before the player gets there.
function prefetchAll() {
  const queue = Object.keys(INSTRUMENTS).filter((k) => !instCache.has(k));
  const next = () => {
    const key = queue.shift();
    if (!key) return;
    loadInstrument(key).finally(() => setTimeout(next, 300));
  };
  next();
}

// ---------------- Graph ----------------

function makeIR(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // progressively darker tail: one-pole lowpass whose smoothing deepens
      lp += (0.4 - 0.38 * t) * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, decay) * 3;
    }
  }
  return buf;
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.attack.value = 0.01;
  comp.release.value = 0.3;
  master.connect(comp);
  comp.connect(ctx.destination);

  const conv = ctx.createConvolver();
  conv.buffer = makeIR(4.2, 2.6);
  const reverbReturn = ctx.createGain();
  reverbReturn.gain.value = 1.0;
  reverbIn = ctx.createGain();
  reverbIn.connect(conv);
  conv.connect(reverbReturn);
  reverbReturn.connect(master);

  muted = localStorage.getItem(MUTE_KEY) === "1";
  master.gain.setValueAtTime(muted ? 0 : VOL, ctx.currentTime);
}

// ---------------- Note playback ----------------

function playNote(instKey, midi, when, { gain = 0.3, dur = 0.8, atk = 0.004, rel = 0.5, send = 0.35, pan = 0 } = {}) {
  const hit = nearestSample(instKey, midi);
  if (!hit) return;                       // still downloading — the layer joins when ready
  const src = ctx.createBufferSource();
  src.buffer = hit.buffer;
  src.playbackRate.value = hit.rate;

  const g = ctx.createGain();
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan + (Math.random() - 0.5) * 0.1));
  src.connect(g);
  g.connect(p);
  p.connect(master);
  if (send > 0) {
    const s = ctx.createGain();
    s.gain.value = send;
    p.connect(s);
    s.connect(reverbIn);
  }

  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + atk);
  const hold = when + Math.max(atk, dur);
  g.gain.setValueAtTime(gain, hold);
  g.gain.exponentialRampToValueAtTime(0.0001, hold + rel);
  src.start(when);
  src.stop(hold + rel + 0.1);
}

// humanize: samples land a hair off the grid, at slightly varied strength
const jit = (when) => when + (Math.random() - 0.5) * 0.016;
const vjit = (v) => v * (0.88 + Math.random() * 0.24);

// In-scale chord tones above a root: open fifth, plus the third when the
// palette is tertian and the scale contains one.
function chordTones(scale, root, tertian) {
  const inScale = new Set(scale.map((s) => s % 12));
  const tones = [root, root + 7, root + 12];
  if (tertian) {
    for (const third of [root + 4, root + 3]) {
      if (inScale.has(((third % 12) + 12) % 12)) { tones.splice(1, 0, third); break; }
    }
  }
  return tones;
}

function degToSemi(scale, deg) {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  return scale[((deg % n) + n) % n] + 12 * oct;
}

// ---------------- Sequencer ----------------

function scheduleStep(step, when) {
  const pal = active;
  const bar = Math.floor(step / STEPS_PER_BAR);
  const inBar = step % STEPS_PER_BAR;
  const root = PROG[bar % PROG.length];
  // gentle 8-bar dynamic arc, peaking with the melody's bar-6 climax
  const swell = 0.88 + 0.12 * Math.sin(((bar % 8) / 8) * Math.PI * 2 - Math.PI / 2);

  if (pal.bass && inBar === 0) {
    const b = pal.bass;
    playNote(b.inst, BASS_MIDI + (b.oct || 0) * 12 + root, jit(when),
      { gain: vjit(b.gain), dur: STEP_DUR * 5, atk: 0.01, rel: 0.8, send: b.send ?? 0.15 });
  }
  if (pal.bass && inBar === 4 && Math.random() < 0.45) {
    const b = pal.bass;
    playNote(b.inst, BASS_MIDI + (b.oct || 0) * 12 + root + 7, jit(when),
      { gain: vjit(b.gain) * 0.6, dur: STEP_DUR * 3, atk: 0.01, rel: 0.7, send: b.send ?? 0.15 });
  }

  if (pal.pad && inBar === 0) {
    const p = pal.pad;
    const tones = chordTones(pal.scale, root, pal.tertian);
    tones.forEach((t, i) => {
      playNote(p.inst, PAD_MIDI + (p.oct || 0) * 12 + t, when,
        { gain: p.gain * swell, dur: STEP_DUR * STEPS_PER_BAR, atk: 1.2, rel: 2.5,
          send: p.send ?? 0.55, pan: (i % 2 ? 0.3 : -0.3) });
    });
  }

  if (pal.arp && Math.random() < (pal.arp.density ?? 0.6)) {
    const a = pal.arp;
    const tones = chordTones(pal.scale, root, pal.tertian);
    const pi = a.pattern[step % a.pattern.length];
    const semi = tones[pi % tones.length] + 12 * Math.floor(pi / tones.length);
    playNote(a.inst, ARP_MIDI + (a.oct || 0) * 12 + semi, jit(when),
      { gain: vjit(a.gain) * swell, dur: STEP_DUR * 0.9, rel: 0.6, send: a.send ?? 0.3, pan: a.pan ?? -0.25 });
  }

  const m = MOTIF[step];
  if (m && pal.mel) {
    const l = pal.mel;
    playNote(l.inst, MEL_MIDI + (l.oct || 0) * 12 + degToSemi(pal.scale, m.d), jit(when),
      { gain: l.gain * vjit(m.v) * swell, dur: STEP_DUR * m.len * 0.9, atk: 0.02, rel: 0.7,
        send: l.send ?? 0.5, pan: l.pan ?? 0.2 });
  }

  for (const drum of pal.perc || []) {
    const v = drum.steps[step % 16];
    if (v && Math.random() > 0.12) {
      playNote(drum.inst, drum.midi, jit(when),
        { gain: vjit(drum.gain * v * 2), dur: 0.05, rel: 0.4, send: drum.send ?? 0.2, pan: (Math.random() - 0.5) * 0.4 });
    }
  }
}

function schedulerTick() {
  while (nextStepTime < ctx.currentTime + 0.15) {
    scheduleStep(stepCount % LOOP_STEPS, nextStepTime);
    stepCount++;
    nextStepTime += STEP_DUR;
  }
}

function startScheduler() {
  if (schedTimer) return;
  nextStepTime = ctx.currentTime + 0.1;
  schedTimer = setInterval(schedulerTick, 30);
}

function stopScheduler() {
  clearInterval(schedTimer);
  schedTimer = null;
}

// ---------------- Public API ----------------

function idFor(loc) {
  if (!loc) return null;
  if (loc.eraKey && ERA_PALETTE[loc.eraKey]) return ERA_PALETTE[loc.eraKey];
  if (loc.region === "Prehistoric") return "prehistoric";
  if (loc.region === "The Grand Crossing") return "hub";
  return "modern";
}

// Room changes swap the orchestration at the next scheduled events; the old
// pad/bass tails ring out over the new ensemble, so the hand-off is a morph.
export function setRoom(loc) {
  const id = idFor(loc);
  if (!id || id === currentPaletteId) return;
  currentPaletteId = id;
  active = PALETTES[id] || PALETTES.modern;
  if (ctx) paletteInstruments(active).forEach(loadInstrument);
}

export function isMuted() {
  return ctx ? muted : localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(v) {
  muted = !!v;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (ctx) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : VOL, now + 0.25);
  }
}

export function toggleMute() {
  setMuted(!muted);
  return muted;
}

// Called from a user gesture (the "Enter the Museum" click). If the gesture is
// absent — the resume path calls begin() without one — the context stays
// suspended, so arm one-time listeners to resume on the first real interaction.
export function unlock() {
  if (!ctx) {
    build();
    paletteInstruments(active).forEach(loadInstrument);
    prefetchAll();
  }
  ctx.resume();
  if (ctx.state !== "running") {
    const arm = () => {
      ctx.resume();
      removeEventListener("pointerdown", arm);
      removeEventListener("keydown", arm);
    };
    addEventListener("pointerdown", arm);
    addEventListener("keydown", arm);
  }
  startScheduler();

  // Pause the audio graph while the tab is hidden — saves CPU/battery. The
  // step counter is preserved, so the song resumes where it left off.
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.visibilityState === "hidden") {
      stopScheduler();
      ctx.suspend();
    } else {
      ctx.resume().then(() => { nextStepTime = ctx.currentTime + 0.05; startScheduler(); });
    }
  });
}

// debug hook
if (typeof window !== "undefined") {
  window.__audio = {
    get ctx() { return ctx; },
    get currentPaletteId() { return currentPaletteId; },
    loaded() {
      const out = {};
      for (const [k, e] of instCache) out[k] = e.buffers.size;
      return out;
    },
    palettes: PALETTES, eraPalette: ERA_PALETTE,
    setRoom, toggleMute, isMuted,
  };
}
