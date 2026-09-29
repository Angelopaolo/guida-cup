const choiceButtons = document.querySelectorAll(".totem-btn");

const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxjg2xdSj8QDjEpjdpHpcM3U_SybrPnZiJ5Ny5NCaHiOorRBCnPVJiQvZRHI2uI40D8dA/exec";

// VERSIONE TEST: email e OTP disattivati
const TOKEN_SICUREZZA = "CHIAVE_SUPER_SEGRETA_123";

const orariServizi = {
  cartelle: { start: 9.75, end: 24 },
  pagamenti: { start: 0, end: 24 },
  laboratorio: { start: 7.83, end: 11 },
  prenotazioni: { start: 7.83, end: 16 },
  cortesia: { start: 0, end: 24 },
  libera: { start: 0, end: 24 }
};

function getOraCorrente() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function formatOra(oraDecimale) {
  const ore = Math.floor(oraDecimale);
  const minuti = Math.round((oraDecimale - ore) * 60);
  return `${String(ore).padStart(2, "0")}:${String(minuti).padStart(2, "0")}`;
}

// La richiesta resta nella scheda finché il suo esito non è verificato.
const VERSIONE_API = "cup-richieste-2026-09-29";
const CHIAVE_RICHIESTA = "cup-richiesta-pendente-v1";
let richiestaPendente = null;
let operazioneInCorso = false;
let servizioPronto = false;

async function scambiaDati(parametri, metodo, limiteMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limiteMs);
  try {
    const indirizzo = new URL(APP_SCRIPT_URL);
    const opzioni = {method: metodo, signal: controller.signal};
    if (metodo === "GET") {
      Object.entries(parametri).forEach(([chiave, valore]) => indirizzo.searchParams.set(chiave, valore));
      indirizzo.searchParams.set("_", Date.now().toString());
    } else {
      opzioni.body = new URLSearchParams(parametri);
    }
    const risposta = await fetch(indirizzo.toString(), opzioni);
    if (!risposta.ok) throw new Error("HTTP " + risposta.status);
    const dati = await risposta.json();
    if (!dati || typeof dati.ok !== "boolean") throw new Error("Risposta del servizio non riconosciuta");
    return dati;
  } finally {
    // Il limite copre anche la lettura del contenuto della risposta.
    clearTimeout(timer);
  }
}

function bigliettoVerificato(dati, richiesta) {
  return dati && dati.ok && dati.statoRichiesta === "trovata" &&
    dati.requestId === richiesta.id && dati.servizio === richiesta.servizio &&
    typeof dati.numero === "string" && /^(C|P|L|A|S|LP)[0-9]+$/.test(dati.numero);
}

async function controllaRichiesta(richiesta) {
  return scambiaDati({azione: "stato_richiesta", token: TOKEN_SICUREZZA,
    requestId: richiesta.id, servizio: richiesta.servizio}, "GET", 10000);
}

function aggiornaDisponibilita() {
  choiceButtons.forEach(button => {
    button.disabled = operazioneInCorso || !!richiestaPendente || !servizioPronto || button.classList.contains("disabled");
  });
}

function conservaRichiesta(richiesta) {
  sessionStorage.setItem(CHIAVE_RICHIESTA, JSON.stringify(richiesta));
  richiestaPendente = richiesta;
}

function concludiRichiesta(richiesta) {
  if (!richiestaPendente || richiestaPendente.id !== richiesta.id) return;
  // Se il browser non consente la rimozione, la richiesta resta recuperabile al ricaricamento.
  try { sessionStorage.removeItem(CHIAVE_RICHIESTA); }
  catch (errore) { console.warn("La richiesta conclusa rimane nella memoria della scheda", errore); }
  richiestaPendente = null;
}

function aggiungiAzione(testo, azione) {
  const pulsante = document.createElement("button");
  pulsante.type = "button";
  pulsante.className = "btn";
  pulsante.style.margin = "12px 6px 0 0";
  pulsante.style.fontSize = "18px";
  pulsante.textContent = testo;
  pulsante.addEventListener("click", azione);
  document.getElementById("displayNumero").appendChild(pulsante);
}

function mostraRichiestaInAttesa() {
  mostraMessaggio("La conferma non è ancora arrivata. Il biglietto potrebbe essere già stato creato.");
  aggiungiAzione("Verifica il biglietto", () => eseguiRichiesta(false));
  aggiungiAzione("Riprova la stessa richiesta", () => eseguiRichiesta(true));
}

async function eseguiRichiesta(invia) {
  if (operazioneInCorso || !richiestaPendente) return;
  const richiesta = richiestaPendente;
  operazioneInCorso = true;
  aggiornaDisponibilita();
  mostraMessaggio(invia ? "Generazione biglietto in corso…" : "Verifica del biglietto in corso…");
  try {
    if (invia) {
      let risposta = null;
      try {
        risposta = await scambiaDati({azione: "genera_numero", servizio: richiesta.servizio,
          email: "test@example.com", codiceOtp: "TEST", token: TOKEN_SICUREZZA,
          requestId: richiesta.id}, "POST", 10000);
      } catch (errore) {
        console.warn("Conferma CUP non ricevuta: verifico la stessa richiesta", errore);
      }
      if (bigliettoVerificato(risposta, richiesta)) {
        concludiRichiesta(richiesta);
        mostraNumeroSulDisplay(risposta.numero);
        return;
      }
      if (risposta && !risposta.ok && risposta.esito === "rifiutata") {
        // Il nuovo server usa questo esito solo prima di qualsiasi emissione.
        concludiRichiesta(richiesta);
        mostraMessaggio(risposta.errore || "Richiesta non accettata");
        return;
      }
    }
    mostraMessaggio("Verifica del biglietto già richiesto…");
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      try {
        const stato = await controllaRichiesta(richiesta);
        if (bigliettoVerificato(stato, richiesta)) {
          concludiRichiesta(richiesta);
          mostraNumeroSulDisplay(stato.numero);
          return;
        }
      } catch (errore) {
        console.warn("Verifica CUP temporaneamente non disponibile", errore);
      }
      if (tentativo < 2) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    mostraRichiestaInAttesa();
  } finally {
    operazioneInCorso = false;
    aggiornaDisponibilita();
  }
}

async function preparaSimulatore() {
  servizioPronto = false;
  aggiornaDisponibilita();
  mostraMessaggio("Verifica del collegamento…");
  try {
    const valore = sessionStorage.getItem(CHIAVE_RICHIESTA);
    if (valore) {
      const precedente = JSON.parse(valore);
      if (!precedente || !/^[A-Za-z0-9_-]{20,80}$/.test(precedente.id) ||
          !Object.prototype.hasOwnProperty.call(orariServizi, precedente.servizio)) {
        throw new Error("Richiesta salvata non riconosciuta. Conservare la scheda per la verifica.");
      }
      richiestaPendente = precedente;
    }
    const versione = await scambiaDati({azione: "versione"}, "GET", 10000);
    if (!versione.ok || versione.versioneApi !== VERSIONE_API || !versione.recuperoRichieste) {
      mostraMessaggio("Il servizio CUP deve essere aggiornato prima di usare il simulatore.");
      aggiungiAzione("Ricontrolla il collegamento", preparaSimulatore);
      return;
    }
    servizioPronto = true;
    if (richiestaPendente) await eseguiRichiesta(false);
    else mostraMessaggio("Seleziona un servizio");
  } catch (errore) {
    console.error("Preparazione CUP:", errore);
    mostraMessaggio("Collegamento non disponibile. Riprova la verifica.");
    aggiungiAzione("Ricontrolla il collegamento", preparaSimulatore);
  } finally {
    aggiornaDisponibilita();
  }
}

function aggiornaStatoPulsanti() {
  const ora = getOraCorrente();

  choiceButtons.forEach((button) => {
    const servizio = button.dataset.result;
    const orario = orariServizi[servizio];

    const oldInfo = button.querySelector(".totem-info");
    if (oldInfo) oldInfo.remove();

    if (!orario) {
      button.classList.add("disabled");
      return;
    }

    if (ora < orario.start || ora > orario.end) {
      button.classList.add("disabled");

      const info = document.createElement("span");
      info.classList.add("totem-info");
      info.textContent = `Attivo dalle ore ${formatOra(orario.start)} alle ore ${formatOra(orario.end)}`;

      button.appendChild(info);
    } else {
      button.classList.remove("disabled");
    }
  });
}

function mostraMessaggio(testo) {
  const display = document.getElementById("displayNumero");
  if (!display) return;

  display.textContent = "";

  const messaggioDiv = document.createElement("div");
  messaggioDiv.style.fontSize = "20px";
  messaggioDiv.style.color = "#000000";
  messaggioDiv.textContent = testo;

  display.appendChild(messaggioDiv);
}

function mostraNumeroSulDisplay(numero) {
  const display = document.getElementById("displayNumero");
  if (!display) return;

  display.textContent = "";

  const numeroDiv = document.createElement("div");
  numeroDiv.style.fontSize = "32px";
  numeroDiv.style.color = "#007bff";
  numeroDiv.textContent = `🎫 ${numero}`;

  const testoDiv = document.createElement("div");
  testoDiv.style.color = "#000000";
  testoDiv.textContent = "Biglietto generato in modalità test";

  display.appendChild(numeroDiv);
  display.appendChild(testoDiv);
}

choiceButtons.forEach(button => {
  button.addEventListener("click", async () => {
    if (!servizioPronto || operazioneInCorso || richiestaPendente || button.classList.contains("disabled")) return;
    const servizio = button.dataset.result;
    if (!Object.prototype.hasOwnProperty.call(orariServizi, servizio)) return;
    try {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      // Si conserva l'ID prima dell'invio, anche se la scheda viene ricaricata.
      conservaRichiesta({id: id, servizio: servizio});
    } catch (errore) {
      mostraMessaggio("Non è possibile conservare la richiesta in questa scheda. Il biglietto non è stato richiesto.");
      console.error(errore);
      return;
    }
    choiceButtons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    await eseguiRichiesta(true);
  });
});

aggiornaStatoPulsanti();
setInterval(() => { aggiornaStatoPulsanti(); aggiornaDisponibilita(); }, 60000);
preparaSimulatore();
