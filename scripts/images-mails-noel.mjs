/**
 * Les images des mails de Noël, en JPEG (Outlook ne lit pas le WebP).
 *
 *   node scripts/images-mails-noel.mjs
 *
 *   node scripts/images-mails-noel.mjs --charte
 *
 * Local seulement : lit les couvertures de `public/images/v2/accueil/` et écrit
 * dans `public/images/mails/noel/`. Ni base, ni réseau.
 *
 * `--charte` (26/11, charte V2, fiche N) écrit SEULEMENT les mêmes scènes sur
 * le PAPIER du mail (#ffffff), sous `public/images/mails/charte/`, et ne touche
 * à rien d'autre. Des fichiers NEUFS et jamais un remplacement : les adresses
 * de `noel/` sont celles des mails déjà partis (N1) et des campagnes déjà
 * programmées (N2 à N4), au fond nuit de l'ancienne charte.
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
const CHARTE = process.argv.includes("--charte");
const SORTIE_CHARTE = resolve(RACINE, "public/images/mails/charte");
const FOND = "#070708";
const PAPIER = "#ffffff";

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
function ombre(l, h, flou = 26, papier = false) {
  /* Sur le papier (charte V2), l'ombre d'un objet posé : plus légère, portée
     vers le bas (ombre.objet), sinon un halo gris entoure chaque magazine. */
  const [opacite, marge, bas] = papier ? [0.26, -6, 22] : [0.55, 10, 0];
  return sharp(
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${l + flou * 4}" height="${h + flou * 4}">
<rect x="${flou * 2 - marge}" y="${flou * 2 - marge + bas}" width="${l + marge * 2}" height="${h + marge * 2}" fill="#2a2622" opacity="${opacite}"/></svg>`),
  )
    .blur(flou)
    .png()
    .toBuffer();
}

/** Des magazines posés sur un fond, à des positions données (gauche, haut, largeur, rotation). */
async function scene(fichier, largeur, hauteur, poses, fond = FOND, sortie = SORTIE) {
  const calques = [];
  for (const p of poses) {
    let objet = await magazine(p.nom, p.largeur);
    let meta = await sharp(objet).metadata();
    if (p.rotation) {
      objet = await sharp(objet).rotate(p.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      meta = await sharp(objet).metadata();
    }
    calques.push({ input: await ombre(meta.width, meta.height, 26, fond === PAPIER), left: p.gauche - 52, top: p.haut - 52 });
    calques.push({ input: objet, left: p.gauche, top: p.haut });
  }
  await sharp({ create: { width: largeur, height: hauteur, channels: 3, background: fond } })
    .composite(calques)
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(resolve(sortie, fichier));
  console.log("✓", fichier);
}

if (CHARTE) {
  /* Les scènes de la charte V2, sur le papier du mail. Mêmes poses que plus bas. */
  mkdirSync(SORTIE_CHARTE, { recursive: true });
  await scene("aussie-1040.jpg", 1040, 760, [{ nom: "aussie", largeur: 440, gauche: 296, haut: 70 }], PAPIER, SORTIE_CHARTE);
  await scene("lisbonne-480.jpg", 480, 420, [{ nom: "lisbonne", largeur: 210, gauche: 132, haut: 56 }], PAPIER, SORTIE_CHARTE);
  await scene("trois-numeros-1040.jpg", 1040, 700, [
    { nom: "cote-azur", largeur: 330, gauche: 120, haut: 110, rotation: -6 },
    { nom: "thats-life", largeur: 330, gauche: 590, haut: 110, rotation: 6 },
    { nom: "lisbonne", largeur: 360, gauche: 340, haut: 60 },
  ], PAPIER, SORTIE_CHARTE);
  process.exit(0);
}

mkdirSync(SORTIE, { recursive: true });

// Le fond de la carte cadeau des mails (Mathias, 16/11 : la carte disparaissait
// en mode sombre). Une IMAGE et non un dégradé CSS : Gmail et Outlook assombrissent
// les couleurs de fond en mode sombre, jamais les images. Même dégradé que la carte
// de /carte/<token> (160°, #8e7a68 → #4a4038 à 55 % → #211d1a).
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="760">
  <defs><linearGradient id="d" x1="0.33" y1="0" x2="0.67" y2="1">
    <stop offset="0" stop-color="#8e7a68"/><stop offset="0.55" stop-color="#4a4038"/><stop offset="1" stop-color="#211d1a"/>
  </linearGradient></defs>
  <rect width="1040" height="760" fill="url(#d)"/>
</svg>`),
)
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(resolve(SORTIE, "carte-fond-1040.jpg"));
console.log("✓ carte-fond-1040.jpg");

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
