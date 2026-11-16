/**
 * Les mails de Noël et de la carte cadeau : le TEXTE, versionné.
 *
 *   node scripts/mails-noel.mjs                         # aperçus HTML locaux (.mails-apercus/noel/)
 *   node scripts/mails-noel.mjs --pousser --seulement GC1   # crée / met à jour UN gabarit Brevo
 *
 * ⚠️ `--pousser` écrit chez Brevo : jamais sans l'accord de Mathias (socle,
 * interdit 2). Il n'envoie rien : il dépose des gabarits.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE FORMAT VALIDÉ LE 16/11/2026 (artefact « Mails de Noël »)
 *
 * Même cadre que les mails de l'atelier (fond nuit, logo cuivre, Cormorant,
 * pilule crème, pied @bellajour__), mais en BLOCS :
 *   logo · image (des magazines, ou la carte en HTML) · titre · évocation ·
 *   blocs avec leur lien · un bouton · « À noter » + lien · signature.
 * Un mail court saute des blocs, il n'en invente pas.
 *
 * Choix de Mathias (16/11) : emoji libres, UN « ! » au plus par mail, un seul
 * ton, signature « L'atelier Bellajour ».
 *
 * Les images sont des JPEG hébergés sur le site (Outlook ne lit pas le WebP),
 * fabriquées par `scripts/images-mails-noel.mjs` : chaque couverture y est
 * posée comme un magazine (reliure, tranche, ombre), jamais recadrée.
 * La carte cadeau est en HTML : elle s'affiche même quand Gmail masque les
 * images au premier affichage.
 *
 * RÈGLES DE FORME (vérifiées avant tout aperçu ou poussée) :
 *  1. aucun tiret cadratin ni demi-cadratin ;
 *  2. aucune entité HTML dans l'objet et le préheader (texte brut) ;
 *  3. au plus un « ! » dans le texte visible ;
 *  4. ni « Cliquez ici », ni « Bonne réception », ni « album ».
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = resolve(RACINE, ".mails-apercus/noel");

/** Un lien de mail vise TOUJOURS le vrai site (PR « liens-mails-vrai-site »). */
export const SITE = "https://www.bellajour.fr";
const IMG = `${SITE}/images/mails/noel`;
export const LIENS = {
  offrir: `${SITE}/offrir`,
  conditions: `${SITE}/offrir#conditions`,
  composer: `${SITE}/composer?nouveau=1`,
  compte: `${SITE}/compte`,
};

/* ─────────────────────────── les polices et couleurs ─────────────────────────── */
const SERIF = "'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif";
const SANS = "'DM Sans', Helvetica, Arial, sans-serif";
const P = (n) => `{{ params.${n} }}`;
const SI = (n, oui, non = "") => `{% if params.${n} %}${oui}${non ? `{% else %}${non}` : ""}{% endif %}`;

/* ─────────────────────────────── les blocs ─────────────────────────────── */

const ligne = (contenu, bas = 40, align = "left") =>
  `<tr><td align="${align}" class="px-mobile" style="padding: 0 40px ${bas}px 40px;">${contenu}</td></tr>`;

function image(fichier, alt, largeur = 520) {
  return ligne(
    `<img src="${IMG}/${fichier}" width="${largeur}" alt="${alt}" style="display: block; width: 100%; max-width: ${largeur}px; height: auto; border: 0; outline: none; text-decoration: none; margin: 0 auto;" />`,
    40,
    "center",
  );
}

/**
 * La carte cadeau, en HTML : le même objet que `/carte/<token>` (fond brun
 * dégradé, signature, phrase, montant). `pour` et `bas` sont du HTML déjà
 * conditionnel.
 *
 * Mathias, 16/11, deux retours sur le premier envoi :
 * - « pas visible en mode sombre » : le fond était une COULEUR, que Gmail et
 *   Outlook assombrissent jusqu'à la confondre avec le noir du mail. Il est
 *   maintenant une IMAGE (`carte-fond-1040.jpg`, jamais retouchée par le mode
 *   sombre), la couleur ne sert que de repli, plus claire, et un filet cuivre
 *   dessine le bord quoi qu'il arrive ;
 * - « le prix est collé au titre » : le montant monte en haut, face à la
 *   signature ; la phrase garde toute la largeur.
 */
function carte({ pour, mot = true, bas, montant }) {
  const fond = `${IMG}/carte-fond-1040.jpg`;
  return ligne(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#6e5d4f" background="${fond}" style="background-color: #6e5d4f; background-image: url('${fond}'); background-size: cover; background-position: center; border: 1px solid #a07c64; border-radius: 16px;">
<tr><td style="padding: 24px 26px 0 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" valign="middle"><img src="${IMG}/signature-240.png" width="84" alt="Bellajour" style="display: block; width: 84px; height: auto; border: 0;" /></td>
<td align="right" valign="middle" style="font-family: ${SERIF}; font-size: 34px; line-height: 1; font-weight: 500; color: #f5f0e7; white-space: nowrap;">${montant}</td>
</tr></table>
</td></tr>
<tr><td style="padding: 40px 26px 0 26px; font-family: ${SANS}; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #f0c3a6;">${pour}</td></tr>
<tr><td style="padding: 8px 26px 0 26px; font-family: ${SERIF}; font-size: 30px; line-height: 1.1; color: #f5f0e7;">Vos photos deviennent un magazine.</td></tr>
${mot ? `{% if params.MESSAGE %}<tr><td style="padding: 12px 26px 0 26px; font-family: ${SERIF}; font-style: italic; font-size: 17px; line-height: 1.4; color: #eee6da;">« ${P("MESSAGE")} »</td></tr>{% endif %}` : ""}
<tr><td style="padding: 32px 26px 24px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="left" valign="bottom" style="font-family: ${SANS}; font-size: 12px; color: #e9e1d6;">${bas}</td>
<td align="right" valign="bottom" style="font-family: ${SANS}; font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #e9e1d6; white-space: nowrap;">Carte cadeau</td>
</tr></table>
</td></tr>
</table>`,
  );
}

const titre = (t) =>
  ligne(
    `<h1 class="hero-title" style="margin: 0; font-family: ${SERIF}; font-size: 44px; font-weight: 500; color: #f5f0e7; line-height: 1.06; letter-spacing: -0.01em;">${t}</h1>`,
    22,
  );

const evocation = (t) =>
  ligne(`<p style="margin: 0; font-family: ${SERIF}; font-style: italic; font-size: 21px; line-height: 1.55; color: #c7c2b8;">${t}</p>`);

/** Deux offres côte à côte (empilées au téléphone), chacune avec son lien. */
function duo(a, b) {
  const cellule = (o) => `<td class="duo" width="50%" valign="top" style="padding: 0 7px;">
<a href="${o.lien}" style="text-decoration: none; display: block;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border: 1px solid rgba(255,255,255,0.11); border-radius: 16px;">
<tr><td align="center" style="padding: 16px 16px 0 16px;">${o.visuel}</td></tr>
<tr><td style="padding: 16px 18px 4px 18px; font-family: ${SANS}; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: #928d84;">${o.titre}</td></tr>
<tr><td style="padding: 0 18px 12px 18px; font-family: ${SERIF}; font-size: 18px; line-height: 1.4; color: #e9e4da;">${o.texte}</td></tr>
<tr><td style="padding: 0 18px 20px 18px; font-family: ${SANS}; font-size: 14px; font-weight: 500; color: #d68a63;">${o.libelle} &rarr;</td></tr>
</table>
</a>
</td>`;
  return `<tr><td class="px-mobile-duo" style="padding: 0 33px 40px 33px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cellule(a)}${cellule(b)}</tr></table>
</td></tr>`;
}

/** Une petite carte cadeau pour le bloc « Pour offrir » du duo. */
const miniCarte = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#6e5d4f" background="${IMG}/carte-fond-1040.jpg" style="background-color: #6e5d4f; background-image: url('${IMG}/carte-fond-1040.jpg'); background-size: cover; background-position: center; border: 1px solid #a07c64; border-radius: 10px;">
<tr><td style="padding: 14px 14px 0 14px;"><img src="${IMG}/signature-240.png" width="64" alt="Bellajour" style="display: block; width: 64px; height: auto; border: 0;" /></td></tr>
<tr><td style="padding: 34px 14px 16px 14px; font-family: ${SERIF}; font-size: 19px; line-height: 1.15; color: #f5f0e7;">Vos photos deviennent un magazine.</td></tr>
</table>`;

/**
 * Le code de la carte, à recopier si le bouton ne sert pas. Le libellé AU-DESSUS
 * du code : un prénom de douze lettres plus six signes ne tient pas à côté
 * d'un libellé sur un téléphone.
 */
const codeCarte = () =>
  ligne(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border: 1px dashed #8a5a40; border-radius: 14px;">
<tr><td style="padding: 16px 20px 4px 20px; font-family: ${SANS}; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #928d84;">Votre code</td></tr>
<tr><td style="padding: 0 20px 16px 20px; font-family: ${SANS}; font-size: 19px; font-weight: 500; letter-spacing: 1.5px; color: #f5f0e7;">${P("CODE")}</td></tr>
</table>`);

/**
 * Le récapitulatif (docs/marque/STRUCTURE-INFO.md) : libellé à gauche, valeur
 * à droite. Une ligne peut être conditionnelle (`si`) : absente vaut mieux
 * qu'à zéro.
 */
function recap(lignes) {
  const rangs = lignes.map((l, i) => {
    const bord = i < lignes.length - 1 ? "border-bottom: 1px solid #26262a;" : "";
    const rang = `<tr><td style="padding: 13px 0; ${bord} font-family: ${SANS}; font-size: 14px; color: #928d84;">${l.lib}</td>
<td align="right" style="padding: 13px 0; ${bord} font-family: ${SANS}; font-size: 14px; color: ${l.fort ? "#d68a63" : "#e9e4da"}; font-weight: ${l.fort ? 500 : 400}; white-space: nowrap;">${l.val}</td></tr>`;
    return l.si ? `{% if params.${l.si} %}${rang}{% endif %}` : rang;
  });
  return ligne(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-radius: 16px;">
<tr><td style="padding: 4px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rangs.join("")}</table>
</td></tr></table>`);
}

function bouton(cta, lien) {
  return ligne(
    `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${lien}" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="50%" stroke="f" fillcolor="#f5f0e7"><w:anchorlock/><center style="color:#1a1210;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;">${cta}</center></v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="${lien}" class="btn-cta" style="display: inline-block; padding: 17px 34px; background-color: #f5f0e7; border-radius: 999px; text-decoration: none; font-family: ${SANS}; font-size: 15px; font-weight: 500; color: #1a1210;">${cta}</a>
<!--<![endif]-->`,
    44,
  );
}

/** « À noter » : trois puces au plus, puis un lien vers le détail. */
function aNoter(puces, lien = { href: LIENS.conditions, texte: "Toutes les conditions" }) {
  /* Une puce conditionnelle (SI sans « sinon ») disparaît en entier, sa
     ligne comprise : sinon il resterait un point orphelin. */
  const items = puces
    .map((p) => {
      const cond = p.match(/^\{% if params\.([A-Z_]+) %\}((?:(?!\{% else %\})[\s\S])*)\{% endif %\}$/);
      const texte = cond ? cond[2] : p;
      const rang = `<tr><td valign="top" width="16" style="padding: 0 0 8px 0; font-family: ${SANS}; font-size: 14px; line-height: 1.6; color: #d68a63;">&middot;</td>
<td style="padding: 0 0 8px 0; font-family: ${SANS}; font-size: 14px; line-height: 1.6; color: #a9a49b;">${texte}</td></tr>`;
      return cond ? `{% if params.${cond[1]} %}${rang}{% endif %}` : rang;
    })
    .join("");
  return ligne(`<div style="font-family: ${SANS}; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84; padding-bottom: 12px;">À noter</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
${lien ? `<p style="margin: 6px 0 0 0; font-family: ${SANS}; font-size: 14px;"><a href="${lien.href}" style="color: #d68a63; text-decoration: none;">${lien.texte} &rarr;</a></p>` : ""}`);
}

const signature = () =>
  ligne(
    `<p style="margin: 0; font-family: ${SERIF}; font-style: italic; font-size: 20px; color: #e9e4da;">L&rsquo;atelier Bellajour</p>`,
    48,
  );

/* ─────────────────────────────── le cadre ─────────────────────────────── */

export function maquette(mail) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${mail.sujet}</title>
<!--[if mso]>
<style type="text/css">
table { border-collapse: collapse; border-spacing: 0; }
td { padding: 0; }
body, table, td, p, a, h1 { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
<style type="text/css">
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@400;500&display=swap');
body, table, td, p, a, h1 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
a { text-decoration: none; }
.btn-cta:hover { background-color: #ffffff !important; }
@media screen and (max-width: 620px) {
  .container { width: 100% !important; max-width: 100% !important; }
  .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
  .px-mobile-duo { padding-left: 17px !important; padding-right: 17px !important; }
  .duo { display: block !important; width: 100% !important; padding-bottom: 14px !important; }
  .hero-title { font-size: 36px !important; line-height: 1.08 !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #070708;">
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${mail.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070708" style="background-color: #070708;">
<tr><td align="center" style="padding: 48px 12px 56px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px;">

<tr><td align="center" class="px-mobile" style="padding: 0 40px 26px 40px;">
<a href="${SITE}/"><img src="${SITE}/logo-mail-cuivre.png" width="150" alt="Bellajour" style="display: block; width: 150px; max-width: 150px; height: auto; border: 0; margin: 0 auto;" /></a>
</td></tr>
<tr><td align="center" style="padding: 0 40px 40px 40px;">
<table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#d68a63" style="background-color: #d68a63; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr></table>
</td></tr>

${mail.blocs.join("\n")}

<tr><td align="center" style="padding: 0 40px 24px 40px;">
<table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#26262a" style="background-color: #26262a; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr></table>
</td></tr>
<tr><td align="center" class="px-mobile" style="padding: 0 40px 10px 40px;">
<a href="https://www.instagram.com/bellajour__/" style="font-family: ${SANS}; font-size: 14px; color: #c7c2b8; text-decoration: none;">@bellajour__</a>
</td></tr>
<tr><td align="center" class="px-mobile" style="padding: 0 40px 0 40px;">
<p style="margin: 0; font-family: ${SANS}; font-size: 12px; color: #928d84; line-height: 1.7;">Bellajour &middot; Maison d&rsquo;&eacute;dition du souvenir<br />Une question ? R&eacute;pondez &agrave; ce message.</p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}

/* ─────────────────────────────── les mails ─────────────────────────────── */

const vous = (code) => SI("PRENOM", `${P("PRENOM")}, ${code}`, code.charAt(0).toUpperCase() + code.slice(1));
const DEST = P("PRENOM_DEST");
const DON = P("PRENOM_DONATEUR");
const MONTANT = `${P("MONTANT")}&nbsp;€`;

/** La carte vue par l'acheteur et par le destinataire (même objet). */
const carteDe = () =>
  carte({
    pour: `Pour ${DEST}`,
    bas: SI("PRENOM_DONATEUR", `De la part de ${DON}`, `Jusqu&rsquo;au ${P("DATE")}`),
    montant: MONTANT,
  });

export const MAILS = [
  /* ── Campagnes : envoyées à la main par scripts/noel-campagne.ts ── */
  {
    code: "N1",
    nom: "Noël N1 · Pour offrir, avant Noël",
    quand: "campagne, semaine du 23/11 (date à valider)",
    a: "fondateurs",
    sujet: "Pour offrir, avant Noël 🎄",
    preheader: "Une carte cadeau, et votre magazine pour les fêtes.",
    liens: [LIENS.offrir, LIENS.composer, LIENS.conditions],
    blocs: [
      image("magazines-table-1040.jpg", "Des magazines Bellajour posés sur une table"),
      titre("Un premier Noël."),
      evocation(
        `${vous("vous faites partie des premiers à nous avoir confié vos photos.")} Merci. Bellajour grandit, et pour son premier Noël, nous avons pensé à vous.`,
      ),
      duo(
        {
          lien: LIENS.offrir,
          visuel: miniCarte,
          titre: "Pour offrir",
          texte: "Votre sœur rêve de garder son dernier voyage ? Offrez-lui le magazine. Elle choisit ses photos, quand elle veut.",
          libelle: "Offrir une carte",
        },
        {
          lien: LIENS.composer,
          visuel: `<img src="${IMG}/lisbonne-480.jpg" width="240" alt="Le magazine Lisbonne" style="display: block; width: 100%; max-width: 240px; height: auto; border: 0;" />`,
          titre: "Pour vous",
          texte: "Votre magazine sous le sapin, et un deuxième dans le même colis, à prix doux.",
          libelle: "Composer le mien",
        },
      ),
      bouton("Offrir une carte", LIENS.offrir),
      aNoter([
        "Photos reçues avant le lundi 7 décembre : livré avant Noël.",
        "2ᵉ exemplaire : −40 % même couverture, −20 % autre couverture, en France.",
        "La carte est valable 12 mois.",
      ]),
      signature(),
    ],
  },
  {
    code: "N2",
    nom: "Noël N2 · Plus qu'un week-end",
    quand: "campagne, vendredi 4/12",
    a: "fondateurs",
    sujet: "Dernier jour garanti : lundi",
    preheader: "Le 7 décembre, nous fermons les dépôts.",
    liens: [LIENS.composer, LIENS.offrir],
    blocs: [
      image("aussie-1040.jpg", "Le magazine Aussie, une ville la nuit en couverture"),
      titre("Plus qu&rsquo;un week-end."),
      evocation(
        `${vous("lundi 7 décembre, nous fermons les dépôts pour Noël.")}${SI("PLACES", ` Il reste ${P("PLACES")} places.`)} Vos photos du week-end ont encore le temps d&rsquo;y entrer.`,
      ),
      bouton("Confier mes photos", LIENS.composer),
      aNoter(["Après lundi, la carte cadeau part encore par e-mail, jusqu&rsquo;au 24 décembre."], {
        href: LIENS.offrir,
        texte: "Offrir une carte",
      }),
      signature(),
    ],
  },
  {
    code: "N3",
    nom: "Noël N3 · Pas trop tard pour l'offrir",
    quand: "campagne, mardi 8/12 (date à valider)",
    a: "fondateurs",
    sujet: "Trop tard pour le magazine, pas pour l'offrir",
    preheader: "La carte cadeau part par e-mail, le jour de votre choix.",
    liens: [LIENS.offrir, LIENS.conditions],
    blocs: [
      image("trois-numeros-1040.jpg", "Trois magazines Bellajour en éventail"),
      titre("Pas trop tard."),
      evocation(
        `${vous("les dépôts pour Noël sont fermés.")} La carte cadeau, elle, part encore : par e-mail le jour que vous choisissez, ou à imprimer ce soir.`,
      ),
      bouton("Offrir une carte", LIENS.offrir),
      aNoter([
        "Envoi programmé jusqu&rsquo;au 24 décembre au matin.",
        "30 €, 50 € ou le montant de votre choix.",
        "La carte est valable 12 mois.",
      ]),
      signature(),
    ],
  },
  {
    code: "N4",
    nom: "Noël N4 · La carte part encore",
    quand: "campagne, lundi 21/12 (date à valider)",
    a: "fondateurs",
    sujet: "La carte cadeau part encore 🎁",
    preheader: "Achetée aujourd'hui, reçue aujourd'hui. Ou le 24 au matin.",
    liens: [LIENS.offrir, LIENS.conditions],
    blocs: [
      carte({ pour: "À offrir", mot: false, bas: "Valable 12 mois", montant: "30&nbsp;€ ou 50&nbsp;€" }),
      titre("Il est encore temps."),
      evocation(
        `${vous("une carte achetée maintenant arrive tout de suite par e-mail.")} Ou le 24 décembre au matin, si vous préférez la surprise.`,
      ),
      bouton("Offrir une carte", LIENS.offrir),
      aNoter([
        "Dernier envoi programmé : le 24 décembre au matin.",
        "À imprimer : elle est prête dès le paiement.",
      ]),
      signature(),
    ],
  },

  /* ── Carte cadeau : automatiques (src/lib/atelier/carteServeur.ts) ── */
  {
    code: "GC1",
    nom: "Carte GC1 · acheteur, carte envoyée ou à imprimer",
    quand: "au paiement, envoi immédiat ou à imprimer",
    a: "acheteur",
    sujet: "Votre carte cadeau Bellajour",
    preheader: `${SI("EMAIL_DEST", `Elle est partie chez ${DEST}.`, "Prête à imprimer.")}`,
    liens: ["LIEN_CARTE", "LIEN_RECU", LIENS.conditions],
    blocs: [
      carteDe(),
      titre(SI("EMAIL_DEST", "Elle est partie.", "Elle est prête.")),
      evocation(
        SI(
          "EMAIL_DEST",
          `${vous(`votre carte vient de partir chez ${DEST}.`)} Nous la lui avons envoyée par e-mail, avec son code.`,
          `${vous(`votre carte pour ${DEST} est prête.`)} Imprimez-la et glissez-la sous le sapin.`,
        ),
      ),
      recap([
        { lib: "Pour", val: DEST },
        { lib: "Envoyée à", val: P("EMAIL_DEST"), si: "EMAIL_DEST" },
        { lib: "Montant", val: MONTANT },
        { lib: "Code", val: P("CODE") },
        { lib: "Valable jusqu&rsquo;au", val: P("DATE") },
        { lib: "Reçu de paiement", val: `<a href="${P("LIEN_RECU")}" style="color: #d68a63; text-decoration: none;">Le voir &rarr;</a>` },
      ]),
      bouton("Voir et imprimer la carte", P("LIEN_CARTE")),
      aNoter([
        SI("EMAIL_DEST", "Une faute dans l&rsquo;adresse ? Répondez à ce message, nous la renvoyons."),
        "Si le magazine coûte moins, le reste attend sur son compte Bellajour.",
        SI("DATE_NOEL", `Pour Noël, ses photos doivent arriver avant le ${P("DATE_NOEL")}.`),
      ]),
      signature(),
    ],
  },
  {
    code: "GC1b",
    nom: "Carte GC1b · acheteur, envoi programmé",
    quand: "au paiement d'une carte programmée",
    a: "acheteur",
    sujet: `Votre carte partira le ${P("DATE_ENVOI")}`,
    preheader: `Nous l'envoyons à ${DEST} au matin.`,
    liens: ["LIEN_CARTE", "LIEN_RECU", LIENS.conditions],
    blocs: [
      carteDe(),
      titre(`Elle partira le ${P("DATE_ENVOI")}.`),
      evocation(
        `${vous(`votre carte pour ${DEST} est prête.`)} Nous la lui envoyons le ${P("DATE_ENVOI")} au matin. D&rsquo;ici là, elle reste une surprise.`,
      ),
      recap([
        { lib: "Pour", val: DEST },
        { lib: "Envoyée à", val: P("EMAIL_DEST") },
        { lib: "Le", val: `${P("DATE_ENVOI")} au matin`, fort: true },
        { lib: "Montant", val: MONTANT },
        { lib: "Code", val: P("CODE") },
        { lib: "Reçu de paiement", val: `<a href="${P("LIEN_RECU")}" style="color: #d68a63; text-decoration: none;">Le voir &rarr;</a>` },
      ]),
      bouton("Voir et imprimer la carte", P("LIEN_CARTE")),
      aNoter([
        `Une faute dans l&rsquo;adresse ? Répondez à ce message avant le ${P("DATE_ENVOI")}.`,
        `Valable jusqu&rsquo;au ${P("DATE")}.`,
        "Le jour du départ, nous vous prévenons.",
      ]),
      signature(),
    ],
  },
  {
    code: "GC2",
    nom: "Carte GC2 · destinataire",
    quand: "au paiement, ou le matin du jour choisi",
    a: "destinataire",
    sujet: `Un cadeau pour vous, ${DEST} 🎁`,
    preheader: "Votre code est à l'intérieur.",
    liens: ["LIEN_COMPOSER", LIENS.conditions],
    blocs: [
      carteDe(),
      titre(SI("PRENOM_DONATEUR", `Un cadeau de ${DON}.`, "Un cadeau pour vous.")),
      evocation(
        `${DEST}, ${SI("PRENOM_DONATEUR", `${DON} vous offre`, "voici")} un magazine composé avec vos photos. Un voyage, une année, un été : vous choisissez, nous composons.`,
      ),
      codeCarte(),
      bouton("Choisir mes photos", P("LIEN_COMPOSER")),
      aNoter([
        "Le bouton applique le code tout seul.",
        `Valable jusqu&rsquo;au ${P("DATE")}.`,
        "Si le magazine coûte moins, le reste vous attend sur votre compte.",
      ]),
      signature(),
    ],
  },
  {
    code: "GC2b",
    nom: "Carte GC2b · acheteur, la carte programmée est partie",
    quand: "au départ d'une carte programmée",
    a: "acheteur",
    sujet: `${DEST} a reçu votre carte`,
    preheader: "Elle est partie ce matin.",
    liens: ["LIEN_CARTE"],
    blocs: [
      titre("Elle est arrivée."),
      evocation(`${vous(`votre carte est partie ce matin chez ${DEST}, à ${P("EMAIL_DEST")}.`)} La suite lui appartient.`),
      bouton("Revoir la carte", P("LIEN_CARTE")),
      signature(),
    ],
  },
  {
    code: "GC4",
    nom: "Carte GC4 · destinataire, carte jamais utilisée, 30 jours avant la fin",
    quand: "30 jours avant la fin de validité, carte jamais utilisée",
    a: "destinataire",
    sujet: `Votre carte cadeau vous attend jusqu'au ${P("DATE")}`,
    preheader: "Un été, une année, un voyage ?",
    liens: ["LIEN_COMPOSER", LIENS.conditions],
    blocs: [
      carteDe(),
      titre("Votre carte vous attend."),
      evocation(
        `${DEST}, votre carte de ${MONTANT} est valable jusqu&rsquo;au ${P("DATE")}. Un été, une année, un voyage : il est encore temps de le raconter.`,
      ),
      codeCarte(),
      bouton("Choisir mes photos", P("LIEN_COMPOSER")),
      aNoter(["Le bouton applique le code tout seul.", `Valable jusqu&rsquo;au ${P("DATE")}.`]),
      signature(),
    ],
  },
  {
    code: "GC4b",
    nom: "Carte GC4b · crédit restant, 30 jours avant la fin",
    quand: "30 jours avant la fin du crédit laissé par une carte",
    a: "titulaire du compte",
    sujet: `Encore ${P("RELIQUAT")} € pour vous`,
    preheader: `Ils vous attendent jusqu'au ${P("DATE")}.`,
    liens: [LIENS.composer, LIENS.compte],
    blocs: [
      titre(`Encore ${P("RELIQUAT")}&nbsp;€ pour vous.`),
      evocation(
        `${vous("un été, une année, un nouveau voyage ?")} Il vous reste ${P("RELIQUAT")}&nbsp;€ pour le raconter, jusqu&rsquo;au ${P("DATE")}.`,
      ),
      bouton("Composer un numéro", LIENS.composer),
      aNoter(
        [
          "Ils se déduisent tout seuls au prochain numéro.",
          "Avec la même adresse e-mail que ce message.",
        ],
        { href: LIENS.compte, texte: "Voir mon compte" },
      ),
      signature(),
    ],
  },
  {
    code: "GC5",
    nom: "Carte GC5 · acheteur, carte remboursée",
    quand: "au remboursement",
    a: "acheteur",
    sujet: "Votre carte cadeau est remboursée",
    preheader: `Les ${P("MONTANT")} € reviennent sur votre moyen de paiement.`,
    liens: [],
    blocs: [
      titre("C&rsquo;est remboursé."),
      evocation(
        `${vous(`les ${MONTANT} de la carte pour ${DEST} reviennent sur votre moyen de paiement.`)} Le code ${P("CODE")} ne fonctionne plus.`,
      ),
      aNoter(["Le délai d&rsquo;apparition dépend de votre banque."], null),
      signature(),
    ],
  },
  {
    code: "GC6",
    nom: "Carte GC6 · destinataire, vos photos des fêtes",
    quand: "mi-janvier, carte jamais utilisée",
    a: "destinataire",
    sujet: "Vos photos des fêtes ?",
    preheader: `Votre carte de ${P("MONTANT")} € attend toujours.`,
    liens: ["LIEN_COMPOSER", LIENS.conditions],
    blocs: [
      image("trois-numeros-1040.jpg", "Trois magazines Bellajour en éventail"),
      titre("Vos photos des fêtes ?"),
      evocation(
        `${DEST}, les fêtes sont passées, les photos sont dans votre téléphone. Votre carte de ${MONTANT} attend toujours : un Noël, un voyage, une année.`,
      ),
      codeCarte(),
      bouton("Choisir mes photos", P("LIEN_COMPOSER")),
      aNoter(["Le bouton applique le code tout seul.", `Valable jusqu&rsquo;au ${P("DATE")}.`]),
      signature(),
    ],
  },
  {
    code: "GC7",
    nom: "Carte GC7 · acheteur, le cadeau a servi",
    quand: "quand le destinataire paie son numéro avec la carte",
    a: "acheteur",
    sujet: `${DEST} compose son magazine`,
    preheader: "Votre carte vient d'offrir un numéro.",
    liens: [LIENS.offrir],
    blocs: [
      image("trois-numeros-1040.jpg", "Trois magazines Bellajour en éventail"),
      titre(`${DEST} a choisi ses photos.`),
      evocation(`${vous(`votre carte vient d&rsquo;offrir un magazine à ${DEST}.`)} L&rsquo;atelier le compose en ce moment. Merci pour ce cadeau.`),
      bouton("Offrir une autre carte", LIENS.offrir),
      signature(),
    ],
  },
];

/* ─────────────────────────── le garde-fou de forme ─────────────────────────── */

/** Le texte que le lecteur voit : sans balises, commentaires, ni syntaxe Brevo. */
export function texteVisible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(style|title|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/\{%[\s\S]*?%\}/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ");
}

export function verifierForme(mail) {
  const fautes = [];
  const html = maquette(mail);
  const visible = `${mail.sujet} ${mail.preheader} ${texteVisible(html)}`;
  if (/[—–]/.test(visible)) fautes.push("contient un tiret cadratin ou demi-cadratin");
  for (const champ of ["sujet", "preheader"]) {
    const e = mail[champ].match(/&[a-zA-Z]+;|&#\d+;/);
    if (e) fautes.push(`${champ} contient l'entité HTML ${e[0]}`);
  }
  /* Le « ! » se compte dans ce qui se LIT ; une conditionnelle Brevo à deux
     branches n'en montre qu'une, on compte donc large (les deux). */
  const exclamations = (visible.match(/!/g) ?? []).length;
  if (exclamations > 1) fautes.push(`${exclamations} « ! » (un au plus)`);
  if (/cliquez ici/i.test(visible)) fautes.push("« Cliquez ici » interdit");
  if (/bonne r[ée]ception/i.test(visible)) fautes.push("« Bonne réception » interdit");
  if (/\balbums?\b/i.test(visible)) fautes.push("« album » interdit : on dit magazine");
  const ouvertes = (html.match(/\{% if /g) ?? []).length;
  const fermees = (html.match(/\{% endif %\}/g) ?? []).length;
  if (ouvertes !== fermees) fautes.push(`conditionnelles déséquilibrées (${ouvertes} if, ${fermees} endif)`);
  return fautes;
}

/* ─────────────────────────────── aperçus ─────────────────────────────── */

/** Valeurs d'exemple : Léa offre 50 € à Camille. Rien de ceci ne part. */
export const EXEMPLE = {
  PRENOM: "Léa",
  PRENOM_DONATEUR: "Léa",
  PRENOM_DEST: "Camille",
  EMAIL_DEST: "camille@exemple.fr",
  MONTANT: "50",
  CODE: "CAMILLE-NOEL-4821",
  MESSAGE: "Pour nos étés à Noosa.",
  DATE_ENVOI: "24 décembre",
  DATE: "16 novembre 2027",
  DATE_NOEL: "lundi 7 décembre",
  RELIQUAT: "12",
  PLACES: "6",
  LIEN_CARTE: `${SITE}/carte/exemple`,
  LIEN_RECU: `${SITE}/api/cartes/recu/exemple`,
  LIEN_COMPOSER: `${SITE}/composer?nouveau=1&carte=CAMILLE-NOEL-4821`,
};

/**
 * Un rendu « à la Brevo » pour les aperçus : remplace les variables et
 * résout les `{% if %}` / `{% else %}` (sans imbrication, ce que ces
 * gabarits n'utilisent pas). Sert aussi au harnais : il vérifie qu'aucune
 * accolade ne survit au rendu.
 */
export function rendre(html, valeurs) {
  let sortie = html;
  const re = /\{% if params\.([A-Z_]+) %\}((?:(?!\{% if )[\s\S])*?)\{% endif %\}/;
  for (let m = sortie.match(re); m; m = sortie.match(re)) {
    const [oui, non = ""] = m[2].split("{% else %}");
    sortie = sortie.replace(m[0], valeurs[m[1]] ? oui : non);
  }
  return sortie.replace(/\{\{\s*params\.([A-Z_]+)\s*\}\}/g, (t, cle) => valeurs[cle] ?? "");
}

/* ─────────────────────────────── exécution ─────────────────────────────── */

function sansGuillemets(v) {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

async function main() {
  let fautes = 0;
  for (const mail of MAILS) {
    const f = verifierForme(mail);
    if (f.length) {
      console.error(`  ✗ ${mail.code} : ${f.join(", ")}`);
      fautes += f.length;
    }
  }
  if (fautes) {
    console.error(`\n${fautes} faute(s) de forme. Rien n'est écrit.`);
    process.exit(1);
  }
  console.log(`Forme vérifiée : ${MAILS.length} mails.`);

  /* Les images ne sont en ligne qu'après la fusion : l'aperçu local lit les
     fichiers du dépôt, ce qui part chez Brevo garde l'adresse du site. */
  const local = (html) => html.split(IMG).join(pathToFileURL(resolve(RACINE, "public/images/mails/noel")).href);
  mkdirSync(SORTIE, { recursive: true });
  for (const mail of MAILS) {
    writeFileSync(resolve(SORTIE, `${mail.code}.html`), local(rendre(maquette(mail), EXEMPLE)), "utf8");
    // Les variantes à lire à l'oeil : GC1 à imprimer, GC2 sans prénom de l'acheteur.
    if (mail.code === "GC1") {
      writeFileSync(resolve(SORTIE, "GC1-imprimer.html"), local(rendre(maquette(mail), { ...EXEMPLE, EMAIL_DEST: "" })), "utf8");
    }
    if (mail.code === "GC2") {
      writeFileSync(resolve(SORTIE, "GC2-sans-prenom.html"), local(rendre(maquette(mail), { ...EXEMPLE, PRENOM_DONATEUR: "" })), "utf8");
    }
  }
  console.log(`Aperçus écrits dans .mails-apercus/noel/ (valeurs d'exemple).`);

  if (!process.argv.includes("--pousser")) {
    console.log("Rien n'a été envoyé à Brevo.");
    return;
  }

  const i = process.argv.indexOf("--seulement");
  const seulement = i === -1 ? null : new Set((process.argv[i + 1] ?? "").split(",").map((c) => c.trim()).filter(Boolean));
  if (!seulement?.size) {
    console.error("--pousser exige --seulement <CODE[,CODE]> : on ne réécrit jamais tous les gabarits d'un coup.");
    process.exit(1);
  }
  const inconnus = [...seulement].filter((c) => !MAILS.some((m) => m.code === c));
  if (inconnus.length) {
    console.error(`Code inconnu : ${inconnus.join(", ")}`);
    process.exit(1);
  }

  const env = readFileSync(resolve(RACINE, ".env.local"), "utf8");
  const cleM = env.match(/^BREVO_API_KEY=(.*)$/m);
  if (!cleM) throw new Error("BREVO_API_KEY absente de .env.local");
  const cle = sansGuillemets(cleM[1]);
  const idConnu = (code) => env.match(new RegExp(`^BREVO_TEMPLATE_${code.toUpperCase()}_ID=(.*)$`, "m"))?.[1]?.trim() || null;

  for (const mail of MAILS.filter((m) => seulement.has(m.code))) {
    const existant = idConnu(mail.code);
    const r = await fetch(existant ? `https://api.brevo.com/v3/smtp/templates/${existant}` : "https://api.brevo.com/v3/smtp/templates", {
      method: existant ? "PUT" : "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        templateName: mail.nom,
        subject: mail.sujet,
        sender: { name: "Bellajour", email: "contact@bellajour.com" },
        replyTo: "contact@bellajour.com",
        tag: mail.code.startsWith("N") ? "noel" : "carte",
        htmlContent: maquette(mail),
        isActive: true,
      }),
    });
    const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(`  ✗ ${mail.code} : ${r.status} ${JSON.stringify(data)}`);
      continue;
    }
    console.log(`  ${existant ? "↻" : "✓"} ${mail.code} : BREVO_TEMPLATE_${mail.code.toUpperCase()}_ID=${existant ?? data.id}`);
  }
}

// Importable par le harnais sans rien lancer.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
