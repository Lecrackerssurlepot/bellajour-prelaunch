/**
 * La corbeille, côté base et coffre (migration 20261023). Module À EFFETS
 * (Supabase, R2, service key) : serveur uniquement. Les règles sont dans
 * `corbeille.ts` (pur, au harnais) ; ici, l'ordre des gestes.
 *
 * Ne lève jamais : chaque fonction rend une issue que la route LIT
 * (`absente` : la migration manque, 503 `migration_personnes_absente`).
 *
 * L'ORDRE D'UN EFFACEMENT (purge des 30 jours, ou « Effacer maintenant » de
 * l'atelier ; audit du 20/10, S7 et C2, qui renverse l'ordre du lot w1) :
 * 1. l'INTENTION au journal (`objets_a_effacer` : les clés du coffre, rien
 *    d'autre) ; sans elle, rien ne part ;
 * 2. la LIGNE, supprimée sous condition (encore à la corbeille, et pour la
 *    purge encore plus vieille que 30 jours) en RENDANT ses clés : une photo
 *    restaurée entre-temps reste, avec tous ses objets ;
 * 3. le COFFRE (l'original et la vignette, sous `collectif/<édition>/`
 *    seulement), pour les lignes parties seulement ;
 * 4. ce qui est réglé (`objets_effaces`). Un objet qui résiste reste dans
 *    l'intention : la purge suivante le retente (`reprendreObjets`) jusqu'à
 *    réussite, et n'efface jamais une clé qu'une ligne porte encore.
 * L'ancien ordre (le coffre, puis la ligne) laissait « Restaurer » ressusciter
 * une photo dont l'original venait de partir, et une ligne dont le coffre
 * résistait revenait chaque jour en tête de la purge.
 *
 * LA LIGNE EST SUPPRIMÉE, PAS ANONYMISÉE (décision de ce lot) : la personne ou
 * l'organisateur a demandé que la photo parte, et la ligne ne porte que des
 * données sur elle (nom d'origine, GPS, appareil, empreinte, déposant). Le
 * journal garde la trace (combien, lesquelles, par qui, quand). Une ligne
 * gardée bloquerait aussi pour toujours la clé de fichier (unique par
 * édition) : la même photo ne pourrait plus jamais être renvoyée. À l'inverse
 * de `retention.ts` (une édition livrée garde ses lignes : la preuve de
 * l'accord des photos PUBLIÉES), une photo de la corbeille n'est pas publiée.
 *
 * Chaque mise à la corbeille ou restauration VIDE le cache des doublons de
 * l'édition (`collectif_doublons`) : son résultat portait sur d'autres photos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supprimer } from "@/lib/atelier/r2";
import { cleVignette, estCleCollectif, prefixeEdition } from "./cles";
import {
  ALERTE_JOURS,
  clesLibres,
  echeanceCorbeille,
  EVT_EFFACEES,
  EVT_OBJETS_A_EFFACER,
  EVT_OBJETS_EFFACES,
  EVT_RESTAUREES,
  EVT_SUPPRIMEES,
  joursRestants,
  lireClesObjets,
  objetsEnAttente,
  parQui,
  photoDeLaCle,
  REPRISE_MAX_CLES,
  seuilPurge,
  type EvenementObjets,
  type SupprimeePar,
} from "./corbeille";
import { cleDuLien, LIBELLE_ATELIER, LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, personneDeLaPhoto } from "./grille";
import { noterEchec } from "./echecsJournal";
import { collectifOuvert } from "./interrupteur";
import { journaliser, journaliserId } from "./journal";
import { COMPTE_SANS_LIGNE, migrationPersonnesPresumee, noterPersonnesAbsentes } from "./horsCorbeille";
import { enPaquets, lireToutesLesLignes, listeIn } from "./lignes";
import { personnesAbsentes } from "./migration";

export type Panne = { statut: "absente" } | { statut: "erreur"; code?: string };
export type Issue<T> = { statut: "ok"; valeur: T } | Panne;

const echec = (error: { code?: string; message?: string } | null): Panne => (personnesAbsentes(error) ? { statut: "absente" } : { statut: "erreur", code: error?.code });

/** Ce qu'une photo de la corbeille porte, pour la liste et pour l'effacement. */
export type PhotoCorbeille = {
  id: string;
  r2_key: string;
  vignette_key: string | null;
  mime: string | null;
  nom_origine: string | null;
  deposant: string | null;
  role_deposant: string;
  provenance_id: string | null;
  participant_id: string | null;
  appareil_id: string | null;
  confirmee_le: string | null;
  supprimee_le: string;
  supprimee_par: SupprimeePar;
  preselection: boolean;
};

export const COLONNES_CORBEILLE =
  "id, r2_key, vignette_key, mime, nom_origine, deposant, role_deposant, provenance_id, participant_id, appareil_id, confirmee_le, supprimee_le, supprimee_par, preselection";

/** Ce qu'il faut lire d'une photo pour décider si elle peut partir à la corbeille. */
export type Candidate = {
  id: string;
  role_deposant: string;
  provenance_id: string | null;
  appareil_id: string | null;
  participant_id: string | null;
  confirmee_le: string | null;
  supprimee_le: string | null;
};

/** Le cache des doublons ne vaut plus : vidé (il se recalcule au prochain affichage). Ne lève jamais. */
async function invaliderDoublons(supabase: SupabaseClient, editionId: string): Promise<void> {
  try {
    const { error } = await supabase.from("collectif_doublons").delete().eq("edition_id", editionId);
    if (error && error.code !== "PGRST205" && error.code !== "42P01") console.error("[collectif] cache des doublons non vidé", error.code);
  } catch (err) {
    console.error("[collectif] cache des doublons non vidé", (err as Error)?.message);
  }
}

/** Les photos de l'édition parmi ces ids (par paquets de 100), avec ce qui décide de la corbeille. */
async function lireCandidates(supabase: SupabaseClient, editionId: string, ids: readonly string[]): Promise<Issue<Candidate[]>> {
  const lues: Candidate[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .select("id, role_deposant, provenance_id, appareil_id, participant_id, confirmee_le, supprimee_le")
      .eq("edition_id", editionId)
      .in("id", paquet)
      .returns<Candidate[]>();
    if (error) return echec(error);
    lues.push(...(data ?? []));
  }
  return { statut: "ok", valeur: lues };
}

export type Geste = { n: number; ids: string[]; refusees: string[]; journal: boolean };

/**
 * Mettre des photos à la corbeille. Seules partent les photos ARRIVÉES de
 * l'édition, pas déjà à la corbeille, et que `garde` accepte (le participant :
 * `peutSupprimerSaPhoto`). Les autres reviennent dans `refusees`, sans erreur :
 * l'écran les remet en place. L'écriture est conditionnée (`supprimee_le` encore
 * vide) : deux gestes croisés ne la datent qu'une fois.
 */
export async function mettreALaCorbeille(
  supabase: SupabaseClient,
  editionId: string,
  ids: readonly string[],
  par: SupprimeePar,
  qui: string | null,
  garde: (p: Candidate) => boolean = () => true
): Promise<Issue<Geste>> {
  const lues = await lireCandidates(supabase, editionId, ids);
  if (lues.statut !== "ok") return lues;
  const permises = lues.valeur.filter((p) => p.confirmee_le && !p.supprimee_le && garde(p)).map((p) => p.id);
  const maintenant = new Date().toISOString();
  const ecrites: string[] = [];
  for (const paquet of enPaquets(permises)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .update({ supprimee_le: maintenant, supprimee_par: par })
      .eq("edition_id", editionId)
      .in("id", paquet)
      .is("supprimee_le", null)
      .select("id")
      .returns<{ id: string }[]>();
    if (error) {
      if (ecrites.length) console.error("[collectif] corbeille : écrite en partie", ecrites.length, error.code);
      return echec(error);
    }
    ecrites.push(...(data ?? []).map((l) => l.id));
  }
  const refusees = ids.filter((id) => !ecrites.includes(id));
  let journal = true;
  if (ecrites.length) {
    await invaliderDoublons(supabase, editionId);
    journal = await journaliser(supabase, { editionId }, EVT_SUPPRIMEES, { n: ecrites.length, par, ids: ecrites }, qui);
  }
  return { statut: "ok", valeur: { n: ecrites.length, ids: ecrites, refusees, journal } };
}

/**
 * Restaurer : la photo revient à sa place (son lien, sa personne, sa sélection : rien d'autre n'avait bougé).
 *
 * `par: "auteur"` (21/10) : le participant qui choisit de nouveau une photo qu'il avait supprimée
 * (`depot/presign`, `restaurableParChoix`). L'écriture est alors CONDITIONNÉE à `supprimee_par =
 * 'auteur'` : une photo que le responsable a retirée entre-temps ne revient pas par ce chemin. Le
 * journal le dit (`photos_restaurees`, `par: "auteur"`).
 */
export async function restaurer(
  supabase: SupabaseClient,
  editionId: string,
  ids: readonly string[],
  qui: string | null,
  o: { par?: "auteur" } = {}
): Promise<Issue<Geste>> {
  const ecrites: string[] = [];
  for (const paquet of enPaquets(ids)) {
    let q = supabase
      .from("collectif_photos")
      .update({ supprimee_le: null, supprimee_par: null })
      .eq("edition_id", editionId)
      .in("id", paquet)
      .not("supprimee_le", "is", null);
    if (o.par === "auteur") q = q.eq("supprimee_par", "auteur");
    const { data, error } = await q.select("id").returns<{ id: string }[]>();
    if (error) return echec(error);
    ecrites.push(...(data ?? []).map((l) => l.id));
  }
  const refusees = ids.filter((id) => !ecrites.includes(id));
  let journal = true;
  if (ecrites.length) {
    await invaliderDoublons(supabase, editionId);
    journal = await journaliser(supabase, { editionId }, EVT_RESTAUREES, { n: ecrites.length, ids: ecrites, ...(o.par ? { par: o.par } : {}) }, qui);
  }
  return { statut: "ok", valeur: { n: ecrites.length, ids: ecrites, refusees, journal } };
}

/** La corbeille d'une édition, la plus récente d'abord. */
export async function lireCorbeille(supabase: SupabaseClient, editionId: string): Promise<Issue<PhotoCorbeille[]>> {
  const lu = await lireToutesLesLignes<PhotoCorbeille>(
    () => supabase.from("collectif_photos").select(COLONNES_CORBEILLE).eq("edition_id", editionId).not("supprimee_le", "is", null).returns<PhotoCorbeille[]>(),
    { colonne: "supprimee_le", croissant: false },
    "corbeille"
  );
  if (lu.error) return echec(lu.error);
  return { statut: "ok", valeur: lu.data };
}

/**
 * COMBIEN de photos sont à la corbeille (la ligne « Corbeille » de la page Photos, lot w2 du
 * 20/10) : un compte en GET `limit(0)`, aucune ligne, jamais `head` (horsCorbeille.ts). `null`
 * sans la migration 20261023 (l'écran montre la ligne sans nombre) ou si la base ne répond pas :
 * la grille ne tombe jamais pour ce compte-là. Pendant la minute où l'absence est retenue, aucune
 * requête ne part.
 */
export async function compterCorbeille(supabase: SupabaseClient, editionId: string): Promise<number | null> {
  if (!migrationPersonnesPresumee()) return null;
  try {
    const { count, error } = await supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", editionId).not("supprimee_le", "is", null).limit(0);
    if (error) {
      if (personnesAbsentes(error)) noterPersonnesAbsentes();
      else console.error("[collectif] corbeille non comptée", error.code);
      return null;
    }
    return count ?? null;
  } catch (err) {
    console.error("[collectif] corbeille non comptée", (err as Error)?.message);
    return null;
  }
}

/** Les objets du coffre d'une photo : l'original et la vignette, sous le préfixe de SON édition seulement. */
export function objetsDeLaPhoto(p: Pick<PhotoCorbeille, "id" | "r2_key" | "vignette_key">, editionId: string): string[] {
  const prefixe = prefixeEdition(editionId);
  const cles = [p.r2_key, p.vignette_key, cleVignette(editionId, p.id)].filter((k): k is string => typeof k === "string" && k.length > 0);
  return [...new Set(cles)].filter((k) => estCleCollectif(k) && k.startsWith(prefixe));
}

/**
 * `ratees` : les photos effacées de la base dont un objet du coffre a résisté.
 * Elles ne reviennent JAMAIS (la ligne est partie) ; leurs objets sont dans
 * l'intention du journal et la purge suivante les retente (`reprendreObjets`).
 */
export type Effacement = { n: number; ids: string[]; ratees: number; journal: boolean };

type AEffacer = Pick<PhotoCorbeille, "id" | "r2_key" | "vignette_key">;

/** Ce qui efface un objet du coffre : `supprimer` (r2.ts) ; le harnais passe le sien (jamais le vrai coffre). */
export type Effaceur = (cle: string) => Promise<boolean>;

/** Supprimer d'un geste les objets du coffre, 8 à la fois. Rend ceux qui sont partis. */
async function viderObjets(cles: readonly string[], effaceur: Effaceur): Promise<Set<string>> {
  const parties = new Set<string>();
  for (let i = 0; i < cles.length; i += 8) {
    const lot = cles.slice(i, i + 8);
    const rendus = await Promise.all(lot.map((k) => effaceur(k).catch(() => false)));
    lot.forEach((k, j) => {
      if (rendus[j]) parties.add(k);
    });
  }
  return parties;
}

/**
 * Supprimer les LIGNES, sous condition et en rendant leurs clés (S7) : encore à
 * la corbeille et, pour la purge (`avant`), toujours plus vieilles que 30 jours.
 * Une photo restaurée entre la lecture et ce geste ne part pas. Si la base
 * refuse le paquet, on le rejoue photo par photo (C2) : une ligne coincée ne
 * retient pas les autres ; trois refus de suite, c'est la base, on s'arrête.
 */
async function supprimerLignes(supabase: SupabaseClient, editionId: string, ids: readonly string[], avant: string | null): Promise<Issue<AEffacer[]>> {
  const requete = (liste: readonly string[]) => {
    const q = supabase.from("collectif_photos").delete().eq("edition_id", editionId).in("id", [...liste]).not("supprimee_le", "is", null);
    return (avant ? q.lt("supprimee_le", avant) : q).select("id, r2_key, vignette_key").returns<AEffacer[]>();
  };
  const tout = await requete(ids);
  if (!tout.error) return { statut: "ok", valeur: tout.data ?? [] };
  if (personnesAbsentes(tout.error)) return { statut: "absente" };
  console.error("[collectif] corbeille : lignes refusées en paquet, reprises une à une", ids.length, tout.error.code);
  const parties: AEffacer[] = [];
  let derniere: { code?: string; message?: string } = tout.error;
  let refusDeSuite = 0;
  for (const id of ids) {
    const une = await requete([id]);
    if (une.error) {
      derniere = une.error;
      if (++refusDeSuite >= 3 && !parties.length) break;
      continue;
    }
    refusDeSuite = 0;
    parties.push(...(une.data ?? []));
  }
  return parties.length ? { statut: "ok", valeur: parties } : echec(derniere);
}

/**
 * Un paquet (100 photos au plus) : l'INTENTION (les clés du coffre, au journal),
 * puis les LIGNES, puis le COFFRE, puis ce qui est réglé. Sans intention écrite,
 * rien ne part : un objet dont on perdrait la trace ne se retenterait jamais.
 */
async function effacerPaquet(
  supabase: SupabaseClient,
  editionId: string,
  paquet: readonly AEffacer[],
  avant: string | null,
  effaceur: Effaceur
): Promise<Issue<{ ids: string[]; ratees: number; journal: boolean }>> {
  const cles = lireClesObjets(paquet.flatMap((p) => objetsDeLaPhoto(p, editionId)), editionId);
  const intention = await journaliserId(supabase, { editionId }, EVT_OBJETS_A_EFFACER, { cles, n: paquet.length }, null);
  if (!intention) {
    await noterEchec(supabase, editionId, "corbeille", { etape: "ecriture", n: paquet.length });
    return { statut: "erreur", code: "journal" };
  }
  const lignes = await supprimerLignes(supabase, editionId, paquet.map((p) => p.id), avant);
  if (lignes.statut !== "ok") {
    if (lignes.statut === "erreur") await noterEchec(supabase, editionId, "corbeille", { etape: "ecriture", code: lignes.code, n: paquet.length });
    /* Aucune ligne n'est partie : tous les objets restent. L'intention est réglée (rien à faire) ;
       si ce journal-là manque, la reprise relira les lignes et les gardera aussi. */
    await journaliser(supabase, { editionId }, EVT_OBJETS_EFFACES, { evenement: intention, cles }, null);
    return lignes;
  }
  /* Les objets des lignes PARTIES, tels que la suppression les a rendus ; ceux des autres restent. */
  const parPhoto = lignes.valeur.map((l) => ({ id: l.id, objets: lireClesObjets(objetsDeLaPhoto(l, editionId), editionId) }));
  const aVider = new Set(parPhoto.flatMap((p) => p.objets));
  const parties = await viderObjets([...aVider], effaceur);
  const gardees = cles.filter((k) => !aVider.has(k));
  const reglees = [...gardees, ...[...aVider].filter((k) => parties.has(k))];
  const ratees = parPhoto.filter((p) => p.objets.some((k) => !parties.has(k))).length;
  const journal = reglees.length ? await journaliser(supabase, { editionId }, EVT_OBJETS_EFFACES, { evenement: intention, cles: reglees }, null) : true;
  return { statut: "ok", valeur: { ids: lignes.valeur.map((l) => l.id), ratees, journal } };
}

/**
 * Effacer pour de bon des photos À LA CORBEILLE d'une édition (S7, C2) : par
 * paquets de 100, l'intention au journal, la LIGNE (re-contrôlée : encore à la
 * corbeille, et pour la purge encore plus vieille que `avant`), le COFFRE, puis
 * le journal (`photos_effacees`). Un paquet refusé n'arrête pas les suivants.
 * `par` : « purge » (les 30 jours) ou « atelier » (« Effacer maintenant »).
 */
export async function effacer(
  supabase: SupabaseClient,
  editionId: string,
  photos: readonly AEffacer[],
  par: "purge" | "atelier",
  qui: string | null,
  jusqua: number = Infinity,
  avant: string | null = null,
  effaceur: Effaceur = supprimer
): Promise<Issue<Effacement>> {
  const effacees: string[] = [];
  let ratees = 0;
  let journal = true;
  let panne: Panne | null = null;
  for (const paquet of enPaquets(photos)) {
    if (Date.now() >= jusqua) break;
    const r = await effacerPaquet(supabase, editionId, paquet, avant, effaceur);
    if (r.statut !== "ok") {
      panne = panne ?? r;
      continue;
    }
    effacees.push(...r.valeur.ids);
    ratees += r.valeur.ratees;
    journal = journal && r.valeur.journal;
  }
  if (ratees) await noterEchec(supabase, editionId, "corbeille", { etape: "coffre", n: ratees });
  if (effacees.length) {
    await invaliderDoublons(supabase, editionId);
    journal = (await journaliser(supabase, { editionId }, EVT_EFFACEES, { n: effacees.length, par, ids: effacees, ratees }, qui)) && journal;
  }
  if (!effacees.length && panne) return panne;
  return { statut: "ok", valeur: { n: effacees.length, ids: effacees, ratees, journal } };
}

/**
 * Reprendre les objets du coffre qu'un effacement n'a pas pu retirer (C2) :
 * les intentions vieilles de 15 minutes au moins dont des clés ne sont pas
 * réglées (`objetsEnAttente`). Une clé qu'une LIGNE porte encore (restaurée,
 * ou que la base a gardée) se garde, jamais ne s'efface (`clesLibres`) ; les
 * autres se retentent, et ce qui part se règle au journal. Ce qui résiste
 * attend le passage suivant, jusqu'à réussite. Ne lève jamais.
 */
export async function reprendreObjets(
  supabase: SupabaseClient,
  jusqua: number,
  maintenant: Date = new Date(),
  effaceur: Effaceur = supprimer
): Promise<{ intentions: number; effaces: number; gardes: number; restes: number } | null> {
  try {
    const lu = await lireToutesLesLignes<EvenementObjets>(
      () => supabase.from("collectif_evenements").select("id, edition_id, type, payload, created_at").in("type", [EVT_OBJETS_A_EFFACER, EVT_OBJETS_EFFACES]).returns<EvenementObjets[]>(),
      { colonne: "created_at", croissant: true },
      "objets du coffre à effacer"
    );
    if (lu.error) {
      console.error("[collectif] reprise du coffre : journal illisible", lu.error.code);
      return null;
    }
    const bilan = { intentions: 0, effaces: 0, gardes: 0, restes: 0 };
    let budget = REPRISE_MAX_CLES;
    for (const a of objetsEnAttente(lu.data, maintenant)) {
      if (Date.now() >= jusqua || budget <= 0) break;
      const cles = a.cles.slice(0, budget);
      budget -= cles.length;
      bilan.intentions++;
      const portees: { id: string; r2_key: string | null; vignette_key: string | null }[] = [];
      let illisible = false;
      for (const morceau of enPaquets(cles, 50)) {
        const ids = [...new Set(morceau.map((k) => photoDeLaCle(k, a.editionId)).filter((x): x is string => x !== null))];
        const ou = [`r2_key.in.${listeIn(morceau)}`, `vignette_key.in.${listeIn(morceau)}`, ...(ids.length ? [`id.in.(${ids.join(",")})`] : [])].join(",");
        const { data, error } = await supabase.from("collectif_photos").select("id, r2_key, vignette_key").eq("edition_id", a.editionId).or(ou).returns<typeof portees>();
        if (error) {
          console.error("[collectif] reprise du coffre : lignes illisibles", error.code);
          illisible = true;
          break;
        }
        portees.push(...(data ?? []));
      }
      /* Sans savoir quelles lignes portent ces clés, on n'efface rien. */
      if (illisible) continue;
      const libres = clesLibres(cles, a.editionId, portees);
      const gardees = cles.filter((k) => !libres.includes(k));
      const parties = await viderObjets(libres, effaceur);
      const reglees = [...gardees, ...libres.filter((k) => parties.has(k))];
      bilan.gardes += gardees.length;
      bilan.effaces += parties.size;
      bilan.restes += libres.length - parties.size;
      if (reglees.length) await journaliser(supabase, { editionId: a.editionId }, EVT_OBJETS_EFFACES, { evenement: a.evenement, cles: reglees, reprise: true }, null);
      if (libres.length > parties.size) await noterEchec(supabase, a.editionId, "corbeille", { etape: "coffre", n: libres.length - parties.size });
    }
    if (bilan.intentions) console.log("[collectif] reprise du coffre", JSON.stringify(bilan));
    return bilan;
  } catch (err) {
    console.error("[collectif] reprise du coffre : exception", (err as Error)?.message);
    return null;
  }
}

/** « Effacer maintenant » (l'atelier) : parmi ces ids, les photos À LA CORBEILLE de l'édition. `verifier` : compter sans rien effacer. */
export async function effacerMaintenant(
  supabase: SupabaseClient,
  editionId: string,
  ids: readonly string[],
  qui: string | null,
  verifier: boolean
): Promise<Issue<Effacement & { aEffacer: number }>> {
  const lues: PhotoCorbeille[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .select(COLONNES_CORBEILLE)
      .eq("edition_id", editionId)
      .in("id", paquet)
      .not("supprimee_le", "is", null)
      .returns<PhotoCorbeille[]>();
    if (error) return echec(error);
    lues.push(...(data ?? []));
  }
  if (verifier) return { statut: "ok", valeur: { n: 0, ids: [], ratees: 0, journal: true, aEffacer: lues.length } };
  /* « Maintenant » n'attend pas les 30 jours : la ligne est re-contrôlée « encore à la corbeille » seulement. */
  const r = await effacer(supabase, editionId, lues, "atelier", qui);
  return r.statut === "ok" ? { statut: "ok", valeur: { ...r.valeur, aEffacer: lues.length } } : r;
}

/** Au plus, par passage quotidien (le reste attend le lendemain). */
export const PURGE_MAX = 500;

/**
 * La purge quotidienne : d'abord les objets du coffre qu'un effacement passé
 * n'a pas pu retirer (`reprendreObjets`, jusqu'à réussite), puis les photos à
 * la corbeille depuis 30 jours, toutes éditions, effacées pour de bon (la
 * ligne, puis le coffre : `effacer`). Lancée APRÈS la réponse de la relève de
 * l'atelier (`/api/atelier/mails/relever`, aucun cron de plus), bornée par
 * l'échéance de la relève et par `PURGE_MAX`. Coupée si `COLLECTIF_OUVERT` est
 * fermé ; silencieuse sans la migration (rien n'est à la corbeille) et quand
 * rien n'est à purger. Ne lève jamais.
 */
export async function purgeQuotidienne(supabase: SupabaseClient, jusqua: number, effaceur: Effaceur = supprimer): Promise<{ editions: number; effacees: number; ratees: number } | null> {
  try {
    if (!collectifOuvert()) return null;
    await reprendreObjets(supabase, jusqua, new Date(), effaceur);
    const seuil = seuilPurge(new Date());
    const { data, error } = await supabase
      .from("collectif_photos")
      .select("id, edition_id, r2_key, vignette_key, supprimee_le")
      .not("supprimee_le", "is", null)
      .lt("supprimee_le", seuil)
      .order("supprimee_le", { ascending: true })
      .limit(PURGE_MAX)
      .returns<{ id: string; edition_id: string; r2_key: string; vignette_key: string | null; supprimee_le: string }[]>();
    if (error) {
      if (!personnesAbsentes(error)) console.error("[collectif] purge de la corbeille : lecture impossible", error.code);
      return null;
    }
    const parEdition = new Map<string, { id: string; r2_key: string; vignette_key: string | null }[]>();
    for (const p of data ?? []) parEdition.set(p.edition_id, [...(parEdition.get(p.edition_id) ?? []), p]);
    const total = { editions: 0, effacees: 0, ratees: 0 };
    for (const [editionId, photos] of parEdition) {
      if (Date.now() >= jusqua) break;
      /* La ligne est re-contrôlée au moment de partir : encore à la corbeille, encore plus vieille que le seuil. */
      const r = await effacer(supabase, editionId, photos, "purge", null, jusqua, seuil, effaceur);
      total.editions++;
      if (r.statut === "ok") {
        total.effacees += r.valeur.n;
        total.ratees += r.valeur.ratees;
      }
    }
    if (total.editions) console.log("[collectif] purge de la corbeille", JSON.stringify(total));
    return total;
  } catch (err) {
    console.error("[collectif] purge de la corbeille : exception", (err as Error)?.message);
    return null;
  }
}

/** Une photo de la corbeille telle que l'écran la montre (planche 5). */
export type VuePhotoCorbeille = {
  id: string;
  vignette: string | null;
  nom: string | null;
  /** Qui l'a envoyée (le nom de la personne, ou le responsable, ou l'atelier). */
  qui: string;
  /** La clé du lien (`cleDuLien`, grille.ts) et son nom. */
  lien: string;
  lienNom: string;
  supprimeeLe: string;
  supprimeePar: SupprimeePar;
  /** « par son auteur, Yanis Haddad », « par Mathilde Roux », « par l'atelier ». */
  parQui: string;
  /** Le jour où la purge l'efface, et combien de jours d'ici là ; `alerte` sous `ALERTE_JOURS`. */
  effaceeLe: string | null;
  joursRestants: number;
  alerte: boolean;
  /** Elle était dans « Ma sélection » : elle y revient à la restauration. */
  selection: boolean;
};

/**
 * La corbeille pour l'écran : chaque photo signée (vignette, sinon l'original
 * s'il s'affiche), son lien nommé, qui l'a supprimée et quand elle partira.
 * `noms` : le nom de chaque lien par l'id de sa provenance (`nomsDesLiens`, grille.ts).
 */
export async function vueCorbeille(
  photos: readonly PhotoCorbeille[],
  noms: ReadonlyMap<string, string>,
  responsable: string | null,
  maintenant: Date,
  signer: (cle: string) => Promise<string>,
  signerOriginal: (cle: string) => Promise<string>
): Promise<VuePhotoCorbeille[]> {
  return Promise.all(
    photos.map(async (p) => {
      let vignette: string | null = null;
      try {
        if (p.vignette_key) vignette = await signer(p.vignette_key);
        else if (p.mime !== "image/heic" && p.mime !== "image/heif") vignette = await signerOriginal(p.r2_key);
      } catch {
        vignette = null;
      }
      const lien = cleDuLien(p);
      const jours = joursRestants(p.supprimee_le, maintenant);
      return {
        id: p.id,
        vignette,
        nom: p.nom_origine,
        qui: personneDeLaPhoto(p, responsable),
        lien,
        lienNom: (p.provenance_id ? noms.get(p.provenance_id) : undefined) ?? (lien === "vous" ? LIBELLE_RESPONSABLE : lien === "atelier" ? LIBELLE_ATELIER : lien === "participants" ? LIBELLE_LIEN_GENERAL : "Lien de contribution"),
        supprimeeLe: p.supprimee_le,
        supprimeePar: p.supprimee_par,
        parQui: parQui(p.supprimee_par, p.deposant, responsable),
        effaceeLe: echeanceCorbeille(p.supprimee_le),
        joursRestants: jours,
        alerte: jours <= ALERTE_JOURS,
        selection: p.preselection,
      };
    })
  );
}
