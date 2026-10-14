/**
 * Le QR code d'un lien de contribution (PRD §14.2). Module PUR : la matrice
 * vient de `qrcode-generator` (MIT, sans dépendance), le dessin est un SVG.
 *
 * Le QR est un OBJET IMPRIMÉ : modules foncés sur fond clair, dans les deux
 * modes d'affichage (un QR clair sur fond sombre se lit mal sur beaucoup de
 * téléphones). Niveau de correction M : un lien de dépôt fait environ 90
 * caractères, le QR reste lisible à 120 px.
 */

import qrcode from "qrcode-generator";

export function matriceQr(texte: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(texte, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** Le tracé SVG des modules foncés, en unités de module (une marge de 4 modules, la norme). */
export function cheminQr(m: boolean[][]): { d: string; cote: number } {
  const marge = 4;
  const parts: string[] = [];
  m.forEach((ligne, r) => ligne.forEach((sombre, c) => sombre && parts.push(`M${c + marge} ${r + marge}h1v1h-1z`)));
  return { d: parts.join(""), cote: m.length + 2 * marge };
}

/** Le fichier SVG complet, pour « Télécharger le QR code ». */
export function svgQr(texte: string, pixels = 512): string {
  const { d, cote } = cheminQr(matriceQr(texte));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${cote} ${cote}" shape-rendering="crispEdges"><rect width="${cote}" height="${cote}" fill="#ffffff"/><path d="${d}" fill="#050505"/></svg>`;
}
