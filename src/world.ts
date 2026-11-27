// Il mondo: profilo del terreno, case con i camini, oggetti in volo. Tutto deterministico (seed).
import { GOAL, MILESTONES } from "./config";

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const LAKE = [1240, 1480] as const;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Si scende dalle montagne verso Roma: pendio ripido all'inizio, poi colline, poi la campagna romana.
export function ground(x: number): number {
  if (x < 0) return 0;
  const descent = 150 * (Math.exp(-x / 650) - 1) - x * 0.004;
  const amp = smooth(60, 400, x) * (1 - 0.6 * smooth(3200, 4200, x));
  let hills = amp * (9 * Math.sin(x / 61 + 0.4) + 3.5 * Math.sin(x / 23 + 2) + 16 * Math.sin(x / 260 + 1.3));
  // il lago è piatto
  const lake = smooth(LAKE[0] - 60, LAKE[0], x) * (1 - smooth(LAKE[1], LAKE[1] + 60, x));
  hills *= 1 - lake;
  // l'Appennino: una gobba
  hills += 45 * Math.exp(-(((x - 2050) / 220) ** 2));
  // Piazza Navona: piano
  const piazza = smooth(GOAL - 150, GOAL - 60, x) * (1 - smooth(GOAL + 120, GOAL + 200, x));
  const h = descent + hills;
  return h * (1 - piazza) + (150 * (Math.exp(-GOAL / 650) - 1) - GOAL * 0.004) * piazza;
}
export const slope = (x: number) => (ground(x + 0.25) - ground(x - 0.25)) / 0.5;
export const isIce = (x: number) => x > LAKE[0] && x < LAKE[1];
export const LAKE_RANGE = LAKE;

export type House = {
  x: number; // centro
  w: number;
  h: number; // muri
  roof: number; // altezza del tetto
  base: number; // y del terreno (minimo sotto la casa)
  cx: number; // camino
  ch: number; // altezza camino sopra il colmo
  smoke: boolean;
  color: string;
  windows: number;
  served: number; // 0 no, 1 tetto, 2 camino (per run)
};

const WALLS = ["#c98f6b", "#d9b38c", "#b9775a", "#e3c9a2", "#a86f55", "#cf9e7a", "#9f8a78"];

export function buildHouses(): House[] {
  const r = rng(1225);
  const out: House[] = [];
  let x = 40;
  while (x < GOAL + 400) {
    const inLake = x > LAKE[0] - 30 && x < LAKE[1] + 30;
    const nearMark = MILESTONES.some((m) => Math.abs(m.x - x) < 45 && m.x > 300);
    if (!inLake && !nearMark) {
      // un paesino: 2–6 case vicine
      const n = 2 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const w = 7 + r() * 6;
        const hx = x + w / 2;
        const base = Math.min(ground(hx - w / 2), ground(hx), ground(hx + w / 2));
        const h = 4 + r() * 5;
        out.push({
          x: hx,
          w,
          h,
          roof: 2.5 + r() * 2.5,
          base,
          cx: (r() - 0.5) * w * 0.5,
          ch: 1.6 + r() * 1.4,
          smoke: r() < 0.6,
          color: WALLS[Math.floor(r() * WALLS.length)],
          windows: 1 + Math.floor(r() * 3),
          served: 0,
        });
        x += w + 2 + r() * 6;
      }
    }
    x += 60 + r() * 130;
  }
  return out;
}

export function chimneyTop(h: House) {
  // il colmo è al centro; il camino sta sulla falda
  const ridge = h.base + h.h + h.roof;
  const y = ridge - (Math.abs(h.cx) / (h.w / 2)) * h.roof + h.ch;
  return { x: h.x + h.cx, y };
}
export function roofY(h: House, x: number) {
  const d = Math.abs(x - h.x) / (h.w / 2 + 0.6);
  if (d > 1) return -Infinity;
  return h.base + h.h + h.roof * (1 - d);
}

export type ItemKind = "coin" | "panettone" | "crow";
export type Item = { kind: ItemKind; x: number; y: number; vx: number; t: number; taken: boolean };

// Oggetti per un run: monete in arco, panettoni, corvi. Più in alto e più avanti si guadagna di più.
export function buildItems(seed: number): Item[] {
  const r = rng(seed * 7919 + 17);
  const items: Item[] = [];
  let x = 30;
  while (x < GOAL + 600) {
    const g = ground(x);
    const roll = r();
    if (roll < 0.55) {
      // arco di monete
      const n = 4 + Math.floor(r() * 5);
      const alt = 5 + r() * (14 + x * 0.045);
      const arc = 2 + r() * 5;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const ix = x + i * 3.2;
        items.push({ kind: "coin", x: ix, y: Math.max(ground(ix) + 3, g + alt + Math.sin(t * Math.PI) * arc), vx: 0, t: r() * 6, taken: false });
      }
      x += n * 3.2;
    } else if (roll < 0.67) {
      items.push({ kind: "panettone", x, y: g + 8 + r() * (20 + x * 0.04), vx: 0, t: r() * 6, taken: false });
    } else if (roll < 0.85 && x > 120) {
      // stormo di corvi
      const n = 1 + Math.floor(r() * 3);
      const alt = 8 + r() * (25 + x * 0.04);
      for (let i = 0; i < n; i++)
        items.push({ kind: "crow", x: x + i * 4 + r() * 2, y: g + alt + (r() - 0.5) * 6, vx: -2 - r() * 3, t: r() * 6, taken: false });
    }
    x += 25 + r() * (x < 600 ? 30 : 55);
  }
  return items;
}

export type Tree = { x: number; h: number; w: number; tone: number };
export function buildTrees(): Tree[] {
  const r = rng(77);
  const out: Tree[] = [];
  let x = -60;
  while (x < GOAL + 500) {
    const city = x > 2600; // verso Roma meno abeti, più pini marittimi (stessa sagoma, più bassi)
    if (!isIce(x) && !(x > GOAL - 160 && x < GOAL + 160)) out.push({ x, h: (city ? 4 : 5) + r() * (city ? 3 : 6), w: 2.2 + r() * 1.6, tone: r() });
    x += 6 + r() * (x < 1000 ? 22 : 40);
  }
  return out;
}
