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
- 19/10 (audit de performance, simulateur sur le vrai moteur) : rien n'est réduit sous 5 200 px
  ni aucun HEIC (`reduire.worker.js:34`, `moteur.ts:308`), donc une photo d'iPhone part en
  original. Pour 500 photos de 3 Mo (hypothèse) : ≈ 14 min à 4 Mbit/s par voie, ≈ 27 min à
  1,3 Mbit/s ; les 4 voies restent saturées. Le participant garde la page ouverte tout ce temps.
  Non mesuré : un vrai iPhone (mémoire en 48 Mpx, mise en veille). Voir aussi T-168 (la charge
  côté serveur de chaque envoi).

## Ce que je propose
Une version d'essai avec `COLLECTIF_OUVERT=1` ; un envoi de 2000 photos depuis un ordinateur,
un envoi depuis un iPhone en 4G (Mathias), sur une édition d'essai. Relever : temps, erreurs,
reprise, doublons, mémoire. Si l'arrêt sur iPhone gêne : rouvrir T-149.

## Ce qui a été fait
- 17/10 : l'Édition collective est ouverte en PRODUCTION (`COLLECTIF_OUVERT` en Production et
  en Preview, accord de Mathias). L'essai peut donc se faire directement sur bellajour.fr. Le
  CORS du coffre accepte `https://www.bellajour.fr` et `https://bellajour.fr` (prévol PUT 204).
- 17/10 : les 7 éditions d'essai sont archivées, « Essai neuf » compris : son lien ne répond plus.
  Pour l'essai, créer une édition neuve dans l'atelier, ou « Récupérer » Essai neuf sur sa fiche.
- L'envoi de 2000 photos et l'essai iPhone en 4G restent à faire.
