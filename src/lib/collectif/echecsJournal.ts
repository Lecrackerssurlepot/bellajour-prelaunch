/**
 * LE helper des échecs de l'Édition collective (T-160). Module À EFFETS
 * (écriture Supabase, service key) : serveur uniquement.
 *
 * Une ligne `echec` dans `collectif_evenements`, par `journaliser`, avec le
 * payload court de `payloadEchec` (jamais un message brut, jamais un token)
 * et le frein de `freinerEchec` (une ligne par minute et par édition, geste,
 * étape ; les suivantes comptées). Ne lève jamais : un échec qui ne s'écrit
 * pas reste dans la console, comme avant, et ne fait JAMAIS échouer le geste
 * qui l'a constaté (l'appelant a déjà sa réponse).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { cleFrein, EVT_ECHEC, freinerEchec, payloadEchec, type DetailsEchec, type EtatFrein, type QuoiEchec } from "./echecs";
import { journaliser } from "./journal";

/* La mémoire du frein, par instance. Bornée : au-delà, on repart de zéro (le pire est une ligne de trop). */
const FREIN = new Map<string, EtatFrein>();
const FREIN_MAX = 500;

export async function noterEchec(
  supabase: SupabaseClient,
  editionId: string,
  quoi: QuoiEchec,
  details: DetailsEchec = {}
): Promise<boolean> {
  try {
    const cle = cleFrein(editionId, quoi, details.etape);
    const d = freinerEchec(FREIN.get(cle), Date.now());
    if (FREIN.size >= FREIN_MAX && !FREIN.has(cle)) FREIN.clear();
    FREIN.set(cle, d.etat);
    if (!d.ecrire) return true;
    return await journaliser(supabase, { editionId }, EVT_ECHEC, payloadEchec(quoi, details, d.repetitions), null);
  } catch (e) {
    console.error("[collectif] échec non noté", quoi, (e as Error)?.message);
    return false;
  }
}
