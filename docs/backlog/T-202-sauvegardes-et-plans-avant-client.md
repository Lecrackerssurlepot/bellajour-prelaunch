---
id: T-202
titre: Les sauvegardes de la base et des photos, et les plans d'hébergement adaptés à un usage commercial, ne sont pas confirmés avant le premier vrai client
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- `docs/reference/ETAT-PRODUCTION.md` note le passage aux plans payants Supabase (sauvegardes) et
  Vercel « avant le premier vrai client » ; rien ne le dit fait (20/10).
- Le coffre R2 n'a ni historique des versions ni copie dans le code ; l'archivage garde tout,
  mais une suppression ou une erreur d'écriture serait définitive.

## Ce que je propose
Mathias vérifie son plan Supabase (sauvegardes quotidiennes ou restauration à un instant) et
le plan Vercel ; je documente la marche de restauration et j'en fais un essai sur une copie.
Dépense : avis requis.

## Ce qui a été fait
Rien encore.
