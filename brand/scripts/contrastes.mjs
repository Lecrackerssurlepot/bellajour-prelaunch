// Vérifie le contraste WCAG de chaque paire texte/fond de la charte. Échoue (code 1) sous le seuil.
// AA : 4,5:1 pour le texte courant, 3:1 pour un texte ≥ 24 px ou un repère non textuel.
import { lireJetons } from './lire-tokens.mjs';

const v = Object.fromEntries(lireJetons().map((j) => [j.chemin, j.brut]));

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const rapport = (a, b) => {
  const [h, l] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (h + 0.05) / (l + 0.05);
};

// [texte, fond, seuil, usage]
const PAIRES = [];
for (const s of ['papier', 'nuit']) {
  PAIRES.push([`couleur.${s}.texte`, `couleur.${s}.fond`, 4.5, `texte, ${s}`]);
  PAIRES.push([`couleur.${s}.texte-doux`, `couleur.${s}.fond`, 4.5, `texte secondaire 13-14 px, ${s}`]);
  PAIRES.push([`couleur.${s}.texte`, `couleur.${s}.champ-fond`, 4.5, `texte saisi, ${s}`]);
  PAIRES.push([`couleur.${s}.texte-doux`, `couleur.${s}.champ-fond`, 4.5, `indication d'un champ, ${s}`]);
  PAIRES.push([`couleur.${s}.champ-bord`, `couleur.${s}.fond`, 3, `bord de champ sur la page, ${s}`]);
  PAIRES.push([`couleur.${s}.champ-bord`, `couleur.${s}.champ-fond`, 3, `bord de champ sur son fond, ${s}`]);
}
PAIRES.push(['couleur.papier.fond', 'couleur.accent', 4.5, 'texte du bouton principal']);
PAIRES.push(['couleur.accent', 'couleur.papier.fond', 3, 'anneau de focus, pointillé de la frise']);
for (const e of ['succes', 'erreur', 'alerte', 'info']) PAIRES.push([`couleur.etat.${e}`, 'couleur.papier.fond', 4.5, `message ${e}`]);
PAIRES.push(['couleur.etat.pastille', 'couleur.papier.fond', 3, 'pastille verte (non textuelle)']);

let echecs = 0;
for (const [t, f, seuil, usage] of PAIRES) {
  const r = rapport(v[t], v[f]);
  const ok = r >= seuil;
  if (!ok) echecs++;
  console.log(`${ok ? 'OK ' : 'NON'}  ${r.toFixed(2).padStart(5)}:1  ≥ ${seuil}  ${usage}  (${v[t]} sur ${v[f]})`);
}
console.log(echecs ? `\n${echecs} paire(s) sous le seuil.` : `\nToutes les paires passent (${PAIRES.length}).`);
process.exit(echecs ? 1 : 0);
