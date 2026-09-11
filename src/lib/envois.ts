/**
 * L'INTERRUPTEUR DES ENVOIS — T-108, 11/09/2026. Module PUR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL EXISTE
 *
 * Le 11/09, pendant la recette d'une correction du questionnaire, un script
 * de vérification a cliqué le bouton final de l'écran 4 malgré la consigne
 * qui l'interdisait : un vrai dossier a été créé et un VRAI mail M0 est parti.
 * L'adresse était celle de Mathias, le dégât fut nul, et le dossier a été
 * supprimé. Mais la leçon tient en une phrase : la seule protection était une
 * consigne écrite, et une consigne n'est pas un verrou. `.env.local` pointe
 * la base de PRODUCTION (il n'existe pas de préproduction : la preview Vercel
 * partage la même base), donc n'importe quelle recette locale peut écrire à
 * une vraie cliente.
 *
 * CE QUE L'INTERRUPTEUR FAIT, ET CE QU'IL NE FAIT PAS
 * Il coupe le seul geste irréversible : l'appel à Brevo. Tout le reste du
 * parcours continue exactement comme avant — l'état change, le journal
 * s'écrit, l'écran répond. On n'ajoute pas un second comportement à éprouver,
 * on retire un envoi.
 *
 * ⚠️ PAS DE `NODE_ENV`. Un garde-fou qui se déclenche tout seul en
 * développement finit contourné le jour où l'on veut justement éprouver un
 * envoi réel, et c'est ce jour-là qu'on le retire pour de bon. Il faut donc
 * poser la variable À LA MAIN dans `.env.local`, et la retirer sciemment pour
 * envoyer. Elle n'est JAMAIS posée sur Vercel.
 *
 * ⚠️ IL REND `false`, comme un échec Brevo, et c'est voulu : le verrou de
 * `mails_envoyes` se retire alors comme d'habitude (mails.ts), donc rien ne
 * se croit envoyé et la relève réessaiera le jour où l'interrupteur sautera.
 * Un `true` mensonger graverait « envoyé » sur un mail que personne n'a reçu.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Le nom de la variable, écrit une fois. */
export const VAR_MAILS_COUPES = "ATELIER_MAILS_COUPES";

/**
 * Les envois sont-ils coupés ? Fonction PURE : elle prend la valeur, jamais
 * `process.env`, pour que le harnais l'éprouve sans toucher l'environnement.
 *
 * Permissive à la lecture (`1`, `true`, `oui`, insensible à la casse et aux
 * espaces), stricte sur le reste : une variable posée à `0` ou à `false` ne
 * coupe RIEN. Le doute ne coupe pas non plus — une valeur inattendue laisse
 * les mails partir, parce qu'un tunnel muet en production serait un défaut
 * bien pire que le risque qu'on couvre ici, et qu'il se verrait des jours
 * plus tard.
 */
export function envoisCoupes(valeur: string | undefined | null): boolean {
  const v = (valeur ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "oui";
}

/** Ce qu'on écrit dans les logs à la place de l'envoi. Nomme le mail ET le
 *  destinataire : sans le second, on ne saurait pas à qui on a failli écrire. */
export function motDeCoupure(tag: string, email: string, templateId?: number | null): string {
  const modele = templateId ? ` (template=${templateId})` : "";
  return `${tag} COUPÉ par ${VAR_MAILS_COUPES} — rien n'est parti à ${email}${modele}`;
}
