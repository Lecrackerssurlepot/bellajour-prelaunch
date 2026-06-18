/**
 * Transforme une simple LISTE D'IMAGES DE PAGES (tes .webp déjà composés, dans
 * l'ordre du livre) en DOUBLES-PAGES affichables.
 *
 * Logique (validée) :
 *   - DOUBLE-PAGE DE COUVERTURE : le livre ouvre sur [4e de couv | 1re de couv],
 *     soit { left: DERNIÈRE image (p39), right: PREMIÈRE image (p01) }.
 *   - INTÉRIEUR : les images list[1] … list[length-2] (p02 … p38) enchaînées en
 *     doubles (gauche/droite), EN EXCLUANT la dernière (p39, déjà consommée par
 *     la couverture). Si le nombre de pages intérieures est impair, la dernière
 *     double a sa page de droite vide (left rempli, right null).
 *   → aucune page n'est dupliquée ni perdue : p01 (couv. droite) + p39 (couv.
 *     gauche) + p02…p38 (intérieur) = toutes les images, une seule fois.
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

  // Repli défensif : une seule image → couverture seule à droite.
  if (list.length === 1) {
    spreads.push({ index: 0, left: null, right: list[0], label: 'Couv.' })
    return spreads
  }

  const lastIdx = list.length - 1

  // 1) Double-page de COUVERTURE : 4e de couv (dernière image) à GAUCHE,
  //    1re de couv (illustration, list[0]) à DROITE.
  spreads.push({ index: 0, left: list[lastIdx], right: list[0], label: 'Couv.' })

  // 2) Intérieur : list[1] … list[length-2] par paires (exclut la dernière image).
  for (let i = 1; i < lastIdx; i += 2) {
    const left = list[i] ?? null
    // n'inclut JAMAIS l'indice du dos (lastIdx) à droite.
    const right = i + 1 < lastIdx ? (list[i + 1] ?? null) : null
    const leftNum = i + 1 // p01 = couverture → l'intérieur commence à la page 2
    const rightNum = i + 2
    const label = right ? `${leftNum}–${rightNum}` : `${leftNum}`
    spreads.push({ index: spreads.length, left, right, label })
  }

  return spreads
}
