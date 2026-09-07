---
id: T-098
titre: Un M4 refusé par Brevo figeait le dossier payé pour toujours
domaine: atelier
gravite: bloquant
autonomie: libre
ouvert: 2026-09-04
---

## Le défaut, trouvé en auditant la chaîne des mails (04/09)

M4 (« paiement reçu ») part au webhook Stripe, à la seconde du paiement. S'il échoue, la
garantie nº3 de `mails.ts` retire le verrou pour qu'une relève réessaie — **mais aucune relève
ne repassait jamais** : `payee` n'était pas dans `ETATS_BALAYES`, et `codesPour` rend
volontairement zéro code pour cet état (pour ne pas envoyer « paiement reçu » avec des jours de
retard à un dossier forcé à la main pendant les tests). La raison était bonne, sa conséquence
non.

Ce que ça produisait, en cascade, sur un dossier PAYÉ :

- M5 exige M4 (garde-fou de chaîne) → la maquette publiée n'est jamais annoncée ;
- `doitAutoValider` exige M5 → l'auto-validation à J+7 refuse de jouer ;
- le dossier dort indéfiniment, et **aucun écran ne le dit** : la page santé ne montre l'échec
  que sept jours, et son remède promettait texto que « la relève réessaiera seule ». C'était
  faux, pour ce mail-là et pour lui seul.

## Ce qui a été fait (04/09)

- **`doitRattraperM4` (`src/lib/atelier/mails.ts`)** — fonction pure. La réparation se décide
  sur la **preuve** de l'échec (une ligne `mail_echec` de code M4 dans le journal du dossier),
  jamais sur l'état seul : un dossier forcé en `payee` à la main n'a pas cette ligne, donc ne
  reçoit rien. L'intention d'origine est intacte.
- **Deux états seulement** : `payee` et `maquette_prete`. Le second parce que l'atelier compose
  souvent dans la journée, donc avant le passage suivant du balayage. Au-delà (validée, en
  production, expédiée, livrée), on ne réveille plus la chaîne : envoyer « paiement reçu » puis
  « votre maquette est prête » à quelqu'un dont le magazine est parti serait pire que le silence.
- **`/api/atelier/mails/relever`** — `payee` entre dans les états balayés, et une requête (une
  seule, et seulement s'il existe un dossier payé sans M4) va chercher les échecs journalisés.
  Une lecture ratée ne répare rien : jamais d'envoi sans preuve.
- **Harnais** : 6 assertions neuves (`verif-atelier.ts`), toutes vertes. `tsc`, `lint`, `build`
  verts.

## État

`à fermer` — corrigé, vérifié, à merger.
