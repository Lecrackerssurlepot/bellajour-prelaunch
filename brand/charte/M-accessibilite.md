# M. Accessibilité

Niveau visé : WCAG 2.2 AA.

| Règle | Valeur | Vérifié par |
|---|---|---|
| Contraste du texte | 4,5:1 (3:1 au-dessus de 24 px) | `brand/scripts/contrastes.mjs` |
| Contraste d'un repère non textuel (bord de champ, focus, icône) | 3:1 | idem |
| Focus visible | Anneau `focus` sur tout élément interactif, au clavier (`:focus-visible`) | axe et Playwright (phase 5) |
| Cible tactile | 44 × 44 px au moins (`cible.mini`) | Playwright |
| Taille des champs | 16 px au moins (`taille.champ`) | contrôle de la charte |
| Langue | `lang="fr"`, ou `en` / `pt` sur les pages traduites | Lighthouse |

## Textes alternatifs

- **Une photo qui porte un sens** : décrire ce qu'on voit, en une phrase courte. Par exemple « Un numéro ouvert sur une double page de plage ».
- **Une image décorative** : `alt=""`.
- **Une photo déposée par le client** : `alt` générique (« Votre photo 2 »). On ne décrit jamais le contenu privé d'un client.

## Ordre et structure

- **Un seul `h1` par page**, et des niveaux sans saut.
- **L'ordre de tabulation suit l'ordre de lecture.** Pas de `tabindex` positif.
- **Feuilles et menu** : le focus est piégé à l'intérieur, Échap ferme, et le focus revient au déclencheur.
- **État d'un bouton bascule** : `aria-pressed`. **Chargement** : `aria-busy`. **Erreur de champ** : `aria-invalid` + `aria-describedby`.
- **Animations** : voir I, `prefers-reduced-motion`.
