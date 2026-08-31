---
id: T-079
titre: Le dashboard métriques n'a pas d'insights ni de stratégie assistés par IA
domaine: admin
gravite: confort
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
« Avoir des insights et des stratégies à prendre à venir avec l'IA. Quelque chose où tout
est utilisé. »
## Ce que j'ai vérifié
Le dashboard `/admin/atelier/metriques` calcule des faits (durées, funnel, croisement
réactivité↔conversion) et un bloc « Lecture » énonce des constats dérivés des chiffres —
déterministe, jamais inventé. Une couche « stratégies IA » exigerait un appel à un modèle
(clé API, coût par consultation) et surtout du VOLUME : avec une poignée de dossiers, un
modèle ne produirait que des généralités.
## Ce que je propose
Attendre d'avoir ~50 dossiers pour que l'exercice ait un sens. Le jour venu : un bouton
« Analyser la période » qui envoie les agrégats (jamais les données personnelles) à l'API
Claude et affiche 3-5 recommandations sourcées sur les chiffres. Coût marginal, valeur réelle
seulement avec du volume.
**Question pour Mathias** : on se le note pour après le lancement ?
## Ce qui a été fait
30/08 : le bloc « Lecture » (constats calculés, sans IA) couvre le besoin immédiat.
