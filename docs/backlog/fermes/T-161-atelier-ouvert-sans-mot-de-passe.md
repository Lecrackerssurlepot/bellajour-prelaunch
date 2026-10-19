---
id: T-161
titre: L'atelier s'ouvrait sans mot de passe, avec un faux cookie au nom d'une propriété héritée
etat: fermé
domaine: admin
gravite: bloquant
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux aussi que tu enregistres dans tout cela les points qui concerneront euh, la
performance du site, la sécurité, donc voir toutes les failles, etc. » (19/10/2026)

## Ce que j'ai vérifié
- Audit de sécurité du 19/10 (agent `gardien`), revérifié à la main : `src/lib/admin-auth.ts:130`
  lisait `comptesAdmin()[qui]` sur un objet littéral, `qui` venant du cookie. Pour `qui =
  "constructor"`, `"__proto__"`, `"toString"`… la valeur est héritée, non vide et publique ; le
  HMAC la convertit en texte, et ce texte signait un cookie `bj_admin` que le middleware
  (`middleware.ts:164`, `if (qui)`) et chaque route d'écriture acceptaient. Accès complet à
  `/admin`, `/admin/atelier`, `/admin/collectif` et `/api/admin/*` sans mot de passe.
- Prouvé avant correctif par le harnais : six cookies forgés, six acceptés (`verif-atelier.ts`,
  « 6 ECHEC(S) »).
- Traces en base (lecture seule, 19/10) : aucun auteur inconnu dans `collectif_evenements.qui`,
  `notes.qui`, `numeros.en_charge` ; dans `evenements`, chaque type écrit par l'atelier porte un
  `par` connu (les deux `souvenir_genere` sans auteur datent du 21/09, double déclenchement
  connu de la commande de Merisa). **Aucune écriture d'un intrus.** Une simple LECTURE des pages
  ne laisse pas de trace durable (journaux Vercel : une heure) : elle ne peut pas être exclue.

## Ce que je propose
Fait, voir plus bas.

## Ce qui a été fait
- PR #249 (19/10) : `comptesAdmin()` sans prototype, `motDePasseDe(qui)` qui ne lit qu'une clé
  propre et un texte non vide, pour le cookie ET la connexion ; le harnais forge les six cookies
  et exige leur refus. Même motif fermé sur `/compte/connexion?erreur=`.
- Vérifié en production après le déploiement `6983a28` : les cookies forgés `constructor` et
  `__proto__` reçoivent `307 → /admin/login`.
- PR #250 (19/10) : `/admin` (le tableau de la prévente, tous les inscrits) était la seule page
  de l'admin qui ne revérifiait pas la session ; elle se garde elle-même désormais, contre les
  contournements du middleware de Next.js 16.2.3 (T-162).
