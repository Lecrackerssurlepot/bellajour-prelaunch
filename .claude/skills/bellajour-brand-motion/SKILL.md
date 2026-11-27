---
name: bellajour-brand-motion
description: "Charte graphique et motion de Bellajour (V2). Se déclenche dès qu'une tâche touche à ce qui se voit : page, composant, animation, transition, défilement, mail, PDF, visuel, post, mockup, couleur, police, logo, ou « rendre le site plus beau ». Renvoie à la charte du dépôt (brand/), seule source ; ne contient aucune valeur."
---

# Bellajour : charte et motion

Ce skill ne porte **aucune valeur** : la charte vit dans le dépôt, à un seul endroit.

1. Lire `brand/README.md` (où est quoi), puis `brand/charte/README.md` (les 16 règles d'or et les fiches A à O ; règle 16 : tout magazine montré passe par le modèle 3D).
2. Lire la fiche de la tâche : couleurs C, typo D, espacements E, formes F, composants H, **motion I**, médias et 3D J, gabarits K, mails et réseaux N. **Créer un mail : demander d'abord quelle structure (atelier, lettre, magazine, simple, fiche N « Les structures de mails »).**
3. Valeurs : `brand/tokens.json`, en CSS `var(--m-…)` depuis `brand/build/tokens.css`. Jamais une couleur ou une taille en dur.
4. Référence visuelle unique : `brand/reference/duplicata-essai-photos.html`. Porter une page = captures côte à côte avec elle.
5. Un magazine en volume ou animé = le modèle `brand/assets/3d/magazine/`, jamais des faces CSS.

**Interdits** : modifier une règle validée sans l'accord de Mathias ; inventer un chiffre, un prix, un délai ou une mesure ; ressusciter l'ancienne charte (crème, cuivre, Porcelaine, Charbon, Cormorant, Playfair), rangée dans `archive/`.

Après une modification de valeur : `node brand/scripts/build-tokens.mjs` puis `node brand/scripts/contrastes.mjs`. Contrôle : `node brand/scripts/controle-charte.mjs`.
