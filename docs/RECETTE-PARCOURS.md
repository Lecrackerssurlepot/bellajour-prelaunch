# Séance de recette — le parcours de bout en bout

Pour Mathias et Louis. Objectif : parcourir le tunnel complet, du questionnaire
à la livraison, en vérifiant à **chaque étape** les trois faces de la même
action — ce que voit la cliente, ce qu'affiche l'admin, et le mail qui part.

---

## Avant de commencer

**Où.** Sur la preview, pas sur bellajour.fr :

```
https://bellajour-prelaunch-git-cha-a10ca9-lecrackerssurlepots-projects.vercel.app
```

C'est le même code qu'en production, mais **Stripe y est en mode test**. Aucun
euro ne bouge. La carte à utiliser : `4242 4242 4242 4242`, n'importe quelle
date future, n'importe quel CVC, n'importe quel code postal.

**La base est celle de la production.** Vos dossiers de test apparaîtront donc
à côté des autres. D'où la règle unique de la séance :

> **Chaque numéro créé porte un titre commençant par « Test ».**
> Test 1, Test 2, Test 3. C'est ce qui rend le nettoyage sûr à la fin.

**Trois vérifications de départ**, deux minutes :

- [ ] les deux comptes se connectent à `/admin` (Mathias, Louis)
- [ ] le premier mail reçu renvoie bien vers la **preview**, pas vers bellajour.fr
- [ ] `node scripts/recette.mjs etat` affiche les dossiers existants

---

## Le levier « pousse le mail »

Quatre mails dépendent du temps : M2 (24 h), M3b (3 jours), M8 (3 jours),
l'auto-validation (7 jours). On ne les attend pas : on **vieillit** le dossier,
puis on déclenche la relève. La règle d'envoi n'est pas contournée, elle est
satisfaite — c'est ce qui se produirait dans trois jours, en accéléré.

Quand vous y êtes, dites-le, et la commande est :

```bash
node scripts/recette.mjs pousser "Test 1" M2
```

Codes disponibles : `M2`, `M3b`, `M8`, `auto`. Les autres mails partent tout
seuls au moment du geste, il n'y a rien à forcer.

Si le dossier n'est pas dans le bon état, la commande **dit pourquoi** au lieu
de ne rien faire.

---

## Le parcours

### 1 · Le questionnaire

Sur la preview : `/composer`. Occasion, histoire, titre **« Test 1 »**,
prénom, email (le vôtre), téléphone.

- [ ] les six écrans s'enchaînent, on peut revenir en arrière
- [ ] **admin** : le dossier apparaît, pile « Chez la cliente », 0 photo
- [ ] **admin** : il compte dans « sans photos », pas dans « à faire »
- [ ] aucun mail n'est parti — c'est normal, rien n'est encore déposé

> À noter : tout ce qui accroche dans la formulation des questions.

### 2 · M2, la relance sans photos

On abandonne volontairement le dossier ici. → **« pousse le M2 »**

- [ ] mail reçu, objet « Il manque les photos de Test 1 »
- [ ] le bouton mène à sa page, sur la preview
- [ ] le ton vous convient

### 3 · Le dépôt

Reprendre le dossier et déposer des photos (une vingtaine suffit).

- [ ] la barre de progression, la reprise si on coupe le réseau
- [ ] **mail M1** reçu, « c'est parti »
- [ ] **admin** : le dossier bascule en « À faire », compte à rebours de 48 h
- [ ] **admin** : le nombre de photos est juste, les vignettes s'affichent
- [ ] **admin** : « Copier les liens » et « Télécharger le lot » fonctionnent

### 4 · Photos insuffisantes — la boucle de retour

Sur un dossier **Test 2** avec peu de photos. Admin : *Demander plus de photos*.

- [ ] l'écran de confirmation annonce M9
- [ ] **mail M9** reçu
- [ ] **sa page** propose de reprendre le dépôt
- [ ] elle redépose → **le dossier revient en « Photos reçues »** avec un délai neuf

> C'est le bug corrigé cette semaine : avant, elle restait bloquée.

### 5 · Publier l'aperçu

Admin, sur Test 1 : déposer les trois visuels, saisir le nombre de pages.

- [ ] **hors grille** (52 pages) : c'est refusé, avec la raison
- [ ] 34 pages : l'écran annonce « palier p40, 40 € » avant de confirmer
- [ ] l'écran annonce « Le mail M3 partira maintenant » et le destinataire
- [ ] « Voir sa page » ouvre bien sa page à elle
- [ ] **mail M3** reçu, avec le bon nombre de pages et le bon prix
- [ ] **sa page** : les trois visuels, le prix, les deux cases décochées
- [ ] le bouton de commande est inactif tant que les deux cases ne sont pas cochées

### 6 · M3b, la relance de paiement

→ **« pousse le M3b »**

- [ ] mail reçu, il rappelle pages et prix
- [ ] **admin** : le dossier reste « Chez la cliente », ce n'est pas un retard

### 7 · Le paiement

Cocher les deux cases, payer avec `4242 4242 4242 4242`.

- [ ] le montant correspond au palier
- [ ] l'adresse de livraison est demandée par Stripe
- [ ] au retour, sa page dit « Reçu »
- [ ] **mail M4** reçu
- [ ] **admin** : état « Payée », adresse affichée, délai de 3 jours ouvrés
- [ ] **admin** : le dossier remonte en tête de « À faire »

> Essayez une adresse à La Réunion (97400) sur Test 3 : l'admin doit afficher
> l'alerte outre-mer avant l'impression.

### 8 · La maquette

Admin : *Publier la maquette*, avec un lien Canva **en mode commentaire**.

- [ ] le champ « Canva de travail » du carnet est bien distinct, marqué INTERNE
- [ ] **mail M5** reçu, avec la date limite d'auto-validation
- [ ] **la date du mail et celle de sa page sont identiques**
- [ ] **sa page** : le lien Canva et le bouton « Tout est bon, imprimez »

### 9 · La validation

Deux façons, à tester séparément.

**Par la cliente** — elle clique « Tout est bon, imprimez » sur Test 1.

- [ ] **mail M6** reçu dans la seconde
- [ ] **admin** : état « Validée », le journal dit « Elle a validé la maquette »

**Automatique** — sur Test 3, laissé en maquette. → **« pousse l'auto »**

- [ ] le dossier passe seul en « Validée »
- [ ] le journal dit « Validée automatiquement (sans réponse) »
- [ ] **mail M6** part ensuite

### 10 · Impression et expédition — Cloudprinter

**Une fois, avant la séance** (dashboard Cloudprinter, par Mathias) :
une interface CloudCore en mode **SANDBOX** (sa clé → `CLOUDPRINTER_API_KEY`
dans les env Vercel de la preview) et une interface CloudSignal pointant
`https://<preview>/api/cloudprinter/webhook` (sa clé →
`CLOUDPRINTER_WEBHOOK_KEY`). Sandbox = commandes gratuites, jamais
imprimées, signaux simulés en quelques minutes.
⚠️ Vérifier le mode de l'interface AVANT le premier envoi : une clé Live
passerait une vraie commande payante.

Admin, sur la fiche : *Envoyer à l'impression* → déposer les **PDF
d'impression** (20 pages = UN PDF complet couverture intégrée ; dos carré
= DEUX PDF, la couverture enveloppante avec le dos + le bloc intérieur —
c'est l'exigence de leurs produits) → *Préparer* → *Confirmer*.

- [ ] *Préparer* affiche le produit déduit de la pagination (20 p. = agrafé,
      sinon dos carré), la taille du fichier et l'adresse Stripe
- [ ] sans PDF déposé, chaque cadre manquant est nommé ; une adresse incomplète est
      nommée champ par champ
- [ ] *Confirmer* : le journal dit « a passé la commande chez l'imprimeur
      (nº …) », l'état passe à « En production », aucun mail ne part
- [ ] re-cliquer *Envoyer à l'impression* → « Commande nº … déjà passée »,
      pas de second envoi
- [ ] la commande apparaît dans le dashboard Cloudprinter (sandbox)
- [ ] dans les minutes qui suivent, les signaux sandbox remplissent le
      journal (« L'imprimeur a validé les fichiers », « La production a
      commencé »…)
- [ ] au signal d'expédition, l'état passe SEUL à « Expédiée », avec le
      transporteur — **mail M7** reçu
- [ ] la **fiche admin** montre « Le colis » : transporteur, numéro de suivi
      et lien, remplis sans qu'on ait rien tapé
- [ ] **le mail M7** porte le lien « Suivre le colis chez … » (il n'apparaît
      que si on sait construire l'adresse de suivi du transporteur)
- [ ] **sa page** affiche le suivi : le lien ET le numéro écrit en clair
- [ ] filet sans sandbox : `node scripts/recette.mjs signal "Test 1" ItemShipped`
      rejoue le webhook ; un second envoi est ignoré sans bruit
- [ ] si les signaux n'arrivent pas : dashboard Cloudprinter → CloudSignal →
      Logs → Resend (la preview peut 403er les robots, cf. la mitigation
      Vercel — leurs retries et le Resend rattrapent)

*Marquer expédiée* reste disponible en manuel : c'est le filet si le
webhook ne vient jamais. Et sans `CLOUDPRINTER_API_KEY` posée, le bouton
redevient ce qu'il était : un simple changement d'état (mode manuel,
annoncé à l'écran de confirmation).

### 11 · Livraison

Admin : *Marquer livrée*. Puis → **« pousse le M8 »**

- [ ] **sa page** : « Le prochain moment ? »
- [ ] **mail M8** reçu, et il nomme l'album

---

## L'admin lui-même

Une fois le parcours bouclé, revenir dessus à froid :

- [ ] les piles correspondent à ce qu'on attend de chacun
- [ ] le bloc d'entrée : « jamais ouverts » tombe quand on ouvre une fiche
- [ ] la vue **Tableau** (une colonne par étape) et les regroupements
- [ ] la **frise** de chaque fiche raconte juste ce qui s'est passé
- [ ] le **journal** se lit sans déchiffrer
- [ ] le **carnet** : écrire une note, voir le prénom, supprimer la sienne
- [ ] la **fiche cliente** regroupe bien les Test 1, 2, 3 (même adresse)
- [ ] **Métriques** : l'entonnoir bouge avec ce qu'on vient de faire
- [ ] **Santé** : elle doit rester verte
- [ ] tout ça **sur téléphone**

---

## Ce qu'on note au fil de l'eau

Quatre colonnes, un tableau partagé :

| Où | Ce qui cloche, ou l'idée | Gravité | Qui |
|---|---|---|---|

Et trois sujets à part, qui méritent leur propre passe :

- **les CGV** — relecture, en gardant en tête que le portugais fait foi ;
- **le questionnaire** — c'est là que se perd le plus de monde (69 % passent au dépôt aujourd'hui) ;
- **le ton des mails** — leur texte est dans `scripts/mails-atelier.mjs`, une phrase corrigée se repousse en une commande.

---

## À la fin

```bash
node scripts/recette.mjs nettoyer
```

Affiche ce qui sera supprimé — **uniquement les dossiers dont le titre commence
par « test »**. Rien n'est touché tant que vous n'ajoutez pas `--vraiment`.

Les photos déposées restent dans le coffre : sans importance, elles ne sont
plus référencées.

---

# Annexe — le câblage de la page produit (28/08/2026)

`/magazine` est en ligne, et **tous** les CTA du site y mènent. Ce qui suit
n'est pas la recette du tunnel, c'est la recette du CÂBLAGE : cinq minutes,
sans rien créer en base, à refaire après toute modification de `CTA_HREF`,
`COMPOSER_HREF` ou de `Nav`.

## Ce qui a été vérifié en production le 28/08

- [x] `/` → « Composer avec l'atelier » → `/magazine`
- [x] `/magazine` → « Composer avec l'atelier » → `/composer`, écran 1 sur 6
- [x] `/magazine` → la signature → `/`
- [x] les trois CTA de `/magazine` (barre, kiosque, acte final) pointent tous `/composer`
- [x] `/composer` répond `noindex, nofollow`
- [x] `<h1>`, canonical, les trois blocs JSON-LD, description à 155 caractères

## ⚠️ CE QUI N'A PAS ÉTÉ TESTÉ, ET QUI COMPTE LE PLUS

**La reprise d'un dépôt en cours.** Il faut un vrai dossier, donc un token.

- [ ] ouvrir `/numero/<token>` d'un dossier en état 1, dépôt non terminé
- [ ] cliquer « Reprendre mon dépôt » (ou le bouton équivalent de l'écran d'état)
- [ ] **vérifier qu'on arrive sur `/composer?reprendre=<token>`**, et que le
      questionnaire retrouve le dossier au lieu d'en ouvrir un vide

Pourquoi c'est le point sensible : ces liens sont construits en
`` `${COMPOSER_HREF}?reprendre=${token}` ``. Si quelqu'un les recâble un jour
sur `CTA_HREF`, ils arriveront sur la page produit, **qui ne lit pas ce
paramètre**. Rien ne plantera, rien ne s'affichera en rouge : la cliente
repartira simplement sur un dépôt vide en croyant reprendre le sien. C'est
exactement le genre de panne qu'on ne découvre que par un appel.

Le garde-fou est écrit dans `content.ts`, au-dessus des deux constantes. Il
n'empêche rien mécaniquement — d'où cette case à cocher.

## Les autres liens à re-cliquer si `Nav` change

- [ ] la signature sur `/` doit REMONTER la page (c'est un `<button>`), pas
      naviguer — c'est le seul endroit où ce geste a ce sens
- [ ] la signature partout ailleurs doit être un `<a href="/">` : clic milieu
      et « ouvrir dans un nouvel onglet » doivent fonctionner
