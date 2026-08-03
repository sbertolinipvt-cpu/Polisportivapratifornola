/* ============================================================
   POLISPORTIVA PRATI FORNOLA — pannello amministratore (Firebase)

   Persistenza: Firebase Realtime Database (testi, gare, staff, eventi,
   tabellone) + Firebase Storage (foto e documenti). Tutti i visitatori,
   da qualunque dispositivo, vedono gli stessi contenuti in tempo reale.

   Login: Firebase Authentication (email + password). Crea l'utente da
   Console Firebase → Authentication → Users → Add user. Vedi LEGGIMI.txt
   per le regole di sicurezza consigliate per Database e Storage.
   ============================================================ */
(function () {
  "use strict";

  if (!window.PPF_FIREBASE_READY) {
    console.warn("Firebase non configurato: pannello amministratore disattivato.");
    return;
  }

  var FB = window.PPF_FB;
  var currentUser = null;

  function isAdmin() { return !!currentUser; }

  // le chiavi di data-edit/data-edit-img usano i punti ("home.hero.title");
  // Firebase non ammette punti nei percorsi, li traduciamo in underscore.
  function fbKey(key) { return key.replace(/\./g, "_"); }

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
    t._timer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function formatDateIt(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
  }
  function medalClass(risultato) {
    var r = (risultato || "").toLowerCase();
    if (r.indexOf("oro") > -1 || r.indexOf("1°") > -1 || r.indexOf("1º") > -1 || r.indexOf("primo") > -1) return "oro";
    if (r.indexOf("argento") > -1 || r.indexOf("2°") > -1 || r.indexOf("2º") > -1 || r.indexOf("second") > -1) return "argento";
    if (r.indexOf("bronzo") > -1 || r.indexOf("3°") > -1 || r.indexOf("3º") > -1 || r.indexOf("terz") > -1) return "bronzo";
    return "altro";
  }
  function fileTooBig(file, maxMb) {
    if (file.size > maxMb * 1024 * 1024) {
      alert("File troppo grande (oltre " + maxMb + "MB): scegline uno più leggero.");
      return true;
    }
    return false;
  }

  /* ==================== LOGIN / LOGOUT (Firebase Authentication) ==================== */
  function openLoginModal() {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML =
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Accesso area riservata">' +
      "<h3>Area riservata</h3>" +
      "<p>Accesso per il direttivo della Polisportiva. Usa l'email e la password dell'utente creato su Firebase Authentication.</p>" +
      '<form class="form-grid" data-login-form>' +
      '<div><label for="au">Email</label><input id="au" name="au" type="email" autocomplete="username" required></div>' +
      '<div><label for="ap">Password</label><input id="ap" name="ap" type="password" autocomplete="current-password" required></div>' +
      '<p class="err">Accesso non riuscito: controlla email e password.</p>' +
      '<div class="row-actions"><button type="submit" class="btn btn-primary" style="background:var(--red);">Accedi</button>' +
      '<button type="button" class="cancel">Annulla</button></div>' +
      "</form></div>";
    document.body.appendChild(backdrop);
    var errEl = backdrop.querySelector(".err");
    var submitBtn = backdrop.querySelector('button[type="submit"]');
    backdrop.querySelector("#au").focus();
    backdrop.querySelector(".cancel").addEventListener("click", function () { backdrop.remove(); });
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("[data-login-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var u = backdrop.querySelector("#au").value.trim();
      var p = backdrop.querySelector("#ap").value;
      submitBtn.disabled = true;
      submitBtn.textContent = "Accesso in corso…";
      FB.auth.signInWithEmailAndPassword(u, p)
        .then(function () { location.reload(); })
        .catch(function (err) {
          console.error(err);
          errEl.textContent = "Accesso non riuscito: " + (err && err.message ? err.message : "controlla email e password.");
          errEl.style.display = "block";
          submitBtn.disabled = false;
          submitBtn.textContent = "Accedi";
        });
    });
  }

  function buildFab() {
    var btn = document.createElement("button");
    btn.className = "admin-login-fab";
    btn.type = "button";
    btn.innerHTML = '<span class="dot2"></span> Area riservata';
    btn.addEventListener("click", openLoginModal);
    document.body.appendChild(btn);
  }

  // link "Area riservata" nel menù di navigazione, in alto in ogni pagina
  function wireNavAdminLink() {
    document.querySelectorAll("[data-admin-login]").forEach(function (link) {
      if (isAdmin()) {
        link.textContent = "Pannello admin ▲";
        link.classList.add("is-admin");
        link.href = "#";
        link.onclick = function (e) {
          e.preventDefault();
          var bar = document.querySelector(".admin-bar");
          if (bar) bar.scrollIntoView({ behavior: "smooth" });
        };
      } else {
        link.textContent = "Area riservata";
        link.classList.remove("is-admin");
        link.href = "#";
        link.onclick = function (e) { e.preventDefault(); openLoginModal(); };
      }
    });
  }

  function buildAdminBar() {
    document.body.classList.add("admin-mode");
    var bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.innerHTML =
      "<b>Modalità amministratore attiva</b>" +
      "<span>Connesso come " + escapeHtml(currentUser.email || "") + " · le modifiche sono salvate su Firebase e visibili a tutti i visitatori</span>" +
      '<button type="button" data-reset>Ripristina testi/foto</button>' +
      '<button type="button" class="danger" data-logout>Esci</button>';
    document.body.prepend(bar);
    bar.querySelector("[data-logout]").addEventListener("click", function () {
      FB.auth.signOut().then(function () { location.reload(); });
    });
    bar.querySelector("[data-reset]").addEventListener("click", function () {
      if (confirm("Ripristinare tutti i testi e le foto ai valori originali del sito (per tutti i visitatori)? Gare, eventi, staff e tabellone non vengono toccati.")) {
        Promise.all([FB.remove("content"), FB.remove("images")]).then(function () { location.reload(); });
      }
    });
  }

  /* ==================== TESTI E IMMAGINI (in tempo reale) ==================== */
  function applyOverrides() {
    FB.listen("content", function (content) {
      content = content || {};
      document.querySelectorAll("[data-edit]").forEach(function (el) {
        var k = fbKey(el.getAttribute("data-edit"));
        if (Object.prototype.hasOwnProperty.call(content, k) && !el.matches(":focus")) {
          el.innerHTML = content[k];
        }
      });
    });
    FB.listen("images", function (images) {
      images = images || {};
      document.querySelectorAll("[data-edit-img]").forEach(function (el) {
        var k = fbKey(el.getAttribute("data-edit-img"));
        if (Object.prototype.hasOwnProperty.call(images, k)) {
          el.setAttribute("src", images[k]);
        }
      });
    });
  }

  function enableEditing() {
    document.querySelectorAll("[data-edit]").forEach(function (el) {
      el.setAttribute("contenteditable", "true");
      el.addEventListener("blur", function () {
        var key = fbKey(el.getAttribute("data-edit"));
        FB.set("content/" + key, el.innerHTML).then(function () { toast("Testo salvato online"); });
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && el.tagName.match(/^H[1-4]$/)) e.preventDefault();
      });
    });

    document.querySelectorAll("[data-edit-img]").forEach(function (el) {
      var wrap = el.closest(".img-edit-wrap") || el.parentElement;
      wrap.classList.add("img-edit-wrap");
      wrap.addEventListener("click", function () {
        var input = document.createElement("input");
        input.type = "file"; input.accept = "image/*";
        input.addEventListener("change", function () {
          var file = input.files && input.files[0];
          if (!file || fileTooBig(file, 8)) return;
          toast("Caricamento foto in corso…");
          var key = fbKey(el.getAttribute("data-edit-img"));
          FB.uploadFile("uploads/site/" + FB.slugFileName(file), file)
            .then(function (url) {
              el.setAttribute("src", url);
              return FB.set("images/" + key, url);
            })
            .then(function () { toast("Foto salvata online"); })
            .catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); });
        });
        input.click();
      });
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
      if (!file || fileTooBig(file, 8)) return;
      var caption = backdrop.querySelector("#pf-cap").value.trim();
      var category = backdrop.querySelector("#pf-cat").value;
      var submitBtn = backdrop.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.textContent = "Caricamento…";
      onConfirm({ file: file, caption: caption, category: category }, function () { backdrop.remove(); });
    });
  }

  function initGalleryExtras() {
    document.querySelectorAll("[data-gallery-add]").forEach(function (tile) {
      var code = tile.getAttribute("data-gallery-add");
      var path = "gallery_extra/" + code;
      var gallery = tile.closest(".gallery");
      if (!gallery) return;

      FB.listen(path, function (data) {
        var arr = data ? Object.keys(data).map(function (id) { var o = data[id]; o.id = id; return o; }) : [];
        gallery.querySelectorAll(".gallery-item-extra").forEach(function (f) { f.remove(); });
        arr.forEach(function (item) {
          var fig = document.createElement("figure");
          fig.className = "img-edit-wrap gallery-item-extra";
          fig.setAttribute("data-category", item.category || "allenamenti");
          var capText = item.caption || "Foto aggiunta";
          fig.innerHTML =
            '<button class="g-item"><img src="' + item.src + '" alt="' + escapeHtml(capText) + '"></button>' +
            '<figcaption>' + escapeHtml(capText) + ' <span class="gallery-cat-tag">' + (GALLERY_CATS[item.category] || "") + "</span></figcaption>" +
            (isAdmin() ? '<button type="button" class="gallery-remove" aria-label="Rimuovi foto">✕</button>' : "");
          gallery.insertBefore(fig, tile);
          fig.querySelector(".g-item").addEventListener("click", function () {
            if (document.body.classList.contains("admin-mode")) return;
            openLightboxGlobal(item.src, capText);
          });
          var rm = fig.querySelector(".gallery-remove");
          if (rm) rm.addEventListener("click", function (e) {
            e.stopPropagation();
            if (!confirm("Rimuovere questa foto dalla gallery?")) return;
            FB.remove(path + "/" + item.id);
          });
        });
      });

      var btn = tile.querySelector(".gallery-add-btn");
      if (btn) {
        btn.addEventListener("click", function () {
          openAddPhotoModal(function (data, close) {
            FB.uploadFile("uploads/gallery/" + code + "/" + FB.slugFileName(data.file), data.file)
              .then(function (url) {
                return FB.push(path, { src: url, caption: data.caption, category: data.category });
              })
              .then(function () { close(); toast("Foto aggiunta alla gallery"); })
              .catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); close(); });
          });
        });
      }
    });
  }

  /* ==================== MAESTRI / ISTRUTTORI / ALLENATORI ==================== */
  function openAddStaffModal(onConfirm) {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML =
      '<div class="admin-modal" role="dialog" aria-modal="true" aria-label="Aggiungi maestro o istruttore">' +
      "<h3>Aggiungi maestro / istruttore</h3>" +
      '<form class="staff-form">' +
      '<label>Foto (facoltativa)<input type="file" name="foto" accept="image/*"></label>' +
      '<label>Nome<input type="text" name="nome" required></label>' +
      '<label>Cognome<input type="text" name="cognome" required></label>' +
      '<label>Profilo / descrizione<textarea name="bio" rows="4" placeholder="Qualifiche, ruolo, esperienza…"></textarea></label>' +
      '<button type="submit">Aggiungi</button>' +
      "</form></div>";
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) backdrop.remove(); });
    backdrop.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var fd = new FormData(form);
      var file = form.querySelector('input[name="foto"]').files[0];
      if (file && fileTooBig(file, 8)) return;
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.textContent = "Caricamento…";
      onConfirm({ nome: fd.get("nome"), cognome: fd.get("cognome"), bio: fd.get("bio") || "", file: file }, function () { backdrop.remove(); });
    });
  }

  function initStaff(root) {
    var code = root.getAttribute("data-staff");
    var seed = [];
    try { seed = JSON.parse(root.getAttribute("data-seed") || "[]"); } catch (e) { seed = []; }
    var path = "staff/" + code;
    var seeded = false;

    FB.listen(path, function (data) {
      if (data === null && !seeded) {
        seeded = true;
        var updates = {};
        seed.forEach(function (p) { updates[FB.newKey(path)] = p; });
        FB.update(path, updates);
        return; // il prossimo evento "value" renderizzerà i dati appena scritti
      }
      renderStaff(root, code, path, data || {});
    });
  }

  function renderStaff(root, code, path, data) {
    root.innerHTML = "";
    var grid = document.createElement("div");
    grid.className = "staff-grid";

    Object.keys(data).forEach(function (id) {
      var person = data[id];
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
          if (!file || fileTooBig(file, 8)) return;
          toast("Caricamento foto in corso…");
          FB.uploadFile("uploads/staff/" + code + "/" + FB.slugFileName(file), file)
            .then(function (url) { return FB.set(path + "/" + id + "/foto", url); })
            .then(function () { toast("Foto aggiornata"); })
            .catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); });
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
          FB.update(path + "/" + id, { nome: parts.shift() || "", cognome: parts.join(" ") });
        });
        bio.addEventListener("blur", function () { FB.update(path + "/" + id, { bio: bio.textContent }); });

        var rm = document.createElement("button");
        rm.type = "button"; rm.className = "staff-remove"; rm.textContent = "✕";
        rm.setAttribute("aria-label", "Rimuovi " + person.nome);
        rm.addEventListener("click", function () {
          if (!confirm("Rimuovere " + person.nome + " " + person.cognome + " dallo staff?")) return;
          FB.remove(path + "/" + id);
        });
        card.appendChild(rm);
      }

      grid.appendChild(card);
    });

    var addTile = document.createElement("div");
    addTile.className = "staff-add-tile";
    addTile.innerHTML = '<button type="button" class="staff-add-btn">+ Aggiungi maestro / istruttore</button>';
    addTile.querySelector("button").addEventListener("click", function () {
      openAddStaffModal(function (person, close) {
        function save(fotoUrl) {
          FB.push(path, { nome: person.nome, cognome: person.cognome, bio: person.bio, foto: fotoUrl || null })
            .then(function () { close(); toast("Maestro aggiunto"); })
            .catch(function (err) { console.error(err); alert("Salvataggio non riuscito: " + err.message); close(); });
        }
        if (person.file) {
          FB.uploadFile("uploads/staff/" + code + "/" + FB.slugFileName(person.file), person.file).then(save).catch(function (err) {
            console.error(err); alert("Caricamento non riuscito: " + err.message); close();
          });
        } else {
          save(null);
        }
      });
    });
    grid.appendChild(addTile);

    root.appendChild(grid);
  }

  /* ==================== GARE E RISULTATI (locandina + atleti) ==================== */
  function openModalShell(extraClass) {
    var backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop gara-modal-backdrop" + (extraClass ? " " + extraClass : "");
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    var cleanups = [];
    function close() {
      cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
      backdrop.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEsc);
    }
    function onEsc(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", onEsc);
    backdrop.addEventListener("click", function (e) { if (e.target === backdrop) close(); });
    return { backdrop: backdrop, close: close, onClose: function (fn) { cleanups.push(fn); } };
  }

  function openGaraModal(garaId, gara, path) {
    var shell = openModalShell();
    var risultati = gara.risultati || {};

    function renderModal() {
      var modal = document.createElement("div");
      modal.className = "admin-modal gara-modal evento-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");

      var closeBtn = document.createElement("button");
      closeBtn.type = "button"; closeBtn.className = "lightbox-close gara-modal-close";
      closeBtn.setAttribute("aria-label", "Chiudi"); closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", shell.close);
      modal.appendChild(closeBtn);

      var posterWrap = document.createElement("div");
      posterWrap.className = "gara-modal-poster" + (isAdmin() ? " img-edit-wrap" : "");
      posterWrap.innerHTML = gara.locandina
        ? '<img src="' + gara.locandina + '" alt="Locandina ' + escapeHtml(gara.nome) + '">'
        : '<span class="gara-poster-placeholder">' + (isAdmin() ? "Clicca per caricare la locandina" : "Locandina non disponibile") + "</span>";
      if (isAdmin()) {
        posterWrap.addEventListener("click", function () {
          var input = document.createElement("input");
          input.type = "file"; input.accept = "image/*";
          input.addEventListener("change", function () {
            var file = input.files && input.files[0];
            if (!file || fileTooBig(file, 8)) return;
            FB.uploadFile(path + "/" + garaId + "/locandina_" + FB.slugFileName(file), file).then(function (url) {
              return FB.set(path + "/" + garaId + "/locandina", url);
            }).catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); });
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
        delGaraBtn.type = "button"; delGaraBtn.className = "gara-delete-btn";
        delGaraBtn.textContent = "Elimina questa gara";
        delGaraBtn.addEventListener("click", function () {
          if (!confirm("Eliminare definitivamente questa gara e tutti i suoi risultati?")) return;
          FB.remove(path + "/" + garaId).then(shell.close);
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
          FB.push(path + "/" + garaId + "/risultati", { atleta: fd.get("atleta"), categoria: fd.get("categoria"), risultato: fd.get("risultato") });
          rform.reset();
        });
        resultsWrap.appendChild(rform);
      }

      var ids = Object.keys(risultati);
      if (!ids.length) {
        var empty = document.createElement("p");
        empty.className = "results-empty";
        empty.textContent = "Nessun risultato inserito per questa gara.";
        resultsWrap.appendChild(empty);
      } else {
        var table = document.createElement("table");
        table.className = "results-table";
        var rows = ids.map(function (rid) {
          var r = risultati[rid];
          return "<tr><td>" + escapeHtml(r.atleta) + "</td><td>" + escapeHtml(r.categoria) + "</td>" +
            '<td><span class="medal ' + medalClass(r.risultato) + '">' + escapeHtml(r.risultato) + "</span></td>" +
            (isAdmin() ? '<td><button type="button" class="results-del" data-id="' + rid + '">Elimina</button></td>' : "") +
            "</tr>";
        }).join("");
        table.innerHTML = "<thead><tr><th>Nome e cognome</th><th>Categoria</th><th>Risultato</th>" + (isAdmin() ? "<th></th>" : "") + "</tr></thead><tbody>" + rows + "</tbody>";
        resultsWrap.appendChild(table);
        if (isAdmin()) {
          table.querySelectorAll(".results-del").forEach(function (delBtn) {
            delBtn.addEventListener("click", function () {
              FB.remove(path + "/" + garaId + "/risultati/" + delBtn.getAttribute("data-id"));
            });
          });
        }
      }
      modal.appendChild(resultsWrap);

      var oldModal = shell.backdrop.querySelector(".gara-modal");
      if (oldModal) oldModal.remove();
      shell.backdrop.appendChild(modal);
    }

    // ascolta gli aggiornamenti live di QUESTA gara mentre la finestra è aperta
    var unsub = FB.listen(path + "/" + garaId, function (fresh) {
      if (!fresh) { shell.close(); return; }
      gara = fresh;
      risultati = gara.risultati || {};
      renderModal();
    });
    shell.onClose(unsub);
  }

  function initGare(root) {
    var code = root.getAttribute("data-gare");
    var path = "gare/" + code;
    var seed = [];
    try { seed = JSON.parse(root.getAttribute("data-seed") || "[]"); } catch (e) { seed = []; }
    var seeded = false;

    FB.listen(path, function (data) {
      if (data === null && !seeded) {
        seeded = true;
        var updates = {};
        seed.forEach(function (g) {
          var risultati = {};
          (g.risultati || []).forEach(function (r) { risultati[FB.newKey(path)] = { atleta: r.atleta, categoria: r.categoria, risultato: r.risultato }; });
          updates[FB.newKey(path)] = { data: g.data, nome: g.nome, citta: g.citta, luogo: g.luogo, locandina: g.locandina || null, risultati: risultati };
        });
        FB.update(path, updates);
        return;
      }
      renderGare(root, code, path, data || {});
    });
  }

  function renderGare(root, code, path, data) {
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
        if (file && fileTooBig(file, 8)) return;

        function pushGara(posterUrl) {
          FB.push(path, { data: fd.get("data"), nome: fd.get("nome"), citta: fd.get("citta"), luogo: fd.get("luogo"), locandina: posterUrl || null, risultati: {} })
            .then(function () { toast("Gara aggiunta"); form.reset(); })
            .catch(function (err) { console.error(err); alert("Salvataggio non riuscito: " + err.message); });
        }
        if (file) {
          FB.uploadFile("uploads/gare/" + code + "/" + FB.slugFileName(file), file).then(pushGara).catch(function (err) {
            console.error(err); alert("Caricamento non riuscito: " + err.message);
          });
        } else {
          pushGara(null);
        }
      });
      root.appendChild(form);
    }

    var ids = Object.keys(data);
    if (!ids.length) {
      var empty = document.createElement("p");
      empty.className = "results-empty";
      empty.textContent = "Nessuna gara inserita per il momento.";
      root.appendChild(empty);
      return;
    }

    var grid = document.createElement("div");
    grid.className = "gara-grid";
    var sorted = ids.slice().sort(function (a, b) { return (data[b].data || "").localeCompare(data[a].data || ""); });
    sorted.forEach(function (id) {
      var g = data[id];
      var risultatiCount = g.risultati ? Object.keys(g.risultati).length : 0;
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
        '<span class="gara-count">' + risultatiCount + " risultat" + (risultatiCount === 1 ? "o" : "i") + "</span>" +
        "</span>";
      card.addEventListener("click", function () { openGaraModal(id, g, path); });
      grid.appendChild(card);
    });
    root.appendChild(grid);
  }

  /* ==================== EVENTI E CALENDARIO ==================== */
  var DISC_LABELS = { jj: "Ju-Jitsu", pat: "Pattinaggio", gin: "Ginnastica", pal: "Pallavolo", moto: "Club Moto", tutte: "Tutte le discipline" };
  var EVENTS_PATH = "events";

  var DEFAULT_EVENTS = [
    { nome:"Riapertura corsi 2026/27 — tutte le sezioni", data:"2026-09-08", disciplina:"tutte", orario:"tutto il giorno", luogo:"Palazzetto di Vezzano Ligure", descrizione:"Si riaprono i corsi di tutte le sezioni della Polisportiva per la nuova stagione sportiva.", locandina:null },
    { nome:"Open day: prova gratuita per tutte le discipline", data:"2026-09-20", disciplina:"tutte", orario:"15:00–19:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"Pomeriggio a porte aperte per provare gratuitamente ju-jitsu, pattinaggio, ginnastica, pallavolo e conoscere il Club Moto.", locandina:null },
    { nome:"Criterium regionale Ju-Jitsu", data:"2026-10-04", disciplina:"jj", orario:"09:00", luogo:"Trasferta", descrizione:"", locandina:null },
    { nome:"Raduno con club del territorio", data:"2026-10-11", disciplina:"moto", orario:"10:00", luogo:"Sede sociale", descrizione:"", locandina:null },
    { nome:"Gara regionale UISP solo dance", data:"2026-10-18", disciplina:"pat", orario:"10:00", luogo:"Sede di Prati", descrizione:"", locandina:null },
    { nome:"Torneo amichevole di Pallavolo", data:"2026-11-08", disciplina:"pal", orario:"16:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null },
    { nome:"Esami di passaggio cintura", data:"2026-11-15", disciplina:"jj", orario:"16:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null },
    { nome:"Uscita sociale d'autunno", data:"2026-11-22", disciplina:"moto", orario:"09:00", luogo:"Ritrovo sede PPF", descrizione:"", locandina:null },
    { nome:"Saggio di Natale", data:"2026-12-19", disciplina:"gin", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null },
    { nome:"Saggio di Natale", data:"2026-12-20", disciplina:"pat", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null },
    { nome:"Partita amichevole giovanile", data:"2027-01-17", disciplina:"pal", orario:"18:30", luogo:"Trasferta", descrizione:"", locandina:null },
    { nome:"Criterium interregionale", data:"2027-02-07", disciplina:"jj", orario:"09:00", luogo:"Trasferta", descrizione:"", locandina:null },
    { nome:"Open day corsi adulti", data:"2027-03-14", disciplina:"gin", orario:"19:00", luogo:"Palestra Polisportiva", descrizione:"", locandina:null },
    { nome:"Riapertura stagione uscite", data:"2027-03-21", disciplina:"moto", orario:"09:00", luogo:"Ritrovo sede PPF", descrizione:"", locandina:null },
    { nome:"Torneo di primavera", data:"2027-04-11", disciplina:"pal", orario:"tutto il giorno", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null },
    { nome:"Campionato Italiano FIJLKAM", data:"2027-04-23", disciplina:"jj", orario:"tutto il weekend", luogo:"Trasferta", descrizione:"", locandina:null },
    { nome:"Campionato regionale UISP solo dance", data:"2027-05-02", disciplina:"pat", orario:"tutto il weekend", luogo:"Sede di Prati", descrizione:"", locandina:null },
    { nome:"Gioca pattino: festa di fine anno", data:"2027-05-24", disciplina:"pat", orario:"16:00", luogo:"Sede di Prati", descrizione:"", locandina:null },
    { nome:"Saggio di fine anno", data:"2027-06-05", disciplina:"gin", orario:"18:00", luogo:"Palazzetto di Vezzano Ligure", descrizione:"", locandina:null }
  ];

  var eventsCache = null;
  var eventsListeners = [];
  var eventsSeeded = false;
  var eventsWatcherStarted = false;

  function watchEvents(cb) {
    eventsListeners.push(cb);
    if (eventsCache !== null) cb(eventsCache);
    if (!eventsWatcherStarted) {
      eventsWatcherStarted = true;
      FB.listen(EVENTS_PATH, function (data) {
        if (data === null && !eventsSeeded) {
          eventsSeeded = true;
          var updates = {};
          DEFAULT_EVENTS.forEach(function (ev) { updates[FB.newKey(EVENTS_PATH)] = ev; });
          FB.update(EVENTS_PATH, updates);
          return;
        }
        eventsCache = data || {};
        eventsListeners.forEach(function (cb2) { cb2(eventsCache); });
      });
    }
  }

  function openEventModal(id, ev, refreshFn) {
    var shell = openModalShell();

    function renderModal() {
      var modal = document.createElement("div");
      modal.className = "admin-modal gara-modal evento-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");

      var closeBtn = document.createElement("button");
      closeBtn.type = "button"; closeBtn.className = "lightbox-close gara-modal-close";
      closeBtn.setAttribute("aria-label", "Chiudi"); closeBtn.textContent = "✕";
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
            if (!file || fileTooBig(file, 8)) return;
            FB.uploadFile(EVENTS_PATH + "/" + id + "/locandina_" + FB.slugFileName(file), file).then(function (url) {
              return FB.set(EVENTS_PATH + "/" + id + "/locandina", url);
            }).catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); });
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
      var docIds = ev.documenti ? Object.keys(ev.documenti) : [];
      if (docIds.length) {
        var docsTitle = document.createElement("h4");
        docsTitle.textContent = "Documenti allegati";
        docsWrap.appendChild(docsTitle);
        var list = document.createElement("div");
        list.className = "evento-docs-list";
        docIds.forEach(function (did) {
          var doc = ev.documenti[did];
          var chip = document.createElement("span");
          chip.className = "doc-chip";
          chip.innerHTML = '<a href="' + doc.url + '" target="_blank" rel="noopener">⬇ ' + escapeHtml(doc.name) + "</a>";
          if (isAdmin()) {
            var rmBtn = document.createElement("button");
            rmBtn.type = "button"; rmBtn.className = "doc-remove"; rmBtn.textContent = "✕"; rmBtn.setAttribute("aria-label", "Rimuovi documento");
            rmBtn.addEventListener("click", function () { FB.remove(EVENTS_PATH + "/" + id + "/documenti/" + did); });
            chip.appendChild(rmBtn);
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
          files.forEach(function (file) {
            if (fileTooBig(file, 12)) return;
            FB.uploadFile(EVENTS_PATH + "/" + id + "/docs/" + FB.slugFileName(file), file).then(function (url) {
              return FB.push(EVENTS_PATH + "/" + id + "/documenti", { name: file.name, url: url });
            }).catch(function (err) { console.error(err); alert("Caricamento non riuscito: " + err.message); });
          });
        });
        docsWrap.appendChild(addDocLabel);
      }
      modal.appendChild(docsWrap);

      if (isAdmin()) {
        var delBtn = document.createElement("button");
        delBtn.type = "button"; delBtn.className = "gara-delete-btn";
        delBtn.textContent = "Elimina questo evento";
        delBtn.addEventListener("click", function () {
          if (!confirm("Eliminare definitivamente questo evento?")) return;
          FB.remove(EVENTS_PATH + "/" + id).then(shell.close);
        });
        modal.appendChild(delBtn);
      }

      var oldModal = shell.backdrop.querySelector(".gara-modal");
      if (oldModal) oldModal.remove();
      shell.backdrop.appendChild(modal);
    }

    var unsub = FB.listen(EVENTS_PATH + "/" + id, function (fresh) {
      if (!fresh) { shell.close(); return; }
      ev = fresh;
      renderModal();
      if (refreshFn) refreshFn();
    });
    shell.onClose(unsub);
  }

  function openAddEventForm(refreshFn) {
    var shell = openModalShell("evento-form-backdrop");
    var modal = document.createElement("div");
    modal.className = "admin-modal evento-form-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    var options = Object.keys(DISC_LABELS).map(function (k) { return '<option value="' + k + '">' + DISC_LABELS[k] + "</option>"; }).join("");

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
      if (posterFile && fileTooBig(posterFile, 8)) return;
      for (var i = 0; i < docFiles.length; i++) if (fileTooBig(docFiles[i], 12)) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true; submitBtn.textContent = "Creazione in corso…";

      FB.newKeyValue = FB.newKey(EVENTS_PATH);
      var newId = FB.newKeyValue;

      var posterP = posterFile ? FB.uploadFile(EVENTS_PATH + "/" + newId + "/locandina_" + FB.slugFileName(posterFile), posterFile) : Promise.resolve(null);
      var docsP = Promise.all(docFiles.map(function (f) {
        return FB.uploadFile(EVENTS_PATH + "/" + newId + "/docs/" + FB.slugFileName(f), f).then(function (url) {
          return { name: f.name, url: url };
        });
      }));

      Promise.all([posterP, docsP]).then(function (results) {
        var documenti = {};
        results[1].forEach(function (d) { documenti[FB.newKey(EVENTS_PATH)] = d; });
        return FB.set(EVENTS_PATH + "/" + newId, {
          nome: fd.get("nome"), data: fd.get("data"), disciplina: fd.get("disciplina"),
          orario: fd.get("orario") || "", luogo: fd.get("luogo") || "",
          descrizione: fd.get("descrizione") || "", locandina: results[0] || null,
          documenti: documenti
        });
      }).then(function () {
        shell.close();
        toast("Evento creato");
      }).catch(function (err) {
        console.error(err);
        alert("Creazione non riuscita: " + err.message);
        submitBtn.disabled = false; submitBtn.textContent = "Crea evento";
      });
    });
  }

  function initEventsCalendar(container) {
    var filter = container.getAttribute("data-events-filter") || "tutte";

    function refresh(all) {
      var events = Object.keys(all).map(function (id) { var e = all[id]; e.id = id; return e; });
      var filtered = filter === "tutte" ? events : events.filter(function (e) { return e.disciplina === filter || e.disciplina === "tutte"; });
      var mapped = filtered.map(function (e) {
        return { id: e.id, title: e.nome, date: e.data, time: e.orario, place: e.luogo, tag: DISC_LABELS[e.disciplina] || "" };
      });
      if (window.PPF && window.PPF.initCalendar) window.PPF.initCalendar(container, mapped);
      container.querySelectorAll(".event[data-event-id]").forEach(function (el) {
        el.classList.add("event-clickable");
        el.addEventListener("click", function () {
          var id = el.getAttribute("data-event-id");
          openEventModal(id, all[id], function () { watchEvents(refresh); });
        });
      });
    }

    if (isAdmin() && !container.querySelector(".events-admin-bar")) {
      var bar = document.createElement("div");
      bar.className = "events-admin-bar";
      bar.innerHTML = '<button type="button" class="events-add-btn">+ Aggiungi evento</button>';
      bar.querySelector("button").addEventListener("click", function () { openAddEventForm(); });
      container.prepend(bar);
    }

    watchEvents(refresh);
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
      '<p class="form-note" style="margin-top:-6px;">Lascia "Orario" vuoto per svuotare la cella (comparirà un trattino "—" come le altre celle libere).</p>' +
      '<form class="form-grid" data-cell-form>' +
      '<div><label for="cf-time">Orario</label><input id="cf-time" type="text" placeholder="es. 17:00–18:00" value="' + escapeHtml(initial.time || "") + '"></div>' +
      '<div><label for="cf-label">Etichetta (facoltativa)</label><input id="cf-label" type="text" placeholder="es. Lun · tecnica" value="' + escapeHtml(initial.label || "") + '"></div>' +
      '<div class="row-actions"><button type="submit" class="btn btn-primary" style="background:var(--red);">Salva</button>' +
      '<button type="button" class="cancel">Annulla</button>' +
      '<button type="button" class="clear-cell">Svuota cella</button></div>' +
      "</form>";
    shell.backdrop.appendChild(modal);
    modal.querySelector(".cancel").addEventListener("click", shell.close);
    modal.querySelector(".clear-cell").addEventListener("click", function () {
      onSave({ empty: true, time: "", label: "" });
      shell.close();
    });
    modal.querySelector("[data-cell-form]").addEventListener("submit", function (e) {
      e.preventDefault();
      var time = modal.querySelector("#cf-time").value.trim();
      var label = modal.querySelector("#cf-label").value.trim();
      onSave({ empty: !time, time: time, label: label });
      shell.close();
    });
  }

  function initBoardEditing() {
    document.querySelectorAll("table[data-board]").forEach(function (table) {
      var code = table.getAttribute("data-board");
      var cellsPath = "board/" + code + "/cells";
      var labelsPath = "board/" + code + "/labels";
      var deletedPath = "board/" + code + "/deleted";
      var rowsPath = "board/" + code + "/rows";
      var dayCount = table.querySelectorAll("thead th").length - 1;
      var tbody = table.querySelector("tbody");

      function applyCell(td, data) {
        var cellDiv = td.querySelector(".board-cell");
        var tmp = document.createElement("div");
        tmp.innerHTML = cellHtml(data.time, data.label, data.empty);
        var fresh = tmp.firstChild;
        if (cellDiv) cellDiv.replaceWith(fresh); else td.appendChild(fresh);
        fresh.classList.add("board-flip");
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

      function setupRowLabel(labelTd, getLabel, onRename, onDelete) {
        labelTd.innerHTML = "";
        var span = document.createElement("span");
        span.className = "board-row-label-text";
        span.textContent = getLabel();
        labelTd.appendChild(span);
        if (isAdmin()) {
          span.setAttribute("contenteditable", "true");
          span.addEventListener("blur", function () { onRename(span.textContent.trim()); });
          var del = document.createElement("button");
          del.type = "button"; del.className = "board-row-del";
          del.setAttribute("aria-label", "Elimina questa categoria dal tabellone");
          del.textContent = "✕";
          del.addEventListener("click", function (e) {
            e.stopPropagation();
            if (!confirm("Eliminare questa categoria dal tabellone?")) return;
            onDelete();
          });
          labelTd.appendChild(del);
        }
      }

      // stato remoto: celle modificate, etichette rinominate, righe eliminate, righe aggiunte
      FB.listen(cellsPath, function (overrides) {
        overrides = overrides || {};
        Object.keys(overrides).forEach(function (key) {
          var m = key.match(/^r(\d+)c(\d+)$/);
          if (!m) return;
          var td = tbody.querySelector('td[data-row="' + m[1] + '"][data-col="' + m[2] + '"]');
          if (td) applyCell(td, overrides[key]);
        });
      });

      FB.listen(labelsPath, function (labels) {
        labels = labels || {};
        Object.keys(labels).forEach(function (r) {
          var span = tbody.querySelector('td.board-row-label[data-row="' + r + '"] .board-row-label-text');
          if (span) span.textContent = labels[r];
        });
      });

      FB.listen(deletedPath, function (deleted) {
        deleted = deleted || {};
        Object.keys(deleted).forEach(function (r) {
          var tr = tbody.querySelector('td.board-row-label[data-row="' + r + '"]');
          if (tr) tr.closest("tr").remove();
        });
      });

      FB.listen(rowsPath, function (rows) {
        tbody.querySelectorAll("tr[data-extra-row]").forEach(function (tr) { tr.remove(); });
        rows = rows || {};
        Object.keys(rows).forEach(function (rid) { tbody.appendChild(renderExtraRow(rows[rid], rid)); });
      });

      function renderExtraRow(rowData, rid) {
        var tr = document.createElement("tr");
        tr.setAttribute("data-extra-row", rid);
        var labelTd = document.createElement("td");
        labelTd.className = "board-row-label";
        tr.appendChild(labelTd);
        (rowData.cells || []).forEach(function (c, ci) {
          var td = document.createElement("td");
          td.innerHTML = cellHtml(c.time, c.label, c.empty);
          tr.appendChild(td);
          wireCellClick(td, function (val) {
            FB.set(rowsPath + "/" + rid + "/cells/" + ci, val);
          });
        });
        setupRowLabel(
          labelTd,
          function () { return rowData.label; },
          function (val) { FB.set(rowsPath + "/" + rid + "/label", val); },
          function () { FB.remove(rowsPath + "/" + rid); }
        );
        return tr;
      }

      // etichette + click sulle righe statiche presenti nell'HTML
      tbody.querySelectorAll("tr").forEach(function (tr) {
        var labelTd = tr.querySelector("td.board-row-label[data-row]");
        if (!labelTd) return;
        var row = labelTd.getAttribute("data-row");
        var originalLabel = labelTd.textContent.trim();

        setupRowLabel(
          labelTd,
          function () { return originalLabel; },
          function (val) { FB.set(labelsPath + "/" + row, val); },
          function () { FB.set(deletedPath + "/" + row, true); }
        );

        tr.querySelectorAll("td[data-row][data-col]").forEach(function (td) {
          var col = td.getAttribute("data-col");
          wireCellClick(td, function (val) { FB.set(cellsPath + "/r" + row + "c" + col, val); });
        });
      });

      if (isAdmin()) {
        var addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "events-add-btn";
        addBtn.style.margin = "14px 0 0";
        addBtn.textContent = "+ Aggiungi categoria al tabellone";
        addBtn.addEventListener("click", function () {
          var cells = [];
          for (var i = 0; i < dayCount; i++) cells.push({ time: "", label: "", empty: true });
          FB.push(rowsPath, { label: "Nuova categoria", cells: cells });
        });
        table.closest(".board").insertAdjacentElement("afterend", addBtn);
      }
    });
  }

  /* ---------------- avvio ----------------
     Aspettiamo di conoscere lo stato di autenticazione prima di costruire
     l'interfaccia, per evitare sfarfallii tra vista pubblica e admin. */
  function boot() {
    // Il pulsante di accesso (o la barra admin) va creato SEMPRE per primo,
    // così resta visibile anche se una delle sezioni sotto genera un errore.
    wireNavAdminLink();
    if (isAdmin()) {
      buildAdminBar();
    } else {
      buildFab();
    }

    function safely(label, fn) {
      try { fn(); } catch (err) { console.error("Errore nel modulo '" + label + "':", err); }
    }

    safely("testi e immagini", applyOverrides);
    safely("fotogallery", initGalleryExtras);
    safely("gare e risultati", function () { document.querySelectorAll("[data-gare]").forEach(initGare); });
    safely("calendario eventi", function () { document.querySelectorAll("[data-events-filter]").forEach(initEventsCalendar); });
    safely("maestri/istruttori", function () { document.querySelectorAll("[data-staff]").forEach(initStaff); });
    safely("tabellone orari", initBoardEditing);

    if (isAdmin()) {
      safely("modalità di modifica", enableEditing);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    FB.auth.onAuthStateChanged(function (user) {
      currentUser = user;
      boot();
    }, function (err) {
      console.error("Errore di autenticazione Firebase:", err);
      buildFab(); // mostra comunque il pulsante di accesso
    });
  });

  window.PPF_ADMIN = { isAdmin: isAdmin };
})();
