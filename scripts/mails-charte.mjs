/**
 * LA coquille des mails, charte V2 (brand/charte/N-declinaisons.md, « Le gabarit commun », 26/11).
 *
 * Importée par `mails-atelier.mjs` (atelier et compte) et `mails-noel.mjs` (Noël et carte cadeau).
 * Module pur : il rend des chaînes HTML, il ne lit que `brand/build/mail.json`, n'écrit rien et
 * n'appelle personne. Les styles sont EN LIGNE (Gmail retire une partie du <style>) ; la feuille
 * de tête ne porte que ce qui peut manquer sans dommage (téléphone, parade Gmail du bloc nuit).
 *
 * Les règles, et leur raison, sont dans la fiche N. En deux mots :
 * - papier et encre, rien d'autre ; le bandeau du haut est nuit, le logo papier y est posé ;
 * - le bandeau et la carte cadeau sont peints deux fois (bgcolor + linear-gradient) : Gmail
 *   inverse les couleurs, jamais une image de fond ;
 * - un seul bouton, en tableau, encre bordée d'encre : inversé, il se lit encore ;
 * - Georgia et Helvetica, jamais de police chargée.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const M = JSON.parse(readFileSync(resolve(RACINE, "brand/build/mail.json"), "utf8"));

/** Un lien de mail vise TOUJOURS le vrai site (PR « liens-mails-vrai-site »). */
export const SITE = "https://www.bellajour.fr";
export const INSTAGRAM = "https://www.instagram.com/bellajour__/";
/** Le logo papier, tiré du vectoriel par brand/scripts/logo-mail.mjs (420 × 159, affiché à 140). */
export const LOGO_MAIL = `${SITE}/images/v2/mail/logo-papier-420.png`;
const LOGO_L = 140;
const LOGO_H = 53;

export const C = {
  papier: M["couleur.papier.fond"],
  encre: M["couleur.papier.texte"],
  doux: M["couleur.papier.texte-doux"],
  ligne: M["couleur.papier.ligne"],
  nuit: M["couleur.nuit.fond"],
  nuitTexte: M["couleur.nuit.texte"],
  nuitDoux: M["couleur.nuit.texte-doux"],
  nuitLigne: M["couleur.nuit.ligne"],
};
export const SERIF = M["police.mail.titre"].replace(/"/g, "'");
export const SANS = M["police.mail.texte"].replace(/"/g, "'");
const LARGEUR = parseInt(M["mail.largeur"], 10);
const MARGE = parseInt(M["mail.marge"], 10);
const PILULE = M["mail.rayon-bouton"];
const BLOC = M["rayon.bloc"];
const RAYON_IMAGE = M["rayon.image"];
const APPROCHE = M["police.etiquette.approche"];
/** La largeur utile : 600 moins les deux marges. */
export const UTILE = LARGEUR - 2 * MARGE;

/** Une peinture qui survit à l'inversion de Gmail : la couleur, puis la même en image de fond. */
const peint = (c) => `background-color: ${c}; background-image: linear-gradient(${c}, ${c});`;

/* ─────────────────────────────── les briques ─────────────────────────────── */

/** Une rangée du corps, aux marges du mail. */
export const ligne = (contenu, bas = 32, align = "left") =>
  `<tr><td align="${align}" style="padding: 0 ${MARGE}px ${bas}px ${MARGE}px;">${contenu}</td></tr>`;

/** L'étiquette : 12 px, capitales par le style, approche 0,12 em, texte doux. */
export const etiquette = (t, couleur = C.doux) =>
  `<div style="font-family: ${SANS}; font-size: 12px; line-height: 1.3; letter-spacing: ${APPROCHE}; text-transform: uppercase; font-weight: 500; color: ${couleur};">${t}</div>`;

/* Le titre : grand, comme un titre de magazine (piste C, choisie par Mathias le 26/11). */
export const titre = (t, bas = 24) =>
  ligne(
    `<h1 class="titre-mail" style="margin: 0; font-family: ${SERIF}; font-size: 52px; font-weight: normal; line-height: 1.04; letter-spacing: -0.015em; color: ${C.encre};">${t}</h1>`,
    bas,
  );

/** Le surtitre, au-dessus du titre : le titre du numéro, en étiquette. */
export const surtitre = (t, bas = 14) => ligne(etiquette(t), bas);

/**
 * La photo d'en-tête, pleine largeur, juste sous le bandeau (piste C, 26/11) : une vraie photo de
 * magazine ouvre chaque mail. Sans coin arrondi ni marge, elle tient les 600 px.
 */
export function photoEnTete(src, alt, lien = null) {
  const img = `<img src="${src}" width="${LARGEUR}" alt="${alt}" style="display: block; width: 100%; max-width: ${LARGEUR}px; height: auto; border: 0; outline: none; text-decoration: none;" />`;
  return `<!-- photo-en-tete --><tr><td style="padding: 0 0 40px 0;">${lien ? `<a href="${lien}" style="display: block; text-decoration: none;">${img}</a>` : img}</td></tr>`;
}

/** La photo par défaut des mails de l'atelier et du compte. PROVISOIRE : remplacée par les visuels de Mathias. */
export const PHOTO_MAIL = { src: `${SITE}/images/mails/charte/aussie-1040.jpg`, alt: "Un magazine Bellajour, une ville la nuit en couverture" };

export const chapo = (t, bas = 32) =>
  ligne(`<p style="margin: 0; font-family: ${SANS}; font-size: 18px; line-height: 1.5; color: ${C.encre};">${t}</p>`, bas);

export const texte = (t, bas = 32) =>
  ligne(`<p style="margin: 0; font-family: ${SANS}; font-size: 16px; line-height: 1.6; color: ${C.encre};">${t}</p>`, bas);

export const pied = (t, bas = 40) =>
  ligne(`<p style="margin: 0; font-family: ${SANS}; font-size: 14px; line-height: 1.6; color: ${C.doux};">${t}</p>`, bas);

/** Un lien secondaire : encre, en gras, une flèche, jamais souligné (charte A). */
export const lienSecondaire = (libelle, href, couleur = C.encre) =>
  `<a href="${href}" style="font-family: ${SANS}; font-weight: bold; color: ${couleur}; text-decoration: none;">${libelle}&nbsp;&rarr;</a>`;

/**
 * LE bouton : une cellule encre bordée d'encre, rayon pilule, 52 px. La forme VML ne sert qu'à
 * Outlook sous Windows, qui ignore le rayon d'une cellule.
 */
export function bouton(cta, lien, bas = 40) {
  return ligne(
    `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${lien}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="50%" strokecolor="${C.encre}" fillcolor="${C.encre}"><w:anchorlock/><center style="color:${C.papier};font-family:Helvetica,Arial,sans-serif;font-size:15px;">${cta}</center></v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.encre}" style="background-color: ${C.encre}; border: 1px solid ${C.encre}; border-radius: ${PILULE};">
<a href="${lien}" class="bouton-mail" style="display: inline-block; padding: 15px 32px; line-height: 20px; font-family: ${SANS}; font-size: 15px; font-weight: 500; color: ${C.papier}; text-decoration: none; border-radius: ${PILULE};">${cta}</a>
</td></tr></table>
<!--<![endif]-->`,
    bas,
  );
}

/** Un cadre d'encart : fond papier, filet, rayon de bloc. `contenu` est une suite de <tr>. */
export const cadre = (rangees, style = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid ${C.ligne}; border-radius: ${BLOC}; border-collapse: separate;${style}">${rangees}</table>`;

/** Un encart : une étiquette, puis son texte. */
export function encart(lib, contenu, bas = 32) {
  return ligne(
    cadre(`<tr><td style="padding: 22px 24px 0 24px;">${etiquette(lib)}</td></tr>
<tr><td style="padding: 10px 24px 22px 24px; font-family: ${SANS}; font-size: 16px; line-height: 1.6; color: ${C.encre};">${contenu}</td></tr>`),
    bas,
  );
}

/** Deux chiffres côte à côte (pages et prix, pages et date), et une note sous eux. */
export function chiffres(gauche, droite, note, bas = 32) {
  const cellule = (c, bord) => `<td width="50%" align="center" valign="top" style="padding: 28px 12px 24px 12px;${bord}">
<div style="font-family: ${SERIF}; font-size: ${c.grand ? 40 : 26}px; line-height: 1.1; color: ${C.encre};">${c.valeur}</div>
<div style="padding-top: 10px;">${etiquette(c.legende)}</div>
</td>`;
  return ligne(
    cadre(`<tr>${cellule(gauche, "")}${cellule(droite, ` border-left: 1px solid ${C.ligne};`)}</tr>
${
  note
    ? `<tr><td colspan="2" align="center" style="padding: 0 24px 24px 24px; border-top: 1px solid ${C.ligne};">
<p style="margin: 18px 0 0 0; font-family: ${SANS}; font-size: 14px; line-height: 1.6; color: ${C.doux};">${note}</p>
</td></tr>`
    : ""
}`),
    bas,
  );
}

/**
 * Un récapitulatif (docs/marque/STRUCTURE-INFO.md) : libellé à gauche, valeur à droite, un
 * filet entre les lignes. `l.si` rend la ligne conditionnelle (absente vaut mieux qu'à zéro).
 * `l.fort` : la valeur en gras. Rend le TABLEAU, sans cadre ni rangée.
 */
export function recap(lignes) {
  const rangs = lignes.map((l, i) => {
    const bord = i < lignes.length - 1 ? ` border-bottom: 1px solid ${C.ligne};` : "";
    const rang = `<tr><td style="padding: 13px 0;${bord} font-family: ${SANS}; font-size: 14px; line-height: 1.5; color: ${C.doux};">${l.lib}</td>
<td align="right" style="padding: 13px 0 13px 12px;${bord} font-family: ${SANS}; font-size: 14px; line-height: 1.5; color: ${C.encre}; font-weight: ${l.fort ? "bold" : "normal"}; white-space: nowrap;">${l.val}</td></tr>`;
    return l.si ? `{% if params.${l.si} %}${rang}{% endif %}` : rang;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rangs.join("")}</table>`;
}

/** Un récapitulatif dans son cadre, avec une note facultative sous les lignes. */
export const encartRecap = (lignes, note = "", bas = 32) =>
  ligne(
    cadre(`<tr><td style="padding: 4px 24px;">${recap(lignes)}</td></tr>${
      note
        ? `<tr><td style="padding: 0 24px 18px 24px; font-family: ${SANS}; font-size: 13px; line-height: 1.6; color: ${C.doux};">${note}</td></tr>`
        : ""
    }`),
    bas,
  );

/**
 * Du texte CLAIR dans un bloc nuit, protégé de Gmail : sans la double fusion, Gmail assombrit
 * le texte clair sur un fond qu'il laisse noir (fiche N, « Le bloc nuit »).
 */
export const clair = (html) => `<div class="gm-ecran"><div class="gm-diff">${html}</div></div>`;

/** Le bloc nuit (la carte cadeau seulement) : `rangees` est une suite de <tr>. */
export const blocNuit = (rangees, rayon = BLOC) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.nuit}" style="${peint(C.nuit)} border-radius: ${rayon}; border-collapse: separate;">${rangees}</table>`;

/** Une image hébergée (JPEG ou PNG, jamais WebP), à la largeur utile, liée ou non. */
export function image(src, alt, largeur = UTILE, lien = null, bas = 32) {
  const img = `<img src="${src}" width="${largeur}" alt="${alt}" style="display: block; width: 100%; max-width: ${largeur}px; height: auto; border: 0; outline: none; text-decoration: none; margin: 0 auto; border-radius: ${RAYON_IMAGE};" />`;
  return ligne(lien ? `<a href="${lien}" style="display: block; text-decoration: none;">${img}</a>` : img, bas, "center");
}

/** « L'atelier Bellajour », la signature écrite des mails (charte A). */
export const signature = (bas = 40) =>
  ligne(`<p style="margin: 0; font-family: ${SERIF}; font-size: 20px; line-height: 1.3; color: ${C.encre};">L&rsquo;atelier Bellajour</p>`, bas);

/* ─────────────────────────────── la coquille ─────────────────────────────── */

/**
 * Le mail entier. `corps` : les rangées (<tr>) du milieu, dans l'ordre. `mention` : la seconde
 * ligne du pied, propre à chaque famille (adresse de contact, « Une question ? … »).
 * ⚠️ `noel-campagnes.mjs` ajoute le lien de désinscription en cherchant la fin exacte
 * « Une question ? R&eacute;pondez &agrave; ce message.</p> » : la mention se termine le <p>.
 */
export function coquille({ titreHtml, preheader, corps, mention }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${titreHtml}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style type="text/css">
table { border-collapse: collapse; border-spacing: 0; }
td { padding: 0; }
body, table, td, p, a, h1, div { font-family: Helvetica, Arial, sans-serif !important; }
h1 { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
<style type="text/css">
:root { color-scheme: light only; supported-color-schemes: light only; }
body, table, td, p, a, h1 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${C.papier}; }
a { text-decoration: none; }
u + .body .gm-ecran { background: #000000; mix-blend-mode: screen; }
u + .body .gm-diff { background: #000000; mix-blend-mode: difference; }
@media screen and (max-width: 620px) {
  .conteneur { width: 100% !important; max-width: 100% !important; }
  .titre-mail { font-size: 40px !important; }
  .duo { display: block !important; width: 100% !important; padding: 0 0 16px 0 !important; }
  .code-carte { font-size: 16px !important; letter-spacing: 0.5px !important; }
}
</style>
</head>
<body class="body" style="margin: 0; padding: 0; background-color: ${C.papier};">
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.papier}" style="background-color: ${C.papier};">

<tr><td align="center" bgcolor="${C.nuit}" style="${peint(C.nuit)} padding: 28px ${MARGE}px;">
<a href="${SITE}/" style="display: inline-block;"><img src="${LOGO_MAIL}" width="${LOGO_L}" height="${LOGO_H}" alt="Bellajour" style="display: block; width: ${LOGO_L}px; height: auto; border: 0; margin: 0 auto;" /></a>
</td></tr>

<tr><td align="center" style="padding: 0;">
<table role="presentation" class="conteneur" width="${LARGEUR}" cellpadding="0" cellspacing="0" border="0" style="width: ${LARGEUR}px; max-width: ${LARGEUR}px;">

${corps.trimStart().startsWith("<!-- photo-en-tete -->") ? "" : `<tr><td height="48" style="height: 48px; font-size: 0; line-height: 0;">&nbsp;</td></tr>`}
${corps}

<tr><td style="padding: 8px ${MARGE}px 0 ${MARGE}px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="${C.ligne}" style="background-color: ${C.ligne}; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr></table>
</td></tr>
<tr><td align="center" style="padding: 24px ${MARGE}px 8px ${MARGE}px;">
<a href="${INSTAGRAM}" style="font-family: ${SANS}; font-size: 14px; font-weight: 500; color: ${C.encre}; text-decoration: none;">@bellajour__</a>
</td></tr>
<tr><td align="center" style="padding: 0 ${MARGE}px 48px ${MARGE}px;">
<p style="margin: 0; font-family: ${SANS}; font-size: 12px; line-height: 1.7; color: ${C.doux};">Bellajour &middot; Maison d&rsquo;&eacute;dition du souvenir<br />${mention}</p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}
