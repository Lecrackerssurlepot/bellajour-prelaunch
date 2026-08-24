import type { SupabaseClient } from "@supabase/supabase-js";
import { logEvenement } from "./evenements";
import { sendBrevoEmail } from "@/lib/brevo";
import { eurosPour, type PalierCle } from "./prix";

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

export type CodeMail = "M1" | "M3" | "M4";

/** Les colonnes de `numeros` que tout envoi doit avoir sous la main. */
export const CHAMPS_MAIL =
  "id, token, etat, titre, prenom, email, nb_photos, nb_pages, palier, apercu_urls";

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
    M3: process.env.BREVO_TEMPLATE_M3_ID,
    M4: process.env.BREVO_TEMPLATE_M4_ID,
  }[code];
  return Number(brut) || undefined;
}

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

  if (code === "M3" || code === "M4") {
    if (!n.nb_pages) manque.push("nb_pages");
    if (!n.palier) manque.push("palier");
  }
  if (code === "M3") {
    const a = n.apercu_urls;
    const vide =
      !a ||
      (Array.isArray(a) && a.length === 0) ||
      (typeof a === "object" && !Array.isArray(a) && Object.keys(a as object).length === 0);
    if (vide) manque.push("apercu_urls");
  }
  return manque;
}

function paramsPour(code: CodeMail, n: NumeroPourMail): Record<string, unknown> {
  const communs = {
    PRENOM: n.prenom ?? "",
    TITRE: titrePourMail(n.titre),
    LIEN: `${SITE_URL}/numero/${n.token}`,
  };

  if (code === "M1") {
    return { ...communs, NB_PHOTOS: n.nb_photos ?? 0 };
  }
  /* M3 et M4 affichent tous les deux la pagination et le prix. Le montant
     vient de la grille serveur, jamais du navigateur (invariant nº2) — c'est
     exactement celui que la page d'état 2 a annoncé. */
  return { ...communs, NB_PAGES: n.nb_pages ?? 0, PRIX: eurosPour(n.palier) ?? "" };
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
  numero: NumeroPourMail
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
      params: paramsPour(code, numero),
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
