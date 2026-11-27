// Classifica online: niente login, solo un nick (anche nessuno).
// L'id segreto vive in localStorage ("vg-player", condiviso da tutti i giochi della sfida):
// ai giochi dopo il nick è già pronto, e rinominarsi si porta dietro tutti i punteggi.
// La classifica pubblica è anonima: tag di 4 caratteri, e "TU" per chi gioca.
const GAME = "vola-befana";
const API =
  location.hostname === "videogiochi.davideghiotto.it"
    ? "/api"
    : location.hostname === "localhost"
      ? "http://localhost:8790/api" // bun ../../videogiochi/scores/server.ts
      : "https://videogiochi.davideghiotto.it/api";
const KEY = "vg-player";
const PENDING = `vg-pending-${GAME}`;

export type Player = { id: string; nick: string | null };
export type Row = { rank: number; tag: string; score: number; floor: number; me?: boolean };
export type Board = { rows: Row[]; total: number; me: { tag: string; score: number; rank: number | null } | null };

function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

let mem: Player | null = null;
export function player(): Player {
  if (mem) return mem;
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    if (p && typeof p.id === "string") return (mem = { id: p.id, nick: p.nick || null });
  } catch {
    /* storage bloccato: giocatore di sessione */
  }
  mem = { id: uuid(), nick: null };
  save();
  return mem;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {
    /* pazienza */
  }
}

export function cleanNick(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 16);
}

export function setNick(nick: string) {
  const p = player();
  const n = cleanNick(nick) || null;
  if (n === p.nick) return;
  p.nick = n;
  save();
  fetch(`${API}/players/${p.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nick: n }),
  }).catch(() => {});
}

type Pending = { score: number; floor: number; combo: number };
// Manda il punteggio; se la rete manca tiene il migliore in sospeso e riprova alla prossima.
export async function submit(score: number, floor: number, combo: number): Promise<number | null> {
  const p = player();
  let send: Pending = { score, floor, combo };
  try {
    const old = JSON.parse(localStorage.getItem(PENDING) || "null") as Pending | null;
    if (old && old.score > send.score) send = old;
  } catch {
    /* niente */
  }
  try {
    const r = await fetch(`${API}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: p.id, game: GAME, nick: p.nick, ...send }),
    });
    if (!r.ok) throw new Error(String(r.status));
    try {
      localStorage.removeItem(PENDING);
    } catch {
      /* niente */
    }
    return ((await r.json()) as { rank: number | null }).rank;
  } catch {
    try {
      localStorage.setItem(PENDING, JSON.stringify(send));
    } catch {
      /* niente */
    }
    return null;
  }
}

export async function board(limit = 5): Promise<Board | null> {
  try {
    const r = await fetch(`${API}/leaderboard/${GAME}?limit=${limit}&player=${player().id}`);
    if (!r.ok) return null;
    const b = (await r.json()) as Board;
    for (const row of b.rows) row.me = !!b.me && row.tag === b.me.tag;
    return b;
  } catch {
    return null;
  }
}
