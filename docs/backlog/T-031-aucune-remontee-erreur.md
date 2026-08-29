---
id: T-031
titre: Une erreur en production n'est vue par personne
domaine: exploitation
gravite: serieux
autonomie: avis-requis
ouvert: 2026-08-29
---
## Ce que Mathias a dit
Rien — angle mort identifié le 29/08 en revue de préparation au lancement.
## Ce que j'ai vérifié
Aucun outil de remontée d'erreur dans le dépôt : pas de Sentry, pas d'équivalent. La seule trace
d'une erreur serveur est le journal Vercel, qu'il faut aller ouvrir en sachant quoi chercher.
C'est l'angle mort le plus cohérent avec le mode de panne dominant de ce produit : **rien ne
casse, tout se tait**. Trois exemples déjà payés — M0 sans template pendant des semaines, le
`tracking_code` effacé par le repli 42703, le dépôt abandonné du 27/08 découvert à la main.
Concrètement : si `/api/atelier/checkout` se met à répondre 500 demain matin, personne ne
l'apprendra avant qu'une cliente n'écrive.
## Ce que je propose
Une remontée d'erreur serveur avec alerte par mail, branchée sur les routes qui encaissent et sur
la relève quotidienne. Sentry a une offre gratuite qui suffit largement à ce volume ; leur SDK
Next.js s'installe en une commande.
**Question pour Mathias** : je l'installe ? C'est un tiers de plus dans la chaîne, et il voit les
traces d'erreur — donc potentiellement des données de clientes dans les messages. Il faut le
configurer pour ne rien envoyer d'identifiant, ce que je sais faire, mais c'est ta décision.
## Ce qui a été fait
—
