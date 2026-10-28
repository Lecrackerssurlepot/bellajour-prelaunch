/**
 * Le catalogue de l'éditeur : les photos d'un projet, telles que l'écran les
 * filtre et les pose. Côté NAVIGATEUR : il appelle la bonne route de lecture
 * (dossier d'un particulier ou édition collective) et la met à la forme
 * `PhotoMaq` (ARCHI §3.1).
 *
 * Deux parties :
 * - `catalogueDeDossier` / `catalogueDEdition` sont PURES (ni réseau, ni
 *   horloge) : le harnais les rejoue ;
 * - `chargerCatalogue` fait le fetch et traduit les refus (401 → connexion,
 *   404, 410 photos effacées, 503 migration absente…) en un résultat typé :
 *   il ne lève jamais, l'écran lit `ok`.
 *
 * Ce que le catalogue NE sait PAS (l'écran le complète) : `autresMagazines`
 * (la route ne dit pas dans quel magazine une photo est déjà posée : il faut
 * relire les autres sauvegardes de l'édition) et `nouvelle` (aucune date
 * d'arrivée dans la réponse). Les deux partent à `[]` et `false`.
 */

import type { PhotoRef } from "@/lib/mise-en-page/magazine";
import type {
  MagazineEditionMep,
  PhotoDossierMep,
  PhotoEditionMep,
  ReponsePhotosEditionMep,
  ReponsePhotosMep,
} from "../typesPhotos";

export type TypeDossier = "lien" | "responsable" | "atelier";

/** Une photo de la bibliothèque : `PhotoRef` réel + ce que l'écran filtre et affiche. */
export type PhotoMaq = PhotoRef & {
  personne: string;
  /** « Bateau 3 », « Lien général » ; null sans lien (responsable, atelier, dossier d'un particulier). */
  lien: string | null;
  type: TypeDossier;
  /** Le cœur du responsable. */
  coeur: boolean;
  /** « À ne pas publier ». */
  signalee: boolean;
  /** Rangs « Mag. 1 » : complété par l'écran (la route ne le dit pas). */
  autresMagazines: number[];
  /** Arrivée depuis la dernière ouverture : complété par l'écran. */
  nouvelle: boolean;
  /** URL stable (une heure) de la vignette 320 px ; null sans vignette. */
  vignette: string | null;
  /** URL stable de l'image moyenne (~1 600 px) ; null pour un dossier de particulier, une photo d'avant ou sans la migration. */
  moyenne: string | null;
  /**
   * Plus rien à montrer ni à exporter : ni vignette, ni moyenne, ni original
   * signé (objets partis après la rétention, signature en échec). La photo
   * reste dans le catalogue : un cadre qui la porte s'affiche « indisponible »,
   * jamais perdu en silence (ARCHI T44).
   */
  indisponible: boolean;
};

/** Ce que l'écran affiche du projet. */
export type ProjetInfo = {
  nom: string;
  source: "particulier" | "edition";
  /** Le nombre de pages payé (dossier) ; null s'il n'est pas connu (édition, ou dossier sans pagination). */
  nbPagesCible: number | null;
  /** Édition seulement : la collecte est encore ouverte (l'éditeur avertit, sans bloquer). */
  collecteOuverte: boolean;
  /** Édition seulement : archivée. */
  archive: boolean;
};

export type CatalogueCharge = {
  ok: true;
  photos: PhotoMaq[];
  projet: ProjetInfo;
  /** Les magazines de l'édition (choix du magazine à composer) ; vide pour un dossier. */
  magazines: MagazineEditionMep[];
  /** Les URL signées des ORIGINAUX, pour l'export seulement (jamais pour l'écran). Null = signature en échec. */
  originaux: Record<string, string | null>;
  /** Quand la réponse a été reçue (ms) et combien de secondes ses URL d'originaux vivent. */
  obtenuLe: number;
  ttlOriginauxSecondes: number;
};

export type RaisonRefus =
  | "non_authentifie"
  | "introuvable"
  | "photos_effacees"
  | "migration_absente"
  | "lecture_incomplete"
  | "reseau"
  | "erreur";

export type CatalogueRefuse = { ok: false; raison: RaisonRefus; message: string };
export type ResultatCatalogue = CatalogueCharge | CatalogueRefuse;

export type SourceCatalogue =
  | { type: "dossier"; token: string }
  | { type: "edition"; id: string; magazineId?: string };

/** La durée de vie des URL d'originaux : `APERCU_TTL_SECONDS` côté serveur (une heure). Lue de la réponse pour le dossier ; fixe pour l'édition. */
export const TTL_ORIGINAUX_EDITION_SECONDES = 3600;

/** Marge avant l'expiration au-delà de laquelle l'export relit les routes (une minute). */
export const MARGE_EXPIRATION_MS = 60_000;

/** Les URL d'originaux lues à `obtenuLe` sont-elles encore sûres à `maintenantMs` ? */
export function adressesEncoreValables(c: Pick<CatalogueCharge, "obtenuLe" | "ttlOriginauxSecondes">, maintenantMs: number): boolean {
  return maintenantMs < c.obtenuLe + c.ttlOriginauxSecondes * 1000 - MARGE_EXPIRATION_MS;
}

/* ─────────────────────────── la mise à la forme (PURE) ─────────────────────────── */

/** Dimensions connues et positives, sinon carré (orientation inconnue = « C », ARCHI T44). */
const dim = (v: number | null): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 1);

export function photoMaqDeDossier(p: PhotoDossierMep, prenom: string | null): PhotoMaq {
  const sansAdresse = !p.url && !p.urlVignette;
  return {
    id: p.id,
    nom: p.nom ?? `photo-${p.id.slice(0, 8)}`,
    l: dim(p.l),
    h: dim(p.h),
    date: p.priseLe,
    personne: prenom?.trim() || "Client",
    lien: null,
    type: "responsable",
    coeur: false,
    signalee: false,
    autresMagazines: [],
    nouvelle: false,
    vignette: p.urlVignette,
    moyenne: null,
    indisponible: sansAdresse,
  };
}

export function photoMaqDEdition(p: PhotoEditionMep): PhotoMaq {
  const sansAdresse = !p.original && !p.vignette && !p.moyenne;
  return {
    id: p.id,
    nom: p.nom ?? `photo-${p.id.slice(0, 8)}`,
    l: dim(p.largeur),
    h: dim(p.hauteur),
    date: p.priseLe,
    personne: p.personne,
    lien: p.lien,
    type: p.depot,
    coeur: p.preselection,
    signalee: p.signalee,
    autresMagazines: [],
    nouvelle: false,
    vignette: p.vignette,
    moyenne: p.moyenne,
    indisponible: sansAdresse,
  };
}

export function catalogueDeDossier(r: ReponsePhotosMep, obtenuLe: number): CatalogueCharge {
  return {
    ok: true,
    photos: r.photos.map((p) => photoMaqDeDossier(p, r.prenom)),
    projet: {
      nom: r.titre?.trim() || (r.prenom ? `Dossier de ${r.prenom}` : "Dossier"),
      source: "particulier",
      nbPagesCible: typeof r.nbPages === "number" && r.nbPages > 0 ? r.nbPages : null,
      collecteOuverte: false,
      archive: false,
    },
    magazines: [],
    originaux: Object.fromEntries(r.photos.map((p) => [p.id, p.url])),
    obtenuLe,
    ttlOriginauxSecondes: r.ttl,
  };
}

export function catalogueDEdition(r: ReponsePhotosEditionMep, magazineId: string | undefined, obtenuLe: number): CatalogueCharge {
  const mag = magazineId ? r.magazines.find((m) => m.id === magazineId) : undefined;
  const nom = `${r.edition.organisation} · ${r.edition.evenement}`;
  return {
    ok: true,
    photos: r.photos.map(photoMaqDEdition),
    projet: {
      nom: mag ? `${nom} · ${mag.nom}` : nom,
      source: "edition",
      nbPagesCible: null,
      collecteOuverte: r.edition.collecteOuverte,
      archive: r.edition.archive,
    },
    magazines: r.magazines,
    originaux: Object.fromEntries(r.photos.map((p) => [p.id, p.original])),
    obtenuLe,
    ttlOriginauxSecondes: TTL_ORIGINAUX_EDITION_SECONDES,
  };
}

/** L'adresse de la route de lecture pour une source. */
export function urlDeLecture(s: SourceCatalogue): string {
  return s.type === "dossier"
    ? `/api/admin/atelier/mise-en-page/photos?token=${encodeURIComponent(s.token)}`
    : `/api/admin/collectif/editions/${encodeURIComponent(s.id)}/mise-en-page/photos`;
}

/** Un refus HTTP traduit (PUR) : la raison que l'écran sait dire, et la phrase. */
export function refusDeStatut(status: number, erreur: string | null, message: string | null): CatalogueRefuse {
  if (status === 401) return { ok: false, raison: "non_authentifie", message: "La session a expiré : reconnexion nécessaire." };
  if (status === 410 || erreur === "photos_effacees") {
    return { ok: false, raison: "photos_effacees", message: message ?? "Les photos de cette édition ont été effacées : il n'y a plus rien à mettre en page." };
  }
  if (status === 404) return { ok: false, raison: "introuvable", message: "Projet introuvable." };
  if (status === 503) return { ok: false, raison: "migration_absente", message: "La base n'est pas à jour pour l'Édition collective." };
  if (erreur === "lecture_incomplete") return { ok: false, raison: "lecture_incomplete", message: message ?? "La liste des photos est incomplète. Réessayer." };
  return { ok: false, raison: "erreur", message: message ?? "Les photos n'ont pas pu être lues. Réessayer." };
}

/* ─────────────────────────── le chargement ─────────────────────────── */

const lireJson = async (rep: Response): Promise<Record<string, unknown>> => {
  try {
    const j = (await rep.json()) as unknown;
    return j && typeof j === "object" && !Array.isArray(j) ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

/**
 * Charge le catalogue d'un projet. Ne lève jamais. Sur 401, renvoie vers la
 * connexion (l'appelant n'a rien à faire de plus). `signal` annule la lecture.
 */
export async function chargerCatalogue(source: SourceCatalogue, signal?: AbortSignal): Promise<ResultatCatalogue> {
  let rep: Response;
  try {
    rep = await fetch(urlDeLecture(source), { cache: "no-store", credentials: "same-origin", signal });
  } catch {
    return { ok: false, raison: "reseau", message: "Pas de réseau : les photos n'ont pas pu être lues." };
  }
  const obtenuLe = Date.now();
  if (!rep.ok) {
    const j = await lireJson(rep);
    const refus = refusDeStatut(rep.status, typeof j.error === "string" ? j.error : null, typeof j.message === "string" ? j.message : null);
    if (refus.raison === "non_authentifie" && typeof window !== "undefined") window.location.assign("/admin/login");
    return refus;
  }
  const j = await lireJson(rep);
  if (!Array.isArray(j.photos)) return { ok: false, raison: "erreur", message: "Réponse illisible." };
  return source.type === "dossier"
    ? catalogueDeDossier(j as unknown as ReponsePhotosMep, obtenuLe)
    : catalogueDEdition(j as unknown as ReponsePhotosEditionMep, source.magazineId, obtenuLe);
}
