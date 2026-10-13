---
id: T-146
titre: Mails, relances, temps réel et imports de l'Édition collective sont prévus mais pas codés
etat: nouveau
domaine: collectif
gravite: confort
autonomie: avis-requis
ouvert: 2026-10-13
---
## Ce que Mathias a dit
« La phase 7 (mails, relances, temps réel…) est seulement à prévoir dans la structure, pas à
coder. »

## Ce que j'ai vérifié
Les accroches sont posées par T-139 : `collectif_mails` (verrou unique `edition_id` + `code`),
`collectif_evenements`, `demo`, `photos_supprimees_le`. `sendBrevoEmailDetail` respecte déjà
`ATELIER_MAILS_COUPES`. Le webhook Brevo ne cherche que dans `numeros` : un rebond B2B y est
ignoré. Le `catch` externe de `envoyerMailAtelier` ne retire pas le verrou : ne pas le recopier.
`supprimerPrefixe` (r2.ts) n'accepte que `numeros/<id>/`.

## Ce que je propose
PRD §11, phase 7 (rien ne part sans l'accord de Mathias) :
- mails E1 à E12 et A1 à A6, textes versionnés dans `scripts/mails-collectif.mjs`, verrou
  `collectif_mails`, regroupement de E8 (délai `[À FIXER]`, PRD §12.8) ;
- relances par la relève quotidienne ou le workflow horaire ;
- Supabase Realtime pour la messagerie (avis requis : il ouvre un client navigateur) ;
- import par lien (Google Drive, WeTransfer, Dropbox) ;
- édition de démonstration ;
- facturation B2B (InvoiceXpress, D22 : avis requis), paiement du solde ;
- commande imprimeur par API ;
- suppression des photos après `[DÉLAI À FIXER]` (script sur le modèle d'`anonymiser-dossiers.ts`,
  `supprimerPrefixe` à généraliser par un paramètre `racines` dont le défaut reste `numeros`) ;
- rebonds Brevo reconnus pour les adresses B2B ;
- page publique « Édition collective » (`Main.dc.html`) ; espace multi-éditions.

## Ce qui a été fait
Rien. Ticket ouvert le 13/10/2026.
