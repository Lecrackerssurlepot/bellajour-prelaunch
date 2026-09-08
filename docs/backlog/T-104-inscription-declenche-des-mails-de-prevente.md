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
