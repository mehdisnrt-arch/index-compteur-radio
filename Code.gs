/**
 * Backend Google Sheets pour "Index Compteur Radio".
 *
 * Installation:
 * 1) Ouvrir Google Sheet > Extensions > Apps Script.
 * 2) Coller ce fichier Code.gs.
 * 3) Changer ADMIN_PIN.
 * 4) Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 * 5) Copier le lien /exec dans script.js.
 */

const SHEET_NAME = "Data";
const ADMIN_PIN = "2026"; // Changez ce PIN.
const SHEET_ID = ""; // Optionnel: laissez vide si le script est créé depuis Google Sheet.

const HEADERS = ["ID", "Date", "Radio", "Index", "CreatedAt", "CreatedBy", "UpdatedAt"];
const RADIOS = ["Aswat", "Med Radio", "Medina FM", "Medi1", "Cap Radio", "Chada FM", "HIT RADIO", "MFM"];

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = sanitizeCallback_(p.callback || "callback");

  try {
    ensureSheet_();

    switch ((p.action || "list").toLowerCase()) {
      case "list":
        return respond_({ ok: true, records: getRecords_() }, callback);

      case "last":
        return respond_({ ok: true, record: getLastRecord_(String(p.radio || "")) }, callback);

      case "add":
        return respond_(addRecord_(p), callback);

      case "update":
        checkPin_(p.pin);
        return respond_(updateRecord_(p), callback);

      case "delete":
        checkPin_(p.pin);
        return respond_(deleteRecord_(p.id), callback);

      case "setup":
        return respond_({ ok: true, message: "Sheet ready" }, callback);

      default:
        throw new Error("Action inconnue");
    }
  } catch (err) {
    return respond_({ ok: false, error: err.message || String(err) }, callback);
  }
}

function addRecord_(p) {
  const date = normalizeDate_(p.date);
  const radio = normalizeRadio_(p.radio);
  const index = normalizeIndex_(p.index);

  const records = getRecords_();

  if (records.some(r => r.date === date && r.radio === radio)) {
    throw new Error("Déjà saisi pour cette date et cette radio");
  }

  const last = getLastRecord_(radio);
  if (last && index < Number(last.index)) {
    throw new Error("Index erroné");
  }

  const sh = getSheet_();
  const now = new Date();
  const id = Utilities.getUuid();

  sh.appendRow([
    id,
    date,
    radio,
    index,
    now,
    String(p.createdBy || ""),
    ""
  ]);

  return { ok: true, id, message: "Index enregistré" };
}

function updateRecord_(p) {
  const id = String(p.id || "").trim();
  if (!id) throw new Error("ID manquant");

  const date = normalizeDate_(p.date);
  const radio = normalizeRadio_(p.radio);
  const index = normalizeIndex_(p.index);

  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  const rowIndex = findRowIndex_(values, id);
  if (rowIndex < 2) throw new Error("Ligne introuvable");

  const records = getRecords_();

  if (records.some(r => r.id !== id && r.date === date && r.radio === radio)) {
    throw new Error("Déjà saisi pour cette date et cette radio");
  }

  const previous = records
    .filter(r => r.id !== id && r.radio === radio && String(r.date) <= date)
    .sort(sortRecords_);
  const lastPrevious = previous[previous.length - 1];

  if (lastPrevious && index < Number(lastPrevious.index)) {
    throw new Error("Index erroné");
  }

  sh.getRange(rowIndex, 2, 1, 6).setValues([[
    date,
    radio,
    index,
    values[rowIndex - 1][4] || new Date(),
    values[rowIndex - 1][5] || "",
    new Date()
  ]]);

  return { ok: true, message: "Modification enregistrée" };
}

function deleteRecord_(id) {
  id = String(id || "").trim();
  if (!id) throw new Error("ID manquant");

  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  const rowIndex = findRowIndex_(values, id);
  if (rowIndex < 2) throw new Error("Ligne introuvable");

  sh.deleteRow(rowIndex);
  return { ok: true, message: "Ligne supprimée" };
}

function getRecords_() {
  const sh = getSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();

  return values
    .filter(row => row[0])
    .map(row => ({
      id: String(row[0] || ""),
      date: toDateString_(row[1]),
      radio: String(row[2] || ""),
      index: Number(row[3]),
      createdAt: toIso_(row[4]),
      createdBy: String(row[5] || ""),
      updatedAt: toIso_(row[6])
    }))
    .sort(sortRecords_);
}

function getLastRecord_(radio) {
  radio = String(radio || "").trim();
  if (!radio) return null;

  const list = getRecords_()
    .filter(r => r.radio === radio)
    .sort(sortRecords_);

  return list.length ? list[list.length - 1] : null;
}

function ensureSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
  } else {
    const firstRow = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    const isHeaderOk = HEADERS.every((h, i) => String(firstRow[i] || "") === h);
    if (!isHeaderOk) {
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
  }

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#d9ead3");
}

function getSheet_() {
  ensureSheet_();
  return getSpreadsheet_().getSheetByName(SHEET_NAME);
}

function getSpreadsheet_() {
  if (SHEET_ID && SHEET_ID.trim()) {
    return SpreadsheetApp.openById(SHEET_ID.trim());
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error("Créez ce script depuis Google Sheet ou remplissez SHEET_ID.");
  return active;
}

function normalizeDate_(value) {
  const v = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("Date invalide");
  return v;
}

function normalizeRadio_(value) {
  const radio = String(value || "").trim();
  if (!radio) throw new Error("Radio obligatoire");
  if (RADIOS.indexOf(radio) === -1) throw new Error("Radio inconnue");
  return radio;
}

function normalizeIndex_(value) {
  const n = Number(value);
  if (!isFinite(n) || n < 0) throw new Error("Index erroné");
  return n;
}

function findRowIndex_(values, id) {
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) return i + 1;
  }
  return -1;
}

function checkPin_(pin) {
  if (String(pin || "") !== ADMIN_PIN) throw new Error("PIN admin incorrect");
}

function sortRecords_(a, b) {
  return String(a.date || "").localeCompare(String(b.date || "")) ||
    String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function toDateString_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value || "");
}

function toIso_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value || "");
}

function sanitizeCallback_(name) {
  name = String(name || "callback");
  if (!/^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(name)) return "callback";
  return name;
}

function respond_(payload, callback) {
  const text = callback + "(" + JSON.stringify(payload) + ");";
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
