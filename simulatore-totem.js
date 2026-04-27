emailjs.init("TIzKcJkMDRkzQ6HhR");

const choiceButtons = document.querySelectorAll(".totem-btn");

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbym1BGSQU7q37XHO0qqNq8unNwZIdFssS9As9Gca2FigerRQxnTe08iZe1nCLztMMlJuQ/exec";

const orariServizi = {
  cartelle: { start: 9.75, end: 12 },
  pagamenti: { start: 8, end: 18 },
  laboratorio: { start: 7.83, end: 11 },
  prenotazioni: { start: 7.83, end: 16 },
  cortesia: { start: 7.83, end: 16 },
  libera: { start: 13, end: 18 }
};

function getOraCorrente() {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

function formatOra(oraDecimale) {
  const ore = Math.floor(oraDecimale);
  const minuti = Math.round((oraDecimale - ore) * 60);

  return `${ore.toString().padStart(2, "0")}:${minuti
    .toString()
    .padStart(2, "0")}`;
}

async function generaNumeroTotem(servizio) {
  try {
    const response = await fetch(APP_SCRIPT_URL + "?servizio=" + servizio);
    const data = await response.json();

    if (data.numero) {
      return data.numero;
    }

    alert("Errore: " + data.errore);
    return null;
  } catch (error) {
    console.log("ERRORE APPS SCRIPT:", error);
    alert("Errore di collegamento con Google Sheets");
    return null;
  }
}

function inviaEmail(numero, servizio, emailUtente) {
  emailjs
    .send("service_u2lecme", "template_fetzj9b", {
      numero_totem: numero,
      servizio: servizio,
      email: emailUtente
    })
    .then(function () {
      alert("✅ Email inviata a: " + emailUtente + "\nNumero: " + numero);
    })
    .catch(function (error) {
      console.log("ERRORE EMAILJS:", error);
      alert("Errore EmailJS: " + JSON.stringify(error));
    });
}

function aggiornaListaNumeri(numero) {
  const lista = document.getElementById("listaNumeri");

  if (!lista) return;

  const nuovoElemento = document.createElement("div");
  nuovoElemento.textContent = numero;

  lista.prepend(nuovoElemento);

  if (lista.children.length > 5) {
    lista.removeChild(lista.lastChild);
  }
}

function aggiornaStatoPulsanti() {
  const ora = getOraCorrente();

  choiceButtons.forEach((button) => {
    const servizio = button.dataset.result;
    const orario = orariServizi[servizio];

    const oldInfo = button.querySelector(".totem-info");
    if (oldInfo) oldInfo.remove();

    if (!orario) return;

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

choiceButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.classList.contains("disabled")) {
      return;
    }

    const servizio = button.dataset.result;
    const numero = await generaNumeroTotem(servizio);

    if (!numero) return;

    const display = document.getElementById("displayNumero");

    if (display) {
      display.innerHTML = `
        <div style="font-size:32px; color: #007bff;">🎫 ${numero}</div>
        <div style="color: #000000">Controlla la tua email</div>
      `;
    }

    aggiornaListaNumeri(numero);

    choiceButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    const emailUtente = prompt("Inserisci la tua email:");

    if (emailUtente && emailUtente.includes("@")) {
      inviaEmail(numero, servizio, emailUtente);
    } else {
      alert("Email non valida ❌");
    }
  });
});

aggiornaStatoPulsanti();
setInterval(aggiornaStatoPulsanti, 60000);