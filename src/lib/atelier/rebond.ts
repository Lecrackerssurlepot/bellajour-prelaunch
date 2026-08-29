/**
 * Ce qu'un signal Brevo dit d'une adresse. Module PUR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Jusqu'au 29/08/2026, on ne regardait qu'une chose : Brevo a-t-il ACCEPTÉ le
 * mail. C'est ce que rend `sendBrevoEmail`, et c'est ce que le verrou de
 * `mails_envoyes` enregistrait sous le nom « envoyé ».
 *
 * Or « accepté par Brevo » n'est pas « arrivé chez elle ». Le verdict réel
 * tombe quelques secondes plus tard, et personne ne l'écoutait. Une faute de
 * frappe (`gmial.com`) produisait donc : M0 rebondit, elle ne reçoit jamais
 * son lien, elle ne dépose rien, M2 rebondit aussi — et comme une seule
 * relance part à vie, le dossier meurt là. Dans l'atelier, il ressemblait à
 * une cliente qui prend son temps.
 *
 * C'était le SEUL point du parcours qui échouait sans laisser de trace nulle
 * part. Ce module donne la règle ; la route ne fait que l'appliquer.
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * Ce qu'on fait d'un signal.
 *
 * `rebond`  — l'adresse ne reçoit pas, et ça ne s'arrangera pas tout seul.
 * `plainte` — elle a reçu, et a marqué le mail comme indésirable. Ce n'est
 *             PAS un rebond : le dossier est joignable, mais nos mails
 *             suivants risquent le dossier spam. Deux mots différents pour
 *             deux situations différentes, sinon l'atelier appellera une
 *             cliente pour lui dire qu'on n'arrive pas à la joindre.
 * `ignore`  — tout le reste (delivered, opened, click…). On ne touche pas à
 *             la base : un webhook mal configuré peut arroser cette route de
 *             `delivered`, et ce n'est pas une raison pour écrire.
 */
export type SuiteRebond = "rebond" | "plainte" | "ignore";

/**
 * Brevo écrit ses événements en `snake_case` dans le PAYLOAD (`hard_bounce`)
 * et en `camelCase` dans la CONFIGURATION du webhook (`hardBounce`). On
 * normalise donc au lieu de parier sur une des deux graphies : le jour où
 * l'une change, la route ne devient pas muette.
 */
function normaliser(evenement: string): string {
  return evenement.toLowerCase().replace(/[\s_-]/g, "");
}

/* Les façons dont une adresse peut être morte.
   — hardbounce            : le serveur d'en face dit « cette boîte n'existe pas » ;
   — invalid / invalidemail : Brevo refuse l'adresse elle-même (mal formée) ;
   — blocked               : Brevo REFUSE D'ENVOYER, en général parce qu'un
                    rebond dur antérieur l'a mise sur sa liste noire. C'est le
                    plus sournois : il n'y a même pas de tentative, et tous les
                    mails suivants échouent en silence.

   ⚠️ DEUX GRAPHIES POUR « INVALID », ET C'EST VOULU (T-036). On s'abonne à
   l'événement `invalid` dans la configuration du webhook, mais la
   documentation de Brevo nomme `invalid_email` dans le payload. Rien sur le
   disque ne permet de trancher laquelle arrive réellement, et se tromper
   coûterait exactement ce que ce module existe pour empêcher : un rebond
   classé « ignore », rien d'écrit, personne au courant. Une entrée de plus
   dans un ensemble de chaînes ne coûte rien ; une cliente injoignable, si. */
const REBONDS = new Set(["hardbounce", "invalid", "invalidemail", "blocked"]);

const PLAINTES = new Set(["spam", "complaint"]);

/**
 * Que faire de ce signal ?
 *
 * ⚠️ `softbounce` et `deferred` sont volontairement absents : ils sont
 * TEMPORAIRES (boîte pleine, serveur qui tousse) et Brevo réessaie tout seul.
 * Les journaliser noierait le vrai signal sous du bruit, et pousserait
 * l'atelier à écrire à quelqu'un dont le mail arrivera dans dix minutes.
 */
export function suitePour(evenement: string): SuiteRebond {
  const e = normaliser(evenement);
  if (REBONDS.has(e)) return "rebond";
  if (PLAINTES.has(e)) return "plainte";
  return "ignore";
}

/** Le type de ligne de journal correspondant, ou null si on n'écrit rien. */
export function typeEvenement(suite: SuiteRebond): string | null {
  if (suite === "rebond") return "email_rebond";
  if (suite === "plainte") return "email_plainte";
  return null;
}

export type SignalBrevo = {
  evenement: string;
  email: string;
  /** Le motif rendu par le serveur d'en face. Souvent vide, jamais inventé. */
  raison: string | null;
  sujet: string | null;
  /** L'identifiant du message chez Brevo — la clé d'idempotence. */
  messageId: string | null;
};

function texte(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Lit le corps d'un webhook transactionnel Brevo.
 *
 * Rend `null` si le signal n'a pas de quoi être traité : sans événement ni
 * adresse, il n'y a rien à décider. On ne devine pas — un signal incomplet
 * doit se voir, pas se rattraper.
 */
export function lireSignal(corps: Record<string, unknown>): SignalBrevo | null {
  const evenement = texte(corps.event);
  const email = texte(corps.email).toLowerCase();
  if (!evenement || !email) return null;

  return {
    evenement,
    email,
    raison: texte(corps.reason) || null,
    sujet: texte(corps.subject) || null,
    /* Brevo écrit `message-id` avec un tiret. `message_id` est accepté aussi :
       leur documentation a porté les deux formes selon les versions, et une
       clé d'idempotence qu'on rate se paie en doublons dans le journal. */
    messageId: texte(corps["message-id"]) || texte(corps.message_id) || null,
  };
}
