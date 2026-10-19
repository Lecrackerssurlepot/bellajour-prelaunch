---
id: T-177
titre: Le bon à tirer, la boîte de réception de l'atelier et le fil des messages attendent des lectures l'une après l'autre sans raison
etat: nouveau
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
Audit du 19/10, lignes relues :
- `src/app/edition/[token]/donnees.ts:581,583,600` (`chargerBat`) : 6 trajets en série dont 2
  évitables (≈ 70 à 120 ms à chaque ouverture du BAT).
- `src/app/admin/collectif/messages/page.tsx:53→74→83` : la boîte de réception ouvre la fiche
  COMPLÈTE de l'édition choisie (13 requêtes, toutes les photos) pour un aperçu, puis lit
  rendez-vous et interlocuteurs après coup (7 trajets) ; `src/app/admin/collectif/[id]/page.tsx:93→116`
  attend aussi ses rendez-vous après coup.
- `src/lib/collectif/messagerie.ts:64-106` (`habiller`) : documents, envois et messages cités
  lus l'un après l'autre.

## Ce que je propose
Lancer ensemble ce qui ne dépend pas l'un de l'autre (`Promise.all`), et une lecture légère pour
l'aperçu de la boîte de réception. Mesurer avant et après.

## Ce qui a été fait
Rien encore.
