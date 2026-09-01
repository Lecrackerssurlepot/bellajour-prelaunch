# Lot juridique — ce qui attend la refonte des CGV

Ouvert le 01/09/2026. Mathias a tranché le 01/09 : « On corrigera avec l'intégralité des CGV
(prix, papier, grammage…) » — les corrections légales ne partent plus une par une, elles
partent d'un bloc, avec relecture juriste (T-026).

Ce fichier n'est pas un ticket : c'est la **liste de ce qui se perdrait** entre aujourd'hui et
ce jour-là. Une ligne par point : ce qui est à trancher, et où ça se répercute dans les textes.
Le détail vit dans le ticket cité ; ici on ne garde que la décision qui manque et sa cible.

⚠️ Rappel : **le portugais fait juridiquement foi** (siège à Lisbonne). Toute correction se
fait dans les trois langues du même fichier, et le PT est la version relue en priorité.
`legal-source/*.docx` a déjà une version de retard : **la source de vérité est le code.**

## Ce qui doit changer dans les textes

| # | À trancher par Mathias | Où ça se répercute | Ticket |
|---|---|---|---|
| 1 | **Format du magazine** : les CGV promettent 210 × 280 mm, Cloudprinter fabrique 210 × 297 (A4 exact, + 3 mm de fond perdu). Les faits ont tranché ; reste à corriger le texte. | `cgv.ts` FR ~227-232 et ses équivalents PT/EN ; à recouper avec `/magazine` | T-077 |
| 2 | **Prix finaux** : la grille `prix.ts` (30 / 40 / 45 € TTC port compris) n'a jamais été validée. Un montant par palier, et « TTC port compris » à confirmer. | annexe tarifaire des CGV (3 langues) + `src/lib/atelier/prix.ts` + `/magazine` | T-072 |
| 3 | **Palier de 29 pages** : `prix.ts` facture 20-29 pages à 30 €, les CGV écrivent « 20 à 28 pages ». Un album de 29 pages n'est couvert par aucune ligne. Aligner — dans quel sens est une décision. | CGV FR:247 / PT:491 / EN:735 **ou** `prix.ts:32` | T-006 |
| 4 | **Grammage réel** : `/magazine` affirme un grammage jamais mesuré. Soit on le confirme auprès de Cloudprinter, soit on retire le chiffre. Interdit nº5 : aucun chiffre inventé. | `/magazine` (fiche produit) + description du produit dans les CGV | T-028 |
| 5 | **Finitions d'impression** : `pageblock_130mcs` / `cover_250mcs` ont été *prises*, pas *choisies*. Elles décident de ce que la cliente tient dans les mains et du coût de revient. Dépend de l'étude de prix. | `src/lib/atelier/impression.ts` + description produit CGV + `/magazine` | T-027 |
| 6 | **Relecture juriste** : les CGV v3.0 n'ont jamais été relues. Points sensibles connus : droit portugais (DL 24/2014 art. 17.º/1 c), extinction de la rétractation à la validation de la maquette, article 5 cadré au régime transitoire de la prévente. | tout `cgv.ts`, PT en premier | T-026 |
| 7 | **Rétention de 90 jours** (décidée le 01/09) : anonymisation des dossiers abandonnés après 90 jours sans activité, préavis M10 à J-7. **La politique de confidentialité n'en dit rien** — le §7 ne parle que des photos supprimées 90 jours après *livraison*, pas du dossier jamais terminé. | `confidentialite.ts` §7 (tableau des durées), 3 langues | T-076 |
| 8 | **Bandeau de consentement** : le §8 le décrit en détail (accepter / refuser / personnaliser, preuve du choix, re-sollicitation périodique, politique cookies accessible via le bandeau). **Il n'existe pas dans le code** — zéro composant, zéro stockage de preuve. Le texte décrit un site qui n'est pas le nôtre. | `confidentialite.ts` §8.1, 3 langues — **ou** on construit le bandeau | — (écart relevé dans T-020) |
| 9 | **Pixel Meta** : le §8 et le §9 le déclarent (cookie soumis à consentement, responsabilité conjointe avec Meta Ireland). **Zéro `fbq(` dans le code aujourd'hui.** Mathias garde la mention : il fera de la publicité. À reconfirmer au moment du branchement réel, et à articuler avec le point 8. | `confidentialite.ts` §8.1, §8.2, §9 | — (écart relevé dans T-020) |
| 10 | **Numéro de version de la politique** : figée à « Version 3.1 — En vigueur le 13/06/2026 » alors que le texte a bougé le 01/09 (mesure d'audience). Le bumper est une décision, pas du ménage : la date affichée est ce sur quoi une cliente se repose. À trancher avec le lot. | `confidentialite.ts` `lastUpdated` (3 langues) + `cgv.ts` | — |
| 11 | **La VERSION acceptée n'est stockée nulle part** (correction du 01/09 : l'horodatage, lui, existe bien — `numeros.cgv_ok_at` et `renonciation_at`, migration `20260821_atelier_numeros.sql:79,81`). Le §3 promet de conserver « la version des CGV acceptée ET l'horodatage » : la moitié horodatage est tenue, la moitié version ne l'est pas. Avec une refonte des CGV qui arrive, c'est le moment de poser une colonne `cgv_version` — sans elle, on ne saura pas laquelle des deux versions une cliente a acceptée. | `numeros` (migration) **ou** `confidentialite.ts` §3, 3 langues | — |

## Ce qui est déjà fait et ne revient pas dans ce lot

- **01/09/2026 — mesure d'audience.** Sur accord explicite de Mathias, `confidentialite.ts`
  porte désormais Vercel Web Analytics : ligne « Vercel » du tableau §9 (finalité complétée) et
  un paragraphe en fin de §8.1, dans les trois langues. Rien d'autre n'a été touché : ni le
  pixel Meta, ni le bandeau, ni le §3, ni le numéro de version. Voir T-020.

## Une réserve qui n'appartient à aucun ticket

**Speed Insights n'est pas mentionné.** `src/app/components/Mesure.tsx` monte aussi
`@vercel/speed-insights`, qui envoie les Core Web Vitals réels (LCP, CLS, INP) avec la **même
URL masquée** par `beforeSend`. C'est de la mesure de performance, pas d'audience, et le
périmètre du 01/09 s'arrêtait à l'audience : le texte n'en parle donc pas. Si le §8 doit être
exhaustif sur ce qui sort du navigateur, c'est une phrase à ajouter — décision de Mathias.
