# Index Compteur Radio — version partagée

Application PWA pour saisir les index des compteurs des radios privées depuis plusieurs téléphones.

## Important

Cette version utilise Google Sheets comme base de données centrale.

Quand une personne ajoute un index depuis son téléphone, l'admin ouvre l'application depuis un autre téléphone, appuie sur Actualiser, et voit la nouvelle ligne.

## Fichiers

- `index.html`
- `style.css`
- `script.js`
- `manifest.json`
- `service-worker.js`
- `icon.svg`
- `Code.gs` : backend Google Apps Script
- `google-sheet-template.xlsx` : modèle de sheet
- `ETAPES_TELEPHONE.md` : étapes pour installation depuis téléphone

## Radios

- Aswat
- Med Radio
- Medina FM
- Medi1
- Cap Radio
- Chada FM
- HIT RADIO
- MFM

## Validation

- Date automatique.
- Radio obligatoire.
- Index obligatoire.
- Index négatif interdit.
- Si le nouvel index est inférieur au dernier index de la même radio: `Index erroné`.
- Même Date + même Radio interdit en double.

## Export Excel

Le bouton admin `Télécharger Excel` génère une fiche Excel compatible avec:

`Date | Aswat | Med Radio | Medina FM | Medi1 | Cap Radio | Chada FM | HIT RADIO | MFM`
