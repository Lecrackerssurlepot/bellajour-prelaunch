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

/**
 * La carte-couverture de M3 (T2-7) : un bloc TYPOGRAPHIQUE, pas une image.
 *
 * L'aperçu réel ne peut pas être embarqué : les visuels du coffre sont signés
 * pour une heure, ils seraient morts à l'ouverture du mail. Et une image
 * hébergée serait masquée par Gmail au premier affichage. Le titre du numéro
 * dans un cadre au format d'une couverture évoque l'objet sans rien promettre
 * de faux. La page fait le spectacle, le mail fait le clic.
 */
function carteCouverture(titre) {
  return `<tr><td align="center" class="px-mobile" style="padding: 0 40px 46px 40px;">
<table role="presentation" width="250" cellpadding="0" cellspacing="0" border="0" style="width: 250px; max-width: 250px; background-color: #161618; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px;">
<tr><td align="center" style="padding: 58px 26px 14px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Le num&eacute;ro</div>
</td></tr>
<tr><td align="center" style="padding: 0 26px 58px 26px;">
<div style="font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 32px; font-weight: 500; color: #f5f0e7; line-height: 1.2;">${titre}</div>
</td></tr>
<tr><td align="center" style="padding: 0 26px 24px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #d68a63;">Bellajour</div>
</td></tr>
</table>
</td></tr>`;
}

/**
 * L'encart « Un mot de l'atelier » de M9 (T2-3), rendu SEULEMENT si le mot
 * existe : la syntaxe conditionnelle est celle des templates Brevo.
 */
function encartMot() {
  return `{% if params.MOT %}<tr><td align="left" class="px-mobile" style="padding: 0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-left: 2px solid #d68a63; border-radius: 0 12px 12px 0;">
<tr><td style="padding: 24px 26px 8px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Un mot de l&rsquo;atelier</div>
</td></tr>
<tr><td style="padding: 0 26px 24px 26px;">
<p style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 20px; line-height: 1.55; color: #c7c2b8;">{{ params.MOT }}</p>
</td></tr>
</table>
</td></tr>{% endif %}`;
}

/**
 * L'encart du crédit fondatrice (T-021), sur M3 et M3b.
 *
 * Rendu SEULEMENT pour les quatorze fondatrices, dont le crédit de 30 € (CGV
 * v3.0 art. 5 bis) n'a pas encore été dépensé. `parametresPour` envoie une
 * chaîne VIDE pour tout le monde d'autre, et le `{% if %}` la traite comme
 * faux : le bloc disparaît, personne d'autre n'apprend qu'il existe.
 *
 * Pourquoi ça compte : le pied du mail annonce « 40 € tout compris ». Une
 * fondatrice qui clique et découvre 10 € chez Stripe a une bonne surprise,
 * mais une surprise quand même, et une surprise sur un prix fait douter au
 * pire moment. Le mail annonce donc la remise AVANT le clic.
 *
 * Le mot « code » n'apparaît nulle part, volontairement : il n'y a rien à
 * saisir, et suggérer un champ à remplir ferait chercher un champ qui
 * n'existe plus sur l'écran de Stripe.
 */
function encartCredit() {
  return `{% if params.CREDIT_FONDATRICE %}<tr><td align="left" class="px-mobile" style="padding: 0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-left: 2px solid #d68a63; border-radius: 0 12px 12px 0;">
<tr><td style="padding: 24px 26px 8px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Votre cr&eacute;dit de fondateur</div>
</td></tr>
<tr><td style="padding: 0 26px 24px 26px;">
<p style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 20px; line-height: 1.55; color: #c7c2b8;">Vos {{ params.CREDIT_FONDATRICE }}&nbsp;&euro; de cr&eacute;dit sont d&eacute;j&agrave; d&eacute;duits du prix ci-dessous. Vous n&rsquo;avez rien &agrave; saisir : la remise vous attend sur la page de paiement.</p>
</td></tr>
</table>
</td></tr>{% endif %}`;
}

/**
 * L'encart de M10 (T-076, 01/09) : la couverture qui attend toujours.
 *
 * La population B de la rétention, c'est très majoritairement une couverture
 * composée et jamais achetée. Pour elle, M10 n'est pas seulement un préavis :
 * c'est LA DERNIÈRE CHANCE DE VENTE du dossier, et le dernier mail qu'elle
 * recevra à son sujet. Lui répéter la pagination et le prix, comme le fait
 * M3b, coûte deux lignes et peut sauver la commande.
 *
 * ⚠️ Il ne remplace pas le préavis, il s'ajoute avant lui. L'ordre compte :
 * ce qu'elle gagne à revenir, puis ce qu'elle perd à ne pas revenir. Dire la
 * perte d'abord ferait un mail qui menace ; dire l'offre d'abord fait un mail
 * qui rappelle.
 */
function encartCouverturePrete() {
  return `{% if params.COUVERTURE_PRETE %}<tr><td align="left" class="px-mobile" style="padding: 0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-left: 2px solid #d68a63; border-radius: 0 12px 12px 0;">
<tr><td style="padding: 24px 26px 8px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Votre couverture vous attend</div>
</td></tr>
<tr><td style="padding: 0 26px 24px 26px;">
<p style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 20px; line-height: 1.55; color: #c7c2b8;">Elle est prête depuis longtemps, et elle n&rsquo;a pas bougé. {{ params.NB_PAGES }} pages, {{ params.PRIX }}&nbsp;&euro; tout compris, impression et livraison incluses.</p>
</td></tr>
</table>
</td></tr>{% endif %}`;
}

/**
 * L'encart de M10 (T-076) : les photos qui vont partir avec le dossier.
 *
 * Rendu SEULEMENT s'il y a des photos. Le cas visé est celui du dépôt resté
 * en plan (celui de M2b) : quarante photos sont montées sur le coffre, le
 * dernier bouton n'a jamais été cliqué, et la cliente les croit en sécurité.
 * Refermer son dossier sans lui avoir écrit qu'elles seraient effacées serait
 * la seule chose vraiment indéfendable de tout ce fichier.
 *
 * ⚠️ PHOTOS_DEPOSEES est une CHAÎNE, vide quand il n'y en a pas. Le nombre 0
 * est VRAI pour ce `{% if %}` : passer un entier ferait apparaître « vos 0
 * photos seront effacées » sur tous les questionnaires abandonnés à vide,
 * c'est-à-dire sur la majorité d'entre eux. Même mécanique que
 * CREDIT_FONDATRICE et MOT, pour la même raison.
 */
function encartPhotosEnAttente() {
  return `{% if params.PHOTOS_DEPOSEES %}<tr><td align="left" class="px-mobile" style="padding: 0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-left: 2px solid #d68a63; border-radius: 0 12px 12px 0;">
<tr><td style="padding: 24px 26px 8px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Vos photos sont encore l&agrave;</div>
</td></tr>
<tr><td style="padding: 0 26px 24px 26px;">
<p style="margin: 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-style: italic; font-size: 20px; line-height: 1.55; color: #c7c2b8;">{{ params.PHOTOS_DEPOSEES }} photos vous attendent dans ce num&eacute;ro. Elles seront effac&eacute;es en m&ecirc;me temps que le dossier, et nous n&rsquo;en garderons aucune copie.</p>
</td></tr>
</table>
</td></tr>{% endif %}`;
}

/**
 * L'encart de suivi de M7, rendu SEULEMENT si on a une adresse de suivi.
 *
 * Le motif est celui de la recette du 26/08 : Cloudprinter donne un NUMÉRO
 * de suivi, pas une adresse. Le mail partait donc avec sa jolie phrase
 * « confié à DPD » et aucun moyen de suivre quoi que ce soit, et la cliente
 * devait deviner qu'il fallait retourner sur sa page. Depuis suivi.ts, le
 * numéro devient un lien : voici où il se voit.
 *
 * Trois cas, dans l'ordre : une adresse de suivi (SUIVI) donne un lien ; un
 * simple numéro (CODE_SUIVI, transporteur dont suivi.ts ne sait pas
 * construire l'adresse) s'affiche en texte copiable, avec le transporteur ;
 * rien du tout, et l'encart disparaît. Avant le troisième paramètre, le cas
 * du milieu tombait dans le troisième : le mail disait « confié à DPD » et
 * n'offrait RIEN à suivre, la cliente devait deviner qu'il fallait retourner
 * sur sa page. Un bouton qui ne mène nulle part reste interdit : sans URL,
 * on montre le numéro, pas un lien.
 */
function encartSuivi() {
  const cadre = (contenu) => `<tr><td align="left" class="px-mobile" style="padding: 0 40px 44px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #161618; border-left: 2px solid #d68a63; border-radius: 0 12px 12px 0;">
<tr><td style="padding: 24px 26px 8px 26px;">
<div style="font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #928d84;">Le suivi</div>
</td></tr>
<tr><td style="padding: 0 26px 24px 26px;">
${contenu}
</td></tr>
</table>
</td></tr>`;

  return `{% if params.SUIVI %}${cadre(
    `<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #c7c2b8;"><a href="{{ params.SUIVI }}" style="color: #d68a63; text-decoration: underline;">Suivre le colis chez {{ params.TRANSPORTEUR }}</a></p>`,
  )}{% elif params.CODE_SUIVI %}${cadre(
    `<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.7; color: #c7c2b8;">Votre num&eacute;ro de suivi chez {{ params.TRANSPORTEUR }} :</p>
<p style="margin: 8px 0 0 0; font-family: 'Cormorant Garamond', Cormorant, Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; letter-spacing: 1px; color: #f5f0e7;">{{ params.CODE_SUIVI }}</p>`,
  )}{% endif %}`;
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
<a href="https://www.bellajour.fr/"><img src="https://www.bellajour.fr/logo-mail-cuivre.png" width="170" alt="Bellajour" style="display: block; width: 170px; max-width: 170px; height: auto; border: 0; margin: 0 auto;" /></a>
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

${
  /* Le pied est FACULTATIF depuis le 03/09 (M7b n'en veut pas) : sans lui, le
     bloc entier disparaît. Le rendre vide laisserait une réserve de 56 px sous
     le bouton, et l'oeil la lirait comme un défaut de maquette. */
  pied
    ? bloc(
        `<p style="margin: 0; font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.8; color: #928d84;">${pied}</p>`,
        56,
      )
    : ""
}

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

/* ─────────────────────────── les huit mails ───────────────────────────
   (M1 et M4 préexistent dans Brevo et n'ont pas encore été rapatriés ici ;
   M3 l'a été le 26/08 pour le retour T2-7.) */

export const MAILS = [
  {
    /* M0 — l'accusé, parti à la seconde où le dossier existe (fin de l'écran 4).
       Il ne remercie pas : il DIT CE QUI MANQUE. C'est sa seule raison d'être.
       Le 27/08, une cliente a rempli le questionnaire, n'a jamais déposé de
       photo, et a très probablement cru sa demande terminée — l'écran 4
       promettait la couverture sous 48 h sans annoncer la suite. Un accusé
       qui dirait « nous avons bien reçu votre demande » confirmerait le
       malentendu au lieu de le lever.
       Il porte aussi le LIEN PERMANENT. Avant lui, le token ne vivait que
       dans le localStorage de son appareil : onglet fermé, dossier
       injoignable jusqu'à M2, le lendemain. */
    code: "M0",
    nom: "M0 · Atelier · Votre numéro est ouvert",
    sujet: `${TITRE} est ouvert, il attend vos photos`,
    preheader: "Votre dossier existe. Il lui manque encore la matière.",
    titreHtml: "Votre numéro est ouvert",
    h1: "Votre numéro<br />est ouvert.",
    sous: `${PRENOM}, nous avons votre histoire et votre titre. Il manque encore l'essentiel : vos photos. Tant qu'elles ne sont pas chez nous, l'atelier ne peut rien composer. Comptez quelques minutes, et vous pouvez vous arrêter puis reprendre plus tard, depuis ce même lien.`,
    cta: "Déposer mes photos",
    lien: LIEN,
    pied: "Gardez ce message : le lien ci-dessus est celui de votre numéro, pour toute sa vie. Une question ? Répondez-y, nous vous répondrons nous-mêmes.",
  },
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
    /* ⚠️ CE MAIL NE PARLE PAS DE DROITS (correctif du 01/09, validé par
       Mathias). Sa première rédaction disait « il manque votre accord pour
       qu'on s'en serve » : exact au regard de consent_photos, et illisible
       pour elle. On lit un problème juridique, une case à signer, un doute
       sur ce qu'on va faire de ses photos. Or il n'y a rien de tout ça :
       elle a simplement quitté l'écran 5 avant le dernier bouton, et son
       dépôt n'est pas parti. Le mail dit donc l'étape, pas le droit.
       Même consigne qu'à l'écran 5 : UNE seule idée, et elle désigne le
       bouton. On ne rouvre jamais la question « sont-elles arrivées ou
       pas » — elles le sont, c'est le titre du mail. */
    code: "M2b",
    nom: "M2b · Atelier · Vos photos sont arrivées",
    sujet: `Vos photos sont arrivées, ${TITRE} attend le dernier geste`,
    preheader: "Elles sont bien chez nous. Votre dépôt n'est pas encore parti.",
    titreHtml: "Vos photos sont arrivées",
    h1: "Vos photos<br />sont arrivées.",
    sous: `${PRENOM}, vos {{ params.NB_PHOTOS }} photos sont bien dans nos mains, en sécurité. Il reste le dernier geste du dépôt, celui qui les confie à l'atelier. Un clic, et nous commençons.`,
    cta: "Terminer mon dépôt",
    lien: LIEN,
    pied: "Vous n'avez rien à redéposer : tout est déjà là. Une question ? Répondez à ce message, nous vous répondrons nous-mêmes.",
  },
  {
    /* T2-7 : M3 est LE mail qui vend, et il vivait dans Brevo seul (template
       28, jamais versionné). Il entre ici avec un parti pris : un seul grand
       geste. La carte-couverture évoque l'objet, le bouton fait le reste, la
       page fait le spectacle. */
    code: "M3",
    nom: "M3 · Atelier · Votre couverture est prête",
    sujet: `${TITRE} : votre couverture est prête`,
    preheader: "Elle vous attend, avec sa pagination et son prix.",
    titreHtml: "Votre couverture est prête",
    h1: "Votre couverture<br />est prête.",
    sous: `${PRENOM}, l'atelier a composé la couverture de votre numéro. Elle vous attend sur votre page, avec sa quatrième, une double page, sa pagination et son prix.`,
    /* T-021 : la carte-couverture, puis le crédit fondatrice quand il est dû.
       Dans cet ordre : on montre l'objet, ensuite on parle d'argent. */
    carte: carteCouverture(TITRE) + encartCredit(),
    cta: "Découvrir ma couverture",
    lien: LIEN,
    pied: "{{ params.NB_PAGES }} pages, {{ params.PRIX }} € tout compris, impression et livraison incluses. Vous ne payez que si elle vous plaît.",
  },
  {
    code: "M3b",
    nom: "M3b · Atelier · Votre numéro vous attend",
    sujet: `${TITRE} vous attend`,
    preheader: "Votre couverture est prête depuis quelques jours.",
    titreHtml: "Votre numéro vous attend",
    h1: "Votre numéro<br />vous attend.",
    sous: `${PRENOM}, votre couverture est prête depuis quelques jours. Elle vous attend exactement là où vous l’avez laissée, avec sa pagination et son prix.`,
    /* M3b porte le MÊME lien de paiement que M3 : s'il taisait le crédit
       alors que M3 l'annonçait, la relance contredirait le premier mail. */
    carte:
      carteChiffres(
        { valeur: "{{ params.NB_PAGES }}", legende: "pages", grand: true },
        { valeur: "{{ params.PRIX }}&nbsp;&euro;", legende: "tout compris", grand: true },
        "Impression et livraison comprises. Chez vous sous 10 jours après validation.",
      ) + encartCredit(),
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
      "Une correction à demander ? Écrivez-la dans le document, puis dites-le nous depuis votre page : nous repassons dessus.",
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
    carte: encartSuivi(),
    cta: "Suivre mon numéro",
    lien: LIEN,
    pied: "Le suivi se met à jour sur votre page, au fil des jours.",
  },
  {
    /* M7b — la livraison, avec le magazine numérique (03/09). Part quand le
       colis est chez le client (signal Cloudprinter ItemDeliveryCompleted,
       ou le geste manuel de l'atelier). Le CTA est le téléchargement
       ⚠️ Le bouton envoie sur LIEN, la PAGE du numéro, et pas sur le fichier.
       Pointer le PDF directement téléchargeait bien, mais laissait la cliente
       sur un onglet BLANC : une réponse en pièce jointe ne rend aucune page.
       Constaté en production le 03/09. La page porte le même bouton, le poids
       du fichier, et le reste de son numéro. « Le mail fait le clic, la page
       fait le spectacle. » */
    code: "M7b",
    nom: "M7b · Atelier · Votre magazine est arrivé",
    sujet: `${TITRE} est chez vous`,
    preheader: "Et sa version numérique vous attend.",
    titreHtml: "Votre magazine est arrivé",
    h1: "Votre magazine<br />est arrivé.",
    sous: `${PRENOM}, ${TITRE} est chez vous, et nous espérons qu’il trouve sa place. Il existe aussi en numérique : le même magazine, en PDF, que vous pouvez télécharger directement.`,
    cta: "Récupérer mon magazine en PDF",
    lien: LIEN,
    /* Pas de pied, décision de Mathias (03/09) : le bouton se suffit. Le poids
       du fichier est annoncé sur la page du numéro, là où il sert vraiment. */
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
    /* T2-3 : le mot saisi par l'atelier au moment de demander plus de photos.
       Le cas réel qui l'a motivé : le problème était la QUALITÉ des photos,
       pas leur nombre, et le mail générique tombait à côté. */
    carte: encartMot(),
    cta: "Ajouter des photos",
    lien: LIEN,
    pied: "Celles que vous avez déjà déposées sont conservées : vous complétez, vous ne recommencez pas.",
  },
  {
    /* M10 — T-076, le préavis de fermeture. LE SEUL MAIL DE TOUTE LA SÉRIE
       QUI ANNONCE UNE PERTE, et il faut donc l'écrire à l'envers des autres.

       Ce qu'il ne fait PAS, et chaque point est une décision :
       — il ne culpabilise pas. Trois mois plus tard, personne ne se souvient
         d'avoir commencé quelque chose. Le ton est celui d'un rangement, pas
         d'un reproche ;
       — il ne menace pas d'une échéance vague. Il donne LA date, celle que
         le script appliquera vraiment (retention.ts, une seule fonction) ;
       — il ne demande rien d'autre qu'un clic. Le lien est le lien permanent
         de son numéro, celui de M0 : elle retombe exactement où elle s'était
         arrêtée, avec ses photos si elle en avait déposé.

       Ce qu'il fait, et qui est obligatoire : il dit que les photos seront
       effacées. Un dépôt resté en plan peut contenir quarante photos qu'elle
       croit en sécurité chez nous. Les effacer sans l'avoir écrit noir sur
       blanc serait indéfendable. D'où l'encart conditionnel. */
    code: "M10",
    nom: "M10 · Atelier · Votre numéro va se refermer",
    sujet: `${TITRE} va se refermer`,
    preheader: "Sans nouvelles de vous, nous refermerons son dossier.",
    titreHtml: "Votre numéro va se refermer",
    h1: "Votre numéro<br />va se refermer.",
    /* ⚠️ CE TEXTE NE DIT PLUS « votre dépôt n'a jamais été terminé ».
       Depuis la décision du 01/09, M10 part AUSSI aux dossiers dont le dépôt
       est terminé : celui que l'atelier n'a jamais composé, le 1b resté sans
       réponse, et surtout la couverture publiée jamais achetée. Leur écrire
       qu'ils n'ont pas fini serait leur reprocher notre propre silence.
       La phrase commune ne parle donc que du TEMPS, qui est vrai dans tous
       les cas ; ce qui distingue les situations vit dans les deux encarts
       conditionnels, pas dans le texte de base. */
    sous: `${PRENOM}, votre numéro n'a plus bougé depuis trois mois. Sans nouvelles de vous d'ici le {{ params.DATE_CLOTURE }}, nous refermons son dossier et nous effaçons ce que vous nous aviez confié. D'ici là, rien n'a changé : votre lien vous ramène exactement où vous vous étiez arrêtée.`,
    /* Deux encarts, jamais les mêmes selon le dossier. Ils peuvent coexister
       (une couverture prête ET des photos au coffre) et se lisent alors dans
       le bon ordre : ce qu'elle gagne à revenir, puis ce qu'elle perd à ne
       pas revenir. */
    carte: encartCouverturePrete() + encartPhotosEnAttente(),
    cta: "Reprendre mon numéro",
    lien: LIEN,
    pied: "Si vous préférez que nous refermions ce dossier, vous n'avez rien à faire. Et si vous voulez le reprendre plus tard, dites-le nous : répondez à ce message, nous vous répondrons nous-mêmes.",
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

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets : dotenv les
   retire, un `split("=")` maison non. Une clé lue avec ses guillemets produit
   une erreur incompréhensible loin d'ici (« Invalid supabaseUrl »). */
function sansGuillemets(v) {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

function cleBrevo() {
  const env = readFileSync(resolve(RACINE, ".env.local"), "utf8");
  const m = env.match(/^BREVO_API_KEY=(.*)$/m);
  if (!m) throw new Error("BREVO_API_KEY absente de .env.local");
  return sansGuillemets(m[1]);
}

async function main() {
  const pousser = process.argv.includes("--pousser");

  /* ── POUSSER UN SEUL MAIL ──────────────────────────────────────────────
     `--pousser` réécrit les DIX templates. C'est le bon défaut quand on
     retouche la maquette commune, et le mauvais quand on n'ajoute qu'un
     mail : on repasse alors sur neuf templates qui n'avaient rien demandé,
     et une retouche faite directement dans Brevo entre-temps disparaît sans
     un mot. `--seulement M0` (ou `--seulement M0,M2b`) borne le geste.
     La vérification de forme, elle, reste sur les DIX : une faute ailleurs
     doit se voir même quand on ne pousse qu'un mail. */
  const iSeulement = process.argv.indexOf("--seulement");
  const seulement =
    iSeulement === -1
      ? null
      : new Set(
          (process.argv[iSeulement + 1] ?? "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        );
  if (seulement && !seulement.size) {
    console.error("--seulement attend un code : --seulement M0");
    process.exit(1);
  }
  if (seulement) {
    const inconnus = [...seulement].filter((c) => !MAILS.some((m) => m.code === c));
    if (inconnus.length) {
      console.error(`Code inconnu : ${inconnus.join(", ")}. Connus : ${MAILS.map((m) => m.code).join(", ")}`);
      process.exit(1);
    }
  }

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
    SUIVI: "https://www.laposte.fr/outils/suivre-vos-envois?code=6A123456789FR",
    CODE_SUIVI: "6A123456789FR",
    DATE_LIMITE: "3 septembre",
    DATE_CLOTURE: "12 décembre",
    /* T-076 : le cas à REGARDER dans l'aperçu de M10 est celui où il y a des
       photos, parce que c'est le seul où le mail annonce une perte concrète.
       Le cas vide se lit en supprimant la ligne. */
    PHOTOS_DEPOSEES: "42",
    /* L'aperçu montre la population B, celle qui a une couverture prête : le
       cas le plus riche des deux, et celui qu'il faut juger à l'oeil. Le cas
       du questionnaire abandonné se lit en vidant cette valeur. */
    COUVERTURE_PRETE: "oui",
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

  const aPousser = seulement ? MAILS.filter((m) => seulement.has(m.code)) : MAILS;
  if (seulement) {
    console.log(`\nPoussée BORNÉE à : ${aPousser.map((m) => m.code).join(", ")}. Les autres ne sont pas touchés.`);
  }

  for (const mail of aPousser) {
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
