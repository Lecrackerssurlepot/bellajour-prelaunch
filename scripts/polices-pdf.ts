/**
 * Les polices du PDF (lot C, 12/11) : écrit, dans `public/polices/`, le TrueType de chaque fichier WOFF des paquets npm
 * `@fontsource/<famille>` (sous-ensemble latin) que le catalogue de `style.ts` met en jeu, UNE FOIS par famille et par graisse
 * (`woffVersTtf` : aucun glyphe touché, voir son correctif).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/polices-pdf.ts
 *
 * Pourquoi une copie : le PDF s'écrit dans le NAVIGATEUR (pdf-lib + @pdf-lib/fontkit), qui lit les octets de chaque police à
 * l'adresse `/polices/<famille>-<graisse>.ttf` ; le dossier est servi tel quel par Next (comme `public/mediapipe/`). Le
 * harnais (`verif-mep-style.ts`) compare chaque copie, octet pour octet, au paquet, et relit le nom PostScript de chaque
 * fichier : une copie périmée ou un catalogue qui change sans la copie fait échouer le harnais.
 *
 * Aucun fichier de `assets/typo/` : ces polices-là ont des licences qui interdisent de les redistribuer, et servir une police
 * EST la redistribuer. Les paquets `@fontsource` portent des polices Google Fonts sous licence ouverte (OFL ou Apache 2.0).
 * N'écrit rien d'autre : ni base, ni réseau.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unzlibSync } from "fflate";
import fontkit from "@pdf-lib/fontkit";
import { POLICES, nomFichierPolice } from "@/lib/mise-en-page/style";

/**
 * Un WOFF de `@fontsource` → le TrueType qu'il contient, avec UN correctif : la table `glyf` reçoit 16 octets de zéros à la
 * fin. `@pdf-lib/fontkit` (1.1.1) lit l'en-tête de chaque glyphe, même vide, à son décalage ; quand l'espace est le DERNIER
 * glyphe de la table (IBM Plex Mono), cette lecture dépasse la table et l'embarquement échoue (« Trying to access beyond
 * buffer length »). Les zéros ajoutés ne sont lus que par ce cas : aucun glyphe n'est touché. Déterministe : le même WOFF donne
 * toujours les mêmes octets (le harnais refait la conversion et compare).
 */
export const REMBOURRAGE_GLYF = 16;
export function woffVersTtf(woff: Uint8Array): Uint8Array {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (v.getUint32(0) !== 0x774f4646) throw new Error("Ce n'est pas un WOFF");
  const flavor = v.getUint32(4), n = v.getUint16(12);
  const tables: { tag: string; data: Uint8Array }[] = [];
  for (let i = 0; i < n; i++) {
    const e = 44 + i * 20;
    const tag = String.fromCharCode(woff[e], woff[e + 1], woff[e + 2], woff[e + 3]);
    const off = v.getUint32(e + 4), comp = v.getUint32(e + 8), orig = v.getUint32(e + 12);
    const brut = woff.subarray(off, off + comp);
    let data = comp < orig ? unzlibSync(brut) : brut.slice();
    if (tag === "glyf") { const g = new Uint8Array(data.length + REMBOURRAGE_GLYF); g.set(data); data = g; }
    tables.push({ tag, data });
  }
  tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
  const somme = (d: Uint8Array): number => { let s = 0; for (let i = 0; i < d.length; i += 4) s = (s + (((d[i] << 24) | ((d[i + 1] ?? 0) << 16) | ((d[i + 2] ?? 0) << 8) | (d[i + 3] ?? 0)) >>> 0)) >>> 0; return s; };
  const tete = 12 + 16 * n;
  let taille = tete;
  const places = tables.map((t) => { const o = taille; taille += (t.data.length + 3) & ~3; return o; });
  const out = new Uint8Array(taille);
  const o = new DataView(out.buffer);
  const puissance = 2 ** Math.floor(Math.log2(n));
  o.setUint32(0, flavor); o.setUint16(4, n); o.setUint16(6, puissance * 16); o.setUint16(8, Math.log2(puissance)); o.setUint16(10, n * 16 - puissance * 16);
  const iHead = tables.findIndex((t) => t.tag === "head");
  tables.forEach((t, i) => {
    out.set(t.data, places[i]);
    if (t.tag === "head") o.setUint32(places[i] + 8, 0);
  });
  tables.forEach((t, i) => {
    const e = 12 + i * 16;
    for (let k = 0; k < 4; k++) out[e + k] = t.tag.charCodeAt(k);
    o.setUint32(e + 4, somme(out.subarray(places[i], places[i] + ((t.data.length + 3) & ~3))));
    o.setUint32(e + 8, places[i]); o.setUint32(e + 12, t.data.length);
  });
  if (iHead >= 0) o.setUint32(places[iHead] + 8, (0xb1b0afba - somme(out)) >>> 0);
  return out;
}

/**
 * Les caractères dont on garde la CHASSE (largeur d'avance, en millièmes de cadratin) : le latin de base, le latin-1, œ Œ, les tirets,
 * les apostrophes, les guillemets anglais, l'ellipse et l'euro. Au-delà, le corps d'un mot-titre compte large (jamais un débordement).
 */
export const PLAGES_CHASSES: readonly (readonly [number, number])[] = [[0x20, 0x7e], [0xa0, 0xff], [0x152, 0x153], [0x2013, 0x2014], [0x2018, 0x2019], [0x201c, 0x201d], [0x2026, 0x2026], [0x20ac, 0x20ac]];
export const codesChasses = (): number[] => PLAGES_CHASSES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i));

/** Les chasses d'un fichier de police (hors crénage), dans l'ordre de `codesChasses()`. Un caractère absent de la police vaut 0 : il compte large à l'usage. */
export function chassesDuFichier(octets: Uint8Array): number[] {
  const f = fontkit.create(Buffer.from(octets)) as unknown as { unitsPerEm: number; hasGlyphForCodePoint(c: number): boolean; glyphForCodePoint(c: number): { advanceWidth: number } };
  return codesChasses().map((c) => (f.hasGlyphForCodePoint(c) ? Math.round((f.glyphForCodePoint(c).advanceWidth * 1000) / f.unitsPerEm) : 0));
}

/** Le module généré `chassesPolices.ts` : une ligne par famille et graisse. */
export const FICHIER_CHASSES = "src/lib/mise-en-page/chassesPolices.ts";
export function sourceChasses(parCle: ReadonlyMap<string, number[]>): string {
  const lignes = [...parCle.entries()].map(([k, v]) => `  "${k}": [${v.join(",")}],`).join("\n");
  return `/**
 * GÉNÉRÉ par \`scripts/polices-pdf.ts\` : ne pas éditer. Les chasses (largeurs d'avance, millièmes de cadratin, crénage non compris) des
 * ${parCle.size} polices du catalogue de style.ts, pour les caractères de \`PLAGES\`. Le corps du mot-titre de la couverture se calcule
 * dessus (couverture.ts) : une chasse à 0 = le caractère manque à la police. Le harnais refait ce calcul sur les fichiers et compare.
 */

export const PLAGES: readonly (readonly [number, number])[] = ${JSON.stringify(PLAGES_CHASSES)};

export const CHASSES_POLICES: Readonly<Record<string, readonly number[]>> = {
${lignes}
};
`;
}

export const DOSSIER_SOURCE = "node_modules/@fontsource";
export const DOSSIER_COPIE = "public/polices";
/** Le fichier d'un paquet pour une graisse (WOFF, latin : toutes les lettres du français, « œ » compris). */
export const fichierDuPaquet = (id: string, graisse: number): string => join(DOSSIER_SOURCE, id, "files", `${id}-latin-${graisse}-normal.woff`);

function licenceDe(id: string): { type: string; droit: string } {
  const t = readFileSync(join(DOSSIER_SOURCE, id, "LICENSE"), "utf8");
  const type = /SIL Open Font License/i.test(t) ? "SIL Open Font License 1.1" : /Apache License/i.test(t) ? "Apache License 2.0" : "voir le paquet";
  const droit = (t.split("\n").find((l) => /^Copyright/i.test(l.trim())) ?? "").trim().replace(/\s+\S+\.(ttf|otf):.*$/i, "").slice(0, 180);
  return { type, droit };
}

function main(): void {
  mkdirSync(DOSSIER_COPIE, { recursive: true });
  const lignes: string[] = [];
  const chasses = new Map<string, number[]>();
  let n = 0;
  for (const p of POLICES) {
    const l = licenceDe(p.id);
    lignes.push(`- ${p.famille} : ${l.type}. ${l.droit}`);
    for (const g of Object.keys(p.graisses).map(Number)) {
      const src = fichierDuPaquet(p.id, g);
      if (!existsSync(src)) throw new Error(`Fichier absent du paquet : ${src}`);
      const ttf = woffVersTtf(new Uint8Array(readFileSync(src)));
      writeFileSync(join(DOSSIER_COPIE, nomFichierPolice(p.id, g)), ttf);
      chasses.set(`${p.id}-${g}`, chassesDuFichier(ttf));
      n += 1;
    }
  }
  writeFileSync(join(DOSSIER_COPIE, "LICENCES.md"), [
    "# Les polices du PDF de l'éditeur de mise en page",
    "",
    "Copiées des paquets npm `@fontsource/<famille>` (sous-ensemble latin) par `scripts/polices-pdf.ts`. Polices Google Fonts, licences ouvertes :",
    "elles se redistribuent avec leur licence (le texte complet est dans chaque paquet, `node_modules/@fontsource/<famille>/LICENSE`).",
    "",
    ...lignes,
    "",
  ].join("\n"));
  writeFileSync(FICHIER_CHASSES, sourceChasses(chasses));
  console.log(`${n} fichiers de police copiés dans ${DOSSIER_COPIE}/ (${POLICES.length} familles).`);
}

if (process.argv[1] && /polices-pdf\.ts$/.test(process.argv[1])) main();
