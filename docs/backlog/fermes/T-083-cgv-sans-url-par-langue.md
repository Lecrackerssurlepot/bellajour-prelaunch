---
id: T-083
titre: Les CGV portugaises, qui font foi, n'ont pas d'URL à elles et sont invisibles pour Google
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-09-01
---
## Ce que Mathias a dit
Rien — reste détaché de T-057 le 01/09/2026, à sa clôture.
## Ce que j'ai vérifié
T-057 a réglé l'urgent : `src/app/legal/LegalPage.tsx` pose `lang={lang}` sur le `<main>`, où
`lang` est la langue **effectivement servie**. Un lecteur d'écran et un traducteur automatique
savent désormais qu'ils lisent du portugais.
Ce qui reste : **les trois langues vivent sur la même URL**. `/cgv`, `/cgv?lang=pt` et
`/cgv?lang=en` sont, pour un moteur, une seule et même page — un paramètre de requête ne crée pas
d'adresse, et la page porte un canonical unique. Conséquences :
- la version **portugaise, qui fait foi contractuellement**, n'est ni indexable ni indexée ;
- aucune balise `alternates.languages` ne déclare les trois versions les unes aux autres ;
- un lien partagé vers `?lang=pt` reste juste, mais rien ne le rattache à la famille.
⚠️ Ce n'est pas qu'un sujet de référencement : les CGV portugaises sont le texte qui prévaut en
cas de litige. Qu'elles soient introuvables par la voie normale est une faiblesse de fond.
## Ce que je propose
Des chemins par langue plutôt qu'un paramètre — `/pt/cgv`, `/en/cgv` — et
`alternates.languages` + `hreflang` déclarés dans les deux sens, avec `x-default` sur le
français. Le canonical de chaque version pointe alors sur elle-même.
⚠️ **Aucun texte légal n'est touché**, ni traduit, ni réécrit : on ne change que l'adresse à
laquelle un texte déjà écrit est servi. C'est ce qui rend ce ticket `libre` malgré son sujet.
⚠️ Garder `?lang=` en redirection : des liens existent déjà dans la nature, et un texte légal
qui répond 404 est pire que le problème qu'on répare.
À faire avec la refonte des pages légales si elle vient (lot CGV : T-026, T-027, T-028, T-072,
T-077), sinon seul — les deux sont indépendants.
## Ce qui a été fait
**03/09/2026 — fait (branche `feat/legal-url-par-langue`). Aucun texte légal touché** : on n'a
changé que l'ADRESSE à laquelle un texte déjà écrit et déjà traduit est servi.

Les quatre documents (CGV, confidentialité, mentions légales, remboursement) sont trilingues
(fr/en/pt). Chaque langue a désormais son URL :
- **français** sur la racine (`/cgv` …) — le canonical du site ;
- **anglais et portugais** sur `/en/cgv`, `/pt/cgv`, etc. (8 nouvelles routes).

Mécanique :
- `resolve.ts` : `legalPath` (chemin par langue), `legalAlternates` (canonical auto-référent +
  `hreflang` des langues présentes, `x-default` sur le français), `legalRouteMetadata` (titre tiré
  du contenu traduit) ; `legalHref` passe du `?lang=` au chemin.
- `LegalPage.tsx` : prop `forceLang` — les routes par langue tiennent leur langue de l'ADRESSE ;
  le sélecteur pointe désormais vers les chemins.
- Les 4 pages françaises : `?lang=en|pt` **redirige en 308** vers l'adresse par langue (`ref`
  préservé) — les liens `?lang=` déjà partagés restent valides, jamais de 404 sur un texte légal.
- `sitemap.ts` : `alternates.languages` (hreflang) sur les 4 documents.

Vérifié au runtime (`next start`) : `/cgv?lang=pt` → 308 `/pt/cgv` (`&ref=` conservé) ; `/pt/cgv`
sert le portugais (`<main lang="pt">`, titre « Condições gerais de venda »), canonical
`/pt/cgv`, hreflang fr/en/pt/x-default cohérents dans les deux sens ; sélecteur en chemins, plus
aucun `?lang=` résiduel ; sitemap porte les `xhtml:link`. tsc + lint + build verts. **À fermer.**

La **version portugaise, qui fait foi**, est enfin indexable et rattachée à sa famille — le fond
du ticket.
