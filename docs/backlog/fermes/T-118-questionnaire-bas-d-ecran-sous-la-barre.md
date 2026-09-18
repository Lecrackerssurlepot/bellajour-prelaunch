---
id: T-118
titre: Sur mobile, le bas des écrans du questionnaire passe sous la barre fixe, surtout à l'écran du titre
etat: fermé
domaine: composer
gravite: serieux
autonomie: libre
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Problème de scroll sur mobile et peut-être aussi sur desktop. Dans le questionnaire, j'ai eu un
retour client comme quoi on ne voyait pas les infos jusqu'au bout, notamment au moment du choix du
titre. Vérifie sur les deux appareils, et si ce n'est pas présent sur d'autres écrans. »

## Ce que j'ai vérifié (18/09, bellajour.fr en production, 375 × 812 puis 1280 × 720)
Le défilement lui-même fonctionne : la page défile au niveau du document, rien ne le bloque.
Le défaut est ailleurs : **le contenu défile jusqu'au bout, mais le bout est sous la barre fixe.**

Deux causes, toutes deux du commit du 03/09 (`7c6a39aa`, la barre fixe) :

1. **Le « Retour » de la barre n'a jamais été masqué sur mobile.** `composer.css:242` posait
   `.at-q-barre-retour { display: none }` sous 760 px, en (0,1,0). `.bj-atelier .at-q-back`,
   (0,2,0), pose `display: inline-flex` et gagnait. La barre faisait donc 119 px au lieu de 83.
2. **La réserve sous l'écran était un nombre fixe : 110 px** (`padding-bottom` de `.at-q-screen`),
   alors que la barre n'a pas une hauteur fixe. Avec le message d'erreur « Donnez-lui un titre »
   (Continuer sans titre), elle montait à **176 px**.

Mesuré en production, au bout du défilement :
| cas | barre | dernier élément | sous la barre |
|---|---|---|---|
| écran 3 mobile, sans erreur | 119 px | « Aucune préférence » | 8,7 px |
| écran 3 mobile, avec erreur | 176 px | « Aucune préférence » (45 px de haut) | **66 px : le bouton entier** |
| écran 4 mobile, sans erreur | 119 px | « Le prix et la livraison dépendent du pays » | 8,4 px |
| écran 2 mobile | 119 px | l'exemple en italique | visible |
| écran 1 mobile | 83 px | le champ date | visible |
| écran 3 desktop 1280 × 720 | 83 px | « Aucune préférence » | visible (12 px de marge) |

C'est le scénario du retour client : un clic sur « Continuer » sans titre fait apparaître
l'erreur, la barre grandit, et « Aucune préférence / Surprenez-moi » disparaît sous le verre,
même en défilant à fond. Desktop n'est pas touché ; la boîte des modèles y défile seule, comme
prévu (9 modèles, 2 visibles d'emblée : c'est une question d'affordance, pas de défaut).

## Ce qui a été fait (18/09, branche `fix/composer-barre-mobile`)
- `composer.css` : `.bj-atelier .at-q-barre-retour { display: none }` sous 760 px, même
  spécificité que la règle qui le peint. Barre mobile : 119 → 83 px.
- `Composer.tsx` : la barre est MESURÉE (ResizeObserver, rejoué à chaque écran et à chaque
  erreur) et sa hauteur posée en `--at-barre-h` sur `.at-q` ; `composer.css` en fait le
  `padding-bottom` de `.at-q-screen` (hauteur + 20 px, repli 110 px avant la première mesure).
  Aucun setState : la mesure ne re-rend rien.
- `src/app/CLAUDE.md` : piège nº 7 du questionnaire.

Vérifié en local (build de la branche), au bout du défilement : écran 3 mobile sans erreur,
marge de 4,5 px au-dessus de la barre ; **avec erreur, barre 140 px, réserve 161 px, bouton visible
avec 21 px de marge** ; écran 4 mobile 4,3 px ; écran 2 visible ; desktop 1280 × 720 visible.
`tsc` propre, `build` propre. `lint` : 1 erreur PRÉEXISTANTE sur main, sans rapport
(`PanneauAction.tsx:985`, apostrophe non échappée, commit T-117).

## Ce qui reste
Rien sur ce ticket. Non testé sur un vrai iPhone avec le clavier ouvert : la mesure suit la barre,
donc le cas est couvert par construction, pas par preuve.
