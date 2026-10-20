/**
 * Lire SANS la corbeille, avec ou sans la migration 20261023. Serveur
 * uniquement. Le module n'ouvre aucune connexion : il pose un filtre sur la
 * requête qu'on lui donne, et la rejoue sans lui si la base ne connaît pas
 * encore la colonne (le harnais le joue contre une fausse base).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNE PHOTO À LA CORBEILLE DISPARAÎT DE TOUTES LES LECTURES (corbeille.ts)
 *
 * Chaque lecture de `collectif_photos` qui MONTRE ou COMPTE des photos passe
 * par `lireHorsCorbeille` : la requête est fabriquée avec le filtre
 * `supprimee_le is null` (et, si on le demande, les colonnes fraîches de la
 * migration : `participant_id`). Si la base répond que la migration manque
 * (`personnesAbsentes` : une colonne de la migration NOMMÉE dans l'erreur),
 * la même requête est refaite sans eux : sans la colonne, aucune photo n'est à
 * la corbeille, rien n'est perdu.
 *
 * Pour ne pas payer deux requêtes à chaque lecture pendant la fenêtre entre le
 * déploiement et la migration, l'absence est RETENUE une minute (par instance) :
 * la première lecture qui l'apprend la note, les suivantes partent directement
 * sans le filtre, puis on réessaie. Une fois la migration passée, la minute
 * suivante la voit. ⚠️ Une erreur 42703 qui ne nomme PAS une colonne de la
 * migration ne note rien : on ne lève pas le filtre de la corbeille pour une
 * colonne d'une autre migration.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { personnesAbsentes } from "./migration";

/** Combien de temps l'absence de la migration est retenue avant de réessayer avec le filtre. */
export const MEMOIRE_ABSENCE_MS = 60_000;

let absenteJusqua = 0;

/** La migration 20261023 est-elle PROBABLEMENT là ? (Faux pendant la minute qui suit une erreur qui dit qu'elle manque.) */
export function migrationPersonnesPresumee(maintenant: number = Date.now()): boolean {
  return maintenant >= absenteJusqua;
}

/** Noter que la base vient de dire que la migration manque. */
export function noterPersonnesAbsentes(maintenant: number = Date.now()): void {
  absenteJusqua = maintenant + MEMOIRE_ABSENCE_MS;
}

/** Pour le harnais : oublier ce qui a été retenu. */
export function oublierAbsence(): void {
  absenteJusqua = 0;
}

type AvecErreur = { error: { code?: string | null; message?: string | null } | null };

/**
 * Jouer une lecture « avec la migration » (`avec: true` : filtre de la
 * corbeille posé, colonnes fraîches demandées), puis, si la base dit qu'elle
 * manque, la même « sans ». `lire` FABRIQUE une requête neuve à chaque appel.
 * Rend aussi `avec` : l'appelant sait si les colonnes fraîches sont dans la
 * réponse.
 */
export async function lireHorsCorbeille<R extends AvecErreur>(lire: (avec: boolean) => PromiseLike<R>): Promise<R & { avec: boolean }> {
  if (migrationPersonnesPresumee()) {
    const r = await lire(true);
    if (!personnesAbsentes(r.error)) return { ...r, avec: true };
    noterPersonnesAbsentes();
  }
  const r = await lire(false);
  return { ...r, avec: false };
}

/**
 * Le filtre s'écrit À LA MAIN dans chaque lecture : `avec ? q.is("supprimee_le", null) : q`
 * (une fonction générique sur les requêtes supabase-js fait exploser l'inférence de
 * TypeScript, TS2589). Le harnais relit chaque site pour y trouver le filtre.
 *
 * ⚠️ UN COMPTE QUI PORTE CE FILTRE SE FAIT EN GET `limit(0)`, JAMAIS EN `head`
 * (`COMPTE_SANS_LIGNE`). Mesuré le 20/10 sur la vraie base, migration absente :
 * un HEAD filtré sur `supprimee_le` rend 400 avec une erreur SANS code et SANS
 * message (un HEAD n'a pas de corps) ; `personnesAbsentes` ne peut pas le
 * reconnaître, le repli ne jouerait pas, et le compte manquerait (le dépôt
 * répondrait 500). Le même compte en GET `limit(0)` rend le nombre exact, aucune
 * ligne, et en cas d'absence 42703 qui nomme la colonne.
 */
export const COMPTE_SANS_LIGNE = { count: "exact" } as const;
