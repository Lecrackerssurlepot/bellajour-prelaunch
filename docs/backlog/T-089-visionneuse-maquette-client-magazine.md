---
id: T-089
titre: La maquette que reçoit le client — visionneuse multi-format façon magazine
domaine: front
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-02
---
## Ce que Mathias a dit (02/09, brouillon)
« On aimerait qu'on développe beaucoup plus la partie où la personne reçoit la première maquette
(1ère de couverture, 4ème de couverture). Sur téléphone comme sur ordi, le visuel doit **vraiment
donner envie**, qu'on ait plus de possibilités de notre côté pour que la personne se donne à cœur
joie d'acheter. »

**La problématique — envoi couverture et mise en page :**
- La personne reçoit un visuel des mises en page sur son téléphone ou ordi.
- L'affichage doit être en **plusieurs formats** : l'intégralité de la couverture (1ère + 4ème),
  la 1ère toute seule, la 4ème toute seule.
- **L'affichage qui défile doit faire MAGAZINE.**
- Implication côté prod : **nous envoyons la 1ère et la 4ème sur UNE SEULE PLANCHE**, et le système
  **propose un découpage pile centré entre les deux** → on obtient la planche d'un coup, la 1ère
  seule, la 4ème seule, ET la/les double(s) page(s) mise(s) en page.
- On veut pouvoir mettre **2 doubles pages, voire 3** — elles ne s'affichent **que si on le
  souhaite** (l'atelier décide de ce qui est montré). L'affichage se fait par rapport à ce qu'on a
  décidé d'uploader.

## Ce qui existe (audit du 02/09 en cours)
Aperçu actuel : `numeros.apercu_urls` (jsonb) + composant `Loupe.tsx` (partagé admin/client,
navigue par légende). Page `/numero/[token]` à l'état `apercu_pret`. Cartographie complète dans la
note de design du 02/09. → PAS de notion de « planche » à découper ni de défilé magazine
aujourd'hui.

## Ce que je propose (à affiner avec Mathias)
Une **visionneuse** dédiée, thème sombre `.bj-atelier`, qui prend ce que l'atelier a uploadé et
l'affiche en défilé magazine, avec bascule de format (planche entière / 1ère / 4ème / doubles
pages). Le découpage centré de la planche se fait à l'affichage (CSS/canvas), sans re-générer
d'image. Prototype visionnable livré le 02/09 (voir la note de design).

## Ce qui a été fait
- **02/09 — prototype v3** (visionnable) : plein écran mobile-first, encart du nom, « Commander »
  arrondi, feuille d'ajustement (la porte de sortie douce, T-091).
- **02/09 — fondation data model (PR #28)** : `apercu.ts` porte désormais `doubles: string[]`
  (0 à 3, `MAX_DOUBLES`) avec repli backward-compatible sur l'ancien `double` unique ; helper pur
  `lireDoublesBrutes` + 7 tests. **Inerte** tant que la visionneuse et l'admin ne l'utilisent pas.

- **02/09 — la visionneuse dans `/numero` (PR #29)** : `Apercu.tsx` refait en visionneuse magazine
  (scène plein cadre, feuilletage glissé/flèches/points, loupe au clic), lisant `plat`/`c1`/`c4`/
  `doubles`. Structure du parcours **inchangée** (cases + paiement en dessous). Rendu réel validé en
  dev (couverture immersive, doubles pages, encart du nom). `numero.css` : ancien bloc `.nu-covers`/
  `.nu-vue` remplacé par `.nu-viz-*`.

## Reste à faire (prochaines étapes)
- **T-090** : produire la planche + 1 à 3 doubles pages côté admin (pour l'instant seul le format
  existant les alimente ; la visionneuse est prête à recevoir plusieurs doubles).
- Voir la visionneuse **avec de vrais visuels** : demande un dossier `apercu_pret` avec `apercu_urls`.
- Brancher la **feuille d'ajustement** (T-091) une fois la direction validée.

## À trancher / données manquantes
- La **structure de données** de la maquette (planche + où couper + N doubles pages + lesquelles
  montrer) — dépend de la refonte admin (T-090).
- Le geste d'achat depuis la visionneuse (le bouton payer reste, cf. invariant « un seul libellé »).
- Lien avec la géométrie produit (T-077/078) : la planche couverture = dos carré enveloppant ?
