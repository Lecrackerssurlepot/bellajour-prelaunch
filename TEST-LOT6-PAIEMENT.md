# Test du lot 6 — Stripe Checkout de l'atelier

Procédure complète, en local, **sans qu'un centime réel ne bouge**.
Commit testé : `f6fceeb`.

---

## 0. Les trois dangers, avant de commencer

**1. La clé Stripe.** Si le serveur tourne avec une clé `sk_live_`, la carte de
test est refusée mais une vraie session de paiement est créée sur ton compte de
production. On force donc les clés de test **par le shell**, sans jamais toucher
à `.env.local` (§3). Les variables du shell ont la priorité sur les fichiers
`.env` dans Next.js — rien n'est modifié sur ton disque.

**2. La base est la vraie.** Il n'existe qu'un projet Supabase : ces tests
écrivent dans la base de production. Les lignes créées ici sont volontairement
identifiables (`test-lot6@bellajour.fr`) et le §10 les supprime toutes.

**3. Le webhook partagé.** C'est le vrai sujet du lot. Le §7 est LE test qui
compte — ne le saute pas.

---

## 1. Récupérer les clés de test

Dans le tableau de bord Stripe, **en mode test** (l'interrupteur en haut à
droite), compte « environnement de test Bellajour » :

- Developers → API keys → copier la clé secrète `sk_test_…`

Garde-la de côté, elle sert au §3. Ne la colle nulle part dans le dépôt.

---

## 2. Ouvrir le tunnel webhook

### 2.0 D'abord : désactiver l'endpoint déjà enregistré

⚠️ **À faire avant tout, sinon le §7 échouera pour une mauvaise raison.**

Ton compte de test porte déjà un endpoint webhook enregistré, qui écoute les
trois mêmes événements :

```
https://bellajour-prelaunch-git-prevente-…vercel.app/api/webhook
```

C'est une preview de la branche `prevente`, donc **le code d'avant le lot 6 —
sans le tri**. Si on le laisse actif, Stripe enverra chaque événement de test à
DEUX endroits : ton tunnel local, et cette preview. Elle prendrait le paiement
de l'album, chercherait `test-lot6@bellajour.fr` dans `waitlist`, et
confirmerait la ligne. Le §7 afficherait un échec alors que le nouveau code
fonctionne.

Dans le tableau de bord Stripe, **en mode test** :
Developers → Webhooks → cet endpoint → **Disable**.

À réactiver après le test si la preview `prevente` te sert encore. Note-le
quelque part : c'est exactement le genre de chose qu'on oublie de remettre.

### 2.1 Le tunnel

Dans un **premier terminal**, qu'on laisse tourner — en collant ta clé de test
(cf. §1) :

```bash
stripe listen --api-key sk_test_COLLE_ICI --forward-to localhost:3000/api/webhook --events checkout.session.completed,checkout.session.expired,charge.refunded
```

`--api-key` n'est pas décoratif : ton environnement de test est un **compte
Stripe distinct** de la production (`acct_1Tg326…` contre `acct_1Tg31v…`). Sans
ce drapeau, la CLI écoute le compte auquel elle est attachée par `stripe login`
— qui peut très bien être l'autre. Passer la clé explicitement garantit que la
CLI et le serveur regardent le même compte.

La commande affiche une ligne du type
`Ready! Your webhook signing secret is whsec_xxxxxxxx`.
**Copie ce `whsec_`** — il est différent de celui de production, et il change à
chaque redémarrage de `stripe listen`.

Ce terminal affichera chaque événement transmis et le code de réponse. C'est ton
tableau de bord pendant tout le test : un `[200]` en face de
`checkout.session.completed` veut dire que le handler a fait son travail.

---

## 3. Démarrer le serveur avec les clés de test

Dans un **deuxième terminal**, en remplaçant les deux valeurs :

```bash
STRIPE_SECRET_KEY=sk_test_COLLE_ICI STRIPE_WEBHOOK_SECRET=whsec_COLLE_ICI npm run dev
```

Les variables posées ainsi écrasent celles de `.env.local` pour ce processus
uniquement. Ton fichier n'est ni lu de travers ni modifié, et fermer le terminal
efface tout.

> **Vérification rapide** : si tu vois `sk_live` où que ce soit, arrête tout.

---

## 4. Créer le dossier de test

Dans l'éditeur SQL de Supabase :

```sql
-- Un numéro en état 2, prêt à être payé, SANS les cases cochées :
-- on veut tester le vrai geste, pas un raccourci.
insert into numeros (
  token, etat, occasion, histoire, titre, prenom, email, email_canonical,
  nb_photos, nb_pages, palier, consent_photos,
  cgv_ok, renonciation_retractation
) values (
  '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV', 'apercu_pret',
  'Test lot 6', 'Dossier de test, a supprimer apres.', 'Test Lot 6',
  'Mathias', 'test-lot6@bellajour.fr', 'test-lot6@bellajour.fr',
  42, 32, 'p40', true,
  false, false
);
```

`p40` + 32 pages → le serveur doit facturer **40,00 €**. Retiens ce chiffre.

L'aperçu (C1/C4/double page) sera vide : `apercu_urls` est nul et la page
affichera trois cadres sans image. C'est normal et sans effet sur le paiement.

---

## 5. Test A — l'invariant nº3, avant tout le reste

Les deux cases ne sont pas cochées. Le bouton est désactivé dans l'interface,
mais un script n'a pas de bouton. On appelle donc la route directement :

```bash
curl -s -X POST http://localhost:3000/api/atelier/checkout -H 'Content-Type: application/json' -d '{"token":"8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV"}'
```

**Attendu : `{"error":"consentements_manquants"}` en 409.**
Si tu obtiens une URL de paiement ici, arrête tout : l'invariant nº3 est cassé.

Deux autres refus à vérifier dans la foulée :

```bash
curl -s -X POST http://localhost:3000/api/atelier/checkout -H 'Content-Type: application/json' -d '{"token":"pas-un-token"}'
```
**Attendu : `token_invalide`, 400.**

```bash
curl -s -X POST http://localhost:3000/api/atelier/checkout -H 'Content-Type: application/json' -d '{"token":"ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"}'
```
**Attendu : `introuvable`, 404** — et rien d'autre. Aucune information ne doit
fuiter sur l'existence ou non d'un dossier.

---

## 6. Test B — l'invariant nº2, le prix ne vient pas du navigateur

On coche les deux cases **dans l'interface**, pour de vrai :

Ouvre <http://localhost:3000/numero/8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV>

- la page annonce « Votre numéro fera 32 pages — 40 € »
- coche les deux cases (chaque clic écrit en base et horodate)
- **ne clique pas encore sur Commander**

Maintenant on tente de faire dire au serveur un autre prix :

```bash
curl -s -X POST http://localhost:3000/api/atelier/checkout -H 'Content-Type: application/json' -d '{"token":"8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV","amount":100,"palier":"p30","euros":1,"unit_amount":100}'
```

Une URL revient. Ouvre-la : **la page Stripe doit afficher 40,00 €**, pas 1 €.
Confirmation en base :

```sql
select type, payload->>'montant_centimes' as centimes, payload->>'palier' as palier
from evenements
where numero_id = (select id from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV')
order by created_at desc limit 3;
```
**Attendu : `checkout_ouvert`, `4000`, `p40`.** Ferme cet onglet sans payer.

---

## 7. LE test qui compte — la collision prévente / atelier

C'est le danger central du lot. On fabrique exactement la situation redoutée :
**une cliente de l'atelier qui est aussi inscrite à la prévente, en attente de
paiement.**

```sql
-- offer_type 'standard' volontairement : même si le tri échouait, aucun
-- numéro de fondateur ne serait consommé. Le diagnostic reste le même.
insert into waitlist (email, email_canonical, prenom, ref_code, status, offer_type)
values ('test-lot6@bellajour.fr', 'test-lot6@bellajour.fr', 'Mathias',
        'BJ-TESTLOT6', 'pending', 'standard');
```

Retourne sur la page du numéro, clique **Commander**, et paie :

| Champ | Valeur |
|---|---|
| Carte | `4242 4242 4242 4242` |
| Date | n'importe quelle date future |
| CVC | n'importe quels 3 chiffres |
| Nom | n'importe lequel |
| Pays | France (vérifie que seuls **France, Belgique, Luxembourg** sont proposés) |
| Adresse | n'importe laquelle |

Puis vérifie **les deux côtés** :

```sql
-- CÔTÉ ATELIER : le dossier a basculé
select etat, stripe_payment_intent is not null as pi_pose,
       adresse_livraison->'address'->>'country' as pays,
       adresse_livraison->>'name' as nom
from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
```
**Attendu : `payee`, `true`, `FR`, le nom saisi.**

```sql
-- CÔTÉ PRÉVENTE : la ligne n'a PAS bougé. C'est tout l'enjeu du lot.
select status, offer_type, numero_fondateur, stripe_payment_intent, confirmed_at
from waitlist where email_canonical = 'test-lot6@bellajour.fr';
```
**Attendu : `pending`, `standard`, et les trois derniers champs à `null`.**

Si `status` est passé à `confirmed`, le tri du webhook ne fonctionne pas —
c'est un arrêt immédiat.

```sql
-- Le journal du dossier
select type, created_at from evenements
where numero_id = (select id from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV')
order by created_at;
```
**Attendu : `checkout_ouvert` (deux fois, on a ouvert deux sessions), puis
`etat_change`.** Un seul `etat_change`, jamais deux.

Le terminal `stripe listen` doit montrer `[200]` en face de
`checkout.session.completed`. Et la page du navigateur doit maintenant afficher
« Reçu. On compose. » — l'état 3.

---

## 8. Les garde-fous

### 8.1 Le rejeu (idempotence)

Stripe rejoue volontiers un événement. Récupère son identifiant :

```bash
stripe events list --limit 5
```

Puis renvoie le `checkout.session.completed` (`evt_…`) :

```bash
stripe events resend evt_COLLE_ICI
```

**Attendu : `[200]`, et en base AUCUN second `etat_change`.** Relance la
requête du §7 sur `evenements` : le compte de lignes ne doit pas avoir bougé.

### 8.2 Le paiement inattendu

On simule un webhook qui arrive après que l'atelier a fait avancer le dossier :

```sql
update numeros set etat = 'maquette_prete' where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
```
```bash
stripe events resend evt_COLLE_ICI
```
```sql
select type, payload->>'etat_au_moment_du_paiement' as etat_vu
from evenements
where numero_id = (select id from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV')
order by created_at desc limit 1;
```
**Attendu : une ligne `paiement_inattendu` avec `maquette_prete`.** L'état ne
doit PAS être revenu à `payee` : le webhook ne défait jamais le travail de
l'atelier. On remet en place :

```sql
update numeros set etat = 'payee' where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
```

### 8.3 L'expiration d'une session

Repasse le dossier en état 2, ouvre une session sans payer, et force son
expiration (Stripe le fait tout seul à 24 h — on n'attend pas) :

```sql
update numeros set etat = 'apercu_pret' where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
```

Clique Commander, note l'identifiant `cs_test_…` dans l'URL de Stripe, ferme
l'onglet, puis :

```bash
stripe post /v1/checkout/sessions/cs_test_COLLE_ICI/expire
```

```sql
select etat from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
```
**Attendu : toujours `apercu_pret`.** Le numéro reste payable, le bouton
refonctionne (PRD §9). Et un événement `checkout_expire` apparaît dans le
journal.

### 8.4 L'écran d'attente au retour de Stripe

Pour le voir, il faut que le webhook n'arrive pas :

1. **Arrête `stripe listen`** (Ctrl+C dans le premier terminal).
2. Paie normalement depuis la page.
3. Au retour, tu dois lire **« Paiement reçu. On enregistre votre commande… »**
   — et surtout **plus aucun bouton Commander**. La page se recharge seule
   toutes les 4 secondes.
4. Au bout de 5 rechargements (20 s), le message bascule sur
   « l'enregistrement prend plus de temps que prévu ».
5. Relance `stripe listen` (**attention : nouveau `whsec_`, donc redémarre
   aussi le serveur du §3**), puis `stripe events resend evt_…`. La page
   bascule en état 3.

### 8.5 Le remboursement

Depuis le tableau de bord Stripe (mode test), rembourse le paiement.

```sql
select type, payload->>'montant_rembourse' from evenements
where numero_id = (select id from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV')
order by created_at desc limit 1;
```
**Attendu : `remboursement`.** Et l'état ne change pas — c'est voulu, la
décision appartient à un humain. Vérifie aussi que la ligne `waitlist` de test
est toujours intacte.

---

## 9. La non-régression de la prévente

Le lot a modifié un fichier partagé. Il faut prouver que l'ancien chemin marche
toujours : passe un acompte de prévente en mode test depuis
<http://localhost:3000/preventes>, avec une **autre** adresse mail, et vérifie
que sa ligne `waitlist` passe bien en `confirmed`.

Sans ce test, on a sécurisé l'atelier en cassant peut-être la prévente.

---

## 10. Nettoyage

```sql
-- `photos` et `evenements` partent en cascade avec le numéro.
delete from numeros where token = '8MUw8jkrk9h-z0mxgzoYMQq1u9IMhMUV';
delete from waitlist where email_canonical = 'test-lot6@bellajour.fr';
```

Pense aussi à supprimer la ligne `waitlist` créée au §9, et ferme les deux
terminaux — les clés de test disparaissent avec eux.

---

## 11. Ce que cette procédure ne couvre PAS

- **La TVA réelle.** Sans immatriculation déclarée, Stripe calcule 0 €. Le
  découpage TTC (40 € → 32,52 € + 7,48 €) ne sera vérifiable qu'après l'ajout
  de l'immatriculation portugaise. À refaire à ce moment-là.
- **L'iPhone réel** (charte : « testé sur iPhone réel avant toute validation »).
  L'écran d'attente et la page Stripe méritent un passage sur téléphone.
- **Le mail M4** — le template n'existe pas encore (lot 8). Le journal Vercel
  affichera `[brevo] M4 skip — templateId manquant`. C'est le comportement voulu.
- **Cloudprinter** — phase 2. L'adresse est rangée, personne ne la lit encore.
- **Les CGV** (lot 9). Le lien `/cgv` fonctionne, son contenu n'est pas à jour
  pour l'atelier : trois prix, rétractation sur bien personnalisé, réimpression.
  Obligation légale avant le premier paiement réel.
