// Effetti e musica generati con Web Audio: nessun file audio esterno.
// Musica: una tarantella originale in La minore (mandolino col tremolo, tamburello, basso),
// e nel laboratorio la stessa melodia lenta su un carillon.

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noiseBuf: AudioBuffer;
let muted = false;
const VOL = 0.55;
try {
  muted = localStorage.getItem("pizza-volante-muted") === "1";
} catch {
  /* niente */
}

// vento e botti: rumori continui regolati ogni frame
let wind: { g: GainNode; f: BiquadFilterNode } | null = null;
let fire: { g: GainNode; f: BiquadFilterNode } | null = null;
let slide: { g: GainNode; f: BiquadFilterNode } | null = null;

function loop(freq: number, type: BiquadFilterType, q: number) {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = ctx!.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx!.createGain();
  g.gain.value = 0;
  s.connect(f).connect(g).connect(sfxBus);
  s.start();
  return { g, f };
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === "suspended") void ctx.resume();
    return;
  }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOL;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.2;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  wind = loop(600, "bandpass", 0.6);
  fire = loop(1800, "bandpass", 0.9);
  slide = loop(900, "lowpass", 0.5);
  startMusic();
}

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem("pizza-volante-muted", muted ? "1" : "0");
  } catch {
    /* niente */
  }
  if (ctx) master.gain.setTargetAtTime(muted ? 0 : VOL, ctx.currentTime, 0.02);
  return muted;
}
export const isMuted = () => muted;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const now = () => (ctx ? ctx.currentTime : 0);

function tone(bus: GainNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.03);
}

function noise(bus: GainNode, t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 0.7) {
  if (!ctx) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus);
  s.start(t, Math.random() * 1.5);
  s.stop(t + dur + 0.03);
}

// regolazione continua: vento con la velocità, botti, scivolata nella neve
export function setFlight(speed: number, boosting: boolean, sliding: number) {
  if (!ctx || !wind || !fire || !slide) return;
  const t = ctx.currentTime;
  const w = Math.min(1, speed / 90);
  wind.g.gain.setTargetAtTime(0.04 + w * 0.32, t, 0.08);
  wind.f.frequency.setTargetAtTime(300 + w * 1400, t, 0.08);
  fire.g.gain.setTargetAtTime(boosting ? 0.35 : 0, t, 0.03);
  slide.g.gain.setTargetAtTime(Math.min(0.5, sliding / 25), t, 0.05);
  slide.f.frequency.setTargetAtTime(400 + sliding * 40, t, 0.05);
}
export function quietFlight() {
  if (!ctx || !wind || !fire || !slide) return;
  const t = ctx.currentTime;
  for (const n of [wind, fire, slide]) n.g.gain.setTargetAtTime(0, t, 0.1);
}

export const sfx = {
  click() {
    const t = now();
    tone(sfxBus, "triangle", hz(84), hz(84), t, 0.05, 0.15);
  },
  buy() {
    // registratore di cassa: "ka-ching"
    const t = now();
    noise(sfxBus, t, 0.06, 0.4, "bandpass", 2500, 2);
    tone(sfxBus, "square", hz(88), hz(88), t + 0.07, 0.08, 0.08);
    [1, 2.7, 5.2].forEach((r, i) => tone(sfxBus, "sine", 1800 * r, 1790 * r, t + 0.1, 0.7 - i * 0.15, 0.12 / (i + 1)));
  },
  nope() {
    const t = now();
    tone(sfxBus, "square", 180, 150, t, 0.12, 0.1);
    tone(sfxBus, "square", 150, 120, t + 0.13, 0.16, 0.1);
  },
  go() {
    const t = now();
    [0, 4, 7, 12].forEach((s, i) => tone(sfxBus, "triangle", hz(69 + s), hz(69 + s), t + i * 0.05, 0.15, 0.15));
  },
  launch() {
    const t = now();
    noise(sfxBus, t, 0.5, 0.35, "bandpass", 900, 1.2);
    tone(sfxBus, "sine", 300, 900, t, 0.35, 0.12);
  },
  // fischio + scoppio del raudo all'accensione dei botti
  ignite() {
    const t = now();
    tone(sfxBus, "sine", 2400, 1200, t, 0.25, 0.08);
    noise(sfxBus, t + 0.02, 0.25, 0.6, "lowpass", 1400);
    tone(sfxBus, "sine", 120, 40, t, 0.25, 0.4);
  },
  crackle() {
    const t = now();
    for (let i = 0; i < 3; i++) noise(sfxBus, t + Math.random() * 0.06, 0.02, 0.25, "highpass", 3000 + Math.random() * 4000);
  },
  fizzle() {
    const t = now();
    noise(sfxBus, t, 0.4, 0.2, "highpass", 5000);
    tone(sfxBus, "sine", 900, 200, t, 0.3, 0.06);
  },
  coin(n: number) {
    const t = now();
    const b = 83 + (n % 5);
    tone(sfxBus, "square", hz(b), hz(b), t, 0.05, 0.06);
    tone(sfxBus, "square", hz(b + 5), hz(b + 5), t + 0.05, 0.12, 0.06);
  },
  panettone() {
    const t = now();
    [0, 4, 7, 11, 14].forEach((s, i) => tone(sfxBus, "triangle", hz(72 + s), hz(72 + s), t + i * 0.035, 0.18, 0.12));
  },
  crow() {
    // gracchio: sega dentata che cala, due volte
    const t = now();
    for (const k of [0, 0.14]) {
      tone(sfxBus, "sawtooth", 700, 380, t + k, 0.12, 0.14);
      noise(sfxBus, t + k, 0.1, 0.15, "bandpass", 1300, 3);
    }
    noise(sfxBus, t, 0.25, 0.2, "highpass", 2500); // piume
  },
  drop() {
    const t = now();
    tone(sfxBus, "sine", 800, 300, t, 0.25, 0.12);
    noise(sfxBus, t, 0.2, 0.15, "bandpass", 1500, 2);
  },
  chimney() {
    // centro! campanelle
    const t = now();
    [0, 4, 7, 12, 16].forEach((s, i) => {
      tone(sfxBus, "sine", hz(84 + s), hz(84 + s), t + i * 0.06, 0.6, 0.12);
      tone(sfxBus, "sine", hz(96 + s), hz(96 + s), t + i * 0.06, 0.3, 0.04);
    });
    noise(sfxBus, t, 0.15, 0.2, "lowpass", 600); // tonfo nel camino
  },
  roof() {
    const t = now();
    noise(sfxBus, t, 0.12, 0.3, "lowpass", 900);
    tone(sfxBus, "triangle", hz(76), hz(76), t + 0.05, 0.15, 0.1);
  },
  miss() {
    noise(sfxBus, now(), 0.15, 0.2, "lowpass", 500);
  },
  bounce(power: number) {
    const t = now();
    const v = Math.min(1, power / 20);
    noise(sfxBus, t, 0.25, 0.2 + v * 0.4, "lowpass", 700 + v * 800);
    tone(sfxBus, "sine", 200, 70, t, 0.2, 0.2 + v * 0.3);
  },
  crash() {
    const t = now();
    noise(sfxBus, t, 0.6, 0.7, "lowpass", 900);
    tone(sfxBus, "sine", 160, 40, t, 0.4, 0.5);
    // "ahia!" stilizzato: due note che scendono
    tone(sfxBus, "triangle", hz(81), hz(76), t + 0.12, 0.18, 0.1);
    tone(sfxBus, "triangle", hz(76), hz(69), t + 0.3, 0.3, 0.1);
  },
  milestone() {
    const t = now();
    [0, 7, 12, 16, 19, 24].forEach((s, i) => tone(sfxBus, "square", hz(69 + s), hz(69 + s), t + i * 0.07, 0.22, 0.06));
  },
  tick(i: number) {
    tone(sfxBus, "square", hz(72 + (i % 12)), hz(72 + (i % 12)), now(), 0.035, 0.05);
  },
  total() {
    const t = now();
    noise(sfxBus, t, 0.05, 0.3, "bandpass", 2500, 2);
    [0, 4, 7, 12].forEach((s, i) => tone(sfxBus, "triangle", hz(76 + s), hz(76 + s), t + i * 0.08, 0.3, 0.14));
  },
  record() {
    const t = now();
    [0, 4, 7, 12, 7, 12].forEach((s, i) => tone(sfxBus, "square", hz(76 + s), hz(76 + s), t + i * 0.09, 0.18, 0.07));
  },
  win() {
    const t = now();
    const mel = [69, 72, 76, 81, 79, 76, 77, 81, 84];
    mel.forEach((m, i) => {
      tone(sfxBus, "triangle", hz(m), hz(m), t + i * 0.14, 0.4, 0.14);
      tone(sfxBus, "sine", hz(m + 12), hz(m + 12), t + i * 0.14, 0.2, 0.05);
    });
    for (let i = 0; i < 8; i++) noise(sfxBus, t + 1.3 + i * 0.18, 0.4, 0.3, "lowpass", 800 + Math.random() * 1200);
  },
  firework() {
    const t = now();
    tone(sfxBus, "sine", 600, 2400, t, 0.5, 0.04);
    noise(sfxBus, t + 0.5, 0.6, 0.45, "lowpass", 1200);
    for (let i = 0; i < 6; i++) noise(sfxBus, t + 0.6 + Math.random() * 0.5, 0.03, 0.15, "highpass", 5000);
  },
};

// ---------- musica ----------
// Tarantella originale in La minore, 6/8: sei crome per battuta, 16 battute.
const PROG = [
  // basso per battuta (midi) + accordo
  [45, [57, 60, 64]], [45, [57, 60, 64]], [40, [56, 59, 64]], [40, [56, 59, 64]],
  [45, [57, 60, 64]], [45, [57, 60, 64]], [40, [56, 59, 62]], [45, [57, 60, 64]],
  [50, [57, 62, 65]], [50, [57, 62, 65]], [45, [57, 60, 64]], [45, [57, 60, 64]],
  [47, [59, 62, 65]], [40, [56, 59, 64]], [40, [56, 59, 62]], [45, [57, 60, 64]],
] as [number, number[]][];
// melodia: -1 pausa, 0 = tieni la nota di prima
const MEL = [
  76, 0, 72, 69, 72, 76,  81, 0, 0, 79, 77, 76,  74, 0, 71, 68, 71, 74,  76, 0, 0, 0, 0, -1,
  76, 0, 72, 69, 72, 76,  81, 0, 83, 84, 83, 81,  80, 0, 76, 74, 71, 68,  69, 0, 0, 0, 0, -1,
  77, 0, 74, 69, 74, 77,  81, 0, 0, 77, 76, 74,  76, 0, 72, 69, 72, 76,  81, 0, 79, 77, 76, 72,
  74, 0, 71, 74, 77, 74,  76, 0, 0, 72, 71, 68,  71, 0, 74, 71, 68, 64,  69, 0, 0, 0, 0, -1,
];

type Mode = "off" | "title" | "shop" | "fly";
let mode: Mode = "off";
let timer = 0;
let nextT = 0;
let stepN = 0;

function mandolin(m: number, t: number, len: number, vol: number) {
  // tremolo: note ripetute veloci con un pizzico di rumore
  const n = Math.max(1, Math.round(len / 0.045));
  for (let i = 0; i < n; i++) {
    const tt = t + i * 0.045;
    tone(musicBus, "triangle", hz(m), hz(m), tt, 0.07, vol * (i === 0 ? 1 : 0.6));
    tone(musicBus, "square", hz(m + 12), hz(m + 12), tt, 0.03, vol * 0.12);
  }
}

function bell(m: number, t: number, vol: number) {
  tone(musicBus, "sine", hz(m + 12), hz(m + 12), t, 1.1, vol);
  tone(musicBus, "sine", hz(m + 24) * 1.003, hz(m + 24), t, 0.4, vol * 0.25);
}

function schedule() {
  if (!ctx) return;
  const fast = mode === "fly";
  const e = fast ? 0.105 : mode === "title" ? 0.16 : 0.2; // durata di una croma
  while (nextT < ctx.currentTime + 0.3) {
    const t = nextT;
    const bar = Math.floor(stepN / 6) % PROG.length;
    const sub = stepN % 6;
    const [bass, chord] = PROG[bar];
    const m = MEL[stepN % MEL.length];
    // lunghezza della nota: conta gli "0" che seguono
    let len = 1;
    while (MEL[(stepN + len) % MEL.length] === 0 && len < 6) len++;
    if (fast) {
      if (sub === 0 || sub === 3) {
        tone(musicBus, "triangle", hz(bass), hz(bass), t, e * 2.5, 0.45);
        tone(musicBus, "sine", hz(bass - 12), hz(bass - 12), t, e * 2, 0.35);
      }
      if (sub === 1 || sub === 2 || sub === 4 || sub === 5)
        for (const c of chord) tone(musicBus, "square", hz(c), hz(c), t, e * 0.6, 0.018);
      // tamburello
      noise(musicBus, t, sub === 0 || sub === 3 ? 0.12 : 0.05, sub === 0 || sub === 3 ? 0.18 : 0.08, "highpass", 6500);
      if (sub === 0 || sub === 3) noise(musicBus, t, 0.08, 0.2, "lowpass", 220);
      if (m > 0) mandolin(m + 12, t, e * len * 0.9, 0.09);
    } else {
      if (sub === 0) tone(musicBus, "sine", hz(bass), hz(bass), t, e * 5, 0.3);
      if (sub === 3) for (const c of chord) tone(musicBus, "sine", hz(c), hz(c), t, e * 2.5, 0.04);
      if (m > 0) bell(m, t, mode === "title" ? 0.11 : 0.08);
    }
    stepN++;
    nextT += e;
  }
}

export function music(m: Mode) {
  if (m === mode) return;
  const was = mode;
  mode = m;
  if (!ctx) return;
  if (m === "off") {
    clearInterval(timer);
    timer = 0;
    return;
  }
  if (was === "off" || !timer) {
    nextT = ctx.currentTime + 0.1;
    timer = window.setInterval(schedule, 70);
  }
  if (m === "fly") stepN = 0;
}

function startMusic() {
  if (mode !== "off" && !timer && ctx) {
    nextT = ctx.currentTime + 0.1;
    timer = window.setInterval(schedule, 70);
  }
}
