---
name: bellajour-brand-motion
description: "Brand Guidelines & Motion System complet de Bellajour. Se déclenche SYSTÉMATIQUEMENT dès que Mathias mentionne : motion design, animation, transition, design site, améliorer le site, effet visuel, apparition, scroll, glassmorphism, gradient, profondeur, ambiance visuelle, refaire une section, rendre le site plus beau, ou toute demande de modification visuelle ou d'animation sur la landing page Bellajour. Ce skill est le document d'exécution de référence — Claude ne touche pas au site sans l'avoir consulté."
---

# Bellajour — Brand & Motion System

> Document d'exécution. À lire intégralement avant toute modification visuelle ou animation du site Bellajour.

---

## 1. BRAND SOUL — Ce que le site doit faire ressentir

Bellajour n'est pas un outil. C'est un artisan qui travaille dans l'ombre pendant que tu dors.

### Les 3 émotions cibles (dans l'ordre)
1. **Reconnaissance** — "C'est exactement ce que je ressens avec mes photos"
2. **Confiance** — "Ces gens savent ce qu'ils font"
3. **Désir** — "Je veux ça pour mes souvenirs"

### Le tempo Bellajour
- **Lent et délibéré** — chaque élément arrive comme s'il avait attendu le bon moment
- **Jamais pressé** — aucune animation sous 400ms perceptible
- **Toujours intentionnel** — si un élément bouge, c'est pour une raison narrative

### Ce que le site NE doit PAS faire ressentir
- ❌ Startup tech / SaaS générique
- ❌ Application mobile bas de gamme
- ❌ Urgence marketing ("OFFRE LIMITÉE")
- ❌ Surcharge visuelle

---

## 2. DESIGN TOKENS — Valeurs figées

### Couleurs
| Token | Valeur | Usage |
|---|---|---|
| `--bj-beige` | `#EAE3D8` | Fond Hero, sections claires |
| `--bj-noir` | `#1C1C1C` | Fond sections sombres, texte principal |
| `--bj-creme` | `#F0EBE1` | Texte clair sur fond sombre |
| `--bj-accent` | `--bj-accent: #778899` | CTA unique, accent chaud |
| `--bj-muted` | `#A89880` | Sous-titres, textes secondaires |
| `--bj-border` | `#2C2C2C` | Bordures sur fond sombre |
| `--bj-border-light` | `rgba(234,227,216,0.15)` | Bordures glass sur fond sombre |

### Typographies
| Role | Famille | Graisse | Style |
|---|---|---|---|
| Display / Titres | Playfair Display | 700 | Normal |
| Titres éditoriaux | Playfair Display | 400 | Italic |
| Corps narratif | Cormorant Garamond | 300 | Italic |
| Labels / UI | DM Sans | 300 | Italic |

### Règles absolues typographie
- **Zéro font hors de ces 3 familles**
- Line-height corps : `1.7`
- Letter-spacing display : `0.02em`
- Letter-spacing labels : `0.12em` (small caps feeling)

### Géométrie
| Propriété | Valeur |
|---|---|
| Border-radius standard | `0` — tout est carré net |
| Border-radius glass | `24px` — cohérent avec le reste du UI |
| Ombres | `none` — interdit sauf glassmorphism |
| Max-width contenu | `1200px` |
| Padding horizontal | `clamp(24px, 5vw, 80px)` |

---

## 3. MOTION LEXICON — Les 6 effets autorisés

> Chaque effet a un nom, des paramètres exacts, et un contexte d'usage.
> **Aucun effet hors de cette liste sans validation.**

---

### EFFET 1 — LUX FADE (apparition standard)
**Inspiration :** Image 1 (gradient lumière/ombre)
**Usage :** Apparition de tout élément texte ou UI

```css
/* Timing standard Bellajour */
--bj-ease: cubic-bezier(0.25, 0.1, 0.25, 1);
--bj-ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);

/* LUX FADE */
@keyframes luxFade {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lux-fade {
  animation: luxFade 800ms var(--bj-ease-out) forwards;
}
```

**Paramètres :**
- Durée : `800ms` (jamais moins de `600ms`)
- Délai entre éléments successifs : `120ms` stagger
- Déplacement : `16px` vertical uniquement — jamais horizontal

---

### EFFET 2 — FADE SEPARATOR (transition inter-sections)
**Inspiration :** Minimalisme — rien de visible, juste un séparateur fin
**Usage :** Transition entre section beige (#EAE3D8) et section sombre (#1C1C1C)

```css
/* Appliqué sur le ::before ou ::after de la section sombre */
.sep-section {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(28,28,28,0.10) 25%,
    rgba(28,28,28,0.10) 75%,
    transparent 100%
  );
  margin: 0 clamp(24px, 5vw, 80px);
}

/* Version sur fond sombre */
.sep-section-dark {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent 0%,
    rgba(234,227,216,0.08) 25%,
    rgba(234,227,216,0.08) 75%,
    transparent 100%
  );
  margin: 0 clamp(24px, 5vw, 80px);
}
```

**Règle :** La lumière "saigne" vers le bas, jamais vers le haut. Hauteur : `150px` à `250px` selon l'impact voulu.

---

### EFFET 3 — DRUM ROLL (chiffres/dates animés)
**Inspiration :** Images 2-3-4 (split-flap, clock, milestone counter)
**Usage :** Affichage de stats, dates, compteurs — à l'entrée dans le viewport

```js
// Drum Roll — chiffre qui défile vers le haut comme un tableau d'aéroport
function drumRoll(el, finalValue, duration = 1200) {
  const chars = '0123456789';
  const steps = 12;
  const interval = duration / steps;
  let count = 0;
  
  const timer = setInterval(() => {
    if (count < steps - 1) {
      el.textContent = chars[Math.floor(Math.random() * 10)];
      count++;
    } else {
      el.textContent = finalValue;
      clearInterval(timer);
    }
  }, interval);
}

// Pour les dates : lettre par lettre avec timing irrégulier (effet mécanique)
function typeDate(el, text, baseDelay = 60) {
  el.textContent = '';
  [...text].forEach((char, i) => {
    setTimeout(() => {
      el.textContent += char;
    }, i * baseDelay + Math.random() * 20);
  });
}
```

**Paramètres :**
- Durée totale : `1200ms`
- Trigger : `IntersectionObserver` (seuil `0.3`)
- Ne se rejoue pas au second passage

---

### EFFET 4 — SLIDE REVEAL (apparition d'encarts)
**Inspiration :** Image 5 (Aesop mobile, encart depuis le bas)
**Usage :** Cards, témoignages, encarts UI qui entrent dans le viewport

```css
@keyframes slideReveal {
  from {
    opacity: 0;
    transform: translateY(40px);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

.slide-reveal {
  animation: slideReveal 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

**Paramètres :**
- Durée : `700ms`
- Easing : `cubic-bezier(0.16, 1, 0.3, 1)` — départ rapide, arrivée douce (spring feel)
- Blur : `4px` → `0` simultané (donne une sensation de "matérialisation")
- Stagger si plusieurs cards : `80ms` entre chaque

---

### EFFET 5 — GLASS PANEL (glassmorphism Bellajour)
**Inspiration :** Images 6 et 8 (Liquid Glass, Onda Retreat)
**Usage :** Encarts d'information flottants, formulaires, overlays sur images

```css
.glass-panel {
  background: rgba(234, 227, 216, 0.08);
  backdrop-filter: blur(20px) saturate(1.2);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(234, 227, 216, 0.15);
  border-radius: 12px;
  /* Jamais de box-shadow lourde */
}

/* Version sombre (sur fond beige) */
.glass-panel-dark {
  background: rgba(28, 28, 28, 0.65);
  backdrop-filter: blur(24px) saturate(1.1);
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  border: 1px solid rgba(28, 28, 28, 0.3);
  border-radius: 12px;
}
```

**Règles :**
- **Toujours sur un fond avec texture/image** — le glass sans fond derrière = vide
- Opacité du fond : jamais au-delà de `0.15` (version claire) / `0.70` (version sombre)
- Le `border-radius: 12px` est **la seule exception** à la règle des angles droits
- Pas plus de 2 glass panels visibles simultanément

---

### EFFET 6 — DEPTH LAYER (typographie à 3 plans)
**Inspiration :** Image 7 (Brand.AI texte foreground + éléments mid-ground + images background)
**Usage :** Sections hero, sections narratives à fort impact

```css
/* Plan 1 — Background : image ou fond coloré */
.depth-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  /* image ou gradient */
}

/* Plan 2 — Mid-ground : éléments UI flottants */
.depth-mid {
  position: relative;
  z-index: 10;
  transform: translateZ(0); /* GPU layer */
}

/* Plan 3 — Foreground : typographie principale */
.depth-fg {
  position: relative;
  z-index: 20;
  font-size: clamp(48px, 8vw, 120px);
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  color: var(--bj-creme);
  mix-blend-mode: normal;
}

/* Élément mid flottant (UI pill, tag...) */
.depth-float {
  position: absolute;
  z-index: 15;
  /* Positionné avec top/left en % pour être responsive */
}
```

**Règle de composition :**
- Le texte foreground est **toujours lisible** — tester le contraste
- Les éléments mid-ground occupent max `25%` de la largeur
- Jamais plus de `3` éléments flottants simultanément

---

### EFFET 7 — HORLOGE CANVAS (temps réel)
**Inspiration :** Drum Roll · précision mécanique · sentiment temporel
**Usage :** Section "livraison", countdown, affichage de délai, ambiance premium

```js
// Horloge Canvas Bellajour — smooth sweep, slate blue
function initClock(canvasId, theme = 'dark') {
  const cv = document.getElementById(canvasId);
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, R = Math.min(W,H)/2 - 8;
  const cx = W/2, cy = H/2;

  const C = {
    dark:  { bg:'#1C1C1C', rim:'rgba(240,235,225,0.08)', nums:'#A89880',
             hour:'#F0EBE1', min:'#F0EBE1', sec:'#778899', center:'#778899',
             tick:'rgba(240,235,225,0.12)', tickMaj:'rgba(240,235,225,0.28)' },
    light: { bg:'#EAE3D8', rim:'rgba(28,28,28,0.08)', nums:'#A89880',
             hour:'#1C1C1C', min:'#1C1C1C', sec:'#778899', center:'#778899',
             tick:'rgba(28,28,28,0.10)', tickMaj:'rgba(28,28,28,0.22)' }
  };

  function draw() {
    const now = new Date();
    const h = now.getHours()%12, m = now.getMinutes(),
          s = now.getSeconds(), ms = now.getMilliseconds();
    const c = C[theme];

    ctx.clearRect(0,0,W,H);
    ctx.beginPath(); ctx.arc(cx,cy,R+2,0,Math.PI*2);
    ctx.fillStyle=c.bg; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
    ctx.strokeStyle=c.rim; ctx.lineWidth=1; ctx.stroke();

    for(let i=0;i<60;i++){
      const a=(i/60)*Math.PI*2-Math.PI/2, maj=i%5===0;
      ctx.beginPath();
      ctx.moveTo(cx+Math.cos(a)*(maj?R-12:R-7),cy+Math.sin(a)*(maj?R-12:R-7));
      ctx.lineTo(cx+Math.cos(a)*(R-2),cy+Math.sin(a)*(R-2));
      ctx.strokeStyle=maj?c.tickMaj:c.tick; ctx.lineWidth=maj?1.5:0.5; ctx.stroke();
    }

    const sS=s+ms/1000, sM=m+sS/60, sH=h+sM/60;
    function hand(angle,len,w,color){
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle-Math.PI/2);
      ctx.beginPath(); ctx.moveTo(0,len*0.18); ctx.lineTo(0,-len);
      ctx.strokeStyle=color; ctx.lineWidth=w; ctx.lineCap='round'; ctx.stroke(); ctx.restore();
    }
    hand((sH/12)*Math.PI*2, R*0.52, 2.5, c.hour);
    hand((sM/60)*Math.PI*2, R*0.72, 1.5, c.min);
    hand((sS/60)*Math.PI*2, R*0.82, 0.8, c.sec);

    ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fillStyle=c.center; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,1.5,0,Math.PI*2); ctx.fillStyle=c.bg; ctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
}
```

**Paramètres :**
- Taille recommandée : `200×200px` à `280×280px`
- Trotteuse : smooth sweep via `ms/1000` — jamais tick-tick
- `theme: 'dark'` (fond `#1C1C1C`) ou `'light'` (fond `#EAE3D8`)
- Chiffres optionnels : Cormorant Garamond italic `11-13px`, couleur `#A89880`

**Prompt Claude Code :**
```
Dans [FICHIER], ajoute une horloge analogique Canvas Bellajour avec ces specs :
- Canvas 200×200px, id="clockCanvas"
- Fond #1C1C1C, aiguilles #F0EBE1, trotteuse #778899 smooth sweep
- Graduations : 60 marques, majeures (x5) plus épaisses
- Chiffres optionnels en Cormorant Garamond italic, couleur #A89880
- Heure réelle via new Date(), requestAnimationFrame
- Ne réécris pas le fichier entier.
```

---

## 4. TRANSITIONS DE SCROLL — Règles globales

```js
// Pattern universel : IntersectionObserver pour déclencher les animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      // Ne pas unobserver → l'animation ne se rejoue pas
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```

```css
/* État initial (avant animation) */
[data-animate] {
  opacity: 0;
  transform: translateY(20px);
  transition: none;
}

/* État final (quand visible) */
[data-animate].is-visible {
  animation: luxFade 800ms var(--bj-ease-out) forwards;
}
```

**Règle de performance :**
- Toujours `will-change: opacity, transform` sur les éléments animés — **retiré après animation**
- RAF uniquement pour les scroll-driven (section anxiété). IntersectionObserver pour tout le reste
- Jamais d'animation sur `width`, `height`, `margin`, `padding` (performance catastrophique)

---

## 5. CE QUI EST INTERDIT

| ❌ Interdit | ✅ Alternative |
|---|---|
| Angles droits (`border-radius: 0`) | `16px` cards · `24px` panels · `100px` pills |
| `box-shadow` standard | Pas d'ombre du tout |
| Animations sous `400ms` | Minimum `600ms` |
| `bounce` ou `elastic` easing | `cubic-bezier` précis uniquement |
| Animations sur `width`/`height` | `transform: scale()` |
| Effets de parallax agressifs | Subtle `translateY` au scroll max `20%` déplacement |
| Plus de 2 glass panels simultanés | Un seul panel verre par vue |
| Fonts hors des 3 familles | Playfair / Cormorant / DM Sans uniquement |
| Animations en boucle infinie | Animations one-shot déclenchées au scroll |
| Effets de particules | Interdit |
| Confettis, sparkles, glitters | Interdit |

---

## 6. PROMPTS CLAUDE CODE PRÊTS À L'EMPLOI

### Ajouter LUX FADE à une section
```
Ajoute l'animation LUX FADE à tous les éléments [DÉCRIRE LES ÉLÉMENTS] dans la section [NOM SECTION].
- Utilise IntersectionObserver avec threshold 0.15
- Durée 800ms, easing cubic-bezier(0.0, 0.0, 0.2, 1)
- Stagger de 120ms entre chaque élément
- translateY de 16px → 0 + opacity 0 → 1
- Ne réécris pas le fichier entier. Montre les lignes exactes à modifier.
```

### Ajouter LIGHT BLEED entre deux sections
```
Ajoute une transition LIGHT BLEED entre la section beige [ID SECTION CLAIRE] et la section sombre [ID SECTION SOMBRE].
- Pseudo-élément ::before sur la section sombre
- Gradient : #EAE3D8 → transparent sur 180px
- pointer-events: none
- Ne réécris pas le fichier entier.
```

### Ajouter DRUM ROLL sur un chiffre
```
Ajoute l'animation DRUM ROLL sur l'élément [ID OU SÉLECTEUR] qui affiche [VALEUR FINALE].
- Durée 1200ms
- Déclenchement via IntersectionObserver threshold 0.3
- Ne se rejoue pas au second passage
- Ne réécris pas le fichier entier.
```

### Ajouter SLIDE REVEAL sur des cards
```
Ajoute l'animation SLIDE REVEAL sur les cards [SÉLECTEUR].
- translateY 40px → 0, blur 4px → 0, opacity 0 → 1
- Durée 700ms, easing cubic-bezier(0.16, 1, 0.3, 1)
- Stagger 80ms entre chaque card
- Déclenchement IntersectionObserver
- Ne réécris pas le fichier entier.
```

### Ajouter un GLASS PANEL
```
Crée un encart GLASS PANEL [sur fond sombre / sur fond clair] pour afficher [CONTENU].
- Utilise les variables CSS Bellajour (--bj-beige, --bj-border-light)
- backdrop-filter blur(20px) saturate(1.2)
- border: 1px solid rgba(234,227,216,0.15)
- border-radius: 12px (seule exception aux angles droits)
- Ne réécris pas le fichier entier.
```

---

## 7. CHECKLIST AVANT TOUTE MODIFICATION VISUELLE

Avant d'envoyer un prompt à VS Code / Claude Code :

- [ ] L'effet fait partie du Motion Lexicon (6 effets autorisés) ?
- [ ] La durée est ≥ 600ms ?
- [ ] L'animation utilise uniquement `opacity` et `transform` ?
- [ ] Le prompt dit "Ne réécris pas le fichier entier" ?
- [ ] Si scroll-driven → RAF pattern (pas de boucle récursive) ?
- [ ] Si viewport-trigger → IntersectionObserver (pas de scroll listener brut) ?
- [ ] Le résultat final respecte la checklist du skill `bellajour-landing-mentor` ?

---

## 8. VISION D'ENSEMBLE — Ce que le site complet doit donner

```
HERO (fond beige #EAE3D8)
  ↓ [LIGHT BLEED — transition lumière 180px]
SECTION SOMBRE (fond #1C1C1C)
  → Texte scroll-driven (pattern anxiété existant)
  → Photos en DEPTH LAYER (3 plans)
  ↓ [LIGHT BLEED inverse — optionnel]
SECTION CONSTAT (fond beige)
  → Stats en DRUM ROLL
  → Cards en SLIDE REVEAL
  ↓ [LIGHT BLEED]
SECTION COMMENT ÇA MARCHE (fond sombre)
  → GLASS PANELS sur étapes
  → DEPTH LAYER sur visuels produit
  ↓
SECTION ALBUM PHYSIQUE
  → Photos en parallax subtil
  → LUX FADE sur descriptifs
  ↓
CTA FINAL
  → SLIDE REVEAL sur le formulaire waitlist
```

---

## 9. RESSOURCES COMPLÉMENTAIRES

**Référence visuelle interactive :**
- `references/visual-demo.html` — **À OUVRIR EN PRIORITÉ** — Démo live des 10 effets animés dans les couleurs Bellajour (7 Motion + 3 UI), dont l'horloge Canvas temps réel. Chaque effet est rejoué au scroll. Claude Code peut l'utiliser comme référence exacte du rendu attendu.

Pour aller plus loin :
- `references/motion-advanced.md` — Effets avancés (quand les 6 de base sont maîtrisés)

Pour toute modification de la landing, combiner ce skill avec :
- `bellajour-landing-mentor` — architecture technique et erreurs à éviter
