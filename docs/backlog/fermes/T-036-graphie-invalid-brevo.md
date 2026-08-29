---
id: T-036
titre: Un rebond « invalid » pourrait être ignoré en silence
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-29
---
## Ce que Mathias a dit
Rien — trouvé en relisant le commit des rebonds Brevo, écrit par une autre session.
## Ce que j'ai vérifié
`src/lib/atelier/rebond.ts:55` — `REBONDS = {"hardbounce", "invalidemail", "blocked"}`.
`docs/reference/ETAT-PRODUCTION.md:42` prescrit d'abonner le webhook aux événements
`hardBounce`, `blocked`, **`invalid`**, `spam`.
Or `normaliser("invalid")` rend `"invalid"`, qui **n'est pas dans l'ensemble**. Si Brevo émet
`event: "invalid"` et non `"invalid_email"`, le signal est classé « ignore », rien n'est écrit,
et personne ne le sait. C'est exactement le mode de panne que ce commit voulait supprimer.
Le disque ne peut pas trancher quelle graphie Brevo envoie réellement.
## Ce que je propose
Accepter les deux graphies. Une entrée de plus dans un ensemble de chaînes d'un module pur, sans
risque : un `invalid` qui n'arriverait jamais ne coûte rien, un `invalid` ignoré coûte une
cliente. Ajouter l'assertion correspondante au harnais.
## Ce qui a été fait
—
