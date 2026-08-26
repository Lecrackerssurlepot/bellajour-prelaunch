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

## ⚠️ La preview peut mettre les machines en défi (25/08/2026)
Vercel peut répondre **403** + `x-vercel-mitigated: challenge` à tout client non-navigateur, sur
un trafic qu'il juge robotique. Ce n'est PAS un réglage : mitigation automatique, elle s'éteint
seule. Un navigateur passe ; **Stripe et `scripts/recette.mjs` non** — un paiement de test
réussit alors chez Stripe, `checkout.session.completed` prend un 403, le numéro reste en état 2
et M4 ne part jamais, sans trace explicative.
Test : `curl -X POST …/api/webhook` doit rendre **400** (`missing_signature`). 403 = épisode en
cours, attendre. ⚠️ **Ne pas couper le pare-feu** : la protection de déploiement est déjà
désactivée, et « Attack Challenge Mode » est au niveau du PROJET — le couper découvrirait aussi
bellajour.fr. Stripe réessaie 3 jours, et l'événement se renvoie à la main depuis le tableau de bord.

## L'Atelier — le back-office (lot 7, en production depuis le 25/08/2026)
`/admin/atelier` remplace l'UPDATE SQL par cliente. Liste triée par urgence, fiche avec la
frise des 8 jalons, actions armées en deux temps, carnet de l'éditeur, page santé, métriques.
Deux fichiers PURS portent les règles et ne doivent pas être contournés :
- `src/lib/atelier/transitions.ts` — LA table des transitions autorisées. Ajouter une action =
  une entrée, jamais un fichier. Le mail annoncé par l'écran est DÉRIVÉ de `codesPour`, jamais
  déclaré : une déclaration à la main mentait déjà sur 3 actions sur 7.
- `src/lib/atelier/urgence.ts` — les délais qu'on promet à la cliente. Changer une valeur ici
  sans changer la page publique, c'est mentir à l'une des deux.
⚠️ **Garde-fou de chaîne** : un mail ne part QUE si son prédécesseur est parti (`codesPour`).
Motivé par un cas réel — un dossier en état « validée » sans aucun mail recevait « part à
l'impression ». Seul M2 n'a pas de prédécesseur : il porte la seule borne de date, réglable par
`ATELIER_M2_DEPUIS` (reculée sur Preview pour le rendre testable).
⚠️ **La relève doit tourner tous les jours** (`vercel.json`, 7 h UTC, `CRON_SECRET`). Sans elle,
M2, M3b, M8 et l'auto-validation à J+7 ne partent JAMAIS.
Vérifications : `npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts` (81 assertions,
sans base ni réseau) et `scripts/verif-mails-brevo.ts` (les variables des templates).

### Qui a le dossier en main (26/08/2026)
`numeros.en_charge` (migration `20260826_atelier_en_charge.sql`) porte la CLÉ du compte,
comme `notes.qui`. Bouton en tête de fiche, marque sur la ligne, filtre « Les miens ».
- On peut REPRENDRE un dossier à quelqu'un (c'est le mot « relais »), on ne peut PAS
  affecter quelqu'un d'autre. Chaque geste écrit `prise_en_charge` dans `evenements`.
- « Ce qui m'attend » (urgence) et « Les miens » (affectation) sont deux filtres distincts.
- ⚠️ `donnees.ts → lireNumeros()` tente le select AVEC la colonne et retombe SANS sur un
  42703. Sans ce repli, la table de travail entière tomberait pendant la fenêtre entre le
  déploiement et la migration. Ne pas simplifier.

### La liste se rafraîchit seule, et n'attend plus en silence (26/08/2026)
- `Rafraichissement.tsx` : `router.refresh()` chaque minute, RIEN quand l'onglet est caché
  (`force-dynamic` = une requête par passage), rattrapage au retour avec 20 s de repos.
  Jamais `location.reload()` : il perdrait la recherche et le formulaire en cours.
- `loading.tsx` sur la liste et sur la fiche. Sans eux, Next garde l'écran précédent figé
  et le clic paraît mort. Les silhouettes ont la FORME de l'écran qui arrive.

### La loupe (26/08/2026)
`src/app/components/Loupe.tsx` sert la page cliente (charte sombre) ET l'admin (crème) :
elle pose ses propres couleurs sur `.bj-loupe`, sans emprunter aux tokens de l'un ou de
l'autre. On y navigue entre les visuels. Le vocabulaire est le MÊME des deux côtés
(« La couverture », « La quatrième », « Une double page ») — plus de C1/C4.

### La page cliente dit de QUI c'est le tour (26/08/2026)
Une ligne sous le fil des jalons, lue depuis `QUI_ATTEND` (urgence.ts) — la même table que
l'atelier utilise pour trier sa journée. Les deux écrans ne peuvent donc pas se contredire.
Un dépôt non terminé est FORCÉ chez la cliente, quoi qu'en dise l'état.
Le lien permanent est rappelé en pied de page à tous les états, et sur l'écran 6.

### L'écran de dépôt disait « c'est fait » alors que rien n'était parti (26/08/2026)
La cause du dépôt abandonné, en amont du mail M2b. L'écran 5 affirmait la fin par
quatre signaux à la fois : compteur « 55 photos **déposées** » (le mot de l'étape),
un ✓ vert par vignette, jauge pleine, et le bouton « Envoyer à l'atelier » relégué
SOUS une planche de 55 vignettes — trois écrans sous la ligne de flottaison.
- « déposées » → « prêtes ». Le mot laisse le geste devant.
- **La grille se replie à 5 grandes vignettes + une case « + 49 »** (`VIGNETTES_VISIBLES`).
  C'est ce qui règle la cause : l'écran tient d'un bloc, le bouton n'est plus enterré.
  ⚠️ Une photo `etat === 'erreur'` n'est JAMAIS repliée — elle porte le seul bouton
  « Reprendre », la cacher c'est cacher la réparation.
  ⚠️ La règle mobile qui resserre à 78 px ne vaut QUE pour la grille dépliée
  (`.at-d-grille--toutes`) : c'est sur un téléphone que « plus grosses » compte le plus.
- Une phrase dit ce qui N'EST PAS fait : « l'atelier ne les a pas encore reçues ».
- `beforeunload` prévient si on ferme l'onglet avec des photos non envoyées.
- ⚠️ **La barre du bas n'est PAS collante, et c'est voulu** (décision de Mathias) : la
  grille repliée suffit. Une barre `sticky` a été essayée puis retirée — elle exigeait
  de passer `.at-q` en `height` fixe, une modification de mise en page dont plus rien
  n'avait besoin une fois la cause réglée.
M2b reste, comme filet. Mais un mail de relance qui part à tout le monde n'est pas une
solution : c'est le constat qu'on laisse partir tout le monde.

### « Dépôt terminé » n'est PAS « a des photos » (26/08/2026)
Incident du 25/08 : un dossier de 55 photos trônait dans la pile « à faire » avec un compte
à rebours de 48 h. La cliente avait fermé l'onglet avant le dernier bouton. Conséquences :
l'atelier s'apprêtait à composer sans le droit d'usage des photos, contre une promesse jamais
faite, et la relance M2 ne partait pas non plus (elle exigeait `nb_photos === 0`). Silence
total pour la prospect la plus engagée qui soit.
- **`consent_photos` est le SEUL signal du dépôt terminé.** C'était déjà la règle de M1 ;
  elle manquait partout ailleurs. Une fonction pure porte désormais les trois cas :
  `etapeDepot(consentPhotos, nbPhotos)` dans `src/lib/atelier/urgence.ts` →
  `termine` | `vide` (relance M2) | `abandonne` (relance M2b).
- `urgencePour(..., { depot })` remplace `{ sansPhotos }`. Un dépôt non terminé va TOUJOURS
  dans « Chez la cliente », sans compte à rebours, quel que soit son nombre de photos.
- `LigneDossier.depot` remplace `LigneDossier.sansPhotos`. Le compteur du flux dit
  « dépôt non terminé », plus « sans photos » — il regroupe un dossier vide et un dossier
  de 55 photos.
- La fiche AVERTIT sans bloquer : un coup de téléphone peut justifier d'avancer, et une
  machine qui refuse sans pouvoir écouter finit contournée en SQL.
- Sa page d'état lui propose de **terminer en un clic** (`BoutonEnvoyer.tsx` → le même
  `PATCH /api/atelier/numero { consent_photos: true }` que le composeur, donc le même M1).
  Volontairement depuis SA page et non depuis le composeur : la grille du composeur se
  reconstruit depuis la copie LOCALE du navigateur, absente sur un autre appareil.

### Télécharger le lot de photos (26/08/2026)
« Télécharger le lot » écrit les VRAIES photos sur le disque, plus un fichier de liens.
- Chrome/Edge : `showDirectoryPicker()` → l'éditeur choisit un dossier, chaque photo descend
  du coffre en flux (`fetch` → `pipeTo`) et va droit sur le disque. Rien ne passe par Vercel,
  aucune limite de taille. `src/app/admin/atelier/[token]/telechargement.ts`.
  ⚠️ Le sélecteur s'ouvre AVANT tout `await` — Chrome exige une activation utilisateur fraîche.
- Ailleurs : repli sur un `.txt` de liens NUS (les lignes `#` de l'ancienne version cassaient
  `xargs`, qui passait le dièse à `curl`), la commande est affichée à l'écran.
- Le dossier créé s'appelle « Prénom - Titre » (`nomDossier`), volontairement NON unique :
  retélécharger le même numéro réécrit par-dessus, ce qu'on veut après un lot interrompu.
- Les noms de fichiers sont calculés UNE fois, dans le module pur `src/lib/atelier/lot.ts`,
  et signés dans l'URL (`ResponseContentDisposition`) : les deux chemins produisent les mêmes
  noms. Sans ça, `curl -O` écrasait tout — la clé du coffre finit par `original.jpg` pour
  chaque photo.
- Les liens sont TOUJOURS refaits au clic via `POST /api/admin/atelier/lot` (TTL 2 h). Ceux de
  la page sont signés au rendu et une fiche reste ouverte toute la matinée.
- ⚠️ **Dépend du CORS du bucket R2** : `GET` doit être autorisé pour l'origine (c'est le cas
  aujourd'hui — PUT/GET/HEAD sur bellajour.fr, `*.vercel.app`, localhost:3000). Sans lui, le
  `fetch` échoue et toutes les photos partent en « ratées ».

### Les notes de l'éditeur voyagent avec les photos
`src/lib/atelier/brief.ts` (PUR) compose `00-BRIEF.txt`, écrit dans le dossier téléchargé et
téléchargeable seul par le bouton « Le brief » : occasion, histoire, carnet de l'éditeur,
lien Canva de travail. Motif : celui qui compose travaille dans Canva, pas dans la fiche ;
une note qui exige un aller-retour par onglet finit par ne plus être lue.
⚠️ Fichier INTERNE. Il porte des notes que la cliente ne doit jamais lire, rien ne l'envoie.
Le TEXTE des mails vit dans `scripts/mails-atelier.mjs`, versionné, pas dans Brevo.
**Ce qui reste à faire : `docs/ATELIER-A-FAIRE.md`.** Recette : `docs/RECETTE-PARCOURS.md`.

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
- M2b (Atelier — dépôt resté en plan) = env BREVO_TEMPLATE_M2B_ID, **template à créer**
  (`node scripts/mails-atelier.mjs --pousser`, puis coller l'ID dans .env.local et Vercel).
  Déclencheur : relève quotidienne, J+1, dossier état 1 avec des photos ET sans consent_photos.
  Params { PRENOM, TITRE, NB_PHOTOS, LIEN }. Tant que l'env manque, la relève le signale
  « sans_template » et n'envoie rien.
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
## Cloudprinter — l'impression commandée par l'API (26/08/2026, PRD §13 phase 2)
« Envoyer à l'impression » COMMANDE réellement : dépôt des PDF print-ready sur la fiche,
puis `orders/add` avec l'adresse Stripe et la référence déduite de la pagination.
⚠️ Les fichiers dépendent du produit (products/info fait foi, vérifié le 26/08) :
l'agrafé prend UN PDF `product` (couverture intégrée), le dos carré prend DEUX PDF
`cover` (couverture enveloppante avec le dos) + `book` (le bloc) — la couverture d'un
dos carré ne peut physiquement pas vivre dans le même PDF que les pages.
- `src/lib/atelier/impression.ts` (PUR, testé dans verif-atelier) : table produit
  (20 p. → `magazine_sas_a4_p_fc` agrafé ; 22-50 p. → `magazine_pb_a4_p_fc` dos carré),
  adresse Stripe → Cloudprinter, payload orders/add, interprétation des signaux.
  ⚠️ Finitions par défaut (`pageblock_130mcs`, `cover_250mcs`) : l'étude de prix de
  Mathias tranchera — cette table est LE seul endroit à retoucher.
- `src/lib/atelier/cloudprinter.ts` (réseau, ne throw jamais) : la clé API n'entre que là.
- Le md5 exigé par Cloudprinter = l'ETag R2 du PUT single-part (`empreinteObjet`, r2.ts).
  Un ETag multipart (tiret) → redépôt exigé, jamais d'empreinte fausse.
- Verrous anti double-commande : pré-contrôle `cloudprinter_order_id` → 409 ;
  `.is("cloudprinter_order_id", null)` sur l'update atomique ; unicité de la référence
  (= id du numéro, JAMAIS le token) chez Cloudprinter, rattrapée par orders/info.
- `/api/cloudprinter/webhook` (HORS middleware, clé CloudSignal comparée à durée
  constante, 404 fermée par défaut) : ItemShipped → état 7 + transporteur + tracking
  DANS LE MÊME update (M7 l'exige) + releverDossier ; ItemError/ItemCanceled → journal
  d'alerte SANS changement d'état ; le reste → journal. 204 si commande inconnue,
  500 volontaire sur erreur base (leurs retries ×100/7 j sont le filet).
- Sans `CLOUDPRINTER_API_KEY` : MODE MANUEL, l'action redevient un simple changement
  d'état (rien ne casse en prod). Sandbox/Live = propriété de l'INTERFACE au dashboard.
- Recette : `node scripts/recette.mjs signal "Test 1" ItemShipped` forge un webhook ;
  `scripts/cloudprinter-produits.mjs` lit le catalogue (⚠️ API très rationnée).
- Migration : supabase/migrations/20260827_atelier_cloudprinter.sql (impression_fichiers
  jsonb + index partiel sur cloudprinter_order_id) — APPLIQUÉE en production le 26/08.
- **PROUVÉ DE BOUT EN BOUT le 26/08 en sandbox** (commande → signaux → état 7 automatique
  → M7, puis livrée → M8). Cinq leçons payées en vrai, toutes dans le code :
  (1) `phone` OBLIGATOIRE dans l'adresse — téléphone du dossier, repli TELEPHONE_CONTACT ;
  (2) leur format d'erreur est `{error:{type,info}}`, pas `message` ;
  (3) le champ `order` des signaux ne porte pas notre référence telle quelle — résolution
  multi-candidats dans le webhook, payload des orphelins en console ;
  (4) une référence de commande ne se RÉUTILISE JAMAIS, même annulée (`orders/cancel` par
  API seulement, aucun bouton au dashboard) — re-commande sous `<id>-r<epoch36>`,
  `cloudprinter_order_id` stocke la référence réellement utilisée ;
  (5) `shipping_option` arrive en forme machine (`dpd_france`) — rendue lisible avant M7.
- Dashboard : interface CloudCore = « My API interface » (PAS les « CloudApps Quick
  Order ») ; webhook CloudSignal = « Bellajour preview » → la preview. La sandbox déroule
  commande→shipped en ~45 s. Clés régénérées le 26/08 (les premières avaient circulé en
  clair). Au lancement : interface Live + un webhook vers bellajour.fr + clés en Production.

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
