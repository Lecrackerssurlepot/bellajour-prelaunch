---
id: T-197
titre: Le grand QR code « à projeter ou à imprimer » existe mais aucun écran ne l'ouvre
etat: en cours
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- `src/app/edition/_composants/LienContribution.tsx:294` porte une fenêtre de QR code en grand ;
  aucun composant ne l'appelle. Le responsable ne peut que télécharger le petit QR en SVG
  (`LienContribution.tsx:42-85`).
- Pour un bateau, un QR imprimé et scotché à bord est le moyen le plus simple de retrouver le lien.

## Ce que je propose
Un bouton « Afficher en grand » sur chaque carte de lien, avec le nom du lien sous le code,
prêt à imprimer.

## Ce qui a été fait
20/10, lot « a3 » (rien de commité).
- `FenetreQr` (`edition/_composants/LienContribution.tsx`) est enfin appelée : un bouton « Afficher en grand » sur CHAQUE carte de lien de l'onglet « Les liens » du responsable (le lien général comme les liens de contribution), dans `photos/Collecte.tsx`. La fenêtre dit le NOM du lien sous le code (30 px, chiffres alignés), puis « Imprimer » et « Télécharger le QR ». « Imprimer » ne sort qu'une feuille A4 (le nom en grand, le code, une consigne, le nombre de photos et la clôture) depuis un cadre caché (`qr.ts` `pageQrImprimable`, `imprimer.ts`), jamais l'espace entier ; le nom y est échappé.
- Même fenêtre côté atelier (`[id]/FenetreQrAtelier.tsx`, en `eca-`, par un portail dans `.eca-root`) depuis la carte « Liens de contribution » de la fiche (T-201).
- Le pied de carte du responsable passe à la ligne (la règle garde 180 px au moins) : avec un troisième geste, la règle se tassait en colonne de mots sur 375 px (vu et corrigé).
- Vu, jour et nuit, 1440 et 375 : bouton sur les 11 cartes, fenêtre dans `.ec-contenu`, Échap ferme (même après « Imprimer »), console vide, feuille d'impression d'une page PDF.
- Reste : l'impression réelle (boîte de dialogue du navigateur) n'a pas été vue en headless ; le QR n'a pas été scanné avec un téléphone (même matrice que le fichier SVG déjà téléchargeable).
