---
id: T-040
titre: N'importe qui peut se déclarer ambassadeur à la place d'une cliente
domaine: paiement
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de sécurité du 29/08/2026.
## Ce que j'ai vérifié
`src/app/api/ambassadeur/register/route.ts:88-113` et `:218`. La route n'exige **aucune preuve
que l'on possède l'adresse**. Un simple POST `{prenom, email, charte_accepted:true}` avec
l'adresse de n'importe quelle cliente :
- pose `is_ambassadeur = true` sur SA ligne `waitlist` ;
- écrit `ambassadeur_consent_at` et `ambassadeur_charte_version` à la date du jour ;
- **renvoie dans la réponse HTTP un `dashboard_url` signé, valable une heure** (`signTokenShort`).
Avec ce lien, `/api/ambassadeur/me` rend son prénom, son `ref_code`, ses pages confirmées et
**les prénoms de ses filleules**.
Et si elle était déjà ambassadrice, `wasAlreadyAmbassador` vaut vrai, donc le mail A1 ne part
pas : **elle n'est jamais prévenue**.
Deux dommages distincts. Le premier : qui connaît l'adresse d'une des quatorze fondatrices lit
son tableau de bord de parrainage en une requête. Le second, plus grave à froid : on détient en
base une signature de charte horodatée qu'elle n'a jamais donnée — un consentement fabriqué par
un tiers, qu'on produirait comme preuve si elle contestait.
⚠️ La route voisine `/api/ambassadeur/request-access` fait l'inverse et bien : elle répond
volontairement `neutral` et envoie le lien PAR MAIL, à l'adresse concernée.
## Ce que je propose
Ne plus jamais rendre le lien dans la réponse HTTP : l'envoyer par mail, comme `request-access`.
Le lien arrive alors à celle qui possède l'adresse, et la fabrication de consentement disparaît
avec lui. C'est une correction de quelques lignes, mais elle **change le parcours d'inscription
ambassadeur** — d'où l'avis requis.
**Question pour Mathias** : d'accord pour que l'inscription ambassadeur ne donne plus l'accès
immédiatement, mais envoie un lien par mail ? C'est une friction de plus à l'inscription, et
c'est ta décision commerciale autant que technique.
⚠️ À traiter avec T-005 (l'ancien mot de passe partagé) : ce sont les deux portes ouvertes du
dépôt.
## Ce qui a été fait
—
