const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrgkv9GD7i4vblGz1gn6gAaJGdAT_TpjGMqt56_js1mNYKANL9CIyViCz_U-aylzBnGA/exec";

async function aggiornaMonitor() {
  try {
    const response = await fetch(APP_SCRIPT_URL);
    const data = await response.json();

    document.getElementById("numeroMonitor").textContent = data.numero || "---";
    document.getElementById("servizioMonitor").textContent = data.servizio || "---";
    document.getElementById("oraMonitor").textContent = data.ora || "---";

  } catch (error) {
    document.getElementById("numeroMonitor").textContent = "Errore";
  }
}

aggiornaMonitor();
setInterval(aggiornaMonitor, 5000);
