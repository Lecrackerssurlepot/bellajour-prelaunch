---
id: T-153
titre: Les serveurs Vercel tournent à Washington, la base à Dublin : chaque lecture traverse l'Atlantique
etat: nouveau
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

## Ce qui a été fait
Rien encore.
