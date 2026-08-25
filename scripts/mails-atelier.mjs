/**
 * Les mails de l'atelier — le TEXTE, versionné.
 *
 *   node scripts/mails-atelier.mjs            # écrit les aperçus HTML en local
 *   node scripts/mails-atelier.mjs --pousser  # crée/met à jour les templates Brevo
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI LE TEXTE VIT ICI ET PAS SEULEMENT DANS BREVO
 *
 * Un mail est du produit. Sa formulation se relit, se discute et se corrige
 * comme le reste — or dans l'interface de Brevo, personne ne voit ce qui a
 * changé, ni quand, ni pourquoi. Ici, une phrase modifiée apparaît dans un
 * diff, et la maquette HTML n'est écrite qu'UNE fois pour les sept.
 *
 * Brevo reste la source de vérité de ce qui PART : ce script y pousse, il
 * n'invente pas un second circuit d'envoi.
 *
 * ── RÈGLES DE FORME, NON NÉGOCIABLES ─────────────────────────────────────
 * 1. AUCUN TIRET CADRATIN ni demi-cadratin dans les textes. Consigne
 *    explicite de Mathias, vérifiée par le script avant tout envoi.
 * 2. Aucune image dans le corps (PRD §10) : une phrase, un bouton. Ça passe
 *    les filtres, ça s'ouvre en une seconde, et ça envoie sur la page où
 *    tout est beau. Seul le logo, hébergé sur le site, fait exception.
 * 3. Vouvoiement chaleureux. Jamais « Cliquez ici », jamais « Bonne
 *    réception ». Le ton d'un magazine, pas d'un SaaS.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const SORTIE = resolve(RACINE, ".mails-apercus");

/* ─────────────────────────── la maquette ─────────────────────────── */
/* Reprise à l'identique du template 28 (M3), déjà validé en production sur
   Gmail, Apple Mail et Outlook. On ne la redessine pas : on la remplit. */

const bloc = (contenu, padBas = 44) =>
  `<tr><td align="left" class="px-mobile" style="padding: 0 40px ${padBas}px 40px;">${contenu}</td></tr>`;

/** La carte à deux chiffres (pages / prix, ou transporteur / date). */
function carteChiffres(gauche, droite, note) {
  const cellule = (c, bord) =>
    `<td width="50%" align="center" valign="middle" style="padding: 34px 16px;${bord}">
<div style="font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-size: ${
      c.grand ? 54 : 30
    }px; font-weight: 500; color: #d68a63; line-height: 1.1;">${c.valeur}</div>
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84; font-weight: 500; padding-top: 12px;">${c.legende}</div>
</td>`;

  return `<tr><td align="center" class="px-mobile" style="padding: 0 40px 46px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border: 1px solid rgba(255,255,255,0.11); border-radius: 18px;">
<tr>${cellule(gauche, "")}${cellule(droite, " border-left: 1px solid rgba(255,255,255,0.11);")}</tr>
${
  note
    ? `<tr><td colspan="2" align="center" style="padding: 0 26px 30px 26px;">
<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.7; color: #928d84;">${note}</p>
</td></tr>`
    : ""
}</table>
</td></tr>`;
}

function maquette({ titreHtml, preheader, h1, sous, carte, cta, lien, pied }) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${titreHtml}</title>
<!--[if mso]>
<style type="text/css">
table { border-collapse: collapse; border-spacing: 0; }
td { padding: 0; }
body, table, td, p, a, h1 { font-family: Georgia, 'Times New Roman', serif !important; }
</style>
<![endif]-->
<style type="text/css">
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500&display=swap');
body, table, td, p, a, h1 { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
a { text-decoration: none; }
.btn-cta:hover { background-color: #ffffff !important; }
@media screen and (max-width: 620px) {
  .container { width: 100% !important; max-width: 100% !important; }
  .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
  .hero-title { font-size: 38px !important; line-height: 1.08 !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #070708;">
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#070708" style="background-color: #070708;">
<tr><td align="center" style="padding: 56px 12px 60px 12px;">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px;">

<tr><td align="center" class="px-mobile" style="padding: 0 40px 30px 40px;">
<a href="https://www.bellajour.fr/"><img src="https://www.bellajour.fr/logo-mail-blanc.png" width="170" alt="Bellajour" style="display: block; width: 170px; max-width: 170px; height: auto; border: 0; margin: 0 auto;" /></a>
</td></tr>

<tr><td align="center" style="padding: 0 40px 54px 40px;">
<table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#d68a63" style="background-color: #d68a63; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr></table>
</td></tr>

${bloc(
  `<h1 class="hero-title" style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-size: 46px; font-weight: 500; color: #f5f0e7; line-height: 1.06; letter-spacing: -0.01em;">${h1}</h1>`,
  26,
)}

${bloc(
  `<p style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 21px; line-height: 1.55; color: #c7c2b8;">${sous}</p>`,
)}

${carte ?? ""}

${bloc(
  `<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${lien}" style="height:54px;v-text-anchor:middle;width:300px;" arcsize="50%" stroke="f" fillcolor="#f5f0e7"><w:anchorlock/><center style="color:#1a1210;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:500;">${cta}</center></v:roundrect>
<![endif]-->
<!--[if !mso]><!-- -->
<a href="${lien}" class="btn-cta" style="display: inline-block; padding: 17px 34px; background-color: #f5f0e7; border-radius: 999px; text-decoration: none; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 500; color: #1a1210;">${cta}</a>
<!--<![endif]-->`,
)}

${bloc(
  `<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #928d84;">${pied}</p>`,
  56,
)}

<tr><td align="center" style="padding: 0 40px 26px 40px;">
<table role="presentation" width="52" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#26262a" style="background-color: #26262a; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</td></tr></table>
</td></tr>

<tr><td align="center" class="px-mobile" style="padding: 0 40px 10px 40px;">
<a href="https://www.instagram.com/bellajour__/" style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 14px; color: #c7c2b8; text-decoration: none;">@bellajour__</a>
</td></tr>

<tr><td align="center" class="px-mobile" style="padding: 0 40px 0 40px;">
<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 12px; color: #928d84; line-height: 1.7;">Bellajour &middot; Maison d&rsquo;&eacute;dition du souvenir<br />contact@bellajour.com</p>
</td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}

const LIEN = "{{ params.LIEN }}";
const PRENOM = "{{ params.PRENOM }}";
const TITRE = "{{ params.TITRE }}";

/* ─────────────────────────── les sept mails ─────────────────────────── */

export const MAILS = [
  {
    code: "M2",
    nom: "M2 · Atelier · Il manque les photos",
    sujet: `Il manque les photos de ${TITRE}`,
    preheader: "Votre numéro est ouvert, son dossier est encore vide.",
    titreHtml: "Il manque vos photos",
    h1: "Il manque<br />vos photos.",
    sous: `${PRENOM}, votre numéro est ouvert et il porte déjà son titre. Il ne lui manque que la matière : vos photos. Quelques minutes suffisent, et vous pouvez vous arrêter puis reprendre.`,
    cta: "Déposer mes photos",
    lien: LIEN,
    pied: "Une hésitation avant de vous lancer ? Répondez à ce message, nous vous répondrons nous-mêmes.",
  },
  {
    code: "M3b",
    nom: "M3b · Atelier · Votre numéro vous attend",
    sujet: `${TITRE} vous attend`,
    preheader: "Votre couverture est prête depuis quelques jours.",
    titreHtml: "Votre numéro vous attend",
    h1: "Votre numéro<br />vous attend.",
    sous: `${PRENOM}, votre couverture est prête depuis quelques jours. Elle vous attend exactement là où vous l’avez laissée, avec sa pagination et son prix.`,
    carte: carteChiffres(
      { valeur: "{{ params.NB_PAGES }}", legende: "pages", grand: true },
      { valeur: "{{ params.PRIX }}&nbsp;&euro;", legende: "tout compris", grand: true },
      "Impression et livraison comprises. Chez vous sous 10 jours après validation.",
    ),
    cta: "Revoir ma couverture",
    lien: LIEN,
    pied: "Un détail à changer avant de vous décider ? Répondez à ce message, on ajuste sans frais.",
  },
  {
    code: "M5",
    nom: "M5 · Atelier · La maquette complète",
    sujet: `${TITRE}, la maquette complète`,
    preheader: "Chaque page est en place. Prenez le temps de le feuilleter.",
    titreHtml: "Votre numéro est composé",
    h1: "Votre numéro<br />est composé.",
    sous: `${PRENOM}, chaque page est en place. Prenez le temps de le feuilleter, page après page, et dites-nous si tout vous va.`,
    carte: carteChiffres(
      { valeur: "{{ params.NB_PAGES }}", legende: "pages composées", grand: true },
      { valeur: "{{ params.DATE_LIMITE }}", legende: "date limite", grand: false },
      "Une correction à demander ? Écrivez-la directement dans le document, nous repassons dessus.",
    ),
    cta: "Voir ma maquette",
    lien: LIEN,
    pied: "Sans réponse de votre part d’ici le {{ params.DATE_LIMITE }}, nous lançons l’impression telle quelle.",
  },
  {
    code: "M6",
    nom: "M6 · Atelier · Départ à l'impression",
    sujet: `${TITRE} part à l’impression`,
    preheader: "Votre numéro est entre les mains de l'imprimeur.",
    titreHtml: "Départ à l'impression",
    h1: "C’est parti<br />à l’impression.",
    sous: `${PRENOM}, votre numéro a quitté l’atelier pour l’imprimeur. À partir de maintenant, plus rien ne peut être modifié : c’est ce qui garantit qu’il arrivera exactement tel que vous l’avez validé.`,
    cta: "Suivre mon numéro",
    lien: LIEN,
    pied: "Comptez une dizaine de jours avant de l’avoir entre les mains. Nous vous écrivons dès qu’il part.",
  },
  {
    code: "M7",
    nom: "M7 · Atelier · Votre numéro est en route",
    sujet: `${TITRE} est en route`,
    preheader: "Il a quitté l'atelier.",
    titreHtml: "Votre numéro est en route",
    h1: "Votre numéro<br />est en route.",
    sous: `${PRENOM}, il est parti. Confié à {{ params.TRANSPORTEUR }}, il voyage vers l’adresse que vous nous avez donnée.`,
    cta: "Suivre mon numéro",
    lien: LIEN,
    pied: "Le suivi se met à jour sur votre page, au fil des jours.",
  },
  {
    code: "M8",
    nom: "M8 · Atelier · Le prochain moment",
    sujet: "Le prochain moment ?",
    preheader: "Votre numéro est arrivé. Nous espérons qu'il vous ressemble.",
    titreHtml: "Le prochain moment",
    h1: "Et le prochain<br />moment ?",
    /* Nomme l'album : une cliente qui en a composé deux ne doit pas avoir à
       deviner duquel on parle. Le sujet, lui, reste celui du PRD. */
    sous: `${PRENOM}, ${TITRE} est arrivé, et nous espérons qu’il vous ressemble. Il y en aura d’autres : un été, un anniversaire, une année entière. Nous serons là pour les composer.`,
    cta: "Composer un nouveau numéro",
    lien: "https://www.bellajour.fr/",
    pied: "Si quelque chose ne va pas, répondez à ce message. Nous préférons le savoir.",
  },
  {
    code: "M9",
    nom: "M9 · Atelier · Quelques photos de plus",
    sujet: `Quelques photos de plus pour ${TITRE} ?`,
    preheader: "On peut faire encore mieux avec quelques photos de plus.",
    titreHtml: "Quelques photos de plus",
    h1: "On peut faire<br />encore mieux.",
    sous: `${PRENOM}, vous nous avez confié {{ params.NB_PHOTOS }} photos, et nous pouvons déjà en faire quelque chose. Mais avec quelques dizaines de plus, votre numéro respirera vraiment.`,
    cta: "Ajouter des photos",
    lien: LIEN,
    pied: "Celles que vous avez déjà déposées sont conservées : vous complétez, vous ne recommencez pas.",
  },
];

/* ───────────────────────── le garde-fou de forme ───────────────────────── */

/* Consigne explicite de Mathias : aucun tiret cadratin ni demi-cadratin dans
   les textes des mails. Vérifié AVANT tout envoi, sur les champs de copie
   uniquement — la maquette HTML n'en contient pas. */
const CHAMPS_TEXTE = ["sujet", "preheader", "h1", "sous", "cta", "pied", "titreHtml"];

export function verifierForme(mail) {
  const fautes = [];
  for (const champ of CHAMPS_TEXTE) {
    const v = mail[champ];
    if (typeof v !== "string") continue;
    if (/[—–]/.test(v)) fautes.push(`${champ} contient un tiret`);
    /* ⚠️ AUCUNE ENTITÉ HTML DANS LES TEXTES. Elles se décodent dans le corps
       du mail et PAS dans l'objet, qui est du texte brut : un « &rsquo; »
       dans un sujet s'affiche tel quel dans la boîte de réception. Vu en
       vrai sur M6 — « Berghain part à l&rsquo;impression ». Les caractères
       réels (’, é, €) fonctionnent partout, l'UTF-8 est déclaré. */
    const entite = v.match(/&[a-zA-Z]+;|&#\d+;/);
    if (entite) fautes.push(`${champ} contient l'entité HTML ${entite[0]}`);
  }
  if (/cliquez ici/i.test(JSON.stringify(mail))) fautes.push("« Cliquez ici » interdit");
  if (/bonne r[ée]ception/i.test(JSON.stringify(mail))) fautes.push("« Bonne réception » interdit");
  return fautes;
}

/* ─────────────────────────────── exécution ─────────────────────────────── */

function cleBrevo() {
  const env = readFileSync(resolve(RACINE, ".env.local"), "utf8");
  const m = env.match(/^BREVO_API_KEY=(.*)$/m);
  if (!m) throw new Error("BREVO_API_KEY absente de .env.local");
  return m[1].trim();
}

async function main() {
  const pousser = process.argv.includes("--pousser");

  let fautes = 0;
  for (const mail of MAILS) {
    const f = verifierForme(mail);
    if (f.length) {
      console.error(`  ✗ ${mail.code} : ${f.join(", ")}`);
      fautes += f.length;
    }
  }
  if (fautes) {
    console.error(`\n${fautes} faute(s) de forme. Rien n'est poussé.`);
    process.exit(1);
  }
  console.log(`Forme vérifiée : ${MAILS.length} mails, aucun tiret, aucune formule interdite.\n`);

  /* Les aperçus LOCAUX sont remplis de valeurs d'exemple : un écran couvert
     de « {{ params.NB_PAGES }} » ne permet pas de juger une mise en page —
     ni de voir qu'un mot déborde. Ce qui part chez Brevo garde évidemment
     les variables. */
  const EXEMPLE = {
    PRENOM: "Camille",
    TITRE: "Notre été à Séville",
    NB_PAGES: "34",
    NB_PHOTOS: "12",
    PRIX: "40",
    TRANSPORTEUR: "Colissimo",
    DATE_LIMITE: "3 septembre",
    LIEN: "https://www.bellajour.fr/numero/apercu",
  };
  const remplir = (html) =>
    html.replace(/\{\{\s*params\.([A-Z_]+)\s*\}\}/g, (t, cle) => EXEMPLE[cle] ?? t);

  mkdirSync(SORTIE, { recursive: true });
  for (const mail of MAILS) {
    writeFileSync(resolve(SORTIE, `${mail.code}.html`), remplir(maquette(mail)), "utf8");
  }
  console.log(`Aperçus écrits dans .mails-apercus/ (valeurs d'exemple, ouvrir dans un navigateur).`);

  if (!pousser) {
    console.log("\nRien n'a été envoyé à Brevo. Relancer avec --pousser pour créer les templates.");
    return;
  }

  const cle = cleBrevo();
  const ids = {};

  /* IDEMPOTENT : si la variable BREVO_TEMPLATE_<CODE>_ID existe déjà en
     local, on MET À JOUR le template existant au lieu d'en créer un second.
     Sans ça, corriger une virgule laisserait une traînée de doublons dans
     Brevo, et personne ne saurait plus lequel part réellement. */
  const env = readFileSync(resolve(RACINE, ".env.local"), "utf8");
  const idConnu = (code) => {
    const m = env.match(new RegExp(`^BREVO_TEMPLATE_${code.toUpperCase()}_ID=(.*)$`, "m"));
    return m?.[1]?.trim() || null;
  };

  for (const mail of MAILS) {
    const corps = {
      templateName: mail.nom,
      subject: mail.sujet,
      sender: { name: "Bellajour", email: "contact@bellajour.com" },
      replyTo: "contact@bellajour.com",
      tag: "atelier",
      htmlContent: maquette(mail),
      /* Actif d'emblée : un template inactif renvoie une erreur à l'envoi, et
         le verrou serait retiré à chaque tentative. Ce qui décide qu'un mail
         part, c'est la variable d'environnement, pas ce drapeau. */
      isActive: true,
    };
    const existant = idConnu(mail.code);
    const url = existant
      ? `https://api.brevo.com/v3/smtp/templates/${existant}`
      : "https://api.brevo.com/v3/smtp/templates";

    const r = await fetch(url, {
      method: existant ? "PUT" : "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(corps),
    });
    /* Une mise à jour réussie renvoie 204 sans corps. */
    const data = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(`  ✗ ${mail.code} : ${r.status} ${JSON.stringify(data)}`);
      continue;
    }
    ids[mail.code] = existant ?? data.id;
    console.log(`  ${existant ? "↻" : "✓"} ${mail.code} ${existant ? "mis à jour" : "créé"} — template ${ids[mail.code]}`);
  }

  console.log("\nVariables à poser sur Vercel :");
  for (const [code, id] of Object.entries(ids)) {
    console.log(`  BREVO_TEMPLATE_${code.toUpperCase()}_ID=${id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
