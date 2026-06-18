/**
 * Transforme une simple LISTE D'IMAGES DE PAGES (tes .webp déjà composés, dans
 * l'ordre du livre) en DOUBLES-PAGES affichables.
 *
 * Logique demandée :
 *   - page 0  = COUVERTURE seule → affichée à DROITE, rien à gauche.
 *   - ensuite = doubles (gauche/droite) : (1,2) (3,4) (5,6) …
 *   - si le nombre de pages est pair, la dernière double-page a sa page de droite
 *     vide (left rempli, right null). Adapte si tu veux une 4e de couv. seule.
 *
 * Chaque double-page :
 *   { index, left, right, label }
 *   - left / right : URL d'image (string) ou null si page absente.
 *   - label        : libellé court pour le filmstrip ("Couv.", "2–3", "4–5"…).
 */
export function buildSpreads(pages) {
  const list = Array.isArray(pages) ? pages.filter(Boolean) : []
  const spreads = []
  if (list.length === 0) return spreads

  // 1) Couverture seule (page de droite).
  spreads.push({ index: 0, left: null, right: list[0], label: 'Couv.' })

  // 2) Le reste par paires.
  for (let i = 1; i < list.length; i += 2) {
    const left = list[i] ?? null
    const right = list[i + 1] ?? null
    const leftNum = i + 1 // page 1 = couverture → la 1re double commence à la page 2
    const rightNum = i + 2
    const label = right ? `${leftNum}–${rightNum}` : `${leftNum}`
    spreads.push({ index: spreads.length, left, right, label })
  }

  return spreads
}
