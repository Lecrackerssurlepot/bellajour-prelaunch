import type { SupabaseClient } from "@supabase/supabase-js";
import { logEvenement } from "./evenements";
import { sendBrevoEmail } from "@/lib/brevo";
import { eurosPour, type PalierCle } from "./prix";
import { ajouterJours, formaterJour } from "./dates";
import { etapeDepot } from "./urgence";

/**
 * Les mails de l'atelier (PRD §10) — un seul chemin d'envoi pour tous.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS GARANTIES, DANS CET ORDRE
 *
 * 1. ON N'ENVOIE JAMAIS UN MAIL QUI TOMBE SUR UNE PAGE VIDE.
 *    M3 annonce « votre couverture » et un prix : sans `apercu_urls` ni
 *    `palier`, la cliente clique et trouve une page sans image et sans
 *    montant. Le dossier incomplet n'est pas envoyé, il est SIGNALÉ.
 *
 * 2. ON N'ENVOIE JAMAIS DEUX FOIS.
 *    L'insertion dans `mails_envoyes` est le verrou (unique sur numero_id +
 *    code). Elle a lieu AVANT l'appel à Brevo : deux relèves simultanées,
 *    une seule gagne. Voir la migration 20260824 pour le pourquoi de la
 *    table plutôt que d'une colonne.
 *
 * 3. UN ÉCHEC BREVO NE PERD PAS LE MAIL.
 *    Si l'envoi échoue, le verrou est RETIRÉ et l'échec journalisé : la
 *    relève suivante réessaiera. Sans ça, M3 — le mail dont dépend tout le
 *    chiffre d'affaires — pourrait disparaître sur un 500 de Brevo sans que
 *    personne ne le sache jamais.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `evenements` garde son rôle de récit (invariant nº6) : chaque départ y
 * écrit une ligne `mail_envoye`, chaque échec une ligne `mail_echec`. La
 * table de verrou, elle, se nettoie sans remords quand il faut relancer.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export type CodeMail =
  | "M1"
  | "M2"
  /* M2b — le dépôt resté en plan. Voir codesPour, case "photos_recues". */
  | "M2b"
  | "M3"
  | "M3b"
  | "M4"
  | "M5"
  | "M6"
  | "M7"
  | "M8"
  | "M9";

/** Les colonnes de `numeros` que tout envoi doit avoir sous la main. */
export const CHAMPS_MAIL =
  "id, token, etat, titre, prenom, email, nb_photos, nb_pages, palier, apercu_urls, " +
  "consent_photos, created_at, etat_maj_le, transporteur, tracking_url, stripe_payment_intent, " +
  "retouches_demandees_le";

export type NumeroPourMail = {
  id: string;
  token: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  nb_photos: number | null;
  nb_pages: number | null;
  palier: PalierCle | null;
  apercu_urls: unknown;
};

/** Ce qu'il faut EN PLUS pour décider quels mails sont dus (cf. codesPour). */
export type NumeroPourReleve = NumeroPourMail & {
  etat: string;
  consent_photos: boolean | null;
  created_at: string | null;
  etat_maj_le: string | null;
  transporteur: string | null;
  tracking_url: string | null;
  stripe_payment_intent: string | null;
  retouches_demandees_le: string | null;
};

export type Resultat =
  | { statut: "envoye"; template: number }
  | { statut: "deja_envoye" }
  | { statut: "incomplet"; manque: string[] }
  | { statut: "sans_template" }
  | { statut: "echec" };

/* Les identifiants de template vivent en variable d'environnement, jamais en
   dur : les ID diffèrent entre le compte de test et le compte réel. Lus à
   CHAQUE appel (et non au chargement du module) pour qu'un ajout de variable
   sur Vercel prenne effet au redéploiement sans dépendre du cache de module. */
function templatePour(code: CodeMail): number | undefined {
  const brut = {
    M1: process.env.BREVO_TEMPLATE_M1_ID,
    M2: process.env.BREVO_TEMPLATE_M2_ID,
    M2b: process.env.BREVO_TEMPLATE_M2B_ID,
    M3: process.env.BREVO_TEMPLATE_M3_ID,
    M3b: process.env.BREVO_TEMPLATE_M3B_ID,
    M4: process.env.BREVO_TEMPLATE_M4_ID,
    M5: process.env.BREVO_TEMPLATE_M5_ID,
    M6: process.env.BREVO_TEMPLATE_M6_ID,
    M7: process.env.BREVO_TEMPLATE_M7_ID,
    M8: process.env.BREVO_TEMPLATE_M8_ID,
    M9: process.env.BREVO_TEMPLATE_M9_ID,
  }[code];
  return Number(brut) || undefined;
}

/**
 * Le template de ce mail est-il configuré ?
 *
 * Sert à /admin : l'écran de confirmation doit dire « elle ne sera PAS
 * prévenue » quand le template manque encore. Un drapeau écrit en dur dans la
 * table des transitions mentirait le jour où la variable arrive.
 */
export function templateExiste(code: string): boolean {
  return templatePour(code as CodeMail) !== undefined;
}

/** Ce que chaque mail annonce, pour l'afficher à l'atelier. */
export const OBJET_MAIL: Record<CodeMail, string> = {
  M1: "c'est parti, nous avons vos photos",
  M2: "il manque les photos",
  M2b: "vos photos sont là, il manque votre accord",
  M3: "votre couverture est prête",
  M3b: "relance, votre numéro vous attend",
  M4: "paiement reçu",
  M5: "la maquette complète",
  M6: "départ à l'impression",
  M7: "votre numéro est en route",
  M8: "le prochain moment ?",
  M9: "quelques photos de plus ?",
};

/**
 * Le titre tel qu'il se lit dans un objet de mail.
 *
 * L'écran 3 autorise explicitement « Je ne sais pas encore, choisissez pour
 * moi » : le titre peut être vide, et l'objet ne peut pas commencer par une
 * virgule. Majuscule, parce que ça ouvre une phrase.
 */
export function titrePourMail(titre: string | null | undefined): string {
  return titre?.trim() || "Votre numéro";
}

/**
 * Ce qui manque pour que le mail ait un sens. Fonction PURE : la relève s'en
 * sert pour dire à l'atelier ce qu'il reste à saisir, sans rien envoyer.
 */
export function manquePour(code: CodeMail, n: NumeroPourMail): string[] {
  const manque: string[] = [];
  if (!n.email) manque.push("email");

  /* Tous les mails postérieurs à la publication de l'aperçu annoncent une
     pagination et un prix : sans eux, la page sur laquelle ils envoient est
     muette sur ce qui a été acheté. */
  if (["M3", "M3b", "M4", "M5", "M6", "M7"].includes(code)) {
    if (!n.nb_pages) manque.push("nb_pages");
    if (!n.palier) manque.push("palier");
  }
  /* M2b dit « vos N photos sont arrivées ». À zéro, il devient M2 et ce
     n'est plus le même mail : on refuse plutôt que de promettre du vide. */
  if (code === "M2b" && !(n.nb_photos ?? 0)) manque.push("nb_photos");

  /* M7 annonce un transporteur : sans lui, « votre numéro est en route » ne
     dit pas par qui, et la cliente n'a rien à suivre. */
  if (code === "M7" && !(n as Partial<NumeroPourReleve>).transporteur) {
    manque.push("transporteur");
  }
  if (code === "M3" || code === "M3b") {
    const a = n.apercu_urls;
    const vide =
      !a ||
      (Array.isArray(a) && a.length === 0) ||
      (typeof a === "object" && !Array.isArray(a) && Object.keys(a as object).length === 0);
    if (vide) manque.push("apercu_urls");
  }
  return manque;
}

/** L'échéance d'auto-validation annoncée par M5 (PRD §11). */
export const JOURS_AVANT_AUTO_VALIDATION = 7;

/**
 * Les variables envoyées à Brevo pour ce mail.
 *
 * Exportée pour être VÉRIFIÉE : `scripts/verif-mails-brevo.mjs` compare cette
 * liste aux `{{ params.X }}` réellement présents dans chaque template. Un
 * template qui attend une variable que le code n'envoie pas produit un trou
 * silencieux dans le mail — pas une erreur, juste un mot manquant que
 * personne ne remarque avant qu'une cliente le signale.
 */
export function parametresPour(code: CodeMail, n: NumeroPourMail): Record<string, unknown> {
  const r = n as Partial<NumeroPourReleve>;
  const communs = {
    PRENOM: n.prenom ?? "",
    TITRE: titrePourMail(n.titre),
    LIEN: `${SITE_URL}/numero/${n.token}`,
  };

  if (code === "M1" || code === "M2" || code === "M2b" || code === "M9") {
    const avecPhotos = { ...communs, NB_PHOTOS: n.nb_photos ?? 0 };
    /* M9 (T2-3) : MOT est le mot facultatif de l'atelier, saisi sur l'action
       « Demander plus de photos » et passé en `extra` à l'envoi immédiat.
       Vide par défaut : le template le rend conditionnellement, et la liste
       vérifiée par verif-mails-brevo reste complète. Si l'envoi immédiat
       échoue et que la relève rattrape, le mot est perdu (il ne vit pas en
       base) — accepté, il reste lisible dans le journal de la transition. */
    return code === "M9" ? { ...avecPhotos, MOT: "" } : avecPhotos;
  }

  /* Tout ce qui suit affiche la pagination et le prix. Le montant vient de la
     grille SERVEUR, jamais du navigateur (invariant nº2) — c'est exactement
     celui que la page d'état 2 a annoncé. */
  const achat = { NB_PAGES: n.nb_pages ?? 0, PRIX: eurosPour(n.palier) ?? "" };

  if (code === "M5") {
    /* La date que M5 annonce EST celle que la relève appliquera : les deux
       lisent `etat_maj_le` et la même constante. Une date de courtoisie qui
       ne correspondrait pas à la bascule réelle serait pire que pas de date. */
    return {
      ...communs,
      ...achat,
      DATE_LIMITE: r.etat_maj_le
        ? formaterJour(ajouterJours(r.etat_maj_le, JOURS_AVANT_AUTO_VALIDATION))
        : "",
    };
  }

  if (code === "M7") {
    return {
      ...communs,
      ...achat,
      TRANSPORTEUR: r.transporteur ?? "",
      SUIVI: r.tracking_url ?? "",
    };
  }

  return { ...communs, ...achat };
}

/**
 * Envoie un mail de l'atelier, une fois et une seule.
 *
 * Ne throw jamais — même contrat que sendBrevoEmail et logEvenement : aucun
 * mail ne doit pouvoir faire échouer un dépôt, un paiement ou une relève.
 */
export async function envoyerMailAtelier(
  supabase: SupabaseClient,
  code: CodeMail,
  numero: NumeroPourMail,
  /** Paramètres de template en PLUS de `parametresPour` (T2-3 : le MOT de
      M9). Fusionnés par-dessus — un extra peut préciser, jamais retirer. */
  extra?: Record<string, unknown>
): Promise<Resultat> {
  try {
    const manque = manquePour(code, numero);
    if (manque.length) {
      console.error(`[atelier/mails] ${code} non envoyé — il manque ${manque.join(", ")}`);
      return { statut: "incomplet", manque };
    }

    const template = templatePour(code);
    if (!template) {
      /* Pas de verrou posé : le jour où la variable arrive, le mail partira.
         C'est ce qui permet de câbler un mail avant que son template existe. */
      console.error(`[atelier/mails] ${code} sauté — BREVO_TEMPLATE_${code}_ID absent`);
      return { statut: "sans_template" };
    }

    /* ── le verrou ─────────────────────────────────────────────────────
       Posé AVANT l'envoi. Le doublon (23505) est le cas NORMAL d'une
       relève qui repasse sur un dossier déjà traité : ce n'est pas une
       erreur, on ne la journalise pas. */
    const { error: verrouErr } = await supabase
      .from("mails_envoyes")
      .insert({ numero_id: numero.id, code, template_id: template });

    if (verrouErr) {
      if (verrouErr.code === "23505") return { statut: "deja_envoye" };
      console.error(`[atelier/mails] ${code} verrou impossible`, verrouErr.code, verrouErr.message);
      return { statut: "echec" };
    }

    const envoye = await sendBrevoEmail({
      label: code,
      templateId: template,
      email: numero.email ?? "",
      name: numero.prenom ?? undefined,
      apiKey: process.env.BREVO_API_KEY,
      params: { ...parametresPour(code, numero), ...extra },
    });

    if (!envoye) {
      /* Brevo a refusé. On rend le verrou pour que la relève suivante
         réessaie, et on laisse une trace dans le dossier : un mail qui n'est
         jamais parti doit se voir, sinon on cherche pendant des jours
         pourquoi une cliente ne répond pas. */
      await supabase
        .from("mails_envoyes")
        .delete()
        .eq("numero_id", numero.id)
        .eq("code", code);
      await logEvenement(supabase, numero.id, "mail_echec", { code, template_id: template });
      return { statut: "echec" };
    }

    await logEvenement(supabase, numero.id, "mail_envoye", { code, template_id: template });
    return { statut: "envoye", template };
  } catch (err) {
    console.error(`[atelier/mails] ${code} exception`, (err as Error)?.message);
    return { statut: "echec" };
  }
}

/* ───────────────────────── la relève d'UN dossier ─────────────────────────
 *
 * Ce que /admin appelle en fin de transition (lot 7).
 *
 * Il n'y a PAS de logique d'envoi ici : tout passe par `envoyerMailAtelier`,
 * donc par le même verrou et les mêmes garanties que le balayage de
 * /api/atelier/mails/relever. Deux appelants, un seul chemin. /admin ne
 * réécrit rien, il déclenche.
 *
 * Le balayage garde sa boucle propre parce qu'il traite 200 dossiers d'un
 * coup et pré-charge les verrous en une requête : sur UN dossier, cette
 * optimisation n'a pas de sens, et la partager coûterait plus de complexité
 * qu'elle n'en épargne.
 */

/* ═════════════════════════════════════════════════════════════════════════
 * QUELS MAILS SONT DUS — LA RÈGLE, ÉCRITE UNE FOIS
 *
 * Utilisée par les DEUX appelants : /admin après une transition (le mail part
 * dans la seconde) et le balayage (le filet, plus les mails à retardement que
 * personne ne peut déclencher — M2, M3b, M8). Une seule table de règles, donc
 * aucun risque que le bouton et le balayage ne soient pas d'accord.
 *
 * ── LE GARDE-FOU DE CHAÎNE ───────────────────────────────────────────────
 * Un mail ne part QUE si son prédécesseur est parti.
 *
 * Ce n'est pas de la prudence abstraite : au moment de brancher M5→M9, la
 * base contenait un dossier en état « validée » qui n'avait JAMAIS reçu le
 * moindre mail (état forcé à la main pendant les tests, jamais payé). Sans
 * cette règle, le premier balayage lui envoyait « votre numéro part à
 * l'impression » — à une vraie adresse, pour un album qui n'existe pas.
 *
 * La règle est aussi juste sur le fond : on n'annonce pas « votre maquette
 * est prête » à quelqu'un à qui on n'a jamais dit « paiement reçu ». Elle
 * remplace avantageusement une date de mise en service en dur, qui serait
 * devenue un mystère dans six mois.
 *
 * Seul M2 n'a pas de prédécesseur (il part AVANT tout autre mail). Il porte
 * donc la seule borne de date du fichier, et elle est nommée.
 * ═════════════════════════════════════════════════════════════════════════ */

/**
 * Date de mise en service des mails à retardement.
 *
 * Uniquement pour M2 : « J+1 sans photo déposée » n'a aucun mail antérieur
 * sur lequel s'appuyer, et la base contenait des questionnaires abandonnés
 * vieux de plusieurs jours au moment du branchement. Les relancer aurait été
 * absurde — et pour certains, gênant.
 *
 * ⚠️ RÉGLABLE PAR ENVIRONNEMENT (`ATELIER_M2_DEPUIS`), et ce n'est pas une
 * commodité de test : une date de mise en service EST un réglage. Écrite en
 * dur, elle rendait M2 impossible à éprouver — pour qu'un dossier soit à la
 * fois postérieur à la borne et vieux de plus de 24 h, il fallait attendre le
 * lendemain de la borne. Sur la preview, on recule la borne et M2 se teste en
 * deux minutes ; la production garde la sienne.
 *
 * Valeur illisible ou absente : on retombe sur la date réelle de mise en
 * service. Jamais d'ouverture par défaut sur un mail de relance.
 */
const MISE_EN_SERVICE_PAR_DEFAUT = "2026-08-25T00:00:00Z";

function miseEnServiceM2(): number {
  const brut = process.env.ATELIER_M2_DEPUIS;
  const pose = brut ? Date.parse(brut) : NaN;
  return Number.isNaN(pose) ? Date.parse(MISE_EN_SERVICE_PAR_DEFAUT) : pose;
}

const HEURE = 3_600_000;
const JOUR = 24 * HEURE;

/** Ce que le balayage sait des mails déjà partis pour un dossier. */
export type Envoyes = Map<string, string>; /* code -> envoye_le (ISO) */

function partiDepuis(envoyes: Envoyes, code: CodeMail, maintenant: Date): number | null {
  const quand = envoyes.get(code);
  if (!quand) return null;
  const t = Date.parse(quand);
  return Number.isNaN(t) ? null : maintenant.getTime() - t;
}

/**
 * Les codes dus pour ce dossier, maintenant. Fonction PURE.
 *
 * Peut en rendre DEUX (un aperçu publié il y a quatre jours doit M3 — s'il
 * avait échoué — et M3b). L'ordre est celui de l'envoi.
 */
export function codesPour(
  n: NumeroPourReleve,
  envoyes: Envoyes,
  maintenant: Date,
): CodeMail[] {
  const dus: CodeMail[] = [];
  const deja = (code: CodeMail) => envoyes.has(code);
  const ageEtat = n.etat_maj_le ? maintenant.getTime() - Date.parse(n.etat_maj_le) : 0;

  switch (n.etat) {
    case "photos_recues": {
      /* Le dépôt est terminé : `consent_photos` est le SEUL signal serveur
         qui le dit (posé par depot/moteur.ts au clic « Envoyer à l'atelier »). */
      const depot = etapeDepot(n.consent_photos, n.nb_photos ?? 0);

      if (depot === "termine") {
        if ((n.nb_photos ?? 0) > 0) dus.push("M1");
        /* Dépôt terminé : plus AUCUNE relance, même si le compteur est à zéro.
           Elle a fait ce qu'on lui demandait ; le trou est de notre côté. */
        break;
      }

      /* ── la relance, à J+1 ──────────────────────────────────────────
         Deux situations, deux mails, et surtout PAS le même texte.

         Avant le 25/08, la relance exigeait `nb_photos === 0`. Une cliente
         qui avait monté 55 photos sans cliquer « Envoyer » ne recevait donc
         rien : ni M1 (pas de consentement), ni M2 (elle a des photos). Le
         silence complet, pour la prospect la plus engagée qui soit.

         Et lui envoyer M2 tel quel aurait été pire que le silence : « il
         manque vos photos, son dossier est encore vide » à quelqu'un qui
         vient d'en monter cinquante-cinq, c'est lui dire qu'on les a
         perdues. D'où M2b, qui dit l'inverse : elles sont là. */
      if (
        n.created_at &&
        Date.parse(n.created_at) >= miseEnServiceM2() &&
        maintenant.getTime() - Date.parse(n.created_at) >= JOUR
      ) {
        dus.push(depot === "abandonne" ? "M2b" : "M2");
      }
      break;
    }

    case "photos_insuffisantes":
      if (deja("M1")) dus.push("M9");
      break;

    case "apercu_pret": {
      dus.push("M3");
      /* M3b — « le mail qui rapporte le plus de tout le système » (PRD §10).
         Trois jours après M3, si elle n'a toujours pas payé. */
      const ageM3 = partiDepuis(envoyes, "M3", maintenant);
      if (ageM3 !== null && ageM3 >= 3 * JOUR && !n.stripe_payment_intent) dus.push("M3b");
      break;
    }

    /* État 3 : M4 part au webhook Stripe, à la seconde du paiement. Le
       balayage ne le rattrape volontairement PAS — il enverrait « paiement
       reçu » avec des jours de retard aux dossiers passés en payée à la main
       pendant les tests. */
    case "payee":
      break;

    case "maquette_prete":
      if (deja("M4")) dus.push("M5");
      break;

    case "validee":
      if (deja("M5")) dus.push("M6");
      break;

    case "en_production":
      break;

    case "expediee":
      if (deja("M6")) dus.push("M7");
      break;

    case "livree":
      /* J+3 après livraison, pas le jour même : « le prochain moment ? » le
         jour où le colis arrive, c'est vendre avant d'avoir laissé ouvrir. */
      if (deja("M7") && ageEtat >= 3 * JOUR) dus.push("M8");
      break;
  }

  return dus.filter((c) => !deja(c));
}

/**
 * Le dossier doit-il basculer en validation automatique ? (PRD §11)
 *
 * « L'auto-validation à J+7 est indispensable : sans elle, une part des
 * dossiers payés dort indéfiniment et la production ne se ferme jamais. »
 *
 * ⚠️ Conditionnée à l'envoi RÉEL de M5. Valider automatiquement un dossier à
 * qui l'on n'a jamais annoncé la maquette, c'est imprimer sans que personne
 * ait rien vu — et l'échéance annoncée dans M5 est justement celle-ci.
 */
export function doitAutoValider(n: NumeroPourReleve, envoyes: Envoyes, maintenant: Date): boolean {
  /* T2-13 : elle a dit « j'ai noté des retouches dans le Canva ». Imprimer
     d'office par-dessus des demandes de correction serait exactement le
     silence qui coûte : l'échéance est SUSPENDUE tant que l'atelier n'a pas
     republié la maquette (la republication remet ce champ à null et fait
     repartir etat_maj_le, donc les 7 jours). */
  if (n.retouches_demandees_le) return false;
  if (n.etat !== "maquette_prete" || !envoyes.has("M5") || !n.etat_maj_le) return false;
  return maintenant.getTime() - Date.parse(n.etat_maj_le) >= JOURS_AVANT_AUTO_VALIDATION * JOUR;
}

export type Releve =
  | { code: CodeMail; resultat: Resultat }
  | { code: null; resultat: null };

/** Ce qui est déjà parti pour un dossier, avec les dates (M3b en a besoin). */
export async function lireEnvoyes(
  supabase: SupabaseClient,
  numeroId: string
): Promise<Envoyes> {
  const { data } = await supabase
    .from("mails_envoyes")
    .select("code, envoye_le")
    .eq("numero_id", numeroId)
    .returns<Array<{ code: string; envoye_le: string }>>();
  return new Map((data ?? []).map((m) => [m.code, m.envoye_le]));
}

export async function releverDossier(
  supabase: SupabaseClient,
  numeroId: string,
  /** Passés à l'envoi du premier code dû (T2-3 : le MOT de M9, connu du seul
      appel immédiat de la transition — le balayage n'en a pas). */
  extra?: Record<string, unknown>
): Promise<Releve> {
  try {
    const { data } = await supabase
      .from("numeros")
      .select(CHAMPS_MAIL)
      .eq("id", numeroId)
      .maybeSingle<NumeroPourReleve>();

    if (!data) return { code: null, resultat: null };

    const codes = codesPour(data, await lireEnvoyes(supabase, numeroId), new Date());
    if (!codes.length) return { code: null, resultat: null };

    /* Après une transition, un seul mail est dû en pratique. S'il y en avait
       deux (cas d'un rattrapage), on envoie le premier ici et le balayage
       prendra le second : /admin n'a pas à devenir un moteur d'envoi. */
    const code = codes[0];
    return { code, resultat: await envoyerMailAtelier(supabase, code, data, extra) };
  } catch (err) {
    console.error("[atelier/mails] relève d'un dossier échouée", (err as Error)?.message);
    return { code: null, resultat: null };
  }
}
