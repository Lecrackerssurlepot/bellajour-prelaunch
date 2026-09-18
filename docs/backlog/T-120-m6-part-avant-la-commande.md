---
id: T-120
titre: Le mail « part à l'impression » (M6) arrive au client avant que la commande d'impression n'existe
etat: en cours
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Donc le mail "part à l'impression" part avant qu'on l'ait vraiment envoyé ? »

Constat posé à l'ouverture : le mail M6 « part à l'impression » part au clic de validation du
client (transition `maquette_prete` → `validee`), pas à la commande Cloudprinter
(`envoyer_impression` n'envoie rien ; `transitions.ts` note « il a déjà été prévenu »). Merisa a
reçu « votre numéro a quitté l'atelier pour l'imprimeur » le 17/09 à 19:52 alors qu'aucune
commande n'existe (`cloudprinter_order_id` null, aucun PDF déposé). Le texte ment sur le
moment : soit M6 devient un accusé de validation honnête (« validé, nous préparons les fichiers
pour l'imprimeur »), soit il se déplace sur `envoyer_impression`. Changement de texte de mail =
template Brevo à repousser, accord de Mathias requis.

## Ce que j'ai vérifié
`codesPour` (`src/lib/atelier/mails.ts`, case `validee`) rendait M6 dès que M5 était parti ;
`/api/atelier/valider` appelle `releverDossier` dans la seconde du clic, donc M6 partait au clic.
L'action `envoyer_impression` (`transitions.ts`) portait la note « il a déjà été prévenu ». Sur
le dossier de Merisa : `etat_change` validee à 17:52:30 UTC, `mail_envoye` M6 à 17:52:31,
`cloudprinter_order_id` null, `impression_fichiers` null. Le défaut est réel.

## Ce que je propose
Deux voies, une seule à trancher par Mathias :

1. **Garder M6 à la validation, mais dire vrai** : « Vous avez validé. Nous préparons les
   fichiers pour l'imprimeur, plus rien ne change désormais. » Le client garde l'accusé
   immédiat de son clic (c'est le moment où il attend une réponse), et le prochain vrai
   événement reste M7 « en route ». Coût : un texte à réécrire dans `scripts/mails-atelier.mjs`,
   le template Brevo 33 à repousser (`--pousser --seulement M6`, sur accord), la ligne
   `note` d'`envoyer_impression` inchangée.
2. **Déplacer M6 sur `envoyer_impression`** : le mail part quand la commande part vraiment.
   Coût : `codesPour` dans `transitions.ts`, la chaîne des prédécesseurs (M7 exige M6), et le
   client ne reçoit plus rien au clic « Tout est bon, imprimez », ce qui laisse un silence entre
   sa validation et la commande, parfois de plusieurs jours.

Ma recommandation : la voie 1. Le clic de validation mérite une réponse, et le moment de la
commande n'apporte au client aucune information qu'il puisse utiliser.

Points à vérifier avant de toucher quoi que ce soit : `codesPour("valider_client")` et
`codesPour("envoyer_impression")` dans `src/lib/atelier/transitions.ts`, le texte de M6 dans
`scripts/mails-atelier.mjs` (lignes ~527 à 537), le garde-fou de chaîne dans `mails.ts` (M7
exige M6), et `docs/reference/PARCOURS-INVARIANTS.md` avant tout déplacement.

## Ce qui a été fait
**18/09/2026 — Mathias tranche la voie 2 : M6 part à la commande. Branche `fix/m6-a-la-commande`.**
- `codesPour` : plus rien en `validee`, M6 en `en_production` (chaîné sur M5). Harnais : trois
  cas réécrits, « TOUT PASSE ». `/api/atelier/valider` et l'auto-validation gardent leur appel à
  la relève, qui n'y trouve plus rien. Note de `envoyer_impression` réécrite ; fixture de démo
  déplacée sur `en_production`.
- Texte de M6 : « il est entre les mains de l'imprimeur », pied « dès que le colis est expédié ».
  **Template Brevo 33 repoussé le 18/09** (`--pousser --seulement M6`, sur accord de Mathias).
- Page `/numero` en `validee` : « Validé. Nous préparons l'impression. » (elle disait « Parti à
  l'impression. »).
- Merisa : M6 déjà parti, le verrou de `mails_envoyes` empêche un second envoi à la commande.
- tsc, lint (une apostrophe non échappée corrigée au passage dans `PanneauAction.tsx`, hors sujet
  mais bloquante), build : verts.
**PR #177 fusionnée et déployée le 18/09**, page de Merisa vérifiée sur l'URL de déploiement.
Reste : vérifier sur le premier `envoyer_impression` réel que M6 part bien à ce
moment (journal `mail_envoye` M6 après `etat_change` vers `en_production`).
