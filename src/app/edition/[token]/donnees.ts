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
import { signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { chargerAcces } from "@/lib/collectif/acces";
import { compositionDu, styleVisible, stylesDeLaComposition, type BriefLigne } from "@/lib/collectif/brief";
import { colonneAbsente } from "@/lib/collectif/migration";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { libellePlafondLien } from "@/lib/collectif/plafonds";
import { apercuPossible, envoisCourants, type LigneEnvoi } from "@/lib/collectif/contenus";
import { lireDemandes, modeDeLEnvoi, nomDeLEnvoi } from "@/lib/collectif/demandes";
import { lireTailles, srcSetDe } from "@/lib/collectif/styles";
import { arbreDesPhotos, compterPersonnes, plafondDuLien } from "@/lib/collectif/dossiers";
import { COLONNES_RESUME, couvertureDe, enLignesPesees, resumeAbsent, resumerPhotos, somme, VUE_RESUME, type LigneResume } from "@/lib/collectif/resumePhotos";
import { formaterInstantParis, formaterJourParis } from "@/lib/collectif/dates";
import { phraseFichierEfface } from "@/lib/collectif/retention";
import { libelleTypeDocument, nomTelechargement } from "@/lib/collectif/documents";
import { compteAgenda } from "@/lib/collectif/agenda";
import { lireMessages } from "@/lib/collectif/messagerie";
import { lireInterlocuteurs, lireRendezVous } from "@/lib/collectif/rendezvous";
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
  briefValide: boolean;
};

/** Un « dossier » de photos de l'encart Photos : un lien de contribution, les photos du responsable… */
export type DossierPhotos = {
  cle: string;
  libelle: string;
  detail: string;
  n: number;
  lien: boolean;
  /** La vignette de sa dernière photo arrivée, signée une heure (maquettes du 15/10 : une vignette par ligne). */
  couverture: string | null;
};

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
  photos: number;
  participants: number;
  /** Les photos mises dans « Ma sélection » (T-182 : la fenêtre « Terminer la collecte » les compte). */
  selection: number;
  dossiers: DossierPhotos[];
  mosaique: string[];
  liens: LienContribution[];
  contenusRecus: string[];
  /** Les envois COURANTS (une version remplacée n'y est plus), pour revoir, remplacer, ajouter. */
  envois: EnvoiClient[];
  dernierMessage: { texte: string; quand: string } | null;
};

type ProvenanceLue = { id: string; cle: string; type: string; libelle: string | null; sans_plafond: boolean; plafond_par_personne: number | null; created_at: string; retire_le?: string | null };

/**
 * Les liens de contribution d'une édition. Repli tant que la migration de la
 * révision n'est pas passée : sans `plafond_par_personne`, un lien garde la
 * règle de l'édition (`libellePlafondLien`).
 */
export async function lireProvenances(editionId: string): Promise<ProvenanceLue[]> {
  const supabase = makeSupabase();
  /* Le lien supprimé (migration 20261018) d'abord ; sans elle, aucun lien n'est supprimé. */
  const retires = await supabase
    .from("collectif_provenances")
    .select("id, cle, type, libelle, sans_plafond, plafond_par_personne, created_at, retire_le")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true });
  if (!retires.error) return (retires.data ?? []) as ProvenanceLue[];
  if (!colonneAbsente(retires.error.code)) echec("liens de contribution", retires.error);
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

/** Un envoi du client à l'atelier (un fichier, ou les réponses du mot du dirigeant), tel que l'écran le montre. */
export type EnvoiClient = {
  id: string;
  type: string;
  /** « Logo », « Mot du dirigeant »… */
  libelle: string;
  nom: string | null;
  /** « 14 octobre ». */
  recuLe: string;
  /** L'adresse signée du fichier (une heure), pour l'ouvrir. */
  url: string | null;
  /** La même, si c'est une image qui se revoit en aperçu. */
  apercu: string | null;
  /** L'adresse qui TÉLÉCHARGE sous le nom d'origine (la visionneuse, T-152). */
  telecharger: string | null;
  reponses: Record<string, string> | null;
  /** T-159 : « Fichier supprimé le … » quand l'édition est effacée (le nom reste, le fichier non) ; sinon `null`. */
  efface: string | null;
};

/**
 * Les envois COURANTS d'une édition (`envoisCourants`). Repli tant que la
 * migration 20261016 n'est pas passée : sans `remplace_le`, aucun fichier
 * n'est « ancien », tous se montrent.
 *
 * T-191 : un envoi porte le NOM de sa demande (« Le mot du proviseur ») ; celui
 * d'une demande que l'atelier a retirée ne se montre plus au client (il reste
 * à l'atelier).
 */
export async function lireEnvois(edition: Pick<EditionLigne, "id" | "contenus_demandes"> & { photos_supprimees_le?: string | null }): Promise<EnvoiClient[]> {
  const editionId = edition.id;
  /* T-159 : une édition effacée ne signe plus ses envois (les objets sont partis) ; leur nom reste. */
  const efface = phraseFichierEfface(edition.photos_supprimees_le);
  const demandes = lireDemandes(edition.contenus_demandes);
  const supabase = makeSupabase();
  const colonnes = "id, type, r2_key, nom_origine, reponses, recu_le";
  const avec = await supabase.from("collectif_contenus").select(`${colonnes}, remplace_le`).eq("edition_id", editionId).limit(500);
  let lignes: LigneEnvoi[];
  if (!avec.error) lignes = (avec.data ?? []) as LigneEnvoi[];
  else {
    if (!colonneAbsente(avec.error.code)) echec("envois du client", avec.error);
    const sans = await supabase.from("collectif_contenus").select(colonnes).eq("edition_id", editionId).limit(500);
    if (sans.error) echec("envois du client (repli)", sans.error);
    lignes = (sans.data ?? []) as LigneEnvoi[];
  }
  const courants = [...envoisCourants(lignes, (type) => modeDeLEnvoi(type, demandes)).values()].flat();
  return Promise.all(
    courants.map(async (l) => {
      const [url, telecharger] = efface ? [null, null] : await Promise.all([signerOuRien(l.r2_key), signerTelechargement(l.r2_key, l.nom_origine)]);
      return {
        id: l.id,
        type: l.type,
        libelle: nomDeLEnvoi(l.type, demandes) ?? l.type,
        nom: l.nom_origine,
        recuLe: formaterJourParis(l.recu_le),
        url,
        apercu: url && apercuPossible(l.nom_origine) ? url : null,
        telecharger,
        reponses: l.reponses,
        efface: l.r2_key ? efface : null,
      };
    })
  );
}

type LignePhotoTableau = {
  id: string;
  signalee: boolean;
  role_deposant: string;
  appareil_id: string | null;
  provenance_id: string | null;
  provenance_type: string;
  deposant: string | null;
  vignette_key: string | null;
  confirmee_le: string;
  preselection: boolean;
  participant_id?: string | null;
};

const COLONNES_TABLEAU = "id, signalee, role_deposant, appareil_id, provenance_id, provenance_type, deposant, vignette_key, confirmee_le, preselection";

/** Les vignettes de la mosaïque du tableau de bord : les plus récentes arrivées. */
const MOSAIQUE = 6;

/**
 * Les photos du tableau de bord, RÉSUMÉES (T-168) : une ligne par façon
 * d'avoir déposé, qui pèse ses photos. Lues en base (`collectif_photos_resume`,
 * quelques dizaines de lignes) ; sans la migration 20261022, toutes les photos
 * arrivées sont relues (par tranches de 1 000, T-167, de la plus récente à la
 * plus ancienne) et résumées EN MÉMOIRE, exactement comme la vue les résume
 * (`resumerPhotos`, comparé à la lecture d'avant par le harnais).
 */
async function lireResumeTableau(supabase: ReturnType<typeof makeSupabase>, editionId: string): Promise<LigneResume[]> {
  const resume = await lireToutesLesLignes<LigneResume>(
    () => supabase.from(VUE_RESUME).select(COLONNES_RESUME).eq("edition_id", editionId).returns<LigneResume[]>(),
    { colonne: "id", croissant: true },
    "résumé des photos du tableau de bord"
  );
  if (!resume.error) return resume.data;
  if (!resumeAbsent(resume.error.code)) echec("résumé des photos du tableau de bord", resume.error);
  /* Hors corbeille et par personne (migration 20261023, comme la vue) ; sans elle, la lecture d'avant. */
  const photos = await lireHorsCorbeille((avec) =>
    lireToutesLesLignes<LignePhotoTableau>(
      () => {
        const q = supabase
          .from("collectif_photos")
          .select(avec ? `${COLONNES_TABLEAU}, participant_id` : COLONNES_TABLEAU)
          .eq("edition_id", editionId)
          .not("confirmee_le", "is", null);
        return (avec ? q.is("supprimee_le", null) : q).returns<LignePhotoTableau[]>();
      },
      { colonne: "confirmee_le", croissant: false },
      "photos du tableau de bord"
    )
  );
  if (photos.error) echec("photos du tableau de bord", photos.error);
  return resumerPhotos(photos.data ?? []);
}

export async function chargerTableau(edition: EditionLigne, origine = ""): Promise<Tableau> {
  const supabase = makeSupabase();
  const [mags, groupes, mosaiqueLue, contenus, message, provenances] = await Promise.all([
    lireMagazinesBrief(edition.id),
    lireResumeTableau(supabase, edition.id),
    /* La mosaïque : les six dernières arrivées qui ont une vignette, et rien d'autre. Hors
       corbeille (migration 20261023) ; sans la colonne, la même lecture sans le filtre. */
    lireHorsCorbeille((avec) => {
      const q = supabase.from("collectif_photos").select("vignette_key").eq("edition_id", edition.id).not("confirmee_le", "is", null);
      return (avec ? q.is("supprimee_le", null) : q)
        .not("vignette_key", "is", null)
        .order("confirmee_le", { ascending: false })
        .order("id", { ascending: false })
        .limit(MOSAIQUE)
        .returns<{ vignette_key: string }[]>();
    }),
    lireEnvois(edition),
    supabase
      .from("collectif_messages")
      .select("texte, created_at")
      .eq("edition_id", edition.id)
      .eq("auteur", "atelier")
      .order("created_at", { ascending: false })
      .limit(1),
    lireProvenances(edition.id),
  ]);
  if (mosaiqueLue.error) echec("mosaïque du tableau de bord", mosaiqueLue.error);
  if (message.error) echec("dernier message du tableau de bord", message.error);

  /* Chaque magazine dit sa COMPOSITION (D24) : le style s'il n'y en a qu'un,
     sinon combien sont mêlés. Les styles nommés se lisent par leur id, publiés
     ou non. (L'éventail de l'encart montre des couvertures fixes depuis le
     15/10 : plus d'image à signer ici.) */
  const compositions = mags.map((m) => ({ m, c: compositionDu(m) }));
  const ids = [...new Set(compositions.flatMap((x) => stylesDeLaComposition(x.c)))];
  const refs = ids.length ? await supabase.from("collectif_styles").select("id, nom").in("id", ids) : { data: [], error: null };
  if (refs.error) echec("styles des briefs", refs.error);
  const parStyle = new Map(((refs.data ?? []) as { id: string; nom: string }[]).map((x) => [x.id, x]));
  const magazines = compositions.map(({ m, c }) => {
    const noms = stylesDeLaComposition(c)
      .map((id) => parStyle.get(id)?.nom)
      .filter((x): x is string => Boolean(x));
    return {
      id: m.id,
      rang: m.rang,
      nom: m.nom,
      style: noms.length === 0 ? null : noms.length === 1 ? noms[0] : `${noms.length} styles mêlés`,
      briefValide: Boolean(m.brief_valide_le),
    };
  });

  /* Les lignes du résumé pèsent leurs photos : la même règle que la page Photos (dossiers.ts). */
  const pesees = enLignesPesees(groupes);

  /* Les dossiers : les sources qui ont reçu quelque chose (sources.ts, la même
     lecture que la colonne « Qui a déposé » de la page Photos), la plus
     fournie d'abord. */
  const liens: LienContribution[] = provenances.map((p) => ({
    id: p.id,
    libelle: p.libelle ?? "Lien de contribution",
    url: `${origine}/depot/${edition.token_depot}?p=${p.cle}`,
    plafond: libellePlafondLien(p, edition),
    recues: somme(groupes, (g) => g.provenance_id === p.id),
  }));
  /* Les dossiers de la carte : le même arbre que la page Photos (dossiers.ts),
     le premier niveau seulement ; chaque ligne y mène (`?dossier=`). */
  const arbre = arbreDesPhotos(pesees, provenances, edition, false);
  const parId = new Map(provenances.map((p) => [p.id, p]));
  const personnes = (n: { enfants: unknown[] }) => (n.enfants.length > 1 ? ` · ${n.enfants.length} personnes` : "");
  const dossiers: DossierPhotos[] = [
    ...arbre.vous.map((h) => ({
      cle: h.cle,
      libelle: h.nom,
      detail: `déposées par vous${h.enfants.length ? ` · ${h.enfants.length} sous-dossier${h.enfants.length > 1 ? "s" : ""}` : ""}`,
      n: h.n,
      lien: false,
      couverture: null,
    })),
    ...arbre.liens.map((l) => {
      const prov = l.cle.startsWith("lien:") ? parId.get(l.cle.slice(5)) : undefined;
      const regle = prov ? plafondDuLien(prov, edition) : plafondDuLien({ sans_plafond: false, plafond_par_personne: null }, edition);
      return { cle: l.cle, libelle: l.nom, detail: `${prov ? "lien" : "lien général"} · ${regle.toLowerCase()}${personnes(l)}`, n: l.n, lien: true, couverture: null };
    }),
    ...(arbre.atelier ? [{ cle: "atelier", libelle: arbre.atelier.nom, detail: "déposées par l'atelier", n: arbre.atelier.n, lien: false, couverture: null }] : []),
  ].sort((a, b) => b.n - a.n);
  /* La couverture d'un dossier : la vignette de sa dernière photo arrivée qui en a une (même
     règle que la page Photos, `dansLeDossier`, lue sur le résumé par `couvertureDe`). */
  await Promise.all(
    dossiers.map(async (d) => {
      d.couverture = await signerOuRien(couvertureDe(groupes, d.cle, edition.responsable_nom));
    })
  );

  const mosaique = (await Promise.all((mosaiqueLue.data ?? []).map((l) => signerOuRien(l.vignette_key)))).filter((u): u is string => Boolean(u));

  const dernier = ((message.data ?? []) as { texte: string; created_at: string }[])[0] ?? null;

  return {
    magazines,
    photos: somme(groupes),
    /* Les personnes comptées comme partout (T-180) : un nom, ou un téléphone pour les anonymes. */
    participants: compterPersonnes(groupes),
    selection: somme(groupes, () => true, "n_selection"),
    dossiers,
    mosaique,
    liens,
    contenusRecus: [...new Set(contenus.map((c) => c.type))],
    envois: contenus,
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
  /** La même adresse, sans en-tête de téléchargement : elle s'affiche dans la visionneuse (T-152). */
  voir: string | null;
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
        let voir: string | null = null;
        if (d.r2_key) {
          const ext = /\.([a-z0-9]{1,5})$/.exec(d.r2_key)?.[1] ?? "pdf";
          try {
            [url, voir] = await Promise.all([signerGet(d.r2_key, undefined, nomTelechargement(d.libelle, ext)), signerGet(d.r2_key)]);
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
          voir,
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

/* ───────────────────────────── les rendez-vous (D23, T-148) ───────────────────────────── */

export type VueRendezVous = {
  id: string;
  debut: string;
  fin: string;
  motif: string | null;
  statut: "pris" | "annule";
  /** Quand il a été pris : sa place dans le fil. */
  quand: string;
  avec: string;
};

export type Reservation = {
  /** `agenda` : les créneaux s'affichent dans l'espace ; `lien` : le lien de rendez-vous de la fiche ; `aucun`. */
  mode: "agenda" | "lien" | "aucun";
  avec: string | null;
  meet: string | null;
  rendezVous: VueRendezVous[];
};

/**
 * La prise de rendez-vous de l'espace. Les créneaux s'affichent dans l'espace
 * seulement quand TOUT est prêt : la migration, un interlocuteur choisi et
 * actif, son agenda relié, le compte Google posé. Sinon l'espace garde le lien
 * de la fiche : rien ne casse pendant la mise en place.
 */
export async function chargerReservation(edition: EditionLigne): Promise<Reservation> {
  const supabase = makeSupabase();
  const repli: Reservation = { mode: edition.rdv_url ? "lien" : "aucun", avec: null, meet: null, rendezVous: [] };
  if (edition.interlocuteur_cle === undefined) return repli;
  const [inters, rdvs] = await Promise.all([lireInterlocuteurs(supabase), lireRendezVous(supabase, edition.id)]);
  if (!inters.ok || !rdvs.ok) return repli;
  const prenom = (cle: string) => inters.valeur.find((i) => i.cle === cle)?.prenom ?? "l'atelier";
  const inter = inters.valeur.find((i) => i.cle === edition.interlocuteur_cle) ?? null;
  const pret = Boolean(inter && inter.actif && inter.agenda_id && compteAgenda());
  return {
    mode: pret ? "agenda" : repli.mode,
    avec: inter?.prenom ?? null,
    meet: inter?.meet_url ?? null,
    rendezVous: rdvs.valeur.map((r) => ({
      id: r.id,
      debut: new Date(r.debut).toISOString(),
      fin: new Date(r.fin).toISOString(),
      motif: r.motif,
      statut: r.statut,
      quand: r.created_at,
      avec: prenom(r.interlocuteur_cle),
    })),
  };
}

/** Une proposition complémentaire attend-elle une réponse ? (« Acceptée le … » est posé par la route.) */
export function propositionEnAttente(d: DocumentDossier): boolean {
  return d.type === "proposition" && !d.statut?.startsWith("Acceptée");
}

/* ───────────────────────────── le mur des styles ───────────────────────────── */

/**
 * Un style vu par le mur. `url` est l'image MAÎTRESSE (le repli, comme avant
 * T-172) ; `srcSet` la liste des tailles réduites et de la maîtresse, à
 * adresses stables (T-176), absente pour une image qui n'a pas de tailles.
 */
export type StyleMur = {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  palettes: { cle: string; nom: string; couleurs: string[] }[];
  typos: { titres: string; texte: string; echantillon: string | null; echantillonSrcSet?: string | null };
  couvertures: { cle: string; url: string | null; legende: string; srcSet?: string | null }[];
  doubles: { type: string; url: string | null; legende: string; srcSet?: string | null }[];
};

/** Un magazine vu par le mur : ses colonnes de brief (celles de D24 absentes avant la migration 20261017, `compositionDu` lit les deux). */
export type MagazineMur = BriefLigne & {
  id: string;
  rang: number;
  nom: string;
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
 * Une image du mur (T-172) : la maîtresse signée comme avant, et le `srcset`
 * de ses tailles relues par `lireTailles` (une taille qui ne dérive pas de
 * cette maîtresse est écartée), signées à adresse STABLE (`signerLectureVignette`,
 * T-176) pour que le navigateur les garde d'une visite à l'autre.
 */
async function imageDuMur(slug: string, key: string | null | undefined, tailles: unknown): Promise<{ url: string | null; srcSet: string | null }> {
  const url = await signerOuRien(key);
  const liste = url ? lireTailles(slug, key, tailles) : [];
  if (!liste.length) return { url, srcSet: null };
  const signees = await Promise.all(
    liste.map(async (t) => {
      try {
        return { largeur: t.largeur, url: await signerLectureVignette(t.key) };
      } catch {
        return { largeur: t.largeur, url: null };
      }
    })
  );
  return { url, srcSet: srcSetDe(signees) };
}

/** L'adresse qui télécharge un fichier sous son nom d'origine (`nomTelechargement`). */
async function signerTelechargement(key: string | null | undefined, nom: string | null): Promise<string | null> {
  if (!key) return null;
  const ext = /\.([a-z0-9]{1,5})$/i.exec(key)?.[1]?.toLowerCase() ?? "bin";
  try {
    return await signerGet(key, undefined, nomTelechargement((nom ?? "fichier").replace(/\.[A-Za-z0-9]{1,5}$/, ""), ext));
  } catch {
    return null;
  }
}

/**
 * Les styles PUBLIÉS que le public de l'édition peut voir (`styleVisible`),
 * dans l'ordre du mur, chaque image signée pour une heure ; et les
 * magazines avec leur brief.
 */
const COLONNES_BRIEF_AVANT = "id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le";

/** Les briefs des magazines d'une édition ; repli sans les colonnes de D24 tant que la migration 20261017 n'est pas passée. */
export async function lireMagazinesBrief(editionId: string): Promise<MagazineMur[]> {
  const supabase = makeSupabase();
  const lire = (colonnes: string) => supabase.from("collectif_magazines").select(colonnes).eq("edition_id", editionId).order("rang", { ascending: true });
  let r = await lire(`${COLONNES_BRIEF_AVANT}, palette_style_id, typo_style_id, doubles_aimes`);
  if (r.error && colonneAbsente(r.error.code)) r = await lire(COLONNES_BRIEF_AVANT);
  if (r.error) echec("magazines du mur", r.error);
  return (r.data ?? []) as unknown as MagazineMur[];
}

export async function chargerMur(edition: EditionLigne): Promise<{ styles: StyleMur[]; magazines: MagazineMur[] }> {
  const supabase = makeSupabase();
  const [st, mags] = await Promise.all([
    supabase
      .from("collectif_styles")
      .select("id, slug, nom, description, segment, palettes, typos, couvertures, doubles, ordre")
      .eq("publie", true)
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: true }),
    lireMagazinesBrief(edition.id),
  ]);
  if (st.error) echec("styles du mur", st.error);

  type Brut = {
    id: string; slug: string; nom: string; description: string | null; segment: string;
    palettes: { cle: string; nom: string; couleurs: string[] }[] | null;
    typos: { titres?: string; texte?: string; echantillon_key?: string | null; echantillon_tailles?: unknown } | null;
    couvertures: { cle: string; image_key: string; legende: string; tailles?: unknown }[] | null;
    doubles: { type: string; image_key: string | null; legende: string; tailles?: unknown }[] | null;
  };
  const visibles = ((st.data ?? []) as Brut[]).filter((s) => styleVisible(edition.styles_segment, s.segment));
  const styles = await Promise.all(
    visibles.map(async (s) => {
      const echantillon = await imageDuMur(s.slug, s.typos?.echantillon_key, s.typos?.echantillon_tailles);
      return {
        id: s.id,
        slug: s.slug,
        nom: s.nom,
        description: s.description,
        palettes: s.palettes ?? [],
        typos: { titres: s.typos?.titres ?? "", texte: s.typos?.texte ?? "", echantillon: echantillon.url, echantillonSrcSet: echantillon.srcSet },
        couvertures: await Promise.all(
          (s.couvertures ?? []).map(async (c) => ({ cle: c.cle, legende: c.legende, ...(await imageDuMur(s.slug, c.image_key, c.tailles)) }))
        ),
        doubles: await Promise.all(
          (s.doubles ?? []).map(async (d) => ({ type: d.type, legende: d.legende, ...(await imageDuMur(s.slug, d.image_key, d.tailles)) }))
        ),
      };
    })
  );
  return { styles, magazines: mags };
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
