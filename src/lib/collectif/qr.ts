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

/** Le nom du fichier d'un QR téléchargé : « Équipe Lyon » → `qr-equipe-lyon.svg`. */
export function nomFichierQr(libelle: string): string {
  const mots = libelle.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `qr-${mots || "lien"}.svg`;
}

const echappe = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * La page qu'on imprime ou qu'on projette (T-197) : le NOM du lien en grand, le
 * QR code dessous, une consigne et le détail (le nombre de photos, la clôture).
 * Une feuille A4 à elle seule, SANS le reste de l'écran : on l'imprime depuis un
 * cadre caché (`imprimer.ts`), jamais en imprimant la page de l'espace. Un objet
 * imprimé : fond blanc, modules foncés, quel que soit le mode d'affichage.
 * Tout texte venu d'un nom de lien est échappé.
 */
export function pageQrImprimable(p: { nom: string; url: string; consigne: string; details?: string }): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${echappe(`QR code ${p.nom}`)}</title><style>
@page{size:A4 portrait;margin:18mm}
html,body{margin:0;background:#ffffff;color:#050505;font-family:Helvetica,Arial,sans-serif}
main{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9mm;min-height:240mm;text-align:center}
svg{width:150mm;height:150mm}
h1{margin:0;font-size:36pt;line-height:1.1;font-weight:700;overflow-wrap:anywhere}
p{margin:0;font-size:15pt;line-height:1.35;color:#3a3a3a}
.d{font-size:12pt;color:#666666}
</style></head><body><main>${svgQr(p.url)}<h1>${echappe(p.nom)}</h1><p>${echappe(p.consigne)}</p>${p.details ? `<p class="d">${echappe(p.details)}</p>` : ""}</main></body></html>`;
}
