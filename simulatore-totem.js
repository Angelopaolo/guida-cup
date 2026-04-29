const choiceButtons = document.querySelectorAll(".totem-btn");

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

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

function emailValida(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function generaNumeroTotem(servizio, emailUtente) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        servizio: servizio,
        email: emailUtente,
        token: TOKEN_SICUREZZA
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      alert("Errore del server");
      return null;
    }

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

choiceButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (button.classList.contains("disabled")) return;

    const servizio = button.dataset.result;

    if (!orariServizi[servizio]) {
      alert("Servizio non valido");
      return;
    }

    const emailUtente = prompt("Inserisci la tua email:");

    if (!emailUtente) {
      alert("Operazione annullata");
      return;
    }

    const emailPulita = emailUtente.trim().toLowerCase();

    if (!emailValida(emailPulita)) {
      alert("Email non valida ❌");
      return;
    }

    choiceButtons.forEach((b) => {
      b.disabled = true;
    });

    const numero = await generaNumeroTotem(servizio, emailPulita);

    choiceButtons.forEach((b) => {
      b.disabled = false;
    });

    if (!numero) return;

    const display = document.getElementById("displayNumero");

    if (display) {
      display.textContent = "";

      const numeroDiv = document.createElement("div");
      numeroDiv.style.fontSize = "32px";
      numeroDiv.style.color = "#007bff";
      numeroDiv.textContent = `🎫 ${numero}`;

      const testoDiv = document.createElement("div");
      testoDiv.style.color = "#000000";
      testoDiv.textContent = "Controlla la tua email";

      display.appendChild(numeroDiv);
      display.appendChild(testoDiv);
    }

    choiceButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
  });
});

aggiornaStatoPulsanti();
setInterval(aggiornaStatoPulsanti, 60000);
