---
id: T-067
titre: Une page indexable vend encore un programme qu'on n'honore plus
domaine: produit
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — audit de référencement du 29/08/2026.
## Ce que j'ai vérifié
`src/app/ambassadeurs/page.tsx:13-34` — page publique, **indexable** (aucun `robots`), avec son
propre canonical, qui vend le Cercle Ambassadeur (« Parrainez vos proches, gagnez des pages et des
albums offerts ») et sert toujours sa section `Inscription` (`:42`).
Or l'article 5.0 des CGV v3.0 limite tout ce régime aux commandes du 13/06 au 15/08/2026.
Une visiteuse qui cherche « bellajour ambassadeur », ou qui rouvre un vieux lien Instagram,
s'inscrit à un programme qu'on n'honore plus — et il faudra le lui expliquer après coup.
S'y ajoute : `/ambassadeurs` et `/ambassadeurs/charte` sont absentes du plan du site, et aucune
page vivante ne les lie. Deux pages orphelines que plus personne ne surveille.
⚠️ Lié à T-040 : c'est la même zone, et sa route d'inscription est ouverte à qui veut.
## Ce que je propose
Trois options, et c'est une décision commerciale :
1. Le programme continue → le dire clairement sur la page, la rattacher au site et au plan du site.
2. Il est clos → un bandeau qui le dit, la section d'inscription retirée, `noindex`.
3. Il est en sommeil → `noindex` seul, la page reste accessible par lien direct.
**Question pour Mathias** : le Cercle Ambassadeur est-il encore actif ? Tant que je ne sais pas,
je ne touche à rien : retirer une page qui vend serait pire que de la laisser.
## Ce qui a été fait
—
