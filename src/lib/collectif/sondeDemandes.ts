/**
 * La migration des demandes sur mesure (20261021) est-elle passée ? Serveur
 * uniquement (service key).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNE CONTRAINTE NE SE LIT PAS : LA SONDE N'ÉCRIT RIEN, ET C'EST VOULU
 *
 * Les autres migrations ajoutent des COLONNES : un `select` de la colonne les
 * sonde (42703). Celle-ci ne fait que relâcher une contrainte `check`, que
 * PostgREST ne montre pas. La sonde tente donc une insertion qui NE PEUT PAS
 * aboutir, pour une édition qui n'existe pas (un uuid tiré au sort) :
 * - la contrainte est encore là : PostgreSQL vérifie les `check` AVANT
 *   d'écrire la ligne, et refuse en 23514. Rien n'est écrit ;
 * - elle est relâchée : la ligne passe les `check`, puis la clé étrangère vers
 *   `collectif_editions` refuse l'édition inconnue (23503) et l'instruction
 *   entière est annulée. Aucune ligne ne survit.
 * Le type de la sonde (`TYPE_SONDE`) n'est la clé d'aucune demande.
 * Une fois « appliquée » vue, l'instance ne sonde plus (une migration ne se
 * défait pas).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { contrainteRefusee } from "./migration";

export const TYPE_SONDE = "sonde-demandes";

export type EtatMigrationDemandes = "appliquee" | "absente" | "inconnue";

let vueAppliquee = false;

export async function migrationDemandes(supabase: SupabaseClient): Promise<EtatMigrationDemandes> {
  if (vueAppliquee) return "appliquee";
  const id = randomUUID();
  const { error } = await supabase
    .from("collectif_contenus")
    .insert({ id, edition_id: randomUUID(), type: TYPE_SONDE, reponses: {}, depose_par: null });
  if (error && contrainteRefusee(error.code)) return "absente";
  if (error && error.code === "23503") {
    vueAppliquee = true;
    return "appliquee";
  }
  if (!error) {
    /* Impossible tant que la clé étrangère existe ; si elle avait disparu, la
       ligne de sonde ne resterait pas une seconde. */
    console.error("[collectif] sonde des demandes : la ligne est passée, la clé étrangère manque ; ligne retirée");
    await supabase.from("collectif_contenus").delete().eq("id", id).eq("type", TYPE_SONDE);
    vueAppliquee = true;
    return "appliquee";
  }
  console.error("[collectif] sonde des demandes illisible", error.code, error.message);
  return "inconnue";
}
