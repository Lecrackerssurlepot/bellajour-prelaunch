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
--amber: #B8834A          /* CTA bouton principal */
--border: #2C2C2C         /* séparation Hero → section sombre */
--amber-hover: #9A6B35    /* état hover du bouton CTA */

Font serif  : Cormorant Garamond (Google Fonts) — 300, 300 italic, 400 italic
Font display: Playfair Display (Google Fonts) — 700, 400 italic
Font sans   : DM Sans (Google Fonts) — 300 italic

## Règles design absolues
- Zéro border-radius — tout est carré net
- Zéro ombre (box-shadow, text-shadow)
- Tout est flat
- Bouton CTA : fond --amber, couleur --cream, pas de border-radius
- Inputs : fond transparent, border-bottom 0.5px solid --ink uniquement
- Positions CSS : vw/vh uniquement — zéro px fixes pour positions

## Règles CSS absolues
- Zéro next/image → <img> plain uniquement
- Zéro px fixes pour positions → vw/vh uniquement
- CSS vanilla dans fichiers .css dédiés par section
- Pas de CSS Modules — classes CSS directes
- Pas de CSS transition ou animation keyframe sur les sections
  scroll-driven → uniquement requestAnimationFrame + JS

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
public/hero.css           → copie de hero.css pour previews statiques

## Previews statiques
public/preview-anxiete.html → preview HTML statique de la section Anxiété
Accessible via localhost:3000/preview-anxiete.html
NE PAS convertir en composant Next.js
NE PAS créer de .tsx ou .css séparés pour les previews

## Assets
public/images/ui/logo.webp
public/images/ui/signature.svg
public/images/hero/hero-01.webp à hero-07.webp
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
1. Hero      — photos + headline + formulaire waitlist
              fond : --cream (#EAE3D8)
2. Anxiete   — scroll storytelling 600vh
              fond : --dark (#1C1C1C)
              transition : border-top 1px solid #2C2C2C, coupure nette
3. Solution  — comment ça marche (3 étapes)
4. Album     — preuve visuelle (vrais albums beta)
5. Offre     — Fondateurs 100 places numérotées
6. Footer    — signature "Vivez. Nous composons."

## Statut sections
✅ Hero        — validé (Hero.tsx + hero.css)
🔄 Anxiete     — preview validé (preview-anxiete.html)
               intégration Next.js à faire
⏳ Solution    — à faire
⏳ Album       — à faire
⏳ Offre       — à faire
⏳ Footer      — à faire

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
- Ne jamais réécrire un fichier entier pour une correction partielle
- Montrer les lignes exactes à modifier avant d'appliquer
