/**
 * LE FILET SUR L'ADRESSE — la partie qui PARLE À GEOAPIFY (T-138, 25/09/2026).
 *
 * Une requête, au plus, par vérification d'impression : on demande au
 * géocodeur ce qu'il connaît à cette adresse, et `adresse.ts` en tire le
 * verdict. La clé est celle qui sert déjà aux lieux des photos
 * (`GEOAPIFY_API_KEY`, T-123) ; ici on géocode EN AVANT (un texte vers des
 * lieux), là-bas on géocodait à l'envers (des coordonnées vers une ville).
 *
 * Best-effort strict, le patron de `canvaDistant.ts` : rien ne throw, rien ne
 * bloque. Pas de clé, pas de réseau, Geoapify lent ou fâché → `null`, et le
 * verdict devient « non vérifié », jamais un refus. On ne retient pas une
 * commande d'impression parce qu'un tiers ne répond pas ; on le DIT à l'écran.
 *
 * ⚠️ `null` (« il n'a pas répondu ») et `[]` (« il a répondu, il ne connaît
 * rien là ») ne veulent PAS dire la même chose, et la distinction se perd si
 * on les confond : c'est la même leçon que `geocodage.ts`.
 */

const TIMEOUT_MS = 5000;
/* Cinq suffisent : au-delà, Geoapify descend vers des quartiers et des villes
   qui n'ont plus rien à voir avec la rue demandée (relevé le 25/09). */
const LIMITE = 5;

export type CandidatBrut = { formatted: string; rue: string | null; ville: string | null };

/**
 * Ce que le géocodeur connaît à cette adresse, ou `null` s'il n'a rien pu
 * dire. `pays` est le code ISO à deux lettres du dossier : il BORNE la
 * recherche, sans quoi « Rua Antero de Quental » remonterait du Brésil.
 */
export async function chercherAdresse(
  texte: string,
  pays: string | null | undefined,
): Promise<CandidatBrut[] | null> {
  const cle = process.env.GEOAPIFY_API_KEY;
  if (!cle || !texte.trim()) return null;

  const params = new URLSearchParams({
    text: texte,
    format: "json",
    limit: String(LIMITE),
    apiKey: cle,
  });
  if (typeof pays === "string" && /^[A-Za-z]{2}$/.test(pays)) {
    params.set("filter", `countrycode:${pays.toLowerCase()}`);
  }

  try {
    const r = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { results?: unknown };
    if (!Array.isArray(j.results)) return null;
    return j.results.map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        formatted: typeof o.formatted === "string" ? o.formatted : "",
        rue: typeof o.street === "string" ? o.street : null,
        ville: typeof o.city === "string" ? o.city : null,
      };
    });
  } catch (err) {
    /* La cause reste lisible en console, comme partout ailleurs : un filet
       muet qui ne dit jamais POURQUOI il s'est tu est un filet qu'on croit
       branché alors qu'il ne l'est plus. */
    console.error("[atelier/adresse] géocodage impossible", (err as Error)?.name, (err as Error)?.message);
    return null;
  }
}
