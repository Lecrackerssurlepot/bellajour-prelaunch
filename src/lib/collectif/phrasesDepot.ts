/**
 * Ce que la page de dépôt DIT au participant : une seule source (planche « souche », 27/10).
 * Module PUR. Avant, la carte d'arrivée et l'album composaient chacun leurs phrases et se
 * contredisaient : « 3 photos non arrivées » ET « vous pouvez encore en envoyer 51 ».
 *
 * La règle : une photo déclarée qui n'est jamais arrivée réserve sa place deux heures
 * (`compteDansPlafond`, décision 2A du 26/10, tenue par le serveur et le harnais). Tant qu'il y en
 * a, la page ne dit donc QU'UN chiffre, celui des photos à reprendre ; la place restante revient
 * dès que plus rien n'est coupé. « Reprendre » les renvoie sur leur ligne : rien ne compte deux fois.
 */

import { phraseCoupees, phrasePlace } from "./depotParticipant";

/** UNE ligne sur ce qui reste à faire : les photos à reprendre, sinon la place restante. */
export function ligneReste(coupees: number, place: number | null | undefined, tu: boolean): string {
  return phraseCoupees(coupees) ?? phrasePlace(place, tu);
}

/** En dessous, le reste du total d'une édition vaut la peine d'être dit à quelqu'un qui n'a pas de plafond. */
export const SEUIL_RESTE_UTILE = 50;

/** Le seul libellé de « ce n'est pas moi », sur la carte comme dans l'album. */
export function libellePasMoi(tu: boolean): string {
  return tu ? "Ce n'est pas toi ?" : "Ce n'est pas vous ?";
}

/** « 2 photos déjà sur « Bateau 1 ». » : ce qui est sur CE lien, sans la place (dite une fois, au pied du bouton). */
export function phraseDejaSurLien(surCeLien: number, lien: string | null): string {
  const n = Math.max(0, Math.floor(surCeLien));
  if (!n) return "";
  return `${n} photo${n > 1 ? "s" : ""} déjà ${lien ? `sur « ${lien} »` : "dans l'album"}.`;
}

/**
 * Ce que la carte d'arrivée dit de la limite, en UN seul chiffre. Des photos à reprendre : rien
 * ici (le bouton « Reprendre » et leur note le disent). Une personne reconnue : sa place restante.
 * Sinon : le plafond du lien.
 */
export function limiteDeCarte(o: { coupees: number; reconnu: boolean; place: number | null | undefined; plafond: number | null; sansPlafond: boolean; tu: boolean }): string {
  if (o.coupees > 0) return "";
  /* Un lien « sans limite » n'a pas de plafond par personne : le reste du TOTAL de l'édition (995) ne se dit que s'il devient petit. */
  if (o.reconnu && o.place !== undefined) return o.sansPlafond && typeof o.place === "number" && o.place >= SEUIL_RESTE_UTILE ? "sans limite" : phrasePlace(o.place, o.tu);
  return o.sansPlafond ? "sans limite" : o.plafond ? `${o.plafond} max` : "";
}

/** Le pied de la carte d'arrivée : « Photos seulement · 60 max · jusqu'au 15 novembre ». */
export function piedDeCarte(photosSeulement: string, limite: string, cloture: string): string {
  return [photosSeulement, limite, cloture ? `jusqu'au ${cloture}` : ""].filter(Boolean).join(" · ");
}

/** Le champ manquant à signaler au clic sur le bouton, dans l'ordre de la page. */
export type ChampManquant = "email" | "prenom" | "nom" | "accord";

export function messageManquant(champ: ChampManquant, tu: boolean): string {
  switch (champ) {
    case "email":
      return "Email requis.";
    case "prenom":
      return "Prénom requis.";
    case "nom":
      return "Nom requis.";
    case "accord":
      return tu ? "Coche l'accord." : "Cochez l'accord.";
  }
}
