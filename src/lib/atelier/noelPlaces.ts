/**
 * LE COMPTEUR DE PLACES DE NOËL (lot 4, décision de Mathias du 16/11/2026).
 *
 * « Une place = un dossier PAYÉ depuis l'ouverture ; plafond 25 avant le
 * 7 décembre » (DECISIONS-16-11.md, STRATEGIE.md : « 25 dossiers, photos +
 * questionnaire reçus avant lun. 7 déc. »).
 *
 * Le compte se lit au JOURNAL, pas dans `numeros` : un dossier payé avance
 * ensuite (maquette, impression, livré) et son état ne dit plus quand il a
 * été payé. L'événement `etat_change` vers `payee` (paiement.ts) porte la
 * session Stripe : son préfixe (cs_live_ / cs_test_) dit le mode, et l'on ne
 * compte que les paiements du mode de la clé du serveur. Un test ne mange
 * donc jamais une vraie place.
 *
 * Le compteur INFORME, il ne ferme rien : aucune décision n'a été prise sur
 * ce qui se passe à zéro, donc rien n'est bloqué (le bandeau dit seulement
 * que les places de Noël sont prises).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEPOT_NOEL_MAX } from "./carteCadeau";
import { modeStripe } from "./fondatrice";

export const PLACES_NOEL = 25;
/** Le jour d'ouverture de Noël : les paiements d'avant ne comptent pas. */
export const OUVERTURE_NOEL = "2026-11-16";

/** Pur : ce qui reste, jamais moins de zéro. */
export function placesRestantes(payes: number): number {
  return Math.max(0, PLACES_NOEL - Math.max(0, Math.floor(payes)));
}

/** Pur : le compteur a-t-il encore un sens ce jour-là (jusqu'au 7 décembre inclus) ? */
export function compteurOuvert(jour: string): boolean {
  return jour >= OUVERTURE_NOEL && jour <= DEPOT_NOEL_MAX;
}

export type PlacesNoel = { restantes: number; payes: number; plafond: number };

/**
 * Le compte, ou `null` si la base ne répond pas : l'appelant n'affiche alors
 * AUCUN nombre plutôt qu'un nombre faux.
 */
export async function lirePlacesNoel(supabase: SupabaseClient): Promise<PlacesNoel | null> {
  const mode = modeStripe(process.env.STRIPE_SECRET_KEY);
  if (!mode) return null;
  try {
    const r = await supabase
      .from("evenements")
      .select("numero_id")
      .eq("type", "etat_change")
      .eq("payload->>vers", "payee")
      .like("payload->>session_id", `cs_${mode}_%`)
      .gte("created_at", `${OUVERTURE_NOEL}T00:00:00+01:00`);
    if (r.error) return null;
    const payes = new Set((r.data as { numero_id: string }[]).map((l) => l.numero_id)).size;
    return { restantes: placesRestantes(payes), payes, plafond: PLACES_NOEL };
  } catch {
    return null;
  }
}
