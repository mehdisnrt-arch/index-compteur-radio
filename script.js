// 1) Deploy Google Apps Script Web App.
// 2) Paste the /exec URL here.
// Example: const API_URL = "https://script.google.com/macros/s/XXXXX/exec";
const API_URL = "https://script.google.com/macros/s/AKfycbwsX6F-V1yimlzGaKOF23wlG7xL8bzqvQmc855eJQV5fhDnlEGL0_jcoZsStfMl3BsR/exec";

const RADIOS = ["Aswat", "Med Radio", "Medina FM", "Medi1", "Cap Radio", "Chada FM", "HIT RADIO", "MFM"];

let records = [];
let isAdmin = false;
let adminPin = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  fillToday();
  fillRadios();
  bindEvents();
  checkSetup();
  registerSW();
  loadRecords();
});

function fillToday() {
  $("dateInput").value = todayISO();
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fillRadios() {
  const select = $("radioInput");
  RADIOS.forEach((radio) => {
    const option = document.createElement("option");
    option.value = radio;
    option.textContent = radio;
    select.appendChild(option);
  });
}

function bindEvents() {
  $("entryForm").addEventListener("submit", addEntry);
  $("radioInput").addEventListener("change", updateLastInfo);
  $("dateInput").addEventListener("change", updateLastInfo);
  $("refreshBtn").addEventListener("click", loadRecords);
  $("unlockBtn").addEventListener("click", unlockAdmin);
  $("logoutBtn").addEventListener("click", lockAdmin);
  $("exportBtn").addEventListener("click", () => exportExcel(records, "all"));
  $("exportMonthBtn").addEventListener("click", () => exportExcel(records.filter(r => r.date && r.date.slice(0, 7) === todayISO().slice(0, 7)), "month"));
  $("searchInput").addEventListener("input", renderRecords);
  $("clearSearchBtn").addEventListener("click", () => {
    $("searchInput").value = "";
    renderRecords();
  });
}

function checkSetup() {
  const missing = !API_URL || API_URL.includes("PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE");
  $("setupWarning").classList.toggle("hidden", !missing);
  $("syncStatus").textContent = missing ? "Non configuré" : "Connecté";
  $("syncStatus").classList.toggle("muted", missing);
}

function api(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!API_URL || API_URL.includes("PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE")) {
      reject(new Error("Lien Apps Script manquant"));
      return;
    }

    const callbackName = "jsonp_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Délai dépassé. Vérifiez le lien Apps Script."));
    }, 20000);

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (data) => {
      cleanup();
      if (data && data.ok === false) reject(new Error(data.error || "Erreur"));
      else resolve(data);
    };

    const url = new URL(API_URL);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", Date.now().toString());
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value == null ? "" : String(value)));

    script.onerror = () => {
      cleanup();
      reject(new Error("Connexion impossible avec Apps Script"));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function loadRecords() {
  setMessage("", "");
  try {
    $("syncStatus").textContent = "Chargement...";
    const data = await api("list");
    records = (data.records || []).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
    $("syncStatus").textContent = "Connecté";
    $("syncStatus").classList.remove("muted");
    renderRecords();
    updateLastInfo();
  } catch (error) {
    $("syncStatus").textContent = "Erreur";
    $("syncStatus").classList.add("muted");
    setMessage(error.message, "error");
  }
}

async function addEntry(event) {
  event.preventDefault();

  const date = $("dateInput").value;
  const radio = $("radioInput").value.trim();
  const index = Number($("indexInput").value);

  if (!date || !radio || $("indexInput").value === "" || Number.isNaN(index) || index < 0) {
    setMessage("Veuillez remplir Date, Radio et Index correctement.", "error");
    return;
  }

  if (!isIndexChronological(date, radio, index)) {
    setMessage("Index erroné", "error");
    return;
  }

  try {
    setMessage("Enregistrement...", "ok");
    await api("add", { date, radio, index });
    $("indexInput").value = "";
    setMessage("Index enregistré avec succès.", "ok");
    await loadRecords();
  } catch (error) {
    setMessage(error.message === "Index erroné" ? "Index erroné" : error.message, "error");
  }
}

function getLastRecordForRadio(radio, excludeId = "") {
  const list = records
    .filter((r) => r.radio === radio && r.id !== excludeId)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""));
  return list[list.length - 1] || null;
}

function getPreviousRecordForRadio(radio, date, excludeId = "") {
  const list = records
    .filter((r) => r.radio === radio && r.id !== excludeId && r.date < date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""));
  return list[list.length - 1] || null;
}

function getNextRecordForRadio(radio, date, excludeId = "") {
  return records
    .filter((r) => r.radio === radio && r.id !== excludeId && r.date > date)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""))[0] || null;
}

function isIndexChronological(date, radio, index, excludeId = "") {
  const previous = getPreviousRecordForRadio(radio, date, excludeId);
  if (previous && index < Number(previous.index)) return false;

  const next = getNextRecordForRadio(radio, date, excludeId);
  if (next && index > Number(next.index)) return false;

  return true;
}

function updateLastInfo() {
  const radio = $("radioInput").value;
  const date = $("dateInput").value || todayISO();
  const previous = radio ? getPreviousRecordForRadio(radio, date) : null;
  const next = radio ? getNextRecordForRadio(radio, date) : null;

  if (previous && next) {
    $("lastInfo").textContent = `Entre ${previous.index} (${formatDate(previous.date)}) et ${next.index} (${formatDate(next.date)})`;
  } else if (previous) {
    $("lastInfo").textContent = `Dernier index avant cette date ${radio}: ${previous.index} (${formatDate(previous.date)})`;
  } else if (next) {
    $("lastInfo").textContent = `Premier index après cette date ${radio}: ${next.index} (${formatDate(next.date)})`;
  } else {
    $("lastInfo").textContent = "Dernier index: —";
  }
}

function renderRecords() {
  const container = $("recordsList");
  const query = $("searchInput").value.trim().toLowerCase();
  const filtered = records.filter((r) => {
    const text = `${r.date} ${formatDate(r.date)} ${r.radio} ${r.index}`.toLowerCase();
    return !query || text.includes(query);
  });

  $("countBadge").textContent = String(filtered.length);
  container.innerHTML = "";

  if (!filtered.length) {
    container.innerHTML = '<div class="empty">Aucune donnée</div>';
    return;
  }

  const tpl = $("recordTemplate");
  filtered.forEach((record) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.querySelector(".record-radio").textContent = record.radio;
    node.querySelector(".record-date").textContent = formatDate(record.date);
    node.querySelector(".record-index").textContent = record.index;

    const actions = node.querySelector(".record-actions");
    actions.classList.toggle("hidden", !isAdmin);

    node.querySelector(".edit-btn").addEventListener("click", () => editRecord(record));
    node.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(record));

    container.appendChild(node);
  });
}

function unlockAdmin() {
  const pin = $("pinInput").value.trim();
  if (!pin) {
    setMessage("Entrez le PIN admin.", "error");
    return;
  }

  isAdmin = true;
  adminPin = pin;
  $("adminTools").classList.remove("hidden");
  $("adminState").textContent = "Ouvert";
  $("adminState").classList.remove("muted");
  $("pinInput").value = "";
  renderRecords();
  setMessage("Mode admin activé.", "ok");
}

function lockAdmin() {
  isAdmin = false;
  adminPin = "";
  $("adminTools").classList.add("hidden");
  $("adminState").textContent = "Verrouillé";
  $("adminState").classList.add("muted");
  renderRecords();
}

async function editRecord(record) {
  const newDate = prompt("Date", record.date);
  if (!newDate) return;

  const newRadio = prompt("Radio", record.radio);
  if (!newRadio) return;

  const newIndexRaw = prompt("Index", record.index);
  if (newIndexRaw === null) return;

  const newIndex = Number(newIndexRaw);
  if (!RADIOS.includes(newRadio)) {
    setMessage("Radio inconnue.", "error");
    return;
  }

  if (Number.isNaN(newIndex) || newIndex < 0) {
    setMessage("Index erroné", "error");
    return;
  }

  if (!isIndexChronological(newDate, newRadio, newIndex, record.id)) {
    setMessage("Index erroné", "error");
    return;
  }

  try {
    await api("update", { pin: adminPin, id: record.id, date: newDate, radio: newRadio, index: newIndex });
    setMessage("Modification enregistrée.", "ok");
    await loadRecords();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function deleteRecord(record) {
  if (!confirm(`Supprimer ${record.radio} du ${formatDate(record.date)} ?`)) return;

  try {
    await api("delete", { pin: adminPin, id: record.id });
    setMessage("Ligne supprimée.", "ok");
    await loadRecords();
  } catch (error) {
    setMessage(error.message, "error");
  }
}

function exportExcel(sourceRecords, scope) {
  if (!sourceRecords.length) {
    setMessage("Aucune donnée à exporter.", "error");
    return;
  }

  const grouped = {};
  sourceRecords.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = {};
    grouped[r.date][r.radio] = r.index;
  });

  const dates = Object.keys(grouped).sort();
  const title = scope === "month" ? `Relevé du mois ${todayISO().slice(0, 7)}` : "Relevé du compteur d'électricité de Radio";
  const filename = scope === "month" ? `fiche-index-radio-mois-${todayISO().slice(0, 7)}.xls` : `fiche-index-radio-${todayISO()}.xls`;

  let html = `<!doctype html><html><head><meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    td, th { border: 1px solid #000; padding: 6px 8px; text-align: center; mso-number-format:"0"; }
    .blank td { border: none; height: 20px; }
    .title td { border: none; font-weight: bold; font-size: 16px; text-align: left; }
    .subtitle td { border: none; font-weight: bold; text-align: left; }
    .header th { background: #d9ead3; font-weight: bold; }
    .date { mso-number-format:"dd/mm/yyyy"; }
  </style></head><body><table>`;

  html += `<tr class="blank"><td colspan="9"></td></tr><tr class="blank"><td colspan="9"></td></tr><tr class="blank"><td colspan="9"></td></tr>`;
  html += `<tr class="title"><td colspan="9">${escapeHtml(title)}</td></tr>`;
  html += `<tr class="subtitle"><td colspan="9">Au centre émetteur de Figuig</td></tr>`;
  html += `<tr class="blank"><td colspan="9"></td></tr>`;
  html += `<tr class="header"><th>Date</th>${RADIOS.map(r => `<th>${escapeHtml(r)}</th>`).join("")}</tr>`;

  dates.forEach((date) => {
    html += `<tr><td class="date">${formatDate(date)}</td>${RADIOS.map(r => `<td>${grouped[date][r] ?? ""}</td>`).join("")}</tr>`;
  });

  html += `<tr><td><b>Puissance</b></td>${RADIOS.map(() => "<td></td>").join("")}</tr>`;
  html += "</table></body></html>";

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[c]);
}

function setMessage(text, type) {
  const box = $("message");
  if (!text) {
    box.className = "message hidden";
    box.textContent = "";
    return;
  }
  box.className = `message ${type || ""}`;
  box.textContent = text;
}

function registerSW() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
