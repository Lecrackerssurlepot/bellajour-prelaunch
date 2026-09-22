---
id: T-128
titre: Le lot téléchargé ignore le bouton « Par date » et garde la numérotation du dépôt
etat: en cours
domaine: admin
gravite: serieux
autonomie: libre
ouvert: 2026-09-22
---
## Ce que Mathias a dit
« Je suis en train de travailler sur un nouveau dossier, celui d'Eloise, et je constate en
téléchargeant les photos et en ayant choisi par date que cela ne respecte pas ce critère. »

## Ce que j'ai vérifié
Le défaut est réel, et c'était une décision : le 21/09 (T-123, T-124), « Par date » a été
posé comme un état d'ÉCRAN et la date « n'ordonne rien » dans les noms du lot, par fidélité à
l'ordre du client (T-114). Le téléchargement n'a donc jamais su que le bouton était enfoncé.

- `Fiche.tsx` : `affichees = parDate ? trierChronologie(fiche.photos) : fiche.photos` ne sert
  qu'à la grille ; `liensFrais()` envoyait `{ token, ids }` sans rien dire de l'ordre.
- `api/admin/atelier/lot/route.ts` : tri `ordre, created_at, id` (le dépôt), puis
  `nomsDeFichiers` sur le lot complet, puis filtre `ids`. Aucune autre entrée.
- `lot.ts`, en commentaire : « la date aide à lire, elle ne réordonne rien ».
- Le titre du bouton le disait à demi-mot : « Revenir à l'ordre du dépôt (celui des noms du
  lot) ».
- Le dossier d'Eloise (63 photos, 55 datées, lues le 21/09) est le cas où ça se voit : le dépôt
  part du 11 juillet 2026 (rang 0) et finit au 10 janvier 2026 (rang 62). Sur le disque, le
  Finder trie par nom, donc par rang : « 01 - 11 juil 2026 » en tête, « 63 - 10 jan 2026 » en
  queue, et le bouton n'y change rien.

## Ce que je propose
Le lot suit la grille. Le bouton reste un état d'écran (rien en base), mais il devient l'ordre
du lot au moment du clic : « Par date » enfoncé, la route reçoit `ordre: "date"` et numérote le
lot COMPLET dans l'ordre du temps (les datées d'abord, les sans date derrière, dans l'ordre du
dépôt : le même tri que la grille, `trierChronologie`), puis filtre les `ids` comme avant
(T2-5, T-125). Sans le bouton, ou pour un vieux client qui n'envoie rien : l'ordre du dépôt,
rien ne change (T-114 tient). La vignette « 03 » à l'écran est le fichier « 03 - » sur le disque
dans les deux cas.

## Ce qui a été fait
22/09/2026, branche `fix/lot-par-date`. **PR #206 fusionnée le 22/09, EN PROD** (premier déploiement en ERROR sur la police Google, relancé sans cache par Mathias, READY à 14h06 UTC, alias bellajour.fr vérifié).
- `src/lib/atelier/lot.ts` : `OrdreLot` (`"depot" | "date"`), `lireOrdreLot` (inconnu → dépôt,
  jamais d'erreur), `ordonnerLot` (le tri de la grille, réutilisé tel quel).
- `src/app/api/admin/atelier/lot/route.ts` : lit `ordre` dans le corps, réordonne le lot complet
  avant de nommer.
- `Fiche.tsx` : `liensFrais` envoie l'ordre courant ; en démo, même tri en local ; titres du
  bouton mis à jour.
- Harnais : 6 assertions sous « T-128 », TOUT PASSE. tsc, lint (0 erreur), build verts.
- `src/app/admin/CLAUDE.md` mis à jour.

## Ce qui reste
À voir sur un vrai téléchargement Chrome depuis la fiche d'Eloise, bouton enfoncé.
