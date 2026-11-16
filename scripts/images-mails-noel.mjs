/**
 * Les images des mails de Noël, en JPEG (Outlook ne lit pas le WebP).
 *
 *   node scripts/images-mails-noel.mjs
 *
 * Local seulement : lit les couvertures de `public/images/v2/accueil/` et écrit
 * dans `public/images/mails/noel/`. Ni base, ni réseau.
 *
 * Mathias, 16/11 : « tous les visuels doivent s'apparenter à des magazines ».
 * Une couverture seule ne se lit pas comme un magazine dans un mail : c'est
 * une photo. Chaque couverture est donc posée comme un objet : une ombre au
 * sol, la tranche des pages à droite, le pli de la reliure à gauche.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(RACINE, "public/images/v2/accueil");
const SORTIE = resolve(RACINE, "public/images/mails/noel");
const FOND = "#070708";

/** Une couverture devenue objet : reliure, tranche, coins nets. */
async function magazine(nom, largeur) {
  const hauteur = Math.round((largeur * 905) / 640);
  const couverture = await sharp(resolve(SOURCE, `couverture-${nom}-640.webp`))
    .resize(largeur, hauteur)
    .toBuffer();
  const tranche = Math.max(4, Math.round(largeur * 0.018));
  const pli = Math.round(largeur * 0.05);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${largeur + tranche}" height="${hauteur}">
  <defs>
    <linearGradient id="pli" x1="0" x2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.38"/>
      <stop offset="0.35" stop-color="#fff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="pages" x1="0" x2="1">
      <stop offset="0" stop-color="#cfc8bb"/><stop offset="1" stop-color="#8f897f"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${pli}" height="${hauteur}" fill="url(#pli)"/>
  <rect x="0.5" y="0.5" width="${largeur - 1}" height="${hauteur - 1}" fill="none" stroke="#fff" stroke-opacity="0.16"/>
  <rect x="${largeur}" y="3" width="${tranche}" height="${hauteur - 6}" fill="url(#pages)"/>
  ${Array.from({ length: 4 }, (_, i) => `<line x1="${largeur + 1 + i}" y1="3" x2="${largeur + 1 + i}" y2="${hauteur - 3}" stroke="#6d675f" stroke-width="0.5" opacity="0.6"/>`).join("")}
</svg>`);
  return sharp({
    create: { width: largeur + tranche, height: hauteur, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: couverture, left: 0, top: 0 }, { input: svg, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

/** Une ombre douce sous un objet de la taille donnée. */
function ombre(l, h, flou = 26) {
  return sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${l + flou * 4}" height="${h + flou * 4}">
<rect x="${flou * 2 - 10}" y="${flou * 2 - 10}" width="${l + 20}" height="${h + 20}" fill="#2a2622" opacity="0.55"/></svg>`),
  )
    .blur(flou)
    .png()
    .toBuffer();
}

/** Des magazines posés sur un fond, à des positions données (gauche, haut, largeur, rotation). */
async function scene(fichier, largeur, hauteur, poses, fond = FOND) {
  const calques = [];
  for (const p of poses) {
    let objet = await magazine(p.nom, p.largeur);
    let meta = await sharp(objet).metadata();
    if (p.rotation) {
      objet = await sharp(objet).rotate(p.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      meta = await sharp(objet).metadata();
    }
    calques.push({ input: await ombre(meta.width, meta.height), left: p.gauche - 52, top: p.haut - 52 });
    calques.push({ input: objet, left: p.gauche, top: p.haut });
  }
  await sharp({ create: { width: largeur, height: hauteur, channels: 3, background: fond } })
    .composite(calques)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(resolve(SORTIE, fichier));
  console.log("✓", fichier);
}

mkdirSync(SORTIE, { recursive: true });

// Les magazines sur la table (photo réelle), en JPEG.
await sharp(resolve(SOURCE, "header-magazines-paysage-1280.webp"))
  .resize(1040)
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(resolve(SORTIE, "magazines-table-1040.jpg"));
console.log("✓ magazines-table-1040.jpg");

// N2 : Aussie, un magazine debout, entier, au centre.
await scene("aussie-1040.jpg", 1040, 760, [{ nom: "aussie", largeur: 440, gauche: 296, haut: 70 }]);

// N1 « Pour vous » : Lisbonne seule, petite (bloc de 240 de large).
// Fond #161618 : celui du bloc qui la porte dans le mail.
await scene("lisbonne-480.jpg", 480, 420, [{ nom: "lisbonne", largeur: 210, gauche: 132, haut: 56 }], "#161618");

// GC6, N3, N4 : trois numéros en éventail.
await scene("trois-numeros-1040.jpg", 1040, 700, [
  { nom: "cote-azur", largeur: 330, gauche: 120, haut: 110, rotation: -6 },
  { nom: "thats-life", largeur: 330, gauche: 590, haut: 110, rotation: 6 },
  { nom: "lisbonne", largeur: 360, gauche: 340, haut: 60 },
]);
