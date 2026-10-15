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

## Reste
- Mathias applique la migration ; puis recette locale complète (code d'essai, mails coupés).
- « Retrouver mon espace » et le lien dans `/compte`.
- Valider les réglages : 15 minutes, 5 essais, 5 codes par heure.
