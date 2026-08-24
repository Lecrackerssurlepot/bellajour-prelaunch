# Bellajour — Contexte projet complet

## Identité marque
- Maison d'édition du souvenir
- Signature : "Vivez. Nous composons."
- Positionnement : album photo premium, IA + curation humaine
- Ton : premium + humour possible (pas solennel)

## Objectif de ce repo
Landing page waitlist pré-lancement.
Collecte emails → parrainage → offre Fondateurs (100 places) → Stripe.

## Stack technique
- Next.js 16 + TypeScript
- Tailwind (global uniquement — pas sur Hero/sections)
- Supabase (base de données + auth magic link)
- Stripe Checkout (paiements)
- Brevo (emails + séquences)
- Vercel (déploiement + variables d'env)

## Design tokens (validés sur la landing)
--cream: #EAE3D8          /* fond Hero */
--dark: #1C1C1C           /* fond sections sombres */
--ink: #1C1C1C            /* texte principal */
--ink-light: #F0EBE1      /* texte clair sur fond sombre */
--muted: #A89880          /* texte secondaire / accents */
--steel: #778899          /* couleur accent bleu-gris — boutons, points, numéros */
--steel-glass: #77889926  /* bouton CTA — glassmorphism bleu-gris semi-transparent */
--border: #2C2C2C         /* séparation Hero → section sombre */

Fonts réellement chargées (src/app/layout.tsx) — ne pas ajouter de poids sans usage :
Font serif  : Cormorant (Google Fonts) — 7 poids : 300n, 300i, 400n, 400i, 500i, 700n, 700i
Font sans   : DM Sans (Google Fonts) — 5 poids : 300n, 300i, 400n, 400i, 500n
Playfair Display : NON chargée sur la landing — utilisée uniquement dans l'OG image
              (src/app/opengraph-image.tsx, server-side, indépendant du <link> fonts)

⚠️ Écart charte/code à investiguer :
- La charte mentionne « Cormorant Garamond » mais le code charge « Cormorant » (police distincte)
- La charte mentionne Playfair Display Bold pour les titres Hero, mais le titre Hero
  utilise en réalité Cormorant 300/300i (hero-headline). Playfair absent de la landing.

## Règles design absolues
- Bouton CTA : fond --steel-glass (#77889926), texte --steel (#778899), border-radius présent
- Inputs : fond transparent, glassmorphism léger, border-radius présent
- Numéros de section (01, 02...) : couleur --steel, Cormorant italic
- Zéro ombre (box-shadow, text-shadow)
- Positions CSS : vw/vh uniquement — zéro px fixes pour positions

## Règles CSS absolues
- Zéro next/image → <img> plain uniquement
- Zéro px fixes pour positions → vw/vh uniquement
- CSS vanilla dans fichiers .css dédiés par section
- Pas de CSS Modules — classes CSS directes
- Animations scroll-driven → uniquement requestAnimationFrame + JS
- Système de thèmes via data-theme="light" / data-theme="dark" sur les sections

## Bascule du 24/08/2026 — bellajour.fr EST l'Atelier
- `/` = la homepage de l'Atelier (`src/app/(atelier)/page.tsx`), `/composer` = le questionnaire.
  Le groupe de routes `(atelier)` ne crée AUCUN segment d'URL ; il isole le thème sombre et les
  deux polices, pendant que /preventes, /merci et les pages légales restent en dehors.
- 308 permanentes `/atelier` → `/` et `/atelier/composer` → `/composer` (next.config.ts).
  ⚠️ Une 308 se met en cache côté navigateur : ne pas les inverser à la légère.
- L'ancienne landing waitlist (`src/app/page.tsx`) est SUPPRIMÉE du routage. Composants orphelins
  restant sur le disque : Anxiete, BrandIntro, Solution, Album, FinalWaitlist, StickyVText,
  StickyJoinCTA (leur CSS n'est plus servi — il est importé par les composants eux-mêmes).
  Hero et FAQ restent utilisés (ambassadeurs, S5Garanties), Footer par 8 fichiers.
- `/preventes` et `/preventes/prix` : `noindex, follow`. Sitemap = `/` + pages légales.
- Fermeture de la prévente : drapeau `PREVENTE_FERMEE=true` (src/lib/prevente.ts), lu CÔTÉ SERVEUR.
  Ferme `/api/checkout` (410) et bascule `/api/offer-state` en `offerMode: 'closed'` ; le bandeau
  d'annonce disparaît, les CTA pointent `/`, la section 4 rend un encart de clôture.
  Ne touche JAMAIS `/api/webhook`, `/merci`, les pages légales ni les crédits — 14 fondateurs ont
  des droits ouverts et les CGV v3.0 les maintiennent en régime transitoire.

## Structure fichiers
src/app/layout.tsx        → <head> fonts + metadata
src/app/globals.css       → tokens + reset + imports CSS sections
src/app/(atelier)/page.tsx → LA homepage (sert `/`)
src/app/(atelier)/composer → le questionnaire (sert `/composer`)
src/app/hero.css          → styles Hero
src/app/Hero.tsx          → composant Hero
src/app/sections/         → une section = un .tsx + un .css
src/app/api/waitlist/     → POST email → Supabase + Brevo
src/app/api/referral/     → tracking codes parrainage
src/lib/supabase.ts       → client Supabase
src/lib/brevo.ts          → client Brevo
public/hero.css           → copie de hero.css pour previews statiques

## Previews statiques
public/preview-anxiete.html → preview HTML statique section Anxiété (référence)
NE PAS modifier — sert de référence visuelle uniquement

## Composants UI transversaux
- Sticky CTA bouton gauche : class="sjc" — visible sur toutes les sections
- Modal parrainage : class="rs-backdrop" — s'ouvre après inscription waitlist
- Sticky nav verticale gauche/droite : "MAISON D'ÉDITION DU SOUVENIR" / "VIVEZ, NOUS COMPOSONS"
- hero-count-dot : point animé couleur --steel avant le compteur waitlist

## Assets
public/images/ui/logo.webp
public/images/ui/signature.svg
public/images/hero/hero-01.webp à hero-07.webp
public/images/anxiete/grid-01.jpg à grid-06.jpg
public/images/anxiete/float-01.jpg à float-04.jpg
cd ~/Desktop/bellajour-photos/originaux/Brand
ls -lah
## Variables d'environnement (jamais dans le code)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
BREVO_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## Tables Supabase
⚠️ Schéma RÉEL (vérifié sur la DB live) : seulement 2 tables métier. Les tables
contacts / referrals / points_log / influencers n'existent PAS — tout vit dans
waitlist + pages_credits.

waitlist  — table centrale (inscrits + clients + ambassadeurs)
  id, email, prenom, ref_code (code de parrainage de la personne),
  referred_by (ref_code du parrain), created_at, email_canonical,
  offer_type [founder|standard|influencer], status [waitlist|pending|confirmed|refunded],
  numero_fondateur, is_ambassadeur, confirmed_at,
  + secondaires : stripe_payment_intent, ref_influenceur, consent_at,
    ambassadeur_consent_at, ambassadeur_charte_version, a3_notified_at
pages_credits  — crédits de parrainage
  id, email (bénéficiaire), montant (+5 parrain / +3 self), source (ref_code filleul
  ou "SELF:<refcode>"), niveau [0=bonus self | 1=filleul direct | 2=grand-filleul],
  filleul_email, status [pending|confirmed|applied], created_at, applique
admin_last_seen  — singleton interne (timestamp "dernière visite" du dashboard /admin)

## Dashboard interne /admin
- /admin : dashboard interne LECTURE SEULE (inscrits / clients / ambassadeurs,
  KPI, graphique inscrits/jour, export CSV). Non lié dans la nav publique.
- Protégé par mot de passe partagé : middleware.ts (cookie HMAC bj_admin) +
  env ADMIN_PASSWORD (Vercel Preview + Production). Service key strictement server-side.
- Seule écriture autorisée : admin_last_seen. Ne touche jamais aux données métier.

## Sections landing page (ordre d'affichage)
1. Hero      — photos flottantes + headline + formulaire waitlist
              fond : --cream (#EAE3D8) | data-theme="light"
2. Anxiete   — scroll storytelling, grid photos, texte séquentiel
              fond : --dark (#1C1C1C) | data-theme="dark"
3. Solution  — comment ça marche (01 Upload, 02 Questionnaire, 03 La sélection, 04 La mise en page)
              fond : --cream | data-theme="light"
4. Album     — preuve visuelle produit (section manquante — à construire)
              fond : à définir
5. Waitlist  — CTA final + compteur inscrits + avantages Fondateurs
              fond : --cream | data-theme="light"
6. FAQ       — accordion questions/réponses
              fond : --cream | data-theme="light"
7. Footer    — "© 2026 Bellajour. Vivez. Nous composons."

## Statut sections
✅ Hero        — validé (Hero.tsx + hero.css)
✅ Anxiete     — validé (Anxiete.tsx + anxiete.css)
✅ Solution    — validé (sections/solution)
⏳ Album       — à construire (section produit manquante)
✅ Waitlist    — validé
✅ FAQ         — validé
✅ Footer      — validé


ls .claude/worktrees/friendly-banach/ 
## Règles absolues de sécurité
- Clés API jamais dans le code → variables Vercel uniquement
- Rate limiting sur /api/waitlist (max 3 req/min par IP)
- Signatures Stripe webhooks vérifiées
- Supabase RLS activé sur toutes les tables
- Git commit après chaque section validée

## Comportement attendu de Claude Code
- Toujours lire CLAUDE.md en début de session
- Vérifier les fichiers existants avant d'écrire
- Ne jamais inventer un chemin image → vérifier dans /public/
- Positions CSS en vw/vh uniquement
- En cas de doute → demander plutôt qu'inventer
- Committer sur Git après chaque bloc validé
- Ne jamais réécrire un fichier entier pour une correction partielle
- Montrer les lignes exactes à modifier avant d'appliquer
- Respecter data-theme="light/dark" sur chaque section

## Cleanup post-launch
- Supprimer src/app/components/ReferralSheet.tsx + referralsheet.css (orphelins, jamais importés).

## Prévente — Section 4
- Le prix/offre d'acompte est TOUJOURS décidé par le backend (/api/checkout). Le front envoie expected_offer (affichage seulement) et gère le 409 offer_changed. Ne jamais hardcoder un montant ni le seuil FOUNDER_CAP côté front.

## Perf / animations — backdrop-filter (règle anti-jank prévente)
Sur les pages prévente, ne JAMAIS poser `backdrop-filter: blur()` sur :
- un élément en flux large posé sur un fond PLAT (couleur uniforme, ex. --bj-cream) :
  flouter une couleur uniforme = no-op visuel, mais Chrome la re-rastérise à chaque
  frame de scroll = jank. → retirer le blur, le rendu est identique.
- une navbar `position:fixed` sur Chrome/Android : même cause, jank garanti.
  → fallback fond quasi-opaque sur Android only (détection UA scopée à la page),
  verre dépoli conservé sur desktop + Safari iOS.
Réf : commit 246d8e5, tokens --bj-nav-android-bg, classe .pv-nav--flat.

## Mapping templates Brevo (transactionnels prévente)
- F1 (Fondateur) = template 17, env BREVO_TEMPLATE_F1_ID, déclencheur webhook completed (offre founder)
- S1 (Standard)  = template 18, env BREVO_TEMPLATE_S1_ID, déclencheur webhook completed (offre standard)
- P3 (Parrain)   = template 19, env BREVO_TEMPLATE_P3_ID, déclencheur webhook completed si referred_by (parrain only)
- A1 (Ambassadeur bienvenue) = template 20, env BREVO_TEMPLATE_A1_ID, déclencheur /ambassadeur/register si !wasAlreadyAmbassador
- A2 (Ambassadeur accès)     = template 21, env BREVO_TEMPLATE_A2_ID, déclencheur /ambassadeur/request-access (redemandable)
- Relance (session.expired)  = template 23, env BREVO_TEMPLATE_RELANCE_ID, BRANCHÉ (case checkout.session.expired, garde-fou status='pending', params { PRENOM })
- A3 (album offert au 6e = 30 pages niveau 1+2) = template 22, env BREVO_TEMPLATE_A3_ID, BRANCHÉ (étape 6 du handler completed, verrou atomique waitlist.a3_notified_at, couvre parrain direct niveau 1 + grand-parrain niveau 2, params { PRENOM, PAGES_TOTAL, DASHBOARD_URL })
- M1 (Atelier — dépôt terminé) = template 27, env BREVO_TEMPLATE_M1_ID, déclencheur PATCH /api/atelier/numero branche consent_photos (le SEUL signal serveur de fin de dépôt, posé par depot/moteur.ts finaliser()), params { PRENOM, TITRE, NB_PHOTOS, LIEN }
- M3 (Atelier — la couverture, état 2) = template 28, env BREVO_TEMPLATE_M3_ID, déclencheur /api/atelier/mails/relever (PAS un webhook : le passage en état 2 se fait à la main en SQL tant que /admin n'existe pas), params { PRENOM, TITRE, NB_PAGES, PRIX, LIEN }
- M4 (Atelier — paiement reçu) = template 29, env BREVO_TEMPLATE_M4_ID, déclencheur webhook completed si metadata.kind==='atelier', params { PRENOM, TITRE, NB_PAGES, PRIX, LIEN }
- Anciens (waitlist, hors paiement) : W1, P1, P2 dans waitlist/route.ts
Helper partagé : src/lib/brevo.ts → sendBrevoEmail({templateId,email,name,params,apiKey,label}), best-effort strict, résout true/false (les appelants historiques ignorent la valeur).

## Atelier — mails M1/M3/M4 (lot 8 partiel)
Tout passe par `src/lib/atelier/mails.ts` → `envoyerMailAtelier(supabase, code, numero)`.
Trois garanties, dans cet ordre : (1) jamais un mail qui tombe sur une page vide —
`manquePour()` vérifie apercu_urls/palier/nb_pages avant tout ; (2) jamais deux fois —
l'insertion dans `mails_envoyes` (unique numero_id+code) EST le verrou, posée AVANT
l'appel Brevo ; (3) un échec Brevo retire le verrou et journalise `mail_echec`, la
relève suivante réessaie. Le journal `evenements` garde le récit (`mail_envoye`), la
table de verrou se nettoie sans remords pour relancer un mail à la main.
Migration : supabase/migrations/20260824_atelier_mails_envoyes.sql (table + index partiel
`numeros_apercu_pret_idx`).
La relève `/api/atelier/mails/relever` (POST ou GET, en-tête `x-atelier-secret` ou
`Authorization: Bearer`, 404 si le secret manque) balaie états 1 et 2, rattrape M1 et
envoie M3, et REND COMPTE des dossiers incomplets. Idempotente. C'est là que viendront
M3b, M2, M5→M9, pas ailleurs.
⚠️ Rien dans les textes ne porte de tiret (—, –) : consigne explicite de Mathias.
Logo des mails : `public/logo-mail-blanc.png` (signature blanche sur fond sombre), à
distinguer de `public/logo-mail.png` (signature bleue, mails de la prévente).
Migration A3 : supabase/migrations/20260613_a3_notified_flag.sql (colonne waitlist.a3_notified_at timestamptz, flag anti-renvoi posé atomiquement à l'envoi).
## Webhook Stripe PARTAGÉ — le tri est EXPLICITE des deux côtés (24/08/2026)
`/api/webhook` trie sur les métadonnées, avant tout accès en base, et **aucun produit n'est
le cas par défaut** : `kind==='atelier'` → atelier, `offer_type` ∈ founder|standard|influencer
→ prévente, ni l'un ni l'autre → `sessionOrpheline()` journalise et ignore (200).
Pourquoi : le 24/08, un album de l'atelier payé en test a déclenché le mail S1 « bienvenue en
prévente ». L'événement était routé vers un ANCIEN déploiement (point d'écoute du sandbox
`acct_1Tg326…` qui pointait sur la preview de la branche `prevente`), donc du code sans le tri —
et « sinon → prévente » faisait le reste, les handlers de session identifiant la cliente par
email avec repli sur `session.customer_email`.
⚠️ `charge.refunded` n'a PAS de garde `offer_type` : les Charges de la prévente ne portent
aucune métadonnée, et `handleChargeRefunded` retrouve sa ligne par `stripe_payment_intent`
(clé exacte, sort proprement si absente). Ajouter la garde bloquerait les remboursements des
14 fondateurs sans rien protéger.

## Webhook Stripe PARTAGÉ — prévente + atelier (lot 6)
`/api/webhook` sert DEUX produits qui n'ont aucune table en commun. Le tri se fait au
`switch`, sur `metadata.kind === 'atelier'`, **avant tout accès en base** — les trois
handlers de la prévente cherchent une ligne `waitlist` par email, et une cliente de
l'atelier peut y être inscrite. Sans ce tri : un album payé la confirmerait fondatrice
de la prévente (numéro de fondateur + mail F1), et un panier abandonné lui enverrait la
relance d'acompte.
- Discriminant posé par `/api/atelier/checkout` sur la session ET sur
  `payment_intent_data.metadata` — une Charge ne porte pas les metadata de sa session,
  donc `charge.refunded` se trie via le PaymentIntent.
- Handlers atelier : `src/lib/atelier/paiement.ts` (`estSessionAtelier`,
  `estChargeAtelier` = fonctions pures ; `traiterPaiementAtelier`,
  `traiterExpirationAtelier`, `traiterRemboursementAtelier`).
- Aucun handler de la prévente n'a été modifié.
- Expiration = ne touche PAS à l'état : le numéro reste en état 2, réutilisable (PRD §9).
- Remboursement = journalisé dans `evenements`, aucune transition automatique (un
  remboursement avant impression et après livraison veulent dire l'inverse).

## Atelier — prix, TVA, livraison (lot 6)
- Prix : `src/lib/atelier/prix.ts`, table en dur `palier → euros`. Le navigateur n'envoie
  QUE le token à `/api/atelier/checkout` (invariant nº2). Pas de `price_id` Stripe : une
  seule source de vérité, pas de dérive test/prod.
- Zone de livraison : `PAYS_LIVRAISON = FR, BE, LU`. Stripe exige une liste explicite ;
  c'est aussi le garde-fou commercial. Prix identique dans toute la zone.
  ⚠️ Les DOM passent au travers (adresse « FR » chez Stripe, hors territoire TVA UE,
  port prohibitif) — traitement manuel dans /admin tant que le volume est faible.
- TVA : `automatic_tax` activé, prix déclaré TTC (`tax_behavior: 'inclusive'`), code
  fiscal `CODE_FISCAL_ALBUM`. **Stripe Tax est actif mais sans immatriculation → 0 € de
  taxe calculé aujourd'hui.** Le câblage est inerte jusqu'à l'ajout de l'immatriculation
  portugaise dans le tableau de bord, puis s'active sans redéploiement.
  Taux TRANCHÉ le 24/08/2026 : 23 % (taux normal PT). Pas les 6 % du livre — un album
  photo personnalisé n'est pas un livre au sens fiscal.

## CGV v3.0 — l'Atelier au present, la prevente en regime transitoire
Depuis le 24/08/2026, `src/app/legal/content/cgv.ts` (FR/PT/EN, **le PT fait juridiquement foi**) :
- art. 4 bis = les commandes Atelier (paiement integral, pas d'acompte ni d'Instants, prix par
  palier, zone FR/BE/LU, delai 10 j, deux cases prealables, remboursement possible jusqu'a la maquette)
- art. 5.0 = chapeau qui limite TOUT l'article 5 (acompte, Instants, offres) aux commandes de
  prevente du 13/06 au 15/08/2026. On CADRE, on ne supprime pas : 14 fondateurs ont contracte
  sous la v2.5 et l'art. 8.8 interdit l'effet retroactif.
- art. 5 bis = imputation du credit de 30 € par code Stripe nominatif a usage unique, apres
  verification manuelle de `waitlist`. Instants et pages de parrainage CONSERVES (ni imputes ni
  convertis), delai de 12 mois SUSPENDU jusqu'a l'ouverture de l'espace client.
- annexe = DEUX grilles, une par regime. Atelier : 30 € (20-28 p.) / 40 € (30-38 p.) / 45 € (40-50 p.)
- La version digitale HD reste INCLUSE pour toutes les commandes (art. 1.2), Atelier compris.
⚠️ `legal-source/*.docx` ont une version de retard — resynchroniser apres relecture juridique.
⚠️ La case de l'etat 2 ne fait PAS renoncer : l'art. 8.3 fixe l'extinction du droit de retractation
   a la VALIDATION DE LA MAQUETTE (etat 4). Ce qu'on recueille a l'etat 2 est l'information
   prealable de l'art. 8.5. Le libelle a ete corrige en consequence (le PRD §8 citait le droit
   FRANCAIS L221-28 ; le droit applicable est portugais, DL 24/2014 art. 17.º/1 c)).
