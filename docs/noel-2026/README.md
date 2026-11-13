# Noël 2026 — dossier stratégie B2C (13/11/2026)

Source de vérité de la stratégie Noël. Version Notion : fiche « Stratégie Noel » (Board Cofondateurs).
Règle : toute décision change ICI d'abord, puis Notion.

| Fichier | Contenu |
|---|---|
| STRATEGIE.md | règles, offres, segments, calendrier, capacité, points ouverts |
| TARIFICATION.md | options de prix (cartes, 2ᵉ exemplaire) à trancher |
| PARCOURS-ACHAT.md | carte cadeau et 2ᵉ exemplaire dans le tunnel, wording festif |
| MAILS.md | liste complète des mails, 2 tons, calendrier |
| CA-PREVISION.md | scénarios de chiffre d'affaires (HYPOTHÈSES, pas des données) |
| COMMUNICATION-RESEAUX.md | plan Instagram organique + accueil sur le site |
| PROMPT-TOTAL.md | le prompt unique à coller dans Claude Code |
| LOOP.md | la liste de tâches du /loop + règles de sécurité |

## Constats du 13/11 (vérifiés)
- Charte réelle = `CLAUDE.md` du repo + `src/app/CLAUDE.md` (monde sombre `(atelier)/theme.css`, Cormorant Garamond + DM Sans, accent #4a90d9). Le skill « bellajour-mail » (palette #B8834A, Playfair, « album », 1 page = 1 €) est PÉRIMÉ. Le gabarit Brevo 24 utilise #4A90D9 et un cadre à coins arrondis : il suit le repo, pas le skill.
- `src/lib/atelier/exemplaires.ts` code 2ᵉ à -30 %, suivants à -50 %, max 10, figé dans `scripts/verif-atelier.ts` : à REMPLACER (prompt 4).
- Supabase : aucune table carte cadeau. Existe `pages_credits` (email, montant entier, source, status) et `numeros.compte_id → auth.users`. RLS activée partout, sans policy : accès serveur par service key uniquement (cohérent avec le socle).
- Colonne `numeros.cloudprinter_order_id` et `docs/reference/SPECS-CLOUDPRINTER.md` : le code parle encore Cloudprinter. SoBook = manuel ou à brancher ? OUVERT.
- Stripe : compte live unique « Bellajour », aucun produit actif. Pas d'environnement test visible via l'outil : les tests se font avec les clés test du repo (`.env`), jamais en live.
- Brevo : compte « Bellajour » (contact@bellajour.com), plan gratuit 300 envois/jour : à surveiller pour un envoi massif. Attributs existants : PRENOM, NOM, OPT_IN, REF_CODE… ; à créer si besoin : MONTANT, CODE, PRENOM_DONATEUR (passés en params transactionnels, pas besoin d'attribut).
