/**
 * L'adresse du site dans un lien qui part chez un client (mail, lien copié,
 * retour d'une connexion). Pur : aucune lecture d'environnement ici, l'appelant
 * passe `process.env.NEXT_PUBLIC_SITE_URL` tel quel (écrit en entier, pour que
 * Next puisse le remplacer au build).
 *
 * ⚠️ Pourquoi une liste fermée et pas « n'importe quelle https ».
 * Le 24/08/2026, la variable des PRÉVERSIONS Vercel a été posée sur l'adresse
 * de la branche `chantier/atelier` (pour essayer les mails avant la bascule),
 * puis jamais remise. La base des préversions est celle de la production : un
 * aperçu publié depuis une préversion le 11/11 a envoyé à une vraie cliente
 * (Eloïse, « La Geffroy family en Martinique ») un mail dont le bouton menait
 * à `bellajour-prelaunch-git-cha-a10ca9-….vercel.app`. Ce déploiement a été
 * nettoyé par Vercel : le 14/11, son lien affichait « 404
 * DEPLOYMENT_NOT_FOUND ». Une adresse `*.vercel.app` meurt toujours un jour ;
 * un client ne doit jamais la recevoir, quel que soit le réglage.
 *
 * Seules passent : le vrai site (avec ou sans www) et le poste local (pour
 * essayer en développement). Tout le reste, y compris vide ou illisible,
 * retombe sur `ORIGINE_SITE`.
 */

export const ORIGINE_SITE = "https://www.bellajour.fr";

const VRAI_SITE = /^https:\/\/(www\.)?bellajour\.fr$/;
const POSTE_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export function origineDuSite(brut: string | undefined | null): string {
  const o = (brut ?? "").trim().replace(/\/+$/, "").toLowerCase();
  if (VRAI_SITE.test(o) || POSTE_LOCAL.test(o)) return o;
  return ORIGINE_SITE;
}

/**
 * L'origine d'un RETOUR DE CONNEXION (Google, confirmation de compte), pas
 * d'un lien qui part chez un client. Sur une préversion Vercel de CE projet
 * (`VERCEL_ENV=preview`), on revient sur la préversion elle-même : sinon une
 * connexion faite pour essayer la branche atterrit sur le vrai site (Mathias,
 * 26/11). L'adresse n'est jamais écrite dans un mail : seul le navigateur qui
 * vient de cliquer la reçoit. Partout ailleurs : `origineDuSite`, inchangé.
 *
 * ⚠️ Côté Supabase, la liste des URL de redirection doit contenir
 * `https://*-lecrackerssurlepots-projects.vercel.app/**` ; sans elle,
 * Supabase renvoie vers le Site URL (le vrai site), comme avant.
 */
const PREVERSION = /^https:\/\/bellajour-prelaunch-[a-z0-9-]+-lecrackerssurlepots-projects\.vercel\.app$/;

export function origineDeRetour(
  brut: string | undefined | null,
  origineRequete: string,
  env: { nodeEnv?: string; vercelEnv?: string },
): string {
  if (env.nodeEnv !== "production") return origineRequete;
  if (env.vercelEnv === "preview" && PREVERSION.test(origineRequete)) return origineRequete;
  return origineDuSite(brut);
}
