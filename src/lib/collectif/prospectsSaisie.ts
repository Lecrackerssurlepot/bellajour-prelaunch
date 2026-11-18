/**
 * La demande de rendez-vous d'un prospect, sur /partenaires (18/11/2026).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Lu par la route (qui ne croit jamais le navigateur) ET par l'écran (qui dit
 * ce qui manque avant d'envoyer).
 */

export const PROSPECT_NOM_MAX = 80;
export const PROSPECT_ORGANISATION_MAX = 120;
export const PROSPECT_MESSAGE_MAX = 500;

export type DemandeProspect = { nom: string; organisation: string; email: string; telephone: string | null; message: string | null };
export type ChampProspect = "nom" | "organisation" | "email" | "telephone";
export type LectureProspect = { ok: true; demande: DemandeProspect } | { ok: false; champ: ChampProspect; message: string };

const propre = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function lireDemandeProspect(corps: Record<string, unknown>): LectureProspect {
  const nom = propre(corps.nom, PROSPECT_NOM_MAX);
  if (nom.length < 2) return { ok: false, champ: "nom", message: "Votre nom." };
  const organisation = propre(corps.organisation, PROSPECT_ORGANISATION_MAX);
  if (organisation.length < 2) return { ok: false, champ: "organisation", message: "Votre école, association ou entreprise." };
  const email = propre(corps.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, champ: "email", message: "Une adresse e-mail valide : l'invitation y arrive." };
  const telephone = propre(corps.telephone, 30);
  if (telephone && !/^[+0-9 ().-]{6,30}$/.test(telephone)) return { ok: false, champ: "telephone", message: "Un numéro de téléphone, ou rien." };
  const message = typeof corps.message === "string" ? corps.message.replace(/[ \t]+/g, " ").trim().slice(0, PROSPECT_MESSAGE_MAX) : "";
  return { ok: true, demande: { nom, organisation, email, telephone: telephone || null, message: message || null } };
}
