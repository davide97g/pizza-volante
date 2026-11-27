# Pizza Volante

Gioco della serie "Videogiochi della mia infanzia". Lancia-e-potenzia nello stile di Learn to Fly: Gennarino, fattorino
di una pizzeria sul Vesuvio, deve portare una pizza al concerto di Capodanno in Piazza del Plebiscito (5.000 m) entro
il 31 dicembre. Ogni volo è un giorno di dicembre: giù dalla rampa con la Vespa, plana con l'ala inclinandoti
(picchiare dà velocità, tirare su troppo fa stallare), accendi i botti e lancia le pizze nei panari sui tetti.

Le mance (distanza, quota, velocità, tempo in aria, monete da 2 euro, pizze consegnate, tappe nuove) si spendono nel
garage: rampa (dal vicolo in discesa al bordo del cratere), ali (dal cartone della pizza al deltaplano), botti,
pizze, portafortuna (calamita + bonus). Lungo la strada: il limoneto, il campanile, San Gregorio Armeno, il lungomare
(si scivola), Posillipo, l'acquedotto, il Maschio Angioino, Castel dell'Ovo. Il fumo dei forni a legna spinge su, le
sfogliatelle ricaricano i botti, i gabbiani frenano. Progressi salvati in localStorage.

Canvas 2D, tutto disegnato nel codice (`src/rider.ts`, `src/scenery.ts`), fisica in `src/sim.ts` (rampa, planata con
stallo, rimbalzi e scivolata), musica (una tarantella originale) ed effetti con Web Audio (`src/audio.ts`), classifica
condivisa della serie (`src/scores.ts`, GAME = pizza-volante: distanza, quota massima, pizze nei panari).

```sh
bun run build   # dist/
bun run dev     # build + http://localhost:5195
bun run check   # typecheck
bun run tune    # pilota automatico: quanti voli servono per arrivare al Plebiscito
```

Comandi: frecce su/giù o W/S per inclinarsi, Spazio botti, X pizza, M audio, P pausa.
Telefono: tasti ▲▼, BOTTI e PIZZA sullo schermo.

Materiali itch in `itch/` (`itch/shots.sh` rifà copertina e screenshot).

Licenze: nessun asset esterno (grafica, musica ed effetti generati nel codice).
Font da Google Fonts: Fredoka e Mountains of Christmas (SIL Open Font License).
