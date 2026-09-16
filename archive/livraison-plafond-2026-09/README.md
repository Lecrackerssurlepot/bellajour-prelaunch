# Le plafond d'absorption du port, archivé le 16/09/2026

`livraison.ts` tel qu'il était du 10/09 au 16/09/2026 : le client payait le devis
Cloudprinter du jour dans tous les pays, avec un plafond `LIVRAISON_PLAFOND_CENTIMES`
(jamais posé, resté `null`) au-delà duquel Bellajour aurait absorbé la différence
(`livraisonClientAvec`, `livraisonClient`).

Remplacé par les zones de port à prix fixe du tableur « Prix & Marge v3 » (zone A 5 €,
zone B 13 €, zone C au devis, offerte dès 50 € TTC de magazines). T-106 est fermé par
cette décision. Le devis du jour reste la règle de la zone C : `ttcDepuisHt` et
`lireDevisCloudprinter` vivent toujours dans `src/lib/atelier/livraison.ts`.

Hors périmètre de compilation. Rien n'importe ce fichier.
