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
