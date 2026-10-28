/**
 * Le message qui accompagne un lien de contribution : écrit pour CE groupe et
 * CET événement. Le responsable peut le retoucher avant de l'envoyer ;
 * WhatsApp, le SMS, le mail, la feuille de partage de l'iPhone et « Copier le
 * message » partent du même texte. Module PUR : aucun accès base, aucun réseau.
 *
 * 28/10 (demande de Mathias avant la vraie responsable d'Audencia : « le lien
 * copié par message peut être beaucoup plus simple ») : DEUX lignes avant le
 * lien, plus de salut au nom du groupe (« Bonjour Bateau 8, » sonnait faux) :
 *   1. l'événement, puis le groupe après « · » (« Les Mousses · Bateau 1 ») ;
 *      un lien sans nom ne dit que l'événement ;
 *   2. le geste et la date limite (« Dépose tes photos ici, jusqu'au 16
 *      novembre. ») ; sans clôture, « Dépose tes photos ici. » ;
 * puis une ligne vide et le lien SEUL (il se touche et se copie sans le texte).
 * Le nombre de photos et « sans compte » ne s'écrivent plus : la page de dépôt
 * les dit avant le choix des photos. Le lien est l'adresse COURTE `/l/<clé>`
 * (`liens.ts`, `lienCourt`). L'espace avant « · » est INSÉCABLE (U+00A0) : le
 * point ne passe jamais seul en début de ligne. L'ancien message (trois
 * paragraphes, planche 4 du 21/10) est dans `archive/partage-message-court-2026-10/`.
 *
 * Un lien nommé tutoie dans le registre « tu » (école) ; un lien sans nom
 * vouvoie. Le lien général (« Tous les participants ») ne se partage plus
 * depuis le 21/10 (planche 5) : la règle reste pour un texte qui le nommerait.
 */

export type Partage = {
  /** Le nom du lien (« Équipe Lyon »), `null` pour un lien sans nom. */
  groupe: string | null;
  /** L'organisation : plus écrite dans le message depuis le 28/10 (l'aperçu du lien et la page de dépôt la portent). */
  organisation: string;
  evenement: string;
  url: string;
  /** Le plafond du lien, tel que `libellePlafondLien` l'écrit : plus écrit dans le message depuis le 28/10 (la page de dépôt le dit). */
  plafond: string | null;
  /** Le jour de clôture déjà écrit (« 28 octobre »), vide s'il n'y en a pas. */
  cloture: string;
  tu: boolean;
};

/**
 * Le nom du lien général des participants : l'adresse de BASE `/depot/<token_depot>`,
 * dont dépendent tous les liens de groupe (`…?p=<clé>`, et leur adresse courte `/l/<clé>`).
 * Depuis le 21/10 (planche 5), il n'est plus jamais montré ni envoyé ; il continue de
 * recevoir des photos (un lien déjà partagé ne perd jamais une photo). Le nom reste
 * RÉSERVÉ (`NOMS_RESERVES`).
 */
export const GROUPE_GENERAL = "Tous les participants";

/**
 * Le nom sous lequel l'espace montre les photos arrivées par l'adresse de base (planche 5,
 * 21/10) : en lecture seule, sans « Partager » ni QR, et seulement s'il y en a. Réservé lui
 * aussi : un groupe de ce nom se confondrait avec elles.
 */
export const GROUPE_SANS_GROUPE = "Sans groupe";

/** Les trois noms que l'état vide de « Les liens » propose pour commencer (planche 5B) ; aussi l'exemple de « Créer un lien ». */
export const NOMS_POUR_COMMENCER = ["Bateau 1", "Équipe Lyon", "Le photographe"] as const;

/** L'espace insécable avant « · ». */
const INSECABLE = " ";

export function messagePartage(p: Partage): { texte: string; objet: string } {
  const nom = p.groupe?.trim() ?? "";
  const general = !nom || nom === GROUPE_GENERAL || nom === GROUPE_SANS_GROUPE;
  const tu = p.tu && !general;
  const evenement = p.evenement.trim();
  /* 1. L'événement, puis le groupe. */
  const titre = general ? evenement : `${evenement}${INSECABLE}· ${nom}`;
  /* 2. Le geste et la date limite. */
  const quand = p.cloture ? `, jusqu'au ${p.cloture}` : "";
  const geste = `${tu ? "Dépose tes photos ici" : "Déposez vos photos ici"}${quand}.`;
  /* Le lien seul, après une ligne vide. */
  const texte = [titre, geste, "", p.url].join("\n");
  return { texte, objet: `${tu ? "Tes" : "Vos"} photos : ${evenement}` };
}
