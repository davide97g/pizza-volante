// Numeri del gioco: potenziamenti, tappe del viaggio, guadagni.
// Le unità sono metri e secondi; il denaro interno è in "punti" e si mostra in lire (x 100).

export const G = 9.8;
export const TIME_SCALE = 2.2; // il gioco gira più veloce del tempo reale: run brevi, velocità vere
export const GOAL = 5000; // Piazza Navona
export const LIRE = 100; // 1 punto = 100 lire

export type UpKey = "rampa" | "scopa" | "botti" | "calze" | "cappello";

export type Level = { name: string; desc: string; cost: number };
export type Upgrade = { key: UpKey; title: string; levels: Level[] };

export const UPGRADES: Upgrade[] = [
  {
    key: "rampa",
    title: "Rampa",
    levels: [
      { name: "Tetto di casa", desc: "Si parte dal comignolo. Basso, ma è casa.", cost: 0 },
      { name: "Fienile", desc: "Più alto, profuma di fieno.", cost: 40 },
      { name: "Campanile", desc: "Il parroco non deve saperlo.", cost: 160 },
      { name: "Trampolino di legno", desc: "Scricchiola, ma lancia forte.", cost: 450 },
      { name: "Trampolino di Cortina", desc: "Olimpico. Vietato alle streghe (pazienza).", cost: 1100 },
      { name: "Cima del Cristallo", desc: "Si parte da tremila metri. Quasi.", cost: 2400 },
    ],
  },
  {
    key: "scopa",
    title: "Scopa",
    levels: [
      { name: "Scopa vecchia", desc: "Spelacchiata. Plana come un mattone.", cost: 0 },
      { name: "Saggina nuova", desc: "Setole fresche, plana meglio.", cost: 50 },
      { name: "Scopa di bambù", desc: "Leggera e flessibile.", cost: 190 },
      { name: "Scopa in alluminio", desc: "Sembra un'ala. Lo è quasi.", cost: 500 },
      { name: "Scopa in carbonio", desc: "Galleria del vento a Maranello.", cost: 1200 },
      { name: "Scopa d'oro", desc: "Leggendaria. Vola da sola.", cost: 2600 },
    ],
  },
  {
    key: "botti",
    title: "Botti",
    levels: [
      { name: "Niente botti", desc: "Si vola solo di planata.", cost: 0 },
      { name: "Raudi", desc: "Una spinta breve e rumorosa.", cost: 70 },
      { name: "Petardi", desc: "Più spinta, più baccano.", cost: 240 },
      { name: "Bengala", desc: "Spinta lunga e scintillante.", cost: 600 },
      { name: "Fontane", desc: "Una fontana di fuoco sotto la scopa.", cost: 1400 },
      { name: "Razzo di Capodanno", desc: "Mezzanotte anticipata.", cost: 2900 },
    ],
  },
  {
    key: "calze",
    title: "Calze",
    levels: [
      { name: "Nessuna calza", desc: "Compra calze da lanciare nei camini.", cost: 0 },
      { name: "2 calze", desc: "Lanciale nei camini: centro = tanti soldi.", cost: 30 },
      { name: "3 calze", desc: "Una in più, e più pesanti di dolci.", cost: 110 },
      { name: "4 calze", desc: "Carbone escluso.", cost: 300 },
      { name: "6 calze", desc: "Mezzo paese servito.", cost: 650 },
      { name: "8 calze", desc: "Tutto il paese. Anche i cattivi.", cost: 1300 },
    ],
  },
  {
    key: "cappello",
    title: "Cappello",
    levels: [
      { name: "Fazzoletto", desc: "Nessun potere. Tiene caldo.", cost: 0 },
      { name: "Fazzoletto a fiori", desc: "Attira le monete vicine. +10% lire.", cost: 60 },
      { name: "Cappello di lana", desc: "Calamita più forte. +20% lire.", cost: 220 },
      { name: "Cappello a punta", desc: "Monete da lontano. +30% lire.", cost: 520 },
      { name: "Cappello stellato", desc: "Attira tutto. +45% lire.", cost: 1150 },
      { name: "Cappello della Befana", desc: "Quello vero. +60% lire.", cost: 2200 },
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
  coin: 5, // moneta da 500 lire
  chimney: 30, // calza nel camino
  roof: 8, // calza sul tetto
};

// tappe del viaggio: bonus la prima volta che le superi
export type Milestone = { x: number; name: string; bonus: number };
export const MILESTONES: Milestone[] = [
  { x: 150, name: "Il pollaio", bonus: 15 },
  { x: 400, name: "Il campanile", bonus: 30 },
  { x: 800, name: "Il presepe vivente", bonus: 60 },
  { x: 1300, name: "Il lago ghiacciato", bonus: 100 },
  { x: 2000, name: "L'Appennino", bonus: 150 },
  { x: 2800, name: "Gli acquedotti", bonus: 220 },
  { x: 3600, name: "Il Colosseo", bonus: 300 },
  { x: 4300, name: "Castel Sant'Angelo", bonus: 400 },
  { x: GOAL, name: "Piazza Navona", bonus: 0 },
];

// calendario: run 1 = 1 dicembre, l'Epifania è il 6 gennaio (run 37)
export const EPIFANIA = 37;
const MESI = ["dicembre", "gennaio"];
export function dateOf(run: number): string {
  const d = run - 1; // giorni dopo il 1 dicembre
  if (d < 31) return `${d + 1} ${MESI[0]}`;
  if (d < 62) return `${d - 30} ${MESI[1]}`;
  return `giorno ${run}`;
}

export function lire(pt: number): string {
  return `L. ${String(Math.round(pt) * LIRE).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
