/* La boîte de réception de l'atelier (T-152, maquette « Atelier, la
   messagerie ») : les conversations avec les clients des éditions, ce qui
   est À TRAITER aujourd'hui. Pur : aucune base, aucun réseau.

   Règles :
   - une conversation par édition NON archivée ; celles qui attendent une
     lecture d'abord, puis la plus récente ; une édition sans message à la
     fin (on peut écrire le premier) ;
   - l'aperçu d'une conversation ne MARQUE RIEN : seul l'ouvrir marque lu
     (l'effet de `useMessagerie`, jamais un rendu) ;
   - « à traiter » : une demande de modification non lue se dit comme telle,
     sinon le nombre de messages à lire ; les rendez-vous du jour (heure de
     Paris) suivent. Rien d'inventé. */

import { formaterHeureParis, formaterJourParis } from "./dates";
import { lireMessageDemande } from "./livraison";
import { extraitDe } from "./messages";

export type MessageBoite = { edition_id: string; auteur: "client" | "atelier"; texte: string; created_at: string; lu_atelier_le: string | null };
export type EditionBoite = { id: string; organisation: string; evenement: string; created_at: string };

export type Conversation = {
  id: string;
  organisation: string;
  evenement: string;
  initiales: string;
  /** L'aperçu du dernier message (« Vous : … » quand c'est l'atelier). */
  apercu: string | null;
  /** « 10 h 05 », « hier », « lun. », « 12 oct. ». */
  quand: string | null;
  dernierLe: string | null;
  nonLus: number;
  demandeNonLue: boolean;
};

/** « MA » pour Maison Aubier, « LJ » pour Lycée Jean Moulin. */
export function initialesDe(nom: string): string {
  const mots = nom
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/[\s'-]+/)
    .filter((m) => m && !/^(de|du|des|la|le|les|l|d|et)$/i.test(m));
  const lettres = (mots.length >= 2 ? [mots[0], mots[1]] : [mots[0] ?? "?"]).map((m) => m.charAt(0));
  return (mots.length === 1 ? mots[0].slice(0, 2) : lettres.join("")).toUpperCase();
}

const JOUR_CLE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const JOUR_SEMAINE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short" });
const JOUR_MOIS_COURT = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });

/** Le jour de Paris d'un instant, « 2026-10-14 ». */
export function jourParis(ms: number): string {
  return JOUR_CLE.format(new Date(ms));
}

/** Quand, en court : l'heure aujourd'hui, « hier », le jour de la semaine sous six jours, sinon la date. */
export function quandCourt(iso: string, maintenant: Date): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const jour = jourParis(ms);
  if (jour === jourParis(maintenant.getTime())) return formaterHeureParis(iso);
  if (jour === jourParis(maintenant.getTime() - 86_400_000)) return "hier";
  if (maintenant.getTime() - ms < 6 * 86_400_000) return JOUR_SEMAINE.format(new Date(ms));
  return JOUR_MOIS_COURT.format(new Date(ms));
}

/** Les conversations, triées : à lire d'abord, puis la plus récente ; sans message à la fin. */
export function conversationsDe(editions: readonly EditionBoite[], messages: readonly MessageBoite[], maintenant: Date): Conversation[] {
  const parEdition = new Map<string, MessageBoite[]>();
  for (const m of messages) parEdition.set(m.edition_id, [...(parEdition.get(m.edition_id) ?? []), m]);
  const liste = editions.map((e): Conversation => {
    const fil = [...(parEdition.get(e.id) ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const dernier = fil[0] ?? null;
    const aLire = fil.filter((m) => m.auteur === "client" && !m.lu_atelier_le);
    const demande = dernier ? lireMessageDemande(dernier.texte) : null;
    return {
      id: e.id,
      organisation: e.organisation,
      evenement: e.evenement,
      initiales: initialesDe(e.organisation),
      apercu: dernier ? `${dernier.auteur === "atelier" ? "Vous : " : ""}${demande ? `Demande : ${demande.motif}` : extraitDe(dernier.texte, 90)}` : null,
      quand: dernier ? quandCourt(dernier.created_at, maintenant) : null,
      dernierLe: dernier?.created_at ?? null,
      nonLus: aLire.length,
      demandeNonLue: aLire.some((m) => lireMessageDemande(m.texte) !== null),
    };
  });
  return liste.sort((a, b) => {
    if (Boolean(a.nonLus) !== Boolean(b.nonLus)) return a.nonLus ? -1 : 1;
    if (Boolean(a.dernierLe) !== Boolean(b.dernierLe)) return a.dernierLe ? -1 : 1;
    return (b.dernierLe ?? "").localeCompare(a.dernierLe ?? "");
  });
}

export type RdvBoite = { edition_id: string; debut: string; avec: string };

/** Une ligne de « À traiter aujourd'hui ». `genre` : la liste retire la conversation OUVERTE (elle est lue), jamais son rendez-vous (T-188). */
export type ATraiter = { editionId: string; texte: string; genre: "message" | "rdv" };

/** Ce qui est à traiter aujourd'hui : les demandes et messages à lire, puis les rendez-vous du jour. */
export function aTraiter(conversations: readonly Conversation[], rdvs: readonly RdvBoite[], maintenant: Date): ATraiter[] {
  const lignes: ATraiter[] = conversations
    .filter((c) => c.nonLus)
    .map((c) => ({
      editionId: c.id,
      genre: "message" as const,
      texte: c.demandeNonLue
        ? `${c.organisation} : une demande de modification`
        : `${c.organisation} : ${c.nonLus} message${c.nonLus > 1 ? "s" : ""} à lire`,
    }));
  const aujourdhui = jourParis(maintenant.getTime());
  const noms = new Map(conversations.map((c) => [c.id, c.organisation]));
  for (const r of [...rdvs].sort((a, b) => a.debut.localeCompare(b.debut))) {
    if (jourParis(Date.parse(r.debut)) !== aujourdhui || !noms.has(r.edition_id)) continue;
    lignes.push({ editionId: r.edition_id, genre: "rdv", texte: `Rendez-vous à ${formaterHeureParis(r.debut)} avec ${noms.get(r.edition_id)} (${r.avec})` });
  }
  return lignes;
}

/** La date d'un rendez-vous dans le dossier : « 15 octobre, 10 h 30 ». */
export function quandRdv(iso: string): string {
  return `${formaterJourParis(iso)}, ${formaterHeureParis(iso)}`;
}
