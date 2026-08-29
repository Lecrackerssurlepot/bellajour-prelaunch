# Quand quelque chose casse

À ouvrir un soir où le site vend et où quelque chose ne marche pas. Écrit pour être suivi
sans réfléchir, dans l'ordre.

**Le premier réflexe, toujours : `/admin/atelier/sante`.** Cette page porte huit constats, et
chacun dit ce qu'il faut faire. Un dossier bloqué y apparaît avant qu'une cliente n'écrive.

---

## Le piège qui fait perdre une demi-heure

**Le cache de Vercel peut servir l'ancienne version plusieurs minutes après un envoi.**
« J'ai corrigé et c'est toujours cassé » n'est donc pas une preuve. Vérifier sur l'URL du
déploiement lui-même (`…vercel.app`), pas sur `bellajour.fr`, tant qu'on doute.

**Le second piège** : Vercel peut répondre **403** avec `x-vercel-mitigated: challenge` à tout
client non-navigateur, sur un trafic qu'il juge robotique. Ce n'est pas un réglage, ça s'éteint
seul. Un navigateur passe, Stripe et Cloudprinter non.

Le test qui tranche :

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://www.bellajour.fr/api/webhook
```

- **400** — normal (`missing_signature`). Le problème est ailleurs.
- **403** — épisode de mitigation en cours. **Attendre**, ne rien changer.
  ⚠️ **Ne pas couper le pare-feu.** « Attack Challenge Mode » est au niveau du PROJET :
  le couper découvrirait aussi bellajour.fr. Stripe réessaie pendant trois jours, et un
  événement se renvoie à la main depuis son tableau de bord.

---

## Revenir en arrière

Vercel garde chaque déploiement et sait revenir au précédent depuis son tableau de bord.
C'est le geste le plus rapide quand la page ne s'affiche plus.

**Mais le code revient seul. Ce qui l'accompagnait ne revient pas :**

| Ce qui NE revient PAS | Pourquoi ça compte |
|---|---|
| Une migration appliquée | Le code d'avant ne connaît pas la colonne d'après — ou l'inverse |
| Un template Brevo poussé | `mails-atelier.mjs --pousser` écrit chez Brevo, pas dans git |
| Une commande Cloudprinter passée | Une référence ne se réutilise JAMAIS, même annulée |
| Une variable d'environnement changée | Elle vit sur Vercel |
| Un mail déjà parti | — |

**Donc** : avant de revenir en arrière, se demander si le déploiement fautif a fait l'un de ces
cinq gestes. Si oui, revenir sur le code seul peut aggraver la panne au lieu de la réparer.

---

## Les trois pannes les plus probables

### 1. Un paiement n'arrive pas dans l'atelier

La cliente a payé chez Stripe, le dossier n'avance pas.

1. Tableau de bord Stripe → l'événement `checkout.session.completed` a-t-il été livré ?
2. S'il est en échec avec un **403**, c'est la mitigation : voir plus haut, attendre, puis
   **renvoyer l'événement à la main** depuis Stripe.
3. S'il est livré en 200 mais que rien n'a bougé : regarder le journal du dossier dans
   `/admin/atelier/<token>`. Une session orpheline (ni `kind: atelier`, ni `offer_type`) est
   journalisée et ignorée volontairement — c'est le tri qui protège la prévente.
4. Le geste manuel de dernier recours : faire avancer l'état depuis la fiche. Le mail suit.

### 2. Un mail ne part pas

1. `/admin/atelier/sante` — le constat « mails sans template » le dit en premier.
   Il manque une variable `BREVO_TEMPLATE_<CODE>_ID` sur Vercel. **Sans elle, le mail est sauté
   sans poser son verrou : il sera sauté à chaque relève, indéfiniment, sans erreur.**
2. Constat « mails en échec » : le verrou a été retiré, la relève réessaiera d'elle-même.
3. Si aucun mail ne part depuis plus d'un jour : **la relève quotidienne ne tourne plus**.
   Elle est déclarée dans `vercel.json` (7 h UTC). Sans elle, M2, M3b, M8 et l'auto-validation
   à J+7 ne partent JAMAIS. La déclencher à la main :

```bash
curl -X POST https://www.bellajour.fr/api/atelier/mails/relever -H "x-atelier-secret: $ATELIER_MAILS_SECRET"
```

4. Le mail part mais n'arrive pas : regarder si un rebond a été enregistré (tag « ne reçoit pas »
   sur la ligne du dossier). Sinon, c'est l'onglet Promotions de Gmail — chantier T-022.

### 3. L'impression ne part pas

1. Sans `CLOUDPRINTER_API_KEY`, tout bascule en **mode manuel** : « Envoyer à l'impression »
   ne fait que changer l'état, la commande est à passer à la main. Rien n'est cassé.
2. Journal `cloudprinter_echec` : la commande a été refusée. Le message d'erreur de Cloudprinter
   a la forme `{error:{type,info}}`.
3. Journal `cloudprinter_orpheline` : **la commande est PARTIE mais notre base ne l'a pas
   enregistrée.** Cas le plus délicat — ne pas recommander, retrouver la référence chez eux.
4. Une référence de commande ne se réutilise jamais, même annulée. Une re-commande part sous
   `<id>-r<epoch36>`.

---

## Ce qu'on ne sait pas voir aujourd'hui

À dire franchement, parce que ça change la façon de chercher :

- **Aucune remontée d'erreur.** Un 500 en production n'alerte personne ; la seule trace est le
  journal Vercel, qu'il faut ouvrir en sachant quoi chercher. (T-031)
- **Aucune mesure d'audience.** On ne sait pas combien de visiteuses arrivent ni où elles
  partent. Une visiteuse qui décroche ne le signale pas, elle part. (T-020)
- **Aucune restauration de sauvegarde n'a jamais été essayée.** (T-032)

Tant que ces trois-là sont ouverts, ce manuel commence toujours au même endroit : la page Santé,
et le témoignage d'une cliente.
