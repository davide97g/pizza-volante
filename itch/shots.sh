#!/usr/bin/env bash
# Copertina itch (630x500) + screenshot (960x720), audio muto. Usa agent-browser sulla build locale.
# Uscita: itch/cover.png, itch/out/screenshots/*.png
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$PWD/itch/out/screenshots"
mkdir -p "$OUT"
bun run build >/dev/null
bunx serve dist -l 5196 >/dev/null 2>&1 &
SRV=$!
ab() { agent-browser --namespace volabef --session volo "$@" >/dev/null; }
trap 'kill $SRV 2>/dev/null; ab close || true' EXIT
until curl -s -o /dev/null localhost:5196/; do sleep 0.5; done
URL=http://localhost:5196/

# salvataggio a metà partita: botti, calze e scopa buona
MID='{"money":1450,"lv":{"rampa":4,"scopa":4,"botti":3,"calze":4,"cappello":2},"run":14,"best":2380,"bestAlt":180,"bestKmh":460,"passed":[150,400,800,1300,2000],"won":false,"wonRun":0,"chimneys":9,"playTime":600}'
# pilota automatico: tiene l'assetto, usa i botti finché ci sono
AUTO='(() => { const held = {}; const key = (k, on) => { if (!!held[k] === on) return; held[k] = on; window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k })); };
  setInterval(() => { const { f, state } = __game(); if (state !== "fly") return; const t = f.fuel > 0 ? 0.45 : 0.03;
  key("ArrowUp", f.th < t - 0.04); key("ArrowDown", f.th > t + 0.04); key(" ", f.fuel > 0); }, 30); return 1; })()'

# copertina: solo logo e Befana sopra la scena
ab set viewport 630 500
ab open $URL
ab eval 'localStorage.clear(); localStorage.setItem("vola-befana-muted","1"); 1'
ab open $URL
sleep 2.5
ab eval 'const s=document.createElement("style"); s.textContent="#corner,.tag,.cta,#title-board{display:none!important} .logo{margin-top:18px!important} .logo .a{font-size:58px!important} .logo .b{font-size:116px!important}"; document.head.append(s); document.activeElement.blur(); 1'
sleep 0.6
ab screenshot "$PWD/itch/cover.png"

ab set viewport 960 720
ab open $URL
sleep 2
ab eval 'document.getElementById("title-board").style.display="none"; document.activeElement.blur(); 1'
ab screenshot "$OUT/01-titolo.png"

ab eval "localStorage.setItem('vola-befana-save', '$MID'); 1"
ab open $URL
sleep 1.5
ab click '#play'
sleep 1
ab screenshot "$OUT/03-laboratorio.png"
ab eval "$AUTO"
ab press Space
sleep 0.8
ab press Space
sleep 9
ab screenshot "$OUT/02-volo.png"
ls "$OUT"
