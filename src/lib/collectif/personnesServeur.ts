/**
 * Les personnes d'une édition, côté base (migration 20261023). Module À
 * EFFETS (Supabase, service key) : serveur uniquement. Les règles sont dans
 * `personnes.ts` (pur, au harnais) ; ici, les lectures et les écritures.
 *
 * Ne lève jamais : chaque fonction rend une issue que la route LIT
 * (`absente` : la migration manque, la route répond 503
 * `migration_personnes_absente` ; `erreur` : 500).
 *
 * ⚠️ Toute écriture se journalise dans `collectif_evenements` (`journaliser`) ;
 * jamais l'adresse en clair au journal (`adresseMasquee`).
 * ⚠️ Le nom d'une personne VIT sur ses photos (`collectif_photos.deposant`) :
 * c'est ce que lisent la grille, les dossiers, le lot et le résumé. Renommer
 * ou fusionner réécrit donc ses photos, toutes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { adresseMasquee } from "./appareil";
import { deParticipant, clePersonne } from "./dossiers";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "./horsCorbeille";
import { journaliser, journaliserId } from "./journal";
import { enPaquets, lireToutesLesLignes, listeIn } from "./lignes";
import { personnesAbsentes, tableAbsente } from "./migration";
import {
  COLONNES_PARTICIPANT,
  decouperNom,
  EVT_FUSION,
  EVT_FUSION_DEFAITE,
  EVT_FUSION_INTERROMPUE,
  EVT_NOM_DIFFERENT,
  EVT_PRESENTE,
  EVT_RENOMME,
  EVT_RETROUVE,
  FUSIONS_MAX,
  grouperAvantFusion,
  lireFusionJournal,
  listerPersonnes,
  nomAffiche,
  nomDifferent,
  nomsProposes,
  proposerFusions,
  ecrireRefPersonne,
  type EvenementNom,
  type FusionJournal,
  type FusionProposee,
  type Identite,
  type LigneParticipant,
  type LigneResumePersonne,
  type Personne,
  type RefPersonne,
  type VueEmail,
} from "./personnes";
import { COLONNES_RESUME_PERSONNES, COLONNES_RESUME, resumeAbsent, VUE_RESUME } from "./resumePhotos";

/** Ce qui n'a pas marché : la migration manque, ou la base a refusé. */
export type Panne = { statut: "absente" } | { statut: "erreur"; code?: string };
export type Issue<T> = { statut: "ok"; valeur: T } | Panne;

type ErreurBase = { code?: string; message?: string } | null;

const echec = (error: ErreurBase): Panne => (personnesAbsentes(error) ? { statut: "absente" } : { statut: "erreur", code: error?.code });

/* ─────────────────────────── retrouver une personne ─────────────────────────── */

/** Suivre les fusions jusqu'à la personne qui reste (au plus `FUSIONS_MAX` lectures). */
async function auBout(supabase: SupabaseClient, editionId: string, depart: LigneParticipant): Promise<Issue<LigneParticipant>> {
  let p = depart;
  const vus = new Set<string>();
  for (let i = 0; i <= FUSIONS_MAX; i++) {
    if (!p.fusionne_dans) return { statut: "ok", valeur: p };
    if (vus.has(p.id)) break;
    vus.add(p.id);
    const { data, error } = await supabase
      .from("collectif_participants")
      .select(COLONNES_PARTICIPANT)
      .eq("edition_id", editionId)
      .eq("id", p.fusionne_dans)
      .maybeSingle<LigneParticipant>();
    if (error) return echec(error);
    if (!data) break;
    p = data;
  }
  console.error("[collectif] personnes : chaîne de fusions illisible", editionId, depart.id);
  return { statut: "erreur", code: "fusions" };
}

/** La personne de cette adresse dans l'édition (au bout de ses fusions), ou `null`. */
export async function trouverParEmail(supabase: SupabaseClient, editionId: string, email: string): Promise<Issue<LigneParticipant | null>> {
  const { data, error } = await supabase
    .from("collectif_participants")
    .select(COLONNES_PARTICIPANT)
    .eq("edition_id", editionId)
    .eq("email", email)
    .maybeSingle<LigneParticipant>();
  if (error) return echec(error);
  if (!data) return { statut: "ok", valeur: null };
  return auBout(supabase, editionId, data);
}

/** Une personne par son id (au bout de ses fusions), ou `null`. */
export async function trouverParId(supabase: SupabaseClient, editionId: string, id: string): Promise<Issue<LigneParticipant | null>> {
  const { data, error } = await supabase
    .from("collectif_participants")
    .select(COLONNES_PARTICIPANT)
    .eq("edition_id", editionId)
    .eq("id", id)
    .maybeSingle<LigneParticipant>();
  if (error) return echec(error);
  if (!data) return { statut: "ok", valeur: null };
  return auBout(supabase, editionId, data);
}

/**
 * La personne pour qui CE téléphone parle dans l'édition (la ligne posée par
 * « se présenter »), au bout de ses fusions ; `null` si aucune. Sans la
 * migration : `absente` (l'appelant reste à la règle d'avant, par téléphone).
 */
export async function participantDeLAppareil(supabase: SupabaseClient, editionId: string, appareil: string): Promise<Issue<LigneParticipant | null>> {
  const { data, error } = await supabase
    .from("collectif_participants_appareils")
    .select("participant_id")
    .eq("edition_id", editionId)
    .eq("appareil_id", appareil)
    .maybeSingle<{ participant_id: string }>();
  if (error) return echec(error);
  if (!data) return { statut: "ok", valeur: null };
  return trouverParId(supabase, editionId, data.participant_id);
}

/* ─────────────────────────── se présenter ─────────────────────────── */

export type Presentation =
  | { statut: "connu"; participant: LigneParticipant; nomIgnore: boolean; journal: boolean }
  | { statut: "cree"; participant: LigneParticipant; journal: boolean }
  /** L'adresse n'est pas connue et la page n'a pas encore donné prénom et nom : rien n'est écrit. */
  | { statut: "inconnu" }
  | { statut: "absente" }
  | { statut: "erreur"; code?: string };

/**
 * Se présenter sur un lien de dépôt : l'adresse connue retrouve sa personne
 * (le nom envoyé est IGNORÉ : le participant ne se renomme pas), inconnue elle
 * en crée une si prénom et nom sont là ET que `peutCreer` (ni avant
 * l'ouverture, ni après la clôture). Puis CE téléphone parle pour elle
 * (`collectif_participants_appareils`, une ligne par téléphone et par
 * édition : un téléphone déjà tenu par quelqu'un d'autre change de personne,
 * les photos restent à la leur).
 *
 * Audit du 20/10 (S5, C4) : une adresse CONNUE se journalise à chaque
 * présentation (`participant_retrouve`, adresse masquée, ni token ni
 * téléphone) et, si le nom tapé n'est pas le sien, `participant_nom_different`
 * avec les deux noms : la liste des personnes le montre au responsable
 * (`nomPropose`), qui peut corriger. `nomIgnore` vaut dès qu'un nom est tapé,
 * qu'il soit le bon ou non : comparer et le dire rendrait un oracle du nom de
 * famille, lettre à lettre (S1).
 */
export async function presenter(
  supabase: SupabaseClient,
  p: { editionId: string; email: string; identite: Identite | null; provenanceId: string | null; appareil: string; peutCreer?: boolean }
): Promise<Presentation> {
  const lue = await trouverParEmail(supabase, p.editionId, p.email);
  if (lue.statut !== "ok") return lue;
  let participant = lue.valeur;
  let cree = false;
  if (!participant) {
    if (!p.identite || p.peutCreer === false) return { statut: "inconnu" };
    const { data, error } = await supabase
      .from("collectif_participants")
      .insert({ edition_id: p.editionId, email: p.email, prenom: p.identite.prenom, nom: p.identite.nom, premier_lien_id: p.provenanceId })
      .select(COLONNES_PARTICIPANT)
      .single<LigneParticipant>();
    if (error && error.code === "23505") {
      /* Deux téléphones de la même personne au même instant : l'autre a écrit, on le relit. */
      const relue = await trouverParEmail(supabase, p.editionId, p.email);
      if (relue.statut !== "ok") return relue;
      if (!relue.valeur) return { statut: "erreur", code: "23505" };
      participant = relue.valeur;
    } else if (error || !data) {
      if (error && !personnesAbsentes(error)) console.error("[collectif] personne non écrite", error.code, error.message);
      return echec(error);
    } else {
      participant = data;
      cree = true;
    }
  }
  const maintenant = new Date().toISOString();
  const { error: errTel } = await supabase
    .from("collectif_participants_appareils")
    .upsert({ edition_id: p.editionId, appareil_id: p.appareil, participant_id: participant.id, vu_le: maintenant }, { onConflict: "edition_id,appareil_id" });
  if (errTel) {
    if (!personnesAbsentes(errTel)) console.error("[collectif] téléphone de la personne non écrit", errTel.code, errTel.message);
    return echec(errTel);
  }
  if (!cree) {
    /* La dernière visite : un repère pour l'atelier, jamais un refus si elle ne s'écrit pas. */
    const { error } = await supabase.from("collectif_participants").update({ vu_le: maintenant }).eq("id", participant.id);
    if (error) console.error("[collectif] visite de la personne non notée", error.code);
    const personne = ecrireRefPersonne({ genre: "participant", id: participant.id });
    const a = adresseMasquee(participant.email);
    const autreNom = p.identite !== null && nomDifferent(p.identite, participant);
    const [retrouve, different] = await Promise.all([
      journaliser(supabase, { editionId: p.editionId }, EVT_RETROUVE, { personne, prenom: participant.prenom, lien: p.provenanceId, a }, null),
      autreNom && p.identite
        ? journaliser(supabase, { editionId: p.editionId }, EVT_NOM_DIFFERENT, { personne, a, nom: nomAffiche(participant), propose: nomAffiche(p.identite), lien: p.provenanceId }, null)
        : Promise.resolve(true),
    ]);
    return { statut: "connu", participant, nomIgnore: p.identite !== null, journal: retrouve && different };
  }
  const journal = await journaliser(
    supabase,
    { editionId: p.editionId },
    EVT_PRESENTE,
    { personne: ecrireRefPersonne({ genre: "participant", id: participant.id }), prenom: participant.prenom, lien: p.provenanceId, a: adresseMasquee(participant.email) },
    null
  );
  return { statut: "cree", participant, journal };
}

/** « Ce n'est pas toi ? » : ce téléphone ne parle plus pour personne dans l'édition. Ses photos restent à leur personne. */
export async function oublierAppareil(supabase: SupabaseClient, editionId: string, appareil: string): Promise<Issue<number>> {
  const { data, error } = await supabase
    .from("collectif_participants_appareils")
    .delete()
    .eq("edition_id", editionId)
    .eq("appareil_id", appareil)
    .select("participant_id");
  if (error) return echec(error);
  const n = (data ?? []).length;
  if (n) await journaliser(supabase, { editionId }, "telephone_oublie", { n }, null);
  return { statut: "ok", valeur: n };
}

/* ─────────────────────────── ce qu'une personne a envoyé ─────────────────────────── */

export type ComptesPersonne = {
  /** Ses photos arrivées dans l'édition, hors corbeille (tous ses téléphones). */
  photos: number;
  /** Celles envoyées depuis CE téléphone (et à elle, ou sans personne). */
  ceTelephone: number;
  /** La dernière version d'accord donnée depuis ce téléphone pour cette personne (« redemandé sur chaque nouveau téléphone »). */
  accord: string | null;
};

/** Trois lectures légères (deux comptes `head`, une ligne). `null` : base illisible. */
export async function comptesDeLaPersonne(supabase: SupabaseClient, editionId: string, participantId: string | null, appareil: string | null): Promise<ComptesPersonne | null> {
  type Compte = { count: number | null; error: ErreurBase };
  const rien: Compte = { count: 0, error: null };
  const lus = await lireHorsCorbeille(async (avec) => {
    const compter = async (filtres: { participant?: string; appareil?: string; participantOuRien?: string }): Promise<Compte> => {
      /* GET `limit(0)`, jamais `head` : un HEAD filtré rend une erreur sans code (horsCorbeille.ts). */
      let q = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", editionId).not("confirmee_le", "is", null);
      if (avec) q = q.is("supprimee_le", null);
      if (filtres.participant) q = q.eq("participant_id", filtres.participant);
      if (filtres.appareil) q = q.eq("appareil_id", filtres.appareil);
      if (filtres.participantOuRien) q = q.or(`participant_id.is.null,participant_id.eq.${filtres.participantOuRien}`);
      if (!filtres.participant) q = q.eq("role_deposant", "participant");
      const { count, error } = await q.limit(0);
      return { count, error };
    };
    const derniereVersion = async (): Promise<{ version: string | null; error: ErreurBase }> => {
      if (!appareil) return { version: null, error: null };
      let q = supabase.from("collectif_photos").select("accord_version").eq("edition_id", editionId).eq("appareil_id", appareil).not("accord_version", "is", null);
      if (participantId && avec) q = q.eq("participant_id", participantId);
      const { data, error } = await q.order("created_at", { ascending: false }).limit(1).returns<{ accord_version: string | null }[]>();
      return { version: data?.[0]?.accord_version ?? null, error };
    };
    const [siennes, ici, accord] = await Promise.all([
      participantId && avec ? compter({ participant: participantId }) : appareil ? compter({ appareil }) : Promise.resolve(rien),
      appareil ? compter({ appareil, ...(participantId && avec ? { participantOuRien: participantId } : {}) }) : Promise.resolve(rien),
      derniereVersion(),
    ]);
    return { siennes, ici, accord, error: siennes.error ?? ici.error ?? accord.error ?? null };
  });
  if (lus.error) {
    console.error("[collectif] photos de la personne illisibles", lus.error.code, lus.error.message);
    return null;
  }
  return { photos: lus.siennes.count ?? 0, ceTelephone: lus.ici.count ?? 0, accord: lus.accord.version };
}

/* ─────────────────────────── la liste ─────────────────────────── */

export type ListePersonnes = { personnes: Personne[]; proposees: FusionProposee[]; avecAdresses: boolean };

/**
 * Les personnes de l'édition, avec ce que la vue de résumé sait d'elles. Sans
 * la migration 20261023 : les personnes d'avant seulement (par nom), lues sur
 * la vue d'avant ou, sans elle, sur toutes les photos (`avecAdresses: false`).
 */
export async function chargerPersonnes(supabase: SupabaseClient, editionId: string, vue: VueEmail): Promise<Issue<ListePersonnes>> {
  type LigneVue = LigneResumePersonne & { id: string };
  const lireVue = (colonnes: string) =>
    lireToutesLesLignes<LigneVue>(() => supabase.from(VUE_RESUME).select(colonnes).eq("edition_id", editionId).returns<LigneVue[]>(), { colonne: "id", croissant: true }, "résumé des personnes");
  let resume = await lireVue(COLONNES_RESUME_PERSONNES);
  let avecAdresses = true;
  if (resume.error && personnesAbsentes(resume.error)) {
    avecAdresses = false;
    resume = await lireVue(COLONNES_RESUME);
  }
  let lignes: LigneResumePersonne[];
  if (!resume.error) lignes = resume.data;
  else if (resumeAbsent(resume.error.code)) {
    /* Ni la vue : les photos de participant, en colonnes légères (le cas d'avant 20261022). */
    type L = LigneResumePersonne & { confirmee_le: string };
    const photos = await lireHorsCorbeille((avec) =>
      lireToutesLesLignes<L>(
        () => {
          const q = supabase
            .from("collectif_photos")
            .select(avec ? "role_deposant, provenance_id, deposant, appareil_id, participant_id, confirmee_le" : "role_deposant, provenance_id, deposant, appareil_id, confirmee_le")
            .eq("edition_id", editionId)
            .not("confirmee_le", "is", null);
          return (avec ? q.is("supprimee_le", null) : q).returns<L[]>();
        },
        { colonne: "confirmee_le", croissant: true },
        "photos des personnes"
      )
    );
    if (photos.error) return echec(photos.error);
    avecAdresses = avecAdresses && photos.avec;
    lignes = (photos.data ?? []).map((p) => ({ ...p, n: 1, derniere: p.confirmee_le }));
  } else return echec(resume.error);

  let participants: LigneParticipant[] = [];
  const telephones = new Map<string, number>();
  let autresNoms: EvenementNom[] = [];
  if (avecAdresses) {
    const [lus, tels, noms] = await Promise.all([
      lireToutesLesLignes<LigneParticipant>(
        () => supabase.from("collectif_participants").select(COLONNES_PARTICIPANT).eq("edition_id", editionId).returns<LigneParticipant[]>(),
        { colonne: "created_at", croissant: true },
        "personnes de l'édition"
      ),
      lireToutesLesLignes<{ participant_id: string; appareil_id: string }>(
        () => supabase.from("collectif_participants_appareils").select("participant_id, appareil_id").eq("edition_id", editionId).returns<{ participant_id: string; appareil_id: string }[]>(),
        { colonne: "created_at", croissant: true, departage: "appareil_id" },
        "téléphones des personnes"
      ),
      /* Les autres noms tapés avec une adresse connue (S5, C4) : seulement pour qui voit l'adresse. Les
         plus récents d'abord ; 500 suffisent (le dernier par personne compte). */
      vue === "aucun"
        ? Promise.resolve({ data: [] as EvenementNom[], error: null })
        : supabase
            .from("collectif_evenements")
            .select("type, payload, created_at")
            .eq("edition_id", editionId)
            .eq("type", EVT_NOM_DIFFERENT)
            .order("created_at", { ascending: false })
            .limit(PROPOSES_LUS)
            .returns<EvenementNom[]>(),
    ]);
    if (lus.error) return echec(lus.error);
    if (tels.error) return echec(tels.error);
    participants = lus.data;
    for (const t of tels.data) telephones.set(t.participant_id, (telephones.get(t.participant_id) ?? 0) + 1);
    /* Un journal illisible ne cache pas la liste : les noms proposés manquent, et on le dit en console. */
    if (noms.error) console.error("[collectif] autres noms des personnes illisibles", noms.error.code);
    else autresNoms = noms.data ?? [];
  }
  const personnes = listerPersonnes(participants, lignes, telephones, avecAdresses ? vue : "aucun", nomsProposes(autresNoms, participants));
  return { statut: "ok", valeur: { personnes, proposees: proposerFusions(personnes), avecAdresses } };
}

/** Combien de `participant_nom_different` la liste relit au plus (les plus récents). */
export const PROPOSES_LUS = 500;

/* ─────────────────────────── renommer ─────────────────────────── */

export type Changement = { statut: "ok"; n: number; journal: boolean; nom: string } | { statut: "introuvable" } | { statut: "refuse"; message: string } | { statut: "absente" } | { statut: "erreur"; code?: string };

/** Les variantes EXACTES d'un nom d'avant (« Léa », « léa ») parmi les photos de participant sans personne : un `in` sûr. */
async function graphiesDuNom(supabase: SupabaseClient, editionId: string, cle: string): Promise<Issue<string[]>> {
  const lu = await lireToutesLesLignes<{ id: string; deposant: string | null; role_deposant: string; provenance_id: string | null; participant_id?: string | null }>(
    () =>
      supabase
        .from(VUE_RESUME)
        .select("id, deposant, role_deposant, provenance_id, participant_id")
        .eq("edition_id", editionId)
        .is("participant_id", null)
        .returns<{ id: string; deposant: string | null; role_deposant: string; provenance_id: string | null; participant_id?: string | null }[]>(),
    { colonne: "id", croissant: true },
    "noms d'une personne"
  );
  if (lu.error) return echec(lu.error);
  const graphies = new Set<string>();
  for (const g of lu.data) if (deParticipant(g) && g.deposant !== null && clePersonne(g.deposant) === cle) graphies.add(g.deposant);
  return { statut: "ok", valeur: [...graphies] };
}

/** Les photos d'une personne (ses ids, ce qu'elles portent), toutes, corbeille comprise : un renommage ou une fusion les emmène toutes. */
async function photosDe(supabase: SupabaseClient, editionId: string, ref: RefPersonne): Promise<Issue<{ id: string; deposant: string | null; participant_id: string | null }[]>> {
  type L = { id: string; deposant: string | null; participant_id: string | null; role_deposant: string; provenance_id: string | null; created_at: string };
  if (ref.genre === "participant") {
    const lu = await lireToutesLesLignes<L>(
      () => supabase.from("collectif_photos").select("id, deposant, participant_id, role_deposant, provenance_id, created_at").eq("edition_id", editionId).eq("participant_id", ref.id).returns<L[]>(),
      { colonne: "created_at", croissant: true },
      "photos d'une personne"
    );
    if (lu.error) return echec(lu.error);
    return { statut: "ok", valeur: lu.data };
  }
  const graphies = await graphiesDuNom(supabase, editionId, ref.cle);
  if (graphies.statut !== "ok") return graphies;
  const toutes: L[] = [];
  for (const paquet of enPaquets(graphies.valeur)) {
    /* ⚠️ Un nom vient d'un PARTICIPANT, tel qu'il l'a tapé : cité par `listeIn` (S8), jamais par `.in()`.
       `Zed","Léa Martin` y partait en deux valeurs et renommait aussi Léa Martin ; `"Bob"` y perdait ses guillemets. */
    const lu = await lireToutesLesLignes<L>(
      () =>
        supabase
          .from("collectif_photos")
          .select("id, deposant, participant_id, role_deposant, provenance_id, created_at")
          .eq("edition_id", editionId)
          .is("participant_id", null)
          .filter("deposant", "in", listeIn(paquet))
          .returns<L[]>(),
      { colonne: "created_at", croissant: true },
      "photos d'un nom"
    );
    if (lu.error) return echec(lu.error);
    toutes.push(...lu.data.filter((p) => deParticipant(p)));
  }
  return { statut: "ok", valeur: toutes };
}

/** Réécrire des photos (par paquets d'ids de l'édition). Rend le nombre écrit, ou l'erreur. */
async function reecrire(supabase: SupabaseClient, editionId: string, ids: readonly string[], patch: Record<string, unknown>): Promise<Issue<number>> {
  let n = 0;
  for (const paquet of enPaquets(ids)) {
    const { error, count } = await supabase.from("collectif_photos").update(patch, { count: "exact" }).eq("edition_id", editionId).in("id", paquet);
    if (error) return echec(error);
    n += count ?? paquet.length;
  }
  return { statut: "ok", valeur: n };
}

/**
 * Renommer une personne (le responsable ou l'atelier, jamais le participant) :
 * la personne, puis TOUTES ses photos (corbeille comprise : une photo
 * restaurée revient sous le bon nom). Une personne d'avant (un nom seul)
 * n'a pas de ligne : ses photos changent de nom. Journal `personne_renommee`.
 */
export async function renommerPersonne(supabase: SupabaseClient, editionId: string, ref: RefPersonne, identite: Identite, qui: string | null): Promise<Changement> {
  const nom = nomAffiche(identite);
  let avant: string | null = null;
  if (ref.genre === "participant") {
    const lu = await trouverParId(supabase, editionId, ref.id);
    if (lu.statut !== "ok") return lu;
    if (!lu.valeur || lu.valeur.id !== ref.id) return { statut: "introuvable" };
    avant = nomAffiche(lu.valeur);
    const { error } = await supabase
      .from("collectif_participants")
      .update({ prenom: identite.prenom, nom: identite.nom, renomme_le: new Date().toISOString() })
      .eq("edition_id", editionId)
      .eq("id", ref.id);
    if (error) return echec(error);
  }
  const photos = await photosDe(supabase, editionId, ref);
  if (photos.statut !== "ok") return photos;
  if (ref.genre === "nom") {
    if (!photos.valeur.length) return { statut: "introuvable" };
    avant = photos.valeur[0].deposant;
  }
  const ecrit = await reecrire(
    supabase,
    editionId,
    photos.valeur.filter((p) => p.deposant !== nom).map((p) => p.id),
    { deposant: nom }
  );
  if (ecrit.statut !== "ok") return ecrit;
  const journal = await journaliser(supabase, { editionId }, EVT_RENOMME, { personne: ecrireRefPersonne(ref), avant, apres: nom, n: ecrit.valeur }, qui);
  return { statut: "ok", n: ecrit.valeur, journal, nom };
}

/* ─────────────────────────── fusionner, et défaire ─────────────────────────── */

/** Le nom d'une personne (une ligne de la table, ou le nom d'avant le plus porté par ses photos). */
function nomDeLaPersonne(ligne: LigneParticipant | null, photos: readonly { deposant: string | null }[]): string | null {
  if (ligne) return nomAffiche(ligne);
  const compte = new Map<string, number>();
  for (const p of photos) if (p.deposant) compte.set(p.deposant, (compte.get(p.deposant) ?? 0) + 1);
  return [...compte].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * Fusionner : les photos de `part` vont chez `reste`, sous le nom gardé
 * (`nomDe`, planche 4B). La personne absorbée (si elle a une adresse) garde sa
 * ligne et pointe vers celle qui reste (`fusionne_dans`) : taper son adresse
 * retrouve la bonne personne. Le journal (`personnes_fusionnees`) garde CHAQUE
 * photo réécrite et ce qu'elle portait avant (`grouperAvantFusion`) : c'est ce
 * qui permet à l'atelier de défaire. Jamais fait d'office : seule la route le
 * demande, sur un geste du responsable ou de l'atelier.
 */
export async function fusionnerPersonnes(
  supabase: SupabaseClient,
  editionId: string,
  plan: { reste: RefPersonne; part: RefPersonne; nomDe: "reste" | "part" },
  qui: string | null
): Promise<Changement & { evenement?: string }> {
  const lire = async (r: RefPersonne): Promise<Issue<LigneParticipant | null>> => {
    if (r.genre !== "participant") return { statut: "ok", valeur: null };
    const lu = await trouverParId(supabase, editionId, r.id);
    if (lu.statut !== "ok") return lu;
    /* Une personne déjà fusionnée ailleurs ne se fusionne plus : on fusionne celle qui reste. */
    return lu.valeur && lu.valeur.id === r.id ? lu : { statut: "ok", valeur: null };
  };
  const [ligneReste, lignePart] = await Promise.all([lire(plan.reste), lire(plan.part)]);
  if (ligneReste.statut !== "ok") return ligneReste;
  if (lignePart.statut !== "ok") return lignePart;
  if ((plan.reste.genre === "participant" && !ligneReste.valeur) || (plan.part.genre === "participant" && !lignePart.valeur)) return { statut: "introuvable" };

  const [photosReste, photosPart] = await Promise.all([photosDe(supabase, editionId, plan.reste), photosDe(supabase, editionId, plan.part)]);
  if (photosReste.statut !== "ok") return photosReste;
  if (photosPart.statut !== "ok") return photosPart;
  if (plan.part.genre === "nom" && !photosPart.valeur.length) return { statut: "introuvable" };
  if (plan.reste.genre === "nom" && !photosReste.valeur.length) return { statut: "introuvable" };

  const nomReste = nomDeLaPersonne(ligneReste.valeur, photosReste.valeur);
  const nomPart = nomDeLaPersonne(lignePart.valeur, photosPart.valeur);
  const nomApres = (plan.nomDe === "reste" ? nomReste : nomPart) ?? nomReste ?? nomPart;
  if (!nomApres) return { statut: "refuse", message: "Aucun nom à garder." };

  /* La personne qui reste a une adresse et prend le nom de l'autre : il lui faut un prénom ET un nom. */
  let renommage: Identite | null = null;
  if (ligneReste.valeur && plan.nomDe === "part") {
    renommage = lignePart.valeur ? { prenom: lignePart.valeur.prenom, nom: lignePart.valeur.nom } : decouperNom(nomApres);
    if (!renommage) return { statut: "refuse", message: `« ${nomApres} » n'a pas de nom de famille : garder l'autre nom, puis renommer.` };
  }

  /* Ce qui change : les photos de celle qui part (personne et nom), et celles de celle qui reste dont le nom change. */
  const idReste = ligneReste.valeur?.id ?? null;
  const aReecrire = [
    ...photosPart.valeur.filter((p) => p.deposant !== nomApres || p.participant_id !== idReste),
    ...photosReste.valeur.filter((p) => p.deposant !== nomApres),
  ];
  const journalPhotos = grouperAvantFusion(aReecrire);

  /* S9 (audit du 20/10) : le JOURNAL D'ABORD, avec l'état d'avant de chaque photo et du nom de la
     personne qui reste. Sans lui, rien n'est écrit : une fusion que l'on ne saurait pas défaire ne
     se fait pas. Une panne au milieu des écritures laisse un journal complet, que « défaire » rejoue
     (`defaireFusion` remet chaque photo telle que le journal la décrit, déjà réécrite ou non). */
  const payload: FusionJournal & { nomAvant: string | null; nomPart: string | null } = {
    reste: ecrireRefPersonne(plan.reste),
    part: ecrireRefPersonne(plan.part),
    resteAvant: renommage && ligneReste.valeur ? { prenom: ligneReste.valeur.prenom, nom: ligneReste.valeur.nom } : null,
    nomApres,
    photos: journalPhotos,
    n: aReecrire.length,
    nomAvant: nomReste,
    nomPart,
  };
  const evenement = await journaliserId(supabase, { editionId }, EVT_FUSION, payload, qui);
  if (!evenement) return { statut: "erreur", code: "journal" };

  /* L'ordre : la personne qui reste (son nom), puis les photos, puis la personne qui part (`fusionne_dans`).
     Une panne au milieu laisse des photos à réécrire, jamais une personne qui pointe vers un nom qui ne la
     porte pas ; elle se dit au journal (`fusion_interrompue`) et l'atelier la défait. */
  const interrompre = async (panne: Panne): Promise<Panne & { evenement: string }> => {
    await journaliser(supabase, { editionId }, EVT_FUSION_INTERROMPUE, { evenement }, qui);
    return { ...panne, evenement };
  };
  if (renommage && idReste) {
    const { error } = await supabase.from("collectif_participants").update({ prenom: renommage.prenom, nom: renommage.nom, renomme_le: new Date().toISOString() }).eq("id", idReste);
    if (error) return interrompre(echec(error));
  }
  const ecrit = await reecrire(supabase, editionId, aReecrire.map((p) => p.id), idReste ? { deposant: nomApres, participant_id: idReste } : { deposant: nomApres });
  if (ecrit.statut !== "ok") return interrompre(ecrit);
  if (lignePart.valeur && idReste) {
    const { error } = await supabase.from("collectif_participants").update({ fusionne_dans: idReste, fusionne_le: new Date().toISOString() }).eq("id", lignePart.valeur.id);
    if (error) return interrompre(echec(error));
  }
  return { statut: "ok", n: ecrit.valeur, journal: true, nom: nomApres, evenement };
}

export type FusionLue = {
  evenement: string;
  le: string;
  qui: string | null;
  fusion: FusionJournal;
  nomAvant: string | null;
  nomPart: string | null;
  defaite: boolean;
  /** Une écriture a échoué après le journal (S9) : la fusion est à moitié faite, « défaire » la remet d'aplomb. */
  interrompue: boolean;
};

/** Les fusions de l'édition, la plus récente d'abord, et si elles sont défaites ou interrompues (pour l'atelier). */
export async function lireFusions(supabase: SupabaseClient, editionId: string): Promise<Issue<FusionLue[]>> {
  const { data, error } = await supabase
    .from("collectif_evenements")
    .select("id, type, payload, qui, created_at")
    .eq("edition_id", editionId)
    .in("type", [EVT_FUSION, EVT_FUSION_DEFAITE, EVT_FUSION_INTERROMPUE])
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<{ id: string; type: string; payload: Record<string, unknown>; qui: string | null; created_at: string }[]>();
  if (error) return tableAbsente(error.code) ? { statut: "absente" } : { statut: "erreur", code: error.code };
  const designees = (type: string) => new Set((data ?? []).filter((e) => e.type === type && typeof e.payload?.evenement === "string").map((e) => e.payload.evenement as string));
  const defaites = designees(EVT_FUSION_DEFAITE);
  const interrompues = designees(EVT_FUSION_INTERROMPUE);
  const fusions: FusionLue[] = [];
  for (const e of data ?? []) {
    if (e.type !== EVT_FUSION) continue;
    const fusion = lireFusionJournal(e.payload);
    if (!fusion) continue;
    fusions.push({
      evenement: e.id,
      le: e.created_at,
      qui: e.qui,
      fusion,
      nomAvant: typeof e.payload.nomAvant === "string" ? e.payload.nomAvant : null,
      nomPart: typeof e.payload.nomPart === "string" ? e.payload.nomPart : null,
      defaite: defaites.has(e.id),
      interrompue: interrompues.has(e.id),
    });
  }
  return { statut: "ok", valeur: fusions };
}

/**
 * Défaire une fusion (l'atelier seul) : chaque photo réécrite reprend ce
 * qu'elle portait (personne et nom), la personne absorbée ne pointe plus vers
 * l'autre, celle qui reste retrouve son nom si la fusion l'avait changé.
 * Une photo arrivée APRÈS la fusion reste chez la personne qui reste (elle n'a
 * jamais été à l'autre dans la base). Refusé si déjà défaite.
 */
export async function defaireFusion(supabase: SupabaseClient, editionId: string, evenementId: string, qui: string | null): Promise<Changement> {
  const lues = await lireFusions(supabase, editionId);
  if (lues.statut !== "ok") return lues;
  const f = lues.valeur.find((x) => x.evenement === evenementId);
  if (!f) return { statut: "introuvable" };
  if (f.defaite) return { statut: "refuse", message: "Cette fusion est déjà défaite." };
  const { fusion } = f;
  let n = 0;
  for (const g of fusion.photos) {
    const ecrit = await reecrire(supabase, editionId, g.ids, { deposant: g.deposant, participant_id: g.participant_id });
    if (ecrit.statut !== "ok") return ecrit;
    n += ecrit.valeur;
  }
  const part = fusion.part.startsWith("p:") ? fusion.part.slice(2) : null;
  const reste = fusion.reste.startsWith("p:") ? fusion.reste.slice(2) : null;
  if (part) {
    const { error } = await supabase.from("collectif_participants").update({ fusionne_dans: null, fusionne_le: null }).eq("edition_id", editionId).eq("id", part);
    if (error) return echec(error);
  }
  if (reste && fusion.resteAvant) {
    const { error } = await supabase.from("collectif_participants").update({ prenom: fusion.resteAvant.prenom, nom: fusion.resteAvant.nom, renomme_le: new Date().toISOString() }).eq("edition_id", editionId).eq("id", reste);
    if (error) return echec(error);
    /* Ses photos arrivées après la fusion portent encore le nom d'après : elles reprennent le sien. */
    const lues2 = await photosDe(supabase, editionId, { genre: "participant", id: reste });
    if (lues2.statut !== "ok") return lues2;
    const nomReste = nomAffiche(fusion.resteAvant);
    const ecrit = await reecrire(supabase, editionId, lues2.valeur.filter((p) => p.deposant !== nomReste).map((p) => p.id), { deposant: nomReste });
    if (ecrit.statut !== "ok") return ecrit;
  }
  const journal = await journaliser(supabase, { editionId }, EVT_FUSION_DEFAITE, { evenement: evenementId, reste: fusion.reste, part: fusion.part, n }, qui);
  return { statut: "ok", n, journal, nom: f.nomPart ?? "" };
}
