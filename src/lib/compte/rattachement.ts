import type { Etat } from "@/lib/atelier/transitions";
import { etapeDepot, type EtapeDepot } from "@/lib/atelier/urgence";

/**
 * Les règles PURES du compte — qui voit quoi, et comment le dashboard se
 * range. Ni base, ni réseau, ni horloge : que du calcul, testé par le
 * harnais (scripts/verif-atelier.ts).
 *
 * LE RATTACHEMENT EST HYBRIDE, ET L'ORDRE COMPTE :
 * - compte_id = uid — le lien EXPLICITE, posé quand la cliente connectée
 *   visite /numero/<token> ou charge son dashboard. Il survit à un
 *   changement d'adresse et c'est lui qui fait foi.
 * - email_canonical = canon(email du compte) — le rapprochement AUTOMATIQUE,
 *   gratuit, qui exige un email CONFIRMÉ. Sans cette garde, créer un compte
 *   avec l'adresse d'une cliente suffirait à lire ses dossiers : c'est
 *   l'invariant nº2 de src/lib/compte/session.ts, et il ne se négocie pas.
 *
 * L'anonymisation (retention.ts) met email_canonical ET compte_id à null :
 * un dossier refermé disparaît du compte, et c'est voulu — il ne porte plus
 * rien de personnel, il ne doit plus désigner personne.
 */

/** Ce que les règles ont besoin de savoir d'un dossier — jamais plus. */
export type DossierDuCompte = {
  token: string;
  etat: Etat;
  compte_id: string | null;
  email_canonical: string | null;
  consent_photos: boolean | null;
  nb_photos: number;
  etat_maj_le: string | null;
};

export type Regard = {
  /** auth.users.id de la session. */
  uid: string;
  /** canonicalizeEmail(email du compte). */
  canon: string;
  /** email_confirmed_at posé — condition du rapprochement par email. */
  emailConfirme: boolean;
};

/** L'unique règle d'accès : lien explicite, ou email confirmé qui concorde. */
export function peutVoirDossier(d: DossierDuCompte, r: Regard): boolean {
  if (d.compte_id && d.compte_id === r.uid) return true;
  if (!r.emailConfirme) return false;
  return Boolean(d.email_canonical) && d.email_canonical === r.canon;
}

/**
 * Un dossier est « épinglable » quand la cliente le voit par email mais que
 * le lien explicite n'est pas encore posé. L'épinglage est idempotent et
 * best-effort — jamais une raison de faire échouer un rendu.
 */
export function doitEpingler(d: DossierDuCompte, r: Regard): boolean {
  return peutVoirDossier(d, r) && d.compte_id === null;
}

/* ─── Le dashboard : trois sections, dans cet ordre, jamais plus ─── */

export type SectionCompte = "a_terminer" | "en_cours" | "bibliotheque";

/**
 * « À terminer » : le dépôt n'est pas fini et la balle est chez la cliente.
 * Seul photos_recues est concerné — photos_insuffisantes est une demande de
 * l'atelier, elle vit dans « en cours » avec son CTA propre.
 */
export function sectionPour(d: DossierDuCompte): SectionCompte {
  if (d.etat === "livree") return "bibliotheque";
  if (d.etat === "photos_recues" && etapeDepot(d.consent_photos, d.nb_photos) !== "termine") {
    return "a_terminer";
  }
  return "en_cours";
}

export function classerDossiers<T extends DossierDuCompte>(
  dossiers: T[],
): { aTerminer: T[]; enCours: T[]; bibliotheque: T[] } {
  const aTerminer: T[] = [];
  const enCours: T[] = [];
  const bibliotheque: T[] = [];
  for (const d of dossiers) {
    const section = sectionPour(d);
    if (section === "a_terminer") aTerminer.push(d);
    else if (section === "en_cours") enCours.push(d);
    else bibliotheque.push(d);
  }
  return { aTerminer, enCours, bibliotheque };
}

/**
 * Le « numéro en cours » de la barre de navigation : le dossier actif le
 * plus récemment remué. Un dossier livré est fini — il vit dans la
 * bibliothèque, pas dans la barre.
 */
export function choisirNumeroEnCours<T extends DossierDuCompte>(dossiers: T[]): T | null {
  let choisi: T | null = null;
  for (const d of dossiers) {
    if (d.etat === "livree") continue;
    if (!choisi || (d.etat_maj_le ?? "") > (choisi.etat_maj_le ?? "")) choisi = d;
  }
  return choisi;
}

/** Réexporté pour que les écrans du compte parlent la même langue. */
export type { EtapeDepot };
