---
id: T-014
titre: Le sitemap ment sur ses dates
domaine: front
gravite: confort
autonomie: libre
ouvert: 2026-08-29
ferme: 2026-08-31
---
## Ce que Mathias a dit
Rien — audit du 29/08/2026.
## Ce que j'ai vérifié
`src/app/sitemap.ts:25-27` — `MAJ_ACCUEIL`, `MAJ_LEGALES`, `MAJ_PRODUIT` sont des constantes
écrites à la main. Elles ne bougent que si quelqu'un y pense, donc elles se périment en silence.
## Ce que je propose
Soit les dériver du dernier commit touchant chaque zone, soit les retirer : un `lastModified`
faux est pire qu'absent. Je penche pour le retrait, sauf si Google en tire un bénéfice mesurable
sur un site de six URL — il n'en tire aucun.
## Ce qui a été fait
**31/08/2026 — CONFIRMÉ, corrigé par le retrait.**
Les constantes dérivaient déjà : `MAJ_ACCUEIL` disait le 27/08 alors que la refonte de
l'accueil est en production depuis le 28/08. C'est exactement la panne annoncée : une date
écrite à la main ne bouge que si quelqu'un y pense.
Dériver du dernier commit a été écarté : Vercel builde sur un clone superficiel, `git log`
y renverrait la date du dernier commit visible — un mensonge neuf, silencieux lui aussi.
Fait : retrait pur et simple des trois constantes et de tous les `lastModified`
(`src/app/sitemap.ts`), commentaire posé qui explique le choix. `changeFrequency` et
`priority` inchangés.
Preuve : `.next/server/app/sitemap.xml.body` du build du 31/08 — six `<url>`, zéro `<lastmod>`.
