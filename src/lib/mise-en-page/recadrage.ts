/**
 * LE calcul de recadrage (brief §4) : une photo dans son cadre. Il est unique et
 * partagé : l'écran le lit pour dessiner, l'export IDML le lit pour écrire le
 * cadre Affinity. Deux calculs, c'est la garantie que l'un ment.
 *
 * Règle : remplissage (l'image couvre TOUT le cadre, jamais de blanc), zoom
 * borné à [1, 8] au-dessus du remplissage, décalage borné pour que le bord de
 * l'image ne rentre jamais dans le cadre. Tout en mm, sauf la photo en px.
 */

export type Recadrage = {
  /** 1 = remplissage exact ; 2 = deux fois plus serré. */
  zoom: number;
  /** Décalage du centre de l'image par rapport au centre du cadre, en mm. */
  dx: number;
  dy: number;
};

export const RECADRAGE_NEUTRE: Recadrage = { zoom: 1, dx: 0, dy: 0 };
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 8;

export type Cadrage = {
  zoom: number;
  dx: number;
  dy: number;
  /** mm par pixel de la photo une fois posée. */
  echelle: number;
  /** Coin haut gauche de l'image, relatif au coin haut gauche du cadre (mm, ≤ 0). */
  x: number;
  y: number;
  /** Taille de l'image posée (mm, ≥ celle du cadre). */
  l: number;
  h: number;
};

const borne = (v: number, min: number, max: number): number => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : 0);
/** Une mesure absurde (0, négative, NaN) vaut 1 : on ne divise jamais par zéro. */
const sur = (v: number): number => (Number.isFinite(v) && v > 0 ? v : 1);

export function cadrer(photoPx: { l: number; h: number }, cadreMm: { l: number; h: number }, r: Recadrage): Cadrage {
  const pl = sur(photoPx.l);
  const ph = sur(photoPx.h);
  const cl = sur(cadreMm.l);
  const ch = sur(cadreMm.h);
  const zoom = Number.isFinite(r.zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, r.zoom)) : ZOOM_MIN;
  const echelle = Math.max(cl / pl, ch / ph) * zoom;
  /* Le max() garantit l'inégalité exacte malgré l'arrondi flottant : l ≥ cl, h ≥ ch. */
  const l = Math.max(pl * echelle, cl);
  const h = Math.max(ph * echelle, ch);
  const mx = (l - cl) / 2;
  const my = (h - ch) / 2;
  const dx = borne(r.dx, -mx, mx);
  const dy = borne(r.dy, -my, my);
  return { zoom, dx, dy, echelle, x: (cl - l) / 2 + dx, y: (ch - h) / 2 + dy, l, h };
}

/** Déplacer l'image de (ddx, ddy) mm : le résultat est borné. */
export function deplacer(r: Recadrage, ddxMm: number, ddyMm: number, photoPx: { l: number; h: number }, cadreMm: { l: number; h: number }): Recadrage {
  const c = cadrer(photoPx, cadreMm, { zoom: r.zoom, dx: r.dx + (Number.isFinite(ddxMm) ? ddxMm : 0), dy: r.dy + (Number.isFinite(ddyMm) ? ddyMm : 0) });
  return { zoom: c.zoom, dx: c.dx, dy: c.dy };
}

/** Changer le zoom : le décalage est reborné (dézoomer peut le rendre trop grand). */
export function zoomer(r: Recadrage, zoom: number, photoPx: { l: number; h: number }, cadreMm: { l: number; h: number }): Recadrage {
  const c = cadrer(photoPx, cadreMm, { zoom, dx: r.dx, dy: r.dy });
  return { zoom: c.zoom, dx: c.dx, dy: c.dy };
}
