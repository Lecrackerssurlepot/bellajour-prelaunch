/**
 * Le parcours d'un numéro, en huit jalons (PRD §6).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUE ÇA RÉPOND, ET QUE RIEN NE RÉPONDAIT
 *
 * Une pastille « Payée » dit où on est. Elle ne dit ni ce qui a déjà eu lieu,
 * ni ce qui vient, ni qui doit jouer. Ouvrir un dossier, c'est reprendre le
 * fil d'une histoire commencée il y a trois semaines : il faut la voir en
 * entier, d'un coup d'œil, sinon on relit le journal ligne à ligne.
 *
 * D'où trois informations par jalon, et pas une de plus :
 *   — c'est fait / c'est maintenant / c'est à venir ;
 *   — quand, et par qui (le journal le sait déjà) ;
 *   — qui doit jouer pour en sortir, et par quel geste.
 *
 * L'ÉTAT 1b N'EST PAS UNE ÉTAPE, C'EST UN DÉTOUR. Il ne prend pas de place
 * dans la file : un dossier qui repart de 1b revient au jalon 1. On le
 * signale à part, sans casser la lecture de gauche à droite.
 *
 * Module PUR. `maintenant` n'est jamais lu ici.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { ACTIONS, ETAPE_ETAT, LIBELLE_ETAT, type Etat } from "./transitions";
import { QUI_ATTEND, type Camp } from "./urgence";

/** La file principale. `photos_insuffisantes` en est volontairement absent. */
export const FILE: Etat[] = [
  "photos_recues",
  "apercu_pret",
  "payee",
  "maquette_prete",
  "validee",
  "en_production",
  "expediee",
  "livree",
];

/** Le geste qui fait sortir de l'étape, dit du point de vue de qui le fait. */
const SUITE: Record<Etat, string> = {
  photos_recues: "Composer la couverture et publier l'aperçu",
  photos_insuffisantes: "Elle complète son dépôt",
  apercu_pret: "Elle règle son numéro",
  payee: "Composer le numéro et publier la maquette",
  maquette_prete: "Elle valide, ou validation automatique à J+7",
  validee: "Passer la commande et lancer l'impression",
  en_production: "L'imprimeur fabrique",
  expediee: "Le transporteur livre",
  livree: "Rien, le numéro est arrivé",
};

/** Le titre court d'un jalon — plus parlant que l'énum sur une frise. */
const TITRE: Record<Etat, string> = {
  photos_recues: "Photos reçues",
  photos_insuffisantes: "Photos insuffisantes",
  apercu_pret: "Couverture",
  payee: "Payé",
  maquette_prete: "Maquette",
  validee: "Validé",
  en_production: "Impression",
  expediee: "Expédié",
  livree: "Livré",
};

export type StatutJalon = "fait" | "encours" | "avenir";

export type Jalon = {
  etat: Etat;
  etape: string;
  titre: string;
  statut: StatutJalon;
  /** Quand l'étape a été atteinte (ISO), depuis le journal. */
  quand: string | null;
  /** Qui l'a fait atteindre. */
  par: string | null;
  /** Qui doit jouer pour en sortir. */
  attend: Camp;
  suite: string;
  /** Le libellé du bouton, quand c'est à nous de jouer. */
  action: string | null;
};

export type Parcours = {
  jalons: Jalon[];
  /** Index du jalon courant dans `jalons`. */
  courant: number;
  /** Le dossier est-il passé par « photos insuffisantes » ? */
  detour: { actif: boolean; quand: string | null } | null;
  /** Ce qui vient, en une phrase, pour l'encart « la suite ». */
  prochain: { quoi: string; attend: Camp; action: string | null };
};

type EvenementBrut = { type: string; payload: Record<string, unknown>; createdAt: string };

/**
 * Reconstruit le parcours depuis l'état courant et le journal.
 *
 * Le journal est la SEULE source des dates : `numeros` ne garde que
 * `etat_maj_le`, qui n'est que la dernière transition. Conséquence assumée :
 * les dossiers avancés à la main en SQL, avant /admin, n'ont pas de dates
 * intermédiaires — les jalons sont marqués faits, sans horodatage. On préfère
 * un trou visible à une date inventée.
 */
export function construireParcours(etatCourant: Etat, evenements: EvenementBrut[]): Parcours {
  /* Du plus ancien au plus récent : sur un aller-retour (1b puis retour en 1),
     c'est le DERNIER passage qui fait foi. */
  const chronologie = [...evenements].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const atteintLe = new Map<Etat, { quand: string; par: string | null }>();
  let detourQuand: string | null = null;

  for (const e of chronologie) {
    if (e.type === "numero_cree") {
      atteintLe.set("photos_recues", { quand: e.createdAt, par: null });
      continue;
    }
    if (e.type !== "etat_change") continue;
    const vers = e.payload?.vers;
    if (typeof vers !== "string") continue;
    if (vers === "photos_insuffisantes") {
      detourQuand = e.createdAt;
      continue;
    }
    const par = typeof e.payload?.par === "string" ? (e.payload.par as string) : null;
    atteintLe.set(vers as Etat, { quand: e.createdAt, par });
  }

  /* Un dossier en 1b est, pour la frise, au jalon 1 : c'est bien là qu'il
     reprendra. Le détour est signalé à côté, pas dans la file. */
  const etatFile: Etat = etatCourant === "photos_insuffisantes" ? "photos_recues" : etatCourant;
  const courant = Math.max(0, FILE.indexOf(etatFile));

  const jalons: Jalon[] = FILE.map((etat, i) => {
    const trace = atteintLe.get(etat);
    return {
      etat,
      etape: ETAPE_ETAT[etat],
      titre: TITRE[etat] ?? LIBELLE_ETAT[etat],
      statut: i < courant ? "fait" : i === courant ? "encours" : "avenir",
      quand: trace?.quand ?? null,
      par: trace?.par ?? null,
      attend: QUI_ATTEND[etat],
      suite: SUITE[etat],
      action: actionDepuis(etat),
    };
  });

  const etatReel = etatCourant;
  return {
    jalons,
    courant,
    detour: detourQuand || etatCourant === "photos_insuffisantes"
      ? { actif: etatCourant === "photos_insuffisantes", quand: detourQuand }
      : null,
    prochain: {
      quoi: SUITE[etatReel],
      attend: QUI_ATTEND[etatReel],
      action: actionDepuis(etatReel),
    },
  };
}

/* Le libellé du bouton qui fait avancer, quand il y en a un. On ignore les
   actions « sur place » (corriger un aperçu ne fait pas avancer) et celles
   qui font reculer (demander plus de photos). */
function actionDepuis(etat: Etat): string | null {
  const a = Object.values(ACTIONS).find(
    (x) => x.de.includes(etat) && !x.surPlace && x.vers !== "photos_insuffisantes",
  );
  return a?.libelle ?? null;
}
