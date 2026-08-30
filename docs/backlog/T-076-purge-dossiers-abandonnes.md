---
id: T-076
titre: Les dossiers abandonnés gardent leurs données personnelles sans limite de durée
domaine: donnees
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-30
---
## Ce que Mathias a dit
(Découvert en répondant à sa question « pourquoi la demande s'enregistre avant la fin des
photos ? » — la création précoce est saine et voulue, mais elle a un angle mort.)
## Ce que j'ai vérifié
Le dossier s'écrit en base dès l'écran 4 (`numero/route.ts:121-133`) — c'est le filet du
parcours, rien à y changer. Mais si la cliente abandonne là, son email, son téléphone, son
histoire et ses photos restent en base et sur R2 pour toujours : aucun filtre, aucune purge
nulle part (vérifié dans src/app/api, src/lib/atelier, scripts). Recoupe T-033 (aucun
processus d'effacement) et T-023 (photos orphelines sur R2).
## Ce que je propose
Une politique de rétention : au-delà de N jours sans dépôt terminé ni paiement, anonymiser le
dossier (ou le supprimer) et effacer les photos R2, avec un dernier mail de relance avant
échéance si souhaité. Le N n'existe nulle part et ne s'invente pas.
**Question pour Mathias** : combien de temps garde-t-on un dossier abandonné ? (usuel : 30 à
90 jours). Et : anonymiser ou effacer ?
## Ce qui a été fait
—
