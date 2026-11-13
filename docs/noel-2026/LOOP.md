# /loop Noël — liste de tâches et règles

Lancer dans Claude Code (repo bellajour-prelaunch) :

`/loop Lis docs/noel-2026/LOOP.md. Fais la première tâche non cochée, coche-la avec une preuve, passe à la suivante sans t'arrêter tant que la liste n'est pas finie ou bloquée. À la fin (ou si tout est bloqué), génère docs/noel-2026/RAPPORT.html puis arrête-toi.`

## Règles de sécurité (non négociables)
1. Branche `noel-2026`, jamais de commit/push sur main (CLAUDE.md interdit 1). Preview Vercel de la branche pour regarder.
2. Stripe : clés TEST uniquement ; si seule la clé live est trouvée, la tâche est marquée BLOQUÉE.
3. Brevo : brouillons uniquement ; envoi seulement de tests vers mdurand085@gmail.com, après avoir nommé le compte « Bellajour ».
4. Supabase : migrations écrites en .sql (supabase/migrations), JAMAIS appliquées en production ; vérification locale/branche seulement.
5. Aucun chiffre, délai ou prix inventé : si la donnée manque, noter dans « À décider ».
6. Une tâche bloquée par une décision de Mathias → la noter dans RAPPORT, passer à la suivante.
7. Charte du repo (src/app/CLAUDE.md) ; chaque visuel porte sa checklist charte, cochée seulement après vérification 375 px + desktop.

## Tâches (cocher + preuve : fichier/capture/commande)
- [ ] T1 Diagnostic (Plan Mode) : exemplaires.ts, prix.ts, webhook Stripe, /compte, pages_credits ; confirmer comment l'envoi SoBook/Cloudprinter fonctionne (manuel ou code) — écrire la réponse.
- [ ] T2 Page `/noel-preview` + flag.
- [ ] T3 GiftCardVisual : 3 variantes, animations transform/opacity, reduced-motion.
- [ ] T4 Section « Offrir » (/ et /magazine) + page /offrir.
- [ ] T5 Bloc panier carte (Ajouter / Non merci) + bloc 2ᵉ exemplaire FR (même/autre couverture).
- [ ] T6 Compteur de places + bandeau 7 déc.
- [ ] T7 Migration SQL gift_cards (+ redemptions) écrite, non appliquée ; types.
- [ ] T8 Achat carte Stripe test + webhook idempotent + code BJ-CADEAU.
- [ ] T9 Utilisation du code : usage unique, reliquat crédité, total 0 € hors Stripe ; cartes dans /compte.
- [ ] T10 Page /carte/[token] imprimable, noindex.
- [ ] T11 Règle 2ᵉ exemplaire serveur (FR, max 2) remplaçant -30 %/-50 % ; adapter verif-atelier.ts ; archiver l'ancien.
- [ ] T12 Mails : gabarits N1, N2, GC1-GC4, blocs M4/M5 en brouillons Brevo, 2 tons, relus contre le gabarit 24 ; tests vers Mathias.
- [ ] T13 Vérifs : tsc, lint, build, verif-atelier ; scénarios test : achat 25 €, utilisation, total 0 €, 2ᵉ ex. FR vs hors FR.
- [ ] T14 Captures 375 px + desktop de chaque visuel, checklists cochées.
- [ ] T15 Mise à jour ETAT-PRODUCTION.md, DECISIONS.md, journal du jour.
- [ ] T16 RAPPORT.html : une page lisible (sections : fait / cassé / à décider / captures / prochaines étapes), 1 écran par visuel.

## À décider au retour de Mathias
Montants des cartes (TARIFICATION.md), minimum du montant libre, SoBook (port > 500 g, brillant, manuel/code), réponse M. Beito, opt-in waitlist.
