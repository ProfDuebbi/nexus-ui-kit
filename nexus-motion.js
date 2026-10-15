/**
 * NEXUS UI KIT — Bewegungs-Ebene
 *
 * Copyright (C) 2026 Brainstorm Studios - DrDuebbi. CC BY-NC 4.0 - Nennung
 * Pflicht, nicht kommerziell. Siehe LIZENZ.txt.
 *
 * Das System hat seine Handschrift bisher im Hover gehabt: eine Kurve,
 * 160 bis 250 ms, nichts springt. Diese Datei zieht dieselbe Handschrift
 * ins SCROLLEN — Auftritte, Zaehler, Drift, Fortschritt.
 *
 * ZWEI BETRIEBSARTEN, DERSELBE AUSGANG
 *
 *   gross   Liegt GSAP (+ ScrollTrigger) und/oder Lenis auf dem Fenster,
 *           werden sie benutzt: echte Interpolation, scrubbare Drift,
 *           weiches Scrollen mit Traegheit.
 *   klein   Liegt nichts da, macht es dieselbe Datei mit
 *           IntersectionObserver und CSS-Uebergaengen.
 *
 * Das ist Absicht und keine Hoeflichkeit: das Kit verspricht in der
 * LIESMICH "keine Abhaengigkeiten", und die beiden Bibliotheken haben
 * ihre EIGENEN Lizenzen (GSAP: GreenSock Standard "no charge", Lenis:
 * MIT). Sie liegen deshalb NICHT im Paket. Wer sie laden will, laedt sie
 * selbst dazu — diese Datei merkt es von allein.
 *
 * BENUTZUNG
 *   <script src="nexus-motion.js"></script>      <!-- in den <head> -->
 *   ...
 *   <script>nexusBewegung();</script>            <!-- ans Ende des <body> -->
 *
 *   Unter React, Vue & Co. gehoert der Aufruf in einen Effekt NACH dem
 *   ersten Rendern — render() arbeitet asynchron, ein Aufruf direkt
 *   danach saehe ein leeres Wurzelelement. Kommt spaeter Inhalt dazu
 *   (Reiter, Nachladen), sammelt bewegung.messen() ihn ein.
 *
 * IM MARKUP
 *   data-nx-auf                 Auftritt beim Hereinscrollen (= "rise")
 *   data-nx-auf="pop|fade|links|rechts"
 *   data-nx-auf-gruppe          am Elternteil: alle Kinder gestaffelt
 *   data-nx-zahl                zaehlt die Zahl im Text hoch, wenn sie kommt
 *   data-nx-drift="0.4"         driftet langsam mit (Hintergrund, Lichter)
 *   data-nx-fortschritt         bekommt --nx-fortschritt: 0 … 1
 *
 * Alles hoert auf prefers-reduced-motion: dann ist sofort alles da, die
 * Drift steht still und sanftes Scrollen wird gar nicht erst eingeschaltet.
 */
(function (global) {
  "use strict";

  var D = global.document;
  if (!D) return;

  var WURZEL = D.documentElement;

  var STANDARD = {
    scroller: null,    /* Element; null = selber suchen (.nx-content, sonst Fenster) */
    sanft: true,       /* Lenis benutzen, wenn vorhanden */
    dauer: 1.1,        /* Lenis: Traegheit in Sekunden */
    auftritt: true,    /* data-nx-auf beobachten */
    versatz: 35,       /* ms pro Element in einer Gruppe — wie .nx-rise */
    schwelle: 0.14,    /* so viel vom Element muss sichtbar sein */
    rand: "0px 0px -10% 0px", /* Auftritt erst ein Stueck ueber der Kante */
    einmal: true,      /* nach dem Auftritt nicht mehr beobachten */
    zahlen: true,      /* data-nx-zahl hochzaehlen */
    drift: true,       /* data-nx-drift bewegen */
    anker: true,       /* Sprungmarken weich anfahren */
    dialoge: true      /* .nx-modal-veil haelt das Scrollen an */
  };

  /* Die Kurve des Systems, als Zahlen — GSAP kann mit cubic-bezier() aus
     CSS nichts anfangen. Dieselben vier Werte wie --ease; "power4.out"
     ist dieselbe Kurve in GSAPs eigener Sprache. */
  var KURVE = [0.22, 1, 0.36, 1];
  var EASE = "power4.out";

  var gestartet = false;

  function ruhig() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function zahlAus(wert, ersatz) {
    var n = parseFloat(wert);
    return isFinite(n) ? n : ersatz;
  }

  function liste(wurzel, wahl) {
    return [].slice.call(wurzel.querySelectorAll(wahl));
  }

  /* ---------------------------------------------------------- Zaehler

     Aus "1.240 €" wird {vor:"", zahl:1240, nach:" €", stellen:0}. Die
     Formatierung geht danach denselben Weg zurueck, damit ein Zaehler
     unterwegs nicht ploetzlich anders aussieht als am Ziel. */
  function zerlegen(text) {
    var treffer = /-?[\d]+(?:[.,\s][\d]+)*/.exec(text);
    if (!treffer) return null;
    var roh = treffer[0];
    var rein = roh.replace(/\s/g, "");
    /* Deutsch gelesen: ein Komma ist immer die Dezimalstelle. Ein Punkt
       nur dann, wenn hinter ihm nicht genau drei Ziffern stehen — "1.284"
       ist ein Tausenderpunkt, "3.14" eine Dezimalstelle. */
    var stellen = 0;
    var komma = rein.lastIndexOf(",");
    var punkt = rein.lastIndexOf(".");
    var letztes = -1;
    if (komma > -1) {
      letztes = komma;
      stellen = rein.length - komma - 1;
    } else if (punkt > -1 && !/^\d{3}$/.test(rein.slice(punkt + 1))) {
      letztes = punkt;
      stellen = rein.length - punkt - 1;
    }
    var wert = parseFloat(
      stellen
        ? rein.slice(0, letztes).replace(/[.,]/g, "") + "." + rein.slice(letztes + 1)
        : rein.replace(/[.,]/g, "")
    );
    if (!isFinite(wert)) return null;

    /* "07" soll am Ende wieder "07" heissen und nicht "7" — eine fuehrende
       Null ist eine Gestaltungsentscheidung, keine Ungenauigkeit. */
    var ganz = (stellen ? rein.slice(0, letztes) : rein).replace(/[^\d]/g, "");
    var breite = /^0\d/.test(ganz) ? ganz.length : 0;

    return {
      vor: text.slice(0, treffer.index),
      nach: text.slice(treffer.index + roh.length),
      wert: wert,
      stellen: stellen,
      breite: breite
    };
  }

  function formatieren(teile, wert) {
    var text;
    if (teile.breite) {
      text = Math.abs(wert).toFixed(teile.stellen).replace(".", ",");
      var punkt = text.indexOf(",");
      var kopf = punkt < 0 ? text : text.slice(0, punkt);
      while (kopf.length < teile.breite) kopf = "0" + kopf;
      return teile.vor + (wert < 0 ? "-" : "") + kopf + (punkt < 0 ? "" : text.slice(punkt)) + teile.nach;
    }
    try {
      text = wert.toLocaleString("de-DE", {
        minimumFractionDigits: teile.stellen,
        maximumFractionDigits: teile.stellen
      });
    } catch (e) {
      text = wert.toFixed(teile.stellen);
    }
    return teile.vor + text + teile.nach;
  }

  /* ------------------------------------------------------------ Start */

  function starten(optionen) {
    var o = {};
    var k;
    for (k in STANDARD) if (Object.prototype.hasOwnProperty.call(STANDARD, k)) o[k] = STANDARD[k];
    for (k in optionen || {}) if (Object.prototype.hasOwnProperty.call(optionen, k)) o[k] = optionen[k];

    var still = ruhig();
    var gsap = o.sanft === false ? null : global.gsap;
    var ScrollTrigger = global.ScrollTrigger;
    var Lenis = global.Lenis;

    /* --- Wer scrollt hier eigentlich? -------------------------------
       In der App-Schale (.nx-app) scrollt nicht das Fenster, sondern
       .nx-content. Wer das verwechselt, bekommt eine Seite, auf der
       nichts passiert — und sucht den Fehler bei ScrollTrigger. */
    var scroller = o.scroller || D.querySelector(".nx-app .nx-content") || null;
    var imFenster = !scroller;

    var zustand = {
      lenis: null,
      scroller: scroller,
      beobachter: null,
      offen: [],
      drifter: [],
      balken: [],
      laeuft: true
    };

    WURZEL.classList.add("nx-bewegt");
    if (still) WURZEL.classList.add("nx-ruhig");

    /* --- Sanftes Scrollen (Lenis) ----------------------------------- */
    if (Lenis && o.sanft && !still) {
      zustand.lenis = new Lenis({
        wrapper: imFenster ? global : scroller,
        /* Die Scrollhoehe nimmt Lenis bei einem eigenen Scroller ohnehin
           vom wrapper. "content" dient nur dem ResizeObserver — und der
           soll den Inhalt beobachten, nicht die feste Flaeche darum. */
        content: imFenster ? D.documentElement : (scroller.firstElementChild || scroller),
        duration: o.dauer,
        easing: function (t) { return 1 - Math.pow(1 - t, 4); }, /* easeOutQuart */
        smoothWheel: true
      });
      WURZEL.classList.add("nx-sanft");
    }

    /* --- GSAP anbinden ---------------------------------------------- */
    if (gsap && ScrollTrigger && !still) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}
      if (!imFenster) ScrollTrigger.defaults({ scroller: scroller });
      if (zustand.lenis) {
        zustand.lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(function (zeit) { zustand.lenis.raf(zeit * 1000); });
        gsap.ticker.lagSmoothing(0);
      }
      WURZEL.classList.add("nx-gsap");
    } else if (zustand.lenis) {
      /* Ohne GSAP braucht Lenis eine eigene Schleife. */
      (function schleife(zeit) {
        zustand.lenis.raf(zeit);
        global.requestAnimationFrame(schleife);
      })(0);
    }

    var mitGsap = WURZEL.classList.contains("nx-gsap");

    /* --- Auftritte ---------------------------------------------------

       Eingesammelt wird in aufnehmen(), nicht einmal beim Start: was
       spaeter in den Baum kommt (ein Reiter, nachgeladener Inhalt),
       bliebe sonst auf seinem Anfangszustand liegen — unsichtbar und
       ohne Fehlermeldung. messen() ruft aufnehmen() erneut auf; was
       schon bekannt ist, wird uebergangen. */
    var bekannt = new WeakSet();
    var zaehlwache = null;

    function zeigen(el) {
      el.classList.add("nx-da");
      if (o.zahlen) zaehlen(el);
    }

    function aufnehmen() {
      /* Gruppen zuerst: ein Elternteil mit data-nx-auf-gruppe gibt die
         Art an seine Kinder weiter und nummeriert sie durch. Gezaehlt
         werden nur die neuen — ein Kind, das als fuenfzigstes nachkommt,
         soll nicht 50 x 35 ms auf seinen Auftritt warten. */
      liste(D, "[data-nx-auf-gruppe]").forEach(function (eltern) {
        var art = eltern.getAttribute("data-nx-auf-gruppe") || "";
        var j = 0;
        [].slice.call(eltern.children).forEach(function (kind) {
          if (bekannt.has(kind)) return;
          if (!kind.hasAttribute("data-nx-auf")) kind.setAttribute("data-nx-auf", art);
          if (!kind.style.getPropertyValue("--i")) kind.style.setProperty("--i", String(j));
          j++;
        });
      });

      var neu = o.auftritt
        ? liste(D, "[data-nx-auf]").filter(function (el) { return !bekannt.has(el); })
        : [];
      neu.forEach(function (el) {
        bekannt.add(el);
        var i = zahlAus(el.style.getPropertyValue("--i"), 0);
        el.style.setProperty("--nx-auf-verzug", (i * o.versatz) + "ms");
      });

      if (neu.length && still) {
        neu.forEach(zeigen);
      } else if (neu.length && mitGsap) {
        /* ScrollTrigger.batch fasst zusammen, was im selben Augenblick
           hereinkommt — so bleibt die Staffelung auch dann ruhig, wenn
           jemand mit dem Rad durch die halbe Seite springt. */
        ScrollTrigger.batch(neu, {
          start: "top 92%",
          once: o.einmal,
          onEnter: function (gruppe) {
            gsap.to(gruppe, {
              opacity: 1,
              y: 0,
              x: 0,
              scale: 1,
              duration: 0.56,
              ease: EASE,
              stagger: o.versatz / 1000,
              overwrite: true,
              onStart: function () {
                if (!o.zahlen) return;
                gruppe.forEach(function (el) { zaehlen(el); });
              }
            });
          }
        });
      } else if (neu.length) {
        if (!zustand.beobachter) {
          zustand.beobachter = new IntersectionObserver(function (eintraege) {
            eintraege.forEach(function (e) {
              if (!e.isIntersecting) return;
              erledigt(e.target);
            });
          }, { threshold: o.schwelle, rootMargin: o.rand, root: imFenster ? null : scroller });
        }
        neu.forEach(function (el) {
          zustand.offen.push(el);
          zustand.beobachter.observe(el);
        });
      }

      /* Zahlen, die zu keinem Auftritt gehoeren, brauchen einen eigenen
         Anstoss — sonst zaehlt nur, was ohnehin eingeblendet wird. */
      if (o.zahlen) {
        var einzeln = liste(D, "[data-nx-zahl]").filter(function (el) {
          return !bekannt.has(el) && !el.closest("[data-nx-auf]");
        });
        einzeln.forEach(function (el) { bekannt.add(el); });
        if (still) {
          einzeln.forEach(zaehlen);
        } else if (einzeln.length) {
          if (!zaehlwache) {
            zaehlwache = new IntersectionObserver(function (eintraege) {
              eintraege.forEach(function (e) {
                if (!e.isIntersecting) return;
                zaehlen(e.target);
                zaehlwache.unobserve(e.target);
              });
            }, { threshold: 0.4, root: imFenster ? null : scroller });
          }
          einzeln.forEach(function (el) { zaehlwache.observe(el); });
        }
      }

      /* Drift und Fortschritt halten keinen Zustand je Element — die
         Listen duerfen einfach neu gelesen werden. */
      zustand.drifter = o.drift ? liste(D, "[data-nx-drift]") : [];
      zustand.balken = liste(D, "[data-nx-fortschritt]");
    }

    function erledigt(el) {
      zeigen(el);
      if (!o.einmal || !zustand.beobachter) return;
      zustand.beobachter.unobserve(el);
      var i = zustand.offen.indexOf(el);
      if (i > -1) zustand.offen.splice(i, 1);
    }

    /* Eine Sprungmarke springt an mehreren Abschnitten vorbei, ohne dass
       der Beobachter sie je zu Gesicht bekommt — die blieben sonst
       unsichtbar liegen, bis jemand zurueckscrollt. Wer oben aus dem Bild
       ist, gilt deshalb als gesehen. */
    function nachtragen() {
      if (!zustand.beobachter || !zustand.offen.length) return;
      var kante = imFenster ? 0 : scroller.getBoundingClientRect().top;
      zustand.offen.slice().forEach(function (el) {
        if (el.getBoundingClientRect().bottom <= kante) erledigt(el);
      });
    }

    /* --- Zaehler ------------------------------------------------------ */
    function zaehlen(el) {
      var treffer = el.hasAttribute("data-nx-zahl") ? [el] : liste(el, "[data-nx-zahl]");
      treffer.forEach(function (ziel) {
        if (ziel.dataset.nxZahlFertig) return;
        var teile = zerlegen(ziel.getAttribute("data-nx-zahl") || ziel.textContent || "");
        if (!teile) return;
        ziel.dataset.nxZahlFertig = "1";
        if (still) { ziel.textContent = formatieren(teile, teile.wert); return; }

        var dauer = zahlAus(ziel.getAttribute("data-nx-zahl-dauer"), 1100);
        if (mitGsap) {
          var zaehler = { n: 0 };
          gsap.to(zaehler, {
            n: teile.wert,
            duration: dauer / 1000,
            ease: EASE,
            onUpdate: function () { ziel.textContent = formatieren(teile, zaehler.n); }
          });
          return;
        }
        var start = 0;
        (function schritt(jetzt) {
          if (!start) start = jetzt;
          var p = Math.min(1, (jetzt - start) / dauer);
          var e = 1 - Math.pow(1 - p, 4);
          ziel.textContent = formatieren(teile, teile.wert * e);
          if (p < 1) global.requestAnimationFrame(schritt);
        })(0);
      });
    }

    /* --- Drift und Fortschritt ---------------------------------------
       Beides haengt am selben Wert: wie weit ist die Seite durch. Die
       Listen fuellt aufnehmen(). */

    function fortschritt() {
      var oben, hoehe, sicht;
      if (imFenster) {
        oben = global.scrollY || D.documentElement.scrollTop || 0;
        hoehe = D.documentElement.scrollHeight;
        sicht = global.innerHeight;
      } else {
        oben = scroller.scrollTop;
        hoehe = scroller.scrollHeight;
        sicht = scroller.clientHeight;
      }
      var weg = Math.max(1, hoehe - sicht);
      return Math.min(1, Math.max(0, oben / weg));
    }

    function malen() {
      nachtragen();
      var p = fortschritt();
      zustand.balken.forEach(function (el) { el.style.setProperty("--nx-fortschritt", p.toFixed(4)); });
      if (still) return;
      zustand.drifter.forEach(function (el) {
        var f = zahlAus(el.getAttribute("data-nx-drift"), 0.3);
        el.style.setProperty("--nx-drift-y", (-p * f * 120).toFixed(2) + "px");
      });
    }

    if (zustand.lenis) {
      zustand.lenis.on("scroll", malen);
    } else {
      (imFenster ? global : scroller).addEventListener("scroll", malen, { passive: true });
    }
    global.addEventListener("resize", malen, { passive: true });
    aufnehmen();
    malen();

    /* --- Sprungmarken -------------------------------------------------
       Ohne das springt die Seite hart, waehrend Lenis noch denkt — und
       der aktive Punkt in der Leiste wandert hinterher. */
    if (o.anker) {
      D.addEventListener("click", function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var ziel = D.querySelector(id);
        if (!ziel) return;
        e.preventDefault();
        anfahren(ziel);
        if (global.history && global.history.replaceState) global.history.replaceState(null, "", id);
      });
    }

    function anfahren(ziel, versatz) {
      /* Lenis liest scroll-margin-top selbst aus — ohne Lenis muss man es
         von Hand tun, sonst klebt der Abschnitt an der Oberkante. */
      if (zustand.lenis) { zustand.lenis.scrollTo(ziel, { offset: versatz || 0 }); return; }
      var rand = versatz;
      if (rand == null) {
        rand = -zahlAus(global.getComputedStyle(ziel).scrollMarginTop, 0);
      }
      if (imFenster) {
        var y = ziel.getBoundingClientRect().top + (global.scrollY || 0) + rand;
        global.scrollTo({ top: y, behavior: still ? "auto" : "smooth" });
      } else {
        var oben = ziel.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop + rand;
        scroller.scrollTo({ top: oben, behavior: still ? "auto" : "smooth" });
      }
    }

    /* --- Dialoge halten das Scrollen an ------------------------------- */
    if (o.dialoge && zustand.lenis) {
      var schleier = liste(D, ".nx-modal-veil");
      if (schleier.length) {
        var pruefen = function () {
          var offen = schleier.some(function (s) { return !s.hidden; });
          if (offen) zustand.lenis.stop(); else zustand.lenis.start();
        };
        var wache = new MutationObserver(pruefen);
        schleier.forEach(function (s) { wache.observe(s, { attributes: true, attributeFilter: ["hidden"] }); });
      }
    }

    gestartet = true;

    return {
      lenis: zustand.lenis,
      scroller: scroller,
      gsap: mitGsap,
      sanft: !!zustand.lenis,
      ruhig: still,
      anfahren: anfahren,
      anhalten: function () { if (zustand.lenis) zustand.lenis.stop(); zustand.laeuft = false; },
      weiter: function () { if (zustand.lenis) zustand.lenis.start(); zustand.laeuft = true; },
      /* Nach jedem Nachladen: neue Elemente einsammeln, Hoehen neu
         lesen, einmal malen. */
      messen: function () {
        aufnehmen();
        if (zustand.lenis) zustand.lenis.resize();
        if (global.ScrollTrigger) global.ScrollTrigger.refresh();
        malen();
      },
      aus: function () {
        if (zustand.beobachter) zustand.beobachter.disconnect();
        if (zaehlwache) zaehlwache.disconnect();
        if (zustand.lenis) zustand.lenis.destroy();
        WURZEL.classList.remove("nx-bewegt", "nx-sanft", "nx-gsap");
      }
    };
  }

  /* Die Klasse nx-bewegt muss stehen, BEVOR der Inhalt kommt — sonst
     blitzt alles einmal auf und verschwindet dann fuer seinen Auftritt.
     Deshalb gehoert diese Datei in den <head>.

     Und falls jemand sie einbindet, aber nie aufruft: beim load-Ereignis
     raeumen wir wieder ab. Eine halb eingebundene Bewegungs-Ebene darf
     keine unsichtbare Seite hinterlassen. */
  WURZEL.classList.add("nx-bewegt");
  global.addEventListener("load", function () {
    if (!gestartet) WURZEL.classList.remove("nx-bewegt");
  });

  global.nexusBewegung = starten;
  global.nexusBewegung.STANDARD = STANDARD;
  global.nexusBewegung.KURVE = KURVE;
  if (typeof module !== "undefined" && module.exports) {
    /* Die beiden Zahl-Helfer liegen mit drin, damit sie pruefbar sind. */
    module.exports = { starten: starten, STANDARD: STANDARD, zerlegen: zerlegen, formatieren: formatieren };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
