/**
 * Parler à l'atelier et suivre la livraison (PRD §4.2, phase 6).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'ON NE PROMET PAS (PRD §0.5)
 * - Pas de suivi en direct : aucune API transporteur. Le client voit le
 *   transporteur, le numéro, et un bouton vers le site du transporteur quand
 *   on sait en construire l'adresse (`suivi.ts`, jamais un lien approximatif).
 *   Les étapes sont posées par l'atelier, par ses gestes.
 * - Pas de grille de créneaux : le rendez-vous est le lien Google de la fiche.
 * - Une proposition complémentaire est un DOCUMENT posé par l'atelier ; son
 *   contenu et son montant viennent de lui. « Accepter » journalise et prévient
 *   l'atelier : aucun paiement, aucun montant dans le code.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { atteint, type EtatEdition } from "./etats";

/* ─────────────────────────── demander une modification ─────────────────────────── */

/** Les motifs de la maquette RendezVous. Une liste, pas un enum en base : le motif part en texte. */
export const MOTIFS_MODIFICATION = [
  { cle: "pages", libelle: "Ajouter des pages" },
  { cle: "exemplaires", libelle: "Ajouter des exemplaires" },
  { cle: "equipe", libelle: "Une couverture par équipe" },
  { cle: "style", libelle: "Changer de style" },
  { cle: "autre", libelle: "Autre chose" },
] as const;
export type MotifModification = (typeof MOTIFS_MODIFICATION)[number]["cle"];

/** On demande une modification tant que le bon à tirer n'est pas validé : après, le magazine part. */
export function demandePossible(etat: EtatEdition): boolean {
  return !atteint(etat, "bat_valide");
}

export type Demande = { ok: true; motif: MotifModification; libelle: string; texte: string } | { ok: false; message: string };

export function lireDemande(corps: Record<string, unknown>): Demande {
  const m = MOTIFS_MODIFICATION.find((x) => x.cle === corps.motif);
  if (!m) return { ok: false, message: "Choisir ce que vous voulez changer." };
  const texte = typeof corps.texte === "string" ? corps.texte.trim().slice(0, 2000) : "";
  if (m.cle === "autre" && !texte) return { ok: false, message: "Dire en quelques mots ce que vous voulez changer." };
  return { ok: true, motif: m.cle, libelle: m.libelle, texte };
}

const PREFIXE_DEMANDE = "Demande de modification · ";

/** Le message qui part dans la messagerie : l'atelier le lit là où il lit tout le reste. */
export function messageDemande(d: { libelle: string; texte: string }): string {
  return d.texte ? `${PREFIXE_DEMANDE}${d.libelle}\n${d.texte}` : `${PREFIXE_DEMANDE}${d.libelle}`;
}

/**
 * Le chemin inverse (révision §14.5) : un message du client qui EST une
 * demande devient une carte dans le fil. Seul un motif de la liste compte :
 * un client qui écrirait la même phrase à la main reste un message.
 */
export function lireMessageDemande(texte: string): { motif: string; precision: string } | null {
  if (!texte.startsWith(PREFIXE_DEMANDE)) return null;
  const [ligne, ...reste] = texte.slice(PREFIXE_DEMANDE.length).split("\n");
  const motif = MOTIFS_MODIFICATION.find((m) => m.libelle === ligne.trim());
  return motif ? { motif: motif.libelle, precision: reste.join("\n").trim() } : null;
}

/** « Vos demandes » : les demandes du client, lues dans le fil (une demande = un message). */
export function demandesDuFil(messages: readonly { auteur: string; texte: string; created_at: string }[]): { motif: string; quand: string }[] {
  return messages
    .filter((m) => m.auteur === "client")
    .map((m) => ({ d: lireMessageDemande(m.texte), quand: m.created_at }))
    .filter((x): x is { d: { motif: string; precision: string }; quand: string } => x.d !== null)
    .map((x) => ({ motif: x.d.motif, quand: x.quand }));
}

/** Les deux réponses possibles à une proposition complémentaire. */
export function messageProposition(reponse: "accepter" | "reparler", libelle: string): string {
  return reponse === "accepter"
    ? `J'accepte la proposition complémentaire « ${libelle} ».`
    : `Je souhaite reparler de la proposition complémentaire « ${libelle} ».`;
}

/* ─────────────────────────── la livraison ─────────────────────────── */

/** Ce que l'atelier règle à la main : l'adresse, et le jour prévu s'il le connaît. */
export type SaisieLivraison = { ok: true; adresse: string | null; prevue_le: string | null } | { ok: false; message: string };

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Un jour du calendrier `AAAA-MM-JJ`, qui existe (pas de 31 juin). */
export function estJour(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = JOUR.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function lireSaisieLivraison(corps: Record<string, unknown>): SaisieLivraison {
  const adresse = typeof corps.adresse === "string" ? corps.adresse.replace(/\r\n/g, "\n").trim().slice(0, 600) : "";
  const brut = typeof corps.prevue_le === "string" ? corps.prevue_le.trim() : "";
  if (brut && !estJour(brut)) return { ok: false, message: "Jour de livraison illisible." };
  return { ok: true, adresse: adresse || null, prevue_le: brut || null };
}

/** « jeudi 29 octobre 2026 » : un jour du calendrier, lu sans fuseau (il n'a pas d'heure). */
export function formaterJour(jour: string | null | undefined): string {
  if (!estJour(jour)) return "";
  const [a, m, j] = jour.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, j))
  );
}

export const ETAPES_LIVRAISON = [
  { cle: "bat_valide", libelle: "Bon à tirer validé" },
  { cle: "impression", libelle: "Impression" },
  { cle: "expediee", libelle: "Remis au transporteur" },
  { cle: "livree", libelle: "Livré" },
] as const satisfies readonly { cle: EtatEdition; libelle: string }[];

export type EtapeLivraison = { cle: EtatEdition; libelle: string; faite: boolean; courante: boolean; quand: string | null };

/**
 * Les quatre étapes vues par le client, chacune avec sa date quand on la
 * connaît (lue dans la base, jamais estimée). La courante est la dernière
 * atteinte : il n'y a pas d'« en transit » sans API transporteur.
 */
export function etapesLivraison(etat: EtatEdition, quand: Partial<Record<EtatEdition, string | null>>): EtapeLivraison[] {
  const atteintes = ETAPES_LIVRAISON.filter((e) => atteint(etat, e.cle));
  const derniere = atteintes[atteintes.length - 1]?.cle ?? null;
  return ETAPES_LIVRAISON.map((e) => ({
    cle: e.cle,
    libelle: e.libelle,
    faite: atteint(etat, e.cle),
    courante: e.cle === derniere,
    quand: atteint(etat, e.cle) ? quand[e.cle] ?? null : null,
  }));
}

/** Le titre de la page, selon l'étape. */
export function titreLivraison(etat: EtatEdition): string {
  if (atteint(etat, "livree")) return "Votre magazine est arrivé.";
  if (atteint(etat, "expediee")) return "Votre magazine arrive.";
  if (atteint(etat, "impression")) return "Votre magazine est à l'impression.";
  return "Votre bon à tirer est validé.";
}
