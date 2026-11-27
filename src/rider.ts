// Gennarino, il pizzaiolo-fattorino, sulla Vespa con l'ala sopra la testa. Disegnato nel codice (vettoriale).
// Guarda a destra (x avanti, y in giù). Unità: 40 = 1 metro. Il centro è la sella.

export const RIDER_UNIT = 40;
// quanto sta sopra il terreno il centro quando le ruote toccano (in metri)
export const RIDER_LIFT = 0.8;

export type Pose = {
  t: number;
  wind: number; // 0..1
  boost: boolean;
  socks: number; // pizze rimaste sul portapacchi
  blink?: boolean;
  dizzy?: boolean;
};

const INK = "#1c1426";
function sf(g: CanvasRenderingContext2D, fill: string, w = 2.2) {
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = w;
  g.strokeStyle = INK;
  g.stroke();
}

export function drawRider(g: CanvasRenderingContext2D, p: Pose) {
  const w = p.wind;
  const fl = Math.sin(p.t * 14) * (0.4 + w);
  const fl2 = Math.sin(p.t * 11 + 1.3) * (0.4 + w);
  g.lineJoin = "round";
  g.lineCap = "round";

  // --- ala (deltaplano) sopra la testa, con i montanti
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-6, -66);
  g.lineTo(-2, -36);
  g.moveTo(14, -66);
  g.lineTo(22, -18);
  g.stroke();
  g.beginPath();
  g.moveTo(-58, -64 + fl * 0.5);
  g.quadraticCurveTo(0, -74, 60, -66);
  g.lineTo(10, -80);
  g.closePath();
  sf(g, "#fbf3e4");
  // strisce verde-bianco-rosso
  g.save();
  g.clip();
  g.fillStyle = "#2f8f5b";
  g.fillRect(-60, -82, 40, 20);
  g.fillStyle = "#c8443a";
  g.fillRect(20, -82, 42, 20);
  g.restore();
  g.beginPath();
  g.moveTo(-58, -64 + fl * 0.5);
  g.quadraticCurveTo(0, -74, 60, -66);
  g.lineTo(10, -80);
  g.closePath();
  g.lineWidth = 2.2;
  g.strokeStyle = INK;
  g.stroke();

  // --- sciarpa che sventola
  g.beginPath();
  g.moveTo(-2, -38);
  g.quadraticCurveTo(-20 - w * 10, -40 + fl * 3, -36 - w * 16, -32 + fl2 * 6);
  g.lineTo(-32 - w * 14, -26 + fl2 * 5);
  g.quadraticCurveTo(-18 - w * 6, -32 + fl, 0, -32);
  sf(g, "#c8443a", 1.8);

  // --- pizze sul portapacchi
  for (let i = 0; i < Math.min(p.socks, 5); i++) {
    g.beginPath();
    g.roundRect(-46, -2 - i * 5, 22, 5, 1);
    sf(g, i % 2 ? "#e9d3a8" : "#f3e2bf", 1.4);
  }
  if (p.socks > 0) {
    g.fillStyle = "#c8443a";
    g.font = "700 4px Fredoka, sans-serif";
    g.textAlign = "center";
    g.fillText("PIZZA", -35, 1.6 - (Math.min(p.socks, 5) - 1) * 5);
  }

  // --- marmitta (con la fiammata dei botti)
  g.beginPath();
  g.roundRect(-44, 12, 18, 5, 2.5);
  sf(g, "#8d8796", 1.6);

  // --- ruote
  for (const x of [-30, 30]) {
    g.beginPath();
    g.arc(x, 22, 9, 0, Math.PI * 2);
    sf(g, "#2a2233", 2);
    g.beginPath();
    g.arc(x, 22, 4, 0, Math.PI * 2);
    sf(g, "#c9c4cf", 1.4);
    // raggi che girano
    g.strokeStyle = "#5b5070";
    g.lineWidth = 1;
    const a = p.t * 20;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * 4, 22 + Math.sin(a) * 4);
    g.lineTo(x - Math.cos(a) * 4, 22 - Math.sin(a) * 4);
    g.stroke();
  }

  // --- scocca della Vespa
  g.beginPath();
  g.moveTo(-42, 4);
  g.quadraticCurveTo(-44, 22, -26, 22);
  g.lineTo(-14, 22);
  g.quadraticCurveTo(-12, 8, -2, 8);
  g.lineTo(14, 8); // pedana
  g.lineTo(22, 22);
  g.lineTo(28, 22);
  g.quadraticCurveTo(26, 0, 30, -14); // scudo
  g.lineTo(24, -14);
  g.quadraticCurveTo(14, 4, 8, 4);
  g.lineTo(-6, 4);
  g.quadraticCurveTo(-10, -6, -24, -6);
  g.quadraticCurveTo(-40, -6, -42, 4);
  g.closePath();
  sf(g, "#7fcbb8");
  // parafango anteriore
  g.beginPath();
  g.moveTo(21, 15);
  g.quadraticCurveTo(30, 8, 39, 16);
  g.lineTo(36, 17);
  g.quadraticCurveTo(30, 12, 24, 17);
  g.closePath();
  sf(g, "#7fcbb8", 1.6);
  // sella
  g.beginPath();
  g.roundRect(-22, -10, 22, 6, 3);
  sf(g, "#5b3b22", 1.6);
  // faro e manubrio
  g.beginPath();
  g.moveTo(26, -14);
  g.lineTo(32, -22);
  g.lineWidth = 3;
  g.strokeStyle = INK;
  g.stroke();
  g.beginPath();
  g.arc(35, -18, 3.2, 0, Math.PI * 2);
  sf(g, "#ffe9a0", 1.4);

  // --- gambe
  g.beginPath();
  g.moveTo(-8, -10);
  g.quadraticCurveTo(6, -10, 8, 0);
  g.lineTo(10, 6);
  g.lineWidth = 7;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = 4.5;
  g.strokeStyle = "#3d5a8a";
  g.stroke();
  g.beginPath();
  g.ellipse(13, 6, 5, 2.6, 0, 0, Math.PI * 2);
  sf(g, "#2a2233", 1.4);

  // --- busto: maglietta bianca e grembiule
  g.beginPath();
  g.moveTo(-14, -12);
  g.quadraticCurveTo(-16, -30, -6, -40);
  g.lineTo(6, -40);
  g.quadraticCurveTo(12, -28, 4, -12);
  g.closePath();
  sf(g, "#fbf3e4");
  g.beginPath();
  g.moveTo(-8, -26);
  g.lineTo(4, -26);
  g.lineTo(3, -12);
  g.lineTo(-10, -12);
  g.closePath();
  sf(g, "#e8e0d0", 1.4);

  // --- braccio al manubrio
  g.beginPath();
  g.moveTo(0, -36);
  g.quadraticCurveTo(16, -30, 30, -22);
  g.lineWidth = 7.5;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = 5;
  g.strokeStyle = "#e9b48c";
  g.stroke();
  g.beginPath();
  g.moveTo(0, -36);
  g.quadraticCurveTo(6, -34, 9, -32);
  g.lineWidth = 5.5;
  g.strokeStyle = "#fbf3e4";
  g.stroke();

  // --- testa con casco aperto e occhialoni
  g.save();
  g.translate(2, -50);
  g.beginPath();
  g.arc(0, 0, 10, 0, Math.PI * 2);
  sf(g, "#e9b48c");
  // naso
  g.beginPath();
  g.moveTo(8, -1);
  g.quadraticCurveTo(15, 3, 9, 5);
  sf(g, "#e0a07a", 1.6);
  // baffi
  g.beginPath();
  g.moveTo(4, 6);
  g.quadraticCurveTo(9, 4, 13, 8);
  g.quadraticCurveTo(9, 7, 4, 8);
  sf(g, "#3b2618", 1.2);
  // occhio / occhialoni
  if (p.dizzy) {
    g.strokeStyle = INK;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(3, -4);
    g.lineTo(7, 0);
    g.moveTo(7, -4);
    g.lineTo(3, 0);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(5, -2, 3.4, 0, Math.PI * 2);
    sf(g, p.blink ? "#e9b48c" : "#bfe6f5", 1.6);
    if (!p.blink) {
      g.beginPath();
      g.arc(6, -2, 1.2, 0, Math.PI * 2);
      g.fillStyle = INK;
      g.fill();
    }
  }
  g.beginPath();
  g.moveTo(-9, -2);
  g.lineTo(2, -2);
  g.strokeStyle = "#5b3b22";
  g.lineWidth = 1.6;
  g.stroke();
  // casco
  g.beginPath();
  g.arc(0, -1, 11.5, Math.PI * 1.02, Math.PI * 1.9);
  g.lineTo(6, -6);
  g.quadraticCurveTo(-2, -5, -11, -1);
  g.closePath();
  sf(g, "#c8443a");
  g.fillStyle = "#fbf3e4";
  g.fillRect(-3, -12, 3, 6);
  // capelli che escono
  g.strokeStyle = "#3b2618";
  g.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(-10, 0 + i * 2.5);
    g.quadraticCurveTo(-15 - w * 3, i * 3 + fl, -17 - w * 5, 2 + i * 3 + fl * 1.5);
    g.stroke();
  }
  g.restore();

  // fiammata dei botti dalla marmitta
  if (p.boost) {
    const r = g.createRadialGradient(-50, 14, 0, -50, 14, 28);
    r.addColorStop(0, "rgba(255,240,180,0.95)");
    r.addColorStop(0.4, "rgba(255,150,60,0.55)");
    r.addColorStop(1, "rgba(255,80,40,0)");
    g.fillStyle = r;
    g.beginPath();
    g.arc(-50, 14, 28, 0, Math.PI * 2);
    g.fill();
  }
}
