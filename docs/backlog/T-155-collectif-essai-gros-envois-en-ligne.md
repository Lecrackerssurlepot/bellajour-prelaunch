---
id: T-155
titre: Les gros envois de photos n'ont été prouvés qu'en local, jamais en ligne ni sur un iPhone en 4G
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-15
---
## Ce que Mathias a dit (15/10/2026)
« Je veux vérifier que tout fonctionne parfaitement et qu'on pourra faire des gros uploads sans
aucun problème. » Décision du 15/10 : ouvrir l'Édition collective sur les versions d'essai Vercel
SEULEMENT (`COLLECTIF_OUVERT` en Preview), jamais en production.

## Ce que j'ai vérifié (15/10)
- 770 photos passées en local le 14/10 (localhost:3000 contre la base de production).
- Le moteur : PUT signé direct vers R2 (aucun octet ne passe par Vercel), 4 envois en parallèle,
  8 photos préparées d'avance, 3 essais, reprise par la clé de fichier, déclaration et
  confirmation par lots de 25, photos réduites à 5200 px au plus, HEIC envoyés tels quels.
- Le CORS du coffre accepte `*.vercel.app` (vérifié le 13/10).
- Limite connue et dite à l'écran : sur iPhone, l'envoi s'arrête page fermée ou écran verrouillé.

## Ce que je propose
Une version d'essai avec `COLLECTIF_OUVERT=1` ; un envoi de 2000 photos depuis un ordinateur,
un envoi depuis un iPhone en 4G (Mathias), sur une édition d'essai. Relever : temps, erreurs,
reprise, doublons, mémoire. Si l'arrêt sur iPhone gêne : rouvrir T-149.

## Ce qui a été fait
Rien encore.
