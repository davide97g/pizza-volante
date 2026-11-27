// Disegno del mondo: cielo, Vesuvio e mare, colline, prati, case con il panaro, monumenti, rampa, oggetti.
import { GOAL, MILESTONES } from "./config";
import type { Ramp } from "./sim";
import { chimneyTop, ground, isIce, LAKE_RANGE, rng, smokeTop, type House, type Item, type Tree } from "./world";

export type View = { g: CanvasRenderingContext2D; W: number; H: number; k: number; cx: number; cy: number; t: number };

export const sx = (v: View, x: number) => v.W / 2 + (x - v.cx) * v.k;
export const sy = (v: View, y: number) => v.H / 2 - (y - v.cy) * v.k;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// nuvole: posizioni fisse, parallasse lenta
const CLOUDS = (() => {
  const r = rng(42);
  return Array.from({ length: 9 }, () => ({ x: r(), y: 0.05 + r() * 0.35, s: 0.6 + r() * 0.9, p: r() }));
})();

// Giornata di sole d'inverno sul golfo: cielo azzurro, sole basso, nuvole.
export function drawSky(v: View, alt: number) {
  const { g, W, H } = v;
  const up = Math.min(1, Math.max(0, alt / 450));
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, up > 0.5 ? "#3f8fd6" : "#5aa9e6");
  sky.addColorStop(0.6, "#a9d8f2");
  sky.addColorStop(1, "#fbe3c2");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // sole
  const mx = W * 0.8 - (v.cx * 0.02) % 40;
  const my = H * 0.18;
  const mr = Math.max(26, Math.min(W, H) * 0.065);
  const halo = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 4.5);
  halo.addColorStop(0, "rgba(255,244,200,0.7)");
  halo.addColorStop(1, "rgba(255,244,200,0)");
  g.fillStyle = halo;
  g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  g.fillStyle = "#fff4c4";
  g.beginPath();
  g.arc(mx, my, mr, 0, Math.PI * 2);
  g.fill();
  // nuvole
  const off = v.cx * 0.8;
  for (const c of CLOUDS) {
    const span = W * 1.6;
    const x = (((c.x * span - off - v.t * 6 * c.s) % span) + span) % span - W * 0.3;
    const y = c.y * H;
    const r = Math.min(W, H) * 0.05 * c.s;
    g.fillStyle = "rgba(255,255,255,0.85)";
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.arc(x + r * 1.1, y - r * 0.4, r * 1.2, 0, Math.PI * 2);
    g.arc(x + r * 2.3, y, r * 0.95, 0, Math.PI * 2);
    g.rect(x, y, r * 2.3, r);
    g.fill();
  }
}

function horizon(v: View) {
  const gref = ground(Math.max(0, v.cx));
  return Math.max(v.H * 0.42, Math.min(v.H * 1.05, v.H * 0.62 + (v.cy - gref) * 0.6));
}

export function drawFar(v: View) {
  const { g, W, H } = v;
  const hz = horizon(v);
  // il mare all'orizzonte
  g.fillStyle = "#4f9cc8";
  g.fillRect(0, hz - H * 0.02, W, H);
  g.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 12; i++) {
    const x = ((i * 137 - v.cx * 1.5 + v.t * 8) % (W + 60) + W + 60) % (W + 60) - 30;
    g.fillRect(x, hz - H * 0.01 + (i % 3) * 4, 18, 2);
  }
  // il Vesuvio: due gobbe, pennacchio di fumo; si allontana verso la città
  const vx = W * 0.55 - ((v.cx * 0.25) % (W * 4));
  const fade = 1 - smooth(3000, 4200, v.cx) * 0.5;
  const h = H * 0.3 * fade;
  for (const off of [0, W * 4]) {
    const cx = vx + off;
    if (cx < -W || cx > W * 2) continue;
    g.fillStyle = "#7f93b8";
    g.beginPath();
    g.moveTo(cx - h * 2.6, hz);
    g.quadraticCurveTo(cx - h * 1.2, hz - h * 0.7, cx - h * 0.9, hz - h * 0.85); // Somma
    g.lineTo(cx - h * 0.45, hz - h * 0.72);
    g.quadraticCurveTo(cx - h * 0.2, hz - h * 1.02, cx, hz - h); // cratere
    g.lineTo(cx + h * 0.25, hz - h * 0.98);
    g.quadraticCurveTo(cx + h * 1.2, hz - h * 0.3, cx + h * 2.8, hz);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 4; i++) {
      const ph = (v.t * 0.05 + i / 4) % 1;
      g.beginPath();
      g.arc(cx + h * 0.1 + ph * h * 0.8, hz - h * 1.05 - ph * h * 0.5, h * (0.08 + ph * 0.15), 0, Math.PI * 2);
      g.fill();
    }
  }
  // la città all'orizzonte, verso la fine
  const city = smooth(2500, 3500, v.cx);
  if (city > 0.01) {
    g.globalAlpha = city;
    const o2 = v.cx * 2;
    for (let i = -1; i < W / 50 + 2; i++) {
      const base = Math.floor(o2 / 50) + i;
      const x = base * 50 - o2;
      const r = rng(base * 13 + 5)();
      const bh = 14 + r * 30;
      g.fillStyle = ["#e8c9a0", "#f0b7a0", "#f6e3c0", "#d9a77f"][Math.floor(r * 4)];
      g.fillRect(x, hz - bh, 44, bh + 4);
      g.fillStyle = "rgba(60,80,110,0.35)";
      for (let w = 0; w < 3; w++) g.fillRect(x + 6 + w * 13, hz - bh + 6, 4, 6);
      if (r > 0.8) {
        g.fillStyle = "#c9b28c";
        g.beginPath();
        g.arc(x + 22, hz - bh, 14, Math.PI, 0);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
}

export function drawHills(v: View) {
  const { g, W, H } = v;
  const hz = horizon(v) + H * 0.06;
  const off = v.cx * 3.2;
  const prof = (px: number) => {
    const u = px + off;
    return (0.5 + 0.3 * Math.sin(u * 0.006) + 0.2 * Math.sin(u * 0.017 + 2)) * H * 0.14;
  };
  g.fillStyle = "#8fb874";
  g.beginPath();
  g.moveTo(0, H);
  for (let px = 0; px <= W + 8; px += 8) g.lineTo(px, hz - prof(px));
  g.lineTo(W, H);
  g.fill();
  // casette bianche sparse sulle colline
  for (let i = -1; i < W / 40 + 2; i++) {
    const base = Math.floor(off / 40) + i;
    const r = rng(base * 31 + 7);
    if (r() < 0.5) continue;
    const x = base * 40 - off + r() * 30;
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const lx = x + j * 6;
      const y = hz - prof(lx) + 3 + r() * 8;
      g.fillStyle = r() < 0.5 ? "#fbefdc" : "#f2c879";
      g.fillRect(lx, y, 5, 4);
      g.fillStyle = "#c8643a";
      g.fillRect(lx - 0.5, y - 1, 6, 1.5);
    }
  }
}

export function drawGround(v: View) {
  const { g, W, H } = v;
  const x0 = v.cx - W / 2 / v.k;
  const step = 5 / v.k;
  const gy = sy(v, ground(Math.max(0, v.cx)));
  const grad = g.createLinearGradient(0, gy - 40, 0, Math.max(gy + 200, H));
  grad.addColorStop(0, "#9ccc6e");
  grad.addColorStop(0.18, "#6fa451");
  grad.addColorStop(1, "#8a6a45");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(-10, H + 10);
  for (let px = -10; px <= W + 10; px += 5) g.lineTo(px, sy(v, ground(x0 + (px / 5) * step)));
  g.lineTo(W + 10, H + 10);
  g.fill();
  // lungomare: basolato bagnato (si scivola) e il mare davanti
  const [l0, l1] = LAKE_RANGE;
  if (sx(v, l1) > 0 && sx(v, l0) < W) {
    const a = sx(v, l0);
    const b = sx(v, l1);
    const y = sy(v, ground((l0 + l1) / 2));
    g.fillStyle = "#8d8796";
    g.fillRect(a, y - 1, b - a, Math.max(10, 1.2 * v.k));
    g.fillStyle = "rgba(190,230,250,0.55)";
    for (let i = 0; i < 10; i++) {
      const xx = a + ((i * 97) % (b - a));
      g.fillRect(xx, y + 2, 24, 3);
    }
    // ringhiera
    g.strokeStyle = "#2a2233";
    g.lineWidth = Math.max(1, v.k * 0.08);
    g.beginPath();
    g.moveTo(a, y - v.k * 1.1);
    g.lineTo(b, y - v.k * 1.1);
    for (let xx = a; xx < b; xx += Math.max(8, v.k * 1.5)) {
      g.moveTo(xx, y);
      g.lineTo(xx, y - v.k * 1.1);
    }
    g.stroke();
  }
  // bordo d'erba
  g.strokeStyle = "#4f8a3a";
  g.lineWidth = Math.max(2, v.k * 0.22);
  g.beginPath();
  for (let px = -10; px <= W + 10; px += 5) {
    const x = x0 + (px / 5) * step;
    const y = sy(v, ground(x)) + 1;
    if (px === -10) g.moveTo(px, y);
    else g.lineTo(px, y);
  }
  g.stroke();
}

// ---------- oggetti del mondo, in metri con y in su ----------
function local(v: View, x: number, y: number) {
  const { g } = v;
  g.save();
  g.translate(sx(v, x), sy(v, y));
  g.scale(v.k, -v.k);
}
const lw = (v: View, px: number) => px / v.k;
const visible = (v: View, x: number, margin = 40) => {
  const p = sx(v, x);
  return p > -margin * v.k - 200 && p < v.W + margin * v.k + 200;
};

// pini a ombrello e limoni
export function drawTrees(v: View, trees: Tree[]) {
  const { g } = v;
  for (const t of trees) {
    if (!visible(v, t.x, 10)) continue;
    local(v, t.x, ground(t.x) - 0.3);
    if (t.tone < 0.6) {
      g.strokeStyle = "#6b4526";
      g.lineWidth = 0.45;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(0.8, t.h * 0.5, 0.3, t.h * 0.85);
      g.stroke();
      g.fillStyle = t.tone < 0.3 ? "#3f6b3a" : "#4b7a40";
      g.beginPath();
      g.ellipse(0.3, t.h * 0.9, t.w * 1.4, t.h * 0.16, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.beginPath();
      g.ellipse(0.1, t.h * 0.95, t.w * 1.1, t.h * 0.07, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillStyle = "#6b4526";
      g.fillRect(-0.2, 0, 0.4, t.h * 0.35);
      g.fillStyle = "#5c8f3f";
      g.beginPath();
      g.arc(0, t.h * 0.5, t.w * 0.9, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f6d43a";
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(Math.cos(i * 1.7) * t.w * 0.6, t.h * 0.5 + Math.sin(i * 2.3) * t.w * 0.55, 0.22, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }
}

export function drawHouses(v: View, houses: House[]) {
  const { g } = v;
  for (const h of houses) {
    if (!visible(v, h.x, 30)) continue;
    const c = chimneyTop(h);
    const sm = smokeTop(h);
    // fumo del forno a legna: colonna che spinge su
    if (h.smoke) {
      const top = sy(v, sm.y + 45);
      const col = g.createLinearGradient(0, sy(v, sm.y), 0, top);
      col.addColorStop(0, "rgba(255,255,255,0.3)");
      col.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = col;
      g.fillRect(sx(v, sm.x - 2.5), top, 5 * v.k, sy(v, sm.y) - top);
      g.fillStyle = "#f4f1ec";
      for (let i = 0; i < 14; i++) {
        const ph = (v.t * 0.3 + i / 14) % 1;
        const r = Math.max(2, (0.5 + ph * 1.8) * v.k);
        g.globalAlpha = (1 - ph) * (1 - ph) * 0.6;
        g.beginPath();
        g.arc(sx(v, sm.x + Math.sin(ph * 6 + i) * 0.8 * ph), sy(v, sm.y + 0.5 + ph * 42), r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    local(v, h.x, h.base);
    const hw = h.w / 2;
    g.fillStyle = "#b08d70";
    g.fillRect(-hw, -3, h.w, 3);
    g.fillStyle = h.color;
    g.fillRect(-hw, 0, h.w, h.h);
    g.strokeStyle = "#1c1426";
    g.lineWidth = lw(v, 1.5);
    g.strokeRect(-hw, 0, h.w, h.h);
    // finestre con le persiane verdi
    for (let i = 0; i < h.windows; i++) {
      const wx = -hw + ((i + 0.5) * h.w) / h.windows - 0.5;
      g.fillStyle = "#3f6b5a";
      g.fillRect(wx - 0.35, h.h * 0.45, 0.35, 1.5);
      g.fillRect(wx + 1, h.h * 0.45, 0.35, 1.5);
      g.fillStyle = h.served ? "#fff1a8" : "#2a3a55";
      g.fillRect(wx, h.h * 0.45, 1, 1.5);
      // panni stesi
      if ((i + Math.round(h.x)) % 3 === 0) {
        g.fillStyle = ["#c8443a", "#fbf3e4", "#3d6fb6"][i % 3];
        g.fillRect(wx - 0.2, h.h * 0.45 - 0.9, 0.6, 0.7);
      }
    }
    g.fillStyle = "#6b4526";
    g.fillRect(hw * 0.35, 0, 1.2, 2.2);
    // comignolo del forno
    if (h.smoke) {
      const smx = sm.x - h.x;
      g.fillStyle = "#c9a47e";
      g.fillRect(smx - 0.5, h.h, 1, sm.y - h.base - h.h);
      g.strokeRect(smx - 0.5, h.h, 1, sm.y - h.base - h.h);
    }
    // tetto di coppi
    g.fillStyle = "#c8643a";
    g.beginPath();
    g.moveTo(-hw - 0.6, h.h);
    g.lineTo(0, h.h + h.roof);
    g.lineTo(hw + 0.6, h.h);
    g.closePath();
    g.fill();
    g.stroke();
    // il panaro: cesto di vimini su un'asta, il bersaglio delle pizze
    const ccx = h.cx;
    const top = c.y - h.base;
    g.strokeStyle = "#5b3b22";
    g.lineWidth = 0.18;
    g.beginPath();
    g.moveTo(ccx, top - h.ch);
    g.lineTo(ccx, top - 0.9);
    g.stroke();
    g.fillStyle = "#d9a441";
    g.beginPath();
    g.moveTo(ccx - 0.9, top);
    g.lineTo(ccx + 0.9, top);
    g.lineTo(ccx + 0.6, top - 1);
    g.lineTo(ccx - 0.6, top - 1);
    g.closePath();
    g.fill();
    g.lineWidth = lw(v, 1.5);
    g.strokeStyle = "#1c1426";
    g.stroke();
    g.strokeStyle = "#a8742c";
    g.lineWidth = 0.1;
    g.beginPath();
    g.moveTo(ccx - 0.8, top - 0.4);
    g.lineTo(ccx + 0.8, top - 0.4);
    g.stroke();
    g.restore();
    if (h.served === 2) {
      const s = 0.8 + 0.2 * Math.sin(v.t * 6 + h.x);
      star(g, sx(v, c.x), sy(v, c.y + 2.5), Math.max(6, v.k * 0.9) * s, "#ffd23a");
    }
  }
}

export function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

// rampa: trampolino di legno su cavalletti, la pizzeria in cima
export function drawRamp(v: View, r: Ramp, lv: number) {
  const { g } = v;
  // la pizzeria di Gennarino, con l'insegna e il forno che fuma
  local(v, r.topX - 7, 0);
  g.fillStyle = "#f2c879";
  g.fillRect(-5, 0, 10, 6);
  g.fillStyle = "#c8643a";
  g.beginPath();
  g.moveTo(-6, 6);
  g.lineTo(0, 8.5);
  g.lineTo(6, 6);
  g.fill();
  g.fillStyle = "#c8443a";
  g.fillRect(-4.5, 4.2, 9, 1.4);
  g.fillStyle = "#3f6b5a";
  g.fillRect(-3.8, 1.5, 2.2, 2);
  g.fillRect(1.6, 1.5, 2.2, 2);
  g.fillStyle = "#ffb35c";
  g.fillRect(-3.4, 1.8, 1.4, 1.4);
  g.fillStyle = "#6b4526";
  g.fillRect(-0.7, 0, 1.4, 2.6);
  g.fillStyle = "#b08d70";
  g.fillRect(3, 6.5, 1, 3);
  g.restore();
  label(g, "PIZZERIA", sx(v, r.topX - 7), sy(v, 4.6) + Math.max(4, v.k * 0.45), Math.max(9, Math.min(16, v.k * 1.1)), "#fbf3e4");
  for (let i = 0; i < 3; i++) {
    const ph = (v.t * 0.3 + i / 3) % 1;
    g.globalAlpha = (1 - ph) * 0.6;
    g.fillStyle = "#f4f1ec";
    g.beginPath();
    g.arc(sx(v, r.topX - 3.5 + ph), sy(v, 9.5 + ph * 6), Math.max(3, v.k * (0.4 + ph)), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  // cavalletti
  const wood = ["#8a5a2e", "#7a4e28", "#6b4526", "#5b3b22", "#9aa3b5", "#c9a227"][lv];
  g.strokeStyle = "#3b2618";
  g.lineWidth = Math.max(1.5, v.k * 0.25);
  for (let i = 0; i < r.pts.length; i += 6) {
    const p = r.pts[i];
    g.beginPath();
    g.moveTo(sx(v, p.x), sy(v, p.y));
    g.lineTo(sx(v, p.x), sy(v, 0));
    g.stroke();
    if (i + 6 < r.pts.length) {
      const q = r.pts[i + 6];
      g.beginPath();
      g.moveTo(sx(v, p.x), sy(v, p.y * 0.5));
      g.lineTo(sx(v, q.x), sy(v, q.y * 0.15));
      g.stroke();
    }
  }
  // pista
  g.lineCap = "round";
  g.strokeStyle = "#1c1426";
  g.lineWidth = Math.max(4, v.k * 0.9);
  g.beginPath();
  for (const p of r.pts) g.lineTo(sx(v, p.x), sy(v, p.y));
  g.stroke();
  g.strokeStyle = wood;
  g.lineWidth = Math.max(2.5, v.k * 0.6);
  g.stroke();
  g.strokeStyle = "#f6e3c0";
  g.lineWidth = Math.max(1.5, v.k * 0.18);
  g.beginPath();
  for (const p of r.pts) g.lineTo(sx(v, p.x), sy(v, p.y + 0.35));
  g.stroke();
  // bandierina sul dente
  const lip = r.pts[r.pts.length - 1];
  local(v, lip.x, lip.y);
  g.fillStyle = "#1c1426";
  g.fillRect(-0.08, 0, 0.16, 2.6);
  g.fillStyle = "#c8443a";
  g.beginPath();
  g.moveTo(0.08, 2.6);
  g.lineTo(1.4 + Math.sin(v.t * 8) * 0.15, 2.2);
  g.lineTo(0.08, 1.8);
  g.fill();
  g.restore();
}

// cartelli delle tappe e monumenti
export function drawLandmarks(v: View, best: number) {
  const { g } = v;
  for (const m of MILESTONES) {
    if (!visible(v, m.x, 120)) continue;
    const y = ground(m.x);
    switch (m.name) {
      case "Il limoneto":
        for (let i = 0; i < 5; i++) {
          const lx = m.x + 4 + i * 4;
          local(v, lx, ground(lx));
          g.fillStyle = "#6b4526";
          g.fillRect(-0.2, 0, 0.4, 1.6);
          g.fillStyle = "#5c8f3f";
          g.beginPath();
          g.arc(0, 2.6, 1.6, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#f6d43a";
          for (let j = 0; j < 5; j++) {
            g.beginPath();
            g.arc(Math.cos(j * 1.3 + i) * 1.1, 2.6 + Math.sin(j * 2.1) * 1, 0.25, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        }
        break;
      case "Il campanile":
        local(v, m.x + 10, ground(m.x + 10) - 1);
        g.fillStyle = "#b9a38c";
        g.fillRect(-2.5, 0, 5, 26);
        g.fillStyle = "#2a2233";
        g.fillRect(-1.4, 20, 2.8, 3.2);
        g.fillStyle = "#c9a227";
        g.beginPath();
        g.arc(0, 21, 0.9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#7a2f2a";
        g.beginPath();
        g.moveTo(-3, 26);
        g.lineTo(0, 33);
        g.lineTo(3, 26);
        g.fill();
        g.fillStyle = "#f4f8ff";
        g.fillRect(-3, 25.8, 6, 0.4);
        g.restore();
        break;
      case "San Gregorio Armeno": {
        local(v, m.x + 8, ground(m.x + 8));
        g.fillStyle = "#6b4526";
        g.fillRect(-6, 0, 0.4, 5);
        g.fillRect(5.6, 0, 0.4, 5);
        g.fillStyle = "#c9a227";
        g.beginPath();
        g.moveTo(-7, 5);
        g.lineTo(0, 7.5);
        g.lineTo(7, 5);
        g.fill();
        g.fillStyle = "#ffcf6b";
        g.globalAlpha = 0.35;
        g.fillRect(-5.6, 0, 11.2, 5);
        g.globalAlpha = 1;
        g.fillStyle = "#2a2233";
        for (const [x, h] of [
          [-3.5, 2.2],
          [-1.5, 1.4],
          [2, 2.4],
          [3.8, 1.2],
        ]) {
          g.beginPath();
          g.ellipse(x, h / 2, 0.55, h / 2, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.arc(x, h + 0.35, 0.4, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
        const sxp = sx(v, m.x + 8);
        const syp = sy(v, ground(m.x + 8) + 30);
        star(g, sxp, syp, Math.max(10, v.k * 2.2), "#ffe9a0");
        g.strokeStyle = "rgba(255,233,160,0.4)";
        g.lineWidth = Math.max(2, v.k * 0.3);
        g.beginPath();
        g.moveTo(sxp, syp);
        g.lineTo(sxp + 18 * v.k, syp - 6 * v.k);
        g.stroke();
        break;
      }
      case "Posillipo":
        local(v, m.x + 50, ground(m.x + 50));
        g.fillStyle = "#3b2618";
        g.fillRect(-0.2, 0, 0.4, 6);
        g.fillRect(-1.6, 4, 3.2, 0.4);
        g.restore();
        break;
      case "L'acquedotto":
        local(v, m.x - 10, 0);
        g.fillStyle = "#b5866a";
        for (let i = 0; i < 14; i++) {
          const ax = i * 7;
          const base = ground(m.x - 10 + ax) - 2;
          const top = y + 16;
          g.fillRect(ax, base, 1.6, top - base);
          g.fillRect(ax, top - 3, 7, 3);
          g.beginPath();
          g.arc(ax + 4.3, top - 3, 2.7, Math.PI, 0, true);
          g.fill();
        }
        g.fillRect(0, y + 16, 98, 1.5);
        g.restore();
        break;
      case "Il Maschio Angioino": {
        local(v, m.x + 15, ground(m.x + 15) - 1);
        g.fillStyle = "#8d8796";
        g.fillRect(-18, 0, 36, 18);
        for (const tx of [-18, -6, 6, 18]) {
          g.fillStyle = "#7a7484";
          g.beginPath();
          g.roundRect(tx - 4, 0, 8, 24, 1);
          g.fill();
          g.fillStyle = "#5b5568";
          for (let i = -3; i <= 3; i += 2) g.fillRect(tx + i - 0.6, 24, 1.2, 1.4);
        }
        g.fillStyle = "#f6e3c0";
        g.fillRect(-3, 0, 6, 12);
        g.fillStyle = "#4a2c22";
        g.beginPath();
        g.moveTo(-2, 0);
        g.lineTo(-2, 5);
        g.arc(0, 5, 2, Math.PI, 0, true);
        g.lineTo(2, 0);
        g.fill();
        g.restore();
        break;
      }
      case "Castel dell'Ovo":
        local(v, m.x + 14, ground(m.x + 14) - 1);
        g.fillStyle = "#b08d70";
        g.fillRect(-20, 0, 40, 8);
        g.fillStyle = "#c29e80";
        g.fillRect(-12, 8, 24, 14);
        g.fillStyle = "#a88468";
        g.fillRect(-5, 22, 10, 6);
        g.fillStyle = "#4a4f66";
        g.fillRect(-0.3, 28, 0.6, 3);
        g.beginPath();
        g.moveTo(-2.2, 30.5);
        g.lineTo(0, 29.5);
        g.lineTo(2.2, 30.5);
        g.lineTo(0, 30);
        g.fill();
        g.fillStyle = "#ffcf6b";
        for (let i = 0; i < 6; i++) g.fillRect(-10 + i * 4, 14, 1, 1.6);
        g.restore();
        break;
      case "Piazza del Plebiscito":
        drawPlebiscito(v, m.x);
        break;
    }
    // cartello
    if (m.name !== "Piazza del Plebiscito") {
      const passed = best >= m.x;
      local(v, m.x, y);
      g.fillStyle = "#5b3b22";
      g.fillRect(-0.15, 0, 0.3, 3.2);
      g.fillStyle = passed ? "#2f8f5b" : "#c9a227";
      g.fillRect(-2, 2.4, 4, 1.4);
      g.restore();
      const fs = Math.max(11, Math.min(18, v.k * 0.9));
      label(g, m.name, sx(v, m.x), sy(v, y + 4.2), fs, "#fbf3e4");
      label(g, `${m.x} m`, sx(v, m.x), sy(v, y + 4.2) + fs * 1.1, fs * 0.8, "#f2c14e");
    }
  }
}

function drawPlebiscito(v: View, x: number) {
  const { g } = v;
  const y = ground(x);
  local(v, x, y);
  // San Francesco di Paola: pronao con colonne, cupola, colonnato a emiciclo
  g.fillStyle = "#e8dcc6";
  g.fillRect(-60, 0, 120, 9);
  g.fillStyle = "#cdbfa6";
  for (let i = 0; i < 40; i++) g.fillRect(-58 + i * 3, 0, 1, 8);
  g.fillStyle = "#efe4cf";
  g.fillRect(-60, 9, 120, 1.5);
  g.fillStyle = "#e8dcc6";
  g.fillRect(14, 0, 24, 16);
  g.beginPath();
  g.moveTo(12, 16);
  g.lineTo(26, 22);
  g.lineTo(40, 16);
  g.fill();
  g.beginPath();
  g.arc(26, 26, 10, Math.PI, 0, true);
  g.fill();
  g.fillRect(25, 35, 2, 4);
  g.fillStyle = "#cdbfa6";
  for (let i = 0; i < 6; i++) g.fillRect(15.5 + i * 4, 0, 1.4, 15);
  // palco del concerto
  g.fillStyle = "#2a2233";
  g.fillRect(-30, 0, 26, 3);
  g.fillRect(-31, 3, 1, 12);
  g.fillRect(-5, 3, 1, 12);
  g.fillRect(-32, 14, 30, 1.6);
  // folla
  const cols = ["#c8443a", "#3d6fb6", "#2f8f5b", "#f2c14e", "#2a2233"];
  for (let i = 0; i < 40; i++) {
    const px = -55 + i * 2.6;
    if (px > -32 && px < -3) continue;
    g.fillStyle = cols[i % 5];
    g.beginPath();
    g.ellipse(px, 0.9, 0.7, 1, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e9b48c";
    g.beginPath();
    g.arc(px, 2.3 + Math.abs(Math.sin(v.t * 6 + i)) * 0.4, 0.45, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  // luci del palco
  for (let i = 0; i < 8; i++) {
    const lx = x - 30 + i * 3.6;
    g.fillStyle = ["#ffd27a", "#ff7a6b", "#7ad0ff", "#a6ff8a"][i % 4];
    g.globalAlpha = 0.6 + 0.4 * Math.sin(v.t * 7 + i);
    g.beginPath();
    g.arc(sx(v, lx), sy(v, y + 14.5), Math.max(2, v.k * 0.35), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const fs = Math.max(14, Math.min(26, v.k * 1.4));
  label(g, "PIAZZA DEL PLEBISCITO", sx(v, x), sy(v, y + 42), fs, "#f2c14e");
}

export function label(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "center") {
  g.font = `700 ${Math.round(size)}px Fredoka, system-ui, sans-serif`;
  g.textAlign = align;
  g.textBaseline = "alphabetic";
  g.lineJoin = "round";
  g.lineWidth = Math.max(3, size * 0.22);
  g.strokeStyle = "#1c1426";
  g.strokeText(s, x, y);
  g.fillStyle = col;
  g.fillText(s, x, y);
}

// bandiera del record
export function drawRecordFlag(v: View, x: number) {
  if (x < 20 || !visible(v, x, 10)) return;
  const { g } = v;
  local(v, x, ground(x));
  g.fillStyle = "#1c1426";
  g.fillRect(-0.1, 0, 0.2, 4.5);
  g.fillStyle = "#f2c14e";
  g.beginPath();
  g.moveTo(0.1, 4.5);
  g.lineTo(2 + Math.sin(v.t * 6) * 0.2, 3.9);
  g.lineTo(0.1, 3.3);
  g.fill();
  g.restore();
  label(g, "RECORD", sx(v, x), sy(v, ground(x) + 5.4), Math.max(10, Math.min(15, v.k * 0.8)), "#f2c14e");
}

export function drawItems(v: View, items: Item[]) {
  const { g } = v;
  const minR = 7;
  for (const it of items) {
    if (it.taken || !visible(v, it.x, 5)) continue;
    const X = sx(v, it.x);
    const Y = sy(v, it.y);
    if (it.kind === "coin") {
      // 500 lire bimetallica che gira
      const r = Math.max(minR, v.k * 0.75);
      const sxs = Math.abs(Math.cos(v.t * 3 + it.t));
      g.save();
      g.translate(X, Y);
      g.scale(Math.max(0.15, sxs), 1);
      g.fillStyle = "#1c1426";
      g.beginPath();
      g.arc(0, 0, r + 1.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e8c35a";
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#cfd5df";
      g.beginPath();
      g.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8f96a3";
      g.font = `700 ${Math.round(r * 0.75)}px Fredoka, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (sxs > 0.5) g.fillText("2€", 0, 1);
      g.restore();
    } else if (it.kind === "panettone") {
      const r = Math.max(minR * 1.5, v.k * 1.1);
      const bob = Math.sin(v.t * 3 + it.t) * r * 0.15;
      const glow = g.createRadialGradient(X, Y + bob, 0, X, Y + bob, r * 2.2);
      glow.addColorStop(0, "rgba(255,220,120,0.45)");
      glow.addColorStop(1, "rgba(255,220,120,0)");
      g.fillStyle = glow;
      g.fillRect(X - r * 2.2, Y + bob - r * 2.2, r * 4.4, r * 4.4);
      // sfogliatella riccia: conchiglia a strati
      g.lineWidth = 2;
      g.strokeStyle = "#1c1426";
      g.save();
      g.translate(X, Y + bob);
      g.beginPath();
      g.moveTo(-r, r * 0.4);
      g.quadraticCurveTo(-r * 0.9, -r * 0.9, r * 0.2, -r * 0.8);
      g.quadraticCurveTo(r * 1.1, -r * 0.5, r, r * 0.4);
      g.closePath();
      g.fillStyle = "#e3a64f";
      g.fill();
      g.stroke();
      g.strokeStyle = "#a8682a";
      g.lineWidth = 1.5;
      for (let i = 1; i < 5; i++) {
        g.beginPath();
        g.moveTo(-r + i * r * 0.4, r * 0.35);
        g.quadraticCurveTo(-r * 0.6 + i * r * 0.3, -r * 0.4, -r * 0.2 + i * r * 0.15, -r * 0.75);
        g.stroke();
      }
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (const [dx, dy] of [[-0.3, -0.5], [0.3, -0.6], [0.1, -0.2]]) g.fillRect(dx * r, dy * r, 2, 2);
      g.restore();
    } else {
      // gabbiano
      const r = Math.max(minR * 1.3, v.k * 0.9);
      const flap = Math.sin(v.t * 10 + it.t);
      g.save();
      g.translate(X, Y);
      g.lineWidth = 1.6;
      g.strokeStyle = "#1c1426";
      g.fillStyle = "#8d96a8";
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(-r * 0.1, -r * 0.1);
        g.quadraticCurveTo(side * r * 0.2, -r * 1.2 * flap, side * r * 1.6, -r * 0.9 * flap);
        g.lineTo(side * r * 0.3, r * 0.1);
        g.closePath();
        g.fill();
        g.stroke();
      }
      g.fillStyle = "#fbfbf7";
      g.beginPath();
      g.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(-r * 0.85, -r * 0.2, r * 0.35, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = "#f2c14e";
      g.beginPath();
      g.moveTo(-r * 1.15, -r * 0.25);
      g.lineTo(-r * 1.7, -r * 0.1);
      g.lineTo(-r * 1.15, -r * 0.02);
      g.fill();
      g.fillStyle = "#1c1426";
      g.beginPath();
      g.arc(-r * 0.92, -r * 0.3, r * 0.07, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
}

export const atGoal = (x: number) => x >= GOAL;
export { isIce };
