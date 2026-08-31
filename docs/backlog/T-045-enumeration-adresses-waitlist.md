---
id: T-045
titre: On peut savoir qui est cliente de Bellajour, avec son prénom
domaine: paiement
gravite: serieux
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/waitlist/route.ts:246-253` — un POST non authentifié `{email, check_only:true}`
répond `already_registered` **avec le `ref_code` de la personne**, et sans `check_only` il ajoute
son `prenom`. Aucune neutralisation de la réponse.
La route voisine `/api/ambassadeur/request-access:19` répond exprès `neutral` à la même question :
la bonne pratique est donc déjà connue et appliquée ailleurs dans le dépôt.
Un tiers passe une liste d'adresses et apprend qui est cliente, avec son prénom. Le seul frein est
la `Map` en mémoire dont T-008 établit qu'elle ne tient pas sur Vercel.
## Ce que je propose
Répondre pareil dans les deux cas, comme `request-access`. ⚠️ Vérifier d'abord ce que le
formulaire d'inscription fait de `already_registered` : si l'écran s'en sert pour dire « vous êtes
déjà inscrite », neutraliser la réponse change ce que voit une vraie cliente. Il faut alors
déplacer ce message vers le mail, pas le supprimer.
## Ce qui a été fait
31/08/2026 — Confirmé (`src/app/api/waitlist/route.ts:246-253` répondait `already_registered` +
`ref_code`, et `prenom` sans `check_only`), puis neutralisé :
- Vérifié d'abord QUI consomme la différence : **personne côté vivant**. Le seul appelant de
  `check_only` / `already_registered` est `archive/landing-waitlist/FinalWaitlist.tsx` (archivée) ;
  rien dans `src/` ne fetch `/api/waitlist`. Aucun parcours légitime à préserver — si la landing
  ressuscite, le « vous êtes déjà inscrite » devra passer par un mail, pas par cette réponse.
- `check_only` → `{ ok: true }` (200) AVANT toute lecture en base, adresse connue ou non.
- Email déjà inscrit (ou course 23505 perdue) → `{ success: true }` (200), même corps qu'une
  vraie inscription, plus `delaiNeutre()` (500–1200 ms) pour rapprocher la durée du chemin
  complet — approximatif et dit comme tel, les appels Brevo varient.
- Le `ref_code` ne repart plus dans la réponse du succès non plus : sa présence aurait
  distingué une inscription neuve d'une adresse connue. Il compte là où il a toujours compté,
  dans le mail W1/P1. Le `prenom` ne sort plus jamais.
- Aucun mail ne part sur une adresse déjà inscrite : rien de nouveau à envoyer, rien envoyé.
