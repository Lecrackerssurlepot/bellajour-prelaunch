/**
 * La demande de rendez-vous d'un prospect, sur /partenaires (18/11/2026).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Lu par la route (qui ne croit jamais le navigateur) ET par l'écran (qui dit
 * ce qui manque avant d'envoyer).
 */

export const PROSPECT_NOM_MAX = 80;
export const PROSPECT_ORGANISATION_MAX = 120;
export const PROSPECT_MESSAGE_MAX = 500;
export const PROSPECT_PARTICIPANTS_MAX = 100000;

/**
 * L'événement : sa date de DÉBUT et de FIN (AAAA-MM-JJ, la fin peut être le
 * même jour) et le nombre de participants. Les trois servent à la préparation
 * de l'appel (demande de Mathias, 19/11).
 */
export type DemandeProspect = {
  nom: string;
  organisation: string;
  email: string;
  telephone: string;
  evenement_debut: string;
  evenement_fin: string;
  participants: number;
  message: string | null;
};
export type ChampProspect = "nom" | "organisation" | "email" | "telephone" | "evenement_debut" | "evenement_fin" | "participants";
export type LectureProspect = { ok: true; demande: DemandeProspect } | { ok: false; champ: ChampProspect; message: string };

/** Un jour réel du calendrier au format AAAA-MM-JJ, sinon null (2027-02-30 est refusé). */
export function jourValide(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return null;
  const j = v.trim();
  const d = new Date(`${j}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === j ? j : null;
}

const propre = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function lireDemandeProspect(corps: Record<string, unknown>): LectureProspect {
  const nom = propre(corps.nom, PROSPECT_NOM_MAX);
  if (nom.length < 2) return { ok: false, champ: "nom", message: "Votre nom." };
  const organisation = propre(corps.organisation, PROSPECT_ORGANISATION_MAX);
  if (organisation.length < 2) return { ok: false, champ: "organisation", message: "Votre école, association ou entreprise." };
  const email = propre(corps.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, champ: "email", message: "Une adresse e-mail valide : l'invitation y arrive." };
  const telephone = propre(corps.telephone, 30);
  if (!/^[+0-9 ().-]{6,30}$/.test(telephone) || telephone.replace(/\D/g, "").length < 6) return { ok: false, champ: "telephone", message: "Un numéro de téléphone." };
  const evenement_debut = jourValide(corps.evenement_debut);
  if (!evenement_debut || evenement_debut < "2020-01-01" || evenement_debut > "2035-12-31") return { ok: false, champ: "evenement_debut", message: "Le premier jour de l'événement." };
  const evenement_fin = jourValide(corps.evenement_fin);
  if (!evenement_fin || evenement_fin > "2035-12-31") return { ok: false, champ: "evenement_fin", message: "Le dernier jour de l'événement." };
  if (evenement_fin < evenement_debut) return { ok: false, champ: "evenement_fin", message: "La fin vient après le début." };
  const brut = typeof corps.participants === "number" ? String(corps.participants) : propre(corps.participants, 12).replace(/[\s.]/g, "");
  const participants = /^[0-9]{1,6}$/.test(brut) ? Number(brut) : NaN;
  if (!Number.isInteger(participants) || participants < 1 || participants > PROSPECT_PARTICIPANTS_MAX) {
    return { ok: false, champ: "participants", message: "Le nombre de participants, environ." };
  }
  const message = typeof corps.message === "string" ? corps.message.replace(/[ \t]+/g, " ").trim().slice(0, PROSPECT_MESSAGE_MAX) : "";
  return { ok: true, demande: { nom, organisation, email, telephone, evenement_debut, evenement_fin, participants, message: message || null } };
}

/** « du 12 au 15 avril 2027 », « le 12 avril 2027 », « du 30 avril au 2 mai 2027 ». PUR. */
export function periodeEvenement(debut: string, fin: string): string {
  const d = new Date(`${debut}T00:00:00Z`);
  const f = new Date(`${fin}T00:00:00Z`);
  const fmt = (x: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...o }).format(x);
  const complet = (x: Date) => fmt(x, { day: "numeric", month: "long", year: "numeric" }).replace(/^1 /, "1er ");
  if (debut === fin) return `le ${complet(d)}`;
  const memeAn = d.getUTCFullYear() === f.getUTCFullYear();
  const memeMois = memeAn && d.getUTCMonth() === f.getUTCMonth();
  const tete = memeMois ? fmt(d, { day: "numeric" }) : memeAn ? fmt(d, { day: "numeric", month: "long" }) : complet(d);
  return `du ${tete.replace(/^1( |$)/, "1er$1")} au ${complet(f)}`;
}
