---
id: T-064
titre: Trente déclarations de police jamais peintes bloquent le rendu de chaque page
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de performance du 29/08/2026.
## Ce que j'ai vérifié
`src/app/layout.tsx:26-31` — le chunk CSS racine (15 419 octets) est chargé sur `/`, `/magazine`
et `/composer`. **8 597 octets, soit 56 %, sont trente règles `@font-face`** déclarant Cormorant
Garamond 500/600 et DM Sans 400/500/600/700 — des faces que `(atelier)/theme.css:79-80` remplace
par celles de l'atelier, et qu'aucune page du groupe ne peint.
Le `preload:false` de `layout.tsx:23` évite le téléchargement des fichiers, pas celui des
déclarations. Coût modeste en octets, mais trente `@font-face` à analyser dans le CSS bloquant le
rendu, sur chaque page — y compris celle qui est déjà invisible tant que le JS n'est pas là (T-050).
## Ce que je propose
Les polices du layout racine servent les pages hors groupe atelier (admin, légales, ambassadeurs,
merci). Les déclarer là où elles servent plutôt qu'à la racine. ⚠️ Vérifier que les huit pages
crème gardent leur rendu : c'est un changement de portée, pas de valeur.
## Ce qui a été fait
**31/08 — vérifié, PAS corrigé (séance close avant).** Le constat tient toujours : le chunk
racine du build (`grep -o '@font-face' | wc -l`) porte bien **30 @font-face pour 13 297 octets**,
chargé par toutes les pages, ateliers compris (le chunk atelier en a 14 de plus, légitimes, et
celui de /composer 3 — l'italique DM Sans).

Deux choses apprises qui corrigent la fiche :
1. **La source n'est PAS une feuille CSS** : c'est `next/font` dans `layout.tsx:9-31` racine.
   Il n'y a donc RIEN à archiver — retirer ces déclarations, c'est déplacer deux appels
   `Cormorant_Garamond()`/`DM_Sans()`, pas supprimer du CSS.
2. **Aucune déclaration n'est « morte par grep »** : Cormorant 500/600 (+ italique) et
   DM Sans 400-700 sont tous peints dans le monde crème (globals.css:58 met les h1-h3 en 600 ;
   admin.css, merci.css, ambassadeurs/*, legal.css, inviter.css utilisent les deux familles ;
   54 usages de weight 500, 37 de 600, 5 de 700). Le problème est un problème de PORTÉE, pas de
   code mort. Les ~30 règles viennent des sous-ensembles Unicode (latin, latin-ext, cyrillic,
   vietnamese…) que next/font déclare d'office — `subsets: ['latin']` ne borne que le preload.

Le correctif restant (une séance à lui seul, avec recette visuelle des 8 pages crème) :
sortir les deux instances du layout racine vers un module partagé, et poser leurs classes de
variables sur la racine de CHAQUE page crème (AdminDashboard, admin/atelier, admin/login,
merci, ambassadeurs + charte + espace, inviter, LegalPage). ⚠️ Deux dépendances à traiter :
`WebViewBanner` (rendu par le layout racine sur TOUTES les pages — vérifier sa police) et les
pages d'erreur par défaut. `/numero` est autonome (son layout déclare ses polices). Toute page
oubliée retombe sur Georgia/system-ui en silence : c'est la recette visuelle qui l'attrapera.

**07/09/2026 — fait, en partie seulement : Cormorant sortie, DM Sans reste.**

`WebViewBanner` lit `--bj-font-ui` (DM Sans) en dur, sur TOUTES les pages — c'est le
bandeau « Ouvrir dans le navigateur » pour le trafic Instagram/Facebook en webview,
exactement le public que ce chantier sert. La sortir aurait cassé sa police pour tout ce
trafic. **DM Sans reste donc dans `layout.tsx` racine**, seule Cormorant Garamond
(500/600 + italique) est sortie, dans `src/app/creme-fonts.ts`, posée par les pages qui
la peignent réellement :
- `src/app/admin/layout.tsx` (nouveau) — couvre `/admin` et tout `/admin/atelier/**` en
  un seul fichier (aucun layout n'existait à ce niveau).
- `src/app/ambassadeurs/layout.tsx` (nouveau) — couvre `/ambassadeurs`, `/ambassadeurs/charte`,
  `/ambassadeurs/espace`.
- `src/app/legal/LegalPage.tsx` — un seul composant partagé par les 12 routes légales
  (`/cgv`, `/confidentialite`, `/mentions-legales`, `/remboursement` × fr/en/pt).
- `src/app/merci/page.tsx`, `src/app/inviter/page.tsx` (ses deux branches `<main>`).

⚠️ **Piège trouvé et corrigé pendant la vérification, pas anticipé au constat** :
`--bj-font-display` (tokens.css) vaut `var(--font-display), 'Cormorant Garamond', Georgia,
serif`. Une propriété personnalisée fige sa substitution LÀ OÙ ELLE EST DÉCLARÉE (`:root`),
pas là où elle est lue. Puisque `--font-display` n'est plus posée sur `<html>`,
`--bj-font-display` héritait INVALIDE jusqu'en bas pour toutes les pages crème, et chaque
`h1`/`h2`/`h3` y retombait en SILENCE sur `--bj-font-ui` (DM Sans, hérité du body) — prouvé
sur `/ambassadeurs` (« Le Cercle Ambassadeur » rendu en DM Sans, pas Cormorant) avant
correction. Corrigé par une classe `.bj-creme-fonts` (tokens.css) qui redéclare
`--bj-font-display` au même point que la variable next/font ; exportée avec elle sous
`cormorantCremeClassName` (creme-fonts.ts) pour qu'on ne puisse plus poser l'une sans
l'autre. **Sans cette classe, le correctif entier cassait silencieusement les titres de
8 routes** — exactement le risque que la fiche originale nommait sans le prouver.

**Vérifié dans le navigateur** (serveur de dev, port 3100), avant/après le correctif de la
classe : `/`, `/magazine`, `/composer` (accueil, PDP, questionnaire — Cormorant atelier
inchangée), `/ambassadeurs`, `/ambassadeurs/charte`, `/admin/login`, `/cgv`, `/inviter`
(état invalide), `/merci` (état invalide) — tous avec `getComputedStyle` confirmant
`font-family` = Cormorant Garamond sur les titres crème, DM Sans sur le corps partout.
Capté à 375×812 et desktop. `/admin` (le dashboard) 500 en dev faute de
`SUPABASE_URL`/`SUPABASE_SERVICE_KEY` dans ce worktree — sans lien avec ce correctif
(confirmé par le log serveur), non vérifiable ici.

**Mesuré au build** (`grep -o '@font-face' | wc -l` sur les chunks CSS produits) :
- Avant : un seul chunk racine, chargé par LES 41 ROUTES, **30 `@font-face` / 13 311
  octets**.
- Après : ce chunk racine (DM Sans seule, toujours chargé partout) tombe à **21
  `@font-face` / 6 131 octets** — soit **-9 déclarations / -7 180 octets sur `/`,
  `/magazine`, `/composer` et `/numero`**, les quatre routes qui reçoivent le trafic
  Instagram. La Cormorant sortie forme un second chunk (9 `@font-face` / ~7 188 octets)
  chargé UNIQUEMENT par les pages crème — total quasi identique à l'ancien chunk combiné
  pour elles (aucune régression, juste une deuxième requête au lieu d'une).

`npx tsc --noEmit`, `npm run lint`, `npm run build` verts après le correctif complet
(module + classe d'ancrage).
