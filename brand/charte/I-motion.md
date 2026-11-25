# I. Motion

## Courbes et durées

| Jeton | Valeur | Pour |
|---|---|---|
| `courbe.sortie` | cubic-bezier(.2, .7, .2, 1) | **La courbe de la maison** : tout ce qui entre |
| `courbe.bascule` | cubic-bezier(.7, 0, .2, 1) | Ce qui couvre l'écran (menu) |
| `duree.micro` | 200 ms | Appui, survol |
| `duree.standard` | 450 ms | Feuille, bandeau |
| `duree.menu` | 550 ms | Menu plein écran |
| `duree.entree` | 900 ms | Apparition d'un bloc au défilement |
| `duree.decalage` | 80 ms | Entre deux éléments d'une même apparition |

## Apparition au défilement

- **Mouvement** : `translateY(24px)` vers 0 (`mouvement.entree-distance`), opacité de 0 à 1, `duree.entree`, `courbe.sortie`.
- **Déclencheur** : `IntersectionObserver`, quand 12 % du bloc est visible *(proposé)*. Il joue une seule fois.
- **Décalage** entre frères : 80, 160, puis 240 ms. Jamais plus de trois.

## Défilement narratif (GSAP ScrollTrigger)

- **L'ouverture du livre** : épinglée, suit le défilement avec un lissage `scrub` de 0,8.
- **La pile qui devient la frise** : `scrub` de 0,7.
- **Sur téléphone**, la frise défile horizontalement au même geste.
- **Retour au clic** : `scale(.97)` en `duree.micro` sur tout bouton.
- **Transitions de page** : aucune. Une navigation est immédiate.
- **Parallaxe** : seulement sur les images de la page Groupes, avec une amplitude réduite à 30 % sur téléphone (`amp` de 0,3 dans le banc).

## Téléphone

La motion est **la même que sur ordinateur** (décision : le trafic vient d'Instagram sur iPhone,
et la motion fait partie du produit). Seules les mesures s'adaptent :
- la longueur de la pile : 440 % contre 330 % ;
- la taille du livre : 92vw.

## Moins d'animations (`prefers-reduced-motion: reduce`)

**Règle tranchée** : ce qui **joue seul** se coupe ; ce qui **suit le doigt** reste.

| Coupé ou posé directement | Gardé |
|---|---|
| Apparitions `.rv` (posées visibles), boucles infinies (souffle, curseur clignotant, démos), titre construit lettre par lettre, flou, défilement doux, parallaxe | L'ouverture du livre et la pile, qui avancent seulement si la personne fait défiler : c'est elle qui conduit |

**Ce qui change** : l'ancien `docs/marque/MOTION.md` disait « `prefers-reduced-motion` coupe tout ». La V2 gagne ; c'est signalé à Mathias le 25/11.

**Pourquoi.** Ce réglage est activé sur les appareils de Mathias. Couper tout l'avait fait
« disparaître » la pile (lot 5, 24/11). Une animation pilotée par le doigt ne surprend personne.

## Budget

- **Seuls `transform` et `opacity` s'animent.** Jamais `top`, `width`, `height` ni `filter`. Le flou du titre construit sera remplacé en phase 4.
- **60 images par seconde** visées sur un iPhone récent. Pas de minuterie `requestAnimationFrame` permanente sans raison : le suiveur de souris ne tourne que sur un pointeur fin.
- **GSAP 3.12.5** est chargé une seule fois, seulement sur les pages qui l'utilisent.
