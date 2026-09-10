import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logEvenement } from "./evenements";
import { normaliserPays } from "./pays";
import { lireNumerosMail, envoyerMailAtelier, type NumeroPourMail } from "./mails";
import { EVT_CREDIT_CONSOMME } from "./fondatrice";

/**
 * Les deux handlers de webhook de l'atelier (PRD §9).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE À PART
 *
 * /api/webhook est PARTAGÉ avec la prévente. Ses trois handlers historiques
 * cherchent tous une ligne `waitlist` par email — et une cliente de l'atelier
 * peut parfaitement être inscrite à la waitlist. Sans tri, un paiement
 * d'album de 40 € la confirmerait comme fondatrice de la prévente, avec
 * attribution d'un numéro de fondateur et envoi du mail F1. Un panier
 * d'album abandonné lui enverrait la relance d'acompte.
 *
 * Le tri se fait donc au `switch` de la route, sur `metadata.kind`, AVANT
 * tout accès en base. Ce fichier contient ce que le tri aiguille vers
 * l'atelier ; aucun handler de la prévente n'a été modifié.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Convention de retour, identique aux handlers de la prévente :
 *   true  → 200 à Stripe, l'événement est soldé (même si on n'a rien fait).
 *   false → 500, Stripe rejouera. À ne renvoyer que sur un échec d'ÉCRITURE,
 *           jamais sur une donnée manquante : un rejeu ne la fera pas
 *           apparaître, il bouclerait jusqu'à l'abandon de l'événement.
 */

/** Discriminant posé par /api/atelier/checkout sur la session ET sur le PaymentIntent. */
export const KIND_ATELIER = "atelier";

type MetaAtelier = {
  kind?: string;
  numero_id?: string;
  token?: string;
  palier?: string;
  /* T-021 — posées par /api/atelier/checkout quand la remise fondatrice est
     appliquée d'office. Absentes autrement. */
  credit_fondatrice?: string;
  credit_fondatrice_numero?: string;
  credit_fondatrice_centimes?: string;
  /* Lot 6 (10/09) — ce que le checkout a demandé, décomposé. Les métadonnées
     Stripe sont toujours des CHAÎNES. Absentes sur les sessions ouvertes
     avant ce lot : le webhook doit donc traiter leur absence, pas la supposer
     à zéro (cf. `port_offert` plus bas). */
  prix_centimes?: string;
  livraison_centimes?: string;
  port_offert?: string;
  pays?: string;
};

/**
 * Le tri. Fonction PURE : aucune requête, aucun accès base — c'est la
 * condition pour pouvoir l'appeler avant tout le reste dans le `switch`.
 */
export function estSessionAtelier(session: Stripe.Checkout.Session): boolean {
  return (session.metadata as MetaAtelier | null)?.kind === KIND_ATELIER;
}

/* Extrait l'id d'un champ Stripe qui peut être une chaîne ou un objet expansé.
   Même utilitaire que dans la route webhook — dupliqué plutôt qu'exporté
   depuis un handler de la prévente : ce fichier ne dépend de rien de là-bas. */
function asId(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

/**
 * checkout.session.completed (atelier) — état 2 → état 3.
 *
 * Écrit la transition, range l'adresse renvoyée par Stripe, journalise, et
 * envoie M4. Idempotent : le rejeu d'une session déjà traitée ne réécrit
 * rien, ne rejournalise rien, et ne renvoie pas un second mail.
 */
export async function traiterPaiementAtelier(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  /** T2-11 : le client Stripe de la route, pour aller chercher le lien de la
      facture. Optionnel — sans lui, tout marche, le lien n'apparaît pas. */
  stripe?: Stripe
): Promise<boolean> {
  const meta = (session.metadata ?? {}) as MetaAtelier;
  const numeroId = (meta.numero_id || "").trim();

  /* Pas d'id → on ne sait pas de quel dossier il s'agit, et aucun rejeu ne
     nous l'apprendra. On solde. La clé est TOUJOURS numero_id, jamais
     l'email : l'email est la clé de la prévente et n'a rien à faire ici. */
  if (!numeroId) {
    console.error("[atelier/paiement] session atelier sans numero_id", session.id);
    return true;
  }

  /* Virements et prélèvements se règlent en différé : la session est
     « complete » avant que l'argent n'arrive. On n'ouvre la production que
     sur un paiement effectif. (Aujourd'hui seule la carte est active, donc
     ce cas ne se présente pas — c'est un garde-fou pour le jour où.) */
  if (session.payment_status === "unpaid") {
    console.log("[atelier/paiement] session complete mais impayée — on attend", session.id);
    return true;
  }

  /* Les colonnes du mail (titre, pagination, palier) plutôt qu'une liste
     locale : M4 annonce la même pagination et le même prix que la page
     d'état 2, et les trois mails de l'atelier partagent le même jeu. */
  /* `pays_livraison` est DÉJÀ dans CHAMPS_MAIL (migration 20260910), avec son
     repli : rien à ajouter au select, seulement à déclarer. Optionnel, parce
     que le repli `CHAMPS_MAIL_REPLI` le laisse `undefined` tant que la
     migration n'est pas passée — auquel cas la comparaison ci-dessous ne dit
     rien plutôt que de crier à tort. */
  type NumeroPaiement = NumeroPourMail & {
    etat: string;
    stripe_session_id: string | null;
    pays_livraison?: string | null;
  };

  const { data: numero, error: lectureErr } = await lireNumerosMail<NumeroPaiement | null>(
    (champs) =>
      supabase
        .from("numeros")
        .select(`${champs}, stripe_session_id`)
        .eq("id", numeroId)
        .maybeSingle<NumeroPaiement>(),
  );

  if (lectureErr) {
    console.error("[atelier/paiement] lecture numero échouée", lectureErr.code);
    return false; // panne de lecture → rejeu utile
  }
  if (!numero) {
    console.error("[atelier/paiement] numero_id introuvable", numeroId);
    return true; // rejeu inutile
  }

  /* L'adresse de livraison vient de Stripe et de nulle part ailleurs (PRD §9).
     ⚠️ stripe-node 22 : `session.shipping_details` n'existe plus, l'adresse
     est passée sous `collected_information`. */
  const adresse = session.collected_information?.shipping_details ?? null;

  /* ── T2-11 : le lien « Votre facture » ──────────────────────────────
     `invoice_creation` est actif : Stripe émet une facture, mais son URL
     n'était captée nulle part et la page d'après-paiement promettait un mail
     que Stripe n'envoie pas toujours (jamais en mode test, et Promotions en
     réel). Best-effort STRICT : la facture peut ne pas être finalisée à
     l'instant du webhook — le lien manque alors, la page l'omet, rien ne
     bloque un paiement pour un lien de confort. */
  let factureUrl: string | null = null;
  const factureId = asId(session.invoice as string | { id: string } | null);
  if (stripe && factureId) {
    try {
      const facture = await stripe.invoices.retrieve(factureId);
      factureUrl = facture.hosted_invoice_url ?? null;
    } catch (err) {
      console.error("[atelier/paiement] facture introuvable (non bloquant)", (err as Error)?.message);
    }
  }

  const maintenant = new Date().toISOString();

  /* Transition atomique — même idiome que /api/atelier/valider : le `.eq` sur
     l'état courant EST le verrou. Deux webhooks concurrents (Stripe rejoue
     volontiers), un seul passe, un seul journalise, un seul mail. */
  const ecrire = (patch: Record<string, unknown>) =>
    supabase
      .from("numeros")
      .update(patch)
      .eq("id", numero.id)
      .eq("etat", "apercu_pret")
      .select("id");

  let { data: maj, error: majErr } = await ecrire({
    etat: "payee",
    stripe_session_id: session.id,
    stripe_payment_intent: asId(session.payment_intent),
    adresse_livraison: adresse,
    etat_maj_le: maintenant,
    ...(factureUrl ? { facture_url: factureUrl } : {}),
  });

  /* T-044 — repli 42703, comme ses voisines (donnees.ts, transition,
     cloudprinter/webhook) : si la colonne `facture_url` (migration 20260828)
     manquait en base, l'update entier tomberait, la route rendrait 500,
     Stripe rejouerait en boucle et le dossier resterait en `apercu_pret` —
     la cliente a payé et sa page affiche toujours « Commander ». Un lien de
     confort ne bloque pas un paiement : on réécrit sans lui.
     ⚠️ Ce repli EFFACE une donnée. Il doit donc CRIER (leçon T-001) : la
     console d'abord, et le journal ensuite — la console Vercel s'efface,
     `evenements` est le seul dossier consultable. */
  let factureUrlPerdue = false;
  if (majErr?.code === "42703" && factureUrl) {
    console.error(
      "[atelier/paiement] ⚠️ REPLI 42703 : facture_url absente en base, le lien de facture n'est PAS enregistré. Appliquer supabase/migrations/20260828_atelier_retouches_et_facture.sql.",
      { numero: numero.id, session: session.id },
    );
    factureUrlPerdue = true;
    ({ data: maj, error: majErr } = await ecrire({
      etat: "payee",
      stripe_session_id: session.id,
      stripe_payment_intent: asId(session.payment_intent),
      adresse_livraison: adresse,
      etat_maj_le: maintenant,
    }));
  }

  if (majErr) {
    console.error("[atelier/paiement] update échoué", majErr.code, majErr.message);
    return false; // écriture ratée → rejeu
  }

  if (!maj?.length) {
    /* Zéro ligne touchée. Deux causes, très différentes. */
    if (numero.etat === "payee" && numero.stripe_session_id === session.id) {
      console.log("[atelier/paiement] rejeu d'une session déjà traitée — rien à faire");
    } else {
      /* Le dossier a déjà avancé, et pas grâce à cette session : deuxième
         paiement sur le même numéro, ou webhook arrivé après une action de
         l'atelier. L'argent est encaissé — il faut qu'un humain regarde.
         On journalise en base plutôt qu'en console seule : la console Vercel
         s'efface, `evenements` est le seul dossier consultable (PRD §5). */
      console.error(
        `[atelier/paiement] ⚠️ paiement sur un dossier en état "${numero.etat}" ` +
          `(session ${session.id}, session en base ${numero.stripe_session_id})`
      );
      await logEvenement(supabase, numero.id, "paiement_inattendu", {
        etat_au_moment_du_paiement: numero.etat,
        session_id: session.id,
        session_id_en_base: numero.stripe_session_id,
        payment_intent: asId(session.payment_intent),
        montant_total: session.amount_total,
        a_verifier_a_la_main: true,
      });
    }
    return true;
  }

  /* ── LE PAYS DÉCLARÉ CONTRE LE PAYS RÉEL (lot 3, 10/09/2026) ────────
     Le client a choisi un pays de livraison à l'écran 4, et c'est sur lui
     qu'un devis de port sera demandé (lot 6). L'adresse Stripe arrive ici,
     bien plus tard : rien ne garantit qu'elle soit dans le même pays. Une
     Belge qui déclare « France » puis se fait livrer à Bruxelles fait payer
     l'écart à l'atelier, en silence, et personne ne le voit passer.

     ON NE BLOQUE RIEN. L'argent est encaissé, la commande est légitime, et
     refuser ici laisserait un paiement sans dossier. On CRIE, dans la console
     et surtout au journal du dossier (les logs Vercel s'effacent en une heure
     sur le plan Hobby), puis on continue exactement comme avant.
     APRÈS la transition atomique, et pas avant : un rejeu de webhook (Stripe
     en envoie volontiers deux) sortirait plus haut sans repasser ici, donc la
     divergence ne se journalise qu'UNE fois, comme le reste du dossier.
     Silencieux dans le cas normal — et dans le cas où l'on ne sait pas : pas
     d'adresse Stripe, pas de colonne encore migrée, aucune comparaison. */
  const paysDeclare = normaliserPays(numero.pays_livraison);
  const paysStripe = normaliserPays(adresse?.address?.country);
  const paysDivergent = Boolean(paysDeclare && paysStripe && paysDeclare !== paysStripe);
  if (paysDivergent) {
    console.error(
      `[atelier/paiement] ⚠️ pays divergent : déclaré ${paysDeclare}, adresse Stripe ${paysStripe}`,
      { numero: numero.id, session: session.id },
    );
    await logEvenement(supabase, numero.id, "pays_livraison_divergent", {
      declare: paysDeclare,
      stripe: paysStripe,
      session_id: session.id,
    });
  }

  /* Invariant nº6 — chaque transition d'état écrit dans `evenements`.
     On y range aussi ce que Stripe a calculé de TVA : le jour où une facture
     est contestée, c'est ici qu'on lit ce qui a réellement été appliqué. */
  await logEvenement(supabase, numero.id, "etat_change", {
    de: "apercu_pret",
    vers: "payee",
    par: "stripe",
    session_id: session.id,
    payment_intent: asId(session.payment_intent),
    montant_total: session.amount_total,
    devise: session.currency,
    tva: session.total_details?.amount_tax ?? null,
    pays_livraison: adresse?.address?.country ?? null,
    /* ── LE PORT RÉELLEMENT ENCAISSÉ (lot 6, 10/09/2026) ──────────────
       Ce que Stripe dit avoir pris pour la livraison, pas ce que nous avions
       demandé : les deux doivent coïncider, et c'est ici qu'on pourra le
       vérifier. Les deux champs existent selon la version d'API et le type de
       session — `shipping_cost` sur les sessions récentes, `total_details`
       pour le total ventilé — on lit les deux plutôt que de parier.
       `null` = aucune ligne de livraison sur cette session, ce qui est le cas
       normal des dossiers payés AVANT ce lot. Les métriques additionnent ce
       champ pour tenir le port à part du chiffre d'affaires. */
    livraison_encaissee:
      session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? null,
    port_offert: meta.port_offert === "true",
    /* Ce que le checkout avait annoncé, pour pouvoir comparer plus tard. */
    livraison_demandee_centimes: Number(meta.livraison_centimes) || null,
    /* T-044 — la trace du repli, dans le seul dossier qui ne s'efface pas.
       Absente quand tout va bien : une clé qui ne dit rien n'encombre pas. */
    ...(factureUrlPerdue ? { facture_url_perdue_42703: true } : {}),
  });

  /* ── PORT OFFERT, MAIS ENCAISSÉ QUAND MÊME ? ─────────────────────────
     Même famille que « remise posée mais rien décompté » plus bas : la
     session annonçait une livraison gratuite et Stripe a pris de l'argent
     dessus. Un fondateur a payé un port qu'on lui devait — ça se rembourse,
     encore faut-il le voir. On CRIE, on ne bloque rien : l'argent est
     encaissé, la commande est légitime, et refuser ici laisserait un paiement
     sans dossier. */
  const portEncaisse =
    session.shipping_cost?.amount_total ?? session.total_details?.amount_shipping ?? 0;
  if (meta.port_offert === "true" && portEncaisse > 0) {
    console.error(
      `[atelier/paiement] ⚠️ port annoncé OFFERT mais ${portEncaisse} centimes encaissés`,
      session.id,
    );
  }

  /* ── T-021 : le crédit fondatrice est DÉPENSÉ ────────────────────────
     Écrit seulement si la session portait notre métadonnée ET que Stripe a
     bien décompté quelque chose. La double condition n'est pas de la
     coquetterie : `amount_discount` seul serait vrai pour n'importe quel
     code promo tapé à la main, et la métadonnée seule serait vraie même si
     la remise avait sauté.

     C'est ce que relit `creditDuPourMail` : sans cette ligne, M3 d'un SECOND
     numéro commandé par la même fondatrice promettrait une remise déjà
     dépensée. Le verrou dur reste `max_redemptions: 1` chez Stripe ; ceci
     est ce qui nous permet de le SAVOIR sans l'interroger.
     `numero_fondateur` est en NOMBRE (les métadonnées Stripe sont des
     chaînes) : c'est la clé de recherche du journal, elle doit être du même
     type que celle écrite par `code_fondatrice_cree`. */
  const codeCredit = (meta.credit_fondatrice || "").trim();
  const numeroFondateur = Number(meta.credit_fondatrice_numero);
  if (codeCredit && (session.total_details?.amount_discount ?? 0) > 0) {
    await logEvenement(supabase, numero.id, EVT_CREDIT_CONSOMME, {
      code: codeCredit,
      montant: session.total_details?.amount_discount ?? null,
      ...(Number.isInteger(numeroFondateur) && numeroFondateur > 0
        ? { numero_fondateur: numeroFondateur }
        : {}),
      session_id: session.id,
    });

    /* Miroir lisible sur `waitlist` (20260905) : `credit_consomme_le` +
       `credit_code`. DÉNORMALISATION d'affichage — le journal ci-dessus
       reste la source de vérité, et RIEN ici ne fait échouer le webhook :
       un 42703 (migration pas encore passée) ou toute autre panne se
       loggue et c'est tout. `offer_type` ne bouge jamais : consommer son
       crédit ne défait pas un fondateur (segmentation de campagnes). Le
       `is null` garde la PREMIÈRE date — un webhook rejoué ne la déplace
       pas. */
    if (Number.isInteger(numeroFondateur) && numeroFondateur > 0) {
      try {
        const { error: errMiroir } = await supabase
          .from("waitlist")
          .update({ credit_consomme_le: new Date().toISOString(), credit_code: codeCredit })
          .eq("numero_fondateur", numeroFondateur)
          .is("credit_consomme_le", null);
        if (errMiroir && errMiroir.code !== "42703" && errMiroir.code !== "PGRST204") {
          console.error(
            "[atelier/paiement] miroir credit_consomme_le en panne :",
            errMiroir.message,
          );
        }
      } catch (e) {
        console.error(
          "[atelier/paiement] miroir credit_consomme_le :",
          e instanceof Error ? e.message : e,
        );
      }
    }
  } else if (codeCredit) {
    /* La remise était posée sur la session et n'a rien décompté : elle a
       sauté quelque part. La cliente a payé plein tarif alors qu'elle avait
       droit à 30 € — ça se rembourse, encore faut-il le voir. */
    console.error(
      `[atelier/paiement] ⚠️ crédit fondatrice ${codeCredit} posé mais AUCUNE remise appliquée`,
      session.id,
    );
  }

  /* M4 « {{titre}}, nous composons » (PRD §10). Passe par le helper commun :
     même verrou anti-doublon que M1 et M3 (Stripe rejoue volontiers ses
     webhooks), même repli de titre, même trace dans le journal. */
  await envoyerMailAtelier(supabase, "M4", numero);

  return true;
}

/**
 * checkout.session.expired (atelier) — 24 h sans payer.
 *
 * NE TOUCHE PAS À L'ÉTAT. « Une session non payée expire en 24 h ; le numéro
 * reste en état 2, réutilisable » (PRD §9). La cliente rouvre son lien, le
 * bouton est toujours là, une nouvelle session est créée. Rien à réparer.
 *
 * On se contente de journaliser — et seulement si la session expirée est bien
 * la dernière ouverte. Une cliente qui clique, hésite, revient et reclique
 * laisse derrière elle des sessions périmées dont l'expiration n'apprend
 * rien : les journaliser salirait le seul dossier qu'on puisse consulter.
 *
 * M3b (relance J+3) n'est PAS ici : c'est une tâche planifiée, pas un
 * webhook. Stripe ne sait pas qu'il existe un troisième jour.
 */
export async function traiterExpirationAtelier(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const meta = (session.metadata ?? {}) as MetaAtelier;
  const numeroId = (meta.numero_id || "").trim();
  if (!numeroId) {
    console.error("[atelier/paiement] expiration sans numero_id", session.id);
    return true;
  }

  const { data: numero } = await supabase
    .from("numeros")
    .select("id, etat, stripe_session_id")
    .eq("id", numeroId)
    .maybeSingle<{ id: string; etat: string; stripe_session_id: string | null }>();

  if (!numero) return true;

  /* Session périmée après un reclic : la cliente a déjà une session plus
     récente, celle-ci ne raconte rien. */
  if (numero.stripe_session_id !== session.id) return true;

  await logEvenement(supabase, numero.id, "checkout_expire", {
    session_id: session.id,
    etat: numero.etat,
  });

  return true;
}

/**
 * Le tri, côté Charge. `charge.refunded` ne porte AUCUNE métadonnée de
 * session : c'est le PaymentIntent qui les transmet à la Charge, et c'est
 * pour ça que /api/atelier/checkout pose `payment_intent_data.metadata`.
 */
export function estChargeAtelier(charge: Stripe.Charge): boolean {
  return (charge.metadata as MetaAtelier | null)?.kind === KIND_ATELIER;
}

/**
 * charge.refunded (atelier) — on journalise, on ne décide rien.
 *
 * Un remboursement d'album n'a pas d'état dans la machine (PRD §6) : selon
 * qu'il arrive avant l'impression ou après la livraison, il veut dire des
 * choses opposées. Le remettre en état 2 relancerait la vente d'un numéro
 * peut-être déjà chez la cliente ; le passer en « livré » effacerait le
 * remboursement. Aucun automatisme n'est bon ici — c'est une décision
 * humaine, prise dans /admin.
 *
 * Ce que le code doit garantir, c'est que la trace existe et qu'elle est
 * lisible dans le dossier. Sans cette branche, le remboursement partirait
 * chez le handler de la prévente, qui n'en ferait rien de dangereux mais
 * n'en laisserait aucune trace ici.
 */
export async function traiterRemboursementAtelier(
  supabase: SupabaseClient,
  charge: Stripe.Charge
): Promise<boolean> {
  const meta = (charge.metadata ?? {}) as MetaAtelier;
  const numeroId = (meta.numero_id || "").trim();
  if (!numeroId) {
    console.error("[atelier/paiement] remboursement sans numero_id", charge.id);
    return true;
  }

  console.warn(`[atelier/paiement] ⚠️ remboursement sur le numéro ${numeroId} — à traiter à la main`);

  await logEvenement(supabase, numeroId, "remboursement", {
    charge_id: charge.id,
    payment_intent: asId(charge.payment_intent),
    montant_rembourse: charge.amount_refunded,
    integralement_rembourse: charge.refunded,
    devise: charge.currency,
    a_verifier_a_la_main: true,
  });

  return true;
}
