# Le message de partage en trois paragraphes et l'adresse longue (jusqu'au 28/10/2026)

`partage.ts` tel qu'il était sur `main` au 28/10/2026 (commit `8da3989e`), juste avant la demande de
Mathias du 28/10, avant d'envoyer l'espace à la vraie responsable d'Audencia : « le lien copié par
message peut être beaucoup plus simple ».

- `messagePartage` d'avant (planche 4 du 21/10) : trois courts paragraphes, un salut au nom du groupe
  (« Bonjour Bateau 1, », que Mathias trouvait bizarre), l'invitation (« Audencia prépare le magazine
  « Les Mousses » : tes photos y ont leur place. »), la date et le nombre de photos, le lien seul, puis
  « Merci, et à très vite dans les pages ! ». La fonction `apresBonjour` (l'article mis en minuscule
  après « Bonjour ») ne servait qu'à lui.

Remplacé par deux lignes avant le lien (« Les Mousses · Bateau 1 », puis « Dépose tes photos ici,
jusqu'au 16 novembre. »), voir `src/lib/collectif/partage.ts` et la section « Le message de partage »
de `src/lib/collectif/CLAUDE.md`. Le lien du message est l'adresse COURTE `/l/<clé>` ; l'adresse longue
`/depot/<token_depot>?p=<clé>` continue de marcher (la route courte y renvoie).

Ce fichier n'est importé par rien : il ne compile pas avec le projet (hors de `src/`).
