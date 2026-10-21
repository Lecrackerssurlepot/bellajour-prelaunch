/**
 * Le message qui accompagne un lien de contribution (retours du 14/10, point
 * 5, maquette Partage validée) : écrit pour CE groupe et CET événement, au nom
 * de l'organisation. Le responsable peut le retoucher avant de l'envoyer ;
 * WhatsApp, le mail et « Copier le message » partent du même texte.
 * Module PUR : aucun accès base, aucun réseau.
 *
 * Le lien général (« Tous les participants ») et tout lien sans nom saluent
 * « à tous » et vouvoient (un groupe) ; un lien nommé salue son groupe, et
 * tutoie dans le registre « tu » (école).
 */

export type Partage = {
  /** Le nom du lien (« Équipe Lyon »), `null` pour le lien général. */
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

export const GROUPE_GENERAL = "Tous les participants";

/** « Le photographe » → « le photographe » après « Bonjour » ; un nom propre ne bouge pas. */
function apresBonjour(groupe: string): string {
  return /^(Le|La|Les)\s|^L['’]/.test(groupe) ? groupe.charAt(0).toLowerCase() + groupe.slice(1) : groupe;
}

export function messagePartage(p: Partage): { texte: string; objet: string } {
  const nom = p.groupe?.trim() ?? "";
  const general = !nom || nom === GROUPE_GENERAL;
  const tu = p.tu && !general;
  const precisions: string[] = [];
  const n = /^(\d+) photos? par personne$/.exec(p.plafond ?? "");
  if (n) precisions.push(`${n[1]} par personne`);
  if (p.cloture) precisions.push(`jusqu'au ${p.cloture}`);
  const precision = precisions.length ? ` (${precisions.join(", ")})` : "";
  const organisation = p.organisation.trim();
  const evenement = p.evenement.trim();
  const qui = organisation ? `${organisation} prépare` : "Nous préparons";
  const corps = tu
    ? `${qui} le magazine « ${evenement} », et tes photos y ont leur place. Dépose-les ici, depuis ton téléphone, sans compte${precision} :`
    : `${qui} le magazine « ${evenement} », et vos photos y ont leur place. Déposez-les ici, depuis votre téléphone, sans compte${precision} :`;
  const texte = [general ? "Bonjour à tous," : `Bonjour ${apresBonjour(nom)},`, "", corps, p.url, "", "Merci, et à très vite dans les pages !"].join("\n");
  return { texte, objet: `${tu ? "Tes" : "Vos"} photos : ${evenement}` };
}
