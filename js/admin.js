/* ============================================================
   POLISPORTIVA PRATI FORNOLA — pannello amministratore
   Login demo: utente "polis" · password "vezzano"

   IMPORTANTE (limite di un sito statico senza server):
   tutte le modifiche fatte da qui (testi, foto, gare e risultati)
   vengono salvate nella memoria del BROWSER usato per modificarle
   (localStorage), non su un server condiviso. Chi visita il sito
   da un altro computer/telefono continuerà a vedere i contenuti
   originali finché le modifiche non vengono riportate nei file
   sorgenti oppure il sito non viene collegato a un vero database.
   ============================================================ */
(function () {
  "use strict";

  var ADMIN_USER = "polis";
  var ADMIN_PASS = "vezzano";
  var SESSION_KEY = "ppf_admin_session";
  var CONTENT_KEY = "ppf_content";
  var IMAGES_KEY = "ppf_images";

  function getJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function setJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { console.error("Salvataggio non riuscito (spazio esaurito?)", e); return false; }
  }
  function isAdmin() { return sessionStorage.getItem(SESSION_KEY) === "1"; }

  function toast(msg) {
    var t = document.querySelector(".save-toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "save-toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------- applica contenuti/immagini salvati (per admin e visitatori dello stesso browser) ---------- */
  function applyOverrides() {
    var content = getJSON(CONTENT_KEY, {});
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      var key = el.getAttribute("data-edit");
      if (Object.prototype.hasOwnProperty.call(content, key)) {
        el.innerHTML = content[key];
      }
    });
    var images = getJSON(IMAGES_KEY, {});
    document.querySelectorAll("[data-edit-img]").forEach(function (el) {
      var key = el.getAttribute("data-edit-img");
      if (Object.prototype.hasOwnProperty.call(images, key)) {
        el.setAttribute("src", images[key]);
      }
    });
  }

  /* ---------- login modal ---------- */
  function openLoginModal() {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML =
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Accesso area riservata">' +
      "<h3>Area riservata</h3>" +
      "<p>Accesso per il direttivo della Polisportiva: da qui puoi modificare testi, foto e i risultati delle gare.</p>" +
      '<form class="form-grid" data-login-form>' +
      '<div><label for="au">Utente</label><input id="au" name="au" type="text" autocomplete="username" required></div>' +
      '<div><label for="ap">Password</label><input id="ap" name="ap" type="password" autocomplete="current-password" required></div>' +
      '<p class="err">Utente o password non corretti.</p>' +
      '<div class="row-actions"><button type="submit" class="btn btn-primary" style="background:var(--red);">Accedi</button>' +
      '<button type="button" class="cancel">Annulla</button></div>' +
      "</form></div>";
    document.body.appendChild(backdrop);
    var errEl = backdrop.querySelector(".err");
    backdrop.querySelector("#au").focus();
    backdrop.querySelector(".cancel").addEventListener("click", function () { backdrop.remove(); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("[data-login-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var u = backdrop.querySelector("#au").value.trim();
      var p = backdrop.querySelector("#ap").value;
      if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem(SESSION_KEY, "1");
        location.reload();
      } else {
        errEl.style.display = "block";
      }
    });
  }

  /* ---------- barra e modalità amministratore ---------- */
  function buildFab() {
    var btn = document.createElement("button");
    btn.className = "admin-login-fab";
    btn.type = "button";
    btn.innerHTML = '<span class="dot2"></span> Area riservata';
    btn.addEventListener("click", openLoginModal);
    document.body.appendChild(btn);
  }

  function buildAdminBar() {
    document.body.classList.add("admin-mode");
    var bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.innerHTML =
      "<b>Modalità amministratore attiva</b>" +
      "<span>Clicca su testi e foto per modificarli · le modifiche restano su questo browser</span>" +
      '<button type="button" data-reset>Ripristina testi/foto</button>' +
      '<button type="button" class="danger" data-logout>Esci</button>';
    document.body.prepend(bar);
    bar.querySelector("[data-logout]").addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });
    bar.querySelector("[data-reset]").addEventListener("click", function () {
      if (confirm("Ripristinare tutti i testi e le foto ai valori originali del sito su questo browser? I risultati delle gare non vengono toccati.")) {
        localStorage.removeItem(CONTENT_KEY);
        localStorage.removeItem(IMAGES_KEY);
        location.reload();
      }
    });
  }

  function enableEditing() {
    var content = getJSON(CONTENT_KEY, {});
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      el.setAttribute("contenteditable", "true");
      el.addEventListener("blur", function () {
        var key = el.getAttribute("data-edit");
        content[key] = el.innerHTML;
        if (setJSON(CONTENT_KEY, content)) toast("Testo salvato su questo browser");
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && el.tagName.match(/^H[1-4]$/)) e.preventDefault();
      });
    });

    var images = getJSON(IMAGES_KEY, {});
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
    var activeImg = null;

    document.querySelectorAll("[data-edit-img]").forEach(function (el) {
      var wrap = el.closest(".img-edit-wrap") || el.parentElement;
      if (!wrap.classList.contains("img-edit-wrap")) {
        wrap.classList.add("img-edit-wrap");
      }
      wrap.addEventListener("click", function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        activeImg = el;
        fileInput.click();
      });
    });

    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file || !activeImg) return;
      if (file.size > 4 * 1024 * 1024) {
        alert("Immagine troppo grande (oltre 4MB): scegline una più leggera.");
        fileInput.value = "";
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var key = activeImg.getAttribute("data-edit-img");
        images[key] = reader.result;
        activeImg.setAttribute("src", reader.result);
        if (setJSON(IMAGES_KEY, images)) toast("Foto salvata su questo browser");
        else alert("Spazio di salvataggio del browser esaurito: prova con foto più leggere.");
      };
      reader.readAsDataURL(file);
      fileInput.value = "";
    });
  }

  /* ==================== GALLERY AMPLIABILE ==================== */
  function openLightboxGlobal(src, cap) {
    var lb = document.querySelector(".lightbox");
    if (!lb) return;
    var img = lb.querySelector("img");
    var capEl = lb.querySelector(".lightbox-cap");
    img.setAttribute("src", src);
    img.setAttribute("alt", cap || "");
    capEl.textContent = cap || "";
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  var GALLERY_CATS = { allenamenti: "Allenamenti", gare: "Gare & Podi", eventi: "Stage & Eventi" };

  function openAddPhotoModal(onConfirm) {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML =
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Aggiungi foto alla gallery">' +
      "<h3>Aggiungi foto alla gallery</h3>" +
      '<form class="form-grid" data-add-photo-form>' +
      '<div><label for="pf-file">Foto dal computer</label><input id="pf-file" type="file" accept="image/*" required></div>' +
      '<div><label for="pf-cap">Didascalia (data e nome della foto)</label><input id="pf-cap" type="text" placeholder="es. 12/04/2026 – Passaggio di cintura"></div>' +
      '<div><label for="pf-cat">Categoria</label><select id="pf-cat">' +
      '<option value="allenamenti">Allenamenti</option><option value="gare">Gare &amp; Podi</option><option value="eventi">Stage &amp; Eventi</option>' +
      "</select></div>" +
      '<div class="row-actions"><button type="submit" class="btn btn-primary" style="background:var(--red);">Aggiungi</button>' +
      '<button type="button" class="cancel">Annulla</button></div>' +
      "</form></div>";
    document.body.appendChild(backdrop);
    backdrop.querySelector(".cancel").addEventListener("click", function () { backdrop.remove(); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("[data-add-photo-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var file = backdrop.querySelector("#pf-file").files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande (oltre 4MB): scegline una più leggera."); return; }
      var caption = backdrop.querySelector("#pf-cap").value.trim();
      var category = backdrop.querySelector("#pf-cat").value;
      var reader = new FileReader();
      reader.onload = function () {
        onConfirm({ src: reader.result, caption: caption, category: category });
        backdrop.remove();
      };
      reader.readAsDataURL(file);
    });
  }

  function initGalleryExtras() {
    document.querySelectorAll("[data-gallery-add]").forEach(function (tile) {
      var code = tile.getAttribute("data-gallery-add");
      var key = "ppf_gallery_extra_" + code;
      var gallery = tile.closest(".gallery");
      if (!gallery) return;
      var arr = getJSON(key, []);

      function renderExtras() {
        gallery.querySelectorAll(".gallery-item-extra").forEach(function (f) { f.remove(); });
        arr.forEach(function (item) {
          var fig = document.createElement("figure");
          fig.className = "img-edit-wrap gallery-item-extra";
          fig.setAttribute("data-category", item.category || "allenamenti");
          var capText = item.caption || "Foto aggiunta";
          fig.innerHTML =
            '<button class="g-item"><img src="' + item.src + '" alt="' + escapeHtml(capText) + '"></button>' +
            '<figcaption>' + escapeHtml(capText) + ' <span class="gallery-cat-tag">' + (GALLERY_CATS[item.category] || "") + "</span></figcaption>" +
            '<button type="button" class="gallery-remove" aria-label="Rimuovi foto">✕</button>';
          gallery.insertBefore(fig, tile);
          fig.querySelector(".g-item").addEventListener("click", function () {
            if (document.body.classList.contains("admin-mode")) return;
            openLightboxGlobal(item.src, capText);
          });
          fig.querySelector(".gallery-remove").addEventListener("click", function (e) {
            e.stopPropagation();
            if (!confirm("Rimuovere questa foto dalla gallery?")) return;
            arr = arr.filter(function (x) { return x.id !== item.id; });
            setJSON(key, arr);
            renderExtras();
          });
        });
      }
      renderExtras();

      var btn = tile.querySelector(".gallery-add-btn");
      if (btn) {
        btn.addEventListener("click", function () {
          openAddPhotoModal(function (data) {
            arr.push({ id: "gx" + Date.now(), src: data.src, caption: data.caption, category: data.category });
            if (setJSON(key, arr)) { renderExtras(); toast("Foto aggiunta alla gallery"); }
            else alert("Spazio di salvataggio del browser esaurito: prova con foto più leggere.");
          });
        });
      }
    });
  }

  /* ==================== GARE E RISULTATI (locandina + atleti) ==================== */
  function medalClass(risultato) {
    var r = (risultato || "").toLowerCase();
    if (r.indexOf("oro") > -1 || r.indexOf("1°") > -1 || r.indexOf("1º") > -1 || r.indexOf("primo") > -1) return "oro";
    if (r.indexOf("argento") > -1 || r.indexOf("2°") > -1 || r.indexOf("2º") > -1 || r.indexOf("second") > -1) return "argento";
    if (r.indexOf("bronzo") > -1 || r.indexOf("3°") > -1 || r.indexOf("3º") > -1 || r.indexOf("terz") > -1) return "bronzo";
    return "altro";
  }

  function formatDateIt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function openGaraModal(gara, garaArr, saveFn, renderListFn) {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop gara-modal-backdrop";
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";

    function closeModal() {
      backdrop.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    }
    function onEsc(e) { if (e.key === "Escape") closeModal(); }
    document.addEventListener("keydown", onEsc);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) closeModal(); });

    function renderModal() {
      var modal = document.createElement("div");
      modal.className = "admin-modal gara-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Risultati " + gara.nome);

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "lightbox-close gara-modal-close";
      closeBtn.setAttribute("aria-label", "Chiudi");
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", closeModal);
      modal.appendChild(closeBtn);

      var posterWrap = document.createElement("div");
      posterWrap.className = "gara-modal-poster" + (isAdmin() ? " img-edit-wrap" : "");
      posterWrap.innerHTML = gara.locandina
        ? '<img src="' + gara.locandina + '" alt="Locandina ' + escapeHtml(gara.nome) + '">'
        : '<span class="gara-poster-placeholder">' + (isAdmin() ? "Clicca per caricare la locandina" : "Locandina non disponibile") + "</span>";
      if (isAdmin()) {
        posterWrap.addEventListener("click", function () {
          var input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande (oltre 4MB)."); return; }
            var reader = new FileReader();
            reader.onload = function () {
              gara.locandina = reader.result;
              saveFn(); renderListFn();
              modal.replaceWith(renderModal());
            };
            reader.readAsDataURL(file);
          });
          input.click();
        });
      }
      modal.appendChild(posterWrap);

      var info = document.createElement("div");
      info.className = "gara-modal-info";
      info.innerHTML = "<h3>" + escapeHtml(gara.nome) + "</h3><p>" + formatDateIt(gara.data) + " · " + escapeHtml(gara.citta) + " · " + escapeHtml(gara.luogo) + "</p>";
      modal.appendChild(info);

      if (isAdmin()) {
        var delGaraBtn = document.createElement("button");
        delGaraBtn.type = "button";
        delGaraBtn.className = "gara-delete-btn";
        delGaraBtn.textContent = "Elimina questa gara";
        delGaraBtn.addEventListener("click", function () {
          if (!confirm("Eliminare definitivamente questa gara e tutti i suoi risultati?")) return;
          var idx = garaArr.indexOf(gara);
          if (idx > -1) garaArr.splice(idx, 1);
          saveFn(); closeModal(); renderListFn();
        });
        modal.appendChild(delGaraBtn);
      }

      var resultsWrap = document.createElement("div");
      resultsWrap.className = "gara-modal-results";

      if (isAdmin()) {
        var rform = document.createElement("form");
        rform.className = "gara-result-form";
        rform.innerHTML =
          '<input type="text" name="atleta" placeholder="Nome e cognome" required aria-label="Nome e cognome">' +
          '<input type="text" name="categoria" placeholder="Categoria" required aria-label="Categoria">' +
          '<input type="text" name="risultato" placeholder="Risultato (es. Oro, 2° posto)" required aria-label="Risultato">' +
          '<button type="submit">Aggiungi risultato</button>';
        rform.addEventListener("submit", function (e) {
          e.preventDefault();
          var fd = new FormData(rform);
          gara.risultati.push({ id: "rr" + Date.now(), atleta: fd.get("atleta"), categoria: fd.get("categoria"), risultato: fd.get("risultato") });
          saveFn(); renderListFn();
          modal.replaceWith(renderModal());
        });
        resultsWrap.appendChild(rform);
      }

      if (!gara.risultati.length) {
        var empty = document.createElement("p");
        empty.className = "results-empty";
        empty.textContent = "Nessun risultato inserito per questa gara.";
        resultsWrap.appendChild(empty);
      } else {
        var table = document.createElement("table");
        table.className = "results-table";
        var rows = gara.risultati.map(function (r) {
          return "<tr><td>" + escapeHtml(r.atleta) + "</td><td>" + escapeHtml(r.categoria) + "</td>" +
            '<td><span class="medal ' + medalClass(r.risultato) + '">' + escapeHtml(r.risultato) + "</span></td>" +
            (isAdmin() ? '<td><button type="button" class="results-del" data-id="' + r.id + '">Elimina</button></td>' : "") +
            "</tr>";
        }).join("");
        table.innerHTML = "<thead><tr><th>Nome e cognome</th><th>Categoria</th><th>Risultato</th>" + (isAdmin() ? "<th></th>" : "") + "</tr></thead><tbody>" + rows + "</tbody>";
        resultsWrap.appendChild(table);
        if (isAdmin()) {
          table.querySelectorAll(".results-del").forEach(function (delBtn) {
            delBtn.addEventListener("click", function () {
              var id = delBtn.getAttribute("data-id");
              gara.risultati = gara.risultati.filter(function (r) { return r.id !== id; });
              saveFn(); renderListFn();
              modal.replaceWith(renderModal());
            });
          });
        }
      }
      modal.appendChild(resultsWrap);

      var oldModal = backdrop.querySelector(".gara-modal");
      if (oldModal) oldModal.remove();
      backdrop.appendChild(modal);
      return modal;
    }

    renderModal();
  }

  function initGare(root) {
    if (!root) return;
    var code = root.getAttribute("data-gare");
    var key = "ppf_gare_" + code;
    var seed = [];
    try { seed = JSON.parse(root.getAttribute("data-seed") || "[]"); } catch (e) { seed = []; }

    var arr = getJSON(key, null);
    if (arr === null) { arr = seed; setJSON(key, arr); }
    arr.forEach(function (g) { if (!g.risultati) g.risultati = []; });

    function save() { setJSON(key, arr); }

    function render() {
      root.innerHTML = "";

      if (isAdmin()) {
        var form = document.createElement("form");
        form.className = "gara-admin-form";
        form.innerHTML =
          '<label>Data<input type="date" name="data" required></label>' +
          '<label>Nome gara<input type="text" name="nome" placeholder="Nome gara / evento" required></label>' +
          '<label>Città<input type="text" name="citta" placeholder="Città" required></label>' +
          '<label>Palestra / palazzetto<input type="text" name="luogo" placeholder="Luogo di svolgimento" required></label>' +
          '<label>Locandina (facoltativa)<input type="file" name="locandina" accept="image/*"></label>' +
          '<button type="submit">Aggiungi gara</button>';
        form.addEventListener("submit", function (e) {
          e.preventDefault();
          var fd = new FormData(form);
          var fileInput = form.querySelector('input[type="file"]');
          var file = fileInput.files && fileInput.files[0];
          function pushGara(posterDataUrl) {
            arr.push({
              id: "gr" + Date.now(),
              data: fd.get("data"), nome: fd.get("nome"), citta: fd.get("citta"), luogo: fd.get("luogo"),
              locandina: posterDataUrl || null, risultati: []
            });
            save(); render(); toast("Gara aggiunta");
          }
          if (file) {
            if (file.size > 4 * 1024 * 1024) { alert("Locandina troppo grande (oltre 4MB)."); return; }
            var reader = new FileReader();
            reader.onload = function () { pushGara(reader.result); };
            reader.readAsDataURL(file);
          } else {
            pushGara(null);
          }
        });
        root.appendChild(form);
      }

      if (!arr.length) {
        var empty = document.createElement("p");
        empty.className = "results-empty";
        empty.textContent = "Nessuna gara inserita per il momento.";
        root.appendChild(empty);
        return;
      }

      var grid = document.createElement("div");
      grid.className = "gara-grid";
      var sorted = arr.slice().sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
      sorted.forEach(function (g) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "gara-card";
        card.innerHTML =
          '<span class="gara-poster">' +
          (g.locandina ? '<img src="' + g.locandina + '" alt="Locandina ' + escapeHtml(g.nome) + '">' : '<span class="gara-poster-placeholder">Locandina non disponibile</span>') +
          "</span>" +
          '<span class="gara-info">' +
          '<span class="gara-date">' + formatDateIt(g.data) + "</span>" +
          '<span class="gara-title">' + escapeHtml(g.nome) + "</span>" +
          '<span class="gara-place">' + escapeHtml(g.citta) + " · " + escapeHtml(g.luogo) + "</span>" +
          '<span class="gara-count">' + g.risultati.length + " risultat" + (g.risultati.length === 1 ? "o" : "i") + "</span>" +
          "</span>";
        card.addEventListener("click", function () { openGaraModal(g, arr, save, render); });
        grid.appendChild(card);
      });
      root.appendChild(grid);
    }

    render();
  }

  /* ==================== EVENTI E CALENDARIO ==================== */
  var DISC_LABELS = { jj: "Ju-Jitsu", pat: "Pattinaggio", gin: "Ginnastica", pal: "Pallavolo", moto: "Club Moto", tutte: "Tutte le discipline" };
  var EVENTS_KEY = "ppf_events";

  var DEFAULT_EVENTS = [
    { id:"ev1",  nome:"Riapertura corsi 2026/27 — tutte le sezioni", data:"2026-09-08", disciplina:"tutte", orario:"tutto il giorno", luogo:"Palazzetto di Vezzano Ligure", descrizione:"Si riaprono i corsi di tutte le sezioni della Polisportiva per la nuova stagione sportiva.", locandina:null, documenti:[] },
    { id:"ev2",  nome:"Open day: prova gratuita per tutte le discipline", data:"2026-09-20", disciplina:"tutte", orario:"15:00–19:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"Pomeriggio a porte aperte per provare gratuitamente ju-jitsu, pattinaggio, ginnastica, pallavolo e conoscere il Club Moto.", locandina:null, documenti:[] },
    { id:"ev3",  nome:"Criterium regionale Ju-Jitsu", data:"2026-10-04", disciplina:"jj", orario:"09:00", luogo:"Trasferta", descrizione:"", locandina:null, documenti:[] },
    { id:"ev4",  nome:"Raduno con club del territorio", data:"2026-10-11", disciplina:"moto", orario:"10:00", luogo:"Sede sociale", descrizione:"", locandina:null, documenti:[] },
    { id:"ev5",  nome:"Gara regionale UISP solo dance", data:"2026-10-18", disciplina:"pat", orario:"10:00", luogo:"Sede di Prati", descrizione:"", locandina:null, documenti:[] },
    { id:"ev6",  nome:"Torneo amichevole di Pallavolo", data:"2026-11-08", disciplina:"pal", orario:"16:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] },
    { id:"ev7",  nome:"Esami di passaggio cintura", data:"2026-11-15", disciplina:"jj", orario:"16:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] },
    { id:"ev8",  nome:"Uscita sociale d'autunno", data:"2026-11-22", disciplina:"moto", orario:"09:00", luogo:"Ritrovo sede PPF", descrizione:"", locandina:null, documenti:[] },
    { id:"ev9",  nome:"Saggio di Natale", data:"2026-12-19", disciplina:"gin", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] },
    { id:"ev10", nome:"Saggio di Natale", data:"2026-12-20", disciplina:"pat", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] },
    { id:"ev11", nome:"Partita amichevole giovanile", data:"2027-01-17", disciplina:"pal", orario:"18:30", luogo:"Trasferta", descrizione:"", locandina:null, documenti:[] },
    { id:"ev12", nome:"Criterium interregionale", data:"2027-02-07", disciplina:"jj", orario:"09:00", luogo:"Trasferta", descrizione:"", locandina:null, documenti:[] },
    { id:"ev13", nome:"Open day corsi adulti", data:"2027-03-14", disciplina:"gin", orario:"19:00", luogo:"Palestra Polisportiva", descrizione:"", locandina:null, documenti:[] },
    { id:"ev14", nome:"Riapertura stagione uscite", data:"2027-03-21", disciplina:"moto", orario:"09:00", luogo:"Ritrovo sede PPF", descrizione:"", locandina:null, documenti:[] },
    { id:"ev15", nome:"Torneo di primavera", data:"2027-04-11", disciplina:"pal", orario:"tutto il giorno", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] },
    { id:"ev16", nome:"Campionato Italiano FIJLKAM", data:"2027-04-23", disciplina:"jj", orario:"tutto il weekend", luogo:"Trasferta", descrizione:"", locandina:null, documenti:[] },
    { id:"ev17", nome:"Campionato regionale UISP solo dance", data:"2027-05-02", disciplina:"pat", orario:"tutto il weekend", luogo:"Sede di Prati", descrizione:"", locandina:null, documenti:[] },
    { id:"ev18", nome:"Gioca pattino: festa di fine anno", data:"2027-05-24", disciplina:"pat", orario:"16:00", luogo:"Sede di Prati", descrizione:"", locandina:null, documenti:[] },
    { id:"ev19", nome:"Saggio di fine anno", data:"2027-06-05", disciplina:"gin", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null, documenti:[] }
  ];

  function loadEvents() {
    var arr = getJSON(EVENTS_KEY, null);
    if (arr === null) { arr = DEFAULT_EVENTS.slice(); setJSON(EVENTS_KEY, arr); }
    arr.forEach(function (e) { if (!e.documenti) e.documenti = []; });
    return arr;
  }
  function saveEvents(arr) { setJSON(EVENTS_KEY, arr); }

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function openModalShell(extraClass) {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop gara-modal-backdrop" + (extraClass ? " " + extraClass : "");
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    function close() {
      backdrop.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    }
    function onEsc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onEsc);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    return { backdrop: backdrop, close: close };
  }

  function openEventModal(id, refreshFn) {
    var all = loadEvents();
    var ev = all.find(function (e) { return e.id === id; });
    if (!ev) return;
    var shell = openModalShell();

    function persist() { saveEvents(all); }

    function renderModal() {
      var modal = document.createElement("div");
      modal.className = "admin-modal gara-modal evento-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Dettagli evento: " + ev.nome);

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "lightbox-close gara-modal-close";
      closeBtn.setAttribute("aria-label", "Chiudi");
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", shell.close);
      modal.appendChild(closeBtn);

      var posterWrap = document.createElement("div");
      posterWrap.className = "gara-modal-poster" + (isAdmin() ? " img-edit-wrap" : "");
      posterWrap.innerHTML = ev.locandina
        ? '<img src="' + ev.locandina + '" alt="Locandina ' + escapeHtml(ev.nome) + '">'
        : '<span class="gara-poster-placeholder">' + (isAdmin() ? "Clicca per caricare la locandina" : "Locandina non disponibile") + "</span>";
      if (isAdmin()) {
        posterWrap.addEventListener("click", function () {
          var input = document.createElement("input");
          input.type = "file"; input.accept = "image/*";
          input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande (oltre 4MB)."); return; }
            readAsDataURL(file).then(function (url) {
              ev.locandina = url; persist(); refreshFn();
              modal.replaceWith(renderModal());
            });
          });
          input.click();
        });
      }
      modal.appendChild(posterWrap);

      var info = document.createElement("div");
      info.className = "gara-modal-info";
      info.innerHTML =
        "<h3>" + escapeHtml(ev.nome) + "</h3>" +
        "<p>" + formatDateIt(ev.data) + (ev.orario ? " · " + escapeHtml(ev.orario) : "") + (ev.luogo ? " · " + escapeHtml(ev.luogo) : "") + "</p>" +
        '<span class="badge-accent evento-disc-badge">' + escapeHtml(DISC_LABELS[ev.disciplina] || "") + "</span>";
      modal.appendChild(info);

      if (ev.descrizione) {
        var desc = document.createElement("p");
        desc.className = "evento-desc";
        desc.textContent = ev.descrizione;
        modal.appendChild(desc);
      }

      var docsWrap = document.createElement("div");
      docsWrap.className = "evento-docs";
      if (ev.documenti.length) {
        var docsTitle = document.createElement("h4");
        docsTitle.textContent = "Documenti allegati";
        docsWrap.appendChild(docsTitle);
        var list = document.createElement("div");
        list.className = "evento-docs-list";
        ev.documenti.forEach(function (doc) {
          var chip = document.createElement("span");
          chip.className = "doc-chip";
          chip.innerHTML = '<a href="' + doc.dataUrl + '" download="' + escapeHtml(doc.name) + '">⬇ ' + escapeHtml(doc.name) + "</a>";
          if (isAdmin()) {
            var rm = document.createElement("button");
            rm.type = "button"; rm.className = "doc-remove"; rm.textContent = "✕"; rm.setAttribute("aria-label", "Rimuovi documento");
            rm.addEventListener("click", function () {
              ev.documenti = ev.documenti.filter(function (d) { return d.id !== doc.id; });
              persist();
              modal.replaceWith(renderModal());
            });
            chip.appendChild(rm);
          }
          list.appendChild(chip);
        });
        docsWrap.appendChild(list);
      }
      if (isAdmin()) {
        var addDocLabel = document.createElement("label");
        addDocLabel.className = "doc-add-label";
        addDocLabel.innerHTML = '+ Aggiungi documento (PDF o immagine) <input type="file" accept="application/pdf,image/*" multiple>';
        addDocLabel.querySelector("input").addEventListener("change", function (e) {
          var files = Array.prototype.slice.call(e.target.files || []);
          if (!files.length) return;
          Promise.all(files.map(function (file) {
            return readAsDataURL(file).then(function (url) {
              return { id: "doc" + Date.now() + Math.random().toString(36).slice(2, 6), name: file.name, dataUrl: url };
            });
          })).then(function (newDocs) {
            ev.documenti = ev.documenti.concat(newDocs);
            persist();
            modal.replaceWith(renderModal());
          });
        });
        docsWrap.appendChild(addDocLabel);
      }
      modal.appendChild(docsWrap);

      if (isAdmin()) {
        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "gara-delete-btn";
        delBtn.textContent = "Elimina questo evento";
        delBtn.addEventListener("click", function () {
          if (!confirm("Eliminare definitivamente questo evento?")) return;
          var idx = all.indexOf(ev);
          if (idx > -1) all.splice(idx, 1);
          persist(); shell.close(); refreshFn();
        });
        modal.appendChild(delBtn);
      }

      var oldModal = shell.backdrop.querySelector(".gara-modal");
      if (oldModal) oldModal.remove();
      shell.backdrop.appendChild(modal);
      return modal;
    }

    renderModal();
  }

  function openAddEventForm(refreshFn) {
    var shell = openModalShell("evento-form-backdrop");
    var modal = document.createElement("div");
    modal.className = "admin-modal evento-form-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Nuovo evento");

    var options = Object.keys(DISC_LABELS).map(function (k) {
      return '<option value="' + k + '">' + DISC_LABELS[k] + "</option>";
    }).join("");

    modal.innerHTML =
      '<button type="button" class="lightbox-close gara-modal-close" aria-label="Chiudi">✕</button>' +
      "<h3>Nuovo evento</h3>" +
      '<p>Compila la scheda: verrà mostrata nel calendario di questa disciplina (e in quello generale della home, se scegli "Tutte le discipline").</p>' +
      '<form class="evento-form">' +
      '<label>Nome della manifestazione<input type="text" name="nome" required></label>' +
      '<label>Data<input type="date" name="data" required></label>' +
      '<label>Disciplina<select name="disciplina">' + options + "</select></label>" +
      '<label>Orario (facoltativo)<input type="text" name="orario" placeholder="es. 15:00 oppure tutto il giorno"></label>' +
      '<label>Luogo (facoltativo)<input type="text" name="luogo" placeholder="es. Palazzetto di Vezzano Ligure"></label>' +
      '<label class="full">Descrizione<textarea name="descrizione" rows="3" placeholder="Descrivi l\'evento…"></textarea></label>' +
      '<label class="full">Locandina (facoltativa)<input type="file" name="locandina" accept="image/*"></label>' +
      '<label class="full">Documenti allegati (facoltativi, anche più di uno)<input type="file" name="documenti" accept="application/pdf,image/*" multiple></label>' +
      '<button type="submit" class="btn btn-primary" style="background:var(--red);">Crea evento</button>' +
      "</form>";
    modal.querySelector(".gara-modal-close").addEventListener("click", shell.close);
    shell.backdrop.appendChild(modal);

    var form = modal.querySelector(".evento-form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var posterFile = form.querySelector('input[name="locandina"]').files[0];
      var docFiles = Array.prototype.slice.call(form.querySelector('input[name="documenti"]').files || []);

      var posterP = posterFile ? readAsDataURL(posterFile) : Promise.resolve(null);
      var docsP = Promise.all(docFiles.map(function (f) {
        return readAsDataURL(f).then(function (url) {
          return { id: "doc" + Date.now() + Math.random().toString(36).slice(2, 6), name: f.name, dataUrl: url };
        });
      }));

      Promise.all([posterP, docsP]).then(function (results) {
        var all = loadEvents();
        all.push({
          id: "ev" + Date.now(),
          nome: fd.get("nome"), data: fd.get("data"), disciplina: fd.get("disciplina"),
          orario: fd.get("orario") || "", luogo: fd.get("luogo") || "",
          descrizione: fd.get("descrizione") || "",
          locandina: results[0] || null,
          documenti: results[1]
        });
        saveEvents(all);
        shell.close();
        refreshFn();
        toast("Evento creato");
      });
    });
  }

  function initEventsCalendar(container) {
    var filter = container.getAttribute("data-events-filter") || "tutte";

    function currentEvents() {
      var all = loadEvents();
      if (filter === "tutte") return all;
      return all.filter(function (e) { return e.disciplina === filter || e.disciplina === "tutte"; });
    }

    function refresh() {
      var mapped = currentEvents().map(function (e) {
        return { id: e.id, title: e.nome, date: e.data, time: e.orario, place: e.luogo, tag: DISC_LABELS[e.disciplina] || "" };
      });
      if (window.PPF && window.PPF.initCalendar) window.PPF.initCalendar(container, mapped);
      container.querySelectorAll(".event[data-event-id]").forEach(function (el) {
        el.classList.add("event-clickable");
        el.addEventListener("click", function () { openEventModal(el.getAttribute("data-event-id"), refresh); });
      });
    }

    if (isAdmin() && !container.querySelector(".events-admin-bar")) {
      var bar = document.createElement("div");
      bar.className = "events-admin-bar";
      bar.innerHTML = '<button type="button" class="events-add-btn">+ Aggiungi evento</button>';
      bar.querySelector("button").addEventListener("click", function () { openAddEventForm(refresh); });
      container.prepend(bar);
    }

    refresh();
  }

  /* ==================== TABELLONE ORARI: editing strutturato ==================== */
  function cellHtml(time, label, empty) {
    if (empty) return '<div class="board-cell empty"><b>—</b></div>';
    return '<div class="board-cell"><b>' + escapeHtml(time || "") + '</b>' + (label ? "<span>" + escapeHtml(label) + "</span>" : "") + "</div>";
  }

  function openCellEditModal(initial, onSave) {
    var shell = openModalShell();
    var modal = document.createElement("div");
    modal.className = "admin-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML =
      "<h3>Modifica cella orario</h3>" +
      '<form class="form-grid" data-cell-form>' +
      '<div><label for="cf-empty"><input type="checkbox" id="cf-empty" style="width:auto;display:inline-block;margin-right:8px;">Cella vuota (—)</label></div>' +
      '<div><label for="cf-time">Orario</label><input id="cf-time" type="text" placeholder="es. 17:00–18:00" value="' + escapeHtml(initial.time || "") + '"></div>' +
      '<div><label for="cf-label">Etichetta (facoltativa)</label><input id="cf-label" type="text" placeholder="es. Lun · tecnica" value="' + escapeHtml(initial.label || "") + '"></div>' +
      '<div class="row-actions"><button type="submit" class="btn btn-primary" style="background:var(--red);">Salva</button>' +
      '<button type="button" class="cancel">Annulla</button></div>' +
      "</form>";
    shell.backdrop.appendChild(modal);
    var emptyBox = modal.querySelector("#cf-empty");
    emptyBox.checked = !!initial.empty;
    modal.querySelector(".cancel").addEventListener("click", shell.close);
    modal.querySelector("[data-cell-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      onSave({
        empty: emptyBox.checked,
        time: modal.querySelector("#cf-time").value.trim(),
        label: modal.querySelector("#cf-label").value.trim()
      });
      shell.close();
    });
  }

  function initBoardEditing() {
    document.querySelectorAll("table[data-board]").forEach(function (table) {
      var code = table.getAttribute("data-board");
      var cellKey = "ppf_board_" + code;
      var rowsKey = "ppf_board_rows_" + code;
      var dayCount = table.querySelectorAll("thead th").length - 1;
      var tbody = table.querySelector("tbody");
      var overrides = getJSON(cellKey, {});

      function saveOverrides() { setJSON(cellKey, overrides); }

      function applyCell(td, data) {
        var cellDiv = td.querySelector(".board-cell");
        var tmp = document.createElement("div");
        tmp.innerHTML = cellHtml(data.time, data.label, data.empty);
        var fresh = tmp.firstChild;
        if (cellDiv) cellDiv.replaceWith(fresh); else td.appendChild(fresh);
        if ("IntersectionObserver" in window) fresh.classList.add("board-flip");
      }

      // applica le celle statiche modificate (per tutti i visitatori di questo browser)
      Object.keys(overrides).forEach(function (k) {
        var m = k.match(/^r(\d+)c(\d+)$/);
        if (!m) return;
        var td = tbody.querySelector('td[data-row="' + m[1] + '"][data-col="' + m[2] + '"]');
        if (td) applyCell(td, overrides[k]);
      });

      // etichette di riga rinominate
      var labelOverrides = getJSON("ppf_board_labels_" + code, {});
      Object.keys(labelOverrides).forEach(function (r) {
        var td = tbody.querySelector('td.board-row-label[data-row="' + r + '"]');
        if (td) td.textContent = labelOverrides[r];
      });

      // righe aggiunte dinamicamente
      var extraRows = getJSON(rowsKey, []);
      function renderExtraRow(rowData, rowIdx) {
        var tr = document.createElement("tr");
        tr.setAttribute("data-extra-row", rowIdx);
        var labelTd = document.createElement("td");
        labelTd.className = "board-row-label";
        labelTd.textContent = rowData.label;
        tr.appendChild(labelTd);
        rowData.cells.forEach(function (c, ci) {
          var td = document.createElement("td");
          td.innerHTML = cellHtml(c.time, c.label, c.empty);
          td.setAttribute("data-extra-col", ci);
          tr.appendChild(td);
          wireCellClick(td, function (val) {
            rowData.cells[ci] = val;
            setJSON(rowsKey, extraRows);
            applyCell(td, val);
          });
        });
        wireLabelClick(labelTd, function (val) {
          rowData.label = val;
          setJSON(rowsKey, extraRows);
          labelTd.textContent = val;
        });
        if (isAdmin()) {
          var rm = document.createElement("button");
          rm.type = "button"; rm.className = "results-del"; rm.style.marginLeft = "8px";
          rm.textContent = "Elimina categoria";
          rm.addEventListener("click", function () {
            if (!confirm("Eliminare questa categoria dal tabellone?")) return;
            extraRows.splice(rowIdx, 1);
            setJSON(rowsKey, extraRows);
            table.dispatchEvent(new Event("ppf:rerender-board"));
          });
          var lastTd = tr.lastElementChild;
          var wrap = document.createElement("div");
          wrap.style.marginTop = "6px";
          wrap.appendChild(rm);
          lastTd.appendChild(wrap);
        }
        return tr;
      }

      function wireCellClick(td, onSave) {
        if (!isAdmin()) return;
        td.style.cursor = "pointer";
        td.addEventListener("click", function () {
          var cellDiv = td.querySelector(".board-cell");
          var isEmpty = cellDiv && cellDiv.classList.contains("empty");
          var time = cellDiv && !isEmpty ? cellDiv.querySelector("b").textContent : "";
          var label = cellDiv && !isEmpty && cellDiv.querySelector("span") ? cellDiv.querySelector("span").textContent : "";
          openCellEditModal({ time: time, label: label, empty: isEmpty }, onSave);
        });
      }

      function wireLabelClick(td, onSave) {
        if (!isAdmin()) return;
        td.setAttribute("contenteditable", "true");
        td.addEventListener("blur", function () { onSave(td.textContent.trim()); });
      }

      function rerenderExtras() {
        tbody.querySelectorAll("tr[data-extra-row]").forEach(function (tr) { tr.remove(); });
        extraRows.forEach(function (rowData, idx) { tbody.appendChild(renderExtraRow(rowData, idx)); });
      }
      table.addEventListener("ppf:rerender-board", rerenderExtras);
      rerenderExtras();

      // aggancia il click alle celle statiche esistenti + alle etichette di riga statiche
      tbody.querySelectorAll("td[data-row][data-col]").forEach(function (td) {
        var row = td.getAttribute("data-row"), col = td.getAttribute("data-col");
        wireCellClick(td, function (val) {
          overrides["r" + row + "c" + col] = val;
          saveOverrides();
          applyCell(td, val);
        });
      });
      tbody.querySelectorAll("td.board-row-label[data-row]").forEach(function (td) {
        var row = td.getAttribute("data-row");
        wireLabelClick(td, function (val) {
          labelOverrides[row] = val;
          setJSON("ppf_board_labels_" + code, labelOverrides);
        });
      });

      // pulsante "aggiungi categoria"
      if (isAdmin()) {
        var addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "events-add-btn";
        addBtn.style.margin = "14px 0 0";
        addBtn.textContent = "+ Aggiungi categoria al tabellone";
        addBtn.addEventListener("click", function () {
          var cells = [];
          for (var i = 0; i < dayCount; i++) cells.push({ time: "", label: "", empty: true });
          extraRows.push({ label: "Nuova categoria", cells: cells });
          setJSON(rowsKey, extraRows);
          rerenderExtras();
        });
        table.closest(".board").insertAdjacentElement("afterend", addBtn);
      }
    });
  }
  function openAddStaffModal(onConfirm) {
    var shell = openModalShell();
    var modal = document.createElement("div");
    modal.className = "admin-modal staff-form-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Aggiungi maestro o istruttore");
    modal.innerHTML =
      '<button type="button" class="lightbox-close gara-modal-close" aria-label="Chiudi">✕</button>' +
      "<h3>Aggiungi maestro / istruttore</h3>" +
      '<form class="staff-form">' +
      '<label>Foto (facoltativa)<input type="file" name="foto" accept="image/*"></label>' +
      '<label>Nome<input type="text" name="nome" required></label>' +
      '<label>Cognome<input type="text" name="cognome" required></label>' +
      '<label>Profilo / descrizione<textarea name="bio" rows="4" placeholder="Qualifiche, ruolo, esperienza…"></textarea></label>' +
      '<button type="submit">Aggiungi</button>' +
      "</form>";
    modal.querySelector(".gara-modal-close").addEventListener("click", shell.close);
    shell.backdrop.appendChild(modal);

    modal.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var fd = new FormData(form);
      var file = form.querySelector('input[name="foto"]').files[0];
      var fotoP = file ? readAsDataURL(file) : Promise.resolve(null);
      fotoP.then(function (fotoUrl) {
        onConfirm({ nome: fd.get("nome"), cognome: fd.get("cognome"), bio: fd.get("bio") || "", foto: fotoUrl });
        shell.close();
      });
    });
  }

  function initStaff(root) {
    var code = root.getAttribute("data-staff");
    var key = "ppf_staff_" + code;
    var seed = [];
    try { seed = JSON.parse(root.getAttribute("data-seed") || "[]"); } catch (e) { seed = []; }

    var arr = getJSON(key, null);
    if (arr === null) { arr = seed; setJSON(key, arr); }

    function save() { setJSON(key, arr); }

    function render() {
      root.innerHTML = "";
      var grid = document.createElement("div");
      grid.className = "staff-grid";

      arr.forEach(function (person) {
        var card = document.createElement("article");
        card.className = "staff-card";

        var photoWrap = document.createElement("div");
        photoWrap.className = "staff-photo img-edit-wrap";
        var img = document.createElement("img");
        img.src = person.foto || ("assets/svg/" + code + "-avatar.svg");
        img.alt = "Foto di " + (person.nome || "") + " " + (person.cognome || "");
        photoWrap.appendChild(img);
        photoWrap.addEventListener("click", function () {
          if (!isAdmin()) return;
          var input = document.createElement("input");
          input.type = "file"; input.accept = "image/*";
          input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) { alert("Immagine troppo grande (oltre 4MB)."); return; }
            readAsDataURL(file).then(function (url) {
              person.foto = url; save(); img.src = url;
              toast("Foto aggiornata");
            });
          });
          input.click();
        });
        card.appendChild(photoWrap);

        var info = document.createElement("div");
        info.className = "staff-info";
        var name = document.createElement("h4");
        name.className = "staff-name";
        name.textContent = (person.nome || "") + " " + (person.cognome || "");
        var bio = document.createElement("p");
        bio.className = "staff-bio";
        bio.textContent = person.bio || "";
        info.appendChild(name);
        info.appendChild(bio);
        card.appendChild(info);

        if (isAdmin()) {
          name.setAttribute("contenteditable", "true");
          bio.setAttribute("contenteditable", "true");
          name.addEventListener("blur", function () {
            var parts = name.textContent.trim().split(/\s+/);
            person.nome = parts.shift() || "";
            person.cognome = parts.join(" ");
            save();
          });
          bio.addEventListener("blur", function () { person.bio = bio.textContent; save(); });

          var rm = document.createElement("button");
          rm.type = "button"; rm.className = "staff-remove"; rm.textContent = "✕";
          rm.setAttribute("aria-label", "Rimuovi " + person.nome);
          rm.addEventListener("click", function () {
            if (!confirm("Rimuovere " + person.nome + " " + person.cognome + " dallo staff?")) return;
            arr = arr.filter(function (p) { return p !== person; });
            save(); render();
          });
          card.appendChild(rm);
        }

        grid.appendChild(card);
      });

      var addTile = document.createElement("div");
      addTile.className = "staff-add-tile";
      addTile.innerHTML = '<button type="button" class="staff-add-btn">+ Aggiungi maestro / istruttore</button>';
      addTile.querySelector("button").addEventListener("click", function () {
        openAddStaffModal(function (data) {
          arr.push(data);
          save(); render();
          toast("Maestro aggiunto");
        });
      });
      grid.appendChild(addTile);

      root.appendChild(grid);
    }

    render();
  }

  /* ---------------- avvio ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    applyOverrides();
    initGalleryExtras();
    document.querySelectorAll("[data-gare]").forEach(initGare);
    document.querySelectorAll("[data-events-filter]").forEach(initEventsCalendar);
    document.querySelectorAll("[data-staff]").forEach(initStaff);
    initBoardEditing();

    if (isAdmin()) {
      buildAdminBar();
      enableEditing();
    } else {
      buildFab();
    }
  });

  window.PPF_ADMIN = { isAdmin: isAdmin };
})();
