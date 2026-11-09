/**
 * Les lieux détaillés d'une photo (09/11) : ce que l'atelier peut écrire dans un titre ou une légende.
 * Module PUR : la route `/api/admin/atelier/mise-en-page/lieux` fait les appels Geoapify, ici on lit leurs réponses.
 *
 * Trois lectures par point (une par endroit, jamais par photo : `cleLieu` arrondit à ≈ 100 m) :
 *   - le géocodage inverse : la commune, le département, la région, le pays, et le nom d'un lieu connu quand le
 *     point EST ce lieu (« Palácio Nacional de Sintra ») ;
 *   - les lieux nommés à moins de `RAYON_PRECIS_M` (monument, curiosité, plage, parc) ;
 *   - la grande ville la plus proche, à moins de 50 km (« Annecy » pour une photo prise à Doussard).
 * Essai du 09/11 sur la rive du lac d'Annecy : aucun nom de lac ne revient. Un lac ne se nomme pas depuis le bord.
 */

export type LieuDetaille = {
  precis: string | null;
  commune: string | null;
  villeProche: string | null;
  departement: string | null;
  region: string | null;
  pays: string | null;
};

export const RAYON_PRECIS_M = 300;
export const RAYON_VILLE_M = 50_000;
export const MAX_POINTS_LIEUX = 12;

/** La clé d'un endroit : trois décimales (≈ 100 m). */
export const cleLieu = (lat: number, lon: number): string => `${lat.toFixed(3)},${lon.toFixed(3)}`;

const texte = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
/** « Sintra (Santa Maria e São Miguel, …) » → « Sintra » : la parenthèse est administrative. */
const sansParenthese = (v: string | null): string | null => (v ? v.replace(/\s*\(.*\)\s*$/, "").trim() || null : null);

type Props = Record<string, unknown>;
const premieresProps = (json: unknown): Props[] => {
  const f = (json as { features?: Array<{ properties?: Props }> })?.features;
  return Array.isArray(f) ? f.map((x) => x?.properties ?? {}).filter((p) => typeof p === "object") : [];
};

/** Le géocodage inverse : tout sauf la ville proche. */
export function lieuDepuisInverse(json: unknown): Omit<LieuDetaille, "villeProche"> | null {
  const p = premieresProps(json)[0];
  if (!p) return null;
  const commune = sansParenthese(texte(p.village) ?? texte(p.town) ?? texte(p.city) ?? texte(p.municipality) ?? texte(p.suburb));
  const precis = p.result_type === "amenity" ? texte(p.name) : null;
  return { precis, commune, departement: texte(p.county), region: texte(p.state), pays: texte(p.country) };
}

/** Le nom en français s'il existe (`name_international.fr` : « Lisbonne », pas « Lisboa »), sinon le nom local. */
const nomFr = (p: Props): string | null => texte((p.name_international as Record<string, unknown> | undefined)?.fr) ?? texte(p.name);

/** Le premier lieu NOMMÉ à moins de `RAYON_PRECIS_M`. */
export function precisDepuisLieux(json: unknown): string | null {
  for (const p of premieresProps(json)) {
    const nom = nomFr(p);
    const d = typeof p.distance === "number" ? p.distance : Infinity;
    if (nom && d <= RAYON_PRECIS_M) return nom;
  }
  return null;
}

/** La première ville nommée (la plus proche : la requête est triée par proximité). */
export const villeDepuisLieux = (json: unknown): string | null => {
  for (const p of premieresProps(json)) {
    const nom = sansParenthese(nomFr(p));
    if (nom) return nom;
  }
  return null;
};

export function assembler(inverse: unknown, lieux: unknown, villes: unknown): LieuDetaille | null {
  const base = lieuDepuisInverse(inverse);
  const precis = precisDepuisLieux(lieux) ?? base?.precis ?? null;
  const villeProche = villeDepuisLieux(villes);
  if (!base && !precis && !villeProche) return null;
  return { precis, commune: base?.commune ?? null, villeProche, departement: base?.departement ?? null, region: base?.region ?? null, pays: base?.pays ?? null };
}

export type ChoixLieu = { valeur: string; sorte: string };

/** Les propositions d'un ou plusieurs endroits, du plus précis au plus large, sans doublon. */
export function choixDeLieux(lieux: readonly (LieuDetaille | null | undefined)[]): ChoixLieu[] {
  const vus = new Set<string>();
  const out: ChoixLieu[] = [];
  const ajouter = (v: string | null, sorte: string) => {
    if (!v || vus.has(v.toLocaleLowerCase("fr"))) return;
    vus.add(v.toLocaleLowerCase("fr"));
    out.push({ valeur: v, sorte });
  };
  const ls = lieux.filter((x): x is LieuDetaille => !!x);
  for (const [cle, sorte] of [["precis", "Lieu précis"], ["commune", "Commune"], ["villeProche", "Ville proche"], ["departement", "Département"], ["region", "Région"], ["pays", "Pays"]] as const) {
    for (const l of ls) ajouter(l[cle], sorte);
  }
  return out;
}

/** Un point reçu du navigateur : rien n'en est cru. */
export function pointsValides(v: unknown): { lat: number; lon: number }[] | null {
  const pts = (v as { points?: unknown })?.points;
  if (!Array.isArray(pts) || pts.length === 0 || pts.length > MAX_POINTS_LIEUX) return null;
  const out: { lat: number; lon: number }[] = [];
  for (const p of pts) {
    const lat = (p as { lat?: unknown })?.lat, lon = (p as { lon?: unknown })?.lon;
    if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    out.push({ lat, lon });
  }
  return out;
}
