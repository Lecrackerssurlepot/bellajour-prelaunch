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
import { CODES_PAR_HEURE, DUREE_CODE_MS, empreinte, empreinteCode, ESSAIS_MAX, libelleDuree, memeEmpreinte, verdictEssai } from "./appareil";
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
 * `hoteRequete` (l'en-tête `host` brut) ne sert qu'au code d'essai local ;
 * `site`, nommé par le mail, est l'origine du site (`origineDesMails`, T-164).
 */
export async function demanderCode(supabase: SupabaseClient, edition: EditionCode, idAppareil: string, hoteRequete: string | null, site: string): Promise<IssueDemande> {
  const depuis = new Date(Date.now() - 60 * 60_000).toISOString();
  const recents = await supabase.from("collectif_codes").select("id", { count: "exact", head: true }).eq("edition_id", edition.id).gt("created_at", depuis);
  if (recents.error) return { etat: tableAbsente(recents.error.code) ? "migration_absente" : "echec" };
  if ((recents.count ?? 0) >= CODES_PAR_HEURE) return { etat: "trop" };

  const code = codeNeuf(hoteRequete);
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
    mail: mailCodeAppareil({ tu: edition.registre === "ecole_tu", evenement: edition.evenement, responsable: edition.responsable_nom, code, duree: libelleDuree(DUREE_CODE_MS), site }),
    verrou: false,
    qui: null,
  });
  return { etat: etat === "deja" ? "echec" : etat };
}

export type IssueVerif = { etat: "ok" | "faux" | "expire" | "bloque" | "migration_absente" | "echec"; restants?: number };

/** Le code tapé sur CET appareil : bon, il est reconnu ; faux, un essai de moins. */
export async function verifierCode(supabase: SupabaseClient, edition: EditionCode, idAppareil: string, code: string): Promise<IssueVerif> {
  const appareilEmp = empreinte(idAppareil);
  /* L'essai se RÉSERVE avant la comparaison, par un échange conditionnel (`essais` inchangé depuis
     la lecture) : lire puis écrire `essais + 1` laissait trente essais parallèles lire tous la même
     valeur (charge-1). Un échange perdu relit ; chaque perte suit un essai réservé par un autre,
     donc au plus ESSAIS_MAX tours avant de lire « bloqué ». */
  for (let tour = 0; tour <= ESSAIS_MAX + 1; tour++) {
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

    const reserve = await supabase
      .from("collectif_codes")
      .update({ essais: data.essais + 1 })
      .eq("id", data.id)
      .eq("essais", data.essais)
      .is("utilise_le", null)
      .select("essais");
    if (reserve.error) return { etat: "echec" };
    if (!reserve.data?.length) continue;
    const essai = (reserve.data[0] as { essais: number }).essais;

    const verdict = verdictEssai(essai, memeEmpreinte(empreinteCode(appareilEmp, code), data.code_empreinte));
    if (verdict.etat !== "ok") return verdict;

    /* Le bon code ne sert qu'UNE fois, même tapé deux fois en même temps. */
    const maintenant = new Date().toISOString();
    const pris = await supabase.from("collectif_codes").update({ utilise_le: maintenant }).eq("id", data.id).is("utilise_le", null).select("id");
    if (pris.error) return { etat: "echec" };
    if (!pris.data?.length) return { etat: "expire" };
    const { error: e } = await supabase
      .from("collectif_appareils")
      .upsert(
        { edition_id: edition.id, appareil_empreinte: appareilEmp, lien_empreinte: empreinte(edition.token_responsable), reconnu_le: maintenant, vu_le: maintenant, oublie_le: null },
        { onConflict: "edition_id,appareil_empreinte,lien_empreinte" }
      );
    if (e) return { etat: tableAbsente(e.code) ? "migration_absente" : "echec" };
    return { etat: "ok" };
  }
  return { etat: "echec" };
}

/**
 * Six chiffres au hasard. ⚠️ `COLLECTIF_CODE_ESSAI` (six chiffres) fixe le code
 * pour une recette LOCALE, mails coupés : il ne vaut QUE pour une demande dont
 * l'en-tête `host` est localhost, un nom par lequel Vercel n'achemine jamais
 * rien. Jamais `x-forwarded-host`, que l'appelant écrit lui-même (T-164).
 * (Pas `process.env.VERCEL` ni `VERCEL_ENV` : le `.env.local` tiré de Vercel
 * contient `VERCEL="1"` et `VERCEL_ENV="production"`, vu le 15/10 puis le 20/10.)
 */
export function codeNeuf(hoteRequete: string | null, env: Record<string, string | undefined> = process.env): string {
  const essai = env.COLLECTIF_CODE_ESSAI;
  if (essai && /^\d{6}$/.test(essai) && /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test((hoteRequete ?? "").trim())) return essai;
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
