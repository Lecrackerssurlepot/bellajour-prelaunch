# Visuels à fournir : la liste et le mode d'emploi

26/11/2026. Source : `src/content/media.ts` (la liste des emplacements) et l'outil
**Site · Visuels** de l'admin (`/admin/atelier/site/visuels`). Tous les visuels actuels sont
**provisoires** : des images déjà dans le dépôt, posées en attendant les vrais.

## En chiffres

- **47 emplacements** déclarés.
- **42 s'affichent sur le site** : 41 images et 1 vidéo.
- **1 est vide par défaut** : `groupes.entreprise`, que la page sait cacher.
- **5 ne s'affichent nulle part** aujourd'hui : `accueil.essai`, `accueil.reseaux`,
  `magazine.video`, `composer.modele`, `groupes.brochure`. Rien à fournir pour eux ; ils sont dans
  la liste de nettoyage (étape 9).

Les couvertures (ratio 210 / 297) sont 27 sur 42 : **il suffit d'une vingtaine de vraies
couvertures**, réutilisables d'un emplacement à l'autre.

## Les emplacements, page par page

| Page | Emplacement | Format | Quoi |
|---|---|---|---|
| Accueil | `accueil.couverture` à `couverture-5` (5) | 210 / 297 | Les cinq couvertures de l'ouverture et de la frise « une année » (janvier, mai, juillet, octobre, décembre) |
| Accueil | `accueil.double-page-1`, `-2` (2) | 1400 / 990 | La double page sous la couverture qui s'ouvre, puis celle qui se tourne |
| Accueil | `accueil.hero` | libre | Une photo d'exemple posée dans le livre de l'ouverture |
| Accueil | `accueil.photo-exemple` | libre | La photo d'exemple de l'essai photos |
| Accueil | `accueil.matiere` | **vidéo 9 / 16** | La vidéo de Louis (section « La matière ») |
| Accueil | `accueil.porte-offrir`, `porte-groupes` (2) | libre | Les vignettes des deux portes |
| Magazine | `magazine.couverture`, `eventail-2`, `-3` (3) | 210 / 297 | L'éventail en tête de page |
| Magazine | `magazine.double-page` | libre | Une double page ouverte |
| Offrir | `offrir.carte` | 210 / 297 | Le numéro incliné posé sur la carte cadeau |
| Offrir | `offrir.noel-1`, `-2` (2) | 210 / 297 | Le bloc Noël |
| Groupes | `groupes.numero-1` à `-7` (7) | 210 / 297 | « Nos derniers numéros » (les 4 premiers font aussi la pile de l'ouverture) |
| Groupes | `groupes.wei-1`, `-2`, `ski-1`, `-2` (4) | double page | Week-end d'intégration, ski |
| Groupes | `groupes.entreprise` | double page | Facultatif : une année d'équipe |
| Édition collective | `edition.eventail-1` à `-3` (3) | 210 / 297 | Le tableau de bord |
| Édition collective | `edition.vitrine-1` à `-6` (6), `vitrine-double` | 210 / 297, double page | La vitrine des styles |
| Partout | `partage.image` | 1200 × 630 conseillé | L'image des liens partagés (WhatsApp, Instagram, iMessage) |

**Règles photo (fiche G)** : de vraies photos de vie dans de vrais magazines Bellajour. Seulement
des photos de clients avec leur accord, ou de l'équipe. **Aucun magazine tiers ni affiche, même en
décor de fond.**

## La vidéo de Louis

- **Emplacement** : `accueil.matiere`, la section « La matière » de l'accueil. C'est la seule
  vidéo du duplicata.
- **Ce qu'on voit** : le magazine dans des conditions sympas (feuilleté, tenu, posé). 10 secondes,
  en boucle, **sans son**. Fin et début raccord, pour que la boucle ne saute pas.
- **Cadre** : vertical **9 / 16**, par exemple 1080 × 1920. Sur ordinateur, elle est affichée à
  780 px de haut au plus, donc 1080 px de large suffisent (fiche J).
- **À livrer, trois fichiers** :
  - MP4 en H.264, sans piste son ;
  - WebM en VP9, sans piste son (facultatif, mais plus léger) ;
  - une image fixe (le « poster »), affichée avant que la vidéo démarre et quand l'appareil
    demande moins d'animations.
- **Poids** : 4 Mo au plus par fichier pour une boucle de 10 s (cible de la charte, proposée).
  L'outil accepte jusqu'à 50 Mo, mais au-delà de 4 Mo le téléphone attend.
- La vidéo démarre seule quand elle entre à l'écran et se met en pause quand elle en sort.

## Comment tu mets un visuel toi-même

Dans l'admin, **Site · Visuels** (`/admin/atelier/site/visuels`), chaque emplacement montre ce
qui est en ligne aujourd'hui.

1. Sur l'emplacement, **Ajouter** une rotation.
2. Choisis l'**image** : JPEG, PNG ou WebP, jusqu'à 15 Mo. L'outil la réduit à 3000 px et la
   convertit en WebP tout seul. Pour la vidéo : le poster, le MP4 puis le WebM.
3. Écris la **description** : une phrase qui dit ce qu'on voit, pour les malvoyants et Google.
4. Mets les **dates** (du, au). Pour un visuel permanent, une longue période (par exemple
   jusqu'à fin 2027).
5. Laisse en **Brouillon** pour regarder, puis passe en **Validé** : seul un visuel validé
   s'affiche sur le site.
6. Pour voir le site à une date donnée avant de valider : le lien d'aperçu de l'outil.

Le site met à jour ses visuels en une minute au plus.

**Attention** : la base est la même pour la préversion et pour le vrai site. Une rotation validée
aujourd'hui s'affichera sur bellajour.fr **dès que la charte V2 sera fusionnée**. Le site en ligne
actuel ne lit pas encore ces visuels.

Remplacer le visuel **par défaut** d'un emplacement, ou en ajouter un nouveau, reste du code :
dis-le-moi.
