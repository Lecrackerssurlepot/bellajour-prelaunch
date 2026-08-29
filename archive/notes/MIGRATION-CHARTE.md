# Migration charte — éléments survivants à migrer

Suivi de la migration vers la **nouvelle DA** (tokens `--bj-*` de `src/app/tokens.css`,
installés sur la branche `prevente` — commit `11f0c62`).

Le remplacement net des tokens a **supprimé les anciens tokens waitlist**. Les sections
waitlist sont condamnées (disparition le 13 juin) → leur casse visuelle est **assumée**.
Mais certains éléments **survivent** et dépendent encore de tokens disparus : ils sont
listés ici pour une **étape de migration dédiée**.

> Aucun impact build : une `var()` non définie tombe en fallback CSS. `tsc` + `build`
> restent clean. Il s'agit uniquement de dégradation visuelle.

---

## Table de correspondance ancien → nouveau token

| Ancien token (disparu) | Valeur ancienne | Nouveau token charte | Notes |
|---|---|---|---|
| `--bj-bg` | `#EAE3D8` | `--bj-cream` (`#f7f1e9`) | fond général ; ou dégradé crème du `body` |
| `--bj-beige` | `#EAE3D8` | `--bj-cream` | — |
| `--bj-creme` | `#F0EBE1` | `--bj-cream-2` (`#efe6d8`) | crème profond |
| `--bj-noir` | `#1C1C1C` | `--bj-charcoal` (`#1c1c1c`) | encre / fond foncé |
| `--bj-text` | `#1C1C1C` | `--bj-text` | **identique** — rien à faire |
| `--bj-muted` | `#6B6155` | `--bj-text-soft` (`#5b554d`) | ou `--bj-text-faint` (`#8c8579`) selon contraste |
| `--bj-gold` | `#778899` | `--bj-action` (`#4a90d9`) | accent unique de la nouvelle charte (bleu) |
| `--bj-border` | `#2C2C2C` | `--bj-veil-12` / `--bj-veil-16` | bordures douces |
| `--bj-font-serif` | `'Cormorant'` | `--bj-font-display` | Cormorant Garamond (next/font) |
| `--bj-font-sans` | `'DM Sans'` | `--bj-font-ui` | DM Sans (next/font) |
| `--bj-glass-blur` | `blur(10px)` | `--bj-glass-blur` (`18px`) | ⚠️ valeur nue désormais → utiliser `blur(var(--bj-glass-blur))` |
| `--bj-glass-bg` | `rgba(234,227,216,.08)` | `--bj-glass-light-bg` / `--bj-glass-dark-bg` | selon clair/foncé |
| `--bj-glass-border` | `rgba(234,227,216,.15)` | `--bj-glass-light-border` / `--bj-glass-dark-border` | — |
| `--bj-radius-md` | `10px` | `--bj-r-sm` (`12px`) / `--bj-r-md` (`16px`) | — |
| `--bj-nav-h` | `64/72px` | `--bj-topbar-h` (`76px`) | hauteur barre — réaligner si besoin |
| `--bj-section-padding-*` | `120/88/64px` | échelle `--bj-sp-*` (`--bj-sp-8`=64…) | — |
| `--bj-max-width` | `1200px` | *(aucun)* | définir une valeur de layout dédiée |
| `--bj-ease-premium` | `cubic-bezier(.22,1,.36,1)` | `--bj-ease` (`cubic-bezier(.4,0,.2,1)`) | easing unique charte |
| `--bj-duration-fast/medium/slow` | `220/420/700ms` | `--bj-dur` (`240ms`) / `--bj-dur-fast` (`180ms`) | durées charte |

---

## Éléments survivants — checklist

### 1. Footer — `src/app/sections/footer.css`
Tokens disparus utilisés : `--bj-font-sans`, `--bj-font-serif`, `--bj-gold`, `--bj-muted`.
- [ ] `--bj-font-sans` → `--bj-font-ui`
- [ ] `--bj-font-serif` → `--bj-font-display`
- [ ] `--bj-gold` → `--bj-action`
- [ ] `--bj-muted` → `--bj-text-soft`
- [ ] (`--bj-text` inchangé)

### 2. Page confidentialité — `src/app/confidentialite/page.tsx`
Tokens disparus : `--bj-bg`, `--bj-muted`.
- [ ] `--bj-bg` → `--bj-cream` (ou laisser le dégradé `body` global)
- [ ] `--bj-muted` → `--bj-text-soft`
- [ ] (`--bj-text` inchangé)

### 3. Squelette global — `src/app/globals.css` (hors token-block)
Règles structurelles qui référencent encore des tokens disparus :
- [ ] `scroll-padding-top: var(--bj-nav-h)` (html/body) → `--bj-topbar-h` ou valeur dédiée
- [ ] `main { padding-top: var(--bj-nav-h) }` → idem
- [ ] `.hero-photo img { max-height: calc(... var(--bj-nav-h) ...) }` (bloc desktop) → idem
- [ ] `.bj-section { max-width: var(--bj-max-width); padding: var(--bj-section-padding-*) }` → `--bj-sp-*` + valeur layout
- [ ] easings/durées éventuels (`--bj-ease-premium`, `--bj-duration-*`) → `--bj-ease`, `--bj-dur`

### 4. À confirmer
- [ ] `src/app/inviter/page.tsx` (parrainage) — probablement condamné avec la waitlist ;
      vérifier s'il survit à la prévente avant de migrer ou de supprimer.

---

## Glass de référence — cartes prévente (standard figé)

**Standard unique** du glass des cartes prévente, appliqué **à la fois** aux cartes
d'offre de la **Section 4** (`s4-reservation.css` → `.s4-card`) et aux cartes du
**carrousel Section 2** (`s2-experience.css` → `.s2-card`). Même langage visuel : la carte
**flotte** au-dessus du fond.

> **Remplace** la dérogation « glass cream » v2 de la S2 (`--bj-glass-card-bg`,
> `--bj-glass-card-bg-active`, `--bj-glass-card-blur`, `--bj-glass-card-border` →
> **obsolètes**, plus consommés ; encore définis dans `tokens.css` mais supprimables).
> Seules les ombres `--bj-glass-card-shadow` / `--bj-glass-card-shadow-active` subsistent.

**Recette (tokens charte uniquement) :**
```css
background:    var(--bj-glass-light-bg);            /* clair translucide (0.55) */
backdrop-filter: blur(var(--bj-glass-blur));        /* 18px ; + préfixe -webkit- AVANT */
border:        1px solid var(--bj-glass-light-border); /* hairline discret (pas d'accent coloré) */
border-radius: var(--bj-r-lg);                      /* arrondi généreux (20px) */
box-shadow:    var(--bj-glass-card-shadow);         /* ombre douce diffuse, basse opacité */
```

**L'ombre douce est ici explicitement AUTORISÉE** = exception assumée à l'interdit v1
(no `box-shadow`). Ombre **douce/diffuse uniquement**, jamais dure.

**Variantes :**
- Carte **active S2** (desktop ≥1100px) : emphase = `transform: scale(1.05)` + ombre plus
  marquée `--bj-glass-card-shadow-active` + fond plus opaque `--bj-glass-light-bg-active`
  (rgba 255,255,255,0.85) → reste lisible quand elle se superpose à ses voisines.
- **Repoussoir S4** (`.s4-card--secondary`, desktop) : même famille glass mais **atténué**
  (ombre absente + opacité réduite) → reste clairement secondaire.

**Fallback & perf :**
- `@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` :
  si non supporté → **fond opaque clair** (`--bj-cream-tint-1`, actif `--bj-cream-2`),
  jamais de carte transparente illisible.
- `will-change: transform` sur les cartes carrousel (promotion GPU). **Jamais**
  `will-change: backdrop-filter`. Pas d'empilement de blur (médias internes opaques).
- **Périmètre** : S4 + S2 uniquement. **S3 NON concernée** (ses encarts deviendront des images).

> ⚠️ Ne PAS redéfinir `--bj-glass-blur` (18px) : utilisé via `blur(var(--bj-glass-blur))`
> par la navbar, le formulaire de réservation, et désormais les cartes S2 + S4.

---

## Méthode de vérification (post-migration)
Rechercher les références résiduelles aux anciens tokens :

```bash
grep -rnE "var\(--bj-(bg|beige|creme|noir|muted|gold|border|font-sans|font-serif|glass-bg|glass-border|radius|nav-h|section-padding|max-width|ease-premium|duration)" src/
```

Aucun résultat = migration terminée. Penser à corriger `--bj-glass-blur` (valeur nue →
`blur(var(--bj-glass-blur))` partout où elle était utilisée comme `backdrop-filter`).
