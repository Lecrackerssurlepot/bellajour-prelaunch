/**
 * Le message qui accompagne un lien de contribution (retours du 14/10, point
 * 5, maquette Partage validée) : écrit pour CE groupe et CET événement, au nom
 * de l'organisation. Le responsable peut le retoucher avant de l'envoyer ;
 * WhatsApp, le SMS, le mail et « Copier le message » partent du même texte.
 * Module PUR : aucun accès base, aucun réseau.
 *
 * Planche 4 du 21/10 (validée par Mathias) : de l'air, et le lien seul. Le
 * même salut, puis TROIS courts paragraphes séparés par une ligne vide :
 *   1. l'invitation (« Audencia prépare le magazine « Week-end en mer » : vos
 *      photos y ont leur place. ») ;
 *   2. la date limite et le nombre de photos, dans leur propre phrase, plus
 *      jamais entre parenthèses ;
 *   3. le lien, SEUL sur sa ligne, une ligne vide avant et après : il se voit,
 *      se touche et se copie sans toucher au texte ;
 * puis « Merci, et à très vite dans les pages ! ». Les guillemets français et
 * le « ! » prennent une espace INSÉCABLE (U+00A0) : avant, le « s'isolait en
 * fin de ligne et le « ! » passait seul à la ligne. Pas de lien court ni
 * d'image d'aperçu (plus tard).
 *
 * Un lien nommé salue son groupe (« Bonjour Bateau 1, », le nom rassure le
 * participant : c'est son lien) et tutoie dans le registre « tu » (école). Un
 * lien sans nom salue « à tous » et vouvoie. Le lien général (« Tous les
 * participants ») ne se partage plus depuis le 21/10 (planche 5) : la règle
 * reste pour un texte qui le nommerait encore.
 */

export type Partage = {
  /** Le nom du lien (« Équipe Lyon »), `null` pour un lien sans nom. */
  groupe: string | null;
  organisation: string;
  evenement: string;
  url: string;
  /** Le plafond du lien, tel que `libellePlafondLien` l'écrit (« 30 photos par personne », « Sans limite »). */
  plafond: string | null;
  /** Le jour de clôture déjà écrit (« 28 octobre »), vide s'il n'y en a pas. */
  cloture: string;
  tu: boolean;
};

/**
 * Le nom du lien général des participants : l'adresse de BASE `/depot/<token_depot>`,
 * dont dépendent tous les liens de groupe (`…?p=<clé>`). Depuis le 21/10 (planche 5),
 * il n'est plus jamais montré ni envoyé ; il continue de recevoir des photos (un lien
 * déjà partagé ne perd jamais une photo). Le nom reste RÉSERVÉ (`NOMS_RESERVES`).
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

/** L'espace insécable des guillemets français et du « ! ». */
const INSECABLE = " ";

/** « Le photographe » → « le photographe » après « Bonjour » ; un nom propre ne bouge pas. */
function apresBonjour(groupe: string): string {
  return /^(Le|La|Les)\s|^L['’]/.test(groupe) ? groupe.charAt(0).toLowerCase() + groupe.slice(1) : groupe;
}

export function messagePartage(p: Partage): { texte: string; objet: string } {
  const nom = p.groupe?.trim() ?? "";
  const general = !nom || nom === GROUPE_GENERAL || nom === GROUPE_SANS_GROUPE;
  const tu = p.tu && !general;
  const organisation = p.organisation.trim();
  const evenement = p.evenement.trim();
  const qui = organisation ? `${organisation} prépare` : "Nous préparons";
  /* 1. L'invitation. */
  const invitation = `${qui} le magazine «${INSECABLE}${evenement}${INSECABLE}»${INSECABLE}: ${tu ? "tes" : "vos"} photos y ont leur place.`;
  /* 2. La date limite, puis le nombre de photos (« Sans limite » : la phrase du nombre disparaît). */
  const nombre = /^\d+ photos? par personne$/.test(p.plafond ?? "") ? ` ${p.plafond}.` : "";
  const quand = p.cloture ? `, jusqu'au ${p.cloture}` : "";
  const depot = `${tu ? "Dépose-les depuis ton téléphone" : "Déposez-les depuis votre téléphone"}, sans compte${quand}.${nombre}`;
  const salut = general ? "Bonjour à tous," : `Bonjour ${apresBonjour(nom)},`;
  /* 3. Le lien seul sur sa ligne, une ligne vide avant et après. */
  const texte = [salut, "", invitation, "", depot, "", p.url, "", `Merci, et à très vite dans les pages${INSECABLE}!`].join("\n");
  return { texte, objet: `${tu ? "Tes" : "Vos"} photos : ${evenement}` };
}
