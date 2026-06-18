/**
 * <img> robuste : si l'URL d'une page est morte, bascule sur un repli DÉTERMINISTE
 * (picsum, seedé) pour qu'une page ne soit JAMAIS un trou crème.
 *
 * COPIÉ du proto (Img.jsx), enrichi d'un drapeau `eager` :
 *   - eager=false (défaut) → loading="lazy" : l'image ne se charge qu'à l'approche
 *     (vignettes du filmstrip, pages hors écran).
 *   - eager=true → loading="eager" + fetchpriority="high" : couverture + 1re page,
 *     chargées en priorité pour ne pas plomber le LCP de /preventes (ÉTAPE 4).
 */
export default function Img({ src, alt = '', seed = 'fb', className, draggable = false, eager = false }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      draggable={draggable}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onError={(e) => {
        const el = e.currentTarget
        if (el.dataset.fallback) return // évite toute boucle
        el.dataset.fallback = '1'
        el.src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/800/1000`
      }}
    />
  )
}
