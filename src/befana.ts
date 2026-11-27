// La Befana disegnata nel codice (vettoriale): seduta sulla scopa, guarda verso destra (x avanti, y in giù).
// Unità: 40 = 1 metro. Il centro è il punto dove siede sulla scopa.

export const BEFANA_UNIT = 40;

export type Pose = {
  t: number; // tempo per lo svolazzo
  wind: number; // 0..1 quanto sventolano i vestiti
  boost: boolean;
  socks: number; // calze nel sacco (si vedono spuntare)
  blink?: boolean;
  dizzy?: boolean;
};

function strokeFill(g: CanvasRenderingContext2D, fill: string, line = "#1c1426", w = 2.2) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = w;
  g.strokeStyle = line;
  g.stroke();
}

export function drawBefana(g: CanvasRenderingContext2D, p: Pose) {
  const w = p.wind;
  const fl = Math.sin(p.t * 14) * (0.4 + w);
  const fl2 = Math.sin(p.t * 11 + 1.3) * (0.4 + w);
  g.lineJoin = "round";
  g.lineCap = "round";

  // --- coda del fazzoletto e scialle che sventolano (dietro a tutto)
  g.beginPath();
  g.moveTo(-6, -46);
  g.quadraticCurveTo(-22 - w * 8, -50 + fl * 3, -34 - w * 14, -44 + fl * 6);
  g.quadraticCurveTo(-24 - w * 8, -40 + fl * 2, -6, -38);
  strokeFill(g, "#2a2233");
  g.beginPath();
  g.moveTo(-10, -30);
  g.quadraticCurveTo(-28 - w * 10, -30 + fl2 * 3, -40 - w * 16, -22 + fl2 * 6);
  g.quadraticCurveTo(-26 - w * 8, -18 + fl2 * 2, -8, -18);
  strokeFill(g, "#35523f");

  // --- sacco sulle spalle, con le calze che spuntano
  g.save();
  g.translate(-22, -22);
  const colors = ["#d23c3c", "#2f8f5b", "#e9c46a", "#3d6fb6", "#d23c3c", "#2f8f5b", "#e9c46a", "#3d6fb6"];
  for (let i = 0; i < Math.min(p.socks, 4); i++) {
    g.save();
    g.translate(-6 + i * 5, -12);
    g.rotate(-0.5 + i * 0.3);
    g.beginPath();
    g.roundRect(-3, -12, 6, 12, 2);
    strokeFill(g, colors[i], "#1c1426", 1.6);
    g.fillStyle = "#f5efe6";
    g.fillRect(-3, -12, 6, 3);
    g.restore();
  }
  g.beginPath();
  g.ellipse(0, 0, 15, 14, -0.3, 0, Math.PI * 2);
  strokeFill(g, "#9a6b3f");
  g.beginPath();
  g.moveTo(-8, -9);
  g.quadraticCurveTo(0, -4, 9, -11);
  g.strokeStyle = "#6b4526";
  g.lineWidth = 2;
  g.stroke();
  // toppa
  g.fillStyle = "#c9a227";
  g.fillRect(-4, 2, 7, 6);
  g.restore();

  // --- scopa: setole dietro, manico avanti
  g.save();
  for (let i = 0; i < 13; i++) {
    const k = (i - 6) / 6;
    g.beginPath();
    g.moveTo(-50, 4 + k * 3);
    g.quadraticCurveTo(-70, 4 + k * 8 + fl * 0.6, -92 - Math.abs(k) * 4 - w * 4, 4 + k * 15 + fl * (1 + Math.abs(k)));
    g.strokeStyle = i % 3 === 0 ? "#b9822f" : i % 3 === 1 ? "#e0b052" : "#cf9a3c";
    g.lineWidth = 3;
    g.stroke();
  }
  g.beginPath();
  g.roundRect(-56, -1, 9, 11, 2);
  strokeFill(g, "#c0392b", "#1c1426", 1.6);
  g.restore();
  g.beginPath();
  g.moveTo(-58, 5);
  g.lineTo(64, -1);
  g.lineWidth = 6.5;
  g.strokeStyle = "#1c1426";
  g.stroke();
  g.lineWidth = 4;
  g.strokeStyle = "#8a5a2e";
  g.stroke();
  g.beginPath();
  g.moveTo(-40, 3.2);
  g.lineTo(60, -1.8);
  g.lineWidth = 1.2;
  g.strokeStyle = "#b98552";
  g.stroke();
  // pomello
  g.beginPath();
  g.arc(64, -1, 3.2, 0, Math.PI * 2);
  strokeFill(g, "#6b4526", "#1c1426", 1.4);

  // --- gambe: calze a righe e scarpe a punta
  for (const [dx, ph] of [
    [0, 0],
    [6, 1.7],
  ]) {
    const swing = Math.sin(p.t * 6 + ph) * 2;
    g.save();
    g.translate(6 + dx, 10);
    g.rotate(0.5 + swing * 0.04);
    g.beginPath();
    g.roundRect(-3, 0, 7, 18, 3);
    strokeFill(g, "#f5efe6", "#1c1426", 1.6);
    g.fillStyle = "#c0392b";
    for (let y = 2; y < 18; y += 5) g.fillRect(-2.2, y, 5.4, 2.4);
    g.beginPath();
    g.moveTo(-4, 17);
    g.lineTo(12, 17);
    g.quadraticCurveTo(16, 16, 15, 12);
    g.quadraticCurveTo(8, 20, -4, 23);
    g.closePath();
    strokeFill(g, "#1c1426", "#1c1426", 1.4);
    g.restore();
  }

  // --- gonna con le toppe
  g.beginPath();
  g.moveTo(-14, -16);
  g.quadraticCurveTo(-26, 4, -24 + fl * 1.5, 20);
  g.quadraticCurveTo(-6, 16 + fl2, 14, 20);
  g.quadraticCurveTo(14, 2, 8, -16);
  g.closePath();
  strokeFill(g, "#8e2b2b");
  g.fillStyle = "#c9a227";
  g.save();
  g.translate(-14, 6);
  g.rotate(0.2);
  g.fillRect(-4, -4, 9, 8);
  g.restore();
  g.fillStyle = "#3d6fb6";
  g.fillRect(2, 8, 7, 7);
  g.strokeStyle = "#f5efe6";
  g.lineWidth = 0.8;
  g.setLineDash([1.5, 1.5]);
  g.strokeRect(2, 8, 7, 7);
  g.setLineDash([]);

  // --- busto e scialle
  g.beginPath();
  g.moveTo(-12, -38);
  g.quadraticCurveTo(-18, -24, -14, -14);
  g.lineTo(10, -14);
  g.quadraticCurveTo(14, -26, 8, -38);
  g.closePath();
  strokeFill(g, "#5a3d6b");
  g.beginPath();
  g.moveTo(-14, -38);
  g.lineTo(12, -38);
  g.lineTo(2, -18);
  g.closePath();
  strokeFill(g, "#35523f");
  // frange dello scialle
  g.strokeStyle = "#35523f";
  g.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(-6 + i * 3, -24 + i * 1.5);
    g.lineTo(-7 + i * 3 - w * 3, -20 + i * 1.5 + fl * 0.5);
    g.stroke();
  }

  // --- braccio verso il manico
  g.beginPath();
  g.moveTo(2, -32);
  g.quadraticCurveTo(16, -22, 24, -4);
  g.lineWidth = 8;
  g.strokeStyle = "#1c1426";
  g.stroke();
  g.lineWidth = 5.5;
  g.strokeStyle = "#5a3d6b";
  g.stroke();
  g.beginPath();
  g.arc(25, -2, 4, 0, Math.PI * 2);
  strokeFill(g, "#f0c09a", "#1c1426", 1.6);

  // --- testa
  g.save();
  g.translate(4, -50);
  // capelli grigi che sventolano
  g.strokeStyle = "#c9c4cf";
  g.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.moveTo(-8, -2 + i * 2.5);
    g.quadraticCurveTo(-16 - w * 4, -2 + i * 3 + fl, -20 - w * 8, i * 3.5 + fl * 2);
    g.stroke();
  }
  // viso
  g.beginPath();
  g.moveTo(-9, -6);
  g.quadraticCurveTo(-11, 8, -2, 13);
  g.quadraticCurveTo(6, 17, 10, 11); // mento a punta
  g.quadraticCurveTo(12, 4, 10, -6);
  g.closePath();
  strokeFill(g, "#f0c09a");
  // guancia
  g.fillStyle = "rgba(220,90,80,0.35)";
  g.beginPath();
  g.arc(3, 5, 3.2, 0, Math.PI * 2);
  g.fill();
  // naso a uncino con il porro
  g.beginPath();
  g.moveTo(8, -3);
  g.quadraticCurveTo(19, -1, 18, 7);
  g.quadraticCurveTo(14, 5, 10, 4);
  g.closePath();
  strokeFill(g, "#eab08a", "#1c1426", 1.8);
  g.beginPath();
  g.arc(15, 1, 1.3, 0, Math.PI * 2);
  g.fillStyle = "#a0603f";
  g.fill();
  // occhio
  if (p.dizzy) {
    g.strokeStyle = "#1c1426";
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(3, -4);
    g.lineTo(7, 0);
    g.moveTo(7, -4);
    g.lineTo(3, 0);
    g.stroke();
  } else if (p.blink) {
    g.beginPath();
    g.moveTo(3, -2);
    g.lineTo(7, -2);
    g.strokeStyle = "#1c1426";
    g.lineWidth = 1.6;
    g.stroke();
  } else {
    g.beginPath();
    g.arc(5, -2, 2.4, 0, Math.PI * 2);
    g.fillStyle = "#fff";
    g.fill();
    g.beginPath();
    g.arc(6, -2, 1.3, 0, Math.PI * 2);
    g.fillStyle = "#1c1426";
    g.fill();
  }
  // sopracciglio
  g.beginPath();
  g.moveTo(2, -6.5);
  g.lineTo(8, -5.5);
  g.strokeStyle = "#8d8796";
  g.lineWidth = 1.6;
  g.stroke();
  // sorriso sdentato
  g.beginPath();
  g.moveTo(4, 9);
  g.quadraticCurveTo(7.5, 11.5, 10, 8);
  g.strokeStyle = "#1c1426";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#f5efe6";
  g.fillRect(6.4, 9.2, 1.6, 1.6);
  // fazzoletto nero a pois, nodo sotto il mento
  g.beginPath();
  g.moveTo(-12, 6);
  g.quadraticCurveTo(-14, -14, 2, -15);
  g.quadraticCurveTo(13, -14, 12, -6);
  g.quadraticCurveTo(4, -9, -4, -7);
  g.quadraticCurveTo(-7, 2, -5, 10);
  g.closePath();
  strokeFill(g, "#2a2233");
  g.fillStyle = "#f5efe6";
  for (const [x, y] of [
    [-6, -9],
    [0, -12],
    [6, -11],
    [-9, -2],
    [-8, 4],
  ]) {
    g.beginPath();
    g.arc(x, y, 1.1, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.ellipse(-2, 12, 3.5, 2.5, 0.4, 0, Math.PI * 2);
  strokeFill(g, "#2a2233", "#1c1426", 1.4);
  g.restore();

  // bagliore dei botti
  if (p.boost) {
    const r = g.createRadialGradient(-96, 6, 0, -96, 6, 30);
    r.addColorStop(0, "rgba(255,240,180,0.9)");
    r.addColorStop(0.4, "rgba(255,150,60,0.5)");
    r.addColorStop(1, "rgba(255,80,40,0)");
    g.fillStyle = r;
    g.beginPath();
    g.arc(-96, 6, 30, 0, Math.PI * 2);
    g.fill();
  }
}
