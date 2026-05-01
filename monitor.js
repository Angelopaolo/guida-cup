const APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

let chiamateAttive = false;
let intervalloMonitor = null;
let ultimoNumeroAnnunciato = "";

const btnAvviaChiamate = document.getElementById("btnAvviaChiamate");
const btnFermaChiamate = document.getElementById("btnFermaChiamate");

const SERVIZI = {
  cartelle: {
    nome: "Cartelle cliniche"
  },
  pagamenti: {
    nome: "Pagamenti"
  },
  laboratorio: {
    nome: "Laboratorio analisi"
  },
  prenotazioni: {
    nome: "Prenotazioni e accettazioni"
  },
  cortesia: {
    nome: "Sportello cortesia"
  },
  libera: {
    nome: "Libera professione"
  }
};

const LETTERE_DA_LEGGERE = {
  C: "ci",
  P: "pi",
  L: "elle",
  A: "a",
  S: "esse",
  LP: "elle pi"
};

async function chiamaProssimoNumero() {
  const url = `${APP_SCRIPT_URL}?azione=chiama_prossimo&t=${Date.now()}`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("Risposta non valida dal server");
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.errore || "Errore dal backend");
    }

    return data;

  } finally {
    clearTimeout(timeout);
  }
}

function aggiornaTutteLeFinestre(statoServizi) {
  Object.keys(SERVIZI).forEach((servizio) => {
    const numeroEl = document.getElementById(`num-${servizio}`);
    const oraEl = document.getElementById(`ora-${servizio}`);
    const cardEl = document.getElementById(`card-${servizio}`);

    if (!numeroEl || !oraEl || !cardEl) return;

    const dati = statoServizi && statoServizi[servizio];

    numeroEl.textContent = dati?.numero || "---";
    oraEl.textContent = dati?.ora || "---";

    cardEl.classList.remove("monitor-active");
  });
}

function evidenziaFinestra(servizio) {
  if (!servizio || servizio === "---") return;

  const cardEl = document.getElementById(`card-${servizio}`);
  if (!cardEl) return;

  cardEl.classList.add("monitor-active");

  setTimeout(() => {
    cardEl.classList.remove("monitor-active");
  }, 3500);
}

function annunciaNumero(numero, servizio) {
  if (!("speechSynthesis" in window)) return;
  if (!numero || numero === "---") return;

  const lettereNumero = String(numero).match(/[A-Z]+/);
  const cifreNumero = String(numero).match(/\d+/);

  if (!lettereNumero || !cifreNumero) return;

  const sigla = lettereNumero[0];
  const parteNumerica = parseInt(cifreNumero[0], 10);

  const letteraDaLeggere = LETTERE_DA_LEGGERE[sigla] || sigla;
  const nomeServizio = SERVIZI[servizio]?.nome || servizio;

  const testo =
    `Numero ${letteraDaLeggere} ${parteNumerica}. ` +
    `Servizio ${nomeServizio}.`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.75;
  voce.pitch = 1;
  voce.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voce);
}

async function aggiornaMonitor() {
  if (!chiamateAttive) return;

  try {
    const data = await chiamaProssimoNumero();

    aggiornaTutteLeFinestre(data.statoServizi);

    const numero = data.numero || "---";
    const servizio = data.servizio || "---";

    const numeroValido =
      numero !== "---" &&
      numero !== "Errore" &&
      numero !== ultimoNumeroAnnunciato;

    if (numeroValido) {
      evidenziaFinestra(servizio);
      annunciaNumero(numero, servizio);

      ultimoNumeroAnnunciato = numero;
      localStorage.setItem("ultimoNumeroAnnunciato", numero);
    }

  } catch (error) {
    console.error("Errore monitor:", error);

    alert("Errore monitor: " + error.message);
    fermaChiamate();
  }
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
