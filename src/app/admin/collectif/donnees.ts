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
import { libelleTypeDocument } from "@/lib/collectif/documents";
import { lireMessages } from "@/lib/collectif/messagerie";
import { resumeDeposants } from "@/lib/collectif/grille";
import type { Message } from "@/lib/collectif/messages";
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
  /** Le brief, lisible par l'atelier (phase 4). */
  brief: {
    style: string | null;
    palette: { nom: string; couleurs: string[] } | null;
    texte: string | null;
    doubles: string[];
    aimees: { style: string; url: string | null }[];
  };
};

export type EntreeJournal = { id: string; quand: string; phrase: string };

export type DocumentFiche = { id: string; libelle: string; libelleType: string; quand: string; par: string | null };

export type Collecte = {
  total: number;
  participants: number;
  signalees: number;
  sansVignette: number;
  parProvenance: { libelle: string; n: number }[];
};

export type Fiche = {
  collecte: Collecte;
  edition: EditionLigne;
  etat: EtatEdition;
  magazines: MagazineFiche[];
  journal: EntreeJournal[];
  documents: DocumentFiche[];
  messages: Message[];
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

  const [mags, journal, docs, fil, photos] = await Promise.all([
    supabase
      .from("collectif_magazines")
      .select("id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le, bat_valide_le")
      .eq("edition_id", id)
      .order("rang", { ascending: true }),
    supabase
      .from("collectif_evenements")
      .select("id, type, payload, created_at")
      .eq("edition_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("collectif_documents")
      .select("id, type, libelle, created_at, cree_par")
      .eq("edition_id", id)
      .order("created_at", { ascending: false }),
    lireMessages(supabase, id, null),
    supabase
      .from("collectif_photos")
      .select("provenance_type, deposant, role_deposant, appareil_id, signalee, vignette_key")
      .eq("edition_id", id)
      .not("confirmee_le", "is", null)
      .limit(20000),
  ]);
  if (photos.error) echec("photos de l'édition", photos.error);
  if (mags.error) echec("magazines de l'édition", mags.error);
  if (journal.error) echec("journal de l'édition", journal.error);
  if (docs.error) echec("documents de l'édition", docs.error);
  if (!fil.ok) throw new Error(`[collectif] messages de l'édition : ${fil.code}`);

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

  const lignesPhotos = (photos.data ?? []) as {
    provenance_type: string;
    deposant: string | null;
    role_deposant: string;
    appareil_id: string | null;
    signalee: boolean;
    vignette_key: string | null;
  }[];
  const collecte: Collecte = {
    total: lignesPhotos.length,
    participants: new Set(lignesPhotos.filter((p) => p.role_deposant === "participant" && p.appareil_id).map((p) => p.appareil_id)).size,
    signalees: lignesPhotos.filter((p) => p.signalee).length,
    sansVignette: lignesPhotos.filter((p) => !p.vignette_key).length,
    parProvenance: resumeDeposants(lignesPhotos),
  };

  /* Les styles que les briefs nomment (choisis ou aimés), pour les lire en clair. */
  type MagBrut = MagazineLigne & { style_id: string | null };
  const magsBruts = (mags.data ?? []) as MagBrut[];
  const idsStyles = [...new Set(magsBruts.flatMap((m) => [m.style_id, ...(m.couvertures_aimees ?? []).map((a) => a.style_id)]).filter(Boolean))] as string[];
  const stylesLus = idsStyles.length
    ? await supabase.from("collectif_styles").select("id, nom, palettes, couvertures").in("id", idsStyles)
    : { data: [], error: null };
  if (stylesLus.error) echec("styles des briefs", stylesLus.error);
  const parStyle = new Map(
    ((stylesLus.data ?? []) as { id: string; nom: string; palettes: { cle: string; nom: string; couleurs: string[] }[]; couvertures: { cle: string; image_key: string }[] }[]).map((x) => [x.id, x])
  );
  const briefs = new Map<string, MagazineFiche["brief"]>();
  for (const m of magsBruts) {
    const st = m.style_id ? parStyle.get(m.style_id) : undefined;
    const pal = st?.palettes?.find((x) => x.cle === m.palette_cle);
    const aimees = await Promise.all(
      (m.couvertures_aimees ?? []).map(async (a) => {
        const s2 = parStyle.get(a.style_id);
        const c = s2?.couvertures?.find((x) => x.cle === a.couverture);
        return { style: s2?.nom ?? "?", url: c ? await signerOuRien(c.image_key) : null };
      })
    );
    briefs.set(m.id, {
      style: st?.nom ?? null,
      palette: pal ? { nom: pal.nom, couleurs: pal.couleurs } : null,
      texte: m.texte,
      doubles: m.doubles ?? [],
      aimees,
    });
  }

  return {
    absent: false,
    fiche: {
      collecte,
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
          brief: briefs.get(m.id) ?? { style: null, palette: null, texte: null, doubles: [], aimees: [] },
        };
      }),
      journal: ((journal.data ?? []) as Pick<EvenementLigne, "id" | "type" | "payload" | "created_at">[]).map((j) => ({
        id: j.id,
        quand: j.created_at,
        phrase: phraseEvenement(j.type, j.payload ?? {}),
      })),
      documents: ((docs.data ?? []) as { id: string; type: string; libelle: string; created_at: string; cree_par: string | null }[]).map(
        (d) => ({ id: d.id, libelle: d.libelle, libelleType: libelleTypeDocument(d.type), quand: d.created_at, par: d.cree_par })
      ),
      messages: fil.messages,
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
