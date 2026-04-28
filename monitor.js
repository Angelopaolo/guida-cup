const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

let ultimoNumeroAnnunciato = localStorage.getItem("ultimoNumeroAnnunciato") || "";
let chiamateAttive = false;
let intervalloMonitor = null;

const numeroMonitor = document.getElementById("numeroMonitor");
const servizioMonitor = document.getElementById("servizioMonitor");
const oraMonitor = document.getElementById("oraMonitor");

const btnAvviaChiamate = document.getElementById("btnAvviaChiamate");
const btnFermaChiamate = document.getElementById("btnFermaChiamate");

async function aggiornaMonitor() {
  try {
    const response = await fetch(APP_SCRIPT_URL);

    if (!response.ok) {
      throw new Error("Errore nella risposta del server");
    }

    const data = await response.json();

    const numero = data.numero || "---";
    const servizio = data.servizio || "---";
    const ora = data.ora || "---";

    numeroMonitor.textContent = numero;
    servizioMonitor.textContent = servizio;
    oraMonitor.textContent = ora;

    if (numero !== "---" && numero !== "Errore") {

  if (primaLettura) {
    // 🔇 prima volta: NON annunciare
    ultimoNumeroAnnunciato = numero;
    localStorage.setItem("ultimoNumeroAnnunciato", numero);
    primaLettura = false;
  } 
  else if (numero !== ultimoNumeroAnnunciato) {
    // 🔊 dalla seconda in poi: annuncia
    annunciaNumero(numero, servizio);
    ultimoNumeroAnnunciato = numero;
    localStorage.setItem("ultimoNumeroAnnunciato", numero);
  }
}

  } catch (error) {
    numeroMonitor.textContent = "Errore";
    servizioMonitor.textContent = "---";
    oraMonitor.textContent = "---";
  }
}

function annunciaNumero(numero, servizio) {
  const testo = `Numero ${numero}. Servizio ${servizio}`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.50;
  voce.pitch = 1;
  voce.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voce);
}

function avviaChiamate() {
  chiamateAttive = true;

  numeroMonitor.textContent = "Avvio...";
  servizioMonitor.textContent = "Monitor attivo";
  oraMonitor.textContent = "";

  btnAvviaChiamate.style.display = "none";
  btnFermaChiamate.style.display = "inline-block";

  aggiornaMonitor();

  if (!intervalloMonitor) {
    intervalloMonitor = setInterval(aggiornaMonitor, 5000);
  }
}

function fermaChiamate() {
  chiamateAttive = false;

  if (intervalloMonitor) {
    clearInterval(intervalloMonitor);
    intervalloMonitor = null;
  }

  window.speechSynthesis.cancel();

  numeroMonitor.textContent = "---";
  servizioMonitor.textContent = "Monitor spento";
  oraMonitor.textContent = "---";

  btnAvviaChiamate.style.display = "inline-block";
  btnFermaChiamate.style.display = "none";
}

btnAvviaChiamate.addEventListener("click", avviaChiamate);
btnFermaChiamate.addEventListener("click", fermaChiamate);

// Monitor spento all'apertura
numeroMonitor.textContent = "---";
servizioMonitor.textContent = "Monitor spento";
oraMonitor.textContent = "---";
