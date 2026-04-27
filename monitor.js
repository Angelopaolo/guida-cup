const APP_SCRIPT_URL = "IL_TUO_URL_APPS_SCRIPT_EXEC";

let ultimoNumeroAnnunciato = "";

async function aggiornaMonitor() {
  try {
    const response = await fetch(APP_SCRIPT_URL);
    const data = await response.json();

    const numero = data.numero || "---";
    const servizio = data.servizio || "---";
    const ora = data.ora || "---";

    document.getElementById("numeroMonitor").textContent = numero;
    document.getElementById("servizioMonitor").textContent = servizio;
    document.getElementById("oraMonitor").textContent = ora;

    if (
      numero !== "---" &&
      numero !== "Errore" &&
      numero !== ultimoNumeroAnnunciato
    ) {
      annunciaNumero(numero, servizio);
      ultimoNumeroAnnunciato = numero;
    }

  } catch (error) {
    document.getElementById("numeroMonitor").textContent = "Errore";
  }
}

function annunciaNumero(numero, servizio) {
  const testo = `Numero ${numero}, servizio ${servizio}`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.9;
  voce.pitch = 1;
  voce.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voce);
}

aggiornaMonitor();
setInterval(aggiornaMonitor, 5000);
