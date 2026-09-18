---
id: T-116
titre: M0 « il attend vos photos » arrive à la seconde, pendant que le client est encore en train de déposer
etat: fermé
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-17
---
## Ce que Mathias a dit
« Pourquoi M0 s'envoie directement d'ailleurs, C'est pas à envoyé quand la personne n'a pas
envoyé ses photos ? On devrait je pense mettre en place un délai. »

Puis, après la relecture de D16 : « Ok ouvre le ticket et prépare le texte ! On revoit juste la
partie ce lien et le sien pour toute sa vie. On ne comprend pas. Tu mets juste votre numéro est
ouvert. Vous pouvez déposer les photos maintenant pour votre composition. Ou bien reprendre plus
tard. Pas vous arrêter ni rien. C'est bizarre ça. Et en plus de ça, je me dis qu'en fait, c'est
mieux de laisser le mail tel qu'il était avant, juste de le déclencher 15 minutes après que la
personne ait envoyé ses contacts. Et que si dans les 15 minutes après avoir eu ses contacts, elle
n'a pas déposé ses photos. Ça me paraît plus logique. Donc, tu peux mettre ça en place. »

Le cas déclencheur, vu en base le 17/09 : Merisa a reçu M0 (« Madeira 2026 est ouvert, il
attend vos photos ») à 15:24:39 UTC, et ses 92 photos sont entrées entre 15:34 et 15:35.

## Ce que j'ai vérifié
- **Le constat est réel.** Base de prod, 17/09 : Merisa, dossier créé à 15:24:38 UTC, ligne
  `mail_envoye` M0 à 15:24:39, 92 lignes `photos` entre 15:34:30 et 15:35:08. Le mail « il attend
  vos photos » est bien parti avant la première photo, pendant le dépôt.
- **La relève ne peut pas porter le délai** : `codesPour` n'est balayé qu'une fois par jour
  (`vercel.json`, Hobby), tout mail qu'elle diffère arrive le lendemain matin (D16, mesuré).
- **Brevo sait le faire** (centre d'aide, relu le 17/09) : `scheduledAt` sur `POST /v3/smtp/email`
  (jusqu'à 72 h à l'avance, aléa annoncé de +5 min), `DELETE /v3/smtp/email/{messageId}` rend 204
  quand le message est retiré. Le `messageId` revient dans la réponse du POST.
- **Non prouvé** : que la programmation soit ouverte sur le compte de Bellajour (aucune restriction
  de plan n'est écrite dans la doc, mais je ne l'ai pas éprouvé : aucun mail réel sans accord), et
  le code exact que Brevo rend à l'annulation d'un message déjà parti (le code est gardé brut
  dans le journal pour le relire sur le premier cas).

## Ce que je propose
Deux volets, une seule décision de Mathias, déjà prise :

1. **Le délai.** M0 part 15 minutes après la fin de l'écran 4, et seulement si aucune photo n'est
   arrivée entre-temps. La relève quotidienne ne sait pas faire (D16 : tout mail différé par elle
   arrive le lendemain matin, entre 12 et 31 h plus tard). Le mécanisme candidat est la
   programmation Brevo : `scheduledAt` sur l'envoi transactionnel (jusqu'à 72 h à l'avance),
   `DELETE /v3/smtp/email/{messageId}` pour annuler avant l'heure. À la création du dossier on
   programme M0 pour +15 min et on garde le `messageId` ; à la première photo confirmée
   (`/api/atelier/photos/complete`) ou au clic « Envoyer à l'atelier », on annule. Brevo annonce
   un aléa de +5 min sur l'heure programmée : M0 arrivera entre 15 et 20 min.
2. **Le texte.** Le mail garde son sens (« il attend vos photos ») mais la phrase du lien devient :
   « Votre numéro est ouvert. Vous pouvez déposer les photos maintenant pour votre composition, ou
   bien reprendre plus tard. » Le pied garde « Gardez ce message : le lien ci-dessus est celui de
   votre numéro » si Mathias le veut, sans « pour toute sa vie ».

À garder intact : le verrou `mails_envoyes` (posé à la programmation, pas à l'arrivée), le filet
de la relève borné à `DELAI_RELANCE_DEPOT` (D16, cinq assertions au harnais), la garantie nº5 des
`PARCOURS-INVARIANTS` réécrite pour dire « M0 est programmé à la seconde » plutôt que « part à la
seconde ». Un M0 annulé doit se lire dans le journal (`mail_annule`), sinon la fiche admin
affichera un mail « envoyé » que personne n'a reçu.

## Ce qui a été fait
17/09, branche `feat/m0-differe` :
- `src/lib/atelier/programme.ts` (pur) : `M0_DIFFERE_MS`, `dateProgrammee`,
  `identifiantBrevoPourUrl`, `messageAAnnuler` (lit le journal), `verdictAnnulation`.
- `src/lib/brevo.ts` : `sendBrevoEmailDetail` (rend le `messageId`, accepte `scheduledAt`),
  `deleteBrevoScheduledEmail` ; `sendBrevoEmail` inchangé pour ses appelants.
- `src/lib/atelier/mails.ts` : `envoyerMailAtelier(..., { differeMs })` programme au lieu
  d'envoyer, journalise `mail_programme`, rend `statut: "programme"` ; `annulerMailProgramme`.
- `POST /api/atelier/numero` : M0 différé de 15 min. `PATCH` (consentement) : annule M0 avant M1.
  `POST /api/atelier/photos/complete` : annule M0 au premier lot confirmé.
- `recit.ts` : deux lignes de journal lisibles (programmé pour HH:MM ; retiré / trop tard / échec).
- `scripts/mails-atelier.mjs` : le texte de M0 (fin et pied). **Template 38 poussé le 18/09**, sur
  accord de Mathias, borné à M0.
- Harnais : 19 assertions T-116, les cinq de D16 intactes. tsc, lint (0 erreur), build : voir la PR.
- Docs : PARCOURS-INVARIANTS (garantie 5), api/CLAUDE.md, atelier/CLAUDE.md, CRON-RELEVE.md,
  ETAT-PRODUCTION.

18/09 : PR #162 fusionnée, en production à 10 h 19 ; template poussé à 10 h 51, relu en ligne.
**Fermé le 18/09 par Mathias** (« on peut clôturer le sujet »). Le mécanisme est prouvé chez Brevo en
bac à sable (programmation en file, annulation 204, message disparu) ; le premier dossier réel
l'écrira dans son journal (`mail_programme` puis `mail_annule`), à regarder en passant, sans ticket.
