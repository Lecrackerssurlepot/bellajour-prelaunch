/* Souris ou doigt, décidé au pointeur et non à la largeur d'écran.
   (pointer: fine) = une souris ou un trackpad ; au téléphone, faux.
   Côté serveur (pas de window), on répond « doigt » : le plus prudent
   (pas de clavier qui s'ouvre, Entrée ne fait pas d'envoi par surprise). */

export function pointeurFin(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia("(pointer: fine)").matches
}

/* Pour un `autoFocus` : n'ouvre le clavier que si l'on a un clavier physique. */
export function focusSiClavierPhysique(el: HTMLElement | null | undefined): void {
  if (el && pointeurFin()) el.focus()
}
