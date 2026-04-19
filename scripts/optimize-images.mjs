import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const folders = [
  '../public/images/hero',
  '../public/images/anxiete',
  '../public/images/ui'
];

for (const folder of folders) {
  const dir = path.resolve(__dirname, folder);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir)
    .filter(f => f.match(/\.(jpg|jpeg|png)$/i));

  for (const file of files) {
    const input = path.join(dir, file);
    const output = path.join(dir,
      file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));

    await sharp(input)
      .rotate()
      .webp({ quality: 85 })
      .toFile(output);

    const before = fs.statSync(input).size;
    const after = fs.statSync(output).size;
    const gain = Math.round((1 - after/before) * 100);
    console.log(`✓ ${file} → ${path.basename(output)} (-${gain}%)`);
  }
}
