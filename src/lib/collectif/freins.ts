/**
 * Les FREINS des routes du participant (audit du 20/10, S3 et C1). Module PUR :
 * aucun accès base, aucun réseau, aucune variable d'environnement. La mémoire
 * du frein (une `Map` par instance Vercel) est `creerFrein` (compte/garde.ts).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNE CLASSE ENTIÈRE DERRIÈRE UNE MÊME ADRESSE
 *
 * Le jour de l'événement, 80 participants scannent le même QR dans la même
 * minute, depuis le Wi-Fi du campus ou une 4G partagée : UNE adresse IP pour
 * tous. Compter par adresse seule (l'ancien `creerPlafond(20)`) bloquait le
 * vingt et unième. D'où :
 * - une clé = l'adresse IP du CLIENT (`ipDuClient` : Cloudflare s'il est là,
 *   sinon celle que Vercel voit) ET le lien de dépôt (son token) ;
 * - des seuils pensés pour 80 personnes en une minute, chacune faisant deux
 *   présentations (l'adresse seule, puis prénom et nom) et quelques pages
 *   d'album ;
 * - un second frein, LARGE, par l'adresse qui se connecte à Vercel
 *   (`ipDeConnexion`, qui ne se forge pas) : `cf-connecting-ip` s'écrit par un
 *   script qui vise Vercel directement, et changer d'adresse à chaque demande
 *   ne doit pas ouvrir un annuaire sans frein.
 * Seul `presenter` compte dans `depot/participant` (ni `qui`, ni `oublier` :
 * ils ne disent rien d'une autre adresse).
 *
 * ⚠️ CE N'EST PAS UNE PROTECTION. Une `Map` par instance : deux instances Vercel
 * comptent chacune de leur côté, un redémarrage remet tout à zéro. Il freine un
 * script naïf qui essaie des adresses, il n'arrête pas une attaque. La vraie
 * borne de l'oracle est ailleurs : une adresse tapée ne rend que le PRÉNOM et
 * un nombre de photos (S1), et presign ne lit plus aucune adresse (S2).
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Demandes par minute, par adresse du client ET par lien de dépôt. */
export const FREINS_DEPOT = {
  /** `depot/participant`, action `presenter` : 80 personnes × 2 présentations, et de la marge. */
  presenter: 300,
  /** `depot/album` : 80 personnes qui ouvrent l'album et en tournent quelques pages. */
  album: 600,
  /** `depot/supprimer` : chacun retire quelques photos de son lot. */
  supprimer: 200,
} as const;

/** Demandes par minute et par adresse qui se connecte à Vercel, tous liens confondus (le second frein). */
export const FREIN_LARGE = 1200;

/**
 * La clé du frein : l'adresse du client et le lien. Le token n'est gardé que
 * par ses 12 derniers caractères (base64url : 72 bits tirés au sort, assez
 * pour séparer deux liens, rien qui ouvre quoi que ce soit si la mémoire se
 * lisait).
 */
export function cleFreinDepot(ip: string, token: unknown): string {
  const t = typeof token === "string" ? token.slice(-12) : "";
  return `${ip}|${t}`;
}
