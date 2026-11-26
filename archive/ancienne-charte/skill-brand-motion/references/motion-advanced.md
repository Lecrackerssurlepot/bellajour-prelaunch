# Bellajour — Motion Avancé

> À lire uniquement quand les 6 effets du Motion Lexicon principal sont implémentés et validés.

---

## EFFET A — MAGNETIC TEXT (texte qui suit le curseur subtilement)
**Usage :** Titres hero uniquement — 1 seul par page

```js
// Subtle magnetic effect — max 8px de déplacement
document.querySelector('.magnetic-title').addEventListener('mousemove', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / rect.width;
  const dy = (e.clientY - cy) / rect.height;
  e.currentTarget.style.transform = `translate(${dx * 8}px, ${dy * 8}px)`;
});
document.querySelector('.magnetic-title').addEventListener('mouseleave', (e) => {
  e.currentTarget.style.transform = 'translate(0, 0)';
  e.currentTarget.style.transition = 'transform 600ms cubic-bezier(0.25, 0.1, 0.25, 1)';
});
```

**Contrainte :** Desktop uniquement. Désactiver sur mobile (`window.matchMedia('(hover: none)')`).

---

## EFFET B — CURTAIN REVEAL (image qui se dévoile comme un rideau)
**Usage :** Photos produit, révélation d'albums

```css
.curtain-wrap {
  overflow: hidden;
  position: relative;
}
.curtain-img {
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 1000ms cubic-bezier(0.76, 0, 0.24, 1);
}
.curtain-wrap.is-visible .curtain-img {
  transform: scaleX(1);
}
```

**Paramètre :** Durée `1000ms`. L'image "s'ouvre" de gauche à droite comme un rideau de théâtre.

---

## EFFET C — WORD BY WORD (texte qui arrive mot par mot)
**Usage :** Phrases narratives clés, manifeste

```js
function wordByWord(el, delayPerWord = 80) {
  const words = el.textContent.split(' ');
  el.innerHTML = words
    .map((w, i) => `<span style="opacity:0;display:inline-block;transition:opacity 400ms ease ${i * delayPerWord}ms">${w}&nbsp;</span>`)
    .join('');
  
  // Trigger
  requestAnimationFrame(() => {
    el.querySelectorAll('span').forEach(s => s.style.opacity = '1');
  });
}
```

**Contrainte :** Max 15 mots par élément. Au-delà, fragmenter en plusieurs `<p>`.
