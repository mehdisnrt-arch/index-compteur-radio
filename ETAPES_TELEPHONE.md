# Étapes depuis téléphone

## Étape 1 — Créer Google Sheet

1. Ouvrir Google Sheets.
2. Créer un nouveau fichier.
3. Nom: `Index Compteur Radio`.
4. Dans la première ligne, mettre:

`ID | Date | Radio | Index | CreatedAt | CreatedBy | UpdatedAt`

Vous pouvez aussi importer `google-sheet-template.xlsx`.

## Étape 2 — Ajouter Apps Script

1. Dans Google Sheet, ouvrir `Extensions`.
2. Ouvrir `Apps Script`.
3. Supprimer le code existant.
4. Coller tout le contenu du fichier `Code.gs`.
5. Changer le PIN admin dans cette ligne:

`const ADMIN_PIN = "2026";`

## Étape 3 — Déployer Apps Script

1. Cliquer `Deploy`.
2. Choisir `New deployment`.
3. Type: `Web app`.
4. Execute as: `Me`.
5. Who has access: `Anyone`.
6. Cliquer `Deploy`.
7. Copier le lien qui se termine par `/exec`.

## Étape 4 — Mettre le lien dans l'application

1. Ouvrir le fichier `script.js`.
2. Remplacer:

`PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE`

par le lien `/exec` de Google Apps Script.

Exemple:

`const API_URL = "https://script.google.com/macros/s/XXXX/exec";`

## Étape 5 — Mettre les fichiers dans GitHub

Mettre ces fichiers dans le repository GitHub Pages:

- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `service-worker.js`
- `icon.svg`

## Étape 6 — Test

1. Ouvrir l'application sur téléphone 1.
2. Ajouter index.
3. Ouvrir l'application sur téléphone 2.
4. Appuyer sur Actualiser.
5. La nouvelle ligne doit apparaître.

## Étape 7 — Installer sur iPhone

1. Ouvrir le lien GitHub Pages dans Safari.
2. Cliquer Share.
3. Choisir Add to Home Screen.
