/**
 * Essai Affinity du LOT SIGNATURES (16/11, D28 suite) : sur de vraies photos, deux IDML à relire dans Affinity valeur par valeur.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/idml-essai-signatures.ts <dossier de JPEG> <dossier de sortie>
 *
 * Lit les douze premiers JPEG du dossier (lecture seule ; leur date est celle du fichier, comme l'éditeur sans EXIF), compose un magazine
 * sous le style T-01 avec trois signatures, et l'exporte comme l'éditeur (`avecLieuxParDefaut`, puis `construireIdml`) :
 *   - « Les tirages jetés » (SG-09) : cinq photos à bord blanc, tournées, chacune avec l'OMBRE DOUCE (la nouveauté d'export : l'élément
 *     `DropShadowSetting` de l'essai du 29/10 « photo avec ombre portée (cadre) », sur un cadre qui porte AUSSI un contour et une rotation) ;
 *     le fond proposé (accent) sur toute la double ;
 *   - « Le chiffre du jour » (SG-01) : le jour en chiffre GÉANT (corps calculé, seul `PointSize` change) et la ligne de repère (un fait) ;
 *   - « La planche du jour » (SG-03) : dix photos, l'heure sous chaque vignette (des faits).
 * Le même magazine sans style est écrit à côté (Arial : le géant mesuré sur Arial Bold).
 *
 * Écrit dans le dossier de sortie, et NULLE PART ailleurs (ni le Bureau, ni la base, ni le réseau) : `magazine-style.idml`,
 * `magazine-sans-style.idml`, `Links/` (copie des photos) et `attendu.json` (pour chaque tirage : position, rotation, contour, ombre
 * attendue ; pour chaque texte : contenu et corps). Affinity n'ouvre bien que ce qui est sur le Bureau : c'est au chef de projet, avec
 * l'accord de Mathias, de choisir la sortie (par exemple `~/Desktop/Bellajour/test-idml/signatures`) ; ce script ne la choisit jamais.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import * as O from "@/lib/mise-en-page/editeur";
import { cadresDe, nouveauMagazine, templateParId, type Magazine, type PhotoRef, type Planche } from "@/lib/mise-en-page/magazine";
import { construireIdml, nomsDeLiens, ombreXml, type FichierIdml, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperIdml } from "@/lib/mise-en-page/paquet";
import { styleDePaire } from "@/lib/mise-en-page/style";
import { OMBRE_DOUCE } from "@/lib/mise-en-page/signatures";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";

const deux = (n: number): string => String(n).padStart(2, "0");
const isoLocal = (d: Date): string => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}:${deux(d.getSeconds())}`;
const lire = (f: FichierIdml[], prefixe: string): string => f.filter((x) => x.chemin.startsWith(prefixe)).map((x) => x.contenu).join("\n");

async function main(): Promise<void> {
  const [source, sortie] = process.argv.slice(2);
  if (!source || !sortie || !existsSync(source)) throw new Error("usage : idml-essai-signatures.ts <dossier de JPEG> <dossier de sortie>");
  const noms = readdirSync(source).filter((n) => /\.jpe?g$/i.test(n)).sort().slice(0, 12);
  if (noms.length < 12) throw new Error("il faut douze JPEG dans le dossier");
  const photos: PhotoRef[] = [];
  for (const nom of noms) {
    const m = await sharp(join(source, nom)).metadata();
    const o = m.orientation ?? 1;
    const [l, h] = o >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];
    photos.push({ id: nom, nom, l, h, date: isoLocal(statSync(join(source, nom)).mtime) });
  }
  const cat = new Map(photos.map((p) => [p.id, p]));
  const style = styleDePaire("T-01")!;
  const lib = { titre: "Titre", texte: "Texte", legende: "Légende" } as const;
  const double = (id: string, tpl: string, ids: string[], fond?: Planche["fond"]): Planche => {
    const t = templateParId(tpl)!;
    return {
      id, mode: "double", gauche: null, droite: null, ...(fond ? { fond } : {}),
      double: {
        templateId: t.id, photos: ids.slice(0, t.nbPhotos).map((p) => ({ photoId: p, recadrage: { zoom: 1, dx: 0, dy: 0 } })),
        textes: t.cadres.filter((c) => c.role !== "photo").map((c) => ({ contenu: lib[c.role as keyof typeof lib], taille: c.taille ?? 10, gras: c.gras ?? false })),
      },
    };
  };
  const base = nouveauMagazine("essai-signatures", "Essai signatures", "2026-11-16T00:00:00.000Z");
  const m: Magazine = {
    ...base, style,
    planches: [base.planches[0], double("pl-2", "SG-09", noms.slice(0, 5), { gauche: "accent", droite: "accent" }), double("pl-3", "SG-01", noms.slice(5, 6)), double("pl-4", "SG-03", noms.slice(2, 12)), base.planches[1]],
  };
  if (!contenuValide(m)) throw new Error("le magazine d'essai ne se relit pas (contenuValide)");

  const liens = nomsDeLiens(photos.map((p) => ({ id: p.id, nom: p.nom })));
  const exp = new Map<string, PhotoExport>(photos.map((p) => [p.id, { id: p.id, nomLien: liens.get(p.id) ?? p.nom, l: p.l, h: p.h }]));
  mkdirSync(join(sortie, "Links"), { recursive: true });
  for (const p of photos) copyFileSync(join(source, p.nom), join(sortie, "Links", liens.get(p.id) ?? p.nom));
  const options = { liens: { mode: "absolu" as const, dossier: sortie } };
  const pret = O.avecLieuxParDefaut(m, cat);
  const avecStyle = construireIdml(pret, exp, options);
  const pretSans = O.avecLieuxParDefaut({ ...m, style: undefined } as Magazine, cat);
  const sansStyle = construireIdml(pretSans, exp, options);
  writeFileSync(join(sortie, "magazine-style.idml"), zipperIdml(avecStyle));
  writeFileSync(join(sortie, "magazine-sans-style.idml"), zipperIdml(sansStyle));

  /* ce qu'Affinity doit montrer, valeur par valeur */
  const tirages = cadresDe(pret.planches[1].double!, "double").filter((c) => c.role === "photo").map((c, i) => ({
    photo: noms[i], mm: { x: c.x, y: c.y, l: c.l, h: c.h }, rotation: c.rotation ?? 0, contour: c.bord ?? 0, ombre: ombreXml(c),
  }));
  const textes = (mag: Magazine) => mag.planches.slice(1, -1).flatMap((p) => {
    const cs = cadresDe(p.double!, "double").filter((c) => c.role !== "photo");
    return p.double!.textes.map((t, i) => ({ planche: p.id, gabarit: p.double!.templateId, role: cs[i]?.role, geant: !!cs[i]?.geant, fait: cs[i]?.fait ?? null, contenu: t.contenu, corps: t.taille }))
      .filter((t) => t.contenu.trim() !== "");
  });
  const nbOmbres = (lire(avecStyle, "Spreads/").match(/<DropShadowSetting /g) ?? []).length;
  writeFileSync(join(sortie, "attendu.json"), JSON.stringify({
    pages: O.pagesDe(m), paire: "T-01", ombreDouce: { ...OMBRE_DOUCE, enPoints: { flou: OMBRE_DOUCE.flou * 72 / 25.4, dx: OMBRE_DOUCE.dx * 72 / 25.4, dy: OMBRE_DOUCE.dy * 72 / 25.4 } },
    ombresEcrites: nbOmbres, tirages, textesStyle: textes(pret), textesSansStyle: textes(pretSans),
    aVerifier: [
      "planche 2 (SG-09) : cinq tirages, chacun avec son contour blanc INTÉRIEUR, sa rotation, ET une ombre portée relue : mode Produit, 35 %, flou 14,17 pt, décalage 0 / 5,67 pt, noire",
      "l'ombre passe SOUS le tirage et AU-DESSUS du fond jaune ; les tirages se chevauchent dans l'ordre des calques (le grand d'abord)",
      "aucune image étirée (rapport du cadre de l'image = rapport des pixels)",
      "planche 3 (SG-01) : le jour en chiffre géant, au corps de `textesStyle` (seul PointSize change), sur une ligne, sans débordement ; la ligne de repère en capitales",
      "planche 4 (SG-03) : l'heure sous chacune des neuf vignettes, la date et l'heure sous le titre",
      "sans style : les mêmes objets, Arial, le géant au corps de `textesSansStyle`",
    ],
  }, null, 2));
  console.log(`${O.pagesDe(m)} pages, ${nbOmbres} ombres, deux IDML écrits dans ${sortie}`);
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
