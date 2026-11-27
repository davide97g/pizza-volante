// Disegno del mondo: cielo, montagne, colline, terreno innevato, case, monumenti, rampa, oggetti.
import { GOAL, MILESTONES } from "./config";
import type { Ramp } from "./sim";
import { chimneyTop, ground, isIce, LAKE_RANGE, rng, type House, type Item, type Tree } from "./world";

export type View = { g: CanvasRenderingContext2D; W: number; H: number; k: number; cx: number; cy: number; t: number };

export const sx = (v: View, x: number) => v.W / 2 + (x - v.cx) * v.k;
export const sy = (v: View, y: number) => v.H / 2 - (y - v.cy) * v.k;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// stelle fisse, generate una volta
const STARS = (() => {
  const r = rng(42);
  return Array.from({ length: 160 }, () => ({ x: r(), y: r() * r(), s: 0.6 + r() * 1.6, p: r() * 6 }));
})();

export function drawSky(v: View, alt: number) {
  const { g, W, H } = v;
  const up = Math.min(1, Math.max(0, alt / 400));
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, up > 0.5 ? "#070a1f" : "#0b1030");
  sky.addColorStop(0.55, "#1f2a62");
  sky.addColorStop(1, "#5b4b86");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // stelle con parallasse lentissima
  const off = v.cx * 0.6;
  for (const s of STARS) {
    const x = (((s.x * W * 1.5 - off) % (W * 1.5)) + W * 1.5) % (W * 1.5);
    if (x > W) continue;
    const a = 0.5 + 0.5 * Math.sin(v.t * 2 + s.p);
    g.globalAlpha = 0.35 + a * 0.6;
    g.fillStyle = "#fff6dc";
    g.fillRect(x, s.y * H * 0.8, s.s, s.s);
  }
  g.globalAlpha = 1;
  // luna con alone
  const mx = W * 0.8 - (v.cx * 0.02) % 40;
  const my = H * 0.2;
  const mr = Math.max(26, Math.min(W, H) * 0.07);
  const halo = g.createRadialGradient(mx, my, mr, mx, my, mr * 4);
  halo.addColorStop(0, "rgba(255,240,200,0.28)");
  halo.addColorStop(1, "rgba(255,240,200,0)");
  g.fillStyle = halo;
  g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
  g.fillStyle = "#fbefc9";
  g.beginPath();
  g.arc(mx, my, mr, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(200,180,140,0.35)";
  for (const [dx, dy, r] of [
    [-0.3, -0.2, 0.22],
    [0.25, 0.1, 0.16],
    [-0.05, 0.4, 0.12],
    [0.35, -0.35, 0.09],
  ]) {
    g.beginPath();
    g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2);
    g.fill();
  }
}

function horizon(v: View) {
  const gref = ground(Math.max(0, v.cx));
  return Math.max(v.H * 0.42, Math.min(v.H * 1.05, v.H * 0.62 + (v.cy - gref) * 0.6));
}

const tri = (x: number) => Math.abs(((x % 2) + 2) % 2 - 1);

export function drawFar(v: View) {
  const { g, W, H } = v;
  const hz = horizon(v);
  const rome = smooth(2500, 3500, v.cx);
  // Dolomiti: creste frastagliate con la neve in cima
  const off = v.cx * 1.2;
  const prof = (px: number) => {
    const u = px + off;
    return (0.55 + 0.25 * Math.sin(u * 0.004) + 0.2 * Math.sin(u * 0.011 + 1) + 0.22 * tri(u * 0.012) + 0.1 * tri(u * 0.041)) * H * 0.32 * (1 - rome * 0.75);
  };
  g.fillStyle = "#283163";
  g.beginPath();
  g.moveTo(0, H);
  for (let px = 0; px <= W + 8; px += 8) g.lineTo(px, hz - prof(px));
  g.lineTo(W, H);
  g.fill();
  // neve sulle cime
  g.fillStyle = "rgba(214,224,250,0.55)";
  g.beginPath();
  for (let px = 0; px <= W + 8; px += 8) {
    const h = prof(px);
    g.lineTo(px, hz - h);
  }
  for (let px = W + 8; px >= 0; px -= 8) {
    const h = prof(px);
    g.lineTo(px, hz - h + Math.max(0, h - H * 0.16) * 0.45);
  }
  g.fill();
  // Roma all'orizzonte: cupole e campanili
  if (rome > 0.01) {
    g.globalAlpha = rome;
    g.fillStyle = "#2e2f62";
    const o2 = v.cx * 2;
    for (let i = -1; i < W / 70 + 2; i++) {
      const base = Math.floor(o2 / 70) + i;
      const x = base * 70 - o2;
      const r = rng(base * 13 + 5)();
      const h = 18 + r * 40;
      g.fillRect(x, hz - h, 60, h + 4);
      if (r > 0.6) {
        g.beginPath();
        g.arc(x + 30, hz - h, 22, Math.PI, 0);
        g.fill();
        g.fillRect(x + 28, hz - h - 34, 4, 14);
      } else if (r < 0.25) g.fillRect(x + 8, hz - h - 30, 12, 30);
      g.fillStyle = "rgba(255,200,110,0.7)";
      for (let w = 0; w < 4; w++) if (rng(base * 7 + w)() > 0.4) g.fillRect(x + 8 + w * 12, hz - h + 8 + (w % 2) * 8, 3, 4);
      g.fillStyle = "#2e2f62";
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
  g.fillStyle = "#34407a";
  g.beginPath();
  g.moveTo(0, H);
  for (let px = 0; px <= W + 8; px += 8) g.lineTo(px, hz - prof(px));
  g.lineTo(W, H);
  g.fill();
  // lucine dei paesi
  for (let i = -1; i < W / 40 + 2; i++) {
    const base = Math.floor(off / 40) + i;
    const r = rng(base * 31 + 7);
    if (r() < 0.45) continue;
    const x = base * 40 - off + r() * 30;
    const n = 1 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      const lx = x + j * 5;
      g.fillStyle = r() < 0.5 ? "#ffd27a" : "#ffb35c";
      g.globalAlpha = 0.6 + 0.4 * Math.sin(v.t * 3 + base + j);
      g.fillRect(lx, hz - prof(lx) + 6 + r() * 10, 2, 2);
    }
  }
  g.globalAlpha = 1;
}

export function drawGround(v: View) {
  const { g, W, H } = v;
  const x0 = v.cx - W / 2 / v.k;
  const step = 5 / v.k;
  const gy = sy(v, ground(Math.max(0, v.cx)));
  const grad = g.createLinearGradient(0, gy - 40, 0, Math.max(gy + 200, H));
  grad.addColorStop(0, "#e9f0ff");
  grad.addColorStop(0.15, "#b9c6e8");
  grad.addColorStop(1, "#5d6aa6");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(-10, H + 10);
  for (let px = -10; px <= W + 10; px += 5) g.lineTo(px, sy(v, ground(x0 + (px / 5) * step)));
  g.lineTo(W + 10, H + 10);
  g.fill();
  // lago ghiacciato
  const [l0, l1] = LAKE_RANGE;
  if (sx(v, l1) > 0 && sx(v, l0) < W) {
    const a = sx(v, l0);
    const b = sx(v, l1);
    const y = sy(v, ground((l0 + l1) / 2));
    const ice = g.createLinearGradient(0, y, 0, y + 30);
    ice.addColorStop(0, "#bfe6f5");
    ice.addColorStop(1, "#6fa9cf");
    g.fillStyle = ice;
    g.fillRect(a, y - 1, b - a, Math.max(14, 1.5 * v.k));
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const xx = a + ((i * 97) % (b - a));
      g.beginPath();
      g.moveTo(xx, y + 4);
      g.lineTo(xx + 20, y + 3);
      g.stroke();
    }
  }
  // bordo di neve
  g.strokeStyle = "#ffffff";
  g.lineWidth = Math.max(2, v.k * 0.25);
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

export function drawTrees(v: View, trees: Tree[]) {
  const { g } = v;
  for (const t of trees) {
    if (!visible(v, t.x, 10)) continue;
    local(v, t.x, ground(t.x) - 0.3);
    g.fillStyle = "#4a3426";
    g.fillRect(-0.25, 0, 0.5, t.h * 0.2);
    const col = t.tone < 0.5 ? "#1f4a44" : "#245447";
    for (let i = 0; i < 3; i++) {
      const y0 = t.h * (0.15 + i * 0.25);
      const w = t.w * (1 - i * 0.25);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(-w, y0);
      g.lineTo(w, y0);
      g.lineTo(0, y0 + t.h * 0.45);
      g.closePath();
      g.fill();
      g.fillStyle = "#eef4ff";
      g.beginPath();
      g.moveTo(-w * 0.35, y0 + t.h * 0.29);
      g.lineTo(0, y0 + t.h * 0.45);
      g.lineTo(w * 0.35, y0 + t.h * 0.29);
      g.quadraticCurveTo(0, y0 + t.h * 0.33, -w * 0.35, y0 + t.h * 0.29);
      g.fill();
    }
    g.restore();
  }
}

export function drawHouses(v: View, houses: House[]) {
  const { g } = v;
  for (const h of houses) {
    if (!visible(v, h.x, 30)) continue;
    const c = chimneyTop(h);
    // fumo: colonna che sale (e spinge in su)
    if (h.smoke) {
      for (let i = 0; i < 7; i++) {
        const ph = (v.t * 0.35 + i / 7) % 1;
        const r = 0.8 + ph * 3.5;
        g.globalAlpha = (1 - ph) * 0.32;
        g.fillStyle = "#d9def0";
        g.beginPath();
        g.arc(sx(v, c.x + Math.sin(ph * 5 + i) * 1.2 + ph * 3), sy(v, c.y + 0.5 + ph * 45), r * v.k, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    local(v, h.x, h.base);
    const hw = h.w / 2;
    // fondamenta fino al terreno più basso
    g.fillStyle = "#6b5a54";
    g.fillRect(-hw, -3, h.w, 3);
    g.fillStyle = h.color;
    g.fillRect(-hw, 0, h.w, h.h);
    g.strokeStyle = "#1c1426";
    g.lineWidth = lw(v, 1.5);
    g.strokeRect(-hw, 0, h.w, h.h);
    // finestre calde
    const lit = h.served ? "#fff1a8" : "#ffcf6b";
    for (let i = 0; i < h.windows; i++) {
      const wx = -hw + ((i + 0.5) * h.w) / h.windows - 0.6;
      g.fillStyle = lit;
      g.fillRect(wx, h.h * 0.45, 1.2, 1.4);
      g.strokeRect(wx, h.h * 0.45, 1.2, 1.4);
    }
    g.fillStyle = "#4a2c22";
    g.fillRect(hw * 0.35, 0, 1.2, 2.2);
    // camino
    const ccx = h.cx;
    const top = c.y - h.base;
    g.fillStyle = "#8a5a44";
    g.fillRect(ccx - 0.55, h.h, 1.1, top - h.h);
    g.strokeRect(ccx - 0.55, h.h, 1.1, top - h.h);
    g.fillStyle = "#5a3a2e";
    g.fillRect(ccx - 0.75, top - 0.35, 1.5, 0.35);
    // tetto
    g.fillStyle = "#7a2f2a";
    g.beginPath();
    g.moveTo(-hw - 0.6, h.h);
    g.lineTo(0, h.h + h.roof);
    g.lineTo(hw + 0.6, h.h);
    g.closePath();
    g.fill();
    g.stroke();
    // neve sul tetto
    g.strokeStyle = "#f4f8ff";
    g.lineWidth = 0.45;
    g.beginPath();
    g.moveTo(-hw - 0.5, h.h + 0.2);
    g.lineTo(0, h.h + h.roof + 0.15);
    g.lineTo(hw + 0.5, h.h + 0.2);
    g.stroke();
    g.restore();
    if (h.served === 2) {
      // stellina sopra il camino servito
      const s = 0.8 + 0.2 * Math.sin(v.t * 6 + h.x);
      star(g, sx(v, c.x), sy(v, c.y + 2.5), Math.max(6, v.k * 0.9) * s, "#ffe27a");
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

// rampa: trampolino di legno su cavalletti, la casa della Befana in cima
export function drawRamp(v: View, r: Ramp, lv: number) {
  const { g } = v;
  // casetta della Befana
  local(v, r.topX - 7, 0);
  g.fillStyle = "#7d5a48";
  g.fillRect(-4, 0, 8, 6);
  g.fillStyle = "#3b2a33";
  g.beginPath();
  g.moveTo(-5, 6);
  g.lineTo(-0.5, 10.5);
  g.lineTo(5, 6);
  g.fill();
  g.fillStyle = "#f4f8ff";
  g.fillRect(-5, 6, 10, 0.4);
  g.fillStyle = "#ffcf6b";
  g.fillRect(-2.5, 2.5, 1.5, 1.5);
  g.fillRect(1.2, 2.5, 1.5, 1.5);
  g.fillStyle = "#4a2c22";
  g.fillRect(-0.6, 0, 1.3, 2.4);
  g.fillStyle = "#8a5a44";
  g.fillRect(2.2, 7, 1, 3);
  g.restore();
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
  g.strokeStyle = "#f4f8ff";
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
      case "Il pollaio":
        local(v, m.x + 6, ground(m.x + 6));
        g.fillStyle = "#9a6b3f";
        g.fillRect(-3, 0, 6, 3.2);
        g.fillStyle = "#6b2f2a";
        g.beginPath();
        g.moveTo(-3.6, 3.2);
        g.lineTo(0, 5);
        g.lineTo(3.6, 3.2);
        g.fill();
        g.fillStyle = "#f4f8ff";
        g.beginPath();
        g.ellipse(4.2, 0.6, 0.7, 0.55, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#c8443a";
        g.fillRect(4.5, 1, 0.3, 0.3);
        g.restore();
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
      case "Il presepe vivente": {
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
      case "L'Appennino":
        local(v, m.x + 50, ground(m.x + 50));
        g.fillStyle = "#3b2618";
        g.fillRect(-0.2, 0, 0.4, 6);
        g.fillRect(-1.6, 4, 3.2, 0.4);
        g.restore();
        break;
      case "Gli acquedotti":
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
      case "Il Colosseo": {
        local(v, m.x + 15, ground(m.x + 15) - 1);
        g.fillStyle = "#c9a47e";
        g.beginPath();
        g.moveTo(-28, 0);
        g.lineTo(-28, 28);
        g.lineTo(-10, 34);
        g.lineTo(28, 34);
        g.lineTo(28, 0);
        g.fill();
        g.fillStyle = "#3a2c3f";
        for (let row = 0; row < 3; row++)
          for (let i = 0; i < 9; i++) {
            const ax = -25.5 + i * 6;
            const ay = 2 + row * 10;
            if (row === 2 && ax < -16) continue;
            g.fillRect(ax, ay, 3, 5);
            g.beginPath();
            g.arc(ax + 1.5, ay + 5, 1.5, 0, Math.PI);
            g.fill();
          }
        g.strokeStyle = "#8e6f52";
        g.lineWidth = 0.5;
        for (const hy of [9.5, 19.5, 29.5]) {
          g.beginPath();
          g.moveTo(-28, hy);
          g.lineTo(28, hy);
          g.stroke();
        }
        g.restore();
        break;
      }
      case "Castel Sant'Angelo":
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
      case "Piazza Navona":
        drawNavona(v, m.x);
        break;
    }
    // cartello
    if (m.name !== "Piazza Navona") {
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

function drawNavona(v: View, x: number) {
  const { g } = v;
  const y = ground(x);
  local(v, x, y);
  // Sant'Agnese: facciata, cupola, due campanili
  g.fillStyle = "#d8c3a0";
  g.fillRect(20, 0, 30, 18);
  g.fillRect(17, 0, 6, 28);
  g.fillRect(47, 0, 6, 28);
  g.fillStyle = "#c9b28c";
  g.beginPath();
  g.arc(35, 22, 9, Math.PI, 0, true);
  g.fill();
  g.fillRect(26, 18, 18, 4);
  g.fillRect(34, 31, 2, 4);
  g.fillStyle = "#7a6a5a";
  for (let i = 0; i < 5; i++) g.fillRect(23 + i * 6, 2, 1, 14);
  g.fillStyle = "#ffcf6b";
  g.fillRect(33, 0, 4, 6);
  // obelisco e fontana dei Quattro Fiumi
  g.fillStyle = "#cdbca6";
  g.fillRect(-6, 0, 12, 2.5);
  g.fillStyle = "#e0d3c0";
  g.beginPath();
  g.moveTo(-1, 2.5);
  g.lineTo(1, 2.5);
  g.lineTo(0.6, 19);
  g.lineTo(0, 20.5);
  g.lineTo(-0.6, 19);
  g.fill();
  g.fillStyle = "#8fd0e8";
  g.fillRect(-7, 0, 14, 1);
  // bancarelle con le lucine
  const cols = ["#c8443a", "#2f8f5b", "#c8443a", "#3d6fb6"];
  for (let i = 0; i < 4; i++) {
    const bx = -40 + i * 8;
    g.fillStyle = "#6b4526";
    g.fillRect(bx, 0, 6, 2);
    g.fillStyle = cols[i];
    g.beginPath();
    g.moveTo(bx - 0.5, 3.5);
    g.lineTo(bx + 3, 5);
    g.lineTo(bx + 6.5, 3.5);
    g.fill();
    g.fillRect(bx, 2, 0.2, 1.5);
    g.fillRect(bx + 5.8, 2, 0.2, 1.5);
  }
  g.restore();
  // lucine
  for (let i = 0; i < 24; i++) {
    const lx = x - 42 + i * 3.4;
    const ly = y + 4.4 + Math.sin(i * 0.9) * 0.4;
    g.fillStyle = ["#ffd27a", "#ff7a6b", "#7ad0ff", "#a6ff8a"][i % 4];
    g.globalAlpha = 0.6 + 0.4 * Math.sin(v.t * 5 + i);
    g.beginPath();
    g.arc(sx(v, lx), sy(v, ly), Math.max(1.5, v.k * 0.2), 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const fs = Math.max(14, Math.min(26, v.k * 1.4));
  label(g, "PIAZZA NAVONA", sx(v, x), sy(v, y + 24), fs, "#f2c14e");
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
      g.font = `700 ${Math.round(r * 0.6)}px Fredoka, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      if (sxs > 0.5) g.fillText("500", 0, 1);
      g.restore();
    } else if (it.kind === "panettone") {
      const r = Math.max(minR * 1.5, v.k * 1.1);
      const bob = Math.sin(v.t * 3 + it.t) * r * 0.15;
      const glow = g.createRadialGradient(X, Y + bob, 0, X, Y + bob, r * 2.2);
      glow.addColorStop(0, "rgba(255,220,120,0.45)");
      glow.addColorStop(1, "rgba(255,220,120,0)");
      g.fillStyle = glow;
      g.fillRect(X - r * 2.2, Y + bob - r * 2.2, r * 4.4, r * 4.4);
      g.lineWidth = 2;
      g.strokeStyle = "#1c1426";
      g.fillStyle = "#c8843a";
      g.beginPath();
      g.ellipse(X, Y + bob - r * 0.1, r * 0.95, r * 0.75, 0, Math.PI, 0);
      g.fill();
      g.stroke();
      g.fillStyle = "#f5efe6";
      g.fillRect(X - r * 0.85, Y + bob - r * 0.1, r * 1.7, r * 0.7);
      g.strokeRect(X - r * 0.85, Y + bob - r * 0.1, r * 1.7, r * 0.7);
      g.fillStyle = "#c8443a";
      g.fillRect(X - r * 0.85, Y + bob + r * 0.15, r * 1.7, r * 0.18);
      g.fillStyle = "#7a2f2a";
      for (const [dx, dy] of [
        [-0.4, -0.45],
        [0.2, -0.6],
        [0.5, -0.3],
      ]) {
        g.beginPath();
        g.arc(X + dx * r, Y + bob + dy * r, r * 0.08, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      // corvo
      const r = Math.max(minR * 1.3, v.k * 0.9);
      const flap = Math.sin(v.t * 14 + it.t);
      g.save();
      g.translate(X, Y);
      g.fillStyle = "#15121c";
      g.beginPath();
      g.ellipse(0, 0, r, r * 0.5, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(-r * 0.2, 0);
      g.lineTo(r * 0.4, -r * 1.3 * flap);
      g.lineTo(r * 0.6, 0);
      g.fill();
      g.beginPath();
      g.arc(-r * 0.9, -r * 0.25, r * 0.4, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(r * 0.8, 0);
      g.lineTo(r * 1.5, -r * 0.3);
      g.lineTo(r * 1.4, r * 0.3);
      g.fill();
      g.fillStyle = "#f2a33a";
      g.beginPath();
      g.moveTo(-r * 1.2, -r * 0.3);
      g.lineTo(-r * 1.75, -r * 0.15);
      g.lineTo(-r * 1.2, -r * 0.05);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(-r * 0.95, -r * 0.35, r * 0.1, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
}

export const atGoal = (x: number) => x >= GOAL;
export { isIce };
