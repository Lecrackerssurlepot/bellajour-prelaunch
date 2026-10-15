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
import { colonneAbsente, tableAbsente } from "@/lib/collectif/migration";
import { prochaineEtape, type Prochaine } from "@/lib/collectif/prochaine";
import { phraseEvenement } from "@/lib/collectif/recit";
import { manquesPourPublier } from "@/lib/collectif/styles";
import { libelleTypeDocument } from "@/lib/collectif/documents";
import { contenuClient } from "@/lib/collectif/contenus";
import { compositionDu, stylesDeLaComposition, type BriefLigne } from "@/lib/collectif/brief";
import { TYPES_DOUBLES } from "@/lib/collectif/styles";
import { lireMessages } from "@/lib/collectif/messagerie";
import { aTraiter, conversationsDe, type Conversation, type MessageBoite } from "@/lib/collectif/boite";
import { lireInterlocuteurs } from "@/lib/collectif/rendezvous";
import { resumeDeposants } from "@/lib/collectif/grille";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import type { Message } from "@/lib/collectif/messages";
import { resumeNote, resumeTour } from "@/lib/collectif/bat";
import { estUuid } from "@/lib/collectif/cles";
import { formaterInstantParis, versChampParis } from "@/lib/collectif/dates";
import { couverturesDesTours, precedentDe, toursDuMagazine } from "@/lib/collectif/tours";
import type { EditionLigne, EvenementLigne, MagazineLigne, NoteLigne, StyleLigne } from "@/lib/collectif/types";

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

/**
 * Les messages des clients que l'atelier n'a pas lus, toutes éditions (la
 * pastille du commutateur et de « Messagerie », T-152). `null` si la lecture
 * échoue ou si les tables n'existent pas : une pastille absente vaut mieux
 * qu'une table de travail qui tombe pour un compteur.
 */
export async function compterNonLus(supabase: SupabaseClient, editionId?: string): Promise<number | null> {
  let requete = supabase.from("collectif_messages").select("id", { count: "exact", head: true }).eq("auteur", "client").is("lu_atelier_le", null);
  if (editionId) requete = requete.eq("edition_id", editionId);
  const { count, error } = await requete;
  if (error) {
    if (!tableAbsente(error.code)) console.error("[collectif] non-lus illisibles", error.code, error.message);
    return null;
  }
  return count ?? 0;
}

/* ─────────────────────────────── la boîte de réception ─────────────────────────────── */

/**
 * La boîte de réception de l'atelier (T-152) : une conversation par édition
 * non archivée, ce qui est à traiter aujourd'hui. LIT seulement : rien n'est
 * marqué lu ici (l'ouverture d'une conversation le fait, par un effet).
 * Les rendez-vous sont un bonus : sans leur migration, la boîte s'affiche
 * sans eux.
 */
export async function chargerBoite(
  supabase: SupabaseClient,
  maintenant: Date
): Promise<{ absent: true } | { absent: false; conversations: Conversation[]; aTraiter: { editionId: string; texte: string }[] }> {
  const { data, error } = await supabase
    .from("collectif_editions")
    .select("id, organisation, evenement, created_at")
    .is("archive_le", null)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ id: string; organisation: string; evenement: string; created_at: string }[]>();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("éditions de la boîte", error);
  }
  const editions = data ?? [];
  const ids = editions.map((e) => e.id);
  if (!ids.length) return { absent: false, conversations: [], aTraiter: [] };
  const [messages, rdvs, inters] = await Promise.all([
    supabase
      .from("collectif_messages")
      .select("edition_id, auteur, texte, created_at, lu_atelier_le")
      .in("edition_id", ids)
      .order("created_at", { ascending: false })
      .limit(3000)
      .returns<MessageBoite[]>(),
    supabase
      .from("collectif_rendez_vous")
      .select("edition_id, debut, interlocuteur_cle")
      .in("edition_id", ids)
      .eq("statut", "pris")
      .gte("debut", new Date(maintenant.getTime() - 86_400_000).toISOString())
      .lte("debut", new Date(maintenant.getTime() + 2 * 86_400_000).toISOString())
      .returns<{ edition_id: string; debut: string; interlocuteur_cle: string }[]>(),
    lireInterlocuteurs(supabase),
  ]);
  if (messages.error) echec("messages de la boîte", messages.error);
  const conversations = conversationsDe(editions, messages.data ?? [], maintenant);
  const prenoms = new Map((inters.ok ? inters.valeur : []).map((i) => [i.cle, i.prenom]));
  const rendezVous = rdvs.error ? [] : (rdvs.data ?? []).map((r) => ({ edition_id: r.edition_id, debut: r.debut, avec: prenoms.get(r.interlocuteur_cle) ?? r.interlocuteur_cle }));
  return { absent: false, conversations, aTraiter: aTraiter(conversations, rendezVous, maintenant) };
}

/* ─────────────────────────────────── la fiche ─────────────────────────────────── */

export type MagazineFiche = Pick<MagazineLigne, "id" | "rang" | "nom" | "brief_valide_le" | "bat_valide_le"> & {
  toursPublies: number;
  /** Ni brief commencé, ni tour : il peut se retirer (le dernier seulement). */
  vide: boolean;
  /** Le brief, lisible par l'atelier : chaque pièce dit son style (D24, composition pièce par pièce). */
  brief: {
    /** Les styles d'où vient la composition, dans l'ordre palette, typographies, doubles, couvertures. */
    styles: string[];
    palette: { nom: string; couleurs: string[]; style: string } | null;
    typos: { titres: string; texte: string; style: string } | null;
    texte: string | null;
    doubles: { libelle: string; style: string }[];
    aimees: { style: string; url: string | null }[];
  };
};

export type EntreeJournal = { id: string; quand: string; phrase: string };

export type DocumentFiche = { id: string; libelle: string; libelleType: string; quand: string; par: string | null; statut: string | null };

export type Collecte = {
  total: number;
  participants: number;
  signalees: number;
  sansVignette: number;
  /** Les copies repérées (même règle et même compte que la page Photos du client). */
  doublons: number;
  /** Les vignettes des quatre dernières photos arrivées, signées une heure (la vue d'ensemble). */
  apercus: string[];
  parProvenance: { libelle: string; n: number }[];
};

/** Un contenu envoyé par le client (logo, programme, mot du dirigeant…), le plus récent d'abord. */
export type ContenuFiche = {
  id: string;
  libelle: string;
  quand: string;
  par: string | null;
  /** Le fichier, signé une heure, sous son nom d'origine ; ou null pour un questionnaire. */
  url: string | null;
  nom: string | null;
  reponses: { question: string; reponse: string }[];
  /** Remplacé par le client (migration 20261016) : gardé ici, plus sur son écran. */
  ancienne: boolean;
};

export type Fiche = {
  contenus: ContenuFiche[];
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

  const [mags, journal, docs, fil, photos, contenus] = await Promise.all([
    lireMagazinesFiche(supabase, id),
    supabase
      .from("collectif_evenements")
      .select("id, type, payload, created_at")
      .eq("edition_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("collectif_documents")
      .select("id, type, libelle, statut_texte, created_at, cree_par")
      .eq("edition_id", id)
      .order("created_at", { ascending: false }),
    lireMessages(supabase, id, null),
    supabase
      .from("collectif_photos")
      .select("id, provenance_type, deposant, role_deposant, appareil_id, signalee, vignette_key, empreinte, prise_le, ordre, confirmee_le")
      .eq("edition_id", id)
      .not("confirmee_le", "is", null)
      .limit(20000),
    lireContenusFiche(supabase, id),
  ]);
  if (photos.error) echec("photos de l'édition", photos.error);
  if (contenus.error) echec("contenus de l'édition", contenus.error);
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
    id: string;
    empreinte: string | null;
    prise_le: string | null;
    ordre: number | null;
    confirmee_le: string;
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
    doublons: groupesDoublonsRapides(lignesPhotos.map((p, i) => ({ id: p.id, empreinte: p.empreinte, priseLe: p.prise_le, ordre: p.ordre ?? i }))).reduce(
      (n, g) => n + g.doublons.length,
      0
    ),
    apercus: (
      await Promise.all(
        lignesPhotos
          .filter((p) => p.vignette_key)
          .sort((a, b) => b.confirmee_le.localeCompare(a.confirmee_le))
          .slice(0, 4)
          .map((p) => signerOuRien(p.vignette_key))
      )
    ).filter((u): u is string => u !== null),
    parProvenance: resumeDeposants(lignesPhotos),
  };

  /* Les styles que les briefs nomment (chaque pièce, D24), pour les lire en clair, publiés ou non. */
  type MagBrut = MagazineLigne & BriefLigne;
  const magsBruts = (mags.data ?? []) as unknown as MagBrut[];
  const compositions = new Map(magsBruts.map((m) => [m.id, compositionDu(m)]));
  const idsStyles = [...new Set([...compositions.values()].flatMap(stylesDeLaComposition))];
  const stylesLus = idsStyles.length
    ? await supabase.from("collectif_styles").select("id, nom, palettes, couvertures, typos").in("id", idsStyles)
    : { data: [], error: null };
  if (stylesLus.error) echec("styles des briefs", stylesLus.error);
  const parStyle = new Map(
    ((stylesLus.data ?? []) as {
      id: string;
      nom: string;
      palettes: { cle: string; nom: string; couleurs: string[] }[];
      couvertures: { cle: string; image_key: string }[];
      typos: { titres?: string; texte?: string } | null;
    }[]).map((x) => [x.id, x])
  );
  const nom = (styleId: string) => parStyle.get(styleId)?.nom ?? "un style retiré";
  const briefs = new Map<string, MagazineFiche["brief"]>();
  for (const m of magsBruts) {
    const c = compositions.get(m.id) ?? compositionDu(m);
    const pal = c.palette ? parStyle.get(c.palette.style_id)?.palettes?.find((x) => x.cle === c.palette?.cle) : undefined;
    const ty = c.typos ? parStyle.get(c.typos.style_id)?.typos : undefined;
    const aimees = await Promise.all(
      c.couvertures.map(async (a) => {
        const s2 = parStyle.get(a.style_id);
        const cv = s2?.couvertures?.find((x) => x.cle === a.couverture);
        return { style: s2?.nom ?? "?", url: cv ? await signerOuRien(cv.image_key) : null };
      })
    );
    briefs.set(m.id, {
      styles: stylesDeLaComposition(c).map(nom),
      palette: c.palette && pal ? { nom: pal.nom, couleurs: pal.couleurs, style: nom(c.palette.style_id) } : null,
      typos: c.typos ? { titres: ty?.titres ?? "", texte: ty?.texte ?? "", style: nom(c.typos.style_id) } : null,
      texte: c.texte,
      doubles: c.doubles.map((d) => ({ libelle: TYPES_DOUBLES.find((t) => t.cle === d.double)?.libelle ?? d.double, style: nom(d.style_id) })),
      aimees,
    });
  }

  return {
    absent: false,
    fiche: {
      collecte,
      edition,
      etat: etatEffectif(edition.etat, edition.cloture_le, maintenant),
      magazines: (mags.data ?? []).map((m) => {
        const t = toursParMag.get(m.id) ?? { total: 0, publies: 0 };
        return {
          id: m.id,
          rang: m.rang,
          nom: m.nom,
          brief_valide_le: m.brief_valide_le,
          bat_valide_le: m.bat_valide_le,
          toursPublies: t.publies,
          vide: !(briefs.get(m.id)?.styles.length) && !m.brief_valide_le && t.total === 0,
          brief: briefs.get(m.id) ?? { styles: [], palette: null, typos: null, texte: null, doubles: [], aimees: [] },
        };
      }),
      journal: ((journal.data ?? []) as Pick<EvenementLigne, "id" | "type" | "payload" | "created_at">[]).map((j) => ({
        id: j.id,
        quand: j.created_at,
        phrase: phraseEvenement(j.type, j.payload ?? {}),
      })),
      contenus: await Promise.all(
        ((contenus.data ?? []) as { id: string; type: string; r2_key: string | null; nom_origine: string | null; reponses: Record<string, unknown> | null; recu_le: string; depose_par: string | null; remplace_le?: string | null }[]).map(
          async (c) => {
            let url: string | null = null;
            if (c.r2_key) {
              try {
                url = await signerGet(c.r2_key, undefined, c.nom_origine ?? undefined);
              } catch {
                url = null;
              }
            }
            return {
              id: c.id,
              libelle: contenuClient(c.type)?.libelle ?? c.type,
              quand: c.recu_le,
              par: c.depose_par,
              url,
              nom: c.nom_origine,
              reponses: Object.entries(c.reponses ?? {})
                .filter(([, r]) => typeof r === "string")
                .map(([question, r]) => ({ question, reponse: r as string })),
              ancienne: Boolean(c.remplace_le),
            };
          }
        )
      ),
      documents: ((docs.data ?? []) as { id: string; type: string; libelle: string; statut_texte: string | null; created_at: string; cree_par: string | null }[]).map(
        (d) => ({ id: d.id, libelle: d.libelle, libelleType: libelleTypeDocument(d.type), quand: d.created_at, par: d.cree_par, statut: d.statut_texte })
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

/* ─────────────────────────────────── le bon à tirer ─────────────────────────────────── */

export type PageAtelier = { index: number; vignette: string | null; apparie_a: number | null; zones: number };

export type TourAtelier = {
  id: string;
  numero: number;
  publie: boolean;
  publieTexte: string;
  echeanceLocal: string;
  echeanceTexte: string;
  nbPages: number | null;
  pdf: boolean;
  pages: PageAtelier[];
  resume: { nouvelles: number; modifiees: number; retirees: number[] } | null;
  precedent: number | null;
};

export type CouvertureAtelier = { rang: number; legende: string; c1: string | null; c2: string | null; c3: string | null };

export type NoteAtelier = {
  id: string;
  numero: number;
  tour: number;
  page: number | null;
  type: string;
  resume: string;
  photo: string | null;
  envoyeeTexte: string;
  resolue: boolean;
  reponse: string | null;
};

export type MagazineBatAtelier = {
  id: string;
  rang: number;
  nom: string;
  bat_valide_le: string | null;
  couverture: string;
  couverture_note: string | null;
};

export type BatAtelier = {
  edition: Pick<EditionLigne, "id" | "organisation" | "evenement" | "nb_propositions_couverture" | "tirage" | "token_responsable" | "archive_le">;
  etat: EtatEdition;
  magazines: MagazineBatAtelier[];
  magazine: MagazineBatAtelier | null;
  tours: TourAtelier[];
  brouillon: TourAtelier | null;
  /** Les propositions vivent sur le premier tour (brouillon tant qu'il n'est pas publié). */
  couvertures: CouvertureAtelier[];
  couverturesModifiables: boolean;
  notes: NoteAtelier[];
};

async function signer(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  try {
    return await signerGet(key);
  } catch {
    return null;
  }
}

/** L'écran « Bon à tirer » de l'atelier, pour un magazine (`rang`, le premier par défaut). */
export async function chargerBatAtelier(
  supabase: SupabaseClient,
  id: string,
  rang: number | null,
  maintenant: Date
): Promise<{ absent: true } | { absent: false; bat: BatAtelier | null }> {
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("id, organisation, evenement, etat, cloture_le, nb_propositions_couverture, tirage, token_responsable, archive_le")
    .eq("id", id)
    .maybeSingle<EditionLigne>();
  if (error) {
    if (tableAbsente(error.code)) return { absent: true };
    echec("lecture de l'édition (BAT)", error);
  }
  if (!edition) return { absent: false, bat: null };

  const { data: mags, error: errMags } = await supabase
    .from("collectif_magazines")
    .select("id, rang, nom, bat_valide_le, couverture_choisie_id, couverture_sans_preference, couverture_note")
    .eq("edition_id", id)
    .order("rang", { ascending: true });
  if (errMags) echec("magazines (BAT)", errMags);
  const brutes = (mags ?? []) as Pick<MagazineLigne, "id" | "rang" | "nom" | "bat_valide_le" | "couverture_choisie_id" | "couverture_sans_preference" | "couverture_note">[];
  const choisie = brutes.find((m) => m.rang === rang) ?? brutes[0] ?? null;

  const base = {
    edition,
    etat: etatEffectif(edition.etat, edition.cloture_le, maintenant),
  };
  if (!choisie) return { absent: false, bat: { ...base, magazines: [], magazine: null, tours: [], brouillon: null, couvertures: [], couverturesModifiables: false, notes: [] } };

  const lus = await toursDuMagazine(supabase, choisie.id);
  if (!lus.ok) throw new Error(`[collectif] tours (BAT) : ${lus.code}`);
  const premierId = lus.valeur[0]?.id ?? null;
  const couv = await couverturesDesTours(supabase, premierId ? [premierId] : []);
  if (!couv.ok) throw new Error(`[collectif] couvertures (BAT) : ${couv.code}`);
  const rangChoisi = couv.valeur.find((c) => c.id === choisie.couverture_choisie_id)?.rang ?? null;

  const versMagazine = (m: (typeof brutes)[number]): MagazineBatAtelier => ({
    id: m.id,
    rang: m.rang,
    nom: m.nom,
    bat_valide_le: m.bat_valide_le,
    couverture:
      m.id !== choisie.id
        ? ""
        : m.couverture_sans_preference
          ? "Sans préférence : l'atelier choisit"
          : rangChoisi
            ? `Proposition ${rangChoisi} choisie`
            : "Pas encore choisie",
    couverture_note: m.couverture_note,
  });

  const tours: TourAtelier[] = await Promise.all(
    lus.valeur.map(async (t) => {
      const precedent = precedentDe(lus.valeur, t.numero);
      return {
        id: t.id,
        numero: t.numero,
        publie: Boolean(t.publie_le),
        publieTexte: formaterInstantParis(t.publie_le),
        echeanceLocal: versChampParis(t.echeance_retours),
        echeanceTexte: formaterInstantParis(t.echeance_retours),
        nbPages: t.nb_pages,
        pdf: Boolean(t.pdf_key),
        pages: await Promise.all(
          (t.pages ?? []).map(async (p) => ({
            index: p.index,
            vignette: await signer(p.vignette_key ?? p.image_key),
            apparie_a: p.apparie_a,
            zones: p.zones?.length ?? 0,
          }))
        ),
        resume: t.pages?.length ? resumeTour(t.pages, precedent ? precedent.pages.length : null) : null,
        precedent: precedent?.numero ?? null,
      };
    })
  );

  /* Les notes ENVOYÉES : un brouillon du client n'est pas encore pour nous. */
  const ids = lus.valeur.filter((t) => t.publie_le).map((t) => t.id);
  const { data: notes, error: errNotes } = ids.length
    ? await supabase
        .from("collectif_notes")
        .select("id, tour_id, page_index, type, contenu, envoyee_le, resolue_le, reponse_atelier, retiree_le, created_at")
        .in("tour_id", ids)
        .is("retiree_le", null)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (errNotes) echec("notes (BAT)", errNotes);
  const toutes = (notes ?? []) as Pick<NoteLigne, "id" | "tour_id" | "page_index" | "type" | "contenu" | "envoyee_le" | "resolue_le" | "reponse_atelier" | "created_at">[];
  const numeroTour = new Map(lus.valeur.map((t) => [t.id, t.numero]));
  const photosVoulues = toutes
    .filter((n) => n.envoyee_le && n.type === "photo" && typeof n.contenu?.photo === "string" && estUuid(n.contenu.photo))
    .map((n) => n.contenu.photo as string);
  const vignettesPhotos = new Map<string, string | null>();
  if (photosVoulues.length) {
    const { data: ph } = await supabase
      .from("collectif_photos")
      .select("id, vignette_key, r2_key")
      .eq("edition_id", id)
      .in("id", photosVoulues);
    for (const x of (ph ?? []) as { id: string; vignette_key: string | null; r2_key: string }[]) {
      vignettesPhotos.set(x.id, await signer(x.vignette_key ?? x.r2_key));
    }
  }
  const notesAtelier: NoteAtelier[] = toutes
    .map((n, k) => ({ n, numero: k + 1 }))
    .filter(({ n }) => n.envoyee_le)
    .map(({ n, numero }) => ({
      id: n.id,
      numero,
      tour: numeroTour.get(n.tour_id) ?? 0,
      page: n.page_index,
      type: n.type,
      resume: resumeNote(n.type, n.contenu ?? {}),
      photo: typeof n.contenu?.photo === "string" ? vignettesPhotos.get(n.contenu.photo) ?? null : null,
      envoyeeTexte: formaterInstantParis(n.envoyee_le),
      resolue: Boolean(n.resolue_le),
      reponse: n.reponse_atelier,
    }));

  const couvertures: CouvertureAtelier[] = await Promise.all(
    couv.valeur.map(async (c) => ({
      rang: c.rang,
      legende: c.legende ?? "",
      c1: await signer(c.image_key),
      c2: await signer(c.interieur2_key),
      c3: await signer(c.interieur3_key),
    }))
  );
  const brouillon = tours.find((t) => !t.publie) ?? null;
  return {
    absent: false,
    bat: {
      ...base,
      magazines: brutes.map(versMagazine),
      magazine: versMagazine(choisie),
      tours,
      brouillon,
      couvertures,
      couverturesModifiables: Boolean(brouillon && !tours.some((t) => t.publie)),
      notes: notesAtelier,
    },
  };
}

/**
 * Les contenus d'une édition, le plus récent d'abord, avec `remplace_le`
 * (migration 20261016) ; repli sans la colonne tant qu'elle n'est pas passée.
 */
async function lireContenusFiche(supabase: SupabaseClient, id: string) {
  const colonnes = "id, type, r2_key, nom_origine, reponses, recu_le, depose_par";
  const avec = await supabase.from("collectif_contenus").select(`${colonnes}, remplace_le`).eq("edition_id", id).order("recu_le", { ascending: false }).limit(100);
  if (!avec.error || !colonneAbsente(avec.error.code)) return avec;
  return supabase.from("collectif_contenus").select(colonnes).eq("edition_id", id).order("recu_le", { ascending: false }).limit(100);
}

/**
 * Les magazines d'une édition avec leur brief, colonnes de D24 comprises
 * (migration 20261017) ; repli sans elles tant qu'elle n'est pas passée.
 */
async function lireMagazinesFiche(supabase: SupabaseClient, id: string) {
  const colonnes = "id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le, bat_valide_le";
  const lire = (c: string) =>
    supabase.from("collectif_magazines").select(c).eq("edition_id", id).order("rang", { ascending: true }).returns<(MagazineLigne & BriefLigne)[]>();
  const avec = await lire(`${colonnes}, palette_style_id, typo_style_id, doubles_aimes`);
  if (!avec.error || !colonneAbsente(avec.error.code)) return avec;
  return lire(colonnes);
}
