/**
 * Nexus UI Kit als Tailwind-Theme.
 *
 * Copyright (C) 2026 Brainstorm Studios - DrDuebbi. CC BY-NC 4.0 - Nennung
 * Pflicht, nicht kommerziell. Siehe LIZENZ.txt.
 * Die Werte zeigen auf dieselben CSS-Variablen — wer zur Laufzeit umfaerbt,
 * faerbt damit auch die Tailwind-Klassen mit.
 *
 *   // tailwind.config.js
 *   module.exports = { presets: [require("./tailwind-preset")], ... }
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        grund: "var(--bg)",
        flaeche: "var(--surface)",
        hoch: "var(--elev)",
        hoch2: "var(--elev2)",
        kante: "var(--line)",
        kante2: "var(--line2)",
        text: "var(--text)",
        gedaempft: "var(--muted)",
        zart: "var(--faint)",
        akzent: { DEFAULT: "var(--akzent)", warm: "var(--akzent-2)", kuehl: "var(--akzent-3)" },
        ok: "var(--ok)",
        warn: "var(--warn)",
        gefahr: "var(--danger)",
        info: "var(--info)"
      },
      backgroundImage: { marke: "var(--grad)" },
      fontFamily: {
        sans: ["var(--nx-font-sans)"],
        mono: ["var(--nx-font-mono)"]
      },
      borderRadius: { sm: "9px", DEFAULT: "11px", md: "14px", lg: "16px", pill: "999px" },
      transitionTimingFunction: { nexus: "cubic-bezier(0.22, 1, 0.36, 1)" },
      transitionDuration: { hover: "160ms", zustand: "220ms", rein: "400ms" },
      boxShadow: {
        karte: "0 18px 40px -22px rgba(0,0,0,.9)",
        dialog: "0 30px 80px rgba(0,0,0,.6)"
      }
    }
  }
};
