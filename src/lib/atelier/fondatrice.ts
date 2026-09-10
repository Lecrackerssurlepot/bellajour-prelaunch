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
 *
 * ── LE RATTACHEMENT À LA MAIN (10/09/2026) ───────────────────────────────
 * Un fondateur peut composer son numéro sous une AUTRE adresse que celle de
 * sa prévente. La détection par `email_canonical` ne le voit alors pas, et le
 * filet manuel non plus, puisqu'il passe par la même détection : ce fondateur
 * n'était atteignable par AUCUN des deux chemins. L'admin peut donc DÉSIGNER
 * la ligne `waitlist` à laquelle un dossier se rattache — un événement
 * `fondateur_rattache` au journal, aucune colonne, aucune migration.
 *
 * Trois bornes s'ajoutent aux quatre ci-dessus, et aucune ne les affaiblit :
 *
 *   5. Le geste est réservé à un ADMIN AUTHENTIFIÉ et journalisé avec son
 *      prénom : « Mathias a rattaché le dossier au fondateur nº3 ». Ce n'est
 *      pas un champ que le client remplit, c'est une décision attribuable.
 *   6. Il DÉSIGNE un droit, il n'en crée aucun. La ligne `waitlist` visée est
 *      relue à l'instant du geste ET à l'instant du crédit, et doit être
 *      `founder` + `confirmed` + numéro attribué, exactement comme pour la
 *      détection par email. Un numéro qui ne correspond à rien ne donne rien.
 *   7. L'unicité ne bouge pas : `max_redemptions: 1` chez Stripe et le
 *      journal indexé sur `numero_fondateur`. Deux dossiers rattachés au même
 *      fondateur se partagent donc UN crédit, pas deux.
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
/**
 * L'admin a désigné à la main le fondateur derrière ce dossier (10/09/2026).
 * Payload : `{ numero_fondateur: number, par: string }`. C'est le SEUL moyen
 * d'atteindre un fondateur qui compose sous une autre adresse que celle de sa
 * prévente ; il ne crée aucun droit, il en désigne un (borne nº6 ci-dessus).
 */
export const EVT_FONDATEUR_RATTACHE = "fondateur_rattache";

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

/**
 * Le numéro de fondateur désigné à la main, lu dans les événements
 * `fondateur_rattache` d'un dossier. Le DERNIER gagne.
 *
 * Le dernier, et pas le premier, parce qu'un rattachement est une CORRECTION :
 * se tromper de numéro en dictant au téléphone est exactement le geste que ce
 * formulaire rend possible, et la seule réparation est de recommencer. Le
 * journal reste append-only : la ligne fautive ne disparaît pas, elle est
 * simplement dépassée.
 *
 * Tout payload illisible est IGNORÉ, jamais deviné : une chaîne « 3 », un
 * zéro, un négatif, un décimal ne sont pas des places de fondateur. La
 * conséquence d'un doute est « pas de crédit », qui se rattrape ; l'inverse
 * distribuerait 30 € sur une coquille.
 */
export function numeroRattache(
  lignes: Array<{ payload: unknown }> | null | undefined,
): number | null {
  let dernier: number | null = null;
  for (const l of lignes ?? []) {
    const p = (l?.payload ?? {}) as Record<string, unknown>;
    const n = p.numero_fondateur;
    if (typeof n !== "number" || !Number.isInteger(n) || n <= 0) continue;
    dernier = n;
  }
  return dernier;
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

/**
 * D'où l'on sait que ce dossier est celui d'un fondateur.
 *
 * `email` : sa ligne `waitlist` porte l'adresse du dossier — le cas normal.
 * `rattachement` : un admin l'a désigné à la main, parce qu'il a composé sous
 * une autre adresse. L'écran et le journal le disent, sinon personne ne
 * saurait pourquoi ce dossier-là porte une remise que l'email n'explique pas.
 */
export type OrigineFondateur = "email" | "rattachement";

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
  | { statut: "consomme"; code: string; numeroFondateur: number; origine: OrigineFondateur }
  /** Applicable ici et maintenant. */
  | {
      statut: "pret";
      code: string;
      promotionCodeId: string;
      numeroFondateur: number;
      /** Email ou rattachement à la main : le journal doit pouvoir le dire. */
      origine: OrigineFondateur;
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
 * Les rattachements posés à la main sur CE dossier, dans l'ordre.
 *
 * `limit(5)` : ce geste est rare et se corrige en le refaisant. Cinq lignes
 * couvrent large, et l'ordre chronologique croissant garantit que la dernière
 * lue est bien la dernière écrite — c'est elle qui fait foi.
 */
async function lireRattachements(
  supabase: SupabaseClient,
  numeroId: string,
): Promise<{ numero: number | null } | { erreur: string }> {
  const { data, error } = await supabase
    .from("evenements")
    .select("payload")
    .eq("numero_id", numeroId)
    .eq("type", EVT_FONDATEUR_RATTACHE)
    .order("created_at", { ascending: true })
    .limit(5)
    .returns<Array<{ payload: unknown }>>();

  if (error) return { erreur: `rattachement:${error.code ?? "?"}` };
  return { numero: numeroRattache(data ?? []) };
}

/**
 * La ligne `waitlist` que DÉSIGNE un rattachement — relue, jamais crue.
 *
 * ⚠️ C'EST LA BORNE nº6. Le rattachement dit « ce dossier est celui du
 * fondateur nº3 » ; il ne dit pas « le fondateur nº3 a droit à 30 € ». Ce
 * droit-là ne peut venir que de la prévente, et il se vérifie ici avec la
 * MÊME règle que la détection par email (`numeroFondatricePour`). Un admin
 * qui frappe un numéro fantaisiste ne crée donc aucun crédit.
 */
async function lireFondatriceParNumero(
  supabase: SupabaseClient,
  numeroFondateur: number,
): Promise<{ confirme: boolean } | { erreur: string }> {
  const { data, error } = await supabase
    .from("waitlist")
    .select("offer_type, status, numero_fondateur")
    .eq("numero_fondateur", numeroFondateur)
    .eq("offer_type", "founder")
    .eq("status", "confirmed")
    .limit(1)
    .returns<LigneWaitlist[]>();

  if (error) return { erreur: `waitlist_numero:${error.code ?? "?"}` };
  /* Les filtres SQL ne suffisent pas : la règle des trois conditions vit dans
     `numeroFondatricePour`, et c'est elle qui doit trancher, ici comme
     ailleurs. Deux endroits qui décident « fondateur ou pas » finiraient par
     ne plus dire la même chose. */
  return { confirme: numeroFondatricePour((data ?? [])[0]) === numeroFondateur };
}

/** Ce que la détection rend : un numéro et son origine, rien, ou un doute. */
export type Detection =
  | { numeroFondateur: number; origine: OrigineFondateur }
  | { numeroFondateur: null; origine: null }
  | { erreur: string };

/**
 * LE point de détection : ce dossier est-il celui d'un fondateur, et par quel
 * chemin le sait-on ?
 *
 * Deux chemins, dans cet ordre, et l'ordre compte :
 *   1. L'EMAIL du dossier, comme depuis le 01/09. C'est le cas de très loin
 *      le plus fréquent, et le seul qui ne coûte qu'une requête.
 *   2. Le RATTACHEMENT posé à la main, pour le fondateur qui compose sous une
 *      autre adresse. On ne le lit que si l'email n'a rien donné : un email
 *      qui reconnaît déjà la personne n'a pas besoin d'être corrigé.
 *
 * Un doute (lecture en échec) ressort en `erreur` et n'est JAMAIS traduit en
 * « pas fondateur » : les appelants en font « indisponible », c'est-à-dire
 * plein tarif et un rattrapage à la main. Le contraire — deviner un crédit —
 * ne se rattrape pas.
 */
export async function numeroFondateurDuDossier(
  supabase: SupabaseClient,
  dossier: DossierCredit,
): Promise<Detection> {
  const canon = canonique(dossier);
  if (canon) {
    const wl = await lireFondatrice(supabase, canon);
    if ("erreur" in wl) return { erreur: wl.erreur };
    if (wl.numeroFondateur !== null) {
      return { numeroFondateur: wl.numeroFondateur, origine: "email" };
    }
  }

  const rattache = await lireRattachements(supabase, dossier.id);
  if ("erreur" in rattache) return { erreur: rattache.erreur };
  if (rattache.numero === null) return { numeroFondateur: null, origine: null };

  const confirme = await lireFondatriceParNumero(supabase, rattache.numero);
  if ("erreur" in confirme) return { erreur: confirme.erreur };
  if (!confirme.confirme) return { numeroFondateur: null, origine: null };

  return { numeroFondateur: rattache.numero, origine: "rattachement" };
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
    /* Email PUIS rattachement à la main : une seule détection pour les deux
       appelants, sinon le filet manuel de l'admin ne verrait pas ce que le
       checkout voit (c'était exactement le trou du 10/09). */
    const detection = await numeroFondateurDuDossier(supabase, dossier);
    if ("erreur" in detection) {
      return { statut: "indisponible", pourquoi: detection.erreur, code: null };
    }
    if (detection.numeroFondateur === null) return { statut: "pas_fondatrice" };
    const { numeroFondateur, origine } = detection;

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
        return { statut: "consomme", code: existant.code, numeroFondateur, origine };
      }

      let promo: Stripe.PromotionCode;
      try {
        promo = await stripe.promotionCodes.retrieve(existant.promotionCodeId);
      } catch (err) {
        console.error("[atelier/fondatrice] relecture du code échouée", (err as Error)?.message);
        return { statut: "indisponible", pourquoi: "stripe_relecture", code: existant.code };
      }

      if (!creditEncoreDu(promo)) {
        return { statut: "consomme", code: existant.code, numeroFondateur, origine };
      }

      return {
        statut: "pret",
        code: existant.code,
        promotionCodeId: promo.id,
        numeroFondateur,
        origine,
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
      /* Six mois plus tard, « pourquoi ce dossier a-t-il un crédit alors que
         son email n'est pas celui de la prévente ? » doit avoir une réponse
         dans le journal, pas dans une mémoire. */
      origine,
      ...(par ? { par } : { par: "auto" }),
    });

    return {
      statut: "pret",
      code: frappe.code,
      promotionCodeId: frappe.promotionCodeId,
      numeroFondateur,
      origine,
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
    /* La MÊME détection que le checkout : un dossier rattaché à la main doit
       lire « votre crédit de 30 € est déjà déduit » dans M3, sans quoi le mail
       et la page de paiement se contrediraient. */
    const detection = await numeroFondateurDuDossier(supabase, dossier);
    if ("erreur" in detection || detection.numeroFondateur === null) return null;

    /* Le seul cas où une fondatrice n'a plus de crédit au moment de M3 : elle
       a déjà payé un PREMIER numéro avec. M3 ne part que sur un dossier non
       payé, donc c'est bien un second numéro. */
    if (await creditDejaConsomme(supabase, detection.numeroFondateur)) return null;

    return CREDIT_FONDATRICE_EUROS;
  } catch (err) {
    console.error("[atelier/fondatrice] crédit pour mail indisponible", (err as Error)?.message);
    return null;
  }
}
