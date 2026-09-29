const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxjg2xdSj8QDjEpjdpHpcM3U_SybrPnZiJ5Ny5NCaHiOorRBCnPVJiQvZRHI2uI40D8dA/exec";
const TOKEN_SICUREZZA = "CHIAVE_SUPER_SEGRETA_123";
const VERSIONE_CHIAMATE = "cup-chiamate-confermate-v1";
const CHIAVE_CHIAMATA = "cup-chiamata-pendente-v2";
const SERVIZI = {
  cartelle: {nome: "Cartelle cliniche"}, pagamenti: {nome: "Pagamenti"},
  laboratorio: {nome: "Laboratorio analisi"}, prenotazioni: {nome: "Prenotazioni e accettazioni"},
  cortesia: {nome: "Sportello cortesia"}, libera: {nome: "Libera professione"}
};
const LETTERE_DA_LEGGERE = {C: "ci", P: "pi", L: "elle", A: "a", S: "esse", LP: "elle pi"};
const btnAvviaChiamate = document.getElementById("btnAvviaChiamate");
const btnFermaChiamate = document.getElementById("btnFermaChiamate");
const statoMonitor = document.createElement("p");
statoMonitor.id = "stato-monitor";
statoMonitor.setAttribute("role", "status");
statoMonitor.style.cssText = "padding:12px 18px;background:#fff8e1;color:#102c48;border-radius:12px;font-size:20px;line-height:1.45";
const btnRiprendi = document.createElement("button");
btnRiprendi.className = "btn";
btnRiprendi.hidden = true;
btnRiprendi.style.display = "none";
(document.querySelector(".monitor-grid") || btnAvviaChiamate).before(statoMonitor, btnRiprendi);
statoMonitor.textContent = "Premi Avvia chiamate. Tieni aperto un solo Monitor per gli annunci.";
let sessioneMonitor = null;
let chiamataDaRiprendere = null;
let voceCorrente = null;

function idValido(id) { return typeof id === "string" && /^[A-Za-z0-9_-]{20,80}$/.test(id); }
function verificaNumero(dati) {
  if (!dati || !Object.prototype.hasOwnProperty.call(SERVIZI, dati.servizio) || !/^[A-Z]+\d+$/.test(dati.numero)) {
    throw new Error("Il servizio ha restituito un numero non valido. La coda resta ferma.");
  }
}
function leggiChiamata() {
  const salvata = localStorage.getItem(CHIAVE_CHIAMATA);
  if (!salvata) return null;
  const p = JSON.parse(salvata);
  if (!p || !idValido(p.id) || !["richiesta", "pronta", "conferma"].includes(p.fase)) {
    throw new Error("La chiamata salvata non è leggibile. Verifica la riga IN CHIAMATA in Coda.");
  }
  if (p.fase !== "richiesta") verificaNumero(p);
  return p;
}
function salvaChiamata(p) { localStorage.setItem(CHIAVE_CHIAMATA, JSON.stringify(p)); }
function eliminaChiamata(id) {
  const p = leggiChiamata();
  if (!p || p.id !== id) throw new Error("La chiamata salvata è cambiata. Le chiamate restano ferme.");
  localStorage.removeItem(CHIAVE_CHIAMATA);
}
function nuovaChiamata() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const p = {id: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""), fase: "richiesta"};
  // Conserva l'ID prima dell'invio, anche se la risposta andrà persa.
  salvaChiamata(p);
  return p;
}
function controllaSessione(signal) { if (signal.aborted) throw new Error("Chiamate fermate."); }
async function scambiaChiamata(azione, id, signal) {
  controllaSessione(signal);
  const controller = new AbortController();
  const annulla = () => controller.abort();
  signal.addEventListener("abort", annulla, {once: true});
  const timeout = setTimeout(annulla, 30000);
  const parametri = new URLSearchParams({azione, token: TOKEN_SICUREZZA, t: String(Date.now())});
  if (id) parametri.set("callId", id);
  const scrittura = ["prepara_chiamata", "conferma_chiamata"].includes(azione);
  try {
    const risposta = await fetch(scrittura ? APP_SCRIPT_URL : APP_SCRIPT_URL + "?" + parametri, {
      method: scrittura ? "POST" : "GET", ...(scrittura ? {body: parametri} : {}), signal: controller.signal
    });
    if (!risposta.ok) throw new Error("Il servizio non ha risposto correttamente.");
    const dati = await risposta.json();
    controllaSessione(signal);
    if (!dati.ok) throw new Error(dati.errore || "Risposta del servizio non valida.");
    return dati;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", annulla);
  }
}
async function inviaConRecupero(azione, p, signal) {
  try { return await scambiaChiamata(azione, p.id, signal); }
  catch (errore) {
    controllaSessione(signal);
    statoMonitor.textContent = "Risposta in ritardo. Recupero della stessa chiamata…";
    // La verifica legge soltanto: non prende un altro numero dalla coda.
    return await scambiaChiamata("stato_chiamata", p.id, signal);
  }
}
function verificaRisposta(dati, p) {
  if (dati.callId !== p.id) throw new Error("La risposta non corrisponde alla chiamata in corso.");
  if (["da_annunciare", "confermata"].includes(dati.statoChiamata)) {
    verificaNumero(dati);
    if (p.numero && (p.numero !== dati.numero || p.servizio !== dati.servizio)) {
      throw new Error("Il numero della chiamata è cambiato. Verifica il foglio Coda.");
    }
  }
}
function aggiornaTutteLeFinestre(stato) {
  for (const servizio of Object.keys(SERVIZI)) {
    const numero = document.getElementById("num-" + servizio);
    const ora = document.getElementById("ora-" + servizio);
    const card = document.getElementById("card-" + servizio);
    if (!numero || !ora || !card) throw new Error("Ricarica la pagina del Monitor: manca un riquadro.");
    numero.textContent = stato?.[servizio]?.numero || "---";
    ora.textContent = stato?.[servizio]?.ora || "---";
    card.classList.remove("monitor-active");
  }
}
function mostraChiamata(p) {
  verificaNumero(p);
  const numero = document.getElementById("num-" + p.servizio);
  const ora = document.getElementById("ora-" + p.servizio);
  const card = document.getElementById("card-" + p.servizio);
  if (!numero || !ora || !card) throw new Error("Il riquadro del numero non è disponibile. Ricarica il Monitor.");
  numero.textContent = p.numero;
  ora.textContent = "Chiamata in corso";
  card.classList.add("monitor-active");
}
function mostraPausa() {
  try {
    const p = leggiChiamata();
    if (!p?.numero || document.getElementById("num-" + p.servizio)?.textContent !== p.numero) return;
    document.getElementById("ora-" + p.servizio).textContent = p.fase === "conferma" ? "Conferma da completare" : "Da completare";
    document.getElementById("card-" + p.servizio).classList.remove("monitor-active");
  } catch (errore) { /* Conserva il messaggio principale anche se la memoria non è accessibile. */ }
}
function annunciaNumero(p, signal) {
  return new Promise((resolve, reject) => {
    let conclusa = false, iniziata = false;
    const parti = p.numero.match(/^([A-Z]+)(\d+)$/);
    const voce = new SpeechSynthesisUtterance(
      `Numero ${LETTERE_DA_LEGGERE[parti[1]] || parti[1]} ${Number(parti[2])}. Servizio ${SERVIZI[p.servizio].nome}.`
    );
    voceCorrente = voce;
    voce.lang = "it-IT"; voce.rate = 0.75; voce.pitch = 1; voce.volume = 1;
    function termina(errore) {
      if (conclusa) return;
      conclusa = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", annulla);
      voce.onstart = voce.onend = voce.onerror = null;
      voceCorrente = null;
      if (errore) { window.speechSynthesis.cancel(); reject(errore); } else resolve();
    }
    const annulla = () => termina(new Error("Annuncio interrotto. Il numero resta da completare."));
    const timeout = setTimeout(() => termina(new Error("La voce non ha completato l'annuncio. Controlla l'audio e premi Avvia chiamate per riprendere.")), 60000);
    signal.addEventListener("abort", annulla, {once: true});
    voce.onstart = () => { iniziata = true; };
    voce.onerror = () => termina(new Error("Annuncio vocale non riuscito. Controlla l'audio e premi Avvia chiamate per riprendere lo stesso numero."));
    voce.onend = () => {
      if (signal.aborted || !iniziata) return termina(new Error("L'annuncio non è stato completato."));
      try {
        // Conserva il completamento prima della conferma remota e prima di risolvere la Promise.
        p.fase = "conferma";
        salvaChiamata(p);
        termina();
      } catch (errore) { termina(errore); }
    };
    try {
      controllaSessione(signal);
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(voce);
    } catch (errore) { termina(errore); }
  });
}
async function completaChiamata(p, signal) {
  let dati;
  if (p.fase !== "conferma") {
    statoMonitor.textContent = p.numero ? "Ripresa della chiamata " + p.numero + "…" : "Preparazione della chiamata…";
    dati = await inviaConRecupero("prepara_chiamata", p, signal);
    if (dati.statoChiamata === "in_sospeso") {
      if (dati.richiestaId !== p.id || !idValido(dati.callId)) throw new Error("Risposta della chiamata sospesa non valida.");
      verificaNumero(dati);
      aggiornaTutteLeFinestre(dati.statoServizi);
      chiamataDaRiprendere = {id: dati.callId, fase: "pronta", numero: dati.numero, servizio: dati.servizio};
      btnRiprendi.textContent = "Riprendi " + dati.numero + " su questo Monitor";
      btnRiprendi.hidden = false;
      btnRiprendi.style.display = "inline-block";
      throw new Error("La chiamata " + dati.numero + " è sospesa su un altro Monitor. Ferma quel Monitor prima di usare Riprendi.");
    }
    verificaRisposta(dati, p);
    if (["confermata", "vuota"].includes(dati.statoChiamata)) {
      aggiornaTutteLeFinestre(dati.statoServizi);
      eliminaChiamata(p.id);
      statoMonitor.textContent = dati.statoChiamata === "vuota" ? "Nessun numero in attesa. Le chiamate sono attive." : "Chiamata " + dati.numero + " già completata e confermata.";
      return;
    }
    if (dati.statoChiamata !== "da_annunciare") throw new Error("Esito ancora da verificare. Premi Avvia chiamate per recuperare la stessa richiesta.");
    p = {id: p.id, fase: "pronta", numero: dati.numero, servizio: dati.servizio};
    salvaChiamata(p);
    aggiornaTutteLeFinestre(dati.statoServizi);
    mostraChiamata(p);
    statoMonitor.textContent = "Annuncio del numero " + p.numero + "…";
    await annunciaNumero(p, signal);
  } else {
    // Ripeti solo la conferma, senza pronunciare di nuovo un annuncio già concluso.
    mostraChiamata(p);
  }
  controllaSessione(signal);
  statoMonitor.textContent = "Annuncio " + p.numero + " completato. Conferma in corso…";
  dati = await inviaConRecupero("conferma_chiamata", p, signal);
  verificaRisposta(dati, p);
  if (dati.statoChiamata !== "confermata") throw new Error("L'annuncio è concluso, ma manca la conferma. Premi Avvia chiamate per completarla.");
  aggiornaTutteLeFinestre(dati.statoServizi);
  eliminaChiamata(p.id);
  statoMonitor.textContent = "Chiamata " + p.numero + " completata e confermata.";
}
function attendiProssima(signal) {
  return new Promise(resolve => {
    const fine = () => { clearTimeout(timer); signal.removeEventListener("abort", fine); resolve(); };
    const timer = setTimeout(fine, 15000);
    signal.addEventListener("abort", fine, {once: true});
    if (signal.aborted) fine();
  });
}
async function avviaChiamate(ripresa = null) {
  if (sessioneMonitor) return;
  const controller = new AbortController();
  sessioneMonitor = controller;
  btnAvviaChiamate.disabled = true;
  btnAvviaChiamate.style.display = "none";
  btnFermaChiamate.style.display = "inline-block";
  btnRiprendi.hidden = true;
  btnRiprendi.style.display = "none";
  try {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") throw new Error("Questo browser non dispone della voce. Apri il Monitor in Chrome aggiornato.");
    if (!navigator.locks) throw new Error("Apri il Monitor in Chrome aggiornato usando l'indirizzo HTTPS del sito.");
    window.speechSynthesis.getVoices();
    await navigator.locks.request("cup-monitor-chiamate-v2", {ifAvailable: true}, async lock => {
      if (!lock) throw new Error("Un'altra scheda del Monitor sta già gestendo gli annunci. Fermala prima di avviare questa.");
      const signal = controller.signal;
      controllaSessione(signal);
      if (ripresa) salvaChiamata(ripresa);
      let p = leggiChiamata();
      statoMonitor.textContent = "Verifica del collegamento…";
      const versione = await scambiaChiamata("versione", null, signal);
      if (versione.versioneChiamate !== VERSIONE_CHIAMATE) throw new Error("Aggiorna il deployment CUP - Chatbot prima di avviare questo Monitor.");
      while (!signal.aborted) {
        p = p || nuovaChiamata();
        await completaChiamata(p, signal);
        p = null;
        await attendiProssima(signal);
      }
    });
  } catch (errore) {
    if (!controller.signal.aborted) {
      console.error("Monitor fermato:", errore);
      statoMonitor.textContent = errore.message + " Nessun numero successivo è stato chiamato.";
      mostraPausa();
    }
  } finally {
    controller.abort();
    if (sessioneMonitor === controller) sessioneMonitor = null;
    btnAvviaChiamate.disabled = false;
    btnAvviaChiamate.style.display = "inline-block";
    btnFermaChiamate.style.display = "none";
  }
}
function fermaChiamate() {
  if (sessioneMonitor) sessioneMonitor.abort();
  mostraPausa();
  statoMonitor.textContent = "Chiamate ferme. Al prossimo avvio verrà recuperata l'eventuale chiamata non conclusa.";
}
btnAvviaChiamate.addEventListener("click", () => avviaChiamate());
btnFermaChiamate.addEventListener("click", fermaChiamate);
btnRiprendi.addEventListener("click", () => {
  if (chiamataDaRiprendere && !sessioneMonitor) avviaChiamate(chiamataDaRiprendere);
});
window.addEventListener("pagehide", fermaChiamate);
