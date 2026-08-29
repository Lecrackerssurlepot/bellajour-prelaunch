# Audit Mobile vs Desktop — Bellajour
> Date : 2026-05-10 · Base commit : b47af54 · Rédacteur : Claude Code

---

## Section 1 : Hero

### Desktop (ce qui existe)
- Nav fixe avec logo centré (réduit au scroll via `hero-nav--scrolled`)
- Ligne verticale centrale décorative
- Headline centré absolument : "Nous composons vos **photos** en albums d'exception"
- Le mot "photos" ancre un stack de 7 photos flottantes avec parallax souris + fly-up au scroll (DEPTHS par photo, `requestAnimationFrame`)
- Formulaire inline pill : input email + bouton "Rejoindre" côte à côte
- Bloc pré-vente : "PRÉ-VENTE LE 1ER JUIN"
- Lien "Découvrir Bellajour" en bas avec soulignement animé au hover
- Étape 2 (prénom) + Étape 3 (confirmation) avec code de parrainage, lien copiable, WhatsApp
- Encart parrainage inline (desktop ≥ 768px) : `hero-referral-wrap` s'ouvre en `grid-template-rows` transition

### Mobile (ce qui est rendu)
- Nav logo : identique, taille clamp ✅
- Photos stack : `display: none` — correctement masqué ✅
- Headline : `white-space: normal`, 2 lignes ; L1 `clamp(32px, 8vw, 48px)`, L2 `clamp(18px, 4.5vw, 26px)` ✅
- Formulaire : `flex-wrap: wrap`, email full-width puis bouton full-width ✅
- Bloc pré-vente : visible ✅
- Après inscription : bottom sheet parrainage (`hero-mobile-sheet`, slide-up depuis le bas) ✅
- CTA bouton : `font-size: 14px` ✅

### Écarts identifiés
- 🟠 `--bj-radius-md` utilisé dans hero.css mobile (`hero-form`, `hero-input`, `hero-btn`) mais **non défini** dans globals.css (seuls `--bj-radius: 0` et `--bj-radius-glass: 24px` existent). La variable résout à `0`, supprimant le border-radius du formulaire sur mobile. La charte dit "border-radius présent" sur les CTAs — violation.
- 🟡 "Découvrir Bellajour" : aucune règle mobile dédiée mais s'adapte via clamp. Pas de souci visuel.
- 🟡 `hero-prelaunch-date` : `font-size: clamp(11px, 0.85vw, 13px)` → à 390px = 11px, très petit sur mobile. Lisible mais limite.

### Recommandation
- Définir `--bj-radius-md: 10px` dans globals.css (correction globale, 5 min)
- Laisser le reste tel quel — Hero mobile est le mieux traité du site

---

## Section 2 : Anxiété

### Desktop (ce qui existe)
- 600vh scroll storytelling avec sticky panel
- Grille 8 colonnes de photos avec animation flottante et zoom au scroll
- Overlay gradient gauche pour lisibilité texte
- Texte (titre + sous-titre + 4 paragraphes) apparaît en slide-up progressif piloté par `scrollProg`
- Overlay noir progressif (phase collage, à partir de 62%)
- Collage 5 photos convergentes (à partir de 70%)
- Headline final "Bellajour — Comprend vos besoins" (à partir de 86%)
- Barre de progression en bas

### Mobile (ce qui est rendu)
- Section = 100svh fixe (via `globals.css` : `.anx-sticky { position: relative; height: 100svh }`)
- `scrollProg` reste à 0 — scroll storytelling complètement absent
- Grille réduite à 4 colonnes ✅
- Overlay fixé à `rgba(23,20,15,0.82)` (pas le gradient directionnel) ✅
- Texte verticalement centré avec `top: 50%; transform: translateY(-50%)` (JS inline) ✅
- Texte entièrement visible dès le chargement (opacités forcées à 1 si isMobile) ✅
- Overlay sombre : `darkOp = isMobile ? 0` — absent ✅
- Collage et headline final : `!isMobile && scrollProg >= threshold` → **complètement masqués**
- Barre de progression : présente mais scaleX(0) permanent ✅

### Écarts identifiés
- 🔴 Le scroll storytelling (5 phases de révélation narrative) est **intégralement absent** sur mobile. L'utilisateur voit une photo de grille statique pendant 1 viewport, sans introduction émotionnelle à la marque.
- 🟠 Le collage 5 photos (preuve visuelle produit) n'est jamais vu sur mobile. BrandIntro compense partiellement mais sans le contexte émotionnel du scroll.
- 🟠 La barre de progression (`scaleX(0)`) est un artefact visible sans utilité sur mobile — peut être masquée.
- 🟡 La grille 4 colonnes + texte superposé : si le texte est long (4 paragraphes), il peut dépasser 100svh sur petits écrans (< 600px). Pas critique pour les phones récents (≥ 667px).
- 🟡 L'overlay mobile est uniforme (`0.82` flat) au lieu du gradient directionnel gauche-droite du desktop — cohérent pour mobile mais moins élégant.

### Recommandation
- Anxiété mobile est acceptable pour MVP (narrative réduite à une image forte + texte)
- Masquer la barre de progression sur mobile (2 min, CSS pur)
- BrandIntro remplace partiellement le headline final → valider qualité (voir section 3)

---

## Section 3 : BrandIntro (créé aujourd'hui — commit b47af54)

### Desktop (ce qui existe)
- **Rien** — `display: none` sur desktop ✅

### Mobile (ce qui est rendu)
- Section `data-theme="dark"` sur fond `#1C1C1C`
- `h2.bi-brand` "Bellajour" : `font-family: var(--bj-font-serif)` + `font-weight: 700` + clamp 48px-72px
- `p.bi-tagline` : Cormorant italic 300, clamp 16px-20px
- 3 photos en colonne (grid-01, grid-03, grid-05) au format portrait 3/4
- CTA button "Réserver ma place" : texte souligné, transparent, 44px min-height
- Reveal-up animations sur chaque élément via `useReveal`

### Écarts identifiés
- 🔴 `bi-brand` utilise `var(--bj-font-serif)` = `'Cormorant', serif` avec `font-weight: 700`. Cormorant Garamond est uniquement chargé en 300 et 400 italic dans le projet (cf. CLAUDE.md). Le browser va synthétiser un faux gras ou le rendu sera incorrect. Le nom "Bellajour" ne s'affichera pas avec la bonne typographie. Il faut soit utiliser `'Playfair Display', serif` + `font-weight: 700`, soit utiliser Cormorant en `font-weight: 300; font-style: italic` comme `.anx-hf-brand`.
- 🟠 3 photos au format portrait 3/4 sur mobile = environ 3 × (100vw × 4/3) de hauteur de défilement = ~1560px de photos sur iPhone 390px. C'est trop — l'utilisateur doit scroller 4 écrans pour voir tout le contenu de BrandIntro.
- 🟠 `bi-cta` est un `<button>` mais déclenche un scroll vers `#finalwaitlist`. Il n'a pas de `id` dans la config `SECTIONS` de StickyJoinCTA → ne pose pas de problème sur mobile (SJC masqué), mais à noter pour cohérence.
- 🟡 Le composant n'a pas d'`id` HTML sur la `<section>` → impossible de l'ancrer depuis un lien externe ou depuis le nav.
- 🟡 La transition depuis Anxiété (fond noir) vers BrandIntro (fond noir aussi) est correcte — pas de choc visuel.
- 🟡 `bi-tagline` duplique presque mot pour mot `.anx-hf-tagline` desktop : "Comprend vos besoins / et crée l'album parfait pour vous". Cohérence de message OK.

### Recommandation
- **Corriger immédiatement** la typographie `bi-brand` : passer à `font-family: 'Playfair Display', serif; font-weight: 700` (pour rester cohérent avec `fwl-confirm-titre`, `hero-step-title` qui utilisent Playfair 700) — ou en Cormorant 300 italic pour coller au style editorial.
- Réduire les 3 photos de portrait à ratio paysage (16/9 ou 4/3 horizontal) pour diviser la hauteur par 2.
- Ou réduire à 2 photos maximum.

---

## Section 4 : Solution — Parcours de création

### Desktop (ce qui existe)
- Section `100svh` avec scroll snap
- Colonne gauche : header "Le parcours de création" + 4 étapes (01-04) avec états active/next/prev/far
- Numéros animés (11px → 50px → 130px selon état) ; titres (13px → 42px → 56px)
- Timer auto de 6s par étape, avec connecteur vertical qui se remplit (progression)
- Clic sur une étape pour la sélectionner
- Colonne droite : visuels animés spécifiques (UploadVisual compteur 0-100%, CastingVisual, SelectionVisual, MiseEnPageVisual)

### Mobile (ce qui est rendu)
- JSX entièrement différent (`if (isMobile)`) : `sol-inner-mobile` + `sol-cards`
- 4 cartes statiques empilées : num (56px), titre (24px), sous-titre uppercase 11px-13px
- `reveal-up` animations avec delays progressifs (useReveal)
- Section en `height: auto` — pas de snap
- Visuels animés (colonne droite) : `display: none` ✅
- Pas de timer, pas d'interaction

### Écarts identifiés
- 🟠 Les visuels animés (upload counter, sélection, mise en page) sont complètement absents sur mobile. Ce sont des preuves produit importantes.
- 🟠 `.sol-card { background: var(--bj-creme) }` — `--bj-creme` est `#F0EBE1`, légèrement plus clair que le fond section `#EAE3D8` (`--bj-bg`). Les cartes "flottent" sur un fond légèrement différent — effet voulu ou erreur de token ?
- 🟡 Le header `sol-header` sur mobile est en `position: relative` mais se trouve à l'intérieur de `sol-inner-mobile`. Pas de conflit, mais le padding-left est `0 !important` → le texte colle à gauche sur les petits écrans (combiné avec `6vw` de padding du wrapper).
- 🟡 Aucune animation de transition entre les 4 cartes mobile — l'expérience est purement statique/informative, sans motion.

### Recommandation
- Section Solution mobile est acceptable en l'état pour MVP — information transmise correctement.
- À terme : ajouter au moins 1 illustration statique par carte (image ou icône) pour compenser l'absence des visuels animés.

---

## Section 5 : Album

### Desktop (ce qui existe)
- 700vh scroll-driven section
- Phase 1 (0-50%) : mockup entre par le bas (translateY 100→0vh), scale 0.8→1, titre fade-in
- Phase 2 (50-100%) : album scale down (1→0.45) + déplacement gauche (-25vw), décoration droite fade-in, sous-titre apparaît
- Animation pendulaire (sway) via rAF, amplitude liée à la phase scroll
- Fond noir (`--bj-noir`) sticky

### Mobile (ce qui est rendu)
- `alb-scroll { height: auto }`, `alb-sticky { position: relative; height: 100svh }` via globals.css
- `scrollProg` = 0 toujours → `albumOp = 1`, `titleOp = 1`, `subtitleOp = 1` (forcés isMobile)
- Album mockup : `width: 75vw` (`alb-img--mobile`), scale calculée à **0.8** (entryProgress=0 → albumScaleP1=0.8 → albumScale=0.8)
- Décoration droite : `decorOp = isMobile ? 0` → masquée ✅
- Sway : `rotate = isMobile ? 0` → désactivée ✅
- Titre et sous-titre : centrés (`alb-subtitle-wrap--center`) ✅
- Reveal-up animations (bookReveal, titleReveal, subtitleReveal)

### Écarts identifiés
- 🟠 Album mockup toujours à **scale 0.8** sur mobile (entryProgress=0 quand scrollProg=0). L'album apparaît à 80% de sa taille cible → visuellement plus petit que prévu. Correction simple : `const albumScale = isMobile ? 1 : ...` ou forcer `entryProgress = isMobile ? 1 : ...`
- 🟠 `.alb-title { font-size: 4vw }` avec override mobile `@media (max-width: 768px) { font-size: 7.5vw }` — le breakpoint est `768px` (pas `767px` comme les autres) → à 768px le titre aura les deux règles applicables, la dernière gagne. Incohérence mineure.
- 🟠 `text-shadow` définie sur `.alb-title` — violation de la règle absolue "Zéro ombre". Déjà présent, non introduit par les fixes mobile, mais à corriger.
- 🟡 L'image `decor-album.png` est chargée dans le DOM même si `opacity: 0` sur mobile — légère charge réseau inutile (non bloquant).
- 🟡 `.alb-subtitle { font-size: 2vw }` → `5.5vw` mobile. À 390px = 21.45px. Correct.

### Recommandation
- Corriger scale album : ajouter `const entryProgress = isMobile ? 1 : easeOut3(...)` (5 min, impact visuel fort)
- Corriger breakpoint `768px` → `767px` dans album.css
- Supprimer text-shadow sur alb-title (charte)

---

## Section 6 : FinalWaitlist

### Desktop (ce qui existe)
- Section full-page fond crème
- Titre editorial, compteur animé avec point pulsant
- Formulaire email + bouton (pill avec wipe animation au hover)
- Ticker animé (3 dates en rotation avec heartbeat keyframe)
- 3 cartes "chapitres" en grid 3 colonnes avec hover scale/dim effect
- Après inscription : inline referral panel (desktop), confirmation step 3

### Mobile (ce qui est rendu)
- Formulaire : `flex-wrap: wrap` → email + bouton en 2 lignes ✅
- Bouton full-width ✅
- Cartes : `grid-template-columns: 1fr` → empilées ✅
- Hover scale désactivé sur mobile (`transition: none; transform: none !important`) ✅
- Étape 2 prénom : formulaire wrappé ✅
- Étape 3 confirmation : lien de parrainage + bouton copie empilés ✅

### Écarts identifiés
- 🟡 `.fwl-ticker-item { width: max-content }` et `.fwl-ticker { overflow: visible }` → le ticker peut dépasser la largeur mobile si les labels sont longs. Pas de `max-width` ou `overflow: hidden` sur le conteneur. À surveiller sur 320px (iPhone SE).
- 🟡 Le CSS définit `.fwl-mobile-backdrop` et `.fwl-mobile-sheet` (bottom sheet mobile) mais **aucun JSX correspondant dans FinalWaitlist.tsx** — classes orphelines. L'étape 3 affiche le parrainage inline au lieu d'une sheet. Pas un bug (l'UX est cohérente), mais du CSS mort.
- 🟡 `fwl-count-dot` pulsant avec `box-shadow` — violation "Zéro ombre" (charte). Déjà présent, non critique.
- ✅ FinalWaitlist est la section la mieux adaptée mobile du site

### Recommandation
- Supprimer les classes CSS orphelines `fwl-mobile-backdrop` / `fwl-mobile-sheet` (ou les implémenter)
- Rien de critique — section validée pour MVP

---

## Section 7 : FAQ

### Desktop (ce qui existe)
- Accordion avec 6 questions
- Transition `grid-template-rows` pour ouverture fluide
- Icône `+` qui pivote à 45° à l'ouverture

### Mobile (ce qui est rendu)
- Structure identique au desktop — pas de rendu alternatif
- `faq-titre { font-size: clamp(28px, 8vw, 38px) }` ✅
- Boutons `faq-question` full-width → touch-friendly ✅
- `faq-question-text { font-size: clamp(17px, 1.6vw, 22px) }` → 17px sur mobile ✅

### Écarts identifiés
- 🟡 L'icône `faq-icon` (32×32px) — `border-radius: 50%` — violation charte "Zéro border-radius" sur les composants interactifs. Existant, non lié aux fixes mobile.
- ✅ FAQ fonctionne correctement sur mobile — aucun écart fonctionnel

### Recommandation
- Section validée pour MVP
- Éventuellement supprimer `border-radius: 50%` sur l'icône FAQ pour respecter la charte

---

## Section 8 : Footer

### Desktop (ce qui existe)
- 2 colonnes : gauche (tagline + contact + liens légaux) / droite (Instagram + copyright)
- Mot géant "Bellajour" (Playfair 700, clamp 120-220px) coupé en bas

### Mobile (ce qui est rendu)
- `flex-direction: column; align-items: flex-start` → colonne unique ✅
- `footer-right: align-items: flex-start` → gauche-aligné ✅
- `footer-links: flex-direction: column` → liens empilés ✅
- `footer-sep { display: none }` → séparateurs masqués ✅
- Mot géant : 120px sur 390px → ~9 caractères à 120px = débordement intentionnel, clippé par `overflow: hidden` ✅

### Écarts identifiés
- 🟡 `footer` a `data-theme="light"` dans Footer.tsx mais la section est fond `#EAE3D8` → cohérent ✅
- 🟡 Le mot géant à 120px peut sembler disproportionné sur mobile — effet voulu (signature de marque)
- ✅ Footer mobile est fonctionnel et cohérent

### Recommandation
- Section validée pour MVP

---

## Composants transverses

### StickyVText (`svt-left`, `svt-right`)
- Desktop : textes verticaux fixes "MAISON D'ÉDITION DU SOUVENIR" et "VIVEZ, NOUS COMPOSONS"
- Mobile : `display: none` ✅ — correctement masqué

### StickyJoinCTA (`sjc`)
- Desktop : bouton "Réserver ma place" + signature SVG, position fixe bas-droite, thème adaptatif selon section
- Mobile : `display: none` ✅ — correctement masqué
- 🟠 **Bug desktop** (hors scope mobile mais à noter) : `SECTIONS` config map `album` avec `theme: 'light'` mais la section Album a un fond noir. Sur desktop, le bouton SJC apparaîtra en texte sombre sur fond noir → invisible. À corriger : `{ id: 'album', theme: 'dark' }`.
- 🟠 `BrandIntro` n'a pas d'`id` déclaré dans `SECTIONS` → SJC ne connaît pas cette section. Sans impact mobile (SJC caché), mais à aligner pour cohérence.

---

## Résumé exécutif

### 🔴 Écarts CRITIQUES (cassent l'expérience)
1. **BrandIntro `bi-brand` : mauvaise typographie** — `font-weight: 700` avec Cormorant (non chargé en 700) → rendu de marque incorrect sur le seul élément qui dit "Bellajour" sur mobile. Cassant pour la brand identity.

### 🟠 Écarts IMPORTANTS (dégradent qualité)
2. **`--bj-radius-md` non défini** — border-radius du formulaire Hero et des CTAs = 0 sur mobile, viole la charte ("border-radius présent")
3. **BrandIntro : 3 photos portrait 3/4** — représente ~1560px de scroll sur iPhone. Expérience lourde.
4. **Album mockup scale 0.8** — l'album n'est jamais présenté à taille normale sur mobile
5. **Anxiété : narrative scroll absente** — l'histoire émotionnelle de marque (le vrai cœur de la section) est invisible sur mobile
6. **StickyJoinCTA desktop : `album` en `theme: 'light'`** — bouton invisible sur fond noir (desktop)
7. **`text-shadow` sur alb-title** — violation charte explicite

### 🟡 Écarts COSMÉTIQUES (acceptable pour MVP)
8. Album breakpoint `768px` au lieu de `767px` dans album.css — incohérence mineure
9. `fwl-ticker` pourrait déborder sur écrans < 360px
10. CSS orphelin `fwl-mobile-backdrop` / `fwl-mobile-sheet` dans finalwaitlist.css
11. `border-radius: 50%` sur icône FAQ (charte)
12. `fwl-count-dot` avec box-shadow (charte)
13. Barre de progression Anxiété scaleX(0) permanente sur mobile (artefact visible inutile)
14. `hero-prelaunch-date` à 11px sur mobile — très petit

### ✅ Ce qui marche bien mobile aujourd'hui
- Hero : formulaire, navigation, parrainage via bottom sheet
- Solution : rendu en cartes statiques avec reveal animations
- FinalWaitlist : adaptation complète (form, cartes, confirmation)
- FAQ : fonctionnel sans adaptation particulière nécessaire
- Footer : adaptation propre
- StickyVText + StickyJoinCTA : correctement masqués
- Anxiété : texte visible, centrage vertical OK, grille photos lisible

---

## Recommandation d'ordre de traitement

Pour livrer le mobile premium avant le 15 mai (J+5) :

| Priorité | Fix | Raison | Temps estimé |
|---|---|---|---|
| 1 | **BrandIntro `bi-brand` : corriger font** | Identité marque — visible à chaque chargement | 5 min |
| 2 | **Définir `--bj-radius-md: 10px`** dans globals.css | Fix global qui corrige Hero + tout composant futur | 3 min |
| 3 | **BrandIntro : photos ratio paysage** (16/9 ou 3/2) | Divise le scroll × 2, UX bien meilleure | 10 min |
| 4 | **Album scale corrigé** (`entryProgress = isMobile ? 1 : ...`) | Album au bon format dès le premier viewport | 5 min |
| 5 | **StickyJoinCTA : `album` → `theme: 'dark'`** | Bouton desktop visible sur fond noir | 2 min |
| 6 | Masquer barre progression Anxiété sur mobile | Artefact sans sens | 2 min |
| 7 | Corriger breakpoint Album `768px` → `767px` | Cohérence | 2 min |
| 8 | Supprimer `text-shadow` alb-title | Charte | 2 min |

**Estimation totale correctifs prioritaires (1-5) : ~25 minutes**
**Estimation totale tous correctifs (1-8) : ~31 minutes**

---

*Rapport généré à partir de la lecture statique du code source. Aucun fichier modifié.*
