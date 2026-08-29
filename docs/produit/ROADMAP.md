# Route jusqu'au lancement

Trois jalons. Chacun est fini quand ses tickets sont fermés, pas quand on en a l'impression.

## Jalon 1 — Rien ne se tait (les bloquants)
Le produit fonctionne, mais deux défauts font perdre une donnée ou une cliente en silence.
`T-001` le numéro de suivi jamais enregistré · `T-002` les liens de parrainage morts.
**Fini quand** : une expédition de test affiche son suivi, et une inscription par lien de
parrainage est correctement rattachée à sa marraine.

## Jalon 2 — On sait ce qui se passe
Aujourd'hui on découvre les problèmes à la main, après coup.
`T-020` mesurer l'audience · `T-022` sortir les mails des Promotions · `T-007` un mail sauté se
signale · `T-010` la vérification avant commit · `T-011` l'inventaire des variables ·
`T-024` la page Santé qui ne crie plus à tort.
**Fini quand** : on peut répondre, sans lire de code, à « combien de visiteuses, combien de
dossiers commencés, combien abandonnés, et où ».

## Jalon 3 — Prêt à vendre à des inconnues
`T-025` les cinq mails jamais envoyés · `T-027` les finitions d'impression tranchées ·
`T-028` les promesses de la page produit · `T-026` la relecture juridique · `T-021` le crédit
fondateur · `T-006` l'écart des CGV · puis la bascule en LIVE
(`docs/reference/BASCULE-LANCEMENT.md`).
**Fini quand** : une commande passée par quelqu'un qu'on ne connaît pas va jusqu'à la boîte aux
lettres sans intervention manuelle.

Le reste du backlog (sécurité, performance, accessibilité, dette) se traite en continu, entre
deux jalons. Il ne bloque pas le lancement, il évite d'en payer le prix après.

⚠️ Aucune date n'est posée ici tant que Mathias n'en a donné aucune. Une échéance inventée est
une promesse qu'on se fait à soi-même.
