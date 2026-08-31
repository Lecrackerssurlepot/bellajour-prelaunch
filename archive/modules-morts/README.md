# Modules morts — retirés du code vivant, jamais supprimés

Archivés le 31/08/2026 (T-015). Zéro importeur au moment du déplacement, vérifié par grep
exhaustif sur `src/`, `scripts/`, `supabase/`, `n8n/`. Ils reviennent par un `git mv` inverse.

| Fichier | Venait de | Ce qu'il faisait |
|---|---|---|
| `ambassadeur-mail.ts` | `src/lib/ambassadeur-mail.ts` | Deux hooks d'envoi mail du Cercle Ambassadeur, jamais branchés sur Brevo (les deux seuls `TODO` du dépôt). Aucune route ne les appelait. |
| `ReferralHashRedirect.tsx` | `src/app/components/ReferralHashRedirect.tsx` | Ajoutait `#finalwaitlist` quand la page était chargée avec `?ref=` — un composant de la landing waitlist, plus monté nulle part. |

Pourquoi archiver plutôt que laisser : un module orphelin qui a l'air vivant finit « corrigé »
par quelqu'un qui croit qu'il sert. Pourquoi archiver plutôt que supprimer : interdit nº4 du
socle — on déplace, on ne supprime pas.
