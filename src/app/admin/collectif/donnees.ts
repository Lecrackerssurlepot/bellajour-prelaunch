/**
 * Ce que le back-office de l'Édition collective lit. Serveur uniquement
 * (service key) ; les composants clients ne reçoivent que des chaînes et des
 * nombres déjà calculés, et JAMAIS une clé R2 sans sa signature.
 *
 * Une table absente (`tableAbsente`) rend `{ absent: true }` : la page le dit
 * au lieu de tomber. Toute autre erreur lève : une panne n'est pas « aucune
 * édition ».
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { signerGet } from "@/lib/atelier/r2";
import { etatEffectif, LIBELLE_ETAT_EDITION, type EtatEdition } from "@/lib/collectif/etats";
import { tableAbsente } from "@/lib/collectif/migration";
import { prochaineEtape, type Prochaine } from "@/lib/collectif/prochaine";
import { phraseEvenement } from "@/lib/collectif/recit";
import { manquesPourPublier } from "@/lib/collectif/styles";
import type { EditionLigne, EvenementLigne, MagazineLigne, StyleLigne } from "@/lib/collectif/types";

function echec(quoi: string, error: { code?: string; message: string }): never {
  throw new Error(`[collectif] ${quoi} : ${error.code ?? "?"} ${error.message}`);
}

/* ─────────────────────────────────── la liste ─────────────────────────────────── */

export type LigneEdition = {
  id: string;
  organisation: string;
  evenement: string;
  nbMagazines: number;
  etat: EtatEdition;
  libelleEtat: string;
  prochaine: Prochaine;
  clotureLe: string | null;
  tirage: number | null;
  nonLus: number;
  archivee: boolean;
};

export async function listerEditions(
  supabase: SupabaseClient,
  archivees: boolean,
  maintenant: Date
): Promise<{ absent: true } | { absent: false; lignes: LigneEdition[] }> {
  let requete = supabase
    .from("collectif_editions")
    .select("id, organisation, evenement, etat, cloture_le, tirage, archive_le, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  requete = archivees ? requete.not("archive_le", "is", null) : requete.is("archive_le", null);
  const { data, error } = await requete.returns<
    Pick<EditionLigne, "id" | "organisation" | "evenement" | "etat" | "cloture_le" | "tirage" | "archive_le">[]
  >();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("liste des éditions", error);
  }
  const editions = data ?? [];
  const ids = editions.map((e) => e.id);

  const [mags, messages] = ids.length
    ? await Promise.all([
        supabase.from("collectif_magazines").select("edition_id").in("edition_id", ids),
        supabase
          .from("collectif_messages")
          .select("edition_id")
          .in("edition_id", ids)
          .eq("auteur", "client")
          .is("lu_atelier_le", null),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (mags.error) echec("magazines de la liste", mags.error);
  if (messages.error) echec("messages non lus", messages.error);

  const compter = (lignes: { edition_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const l of lignes ?? []) m.set(l.edition_id, (m.get(l.edition_id) ?? 0) + 1);
    return m;
  };
  const parMag = compter(mags.data as { edition_id: string }[] | null);
  const parMessage = compter(messages.data as { edition_id: string }[] | null);

  return {
    absent: false,
    lignes: editions.map((e) => {
      const etat = etatEffectif(e.etat, e.cloture_le, maintenant);
      return {
        id: e.id,
        organisation: e.organisation,
        evenement: e.evenement,
        nbMagazines: parMag.get(e.id) ?? 0,
        etat,
        libelleEtat: LIBELLE_ETAT_EDITION[etat],
        prochaine: prochaineEtape(etat, e.cloture_le),
        clotureLe: e.cloture_le,
        tirage: e.tirage,
        nonLus: parMessage.get(e.id) ?? 0,
        archivee: Boolean(e.archive_le),
      };
    }),
  };
}

/* ─────────────────────────────────── la fiche ─────────────────────────────────── */

export type MagazineFiche = Pick<MagazineLigne, "id" | "rang" | "nom" | "brief_valide_le" | "bat_valide_le"> & {
  toursPublies: number;
  /** Ni brief commencé, ni tour : il peut se retirer (le dernier seulement). */
  vide: boolean;
};

export type EntreeJournal = { id: string; quand: string; phrase: string };

export type Fiche = {
  edition: EditionLigne;
  etat: EtatEdition;
  magazines: MagazineFiche[];
  journal: EntreeJournal[];
};

export async function chargerEdition(
  supabase: SupabaseClient,
  id: string,
  maintenant: Date
): Promise<{ absent: true } | { absent: false; fiche: Fiche | null }> {
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("*")
    .eq("id", id)
    .maybeSingle<EditionLigne>();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("lecture de l'édition", error);
  }
  if (!edition) return { absent: false, fiche: null };

  const [mags, journal] = await Promise.all([
    supabase
      .from("collectif_magazines")
      .select("id, rang, nom, style_id, brief_valide_le, bat_valide_le")
      .eq("edition_id", id)
      .order("rang", { ascending: true }),
    supabase
      .from("collectif_evenements")
      .select("id, type, payload, created_at")
      .eq("edition_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (mags.error) echec("magazines de l'édition", mags.error);
  if (journal.error) echec("journal de l'édition", journal.error);

  const magIds = (mags.data ?? []).map((m) => m.id as string);
  const tours = magIds.length
    ? await supabase.from("collectif_tours").select("magazine_id, publie_le").in("magazine_id", magIds)
    : { data: [], error: null };
  if (tours.error) echec("tours de l'édition", tours.error);
  const toursParMag = new Map<string, { total: number; publies: number }>();
  for (const t of (tours.data ?? []) as { magazine_id: string; publie_le: string | null }[]) {
    const c = toursParMag.get(t.magazine_id) ?? { total: 0, publies: 0 };
    c.total += 1;
    if (t.publie_le) c.publies += 1;
    toursParMag.set(t.magazine_id, c);
  }

  return {
    absent: false,
    fiche: {
      edition,
      etat: etatEffectif(edition.etat, edition.cloture_le, maintenant),
      magazines: ((mags.data ?? []) as (MagazineLigne & { style_id: string | null })[]).map((m) => {
        const t = toursParMag.get(m.id) ?? { total: 0, publies: 0 };
        return {
          id: m.id,
          rang: m.rang,
          nom: m.nom,
          brief_valide_le: m.brief_valide_le,
          bat_valide_le: m.bat_valide_le,
          toursPublies: t.publies,
          vide: !m.style_id && !m.brief_valide_le && t.total === 0,
        };
      }),
      journal: ((journal.data ?? []) as Pick<EvenementLigne, "id" | "type" | "payload" | "created_at">[]).map((j) => ({
        id: j.id,
        quand: j.created_at,
        phrase: phraseEvenement(j.type, j.payload ?? {}),
      })),
    },
  };
}

/* ─────────────────────────────────── les styles ─────────────────────────────────── */

export type LigneStyle = Pick<StyleLigne, "id" | "slug" | "nom" | "segment" | "publie" | "ordre"> & {
  manques: string[];
  apercu: string | null;
};

/** Une URL signée, ou `null` si la signature échoue (le reste de l'écran s'affiche). */
async function signerOuRien(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  try {
    return await signerGet(key);
  } catch (e) {
    console.error("[collectif] signature d'image impossible", key, e);
    return null;
  }
}

export async function listerStyles(
  supabase: SupabaseClient
): Promise<{ absent: true } | { absent: false; styles: LigneStyle[] }> {
  const { data, error } = await supabase
    .from("collectif_styles")
    .select("*")
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<StyleLigne[]>();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("liste des styles", error);
  }
  const styles = await Promise.all(
    (data ?? []).map(async (s) => ({
      id: s.id,
      slug: s.slug,
      nom: s.nom,
      segment: s.segment,
      publie: s.publie,
      ordre: s.ordre,
      manques: manquesPourPublier(s),
      apercu: await signerOuRien(s.couvertures?.[0]?.image_key),
    }))
  );
  return { absent: false, styles };
}

export type StyleEdite = {
  style: StyleLigne;
  /** clé R2 → URL signée, pour chaque image du style. */
  images: Record<string, string>;
  journal: EntreeJournal[];
};

export async function chargerStyle(
  supabase: SupabaseClient,
  id: string
): Promise<{ absent: true } | { absent: false; style: StyleEdite | null }> {
  const { data, error } = await supabase.from("collectif_styles").select("*").eq("id", id).maybeSingle<StyleLigne>();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("lecture du style", error);
  }
  if (!data) return { absent: false, style: null };

  const cles = [
    data.typos?.echantillon_key ?? null,
    ...(data.couvertures ?? []).map((c) => c.image_key),
    ...(data.doubles ?? []).map((d) => d.image_key),
  ].filter((k): k is string => Boolean(k));
  const signees = await Promise.all(cles.map(async (k) => [k, await signerOuRien(k)] as const));
  const images: Record<string, string> = {};
  for (const [k, url] of signees) if (url) images[k] = url;

  const { data: journal, error: errJ } = await supabase
    .from("collectif_evenements")
    .select("id, type, payload, created_at")
    .eq("style_id", id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (errJ) echec("journal du style", errJ);

  return {
    absent: false,
    style: {
      style: data,
      images,
      journal: ((journal ?? []) as Pick<EvenementLigne, "id" | "type" | "payload" | "created_at">[]).map((j) => ({
        id: j.id,
        quand: j.created_at,
        phrase: phraseEvenement(j.type, j.payload ?? {}),
      })),
    },
  };
}
