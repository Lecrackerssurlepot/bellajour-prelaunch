/**
 * Ce que le serveur sait d'un appareil de participant dans une édition : le
 * nom qu'il a déjà donné, et combien de ses photos sont arrivées. Module À
 * EFFETS, serveur uniquement. La règle du nom est dans `participant.ts`.
 *
 * L'appareil, c'est le cookie httpOnly `bj_depot_appareil` (collecte.ts), posé
 * à la première déclaration et valable un an : il survit à un `localStorage`
 * vidé, et il est le même sur tous les liens de l'édition (`path=/`). Un autre
 * navigateur (WhatsApp puis Safari) est un autre appareil.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { colonnesSuspens, remplaceesDesLignes, type LigneSuspensLue } from "./collecte";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "./horsCorbeille";

/**
 * Le nom le plus récent donné par cet appareil, en PARTICIPANT, dans cette
 * édition ; `null` s'il n'en a jamais donné. `libelleLien` : sur un lien de
 * provenance, un participant sans nom recevait le libellé du lien (« Le
 * photographe ») ; ce libellé n'est pas un nom de personne et ne se reprend pas.
 */
export async function nomDeLAppareil(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string,
  libelleLien: string | null = null
): Promise<string | null> {
  /* Planches du 20/10 (migration 20261023) : une photo qui a une PERSONNE est à elle, pas au
     téléphone. Après « Ce n'est pas toi ? », le téléphone ne doit pas reprendre le nom de Léa pour
     la personne suivante : seules les photos SANS personne disent le nom du téléphone. */
  const { data, error } = await lireHorsCorbeille((avec) => {
    const q = supabase
      .from("collectif_photos")
      .select("deposant")
      .eq("edition_id", editionId)
      .eq("appareil_id", appareil)
      .eq("role_deposant", "participant")
      .not("deposant", "is", null);
    return (avec ? q.is("participant_id", null) : q).order("created_at", { ascending: false }).limit(5).returns<{ deposant: string | null }[]>();
  });
  if (error) {
    console.error("[collectif] nom de l'appareil illisible", error.code, error.message);
    return null;
  }
  const libelle = libelleLien?.trim().toLowerCase() ?? null;
  for (const l of data ?? []) {
    const nom = l.deposant?.trim();
    if (nom && nom.toLowerCase() !== libelle) return nom;
  }
  return null;
}

/** Combien de photos de cet appareil sont arrivées dans l'édition (un compte, jamais des lignes), hors corbeille (20261023). */
export async function arriveesDeLAppareil(supabase: SupabaseClient, editionId: string, appareil: string): Promise<number> {
  /* Un compte en GET `limit(0)`, jamais `head` (horsCorbeille.ts : un HEAD filtré rend une erreur sans code). */
  const { count, error } = await lireHorsCorbeille((avec) => {
    const q = supabase
      .from("collectif_photos")
      .select("id", COMPTE_SANS_LIGNE)
      .eq("edition_id", editionId)
      .eq("appareil_id", appareil)
      .eq("role_deposant", "participant")
      .not("confirmee_le", "is", null);
    return (avec ? q.is("supprimee_le", null) : q).limit(0);
  });
  if (error) {
    console.error("[collectif] photos de l'appareil illisibles", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Au-delà, les photos coupées ne passent plus chacune au coffre : elles se comptent comme absentes. */
export const TETES_COUPEES_MAX = 40;

/**
 * 2A (décision de Mathias, 26/10) : combien de photos CET appareil a déclarées sans qu'elles
 * arrivent (onglet fermé, téléphone verrouillé pendant l'envoi). Elles réservent leur place deux
 * heures (`compteDansPlafond`) : la page doit le dire, et « Reprendre » les renvoie sur la même
 * ligne (`planDeclaration` rend « reprise », rien ne compte deux fois).
 *
 * Une ligne non confirmée peut pourtant être AU COFFRE : la page s'est fermée entre l'envoi et la
 * confirmation groupée (15 s). Une tête par ligne (au plus `TETES_COUPEES_MAX`, huit à la fois) :
 * seules les ABSENTES se comptent ; celles qui y sont, le rattrapage (T-194) les confirmera. Une
 * panne du coffre ne se compte pas (on ne crie pas pour rien). `role` : le participant (sa page
 * de dépôt) ou le responsable (sa coquille). Hors corbeille. Rend 0 sur toute erreur : un
 * message de confort ne fait jamais tomber une page. Lecture seule, rien n'est écrit.
 *
 * Recette Audencia du 28/10 : une ligne que la même personne a depuis envoyée par un AUTRE
 * appareil (`remplaceesDesLignes`) n'est plus « non arrivée » : la photo est là, « Reprendre » la
 * renverrait pour rien. Elle ne se compte pas (et ne coûte pas de tête au coffre). Ces lignes
 * illisibles : le compte d'avant, tel quel.
 */
export async function photosCoupeesDeLAppareil(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string,
  role: "participant" | "responsable",
  tete: (cle: string) => Promise<{ statut: "presente" | "absente" | "panne" }>
): Promise<number> {
  const { data, error } = await lireHorsCorbeille((avec) => {
    const q = supabase
      .from("collectif_photos")
      .select(`r2_key, ${colonnesSuspens(avec)}`)
      .eq("edition_id", editionId)
      .eq("appareil_id", appareil)
      .eq("role_deposant", role)
      .is("confirmee_le", null);
    return (avec ? q.is("supprimee_le", null) : q).order("created_at", { ascending: false }).limit(500).returns<(LigneSuspensLue & { r2_key: string })[]>();
  });
  if (error) {
    console.error("[collectif] photos coupées de l'appareil illisibles", error.code, error.message);
    return 0;
  }
  const lues = data ?? [];
  if (!lues.length) return 0;
  const remplacees = await remplaceesDesLignes(supabase, editionId, lues);
  const lignes = remplacees ? lues.filter((l) => !remplacees.has(l.id)) : lues;
  if (!lignes.length) return 0;
  const examinees = lignes.slice(0, TETES_COUPEES_MAX);
  let absentes = lignes.length - examinees.length;
  for (let i = 0; i < examinees.length; i += 8) {
    const tetes = await Promise.all(examinees.slice(i, i + 8).map((l) => tete(l.r2_key).catch(() => ({ statut: "panne" as const }))));
    absentes += tetes.filter((t) => t.statut === "absente").length;
  }
  return absentes;
}
