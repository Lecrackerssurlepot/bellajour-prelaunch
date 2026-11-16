# Décisions de Mathias pour le développement de Noël (16/11/2026)

Prises dans la conversation du 16/11. Elles remplacent les hypothèses de archive/TARIFICATION.md et de STRATEGIE.md.

| Sujet | Décision |
|---|---|
| Phrase de la carte | « Vos photos deviennent un magazine. » (14/11) |
| Montants de la carte | 30 € et 50 €, plus un montant libre de 20 à 200 € |
| Prix réels du magazine en France (grille.ts) | 24 p = 24 €, 36 p = 41 €, 48 p = 54 €, 60 p = 64 €, port de 5 € sous 50 € (les 25/35/45/55 € de archive/TARIFICATION.md étaient faux) |
| 2ᵉ exemplaire | Règle de Noël (-40 % même couverture, -20 % autre couverture, 2 au plus, France seulement) **pendant Noël seulement**, puis retour automatique à l'ancienne règle (-30 % le 2ᵉ, -50 % du 3ᵉ au 10ᵉ, partout) |
| Reliquat d'une carte | **Sur le compte** (`/compte`) : la personne doit avoir un compte pour garder le reste |
| Facture d'une carte | Un reçu Stripe à l'achat, sans fatura. La fatura (brouillon InvoiceXpress relu par Louis) se fait à la commande du magazine, carte déduite (bon à usages multiples) |
| Migration en production | Autorisée pour les tables de Noël (cartes, mouvements de crédit), vérifiée en SQL |
| Compteur de places | Une place = un dossier **payé** depuis l'ouverture ; plafond 25 avant le 7 décembre |
| Imprimeur de Noël | **SoBook**, par son API (à brancher : documentation et clé à fournir par Mathias) |
| Bandeau | « Offrir une carte » mène à `/offrir` |
| Chapitre de l'accueil | Gardé tel quel pour l'instant (« pas festif, mais okay ») |

## État du développement

| Lot | État au 16/11 |
|---|---|
| 1. Tables + règles pures | Fait. Migration `20261116_noel_cartes_cadeau.sql` appliquée en production, vérifiée en SQL |
| 2. Acheter une carte | Fait sur `noel-2026` (Stripe en mode test). `/offrir` → Stripe → `/offrir/merci` (code + lien d'impression) ; `/carte/<token>` imprimable. Testé de bout en bout en local : une seule carte en base après deux chargements de la page de retour. Mails GC1, GC1b, GC2 branchés mais **sautés tant que les gabarits Brevo n'existent pas** (`BREVO_TEMPLATE_GC*_ID`) |
| 2 bis. Retouches du 16/11 | Fait : moins de défilement (carte à gauche sur ordinateur, prénoms côte à côte), vraie signature Bellajour sur la carte et en tête des pages, dédicace « Pour Vanessa » au-dessus de la phrase et le mot en italique dessous, bandeau de jours à la place du calendrier, e-mail ET impression cumulables, paiement de la carte limité à la carte bancaire (Apple Pay et Google Pay passent par elle) |
| 3. Utiliser la carte au paiement du magazine | Fait sur `noel-2026`. Le lien du mail GC2 ouvre `/composer?carte=CODE` : le code est retenu sur l'appareil et s'applique tout seul à `/numero` au moment de payer ; sinon « J'ai une carte cadeau » au bon de commande. La carte paie les magazines puis le port (coupon Stripe à usage unique) ; le reste va au compte (`credits_mouvements`, même échéance que la carte), affiché à `/numero` après paiement et en tête de `/compte`, déduit tout seul au numéro suivant. Fatura : passe en revue manuelle (TVA sur le prix plein, alerte à Louis en live). Envoi programmé : la relève quotidienne (8 h Paris) envoie GC2 puis GC2b le jour choisi, cartes du mode de la clé Stripe seulement. Testé en local le 16/11 : dossier « Test Noël carte cadeau » (archivé) payé 0 € avec la carte de 50 €, carte « utilisée », 12 € au compte, rejeu du webhook sans doublon ; relève : seule la carte du jour est prise, un échec retire le verrou. **Pas prouvé : l'envoi réel, faute des gabarits GC dans Brevo** |
| 3 bis. Les mails (16/11 soir) | Fait sur `noel-2026`. Ton et structure validés (artefact « Mails de Noël ») ; texte dans `scripts/mails-noel.mjs`, images dans `public/images/mails/noel/`. GC2 part AVANT GC1, qui dit « elle est partie chez Camille, à … » ; GC3 fondu dans M4 (récapitulatif carte et crédit) ; GC7 à l'acheteur quand la carte sert ; relève : reprise d'un envoi immédiat raté, GC4 et GC4b à J−30, GC6 le 15/01/2027 (cartes parties avant le 31/12). `/offrir` : suggestion d'adresse, adresse relue avant paiement, « Bon à savoir » (#conditions). Parcours prouvé dans le harnais (fausse base, faux Brevo, 28 étapes). **Rien dans Brevo** : `BREVO_TEMPLATE_GC1_ID` … `GC7_ID` à poser après la poussée, sur son accord |
| 3 ter. Retours du 16/11 après-midi | Fait : carte des mails sur fond image (lisible en sombre), code au prénom `CAMILLE-NOEL-4821` (4 chiffres, l'ancien `BJ-CADEAU-XXXXXX` reste accepté), reçu Stripe via `/api/cartes/recu/<token>` (ligne « Reçu » dans GC1 et GC1b), emojis dans les objets. Audit des 13 mails : liens et images en 200, boutons et blocs sombres blindés (`bgcolor`) pour les messageries qui retirent le CSS, code insécable. Gabarits GC1 à GC7 repoussés dans Brevo (ids 47 à 55) |
| 4. Règle de Noël du 2ᵉ exemplaire + compteur de places | Fait sur `noel-2026`. `regleExemplaires` (exemplaires.ts) : −40 % même couverture, −20 % autre, 2 au plus, France, du 16/11 au **24/12 (date supposée, à confirmer)** ; hors fenêtre ou 3 exemplaires et plus : −30/−50. Choix de couverture dans la table `noel_exemplaires` (migration appliquée, vérifiée en SQL), lu par `regleDuDossier` dans TOUS les lecteurs d'argent (page /numero, paiement, livraison, transition admin). Compteur : `/api/noel/places` (dossiers payés en mode de la clé depuis le 16/11, plafond 25, jusqu'au 07/12), il informe et ne bloque pas. Harnais `verif-noel-exemplaires.ts`. **Les CGV disent encore −30/−50** (texte légal : accord de Mathias) |
| 5. Bandeau, chapitre, bloc /magazine sur le vrai site | Fait sur `noel-2026`, derrière `NEXT_PUBLIC_GIFT_CARD_ENABLED` : bandeau en verre sur `/` et `/magazine` avec les places, bloc carte et règle de Noël sur `/magazine`, chapitre de l'accueil |
| 6. SoBook | En attente de la documentation et de la clé |

Tranché le 16/11 : la carte cadeau se paie par carte bancaire seulement (Apple Pay compris). Le paiement du MAGAZINE garde les moyens du compte Stripe (non touché).
