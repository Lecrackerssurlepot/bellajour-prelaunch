# Accueil v1 — les quatre sections de l'ancienne page d'accueil de l'Atelier

Archivées le 31/08/2026 (T-016), depuis `src/app/(atelier)/components/`. Zéro import au moment
du déplacement : l'accueil est porté par `Ouverture.tsx` + `Univers.tsx` depuis le 28/08, et le
contenu de ces quatre sections (l'étagère des quatre numéros, les trois temps, la grille des
paliers, l'acte final) est passé dans `/magazine` — tous lisaient déjà `content.ts`, la source
de texte n'a jamais été dupliquée. Elles reviennent par un `git mv` inverse.

| Fichier | Rôle dans l'accueil v1 |
|---|---|
| `S1Hero.tsx` + `s1-hero.css` | le hero d'ouverture |
| `S2Collection.tsx` + `s2-collection.css` | l'étagère des quatre numéros (le dessin des dos vit toujours ici) |
| `S3Method.tsx` + `s3-method.css` | les trois temps du parcours |
| `S4Final.tsx` + `s4-final.css` | la grille des paliers et l'acte final |

⚠️ Trois fichiers différents s'appellent `S1Hero.tsx` dans `archive/` : ici, `preventes/`,
`lancement/`. Vérifier le chemin avant d'ouvrir.

Des commentaires de `src/app/(atelier)/magazine/` (`Corps.tsx`, `page.tsx`, `pdp.css`) renvoient
vers ces fichiers comme dessin d'origine : ils pointent désormais vers ce dossier.
