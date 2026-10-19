/**
 * Ce que l'espace client montre de son édition (PRD §4) : les étapes, le
 * temps qui reste, qui regarde, ce qui reste à envoyer.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 */

import type { EtatEdition } from "./etats";
import { CONTENUS, type CleContenu, type Registre, type Role } from "./types";

/**
 * Les étapes que le CLIENT traverse, sans numéro « N sur M ».
 *
 * Les maquettes se contredisent (« sur 6 » côté client, « sur 7 » côté
 * atelier : PRD §12.11). Plutôt que de trancher un chiffre à la place de
 * Mathias, l'écran montre les étapes par leur nom, la courante soulignée.
 * Les deux qui précèdent l'espace (devis, signature) n'y figurent pas : le
 * client qui lit cette page les a déjà faites.
 */
export const ETAPES_CLIENT = [
  { cle: "preparation", libelle: "Style et photos" },
  { cle: "composition", libelle: "Composition" },
  { cle: "bat", libelle: "Bon à tirer" },
  { cle: "impression", libelle: "Impression" },
  { cle: "livraison", libelle: "Livraison" },
] as const;
export type CleEtapeClient = (typeof ETAPES_CLIENT)[number]["cle"];

const ETAPE_DE: Record<EtatEdition, CleEtapeClient> = {
  preparation: "preparation",
  composition: "composition",
  bat: "bat",
  bat_valide: "impression",
  impression: "impression",
  expediee: "livraison",
  livree: "livraison",
};

/** L'index de l'étape courante dans `ETAPES_CLIENT`, pour un état EFFECTIF. */
export function etapeClient(etat: EtatEdition): number {
  return ETAPES_CLIENT.findIndex((e) => e.cle === ETAPE_DE[etat]);
}

/**
 * Combien de jours CALENDAIRES avant une date (0 = aujourd'hui, négatif =
 * passée), comptés à l'heure de Paris : « dans 1 jour » doit vouloir dire
 * demain pour le client, pas « dans 24 h ».
 */
export function joursAvant(iso: string | null, maintenant: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const jour = (d: Date) => {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    return Date.parse(`${p}T00:00:00Z`);
  };
  return Math.round((jour(new Date(t)) - jour(maintenant)) / 86_400_000);
}

/** « dans 3 jours », « demain », « aujourd'hui », « passée » : jamais un chiffre faux. */
export function phraseJours(n: number | null): string {
  if (n === null) return "";
  if (n < 0) return "date passée";
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  return `dans ${n} jours`;
}

/** Les initiales d'un nom, pour l'avatar du menu. « ? » si rien de lisible. */
export function initiales(nom: string | null): string {
  /* Seuls les mots qui commencent par une lettre : « Mathias (essai) » donne
     « MA », pas « M( ». */
  const mots = (nom ?? "").trim().split(/\s+/).filter((m) => /^\p{L}/u.test(m));
  if (!mots.length) return "?";
  const lettres = mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[mots.length - 1][0];
  return lettres.toUpperCase();
}

/** La ligne sous le nom, dans le menu. Masculin générique (T-117). */
export function libelleRole(role: Exclude<Role, "atelier" | "participant">): string {
  return role === "responsable" ? "Responsable du BAT" : "Équipe · lecture seule";
}

/**
 * « Partager avec mon équipe » (T-187) : le lien d'équipe ne se montre qu'au
 * RESPONSABLE, y compris sur un appareil pas encore reconnu (T-154 : il lit
 * comme l'équipe mais tient le lien du responsable, qui donne plus que celui
 * qu'il partage). L'équipe l'a déjà ; un participant ne voit jamais l'espace.
 */
export function voitLienEquipe(role: Role, appareilInconnu: boolean): boolean {
  return role === "responsable" || (role === "equipe" && appareilInconnu);
}

/** Vous ou tu, selon le registre de l'édition. */
export function parler(registre: Registre) {
  const tu = registre === "ecole_tu";
  return <T>(vous: T, toi: T): T => (tu ? toi : vous);
}

export type ContenuAEnvoyer = { cle: CleContenu; libelle: string; recu: boolean };

/** Les contenus demandés par l'atelier, chacun avec « reçu » ou non, dans l'ordre de la fiche. */
export function contenusAEnvoyer(demandes: readonly string[], recus: readonly string[]): ContenuAEnvoyer[] {
  return CONTENUS.filter((c) => demandes.includes(c.cle)).map((c) => ({
    cle: c.cle,
    libelle: c.libelle,
    recu: recus.includes(c.cle),
  }));
}

/** « de SKEMA », « d'Air France » : l'élision devant une voyelle (le h, muet ou non, garde « de »). */
export function deNom(nom: string): string {
  const n = nom.trim();
  return /^[aeiouyàâäéèêëîïôöûùü]/i.test(n) ? `d'${n}` : `de ${n}`;
}

/**
 * Le message que l'atelier reçoit quand le responsable termine la collecte (D25, T-182) :
 * il arrive dans la boîte de réception comme tout message du client (compteur de non-lus
 * compris). Les nombres sont ceux de la base au moment du geste, jamais estimés.
 */
export function messageFinCollecte(photos: number, selection: number): string {
  const n = (x: number) => x.toLocaleString("fr-FR");
  const choix = selection > 0 ? `, dont ${n(selection)} dans la sélection` : "";
  return `Collecte terminée : toutes les photos sont là (${n(photos)} photo${photos > 1 ? "s" : ""}${choix}). L'atelier peut commencer.`;
}
