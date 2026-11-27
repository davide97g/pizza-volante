// Bilanciamento: un pilota automatico gioca la carriera comprando il potenziamento che rende di più.
// bun tools/tune.ts  → quanti run servono per Piazza Navona e quanto si guadagna.
import { TIME_SCALE, BONUS, GOAL, MILESTONES, PAY, SOCKS, UPGRADES, type Levels, type UpKey } from "../src/config";
import { buildRamp, newFlyer, step } from "../src/sim";

function fly(lv: Levels, att: number, skill = 1) {
  const ramp = buildRamp(lv.rampa);
  const f = newFlyer(lv, ramp);
  const dt = TIME_SCALE / 120;
  while (f.phase !== "stop" && f.t < 200) {
    const boost = f.fuel > 0;
    let target = boost ? 0.45 : att;
    // un po' di "onda": picchiare e tirare su quando si è veloci
    if (skill > 1 && !boost) target = att + Math.sin(f.t * 0.6) * 0.25;
    const err = target - f.th;
    step(f, lv, ramp, { pitch: Math.max(-1, Math.min(1, err * 4)), boost }, dt);
  }
  return f;
}

function best(lv: Levels) {
  let top = fly(lv, 0);
  for (let a = -0.5; a <= 0.5; a += 0.05) {
    const f = fly(lv, a);
    if (f.maxX > top.maxX) top = f;
  }
  return top;
}

function earn(f: ReturnType<typeof fly>, lv: Levels, passed: Set<number>) {
  let pt =
    f.maxX * PAY.perMeter + f.maxAlt * PAY.perAltitude + f.maxV * 3.6 * TIME_SCALE * PAY.perKmh + (f.air / TIME_SCALE) * PAY.perSecond;
  pt += Math.floor(f.maxX / 60) * PAY.coin * 0.6; // qualche moneta presa
  pt += SOCKS[lv.calze] * (0.35 * PAY.chimney + 0.3 * PAY.roof);
  pt *= 1 + BONUS[lv.cappello];
  for (const m of MILESTONES)
    if (f.maxX >= m.x && !passed.has(m.x)) {
      passed.add(m.x);
      pt += m.bonus;
    }
  return pt;
}

const lv: Levels = { rampa: 0, scopa: 0, botti: 0, calze: 0, cappello: 0 };
let money = 0;
const passed = new Set<number>();
let time = 0;
for (let run = 1; run <= 60; run++) {
  const f = best(lv);
  const pt = earn(f, lv, passed);
  money += pt;
  time += f.t / TIME_SCALE + 12; // + tempo nel negozio
  const buys: string[] = [];
  // compra finché può: il più economico tra rampa/scopa/botti, poi il resto
  for (;;) {
    const opts = UPGRADES.map((u) => ({ u, next: u.levels[lv[u.key] + 1] })).filter((o) => o.next);
    opts.sort((a, b) => a.next!.cost - b.next!.cost);
    const o = opts[0];
    if (!o || o.next!.cost > money) break;
    money -= o.next!.cost;
    lv[o.u.key as UpKey]++;
    buys.push(`${o.u.key}${lv[o.u.key as UpKey]}`);
  }
  console.log(
    `run ${String(run).padStart(2)} | ${f.maxX.toFixed(0).padStart(5)} m  alt ${f.maxAlt.toFixed(0).padStart(4)}  v ${(f.maxV * 3.6 * TIME_SCALE).toFixed(0).padStart(3)} km/h  t ${(f.t / TIME_SCALE).toFixed(1).padStart(5)}s | +${pt.toFixed(0).padStart(5)} → ${money.toFixed(0).padStart(5)} | ${buys.join(" ")}`,
  );
  if (f.maxX >= GOAL) {
    console.log(`PLEBISCITO al run ${run}, ~${(time / 60).toFixed(1)} min`);
    break;
  }
}
const full: Levels = { rampa: 5, scopa: 5, botti: 5, calze: 5, cappello: 5 };
console.log("tutto al massimo:", best(full).maxX.toFixed(0), "m");
