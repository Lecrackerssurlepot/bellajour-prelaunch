---
id: T-117
titre: Des féminins résiduels subsistent dans le visible, contraires à la règle du masculin générique
etat: en cours
domaine: contenu
gravite: confort
autonomie: avis-requis
ouvert: 2026-09-18
---
## Ce que Mathias a dit
« Relire tout le visible (pages, mails, back-office, docx légaux) pour traquer les féminins
résiduels contraires à la règle du masculin générique. Deux coquilles trouvées le 18/09
(« prévenue » sur /numero état payée, PR #165, et deux alertes admin, PR #166) laissent penser
qu'il en reste d'autres. »

## Ce que j'ai vérifié
Inventaire fait le 18/09, quatre surfaces, commentaires de code exclus (script sur `src/`, API
Brevo pour les templates, XML des docx). Seules comptent les formes qui désignent LA PERSONNE ;
un « elle » qui parle de la couverture, de la maquette ou d'une adresse est laissé.

**1. Pages vues par le client : 3 occurrences.**
- `src/app/numero/[token]/page.tsx:583` : « Reprenez là où vous vous êtes arrêtée. »
- `src/app/numero/[token]/page.tsx:617` : « Reprenez là où vous vous étiez arrêtée. »
- `src/app/(atelier)/components/NavCompte.tsx:193` : `aria-label` « Mon compte, connectée »
  (lu par les lecteurs d'écran).

**2. Back-office : 16 occurrences sûres, 2 à trancher.**
- `src/app/admin/atelier/Liste.tsx:157` : « elle n'a pas cliqué « Envoyer » » (title du tag).
- `src/app/admin/atelier/[token]/Fiche.tsx:1520` : « c'est le numéro qui part chez elle, sur sa page ».
- `src/app/admin/atelier/[token]/Parcours.tsx:71` : « dès qu'elle aura redéposé ».
- `src/app/admin/atelier/[token]/PanneauAction.tsx:985` : « partira toute seule si elle tarde ».
- `src/lib/atelier/transitions.ts:198, 201, 216, 224, 239, 252` : six explications et notes
  d'action affichées dans le panneau (« elle découvre sa couverture », « Elle a déjà été
  prévenue au moment où elle a validé », etc.).
- `src/lib/atelier/urgence.ts:29` : « Chez la cliente », alors que `prochaineEtape.ts:41` dit
  déjà « Chez le client » : les deux libellés cohabitent à l'écran.
- `src/lib/atelier/carnet.ts:53` : genre de note « Cliente », aide « Ce qu'elle a demandé ».
  La clé `cliente` est écrite en base (T-096, sans `check`) : on change le libellé, jamais la clé.
- `src/lib/atelier/brief.ts:152, 181, 195, 219` : le brief téléchargé (« Cliente », « Elle ne
  l'a pas précisée », « Elle n'a rien écrit », « Il ne part jamais chez la cliente »).
- À trancher (« elle » peut désigner l'adresse) : `Fiche.tsx:866` « rebondi sur {email} — elle
  n'a donc reçu aucun de nos messages » et `sante.ts:383` « elle a reçu, puis cliqué
  « indésirable » ». `sante.ts:365` (« Elles n'ont RIEN reçu ») parle des adresses : laissé.

**3. Mails : 1 occurrence, dans M10.** Les 40 templates actifs ont été lus par l'API Brevo
(objets et corps). Un seul féminin vise la personne : M10, templates 39 et 40 (40 est branché),
« votre lien vous ramène exactement où vous vous étiez arrêtée ». La source est
`scripts/mails-atelier.mjs:635`. M0 à M9, C0, C1, C2, W, P, F, S, A : rien. Le « Elle vous
attend » de M3, M3b et M10 parle de la couverture.

**4. Docx légaux : rien.** Les 36 docx de `legal-source/` (CGV, confidentialité, livraison,
mentions, remboursement, FR/PT/EN, toutes versions) et `src/app/legal/content/` : aucun féminin
visant la personne. Le « cliente » portugais est « o cliente » (masculin), le « remboursée »
français s'accorde avec « somme ». Aucun texte légal à toucher.

Hors périmètre, volontairement : les identifiants (`fondatrice.ts`, `CREDIT_FONDATRICE`, classes
`ate-code-fondatrice`, clés `camp: "cliente"`, `ton: "elle"`), les commentaires, la doc, les
récits fictifs de la démo admin, et les libellés d'état « Livrée », « Validée », « Expédiée »,
« Maquette prête » (`transitions.ts`, export CSV) qui s'accordent avec la commande ou la maquette.

## Ce que je propose
1. **Une PR libre** pour les surfaces 1 et 2 : 3 + 16 occurrences, texte pur, harnais à relancer
   (transitions.ts est couvert). Les deux cas ambigus seront reformulés pour que « elle »
   disparaisse (« cette adresse n'a donc reçu aucun de nos messages »).
2. **M10 sur accord de Mathias** : corriger `scripts/mails-atelier.mjs:635` (« arrêté »), puis
   Mathias pousse le template 40 lui-même (le garde-fou refuse `--pousser` à Claude). Le
   template 39, doublon inactif côté code, reste tel quel.
3. Rien pour les docx légaux.

## Ce qui a été fait
- **18/09, PR du point 1** : les 3 occurrences des pages et les 18 du back-office (16 sûres +
  les 2 ambiguës reformulées sans pronom) passées au masculin générique, 23 remplacements sur
  12 fichiers, dont l'assertion du harnais qui citait « Elle n'a rien écrit ». Les clés en base
  (`cliente`, `attente_cliente`) et les identifiants n'ont pas bougé. tsc, lint, build et
  harnais verts.
- **Reste** : M10 (point 2), sur accord de Mathias, puis fermeture.
