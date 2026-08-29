---
id: T-054
titre: Une photo qui n'est pas partie ne se voit pas, et le bouton reste actif
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit d'accessibilité du 29/08/2026.
## Ce que j'ai vérifié
`Screen5Depot.tsx:80` — `pretAEnvoyer` ne regarde que `confirmees`, `enVol` et `consent` :
**un échec ne bloque pas le bouton.**
Et l'échec ne se voit presque pas : l'état d'une photo n'existe que dans `data-etat` (`:273-312`),
`depot.css:222` et `:270` ne changent qu'une opacité et une couleur de bordure, le `✓` (`:299`) et
la barre de progression (`:294`) sont `aria-hidden`, et `moteur.ts` ne pose de `role="status"` que
pour les pannes globales, jamais pour une photo.
Une cliente daltonienne ou au lecteur d'écran dépose 55 photos, 3 échouent, **rien ne le lui dit
et le bouton l'invite à envoyer**. L'atelier compose avec 52 photos, et les 3 manquantes sont
peut-être les seules où sa grand-mère apparaît.
⚠️ Rappel du dépôt replié : une photo en erreur n'est JAMAIS repliée, elle porte le seul bouton
« Reprendre ». Le mécanisme existe donc — c'est sa perception qui manque.
## Ce que je propose
Un état d'échec qui se lit sans la couleur (un mot, pas seulement une bordure), une annonce
`role="alert"` au premier échec, et un bouton qui dit ce qu'il va faire quand il reste des
échecs — soit il bloque, soit il annonce « envoyer 52 photos sur 55 ». Bloquer sans expliquer
serait pire.
## Ce qui a été fait
—
