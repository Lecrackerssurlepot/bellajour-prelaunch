---
id: T-134
titre: Après des retouches, le client reçoit M5 mot pour mot, sans un mot sur les corrections qu'il a demandées
etat: fermé
domaine: atelier
gravite: serieux
autonomie: avis-requis
ouvert: 2026-09-23
ferme: 2026-09-23
statut: fait
---
## Ce que Mathias a dit

« Et il dit ce mail que les modifs ont été faîtes ? Donc il devrait être un peu différent ! »

Puis, après lecture des deux textes proposés : « Je valide les deux textes, ouvre le ticket ».

## Ce que j'ai vérifié

Vérifié le 23/09/2026, avant d'ouvrir le ticket. Le constat est exact.

La republication après retouches supprime le verrou de M5 et le renvoie
(`src/app/api/admin/atelier/transition/route.ts:956`, journal `mail_reouvert`,
cause `republication_retouches`). Le mail renvoyé est **le même gabarit**, avec
un seul paramètre différent, `DATE_LIMITE` (`src/lib/atelier/mails.ts:607`).
Aucune variante, aucun code M5b, aucune conditionnelle : le `sujet`, le `h1`,
le `sous`, la note de carte, le bouton et le pied sont fixes dans
`scripts/mails-atelier.mjs:509-525`.

Un client qui vient d'écrire ses corrections dans le Canva relit donc, mot pour
mot : « Votre numéro est composé. *Prénom*, chaque page est en place. Prenez le
temps de le feuilleter, page après page, et dites-nous si tout vous va. »
Objet identique au premier envoi, donc empilé dans le même fil chez Gmail.

Côté atelier, rien ne distingue une publication d'une republication au moment
d'agir : le libellé (« Publier la maquette ») et l'explication sont des
constantes de la table des transitions (`src/lib/atelier/transitions.ts:235`),
et l'écran de confirmation annonce « Le mail M5 partira maintenant »
(`src/app/admin/atelier/[token]/PanneauAction.tsx:1914`) sans dire lequel des
deux textes part. Seul le bandeau orange de la fiche signale les retouches
(`Fiche.tsx:1070`), après coup.

Ce qui marche déjà et qu'il ne faut pas refaire : la route SAIT qu'elle
republie après retouches (`republicationRetouches`, route.ts:767), et elle
passe déjà des paramètres à l'envoi immédiat (`releverDossier(..., prepa.params)`,
route.ts:968 → `extra` → `envoyerMailAtelier`, mails.ts:1309). Le drapeau a donc
son chemin tout tracé, sans nouvelle colonne ni migration.

### Le repli est sûr, vérifié le 23/09

Le piège redouté (« mail sauté en silence, indéfiniment, sans erreur ») ne peut
PAS se produire avec un repli. Il ne se déclenche que si le gabarit résolu est
absent (`mails.ts:722-733`) : dans ce cas le verrou n'est pas posé et le saut se
répète à chaque relève. Dès que la résolution retombe sur l'identifiant M5, le
gabarit est vrai, **le verrou est posé et le mail part**. Le repli neutralise
donc le piège au lieu de l'hériter.

Bonus vérifié : `mails_envoyes` porte une colonne `template_id`, renseignée à
la pose du verrou (`mails.ts:741`, migration `20260824_atelier_mails_envoyes.sql`).
Six mois plus tard, « quelle version a-t-il reçue ? » se lit en base, sans
dépendre des logs Vercel effacés au bout d'une heure.

## Ce que je propose

### Les deux textes, validés par Mathias le 23/09/2026

**Version 1, première publication : inchangée.** Objet « *Titre*, la maquette
complète », titre « Votre numéro est composé. », corps « chaque page est en
place… », bouton « Voir ma maquette ».

**Version 2, republication après corrections :**

| champ | texte |
|---|---|
| sujet | `{{ params.TITRE }}`, vos corrections sont faites |
| preheader | Nous avons repris vos remarques. Le numéro est à jour. |
| titreHtml | Vos corrections sont faites |
| h1 | Vos corrections`<br />`sont faites. |
| sous | `{{ params.PRENOM }}`, nous avons repris les remarques que vous nous avez laissées dans le document. Le numéro est à jour : reprenez-le page après page, et dites-nous si cette fois tout y est. |
| carte | `{{ params.NB_PAGES }}` pages composées · `{{ params.DATE_LIMITE }}` nouvelle date limite |
| note de carte | Il reste quelque chose ? Écrivez-le dans le document, puis dites-le nous depuis votre page : nous repassons dessus. |
| cta | Revoir ma maquette |
| pied | Le délai repart de zéro. Sans réponse de votre part d'ici le `{{ params.DATE_LIMITE }}`, nous lançons l'impression telle quelle. |

Trois points signalés à Mathias et assumés : l'objet CHANGE (sinon Gmail
empile les deux mails dans un seul fil) ; « nous avons repris les remarques »
engage l'atelier à les avoir vraiment traitées avant de republier ; et la note
de carte ne promet PAS de retouches illimitées, une règle commerciale que
Mathias n'a jamais tranchée.

⚠️ Aucun tiret cadratin dans ces textes, comme dans tous les mails.

### Le chemin technique

**Garder le code M5**, et choisir le GABARIT à l'envoi. Un code neuf (M5b)
aurait coûté le garde-fou de chaîne, le verrou et l'auto-validation, tous
accrochés à « M5 est parti » ; et un code sans `BREVO_TEMPLATE_<CODE>_ID` est
sauté en silence, indéfiniment, sans erreur.

1. **Le drapeau ne peut PAS passer par `prepa.params`** (corrigé le 23/09,
   après vérification) : `templatePour` est appelé en `mails.ts:722`, AVANT que
   `extra` ne soit fusionné dans les paramètres Brevo (`mails.ts:783`). Un
   drapeau glissé là arriverait chez Brevo sans avoir jamais choisi le gabarit.
   Il passe donc par `options`, l'argument qui porte déjà `differeMs`
   (`mails.ts:713`), **et `releverDossier` doit le relayer** : il n'appelle
   aujourd'hui `envoyerMailAtelier` qu'avec `extra` et `jalons` (`mails.ts:1334`).
2. **Il ne peut pas non plus se déduire du dossier.** La route remet
   `retouches_demandees_le` à null dans le patch écrit AVANT `releverDossier`,
   qui relit la ligne en base : à la seconde de l'envoi, la colonne est déjà
   vide. Le signal n'existe qu'en mémoire, dans `republicationRetouches`.
3. `templatePour` prend un **second argument** et rend le gabarit « corrections
   faites » quand le drapeau est là, **avec repli sur le gabarit M5 normal si
   son identifiant manque** : un mail un peu à côté vaut mieux que pas de mail.
   Sa signature change, donc `templateExiste` aussi (deux écrans l'appellent :
   `donnees.ts:145` et `sante.ts:155`).
4. Le second texte s'ajoute à `scripts/mails-atelier.mjs`, comme tous les autres.
   Aucune colonne, aucune migration.

Deux gabarits plutôt qu'une conditionnelle parce que l'objet doit changer :
le dépôt utilise `{% if %}` dans des corps de mail (M3, M3b, M7), **jamais dans
un sujet**, et rien ne prouve que Brevo l'y accepte.

### Côté atelier

Trois changements, calculés là où l'écran sait déjà qu'il y a des retouches
(`donnees.ts:277`), PAS dans la table des transitions : elle porte un libellé
fixe par action, et la tordre pour un cas contextuel casserait « une action,
une entrée ».

1. Le bouton devient **« Republier la maquette corrigée »**, exactement les
   mots que la table de travail affiche déjà (`prochaineEtape.ts:81`).
2. La phrase sous le bouton : « Le client a demandé des corrections. Republier
   lui annonce qu'elles sont faites et relance son délai de 7 jours. »
3. L'écran de confirmation : « Le mail M5 partira maintenant, dans sa version
   "corrections faites". » C'est le seul endroit où l'atelier voit, AVANT de
   cliquer, lequel des deux textes part.
   ⚠️ Cette phrase doit être dérivée de **la même résolution que l'envoi**, pas
   du drapeau de retouches : `templateExiste("M5")` répond sur la seule variable
   `BREVO_TEMPLATE_M5_ID`, donc l'écran annoncerait « corrections faites » alors
   que le repli aurait envoyé le texte ordinaire. Un écran qui ment est pire que
   pas d'écran.

### Ce qui reste à Mathias, et que je ne ferai pas

- **Créer le gabarit chez Brevo** et le pousser : le script d'envoi touche de
  vraies adresses.
- **Poser la variable d'environnement** sur Vercel (Production ET Preview).

Tant que les deux ne sont pas faits, le repli renvoie le M5 habituel : le
défaut reste, mais rien ne casse.

### À prouver

Le harnais `scripts/verif-atelier.ts` doit porter la nouvelle règle : le
drapeau choisit le bon gabarit, et son absence retombe sur M5. C'est la règle
du dossier atelier, toute règle ajoutée s'y ajoute aussi.

## Ce qui a été fait

**23/09/2026, PR #214 fusionnée.**

- Le gabarit Brevo « M5c · Atelier · La maquette corrigée » est **créé, template 46**,
  poussé par `mails-atelier.mjs --pousser --seulement M5c` (le script écrit des
  gabarits, il n'envoie rien). Son texte est versionné dans le script.
- `BREVO_TEMPLATE_M5C_ID=46` **posée sur Vercel par Mathias le 23/09**.
- Le code M5 choisit son gabarit selon `options.varianteCorrigee`, relayé par
  `releverDossier`. Repli sur le gabarit M5 ordinaire si la variable manque.
- La case « J'ai corrigé ce qui était demandé » est dans le panneau de
  republication, pré-cochée quand le client a cliqué sur sa page. Elle ouvre le
  second chemin demandé par Mathias : republier en annonçant les corrections
  même quand le client n'a jamais touché le bouton de sa page.
- Le bouton porte « Republier la maquette », la ligne de confirmation nomme la
  version du mail, recalculée sur la case réelle.
- La fiche de DÉMONSTRATION portait `retouchesLe: null` en dur alors que sa
  graine dit `retouches: true` : le bandeau T2-13 ne s'y voyait jamais. Corrigé,
  c'est ce qui a permis à Mathias de relire l'écran sans toucher la base.

Vérifié : `tsc`, `lint`, `build` et le harnais atelier (5 assertions ajoutées).
Écran relu par Mathias sur le dossier de démonstration.

**PROUVÉ EN RÉEL le 23/09/2026 à 11h38, sur le dossier de Marjorie**
(« Notre histoire », 46 pages). Vérifié en base, pas déduit :

- `mails_envoyes` : la ligne M5 porte **`template_id: 46`**, datée 11:38:30.
  L'ancienne ligne (gabarit 33, 21/09) a bien été levée puis remplacée.
- `evenements`, trois entrées en trois secondes : `etat_change`
  (`source: republication_retouches`, Canva « Marjorie », rôle COMMENTER),
  `mail_reouvert` (`signal: clic_client`), `mail_envoye` (`template_id: 46`).
- `retouches_demandees_le` repassé à `null`, `etat_maj_le` reparti à 11:38 :
  la date limite annoncée dans le mail (30/09) EST celle de l'auto-validation.

Contrôles faits AVANT le clic, et qui méritent d'être refaits à l'identique le
jour où un mail dépend d'une nouvelle variable : `BREVO_TEMPLATE_M5C_ID` créée
**11 minutes avant** le déploiement de production (une variable posée APRÈS
n'entre en service qu'au déploiement suivant, et le client aurait reçu l'ancien
texte sans que rien ne le signale) ; M4 présent, donc le garde-fou de chaîne
passe ; `palier` et `nb_pages` présents, donc `manquePour` ne retient rien.
