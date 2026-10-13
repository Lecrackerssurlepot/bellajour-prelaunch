/**
 * Ce que les photos d'une édition savent d'elles-mêmes : date, appareil,
 * dimensions, empreinte, lieu. Module À EFFETS : serveur uniquement.
 *
 * Le VOISIN de `enrichirPhotos` / `geocoderNumero` (atelier/enrichissement.ts),
 * qui écrivent dans `photos` (clé étrangère vers `numeros`) et ne peuvent
 * donc pas servir ici. Le CŒUR, lui, est importé tel quel : `lireDepuisCoffre`
 * (la tête de l'objet, sa vignette, sharp, exifr) ne connaît aucune table, et
 * `planGeocodage` / `geocoderInverse` non plus. Rien du B2C ne change.
 *
 * Appelé en `after()` par la confirmation d'un lot : ne lève jamais.
 * Les remarques (sombre, claire, doublon) restent des REMARQUES.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { lireDepuisCoffre } from "@/lib/atelier/enrichissement";
import { geocoderInverse } from "@/lib/atelier/geocodage";
import { planGeocodage } from "@/lib/atelier/lieux";
import { journaliser } from "./journal";

/** Le facteur limitant est la latence R2 (même réglage que l'atelier). */
const CONCURRENCE = 4;

type Ligne = { id: string; r2_key: string; taille: number | null; vignette_key: string | null };

export type BilanCollectif = { traitees: number; datees: number; geolocalisees: number; ratees: number; lieux: number };

export async function enrichirCollectif(
  supabase: SupabaseClient,
  editionId: string,
  ids?: readonly string[]
): Promise<BilanCollectif> {
  const bilan: BilanCollectif = { traitees: 0, datees: 0, geolocalisees: 0, ratees: 0, lieux: 0 };
  try {
    let q = supabase
      .from("collectif_photos")
      .select("id, r2_key, taille, vignette_key")
      .eq("edition_id", editionId)
      .not("confirmee_le", "is", null)
      .is("metadonnees_le", null)
      .limit(500);
    if (ids?.length) q = q.in("id", [...ids]);
    const { data, error } = await q.returns<Ligne[]>();
    if (error) {
      console.error("[collectif] lecture des photos à enrichir échouée", error.code, error.message);
      return bilan;
    }
    const lignes = data ?? [];
    const maintenant = new Date();
    let curseur = 0;

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCE, lignes.length) }, async () => {
        for (;;) {
          const i = curseur++;
          if (i >= lignes.length) return;
          const l = lignes[i];
          try {
            const lu = await lireDepuisCoffre(l, maintenant);
            const { error: e } = await supabase
              .from("collectif_photos")
              .update({
                largeur: lu.largeur,
                hauteur: lu.hauteur,
                prise_le: lu.priseLe,
                appareil: lu.appareil,
                gps_lat: lu.gpsLat,
                gps_lon: lu.gpsLon,
                empreinte: lu.empreinte,
                luminance: lu.luminance,
                metadonnees_le: maintenant.toISOString(),
              })
              .eq("id", l.id);
            if (e) {
              bilan.ratees++;
              continue;
            }
            bilan.traitees++;
            if (lu.priseLe) bilan.datees++;
            if (lu.gpsLat !== null) bilan.geolocalisees++;
          } catch (err) {
            console.error(`[collectif] métadonnées de ${l.id} illisibles : ${(err as Error)?.message}`);
            bilan.ratees++;
          }
        }
      })
    );

    /* Les lieux : un appel Geoapify par LIEU, jamais par photo (planGeocodage). */
    const { data: geo } = await supabase
      .from("collectif_photos")
      .select("id, gps_lat, gps_lon")
      .eq("edition_id", editionId)
      .not("gps_lat", "is", null)
      .is("lieu_le", null)
      .limit(2000)
      .returns<{ id: string; gps_lat: number; gps_lon: number }[]>();
    const demandes = planGeocodage((geo ?? []).map((p) => ({ id: p.id, gpsLat: p.gps_lat, gpsLon: p.gps_lon })));
    for (const d of demandes) {
      const r = await geocoderInverse(d.lat, d.lon);
      if (!r.ok) {
        if (r.raison === "sans_cle") break;
        continue;
      }
      if (r.lieu) bilan.lieux++;
      await supabase
        .from("collectif_photos")
        .update({
          lieu_ville: r.lieu?.ville ?? null,
          lieu_pays: r.lieu?.pays ?? null,
          lieu_code_pays: r.lieu?.codePays ?? null,
          lieu_le: new Date().toISOString(),
        })
        .in("id", d.ids);
    }

    if (bilan.traitees || bilan.lieux) {
      await journaliser(supabase, { editionId }, "metadonnees_lues", { ...bilan }, null);
    }
  } catch (err) {
    console.error("[collectif] enrichissement : exception", (err as Error)?.message);
  }
  return bilan;
}
