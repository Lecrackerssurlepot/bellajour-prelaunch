---
id: T-026
titre: Les CGV v3.0 n'ont pas été relues par un juriste
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
« Elles encadrent de vrais encaissements. Le portugais fait foi. »
## Ce que j'ai vérifié
`src/app/legal/content/cgv.ts` porte FR/PT/EN. `legal-source/*.docx` a **une version de retard** :
la source de vérité est le code, pas les documents. T-006 a déjà trouvé un écart d'une page entre
l'annexe tarifaire et `prix.ts`.
Points sensibles déjà identifiés : le droit applicable est portugais (DL 24/2014 art. 17.º/1 c),
pas français ; l'extinction du droit de rétractation est fixée à la validation de la maquette
(état 4) ; l'article 5 est cadré au régime transitoire de la prévente sans effet rétroactif.
## Ce que je propose
Rien de technique. C'est une relecture juridique à commander.
**Question pour Mathias** : veux-tu que je prépare un dossier pour le juriste — la version PT
exportée depuis le code, la liste des points sensibles, et les écarts connus (T-006) ? C'est la
seule partie que je peux faire.
## Ce qui a été fait
—

## 10/09/2026 — les Word sont au niveau du site

Six fichiers générés depuis le texte du site (v3.1) et déposés dans `legal-source/cgv/{FR,PT,EN}/`
à côté des anciens, sans rien écraser : les CGV complètes (annexe comprise) et la fiche produit
seule, par langue, nommés « … (v3.1, 10-09-2026).docx ». C'est cette version qu'il faut donner au
juriste pour la relecture, la PT en premier (elle fait foi). Les anciens Word (v2.5 / v3.0) peuvent
être archivés par Mathias ; le dossier n'est pas dans git (D4).

## Fermé le 10/09/2026

Mathias : « On ne va pas l'envoyer au juriste, les CGV sont déjà vérifiées, pas de souci. »
Fermé sur sa parole. Réserve consignée : les passages modifiés le 10/09 (4 bis.4, liste « ce que
comprend », annexe tarifaire, 5 bis.3, format et reliure de la fiche produit) n'ont pas été relus
par un tiers, et leur version portugaise, qui fait foi, est une traduction de l'atelier calquée
sur la proposition du 07/09.

