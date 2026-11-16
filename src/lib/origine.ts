/**
 * L'origine de retour d'un paiement : celle du navigateur si on la connaît,
 * le site sinon. Copie de `originDeConfiance` de `/api/atelier/checkout`
 * (un fichier de route ne peut pas exporter d'aide) : la carte cadeau la lit
 * d'ici, la route de l'atelier n'a pas été touchée.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export function originDeConfiance(brut: string | null): string {
  if (!brut) return SITE_URL;
  let u: URL;
  try {
    u = new URL(brut);
  } catch {
    return SITE_URL;
  }
  const h = u.hostname;
  const httpsOuLocal = u.protocol === "https:" || h === "localhost";
  const connu =
    httpsOuLocal &&
    (u.origin === new URL(SITE_URL).origin ||
      h === "bellajour.fr" ||
      h === "www.bellajour.fr" ||
      (h.endsWith(".vercel.app") && h.startsWith("bellajour-prelaunch")) ||
      (h === "localhost" && process.env.NODE_ENV !== "production"));
  return connu ? u.origin : SITE_URL;
}
