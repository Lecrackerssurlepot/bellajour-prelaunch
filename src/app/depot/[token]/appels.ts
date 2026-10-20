/* Les appels de la page du participant aux routes du dépôt (contrat
   `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md` §2). Navigateur
   seulement. Toutes en POST, le token dans le CORPS, jamais dans l'URL.
   Une coupure rend `status: 0` : la page le dit, elle ne devine rien. */

export type Reponse = { status: number; json: Record<string, unknown> };

const DELAI_MS = 20_000;

async function poster(chemin: string, corps: Record<string, unknown>): Promise<Reponse> {
  const garde = new AbortController();
  const minuteur = setTimeout(() => garde.abort(), DELAI_MS);
  try {
    const rep = await fetch(chemin, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
      credentials: "same-origin",
      signal: garde.signal,
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await rep.json()) as Record<string, unknown>;
    } catch {
      /* un corps vide (404 du lien mort) */
    }
    return { status: rep.status, json };
  } catch {
    return { status: 0, json: {} };
  } finally {
    clearTimeout(minuteur);
  }
}

/** Ce que le serveur dit d'une personne reconnue (statut `connu` ou `cree`). */
export type PersonneLue = {
  prenom: string;
  /** Le nom de famille, seulement à la CRÉATION (ce que la personne vient de taper) ; jamais pour une personne retrouvée. */
  nom: string | null;
  photos: number;
  ceTelephone: number;
  accordAJour: boolean;
  /** `null` : sans limite ; `undefined` : non dite. */
  place: number | null | undefined;
};

const nombre = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Lire la personne d'une réponse de `depot/participant` ; `nomTape` : ce que la page vient d'envoyer (création). */
export function lirePersonne(json: Record<string, unknown>, nomTape: string | null): PersonneLue | null {
  const p = json.participant as Record<string, unknown> | undefined;
  const prenom = typeof p?.prenom === "string" ? p.prenom : "";
  if (!prenom) return null;
  return {
    prenom,
    nom: json.statut === "cree" ? nomTape : null,
    photos: nombre(json.photos),
    ceTelephone: nombre(json.ceTelephone),
    accordAJour: json.accordAJour === true,
    place: typeof json.place === "number" ? json.place : json.place === null ? null : undefined,
  };
}

export function presenter(token: string, p: string | null, email: string, prenom?: string, nom?: string): Promise<Reponse> {
  return poster("/api/collectif/depot/participant", { token, p, action: "presenter", email, ...(prenom ? { prenom } : {}), ...(nom ? { nom } : {}) });
}

export function oublier(token: string, p: string | null): Promise<Reponse> {
  return poster("/api/collectif/depot/participant", { token, p, action: "oublier" });
}

export type PhotoAlbum = { id: string; vignette: string | null; prenom: string; moi: boolean; supprimable: boolean; arrivee: string };
export type PageAlbum = {
  photos: PhotoAlbum[];
  suivante: number | null;
  ferme: boolean;
  /** `personnes` : `null` sans la vue de l'album (20261023) ; jamais un nombre deviné. */
  album: { photos: number; personnes: number | null } | null;
  moi: { prenom: string | null; photos: number | null; ceTelephone: number | null; place: number | null; sansLimite: boolean } | null;
};

export async function lireAlbum(token: string, p: string | null, vue: "album" | "miennes", page: number): Promise<PageAlbum | null> {
  const r = await poster("/api/collectif/depot/album", { token, p, vue, page });
  if (r.status !== 200 || !Array.isArray(r.json.photos)) return null;
  const j = r.json;
  const photos = (j.photos as Record<string, unknown>[])
    .filter((x) => typeof x.id === "string")
    .map((x) => ({
      id: x.id as string,
      vignette: typeof x.vignette === "string" ? x.vignette : null,
      prenom: typeof x.prenom === "string" ? x.prenom : "",
      moi: x.moi === true,
      supprimable: x.supprimable === true,
      arrivee: typeof x.arrivee === "string" ? x.arrivee : "",
    }));
  const a = j.album as Record<string, unknown> | null | undefined;
  const m = j.moi as Record<string, unknown> | null | undefined;
  const part = m?.participant as Record<string, unknown> | null | undefined;
  return {
    photos,
    suivante: typeof j.suivante === "number" ? j.suivante : null,
    ferme: j.ferme === true,
    album: a ? { photos: nombre(a.photos), personnes: typeof a.personnes === "number" ? a.personnes : null } : null,
    moi: m
      ? {
          /* Le prénom seulement (contrat : le nom de famille d'une personne retrouvée ne sort pas). */
          prenom: typeof part?.prenom === "string" ? part.prenom : null,
          photos: typeof m.photos === "number" ? m.photos : null,
          ceTelephone: typeof m.ceTelephone === "number" ? m.ceTelephone : null,
          place: typeof m.place === "number" ? m.place : null,
          sansLimite: m.sansLimite === true,
        }
      : null,
  };
}

export function supprimerPhotos(token: string, p: string | null, photoIds: string[]): Promise<Reponse> {
  return poster("/api/collectif/depot/supprimer", { token, p, photoIds });
}
