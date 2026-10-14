---
id: T-149
titre: L'envoi des photos et l'atelier peuvent être bien plus fluides qu'aujourd'hui
etat: nouveau
domaine: collectif
gravite: confort
autonomie: avis-requis
ouvert: 2026-10-14
---
## Ce que Mathias a dit (14/10/2026)
« Je veux que tu gardes bien ces informations pour que l'atelier soit ultra fluide, pour qu'on
puisse uploader toutes les photos de la meilleure des façons. On a mis en place ce qu'il y avait
dans le projet, mais ça se trouve on peut faire mille fois mieux. Je veux qu'on fasse mille fois
mieux. Si c'est possible, un upload qui ne s'arrête pas, qui peut continuer. Si on doit prendre
des abonnements, on les prendra (Vercel ou autre), pas pour l'instant. Toutes ces optimisations
qui font des appels API, peut-être même intégrer Claude au projet, si besoin et si ça peut
servir. On reviendra plus tard. »

## Ce que j'ai vérifié (14/10)
Rien encore : c'est une intention, pas un défaut constaté. Aujourd'hui le moteur d'envoi
(`edition/_composants/depot/`) reprend un fichier sur la MÊME clé R2 (`cle_fichier`), ne garde
rien dans le navigateur et tient au plus 8 photos réduites en mémoire ; il s'arrête quand
l'onglet se ferme.

## Pistes à MESURER avant de choisir (aucune n'est décidée)
- Un envoi qui survit à la fermeture de l'onglet ou à une coupure : envoi par morceaux
  reprenables (multipart R2), file d'attente gardée dans le navigateur (avec le piège du quota
  IndexedDB connu à 2 000 photos), ou application installable.
- Le débit : nombre d'envois parallèles, taille des réductions, mesures sur un vrai iPhone et
  sur une vraie connexion 4G.
- Les abonnements possibles (Vercel ou autre) : seulement s'ils lèvent une limite mesurée.
- Claude dans le projet : tri, légendes, détection de doublons ou de photos ratées, suggestions
  à l'atelier ; seulement là où ça sert, et jamais une décision prise à la place de l'atelier.

## Ce qui a été fait
Rien encore. Ticket ouvert le 14/10/2026, à reprendre quand Mathias le dira.
