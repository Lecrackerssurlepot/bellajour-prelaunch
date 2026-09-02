---
id: T-094
titre: La demande « montrer un extrait » repart dans un mail, plus sur /numero
domaine: backend
gravite: mineur
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09)
Sur la preview de la page qui vend (`/numero` à `apercu_pret`), la case **facultative**
« J'accepte que Bellajour montre un extrait de mon numéro » faisait **trop de texte** au moment
d'acheter. « On peut l'afficher dans le mail. »

## Ce qui a été fait (02/09)
- Le bloc `ConsentCommunication` **ne s'affiche plus** dans `Coquille` (`src/app/numero/[token]/page.tsx`).
- Le composant `ConsentCommunication.tsx` est **conservé** (note en tête), pas supprimé — il resservira.
- Le prop `consentCommunication` de `Coquille` a été retiré ; la colonne `numeros.consent_communication`
  et la route PATCH `/api/atelier/numero` (qui l'écrit) sont **intactes**.

## Reste à faire
Redemander le consentement **par mail**, au bon moment — vraisemblablement **après livraison**
(M8/M9), là où l'extrait a du sens et zéro poids sur l'achat. Deux pistes :
1. **Lien dans un mail** vers une mini-page (ou un retour sur `/numero`) portant juste cette case —
   réutilise `ConsentCommunication.tsx` tel quel.
2. **Deux liens dans le mail** (« oui, montrez un extrait » / « non merci ») qui tapent la route PATCH
   `consent_communication` — aucun écran à charger.

⚠️ Ne rien envoyer en réel sans accord de Mathias (interdit nº2). Décider d'abord QUEL mail porte la
demande, puis rédiger le texte. Recoupe la séquence M0→M9 (`src/lib/atelier/mails.ts`).
