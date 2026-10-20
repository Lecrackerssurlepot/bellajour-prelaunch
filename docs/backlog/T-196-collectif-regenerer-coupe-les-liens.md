---
id: T-196
titre: Régénérer le lien des participants coupe d'un coup tous les liens de contribution, sans prévenir
etat: en cours
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-20
---
## Ce que Mathias a dit
« Il doit prendre en compte tout, prévoir toutes les étapes qui vont arriver, prévoir toutes les
failles qu'il peut y avoir, toutes les dispositions à prendre en avance. Il faut se projeter pour
ne pas être surpris. » (20/10/2026, à propos d'Audencia : 8 bateaux, 80 participants)

## Ce que j'ai vérifié
- Un lien de contribution est `/depot/<token_depot>?p=<clé>`
  (`src/app/api/collectif/provenances/route.ts:88`), et l'accès se cherche par `token_depot`
  (`src/lib/collectif/acces.ts:48`).
- « Régénérer » le lien des participants (atelier, `src/app/api/admin/collectif/editions/[id]/lien/route.ts`)
  change `token_depot` : les huit liens des bateaux meurent avec lui, et l'écran ne le dit pas.

## Ce que je propose
Avant le geste, dire combien de liens de contribution il coupera, et proposer à la place de
retirer seulement le lien général. Ou faire vivre les liens de contribution sur leur seule clé.

## Ce qui a été fait
20/10, lot a2 (worktree `agent-a50f52eeeeed6d02d`, non commité) :
- « Régénérer… » vérifie d'abord (`POST …/lien { quel, verifier: true }`, rien n'est écrit) :
  pour le lien des participants, combien de liens de contribution ACTIFS tombent avec lui
  (compte exact sur `collectif_provenances`, `retire_le` vide, repli 42703 sans la colonne),
  et le mail qui préviendra le responsable (à qui, quel objet, mails ouverts ou coupés), avec
  « Voir le mail ». Puis « Confirmer ». La régénération est conditionnée à l'ancien lien (409
  si un autre écran l'a changé entre-temps).
- Décision de Mathias : quand l'ATELIER régénère le lien du responsable ou des participants, un
  mail au responsable (« Votre lien a changé » / « Le lien des participants a changé »,
  `mailLienRegenere`, mailsTextes.ts) par `envoyerMailCollectif`, verrou `LIEN-<quel>-<empreinte
  du nouveau token>`, dans un `try` : il ne fait jamais échouer le geste. `COLLECTIF_MAILS` fermé :
  rien ne part, l'écran le dit. Aperçu : `GET …/lien?quel=depot|responsable`. Le lien de
  l'équipe ne prévient personne ; un lien de bateau supprimé par le responsable non plus.
- Le lien mort a sa page : « Ce lien ne fonctionne plus » / « Demande (Demandez) le nouveau lien
  à l'organisateur. » (`depot/[token]/not-found.tsx`, `LienMort.tsx`), toujours en 404, la même
  pour un lien inconnu, archivé, régénéré ou supprimé. Le registre vient du layout du token
  (`lecture.ts`) : l'édition actuelle (y compris archivée), ou un ANCIEN lien retrouvé par son
  empreinte dans le journal (`lien_regenere`, `payload.ancien`, posé à partir de ce lot, jamais
  le token). Le moteur d'envoi dit la même phrase si le lien meurt pendant un envoi.
- Le journal dit combien de liens de contribution ont changé avec le lien des participants.
- Harnais : section « LOT a2 » de `verif-collectif.ts`. Captures : `a-lien-mort-inconnu-vous.png`,
  `b-lien-mort-edition-tu.png`, `h-regenerer-verification.png` (réponse de vérification
  SIMULÉE, aucun POST n'a atteint le serveur), `i-apercu-mail-participants.png`,
  `i2-apercu-mail-responsable.png`.
- Non fait (proposé par la fiche) : faire vivre les liens de contribution sur leur seule clé ;
  retirer seulement le lien général. Le texte des deux mails attend la relecture de Mathias.
