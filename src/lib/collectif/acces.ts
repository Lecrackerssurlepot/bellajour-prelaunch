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
 * 5. le lien du RESPONSABLE sur un appareil inconnu (T-154, revu avec Mathias le
 *    15/10 : « juste que l'accès soit un peu compliqué pour pas que les gens se
 *    permettent de tout le temps modifier ») : l'espace s'ouvre EN LECTURE, comme
 *    le lien d'équipe (`role: "equipe"`, `appareilInconnu: true`) ; pour
 *    modifier, un code par mail reconnaît l'appareil. L'atelier connecté passe.
 *    `sansAppareil` : la seule route qui demande et vérifie le code.
 * 6. le PREMIER appareil (décision de Mathias du 28/10) : tant qu'aucun appareil
 *    n'est reconnu pour le lien actuel, la page s'ouvre en responsable COMPLET
 *    (`placeLibre: true`), sans rien écrire. La place se prend à la première
 *    ÉCRITURE, par `accesPourEcrire`, que seuls les route handlers appellent
 *    (un Server Component ne peut pas poser de cookie). Jamais à l'affichage :
 *    les robots des messageries ouvrent les liens des mails (`appareil.ts`).
 */

import { cookies } from "next/headers";
import { quiEstConnecte } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/tokenForme";
import { makeSupabase } from "@/lib/supabase";
import { COOKIE_APPAREIL, controleAppareilActif, DUREE_APPAREIL_S, idAppareilValide, prendLaPlace, verdictAppareil, type VerdictAppareil } from "./appareil";
import { lireAppareil, nouvelIdAppareil, prendrePremierePlace } from "./appareils";
import { roleAdmisSur, roleDuToken, type Action, type Surface } from "./droits";
import { collectifOuvert } from "./interrupteur";
import { tableAbsente } from "./migration";
import type { EditionLigne, Role } from "./types";

export type Acces =
  | { statut: "ferme" }
  | { statut: "introuvable" }
  | { statut: "migration_absente" }
  | { statut: "ok"; edition: EditionLigne; role: Exclude<Role, "atelier">; appareilInconnu?: boolean; placeLibre?: boolean };

export type AccesOk = Extract<Acces, { statut: "ok" }>;

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

  /* Le responsable sur un appareil inconnu : il LIT, il ne modifie pas (le droit de l'équipe) ;
     sauf si la place du premier appareil est libre (28/10). */
  if (role === "responsable" && !options.sansAppareil && controleAppareilActif(process.env)) {
    const verdict = await verdictPorte(supabase, data);
    if (verdict === "lecture") return { statut: "ok", edition: data, role: "equipe", appareilInconnu: true };
    if (verdict === "place_libre") return { statut: "ok", edition: data, role, placeLibre: true };
  }

  return { statut: "ok", edition: data, role };
}

/** L'atelier connecté, ou un appareil reconnu pour le lien actuel, passe. Sans la migration : on laisse passer. */
async function verdictPorte(supabase: ReturnType<typeof makeSupabase>, edition: EditionLigne): Promise<VerdictAppareil> {
  if (await quiEstConnecte()) return verdictAppareil({ controleActif: true, atelier: true, lu: null });
  const lu = await lireAppareil(supabase, edition, await idDuCookie());
  return verdictAppareil({ controleActif: true, atelier: false, lu });
}

async function idDuCookie(): Promise<string | null> {
  const id = (await cookies()).get(COOKIE_APPAREIL)?.value ?? null;
  return idAppareilValide(id) ? id : null;
}

/**
 * LE chemin d'écriture du responsable (28/10). Chaque route publique qui MODIFIE
 * l'appelle avec l'action qu'elle va vérifier par `peut`, AVANT ce contrôle ;
 * jamais une route de lecture (le harnais relit les deux listes). Sur une place
 * libre, pour une écriture que le responsable a le droit de faire : l'appareil
 * prend la place (ligne reconnue, journal, cookie httpOnly posé avec la réponse)
 * et l'accès reste celui du responsable. Prise entre-temps : il redevient
 * « appareil inconnu », et `peut` répond 403 `lecture_seule` comme avant.
 * ⚠️ Route handlers SEULEMENT : `cookies().set` lève dans un Server Component.
 */
export async function accesPourEcrire(acces: AccesOk, action: Action): Promise<AccesOk>;
export async function accesPourEcrire(acces: Acces, action: Action): Promise<Acces>;
export async function accesPourEcrire(acces: Acces, action: Action): Promise<Acces> {
  if (acces.statut !== "ok" || !acces.placeLibre) return acces;
  const reste: AccesOk = { statut: "ok", edition: acces.edition, role: acces.role };
  if (!prendLaPlace("place_libre", action)) return reste;

  const existant = await idDuCookie();
  const idAppareil = existant ?? nouvelIdAppareil();
  const issue = await prendrePremierePlace(makeSupabase(), acces.edition, idAppareil);
  if (issue === "pris") {
    if (!existant) {
      (await cookies()).set(COOKIE_APPAREIL, idAppareil, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: DUREE_APPAREIL_S });
    }
    return reste;
  }
  /* Sans la table, le contrôle ne s'applique pas (même règle que la porte). */
  if (issue === "migration_absente") return reste;
  if (issue === "echec") console.error("[collectif] premier appareil : place non prise (panne), écriture refusée");
  return { statut: "ok", edition: acces.edition, role: "equipe", appareilInconnu: true };
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
