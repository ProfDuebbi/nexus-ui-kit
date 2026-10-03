# Nexus UI Kit · v1.0.1

**CC BY-NC 4.0** — benutzen, ändern und weitergeben erlaubt · Nennung Pflicht · nicht kommerziell.
Ausführlich in [`LIZENZ.txt`](LIZENZ.txt), verbindlich in [`LICENSE`](LICENSE).

Ein dunkles Interface-System: ruhige Flächen, **eine** Akzentfarbe, ein Marken-Verlauf
und überall dieselbe Bewegungs-Handschrift.

Entworfen von **Brainstorm Studios · DrDübbi**. Dieses Paket ist die herausgelöste Design-Ebene —
kein Projektcode, keine Daten, keine Abhängigkeiten. Nur eine CSS-Datei, ein kleines
Skript für die Farbe und eine Schauseite, die alles zeigt.

---

## Was drin ist

| Datei | Wofür |
|---|---|
| `nexus.css` | Das System. Tokens, Shell, alle Bausteine. Eine Datei, keine Abhängigkeiten. |
| `nexus-tokens.css` | Nur die Variablen — für Projekte, die dieselben Farben sprechen, aber eigene Bausteine haben. |
| `nexus-accent.js` | Akzent-Engine: aus einer Farbe wird das ganze Farbset inkl. Verlauf. |
| `tokens.json` | Dieselben Werte maschinenlesbar (Figma-Import, Build-Skripte, Doku). |
| `tailwind-preset.js` | Tokens als Tailwind-Theme, falls Tailwind im Spiel ist. |
| `index.html` | Die Schauseite: jeder Baustein, live, mit Farbwähler. |

Einfach `index.html` im Browser öffnen — kein Build, kein Server nötig.

---

## Einbauen

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="nexus.css">
<script src="nexus-accent.js"></script>
```

Die Grundfläche ist `.nx`. Alles darin erbt Farben, Schrift und Kurven:

```html
<body class="nx nx-app">
  <div class="nx-glow"></div>              <!-- die drei Lichter im Hintergrund -->

  <header class="nx-top">…</header>

  <div class="nx-body">
    <nav class="nx-rail">…</nav>           <!-- Seitenleiste -->
    <main class="nx-content">
      <div class="nx-wrap">…</div>         <!-- zentrierter Inhalt, max. 1440px -->
    </main>
  </div>
</body>
```

`.nx-app` macht daraus eine feste App-Fläche (Leiste scrollt nicht mit).
Ohne `.nx-app` wird es eine normal scrollende Seite — dann `.nx-page` statt `.nx-wrap`.

### Schriften

**Inter** für Text, **JetBrains Mono** für Kicker, Zahlen und Tasten. Beide frei.
Eigene Schriften gehen auch:

```css
:root { --nx-font: "Satoshi"; --nx-mono: "Berkeley Mono"; }
```

---

## Umfärben

Das ganze System hängt an einer Farbe.

```js
nexusAkzent("#22d3ee");   // faerbt alles um: Knoepfe, Leiste, Fokus, Verlauf
nexusAkzent(null);        // zurueck auf Violett
```

Oder ganz ohne Skript, direkt in CSS:

```css
:root {
  --nx-accent:   #22d3ee;
  --nx-accent-2: #2dd4bf;   /* warmer Pol */
  --nx-accent-3: #3b82f6;   /* kuehler Pol */
}
```

Die Engine korrigiert jede Eingabe auf eine Helligkeit, auf der weißer Text noch
funktioniert — man darf also auch Dunkelbraun wählen, ohne dass Knöpfe unlesbar werden.
Den Verlauf dreht sie eng um die gewählte Farbe (−32° / +30°), damit ein pinker Akzent
nicht nach Orange ausläuft.

Serverseitig (Next.js, PHP, was auch immer) geht auch:

```js
const css = nexusAkzentCss("#22d3ee");   // ":root{--nx-accent:hsl(…);…}"
```

**Was sich bewusst NICHT mitfärbt:** die Bedeutungsfarben grün/gelb/rot.
Sonst wird „Fehler" zur Geschmacksfrage.

---

## Die Bausteine

**Fläche & Rahmen** — `.nx`, `.nx-glow`, `.nx-app`, `.nx-body`, `.nx-content`, `.nx-wrap`, `.nx-page`

**Kopfzeile** — `.nx-top`, `.nx-brand`, `.nx-brand-text` (mit `<em>` fürs Verlaufswort), `.nx-searchbtn`, `.nx-user`, `.nx-crumbs`

**Seitenleiste** — `.nx-rail`, `.nx-rail-item` (aktiv: `.nx-rail-on`), `.nx-rail-sec`, `.nx-rail-sep`, `.nx-rail-tip`, `.nx-rail-foot`, `.nx-badge`
Einklappen: `.nx-body.is-narrow` → Icon-Schiene. Mobil: `.nx-mtabs` unten.

**Knöpfe** — `.nx-btn` plus `-primary` (Verlauf), `-accent`, `-plain`, `-danger`, `-icon`, `-sm`, `-lg`, `-block`

**Typografie** — `.nx-h1` (mit `<em>` = Verlaufswort), `.nx-lead`, `.nx-kicker`, `.nx-sechead`, `.nx-mono`, `.nx-kbd`, `.nx-count`

**Karten** — `.nx-panel` (+ `-head`, `-sub`, `-tight`), `.nx-card`

**Kennzahlen** — `.nx-kpis` / `.nx-kpi`. Farbe je Kachel über `--tint`.

**Kacheln** — `.nx-tile-grid` / `.nx-tile`. Farbe aus zwei Farbwinkeln: `style="--h:265; --h2:225"`.
Sättigung und Helligkeit sind fest, damit eine Wand aus Kacheln als ein Satz wirkt.

**Tabellen** — `.nx-tablewrap` + `.nx-table`. Mit `.nx-table-cards` brechen Zeilen
auf schmalen Schirmen zu Karten um (jedes `<td>` braucht dann ein `data-label`).

**Status** — `.nx-badge-st` mit `.nx-st-offen` / `-arbeit` / `-warten` / `-ok` / `-weg`,
oder eigene Farbe über `style="--st: var(--info)"`.

**Formulare** — `.nx-field`, `.nx-input`, `.nx-textarea`, `.nx-select`, `.nx-form-row`, `.nx-form-acts`

**Dialoge** — `.nx-modal-veil` > `.nx-modal` > `-head` / `-body` / `-foot`. `hidden` schließt.

**Kleinteile** — `.nx-chip`, `.nx-dot`, `.nx-avatar`, `.nx-people`, `.nx-note`, `.nx-empty`,
`.nx-toast`, `.nx-tabsbar` / `.nx-tab`, `.nx-spinner`, `.nx-skelett`

**Kurzhinweise** — statt `title` einfach `data-tip="…"`, Richtung mit
`data-tip-pos="oben|links"`. Kommt sofort, ohne die Verzögerung des Browsers.

---

## Die Regeln dahinter

1. **Flächen stapeln, nicht rahmen.** `--bg` → `--surface` → `--elev` → `--elev2`.
   Je wichtiger, desto heller. Rahmen nur, wo eine Kante wirklich trennt.
2. **Eine Akzentfarbe, sparsam.** Der Akzent markiert das Aktive und das Nächste —
   nicht jede Überschrift. Der Verlauf ist ein Ereignis, kein Grundzustand.
3. **Bedeutungsfarben sind unantastbar.** Grün heißt erledigt, rot heißt kaputt.
4. **Eine Kurve für alles.** `cubic-bezier(0.22, 1, 0.36, 1)`, 160 ms beim Hover,
   200–250 ms für Zustände, 280–500 ms beim Einblenden.
5. **Nichts springt.** Beim Überfahren fährt eine Kante ein, die Fläche kommt als
   weicher Verlauf, Symbole machen eine winzige Bewegung. Kein harter Farbumschlag.
6. **Listen kommen gestaffelt.** `.nx-rise` mit `--i` als Index, 35 ms Versatz.
7. **Leere Zustände erklären.** `.nx-empty` sagt, was fehlt und was man tun kann.
8. **`prefers-reduced-motion` wird respektiert** — steckt schon drin.

---

## Barrierefreiheit

- Fokus ist überall sichtbar (2 px Ring in der Akzentfarbe).
- Die Akzent-Engine hält den Kontrast in einem brauchbaren Fenster.
- Bewegung lässt sich systemweit abschalten.
- `.nx-sr` blendet Text visuell aus, lässt ihn aber für Screenreader stehen.

---

## Änderungen

**v1.0.1 — 3. Oktober 2026**

Eine ältere Dialogform lag noch neben der aktuellen: `.nx-modal` war zweimal
definiert (früher die Vollfläche mit `.nx-modal-box` darin, heute der Kasten
innerhalb von `.nx-modal-veil`). Die alte Fassung wirkte in die neue hinein —
Kopf, Rumpf und Fuß eines Dialogs schrumpften auf Inhaltsbreite, die
Trennlinien reichten nicht bis an den Rand, und auf dem Kasten lag ein
Weichzeichner, den es ausdrücklich nicht geben soll.

Die alte Form ist entfernt. **`.nx-modal-box` gibt es nicht mehr** — wer sie
benutzt hat, stellt auf `.nx-modal-veil` > `.nx-modal` um (siehe „Die
Bausteine"). Sonst ändert sich nichts: keine Tokens, keine Klassennamen,
keine Farben.

---

## Lizenz

**CC BY-NC 4.0** — benutzen, ändern und weitergeben ist erlaubt, auch in eigenen
Projekten. Zwei Bedingungen: **nennen** und **nicht kommerziell**.

```
Nexus UI Kit von Brainstorm-Studios.de (DrDübbi), CC BY-NC 4.0
https://brainstorm-studios.de/de/arbeiten/nexus-ui-kit
```

Wer etwas damit verkaufen will, fragt einmal kurz — die Antwort ist meistens ja:
[brainstorm-studios.de/de/kontakt](https://brainstorm-studios.de/de/kontakt)

Ausführlich in `LIZENZ.txt` (deutsch, mit Erklärung), verbindlich in `LICENSE`
(der Volltext von Creative Commons).

In **CTRL·DECK** (AGPL-3.0) und im **Police Chief Simulator Trainer** (MIT)
steckt eine Kopie der Gestaltungsebene — dort gilt die Lizenz des jeweiligen
Projekts. Das eigenständige Kit hier ist davon unabhängig.

---

Veröffentlicht am **1. Juli 2026** · v1.0.1 (3. Oktober 2026) · Copyright © 2026 Brainstorm Studios · DrDübbi
