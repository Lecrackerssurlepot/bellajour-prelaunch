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
  ⚠️ CORRIGÉ le 27/08/2026 : `src/app/Hero.tsx` et `src/app/sections/FAQ.tsx` sont
  ORPHELINS eux aussi. `/ambassadeurs` importe son PROPRE `ambassadeurs/Hero.tsx`,
  et `S5Garanties.tsx` déclare sa PROPRE `const FAQ` en local — deux fichiers
  différents, même nom. Seul `sections/Footer.tsx` est vivant (8 fichiers).
  Ce que cette phrase affirmait a coûté un préchargement de 283 Ko sur tout le
  site pour une image que rien n'affiche.
  ⚠️ **DÉPLACÉS le 28/08/2026 → `archive/landing-waitlist/`** (D12), hors ESLint et
  hors `tsconfig`. Archivés, PAS supprimés : ils s'ouvrent et reviennent par un
  `git mv`. `sections/` ne contient plus que `Footer.tsx` + `footer.css`, et
  `src/app/hero.css` n'existe plus (ne pas confondre avec `ambassadeurs/hero.css`,
  vivant, ni `public/hero.css`, servi à `preview-anxiete.html`).
- `/preventes`, `/preventes/prix` et `/lancement` : **RETIRÉES de la ligne le 28/08/2026**
  (D13). Trois 307 TEMPORAIRES vers `/` dans next.config.ts, code dans `archive/preventes/`
  et `archive/lancement/`. Sitemap = `/` + pages légales, inchangé.
  ⚠️ Trois modules vivaient dans `preventes/` et servaient AILLEURS — sortis avant
  l'archivage : `pricing.ts` → `src/lib/pricing.ts`, `navbar.css` →
  `src/app/components/navbar.css`, et `Navbar.tsx` RÉÉCRIT en `src/app/merci/Navbar.tsx`.
  Sans ça, `/ambassadeurs` et `/merci` tombaient avec la prévente.
- Fermeture de la prévente : drapeau `PREVENTE_FERMEE=true` (src/lib/prevente.ts), lu CÔTÉ SERVEUR.
  Ferme `/api/checkout` (410) et bascule `/api/offer-state` en `offerMode: 'closed'` ; le bandeau
  d'annonce disparaît, les CTA pointent `/`, la section 4 rend un encart de clôture.
  Ne touche JAMAIS `/api/webhook`, `/merci`, les pages légales ni les crédits — 14 fondateurs ont
  des droits ouverts et les CGV v3.0 les maintiennent en régime transitoire.

## Refonte de l'accueil — 27/08/2026 : l'ouverture, puis l'univers
`/` n'est plus quatre sections empilées. C'est une COUVERTURE qui se pose puis s'ouvre
en plein écran, suivie du récit de marque en SEPT pages plein écran enchaînées.
- `components/Ouverture.tsx` + `ouverture.css` — le premier écran.
- `components/Univers.tsx` + `univers.css` — les sept pages et leur séquenceur.
- `page.tsx` reste un composant SERVEUR (métadonnées + JSON-LD dans le document) ;
  seuls Ouverture et Univers sont clients.

⚠️ **`.at-accueil` n'est pas décoratif.** Les deux feuilles sont ENTIÈREMENT scopées
dessous, parce que le prototype nomme ses classes court (`.hero`, `.in`, `.ligne`,
`.ph`, `.c`, `.d`) et que `.bj-atelier` est partagé avec `/composer`. Retirer ce
conteneur dépeindrait toute la page. C'est aussi lui qui porte les états `pret` et
`plein` de la séquence d'ouverture.

⚠️ **Les anciens composants ne sont pas supprimés.** `S1Hero`, `S2Collection`,
`S3Method`, `S4Final` restent sur le disque, hors routage : l'étagère des quatre
numéros, les trois temps du parcours et la grille des paliers serviront la page
produit. Les effacer, c'est réécrire ce texte une deuxième fois.

**Le séquenceur.** Un `data-t` sur un élément = son instant, en millisecondes, dans
la séquence de SA page. Pour régler un timing, un seul attribut change dans le
balisage. Le déclencheur normal est un IntersectionObserver ; la boucle unique le
double d'un filet (une page qui n'a pas joué est une page VIDE, pas une page sobre —
un onglet occulté suffit à geler l'observateur).
⚠️ Le séquenceur pose `transition-delay` ET une propriété `--retard` : le glitch de
la page 02 est une ANIMATION, qui ignore `transition-delay`, et il vit sur trois
couches dont deux pseudo-éléments. Seule une propriété personnalisée descend jusqu'à
eux.

**Le fond est noir plein** (`--c-void`), pas le dégradé ambiant de `.bj-atelier` :
neutralisé par `:has(> .at-accueil)`, pour cette page seule, sans toucher au thème
que `/composer` partage.

**Grain et fibre du papier sont des turbulences SVG en ligne**, pas des images :
283 et 454 Ko de texture décorative à chaque chargement, ce n'était pas tenable.

**La barre de tête ne se cache jamais** et n'a aucun filet : une zone de verre
(`--glass-bg-strong` + blur 20). C'est la seule porte vers `/composer` une fois
l'ouverture passée. ⚠️ `backdrop-filter` sur un `position:fixed` rame sur
Chrome/Android (règle anti-jank plus bas, mesurée en juin). Le repli n'est PAS posé,
le risque est accepté : **D5 dans DECISIONS.md**, avec la correction toute prête.

Le prototype de référence, avec ses variantes, vit dans
`design-explorations/landing/` (non versionné).

## Structure fichiers
src/app/layout.tsx        → <head> fonts + metadata
src/app/globals.css       → tokens + reset + imports CSS sections
src/app/(atelier)/page.tsx → LA homepage (sert `/`)
src/app/(atelier)/composer → le questionnaire (sert `/composer`)
src/app/(atelier)/magazine → LA PAGE PRODUIT (sert `/magazine`) :
                            page.tsx (métadonnées + 3 blocs JSON-LD) + Kiosque.tsx
                            + Corps.tsx + pdp.css
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
- ⚠️ **UN LIBELLÉ, DEUX DESTINATIONS** (30/08/2026). L'invariant nº5 tient :
  « Composer avec l'atelier » est écrit UNE fois, dans content.ts. Mais depuis
  l'ouverture de la page produit, la destination dépend d'où l'on part :
  `CTA_HREF` = `/magazine` (accueil, barre de tête, page 07 de l'univers) et
  `COMPOSER_HREF` = `/composer` (la page produit, et /numero/[token]).
  `Nav` prend un `href` optionnel pour ça — l'accueil garde le défaut, la page
  produit passe COMPOSER_HREF.
  ⚠️ Ne JAMAIS recâbler `?reprendre=<token>` sur CTA_HREF : le paramètre n'est
  lu que par /composer. Sur la page produit il serait ignoré EN SILENCE, et la
  cliente repartirait sur un dépôt vide en croyant reprendre le sien.
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
✅ **ARMÉE ET PROUVÉE le 29/08/2026** : M2 est parti tout seul à 07:20:12 UTC sur le dossier
resté vide du 27/08. `CRON_SECRET` est donc bien posé en production. Vercel déclenche dans
l'heure qui suit l'horaire déclaré, pas à la minute — 7 h 20 est normal, pas un retard.
Vérifications : `npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts` (153 assertions,
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

### Les retouches suspendent l'auto-validation (26/08/2026, T2-13)
`numeros.retouches_demandees_le` (migration 20260828) est LE signal du troisième
geste de l'état 4 : « J'ai noté des retouches dans le Canva » (bouton cliente,
PATCH dédié atomique et idempotent, journal `retouches_demandees`).
- `doitAutoValider` (mails.ts) refuse tant que la colonne est posée — imprimer
  d'office par-dessus des demandes de correction est le silence qui coûte.
- `urgencePour(..., { retouches })` : pile À FAIRE, rang `1000 - age` (devant
  les à-faire au compte à rebours confortable). La page cliente bascule le
  camp en « C'est à nous » — même vérité des deux côtés.
- La reprise = REPUBLIER la maquette (`publier_maquette` accepte l'état 4) :
  le patch PUR remet la colonne à null, `etat_maj_le` repart, et la ROUTE lève
  le verrou M5 (journal `mail_reouvert`) SEULEMENT si des retouches étaient
  posées — une republication de confort ne renvoie rien.
- PROUVÉ le 26/08 sur la preview : suspension (levier `auto` refuse, relève
  muette à 8 j) ET reprise (M5 repart avec la nouvelle échéance, puis
  l'auto-validation passe). L'auto-validation nominale aussi (journal
  `releve_j7`, M6 au balayage suivant).

### L'aperçu à plat (26/08/2026, T2-2)
Les nouvelles publications déposent UN fichier « couverture à plat »
(C4 | dos | C1, l'export naturel de Canva) + la double page :
`apercu_urls = {plat, double}`. Les dossiers historiques `{c1, c4, double}`
rendent comme avant (migration douce, `resoudreApercu`), et le formulaire ne
montre le trio QUE pour les corriger. L'affichage découpe en CSS
(`object-position`), AUCUNE retouche d'image serveur ; la loupe montre l'objet
entier, avec des légendes UNIQUES (elle navigue par légende — deux légendes
égales rendent un visuel inatteignable).

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

### La grille de l'atelier sert des vignettes, plus des originaux (28/08/2026, D7)
Le worker du dépôt fabriquait DÉJÀ une vignette de 320 px (`reduire.worker.js`) pour
l'aperçu local ; elle dormait dans IndexedDB. Elle part désormais sur R2 en SECOND objet,
`numeros/<id>/photos/<photoId>/vignette.jpg` (`cleVignetteR2`), et `donnees.ts` la signe à
côté de l'original. La fiche servait 35 à 45 Mo d'originaux dans des cases de 84 px.
- **`vignette_key` est écrite par `/api/atelier/photos/complete` APRÈS un HEAD**, jamais sur
  la déclaration du navigateur — même règle que `taille`, seule la mesure fait foi.
- **La vignette part avant que la photo compte comme `envoyee`**, sur le même `item.xhr`
  (donc sous le même chien de garde). En tâche de fond elle courrait contre la confirmation.
  Cette voie **ne peut pas échouer** : toutes les issues mènent à `envoyee`, aucune ne passe
  par `echecEnvoi()`. Perdre une photo pour un fichier de 20 Ko serait absurde.
- **`lirePhotos()` et `marquerArrivee()` ont chacun leur repli 42703.** Sans eux, pendant la
  fenêtre déploiement/migration, une fiche n'afficherait AUCUNE photo et un dépôt en cours
  ne se confirmerait jamais.
- **La grille prend `urlVignette ?? url`.** Le lien du cadre, la loupe et le téléchargement
  du lot gardent l'ORIGINAL. Le dépliage par tranches de douze reste : les dossiers
  antérieurs et les HEIC indécodables n'ont pas de vignette.
- Migration : `supabase/migrations/20260830_atelier_vignettes.sql`.
  Rattrapage des dossiers existants : `npx tsx --tsconfig tsconfig.json
  scripts/vignettes-rattrapage.ts` (`--essai` pour compter sans écrire). Idempotent,
  lancé à la main — pas de relève quotidienne qui téléchargerait des originaux.

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
⚠️ `--pousser` réécrit les DIX templates : bon défaut quand on retouche la maquette
commune, mauvais quand on n'ajoute qu'un mail (on repasse sur neuf templates qui
n'avaient rien demandé). `--pousser --seulement M0` borne le geste.
**Ce qui reste à faire : `docs/ATELIER-A-FAIRE.md`.** Recette : `docs/RECETTE-PARCOURS.md`.
**Bascule en LIVE (le jour du lancement officiel) : `docs/BASCULE-LANCEMENT.md`** — les cinq
tiers à faire passer en production, et comment vérifier chacun. Un mode test resté branché
ne fait pas d'erreur, il fait un silence.

## Le questionnaire n'a plus de question facultative (28/08/2026, D14)
Six champs EXIGÉS : occasion, histoire (20 caractères), titre, prénom, email, téléphone.
La règle vit dans **`src/lib/atelier/questionnaire.ts`** (module PUR), lue par le
questionnaire ET par `POST /api/atelier/numero`. Ajouter ou assouplir un champ = une
entrée dans ce fichier, jamais dans un écran.
- Le serveur revérifie TOUT et renvoie `{ error: "champ_manquant", champ }` ; le
  questionnaire repose alors la cliente sur l'écran concerné (`ecranDuChamp`).
  ⚠️ Ce n'est pas une ceinture de sécurité théorique : un brouillon localStorage
  d'avant le 28/08 peut arriver à l'écran 4 avec une occasion et un titre vides.
- ⚠️ **Le saut de l'écran 3 a été RETIRÉ.** « Je ne sais pas encore, choisissez pour
  moi » posait un titre nul, et personne ne choisissait à sa place : le dossier
  s'appelait « Sans titre » dans la table de travail. La promesse était creuse, et
  elle a été prise au mot par le premier dossier venu de l'extérieur.
- ⚠️ **Le téléphone est stocké NORMALISÉ** (`normaliserTelephone`, « 0769710686 »
  depuis « 07 69 71 06 86 »). C'est la forme que Cloudprinter attend — il l'EXIGE
  dans l'adresse, et le repli `TELEPHONE_CONTACT` faisait appeler l'atelier par le
  transporteur. L'écran 4 dit à quoi le numéro sert : un champ obligatoire dont on
  tait la raison se lit comme un fichier qu'on constitue.
- Le seuil de 20 caractères sur l'histoire est calé sur un dossier RÉEL (35
  caractères, 25/08). Le remonter bloquerait de vraies clientes.
- Vérifications : `npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts`
  (section « QUESTIONNAIRE : PLUS DE TROU », qui rejoue le dossier du 27/08).
### La cliente doit SAVOIR qu'elle n'a pas fini (28/08/2026)
Le vrai coût du dossier du 27/08 n'est pas le titre manquant : c'est qu'elle a
probablement cru sa demande terminée. Trois choses le lui disaient mal.
- **L'écran 4 se refermait sur lui-même.** « Vous la recevez sous 48 h. Gratuitement,
  sans engagement. » se lit comme une FIN : coordonnées données, couverture promise.
  Une phrase annonce désormais l'étape (« Il reste une étape après celle-ci : vos
  photos »), et le bouton la NOMME — « Passer à mes photos », plus « Continuer ».
- **M0, l'accusé, part à la seconde où le dossier existe** (POST /api/atelier/numero).
  Il ne remercie pas, il dit ce qui manque : un accusé qui dirait « nous avons bien
  reçu votre demande » confirmerait le malentendu au lieu de le lever. Il porte aussi
  le LIEN PERMANENT — avant lui, le token ne vivait que dans le localStorage de son
  appareil, et un onglet fermé rendait le dossier injoignable jusqu'à M2.
  ⚠️ Best-effort, comme tout envoi de l'atelier : une création de dossier ne doit
  JAMAIS échouer sur un mail. Tant que `BREVO_TEMPLATE_M0_ID` manque dans un
  environnement, rien n'y part et `/admin/atelier/sante` affiche « 1 mail sans
  template ».
- **L'écran 6 nomme ce qui est arrivé.** « {{titre}} est entre nos mains » est une
  belle phrase et une phrase vague. Une ligne dit désormais les DEUX choses reçues
  (les photos, AVEC leur nombre, et la demande) et ce qui commence. Le nombre est
  celui CONFIRMÉ par le serveur, remonté du moteur de dépôt par `onTermine(nb)` ;
  à zéro il n'est pas affiché plutôt que d'être inventé.
- **La phrase du bas de l'écran 5 se contredisait.** « Vos photos sont arrivées chez
  nous, mais l'atelier ne les a pas encore reçues » : exact (elles sont sur le coffre,
  pas dans la pile), illisible sans le schéma en tête. Remplacée par UNE idée qui
  désigne le bouton — « Il reste un geste. » Le bouton, lui, disait déjà « Envoyer à
  l'atelier ».
  ⚠️ `at-d-envoi--collee` NE COLLE RIEN malgré son nom : elle ne pose qu'un filet de
  séparation (depot.css). Ce qui garde le bouton en vue, c'est la grille repliée.
- **La ligne de l'admin porte le tag « dépôt non terminé »** (Liste.tsx), à côté du
  titre. L'état de naissance s'appelle `photos_recues` et s'affiche « Photos reçues »
  alors qu'aucune photo n'est arrivée : le tag lève la contradiction d'un coup d'œil.
  Le libellé de l'état n'a PAS bougé — changer la valeur de l'enum demanderait une
  migration pour un problème d'affichage.
**Recette de bout en bout, faite le 28/08 sur localhost** : dossier créé (M0 parti en
0,3 s), 42 photos montées et confirmées avec leurs 42 vignettes, bouton bloqué tant que
la case n'est pas cochée, « Envoyer à l'atelier » → `consent_photos`, M1, écran 6
annonçant « vos 42 photos ». Dossier, photos, mails, journal et les 84 objets R2
supprimés après coup.
⚠️ **LES PHOTOS ARRIVENT AVANT LA VALIDATION, ET C'EST NORMAL.** Chaque photo part sur
R2 dès qu'elle est choisie et `nb_photos` monte au fil de l'eau : sur la recette,
42 photos étaient comptées 48 secondes AVANT le clic sur « Envoyer à l'atelier ».
Pendant cette fenêtre l'admin affiche un dossier plein qui n'est pas validé — c'est
exactement ce qui fait lire un dépôt en cours comme une demande finie. Le seul signal
de fin reste `consent_photos`, et c'est le tag « dépôt non terminé » qui le dit.
⚠️ **Ce qui reste ouvert.** M2 arrive encore entre 24 h et 46 h selon l'heure
d'inscription (seuil à 24 h, relève une fois par jour à 7 h UTC), une seule relance
part à vie (`sante.ts` exclut volontairement le dépôt non terminé des « oubliés »), et
aucun rebond Brevo n'est traité : une adresse mal tapée tue le dossier en silence.

## Dashboard interne /admin
- /admin : dashboard interne LECTURE SEULE (inscrits / clients / ambassadeurs,
  KPI, graphique inscrits/jour, export CSV). Non lié dans la nav publique.
- Protégé par mot de passe partagé : middleware.ts (cookie HMAC bj_admin) +
  env ADMIN_PASSWORD (Vercel Preview + Production). Service key strictement server-side.
- Seule écriture autorisée : admin_last_seen. Ne touche jamais aux données métier.

## ⚠️ Sections de l'ANCIENNE landing waitlist — ARCHIVÉES le 28/08/2026
Elles vivent dans `archive/landing-waitlist/`, avec leur propre README. Hors
routage depuis la bascule du 24/08, hors ESLint et hors `tsconfig` depuis le 28.
Ordre historique : Hero (crème) · Anxiete (sombre) · Solution (crème) · Album
(jamais construite) · Waitlist · FAQ · Footer.
Seul `sections/Footer.tsx` est resté dans `src/` : 8 fichiers l'importent, et il
a vocation à disparaître (D9).

## Statut de l'accueil (EN PRODUCTION depuis le 28/08/2026)
✅ Ouverture — la couverture qui se pose puis s'ouvre (Ouverture.tsx + ouverture.css)
✅ Univers   — les sept pages du récit (Univers.tsx + univers.css)
✅ Nav       — zone de verre, sans filet, ne se cache jamais. La signature ramène à
   la couverture. ⚠️ C'est un <button> avec sa PROPRE remise à zéro dans nav.css :
   rien ne réinitialise les boutons globalement (le preflight Tailwind n'est jamais
   importé), et sans elle le navigateur pose son fond `buttonface` gris-blanc.
✅ Footer    — components/Footer.tsx. Instagram ET TikTok, écrits ICI et non importés
   du composant partagé, qui dépend de la palette crème.
   ⚠️ Le footer CRÈME (sections/Footer.tsx, 7 pages) a vocation à disparaître : ne
   rien y investir de neuf. Voir D9.
✅ Défilement rapide — la révélation s'adapte au rythme du lecteur au lieu de lui
   prendre le défilement. Au-delà de 900 px/s (vitesse LISSÉE) la page arrive déjà
   composée. ⚠️ Le drapeau `data-pilote` sur <html> exclut les DEUX boutons de
   tourner-page, qui défilent eux-mêmes trop vite pour être distingués d'un lecteur
   pressé — et ils vivent dans deux composants différents. Voir D10, cinq
   conséquences à respecter.
✅ Page produit — `/magazine`, EN LIGNE depuis le 30/08/2026. Direction
   « Le Kiosque » : le mot géant, le collage qui lui passe devant, et dans la
   colonne de droite le récit, le parcours, la grille et l'acte. Elle a recueilli
   le contenu des orphelins S2Collection (l'étagère), S3Method (les trois temps
   et les paliers) et S4Final (l'acte final) — tous LISENT content.ts, il n'y a
   donc toujours qu'une source. Ces quatre fichiers ont fini leur office et sont
   désormais candidats à `archive/`.
   ⚠️ `.at-pdp` n'est pas décoratif : toute pdp.css y est scopée et ses classes
   sont courtes (.mot, .pas, .prix, .double). Le retirer repeindrait /composer.
   ⚠️ Le mot géant est dimensionné AU CALCUL, pas à l'œil : Cormorant Garamond
   rend « MAGAZINE » à 5,29 × la taille de police (mesuré), la colonne fait
   622 px à 1440. Remonter le plafond de 110 px sans remesurer le fait déborder
   — et sous 767 px, `overflow-wrap: anywhere !important` (globals.css) ne le
   fait pas déborder : il le COUPE au milieu du mot.
   ⚠️ Le <h1> est la PHRASE (« Un moment de vie »), pas le mot géant, qui est
   un <p> masthead. Un h1 « MAGAZINE » dirait à Google que la page parle de
   magazines en général.
   ⚠️ **LE PREMIER ÉCRAN VA JUSQU'AU BOUTON** (exigence de Mathias, 30/08).
   Deux mécaniques le tiennent, et se cassent en silence :
   1. `--nav-h` (pdp.css) REDIT la hauteur de la barre, parce qu'elle est en
      `position: fixed` et que rien dans le flux ne la connaît. Mesurée : 91 px
      à 1440×900, 86 px sur un téléphone. Une estimation à 70 px avait fait
      passer le chapeau et le haut du masthead SOUS la barre — un élément
      recouvert ne déborde pas, il disparaît. Si nav.css change, cette ligne
      doit suivre.
   2. Le parcours est en `order: 5`, donc SOUS l'acte, desktop et mobile. Il
      coûte 330 px et repoussait le bouton 119 px hors de l'écran. Fait en
      `order`, jamais en dupliquant le balisage : l'ordre au clavier et au
      lecteur d'écran suit le DOM.
   Toute la respiration du kiosque est en `dvh`, pas en `vw` : la contrainte
   est de tenir en HAUTEUR. Relevé après coup — bouton visible à 1440×900,
   1440×720, 768×1024, 375×812, 375×667 et 320×568.
   **Recette du câblage : `docs/RECETTE-PARCOURS.md`, annexe en fin de fichier.**
   Le parcours `/` → `/magazine` → `/composer` a été cliqué en production le
   28/08. Ce qui N'A PAS été testé, et qui compte le plus : la reprise d'un
   dépôt (`/numero/<token>` → `/composer?reprendre=<token>`), qui demande un
   vrai dossier.

## Cleanup post-launch
- ~~Supprimer src/app/components/ReferralSheet.tsx + referralsheet.css~~ — FAIT : ces
  fichiers n'existent plus sur le disque (vérifié le 28/08/2026).

## Prévente — Section 4 (page ARCHIVÉE depuis le 28/08/2026, cf. D13)
- Le prix/offre d'acompte est TOUJOURS décidé par le backend (/api/checkout). Le front envoie expected_offer (affichage seulement) et gère le 409 offer_changed. Ne jamais hardcoder un montant ni le seuil FOUNDER_CAP côté front.
- ⚠️ La règle reste vraie pour l'API, qui n'a PAS bougé. Seule la page a été retirée.

## Perf / animations — backdrop-filter (règle anti-jank)
⚠️ Née sur la prévente, mais elle ne meurt PAS avec elle : `AmbassadeurNav` et la barre
de tête de l'accueil sont exactement les cas qu'elle vise. La détection Android vit
désormais dans `useAndroid()` (`src/hooks/useClient.ts`), un seul endroit.
Ne JAMAIS poser `backdrop-filter: blur()` sur :
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
- M0 (Atelier — l'accusé, fin de l'écran 4) = **template 38**, env BREVO_TEMPLATE_M0_ID,
  **ACTIF EN PRODUCTION depuis le 29/08/2026** (vérifié de bout en bout sur bellajour.fr :
  dossier créé → `mail_envoye {code:"M0", template_id:38}`, puis dossier supprimé).
  ⚠️ Une variable d'environnement Vercel n'entre en vigueur qu'au déploiement SUIVANT :
  poser la variable ne suffit pas, il faut redéployer (commit vide c2440d7).
  Déclencheur : POST /api/atelier/numero, dans la seconde où le dossier existe.
  Params { PRENOM, TITRE, LIEN } — aucun chiffre, nb_photos vaut zéro par construction.
  Filet : la relève le rattrape tant que le dossier a MOINS de 24 h. Au-delà, M2 dit la
  même chose en mieux, et un accusé tardif ferait deux mails pour un seul message.
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
  clair). Au lancement : interface Live + un webhook vers bellajour.fr + clés en Production. Cf. `docs/BASCULE-LANCEMENT.md` §2.

### Le suivi du colis se remplit tout seul (27/08/2026)
`src/lib/atelier/suivi.ts` (PUR) est LE seul endroit qui interprète un envoi.
Motif : Cloudprinter annonce l'expédition avec un `tracking` qui est un NUMÉRO
(« TEST123456789FR »), pas une adresse. Le webhook ne gardait que les `https://…`,
donc ne gardait rien du cas courant : fiche vide, page cliente sans suivi, M7 avec
un lien vide. Depuis :
- `lireSuivi(shipping_option, tracking)` → `{ transporteur, code, url }`. Le numéro
  devient un lien pour les transporteurs de la table (Colissimo/La Poste, Chronopost,
  DPD, Mondial Relay, GLS, UPS, DHL, FedEx, bpost) et reste TOUJOURS conservé.
  ⚠️ Aucune adresse n'est inventée : un transporteur inconnu donne `url: null` et le
  numéro seul. Ajouter un transporteur = une entrée dans la table, jamais ailleurs.
- Nouvelle colonne `numeros.tracking_code` (migration 20260829). Le webhook ET la
  route de transition retombent sur un update SANS elle en 42703 : une expédition ne
  doit pas être bloquée par une colonne d'affichage pendant la fenêtre migration/déploiement.
- Le champ « Numéro ou lien de suivi » de *Marquer expédiée* accepte les DEUX formes
  et passe par le même `lireSuivi` : une seule règle, que le colis parte tout seul ou à la main.
- M7 porte un encart conditionnel « Suivre le colis chez … » (`{% if params.SUIVI %}`),
  poussé par `node scripts/mails-atelier.mjs --pousser`. Sans lien constructible,
  l'encart disparaît et le bouton ramène sur la page, où le numéro est écrit en clair.

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
