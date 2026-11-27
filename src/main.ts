import { initAudio, isMuted, music, quietFlight, setFlight, sfx, toggleMute } from "./audio";
import { BEFANA_UNIT, drawBefana } from "./befana";
import {
  BONUS,
  BOOST_FUEL,
  dateOf,
  EPIFANIA,
  G,
  GOAL,
  lire,
  MAGNET,
  MILESTONES,
  PAY,
  RAMP_DROP,
  SOCKS,
  TIME_SCALE,
  UPGRADES,
  BOOST_THRUST,
  BROOM_DRAG,
  type Levels,
  type Milestone,
  type UpKey,
} from "./config";
import {
  drawFar,
  drawGround,
  drawHills,
  drawHouses,
  drawItems,
  drawLandmarks,
  drawRamp,
  drawRecordFlag,
  drawSky,
  drawTrees,
  label,
  star,
  sx,
  sy,
  type View,
} from "./scenery";
import { board, player, setNick, submit, type Board } from "./scores";
import { buildRamp, newFlyer, rampAt, step, type Flyer, type Ramp } from "./sim";
import { buildHouses, buildItems, buildTrees, chimneyTop, ground, roofY, type House, type Item } from "./world";

// ---------- salvataggio ----------
type Save = {
  money: number;
  lv: Levels;
  run: number; // prossimo volo (1 = 1 dicembre)
  best: number;
  bestAlt: number;
  bestKmh: number;
  passed: number[];
  won: boolean;
  wonRun: number;
  chimneys: number;
  playTime: number;
};
const KEY = "vola-befana-save";
const fresh = (): Save => ({
  money: 0,
  lv: { rampa: 0, scopa: 0, botti: 0, calze: 0, cappello: 0 },
  run: 1,
  best: 0,
  bestAlt: 0,
  bestKmh: 0,
  passed: [],
  won: false,
  wonRun: 0,
  chimneys: 0,
  playTime: 0,
});
function load(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && typeof s.money === "number") return { ...fresh(), ...s, lv: { ...fresh().lv, ...s.lv } };
  } catch {
    /* niente */
  }
  return fresh();
}
let save = load();
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* pazienza */
  }
}

// ---------- canvas ----------
const canvas = document.getElementById("game") as HTMLCanvasElement;
const g = canvas.getContext("2d")!;
let W = 960;
let H = 720;
let DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
}
window.addEventListener("resize", resize);
resize();

const $ = (id: string) => document.getElementById(id)!;
const ui = {
  title: $("title"),
  shop: $("shop"),
  results: $("results"),
  win: $("win"),
  pause: $("pause"),
  touch: $("touch"),
  nickForm: $("nick") as HTMLFormElement,
  nickInput: $("nick-input") as HTMLInputElement,
  reset: $("reset"),
  cards: $("cards"),
  money: $("money"),
  date: $("date"),
  res: $("res"),
  rank: $("rank"),
  mute: $("mute"),
};

// ---------- stato ----------
type State = "title" | "shop" | "ready" | "fly" | "results" | "win";
let state: State = "title";
let paused = false;
let clock = 0;

const houses = buildHouses();
const trees = buildTrees();
const houseBuckets = new Map<number, House[]>();
for (const h of houses) {
  const b = Math.floor(h.x / 20);
  for (const k of [b - 1, b, b + 1]) {
    if (!houseBuckets.has(k)) houseBuckets.set(k, []);
    houseBuckets.get(k)!.push(h);
  }
}
const housesNear = (x: number) => houseBuckets.get(Math.floor(x / 20)) || [];

let ramp: Ramp = buildRamp(save.lv.rampa);
let f: Flyer = newFlyer(save.lv, ramp);
let items: Item[] = [];
type Sock = { x: number; y: number; vx: number; vy: number; rot: number; color: string };
let socks: Sock[] = [];
let socksLeft = 0;
const SOCK_COLORS = ["#d23c3c", "#2f8f5b", "#e9c46a", "#3d6fb6"];
type RunStats = { coins: number; chimney: number; roof: number; panettoni: number; crows: number; marks: Milestone[] };
let stats: RunStats = { coins: 0, chimney: 0, roof: 0, panettoni: 0, crows: 0, marks: [] };
let endT = 0;
let winNow = false;
let dizzy = 0;
let hitstop = 0;
let shake = 0;
let flash = 0;
let flashColor = "#fff";

// camera
const cam = { x: 0, y: 10, k: 30 };
let lastCam = { x: 0, y: 0 };

// particelle in coordinate mondo
type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number; kind: "dot" | "spark" | "puff" | "feather" | "star" };
const parts: P[] = [];
function emit(x: number, y: number, n: number, o: Partial<P> & { speed?: number; spread?: number; dir?: number }) {
  for (let i = 0; i < n; i++) {
    const a = (o.dir ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2);
    const s = (o.speed ?? 5) * (0.4 + Math.random() * 0.8);
    const life = (o.max ?? 0.8) * (0.6 + Math.random() * 0.6);
    parts.push({
      x,
      y,
      vx: Math.cos(a) * s + (o.vx ?? 0),
      vy: Math.sin(a) * s + (o.vy ?? 0),
      life,
      max: life,
      size: (o.size ?? 3) * (0.6 + Math.random() * 0.8),
      color: o.color ?? "#fff",
      grav: o.grav ?? 0,
      kind: o.kind ?? "dot",
    });
  }
  if (parts.length > 900) parts.splice(0, parts.length - 900);
}

// testi che volano su
type Pop = { x: number; y: number; text: string; color: string; life: number; size: number };
const pops: Pop[] = [];
function pop(x: number, y: number, text: string, color = "#f2c14e", size = 18) {
  pops.push({ x, y, text, color, life: 1.4, size });
}
let banner = { text: "", sub: "", life: 0, color: "#f2c14e" };
function showBanner(text: string, sub = "", color = "#f2c14e") {
  banner = { text, sub, life: 2.4, color };
}

// fiocchi di neve in coordinate schermo
const flakes = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.9, w: Math.random() * 6 }));

// ---------- input ----------
const keys = new Set<string>();
const touch = { up: false, down: false, boost: false };
let isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || location.search.includes("touch");
let dropQueued = false;

function typing(e: Event) {
  return e.target instanceof Node && ui.nickForm.contains(e.target) && !ui.title.hidden;
}
window.addEventListener("keydown", (e) => {
  if (typing(e)) return;
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  initAudio();
  if (k === "m") return toggleMuteUi();
  if (k === "p" || k === "escape") {
    if (state === "fly" || state === "ready") togglePause();
    return;
  }
  if (e.repeat) return;
  keys.add(k);
  if (paused) return;
  if (state === "ready" && (k === " " || k === "arrowup" || k === "enter" || k === "w")) startRun();
  else if (state === "fly" && ["x", "c", "enter", "arrowright", "d"].includes(k)) dropQueued = true;
  else if (state === "shop") {
    if (k === " " || k === "enter") goFly();
    const n = Number(k);
    if (n >= 1 && n <= UPGRADES.length) buy(UPGRADES[n - 1].key);
  } else if (state === "results" && (k === " " || k === "enter")) toShop();
  else if (state === "win" && (k === " " || k === "enter")) afterWin();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  touch.up = touch.down = touch.boost = false;
});

function holdButton(id: string, on: (v: boolean) => void) {
  const b = $(id);
  const set = (v: boolean) => {
    on(v);
    b.classList.toggle("on", v);
  };
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    isTouch = true;
    initAudio();
    b.setPointerCapture(e.pointerId);
    set(true);
  });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => set(false));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
}
holdButton("t-up", (v) => {
  touch.up = v;
  if (v && state === "ready") startRun();
});
holdButton("t-down", (v) => (touch.down = v));
holdButton("t-boost", (v) => {
  touch.boost = v;
  if (v && state === "ready") startRun();
});
holdButton("t-sock", (v) => {
  if (v && state === "fly") dropQueued = true;
});
canvas.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") isTouch = true;
  initAudio();
  if (state === "ready" && !paused) startRun();
});

$("mute").addEventListener("click", () => {
  initAudio();
  toggleMuteUi();
});
$("pause-btn").addEventListener("click", () => {
  if (state === "fly" || state === "ready") togglePause();
});
$("resume").addEventListener("click", () => togglePause());
$("quit").addEventListener("click", () => {
  paused = false;
  ui.pause.hidden = true;
  if (state === "fly") endRun(true);
  else toShop();
});
function toggleMuteUi() {
  toggleMute();
  ui.mute.textContent = isMuted() ? "✕" : "♪";
  ui.mute.setAttribute("aria-pressed", String(isMuted()));
}
ui.mute.textContent = isMuted() ? "✕" : "♪";
function togglePause() {
  paused = !paused;
  ui.pause.hidden = !paused;
  if (paused) quietFlight();
  sfx.click();
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && (state === "fly" || state === "ready") && !paused) togglePause();
});

// ---------- titolo ----------
ui.nickInput.value = player().nick || "";
ui.nickForm.addEventListener("submit", (e) => {
  e.preventDefault();
  setNick(ui.nickInput.value);
  ui.nickInput.blur();
  initAudio();
  sfx.go();
  toShop();
});
ui.reset.hidden = save.run <= 1;
ui.reset.addEventListener("click", () => {
  if (!confirm("Ricominciare dal 1 dicembre? Perdi soldi e potenziamenti.")) return;
  save = fresh();
  persist();
  ui.reset.hidden = true;
  sfx.click();
});
if (isTouch) $("title-hint").textContent = "Tasti ▲▼ per inclinarti · BOTTI per la spinta · CALZA nei camini";

function renderBoard(el: HTMLElement, b: Board | null) {
  if (!b || !b.rows.length) {
    el.innerHTML = b ? "<li class='empty'>Nessuno ancora: il primo sei tu</li>" : "<li class='empty'>Classifica offline</li>";
    return;
  }
  const fmt = (n: number) => `${fmtNum(n)} m`;
  el.innerHTML = b.rows.map((r) => `<li class="${r.me ? "me" : ""}"><span>${r.rank}</span><b>${r.me ? "TU" : r.tag}</b><em>${fmt(r.score)}</em></li>`).join("");
  if (b.me && b.me.rank && !b.rows.some((r) => r.me)) el.innerHTML += `<li class="me"><span>${b.me.rank}</span><b>TU</b><em>${fmt(b.me.score)}</em></li>`;
}
void board(5).then((b) => renderBoard($("board-title"), b));

const fmtNum = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

// ---------- laboratorio ----------
const TIPS = [
  "Consiglio: appena lasci la rampa tieni il muso un filo in su",
  "Consiglio: picchia per prendere velocità, poi tira su piano",
  "Consiglio: muso troppo in su = STALLO, e si cade",
  "Consiglio: i fumi dei camini ti spingono in alto",
  "Consiglio: segui i puntini, quando il cerchio è verde lancia la calza",
  "Consiglio: i panettoni ricaricano i botti",
  "Consiglio: atterra piatta, di muso è una musata",
  "Consiglio: i corvi frenano, passaci sopra",
  "Consiglio: le tappe nuove pagano un bonus la prima volta",
];
const ICONS: Record<UpKey, string> = {
  rampa: `<svg viewBox="0 0 48 48"><path d="M4 40 L4 10 Q10 32 44 34 L44 40 Z" fill="#9a6b3f" stroke="#1c1426" stroke-width="3" stroke-linejoin="round"/><path d="M4 10 Q10 32 44 34" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 40V26M24 40V31M36 40V33" stroke="#1c1426" stroke-width="2.5"/></svg>`,
  scopa: `<svg viewBox="0 0 48 48"><path d="M6 40 L40 8" stroke="#1c1426" stroke-width="6" stroke-linecap="round"/><path d="M6 40 L40 8" stroke="#8a5a2e" stroke-width="3.5" stroke-linecap="round"/><path d="M14 30 L4 46 M14 30 L9 47 M14 30 L14 47 M14 30 L1 42 M14 30 L19 46" stroke="#d9a441" stroke-width="3" stroke-linecap="round"/><rect x="11" y="27" width="7" height="6" rx="1" fill="#c0392b" stroke="#1c1426" stroke-width="2" transform="rotate(-42 14 30)"/></svg>`,
  botti: `<svg viewBox="0 0 48 48"><path d="M24 4 L31 14 L31 32 L17 32 L17 14 Z" fill="#c8443a" stroke="#1c1426" stroke-width="3" stroke-linejoin="round"/><rect x="17" y="18" width="14" height="5" fill="#f2c14e"/><path d="M20 34 L17 44 M24 34 L24 46 M28 34 L31 44" stroke="#f2a33a" stroke-width="3" stroke-linecap="round"/></svg>`,
  calze: `<svg viewBox="0 0 48 48"><path d="M16 6 H32 V28 L24 40 Q18 46 12 40 Q8 34 14 30 L16 28 Z" fill="#d23c3c" stroke="#1c1426" stroke-width="3" stroke-linejoin="round"/><rect x="14" y="5" width="20" height="8" rx="2" fill="#fbf3e4" stroke="#1c1426" stroke-width="3"/></svg>`,
  cappello: `<svg viewBox="0 0 48 48"><path d="M6 36 Q24 30 42 36 Q24 42 6 36 Z" fill="#2a2233" stroke="#1c1426" stroke-width="3"/><path d="M14 34 L26 6 L34 34 Z" fill="#2a2233" stroke="#1c1426" stroke-width="3" stroke-linejoin="round"/><circle cx="22" cy="22" r="2" fill="#f2c14e"/><circle cx="28" cy="28" r="1.6" fill="#f2c14e"/><circle cx="25" cy="14" r="1.4" fill="#f2c14e"/></svg>`,
};

function statLine(k: UpKey, l: number): string {
  switch (k) {
    case "rampa":
      return `${RAMP_DROP[l]} m di dislivello`;
    case "scopa":
      return `resistenza ${Math.round((BROOM_DRAG[l] / BROOM_DRAG[0]) * 100)}%`;
    case "botti":
      return l ? `${BOOST_FUEL[l].toFixed(1).replace(".", ",")} s di spinta, forza ${BOOST_THRUST[l]}` : "nessuna spinta";
    case "calze":
      return `${SOCKS[l]} calze per volo`;
    case "cappello":
      return l ? `+${Math.round(BONUS[l] * 100)}% lire, calamita ${MAGNET[l]} m` : "nessun bonus";
  }
}

function buildCards() {
  ui.cards.innerHTML = UPGRADES.map(
    (u, i) => `<div class="panel card" id="card-${u.key}">
      <div class="ic">${ICONS[u.key]}</div>
      <h3>${i + 1} · ${u.title}</h3>
      <div class="now"></div>
      <div class="pips">${u.levels
        .slice(1)
        .map(() => "<i></i>")
        .join("")}</div>
      <div class="desc"></div>
      <button type="button" data-k="${u.key}"></button>
    </div>`,
  ).join("");
  ui.cards.querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => {
      initAudio();
      buy(b.dataset.k as UpKey);
    }),
  );
}
buildCards();

function renderShop() {
  ui.money.textContent = lire(save.money);
  const left = EPIFANIA - save.run;
  ui.date.textContent =
    left > 0
      ? `Volo del ${dateOf(save.run)} · mancano ${left} giorni all'Epifania`
      : left === 0
        ? `${dateOf(save.run)}: è l'Epifania!`
        : `${dateOf(save.run)} · in ritardo di ${-left} giorni`;
  if (save.won) ui.date.textContent = `Volo del ${dateOf(save.run)} · Piazza Navona raggiunta! Ora vola più lontano.`;
  for (const u of UPGRADES) {
    const l = save.lv[u.key];
    const card = $(`card-${u.key}`);
    const next = u.levels[l + 1];
    card.querySelector(".now")!.textContent = u.levels[l].name;
    card.querySelectorAll(".pips i").forEach((p, i) => p.classList.toggle("on", i < l));
    const desc = card.querySelector(".desc")!;
    const btn = card.querySelector("button")!;
    if (next) {
      desc.innerHTML = `<b>${next.name}</b>: ${next.desc}<br><span style="opacity:.75">${statLine(u.key, l)} → ${statLine(u.key, l + 1)}</span>`;
      btn.textContent = lire(next.cost);
      btn.className = next.cost > save.money ? "poor" : "";
    } else {
      desc.innerHTML = `${u.levels[l].desc}<br><span style="opacity:.75">${statLine(u.key, l)}</span>`;
      btn.textContent = "AL MASSIMO";
      btn.className = "max";
    }
  }
  // percorso
  const top = Math.max(GOAL, save.best);
  ($("route-fill") as HTMLElement).style.width = `${Math.min(100, (save.best / top) * 100)}%`;
  const bar = $("route-bar");
  bar.querySelectorAll(".route-tick").forEach((t) => t.remove());
  for (const m of MILESTONES.slice(0, -1)) {
    const t = document.createElement("i");
    t.className = `route-tick${save.best >= m.x ? " done" : ""}`;
    t.style.left = `${(m.x / top) * 100}%`;
    t.title = m.name;
    bar.append(t);
  }
  $("route-best").textContent = `Record: ${fmtNum(save.best)} m`;
  const nx = MILESTONES.find((m) => m.x > save.best);
  $("route-next").textContent = nx ? `Prossima tappa: ${nx.name} (${fmtNum(nx.x)} m)` : "Oltre Roma!";
  $("shop-hint").textContent = `${TIPS[(save.run - 1) % TIPS.length]}${isTouch ? "" : " · Tasti 1-5 per comprare, Spazio per volare"}`;
}

function buy(k: UpKey) {
  if (state !== "shop") return;
  const u = UPGRADES.find((x) => x.key === k)!;
  const next = u.levels[save.lv[k] + 1];
  const card = $(`card-${k}`);
  if (!next) return sfx.nope();
  if (next.cost > save.money) {
    sfx.nope();
    card.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 220 });
    return;
  }
  save.money -= next.cost;
  save.lv[k]++;
  persist();
  sfx.buy();
  card.classList.remove("bought");
  void card.offsetWidth;
  card.classList.add("bought");
  ui.money.classList.remove("pop");
  void ui.money.offsetWidth;
  ui.money.classList.add("pop");
  if (k === "rampa") ramp = buildRamp(save.lv.rampa);
  prepRun();
  renderShop();
}

function show(s: State) {
  state = s;
  ui.title.hidden = s !== "title";
  ui.shop.hidden = s !== "shop";
  ui.results.hidden = s !== "results";
  ui.win.hidden = s !== "win";
  ui.touch.hidden = !(isTouch && (s === "ready" || s === "fly"));
  ($("pause-btn") as HTMLElement).hidden = !(s === "ready" || s === "fly");
  ($("t-sock") as HTMLButtonElement).disabled = SOCKS[save.lv.calze] === 0;
  ($("t-boost") as HTMLButtonElement).disabled = false;
}

function toShop() {
  if (state === "results" && performance.now() - shownAt < 400) return;
  quietFlight();
  music("shop");
  ramp = buildRamp(save.lv.rampa);
  prepRun();
  show("shop");
  renderShop();
}

function goFly() {
  if (state !== "shop") return;
  sfx.go();
  prepRun();
  show("ready");
  music("fly");
}
$("go").addEventListener("click", () => {
  initAudio();
  goFly();
});
$("to-shop").addEventListener("click", () => toShop());

// ---------- volo ----------
function prepRun() {
  ramp = buildRamp(save.lv.rampa);
  f = newFlyer(save.lv, ramp);
  items = buildItems(save.run);
  socks = [];
  socksLeft = SOCKS[save.lv.calze];
  stats = { coins: 0, chimney: 0, roof: 0, panettoni: 0, crows: 0, marks: [] };
  for (const h of houses) h.served = 0;
  endT = 0;
  winNow = false;
  dizzy = 0;
  parts.length = 0;
  pops.length = 0;
  banner.life = 0;
  readyCam();
}

function readyCam() {
  const span = -ramp.topX + 30;
  cam.k = Math.min((W * 0.8) / span, (H * 0.6) / (ramp.topY + 12));
  cam.x = ramp.topX / 2 + 6;
  cam.y = ramp.topY / 2 + 2;
}

function startRun() {
  if (state !== "ready") return;
  state = "fly";
  sfx.go();
  emit(f.x, f.y, 10, { color: "#fff", speed: 3, size: 3, max: 0.6, kind: "puff" });
}

const befScale = () => Math.max(cam.k, Math.min(W, H) / 15);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sockHit(x0: number, y0: number, x1: number, y1: number): { kind: "chimney" | "roof" | "ground"; h?: House } | null {
  for (const h of housesNear(x1)) {
    const c = chimneyTop(h);
    if (y0 >= c.y && y1 < c.y) {
      const t = (y0 - c.y) / (y0 - y1 || 1);
      const xi = x0 + (x1 - x0) * t;
      if (Math.abs(xi - c.x) < 1.4) return { kind: "chimney", h };
    }
    if (Math.abs(x1 - h.x) < h.w / 2 + 0.6 && y1 < roofY(h, x1) && y1 > h.base) return { kind: "roof", h };
  }
  if (y1 < ground(x1)) return { kind: "ground" };
  return null;
}

function dropSock() {
  if (socksLeft <= 0 || f.phase === "ramp" || f.phase === "stop") return;
  socksLeft--;
  socks.push({ x: f.x, y: f.y - 0.5, vx: f.vx * 0.85, vy: f.vy * 0.85 - 2, rot: 0, color: SOCK_COLORS[socksLeft % 4] });
  sfx.drop();
}

function updateFly(dt: number) {
  // dt reale; il mondo gira TIME_SCALE volte più veloce
  const slow = hitstop > 0 ? 0.25 : 1;
  hitstop = Math.max(0, hitstop - dt);
  const gdt = dt * TIME_SCALE * slow;
  const up = keys.has("arrowup") || keys.has("w") || touch.up;
  const down = keys.has("arrowdown") || keys.has("s") || touch.down;
  const boost = keys.has(" ") || keys.has("shift") || touch.boost;
  if (dropQueued) {
    dropQueued = false;
    dropSock();
  }

  // colonne di fumo dei camini: spingono su
  let lift = 0;
  for (const h of housesNear(f.x)) {
    if (!h.smoke) continue;
    const c = chimneyTop(h);
    const dy = f.y - c.y;
    if (Math.abs(f.x - c.x) < 3.5 && dy > 0 && dy < 50) lift = Math.max(lift, 26 * (1 - dy / 50));
  }
  if (lift > 0 && Math.random() < 0.3) emit(f.x, f.y - 0.5, 1, { color: "#d9def0", speed: 2, vy: 4, size: 6, max: 0.5, kind: "puff" });

  const wasPhase = f.phase;
  const wasBoost = f.boosting;
  const hadFuel = f.fuel > 0;
  step(f, save.lv, ramp, { pitch: (up ? 1 : 0) - (down ? 1 : 0), boost }, gdt, lift);
  if (f.boosting && !wasBoost) {
    sfx.ignite();
    shake = Math.max(shake, 0.25);
  }
  if (hadFuel && f.fuel <= 0 && BOOST_FUEL[save.lv.botti] > 0) {
    sfx.fizzle();
    pop(f.x, f.y + 2, "botti finiti", "#fbf3e4", 14);
  }
  if (wasPhase === "ramp" && f.phase === "air") {
    sfx.launch();
    shake = 0.3;
    emit(f.x, f.y, 18, { color: "#fff", speed: 6, dir: Math.PI * 0.75, spread: 1.2, size: 4, max: 0.7, grav: -4, kind: "puff" });
  }
  const sc = befScale() / cam.k; // il personaggio è disegnato più grande del vero
  const v = Math.hypot(f.vx, f.vy);
  // scie
  if (f.boosting) {
    const tx = f.x - Math.cos(f.th) * 2.4 * sc;
    const ty = f.y - Math.sin(f.th) * 2.4 * sc;
    const back = f.th + Math.PI;
    emit(tx, ty, 3, { color: Math.random() < 0.5 ? "#ffd27a" : "#ff7a3a", speed: 14, dir: back, spread: 0.7, vx: f.vx * 0.6, vy: f.vy * 0.6, size: 3, max: 0.35, kind: "spark" });
    emit(tx, ty, 1, { color: "#ff4f6b", speed: 6, dir: back, spread: 1.6, vx: f.vx * 0.5, vy: f.vy * 0.5, size: 2.4, max: 0.6, grav: G, kind: "star" });
    if (Math.random() < 0.25) sfx.crackle();
  } else if (f.phase === "air" && v > 25 && Math.random() < 0.5) {
    emit(f.x - Math.cos(f.th) * 2 * sc, f.y - Math.sin(f.th) * 2 * sc, 1, { color: "#fff6dc", speed: 0.5, size: 2, max: 0.5, kind: "dot" });
  }
  if (f.phase === "ground" && Math.abs(f.vx) > 2) emit(f.x, f.y, 2, { color: "#fff", speed: Math.min(10, v * 0.3), dir: Math.PI * 0.7, spread: 0.8, size: 4, max: 0.5, grav: 8, kind: "puff" });

  // impatti
  if (f.impactKind === "crash") {
    sfx.crash();
    shake = 0.7;
    flash = 0.25;
    flashColor = "#fff";
    dizzy = 2.5;
    emit(f.x, f.y, 40, { color: "#fff", speed: 12, dir: Math.PI / 2, spread: 2.4, size: 6, max: 1, grav: 12, kind: "puff" });
    pop(f.x, f.y + 3, "MUSATA!", "#ff8a7a", 24);
  } else if (f.impactKind === "bounce") {
    sfx.bounce(f.lastImpact);
    shake = Math.max(shake, Math.min(0.5, f.lastImpact / 40));
    emit(f.x, f.y, 18, { color: "#fff", speed: 8, dir: Math.PI / 2, spread: 2, size: 5, max: 0.8, grav: 12, kind: "puff" });
  } else if (f.impactKind === "slide") {
    sfx.bounce(4);
    emit(f.x, f.y, 10, { color: "#fff", speed: 5, dir: Math.PI / 2, spread: 2, size: 4, max: 0.6, grav: 10, kind: "puff" });
  }
  setFlight(f.phase === "ramp" ? f.vs : v, f.boosting, f.phase === "ground" ? v : f.phase === "ramp" ? f.vs * 0.6 : 0);

  // oggetti
  const mag = MAGNET[save.lv.cappello];
  const bodyR = 1.2 * Math.min(2.2, sc);
  for (const it of items) {
    if (it.taken) continue;
    if (it.kind === "crow") it.x += it.vx * gdt;
    const dx = f.x - it.x;
    const dy = f.y + 0.4 - it.y;
    if (Math.abs(dx) > 30) continue;
    const d = Math.hypot(dx, dy);
    if (it.kind === "coin" && mag && d < mag + bodyR && f.phase !== "ramp") {
      it.x += (dx / d) * Math.min(d, 40 * gdt);
      it.y += (dy / d) * Math.min(d, 40 * gdt);
    }
    const r = it.kind === "coin" ? bodyR + 0.6 : it.kind === "panettone" ? bodyR + 1 : bodyR + 0.7;
    if (d < r) {
      it.taken = true;
      if (it.kind === "coin") {
        stats.coins++;
        sfx.coin(stats.coins);
        emit(it.x, it.y, 6, { color: "#f2c14e", speed: 4, size: 2.5, max: 0.4, kind: "spark" });
        pop(it.x, it.y + 1, "+500", "#f2c14e", 14);
      } else if (it.kind === "panettone") {
        stats.panettoni++;
        sfx.panettone();
        const maxF = BOOST_FUEL[save.lv.botti];
        if (maxF > 0) {
          f.fuel = Math.min(maxF, f.fuel + maxF * 0.5);
          pop(it.x, it.y + 2, "PANETTONE! botti +50%", "#ffe9a0", 18);
        } else {
          const s = 1 + 8 / Math.max(8, v);
          f.vx *= s;
          f.vy *= s;
          pop(it.x, it.y + 2, "PANETTONE! sprint", "#ffe9a0", 18);
        }
        emit(it.x, it.y, 20, { color: "#ffe9a0", speed: 8, size: 3, max: 0.7, kind: "star" });
        flash = 0.12;
        flashColor = "#ffe9a0";
      } else {
        stats.crows++;
        sfx.crow();
        f.vx *= 0.72;
        f.vy = f.vy * 0.72 - 2;
        f.th -= 0.3;
        shake = 0.45;
        hitstop = 0.12;
        emit(it.x, it.y, 14, { color: "#2a2233", speed: 7, size: 4, max: 1.4, grav: 2, kind: "feather" });
        pop(it.x, it.y + 2, "CRA!", "#fbf3e4", 22);
      }
    }
  }

  // calze in volo
  for (let i = socks.length - 1; i >= 0; i--) {
    const s = socks[i];
    const x0 = s.x;
    const y0 = s.y;
    s.vy -= G * gdt;
    s.vx *= 1 - 0.08 * gdt;
    s.x += s.vx * gdt;
    s.y += s.vy * gdt;
    s.rot += gdt * 6;
    const hit = sockHit(x0, y0, s.x, s.y);
    if (!hit) continue;
    socks.splice(i, 1);
    if (hit.kind === "chimney") {
      stats.chimney++;
      hit.h!.served = 2;
      const c = chimneyTop(hit.h!);
      sfx.chimney();
      hitstop = 0.15;
      shake = Math.max(shake, 0.2);
      emit(c.x, c.y, 30, { color: "#ffe27a", speed: 10, dir: Math.PI / 2, spread: 1.4, size: 3, max: 1, grav: 6, kind: "star" });
      emit(c.x, c.y + 1, 12, { color: "#555a70", speed: 4, dir: Math.PI / 2, spread: 0.8, size: 7, max: 1, kind: "puff" });
      pop(c.x, c.y + 3, `CENTRO! +${lire(PAY.chimney * (1 + BONUS[save.lv.cappello]))}`, "#ffe27a", 22);
    } else if (hit.kind === "roof") {
      stats.roof++;
      if (!hit.h!.served) hit.h!.served = 1;
      sfx.roof();
      emit(s.x, s.y, 10, { color: "#fff", speed: 5, dir: Math.PI / 2, spread: 2, size: 4, max: 0.6, grav: 8, kind: "puff" });
      pop(s.x, s.y + 2, `sul tetto +${lire(PAY.roof * (1 + BONUS[save.lv.cappello]))}`, "#fbf3e4", 15);
    } else {
      sfx.miss();
      emit(s.x, s.y, 8, { color: "#fff", speed: 4, dir: Math.PI / 2, spread: 2, size: 4, max: 0.5, grav: 8, kind: "puff" });
      pop(s.x, s.y + 2, "nella neve", "#c9c1dc", 13);
    }
  }

  // tappe
  for (const m of MILESTONES) {
    if (f.x >= m.x && !stats.marks.includes(m) && f.maxX - f.x < 1 && m.x > (stats.marks.at(-1)?.x ?? -1)) {
      stats.marks.push(m);
      if (m.x === GOAL) {
        if (!save.won) {
          winNow = true;
          sfx.win();
          showBanner("PIAZZA NAVONA!", "Ce l'hai fatta, Befana!", "#f2c14e");
          for (let i = 0; i < 6; i++) setTimeout(() => fireworks(), i * 350);
        } else showBanner("PIAZZA NAVONA", "di nuovo!", "#f2c14e");
      } else {
        const first = !save.passed.includes(m.x);
        sfx.milestone();
        showBanner(m.name.toUpperCase(), first ? `prima volta: +${lire(m.bonus)}` : `${fmtNum(m.x)} m`, first ? "#f2c14e" : "#fbf3e4");
      }
    }
  }

  dizzy = Math.max(0, dizzy - dt);
  if (f.phase === "stop") {
    endT += dt;
    quietFlight();
    if (endT > 1.1) endRun(false);
  }
}

function fireworks() {
  const x = f.x + (Math.random() - 0.3) * 40;
  const y = ground(f.x) + 25 + Math.random() * 25;
  const col = ["#f2c14e", "#ff6b6b", "#7ad0ff", "#a6ff8a", "#ff9ff3"][Math.floor(Math.random() * 5)];
  emit(x, y, 50, { color: col, speed: 16, size: 3, max: 1.4, grav: 4, kind: "spark" });
  sfx.firework();
}

// ---------- fine volo ----------
let shownAt = 0;
function endRun(quit: boolean) {
  if (state !== "fly" && state !== "ready") return;
  quietFlight();
  const air = f.air / TIME_SCALE;
  const kmh = Math.round(f.maxV * 3.6 * TIME_SCALE);
  const dist = Math.max(0, Math.round(f.maxX));
  const alt = Math.round(f.maxAlt);
  const bonus = BONUS[save.lv.cappello];
  const newMarks = stats.marks.filter((m) => !save.passed.includes(m.x) && m.bonus > 0);
  const rows: { k: string; v: string; pt: number; rec?: boolean }[] = [
    { k: "Distanza", v: `${fmtNum(dist)} m`, pt: dist * PAY.perMeter, rec: dist > save.best },
    { k: "Quota massima", v: `${alt} m`, pt: alt * PAY.perAltitude, rec: alt > save.bestAlt },
    { k: "Velocità massima", v: `${kmh} km/h`, pt: kmh * PAY.perKmh, rec: kmh > save.bestKmh },
    { k: "Tempo in volo", v: `${air.toFixed(1).replace(".", ",")} s`, pt: air * PAY.perSecond },
  ];
  if (stats.coins) rows.push({ k: "Monete da 500", v: `× ${stats.coins}`, pt: stats.coins * PAY.coin });
  if (stats.chimney || stats.roof)
    rows.push({ k: "Calze consegnate", v: `${stats.chimney} nel camino, ${stats.roof} sul tetto`, pt: stats.chimney * PAY.chimney + stats.roof * PAY.roof });
  let sub = rows.reduce((a, r) => a + r.pt, 0);
  if (bonus) {
    rows.push({ k: "Bonus cappello", v: `+${Math.round(bonus * 100)}%`, pt: sub * bonus });
    sub *= 1 + bonus;
  }
  for (const m of newMarks) {
    rows.push({ k: `Tappa: ${m.name}`, v: "prima volta", pt: m.bonus });
    sub += m.bonus;
  }
  if (quit) sub = Math.round(sub * 0.5);
  const total = Math.round(sub);
  save.money += total;
  save.best = Math.max(save.best, dist);
  save.bestAlt = Math.max(save.bestAlt, alt);
  save.bestKmh = Math.max(save.bestKmh, kmh);
  for (const m of stats.marks) if (!save.passed.includes(m.x)) save.passed.push(m.x);
  save.chimneys += stats.chimney;
  save.playTime += f.t / TIME_SCALE + 10;
  const day = save.run;
  save.run++;
  if (winNow) {
    save.won = true;
    save.wonRun = day;
  }
  persist();
  ui.reset.hidden = false;

  // pannello
  const record = dist > 0 && rows[0].rec;
  ui.res.innerHTML =
    `<h2>${quit ? "Volo interrotto" : record ? "Nuovo record!" : pick(OVER_LINES)}</h2><div class="small" style="color:#6a5a80;margin-bottom:6px">${dateOf(day)}${quit ? " · metà paga" : ""}</div>` +
    rows.map((r) => `<div class="row${r.rec ? " rec" : ""}"><span>${r.k}<br><small>${r.v}${r.rec ? " · record!" : ""}</small></span><b>${lire(r.pt)}</b></div>`).join("") +
    `<div class="row tot"><span>Totale</span><b id="tot">L. 0</b></div>`;
  const els = Array.from(ui.res.querySelectorAll(".row"));
  els.forEach((el, i) =>
    setTimeout(() => {
      el.classList.add("on");
      if (i < els.length - 1) sfx.tick(i * 2);
    }, 180 + i * 160),
  );
  const totEl = () => document.getElementById("tot");
  const t0 = 180 + els.length * 160;
  const steps = 18;
  for (let i = 1; i <= steps; i++)
    setTimeout(() => {
      const e = totEl();
      if (e) e.textContent = lire((total * i) / steps);
      if (i === steps) {
        sfx.total();
        if (record) setTimeout(() => sfx.record(), 250);
      }
    }, t0 + i * 35);
  ui.rank.textContent = " ";
  renderBoard($("board-res"), lastBoard);
  shownAt = performance.now();
  music("shop");
  if (winNow) {
    showWin(day);
  } else show("results");
  if (dist > 0) {
    void submit(dist, alt, stats.chimney).then((rank) => {
      if (rank) ui.rank.textContent = `Sei ${rank}° in classifica`;
      return board(5);
    }).then((b) => {
      lastBoard = b;
      renderBoard($("board-res"), b);
    });
  }
}
let lastBoard: Board | null = null;
const OVER_LINES = ["Atterrata!", "Che planata!", "Tutta neve!", "Si torna a casa", "Ahia, la schiena", "Ancora un po'!"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function showWin(day: number) {
  const left = EPIFANIA - day;
  $("win-text").textContent =
    left > 0
      ? `Arrivata il ${dateOf(day)}, ${left} giorni prima dell'Epifania. Le calze dei bambini sono salve!`
      : left === 0
        ? `Arrivata proprio il 6 gennaio. Giusto in tempo!`
        : `Arrivata il ${dateOf(day)}, in ritardo di ${-left} giorni. Meglio tardi che mai.`;
  const min = Math.max(1, Math.round(save.playTime / 60));
  $("win-stats").textContent = `${day} voli · circa ${min} minuti · ${save.chimneys} calze nei camini`;
  show("win");
}
function afterWin() {
  if (performance.now() - shownAt < 600) return;
  show("results");
}
$("win-go").addEventListener("click", afterWin);

// ---------- update ----------
function update(dt: number) {
  clock += dt;
  if (!paused) {
    if (state === "fly") updateFly(dt);
    updateFx(dt);
  }
  updateCam(dt);
}

function updateFx(dt: number) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      parts.splice(i, 1);
      continue;
    }
    p.vy -= p.grav * dt;
    const drag = p.kind === "puff" ? 2.5 : p.kind === "feather" ? 3 : 0.8;
    p.vx *= 1 - Math.min(1, drag * dt);
    p.vy *= 1 - Math.min(1, drag * dt);
    if (p.kind === "feather") p.vx += Math.sin(clock * 8 + i) * 6 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    pops[i].life -= dt;
    pops[i].y += dt * 3;
    if (pops[i].life <= 0) pops.splice(i, 1);
  }
  banner.life = Math.max(0, banner.life - dt);
  shake = Math.max(0, shake - dt * 1.6);
  flash = Math.max(0, flash - dt);
}

function updateCam(dt: number) {
  lastCam = { x: cam.x, y: cam.y };
  if (state === "title") {
    cam.k = Math.min(W, H) / 40;
    cam.x = 120 + clock * 14;
    cam.y = ground(cam.x) + H / cam.k * 0.3;
    return;
  }
  if (state === "ready" || state === "shop") {
    const span = -ramp.topX + 30;
    const tk = Math.min((W * 0.8) / span, (H * 0.55) / (ramp.topY + 12));
    cam.k = lerp(cam.k, tk, Math.min(1, dt * 4));
    cam.x = lerp(cam.x, ramp.topX / 2 + 6, Math.min(1, dt * 4));
    cam.y = lerp(cam.y, ramp.topY / 2 + 2, Math.min(1, dt * 4));
    return;
  }
  const v = f.phase === "ramp" ? f.vs : Math.hypot(f.vx, f.vy);
  const alt = Math.max(0, f.y - ground(f.x));
  const vh = Math.min(420, 24 + v * 0.75 + alt * 0.6);
  const tk = Math.min(W * 0.85, H) / vh;
  cam.k = lerp(cam.k, tk, Math.min(1, dt * 2));
  const viewW = W / cam.k;
  const viewH = H / cam.k;
  const tx = f.x + Math.max(-viewW * 0.1, Math.min(viewW * 0.22, f.vx * 0.35));
  const ty = Math.max(f.y - viewH * 0.05, ground(tx) + viewH * 0.32, f.phase === "ramp" ? ramp.topY * 0.4 : -1e9);
  cam.x = lerp(cam.x, tx, Math.min(1, dt * 8));
  cam.y = lerp(cam.y, ty, Math.min(1, dt * 5));
}

// ---------- draw ----------
function draw() {
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const sh = shake > 0 ? Math.min(10, shake * 18) : 0;
  const view: View = { g, W, H, k: cam.k, cx: cam.x + (Math.random() - 0.5) * (sh / cam.k), cy: cam.y + (Math.random() - 0.5) * (sh / cam.k), t: clock };
  drawSky(view, state === "fly" ? f.y - ground(f.x) : 0);
  drawFar(view);
  drawHills(view);
  drawGround(view);
  drawTrees(view, trees);
  drawLandmarks(view, save.best);
  drawHouses(view, houses);
  drawRecordFlag(view, save.best);
  if (state !== "title") {
    drawRamp(view, ramp, save.lv.rampa);
    drawItems(view, items);
    drawSocks(view);
    if (state === "fly" && f.phase === "air" && socksLeft > 0) drawAim(view);
    drawParts(view);
    drawPlayer(view);
  } else {
    drawParts(view);
    drawTitleBefana();
  }
  drawSnow(view);
  if (state === "fly" || state === "ready") drawHud(view);
  if (flash > 0) {
    g.globalAlpha = Math.min(0.5, flash * 2);
    g.fillStyle = flashColor;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }
}

function drawPlayer(v: View) {
  const s = befScale();
  let x = f.x;
  let y = f.y;
  let th = f.th;
  if (f.phase === "ramp" || f.phase === "ground" || f.phase === "stop") {
    // seduta sulla scopa, sollevata del giusto
    y += (0.62 * s) / v.k;
  }
  if (state === "ready") {
    const p = rampAt(ramp, 0);
    x = p.x;
    y = p.y + (0.62 * s) / v.k;
    th = p.ang * 0.6;
  }
  g.save();
  g.translate(sx(v, x), sy(v, y));
  g.rotate(-th);
  g.scale(s / BEFANA_UNIT, s / BEFANA_UNIT);
  const speed = f.phase === "ramp" ? f.vs : Math.hypot(f.vx, f.vy);
  drawBefana(g, {
    t: clock,
    wind: Math.min(1, speed / 40),
    boost: f.boosting,
    socks: socksLeft,
    blink: Math.sin(clock * 1.3) > 0.985,
    dizzy: dizzy > 0,
  });
  g.restore();
  if (dizzy > 0) {
    for (let i = 0; i < 3; i++) {
      const a = clock * 5 + (i * Math.PI * 2) / 3;
      star(g, sx(v, x) + Math.cos(a) * s * 0.6, sy(v, y) - s * 1.6 + Math.sin(a) * s * 0.2, s * 0.12, "#ffe27a");
    }
  }
  if (f.phase === "air" && f.stall && Math.floor(clock * 4) % 2 === 0) label(g, "STALLO!", sx(v, x), sy(v, y) - s * 2, 16, "#ff8a7a");
}

function drawTitleBefana() {
  const s = Math.min(W, H) / 8.5;
  const x = W * 0.5 + Math.sin(clock * 0.7) * W * 0.06;
  const y = H * 0.6 + Math.sin(clock * 1.4) * s * 0.15;
  if (Math.random() < 0.6) {
    const wx = cam.x + (x - W / 2) / cam.k - (2.3 * s) / cam.k;
    const wy = cam.y - (y - H / 2) / cam.k;
    emit(wx, wy, 1, { color: Math.random() < 0.5 ? "#ffe27a" : "#fff6dc", speed: 1, vx: -6, size: 2.5, max: 1.2, kind: "star" });
  }
  g.save();
  g.translate(x, y);
  g.rotate(-0.12 + Math.sin(clock * 1.4) * 0.05);
  g.scale(s / BEFANA_UNIT, s / BEFANA_UNIT);
  drawBefana(g, { t: clock, wind: 0.7, boost: false, socks: 4, blink: Math.sin(clock * 1.3) > 0.985 });
  g.restore();
}

function drawSocks(v: View) {
  for (const s of socks) {
    const r = Math.max(8, v.k * 0.6);
    g.save();
    g.translate(sx(v, s.x), sy(v, s.y));
    g.rotate(s.rot);
    g.fillStyle = s.color;
    g.strokeStyle = "#1c1426";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-r * 0.4, -r);
    g.lineTo(r * 0.4, -r);
    g.lineTo(r * 0.4, r * 0.3);
    g.quadraticCurveTo(r * 0.9, r * 0.5, r * 0.8, r);
    g.lineTo(-r * 0.4, r);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#fbf3e4";
    g.fillRect(-r * 0.45, -r, r * 0.9, r * 0.35);
    g.restore();
  }
}

// traiettoria prevista della prossima calza
function drawAim(v: View) {
  let x = f.x;
  let y = f.y - 0.5;
  let vx = f.vx * 0.85;
  let vy = f.vy * 0.85 - 2;
  const dt = 0.05;
  let hit: ReturnType<typeof sockHit> = null;
  g.fillStyle = "rgba(255,246,220,0.55)";
  for (let i = 0; i < 160 && !hit; i++) {
    const x0 = x;
    const y0 = y;
    vy -= G * dt;
    vx *= 1 - 0.08 * dt;
    x += vx * dt;
    y += vy * dt;
    hit = sockHit(x0, y0, x, y);
    if (i % 2 === 0) {
      g.beginPath();
      g.arc(sx(v, x), sy(v, y), 2, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (!hit) return;
  const col = hit.kind === "chimney" ? "#7dff9a" : hit.kind === "roof" ? "#ffe27a" : "rgba(255,255,255,0.5)";
  const X = sx(v, hit.kind === "chimney" ? chimneyTop(hit.h!).x : x);
  const Y = sy(v, hit.kind === "chimney" ? chimneyTop(hit.h!).y : y);
  g.strokeStyle = col;
  g.lineWidth = 2.5;
  g.beginPath();
  g.arc(X, Y, 8 + Math.sin(clock * 10) * 2, 0, Math.PI * 2);
  g.stroke();
  if (hit.kind === "chimney") label(g, "ORA!", X, Y - 14, 14, "#7dff9a");
}

function drawParts(v: View) {
  for (const p of parts) {
    const a = Math.min(1, p.life / p.max);
    const X = sx(v, p.x);
    const Y = sy(v, p.y);
    g.globalAlpha = p.kind === "puff" ? a * 0.8 : a;
    g.fillStyle = p.color;
    if (p.kind === "puff") {
      g.beginPath();
      g.arc(X, Y, p.size * (1.6 - a * 0.6), 0, Math.PI * 2);
      g.fill();
    } else if (p.kind === "spark") {
      g.strokeStyle = p.color;
      g.lineWidth = p.size * 0.7;
      g.beginPath();
      g.moveTo(X, Y);
      g.lineTo(X - p.vx * v.k * 0.02, Y + p.vy * v.k * 0.02);
      g.stroke();
    } else if (p.kind === "star") star(g, X, Y, p.size * 1.4, p.color);
    else if (p.kind === "feather") {
      g.save();
      g.translate(X, Y);
      g.rotate(Math.sin(clock * 6 + p.x) * 0.8);
      g.beginPath();
      g.ellipse(0, 0, p.size * 1.4, p.size * 0.45, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    } else g.fillRect(X - p.size / 2, Y - p.size / 2, p.size, p.size);
  }
  g.globalAlpha = 1;
  for (const p of pops) {
    g.globalAlpha = Math.min(1, p.life * 2);
    const s = p.size * (1 + Math.max(0, p.life - 1.2) * 2);
    label(g, p.text, sx(v, p.x), sy(v, p.y), s, p.color);
  }
  g.globalAlpha = 1;
}

function drawSnow(v: View) {
  const dx = (cam.x - lastCam.x) * cam.k;
  const dy = (cam.y - lastCam.y) * cam.k;
  const fast = Math.hypot(dx, dy);
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.fillStyle = "rgba(255,255,255,0.8)";
  for (const fl of flakes) {
    fl.x -= (dx * fl.z) / W;
    fl.y += (dy * fl.z) / H + 0.0009 * fl.z;
    fl.x += Math.sin(clock + fl.w) * 0.0003;
    fl.x = ((fl.x % 1) + 1) % 1;
    fl.y = ((fl.y % 1) + 1) % 1;
    const X = fl.x * W;
    const Y = fl.y * H;
    const r = fl.z * 2.2;
    if (fast > 6) {
      g.lineWidth = r;
      g.beginPath();
      g.moveTo(X, Y);
      g.lineTo(X + dx * fl.z * 1.5, Y - dy * fl.z * 1.5);
      g.stroke();
    } else {
      g.beginPath();
      g.arc(X, Y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  // linee di velocità
  const sp = Math.hypot(f.vx, f.vy);
  if (state === "fly" && sp > 45) {
    const a = Math.min(0.35, (sp - 45) / 120);
    g.strokeStyle = `rgba(255,255,255,${a})`;
    g.lineWidth = 2;
    const ang = Math.atan2(-f.vy, f.vx);
    for (let i = 0; i < 14; i++) {
      const r = (Math.sin(i * 91.7 + Math.floor(clock * 20) * 13.1) + 1) / 2;
      const y = (i / 14) * H + r * 30;
      const x = ((r * 997 + clock * 2000) % (W + 400)) - 200;
      g.beginPath();
      g.moveTo(W - x, y);
      g.lineTo(W - x - Math.cos(ang) * 120, y - Math.sin(ang) * 120);
      g.stroke();
    }
  }
  void v;
}

function drawHud(v: View) {
  const small = W < 600;
  const pad = small ? 12 : 18;
  const dist = Math.max(0, f.x);
  const big = small ? 30 : 40;
  label(g, `${fmtNum(dist)} m`, pad, pad + big, big, "#fbf3e4", "left");
  const v2 = f.phase === "ramp" ? f.vs : Math.hypot(f.vx, f.vy);
  const alt = Math.max(0, f.y - ground(f.x));
  label(g, `quota ${Math.round(alt)} m · ${Math.round(v2 * 3.6 * TIME_SCALE)} km/h`, pad, pad + big + 22, small ? 14 : 16, "#c9d6ff", "left");

  // percorso fino a Piazza Navona
  const top = Math.max(GOAL, save.best);
  const bw = small ? W - pad * 2 : Math.min(460, W - 520);
  const bx = small ? pad : (W - bw) / 2;
  const by = small ? pad + big + 44 : pad + 12;
  g.fillStyle = "rgba(28,20,38,0.6)";
  g.beginPath();
  g.roundRect(bx - 4, by - 4, bw + 8, 16, 8);
  g.fill();
  g.fillStyle = "#e3d6bf";
  g.fillRect(bx, by + 2, bw, 4);
  for (const m of MILESTONES) {
    const mx = bx + (m.x / top) * bw;
    g.fillStyle = save.passed.includes(m.x) || dist >= m.x ? "#7dff9a" : "#fbf3e4";
    g.fillRect(mx - 1, by - 1, 2, 10);
  }
  const bestX = bx + (save.best / top) * bw;
  g.fillStyle = "#f2c14e";
  g.beginPath();
  g.moveTo(bestX, by + 10);
  g.lineTo(bestX - 4, by + 16);
  g.lineTo(bestX + 4, by + 16);
  g.fill();
  const px = bx + Math.min(1, dist / top) * bw;
  g.fillStyle = "#c8443a";
  g.strokeStyle = "#1c1426";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(px, by + 4, 6, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  if (!small) label(g, "Piazza Navona", bx + bw, by + 30, 12, "#f2c14e", "right");

  // botti e calze (sotto i pulsanti in alto a destra)
  const rx = W - pad;
  let ry = small ? by + 26 : pad + 70;
  const maxF = BOOST_FUEL[save.lv.botti];
  if (maxF > 0) {
    const w = small ? 90 : 130;
    label(g, "BOTTI", rx - w - 8, ry + 10, 13, "#fbf3e4", "right");
    g.fillStyle = "rgba(28,20,38,0.7)";
    g.beginPath();
    g.roundRect(rx - w, ry, w, 12, 6);
    g.fill();
    const fr = f.fuel / maxF;
    g.fillStyle = f.boosting ? "#ffe27a" : fr > 0.25 ? "#ff7a3a" : "#c8443a";
    g.beginPath();
    g.roundRect(rx - w + 2, ry + 2, Math.max(0, (w - 4) * fr), 8, 4);
    g.fill();
    ry += 26;
  }
  const nS = SOCKS[save.lv.calze];
  for (let i = 0; i < nS; i++) {
    const x = rx - 8 - i * 16;
    g.globalAlpha = i < socksLeft ? 1 : 0.25;
    g.fillStyle = SOCK_COLORS[i % 4];
    g.strokeStyle = "#1c1426";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - 4, ry);
    g.lineTo(x + 3, ry);
    g.lineTo(x + 3, ry + 10);
    g.lineTo(x + 7, ry + 13);
    g.lineTo(x + 5, ry + 17);
    g.lineTo(x - 4, ry + 15);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#fbf3e4";
    g.fillRect(x - 4, ry, 7, 3);
  }
  g.globalAlpha = 1;

  if (state === "ready") {
    const pulse = 1 + Math.sin(clock * 6) * 0.05;
    label(g, isTouch ? "Tocca per partire!" : "Spazio per partire!", W / 2, H * 0.3, 30 * pulse, "#fbf3e4");
    label(
      g,
      isTouch ? "▲▼ inclinati · BOTTI spinta · CALZA nei camini" : "▲▼ inclinati · Spazio botti · X calza nel camino",
      W / 2,
      H * 0.3 + 32,
      small ? 13 : 17,
      "#c9d6ff",
    );
    label(g, dateOf(save.run), W / 2, H * 0.3 - 44, 20, "#f2c14e");
  }
  if (banner.life > 0) {
    const t = banner.life;
    const s = t > 2.1 ? 1 + (t - 2.1) * 2 : 1;
    g.globalAlpha = Math.min(1, t * 2);
    label(g, banner.text, W / 2, H * 0.26, (small ? 28 : 40) * s, banner.color);
    if (banner.sub) label(g, banner.sub, W / 2, H * 0.26 + (small ? 26 : 34), small ? 15 : 19, "#fbf3e4");
    g.globalAlpha = 1;
  }
  void v;
}

// ---------- loop ----------
let last = performance.now();
let acc = 0;
const STEP = 1 / 120;
function frame(t: number) {
  acc += Math.min(0.1, (t - last) / 1000);
  last = t;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  draw();
  requestAnimationFrame(frame);
}

show("title");
music("title");
if (location.hostname === "localhost")
  Object.assign(window, {
    __game: () => ({ state, f, save, cam, socksLeft, stats, keys: [...keys], paused }),
    __money: (n: number) => {
      save.money += n;
      persist();
      if (state === "shop") renderShop();
    },
  });
requestAnimationFrame(frame);
