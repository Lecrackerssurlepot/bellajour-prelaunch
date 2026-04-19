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

## Design tokens
--cream: #F0EAE0
--ink: #17140F
--ink-light: #7A6F62
--gold: #ffec7d
Font serif : Cormorant (Google Fonts)
Font sans : DM Sans (Google Fonts)

## Règles CSS absolues
- Zéro next/image → <img> plain uniquement
- Zéro px fixes pour positions → vw/vh uniquement
- CSS vanilla dans fichiers .css dédiés par section
- Pas de CSS Modules — classes CSS directes

## Structure fichiers
src/app/layout.tsx        → <head> fonts + metadata
src/app/globals.css       → tokens + reset + imports CSS sections
src/app/page.tsx          → assemblage sections dans l'ordre
src/app/hero.css          → styles Hero
src/app/Hero.tsx          → composant Hero
src/app/sections/         → une section = un .tsx + un .css
src/app/api/waitlist/     → POST email → Supabase + Brevo
src/app/api/referral/     → tracking codes parrainage
src/lib/supabase.ts       → client Supabase
src/lib/brevo.ts          → client Brevo

## Assets
public/images/ui/logo.png
public/images/ui/signature.png
public/images/hero/hero-01.jpg à hero-07.jpg
public/images/anxiete/grid-01.jpg à grid-06.jpg
public/images/anxiete/float-01.jpg à float-04.jpg

## Variables d'environnement (jamais dans le code)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
BREVO_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## Tables Supabase
contacts (id, email, prenom, profil_icp, code_parrain, 
          source_utm, created_at, points_total)
referrals (id, code, contact_id, filleuls_count, created_at)
points_log (id, contact_id, action, points, created_at)
influencers (id, nom, slug, utm_campaign, conversions, created_at)

## Sections landing page (ordre d'affichage)
1. Hero — photos + headline + formulaire waitlist
2. Anxiete — scroll storytelling 2000vh
3. Solution — comment ça marche (3 étapes)
4. Album — preuve visuelle (vrais albums beta)
5. Offre — Fondateurs 100 places numérotées
6. Footer — signature "Vivez. Nous composons."

## Règles absolues de sécurité
- Clés API jamais dans le code → variables Vercel uniquement
- Rate limiting sur /api/waitlist (max 3 req/min par IP)
- Signatures Stripe webhooks vérifiées
- Supabase RLS activé sur toutes les tables
- Git commit après chaque mission validée

## Comportement attendu de Claude Code
- Toujours lire CLAUDE.md en début de session
- Vérifier les fichiers existants avant d'écrire
- Ne jamais inventer un chemin image → vérifier dans /public/
- Positions CSS en vw/vh uniquement
- En cas de doute → demander plutôt qu'inventer
- Committer sur Git après chaque bloc validé
