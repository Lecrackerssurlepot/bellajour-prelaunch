#!/usr/bin/env node
/* Les logos des mails (charte N, 26/11), tirés du logo vectoriel, rien de redessiné.
   node brand/scripts/logo-mail.mjs

   Un mail ne lit ni le SVG (Outlook, Gmail) ni le WebP (Outlook) : il lui faut un PNG
   hébergé. Deux couleurs, celles de la charte : papier sur le bandeau nuit (la version
   servie, voir N), encre pour un fond papier (prête, pas encore servie).
   Largeur 420 px pour un affichage à 140 px : net sur un écran Retina (×3).
   Un logo qui change prend un NOUVEAU nom : Gmail garde les images en cache par adresse.
   Sorties : public/images/v2/mail/logo-papier-420.png, logo-encre-420.png. Local, ni base ni réseau. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'

const RACINE = new URL('../..', import.meta.url).pathname
const MAIL = JSON.parse(readFileSync(join(RACINE, 'brand/build/mail.json'), 'utf8'))
const LOGO = readFileSync(join(RACINE, 'brand/assets/logo/bellajour.svg'), 'utf8')
const LARGEUR = 420

const COULEURS = {
  papier: MAIL['couleur.nuit.texte'], // le texte d'un bloc nuit
  encre: MAIL['couleur.papier.texte'],
}

const SORTIE = join(RACINE, 'public/images/v2/mail')
mkdirSync(SORTIE, { recursive: true })
for (const [nom, couleur] of Object.entries(COULEURS)) {
  const svg = LOGO.replace(/fill="currentColor"/g, `fill="${couleur}"`)
  const png = await sharp(Buffer.from(svg), { density: 300 })
    .resize({ width: LARGEUR })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const meta = await sharp(png).metadata()
  writeFileSync(join(SORTIE, `logo-${nom}-${LARGEUR}.png`), png)
  console.log(`logo-${nom}-${LARGEUR}.png : ${meta.width} × ${meta.height}, ${couleur}, ${Math.round(png.length / 1024)} Ko`)
}
