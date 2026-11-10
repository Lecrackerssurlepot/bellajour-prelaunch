/**
 * Calibrer la lecture sur de VRAIES photos (10/11, après le test de Mathias) : les mêmes mesures que le navigateur
 * (vignette de 256 px en gris : netteté, empreinte, lumière, aplats ; EXIF : date, appareil), les mêmes règles
 * (`lireMesures`, `tagsDeLecture`), sur un dossier de photos du disque. Ni base, ni réseau, rien n'est écrit ailleurs
 * que dans le dossier de sortie (planches contact JPEG + rapport texte). Les visages ne sont pas mesurés ici
 * (le détecteur ne tourne que dans le navigateur).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/calibrer-lecture.ts <dossier> <sortie> [--max 300]
 */

import { readdirSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import * as O from "@/lib/mise-en-page/editeur";

const [dossier, sortie] = process.argv.slice(2);
const max = Number(process.argv[process.argv.indexOf("--max") + 1]) || 300;
if (!dossier || !sortie) { console.error("usage : calibrer-lecture.ts <dossier> <sortie> [--max N]"); process.exit(1); }
mkdirSync(sortie, { recursive: true });

const fichiers = readdirSync(dossier).filter((f) => /\.(jpe?g|png|heic)$/i.test(f) && !f.startsWith(".")).sort().slice(0, max);
const deux = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}:${deux(d.getSeconds())}`;

type Lu = { id: string; chemin: string; photo: O.PhotoMaq; mesure: O.Mesure };

async function lire(f: string): Promise<Lu | null> {
  const chemin = join(dossier, f);
  try {
    const ex = (await exifr.parse(chemin, ["DateTimeOriginal", "CreateDate", "Make", "Model"]).catch(() => null)) as { DateTimeOriginal?: Date; CreateDate?: Date; Make?: string; Model?: string } | null;
    const d = ex?.DateTimeOriginal ?? ex?.CreateDate;
    const date = d instanceof Date && !Number.isNaN(d.getTime()) ? iso(d) : iso(statSync(chemin).mtime); /* comme la création libre */
    const appareil = [ex?.Make, ex?.Model].filter(Boolean).join(" ").trim() || null;
    const img = sharp(chemin, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    const { data, info } = await img.clone().resize(256, 256, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const l = info.width, h = info.height;
    const gris = new Uint8Array(l * h);
    const rgba = new Uint8Array(l * h * 4);
    for (let i = 0, j = 0; j < l * h; i += 3, j++) {
      gris[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      rgba[j * 4] = data[i]; rgba[j * 4 + 1] = data[i + 1]; rgba[j * 4 + 2] = data[i + 2]; rgba[j * 4 + 3] = 255;
    }
    const base = O.mesurerGris(gris, l, h);
    let somme = 0, noirs = 0, blancs = 0;
    for (const v of gris) { somme += v; if (v < 8) noirs++; else if (v > 247) blancs++; }
    const comptes = new Map<number, number>();
    for (let i = 0; i < rgba.length; i += 4) { const k = ((rgba[i] >> 4) << 8) | ((rgba[i + 1] >> 4) << 4) | (rgba[i + 2] >> 4); comptes.set(k, (comptes.get(k) ?? 0) + 1); }
    const top = [...comptes.values()].sort((a, b) => b - a).slice(0, 3).reduce((x, y) => x + y, 0);
    const carte = O.carteSaillance(gris, l, h);
    const mesure: O.Mesure = {
      ...base, lumi: { moyenne: Math.round(somme / gris.length), noirs: noirs / gris.length, blancs: blancs / gris.length },
      aplats: Math.round((top / (l * h)) * 100) / 100, palette: O.paletteDePixels(rgba, 8), zone: O.zoneImportante([], carte), chaleur: O.chaleurCompacte(carte),
    };
    const ow = meta.autoOrient?.width ?? meta.width ?? l, oh = meta.autoOrient?.height ?? meta.height ?? h;
    const photo: O.PhotoMaq = { id: f, nom: f, l: ow, h: oh, date, appareil, personne: "Essai", lien: null, type: "atelier", coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null };
    return { id: f, chemin, photo, mesure };
  } catch (e) { console.warn("illisible", f, (e as Error).message); return null; }
}

async function planche(titre: string, ids: string[], lus: Map<string, Lu>, fichier: string, legende?: (id: string) => string): Promise<void> {
  if (!ids.length) return;
  const T = 180, col = Math.min(8, ids.length), rangs = Math.ceil(ids.length / col);
  const tuiles = await Promise.all(ids.map(async (id, k) => {
    const buf = await sharp(lus.get(id)!.chemin, { failOn: "none" }).rotate().resize(T, T, { fit: "cover" }).jpeg().toBuffer();
    const txt = (legende ? legende(id) : id).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const svg = Buffer.from(`<svg width="${T}" height="22"><rect width="${T}" height="22" fill="black" fill-opacity="0.7"/><text x="4" y="15" font-size="12" fill="white" font-family="sans-serif">${txt}</text></svg>`);
    return [{ input: buf, left: (k % col) * T, top: Math.floor(k / col) * (T + 4) }, { input: svg, left: (k % col) * T, top: Math.floor(k / col) * (T + 4) + T - 22 }];
  }));
  await sharp({ create: { width: col * T, height: rangs * (T + 4), channels: 3, background: "#222" } }).composite(tuiles.flat()).jpeg({ quality: 70 }).toFile(join(sortie, fichier));
  console.log(`  planche « ${titre} » : ${join(sortie, fichier)}`);
}

async function main(): Promise<void> {
  console.log(`${fichiers.length} fichiers dans ${dossier}`);
  const lus = new Map<string, Lu>();
  let k = 0;
  const ouvrier = async () => { while (k < fichiers.length) { const f = fichiers[k++]; const r = await lire(f); if (r) lus.set(r.id, r); } };
  await Promise.all(Array.from({ length: 6 }, ouvrier));
  const cat = new Map([...lus.values()].map((x) => [x.id, x.photo]));
  const lecture = O.lireMesures(cat, new Map([...lus.values()].map((x) => [x.id, x.mesure])));
  const tags = O.tagsDeLecture(cat, lecture);
  const n = O.comptesTags(tags);
  const net = [...lus.values()].map((x) => x.mesure.nettete).sort((a, b) => a - b);
  const q = (p: number) => Math.round(net[Math.floor(p * (net.length - 1))]);
  /* l'écart à la plus ressemblante, pour voir où tombent doublons et similaires */
  const ids = [...lus.keys()];
  const proches = ids.map((id) => { let b = 64; for (const j of ids) if (j !== id) b = Math.min(b, O.distanceHash(lus.get(id)!.mesure.dhash, lus.get(j)!.mesure.dhash)); return b; }).sort((a, b) => a - b);
  const hist = (l: number[], bornes: number[]) => bornes.map((b, i) => `${i ? bornes[i - 1] + 1 : 0}-${b}: ${l.filter((x) => x <= b && (i === 0 || x > bornes[i - 1])).length}`).join("  ");
  const rapport = [
    `Lecture de ${lus.size} photos (${dossier})`,
    `Netteté : min ${q(0)} · 10 % ${q(0.1)} · médiane ${q(0.5)} · 90 % ${q(0.9)} · max ${q(1)} · seuil floue ${Math.max(O.REGLAGES.flou_absolu.valeur, O.REGLAGES.flou_relatif.valeur * q(0.5))}`,
    `Écart à la plus ressemblante (sur 64) : ${hist(proches, [4, 8, 12, 18, 24, 32, 64])}`,
    `Piles : ${lecture.piles.length} (${lecture.piles.filter((p) => p.raison === "rafale").length} rafales), ${O.photosEnMoins(lecture)} photos rangées dessous`,
    `Similaires : ${(lecture.similaires ?? []).length} groupes, ${(lecture.similaires ?? []).flat().length} photos`,
    `Tags : ${O.TAGS.map((t) => `${O.MOT_TAG[t].mot} ${n[t]}`).join(" · ")}`,
    `Sans appareil dans l'EXIF : ${[...lus.values()].filter((x) => x.photo.appareil === null).length}`,
  ].join("\n");
  console.log(rapport);
  writeFileSync(join(sortie, "rapport.txt"), rapport + "\n");
  const avec = (t: O.Tag) => [...tags].filter(([, l]) => l.includes(t)).map(([id]) => id);
  await planche("Floues", avec("floue").slice(0, 32), lus, "floues.jpg", (id) => `${id} · ${Math.round(lus.get(id)!.mesure.nettete)}`);
  await planche("Captures", avec("capture").slice(0, 32), lus, "captures.jpg", (id) => `${id} · aplats ${Math.round((lus.get(id)!.mesure.aplats ?? 0) * 100)}`);
  await planche("Sombres", [...avec("sombre"), ...avec("brulee")].slice(0, 32), lus, "lumiere.jpg");
  await planche("Piles", lecture.piles.slice(0, 8).flatMap((p) => [p.tete, ...p.autres].slice(0, 4)), lus, "piles.jpg", (id) => `${id}`);
  await planche("Similaires", (lecture.similaires ?? []).slice(0, 8).flatMap((g) => g.slice(0, 4)), lus, "similaires.jpg");
  /* les plus nettes et les moins nettes, pour juger le seuil à l'œil */
  const triees = [...lus.values()].sort((a, b) => a.mesure.nettete - b.mesure.nettete);
  await planche("Les 16 moins nettes", triees.slice(0, 16).map((x) => x.id), lus, "moins-nettes.jpg", (id) => `${Math.round(lus.get(id)!.mesure.nettete)}`);
  void basename; void extname;
}

main().catch((e) => { console.error(e); process.exit(1); });
