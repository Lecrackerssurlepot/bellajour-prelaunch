# Refonte de bellajour.fr

Ouvert le 21/11/2026. Branche `docs/refonte-site`. Rien n'est codé dans le site tant qu'une
direction n'est pas choisie sur maquette.

## Le constat de Mathias (21/11)

- Le site **fait IA** et vétuste : il manque de visuels, il ne fait pas rêver, il n'immerge pas.
- Les ajouts de Noël **se voient** : du code rajouté par-dessus, pas une page pensée.
- **Rien n'est homogène** : le site, l'atelier, l'Édition collective, les mails, les propositions
  commerciales et l'admin n'ont ni les mêmes polices ni les mêmes codes graphiques.

Constat vérifié dans le code le même jour : quatre palettes coexistent (Sombre, Crème, Porcelaine,
Charbon, voir `docs/marque/CHARTE-GRAPHIQUE.md`), la display change de graisse et de style selon la
page (Cormorant 400 droite, 600 italique, 500 italique), et 22 contradictions attendent une décision
(`docs/marque/A-TRANCHER.md`).

## L'objectif

Un site magnifique qui fait **comprendre et désirer le produit** : le magazine montré sous tous les
angles, en doubles pages, en mouvement, avec des sections qui ont chacune une raison d'être, une
typographie tenue, et des informations au propre. Il pousse à l'achat sans aucun code de site généré.

Puis la même direction partout : admin, espace client, mails, propositions B2B, Instagram.

## Ce qui ne change pas

- **Le logo blanc.** La version sombre du logo peut changer de couleur.
- Les règles d'écriture tranchées (`docs/marque/TON.md`) : masculin générique, pas de cadratin,
  textes courts, « magazine » et « numéro », jamais « album ».
- Aucun chiffre inventé : prix, délais et papier sortent du code (`grille.ts`, `urgence.ts`,
  `livraison.ts`).
- La couverture d'un magazine est toujours une vraie photo.
- **Aucun visuel généré par IA** sur le site ni dans la com. Seule exception : une maquette de
  travail, jamais publiée.

## Les documents

| Fichier | Contenu | État |
|---|---|---|
| `STRUCTURE-SITE.md` | diagnostic de l'existant, arborescence, trois structures proposées | proposé |
| `CODES-IA.md` | ce qui fait « site généré », et ce qu'on fait à la place | proposé |
| `CADRE-LEGAL.md` | toutes les obligations d'un site marchand vendant en France depuis le Portugal | à faire relire par un juriste |
| `INSPIRATIONS.md` | les liens envoyés par Mathias, et ce que chacun apporte | en attente des liens |
| `VISUELS-A-PRODUIRE.md` | la liste des prises de vue réelles nécessaires | à venir avec la structure choisie |
| charte (propositions) | deux ou trois directions de couleurs et de typos, logo blanc inchangé | après les liens |

À la décision, chaque choix descend dans `docs/marque/` (la référence) et dans Notion.

## Notion

État relevé le 21/11 : une page « Charte Graphique » à la racine du Notion (19/06, antérieure à
tout le code actuel, donc périmée), une page « La charte graphique de référence » dans
`Éditeur Bellajour / 11 · Questions ouvertes`, et le « BELLAJOUR — Dashboard ». Aucune section
« Direction artistique » n'existe. Proposition : la créer sous le Dashboard (Charte, Ton, Structure
de l'information, Codes à éviter, Cadre légal, Inspirations), et y marquer les deux anciennes pages
comme remplacées plutôt que les supprimer. **Rien n'est écrit dans Notion avant le go de Mathias.**

## La suite, dans l'ordre

1. Mathias envoie ses liens (vidéos Instagram de sites) : je les analyse et je cherche les sites
   d'origine, puis j'écris `INSPIRATIONS.md`.
2. Il choisit une des trois structures (ou un mélange).
3. Je propose deux ou trois chartes, appliquées à la même double page d'accueil pour qu'il compare.
4. Maquette complète en artefact : accueil, page produit, mobile d'abord (trafic Instagram).
5. Liste des prises de vue réelles, puis code page par page.
