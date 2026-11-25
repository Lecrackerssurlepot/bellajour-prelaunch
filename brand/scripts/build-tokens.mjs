// Génère, depuis brand/tokens.json :
//   brand/build/tokens.css : variables CSS (--m-…), surcharges téléphone sous @media (max-width: 700px)
//   brand/build/tokens.ts  : les mêmes valeurs pour le code (page /brand, JS qui doit lire une rupture)
//   brand/build/mail.json  : valeurs brutes, alias résolus, pour écrire les styles en ligne des mails
// Ne jamais éditer brand/build/ à la main : relancer `node brand/scripts/build-tokens.mjs`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RACINE_BRAND, lireArbre, lireJetons, nomCss, enCss, cibleAlias } from './lire-tokens.mjs';

const jetons = lireJetons();
const version = lireArbre().$extensions.bellajour.version;
const rupture = jetons.find((j) => j.chemin === 'rupture.telephone').brut;
const sortie = join(RACINE_BRAND, 'build');
mkdirSync(sortie, { recursive: true });

const entete = `Charte Bellajour ${version}. FICHIER GÉNÉRÉ depuis brand/tokens.json : ne pas modifier à la main.`;
const versVar = (alias) => `var(${nomCss(cibleAlias(alias))})`;

// 1. CSS
// Une famille de rôle passe d'abord par la variable que pose next/font (src/app/polices.ts),
// qui donne à la police un nom haché : sans ce relais, "Fraunces" ne trouverait rien.
const roleDePolice = (j) => j.type === 'fontFamily' && /^police\.[^.]+\.famille$/.test(j.chemin) && typeof j.valeur !== 'string' ? j.chemin.split('.')[1] : null;
const valeurCss = (j) => {
  const css = enCss(j.type, j.valeur, versVar);
  const role = roleDePolice(j);
  if (!role) return css;
  const [premiere, ...reste] = css.split(', ');
  return [`var(--police-${role}, ${premiere})`, ...reste].join(', ');
};
const lignes = jetons.map((j) => `  ${nomCss(j.chemin)}: ${valeurCss(j)};`);
const tel = jetons.filter((j) => j.telephone !== undefined).map((j) => `    ${nomCss(j.chemin)}: ${enCss(j.type, j.telephone, versVar)};`);
const css = `/* ${entete} */\n:root {\n${lignes.join('\n')}\n}\n\n@media (max-width: ${rupture}) {\n  :root {\n${tel.join('\n')}\n  }\n}\n`;
writeFileSync(join(sortie, 'tokens.css'), css);

// 2. TypeScript : arbre de valeurs brutes + nom de variable CSS de chaque jeton
const arbre = {};
for (const j of jetons) {
  const parts = j.chemin.split('.');
  let n = arbre;
  parts.slice(0, -1).forEach((p) => { n = n[p] ??= {}; });
  n[parts.at(-1)] = { valeur: j.brut, css: enCss(j.type, j.brut), variable: nomCss(j.chemin), ...(j.brutTelephone !== undefined ? { telephone: enCss(j.type, j.brutTelephone) } : {}) };
}
const ts = `/* ${entete} */\n\nexport const versionCharte = ${JSON.stringify(version)};\n\nexport const jetons = ${JSON.stringify(arbre, null, 2)} as const;\n\n/** Requête média du téléphone, la même que le CSS. */\nexport const requeteTelephone = ${JSON.stringify(`(max-width: ${rupture})`)};\n`;
writeFileSync(join(sortie, 'tokens.ts'), ts);

// 3. Mail : valeurs brutes, sans variation ni clamp (un client mail ne les comprend pas)
const mail = { $description: entete, version };
for (const j of jetons) {
  if (j.chemin.startsWith('variation.')) continue;
  if (typeof j.brut === 'string' && j.brut.includes('clamp(')) continue;
  mail[j.chemin] = enCss(j.type, j.brut);
}
writeFileSync(join(sortie, 'mail.json'), JSON.stringify(mail, null, 2) + '\n');

console.log(`charte ${version} : ${jetons.length} jetons, ${tel.length} surcharges téléphone → brand/build/{tokens.css,tokens.ts,mail.json}`);
