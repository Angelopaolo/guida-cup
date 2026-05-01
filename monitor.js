const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

let ultimoNumeroAnnunciato = "";
let chiamateAttive = false;
let intervalloMonitor = null;

const btnAvviaChiamate = document.getElementById("btnAvviaChiamate");
const btnFermaChiamate = document.getElementById("btnFermaChiamate");

const SERVIZI_MONITOR = [
  "cartelle",
  "pagamenti",
  "laboratorio",
  "prenotazioni",
  "cortesia",
  "libera"
];

async function leggiNumeroDaGoogleSheet() {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  const response = await fetch(
    APP_SCRIPT_URL + "?azione=chiama_prossimo&t=" + Date.now(),
    {
      method: "GET",
      signal: controller.signal
    }
  );

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

function aggiornaFinestre(statoServizi) {
  SERVIZI_MONITOR.forEach((servizio) => {
    const numeroEl = document.getElementById("num-" + servizio);
    const oraEl = document.getElementById("ora-" + servizio);
    const cardEl = document.getElementById("card-" + servizio);

    if (!numeroEl || !oraEl || !cardEl) return;

    const dati = statoServizi && statoServizi[servizio];

    numeroEl.textContent = dati && dati.numero ? dati.numero : "---";
    oraEl.textContent = dati && dati.ora ? dati.ora : "---";

    cardEl.classList.remove("monitor-active");
  });
}

function evidenziaServizio(servizio) {
  if (!servizio || servizio === "---") return;

  const card = document.getElementById("card-" + servizio);
  if (!card) return;

  card.classList.add("monitor-active");

  setTimeout(() => {
    card.classList.remove("monitor-active");
  }, 3500);
}

async function aggiornaMonitor() {
  if (!chiamateAttive) return;

  try {
    const data = await leggiNumeroDaGoogleSheet();

    aggiornaFinestre(data.statoServizi);

    const numero = data.numero || "---";
    const servizio = data.servizio || "---";

    if (
      numero !== "---" &&
      numero !== "Errore" &&
      numero !== ultimoNumeroAnnunciato
    ) {
      evidenziaServizio(servizio);
      annunciaNumero(numero, servizio);

      ultimoNumeroAnnunciato = numero;
      localStorage.setItem("ultimoNumeroAnnunciato", numero);
    }

  } catch (error) {
    console.error(error);
    fermaChiamate();
    alert("Errore monitor: " + error.message);
  }
}

function annunciaNumero(numero, servizio) {
  if (!("speechSynthesis" in window)) return;

  const lettere = {
    P: "pi",
    C: "ci",
    L: "elle",
    A: "a",
    S: "esse",
    LP: "elle pi"
  };

  const nomiServizi = {
    cartelle: "Cartelle cliniche",
    pagamenti: "Pagamenti",
    laboratorio: "Laboratorio analisi",
    prenotazioni: "Prenotazioni e accettazioni",
    cortesia: "Sportello cortesia",
    libera: "Libera professione"
  };

  const lettereNumero = String(numero).match(/[A-Z]+/);
  const cifreNumero = String(numero).match(/\d+/);

  if (!lettereNumero || !cifreNumero) return;

  const sigla = lettereNumero[0];
  const parteNumerica = parseInt(cifreNumero[0], 10);

  const letteraDaLeggere = lettere[sigla] || sigla;
  const nomeServizio = nomiServizi[servizio] || servizio;

  const testo = `Numero ${letteraDaLeggere} ${parteNumerica}. Servizio ${nomeServizio}`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.75;
  voce.pitch = 1;
  voce.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voce);
}

async function avviaChiamate() {
  chiamateAttive = true;

  btnAvviaChiamate.style.display = "none";
  btnFermaChiamate.style.display = "inline-block";

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

  btnAvviaChiamate.style.display = "inline-block";
  btnFermaChiamate.style.display = "none";
}

btnAvviaChiamate.addEventListener("click", avviaChiamate);
btnFermaChiamate.addEventListener("click", fermaChiamate);
