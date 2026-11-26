# Vue « Tranches » de la bibliothèque (retirée le 26/11/2026)

Mathias, 26/11 : à l'épaisseur réelle d'un magazine (quelques millimètres), le dos
est trop fin pour porter un visuel ; la vue dessinait des dos bien trop épais.
La bibliothèque garde deux vues : Étagère (par défaut) et Défilé.

Ce qui était dans `src/app/(atelier)/compte/Etagere.tsx` :

```tsx
/* La largeur d'un dos, en px d'écran, pour la vue Tranches. Ce n'est pas une
   mesure affichée : un repère visuel qui grandit avec le nombre de pages. */
function dosPx(nbPages: number | null): number {
  const p = nbPages ?? 32
  return Math.round(Math.min(64, Math.max(30, 18 + p * 0.6)))
}


      {vue === 'tranches' ? (
        <div className="bib-tranches">
          <div className="bib-tranches-rang">
            {livres.map((l, i) => (
              <button
                key={l.token}
                type="button"
                className="bib-dos"
                style={{ '--dos': `${dosPx(l.nbPages)}px` } as CSSProperties}
                onClick={() => setOuvert(i)}
                aria-label={`${l.titre}, ouvrir en grand`}
              >
                <span className="bib-dos-fond" aria-hidden="true">
                  {l.couverture ? (
                    <img
                      src={l.couverture}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={l.couvertureEstPlanche ? 'est-planche' : undefined}
                    />
                  ) : null}
                </span>
                <span className="bib-dos-titre">{l.titre}</span>
                <span className="bib-dos-annee">{l.annee}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

```

Ce qui était dans `src/app/(atelier)/compte/bibliotheque.css` :

```css
/* ── Vue « Tranches » : les dos alignés, comme un rayon de librairie ─ */

.bib-tranches {
  overflow-x: auto;
  padding-top: var(--m-espace-6);
  -webkit-overflow-scrolling: touch;
}

.bib-tranches-rang {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  width: max-content;
  min-width: 100%;
  padding: 0 var(--m-espace-3) 10px;
}

.bib-tranches-rang::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 10px;
  border-top: 1px solid var(--m-couleur-papier-ligne);
  background: linear-gradient(var(--m-couleur-papier-filigrane), var(--m-couleur-papier-survol));
  box-shadow: var(--m-ombre-flottant);
}

.bib-dos {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: var(--dos);
  height: clamp(220px, 30vw, 320px);
  padding: var(--m-espace-3) 0;
  border: 0;
  border-radius: 2px 2px 0 0;
  background: var(--m-couleur-papier-filigrane);
  box-shadow: var(--m-ombre-flottant);
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--m-duree-standard) var(--m-courbe-sortie);
}
.bib-dos:hover,
.bib-dos:focus-visible { transform: translateY(calc(-1 * var(--m-espace-4))); }

.bib-dos-fond { position: absolute; inset: 0; }
.bib-dos-fond img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(0.9); }

/* Le titre sur une bande de papier blanc, de bas en haut (sens français). */
.bib-dos-titre,
.bib-dos-annee {
  position: relative;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  background: var(--m-couleur-papier-fond);
  color: var(--m-couleur-papier-texte);
  padding: var(--m-espace-2) 3px;
  max-height: 72%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bib-dos-titre {
  font-family: var(--m-police-magazine-famille);
  font-size: var(--m-taille-petit);
  letter-spacing: var(--m-police-magazine-approche);
}
.bib-dos-annee {
  font-family: var(--m-police-texte-famille);
  font-size: var(--m-taille-etiquette);
  font-variant-numeric: tabular-nums;
}

```
