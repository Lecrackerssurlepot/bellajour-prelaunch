/**
 * Le journal de l'Édition collective : `collectif_evenements`, append-only.
 * Module À EFFETS (écriture Supabase, service key) : serveur uniquement.
 *
 * Le voisin de `logEvenement` (atelier/evenements.ts), qui écrit dans
 * `evenements` avec une clé étrangère vers `numeros` et ne peut donc pas
 * servir ici. Même contrat : ne lève jamais, rend `true` si la ligne est
 * écrite. L'appelant LIT ce booléen : une écriture métier réussie dont le
 * journal a raté se dit dans la réponse, elle ne se tait pas.
 *
 * ⚠️ Jamais un token dans `payload` (recit.ts).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type Sujet = { editionId: string; styleId?: null } | { styleId: string; editionId?: null };

export async function journaliser(
  supabase: SupabaseClient,
  sujet: Sujet,
  type: string,
  payload: Record<string, unknown>,
  qui: string | null
): Promise<boolean> {
  try {
    const { error } = await supabase.from("collectif_evenements").insert({
      edition_id: sujet.editionId ?? null,
      style_id: sujet.styleId ?? null,
      type,
      payload,
      qui,
    });
    if (error) {
      console.error("[collectif] journal non écrit", type, error.code, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[collectif] journal non écrit", type, e);
    return false;
  }
}

/**
 * La même écriture, qui rend l'id de la ligne (ou `null` si elle n'est pas
 * écrite). Pour un journal écrit AVANT le geste, qu'une ligne suivante désigne
 * (une fusion que défaire relit, une intention d'effacer que la reprise règle) :
 * sans id, le geste ne se fait pas. Ne lève jamais.
 */
export async function journaliserId(
  supabase: SupabaseClient,
  sujet: Sujet,
  type: string,
  payload: Record<string, unknown>,
  qui: string | null
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("collectif_evenements")
      .insert({ edition_id: sujet.editionId ?? null, style_id: sujet.styleId ?? null, type, payload, qui })
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error || !data?.id) {
      console.error("[collectif] journal non écrit", type, error?.code, error?.message);
      return null;
    }
    return data.id;
  } catch (e) {
    console.error("[collectif] journal non écrit", type, e);
    return null;
  }
}
