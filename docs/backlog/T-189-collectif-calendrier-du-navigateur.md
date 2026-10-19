---
id: T-189
titre: Les dates du formulaire d'une édition passent par le calendrier du navigateur, et les dates de l'événement ne sont qu'un texte
etat: en cours
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Dernier point que je comprends pas dans la nouvelle édition, c'est pourquoi euh, date de
l'événement, euh, bah, y avait pas, en fait on n'a pas le calendrier avec les dates. Et c'est
possible visuellement de changer le, la gueule du calendrier qui s'affiche là, je vois bien un
truc avec, en transparence dans notre design à nous, plutôt qu'avoir ce vieux truc tout moche en
termes de calendrier. Voilà, c'est juste un détail euh, visuel, mais ça me fera vraiment du bien,
vu qu'on va utiliser tous les jours, d'avoir un truc qui, qui ressemble à quelque chose. »
(19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- `src/app/admin/collectif/FormulaireEdition.tsx` : « Dates de l'événement » est un champ TEXTE
  (`dates_texte`, `:498`) ; la clôture « Choisir au calendrier… » et la livraison souhaitée sont des
  `<input type="date">` (`:463`, `:507`) : le calendrier affiché est celui du navigateur (gris,
  hors de notre direction Porcelaine).
- `dates_texte` n'est lu que par l'en-tête de la fiche atelier : le remplir depuis un calendrier
  (« du 2 au 4 octobre 2026 ») ne demande aucune migration.

## Ce que je propose
Planche 9 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) : un calendrier Bellajour (panneau de verre posé sur le
champ, le mois en grille, la sélection en couleur d'accent, aujourd'hui cerclé), en PLAGE pour
les dates de l'événement (du… au…), en jour seul pour la clôture (23 h 59 heure de Paris, comme
aujourd'hui) et la livraison. Clavier : flèches, Entrée, Échap. Les raccourcis de clôture restent.

## Validé par Mathias le 19/10 au soir
« Je valide les planches 9 à 12 telles quelles : la renumérotation des magazines dans les
réglages me va, et je suis d'accord pour la migration de la planche 12 (je l'appliquerai). »

## Ce qui a été fait
19/10/2026 au soir, planche 9 codée (non commitée, en attente de relecture), sans migration :
- **Un calendrier à nous** (`src/app/admin/collectif/Calendrier.tsx`, `calendrier.css`) : un
  panneau de verre posé SOUS son champ (par-dessus la suite), le mois en grille lundi d'abord
  (L M M J V S D), la sélection en bleu d'accent, aujourd'hui cerclé (le jour vient du
  SERVEUR), ‹ › pour changer de mois. Il se ferme par Échap, par un clic dehors, ou quand un jour
  est choisi ; au clavier : flèches (jour, semaine), Page précédente / suivante (mois), Entrée
  ou Espace pour choisir, Échap rend le focus au bouton du champ.
- **Dates de l'événement, en PLAGE** : premier clic = début (un seul jour, déjà valable), second
  = fin, un second clic avant le début devient le début. Le champ écrit « du 2 au 4 octobre
  2026 » / « le 2 octobre 2026 » / « du 30 septembre au 2 octobre 2026 » / « du 28 décembre 2026
  au 3 janvier 2027 » dans `dates_texte`. Le champ reste un TEXTE qu'on peut taper : un texte
  d'avant qui ne se relit pas (« début octobre ») reste tel quel et rien n'est sélectionné. Pied :
  « 3 jours », « Effacer », « Garder ».
- **Clôture, en JOUR** : les raccourcis restent, « Choisir au calendrier… » (et la puce du jour
  choisi) ouvrent le panneau ; les jours passés sont barrés et refusés ; pied « à 23 h 59, heure
  de Paris » et « 26 jours pour déposer ». Les règles ne bougent pas : 23 h 59 Paris par
  `champCloture`, l'instant par `instantDeParis`, le refus du passé dans `saisie.ts`.
- **Livraison souhaitée, en JOUR** (création ; en réglages elle reste lue et renvoie à l'onglet
  Livraison, comme avant) : un champ-bouton, jours passés barrés, pied avec le jour et « Effacer ».
- Plus aucun `<input type="date">`, `datetime-local` ni `time` dans le formulaire (le harnais le
  vérifie). L'ancienne version : `archive/formulaire-champs-navigateur-2026-10/`.
- Logique pure dans `src/lib/collectif/calendrier.ts` (`grilleMois`, `moisPlus`, `titreMois`,
  `cliquerPlage`, `textePlage`, `lirePlage`, `jourAuClavier`, `libelleJour`, `phraseJoursPlage`,
  `phraseDepot`), prouvée au harnais (aller-retour texte ↔ plage sur 400 plages compris).
- Défaut trouvé à l'écran et corrigé : **un verre dans un verre ne floute pas** (Chrome) ; sous
  le corps du formulaire, le panneau laissait lire net le texte qu'il couvre. Tant qu'un
  calendrier est ouvert, le corps pose son propre flou (`.eca-form-corps:has(.eca-cal)`), ce qui
  ne change rien à l'œil (derrière lui, le fond est déjà flou).
- Vérifié : tsc, lint (0 erreur), build, `verif-atelier`, `verif-collectif` ; à l'écran en Chrome
  headless à 1440 et 375 px, création et réglages, toute écriture interceptée.

Écarts à la planche, assumés :
- Le panneau se POSE par-dessus ce qui suit (un vrai menu) ; la planche le dessinait dans le flux
  pour montrer deux calendriers ouverts côte à côte. Un seul s'ouvre à la fois.
- Novembre 2026 a six semaines : la planche avait oublié le lundi 30.
- L'heure de clôture ne se tape plus (le champ heure du navigateur est parti avec le reste, la
  planche n'en montre pas) : 23 h 59 pour tout choix ; une clôture déjà posée à une autre heure
  (« Clore maintenant ») garde son heure si l'on change le jour, et le pied la dit.
- Pas d'aide sous « Dates de l'événement » sur la planche ; celle de la planche 5 (« Pour l'atelier
  seulement… ») est gardée.
