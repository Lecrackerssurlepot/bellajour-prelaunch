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


/* ─────────────────────────── la révision du 13/10 (PRD §14.8) ─────────────────────────── */

/**
 * La migration des colonnes de la révision : le plafond d'un lien, le document
 * cité et la pièce jointe d'un message. Contrairement aux tables (tout ou rien),
 * ces COLONNES arrivent dans des tables qui existent déjà : la lecture se
 * replie (`colonneAbsente`), l'écriture qui en a besoin répond 503 et le dit.
 */
export const MIGRATION_REVISION = "supabase/migrations/20261014_collectif_revision.sql";
export const ERREUR_REVISION_ABSENTE = "migration_revision_absente";
export const MESSAGE_REVISION_ABSENTE =
  "La mise à jour de la base n'est pas encore appliquée (20261014_collectif_revision.sql) : rien n'a été enregistré.";

/**
 * Une colonne inconnue : 42703 en LECTURE (Postgres), PGRST204 en ÉCRITURE
 * (le cache de PostgREST). Un repli borné à 42703 ne se déclencherait jamais
 * sur un INSERT : attraper les deux (supabase/CLAUDE.md, 03/09).
 */
export function colonneAbsente(code: string | null | undefined): boolean {
  return code === "42703" || code === "PGRST204";
}

/* ─────────────────────────── les rendez-vous (D23, T-148) ─────────────────────────── */

/**
 * Deux tables neuves et une colonne : sans elles, l'espace garde le lien de
 * rendez-vous de la fiche (rien ne casse), et toute écriture de rendez-vous
 * répond 503 `migration_rdv_absente` en nommant le fichier.
 */
export const MIGRATION_RDV = "supabase/migrations/20261015_collectif_rendez_vous.sql";
export const ERREUR_RDV_ABSENTE = "migration_rdv_absente";
export const MESSAGE_RDV_ABSENTE =
  "La mise à jour de la base pour les rendez-vous n'est pas encore appliquée (20261015_collectif_rendez_vous.sql) : rien n'a été enregistré.";

/** La table ou la colonne des rendez-vous manque-t-elle ? */
export function rdvAbsent(code: string | null | undefined): boolean {
  return tableAbsente(code) || colonneAbsente(code);
}


/* ─────────────────────────── les envois du client (T-151, 14/10) ─────────────────────────── */

/**
 * Trois colonnes : la version remplacée d'un contenu (`remplace_le`,
 * `remplace_par`) et l'envoi cité dans un message (`contenu_id`). Sans elles,
 * l'écran montre tous les fichiers reçus (aucun n'est « ancien »), et
 * « Remplacer » comme « Citer un de vos envois » répondent 503
 * `migration_envois_absente` en nommant le fichier.
 */
export const MIGRATION_ENVOIS = "supabase/migrations/20261016_collectif_envois.sql";
export const ERREUR_ENVOIS_ABSENTE = "migration_envois_absente";
export const MESSAGE_ENVOIS_ABSENTE =
  "La mise à jour de la base pour les envois n'est pas encore appliquée (20261016_collectif_envois.sql) : rien n'a été enregistré.";

/* ─────────────────────────── le brief pièce par pièce (D24, 14/10) ─────────────────────────── */

/**
 * Trois colonnes de `collectif_magazines` : le style de la palette, celui des
 * typographies, et les doubles pages aimées avec leur style. Sans elles, un
 * brief se lit comme avant (tout vient de `style_id`) ; prendre un style en
 * entier s'écrit encore ; prendre une pièce répond 503
 * `migration_composition_absente` en nommant le fichier.
 */
export const MIGRATION_COMPOSITION = "supabase/migrations/20261017_collectif_composition.sql";
export const ERREUR_COMPOSITION_ABSENTE = "migration_composition_absente";
export const MESSAGE_COMPOSITION_ABSENTE =
  "La mise à jour de la base pour composer pièce par pièce n'est pas encore appliquée (20261017_collectif_composition.sql) : rien n'a été enregistré.";

/* ─────────────────────────── supprimer un lien, répondre (T-152, 14/10 soir) ─────────────────────────── */

/**
 * Deux colonnes : `collectif_provenances.retire_le` (un lien supprimé) et
 * `collectif_messages.reponse_a` (la réponse à un message). Sans elles, aucun
 * lien n'est supprimé et aucun message ne répond à un autre ; « Supprimer le
 * lien » et « Répondre » répondent 503 `migration_liens_absente`.
 */
export const MIGRATION_LIENS = "supabase/migrations/20261018_collectif_liens_reponses.sql";
export const ERREUR_LIENS_ABSENTE = "migration_liens_absente";
export const MESSAGE_LIENS_ABSENTE =
  "La mise à jour de la base pour supprimer un lien et répondre à un message n'est pas encore appliquée (20261018_collectif_liens_reponses.sql) : rien n'a été enregistré.";

/* ─────────────────────────── l'accord du participant (T-184, 19/10) ─────────────────────────── */

/**
 * Deux colonnes de `collectif_photos` : la version du texte d'accord et
 * l'heure du serveur (`accord.ts`). Sans elles, la route refuse DÉJÀ un dépôt
 * de participant sans accord, mais l'insertion se replie sans les colonnes et
 * le serveur le note : l'accord n'est alors pas enregistré. Ce repli
 * d'ÉCRITURE est voulu (à rebours de la révision, qui répond 503) : le refus
 * tient sans la colonne, et bloquer tous les participants en attendant la
 * migration ne protégerait personne. La PR ne se fusionne qu'APRÈS elle.
 */
export const MIGRATION_ACCORD = "supabase/migrations/20261020_collectif_accord_participant.sql";

/* ─────────────────────────── les demandes sur mesure (T-191, 19/10 soir) ─────────────────────────── */

/**
 * La contrainte de `collectif_contenus.type` n'accepte que les cinq clés
 * d'origine (`check (type in ('logo', …))`). La migration la relâche : le
 * type devient la clé d'une demande de l'édition, contrôlée par le code.
 * Sans elle, une demande NOUVELLE se voit chez le client, mais un envoi y est
 * refusé par la base (23514) : la route le SONDE avant d'écrire au coffre et
 * répond un vrai 503 `migration_demandes_absente`. Les cinq clés d'origine,
 * renommées ou non, marchent avant comme après.
 */
export const MIGRATION_DEMANDES = "supabase/migrations/20261021_collectif_demandes.sql";
export const ERREUR_DEMANDES_ABSENTE = "migration_demandes_absente";
export const MESSAGE_DEMANDES_ABSENTE =
  "La mise à jour de la base pour les demandes sur mesure n'est pas encore appliquée (20261021_collectif_demandes.sql) : rien n'a été enregistré.";

/** Une contrainte `check` refuse la ligne : pour un envoi du client, c'est la contrainte du type (la migration manque). */
export function contrainteRefusee(code: string | null | undefined): boolean {
  return code === "23514";
}
