# Motion

> **Remplacé le 25/11/2026 par la charte V2 : [`brand/charte/README.md`](../../brand/charte/README.md).** Ce fichier décrit l'ancienne charte ; il reste lisible jusqu'au nettoyage (phase 7), mais n'est plus à suivre.


Le code (`src/app/(atelier)/theme.css`, `src/app/tokens.css`) et le skill `bellajour-brand-motion` (Brand Guidelines & Motion System) disent presque la même chose sur le mouvement. Ce qui suit est **ce que le code fait** ; l'écart avec le skill est signalé.

## Le tempo

- **Lent et délibéré** : chaque élément arrive comme s'il avait attendu le bon moment. Jamais d'urgence marketing, jamais de boucle infinie, pas de particules, pas de confettis (skill, §1 et §5).
- **Durée de base 240 ms**, courbe `cubic-bezier(0.4, 0, 0.2, 1)` : survols, appuis, fonds qui changent (`--dur`, `--ease` en sombre ; `--bj-dur`, `--bj-ease` en crème et admin). Micro-interactions de l'admin : 180 ms (`--bj-dur-fast`).
- **Le récit** (ouverture et univers des pages publiques) : 700 ms (`--t-reveal`), 800 ms (`--t-lux`), 1200 ms (`--t-lent`), 1700 ms (`--t-tres-lent`). Courbes `--ease-out` `cubic-bezier(0, 0, 0.2, 1)`, `--ease-spring` `cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-recit` `cubic-bezier(0.23, 1, 0.32, 1)`. **Aucune n'est un ease-in** : une interface qui démarre lentement paraît lente à l'instant où l'œil regarde le plus.
- **L'appui mobile** : `scale(0.98)`, retour en 120 ms sous `(hover: none)` (PRD §15).
- **La bascule jour / nuit** de l'espace client : 300 ms `ease` sur `background-color` et `color`.

## Les mouvements du code

1. **Révélation au défilement** (`.at-rv`) : `opacity: 0` + `translateY(24px)` → `is-in`, 700 ms, une seule fois. Déclenchée par `IntersectionObserver` et `requestAnimationFrame`, **sans librairie**. Un filet sans JavaScript (`html:not([data-anim]) .at-rv`) rend tout visible si le script n'a pas tourné : le trafic vient d'Instagram, dont le navigateur intégré étouffe parfois le bundle. Un chien de garde retire l'attribut au bout de 5 s.
2. **Le séquenceur de l'accueil** : l'attribut `data-t` d'un élément est son instant en ms dans la séquence de sa page. Pour régler un timing on change cet attribut, rien d'autre. Il pose `transition-delay` ET `--retard` (le glitch de la page 02 est une animation sur deux pseudo-éléments, qui ignore `transition-delay`).
3. **Le CTA** : `scale(1.02)` au survol, fond qui passe à `--c-text-pure`, et la lueur `--glow-accent` portée par un `::after` à ombre FIXE dont on anime la seule opacité. **`box-shadow` ne s'anime jamais** (PRD §15). Pas de `will-change` permanent : la transition promeut la couche le temps qu'elle dure.
4. **La barre de tête** : le fond fond en 1200 ms (`--glass-bg-strong` → `--glass-bg-plein` une fois défilée), **le `padding` ne s'anime pas** : la barre est fixe avec un flou d'arrière-plan et chaque frame forçait une re-rastérisation du flou (D5).
5. **Le tri** : `scale(0.93)` à l'appui d'un rond, 120 ms ; fond et bord en 150 ms ; la barre flottante apparaît en 150 ms (`ed-fondu`).

## Les règles de performance (code et skill d'accord)

- N'animer que `opacity` et `transform`. Jamais `width`, `height`, `margin`, `padding`, `box-shadow`.
- `IntersectionObserver` pour ce qui entre dans l'écran, `requestAnimationFrame` pour ce qui suit le défilement. Jamais d'écouteur de défilement brut, jamais de `scrollIntoView` sur un plein écran.
- `prefers-reduced-motion: reduce` : animations et transitions à 0,01 ms, `.at-rv` visible. C'est la **seule** barrière : le mobile reçoit le même mouvement que l'ordinateur (le motion est le produit, le trafic est Instagram / iPhone).
- Pas de `backdrop-filter` animé, pas de flou sur un `position: fixed` sur Android (repli `.pv-nav--flat`).

## Le lexique du skill, et ce que le code en retient

| Effet du skill | Paramètres du skill | Dans le code |
| --- | --- | --- |
| Lux fade (apparition) | 800 ms, `translateY(16px)`, stagger 120 ms, ease-out | `--t-lux` 800 ms existe ; `.at-rv` fait 700 ms et 24 px. Deux déplacements pour le même geste : À trancher. |
| Slide reveal (encarts) | 700 ms, `cubic-bezier(0.16, 1, 0.3, 1)`, blur 4 px → 0, stagger 80 ms | La courbe est `--ease-spring` ; le flou de matérialisation n'est pas dans le code. |
| Fade separator / Light bleed | filet de 1 px en dégradé entre sections | Contredit la direction du 15/10 (« pas de filets entre sections : de l'espace et des plans »). À trancher. |
| Drum roll (chiffres) | 1200 ms, seuil 0,3, une seule fois | Non implémenté. |
| Glass panel | blur 20 px saturate 1,2, bord à 0,15, rayon 12 px, « pas plus de 2 par vue » | Le code : flou 20 à 32 px, bord à 0,08 / 0,12 / 0,95, rayons 20 à 28 px, et l'espace client est fait de panneaux de verre. La règle « 2 par vue » et le rayon 12 ne tiennent plus. À trancher. |
| Depth layer (3 plans) | fond / mi-plan / typographie | L'ouverture et l'univers de l'accueil sont bâtis ainsi. |
| Horloge canvas | 200 × 200, trotteuse fluide | Non implémentée. |

Le skill fixe aussi « aucune animation sous 400 ms perceptible, minimum 600 ms » : le code tient 240 ms pour les interactions et 700 ms et plus pour le récit. La distinction interaction / récit n'est pas écrite dans le skill : À trancher.
