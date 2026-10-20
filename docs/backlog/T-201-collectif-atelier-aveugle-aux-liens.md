---
id: T-201
titre: L'atelier ne voit pas les liens de contribution d'une édition et ne peut pas en créer
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
- Seul le responsable crée les liens (`src/app/api/collectif/provenances/route.ts:45-48`) ; aucun
  écran de l'admin ne les lit. Pour voir ou préparer les liens des bateaux, l'atelier doit ouvrir
  le lien du responsable (`PanneauLiens.tsx:73-75`).
- Pour Audencia, préparer les huit liens AVANT de remettre l'espace à Mathilde éviterait une étape
  à la cliente.

## Ce que je propose
Dans « Réglages et liens », la liste des liens de contribution (nom, plafond, personnes,
photos) et la création d'un lien par l'atelier, journalisée.

## Ce qui a été fait
20/10, lot « a3 » (rien de commité).
- Onglet « Réglages et liens » : une carte « Liens de contribution » (`[id]/PanneauProvenances.tsx`) : nom, règle (« 30 photos par personne », « Sans limite »), personnes, photos, actif ou supprimé ; « Copier le lien » ; « Afficher en grand » (QR, T-197) ; et « Créer un lien » (nom + nombre de 5 à 100 ou « Sans limite », le plafond de l'atelier borne le haut ; même `Pastille` que le formulaire de l'édition). Le lien écrit s'affiche aussitôt, le nom se vide et le focus y revient pour le bateau suivant.
- Route `POST /api/admin/collectif/editions/[id]/provenances` : l'admin revérifié (`quiEstConnecteRequete`), les mêmes règles que la création par le responsable (`lirePlafondLien`, clé aléatoire de 22 caractères), journal « Lien de dépôt créé par l'atelier (Mathias) » qui ne contient jamais la clé. Deux refus que le responsable n'a pas : nom déjà porté par un lien ouvert (409) ou réservé (« Lien général », « Le responsable », « L'atelier », « Tous les participants »), édition archivée (409). Sans la migration de la révision, 503 pour un lien plafonné.
- Vu : création, doublon, nom réservé, nombre trop haut, « Sans limite », copie, QR en grand, 1440 et 375 (fausse base, la création y est réellement écrite par la route).
- Reste : le refus de doublon n'existe pas côté responsable (`api/collectif/provenances`, hors lot) : deux liens du même nom restent possibles là, et sont départagés à l'affichage (« Bateau 1 (2) »). Le chemin d'écriture n'a pas été joué contre la vraie base (interdit).
