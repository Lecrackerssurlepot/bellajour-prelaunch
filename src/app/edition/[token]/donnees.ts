/**
 * Ce que l'espace client lit (PRD §4). Serveur uniquement (service key) : le
 * navigateur ne reçoit que des chaînes et des nombres déjà calculés, et des
 * URL de fichiers SIGNÉES (une heure), jamais une clé du coffre.
 *
 * `chargerEspace` est mis en cache POUR LA REQUÊTE (`cache` de React) : le
 * layout et la page lisent l'édition une seule fois à eux deux.
 */

import { cache } from "react";
import { makeSupabase } from "@/lib/supabase";
import { signerGet } from "@/lib/atelier/r2";
import { chargerAcces } from "@/lib/collectif/acces";
import { styleVisible } from "@/lib/collectif/brief";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { libelleTypeDocument, nomTelechargement } from "@/lib/collectif/documents";
import { lireMessages } from "@/lib/collectif/messagerie";
import type { Message } from "@/lib/collectif/messages";
import { couverturesDesTours, magazinesPourGeste, toursDuMagazine } from "@/lib/collectif/tours";
import type { Zone } from "@/lib/collectif/bat";
import type { EditionLigne, NoteLigne } from "@/lib/collectif/types";

export const chargerEspace = cache(async (token: string) => chargerAcces(token, "espace"));

function echec(quoi: string, error: { code?: string; message: string }): never {
  throw new Error(`[collectif] ${quoi} : ${error.code ?? "?"} ${error.message}`);
}

/** Les messages de l'atelier que le responsable n'a pas encore lus (le badge du menu). */
export async function compterNonLus(editionId: string): Promise<number> {
  const { count, error } = await makeSupabase()
    .from("collectif_messages")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", editionId)
    .eq("auteur", "atelier")
    .is("lu_client_le", null);
  if (error) {
    console.error("[collectif] non-lus illisibles", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}

/* ───────────────────────────── le tableau de bord ───────────────────────────── */

export type MagazineTableau = {
  rang: number;
  nom: string;
  style: string | null;
  briefValide: boolean;
};

export type Tableau = {
  magazines: MagazineTableau[];
  photos: number;
  participants: number;
  contenusRecus: string[];
};

export async function chargerTableau(edition: EditionLigne): Promise<Tableau> {
  const supabase = makeSupabase();
  const [mags, photos, contenus] = await Promise.all([
    supabase
      .from("collectif_magazines")
      .select("rang, nom, brief_valide_le, collectif_styles(nom)")
      .eq("edition_id", edition.id)
      .order("rang", { ascending: true }),
    supabase
      .from("collectif_photos")
      .select("role_deposant, appareil_id")
      .eq("edition_id", edition.id)
      .not("confirmee_le", "is", null),
    supabase.from("collectif_contenus").select("type").eq("edition_id", edition.id),
  ]);
  if (mags.error) echec("magazines du tableau de bord", mags.error);
  if (photos.error) echec("photos du tableau de bord", photos.error);
  if (contenus.error) echec("contenus du tableau de bord", contenus.error);

  const lignesPhotos = (photos.data ?? []) as { role_deposant: string; appareil_id: string | null }[];
  const appareils = new Set(
    lignesPhotos.filter((p) => p.role_deposant === "participant" && p.appareil_id).map((p) => p.appareil_id)
  );
  return {
    magazines: ((mags.data ?? []) as unknown as {
      rang: number;
      nom: string;
      brief_valide_le: string | null;
      collectif_styles: { nom: string } | null;
    }[]).map((m) => ({
      rang: m.rang,
      nom: m.nom,
      style: m.collectif_styles?.nom ?? null,
      briefValide: Boolean(m.brief_valide_le),
    })),
    photos: lignesPhotos.length,
    participants: appareils.size,
    contenusRecus: [...new Set(((contenus.data ?? []) as { type: string }[]).map((c) => c.type))],
  };
}

/* ───────────────────────────── votre dossier ───────────────────────────── */

export type DocumentDossier = {
  id: string;
  type: string;
  libelleType: string;
  libelle: string;
  quand: string;
  url: string | null;
};

export type Dossier = { documents: DocumentDossier[]; messages: Message[] };

export async function chargerDossier(edition: EditionLigne): Promise<Dossier> {
  const supabase = makeSupabase();
  const [docs, fil] = await Promise.all([
    supabase
      .from("collectif_documents")
      .select("id, type, libelle, r2_key, created_at")
      .eq("edition_id", edition.id)
      .order("created_at", { ascending: false }),
    lireMessages(supabase, edition.id, null),
  ]);
  if (docs.error) echec("documents du dossier", docs.error);
  if (!fil.ok) throw new Error(`[collectif] messages du dossier : ${fil.code}`);

  const documents = await Promise.all(
    ((docs.data ?? []) as { id: string; type: string; libelle: string; r2_key: string | null; created_at: string }[]).map(
      async (d) => {
        let url: string | null = null;
        if (d.r2_key) {
          const ext = /\.([a-z0-9]{1,5})$/.exec(d.r2_key)?.[1] ?? "pdf";
          try {
            url = await signerGet(d.r2_key, undefined, nomTelechargement(d.libelle, ext));
          } catch (e) {
            console.error("[collectif] document non signé", d.id, e);
          }
        }
        return {
          id: d.id,
          type: d.type,
          libelleType: libelleTypeDocument(d.type),
          libelle: d.libelle,
          quand: d.created_at,
          url,
        };
      }
    )
  );
  return { documents, messages: fil.messages };
}

/* ───────────────────────────── le mur des styles ───────────────────────────── */

export type StyleMur = {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  palettes: { cle: string; nom: string; couleurs: string[] }[];
  typos: { titres: string; texte: string; echantillon: string | null };
  couvertures: { cle: string; url: string | null; legende: string }[];
  doubles: { type: string; url: string | null; legende: string }[];
};

export type MagazineMur = {
  id: string;
  rang: number;
  nom: string;
  style_id: string | null;
  palette_cle: string | null;
  texte: string | null;
  doubles: string[];
  couvertures_aimees: { style_id: string; couverture: string }[];
  brief_valide_le: string | null;
};

async function signerOuRien(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  try {
    return await signerGet(key);
  } catch {
    return null;
  }
}

/**
 * Les styles PUBLIÉS que le public de l'édition peut voir (`styleVisible`),
 * dans l'ordre du mur, chaque image signée pour une heure ; et les
 * magazines avec leur brief.
 */
export async function chargerMur(edition: EditionLigne): Promise<{ styles: StyleMur[]; magazines: MagazineMur[] }> {
  const supabase = makeSupabase();
  const [st, mags] = await Promise.all([
    supabase
      .from("collectif_styles")
      .select("id, slug, nom, description, segment, palettes, typos, couvertures, doubles, ordre")
      .eq("publie", true)
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("collectif_magazines")
      .select("id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le")
      .eq("edition_id", edition.id)
      .order("rang", { ascending: true }),
  ]);
  if (st.error) echec("styles du mur", st.error);
  if (mags.error) echec("magazines du mur", mags.error);

  type Brut = {
    id: string; slug: string; nom: string; description: string | null; segment: string;
    palettes: { cle: string; nom: string; couleurs: string[] }[] | null;
    typos: { titres?: string; texte?: string; echantillon_key?: string | null } | null;
    couvertures: { cle: string; image_key: string; legende: string }[] | null;
    doubles: { type: string; image_key: string | null; legende: string }[] | null;
  };
  const visibles = ((st.data ?? []) as Brut[]).filter((s) => styleVisible(edition.styles_segment, s.segment));
  const styles = await Promise.all(
    visibles.map(async (s) => ({
      id: s.id,
      slug: s.slug,
      nom: s.nom,
      description: s.description,
      palettes: s.palettes ?? [],
      typos: { titres: s.typos?.titres ?? "", texte: s.typos?.texte ?? "", echantillon: await signerOuRien(s.typos?.echantillon_key) },
      couvertures: await Promise.all((s.couvertures ?? []).map(async (c) => ({ cle: c.cle, url: await signerOuRien(c.image_key), legende: c.legende }))),
      doubles: await Promise.all((s.doubles ?? []).map(async (d) => ({ type: d.type, url: await signerOuRien(d.image_key), legende: d.legende }))),
    }))
  );
  return { styles, magazines: (mags.data ?? []) as MagazineMur[] };
}

/* ───────────────────────────── le bon à tirer ───────────────────────────── */

export type PageBat = { index: number; url: string | null; vignette: string | null; apparie_a: number | null; zones: Zone[] };

export type TourBat = {
  id: string;
  numero: number;
  publie_le: string;
  publieTexte: string;
  echeance_retours: string | null;
  echeanceTexte: string;
  pages: PageBat[];
};

export type NoteBat = {
  id: string;
  tour_id: string;
  page_index: number | null;
  x_pct: number | null;
  y_pct: number | null;
  type: string;
  contenu: Record<string, string>;
  envoyee_le: string | null;
  resolue_le: string | null;
  retiree_le: string | null;
  reponse_atelier: string | null;
  created_at: string;
};

export type CouvertureBat = { id: string; rang: number; legende: string | null; c1: string | null; c2: string | null; c3: string | null };

export type MagazineBat = {
  id: string;
  rang: number;
  nom: string;
  bat_valide_le: string | null;
  couverture_choisie_id: string | null;
  couverture_sans_preference: boolean;
  couverture_note: string | null;
  toursPublies: number;
  valideTexte: string;
};

export type Bat = { magazines: MagazineBat[]; magazine: MagazineBat | null; tours: TourBat[]; notes: NoteBat[]; couvertures: CouvertureBat[] };

/** Une note telle que le navigateur la reçoit (les nombres de PostgREST relus, le contenu en chaînes). */
export function noteVersBat(n: NoteLigne): NoteBat {
  const contenu: Record<string, string> = {};
  for (const [k, v] of Object.entries(n.contenu ?? {})) if (typeof v === "string") contenu[k] = v;
  const nombre = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: n.id,
    tour_id: n.tour_id,
    page_index: n.page_index,
    x_pct: nombre(n.x_pct),
    y_pct: nombre(n.y_pct),
    type: n.type,
    contenu,
    envoyee_le: n.envoyee_le,
    resolue_le: n.resolue_le,
    retiree_le: n.retiree_le,
    reponse_atelier: n.reponse_atelier,
    created_at: n.created_at,
  };
}

/**
 * Le bon à tirer d'UN magazine (`rang`, le premier par défaut) : ses tours
 * PUBLIÉS (un brouillon de l'atelier ne se voit jamais), chaque page signée
 * une heure, toutes ses notes (brouillons compris : c'est le responsable qui
 * les a posées), les propositions de couverture du premier tour.
 */
export async function chargerBat(edition: EditionLigne, rang: number | null): Promise<Bat> {
  const supabase = makeSupabase();
  const lusMags = await magazinesPourGeste(supabase, edition.id);
  if (!lusMags.ok) throw new Error(`[collectif] magazines du BAT : ${lusMags.code}`);
  const { data: noms, error } = await supabase
    .from("collectif_magazines")
    .select("id, nom, couverture_note")
    .eq("edition_id", edition.id);
  if (error) echec("noms des magazines du BAT", error);
  const parId = new Map(((noms ?? []) as { id: string; nom: string; couverture_note: string | null }[]).map((m) => [m.id, m]));
  const magazines: MagazineBat[] = lusMags.valeur
    .map((m) => ({
      ...m,
      nom: parId.get(m.id)?.nom ?? "",
      couverture_note: parId.get(m.id)?.couverture_note ?? null,
      valideTexte: formaterInstantParis(m.bat_valide_le),
    }))
    .sort((a, b) => a.rang - b.rang);
  const magazine = magazines.find((m) => m.rang === rang) ?? magazines[0] ?? null;
  if (!magazine) return { magazines, magazine: null, tours: [], notes: [], couvertures: [] };

  const lus = await toursDuMagazine(supabase, magazine.id);
  if (!lus.ok) throw new Error(`[collectif] tours du BAT : ${lus.code}`);
  const publies = lus.valeur.filter((t) => t.publie_le);
  const ids = publies.map((t) => t.id);
  const [notes, couv] = await Promise.all([
    ids.length
      ? supabase
          .from("collectif_notes")
          .select("id, tour_id, page_index, x_pct, y_pct, type, contenu, envoyee_le, resolue_le, reponse_atelier, reponse_le, retiree_le, created_at, maj_le")
          .in("tour_id", ids)
          .is("retiree_le", null)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    couverturesDesTours(supabase, ids),
  ]);
  if (notes.error) echec("notes du BAT", notes.error);
  if (!couv.ok) throw new Error(`[collectif] couvertures du BAT : ${couv.code}`);

  const tours: TourBat[] = await Promise.all(
    publies.map(async (t) => ({
      id: t.id,
      numero: t.numero,
      publie_le: t.publie_le as string,
      publieTexte: formaterInstantParis(t.publie_le),
      echeance_retours: t.echeance_retours,
      echeanceTexte: formaterInstantParis(t.echeance_retours),
      pages: await Promise.all(
        (t.pages ?? []).map(async (p) => ({
          index: p.index,
          url: await signerOuRien(p.image_key),
          vignette: await signerOuRien(p.vignette_key ?? null),
          apparie_a: p.apparie_a,
          zones: p.zones ?? [],
        }))
      ),
    }))
  );
  const couvertures: CouvertureBat[] = await Promise.all(
    couv.valeur.map(async (c) => ({
      id: c.id,
      rang: c.rang,
      legende: c.legende,
      c1: await signerOuRien(c.image_key),
      c2: await signerOuRien(c.interieur2_key),
      c3: await signerOuRien(c.interieur3_key),
    }))
  );
  return { magazines, magazine, tours, notes: ((notes.data ?? []) as NoteLigne[]).map(noteVersBat), couvertures };
}
