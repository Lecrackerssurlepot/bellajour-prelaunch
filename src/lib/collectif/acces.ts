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
 *    existe une édition derrière (PRD §10) ;
 * 5. le lien du RESPONSABLE sur un appareil inconnu (T-154) : `appareil_inconnu`
 *    tant que l'appareil n'a pas reçu de code, si le contrôle est en service.
 *    L'atelier connecté passe. Les routes répondent 401, l'espace montre l'écran
 *    du code. `sansAppareil` : la seule route qui demande et vérifie le code.
 */

import { cookies } from "next/headers";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/tokenForme";
import { makeSupabase } from "@/lib/supabase";
import { COOKIE_APPAREIL, controleAppareilActif, idAppareilValide } from "./appareil";
import { appareilReconnu } from "./appareils";
import { roleAdmisSur, roleDuToken, type Surface } from "./droits";
import { collectifOuvert } from "./interrupteur";
import { tableAbsente } from "./migration";
import type { EditionLigne, Role } from "./types";

export type Acces =
  | { statut: "ferme" }
  | { statut: "introuvable" }
  | { statut: "migration_absente" }
  | { statut: "appareil_inconnu"; edition: EditionLigne }
  | { statut: "ok"; edition: EditionLigne; role: Exclude<Role, "atelier"> };

export async function chargerAcces(token: string, surface: Surface, options: { sansAppareil?: boolean } = {}): Promise<Acces> {
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

  if (role === "responsable" && !options.sansAppareil && controleAppareilActif(process.env) && !(await appareilPasse(supabase, data))) {
    return { statut: "appareil_inconnu", edition: data };
  }

  return { statut: "ok", edition: data, role };
}

/** L'atelier connecté, ou un appareil reconnu pour le lien actuel. Sans la migration : on laisse passer. */
async function appareilPasse(supabase: ReturnType<typeof makeSupabase>, edition: EditionLigne): Promise<boolean> {
  if (await quiEstConnecte()) return true;
  const id = (await cookies()).get(COOKIE_APPAREIL)?.value ?? null;
  const reconnu = await appareilReconnu(supabase, edition, idAppareilValide(id) ? id : null);
  return reconnu ?? true;
}

/**
 * La porte du DÉPÔT de photos : le lien des participants (`token_depot`) OU
 * l'espace du responsable, qui dépose depuis sa page Photos. Le lien
 * d'équipe passe la porte mais la route le refuse ensuite (`peut`) : il lit,
 * il ne dépose pas.
 */
export async function chargerAccesDepot(token: string): Promise<Acces> {
  const depot = await chargerAcces(token, "depot");
  if (depot.statut !== "introuvable") return depot;
  return chargerAcces(token, "espace");
}
