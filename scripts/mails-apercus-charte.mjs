/**
 * Les aperçus des mails de la charte V2 (26/11), en local.
 *
 *   node scripts/mails-apercus-charte.mjs
 *
 * Écrit dans `.mails-apercus/charte-v2/` (hors git) un HTML par mail et par variante, un
 * `index.html`, et dans `sombre/` les mêmes pages sous une SIMULATION du mode sombre forcé de
 * Gmail (couleurs inversées, images et images de fond laissées telles quelles). Ni base, ni
 * réseau, ni Brevo : il lit `mails-atelier.mjs` et `mails-noel.mjs`, rend les `{% if %}` comme
 * Brevo, et remplace l'adresse des images du site par les fichiers de `public/` (le logo et les
 * scènes sur papier ne sont en ligne qu'après le déploiement).
 * Toutes les valeurs sont fictives (Camille, Léa, « Notre été à Séville »).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as Atelier from "./mails-atelier.mjs";
import * as Noel from "./mails-noel.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = resolve(RACINE, ".mails-apercus/charte-v2");
const PUBLIC = pathToFileURL(resolve(RACINE, "public")).href;

/**
 * Le rendu « à la Brevo » : `{% if params.X %}…{% elif params.Y %}…{% else %}…{% endif %}`,
 * imbriqués, puis `{{ params.X }}`. Une chaîne vide est fausse, comme chez Brevo.
 */
export function rendreBrevo(html, valeurs) {
  const morceaux = html.split(/(\{%\s*(?:if|elif)\s+params\.[A-Z_]+\s*%\}|\{%\s*else\s*%\}|\{%\s*endif\s*%\})/);
  let i = 0;
  function bloc() {
    let sortie = "";
    while (i < morceaux.length) {
      const m = morceaux[i];
      const si = m.match(/^\{%\s*if\s+params\.([A-Z_]+)\s*%\}$/);
      if (si) {
        i++;
        sortie += condition(si[1]);
        continue;
      }
      if (/^\{%\s*(elif|else|endif)/.test(m)) return sortie;
      sortie += m;
      i++;
    }
    return sortie;
  }
  function condition(cle) {
    let choisi = null;
    let vrai = Boolean(valeurs[cle]);
    for (;;) {
      const contenu = bloc();
      if (vrai && choisi === null) choisi = contenu;
      const fin = morceaux[i++] ?? "{% endif %}";
      if (/endif/.test(fin)) return choisi ?? "";
      const elif = fin.match(/elif\s+params\.([A-Z_]+)/);
      vrai = elif ? Boolean(valeurs[elif[1]]) : true;
    }
  }
  const rendu = bloc();
  return rendu.replace(/\{\{\s*params\.([A-Z_]+)\s*\}\}/g, (t, cle) => valeurs[cle] ?? "");
}

/** Les images du site, lues dans public/ : ce qui part chez Brevo garde l'adresse du site. */
const local = (html) => html.split("https://www.bellajour.fr/images/").join(`${PUBLIC}/images/`);

/**
 * La simulation du sombre forcé (Gmail sur iPhone) : tout est inversé, sauf les images et les
 * éléments peints par une image de fond, que Gmail laisse tels quels.
 */
const SOMBRE = `<style id="simulation-sombre">
html { background: #ffffff; filter: invert(1) hue-rotate(180deg); }
img { filter: invert(1) hue-rotate(180deg); }
[style*="linear-gradient"] { filter: invert(1) hue-rotate(180deg); }
[style*="linear-gradient"] img { filter: none; }
</style>`;

const VARIANTES_ATELIER = {
  M3: [{ suffixe: "fondateur", valeurs: { CREDIT_FONDATRICE: "30", LIVRAISON_OFFERTE: "oui", TOTAL: "7" } }],
  M4: [{ suffixe: "sans-carte", valeurs: { RECAP_CARTE: "" } }],
  M7: [{ suffixe: "code-seul", valeurs: { SUIVI: "" } }],
  M9: [{ suffixe: "avec-mot", valeurs: { MOT: "Les photos de nuit sont un peu sombres : quelques-unes de jour aideraient la double page." } }],
  M10: [{ suffixe: "sans-couverture", valeurs: { COUVERTURE_PRETE: "" } }],
};

const pages = [];
const restes = [];
function ecrire(nom, famille, libelle, html) {
  /* Une accolade qui survit au rendu : une variable ou une condition que l'aperçu n'a pas su rendre. */
  if (/\{\{|\{%/.test(html)) restes.push(nom);
  writeFileSync(resolve(SORTIE, `${nom}.html`), local(html), "utf8");
  writeFileSync(resolve(SORTIE, "sombre", `${nom}.html`), local(html).replace("</head>", `${SOMBRE}\n</head>`), "utf8");
  pages.push({ nom, famille, libelle });
}

mkdirSync(resolve(SORTIE, "sombre"), { recursive: true });

for (const mail of Atelier.MAILS) {
  const famille = mail.code.startsWith("C") ? "Compte" : "Atelier";
  ecrire(mail.code, famille, mail.nom, rendreBrevo(Atelier.maquette(mail), Atelier.EXEMPLE));
  for (const v of VARIANTES_ATELIER[mail.code] ?? []) {
    ecrire(`${mail.code}-${v.suffixe}`, famille, `${mail.nom} (${v.suffixe})`, rendreBrevo(Atelier.maquette(mail), { ...Atelier.EXEMPLE, ...v.valeurs }));
  }
}
for (const mail of Noel.MAILS) {
  const famille = mail.code.startsWith("N") ? "Noël (campagnes)" : "Carte cadeau";
  ecrire(mail.code, famille, mail.nom, rendreBrevo(Noel.maquette(mail), Noel.EXEMPLE));
  if (mail.code === "GC1") ecrire("GC1-imprimer", famille, `${mail.nom} (à imprimer)`, rendreBrevo(Noel.maquette(mail), { ...Noel.EXEMPLE, EMAIL_DEST: "" }));
}

const lignes = pages
  .map(
    (p) =>
      `<tr><td>${p.famille}</td><td><a href="${p.nom}.html">${p.nom}</a></td><td>${p.libelle}</td><td><a href="sombre/${p.nom}.html">sombre forcé</a></td></tr>`,
  )
  .join("\n");
writeFileSync(
  resolve(SORTIE, "index.html"),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mails, charte V2</title>
<style>body{font-family:Helvetica,Arial,sans-serif;color:#111;margin:40px}td{padding:6px 14px;border-bottom:1px solid #dedede}a{color:#111;font-weight:bold}</style></head>
<body><h1 style="font-family:Georgia,serif;font-weight:normal">Mails, charte V2 (26/11)</h1>
<p>Aperçus locaux, valeurs fictives. Rien n'est parti chez Brevo.</p>
<table>${lignes}</table></body></html>`,
  "utf8",
);
if (restes.length) {
  console.error(`Accolades restées dans : ${restes.join(", ")}`);
  process.exitCode = 1;
}
console.log(`${pages.length} aperçus écrits dans .mails-apercus/charte-v2/ (et leur simulation sombre dans sombre/).`);
