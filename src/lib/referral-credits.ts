import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Création des crédits parrainage PENDING — SOURCE DE VÉRITÉ UNIQUE.
 *
 * Consommée par /api/waitlist (signup) ET /api/checkout (paiement prévente) pour que
 * le parrainage prévente se comporte exactement comme sur la waitlist.
 *
 * Crée deux lignes pages_credits pending :
 *   - crédit PARRAIN : +5 pages, source = ref_code du filleul          (niveau 1)
 *   - crédit PROCHE  : +3 pages, source = "SELF:" + ref_code du filleul (niveau 0)
 *
 * Idempotence : `source` = ref_code du filleul, identique quel que soit le chemin
 * (signup ou paiement), car c'est le même ref_code sur la même ligne. La contrainte
 * UNIQUE(source) + upsert(ignoreDuplicates) garantissent un crédit max par source —
 * un filleul inscrit waitlist PUIS payant ne génère jamais de doublon.
 *
 * Anti-auto-parrainage : comparaison sur email_canonical (bloque les alias Gmail).
 *
 * ⚠️ ZÉRO effet email/Brevo : cette fonction NE FAIT QUE créer les crédits. Tout envoi
 * (P1, P2, updateBrevoContact) reste la responsabilité du caller.
 *
 * Best-effort : une erreur Supabase est loggée mais jamais propagée (ne bloque ni
 * l'inscription, ni le paiement) — cohérent avec le comportement historique de /api/waitlist.
 *
 * ⚠️ `filleulRefCode` doit déjà exister sur la ligne waitlist du filleul AVANT l'appel :
 * le trigger set_pages_credits_meta peuple filleul_email via WHERE ref_code = source.
 */

export type ReferralCreditResult = {
  parrainValide: boolean;
  parrainEmail: string | null;
  prenomParrain: string;
};

export async function createPendingReferralCredits(args: {
  supabase: SupabaseClient;
  referredBy: string; // ref_code du parrain (déjà validé isValidRefCode en amont)
  filleulEmail: string; // email d'affichage du filleul (valeur stockée)
  filleulEmailCanonical: string; // forme canonique anti-alias
  filleulRefCode: string; // ref_code du filleul → source des crédits
}): Promise<ReferralCreditResult> {
  const { supabase, referredBy, filleulEmail, filleulEmailCanonical, filleulRefCode } = args;

  const { data: parrain } = await supabase
    .from("waitlist")
    .select("email, email_canonical, prenom")
    .eq("ref_code", referredBy)
    .maybeSingle();

  // Parrain introuvable, ou anti-auto-parrainage (même boîte canonique) → aucun crédit.
  if (!parrain?.email || parrain.email_canonical === filleulEmailCanonical) {
    return { parrainValide: false, parrainEmail: null, prenomParrain: "" };
  }

  // Crédit parrain (+5, source = ref_code filleul). Upsert idempotent : un crédit déjà
  // présent pour ce filleul (replay, retry, double chemin) ne crée pas de doublon.
  const { error: creditError } = await supabase
    .from("pages_credits")
    .upsert(
      {
        email: parrain.email,
        montant: 5,
        source: filleulRefCode,
        applique: false,
        status: "pending",
      },
      { onConflict: "source", ignoreDuplicates: true }
    );
  if (creditError) {
    console.error(`[parrainage] crédit parrain échec source=${filleulRefCode}`, creditError);
  } else {
    console.log(`[parrainage] crédit parrain OK (upsert) → ${parrain.email} source=${filleulRefCode}`);
  }

  // Crédit miroir du PROCHE (+3, source préfixée "SELF:" pour cohabiter sous UNIQUE(source)).
  // Échec isolé : ne casse pas le crédit parrain.
  const procheSource = `SELF:${filleulRefCode}`;
  const { error: procheCreditError } = await supabase
    .from("pages_credits")
    .upsert(
      {
        email: filleulEmail,
        montant: 3,
        source: procheSource,
        applique: false,
        status: "pending",
      },
      { onConflict: "source", ignoreDuplicates: true }
    );
  if (procheCreditError) {
    console.error(`[parrainage] crédit proche échec source=${procheSource}`, procheCreditError);
  } else {
    console.log(`[parrainage] crédit proche OK (upsert) → ${filleulEmail} source=${procheSource}`);
  }

  return { parrainValide: true, parrainEmail: parrain.email, prenomParrain: parrain.prenom || "" };
}
