/**
 * Essai Affinity de la COUVERTURE (lot B, 12/11, D28) : un IDML de couverture par gabarit demandé, sur de vraies photos.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/idml-essai-couverture.ts <dossier de JPEG> <dossier de sortie> [dos mm] [CV-01,CV-11,…]
 *
 * Lit les JPEG du dossier (lecture seule), pose les premiers sur les cadres du gabarit (le plus grand cadre de la 1re
 * d'abord), écrit le titre « MARTINIQUE » et une ligne, puis écrit dans le dossier de sortie, pour chaque gabarit :
 * `couverture-CV-xx.idml` aux liens ABSOLUS vers `Links/` (copie des photos) et `attendu-CV-xx.json` (largeur, dos,
 * cadres en mm, corps du titre, tailles des images) pour relire Affinity valeur par valeur. N'écrit RIEN ailleurs ;
 * ni base, ni réseau, ni tiers.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { construireIdmlCouverture, nomsDeLiens, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperIdml } from "@/lib/mise-en-page/paquet";
import { cadresCouverture, cadresPhotoCouverture, cadresTexteCouverture, couvertureNeuve, couverturePourExport, gabaritCouverture, type Couverture } from "@/lib/mise-en-page/couverture";
import { recadrageParContenu } from "@/lib/mise-en-page/recadrage";
import { largeurCouverture } from "@/lib/mise-en-page/geometrie";

async function main() {
  const [source, sortie, dosTxt, liste] = process.argv.slice(2);
  if (!source || !sortie || !existsSync(source)) throw new Error("usage : idml-essai-couverture.ts <dossier de JPEG> <dossier de sortie> [dos] [CV-01,…]");
  const dos = Number(dosTxt ?? "2.66");
  const ids = (liste ?? "CV-01").split(",");
  const noms = readdirSync(source).filter((n) => /^\d+\.jpe?g$/i.test(n)).sort();
  const photos: { id: string; nom: string; l: number; h: number; chemin: string }[] = [];
  for (const nom of noms.slice(0, 12)) {
    const m = await sharp(join(source, nom)).metadata();
    const o = m.orientation ?? 1;
    const [l, h] = o >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];
    photos.push({ id: nom, nom, l, h, chemin: join(source, nom) });
  }
  mkdirSync(join(sortie, "Links"), { recursive: true });
  const liens = nomsDeLiens(photos.map((p) => ({ id: p.id, nom: p.nom })));
  const exp = new Map<string, PhotoExport>(photos.map((p) => [p.id, { id: p.id, nomLien: liens.get(p.id) ?? p.nom, l: p.l, h: p.h }]));
  for (const p of photos) copyFileSync(p.chemin, join(sortie, "Links", liens.get(p.id) ?? p.nom));

  for (const id of ids) {
    const g = gabaritCouverture(id);
    if (!g) throw new Error(`gabarit inconnu ${id}`);
    const cadres = cadresPhotoCouverture(g);
    const cadresTexte = cadresTexteCouverture(g);
    /* les photos portrait vont aux cadres portrait, dans l'ordre */
    const libres = [...photos];
    const c0 = couvertureNeuve(id);
    const c: Couverture = {
      ...c0,
      photos: cadres.map((x) => {
        const portrait = x.h >= x.l;
        const k = libres.findIndex((p) => (p.h >= p.l) === portrait);
        const p = libres.splice(k >= 0 ? k : 0, 1)[0];
        return p ? { photoId: p.id, recadrage: recadrageParContenu(p, x, null) } : { photoId: null, recadrage: { zoom: 1, dx: 0, dy: 0 } };
      }),
      /* le premier mot-titre reçoit le lieu, le second (C-06) l'année, les lignes le nom et la date */
      textes: (() => {
        let mots = 0;
        return cadresTexte.map((x, i) => ({ ...c0.textes[i], contenu: x.motTitre ? (mots++ === 0 ? "MARTINIQUE" : "2026") : "Geffroy family · juillet 2026" }));
      })(),
    };
    const pret = couverturePourExport(c, null);
    const idml = zipperIdml(construireIdmlCouverture(pret, exp, { liens: { mode: "absolu", dossier: sortie }, dosMm: dos }));
    writeFileSync(join(sortie, `couverture-${id}.idml`), idml);
    const attendu = {
      gabarit: `${g.id} ${g.nom}`, dosMm: dos, largeurCoupeMm: largeurCouverture(dos), largeurFondPerduMm: largeurCouverture(dos) + 6, hauteurFondPerduMm: 303,
      cadres: cadresCouverture(pret, dos).map((x) => ({ role: x.role, face: x.face, x: +x.x.toFixed(3), y: x.y, l: x.l, h: x.h })),
      textes: pret.textes, photos: pret.photos.map((a) => (a.photoId ? { ...a, px: [exp.get(a.photoId)?.l, exp.get(a.photoId)?.h] } : a)),
    };
    writeFileSync(join(sortie, `attendu-${id}.json`), JSON.stringify(attendu, null, 2));
    console.log(`${id} → ${join(sortie, `couverture-${id}.idml`)}`);
  }
}

void main();
