/**
 * Qui ouvre ce lien ? La porte serveur de `/edition/[token]` et `/depot/[token]`.
 * Module À EFFETS (lecture Supabase, service key) : serveur uniquement.
 *
 * L'ordre ne bouge pas, et chaque étape a sa raison :
 * 1. l'interrupteur (sans lui, le B2B n'existe pas : 404) ;
 * 2. la FORME du token, avant toute requête (`tokenForme.ts`, 32 caractères) :
 *    une adresse fantaisiste ne coûte pas un aller-retour en base ;
 * 3. la lecture, dont l'erreur dit si la migration manque ;
 * 4. archivée, inconnue ou mauvaise porte : la MÊME réponse (`introuvable`).
 *    Pas d'annuaire : un lien d'équipe tapé sur `/depot` ne révèle pas qu'il
 *    existe une édition derrière (PRD §10).
 */

import { isValidNumeroToken } from "@/lib/atelier/tokenForme";
import { makeSupabase } from "@/lib/supabase";
import { roleAdmisSur, roleDuToken, type Surface } from "./droits";
import { collectifOuvert } from "./interrupteur";
import { tableAbsente } from "./migration";
import type { EditionLigne, Role } from "./types";

export type Acces =
  | { statut: "ferme" }
  | { statut: "introuvable" }
  | { statut: "migration_absente" }
  | { statut: "ok"; edition: EditionLigne; role: Exclude<Role, "atelier"> };

export async function chargerAcces(token: string, surface: Surface): Promise<Acces> {
  if (!collectifOuvert()) return { statut: "ferme" };
  if (!isValidNumeroToken(token)) return { statut: "introuvable" };

  const supabase = makeSupabase();
  /* Le token est validé juste au-dessus (lettres, chiffres, _ et -) : il ne
     peut contenir ni virgule ni parenthèse, donc rien qui casse le filtre
     `or` de PostgREST. */
  const requete =
    surface === "depot"
      ? supabase.from("collectif_editions").select("*").eq("token_depot", token)
      : supabase
          .from("collectif_editions")
          .select("*")
          .or(`token_responsable.eq.${token},token_equipe.eq.${token}`);

  const { data, error } = await requete.maybeSingle<EditionLigne>();

  if (error) {
    if (tableAbsente(error.code)) return { statut: "migration_absente" };
    /* Une panne n'est pas un lien inconnu : on ne la déguise pas en 404. */
    throw new Error(`[collectif] lecture de l'édition impossible (${error.code}) : ${error.message}`);
  }
  if (!data || data.archive_le) return { statut: "introuvable" };

  const role = roleDuToken(data, token);
  if (!role || !roleAdmisSur(surface, role)) return { statut: "introuvable" };

  return { statut: "ok", edition: data, role };
}
