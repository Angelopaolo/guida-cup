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

async function richiestaAppsScript(parametri) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 8000);

    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams(parametri),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      alert("Errore del server");
      return null;
    }

    const data = await response.json();

    if (!data.ok) {
      alert(data.errore || "Errore nella richiesta");
      return null;
    }

    return data;

  } catch (error) {
    console.error("Errore collegamento:", error);
    alert("Errore di collegamento con il sistema");
    return null;
  }
}

async function inviaOtp(emailUtente) {
  return await richiestaAppsScript({
    azione: "invia_otp",
    email: emailUtente,
    token: TOKEN_SICUREZZA
  });
}

async function generaNumeroTotem(servizio, emailUtente, codiceOtp) {
  const data = await richiestaAppsScript({
    azione: "genera_numero",
    servizio: servizio,
    email: emailUtente,
    codiceOtp: codiceOtp,
    token: TOKEN_SICUREZZA
  });

  if (!data) return null;
  return data.numero;
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
  testoDiv.textContent = "Biglietto inviato alla tua email";

  display.appendChild(numeroDiv);
  display.appendChild(testoDiv);
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

    mostraMessaggio("Invio codice di verifica...");

    const otpInviato = await inviaOtp(emailPulita);

    if (!otpInviato) {
      choiceButtons.forEach((b) => {
        b.disabled = false;
      });
      mostraMessaggio("Operazione non completata");
      return;
    }

    const codiceOtp = prompt("Inserisci il codice OTP ricevuto via email:");

    if (!codiceOtp) {
      alert("Operazione annullata");
      choiceButtons.forEach((b) => {
        b.disabled = false;
      });
      mostraMessaggio("Operazione annullata");
      return;
    }

    mostraMessaggio("Verifica codice e generazione biglietto...");

    const numero = await generaNumeroTotem(servizio, emailPulita, codiceOtp.trim());

    choiceButtons.forEach((b) => {
      b.disabled = false;
    });

    if (!numero) {
      mostraMessaggio("Codice non valido o operazione non riuscita");
      return;
    }

    mostraNumeroSulDisplay(numero);

    choiceButtons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
  });
});

aggiornaStatoPulsanti();
setInterval(aggiornaStatoPulsanti, 60000);
