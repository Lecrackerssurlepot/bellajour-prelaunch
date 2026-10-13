/**
 * Les treize tables sont-elles là ? La seule sonde du B2B.
 * Module À EFFETS (lecture Supabase, service key) : serveur uniquement.
 *
 * Lu par `/admin/collectif` et `/api/admin/collectif/sante`, jamais par une
 * page client (voir migration.ts : ailleurs, c'est la vraie lecture qui
 * échoue). Une requête par table, toutes en même temps : c'est ce qui permet
 * de NOMMER la table qui manque si une migration n'est passée qu'en partie.
 *
 * ⚠️ Pas de `head: true` : une réponse HEAD n'a pas de corps, supabase-js n'y
 * lirait aucun code d'erreur, et une table absente passerait pour présente.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { TABLES_COLLECTIF, tableAbsente, type TableCollectif } from "./migration";

export type EtatMigration = {
  presentes: TableCollectif[];
  absentes: TableCollectif[];
  /** Une table qui répond autre chose qu'« absente » : panne, droits… */
  erreurs: { table: TableCollectif; code: string | null }[];
};

export async function etatMigration(supabase: SupabaseClient): Promise<EtatMigration> {
  const lectures = await Promise.all(
    TABLES_COLLECTIF.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(1);
      return { table, error };
    })
  );

  const etat: EtatMigration = { presentes: [], absentes: [], erreurs: [] };
  for (const { table, error } of lectures) {
    if (!error) etat.presentes.push(table);
    else if (tableAbsente(error.code)) etat.absentes.push(table);
    else etat.erreurs.push({ table, code: error.code ?? null });
  }
  return etat;
}
