/**
 * La migration de l'Édition collective, vue depuis le code (PRD §9).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * PAS DE REPLI SILENCIEUX, ET PAS DE SONDE
 *
 * Le B2C replie sur 42703 / PGRST204 parce que ses tables existent déjà et
 * qu'une COLONNE récente peut manquer pendant la fenêtre entre le
 * déploiement et la migration. Ici les tables sont neuves : elles existent
 * toutes (la migration est enveloppée dans une transaction) ou aucune. Il n'y
 * a donc rien à replier, seulement à DIRE : une route répond 503
 * `migration_collectif_absente`, une page affiche l'écran qui le dit.
 *
 * On ne sonde pas la base avant chaque requête (ce serait un aller-retour de
 * plus à chaque navigation) : c'est la vraie lecture qui échoue, et son code
 * d'erreur qu'on traduit. Seule la page de santé de l'admin interroge les
 * treize tables, pour montrer laquelle manque.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Le fichier que Mathias applique. Écrit ici pour que les écrans le nomment. */
export const MIGRATION_COLLECTIF = "supabase/migrations/20261013_collectif.sql";

/** Le code d'erreur que rendent les routes, et que l'écran sait lire. */
export const ERREUR_MIGRATION_ABSENTE = "migration_collectif_absente";

/** Les treize tables, dans l'ordre de création de la migration. */
export const TABLES_COLLECTIF = [
  "collectif_styles",
  "collectif_editions",
  "collectif_magazines",
  "collectif_provenances",
  "collectif_photos",
  "collectif_contenus",
  "collectif_tours",
  "collectif_couvertures",
  "collectif_notes",
  "collectif_messages",
  "collectif_documents",
  "collectif_evenements",
  "collectif_mails",
] as const;

export type TableCollectif = (typeof TABLES_COLLECTIF)[number];

/**
 * La table n'existe pas. `PGRST205` : PostgREST ne la connaît pas (son cache
 * de schéma) ; `42P01` : PostgreSQL ne la connaît pas. Même règle que le
 * cockpit (`src/lib/cockpit/job.ts`), recopiée plutôt qu'importée : le B2B ne
 * dépend pas d'un module d'un autre produit pour deux comparaisons.
 */
export function tableAbsente(code: string | null | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}
