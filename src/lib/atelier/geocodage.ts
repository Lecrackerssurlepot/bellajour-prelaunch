/**
 * Le géocodage inverse : des coordonnées vers une ville et un pays, chez
 * Geoapify. Module à EFFETS (réseau), T-123, 21/09/2026.
 *
 * Pourquoi Geoapify (choix hérité de l'ancien projet, et toujours vrai) :
 *   · plan gratuit de 3 000 requêtes par jour, un dossier en coûte quelques
 *     unes (voir `lieux.ts` : une par lieu, jamais une par photo) ;
 *   · le stockage durable de la ville et du pays en base est EXPLICITEMENT
 *     autorisé par leurs conditions (HERE l'interdit sans contrat, Mapbox
 *     le facture) ;
 *   · `country_code` en ISO 3166-1 alpha-2, la forme qu'on utilise partout.
 *
 * ⚠️ Attribution : si un libellé de lieu est un jour montré à un CLIENT, la
 * licence exige de créditer Geoapify et OpenStreetMap. Aujourd'hui ces
 * données ne sortent jamais du back-office et du brief interne.
 *
 * Best-effort strict : ne throw jamais. Mais la réponse DISTINGUE « le
 * service a répondu, il n'y a rien là » (on note qu'on a demandé, on ne
 * redemande pas) de « le service n'a pas répondu » (on redemandera au
 * prochain passage). Sans cette distinction, une panne d'un quart d'heure
 * marquerait tout un dossier « sans lieu » pour toujours.
 */

import type { Lieu } from "./lieux";

export const GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/reverse";
const DELAI_MS = 5_000;
export const VAR_CLE_GEOAPIFY = "GEOAPIFY_API_KEY";

export type ReponseGeocodage =
  | { ok: true; lieu: Lieu | null }
  | { ok: false; raison: "sans_cle" | "http" | "reseau" };

type Proprietes = {
  city?: string;
  town?: string;
  village?: string;
  district?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

/**
 * Ce qu'on retient d'une réponse Geoapify. PUR, exporté pour le harnais.
 * La ville se replie sur la commune, le village, le quartier puis le
 * comté : « Vila Real » vaut mieux que rien pour un lot pris en campagne.
 */
export function lieuDepuisReponse(json: unknown): Lieu | null {
  const props = (json as { features?: Array<{ properties?: Proprietes }> })?.features?.[0]?.properties;
  if (!props || typeof props !== "object") return null;
  const ville = props.city ?? props.town ?? props.village ?? props.district ?? props.county ?? null;
  const pays = props.country ?? null;
  const codePays = typeof props.country_code === "string" ? props.country_code.toUpperCase() : null;
  if (!ville && !pays) return null;
  return { ville: ville || null, pays: pays || null, codePays };
}

export function cleGeoapify(): string | null {
  const v = process.env[VAR_CLE_GEOAPIFY]?.trim();
  return v ? v : null;
}

/** Un appel. `lang=fr` : « Lisbonne », pas « Lisboa », c'est l'atelier qui lit. */
export async function geocoderInverse(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ReponseGeocodage> {
  const cle = cleGeoapify();
  if (!cle) return { ok: false, raison: "sans_cle" };

  const params = new URLSearchParams({ lat: String(lat), lon: String(lon), lang: "fr", apiKey: cle });
  const controleur = new AbortController();
  const minuteur = setTimeout(() => controleur.abort(), DELAI_MS);
  try {
    const r = await fetchImpl(`${GEOAPIFY_URL}?${params}`, { signal: controleur.signal });
    if (!r.ok) {
      console.warn(`[geocodage] Geoapify ${r.status} pour (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
      return { ok: false, raison: "http" };
    }
    return { ok: true, lieu: lieuDepuisReponse(await r.json()) };
  } catch (err) {
    console.warn(`[geocodage] appel échoué : ${(err as Error)?.message}`);
    return { ok: false, raison: "reseau" };
  } finally {
    clearTimeout(minuteur);
  }
}
