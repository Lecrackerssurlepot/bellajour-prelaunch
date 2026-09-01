import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalizeEmail } from "@/lib/email";
import { logEvenement } from "./evenements";

/**
 * Le crédit de 30 € des fondatrices (CGV v3.0 art. 5 bis) — la règle, écrite
 * une seule fois.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX APPELANTS, UNE SEULE LOGIQUE
 *
 * 1. `/api/atelier/checkout` — le chemin NORMAL depuis le 01/09 : la remise
 *    s'applique toute seule sur la session Stripe, la cliente n'a rien à
 *    taper. Décision de Mathias (01/09) : « faire quelque chose
 *    d'automatique ».
 * 2. `/api/admin/atelier/fondatrice-code` — le FILET : l'admin frappe le code
 *    à la main pour le dicter au téléphone ou le coller dans un mail écrit
 *    à la main. Même module, même journal, donc jamais deux codes.
 *
 * Rien ici ne dépend d'un écran : la règle est serveur, comme le prix.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── LE RISQUE ASSUMÉ, ÉCRIT NOIR SUR BLANC ───────────────────────────────
 * Le tunnel de l'atelier n'a AUCUNE authentification : l'email du dossier
 * est tapé à l'écran 4, par qui veut. Accorder la remise sur la seule foi de
 * cet email, c'est accepter que quelqu'un qui DEVINE l'adresse d'une
 * fondatrice puisse capter son crédit. Ce risque est pris sciemment, parce
 * que quatre bornes le rendent petit et réparable :
 *
 *   1. Elles sont QUATORZE, toutes connues, toutes joignables.
 *   2. Le crédit est UNIQUE par fondatrice : `max_redemptions: 1` chez Stripe
 *      (l'autorité), et le journal `evenements` de notre côté — indexé par
 *      `numero_fondateur`, pas par dossier, donc un deuxième numéro commandé
 *      par la même personne ne refrappe RIEN.
 *   3. Le montant est BORNÉ à 30 € : le pire cas coûte trente euros une fois,
 *      pas un abonnement ouvert.
 *   4. Tout est TRACÉ (code, montant, numéro de fondatrice, dossier) : si le
 *      crédit part au mauvais endroit, on sait lequel, quand, sur quel
 *      dossier — et Stripe sait quelle carte a payé.
 *
 * L'alternative — exiger un code envoyé à la personne vérifiée — protégeait
 * mieux mais laissait quatorze clientes payer plein tarif si l'atelier
 * oubliait un envoi manuel. Un droit contractuel qui dépend d'un geste humain
 * n'est pas un droit. On a tranché pour l'automatisme.
 */

/** Le montant contractuel, en centimes. CGV v3.0 art. 5 bis : 30 €, point. */
export const CREDIT_FONDATRICE_CENTIMES = 3000;

/** Le même, en euros — ce que le mail M3 affiche. */
export const CREDIT_FONDATRICE_EUROS = CREDIT_FONDATRICE_CENTIMES / 100;

/** Le code a été frappé chez Stripe (coupon + promotion code). */
export const EVT_CODE_CREE = "code_fondatrice_cree";
/** La remise a été posée d'office sur une session de paiement. */
export const EVT_CREDIT_APPLIQUE = "credit_fondatrice_applique";
/** Le paiement est passé AVEC la remise : le crédit est dépensé. */
export const EVT_CREDIT_CONSOMME = "credit_fondatrice_consomme";

/** La clé de métadonnée posée sur la session Stripe quand la remise est d'office. */
export const META_CREDIT = "credit_fondatrice";

/* ═══════════════════════════════════════════════════════════════════════
 * PARTIE PURE — aucune base, aucun réseau. Éprouvée par verif-atelier.ts.
 * ═══════════════════════════════════════════════════════════════════════ */

/** Ce que `waitlist` doit dire pour qu'une cliente soit fondatrice. */
export type LigneWaitlist = {
  offer_type: string | null;
  status: string | null;
  numero_fondateur: number | null;
};

/**
 * Le numéro de fondatrice, ou null. LES TROIS CONDITIONS, pas deux.
 *
 * `offer_type = 'founder'` seul ne suffit pas : une inscription abandonnée au
 * paiement porte déjà l'intention sans avoir jamais versé les 25 €. C'est
 * `status = 'confirmed'` qui dit l'argent reçu, et `numero_fondateur` qui dit
 * la place attribuée (posée par `assign_numero_fondateur`, côté prévente).
 * Un numéro à 0 ou négatif n'est pas une place : ce serait une colonne mal
 * initialisée, et on ne distribue pas 30 € sur un doute.
 */
export function numeroFondatricePour(w: LigneWaitlist | null | undefined): number | null {
  if (!w) return null;
  if (w.offer_type !== "founder") return null;
  if (w.status !== "confirmed") return null;
  const n = w.numero_fondateur;
  if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/* Le code porte le PRÉNOM du fondateur (décision de Mathias, 31/08) :
   `FONDATEUR-MARIE30`. Le prénom passe en majuscules sans accents ni
   espaces — Stripe n'accepte que des codes simples, et un code se dicte
   parfois au téléphone. */
export function prenomPourCode(prenom: string | null | undefined): string {
  if (!prenom) return "";
  return prenom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * Les deux codes possibles : celui qu'on veut, et le repli.
 *
 * Deux fondatrices peuvent partager un prénom et Stripe refuse deux codes
 * identiques : le repli ajoute le numéro de fondatrice. Un prénom vide (ou
 * réduit à rien une fois nettoyé) retombe sur le numéro seul.
 */
export function codesPossibles(
  prenom: string | null | undefined,
  numeroFondateur: number,
): { voulu: string; repli: string } {
  const p = prenomPourCode(prenom);
  return {
    voulu: p ? `FONDATEUR-${p}30` : `FONDATEUR-N${numeroFondateur}-30`,
    repli: `FONDATEUR-${p || "X"}30-N${numeroFondateur}`,
  };
}

/** Ce que le journal garde d'un code déjà frappé. */
export type CodeAuJournal = {
  code: string;
  promotionCodeId: string | null;
  couponId: string | null;
  creeLe: string;
};

/**
 * Le premier code frappé, lu dans une liste d'événements `code_fondatrice_cree`.
 *
 * Le journal EST la persistance : aucune colonne, aucune migration. Un
 * payload sans `code` lisible ne compte pas — on préfère « rien trouvé » à
 * un code fantôme, parce que c'est « rien trouvé » qui déclenche une
 * création, et une création est réparable ; un code fantôme appliqué à une
 * session Stripe ne l'est pas.
 */
export function codeDansLeJournal(
  lignes: Array<{ payload: unknown; created_at: string }> | null | undefined,
): CodeAuJournal | null {
  for (const l of lignes ?? []) {
    const p = (l.payload ?? {}) as Record<string, unknown>;
    if (typeof p.code !== "string" || !p.code.trim()) continue;
    return {
      code: p.code.trim(),
      promotionCodeId: typeof p.promotion_code_id === "string" ? p.promotion_code_id : null,
      couponId: typeof p.coupon_id === "string" ? p.coupon_id : null,
      creeLe: l.created_at,
    };
  }
  return null;
}

/** L'état d'un promotion code, réduit à ce dont la règle a besoin. */
export type EtatPromo = {
  active: boolean;
  max_redemptions: number | null;
  times_redeemed: number;
} | null;

/**
 * Le crédit est-il encore dû, au vu de ce que Stripe dit du code ?
 *
 * ⚠️ STRIPE EST L'AUTORITÉ, pas nous. `max_redemptions: 1` est ce qui garantit
 * l'unicité même si notre journal se trompe. Un code inactif, ou consommé, ne
 * s'applique pas — et surtout, appliquer un code épuisé ferait ÉCHOUER la
 * création de session : la cliente ne pourrait plus payer du tout.
 *
 * Absence de réponse (null) = false : on ne devine pas un crédit. Une remise
 * non appliquée se rattrape à la main ; une remise appliquée deux fois, non.
 */
export function creditEncoreDu(promo: EtatPromo): boolean {
  if (!promo) return false;
  if (!promo.active) return false;
  const plafond = promo.max_redemptions;
  if (typeof plafond === "number" && promo.times_redeemed >= plafond) return false;
  return true;
}

/**
 * Stripe refuse-t-il ce code parce qu'un autre le porte déjà ?
 *
 * Duck-typing volontaire : ce module n'importe le SDK Stripe qu'en TYPE, pour
 * que `verif-atelier.ts` puisse charger la règle sans embarquer le client
 * HTTP. Le message reste le seul signal fiable — Stripe ne donne pas de code
 * d'erreur dédié à la collision de promotion code.
 */
export function estCollisionDeCode(err: unknown): boolean {
  const e = err as { type?: string; message?: string } | null;
  if (!e || typeof e.message !== "string") return false;
  return /already exists|existing promotion code/i.test(e.message);
}

/**
 * Ce que M3 doit afficher. Rendu en EUROS, jamais en centimes : le template
 * écrit « votre crédit fondatrice de {{ params.CREDIT_FONDATRICE }} € ».
 * Chaîne vide quand il n'y a rien à dire — un `{% if %}` Brevo la traite
 * comme faux, et le bloc disparaît.
 */
export function parametreCredit(euros: number | null | undefined): string {
  if (typeof euros !== "number" || !Number.isFinite(euros) || euros <= 0) return "";
  return String(euros);
}

/* ═══════════════════════════════════════════════════════════════════════
 * PARTIE À EFFETS — base et Stripe.
 * ═══════════════════════════════════════════════════════════════════════ */

/** L'identité minimale d'un dossier pour ce module. */
export type DossierCredit = {
  id: string;
  prenom: string | null;
  email: string | null;
  email_canonical: string | null;
};

export type Credit =
  /** Pas fondatrice, ou pas confirmée : plein tarif, et c'est normal. */
  | { statut: "pas_fondatrice" }
  /**
   * On n'a pas pu SAVOIR (lecture base ou Stripe en échec). On n'applique
   * rien et on ne crée rien : dans le doute, la cliente paie plein tarif et
   * l'atelier rattrape à la main. Le contraire créerait des doublons.
   */
  | { statut: "indisponible"; pourquoi: string; code: string | null }
  /** Le crédit a déjà servi. Une fois, c'est le contrat. */
  | { statut: "consomme"; code: string; numeroFondateur: number }
  /** Applicable ici et maintenant. */
  | {
      statut: "pret";
      code: string;
      promotionCodeId: string;
      numeroFondateur: number;
      /** Le code existait déjà (aucun objet Stripe créé à cet appel). */
      deja: boolean;
      /** L'écriture au journal a réussi (T-038). Faux = idempotence cassée. */
      journalEcrit: boolean;
      creeLe: string;
    };

function canonique(d: DossierCredit): string | null {
  return d.email_canonical ?? (d.email ? canonicalizeEmail(d.email) : null);
}

/**
 * La ligne `waitlist` de cette cliente, relue À L'INSTANT.
 *
 * ⚠️ Seul endroit de l'atelier, avec la fiche admin, qui lit la prévente — et
 * uniquement en LECTURE. C'est la « vérification » de l'article 5 bis, faite
 * par la machine au moment du geste : jamais sur la foi de ce qu'un écran
 * affichait il y a dix minutes.
 */
async function lireFondatrice(
  supabase: SupabaseClient,
  canon: string,
): Promise<{ numeroFondateur: number | null } | { erreur: string }> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("offer_type, status, numero_fondateur")
    .eq("email_canonical", canon)
    .maybeSingle<LigneWaitlist>();

  if (error) return { erreur: `waitlist:${error.code ?? "?"}` };
  return { numeroFondateur: numeroFondatricePour(data) };
}

/**
 * Le code déjà frappé pour CETTE fondatrice — tous dossiers confondus.
 *
 * ⚠️ LA CLÉ EST `numero_fondateur`, PAS `numero_id`. Le crédit est attaché à
 * la personne, pas au magazine : une fondatrice qui commande un second numéro
 * ne rouvre pas un second droit de 30 €. Chercher par dossier aurait frappé
 * un deuxième code au deuxième numéro, en toute bonne foi.
 */
async function lireCodeDeLaFondatrice(
  supabase: SupabaseClient,
  numeroFondateur: number,
): Promise<{ trouve: CodeAuJournal | null } | { erreur: string }> {
  const { data, error } = await supabase
    .from("evenements")
    .select("payload, created_at")
    .eq("type", EVT_CODE_CREE)
    .contains("payload", { numero_fondateur: numeroFondateur })
    .order("created_at", { ascending: true })
    .limit(5)
    .returns<Array<{ payload: Record<string, unknown>; created_at: string }>>();

  if (error) return { erreur: `journal:${error.code ?? "?"}` };
  return { trouve: codeDansLeJournal(data) };
}

/** Le crédit a-t-il déjà été DÉPENSÉ, d'après notre journal ? */
async function creditDejaConsomme(
  supabase: SupabaseClient,
  numeroFondateur: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("evenements")
    .select("id")
    .eq("type", EVT_CREDIT_CONSOMME)
    .contains("payload", { numero_fondateur: numeroFondateur })
    .limit(1);
  if (error) return false; // le journal n'est pas l'autorité : Stripe l'est
  return (data ?? []).length > 0;
}

/**
 * Frappe le coupon et le promotion code chez Stripe.
 *
 * `duration: "once"` : le crédit s'impute sur UNE commande.
 * `max_redemptions: 1` : le code ne sert qu'une fois, même partagé, même
 * deviné. C'est LA garantie d'unicité — le journal n'est qu'un raccourci.
 *
 * L'ordre compte : si le promotion code échoue, on supprime le coupon. Un
 * coupon seul est inerte (rien ne le référence dans un checkout), mais on ne
 * laisse pas d'objet orphelin chez un tiers.
 */
async function frapperLeCode(
  stripe: Stripe,
  d: { numeroId: string; prenom: string | null; numeroFondateur: number },
): Promise<{ code: string; promotionCodeId: string; couponId: string }> {
  const { voulu, repli } = codesPossibles(d.prenom, d.numeroFondateur);
  const metadata = {
    numero_id: d.numeroId,
    numero_fondateur: String(d.numeroFondateur),
  };

  const coupon = await stripe.coupons.create({
    amount_off: CREDIT_FONDATRICE_CENTIMES,
    currency: "eur",
    duration: "once",
    name: `Crédit fondateur nº${d.numeroFondateur} (CGV art. 5 bis)`,
    metadata,
  });

  const creerPromo = (code: string) =>
    stripe.promotionCodes.create({
      /* stripe-node v22 : le coupon se référence via `promotion`. */
      promotion: { type: "coupon", coupon: coupon.id },
      code,
      max_redemptions: 1,
      metadata,
    });

  try {
    let code = voulu;
    let promo: Stripe.PromotionCode;
    try {
      promo = await creerPromo(voulu);
    } catch (collision) {
      /* Code déjà pris (une homonyme) : UNE tentative de repli. Toute autre
         erreur ressort telle quelle. */
      if (!estCollisionDeCode(collision)) throw collision;
      code = repli;
      promo = await creerPromo(repli);
    }
    return { code, promotionCodeId: promo.id, couponId: coupon.id };
  } catch (err) {
    await stripe.coupons.del(coupon.id).catch(() => undefined);
    throw err;
  }
}

/**
 * LE point d'entrée : de quoi cette cliente a-t-elle droit, maintenant ?
 *
 * Réutilise le code existant s'il y en a un, en frappe un sinon, et ne rend
 * jamais un code que Stripe refuserait. Ne throw pas : un crédit est un
 * bonus, il ne doit pas empêcher un paiement d'exister.
 *
 * ⚠️ L'ORDRE DES ÉCRITURES : Stripe d'abord, journal ensuite. Une erreur
 * Stripe ne laisse donc RIEN au journal, et la tentative suivante repart de
 * zéro. L'inverse — journal en échec après création — est REMONTÉ
 * (`journalEcrit: false`) : c'est le journal qui porte l'idempotence côté
 * nous, et sans lui un second passage frapperait un second code. Stripe, lui,
 * refuserait toujours la seconde utilisation (`max_redemptions: 1`).
 */
export async function assurerCreditFondatrice(
  supabase: SupabaseClient,
  stripe: Stripe,
  dossier: DossierCredit,
  /** Le prénom de l'admin qui a cliqué, quand le geste est manuel. */
  par?: string,
): Promise<Credit> {
  try {
    const canon = canonique(dossier);
    if (!canon) return { statut: "pas_fondatrice" };

    const wl = await lireFondatrice(supabase, canon);
    if ("erreur" in wl) return { statut: "indisponible", pourquoi: wl.erreur, code: null };
    const numeroFondateur = wl.numeroFondateur;
    if (numeroFondateur === null) return { statut: "pas_fondatrice" };

    const journal = await lireCodeDeLaFondatrice(supabase, numeroFondateur);
    if ("erreur" in journal) {
      /* Journal illisible = idempotence invérifiable. On refuse de créer
         plutôt que de risquer un doublon de 30 €. */
      return { statut: "indisponible", pourquoi: journal.erreur, code: null };
    }

    const existant = journal.trouve;
    if (existant) {
      if (!existant.promotionCodeId) {
        /* Une vieille ligne sans identifiant de promotion code : on ne peut
           ni vérifier ni appliquer. On rend le code pour l'écran, et on ne
           frappe surtout PAS de remplaçant. */
        return { statut: "indisponible", pourquoi: "code_sans_id", code: existant.code };
      }

      if (await creditDejaConsomme(supabase, numeroFondateur)) {
        return { statut: "consomme", code: existant.code, numeroFondateur };
      }

      let promo: Stripe.PromotionCode;
      try {
        promo = await stripe.promotionCodes.retrieve(existant.promotionCodeId);
      } catch (err) {
        console.error("[atelier/fondatrice] relecture du code échouée", (err as Error)?.message);
        return { statut: "indisponible", pourquoi: "stripe_relecture", code: existant.code };
      }

      if (!creditEncoreDu(promo)) {
        return { statut: "consomme", code: existant.code, numeroFondateur };
      }

      return {
        statut: "pret",
        code: existant.code,
        promotionCodeId: promo.id,
        numeroFondateur,
        deja: true,
        journalEcrit: true,
        creeLe: existant.creeLe,
      };
    }

    let frappe: { code: string; promotionCodeId: string; couponId: string };
    try {
      frappe = await frapperLeCode(stripe, {
        numeroId: dossier.id,
        prenom: dossier.prenom,
        numeroFondateur,
      });
    } catch (err) {
      console.error("[atelier/fondatrice] création du code échouée", (err as Error)?.message);
      return { statut: "indisponible", pourquoi: "stripe_creation", code: null };
    }

    const creeLe = new Date().toISOString();
    const journalEcrit = await logEvenement(supabase, dossier.id, EVT_CODE_CREE, {
      code: frappe.code,
      promotion_code_id: frappe.promotionCodeId,
      coupon_id: frappe.couponId,
      montant: CREDIT_FONDATRICE_CENTIMES,
      numero_fondateur: numeroFondateur,
      ...(par ? { par } : { par: "auto" }),
    });

    return {
      statut: "pret",
      code: frappe.code,
      promotionCodeId: frappe.promotionCodeId,
      numeroFondateur,
      deja: false,
      journalEcrit,
      creeLe,
    };
  } catch (err) {
    console.error("[atelier/fondatrice] exception", (err as Error)?.message);
    return { statut: "indisponible", pourquoi: "exception", code: null };
  }
}

/**
 * Le crédit est-il dû, pour le MAIL ? Lecture seule, aucun objet créé.
 *
 * M3 annonce le lien de paiement : il doit pouvoir dire « votre crédit de
 * 30 € est déjà déduit » sans frapper de coupon au passage — un envoi de mail
 * ne crée rien chez un tiers, jamais.
 *
 * Rend les euros ou null. Un doute (lecture en échec) rend null : mieux vaut
 * un mail muet sur le crédit qu'un mail qui promet une remise absente.
 */
export async function creditDuPourMail(
  supabase: SupabaseClient,
  dossier: DossierCredit,
): Promise<number | null> {
  try {
    const canon = canonique(dossier);
    if (!canon) return null;

    const wl = await lireFondatrice(supabase, canon);
    if ("erreur" in wl || wl.numeroFondateur === null) return null;

    /* Le seul cas où une fondatrice n'a plus de crédit au moment de M3 : elle
       a déjà payé un PREMIER numéro avec. M3 ne part que sur un dossier non
       payé, donc c'est bien un second numéro. */
    if (await creditDejaConsomme(supabase, wl.numeroFondateur)) return null;

    return CREDIT_FONDATRICE_EUROS;
  } catch (err) {
    console.error("[atelier/fondatrice] crédit pour mail indisponible", (err as Error)?.message);
    return null;
  }
}
