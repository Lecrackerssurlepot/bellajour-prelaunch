---
id: T-146
titre: Mails, relances, temps réel et imports de l'Édition collective sont prévus mais pas codés
etat: en cours
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

## Repris le 15/10/2026 à la demande de Mathias
« Brevo, au moins si c'est juste connecté, on créera la liste de mails, mais au moins tu
l'intègres dedans et on pourra définir cela. »

## Ce qui a été fait (15/10, branche `feat/collectif-mails`)
- **Un seul circuit** (`src/lib/collectif/mails.ts`, `envoyerMailCollectif`) : coupé par défaut
  (`COLLECTIF_MAILS`, valeur incomprise = fermé ; `ATELIER_MAILS_COUPES` coupe aussi), verrou
  `collectif_mails` posé avant Brevo et retiré si Brevo refuse, journal `mail_envoye` /
  `mail_echec` (adresse masquée). Brevo est déjà branché : `BREVO_API_KEY` en place, envoi par
  l'API SMTP avec le texte écrit dans le code (comme les mails de rendez-vous).
- **Le premier mail, « Votre espace est prêt »** (`mailsTextes.ts`, texte PROPOSÉ, à valider par
  Mathias) : le lien du responsable, vous ou tu, envoyé depuis la fiche (onglet « Réglages et
  liens ») en deux temps, avec un aperçu (« Voir le mail ») ; une fois par lien, « Renvoyer quand
  même » sinon.
- Harnais : texte (vous/tu, aucun tiret cadratin, échappement), circuit, route.

## Reste
- Mathias relit le texte, puis ouvre `COLLECTIF_MAILS` (Vercel) quand il le veut.
- La liste des autres mails, à fixer par Mathias : code par appareil (T-154), retrouver mon
  espace (T-154), nouveau message de l'atelier, bon à tirer disponible, rappel avant clôture,
  expédition.
- Les rebonds des adresses B2B (le webhook Brevo ne connaît que `numeros`).

## Ajouté le 19/10/2026 (retours de Mathias, à garder pour plus tard)
- **Relancer les participants à qui il reste des photos.** Mathias : « on va peut-être envoyer
  un mail aux participants qui ont envoyé des photos, ou pas d'ailleurs, envoyé leurs photos et
  qui ont reçu un lien. Et si on a leur adresse mail, donc ça, c'est à voir comment ça
  fonctionne. Et s'ils ont encore des photos disponibles, par exemple, ils n'en avaient que 20
  sur 30, et ben, on leur envoie un mail après tant de jours après la fin du projet. […] Vous
  avez encore 10 photos de possibles. »
  Vérifié le 19/10 : le lien participant ne demande AUCUNE adresse, par décision du PRD (§5.1
  « Pas de mail, pas d'adresse demandée », `PRD-edition-collective.md:503`). Le reste se calcule
  par appareil et par lien (`plafond_par_personne` moins les photos CONFIRMÉES de l'appareil,
  borné par le reste du total), jamais par personne. Il faudrait : une adresse facultative et sa
  colonne (migration), une case d'accord pour les rappels (texte légal, T-158, T-184), un mail
  dans `mailsTextes.ts`, un déclencheur planifié, un désabonnement. Retenu le 19/10 (ma recommandation,
  acceptée par Mathias) : quelques jours AVANT la clôture. Toujours pour plus tard.
- **A1, prévenir l'atelier qu'un client a écrit** (PRD §11). Aucun mail ne part aujourd'hui
  (`api/collectif/messages/envoyer/route.ts:44-45`). La fréquence (regroupé, une fois par heure
  au plus ?) est à fixer par Mathias. L'écran de l'atelier, lui, est dans T-188.
