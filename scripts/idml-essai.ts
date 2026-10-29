/**
 * Essai d'export IDML sur de vraies photos, pour ouverture dans Affinity.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/idml-essai.ts [dossier de JPEG]
 *
 * Lit les JPEG de ~/Desktop/Lisbonne/ (ou du dossier en argument), construit un
 * magazine de 3 planches avec les transitions de magazine.ts, et écrit dans
 * ~/Desktop/Bellajour/test-idml/ trois essais décompressés + leurs zips :
 * liens relatifs, relatifs `file:`, absolus. N'écrit RIEN ailleurs, ne touche ni
 * base, ni réseau, ni tiers.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { unzipSync } from "fflate";
import {
  ajouterDouble, autreDisposition, cadresDe, dispositionDe, ecrireTexte, nouveauMagazine, poser, recadrer, templateParId,
  type Cible, type Magazine, type PhotoRef,
} from "@/lib/mise-en-page/magazine";
import { deplacer, zoomer } from "@/lib/mise-en-page/recadrage";
import { construireIdml, nomsDeLiens, photosUtilisees, type OptionsLiens, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperExport, zipperIdml } from "@/lib/mise-en-page/paquet";
import { orientationDe } from "@/lib/mise-en-page/types";

const SORTIE = "/Users/mathiasdurand/Desktop/Bellajour/test-idml";
const DEFAUT = "/Users/mathiasdurand/Desktop/Lisbonne";

type Fichier = { ref: PhotoRef; chemin: string; orientationExif: number; dateIncertaine: boolean };

async function lire(dossier: string): Promise<Fichier[]> {
  const noms = readdirSync(dossier).filter((n) => !n.startsWith(".") && /\.jpe?g$/i.test(n)).sort();
  const sortie: Fichier[] = [];
  for (const [i, nom] of noms.entries()) {
    const chemin = join(dossier, nom);
    if (!statSync(chemin).isFile()) continue;
    const meta = await sharp(chemin).metadata();
    const o = meta.orientation ?? 1;
    const [l, h] = o >= 5 ? [meta.height ?? 0, meta.width ?? 0] : [meta.width ?? 0, meta.height ?? 0];
    let date: string | null = null;
    try {
      const ex = (await exifr.parse(chemin, ["DateTimeOriginal", "CreateDate"])) as { DateTimeOriginal?: Date; CreateDate?: Date } | undefined;
      const d = ex?.DateTimeOriginal ?? ex?.CreateDate;
      if (d instanceof Date && !Number.isNaN(d.getTime())) date = d.toISOString();
    } catch { /* pas d'EXIF : date du fichier */ }
    const dateIncertaine = date === null;
    if (dateIncertaine) date = statSync(chemin).mtime.toISOString();
    sortie.push({ ref: { id: `ph-${i + 1}`, nom, l, h, date }, chemin, orientationExif: o, dateIncertaine });
  }
  return sortie;
}

async function main() {
  const dossier = process.argv[2] ?? DEFAUT;
  if (!existsSync(dossier)) throw new Error(`Dossier introuvable : ${dossier} (passer un dossier de JPEG en argument)`);
  const fichiers = await lire(dossier);
  if (fichiers.length === 0) throw new Error(`Aucun JPEG dans ${dossier}`);
  const cat = fichiers.map((f) => f.ref);
  const tournees = fichiers.filter((f) => f.orientationExif !== 1);
  const P = cat.filter((p) => orientationDe(p.l, p.h) === "P");
  const L = cat.filter((p) => orientationDe(p.l, p.h) !== "P");
  /* Une photo à orientation EXIF ≠ 1 doit être posée : elle passe en tête de chaque sélection. */
  const avant = (liste: PhotoRef[]): PhotoRef[] => {
    const t = tournees.map((f) => f.ref);
    return [...t, ...liste.filter((p) => !t.includes(p))];
  };
  const prendre = (liste: PhotoRef[], n: number): PhotoRef[] => {
    const base = avant(liste);
    return Array.from({ length: Math.min(n, Math.max(base.length, 0)) }, (_, i) => base[i % base.length]).filter(Boolean);
  };

  let m: Magazine = nouveauMagazine("essai-idml", "Essai IDML", "2026-10-27T00:00:00.000Z");
  /* Planche 0 : une photo (paysage de préférence). */
  m = poser(m, "pl-1", "droite", prendre(L.length ? L : cat, 1)).magazine;
  /* Planche 1 : double, viser DP-01 (3 photos, portraits d'abord). */
  m = ajouterDouble(m);
  const sel1 = prendre([...P, ...L], Math.min(3, cat.length));
  m = poser(m, "pl-2", "double", sel1).magazine;
  for (let k = 0; k < 30 && dispositionDe(m.planches[1], "double")?.templateId !== "DP-01"; k++) m = autreDisposition(m, "pl-2", "double", cat);
  const d1 = dispositionDe(m.planches[1], "double");
  if (!d1) throw new Error("planche 1 vide");
  const cadres1 = cadresDe(d1, "double");
  const photos1 = cadres1.filter((c) => c.role === "photo");
  const iRecadre = d1.photos.findIndex((a) => a.photoId !== null);
  const recadrages: string[] = [];
  if (iRecadre >= 0) {
    const ref = cat.find((p) => p.id === d1.photos[iRecadre].photoId);
    const cadre = photos1[iRecadre];
    if (ref && cadre) {
      const z = zoomer(d1.photos[iRecadre].recadrage, 1.8, ref, cadre);
      const r = deplacer(z, 12, -8, ref, cadre);
      m = recadrer(m, { plancheId: "pl-2", cible: "double", index: iRecadre }, r);
      recadrages.push(`planche 1, cadre photo ${iRecadre + 1} (${ref.nom}) : zoom ${r.zoom}, dx ${r.dx.toFixed(2)} mm, dy ${r.dy.toFixed(2)} mm (demandé 1.8 / +12 / −8, borné par cadrer)`);
    }
  }
  const textes1 = cadres1.filter((c) => c.role !== "photo");
  const iTitre = textes1.findIndex((c) => c.role === "titre");
  if (iTitre >= 0) m = ecrireTexte(m, { plancheId: "pl-2", cible: "double", index: iTitre }, { contenu: "LISBONNE" });
  /* Planche 2 : gauche grille 2, droite grille 3. */
  m = ajouterDouble(m);
  m = poser(m, "pl-3", "gauche", prendre(cat, Math.min(2, cat.length))).magazine;
  m = poser(m, "pl-3", "droite", prendre([...cat].reverse(), Math.min(3, cat.length))).magazine;

  const liens = nomsDeLiens(cat.map((p) => ({ id: p.id, nom: p.nom })));
  const exports = new Map<string, PhotoExport>(cat.map((p) => [p.id, { id: p.id, nomLien: liens.get(p.id) ?? p.nom, l: p.l, h: p.h }]));
  const utilisees = photosUtilisees(m);
  const nonUtilisees = cat.filter((p) => !utilisees.includes(p.id));

  mkdirSync(SORTIE, { recursive: true });
  const essais: [string, (dir: string) => OptionsLiens][] = [
    ["essai-relatif", () => ({ mode: "relatif" })],
    ["essai-relatif-file", () => ({ mode: "relatif-file" })],
    ["essai-absolu", (dir) => ({ mode: "absolu", dossier: dir })],
  ];
  for (const [nom, opt] of essais) {
    const dir = join(SORTIE, nom);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(join(dir, "Links"), { recursive: true });
    const idml = zipperIdml(construireIdml(m, exports, { liens: opt(dir) }));
    const lnk = utilisees.map((id) => {
      const f = fichiers.find((x) => x.ref.id === id);
      if (!f) throw new Error(`photo inconnue ${id}`);
      return { nomLien: exports.get(id)?.nomLien ?? f.ref.nom, octets: new Uint8Array(readFileSync(f.chemin)) };
    });
    const nomsU = utilisees.map((id) => cat.find((p) => p.id === id)?.nom ?? id);
    const nomsN = nonUtilisees.map((p) => p.nom);
    writeFileSync(join(dir, "magazine.idml"), idml);
    for (const l of lnk) writeFileSync(join(dir, "Links", l.nomLien), l.octets);
    writeFileSync(join(dir, "photos-utilisees.txt"), nomsU.length ? `${nomsU.join("\n")}\n` : "");
    writeFileSync(join(dir, "photos-non-utilisees.txt"), nomsN.length ? `${nomsN.join("\n")}\n` : "");
    const zip = zipperExport({ idml, liens: lnk, utilisees: nomsU, nonUtilisees: nomsN });
    writeFileSync(join(SORTIE, `${nom}.zip`), zip);
    const premier = Object.keys(unzipSync(idml))[0];
    console.log(`${nom} : magazine.idml ${idml.length} o (premier fichier : ${premier}, méthode ${idml[8] | (idml[9] << 8)}), ${lnk.length} liens, ${nom}.zip ${zip.length} o`);
  }

  console.log(`\nDossier : ${dossier}`);
  console.log(`Photos (${cat.length}) :`);
  for (const f of fichiers) {
    console.log(`  ${f.ref.id}  ${f.ref.nom}  ${f.ref.l} × ${f.ref.h} px (${orientationDe(f.ref.l, f.ref.h)})  EXIF orientation ${f.orientationExif}  date ${f.ref.date}${f.dateIncertaine ? " (fichier, incertaine)" : ""}`);
  }
  console.log(tournees.length
    ? `ORIENTATION EXIF ≠ 1 : ${tournees.map((f) => `${f.ref.nom} (${f.orientationExif})`).join(", ")} — posée(s) en tête de chaque sélection`
    : "Orientation EXIF : toutes à 1 (aucune photo tournée dans ce dossier)");
  console.log("\nPlanches :");
  m.planches.forEach((p, i) => {
    const parts: [Cible, string][] = i === 0 ? [["droite", "page droite"]] : p.mode === "double" ? [["double", "double"]] : [["gauche", "page gauche"], ["droite", "page droite"]];
    for (const [c, lib] of parts) {
      const d = dispositionDe(p, c);
      if (!d) { console.log(`  planche ${i} ${lib} : vide`); continue; }
      const t = templateParId(d.templateId);
      const ph = d.photos.map((a) => cat.find((x) => x.id === a.photoId)?.nom ?? "—").join(" | ");
      const tx = d.textes.map((x) => x.contenu).join(" | ");
      console.log(`  planche ${i} ${lib} : ${d.templateId} « ${t?.nom ?? "?"} » ; photos : ${ph}${tx ? ` ; textes : ${tx}` : ""}`);
    }
  });
  console.log("\nRecadrages :");
  for (const r of recadrages) console.log(`  ${r}`);
  console.log(`\nUtilisées : ${utilisees.length} ; non utilisées : ${nonUtilisees.length}`);
  console.log(`Sortie : ${SORTIE}`);
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
