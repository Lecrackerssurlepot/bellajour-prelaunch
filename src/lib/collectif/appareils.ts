/**
 * Les appareils reconnus et les codes du responsable (T-154). Module À EFFETS :
 * serveur uniquement. Les règles sont dans `appareil.ts` (pur).
 *
 * Sans la migration `20261019_collectif_appareils.sql`, la lecture dit
 * « table absente » et l'accès n'est PAS bloqué (le contrôle ne peut pas
 * s'appliquer) : on le note au journal du serveur, on ne ferme pas la porte
 * au responsable. Le contrôle est de toute façon coupé par défaut.
 */

import { randomBytes, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CODES_PAR_HEURE, DUREE_CODE_MS, empreinte, empreinteCode, ESSAIS_MAX, memeEmpreinte } from "./appareil";
import { envoyerMailCollectif, type EtatEnvoi } from "./mails";
import { mailCodeAppareil } from "./mailsTextes";
import { tableAbsente } from "./migration";
import type { EditionLigne } from "./types";

type EditionCode = Pick<EditionLigne, "id" | "token_responsable" | "responsable_email" | "responsable_nom" | "evenement" | "registre">;

/** Un identifiant d'appareil neuf : 32 octets aléatoires en base64url (43 caractères). */
export function nouvelIdAppareil(): string {
  return randomBytes(32).toString("base64url");
}

/** Cet appareil est-il reconnu pour le lien ACTUEL du responsable ? `null` : la table manque. */
export async function appareilReconnu(supabase: SupabaseClient, edition: EditionCode, idAppareil: string | null): Promise<boolean | null> {
  /* On interroge MÊME sans cookie : c'est la requête qui dit si la table existe.
     Sans elle (migration absente), on laisse passer ; vu en recette le 15/10. */
  const { data, error } = await supabase
    .from("collectif_appareils")
    .select("id")
    .eq("edition_id", edition.id)
    .eq("appareil_empreinte", empreinte(idAppareil ?? "aucun-appareil"))
    .eq("lien_empreinte", empreinte(edition.token_responsable))
    .is("oublie_le", null)
    .limit(1);
  if (error) {
    if (tableAbsente(error.code)) {
      console.warn("[collectif] code par appareil : migration 20261019 absente, contrôle non appliqué");
      return null;
    }
    console.error("[collectif] appareil illisible", error.code, error.message);
    return false;
  }
  return Boolean(idAppareil && data?.length);
}

export type IssueDemande = { etat: "envoye" | "coupe" | "echec" | "trop" | "migration_absente" };

/**
 * Un code neuf pour cet appareil, envoyé à l'adresse du responsable.
 * ⚠️ Le code n'est jamais écrit en clair ailleurs que dans le mail ; la base
 * n'en garde que l'empreinte, liée à l'appareil.
 */
export async function demanderCode(supabase: SupabaseClient, edition: EditionCode, idAppareil: string, origine: string): Promise<IssueDemande> {
  const depuis = new Date(Date.now() - 60 * 60_000).toISOString();
  const recents = await supabase.from("collectif_codes").select("id", { count: "exact", head: true }).eq("edition_id", edition.id).gt("created_at", depuis);
  if (recents.error) return { etat: tableAbsente(recents.error.code) ? "migration_absente" : "echec" };
  if ((recents.count ?? 0) >= CODES_PAR_HEURE) return { etat: "trop" };

  const code = codeNeuf(origine);
  const appareilEmp = empreinte(idAppareil);
  const ecrit = await supabase
    .from("collectif_codes")
    .insert({ edition_id: edition.id, appareil_empreinte: appareilEmp, code_empreinte: empreinteCode(appareilEmp, code), expire_le: new Date(Date.now() + DUREE_CODE_MS).toISOString() })
    .select("id")
    .single<{ id: string }>();
  if (ecrit.error) return { etat: tableAbsente(ecrit.error.code) ? "migration_absente" : "echec" };

  const etat: EtatEnvoi = await envoyerMailCollectif({
    supabase,
    editionId: edition.id,
    code: `CODE-${ecrit.data.id}`,
    a: { email: edition.responsable_email, nom: edition.responsable_nom },
    mail: mailCodeAppareil({ tu: edition.registre === "ecole_tu", evenement: edition.evenement, code, minutes: Math.round(DUREE_CODE_MS / 60_000), site: origine }),
    verrou: false,
    qui: null,
  });
  return { etat: etat === "deja" ? "echec" : etat };
}

export type IssueVerif = { etat: "ok" | "faux" | "expire" | "bloque" | "migration_absente" | "echec"; restants?: number };

/** Le code tapé sur CET appareil : bon, il est reconnu ; faux, un essai de moins. */
export async function verifierCode(supabase: SupabaseClient, edition: EditionCode, idAppareil: string, code: string): Promise<IssueVerif> {
  const appareilEmp = empreinte(idAppareil);
  const { data, error } = await supabase
    .from("collectif_codes")
    .select("id, code_empreinte, essais, expire_le, utilise_le")
    .eq("edition_id", edition.id)
    .eq("appareil_empreinte", appareilEmp)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; code_empreinte: string; essais: number; expire_le: string; utilise_le: string | null }>();
  if (error) return { etat: tableAbsente(error.code) ? "migration_absente" : "echec" };
  if (!data || data.utilise_le || Date.parse(data.expire_le) < Date.now()) return { etat: "expire" };
  if (data.essais >= ESSAIS_MAX) return { etat: "bloque" };

  if (!memeEmpreinte(empreinteCode(appareilEmp, code), data.code_empreinte)) {
    const essais = data.essais + 1;
    await supabase.from("collectif_codes").update({ essais }).eq("id", data.id);
    return essais >= ESSAIS_MAX ? { etat: "bloque" } : { etat: "faux", restants: ESSAIS_MAX - essais };
  }

  const maintenant = new Date().toISOString();
  await supabase.from("collectif_codes").update({ utilise_le: maintenant }).eq("id", data.id);
  const { error: e } = await supabase
    .from("collectif_appareils")
    .upsert(
      { edition_id: edition.id, appareil_empreinte: appareilEmp, lien_empreinte: empreinte(edition.token_responsable), reconnu_le: maintenant, vu_le: maintenant, oublie_le: null },
      { onConflict: "edition_id,appareil_empreinte,lien_empreinte" }
    );
  if (e) return { etat: tableAbsente(e.code) ? "migration_absente" : "echec" };
  return { etat: "ok" };
}

/**
 * Six chiffres au hasard. ⚠️ `COLLECTIF_CODE_ESSAI` (six chiffres) fixe le code
 * pour une recette LOCALE, mails coupés : il ne vaut QUE pour une demande venue
 * de localhost, une adresse que Vercel n'a jamais. (Pas `process.env.VERCEL` :
 * le `.env.local` tiré de Vercel le contient, vu en recette le 15/10.)
 */
export function codeNeuf(origine: string, env: Record<string, string | undefined> = process.env): string {
  const essai = env.COLLECTIF_CODE_ESSAI;
  if (essai && /^\d{6}$/.test(essai) && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origine)) return essai;
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
