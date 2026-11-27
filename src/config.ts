// Numeri del gioco: potenziamenti, tappe del viaggio, guadagni.
// Le unità sono metri e secondi; il denaro sono le mance, in euro.

export const G = 9.8;
export const TIME_SCALE = 2.2; // il gioco gira più veloce del tempo reale: run brevi, velocità vere
export const GOAL = 5000; // Piazza del Plebiscito
export const LIRE = 1; // 1 punto = 1 euro di mancia

export type UpKey = "rampa" | "scopa" | "botti" | "calze" | "cappello";

export type Level = { name: string; desc: string; cost: number };
export type Upgrade = { key: UpKey; title: string; levels: Level[] };

export const UPGRADES: Upgrade[] = [
  {
    key: "rampa",
    title: "Rampa",
    levels: [
      { name: "Vicolo in discesa", desc: "Si parte dalla porta della pizzeria.", cost: 0 },
      { name: "Scalinata", desc: "Gradini a rotta di collo. Più slancio.", cost: 40 },
      { name: "Rampa del garage", desc: "Il garage dello zio, finalmente utile.", cost: 160 },
      { name: "Trampolino di legno", desc: "Scricchiola, ma lancia forte.", cost: 450 },
      { name: "Pendio del Vesuvio", desc: "Giù dal vulcano a tutta birra.", cost: 1100 },
      { name: "Bordo del cratere", desc: "Più in alto di così si fuma.", cost: 2400 },
    ],
  },
  {
    key: "scopa",
    title: "Ali",
    levels: [
      { name: "Cartone della pizza", desc: "Un'ala di cartone. Plana come un mattone.", cost: 0 },
      { name: "Tovaglia a quadri", desc: "Presa dal tavolo 4, plana meglio.", cost: 50 },
      { name: "Ombrellone", desc: "Dal lido, con tutta la frangia.", cost: 190 },
      { name: "Vela da gozzo", desc: "Sembra un'ala. Lo è quasi.", cost: 500 },
      { name: "Deltaplano", desc: "Quello vero, comprato usato.", cost: 1200 },
      { name: "Ala in carbonio", desc: "Leggendaria. Vola da sola.", cost: 2600 },
    ],
  },
  {
    key: "botti",
    title: "Botti",
    levels: [
      { name: "Niente botti", desc: "Si vola solo di planata.", cost: 0 },
      { name: "Tric-trac", desc: "Una spinta breve e rumorosa.", cost: 70 },
      { name: "Petardi", desc: "Più spinta, più baccano.", cost: 240 },
      { name: "Bengala", desc: "Spinta lunga e scintillante.", cost: 600 },
      { name: "Fontane", desc: "Una fontana di fuoco sotto la Vespa.", cost: 1400 },
      { name: "Razzo di Capodanno", desc: "Mezzanotte anticipata.", cost: 2900 },
    ],
  },
  {
    key: "calze",
    title: "Pizze",
    levels: [
      { name: "Nessuna pizza", desc: "Compra pizze da lanciare nei panari.", cost: 0 },
      { name: "2 margherite", desc: "Lanciale nei cesti calati dai tetti: dentro = mance grosse.", cost: 30 },
      { name: "3 pizze", desc: "Una marinara in più.", cost: 110 },
      { name: "4 pizze", desc: "Con la bufala, che costa.", cost: 300 },
      { name: "6 pizze", desc: "Mezzo quartiere servito.", cost: 650 },
      { name: "8 pizze", desc: "Tutto il quartiere. E una fritta.", cost: 1300 },
    ],
  },
  {
    key: "cappello",
    title: "Portafortuna",
    levels: [
      { name: "Tasche vuote", desc: "Nessun potere. Solo le chiavi della Vespa.", cost: 0 },
      { name: "Cornetto di plastica", desc: "Attira le monete vicine. +10% mance.", cost: 60 },
      { name: "Cornetto di corallo", desc: "Calamita più forte. +20% mance.", cost: 220 },
      { name: "Cornetto d'oro", desc: "Monete da lontano. +30% mance.", cost: 520 },
      { name: "Corno e ferro di cavallo", desc: "Attira tutto. +45% mance.", cost: 1150 },
      { name: "Il cornetto gigante", desc: "Quello del nonno. +60% mance.", cost: 2200 },
    ],
  },
];

export type Levels = Record<UpKey, number>;

// statistiche per livello
export const RAMP_DROP = [9, 15, 23, 36, 52, 72]; // dislivello della rampa (m)
export const RAMP_EXIT = [8, 10, 12, 14, 16, 18]; // angolo di uscita (gradi)
export const BROOM_LIFT = [0.024, 0.029, 0.034, 0.039, 0.045, 0.052]; // rotazione della velocità per m/s
export const BROOM_DRAG = [0.0028, 0.0021, 0.00155, 0.00115, 0.0008, 0.00055]; // resistenza base
export const BROOM_PITCH = [1.7, 1.85, 2.0, 2.15, 2.3, 2.5]; // rad/s
export const BOOST_THRUST = [0, 9, 11, 13, 16, 20]; // m/s²
export const BOOST_FUEL = [0, 0.9, 1.3, 1.8, 2.4, 3.2]; // secondi
export const SOCKS = [0, 2, 3, 4, 6, 8];
export const MAGNET = [0, 3, 5, 8, 11, 15]; // raggio (m)
export const BONUS = [0, 0.1, 0.2, 0.3, 0.45, 0.6];

// guadagni (punti)
export const PAY = {
  perMeter: 0.22,
  perAltitude: 0.45, // per metro di quota massima sopra il terreno
  perKmh: 0.18, // per km/h di velocità massima
  perSecond: 1.2, // per secondo in aria
  coin: 2, // moneta da 2 euro
  chimney: 30, // pizza nel panaro
  roof: 8, // pizza sul terrazzo
};

// tappe del viaggio: bonus la prima volta che le superi
export type Milestone = { x: number; name: string; bonus: number };
export const MILESTONES: Milestone[] = [
  { x: 150, name: "Il limoneto", bonus: 15 },
  { x: 400, name: "Il campanile", bonus: 30 },
  { x: 800, name: "San Gregorio Armeno", bonus: 60 },
  { x: 1300, name: "Il lungomare", bonus: 100 },
  { x: 2000, name: "Posillipo", bonus: 150 },
  { x: 2800, name: "L'acquedotto", bonus: 220 },
  { x: 3600, name: "Il Maschio Angioino", bonus: 300 },
  { x: 4300, name: "Castel dell'Ovo", bonus: 400 },
  { x: GOAL, name: "Piazza del Plebiscito", bonus: 0 },
];

// calendario: run 1 = 1 dicembre, il concerto di Capodanno è il 31 dicembre (run 31)
export const DEADLINE = 31;
const MESI = ["dicembre", "gennaio"];
export function dateOf(run: number): string {
  const d = run - 1; // giorni dopo il 1 dicembre
  if (d < 31) return `${d + 1} ${MESI[0]}`;
  if (d < 62) return `${d - 30} ${MESI[1]}`;
  return `giorno ${run}`;
}

export function lire(pt: number): string {
  return `€ ${String(Math.round(pt) * LIRE).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
