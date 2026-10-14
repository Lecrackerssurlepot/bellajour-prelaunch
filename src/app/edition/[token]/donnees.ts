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
import { colonneAbsente } from "@/lib/collectif/migration";
import { libellePlafondLien } from "@/lib/collectif/plafonds";
import { formaterInstantParis, formaterJourParis } from "@/lib/collectif/dates";
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
  id: string;
  rang: number;
  nom: string;
  style: string | null;
  /** La couverture du style choisi (signée une heure), pour l'encart Style. */
  styleCouverture: string | null;
  briefValide: boolean;
};

/** Un « dossier » de photos de l'encart Photos : un lien de contribution, les photos du responsable… */
export type DossierPhotos = { cle: string; libelle: string; detail: string; n: number; lien: boolean };

/** Un lien de contribution (une provenance), tel que le responsable le partage. */
export type LienContribution = {
  id: string;
  libelle: string;
  /** L'adresse complète à partager (QR, copier, WhatsApp, mail). Jamais journalisée. */
  url: string;
  plafond: string;
  recues: number;
};

export type Tableau = {
  magazines: MagazineTableau[];
  /** Trois couvertures de styles publiés, pour l'éventail de l'encart vide. */
  eventail: { nom: string; url: string | null }[];
  photos: number;
  participants: number;
  dossiers: DossierPhotos[];
  mosaique: string[];
  liens: LienContribution[];
  contenusRecus: string[];
  dernierMessage: { texte: string; quand: string } | null;
};

type ProvenanceLue = { id: string; cle: string; type: string; libelle: string | null; sans_plafond: boolean; plafond_par_personne: number | null; created_at: string };

/**
 * Les liens de contribution d'une édition. Repli tant que la migration de la
 * révision n'est pas passée : sans `plafond_par_personne`, un lien garde la
 * règle de l'édition (`libellePlafondLien`).
 */
export async function lireProvenances(editionId: string): Promise<ProvenanceLue[]> {
  const supabase = makeSupabase();
  const avec = await supabase
    .from("collectif_provenances")
    .select("id, cle, type, libelle, sans_plafond, plafond_par_personne, created_at")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true });
  if (!avec.error) return (avec.data ?? []) as ProvenanceLue[];
  if (!colonneAbsente(avec.error.code)) echec("liens de contribution", avec.error);
  const sans = await supabase
    .from("collectif_provenances")
    .select("id, cle, type, libelle, sans_plafond, created_at")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true });
  if (sans.error) echec("liens de contribution (repli)", sans.error);
  return ((sans.data ?? []) as Omit<ProvenanceLue, "plafond_par_personne">[]).map((l) => ({ ...l, plafond_par_personne: null }));
}

export async function chargerTableau(edition: EditionLigne, origine = ""): Promise<Tableau> {
  const supabase = makeSupabase();
  const [mags, photos, contenus, styles, message, provenances] = await Promise.all([
    supabase
      .from("collectif_magazines")
      .select("id, rang, nom, brief_valide_le, collectif_styles(nom, couvertures)")
      .eq("edition_id", edition.id)
      .order("rang", { ascending: true }),
    supabase
      .from("collectif_photos")
      .select("role_deposant, appareil_id, provenance_id, deposant, vignette_key, confirmee_le")
      .eq("edition_id", edition.id)
      .not("confirmee_le", "is", null)
      .order("confirmee_le", { ascending: false })
      .limit(20000),
    supabase.from("collectif_contenus").select("type").eq("edition_id", edition.id),
    supabase
      .from("collectif_styles")
      .select("nom, segment, couvertures")
      .eq("publie", true)
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(24),
    supabase
      .from("collectif_messages")
      .select("texte, created_at")
      .eq("edition_id", edition.id)
      .eq("auteur", "atelier")
      .order("created_at", { ascending: false })
      .limit(1),
    lireProvenances(edition.id),
  ]);
  if (mags.error) echec("magazines du tableau de bord", mags.error);
  if (photos.error) echec("photos du tableau de bord", photos.error);
  if (contenus.error) echec("contenus du tableau de bord", contenus.error);
  if (styles.error) echec("styles du tableau de bord", styles.error);
  if (message.error) echec("dernier message du tableau de bord", message.error);

  type Couv = { image_key: string }[] | null;
  const premiere = (c: Couv) => c?.find((x) => x.image_key)?.image_key ?? null;

  const magazines = await Promise.all(
    ((mags.data ?? []) as unknown as {
      id: string;
      rang: number;
      nom: string;
      brief_valide_le: string | null;
      collectif_styles: { nom: string; couvertures: Couv } | null;
    }[]).map(async (m) => ({
      id: m.id,
      rang: m.rang,
      nom: m.nom,
      style: m.collectif_styles?.nom ?? null,
      styleCouverture: await signerOuRien(premiere(m.collectif_styles?.couvertures ?? null)),
      briefValide: Boolean(m.brief_valide_le),
    }))
  );

  const eventail = await Promise.all(
    ((styles.data ?? []) as { nom: string; segment: string; couvertures: Couv }[])
      .filter((st) => styleVisible(edition.styles_segment, st.segment) && premiere(st.couvertures))
      .slice(0, 3)
      .map(async (st) => ({ nom: st.nom, url: await signerOuRien(premiere(st.couvertures)) }))
  );

  const lignes = (photos.data ?? []) as {
    role_deposant: string;
    appareil_id: string | null;
    provenance_id: string | null;
    deposant: string | null;
    vignette_key: string | null;
  }[];
  const appareils = new Set(lignes.filter((l) => l.role_deposant === "participant" && l.appareil_id).map((l) => l.appareil_id));

  /* Les dossiers : un par lien de contribution, puis ce que le responsable a
     déposé lui-même (« Mes photos », ou le nom de dossier qu'il a choisi),
     les participants du lien commun, l'atelier. */
  const parLien = new Map<string, number>();
  const autres = new Map<string, DossierPhotos>();
  const nomResponsable = edition.responsable_nom ?? "";
  for (const l of lignes) {
    if (l.provenance_id) {
      parLien.set(l.provenance_id, (parLien.get(l.provenance_id) ?? 0) + 1);
      continue;
    }
    let cle: string;
    let d: Omit<DossierPhotos, "n">;
    if (l.role_deposant === "responsable") {
      const nom = !l.deposant || l.deposant === nomResponsable || l.deposant === "Le responsable" ? "Mes photos" : l.deposant;
      cle = `resp:${nom}`;
      d = { cle, libelle: nom, detail: "déposées par vous", lien: false };
    } else if (l.role_deposant === "participant") {
      cle = "participants";
      d = { cle, libelle: "Lien des participants", detail: `lien commun · ${libellePlafondLien({ sans_plafond: false, plafond_par_personne: null }, edition).toLowerCase()}`, lien: true };
    } else {
      cle = "atelier";
      d = { cle, libelle: "L'atelier", detail: "déposées par l'atelier", lien: false };
    }
    const actuel = autres.get(cle);
    autres.set(cle, actuel ? { ...actuel, n: actuel.n + 1 } : { ...d, n: 1 });
  }
  const liens: LienContribution[] = provenances.map((p) => ({
    id: p.id,
    libelle: p.libelle ?? "Lien de contribution",
    url: `${origine}/depot/${edition.token_depot}?p=${p.cle}`,
    plafond: libellePlafondLien(p, edition),
    recues: parLien.get(p.id) ?? 0,
  }));
  const dossiers: DossierPhotos[] = [
    ...liens.filter((l) => l.recues > 0).map((l) => ({ cle: l.id, libelle: l.libelle, detail: `lien · ${l.plafond.toLowerCase()}`, n: l.recues, lien: true })),
    ...[...autres.values()],
  ].sort((a, b) => b.n - a.n);

  const mosaique = (
    await Promise.all(lignes.filter((l) => l.vignette_key).slice(0, 8).map((l) => signerOuRien(l.vignette_key)))
  ).filter((u): u is string => Boolean(u));

  const dernier = ((message.data ?? []) as { texte: string; created_at: string }[])[0] ?? null;

  return {
    magazines,
    eventail,
    photos: lignes.length,
    participants: appareils.size,
    dossiers,
    mosaique,
    liens,
    contenusRecus: [...new Set(((contenus.data ?? []) as { type: string }[]).map((c) => c.type))],
    dernierMessage: dernier ? { texte: dernier.texte, quand: dernier.created_at } : null,
  };
}

/* ───────────────────────────── les documents ───────────────────────────── */

export type DocumentDossier = {
  id: string;
  type: string;
  libelleType: string;
  libelle: string;
  quand: string;
  url: string | null;
  /** « Acceptée le … » pour une proposition complémentaire ; posé par l'atelier ou par le client. */
  statut: string | null;
};

export type Dossier = { documents: DocumentDossier[]; messages: Message[] };

/** Les documents posés par l'atelier, du plus récent au plus ancien, signés une heure. */
export async function chargerDocuments(edition: EditionLigne): Promise<DocumentDossier[]> {
  const { data, error } = await makeSupabase()
    .from("collectif_documents")
    .select("id, type, libelle, r2_key, statut_texte, created_at")
    .eq("edition_id", edition.id)
    .order("created_at", { ascending: false });
  if (error) echec("documents de l'édition", error);
  return Promise.all(
    ((data ?? []) as { id: string; type: string; libelle: string; r2_key: string | null; statut_texte: string | null; created_at: string }[]).map(
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
          statut: d.statut_texte,
        };
      }
    )
  );
}

/** Les documents ET le fil : « Parler à l'atelier » cite les uns dans l'autre (révision §14.5). */
export async function chargerDossier(edition: EditionLigne): Promise<Dossier> {
  const [documents, fil] = await Promise.all([chargerDocuments(edition), lireMessages(makeSupabase(), edition.id, null)]);
  if (!fil.ok) throw new Error(`[collectif] messages de l'édition : ${fil.code}`);
  return { documents, messages: fil.messages };
}

/** Une proposition complémentaire attend-elle une réponse ? (« Acceptée le … » est posé par la route.) */
export function propositionEnAttente(d: DocumentDossier): boolean {
  return d.type === "proposition" && !d.statut?.startsWith("Acceptée");
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

/* ───────────────────────────── parler à l'atelier, la livraison ───────────────────────────── */

/** Les propositions complémentaires posées par l'atelier (documents de type `proposition`). */
export async function chargerPropositions(edition: EditionLigne): Promise<DocumentDossier[]> {
  return (await chargerDocuments(edition)).filter((d) => d.type === "proposition");
}

export type SuiviLivraison = {
  /** Le jour où chaque étape a été atteinte, déjà mis en mots (« 21 octobre »). */
  quand: Partial<Record<"bat_valide" | "impression" | "expediee" | "livree", string>>;
};

/**
 * Les dates des étapes, LUES (jamais estimées) : la dernière validation de
 * BAT des magazines, le geste « Lancer l'impression » du journal, les dates
 * d'expédition et de livraison posées dans `livraison` par les gestes.
 */
export async function chargerSuiviLivraison(edition: EditionLigne): Promise<SuiviLivraison> {
  const supabase = makeSupabase();
  const [mags, impression] = await Promise.all([
    supabase.from("collectif_magazines").select("bat_valide_le").eq("edition_id", edition.id),
    supabase
      .from("collectif_evenements")
      .select("created_at")
      .eq("edition_id", edition.id)
      .eq("type", "geste")
      .eq("payload->>cle", "lancer_impression")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (mags.error) echec("magazines de la livraison", mags.error);
  if (impression.error) echec("journal de la livraison", impression.error);
  const valides = ((mags.data ?? []) as { bat_valide_le: string | null }[]).map((m) => m.bat_valide_le).filter((x): x is string => Boolean(x));
  const dernierBat = valides.length === (mags.data ?? []).length && valides.length ? valides.sort().at(-1) ?? null : null;
  const quand: SuiviLivraison["quand"] = {};
  if (dernierBat) quand.bat_valide = formaterJourParis(dernierBat);
  const imp = (impression.data ?? [])[0] as { created_at: string } | undefined;
  if (imp) quand.impression = formaterJourParis(imp.created_at);
  if (edition.livraison?.expediee_le) quand.expediee = formaterJourParis(edition.livraison.expediee_le);
  if (edition.livraison?.livree_le) quand.livree = formaterJourParis(edition.livraison.livree_le);
  return { quand };
}
