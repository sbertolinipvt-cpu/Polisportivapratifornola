/* ============================================================
   POLISPORTIVA PRATI FORNOLA — script condiviso
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Anno corrente nel footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Header che si riduce allo scroll ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("shrink", window.scrollY > 30);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger");
  if ("IntersectionObserver" in window && revealEls.length) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Conteggio animato delle statistiche (hero-strip) ---------- */
  var statEls = document.querySelectorAll(".stat-counting[data-count-to]");
  var prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (statEls.length && prefersReducedMotion) {
    statEls.forEach(function (el) {
      el.textContent = el.getAttribute("data-count-to") + (el.getAttribute("data-count-suffix") || "");
    });
  } else if (statEls.length) {
    var animateCount = function (el) {
      var target = parseInt(el.getAttribute("data-count-to"), 10);
      var suffix = el.getAttribute("data-count-suffix") || "";
      var dur = 1100, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      var statIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); statIO.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      statEls.forEach(function (el) { statIO.observe(el); });
    } else {
      statEls.forEach(animateCount);
    }
  }

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Tabellone orari: animazione "a scheda" all'ingresso in viewport ---------- */
  var cells = document.querySelectorAll(".board-cell:not(.empty)");
  if ("IntersectionObserver" in window && cells.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            var el = entry.target;
            setTimeout(function () {
              el.classList.add("board-flip");
            }, i % 6 * 45);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.2 }
    );
    cells.forEach(function (c) { io.observe(c); });
  } else {
    cells.forEach(function (c) { c.classList.add("board-flip"); });
  }

  /* ---------- Fotogallery: schede filtro ---------- */
  document.querySelectorAll(".gallery-tabs").forEach(function (tabs) {
    var gallery = tabs.nextElementSibling;
    if (!gallery || !gallery.classList.contains("gallery")) return;
    tabs.querySelectorAll(".gallery-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.querySelectorAll(".gallery-tab").forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        var filter = tab.getAttribute("data-filter");
        gallery.querySelectorAll("figure").forEach(function (fig) {
          if (fig.classList.contains("gallery-add-tile")) return; // resta sempre visibile
          var cat = fig.getAttribute("data-category") || "allenamenti";
          fig.hidden = !(filter === "tutte" || cat === filter);
        });
      });
    });
  });

  /* ---------- Galleria: lightbox ---------- */
  var lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    var lbCap = lightbox.querySelector(".lightbox-cap");
    var lastFocused = null;

    function openLightbox(src, cap) {
      lastFocused = document.activeElement;
      lbImg.src = src;
      lbImg.alt = cap || "";
      lbCap.textContent = cap || "";
      lightbox.classList.add("open");
      lightbox.querySelector(".lightbox-close").focus();
      document.body.style.overflow = "hidden";
    }
    function closeLightbox() {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
      if (lastFocused) lastFocused.focus();
    }
    document.querySelectorAll(".g-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (document.body.classList.contains("admin-mode")) return; // in modalità admin il click cambia la foto
        var img = btn.querySelector("img");
        openLightbox(img.getAttribute("src"), img.getAttribute("alt"));
      });
    });
    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
    });
  }

  /* ---------- Calendario eventi ----------
     Uso: window.PPF.initCalendar(el, events, {month, year})
     events: [{date:"2026-09-14", title, time, place, tag}]
  ------------------------------------------------- */
  var MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  var GIORNI = ["L","M","M","G","V","S","D"];

  function initCalendar(root, events) {
    if (!root) return;
    var calEl = root.querySelector(".cal");
    var listEl = root.querySelector(".event-list");
    var today = new Date();
    var view = { y: today.getFullYear(), m: today.getMonth() };

    // parte dal mese del primo evento futuro, se il mese corrente non ne ha
    var sorted = events.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
    var upcoming = sorted.filter(function (e) { return e.date >= isoDate(today); });
    if (upcoming.length && !events.some(sameMonthFilter(view))) {
      var d0 = new Date(upcoming[0].date);
      view.y = d0.getFullYear();
      view.m = d0.getMonth();
    }

    function sameMonthFilter(v) {
      return function (e) {
        var d = new Date(e.date);
        return d.getFullYear() === v.y && d.getMonth() === v.m;
      };
    }
    function isoDate(d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function render() {
      calEl.innerHTML = "";
      var head = document.createElement("div");
      head.className = "cal-head";
      head.innerHTML =
        '<h4>' + MESI[view.m] + " " + view.y + '</h4>' +
        '<div class="cal-nav">' +
        '<button type="button" aria-label="Mese precedente" data-dir="-1">&#8249;</button>' +
        '<button type="button" aria-label="Mese successivo" data-dir="1">&#8250;</button>' +
        "</div>";
      calEl.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "cal-grid";
      GIORNI.forEach(function (g) {
        var d = document.createElement("div");
        d.className = "dow";
        d.textContent = g;
        grid.appendChild(d);
      });

      var first = new Date(view.y, view.m, 1);
      var startOffset = (first.getDay() + 6) % 7; // lunedì = 0
      var daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
      var prevDays = new Date(view.y, view.m, 0).getDate();

      var evByDay = {};
      events.forEach(function (e) {
        var d = new Date(e.date);
        if (d.getFullYear() === view.y && d.getMonth() === view.m) {
          evByDay[d.getDate()] = evByDay[d.getDate()] || [];
          evByDay[d.getDate()].push(e);
        }
      });

      for (var i = 0; i < startOffset; i++) {
        var pd = document.createElement("div");
        pd.className = "day muted";
        pd.textContent = prevDays - startOffset + i + 1;
        grid.appendChild(pd);
      }
      for (var day = 1; day <= daysInMonth; day++) {
        var cell = document.createElement("div");
        cell.className = "day";
        cell.textContent = day;
        var isToday = view.y === today.getFullYear() && view.m === today.getMonth() && day === today.getDate();
        if (isToday) cell.classList.add("today");
        if (evByDay[day]) {
          cell.classList.add("has-event");
          cell.setAttribute("tabindex", "0");
          cell.setAttribute("role", "button");
          var names = evByDay[day].map(function (e) { return e.title; }).join(", ");
          cell.setAttribute("aria-label", day + " " + MESI[view.m] + ": " + names);
          cell.addEventListener("click", function (list) {
            return function () {
              var target = document.querySelector('[data-event-id="' + list[0].id + '"]');
              if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
            };
          }(evByDay[day]));
        }
        var nextMonthTotal = startOffset + daysInMonth;
        grid.appendChild(cell);
      }
      var remainder = (7 - ((startOffset + daysInMonth) % 7)) % 7;
      for (var j = 1; j <= remainder; j++) {
        var nd = document.createElement("div");
        nd.className = "day muted";
        nd.textContent = j;
        grid.appendChild(nd);
      }
      calEl.appendChild(grid);

      calEl.querySelectorAll(".cal-nav button").forEach(function (b) {
        b.addEventListener("click", function () {
          var dir = parseInt(b.getAttribute("data-dir"), 10);
          view.m += dir;
          if (view.m > 11) { view.m = 0; view.y++; }
          if (view.m < 0) { view.m = 11; view.y--; }
          render();
        });
      });
    }

    function renderList() {
      if (!listEl) return;
      listEl.innerHTML = "";
      var todayIso = isoDate(today);
      var future = sorted.filter(function (e) { return e.date >= todayIso; }).slice(0, 6);
      var toShow = future.length ? future : sorted.slice(-4);
      toShow.forEach(function (e) {
        var d = new Date(e.date);
        var el = document.createElement("article");
        el.className = "event";
        el.setAttribute("data-event-id", e.id);
        el.innerHTML =
          '<div class="date-badge"><b>' + pad(d.getDate()) + '</b><span>' + MESI[d.getMonth()].slice(0, 3) + "</span></div>" +
          "<div><h5>" + e.title + (e.tag ? '<span class="tag">' + e.tag + "</span>" : "") + "</h5>" +
          "<p>" + (e.time ? e.time + " · " : "") + (e.place || "") + "</p></div>";
        listEl.appendChild(el);
      });
      if (!toShow.length) {
        listEl.innerHTML = '<p class="form-note">Nessun evento in programma al momento. Segui i nostri canali social per gli aggiornamenti.</p>';
      }
    }

    events.forEach(function (e, i) { if (!e.id) e.id = "ev-" + i; });
    render();
    renderList();
  }

  /* ---------- Form contatti (demo, senza backend) ---------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      status.textContent = "Messaggio pronto per l'invio: collega il form a un servizio email (es. Formspree) o al tuo backend per renderlo attivo. Nel frattempo puoi scriverci direttamente a info@pratifornola.it.";
      status.classList.add("ok");
      status.style.display = "block";
      form.reset();
    });
  }

  window.PPF = { initCalendar: initCalendar };
})();
