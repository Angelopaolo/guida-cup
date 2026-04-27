const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

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
  let prefisso = "";
  let cifre = "";

  if (numero.startsWith("LP")) {
    prefisso = "LP";
    cifre = numero.slice(2);
  } else {
    prefisso = numero.charAt(0);
    cifre = numero.slice(1);
  }

  const numeroIntero = parseInt(cifre, 10);
  const numeroLetto = numeroInParole(numeroIntero);

  let testo = `Numero ${prefisso}`;

  if (cifre.startsWith("0")) {
    testo += ` zero ${numeroLetto}`;
  } else {
    testo += ` ${numeroLetto}`;
  }

  testo += `. Servizio ${servizio}.`;

  const voce = new SpeechSynthesisUtterance(testo);
  voce.lang = "it-IT";
  voce.rate = 0.75;
  voce.pitch = 1;
  voce.volume = 1;

window.speechSynthesis.cancel();

const beep = new Audio("beep.mp3");

beep.play()
  .then(() => {
    beep.onended = () => {
      setTimeout(() => {
        window.speechSynthesis.speak(voce);
      }, 300);
    };
  })
  .catch(() => {
    // Se il beep non parte, parte comunque la voce
    setTimeout(() => {
      window.speechSynthesis.speak(voce);
    }, 300);
  });

}  

function numeroInParole(n) {
  const unita = [
    "zero", "uno", "due", "tre", "quattro",
    "cinque", "sei", "sette", "otto", "nove"
  ];

  const speciali = {
    10: "dieci",
    11: "undici",
    12: "dodici",
    13: "tredici",
    14: "quattordici",
    15: "quindici",
    16: "sedici",
    17: "diciassette",
    18: "diciotto",
    19: "diciannove"
  };

  const decine = [
    "", "", "venti", "trenta", "quaranta",
    "cinquanta", "sessanta", "settanta", "ottanta", "novanta"
  ];

  if (n < 10) return unita[n];

  if (n >= 10 && n < 20) return speciali[n];

  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;

    let parola = decine[d];

    if (u === 1 || u === 8) {
      parola = parola.slice(0, -1);
    }

    return parola + (u ? unita[u] : "");
  }

  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;

    let parola = c === 1 ? "cento" : unita[c] + "cento";

    if (resto > 0) {
      parola += " " + numeroInParole(resto);
    }

    return parola;
  }

  return String(n);
}

aggiornaMonitor();
setInterval(aggiornaMonitor, 5000);
