const APP_SCRIPT_URL = "IL_TUO_URL_APPS_SCRIPT_EXEC";

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
