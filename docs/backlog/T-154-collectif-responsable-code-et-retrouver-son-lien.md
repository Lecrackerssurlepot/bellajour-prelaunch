---
id: T-154
titre: Rien ne vérifie que le lien du responsable est ouvert par le responsable, et il ne peut pas le retrouver seul
etat: en cours
domaine: collectif
gravite: serieux
autonomie: avis-requis
ouvert: 2026-10-15
---
## Ce que Mathias a dit (15/10/2026)
« Comment être sûr que la personne qui est responsable, ce soit bien elle, et qu'il ne se passe
pas le lien ; et surtout qu'elle puisse retrouver le lien assez facilement. C'est important. »
Décision du 15/10 : **un code sur chaque nouvel appareil** (option recommandée).

## Ce que j'ai vérifié (15/10)
- Le lien du responsable est un jeton au porteur de 32 caractères (`acces.ts`) : quiconque l'a
  fait tout ce que fait le responsable, y compris valider le bon à tirer. Rien ne vérifie la personne.
- Le lien de l'équipe existe pour partager en lecture seule ; rien n'empêche de faire suivre
  celui du responsable.
- Retrouver son lien : seulement si l'atelier le renvoie. Aucun mail ne part pour les éditions.
- Changer de responsable existe déjà : l'atelier change l'adresse et régénère le lien.

## Ce que je propose
1. Un code à 6 chiffres envoyé à `responsable_email` la première fois que le lien s'ouvre sur un
   appareil ; l'appareil est ensuite reconnu (cookie httpOnly signé). Le lien de l'équipe et
   celui des participants ne changent pas.
2. « Retrouver mon espace » : l'adresse tapée reçoit son lien par mail ; la réponse est la même
   que l'adresse soit connue ou non (patron `/api/waitlist`).
3. Le lien dans le compte Bellajour (`/compte`) quand on s'y connecte avec la même adresse.
Dépend de T-146 (les mails). Migration probable (codes, appareils reconnus) : appliquée par Mathias.

## Ce qui a été fait (15/10, branche `feat/collectif-code-appareil`)
- Le code par appareil, écrit et prouvé au harnais : `appareil.ts` (pur), `appareils.ts`
  (effets), la porte `chargerAcces` (`appareil_inconnu`), la route `/api/collectif/appareil`,
  l'écran `CodeAppareil`, le mail du code (`mailCodeAppareil`, texte proposé à valider).
- Migration `20261019_collectif_appareils.sql` ÉCRITE (deux tables : `collectif_codes`,
  `collectif_appareils`), **à appliquer par Mathias**.
- Coupé par défaut : `COLLECTIF_CODE_APPAREIL` et `COLLECTIF_MAILS`.

- **Migration `20261019` appliquée par Mathias le 15/10**, vérifiée en SQL (deux tables, RLS,
  index).
- **Recette locale complète le 15/10** (port 3007, contrôle allumé, mails coupés, code d'essai) :
  appareil neuf → écran du code et adresse masquée, la liste des photos répond 401 ; cookie
  d'appareil httpOnly, secure, Lax, un an ; mauvais code → « faux, 4 essais » ; bon code →
  reconnu, l'espace s'ouvre, la liste des photos répond 200 ; le même code une 2e fois →
  « expiré » ; un autre appareil → écran du code ; le lien d'équipe et l'atelier connecté →
  aucun code. En base : aucun code en clair (empreintes de 64 caractères).
- ⚠️ Le code d'essai (`COLLECTIF_CODE_ESSAI`) ne vaut que pour une demande venue de localhost :
  le `.env.local` tiré de Vercel contient `VERCEL`, la première garde l'ignorait en local.

## Revu avec Mathias le 15/10 au soir
« Si elle veut aller sur un autre appareil, c'est un peu chiant […] On veut juste que l'accès soit
un peu compliqué pour pas que les gens se permettent de tout le temps modifier. » Plus d'écran
bloquant : sur un appareil pas encore reconnu, le lien du responsable s'ouvre EN LECTURE ; une
pastille propose « Recevoir un code pour modifier ». Recette refaite (7 cas) : appareil neuf →
l'espace s'ouvre en lecture, une écriture répond 403 ; code saisi → la pastille disparaît,
l'écriture passe ; autre appareil → lecture ; lien d'équipe, atelier → rien ne change.

## Reste
- ~~« Retrouver mon espace »~~ : fait le 16/10 (`/edition/retrouver`, adresse courte `/espace`,
  réponse identique connue ou non, mail après la réponse, un par quart d'heure et par édition ;
  lien depuis la page « introuvable » et dans le mail « Votre espace est prêt »). Recette locale :
  adresse connue → le serveur aurait envoyé le lien (coupé en local) aux 4 éditions d'essai qui
  la partagent ; adresse inconnue → rien ; même réponse, 200 dans les deux cas.
- Le lien dans `/compte`.
- ~~Valider les réglages~~ : tranchés le 16/10 sur délégation de Mathias (« tu choisis, mais il faut
  pas que ça soit très compliqué ») : 24 heures par code, 10 essais, 10 codes par heure.
