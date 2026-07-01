/**
 * NEXUS UI KIT — Akzent-Engine
 *
 * Copyright (C) 2026 Brainstorm Studios - DrDuebbi. CC BY-NC 4.0 - Nennung
 * Pflicht, nicht kommerziell. Siehe LIZENZ.txt.
 *
 * Eine einzige Farbe faerbt das ganze Interface: Knoepfe, aktive
 * Menuepunkte, Fokus-Ringe, den Marken-Verlauf.
 *
 * Zwei Dinge macht die Engine automatisch:
 *
 * 1. Sie zieht jede Eingabe in ein brauchbares Fenster. Eine Farbe darf
 *    frei gewaehlt werden (auch Dunkelbraun oder fast Schwarz) — Helligkeit
 *    und Saettigung werden so korrigiert, dass weisser Text darauf lesbar
 *    bleibt und die Farbe ueberhaupt noch nach Akzent aussieht.
 *
 * 2. Sie baut daraus den Verlauf: kuehler Pol -> Akzent -> warmer Pol.
 *    Die Drehung ist bewusst eng (-32 / +30 Grad), damit der Verlauf in der
 *    Farbfamilie bleibt. Bei weiten Draehen laeuft z.B. ein pinker Akzent
 *    sichtbar nach Orange aus.
 *
 * Ohne Build-Schritt nutzbar:
 *   <script src="nexus-accent.js"></script>
 *   nexusAkzent("#22d3ee");            // faerbt das ganze Dokument
 *   nexusAkzent(null);                 // zurueck auf die Standardfarbe
 *   nexusAkzentTokens("#22d3ee");      // nur die Tokens als Objekt
 */
(function (global) {
  "use strict";

  var STANDARD = "#8b5cf6";

  function hexZuHsl(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    var h6 = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
    var num = parseInt(h6, 16);
    var r = ((num >> 16) & 255) / 255,
        g = ((num >> 8) & 255) / 255,
        b = (num & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, d = max - min;
    if (d === 0) return { h: 0, s: 0, l: l * 100 };
    var s = d / (1 - Math.abs(2 * l - 1));
    var h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    return { h: h, s: s * 100, l: l * 100 };
  }

  var hsl = function (c) { return "hsl(" + c.h + " " + Math.round(c.s) + "% " + Math.round(c.l) + "%)"; };
  var hsla = function (c, a) { return "hsl(" + c.h + " " + Math.round(c.s) + "% " + Math.round(c.l) + "% / " + a + ")"; };

  /* Nicht so dunkel, dass weisser Text verschwindet; nicht so blass,
     dass er ueberstrahlt; genug Saettigung fuer einen echten Akzent. */
  function normalisieren(c) {
    return {
      h: c.h,
      s: Math.min(92, Math.max(c.s < 8 ? 0 : 45, c.s)),
      l: Math.min(72, Math.max(52, c.l))
    };
  }

  function tokens(farbe) {
    var roh = hexZuHsl(farbe || STANDARD);
    if (!roh) return null;
    var basis = normalisieren(roh);
    var kuehl = { h: (basis.h + 328) % 360, s: basis.s, l: Math.min(70, basis.l + 5) };
    var warm  = { h: (basis.h + 30) % 360,  s: basis.s, l: Math.min(70, basis.l + 2) };
    return {
      "--nx-accent": hsl(basis),
      "--nx-accent-2": hsl(warm),
      "--nx-accent-3": hsl(kuehl),
      "--nx-accent-soft": hsla(basis, 0.14),
      "--nx-accent-glow": hsla(basis, 0.45),
      "--nx-grad": "linear-gradient(105deg, " + hsl(kuehl) + " 0%, " + hsl(basis) + " 50%, " + hsl(warm) + " 100%)",
      "--nx-grad-soft": "linear-gradient(105deg, " + hsla(kuehl, 0.14) + ", " + hsla(warm, 0.14) + ")"
    };
  }

  /** Tokens als CSS-Regel — z.B. serverseitig ins <head> schreiben. */
  function css(farbe, selektor) {
    var t = tokens(farbe);
    if (!t) return null;
    return (selektor || ":root") + "{" + Object.keys(t).map(function (k) {
      return k + ":" + t[k];
    }).join(";") + "}";
  }

  /** Setzt die Farbe direkt am Element (Standard: <html>). */
  function anwenden(farbe, el) {
    var ziel = el || (global.document && global.document.documentElement);
    if (!ziel) return null;
    var t = tokens(farbe);
    if (!farbe || !t) {
      ["--nx-accent", "--nx-accent-2", "--nx-accent-3", "--nx-accent-soft",
       "--nx-accent-glow", "--nx-grad", "--nx-grad-soft"].forEach(function (k) {
        ziel.style.removeProperty(k);
      });
      return null;
    }
    Object.keys(t).forEach(function (k) { ziel.style.setProperty(k, t[k]); });
    return t;
  }

  global.nexusAkzent = anwenden;
  global.nexusAkzentTokens = tokens;
  global.nexusAkzentCss = css;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { anwenden: anwenden, tokens: tokens, css: css, STANDARD: STANDARD };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
