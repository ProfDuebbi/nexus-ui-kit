/* Baut die beiden Archive, die auf der Schauseite zum Laden angeboten
   werden.  →  node paket-bauen.mjs

   Zwei Dinge macht dieses Skript anders als ein Rechtsklick auf den
   Ordner:

   1. ERLAUBNISLISTE statt Ausschlussliste. Was nicht in DATEIEN steht,
      landet nicht im Paket — also weder dieses Skript noch .git noch
      die Archive selbst. Bei einem Paket, das jemand herunterlaedt, ist
      das der richtige Weg herum: vergessen heisst dann "fehlt", nicht
      "ist versehentlich drin".

   2. FESTE ZEITSTEMPEL. Jede Datei im Archiv traegt den
      Veroeffentlichungszeitpunkt (1. Juli 2026, 12:00) statt der Uhrzeit
      des Bauens. Dadurch ist das Archiv bei gleichem Inhalt Byte fuer
      Byte dasselbe — wer zweimal baut, bekommt nicht zwei verschiedene
      Dateien, und ein Vergleich sagt etwas ueber den Inhalt aus.

   Die Archive selbst gehoeren nicht ins Repo (.gitignore faengt sie ab);
   sie werden gebaut, hochgeladen und wieder vergessen. */

import { createWriteStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { deflateRawSync, crc32 } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const HIER = dirname(fileURLToPath(import.meta.url));

/* Die neun Dateien des Pakets — dieselbe Liste, die in index.html unter
   "Das Paket" steht. Laeuft beides auseinander, faellt es beim naechsten
   Bau auf: eine fehlende Datei bricht hier ab. */
const DATEIEN = [
  'index.html',
  'nexus.css',
  'nexus-tokens.css',
  'nexus-accent.js',
  'tokens.json',
  'tailwind-preset.js',
  'README.md',
  'LIZENZ.txt',
  'LICENSE',
];

const ORDNER = 'nexus-ui-kit';
/* 1. Juli 2026, 12:00 Ortszeit — der Tag der Veroeffentlichung. */
const STAND = new Date(2026, 6, 1, 12, 0, 0);

const inhalte = [];
for (const name of DATEIEN) {
  const pfad = join(HIER, name);
  try {
    await stat(pfad);
  } catch {
    console.error(`\n  Es fehlt: ${name}\n`);
    process.exit(1);
  }
  inhalte.push({ name, daten: await readFile(pfad) });
}

/* ------------------------------------------------------------- ZIP */

/* Von Hand statt mit einem Paket: neun Dateien ohne Verschluesselung
   und ohne Zip64 sind ein ueberschaubares Format, und eine Abhaengigkeit
   fuer einen Schritt, der einmal im Halbjahr laeuft, waere teurer als
   diese fuenfzig Zeilen. */
function dosZeit(d) {
  const zeit = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const datum = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { zeit, datum };
}

function baueZip(eintraege) {
  const { zeit, datum } = dosZeit(STAND);
  const stuecke = [];
  const verzeichnis = [];
  let versatz = 0;

  for (const { name, daten } of eintraege) {
    const pfad = Buffer.from(`${ORDNER}/${name}`, 'utf8');
    const gepackt = deflateRawSync(daten, { level: 9 });
    const pruefsumme = crc32(daten);

    const kopf = Buffer.alloc(30);
    kopf.writeUInt32LE(0x04034b50, 0);
    kopf.writeUInt16LE(20, 4);          // Version
    kopf.writeUInt16LE(0x0800, 6);      // Bit 11: Name ist UTF-8
    kopf.writeUInt16LE(8, 8);           // deflate
    kopf.writeUInt16LE(zeit, 10);
    kopf.writeUInt16LE(datum, 12);
    kopf.writeUInt32LE(pruefsumme, 14);
    kopf.writeUInt32LE(gepackt.length, 18);
    kopf.writeUInt32LE(daten.length, 22);
    kopf.writeUInt16LE(pfad.length, 26);
    stuecke.push(kopf, pfad, gepackt);

    const eintrag = Buffer.alloc(46);
    eintrag.writeUInt32LE(0x02014b50, 0);
    eintrag.writeUInt16LE(20, 4);
    eintrag.writeUInt16LE(20, 6);
    eintrag.writeUInt16LE(0x0800, 8);
    eintrag.writeUInt16LE(8, 10);
    eintrag.writeUInt16LE(zeit, 12);
    eintrag.writeUInt16LE(datum, 14);
    eintrag.writeUInt32LE(pruefsumme, 16);
    eintrag.writeUInt32LE(gepackt.length, 20);
    eintrag.writeUInt32LE(daten.length, 24);
    eintrag.writeUInt16LE(pfad.length, 28);
    eintrag.writeUInt32LE(0o644 << 16, 38); // Rechte fuer Unix
    eintrag.writeUInt32LE(versatz, 42);
    verzeichnis.push(eintrag, pfad);

    versatz += kopf.length + pfad.length + gepackt.length;
  }

  const verzeichnisBytes = Buffer.concat(verzeichnis);
  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(eintraege.length, 8);
  ende.writeUInt16LE(eintraege.length, 10);
  ende.writeUInt32LE(verzeichnisBytes.length, 12);
  ende.writeUInt32LE(versatz, 16);

  return Buffer.concat([...stuecke, verzeichnisBytes, ende]);
}

/* ---------------------------------------------------------- tar.gz */

function tarKopf(name, groesse) {
  const kopf = Buffer.alloc(512);
  const setz = (text, ab, laenge) => kopf.write(text.padEnd(laenge, '\0'), ab, laenge, 'utf8');
  const oktal = (zahl, ab, laenge) =>
    kopf.write(zahl.toString(8).padStart(laenge - 1, '0') + '\0', ab, laenge, 'ascii');

  setz(`${ORDNER}/${name}`, 0, 100);
  oktal(0o644, 100, 8);
  oktal(0, 108, 8);                                  // uid
  oktal(0, 116, 8);                                  // gid
  oktal(groesse, 124, 12);
  oktal(Math.floor(STAND.getTime() / 1000), 136, 12);
  kopf.write('        ', 148, 8, 'ascii');           // Pruefsumme: erst Leerzeichen
  kopf.write('0', 156, 1, 'ascii');                  // normale Datei
  setz('ustar', 257, 6);
  kopf.write('00', 263, 2, 'ascii');

  let summe = 0;
  for (const byte of kopf) summe += byte;
  kopf.write(summe.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  return kopf;
}

function baueTar(eintraege) {
  const stuecke = [];
  for (const { name, daten } of eintraege) {
    stuecke.push(tarKopf(name, daten.length), daten);
    const rest = daten.length % 512;
    if (rest) stuecke.push(Buffer.alloc(512 - rest));
  }
  stuecke.push(Buffer.alloc(1024)); // zwei leere Bloecke als Schluss
  return Buffer.concat(stuecke);
}

/* ------------------------------------------------------------ Bauen */

const zip = baueZip(inhalte);
await pipeline(Readable.from([zip]), createWriteStream(join(HIER, 'nexus-ui-kit.zip')));

await pipeline(
  Readable.from([baueTar(inhalte)]),
  createGzip({ level: 9 }),
  createWriteStream(join(HIER, 'nexus-ui-kit.tar.gz')),
);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`\n  ${inhalte.length} Dateien gepackt, Stand ${STAND.toLocaleDateString('de-DE')}`);
console.log(`    nexus-ui-kit.zip      ${kb(zip.length)}`);
console.log(`    nexus-ui-kit.tar.gz   ${kb((await stat(join(HIER, 'nexus-ui-kit.tar.gz'))).size)}\n`);
