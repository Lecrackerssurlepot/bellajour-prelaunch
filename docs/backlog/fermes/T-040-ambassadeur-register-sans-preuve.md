---
id: T-040
titre: N'importe qui peut se déclarer ambassadeur à la place d'une cliente
domaine: paiement
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-08-29
ferme: 2026-08-30
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
## Correction de mon propre cadrage
Le code **documentait déjà** ce risque et l'assumait : « cet accès NE prouve PAS la possession de
l'email. On l'accepte car le dashboard ne révèle que des prénoms et un nombre de pages, et le
token est court (1 h). » Je l'avais présenté comme un oubli. Ce n'en était pas un.
Mais ce raisonnement ne pèse que la LECTURE. Il ne dit rien de l'ÉCRITURE — et c'est là qu'était
le défaut : fabriquer une signature de charte horodatée sur la ligne de quelqu'un d'autre.

## Ce qui a été fait
Fait le 30/08/2026, avec l'accord de Mathias.

**Une adresse déjà connue ne se promeut plus depuis le formulaire.** Aucune écriture, aucun
`ref_code` rendu (ce serait le même aveu d'existence que T-045), aucun lien d'accès dans la
réponse. Le lien part par MAIL (A2, template existant — aucun template à créer), et la promotion
a lieu dans la nouvelle route `/api/ambassadeur/confirmer`, quand la personne ouvre le lien :
elle a alors prouvé qu'elle tient la boîte.
Une adresse **inconnue** est inchangée : la ligne est créée par la personne, il n'y a rien à usurper.

**Le point le plus délicat, et il est couvert** : `request-access` envoie un lien magique à
n'importe quelle adresse, saisie par n'importe qui. Si ce lien pouvait confirmer, on aurait
déplacé la faille au lieu de la fermer. Le token de confirmation porte donc une intention
(`p: "confirm"`) que seul `verifyTokenConfirmation` accepte.

**Prouvé par le harnais** — sept assertions ajoutées à `verif-atelier.ts` :
un token de confirmation confirme · **un token d'accès 7 j ne confirme PAS** · **un token court
1 h ne confirme PAS** · un token de confirmation ouvre aussi l'espace · un token trafiqué, `null`
et une chaîne quelconque ne confirment rien.

Écrans : l'inscription affiche « Regardez votre boîte mail » (vérifié rendu à l'écran — fond
crème, titre à `opacity: 1`, élément central de la page) ; l'espace confirme avant de charger.
Le mail de bienvenue A1 part désormais à la VRAIE entrée dans le Cercle, plus au moment où
quelqu'un tape une adresse dans un formulaire.

⚠️ **Reste à éprouver, et cela demande un vrai envoi** : le parcours complet formulaire → mail →
clic → promotion. Je ne l'ai pas joué, pour ne pas envoyer de mail réel. À faire sur la préversion
avec une adresse à toi.
⚠️ Effet de bord assumé : une personne déjà inscrite doit ouvrir son mail avant d'entrer. C'est
la friction que tu as acceptée.
