---
id: T-015
titre: Deux modules morts traînent dans le code vivant
domaine: exploitation
gravite: confort
autonomie: libre
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/lib/ambassadeur-mail.ts` (30 lignes, zéro importeur, et les deux seuls TODO du dépôt) et
`src/app/components/ReferralHashRedirect.tsx` (zéro importeur).
Effet : un agent ou un humain qui les lit croit qu'ils servent, et peut les « corriger ».
## Ce que je propose
`git mv` vers `archive/`, avec une ligne dans le README d'archive disant d'où ils viennent.
Jamais de suppression.
## Ce qui a été fait
—
