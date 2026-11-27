// Fisica della Befana: rampa (perlina su una curva), volo (planata con stallo), atterraggio e scivolata.
// Niente rendering qui: lo usa anche tools/tune.ts per bilanciare il gioco.
import {
  BOOST_FUEL,
  BOOST_THRUST,
  BROOM_DRAG,
  BROOM_LIFT,
  BROOM_PITCH,
  G,
  TIME_SCALE,
  RAMP_DROP,
  RAMP_EXIT,
  type Levels,
} from "./config";
import { ground, isIce, slope } from "./world";

export type Ramp = { pts: { x: number; y: number; s: number }[]; len: number; lipY: number; topX: number; topY: number };

export function buildRamp(lv: number): Ramp {
  const D = RAMP_DROP[lv];
  const lipY = 2 + D * 0.22;
  const L = D * 1.7 + 6;
  const exit = (RAMP_EXIT[lv] * Math.PI) / 180;
  const pts: Ramp["pts"] = [];
  // Hermite cubica: parte ripida, finisce col dente all'insù
  const m0 = -2.2 * D;
  const m1 = Math.tan(exit) * L;
  let s = 0;
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    const x = -L + t * L;
    const y = Math.max(1, h00 * (lipY + D) + h10 * m0 + h01 * lipY + h11 * m1);
    if (i) s += Math.hypot(x - pts[i - 1].x, y - pts[i - 1].y);
    pts.push({ x, y, s });
  }
  return { pts, len: s, lipY, topX: -L, topY: lipY + D };
}

export function rampAt(r: Ramp, s: number) {
  const p = r.pts;
  let i = 1;
  while (i < p.length - 1 && p[i].s < s) i++;
  const a = p[i - 1];
  const b = p[i];
  const t = Math.min(1, Math.max(0, (s - a.s) / (b.s - a.s || 1)));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang: Math.atan2(b.y - a.y, b.x - a.x) };
}

export type Phase = "ramp" | "air" | "ground" | "stop";
export type Flyer = {
  phase: Phase;
  x: number;
  y: number;
  vx: number;
  vy: number;
  th: number; // assetto (rad, + = muso in su)
  s: number; // posizione sulla rampa
  vs: number; // velocità sulla rampa
  fuel: number;
  boosting: boolean;
  t: number; // tempo dal via
  air: number; // tempo in aria
  maxX: number;
  maxAlt: number;
  maxV: number;
  stopT: number;
  bounces: number;
  stall: boolean;
  lastImpact: number; // velocità normale all'ultimo impatto (per gli effetti)
  impactKind: "" | "bounce" | "slide" | "crash";
  aoa: number;
};

export type Input = { pitch: number; boost: boolean };

export function newFlyer(lv: Levels, ramp: Ramp): Flyer {
  const p = rampAt(ramp, 0);
  return {
    phase: "ramp",
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    th: p.ang,
    s: 0,
    vs: 0.5,
    fuel: BOOST_FUEL[lv.botti],
    boosting: false,
    t: 0,
    air: 0,
    maxX: 0,
    maxAlt: 0,
    maxV: 0,
    stopT: 0,
    bounces: 0,
    stall: false,
    lastImpact: 0,
    impactKind: "",
    aoa: 0,
  };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const STALL = 0.42;

export function step(f: Flyer, lv: Levels, ramp: Ramp, inp: Input, dt: number, lift = 0) {
  f.impactKind = "";
  if (f.phase === "stop") return;
  f.t += dt;
  const thrust = BOOST_THRUST[lv.botti];
  f.boosting = inp.boost && f.fuel > 0 && thrust > 0;
  if (f.boosting) f.fuel = Math.max(0, f.fuel - dt / TIME_SCALE);

  if (f.phase === "ramp") {
    const p = rampAt(ramp, f.s);
    const acc = -G * Math.sin(p.ang) - 0.04 * G * Math.cos(p.ang) - 0.002 * f.vs * f.vs + (f.boosting ? thrust : 0);
    f.vs = Math.max(0.5, f.vs + acc * dt);
    f.s += f.vs * dt;
    const q = rampAt(ramp, Math.min(f.s, ramp.len));
    f.x = q.x;
    f.y = q.y;
    f.th = q.ang;
    if (f.s >= ramp.len) {
      f.phase = "air";
      f.vx = Math.cos(q.ang) * f.vs;
      f.vy = Math.sin(q.ang) * f.vs;
    }
    f.maxV = Math.max(f.maxV, f.vs);
    return;
  }

  if (f.phase === "air") {
    f.air += dt;
    f.th = Math.max(-1.45, Math.min(1.3, f.th + (inp.pitch * BROOM_PITCH[lv.scopa] * dt) / TIME_SCALE));
    let v = Math.hypot(f.vx, f.vy);
    let phi = Math.atan2(f.vy, f.vx);
    const a = wrap(f.th - phi);
    f.aoa = a;
    const abs = Math.abs(a);
    // oltre lo stallo la portanza crolla
    const eff = abs < STALL ? a : Math.sign(a) * Math.max(0.05, STALL - (abs - STALL) * 0.9);
    f.stall = abs > STALL + 0.08 || v < 6;
    let turn = Math.max(-2.2, Math.min(2.2, BROOM_LIFT[lv.scopa] * v * eff)) * dt;
    if (Math.abs(turn) > abs) turn = a;
    phi += turn;
    // resistenza: base + indotta (più angolo = più freno)
    v -= (BROOM_DRAG[lv.scopa] * v * v + 0.25 * a * a * v) * dt;
    f.vx = Math.cos(phi) * v;
    f.vy = Math.sin(phi) * v - G * dt + lift * dt;
    if (f.boosting) {
      f.vx += Math.cos(f.th) * thrust * dt;
      f.vy += Math.sin(f.th) * thrust * dt;
    }
    // da ferma la scopa pende in giù
    if (v < 7) f.th += wrap(phi - f.th) * Math.min(1, (7 - v) * 0.25) * dt * 2;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    const gy = ground(f.x);
    f.maxAlt = Math.max(f.maxAlt, f.y - gy);
    if (f.y <= gy) touchdown(f, gy);
  } else if (f.phase === "ground") {
    const sl = Math.atan(slope(f.x));
    let vt = f.vx * Math.cos(sl) + f.vy * Math.sin(sl);
    const mu = isIce(f.x) ? 0.03 : 0.45;
    // la neve fresca frena tanto (il ghiaccio no)
    const plow = isIce(f.x) ? 0.02 : 0.22;
    vt += (-G * Math.sin(sl) - Math.sign(vt) * mu * G * Math.cos(sl) - plow * vt) * dt;
    if (f.boosting) vt += thrust * 0.6 * dt;
    f.vx = vt * Math.cos(sl);
    f.vy = vt * Math.sin(sl);
    f.x += f.vx * dt;
    f.y = ground(f.x);
    f.th += (sl - f.th) * Math.min(1, dt * 10);
    // pigiando su si torna in aria se si va abbastanza veloci
    if (inp.pitch > 0 && vt > 14) {
      f.phase = "air";
      f.vy += 3;
      f.th = sl + 0.25;
    }
    if (Math.abs(vt) < 0.7) f.stopT += dt / TIME_SCALE;
    else f.stopT = 0;
    if (f.stopT > 0.35 || f.t > 400) f.phase = "stop";
  }
  f.maxX = Math.max(f.maxX, f.x);
  f.maxV = Math.max(f.maxV, Math.hypot(f.vx, f.vy));
}

function touchdown(f: Flyer, gy: number) {
  const sl = Math.atan(slope(f.x));
  const nx = -Math.sin(sl);
  const ny = Math.cos(sl);
  const tx = Math.cos(sl);
  const ty = Math.sin(sl);
  let vn = f.vx * nx + f.vy * ny;
  let vt = f.vx * tx + f.vy * ty;
  f.y = gy;
  const nose = wrap(f.th - sl);
  f.lastImpact = -vn;
  if (vn < -22 || nose < -0.9) {
    // musata nella neve
    vt *= 0.45;
    vn = -vn * 0.25;
    f.impactKind = "crash";
    f.th = sl + 0.6;
  } else if (vn < -7) {
    vt *= 0.86;
    vn = -vn * 0.38;
    f.impactKind = "bounce";
  } else {
    vn = 0;
    f.impactKind = "slide";
  }
  f.bounces++;
  f.vx = vt * tx + vn * nx;
  f.vy = vt * ty + vn * ny;
  if (vn <= 0.5) {
    f.phase = "ground";
    f.vx = vt * tx;
    f.vy = vt * ty;
  } else f.y = gy + 0.05;
}
