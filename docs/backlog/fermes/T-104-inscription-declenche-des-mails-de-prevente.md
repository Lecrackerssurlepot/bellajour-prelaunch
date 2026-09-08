---
id: T-104
titre: S'inscrire aujourd'hui déclenche deux mails qui annoncent des préventes closes
domaine: contenu
gravite: bloquant
autonomie: avis-requis
ouvert: 2026-09-08
---

## La chaîne, vérifiée bout en bout le 08/09/2026

Chaque maillon a été constaté, aucun n'est déduit.

1. **`/ambassadeurs` répond 200 en production**, avec son formulaire d'inscription
   (`src/app/ambassadeurs/Inscription.tsx:42` → `POST /api/ambassadeur/register`).
2. Cette route ajoute le contact à la liste Brevo `BREVO_WAITLIST_LIST_ID`
   (`src/app/api/ambassadeur/register/route.ts:212`). **La valeur est `"3"`.**
3. Dans Brevo, l'automation **« Waitlist - Séquence W2 W3 » est ACTIVE**, et son déclencheur
   est exactement « Ajouté à une liste → **Waitlist Bellajour - #3** ».
4. Elle envoie alors, sans autre condition :
   - **à J+2** — « présentez Bellajour à vos proches / Votre lien vous attend » ;
   - **à J+4** — « Ce que vous allez tenir entre les mains ».
5. `POST /api/waitlist` répond **400** sur un corps vide, pas 410 : la route de la waitlist est
   **vivante** elle aussi. Seule `/api/checkout` porte le verrou `preventeFermee()`
   (`src/lib/prevente.ts`) ; ni `/api/waitlist` ni `/api/ambassadeur/register` ne l'ont.

**Les préventes sont closes depuis le 01/09.** Quelqu'un qui s'inscrit aujourd'hui reçoit donc
deux mails écrits pour une campagne qui n'existe plus, dont un qui lui demande de recruter ses
proches vers une offre qu'on n'honore pas.

## Pourquoi c'est classé bloquant

C'est la définition même du mot dans ce backlog : **une cliente en subit l'effet.** Ce n'est pas
une dette, ce n'est pas un risque théorique — le chemin est ouvert, l'automation est armée, et
elle est armée depuis le 01/09. L'automation compte **55 contacts entrés, 49 terminés, 6
suspendus, 0 actif à l'instant** : personne n'est en vol en ce moment, mais rien n'empêche la
prochaine inscription de démarrer la séquence.

## Ce que je n'ai pas fait, et pourquoi

**Je n'ai pas mis l'automation en pause.** Mathias m'avait autorisé à désactiver un template
précis, pas à toucher un scénario marketing vivant. Mettre en pause est réversible et sans
effet sur qui que ce soit aujourd'hui (0 actif), mais c'est sa décision.

## Les trois gestes possibles, du plus rapide au plus propre

1. **Mettre l'automation en pause dans Brevo** (Automatisations → Scénarios → le bouton pause).
   Trente secondes, réversible, coupe le mal à la racine sans toucher au code. **C'est ce que
   je recommande de faire en premier, aujourd'hui.**
2. **Fermer les routes** — étendre `preventeFermee()` à `/api/waitlist` et
   `/api/ambassadeur/register` comme il l'est déjà sur `/api/checkout`. C'est du code, je peux
   le faire ; mais il faut d'abord trancher ce que devient `/ambassadeurs` (**T-067**), parce
   que fermer la route sans retirer la page laisse un formulaire qui échoue devant la visiteuse.
3. **Réécrire la séquence** pour l'ère atelier, si on veut garder une chaîne d'accueil. C'est un
   chantier de contenu, pas une correction.

Lié à **T-067** (la page vend un programme qu'on n'honore plus) et **T-002** (les liens de
parrainage de ces mails sont morts — donc le mail de J+2 envoie vers un lien mort, en plus
d'annoncer une offre close).

## État

`nouveau` — chaîne prouvée maillon par maillon, en production et dans Brevo. Attend la décision
de Mathias sur le geste 1.

## Geste 1 fait — l'automation est EN PAUSE (08/09/2026, 08:34)

Mathias a répondu « oui, pause maintenant ». Fait dans son navigateur, sur son compte Brevo.

La modale de confirmation dit exactement ce qu'on espérait : « Aucun nouveau contact n'entrera
dans l'automatisation et les contacts actuellement dans celle-ci la parcourront jusqu'à la
dernière étape. » Comme **0 contact était actif**, personne n'est en vol : la pause ne coupe
aucun parcours en cours, elle ferme seulement la porte d'entrée.

**Vérifié après coup sur la liste des scénarios** : « Waitlist - Séquence W2 W3 » affiche
**En pause**, le compteur passe de « Active 1 · En pause 0 » à « Active 0 · En pause 1 », et la
dernière modification est datée du 08-09-2026 08:34. Le bandeau « Votre automatisation a été
mise en pause » a été vu.

**C'est réversible** : le bouton lecture la réactive. Rien n'a été supprimé, ni le scénario, ni
ses messages, ni la liste 3.

## Ce qui reste

Le geste 2 — fermer les routes — est en cours dans le même mouvement que **T-067**, que Mathias
a tranché le même jour : **archiver `/ambassadeurs` entièrement**, la route en 410, et
`POST /api/ambassadeur/register` en 410 lui aussi. Tant que ce n'est pas déployé, la pause de
l'automation est ce qui protège : une inscription ajouterait toujours le contact à la liste 3,
mais aucune séquence ne démarrerait.

## État

`en cours` — le danger immédiat est écarté (pause vérifiée). Reste la fermeture des routes,
livrée avec T-067.

## Geste 2 fait — les deux routes sont fermées (08/09/2026)

- **`POST /api/ambassadeur/register` → 410 inconditionnel**, livré avec l'archivage de
  **T-067**. La route n'appelle plus ni Brevo ni la base : elle refuse, point. C'était elle le
  danger principal, celle qu'un formulaire vivant en production pouvait atteindre.
- **`POST /api/waitlist` → 410 quand `preventeFermee()`**, posé ici. Cette route ajoutait à la
  liste 3 **et envoyait W1** ; rien n'y regardait si la prévente était ouverte. Vérifié avant
  d'y toucher : son seul appelant était `archive/landing-waitlist/FinalWaitlist.tsx`, archivé.
  Aucune page vivante ne l'appelait, mais elle restait joignable en direct et répondait 400.

**Les deux verrous sont volontairement différents, et c'est un choix, pas une inattention.**
L'inscription ambassadeur est en 410 **inconditionnel** : sa page de vente est archivée, le
programme est clos, il n'y a rien à rouvrir. La waitlist passe par **`preventeFermee()`** :
rouvrir une liste d'attente est un geste qu'on peut vouloir refaire, et il doit alors passer par
le même interrupteur que le reste du dépôt, pas par un redéploiement de cette ligne.

`tsc` et `lint` verts.

## La chaîne, maillon par maillon, après correction

| maillon | avant | après |
|---|---|---|
| `/ambassadeurs` | 200, formulaire vivant | **410**, page archivée |
| `POST /api/ambassadeur/register` | ajoutait à la liste 3 | **410**, n'appelle plus rien |
| `POST /api/waitlist` | 400, ajoutait à la liste 3 + envoyait W1 | **410** tant que la prévente est close |
| automation « Waitlist - Séquence W2 W3 » | **Active** | **En pause** (vérifié, 08/09 08:34) |

Trois verrous indépendants là où il n'y en avait aucun. Il faudrait défaire les trois pour
qu'un mail de prévente reparte.

## État

`fermé` — pause vérifiée dans Brevo, les deux routes fermées et prouvées, la chaîne coupée en
trois endroits.
