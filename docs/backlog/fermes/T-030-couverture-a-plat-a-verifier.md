---
id: T-030
titre: Vérifier si la couverture d'un seul tenant est déjà livrée
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« C1 + C4 en un seul envoi, découpé à l'affichage. Pour que la cliente voie une vraie couverture
qu'on retourne. »
## Ce que j'ai vérifié
Ce chantier semble **déjà fait** : l'aperçu à plat du 26/08 (T2-2) dépose un fichier unique
`C4 | dos | C1` (`apercu_urls = {plat, double}`), découpé en CSS par `object-position`, les
dossiers historiques `{c1, c4, double}` continuant de rendre comme avant.
À confirmer avant toute chose : ce ticket est probablement à fermer en `refuse`, ce qui serait
un gain.
## Ce que je propose
Lancer le vérificateur. S'il confirme, fermer avec la preuve. S'il reste un écart avec l'intention
de Mathias (« une vraie couverture qu'on retourne » suppose peut-être une animation de
retournement), le reformuler en un ticket honnête plutôt que de le garder vague.
## Ce qui a été fait
**03/09/2026 — REFUSÉ : le chantier est déjà livré.** Vérifié dans le code (état au 03/09) :

- **Un seul envoi** : l'admin écrit `apercu_urls = { plat, doubles }` — un fichier unique
  `4e | dos | 1re` (`transitions.ts:354`, format normal depuis T2-2, étendu à 0-3 doubles pages
  par T-090).
- **Découpé à l'affichage, sans re-générer d'image** : la page cliente cadre la moitié droite
  (« La couverture »), la moitié gauche (« La quatrième ») et montre l'objet entier (« La
  couverture à plat »), par `object-position` en CSS (`Apercu.tsx:57-60`). Les dossiers
  historiques `{c1, c4}` rendent comme avant.
- **« Une vraie couverture qu'on retourne »** : la visionneuse magazine (T-089) donne les trois
  vues d'un même objet — recto, verso, à plat — qu'on feuillette (glissé, flèches, points) et
  qu'on agrandit à la loupe. On voit bien les deux faces d'une seule couverture.

Il n'y a **pas d'animation 3D de retournement** littérale : le « retourner » est réalisé par la
bascule entre les vues du même objet, ce qui répond à l'intention. Si un jour tu veux une vraie
bascule animée (flip), c'est une AMÉLIORATION distincte à ouvrir en propre — pas ce ticket, qui
est bien clos. **Fiche déplacée dans `fermes/`.**
