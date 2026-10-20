/**
 * Le coffre vu par la confirmation : la tête d'un objet, la liste du dossier
 * des photos d'une édition, et LA confirmation d'une photo arrivée. Module À
 * EFFETS (R2, Supabase, service key) : serveur uniquement.
 *
 * `confirmerArrivee` est la SEULE façon de confirmer une photo : la route
 * `depot/complete` (le navigateur) et le rattrapage (T-194) l'appellent
 * toutes deux, avec le même patch (`patchConfirmation`, trois champs) et la
 * même garde (`.is("confirmee_le", null)` : deux appels qui se croisent ne
 * datent la photo qu'une fois ; celui qui arrive second la trouve confirmée).
 * Une photo rattrapée est donc confirmée EXACTEMENT comme une photo dont le
 * navigateur a vécu jusqu'au bout.
 */

import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bucket, estAbsenceR2, makeR2, MAX_VIGNETTE_BYTES } from "@/lib/atelier/r2";
import { cleVignette, prefixeEdition } from "./cles";
import { PAGES_LISTE_MAX, patchConfirmation, type Tete } from "./rattrapage";

/**
 * Un HEAD qui distingue l'absence (404, la réponse attendue d'un envoi pas
 * encore arrivé) de la panne (tout le reste). `tailleReelle` (atelier/r2.ts)
 * rend `null` dans les deux cas ; on garde son geste et on nomme la panne.
 */
export async function teteObjet(key: string): Promise<Tete> {
  try {
    const r = await makeR2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return typeof r.ContentLength === "number" ? { statut: "presente", taille: r.ContentLength } : { statut: "panne" };
  } catch (err) {
    if (estAbsenceR2(err)) return { statut: "absente" };
    console.error("[collectif] HEAD échoué (panne, pas absence)", key, (err as Error)?.message);
    return { statut: "panne" };
  }
}

/**
 * Les clés présentes sous `collectif/<édition>/photos/`, page après page
 * (1 000 objets chacune). `null` = le coffre n'a pas répondu, ou le dossier
 * dépasse `PAGES_LISTE_MAX` pages : l'appelant ne conclut alors RIEN (une
 * liste tronquée ferait passer des photos arrivées pour absentes).
 */
export async function clesDuCoffre(editionId: string, maxPages: number = PAGES_LISTE_MAX): Promise<Set<string> | null> {
  const prefixe = `${prefixeEdition(editionId)}photos/`;
  const cles = new Set<string>();
  try {
    let suite: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const r = await makeR2().send(new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefixe, ContinuationToken: suite }));
      for (const o of r.Contents ?? []) if (o.Key) cles.add(o.Key);
      suite = r.IsTruncated ? r.NextContinuationToken : undefined;
      if (!suite) return cles;
    }
    console.error("[collectif] liste du coffre trop longue, rien n'est conclu", editionId, maxPages);
    return null;
  } catch (err) {
    console.error("[collectif] liste du coffre échouée", editionId, (err as Error)?.message);
    return null;
  }
}

export type IssueConfirmation =
  /** Confirmée PAR CET APPEL. `vignette` : la vignette du navigateur était au coffre. */
  | { statut: "nouvelle"; vignette: boolean }
  /** Déjà confirmée (par un autre appel, entre la lecture et l'écriture). */
  | { statut: "deja" }
  /** La base a refusé l'écriture. */
  | { statut: "erreur"; code: string | null };

/**
 * Confirmer une photo ARRIVÉE (la tête a déjà dit sa taille, et l'appelant a
 * déjà vérifié qu'elle respecte le maximum : `issueTete`). La vignette est
 * relue au coffre et notée seulement si elle y est, sous 512 Ko.
 */
export async function confirmerArrivee(
  supabase: SupabaseClient,
  editionId: string,
  ligne: { id: string },
  taille: number,
  maintenantIso: string
): Promise<IssueConfirmation> {
  const vKey = cleVignette(editionId, ligne.id);
  const tv = await teteObjet(vKey);
  const patch = patchConfirmation(taille, maintenantIso, vKey, tv.statut === "presente" ? tv.taille : null, MAX_VIGNETTE_BYTES);
  const { data: ecrites, error } = await supabase
    .from("collectif_photos")
    .update(patch)
    .eq("id", ligne.id)
    .is("confirmee_le", null)
    .select("id");
  if (error) return { statut: "erreur", code: error.code ?? null };
  return ecrites?.length ? { statut: "nouvelle", vignette: patch.vignette_key !== null } : { statut: "deja" };
}
