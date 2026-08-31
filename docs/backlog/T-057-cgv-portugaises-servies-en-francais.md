---
id: T-057
titre: Les CGV portugaises, qui font foi, sont servies dans un document déclaré français
domaine: produit
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audits accessibilité ET référencement du 29/08/2026, qui le trouvent tous les deux.
## Ce que j'ai vérifié
`src/app/legal/LegalPage.tsx:29-32` sert la langue demandée, mais aucun `lang` n'est posé sur le
`<main>`, et `src/app/layout.tsx:102-103` fixe `lang="fr"` en dur.
Les trois langues sont servies sur la MÊME URL via `?lang=fr|en|pt` (`resolve.ts:16-19`), le
canonical est figé sur l'URL sans paramètre, et aucun `alternates.languages` n'existe.
Deux dommages :
- **`/cgv?lang=pt` sert l'intégralité des CGV en portugais dans un document déclaré français.**
  Une cliente portugaise au lecteur d'écran entend son contrat prononcé par une voix de synthèse
  française : illisible. Et c'est le texte **opposable**, pas une page de marketing.
- La version PT n'est ni indexable ni signalée à Google.
## Ce que je propose
Poser `lang` sur le conteneur du document légal en fonction de la langue servie — deux lignes, et
c'est le plus urgent. Puis, séparément, des URL distinctes par langue avec leurs `alternates`.
## Ce qui a été fait
**31/08/2026 — CONFIRMÉ, la partie urgente est corrigée.**
`src/app/legal/LegalPage.tsx` : `lang={lang}` posé sur le `<main class="lg">`, où `lang` est
la langue EFFECTIVEMENT servie (celle de `resolveDoc`, pas celle demandée : `?lang=de`
retombe sur le texte français, l'attribut suit). Aucun texte légal modifié — seul l'attribut
de langue a bougé, conformément à l'interdit nº2.
Preuves (build de production + `next start`, 31/08) :
- `/cgv?lang=pt` → `<main class="lg" lang="pt" …>`
- `/cgv?lang=en` → `<main class="lg" lang="en" …>`
- `/cgv` → `<main class="lg" lang="fr" …>`
Reste ouvert (seconde partie de la proposition, non faite) : des URL distinctes par langue
avec `alternates.languages` — la version PT n'est toujours ni indexable ni signalée à Google,
les trois langues vivant sur la même URL à canonical unique.
