# Brief — Mise en page interne Bellajour (export Affinity) · v4

Dépôt : **`bellajour-prelaunch`**. Version du 2026-10-27. Ce document est autoporteur : il remplace toutes les versions précédentes et tout plan fait sur un autre projet.

---

## 0. À lire en premier (session principale et agents)
- **But** : un outil **interne** (Mathias, Louis, stagiaire) pour composer très vite un magazine à partir de photos, puis l'exporter vers **Affinity** où toutes les finitions de design et le fichier d'impression sont faits à la main.
- **Aucune IA** dans cet outil : pas de détection de visages, pas de tri ni de sélection automatiques, pas de moteur « intelligent ». Des règles simples et déterministes.
- **Ne rien reprendre** des anciens moteurs de mise en page (ancien projet des développeurs, moteurs de layout existants) : ce brief part de zéro pour la logique de mise en page.
- **Ordinateur uniquement** : pas de version mobile. Largeur cible ≥ 1280 px. Pour ce module, la vérification « 375 px » du processus `/travailler` est remplacée par une vérification desktop (1280 et 1440 px).
- **Design** : celui déjà en place dans `/admin/atelier` (mêmes jetons, composants, vocabulaire). Sobre, fluide, sans animation travaillée.
- **Site en production avec de vrais paiements** : voir les interdits §3.

## 1. Processus de travail obligatoire
- Suivre le processus du dépôt (`.claude/commands/travailler.md`) et ses agents :
  - `verificateur` **en premier** : établir les faits sur le code existant avant de proposer quoi que ce soit (lecture seule).
  - `front` pour ce qui se voit, `backend` pour la mécanique (routes, lecture R2/Supabase).
  - `recetteur` avant **chaque** commit (types, lint, build, harnais atelier).
  - `gardien` sur la zone touchée avant la PR (sécurité : l'outil reste derrière l'auth admin).
- **Modèle** : la session principale tourne sur le modèle le plus capable disponible ; les agents l'héritent (`model: inherit`).
- Lire les `CLAUDE.md` concernés avant d'écrire : racine, `src/app/CLAUDE.md`, `src/app/admin/CLAUDE.md`.
- **Diagnostic d'abord**, puis plan découpé en tâches d'**un commit chacune**, validé par Mathias **avant** de coder.
- Avant chaque commit, écrire en chat : ce qui change · ce que ça pourrait casser · le geste de test de Mathias.
- Chaque blocage rencontré est documenté (journal + ticket) puis confié à l'agent adapté jusqu'à résolution.
- Décisions écrites dans `docs/DECISIONS.md`, faits périssables dans `docs/reference/ETAT-PRODUCTION.md`, une ligne par séance dans `docs/journal/`.
- Branche dédiée `chantier/atelier-mise-en-page` ; push à la fin de chaque tâche ; PR vers `main` **seulement si toute la CI est verte**.

## 2. Emplacement dans l'admin
Nouvelle section **« Mise en page »** dans `/admin/atelier`, avec deux entrées :
1. **Depuis une commande (préparation)** : liste des dossiers (`numeros`) qui ont des photos, tous états confondus (filtre par état, dont les commandes livrées / clôturées pour s'entraîner sur du réel). On choisit un dossier → ses photos sont chargées **directement depuis R2** (lecture seule, URL signées, comme « Télécharger le lot »), avec les métadonnées déjà en base (`photos` : largeur, hauteur, `prise_le`, appareil, GPS, `lieu_ville`, `empreinte`, vignette). Un bouton « Mettre en page » est aussi ajouté sur la fiche d'un dossier (`/admin/atelier/[token]`).
2. **Création libre (tests)** : un magazine vierge, alimenté par **import local** (plusieurs fichiers ou un zip, noms de fichiers conservés). Sert à tester en continu, sans dossier client.

## 3. Interdits (production)
- Ne pas modifier : le parcours cliente (`/`, `/composer`, `/numero/*`, `/compte`), le paiement Stripe et son webhook, les mails (Brevo, relève), l'impression existante (`Impression.tsx`, `preparerPdf.ts`, Cloudprinter), les transitions d'état (`transitions.ts`).
- **Aucune écriture** dans les tables existantes et **aucune migration** sans demander à Mathias. Les photos R2 sont lues, jamais modifiées ni supprimées.
- Rien de ce module n'est accessible hors auth admin.
- L'outil n'envoie aucun mail et ne change l'état d'aucun dossier.

## 4. ÉTAPE 0 — V1 de test (priorité absolue)
Objectif : Mathias teste de bout en bout tout de suite, **sans aucun blocage**. La justesse des templates n'a aucune importance à ce stade.
- **Sources de photos** : dossier client (R2) ou import local (fichiers / zip, dossiers `__MACOSX` et fichiers cachés ignorés). HEIC : listé « non lu en V1 », jamais bloquant.
- **Métadonnées** : pour R2, celles déjà en base ; pour l'import local, dimensions après orientation EXIF, orientation (portrait / paysage / carré), date EXIF sinon date du fichier (marquée « incertaine »).
- **Bibliothèque** : grille de vignettes, tri par nom et par date, filtre orientation, statut utilisée / non utilisée avec badge « utilisée ×n », sélection multiple.
- **Chemin de fer** : liste des planches (planche 1 = page droite seule), « Ajouter une double page ». Poser la sélection sur page gauche, page droite ou double page.
- **Templates** : les 4 doubles pages de l'annexe + **grilles de secours générées** (page et double page, **1 à 6 photos par page maximum**, plusieurs répartitions par nombre, calées sur la grille §6). Un template est **toujours** appliqué, même approximatif.
- **Actions** : « Autre disposition » (template suivant), « Page ↔ double page », « Vider », « Supprimer la planche », intervertir deux photos (clic puis clic), recadrage dans le cadre (curseur de zoom + déplacement à la souris), textes éditables au clic (une seule police, toutes tailles, gras ou non).
- **Un seul calcul de recadrage** (photo dans son cadre : remplissage, zoom ≥ 1, décalage borné, en mm) utilisé à l'écran ET dans l'export : ce qu'on voit est ce qu'Affinity reçoit.
- **Sauvegarde** : V1 sans migration → état du magazine et photos importées localement gardés dans le navigateur (IndexedDB, sauvegarde automatique) ; photos R2 relues à la demande. La persistance serveur viendra en étape 2, sur décision de Mathias.
- **Export** : zip `magazine.idml` + `Links/` (originaux des seules photos utilisées, noms conservés) + `photos-utilisees.txt` + `photos-non-utilisees.txt`. Liens relatifs `Links/…` par défaut ; champ facultatif « dossier où je décompresse » pour écrire des chemins absolus si Affinity ne résout pas les relatifs.
- **Critère de sortie** : Mathias ouvre un dossier client ET fait une création libre (photos Australie), construit au moins 3 doubles pages, change de disposition, passe une page en double page, recadre, exporte, et ouvre le fichier dans Affinity avec ses photos dans de vrais cadres et ses textes modifiables.

## 5. Étapes suivantes (après validation de l'étape 0)
### Étape 1 — Bibliothèque complète
- Toutes les informations par photo (dimensions, orientation, ratio, date, appareil, lieu, poids, format, empreinte), triables et filtrables : date, nom, orientation, ratio, résolution, appareil, lieu, utilisée / non utilisée, regroupement par jour et par « moments » (écart paramétrable). Réutiliser ce que la fiche sait déjà faire (doublons, « Par date », « Par lieu », remarques — jamais d'exclusion).
- Taille des vignettes réglable. HEIC converti.
- Suivi d'utilisation, **rapport** (total, utilisées, % utilisées, utilisées plusieurs fois, alertes de résolution).
- Téléchargements : zip « photos sélectionnées » et zip « photos non sélectionnées ».
### Étape 2 — Templates et chemin de fer complets
- Catalogue de **40 à 50 templates** (puis plus, sans limite) : templates utiles existants convertis en mm + références Pinterest « Magazines Bellajour / Double Pages » et albums photo, doublons de disposition fusionnés. Attribut **classique / original**, filtre « originaux seulement ».
- Choix : exact (portée + nombre + signature d'orientations) → même nombre (recadrage) → grille de secours. Jamais de blocage. Défilement ↑ ↓ des variantes.
- Effet **« carreaux »** : cadres d'un même `groupe` = une seule photo découpée, décalée pour paraître continue.
- Persistance serveur des magazines (migration à valider par Mathias), pour reprendre un travail sur un autre poste.
### Étape 3 — Package complet
- `magazine.idml` + `Links/` + `brief.md` (dossier, planches, templates utilisés) + `photos-utilisees/` + `photos-non-utilisees/` + `rapport.csv` + `apercu.pdf` (basse définition).
- Corrections de l'import Affinity : fond perdu repris, profil colorimétrique.

## 6. Géométrie (source unique)
- A4 portrait **210 × 297 mm**, pages en vis-à-vis, planche double **420 × 297 mm**, fond perdu **3 mm**.
- Marges : intérieure 20, extérieure 15, haut 15, bas 20 mm. Grille 6 colonnes × 6 lignes, gouttières 5 mm (modules 25 × 39,5 mm). Aucun texte à moins de 20 mm du pli.
- Coordonnées des templates en mm, origine au coin haut gauche de la page ou de la planche (bord de coupe). Une photo peut traverser le pli (vraie planche).

## 7. Templates = données
- Objet : `id`, `nom`, `portee` (page | double), `nbPhotos`, `signature` (ex. `P,P,L`), `attribut` (classique | original), `cadres[]`.
- Cadre : `x, y, l, h` (mm), `role` (photo | titre | texte | legende), `orientation`, `taille` et `gras` (textes), `rotation`, `groupe` (optionnel).
- Attribution photo → cadre : orientation identique d'abord, puis ordre chronologique. Page ↔ double page : fusion ou partage chronologique des photos, puis nouveau choix.

## 8. Export IDML (validé par test le 2026-10-27)
Un IDML généré par `idml-test-generator.py` (3 planches, 5 photos, 4 blocs texte) a été ouvert dans la version d'Affinity de Mathias. Vérifié :
- ✅ A4 en vis-à-vis, page 1 seule à droite.
- ✅ Chaque photo dans un vrai cadre photo, position exacte au 0,1 mm, recadrage centré conservé, image liée.
- ✅ Photo pleine double page traversant le pli, fond perdu compris.
- ✅ Blocs texte modifiables (police, taille, gras), noms de calques conservés.
- ⚠️ Fond perdu du document lu à 0 ; document ouvert en CMJN (SWOP) : corrections en étape 3.
- ⏳ Liens relatifs `Links/` : à valider (chemin absolu en secours).
- Technique : unités en points (1 mm = 72/25,4 pt) ; origine de chaque planche au milieu du pli, axe Y centré sur la hauteur ; page gauche à `x = -210 mm` ; `Rectangle` + `Image` + `Link` + `FrameFittingOption FillProportionally` ; `TextFrame` + `Story` ; `mimetype` en premier, non compressé. Rotation de texte par `ItemTransform` autour du centre du cadre.

## 9. Définition de « réussi »
Sur un dossier client réel ET sur les photos **Australie** (création libre), pour plusieurs types de magazines :
1. Toutes les photos chargées avec leurs informations, triables et filtrables.
2. Pour chaque sélection testée (1 à 6 photos, page et double page), une disposition est toujours proposée.
3. Une **capture d'écran de chaque état** du parcours, jointe au compte rendu.
4. Chaque blocage documenté, confié à un agent, résolu.
5. Package téléchargeable conforme à l'étape en cours.
6. L'IDML s'ouvre dans Affinity avec cadres photo et textes modifiables, aux bonnes positions — vérifié plusieurs fois.

## 10. Hors périmètre
Couvertures, impression, paiement, mails, IA, version mobile, interface cliente.

## Annexe — Les 4 premiers templates (double page, mm, planche 420 × 297)
```json
[
 {"id":"DP-01","nom":"Portraits 2+1","portee":"double","nbPhotos":3,"signature":"P,P,P","attribut":"classique","cadres":[
  {"role":"photo","x":15,"y":104,"l":85,"h":128.5,"orientation":"P"},
  {"role":"photo","x":105,"y":104,"l":85,"h":128.5,"orientation":"P"},
  {"role":"photo","x":320,"y":104,"l":85,"h":128.5,"orientation":"P"},
  {"role":"texte","x":15,"y":15,"l":175,"h":20,"taille":11,"gras":false},
  {"role":"legende","x":320,"y":15,"l":85,"h":6,"taille":7,"gras":true},
  {"role":"titre","x":230,"y":104,"l":85,"h":6,"taille":8,"gras":true},
  {"role":"titre","x":15,"y":262,"l":175,"h":8,"taille":16,"gras":true},
  {"role":"titre","x":230,"y":262,"l":175,"h":8,"taille":16,"gras":true}]},
 {"id":"DP-02","nom":"Titre géant + photo pleine","portee":"double","nbPhotos":2,"signature":"P,P","attribut":"original","cadres":[
  {"role":"photo","x":45,"y":183,"l":85,"h":104,"orientation":"P"},
  {"role":"photo","x":215,"y":5,"l":200,"h":235,"orientation":"P"},
  {"role":"texte","x":15,"y":15,"l":175,"h":20,"taille":9,"gras":false},
  {"role":"texte","x":45,"y":166,"l":115,"h":14,"taille":8,"gras":false},
  {"role":"titre","x":5,"y":249,"l":185,"h":30,"taille":110,"gras":true},
  {"role":"legende","x":215,"y":243,"l":200,"h":5,"taille":6,"gras":true},
  {"role":"titre","x":230,"y":249,"l":185,"h":30,"taille":110,"gras":true}]},
 {"id":"DP-03","nom":"Titre bloc + colonnes","portee":"double","nbPhotos":3,"signature":"L,L,P","attribut":"original","cadres":[
  {"role":"photo","x":15,"y":193,"l":175,"h":84,"orientation":"L"},
  {"role":"photo","x":260,"y":-3,"l":115,"h":57.5,"orientation":"L"},
  {"role":"photo","x":260,"y":79,"l":115,"h":153.5,"orientation":"P"},
  {"role":"titre","x":15,"y":15,"l":110,"h":30,"taille":26,"gras":true},
  {"role":"titre","x":75,"y":148.5,"l":115,"h":25,"taille":80,"gras":true},
  {"role":"legende","x":15,"y":148.5,"l":40,"h":4,"taille":6,"gras":false,"rotation":-90},
  {"role":"legende","x":186,"y":59.5,"l":40,"h":4,"taille":6,"gras":false,"rotation":90},
  {"role":"legende","x":15,"y":282,"l":175,"h":4,"taille":6,"gras":true},
  {"role":"titre","x":230,"y":59.5,"l":175,"h":7,"taille":16,"gras":true},
  {"role":"titre","x":260,"y":237.5,"l":115,"h":20,"taille":60,"gras":true},
  {"role":"legende","x":260,"y":268,"l":115,"h":5,"taille":10,"gras":true},
  {"role":"legende","x":230,"y":282,"l":175,"h":4,"taille":6,"gras":true}]},
 {"id":"DP-04","nom":"Deux empilées + paysage","portee":"double","nbPhotos":3,"signature":"L,L,L","attribut":"classique","cadres":[
  {"role":"photo","x":15,"y":-3,"l":195,"h":146.5,"orientation":"L"},
  {"role":"photo","x":15,"y":148.5,"l":195,"h":151.5,"orientation":"L"},
  {"role":"photo","x":230,"y":104,"l":175,"h":128.5,"orientation":"L"},
  {"role":"legende","x":260,"y":7,"l":115,"h":4,"taille":8,"gras":true},
  {"role":"legende","x":230,"y":59.5,"l":55,"h":15,"taille":8,"gras":false}]}
]
```
