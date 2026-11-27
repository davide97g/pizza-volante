# Vola, Befana!

Gioco della serie "Videogiochi della mia infanzia". Lancia-e-potenzia nello stile di Learn to Fly, ma con la Befana:
la scopa è rotta e l'Epifania si avvicina. Ogni volo è un giorno di dicembre: scendi dalla rampa, plana inclinandoti
(picchiare dà velocità, tirare su troppo fa stallare), accendi i botti di Capodanno, lancia le calze nei camini e
cerca di arrivare a Piazza Navona (5.000 m) prima del 6 gennaio.

Le lire guadagnate (distanza, quota, velocità, tempo in aria, monete da 500, calze consegnate, tappe nuove) si spendono
nel laboratorio: rampa (dal tetto di casa al trampolino di Cortina), scopa, botti, calze, cappello (calamita + bonus).
Lungo la strada: il pollaio, il campanile, il presepe vivente, il lago ghiacciato (si scivola), l'Appennino, gli
acquedotti, il Colosseo, Castel Sant'Angelo. I fumi dei camini spingono su, i panettoni ricaricano i botti, i corvi
frenano. Progressi salvati in localStorage.

Canvas 2D, tutto disegnato nel codice (`src/befana.ts`, `src/scenery.ts`), fisica in `src/sim.ts` (rampa, planata con
stallo, rimbalzi e scivolata nella neve), musica (una tarantella originale) ed effetti con Web Audio (`src/audio.ts`),
classifica condivisa della serie (`src/scores.ts`, GAME = vola-befana: distanza, quota massima, calze nei camini).

```sh
bun run build   # dist/
bun run dev     # build + http://localhost:5195
bun run check   # typecheck
bun run tune    # pilota automatico: quanti voli servono per arrivare a Piazza Navona
```

Comandi: frecce su/giù o W/S per inclinarsi, Spazio botti, X calza, M audio, P pausa.
Telefono: tasti ▲▼, BOTTI e CALZA sullo schermo.

Materiali itch in `itch/` (`itch/shots.sh` rifà copertina e screenshot).

Licenze: codice del gioco scritto per la serie; nessun asset esterno (grafica, musica ed effetti generati nel codice).
Font da Google Fonts: Fredoka e Mountains of Christmas (SIL Open Font License).
