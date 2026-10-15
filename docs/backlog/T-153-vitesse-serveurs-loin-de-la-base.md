---
id: T-153
titre: Les serveurs Vercel tournent à Washington, la base à Dublin : chaque lecture traverse l'Atlantique
etat: en cours
domaine: perf
gravite: serieux
autonomie: libre
ouvert: 2026-10-15
---
## Ce que Mathias a dit (15/10/2026)
« Il faut voir aussi au niveau de la rapidité, vitesse par rapport aux serveurs. […] Pour
l'instant on optimise, et le jour où il faudra payer Vercel ou autre chose, on mettra ça en place. »

## Ce que j'ai vérifié (15/10)
- La base Supabase « Bellajour-waitlist » est en `eu-west-1` (Irlande).
- Le déploiement de production `e4fb760` tourne en `iad1` (Washington) : aucun `regions` dans
  `vercel.json`, Vercel prend donc sa région par défaut.
- Chaque lecture de la base fait l'aller-retour au-dessus de l'Atlantique, et une page en enchaîne
  plusieurs (la fiche d'une édition : l'édition, puis six lectures ensemble, puis les tours, puis
  les styles).
- La doc Vercel le dit : le plan Hobby accepte UNE région, n'importe laquelle (`regions` dans
  `vercel.json`). Déplacer les fonctions à Dublin (`dub1`) ne coûte rien.

## Ce que je propose
Mesurer AVANT de conclure (leçon du 09/09) : deux versions d'essai, l'une en `iad1`, l'autre en
`dub1`, mêmes pages, mesures alternées (14 à 16), même machine, même minute. Fusionner seulement si
la mesure le montre. Le changement touche tout le site (particuliers compris : Stripe, Brevo,
Cloudprinter sont appelés depuis la nouvelle région).

## Ce qui a été fait (15/10)
- `vercel.json` : `"regions": ["dub1"]` (branche `perf/region-dub1`).
- **Mesuré avant de fusionner**, sur deux versions d'essai construites en même temps, l'une en
  `iad1` (témoin, `perf/temoin-iad1`), l'autre en `dub1`. Mesures avec `curl` depuis la France,
  alternées, 18 de chaque côté, les deux premières retirées (démarrage à froid), toutes en 200 :

  | | Washington (`iad1`) | Dublin (`dub1`) |
  |---|---|---|
  | Tableau de bord d'une édition (`/edition/<token>`) | 1 190 ms (min 878) | 361 ms (min 267) |
  | Liste des photos (`POST /api/collectif/photos`, 782 photos) | 1 041 ms (min 707) | 424 ms (min 308) |

  L'accueil, qui ne lit pas la base, est servi au même temps des deux côtés : le gain vient bien
  des allers-retours vers la base.
- ⚠️ Piège de mesure : `fetch` de Node, avec son identifiant « node », se fait refuser une requête
  sur deux par la protection anti-robots de Vercel (403 rapides qui faussent la médiane) ;
  `curl` passe. Ne compter que les 200.

## Reste
- Vérifier après la fusion que la production tourne en `dub1` et que les pages répondent.
