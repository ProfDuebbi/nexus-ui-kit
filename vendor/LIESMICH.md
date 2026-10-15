# vendor/ — fremde Dateien, nicht Teil des Kits

Hier liegen zwei fremde Bibliotheken, die **nur die Schauseite**
(`index.html`) benutzt. Sie gehören **nicht zum Nexus UI Kit** und sind
deshalb auch **nicht im Paket** (`nexus-ui-kit.zip` / `.tar.gz`) — die
Dateiliste in `paket-bauen.mjs` ist eine Erlaubnisliste, dieser Ordner
steht nicht darin.

Sie liegen selbst gehostet daneben statt an einem CDN, weil die
Datenschutzerklärung von brainstorm-studios.de zusagt, dass beim Ansehen
der Seite keine Verbindung zu Dritten aufgebaut wird. Dieselbe Zusage,
wegen der `schrift.css` die Google Fonts ersetzt.

| Datei | Herkunft | Lizenz |
|---|---|---|
| `gsap.min.js` | GSAP 3.15.0, `npm:gsap@3.15.0/dist/gsap.min.js` | GreenSock Standard „No Charge" — <https://gsap.com/standard-license> |
| `ScrollTrigger.min.js` | GSAP 3.15.0, `npm:gsap@3.15.0/dist/ScrollTrigger.min.js` | dieselbe |
| `lenis.min.js` | Lenis 1.3.26, `npm:lenis@1.3.26/dist/lenis.min.js` | MIT, © darkroom.engineering |

**Die Lizenzvermerke in den Dateiköpfen bleiben stehen.** Bei GSAP ist
das ausdrücklich Bedingung der Lizenz.

`nexus-motion.js` kommt ohne beide aus: fehlen sie, fällt es auf
IntersectionObserver und CSS-Übergänge zurück. Wer das Kit herunterlädt,
bekommt genau diesen Weg — und sieht im Abschnitt „Im Scrollen", welcher
gerade läuft.

## Erneuern

```sh
curl -sSLo vendor/gsap.min.js          https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js
curl -sSLo vendor/ScrollTrigger.min.js https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js
curl -sSLo vendor/lenis.min.js         https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js
```

Danach die Versionsnummern in dieser Tabelle nachziehen.
