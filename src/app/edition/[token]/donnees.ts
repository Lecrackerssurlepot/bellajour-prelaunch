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
import { libelleTypeDocument, nomTelechargement } from "@/lib/collectif/documents";
import { lireMessages } from "@/lib/collectif/messagerie";
import type { Message } from "@/lib/collectif/messages";
import type { EditionLigne } from "@/lib/collectif/types";

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
