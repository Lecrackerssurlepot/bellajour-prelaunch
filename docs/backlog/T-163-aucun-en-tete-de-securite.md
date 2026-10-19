---
id: T-163
titre: Le site n'envoie aucun en-tête de protection, l'atelier peut être affiché dans la page d'un autre site
etat: nouveau
domaine: exploitation
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- 19/10, `curl -D -` sur `https://www.bellajour.fr/admin/login` : seul
  `strict-transport-security` est présent (posé par la plateforme). Ni `Content-Security-Policy`
  (`frame-ancestors`), ni `X-Frame-Options`, ni `X-Content-Type-Options`, ni `Referrer-Policy`.
- `next.config.ts` ne déclare des en-têtes que pour le cache de `/images/*`.
- Scénario : une page tierce encadre `/admin/atelier` pendant que Mathias ou Louis y est
  connecté, et fait cliquer sur un geste d'écriture (envoi à l'impression, transition). Même
  chose pour l'espace d'une édition (`/edition/<token>`), dont le lien circule.

## Ce que je propose
Commencer sans rien casser : `X-Frame-Options: DENY` (ou `frame-ancestors 'none'`),
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` sur tout le
site (`/edition` et `/depot` gardent leur `no-referrer`). Puis une CSP en mode « rapport seul »
le temps de recenser ce que les pages chargent vraiment (Stripe, R2, polices, Brevo), avant de
l'appliquer.

## Ce qui a été fait
Rien encore.
