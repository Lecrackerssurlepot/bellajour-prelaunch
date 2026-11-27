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
 * 2. Les images : jusqu'au 26/11, aucune dans le corps (PRD §10). Depuis le
 *    27/11, chaque mail déclare sa STRUCTURE (atelier, lettre, magazine,
 *    simple, fiche N « Les structures de mails ») et la structure porte ses
 *    images, cuites par `scripts/mails-collages.py`. Toujours des JPEG
 *    hébergés sur le site, jamais l'aperçu signé d'un numéro.
 * 3. Vouvoiement chaleureux. Jamais « Cliquez ici », jamais « Bonne
 *    réception ». Le ton d'un magazine, pas d'un SaaS.
 * 4. La charte V2 (26/11) : la coquille vient de `mails-charte.mjs`, jamais
 *    redessinée ici (brand/charte/N-declinaisons.md). Le harnais
 *    `verif-mails-charte.ts` en tient les règles sur chaque mail.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  C,
  SERIF,
  SITE,
  STRUCTURES,
  VISUELS,
  chiffres,
  coquille,
  corpsSelon,
  encart,
  encartRecap,
  etiquette,
  ligne,
  lienSecondaire,
} from "./mails-charte.mjs";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, "..");
const SORTIE = resolve(RACINE, ".mails-apercus");

/* ── LES NOMBRES DE LA LIVRAISON OFFERTE VIENNENT DU CODE (16/09/2026) ──
   Ce script est du JavaScript nu : il ne peut pas importer `livraison.ts` ni
   `exemplaires.ts`. Il LIT donc les constantes dans leur fichier source,
   par une expression régulière stricte, et refuse de tourner si l'une manque.
   Le jour où le seuil ou une remise bouge dans le code, la phrase des mails
   suit ; recopier « 50 € » ici aurait fini par mentir. */
function lireConstante(fichier, nom) {
  const source = readFileSync(resolve(RACINE, fichier), "utf8");
  const m = new RegExp(`export const ${nom}\\s*=\\s*(\\d+)`).exec(source);
  if (!m) throw new Error(`${nom} introuvable dans ${fichier}`);
  return Number(m[1]);
}
const FRANCO_EUROS = lireConstante("src/lib/atelier/livraison.ts", "FRANCO_CENTIMES") / 100;
const REMISE_DEUXIEME = lireConstante("src/lib/atelier/exemplaires.ts", "REMISE_DEUXIEME_PCT");
const REMISE_SUIVANTS = lireConstante("src/lib/atelier/exemplaires.ts", "REMISE_SUIVANTS_PCT");
/* La phrase qui VEND les exemplaires, dans les trois mails qui annoncent un
   total (M3, M3b, M10), seulement quand le port est facturé : à un fondateur
   ou au-dessus du seuil, elle n'aurait rien à vendre. « Moins 30 % » en
   toutes lettres : pas de tiret, règle de forme nº1. */
const PHRASE_FRANCO = `Offerte dès ${FRANCO_EUROS} € de magazines : le deuxième exemplaire est à moins ${REMISE_DEUXIEME} %, les suivants à moins ${REMISE_SUIVANTS} %.`;

/* ─────────────────────────── la maquette ─────────────────────────── */
/* Charte V2 (26/11) : la coquille et les briques vivent dans `mails-charte.mjs`,
   partagées avec les mails de Noël (fiche N, « Le gabarit commun »). Ici, on ne
   fait que les remplir. Papier et encre, bandeau nuit en tête, un seul bouton.
   Jusqu'au 26/11, la maquette était celle du template 28 (fond nuit, cuivre,
   Cormorant) : son HTML est dans l'historique git de ce fichier. */

/** La carte à deux chiffres (pages / prix, ou pages / date). */
function carteChiffres(gauche, droite, note) {
  return chiffres(gauche, droite, note);
}

/**
 * La carte-couverture de M3 (T2-7) : un bloc TYPOGRAPHIQUE, pas une image.
 *
 * L'aperçu réel ne peut pas être embarqué : les visuels du coffre sont signés
 * pour une heure, ils seraient morts à l'ouverture du mail. Et une image
 * hébergée serait masquée par Gmail au premier affichage. Le titre du numéro
 * dans un cadre au format d'une couverture évoque l'objet sans rien promettre
 * de faux. La page fait le spectacle, le mail fait le clic.
 * Charte V2 : un objet papier au filet d'encre, coins `rayon.image`, aux
 * proportions d'une couverture (240 × 340 environ) ; le titre en Georgia, le
 * repli du rôle « magazine » (Instrument Serif) dans un mail. Pas d'ombre :
 * un mode sombre forcé l'inverse en halo blanc.
 */
function carteCouverture(titre) {
  return ligne(
    `<table role="presentation" width="240" cellpadding="0" cellspacing="0" border="0" style="width: 240px; max-width: 240px; border: 1px solid ${C.encre}; border-radius: 4px; border-collapse: separate;">
<tr><td align="center" style="padding: 88px 24px 14px 24px;">${etiquette("Le num&eacute;ro")}</td></tr>
<tr><td align="center" style="padding: 0 24px 88px 24px;">
<div style="font-family: ${SERIF}; font-style: italic; font-size: 30px; line-height: 1.15; color: ${C.encre};">${titre}</div>
</td></tr>
<tr><td align="center" style="padding: 0 24px 22px 24px;">${etiquette("Bellajour", C.encre)}</td></tr>
</table>`,
    40,
    "center",
  );
}

/* Le texte d'un encart en Georgia : le mot de l'atelier, une couverture qui attend. */
const phraseSerif = (t) => `<span style="font-family: ${SERIF}; font-size: 19px; line-height: 1.5; color: ${C.encre};">${t}</span>`;

/**
 * L'encart « Un mot de l'atelier » de M9 (T2-3), rendu SEULEMENT si le mot
 * existe : la syntaxe conditionnelle est celle des templates Brevo.
 */
function encartMot() {
  return `{% if params.MOT %}${encart("Un mot de l&rsquo;atelier", phraseSerif("{{ params.MOT }}"))}{% endif %}`;
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
  return `{% if params.CREDIT_FONDATRICE %}${encart(
    "Votre cr&eacute;dit de fondateur",
    "Vos {{ params.CREDIT_FONDATRICE }}&nbsp;&euro; de cr&eacute;dit et la livraison sont offerts : ils sont d&eacute;j&agrave; d&eacute;duits du prix ci-dessous. Vous n&rsquo;avez rien &agrave; saisir, la remise vous attend sur la page de paiement.",
  )}{% endif %}`;
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
  return `{% if params.COUVERTURE_PRETE %}${encart(
    "Votre couverture vous attend",
    `Elle est prête depuis longtemps, et elle n&rsquo;a pas bougé. {{ params.NB_PAGES }} pages, {{ params.PRIX }}&nbsp;&euro; impression comprise.{% if params.PAYS_A_CHOISIR %} Livraison chiffrée selon votre pays, avant le paiement.{% elif params.LIVRAISON_OFFERTE %} Livraison offerte.{% else %} Livraison {{ params.LIVRAISON }}&nbsp;&euro; en sus, soit {{ params.TOTAL }}&nbsp;&euro; à payer. ${PHRASE_FRANCO}{% endif %}`,
  )}{% endif %}`;
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
  return `{% if params.PHOTOS_DEPOSEES %}${encart(
    "Vos photos sont encore l&agrave;",
    "{{ params.PHOTOS_DEPOSEES }} photos vous attendent dans ce num&eacute;ro. Elles seront effac&eacute;es en m&ecirc;me temps que le dossier, et nous n&rsquo;en garderons aucune copie.",
  )}{% endif %}`;
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
 * rien du tout, et l'encart disparaît. Un bouton qui ne mène nulle part reste
 * interdit : sans URL, on montre le numéro, pas un lien. Le lien est un lien
 * SECONDAIRE (charte N) : le seul bouton du mail reste « Suivre mon numéro ».
 */
function encartSuivi() {
  return `{% if params.SUIVI %}${encart(
    "Le suivi",
    lienSecondaire("Suivre le colis chez {{ params.TRANSPORTEUR }}", "{{ params.SUIVI }}"),
  )}{% elif params.CODE_SUIVI %}${encart(
    "Le suivi",
    `Votre num&eacute;ro de suivi chez {{ params.TRANSPORTEUR }} :<br /><span style="display: inline-block; padding-top: 8px; font-family: ${SERIF}; font-size: 24px; letter-spacing: 1px; color: ${C.encre};">{{ params.CODE_SUIVI }}</span>`,
  )}{% endif %}`;
}

/**
 * Le récapitulatif carte cadeau et crédit de M4 (Noël, 16/11/2026).
 *
 * Remplace l'ancien mail GC3 (« il reste 12 € sur votre compte ») : il
 * partait à la même seconde que M4, et la règle est un mail par 24 h par
 * personne. Rendu SEULEMENT si une carte ou un crédit a payé ce numéro
 * (`RECAP_CARTE`, chaîne vide sinon) ; chaque ligne absente vaut mieux qu'une
 * ligne à zéro (docs/marque/STRUCTURE-INFO.md). Les montants viennent de
 * `lireCarteDuNumero` (mails.ts), jamais écrits ici.
 */
function encartCarteCredit() {
  return `{% if params.RECAP_CARTE %}${encartRecap(
    [
      { si: "CARTE_MONTANT", lib: "{% if params.CARTE_DE %}La carte de {{ params.CARTE_DE }}{% else %}Carte cadeau{% endif %}", val: "&minus;{{ params.CARTE_MONTANT }}&nbsp;&euro;" },
      { si: "CREDIT", lib: "Cr&eacute;dit de votre compte", val: "&minus;{{ params.CREDIT }}&nbsp;&euro;" },
      { si: "RELIQUAT", lib: "Pour le prochain num&eacute;ro", val: "{{ params.RELIQUAT }}&nbsp;&euro;", fort: true },
    ],
    "{% if params.RELIQUAT %}Ils restent sur votre compte jusqu&rsquo;au {{ params.RELIQUAT_JUSQU }} et se d&eacute;duisent tout seuls au prochain num&eacute;ro.{% endif %}",
  )}{% endif %}`;
}

/** La ligne de la maison, en bas de chaque mail de l'atelier et du compte. */
const MENTION = "contact@bellajour.com";

export function maquette({ titreHtml, preheader, h1, sous, carte, cta, lien, pied: texteDuPied, hero, sujet, surtitre: sur, structure, encarts, etapes, nuit }) {
  /* Le 27/11, Mathias choisit les structures (fiche N, « Les structures de mails ») : chaque
     mail déclare la sienne. Le titre du numéro va en surtitre quand on le connaît. La lettre
     ouvre sur « Bonjour Prénom, » : le prénom quitte alors le début du texte. */
  if (!STRUCTURES.includes(structure)) throw new Error(`${titreHtml} : structure manquante ou inconnue (${structure})`);
  const dessus = sur ?? (String(sujet ?? "").includes("params.TITRE") ? TITRE : null);
  let salut = null;
  let texte = sous;
  if (structure === "lettre" && sous.startsWith(`${PRENOM}, `)) {
    salut = PRENOM;
    const reste = sous.slice(PRENOM.length + 2);
    texte = reste.charAt(0).toUpperCase() + reste.slice(1);
  }
  return coquille({
    titreHtml,
    preheader,
    mention: MENTION,
    corps: corpsSelon(structure, {
      surtitre: dessus,
      salut,
      h1,
      sous: texte,
      carte,
      encarts,
      cta,
      lien,
      /* Le pied est FACULTATIF depuis le 03/09 (M7b n'en veut pas). */
      pied: texteDuPied,
      /* L'image de tête propre au mail (C0). JPEG, jamais WebP : Outlook ne le lit pas. */
      visuel: hero,
      etapes,
      nuit,
    }),
  });
}

/* La bande « Offrez-en un » des structures magazine (M7b, M8) : le second bouton bordé. */
const NUIT_OFFRIR = {
  etiquette: "Pour la suite",
  titre: "Offrez-en un.",
  texte: "Un &eacute;t&eacute;, un anniversaire, une ann&eacute;e : l&rsquo;atelier compose le leur.",
  cta: "Offrir une carte",
  lien: `${SITE}/offrir`,
};

const LIEN = "{{ params.LIEN }}";
const PRENOM = "{{ params.PRENOM }}";
const TITRE = "{{ params.TITRE }}";

/* ─────────────────────────── les mails versionnés ───────────────────────────
   Douze mails de l'atelier + les trois du compte (C0 invitation des
   fondateurs 10/09, C1 inscription, C2 mot de passe, 04/09). M1 préexiste dans Brevo et n'a pas encore été rapatrié
   ici ; M3 l'a été le 26/08 pour le retour T2-7, M4 le 10/09 (livraison en sus). */

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
    structure: "atelier",
    nom: "M0 · Atelier · Votre numéro est ouvert",
    sujet: `${TITRE} est ouvert, il attend vos photos`,
    preheader: "Votre dossier existe. Il lui manque encore la matière.",
    titreHtml: "Votre numéro est ouvert",
    h1: "Votre numéro<br />est ouvert.",
    /* 17/09/2026 (T-116) — Mathias : « ce lien et le sien pour toute sa vie,
       on ne comprend pas » et « pas vous arrêter ni rien ». Le mail garde son
       sens (il attend vos photos) ; la fin dit seulement : maintenant, ou plus
       tard. Il part désormais quinze minutes après l'écran 4, et seulement si
       aucune photo n'est arrivée (programme.ts). */
    sous: `${PRENOM}, votre numéro est ouvert : nous avons votre histoire et votre titre. Il manque encore l'essentiel, vos photos. Vous pouvez les déposer maintenant pour votre composition, ou bien reprendre plus tard.`,
    cta: "Déposer mes photos",
    lien: LIEN,
    pied: "Gardez ce message : le lien ci-dessus est celui de votre numéro. Une question ? Répondez-y, nous vous répondrons nous-mêmes.",
  },
  {
    code: "M2",
    structure: "atelier",
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
    structure: "simple",
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
    structure: "lettre",
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
    /* Le pied disait « tout compris, impression et livraison incluses » : vrai
       jusqu'au 09/09, faux depuis que le port se facture en sus (lot 6). Un
       mail qui annonce un total plus bas que celui de Stripe, c'est un panier
       abandonné à l'arrivée. Le `{% if %}` traite la chaîne vide comme faux :
       un fondateur lit « livraison offerte », tout le monde d'autre lit le
       montant devisé pour SA destination. */
    pied: `{{ params.NB_PAGES }} pages, {{ params.PRIX }} € impression comprise. {% if params.PAYS_A_CHOISIR %}Livraison chiffrée selon votre pays, avant le paiement.{% elif params.LIVRAISON_OFFERTE %}Livraison offerte, soit {{ params.TOTAL }} € à payer.{% else %}Livraison {{ params.LIVRAISON }} € en sus, soit {{ params.TOTAL }} € à payer. ${PHRASE_FRANCO}{% endif %} Vous ne payez que si elle vous plaît.`,
  },
  {
    code: "M3b",
    structure: "lettre",
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
        { valeur: "{{ params.PRIX }}&nbsp;&euro;", legende: "impression comprise", grand: true },
        /* Même correction que le pied de M3 : la livraison sort du prix (lot 6,
           10/09). La légende ne peut plus dire « tout compris ». */
        `{% if params.PAYS_A_CHOISIR %}Livraison chiffrée selon votre pays, avant le paiement.{% elif params.LIVRAISON_OFFERTE %}Livraison offerte. Soit {{ params.TOTAL }} € à payer.{% else %}Livraison {{ params.LIVRAISON }} € en sus, soit {{ params.TOTAL }} € à payer. ${PHRASE_FRANCO}{% endif %} Chez vous sous 10 jours après validation.`,
      ) + encartCredit(),
    cta: "Revoir ma couverture",
    lien: LIEN,
    pied: "Un détail à changer avant de vous décider ? Répondez à ce message, on ajuste sans frais.",
  },
  {
    /* M4 — le paiement est reçu, l'atelier compose. Rapatrié de Brevo le
       10/09/2026 (template 29, texte du 24/08) pour une seule raison : sa
       carte disait « X € réglés, impression et livraison comprises », faux
       deux fois depuis le lot 6 (le port se facture en sus) et faux depuis
       toujours pour un fondateur, dont les 30 € de crédit font que le montant
       débité n'est pas le prix du numéro. Le mail ne reçoit que le prix de
       grille (NB_PAGES, PRIX) : il ne prétend donc plus dire ce qui a été
       réglé, il renvoie à la facture Stripe, qui seule connaît le montant
       exact (port et crédit compris). */
    code: "M4",
    structure: "lettre",
    encarts: [
      { signe: "1", t: "Sous trois jours ouvr&eacute;s", s: "Votre num&eacute;ro complet, &agrave; feuilleter." },
      { signe: "?", t: "Un changement ?", s: "R&eacute;pondez &agrave; ce message, nous le notons." },
    ],
    nom: "M4 · Atelier · Paiement reçu",
    sujet: `${TITRE}, nous composons`,
    preheader: "C’est réglé. Votre numéro est en composition.",
    titreHtml: "Nous composons votre numéro",
    h1: "C’est réglé.<br />Nous composons.",
    sous: `${PRENOM}, votre numéro complet vous attend sous trois jours ouvrés. Vous le feuilletterez en entier avant qu’il ne parte à l’impression : rien ne s’imprime sans votre accord.`,
    carte: carteChiffres(
      { valeur: "{{ params.NB_PAGES }}", legende: "pages composées", grand: true },
      { valeur: "{{ params.PRIX }}&nbsp;&euro;", legende: "le numéro, impression comprise", grand: true },
      "Le montant exact réglé, livraison et crédit compris, figure sur votre facture, qui vous parvient séparément.",
    ) + encartCarteCredit(),
    cta: "Suivre mon numéro",
    lien: LIEN,
    pied: "Vous n’avez rien à faire d’ici là.",
  },
  {
    code: "M5",
    structure: "lettre",
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
  /* ──────────────────────────────────────────────────────────────────
     M5c — LA MAQUETTE CORRIGÉE (T-134, 23/09/2026)

     Ce n'est PAS une étape de plus dans la machine : c'est le SECOND
     GABARIT du code M5. Le verrou, le garde-fou de chaîne et
     l'auto-validation à J+7 restent accrochés à « M5 est parti », et ne
     savent rien de ce texte.

     Pourquoi il existe : republier après des corrections renvoyait M5 mot
     pour mot. Quelqu'un qui venait d'écrire trois remarques dans le Canva
     relisait « votre numéro est composé, chaque page est en place », sous
     un objet identique au premier envoi, donc empilé dans le même fil chez
     Gmail. Rien n'accusait réception de ce qu'il avait demandé.

     ⚠️ L'OBJET DIFFÈRE, et c'est la raison d'être d'un second gabarit
     plutôt que d'une conditionnelle : le dépôt utilise `{% if %}` dans des
     corps de mail, JAMAIS dans un sujet, et rien ne prouve que Brevo l'y
     accepte. Un sujet identique rendait le second mail invisible.

     ⚠️ Mêmes paramètres que M5, aux mêmes noms : ce gabarit est servi par
     le MÊME code, donc par `parametresPour("M5", …)`. N'y introduire aucune
     variable que M5 ne fournit pas, elle arriverait vide.
     ────────────────────────────────────────────────────────────────── */
  {
    code: "M5c",
    structure: "lettre",
    nom: "M5c · Atelier · La maquette corrigée",
    sujet: `${TITRE}, vos corrections sont faites`,
    preheader: "Nous avons repris vos remarques. Le numéro est à jour.",
    titreHtml: "Vos corrections sont faites",
    h1: "Vos corrections<br />sont faites.",
    sous: `${PRENOM}, nous avons repris les remarques que vous nous avez laissées dans le document. Le numéro est à jour : reprenez-le page après page, et dites-nous si cette fois tout y est.`,
    carte: carteChiffres(
      { valeur: "{{ params.NB_PAGES }}", legende: "pages composées", grand: true },
      { valeur: "{{ params.DATE_LIMITE }}", legende: "nouvelle date limite", grand: false },
      /* La même note que M5, volontairement : promettre ici des retouches
         illimitées serait une règle commerciale que Mathias n'a pas
         tranchée. */
      "Il reste quelque chose ? Écrivez-le dans le document, puis dites-le nous depuis votre page : nous repassons dessus.",
    ),
    cta: "Revoir ma maquette",
    lien: LIEN,
    pied: "Le délai repart de zéro. Sans réponse de votre part d’ici le {{ params.DATE_LIMITE }}, nous lançons l’impression telle quelle.",
  },
  {
    code: "M6",
    structure: "lettre",
    nom: "M6 · Atelier · Départ à l'impression",
    sujet: `${TITRE} part à l’impression`,
    preheader: "Votre numéro est entre les mains de l'imprimeur.",
    titreHtml: "Départ à l'impression",
    h1: "C’est parti<br />à l’impression.",
    /* T-120 (18/09/2026) : ce mail part à la COMMANDE d'impression, plus au
       clic de validation. « A quitté l'atelier » est donc vrai au moment où
       il arrive, et le pied annonce le prochain mail, celui de l'expédition. */
    sous: `${PRENOM}, votre numéro a quitté l’atelier : il est entre les mains de l’imprimeur. Plus rien ne peut être modifié, c’est ce qui garantit qu’il arrivera exactement tel que vous l’avez validé.`,
    cta: "Suivre mon numéro",
    lien: LIEN,
    pied: "Comptez une dizaine de jours avant de l’avoir entre les mains. Nous vous écrivons dès que le colis est expédié.",
  },
  {
    code: "M7",
    structure: "lettre",
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
    structure: "magazine",
    nuit: NUIT_OFFRIR,
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
    structure: "magazine",
    nuit: NUIT_OFFRIR,
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
    structure: "lettre",
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
    structure: "lettre",
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
    sous: `${PRENOM}, votre numéro n'a plus bougé depuis trois mois. Sans nouvelles de vous d'ici le {{ params.DATE_CLOTURE }}, nous refermons son dossier et nous effaçons ce que vous nous aviez confié. D'ici là, rien n'a changé : votre lien vous ramène exactement où vous vous étiez arrêté.`,
    /* Deux encarts, jamais les mêmes selon le dossier. Ils peuvent coexister
       (une couverture prête ET des photos au coffre) et se lisent alors dans
       le bon ordre : ce qu'elle gagne à revenir, puis ce qu'elle perd à ne
       pas revenir. */
    carte: encartCouverturePrete() + encartPhotosEnAttente(),
    cta: "Reprendre mon numéro",
    lien: LIEN,
    pied: "Si vous préférez que nous refermions ce dossier, vous n'avez rien à faire. Et si vous voulez le reprendre plus tard, dites-le nous : répondez à ce message, nous vous répondrons nous-mêmes.",
  },
  {
    /* C0 — l'invitation des fondateurs (10/09/2026). Leurs comptes ont été
       pré-créés sans mail le 07/09 ; Mathias veut maintenant qu'ils puissent
       se connecter. Le lien N'EXPIRE JAMAIS : il ouvre /compte/bienvenue
       (adresse pré-remplie, un bouton « Recevoir mon lien » qui déclenche
       le flux mot de passe oublié, ou Google). Décision de Mathias du 10/09 :
       un lien à durée limitée finit toujours par tomber sur quelqu'un qui
       lit trop tard. Envoyé par scripts/inviter-fondateurs.ts, jamais par
       une route du site. Aucun tiret cadratin.
       Refonte du 16/09/2026 pour le LANCEMENT : l'intro dit que l'atelier
       ouvre aujourd'hui, le bouton mène à composer, et une image d'en-tête
       (les magazines de l'accueil) coiffe le mail. La mécanique du lien ne
       bouge pas d'un caractère. */
    code: "C0",
    structure: "atelier",
    etapes: [
      { n: "01", img: VISUELS.etape1, t: "Votre histoire", s: "Quelques questions, quelques minutes." },
      { n: "02", img: VISUELS.etape2, t: "Vos photos", s: "Depuis votre t&eacute;l&eacute;phone, &agrave; votre rythme." },
      { n: "03", img: VISUELS.etape3, t: "L&rsquo;atelier compose", s: "Vous validez, nous imprimons." },
    ],
    nom: "C0 · Compte · L'atelier est en ligne",
    sujet: "L'atelier est en ligne",
    preheader: "Composez votre premier magazine, votre espace est prêt.",
    titreHtml: "L'atelier est en ligne",
    h1: "L'atelier<br />est en ligne.",
    hero: {
      /* Charte V2 (26/11) : la même photo des magazines, en JPEG. Le WebP
         d'avant ne s'affichait pas dans Outlook (fiche N, « Images »). */
      src: `${SITE}/images/mails/noel/magazines-table-1040.jpg`,
      alt: "Les magazines Bellajour",
    },
    sous: "{{ params.PRENOM }}, le jour est arrivé : l'atelier ouvre aujourd'hui, et vous en êtes. Fondateur nº{{ params.NUMERO }}, vous composez votre premier magazine avant tout le monde. Vos 30 € de crédit et la livraison offerte sont déjà posés sur votre premier numéro.",
    cta: "Composer mon magazine",
    lien: "{{ params.URL }}",
    pied: "Le lien vous mène à votre espace : d'un clic vous recevez de quoi choisir votre mot de passe, ou vous continuez avec Google, avec cette même adresse. Une question ? Répondez à ce message, nous vous répondrons nous-mêmes.",
  },
  {
    /* C1 — la confirmation d'inscription au COMPTE (04/09). Hors machine à
       états : pas de dossier, pas de TITRE ni de PRENOM (à l'inscription on
       ne connaît qu'une adresse), pas de verrou mails_envoyes. Le lien vient
       de auth.admin.generateLink (src/lib/compte/mails.ts) et pointe NOTRE
       page /compte/confirmer, jamais le domaine Supabase. L'expiration
       annoncée est le réglage « Email OTP expiry » du dashboard (une heure) :
       si Mathias le change là-bas, cette phrase doit suivre. */
    code: "C1",
    structure: "simple",
    nom: "C1 · Compte · Votre espace vous attend",
    sujet: "Votre espace Bellajour vous attend",
    preheader: "Un lien pour l'activer, et tous vos numéros au même endroit.",
    titreHtml: "Votre espace vous attend",
    h1: "Votre espace<br />vous attend.",
    sous: "Bonjour, il ne manque qu'un geste pour activer votre compte Bellajour. Vous y retrouverez tous vos numéros : le suivi, les anciens projets, les magazines à télécharger. Ce lien est valable une heure.",
    cta: "Activer mon compte",
    lien: "{{ params.URL }}",
    pied: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message : rien ne sera créé. Une question ? Répondez-y, nous vous répondrons nous-mêmes.",
  },
  {
    /* C2 — la réinitialisation du mot de passe (04/09). Même famille que C1 :
       hors machine à états, lien frappé par generateLink(recovery), URL de
       NOTRE page /compte/reinitialiser. Le clic n'ouvre aucune session : le
       nouveau mot de passe se choisit sur la page, et c'est lui qui compte
       (invariant nº4, src/lib/compte/session.ts). */
    code: "C2",
    structure: "simple",
    nom: "C2 · Compte · Choisir un nouveau mot de passe",
    sujet: "Votre nouveau mot de passe Bellajour",
    preheader: "Un lien pour le choisir. Il est valable une heure.",
    titreHtml: "Un nouveau mot de passe",
    h1: "Un nouveau<br />mot de passe.",
    sous: "Bonjour, vous avez demandé à changer le mot de passe de votre compte Bellajour. Choisissez-le derrière ce lien : il est valable une heure, et ne sert qu'une fois.",
    cta: "Choisir mon mot de passe",
    lien: "{{ params.URL }}",
    pied: "Si vous n'avez rien demandé, ignorez ce message : votre mot de passe actuel reste inchangé. Une question ? Répondez-y, nous vous répondrons nous-mêmes.",
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

/* Les aperçus LOCAUX sont remplis de valeurs d'exemple : un écran couvert
   de « {{ params.NB_PAGES }} » ne permet pas de juger une mise en page —
   ni de voir qu'un mot déborde. Ce qui part chez Brevo garde évidemment
   les variables. */
export const EXEMPLE = {
  PRENOM: "Camille",
  /* Le numéro de fondateur ne sert qu'à C0 (16/09/2026). */
  NUMERO: "7",
  TITRE: "Notre été à Séville",
  NB_PAGES: "34",
  NB_PHOTOS: "12",
  PRIX: "37",
  /* Le port du relevé RÉEL du 10/09/2026 (France, 32 pages, dos carré :
     9,22 € HT chez Cloudprinter, 11,06 € TTC au taux normal français). Ce
     n'est PAS un tarif décidé — c'est un exemple d'aperçu, comme « Camille »
     et « Notre été à Séville ». Le vrai montant vient du devis, dossier par
     dossier. Le cas fondateur (livraison offerte) se lit en posant
     LIVRAISON_OFFERTE à « oui ». */
  LIVRAISON: "11,06",
  LIVRAISON_OFFERTE: "",
  TOTAL: "48,06",
  /* Le cas « le client choisira son pays » (11/09/2026) se lit en posant
     « oui » ici : les trois mails qui vendent basculent alors sur la phrase
     sans montant. Vide par défaut, parce que le cas le plus fréquent reste
     le dossier chiffré d'avance. */
  PAYS_A_CHOISIR: "",
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
  /* Noël : le récapitulatif carte et crédit de M4 (vider RECAP_CARTE pour
     le cas sans carte, de loin le plus fréquent). */
  RECAP_CARTE: "oui",
  CARTE_DE: "Léa",
  CARTE_MONTANT: "38",
  CREDIT: "",
  RELIQUAT: "12",
  RELIQUAT_JUSQU: "16 novembre 2027",
};

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

/* Importable par le harnais (verif-mails-charte.ts) sans rien lancer. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
