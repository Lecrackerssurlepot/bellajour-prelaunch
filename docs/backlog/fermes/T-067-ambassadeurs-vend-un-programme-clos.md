---
id: T-067
titre: Une page indexable vend encore un programme qu'on n'honore plus
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de référencement du 29/08/2026.
## Ce que j'ai vérifié
`src/app/ambassadeurs/page.tsx:13-34` — page publique, **indexable** (aucun `robots`), avec son
propre canonical, qui vend le Cercle Ambassadeur (« Parrainez vos proches, gagnez des pages et des
albums offerts ») et sert toujours sa section `Inscription` (`:42`).
Or l'article 5.0 des CGV v3.0 limite tout ce régime aux commandes du 13/06 au 15/08/2026.
Une visiteuse qui cherche « bellajour ambassadeur », ou qui rouvre un vieux lien Instagram,
s'inscrit à un programme qu'on n'honore plus — et il faudra le lui expliquer après coup.
S'y ajoute : `/ambassadeurs` et `/ambassadeurs/charte` sont absentes du plan du site, et aucune
page vivante ne les lie. Deux pages orphelines que plus personne ne surveille.
⚠️ Lié à T-040 : c'est la même zone, et sa route d'inscription est ouverte à qui veut.
## Ce que je propose
Trois options, et c'est une décision commerciale :
1. Le programme continue → le dire clairement sur la page, la rattacher au site et au plan du site.
2. Il est clos → un bandeau qui le dit, la section d'inscription retirée, `noindex`.
3. Il est en sommeil → `noindex` seul, la page reste accessible par lien direct.
**Question pour Mathias** : le Cercle Ambassadeur est-il encore actif ? Tant que je ne sais pas,
je ne touche à rien : retirer une page qui vend serait pire que de la laisser.
## Ce qui a été fait
—

## Tranché et fait (08/09/2026)

Mathias a tranché : **archiver la page entièrement**. Fait — mais le périmètre a été établi
dans le code avant de déplacer quoi que ce soit, et il était plus étroit qu'il n'y paraissait.

### Ce qui RESTE, et la preuve

`src/app/ambassadeurs/` ne contenait pas qu'une page de vente.

- **`espace/` reste.** C'est la destination `DASHBOARD_URL` écrite dans les mails **P3** et
  **A3** (`src/app/api/webhook/route.ts:155` et `:328`), déjà partis chez de vraies
  ambassadrices confirmées. Elle est aussi liée en dur depuis le pied de page partagé
  (`src/app/sections/Footer.tsx:27`). Couper cette route aurait cassé l'accès de gens qui ont
  déjà parrainé — et un lien mort dans un mail reçu ne se rattrape pas.
- **`charte/` reste.** C'est le texte que chaque ambassadeur a accepté (« l'acceptation vaut
  signature », §13), et son calendrier court encore : la fenêtre de composition va jusqu'au
  **31/12/2026** (§7). Ce n'est pas une annexe marketing, c'est un engagement en cours.
- `AmbassadeurNav.tsx` et `layout.tsx` restent aussi : `espace/page.tsx` les importe.

### Ce qui PART

Vers `archive/ambassadeurs/` (`git mv`, jamais `rm`), avec son README : `page.tsx` et les sept
blocs de la page de vente (`Hero`, `LiteYouTube`, `Calculateur`, `Onglets`, `Engagement`,
`Inscription`, et leurs feuilles), plus **la route d'inscription elle-même**.

### 410 Gone, pas 404

`GET /ambassadeurs` et `POST /api/ambassadeur/register` rendent désormais **410**. C'est le code
juste : le contenu a existé et il est retiré volontairement — 404 dirait à Google « je ne sais
pas », 410 dit « c'est fini, désindexe ». La page de 410 est habillée aux couleurs crème plutôt
que d'être une erreur nue.

**Et c'est la route d'inscription qui comptait le plus** : elle ajoutait le contact à la liste
Brevo 3, laquelle déclenchait la séquence de prévente (**T-104**). Elle n'appelle plus ni Brevo
ni la base — elle refuse, point.

Deux liens morts corrigés au passage : la nav de la charte pointait vers `/ambassadeurs` et
`/ambassadeurs#inscription`, elle mène maintenant à l'espace ; le bouton « Rejoindre le Cercle »
de `AmbassadeurNav` est retiré de la seule variante encore appelée. Le sitemap ne portait déjà
plus d'entrée `/ambassadeurs`.

### Mesuré, pas supposé

    GET  /ambassadeurs             -> 410
    POST /api/ambassadeur/register -> 410
    GET  /ambassadeurs/espace      -> 200
    GET  /ambassadeurs/charte      -> 200
    GET  /merci                    -> 200

`tsc`, `lint`, `build` (59 routes) verts. Console navigateur propre à 375 px et en desktop.

### Signalé, pas fait

**`src/lib/pricing.ts` est resté en place.** Son seul importeur vivant (`Calculateur.tsx`) est
parti à l'archive, il est donc orphelin en code — mais il porte la grille tarifaire sur laquelle
les quatorze fondateurs ont contracté. L'archiver est une décision à part, pas un ménage.

## État

`fermé` — page de vente archivée, inscription fermée en 410, accès des ambassadeurs existants
préservé et prouvé.
