---
id: T-190
titre: Dans le formulaire d'une édition, on ne retire que le dernier magazine, les chiffres ont les flèches du navigateur, et rien ne montre où va le message d'accueil
etat: en cours
domaine: collectif
gravite: confort
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Euh, pour les magazines, retirer le dernier... Euh, Juste une, une poubelle à droite qui permet
de le supprimer sera amplement suffisante, parce que si j'en crée trois, du coup, je peux retirer
que le dernier. Alors, je comprends bien que ça sert à rien, mais si, euh, au final, je change,
je, je me rends compte que je me suis trompé de titre ou quoi, euh, juste une poubelle, en fait.
Même si ça change rien, pour le coup, c'est juste un détail. Voilà, aussi les petites flèches,
plus, moins, euh, c'est bien, mais est-ce qu'il y a pas moyen de faire un truc un peu plus clean
euh, Ou au pire, bon, peu importe, en vrai, c'est voilà. Euh, message d'accueil du lien des
participants, j'aimerais bien savoir où se met son, ce lien, en fait, parce que... Voilà. »
(19/10/2026, soir)

## Ce que j'ai vérifié (19/10)
- Magazines : « Retirer le dernier » (`FormulaireEdition.tsx:572`), règle `planMagazines`
  (`saisie.ts`) : on ne retire que le dernier, et seulement s'il est vide, parce que la base
  refuse deux magazines au même rang (`collectif_magazines_rang_unique`) et que le client lit
  « magazine 2 ». À la CRÉATION, rien n'existe encore : retirer n'importe quelle ligne est sans
  risque. En RÉGLAGES, un magazine que le client a commencé (brief, tour) ne doit pas disparaître.
- Chiffres : des `<input type="number">` (flèches du navigateur).
- Message d'accueil (`invitation_texte`) : il s'affiche sur la page des participants (le lien et
  le QR), sous le nom de l'événement (`depot/[token]/page.tsx:78`) ; vide, « Déposez ici vos
  photos de l'événement. » Vérifié en production le 19/10 : « SALUT SALUT » sous « BOUGNOUL ».
  Le formulaire ne le dit pas.

## Ce que je propose
Planches 10 et 11 du canevas du 19/10 au soir (https://claude.ai/artifact/DK9igxYPaw7C4cJmtwbe6K) :
- une poubelle sur CHAQUE magazine à la création ; en réglages, sur chaque magazine encore vide
  (les suivants prennent le numéro libéré), grisée avec la raison sur un magazine commencé ;
- les chiffres en « − 30 photos par personne + », l'unité dans le champ, la saisie au clavier
  toujours possible ;
- sous le message d'accueil, un aperçu de la page des participants qui se met à jour en tapant.

## Validé par Mathias le 19/10 au soir
« Je valide les planches 9 à 12 telles quelles : la renumérotation des magazines dans les
réglages me va, et je suis d'accord pour la migration de la planche 12 (je l'appliquerai). »

## Ce qui a été fait
19/10/2026 au soir, planches 10 et 11 codées (non commitées, en attente de relecture), sans
migration :
- **Une poubelle par magazine** (`ListeMagazines.tsx`) : le numéro dans un rond, le nom, la
  poubelle à droite. À la création, chaque ligne se retire et les numéros se resserrent. En
  réglages, un magazine ENCORE VIDE se retire ; sur un magazine commencé la poubelle est grisée
  et dit, au survol, au clavier ou au toucher : « Le client a commencé ce magazine : il ne se
  retire pas. Changez son nom si besoin. » Chaque ligne dit où en est le client (« vide »,
  « brief commencé », « brief validé », « N tours publiés », « bon à tirer validé »). Il reste
  toujours un magazine (la dernière poubelle est grisée et le dit).
- **La règle** (`saisie.ts`) : `magazineVide` (aucune pièce de brief, aucune couverture aimée, ni
  part de texte, ni brief ni BAT validé, aucun tour : `collectif_tours` est la SEULE table qui
  pointe vers un magazine, les notes et les couvertures proposées pointent vers un tour), lue par
  la fiche ET par le PATCH ; `retraitMagazine` / `retirerMagazine` pour la poubelle ;
  `planMagazines` accepte de retirer n'importe quel vide, refuse un commencé en CONFLIT,
  l'ordre changé, un nouveau glissé entre deux anciens, un id en double ; `resserrerRangs` rend
  les nouveaux rangs du plus petit au plus grand.
- **La route** `editions/[id]` (PATCH) : 409 `magazine_commence` qui nomme le magazine ; les
  retraits d'abord (la suppression redit les colonnes brutes : si le client a commencé entre la
  lecture et l'écriture, la ligne reste, et la route répond 409 `partiel` après avoir resserré
  ce qui est vraiment resté), puis les rangs un par un (jamais deux magazines au même rang malgré
  `unique (edition_id, rang)`), puis les ajouts à la suite. Chaque retrait est journalisé
  (`magazine_retire`, « « Les professeurs » (magazine 2) retiré par Mathias. »). La route rend la
  liste écrite et l'écran la reprend : un magazine ajouté ne repart plus en double au second
  « Enregistrer » (défaut d'avant, l'état de l'écran survivait au `router.refresh()`).
- **Les chiffres en pastille** (`Pastille.tsx`) : « − 30 photos par personne + », l'unité dedans,
  la saisie au clavier (chiffres seulement, flèches haut et bas), « 2 000 » groupé hors saisie,
  vide = « à fixer » (ou « facultatif ») et part `null` ; « + » sur un vide part du minimum,
  « − » ne descend jamais sous lui. Valeurs rapides 10, 20, 30, 50 sous « Par personne »
  (`VALEURS_RAPIDES`), des raccourcis, jamais une valeur par défaut.
- **Le message d'accueil** : l'aide « Il s'affiche sous le nom de l'événement, sur la page
  qu'ouvrent les participants avec le lien ou le QR code. Vide : « Déposez ici vos photos de
  l'événement. » » (la phrase par défaut suit le tu de l'école, mot pour mot celle de
  `/depot/[token]`, le harnais compare), et à côté l'APERÇU de cette page en petit
  (`ApercuDepot.tsx`, téléphone Charbon) : « <organisation> vous invite », le nom de
  l'événement, le message entouré de pointillés, le champ du prénom, le bouton. Il suit la
  frappe.
- Vérifié : tsc, lint (0 erreur), build, `verif-atelier`, `verif-collectif` (retirer le 2 sur 3 à
  la création, retirer un vide au milieu en réglages → rangs 1, 2 sans collision, refuser un
  commencé) ; à l'écran en Chrome headless à 1440 et 375 px, création et réglages, toute écriture
  interceptée (un 409 factice montre « Le reste est enregistré ; à revoir dans « Les magazines ». »).

Écarts à la planche, assumés :
- L'étiquette d'un magazine (« brief validé ») est au bout du champ, pas collée au nom : le nom
  reste un champ qu'on retape. Sur téléphone, elle passe sous le nom, dans le cadre.
- « faute de frappe ? » sur la planche illustrait l'envie de retirer : ce n'est pas un correcteur,
  il n'est pas codé.
- Sous « Par personne », l'aide « Le responsable peut baisser ce nombre, jamais le dépasser. »
  est gardée sous les valeurs rapides (la planche la remplaçait).
- Les valeurs rapides sont 10, 20, 30, 50 comme la planche ; le client, pour un lien, a
  10, 30, 50 (`RACCOURCIS_LIEN`) : la planche disait « les mêmes », ce n'est pas tout à fait vrai.
- Le bouton de l'aperçu est vide, comme la planche (sur la vraie page il dit « Choisir mes photos »).
- Sur les éditions de recette, aucun magazine enregistré n'est vide : l'étiquette « vide » d'un
  magazine en base n'a pas été vue à l'écran (le retrait d'un vide est prouvé au harnais).
