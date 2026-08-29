---
id: T-020
titre: On ne saurait pas qu'une visiteuse décroche
domaine: exploitation
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Signalé dans D5 le 27/08/2026 : « Web Analytics n'est pas activé sur le projet : on n'a
aujourd'hui AUCUN moyen de voir un décrochage Android. »
## Ce que j'ai vérifié
Aucune trace de Vercel Analytics, Speed Insights ou d'un quelconque traceur dans le dépôt.
Effet : on ne sait pas combien de visiteuses arrivent, sur quel appareil, ni où elles partent.
Concrètement, aujourd'hui, on ne peut pas répondre à : combien de gens ouvrent `/`, combien
arrivent sur `/magazine`, combien commencent le questionnaire, combien l'abandonnent et à quel
écran. Le dossier abandonné du 27/08 a été découvert à la main.
Une visiteuse qui subit le jank de la barre ne le signale pas : elle part.
## Ce que je propose
Vercel Speed Insights + Web Analytics : deux lignes dans le layout racine, pas de cookie, pas de
bandeau de consentement à ajouter. C'est le minimum pour que les décisions cessent d'être prises
à l'aveugle avant le lancement.
**Question pour Mathias** : je l'active ? C'est une option payante au-delà d'un quota sur Vercel,
et c'est ta décision. Si tu préfères un outil sans traceur tiers, dis-le — il en existe.
## Ce qui a été fait
—
