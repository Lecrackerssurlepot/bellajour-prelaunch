import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { deciderFacture } from "./facturation";
import { envoyerAlerteFacturation } from "@/lib/alerteFacturation";

/**
 * Le job de facturation d'un paiement atelier (T-075, 07/10/2026).
 *
 * Appelé par `traiterPaiementAtelier` APRÈS la transition `apercu_pret →
 * payee` réussie : un webhook rejoué n'arrive jamais ici, et un paiement
 * antérieur à la mise en service non plus. Les six ventes facturées à la main
 * sont inscrites en `emitted_manual` (migration 20261007), et la contrainte
 * UNIQUE sur le payment intent interdit toute seconde ligne.
 *
 * NE LÈVE JAMAIS, NE RENVOIE RIEN : une facture qui ne se prépare pas ne doit
 * ni faire échouer ni ralentir le paiement. On journalise et on continue.
 *
 * PAS DE REPLI 42703/PGRST204, et c'est délibéré (exception à la règle de
 * `supabase/CLAUDE.md`) : un job écrit sans sa série serait lu par l'ancien
 * émetteur comme un acompte à 23 %. Sans la migration, on n'écrit RIEN.
 */
export async function creerJobFacture(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  stripe: Stripe | undefined,
  dossier: { numeroId: string; titre: unknown; quantite: number; creditFondateur: boolean },
): Promise<void> {
  try {
    /* Un paiement de test n'a rien à faire en comptabilité. */
    if (session.livemode === false) {
      console.log("[atelier/facture] mode test : aucun job de facture", session.id);
      return;
    }
    const pi =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    /* Fondateur à 0 € : pas de payment intent, rien d'encaissé, rien à
       facturer (l'acompte l'a déjà été). */
    if (!pi) {
      console.log("[atelier/facture] pas de payment intent (0 €) : aucune facture", session.id);
      return;
    }

    /* La base est ce que Stripe a RÉELLEMENT encaissé, jamais la grille. */
    let encaisse: number | null = null;
    if (stripe) {
      try {
        const intent = await stripe.paymentIntents.retrieve(pi);
        encaisse = intent.amount_received;
      } catch (e) {
        console.error("[atelier/facture] lecture du payment intent impossible", e instanceof Error ? e.message : e);
      }
    }

    const adresse = session.collected_information?.shipping_details ?? null;
    const pays = adresse?.address?.country ?? null;
    const codePostal = adresse?.address?.postal_code ?? null;

    const decision = deciderFacture({
      pays,
      codePostal,
      taxIds: session.customer_details?.tax_ids ?? null,
      ttcCentimes: encaisse,
      quantite: dossier.quantite,
      titre: dossier.titre,
      creditFondateur: dossier.creditFondateur,
    });

    const commun = {
      stripe_payment_intent: pi,
      numero_id: dossier.numeroId,
      origine: "atelier",
      pays_livraison: pays,
      code_postal: codePostal,
      montant_ttc: encaisse !== null ? encaisse / 100 : null,
      quantite: dossier.quantite,
    };

    const ligne: Record<string, unknown> =
      decision.statut === "pending"
        ? {
            ...commun,
            status: "pending",
            serie: decision.serie,
            taux_tva: decision.taux,
            montant_ht: decision.htCentimes / 100,
            montant_tva: decision.tvaCentimes / 100,
            description: decision.description,
            client:
              decision.client === "livraison"
                ? {
                    type: "livraison",
                    article: decision.nomArticle,
                    name: adresse?.name ?? null,
                    address: [adresse?.address?.line1, adresse?.address?.line2].filter(Boolean).join(", "),
                    postal_code: codePostal,
                    city: adresse?.address?.city ?? null,
                    country: "France",
                  }
                : { type: "consumidor_final", article: decision.nomArticle },
          }
        : { ...commun, status: "manual_review", motif_revue: decision.motif };

    const { data, error } = await supabase
      .from("invoice_jobs")
      .upsert(ligne, { onConflict: "stripe_payment_intent", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error("[atelier/facture] ⚠️ job de facture NON créé", error.code, error.message, pi);
      return;
    }
    if (!data || data.length === 0) {
      console.log("[atelier/facture] job déjà présent pour ce paiement", pi);
      return;
    }

    if (decision.statut === "manual_review") {
      await envoyerAlerteFacturation("Paiement atelier à facturer à la main", {
        "Payment intent": pi,
        Motif: decision.motif,
        Pays: pays,
        "Code postal": codePostal,
        "Montant encaissé (€)": encaisse !== null ? (encaisse / 100).toFixed(2) : "illisible",
      });
    }
  } catch (e) {
    console.error("[atelier/facture] ⚠️ préparation de la facture en panne (paiement non affecté)", e instanceof Error ? e.message : e);
  }
}

/**
 * Un remboursement sur un paiement DÉJÀ facturé : la nota de crédito se fait
 * à la main, on prévient. Ne lève jamais.
 */
export async function alerterRemboursementFacture(
  supabase: SupabaseClient,
  paymentIntent: string | null,
  montantRembourseCentimes: number,
): Promise<void> {
  if (!paymentIntent) return;
  try {
    const { data, error } = await supabase
      .from("invoice_jobs")
      .select("status, fatura_numero, fatura_id")
      .eq("stripe_payment_intent", paymentIntent)
      .maybeSingle<{ status: string; fatura_numero: string | null; fatura_id: string | null }>();
    if (error) {
      console.error("[atelier/facture] lecture du job au remboursement", error.code);
      return;
    }
    if (!data || !["emitted", "emitted_manual", "draft"].includes(data.status)) return;
    await envoyerAlerteFacturation("Remboursement d'un paiement déjà facturé : nota de crédito à faire", {
      "Payment intent": paymentIntent,
      Statut: data.status,
      Fatura: data.fatura_numero ?? (data.fatura_id ? `brouillon ${data.fatura_id}` : null),
      "Montant remboursé (€)": (montantRembourseCentimes / 100).toFixed(2),
    });
  } catch (e) {
    console.error("[atelier/facture] alerte de remboursement en panne", e instanceof Error ? e.message : e);
  }
}
