# Index Compteur Radio — Google Sheets partagé

Application PWA mobile pour saisir les index des compteurs électriques des radios privées.

## Version fiche Excel

La Google Sheet est organisée exactement comme une fiche:

- Titre: Relevé du compteur d'électricité de Radio
- Sous-titre: Au centre émetteur de Figuig
- Colonnes: Date | Aswat | Med Radio | Medina FM | Medi1 | Cap Radio | Chada FM | HIT RADIO | MFM

## Fonctionnement

- La date est remplie avec aujourd'hui mais elle est modifiable.
- L'utilisateur choisit Radio et entre Index.
- Si l'index n'est pas logique par rapport aux dates précédentes/suivantes de la même radio, l'application affiche: Index erroné.
- Plusieurs téléphones partagent la même Google Sheet.
- Admin PIN par défaut: 2026.

## Mise à jour

1. Remplacer `Code.gs` dans Apps Script.
2. Déployer une nouvelle version du Web App.
3. Remplacer `index.html` et `script.js` dans GitHub.
4. Faire refresh du lien GitHub Pages.
