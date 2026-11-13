/**
 * Essai Affinity de la DERNIÈRE PAGE (lot E, 13/11, D28) : un IDML de quatre pages (la première, une double, la dernière page seule à
 * gauche, avec deux photos et un texte) sur de vraies photos.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/idml-essai-derniere.ts <dossier de JPEG> <dossier de sortie>
 *
 * Lit les six premiers JPEG du dossier (nommés `001.jpg`… ou n'importe lesquels : lecture seule), pose la première sur la page 1, les
 * trois suivantes sur la double, les deux dernières sur la dernière page, écrit « Fin » en titre de celle-ci, puis écrit dans le
 * dossier de sortie `magazine.idml` (liens ABSOLUS vers `Links/`, copie des photos) et `attendu.json` (pages, cadres de la dernière
 * page en mm) pour relire Affinity valeur par valeur : 4 pages, le dernier spread d'UNE page, GAUCHE (x < 0 dans le repère du spread,
 * le pli à sa droite), les deux cadres photo à leurs places, le texte lisible. N'écrit RIEN ailleurs ; ni base, ni réseau, ni tiers.
 * Affinity ne lit que le Bureau : choisir `~/Desktop/Bellajour/test-idml/derniere-lot-e` comme sortie.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import * as O from "@/lib/mise-en-page/editeur";
import { cadresDe, nouveauMagazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { construireIdml, nomsDeLiens, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperIdml } from "@/lib/mise-en-page/paquet";

async function main(): Promise<void> {
  const [source, sortie] = process.argv.slice(2);
  if (!source || !sortie || !existsSync(source)) throw new Error("usage : idml-essai-derniere.ts <dossier de JPEG> <dossier de sortie>");
  const noms = readdirSync(source).filter((n) => /\.jpe?g$/i.test(n)).sort().slice(0, 6);
  if (noms.length < 6) throw new Error("il faut six JPEG dans le dossier");
  const photos: PhotoRef[] = [];
  for (const nom of noms) {
    const m = await sharp(join(source, nom)).metadata();
    const o = m.orientation ?? 1;
    const [l, h] = o >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];
    photos.push({ id: nom, nom, l, h, date: null });
  }
  const cat = new Map(photos.map((p) => [p.id, p]));
  const [a, b, c, d, e, f] = noms;
  let m = nouveauMagazine("essai-derniere", "Essai dernière page", "2026-11-13T00:00:00.000Z");
  m = O.insererDouble(m, "pl-1").magazine;
  m = O.ajouter(m, "pl-1", "droite", [a], cat).magazine;
  m = O.ajouter(m, "pl-2", "double", [b, c, d], cat).magazine;
  m = O.ajouter(m, "pl-fin", "gauche", [e, f], cat).magazine;
  const derniere = m.planches[m.planches.length - 1].gauche;
  if (!derniere) throw new Error("la dernière page est vide");
  const iTitre = derniere.textes.length ? 0 : -1;
  if (iTitre >= 0) m = O.ecrireTexteCadre(m, { plancheId: "pl-fin", cible: "gauche", index: iTitre }, "Fin");

  const liens = nomsDeLiens(photos.map((p) => ({ id: p.id, nom: p.nom })));
  const exp = new Map<string, PhotoExport>(photos.map((p) => [p.id, { id: p.id, nomLien: liens.get(p.id) ?? p.nom, l: p.l, h: p.h }]));
  mkdirSync(join(sortie, "Links"), { recursive: true });
  for (const p of photos) copyFileSync(join(source, p.nom), join(sortie, "Links", liens.get(p.id) ?? p.nom));
  writeFileSync(join(sortie, "magazine.idml"), zipperIdml(construireIdml(m, exp, { liens: { mode: "absolu", dossier: sortie } })));
  const dl = m.planches[m.planches.length - 1].gauche!;
  writeFileSync(join(sortie, "attendu.json"), JSON.stringify({
    pages: O.pagesDe(m), planches: m.planches.map((p) => p.id), gabaritDerniere: dl.templateId, texteDerniere: iTitre >= 0 ? "Fin" : null,
    cadresDerniere: cadresDe(dl, "gauche").map((x) => ({ role: x.role, x: x.x, y: x.y, l: x.l, h: x.h })),
    photos: photos.map((p) => ({ lien: liens.get(p.id), l: p.l, h: p.h })),
  }, null, 2));
  console.log(`${O.pagesDe(m)} pages, dernière page : ${dl.templateId}, écrit dans ${sortie}`);
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
