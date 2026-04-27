const choiceButtons = document.querySelectorAll(".totem-btn");

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw33tB4KXq5lsBXlCNbt8X_tK6wuhnf1pPNv5pbSnjufrpO3SuY_3AWr8NvrG_2AISI/exec";

const orariServizi = {
  cartelle: { start: 9.75, end: 23 },
  pagamenti: { start: 8, end: 23 },
  laboratorio: { start: 7.83, end: 11 },
  prenotazioni: { start: 7.83, end: 23 },
  cortesia: { start: 7.83, end: 16 },
  libera: { start: 13, end: 23 }
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

function emailValida(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function generaNumeroTotem(servizio, emailUtente) {
  try {
    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        servizio: servizio,
        email: emailUtente
      })
    });

    const data = await response.json();

    if (!data.ok) {
      alert(data.errore || "Errore nella generazione del numero");
      return null;
    }

    return data.numero;
  } catch (error) {
    console.error("Errore collegamento:", error);
    alert("Errore di collegamento con il sistema");
    return null;
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
    if (button.classList.contains("disabled")) return;

    const servizio = button.dataset.result;
    const emailUtente = prompt("Inserisci la tua email:");

    if (!emailValida(emailUtente)) {
      alert("Email non valida ❌");
      return;
    }

    const numero = await generaNumeroTotem(servizio, emailUtente);

    if (!numero) return;

    const display = document.getElementById("displayNumero");

    if (display) {
      display.innerHTML = `
        <div style="font-size:32px; color:#007bff;">🎫 ${numero}</div>
        <div style="color:#000000;">Controlla la tua email</div>
      `;
    }

    choiceButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
  });
});

aggiornaStatoPulsanti();
setInterval(aggiornaStatoPulsanti, 60000);
