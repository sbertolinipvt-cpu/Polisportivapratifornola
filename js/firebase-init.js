/* ============================================================
   POLISPORTIVA PRATI FORNOLA — inizializzazione Firebase
   ============================================================

   ATTENZIONE — MANCA "databaseURL"
   ----------------------------------
   La configurazione che ci hai fornito non include "databaseURL", un
   campo OBBLIGATORIO per collegarsi al Realtime Database (l'SDK non può
   funzionare senza). Non è un dato segreto: lo trovi in cima alla pagina
   "Realtime Database" nella console Firebase, ha una forma tipo:
     https://polisportiva-prati-fornola-default-rtdb.europe-west1.firebasedatabase.app
   oppure, per database creati nella regione storica:
     https://polisportiva-prati-fornola-default-rtdb.firebaseio.com
   Copialo e incollalo qui sotto al posto di "INSERISCI_QUI_IL_TUO_DATABASE_URL".
   Finché non lo fai, il sito mostra un avviso e l'admin non funziona.
   ============================================================ */
(function () {
  "use strict";

  var firebaseConfig = {
    apiKey: "AIzaSyDx9BEUiZ71tWI8AlFOxH7QrqjPb4TsKNM",
    authDomain: "polisportiva-prati-fornola.firebaseapp.com",
    databaseURL: "https://polisportiva-prati-fornola-default-rtdb.firebaseio.com/
:
null",
    projectId: "polisportiva-prati-fornola",
    storageBucket: "polisportiva-prati-fornola.firebasestorage.app",
    messagingSenderId: "181616662191",
    appId: "1:181616662191:web:838767ccf457e79262a65a"
  };

  function showErrorBanner(msg) {
    document.addEventListener("DOMContentLoaded", function () {
      var bar = document.createElement("div");
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999;background:#C31E2A;color:#fff;" +
        "font-family:monospace;font-size:13px;padding:10px 16px;text-align:center;";
      bar.textContent = msg;
      document.body.prepend(bar);
    });
  }

  if (!firebaseConfig.databaseURL || firebaseConfig.databaseURL.indexOf("https://polisportiva-prati-fornola-default-rtdb.firebaseio.com/
:
null") === 0) {
    showErrorBanner("⚠ Configurazione Firebase incompleta: manca \"databaseURL\" in js/firebase-init.js — il sito funziona solo in lettura statica, il pannello admin è disattivato.");
    window.PPF_FIREBASE_READY = false;
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);

    var db = firebase.database();
    var storage = firebase.storage();
    var auth = firebase.auth();
  } catch (err) {
    console.error("Errore di inizializzazione Firebase:", err);
    showErrorBanner("⚠ Errore di inizializzazione Firebase: " + err.message + " — controlla la console (F12) e la configurazione in js/firebase-init.js.");
    window.PPF_FIREBASE_READY = false;
    return;
  }

  /* ---------- helper generici di lettura/scrittura ---------- */

  // legge un valore una sola volta
  function fbGetOnce(path) {
    return db.ref(path).once("value").then(function (snap) { return snap.val(); });
  }

  // resta in ascolto in tempo reale; ritorna una funzione per smettere di ascoltare
  function fbListen(path, callback) {
    var ref = db.ref(path);
    ref.on("value", function (snap) { callback(snap.val()); });
    return function unsubscribe() { ref.off("value"); };
  }

  function fbSet(path, value) { return db.ref(path).set(value); }
  function fbUpdate(path, obj) { return db.ref(path).update(obj); }
  function fbRemove(path) { return db.ref(path).remove(); }
  function fbPush(path, value) {
    var ref = db.ref(path).push();
    return ref.set(value).then(function () { return ref.key; });
  }
  function fbNewKey(path) { return db.ref(path).push().key; }

  // carica un file su Storage e restituisce l'URL pubblico di download
  function fbUploadFile(path, file, onProgress) {
    var ref = storage.ref(path);
    var task = ref.put(file);
    return new Promise(function (resolve, reject) {
      task.on(
        "state_changed",
        function (snap) {
          if (onProgress) onProgress(snap.bytesTransferred / snap.totalBytes);
        },
        reject,
        function () { ref.getDownloadURL().then(resolve).catch(reject); }
      );
    });
  }

  function fbSlugFileName(file) {
    var clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    return Date.now() + "_" + Math.random().toString(36).slice(2, 7) + "_" + clean;
  }

  window.PPF_FIREBASE_READY = true;
  window.PPF_FB = {
    db: db,
    storage: storage,
    auth: auth,
    getOnce: fbGetOnce,
    listen: fbListen,
    set: fbSet,
    update: fbUpdate,
    remove: fbRemove,
    push: fbPush,
    newKey: fbNewKey,
    uploadFile: fbUploadFile,
    slugFileName: fbSlugFileName
  };
})();
