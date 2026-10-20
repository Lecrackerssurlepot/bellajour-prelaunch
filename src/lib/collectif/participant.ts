/**
 * Le nom d'un participant (retours de Mathias du 19/10 au soir, édition
 * d'Audencia). Module PUR, importable par le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * « S'ils se connectent plusieurs fois, même avec un lien différent, il ne
 * faut pas qu'ils puissent changer leur nom, sinon ça va faire beaucoup de
 * liens bizarres. »
 *
 * Une personne, c'est un NOM (`clePersonne`, dossiers.ts) : « Léa », « Lea »
 * et « Léa Martin » faisaient trois personnes chez le responsable. Donc :
 * - le prénom ET le nom sont exigés la première fois (deux champs) ;
 * - une fois des photos choisies, le nom est GARDÉ sur le téléphone et la
 *   page ne propose plus de le changer ;
 * - le serveur fait foi : le nom qu'un appareil a déjà donné dans l'édition
 *   (`nomDeLAppareil`, participantConnu.ts) passe AVANT celui que le
 *   navigateur envoie, même si le navigateur l'a oublié.
 * ⚠️ Un téléphone prêté envoie sous le nom de son propriétaire : c'est le
 * prix de la règle, dit à l'écran (« il ne se change plus ensuite »).
 * ══════════════════════════════════════════════════════════════════════════
 */

/** La longueur que la base garde (`deposant`, presign/route.ts). */
export const NOM_MAX = 80;

/** Un prénom ou un nom tapé : espaces resserrés, bornes retirées. */
export function nettoyerMorceau(v: string): string {
  return v.normalize("NFC").replace(/\s+/g, " ").trim();
}

/** « Prénom Nom », ou `null` tant que l'un des deux manque. */
export function nomComplet(prenom: string, nom: string): string | null {
  const p = nettoyerMorceau(prenom);
  const n = nettoyerMorceau(nom);
  if (!p || !n) return null;
  return `${p} ${n}`.slice(0, NOM_MAX);
}

/** Le prénom seul, pour remercier (« Merci Léa »). */
export function premierMot(nom: string | null): string {
  return nom ? (nettoyerMorceau(nom).split(" ")[0] ?? "") : "";
}
