# Charte Bellajour V2.0 — l'index

**À lire avant toute tâche visuelle** : page, composant, mail, PDF, visuel, post.
Cette charte prime sur tout le reste : anciens `CLAUDE.md`, skills, docs, Notion. En cas de
conflit, elle gagne, et on le signale.

**Ce qui reste valable à côté** (rien à voir avec les couleurs ni les polices) :
- `docs/marque/TON.md` et `STRUCTURE-INFO.md` : les règles d'écriture tranchées, résumées en A ;
- `docs/marque/PIEGES-VISUELS.md` : les pièges techniques de mise en page.

`docs/marque/CHARTE-GRAPHIQUE.md`, `MOTION.md` et `A-TRANCHER.md` sont **remplacés** par cette
charte.

- **Les valeurs** vivent dans [`brand/tokens.json`](../tokens.json), et nulle part ailleurs.
- **Le CSS** les lit en `var(--m-…)`, depuis [`brand/build/tokens.css`](../build/tokens.css), qui est généré.
- **Après toute modification** : `node brand/scripts/build-tokens.mjs`, puis `node brand/scripts/contrastes.mjs`.

## Les 16 règles d'or

1. **Un seul mode.** Papier blanc `#ffffff`, encre `#111111`. Pas de jour/nuit.
2. **L'accent est l'encre.** Aucun bleu, aucun cuivre, aucune troisième couleur d'interface.
3. **Le noir en bloc** (`couleur.nuit`) sert à rythmer : bandeau, carte cadeau, Noël. Jamais une page entière. **Alternance** : quand c'est blanc dessous, c'est noir au-dessus, et inversement (fiche C).
4. **Les titres sont en Fraunces 560**, axes SOFT 40 / opsz 96.
5. **Interlope** sert pour une phrase seule à l'écran, une fois par écran, et à 40 px au moins.
6. **Le texte et les étiquettes sont en Inter Tight.**
7. **Le titre imprimé sur un magazine** est en Instrument Serif : c'est la typo du produit, pas du site.
8. **Les tailles viennent de l'échelle `taille.*`.** Une taille hors échelle est une exception nommée, jamais une valeur libre.
9. **Les espacements sont sur la grille de 8 px (`espace.1…10`).** La marge latérale est unique, et une section est séparée de la suivante par `espace.section`.
10. **Cinq rayons et trois ombres.** L'ombre est réservée aux objets imprimés (livre, couverture). L'interface n'en porte pas.
11. **Deux points de rupture** : téléphone à 700 px ou moins, menu complet à 901 px ou plus. Le JS lit les mêmes.
12. **On n'anime que `transform` et `opacity`**, avec la courbe `courbe.sortie`. Une animation qui suit le doigt reste ; une animation qui joue seule se coupe quand l'appareil demande moins d'animations.
13. **Toute cible tactile mesure 44 px au moins, tout champ est en 16 px au moins**, et tout élément interactif a un focus visible.
14. **Les textes sont courts** (2 à 6 mots pour un bouton ou un titre), au masculin générique, sans tiret cadratin.
15. **On n'invente jamais un chiffre, un prix, un délai ou une mesure.**
16. **Un magazine montré = le modèle 3D** (`brand/assets/3d/magazine/`), même de face, pour tout visuel et tout mockup (fiche J).

## Les fiches

| | Fiche | |
|---|---|---|
| A | [Fondations et ton](A-fondations.md) | promesse, ton par canal, règles d'écriture |
| B | [Logo et signatures](B-logo-signatures.md) | versions, protection, favicon, signatures |
| C | [Couleurs](C-couleurs.md) | papier, nuit, états, contrastes |
| D | [Typographie](D-typographie.md) | rôles, échelle, **changer de police** |
| E | [Espacements et grille](E-espacements.md) | grille de 8 px, marges, ruptures |
| F | [Formes et matières](F-formes-matieres.md) | rayons, traits, ombres, variations |
| G | [Icônes et photo](G-iconographie.md) | Lucide, règles photo, **visuels datés** |
| H | [Composants](H-composants.md) | boutons, champs, en-tête, pied, états |
| I | [Motion](I-motion.md) | courbes, durées, défilement, réduction |
| J | [Médias](J-medias.md) | images, vidéos, magazine 3D |
| K | [Gabarits](K-gabarits.md) | structure des pages |
| L | [Navigation et liens](L-navigation.md) | CTA, liens externes, 404, redirections |
| M | [Accessibilité](M-accessibilite.md) | contraste, focus, cibles, alt |
| N | [Hors site](N-declinaisons.md) | mail, PDF, réseaux, mockups ; **un nouveau mail commence par le choix de sa structure** (atelier, lettre, magazine, simple) |
| O | [Gouvernance](O-gouvernance.md) | versions, validation, modification |

**Statut des valeurs.** Les valeurs relevées sur le banc validé (RKkzi v7) sont acquises. Celles
marquées « proposé » complètent un manque. Elles sont exactes, mais attendent l'œil de Mathias en
phase 2 (page `/brand`).
