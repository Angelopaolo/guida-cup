const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

let ultimoNumeroAnnunciato = "";
let chiamateAttive = false;
let intervalloMonitor = null;

const numeroMonitor = document.getElementById("numeroMonitor");
const servizioMonitor = document.getElementById("servizioMonitor");
const oraMonitor = document.getElementById("oraMonitor");

const btnAvviaChiamate = document.getElementById("btnAvviaChiamate");
const btnFermaChiamate = document.getElementById("btnFermaChiamate");

async function leggiNumeroDaGoogleSheet() {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  const response = await fetch(APP_SCRIPT_URL + "?t=" + Date.now(), {
    method: "GET",
    signal: controller.signal
  });

  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error("Errore nella risposta del server");
  }

  const data = await response.json();

  if (!data.ok) {
    throw new Error(data.errore || "Errore dati monitor");
  }

  return data;
}

function mostraSulMonitor(data) {
  const numero = data.numero || "---";
  const servizio = data.servizio || "---";
  const ora = data.ora || "---";

  numeroMonitor.textContent = numero;
  servizioMonitor.textContent = servizio;
  oraMonitor.textContent = ora;

  return { numero, servizio, ora };
}

async function sincronizzaMonitorSenzaAnnunciare() {
  try {
    const data = await leggiNumeroDaGoogleSheet();
    const { numero } = mostraSulMonitor(data);

    ultimoNumeroAnnunciato = numero;
    localStorage.setItem("ultimoNumeroAnnunciato", numero);

  } catch (error) {
    numeroMonitor.textContent = "Errore";
    servizioMonitor.textContent = "Monitor non disponibile";
    oraMonitor.textContent = "---";
  }
}

async function aggiornaMonitor() {
  if (!chiamateAttive) return;

  try {
    const data = await leggiNumeroDaGoogleSheet();
    const { numero, servizio } = mostraSulMonitor(data);

    if (
      numero !== "---" &&
      numero !== "Errore" &&
      numero !== ultimoNumeroAnnunciato
    ) {
      annunciaNumero(numero, servizio);

      ultimoNumeroAnnunciato = numero;
      localStorage.setItem("ultimoNumeroAnnunciato", numero);
    }

  } catch (error) {
    numeroMonitor.textContent = "Errore";
    servizioMonitor.textContent = "Monitor non disponibile";
    oraMonitor.textContent = "---";
  }
}

function annunciaNumero(numero, servizio) {
  if (!("speechSynthesis" in window)) return;

  // Separo lettera e numero
  const lettera = numero.match(/[A-Z]+/)[0];
  const numeroParte = parseInt(numero.replace(/\D/g, ""), 10);

  const testo = `Numero ${lettera} ${numeroParte}. Servizio ${servizio}`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.85; // più naturale
  voce.pitch = 1;
  voce.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voce);
}

async function avviaChiamate() {
  chiamateAttive = true;

  btnAvviaChiamate.style.display = "none";
  btnFermaChiamate.style.display = "inline-block";

  numeroMonitor.textContent = "Avvio...";
  servizioMonitor.textContent = "Chiamata in corso...";
  oraMonitor.textContent = "";

  await aggiornaMonitor();

  if (!intervalloMonitor) {
    intervalloMonitor = setInterval(aggiornaMonitor, 15000);
  }
}

function fermaChiamate() {
  chiamateAttive = false;

  if (intervalloMonitor) {
    clearInterval(intervalloMonitor);
    intervalloMonitor = null;
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  numeroMonitor.textContent = "---";
  servizioMonitor.textContent = "Monitor spento";
  oraMonitor.textContent = "---";

  btnAvviaChiamate.style.display = "inline-block";
  btnFermaChiamate.style.display = "none";
}

btnAvviaChiamate.addEventListener("click", avviaChiamate);
btnFermaChiamate.addEventListener("click", fermaChiamate);

numeroMonitor.textContent = "---";
servizioMonitor.textContent = "Monitor spento";
oraMonitor.textContent = "---";
