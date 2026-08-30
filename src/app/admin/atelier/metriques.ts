/**
 * Les métriques de l'atelier — la couche qui va chercher, pas celle qui juge.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * D'OÙ VIENNENT LES CHIFFRES — ET POURQUOI L'HISTOIRE COMMENCE AUJOURD'HUI
 *
 * Tout est dérivé du journal `evenements`, jamais d'un compteur entretenu à
 * côté : un compteur se désynchronise, le journal est la vérité. « Combien de
 * temps entre le dépôt et la couverture » se lit en soustrayant deux lignes.
 *
 * ⚠️ CONSÉQUENCE ASSUMÉE : les dossiers avancés à la main en SQL, avant
 * /admin, n'ont laissé AUCUNE trace de leurs transitions. Les délais de
 * production ne peuvent donc pas remonter avant la mise en service du
 * back-office. La page le DIT au lieu d'afficher des moyennes fondées sur
 * trois dossiers et de laisser croire à une tendance.
 *
 * On ne fabrique pas non plus les chiffres manquants : une mesure sans
 * échantillon rend `null`, et l'écran affiche « pas encore » plutôt qu'un
 * zéro qui se lirait comme une contre-performance.
 *
 * Les RÈGLES (jalons, étapes, entonnoir, seaux, constats) vivent dans
 * `@/lib/atelier/mesure` — module pur, éprouvé par scripts/verif-atelier.ts.
 * Ce fichier ne fait que lire la base et poser les fenêtres.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "@/lib/supabase";
import { eurosPour, type PalierCle } from "@/lib/atelier/prix";
import {
  TYPES_MESURE,
  reconstruireJalons,
  dureesEtapes,
  compterEntonnoir,
  reactiviteConversion,
  composerConstats,
  ENTONNOIR,
  type EvenementMesure,
  type Jalons,
  type EtapeVieCle,
  type DureeEtape,
  type Seau,
} from "@/lib/atelier/mesure";

export type Periode = "7" | "30" | "90" | "tout";

export const PERIODES: Array<{ cle: Periode; label: string; jours: number | null }> = [
  { cle: "7", label: "7 jours", jours: 7 },
  { cle: "30", label: "30 jours", jours: 30 },
  { cle: "90", label: "90 jours", jours: 90 },
  { cle: "tout", label: "Tout", jours: null },
];

/** Une mesure de durée PROMISE : sans échantillon, on ne rend PAS un zéro. */
export type Duree = {
  mediane: number | null; // heures
  tenus: number | null; // % dans le délai promis
  echantillon: number;
  promesseH: number;
};

export type Chiffres = {
  questionnaires: number;
  depots: number;
  apercus: number;
  checkouts: number;
  payes: number;
  validees: number;
  livrees: number;
  ca: number;
  panierMoyen: number | null;
  paliers: Record<PalierCle, number>;
  relances: number;
  couverture: Duree; // dépôt terminé → aperçu publié
  maquette: Duree; // paiement → maquette publiée
  production: Duree; // dépôt terminé → livré
  /** Toutes les étapes de la vie d'un dossier : médiane + effectif. */
  etapes: Record<EtapeVieCle, DureeEtape>;
  /** Réactivité ↔ conversion : les trois seaux de délai de couverture. */
  seaux: Seau[];
};

export type Metriques = {
  periode: Periode;
  label: string;
  courant: Chiffres;
  /** La même fenêtre, juste avant. `null` pour « Tout » : rien à comparer. */
  precedent: Chiffres | null;
  parJour: Array<{ date: string; arrivees: number; paiements: number }>;
  /** Les constats calculés — des faits chiffrés, jamais une recommandation. */
  lecture: string[];
  /** Première transition jamais journalisée — le début mesurable. */
  debutMesurable: string | null;
  fetchedAt: string;
};

const H = 3_600_000;
const J = 24 * H;

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function mediane(valeurs: number[]): number | null {
  if (!valeurs.length) return null;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

function mesurer(durees: number[], promesseH: number): Duree {
  return {
    mediane: mediane(durees),
    tenus: durees.length ? Math.round((durees.filter((d) => d <= promesseH).length / durees.length) * 100) : null,
    echantillon: durees.length,
    promesseH,
  };
}

/* Les promesses, en heures. Mêmes valeurs que la table des délais de
   urgence.ts — changer l'une sans l'autre, c'est se mesurer sur une promesse
   qu'on ne fait plus. Les 3 jours ouvrés sont approximés à 72 h ici : une
   médiane n'a pas à connaître le calendrier. */
const PROMESSE_COUVERTURE_H = 48;
const PROMESSE_MAQUETTE_H = 72;
const PROMESSE_PRODUCTION_H = 10 * 24;

function calculer(
  jalons: Map<string, Jalons>,
  palierPar: Map<string, PalierCle | null>,
  relancesPar: number[],
  debut: number,
  fin: number,
): Chiffres {
  const dans = (t?: number) => t !== undefined && t >= debut && t < fin;

  let ca = 0;
  const paliers: Record<PalierCle, number> = { p30: 0, p40: 0, p45: 0 };
  const dCouverture: number[] = [];
  const dMaquette: number[] = [];
  const dProduction: number[] = [];

  for (const [id, j] of jalons) {
    if (dans(j.paye)) {
      const p = palierPar.get(id) ?? null;
      const e = eurosPour(p);
      if (e) ca += e;
      if (p) paliers[p]++;
    }

    /* Une durée est comptée dans la fenêtre où elle S'ACHÈVE : c'est là
       qu'on a appris si la promesse était tenue. */
    if (dans(j.apercu) && j.depot !== undefined) dCouverture.push((j.apercu! - j.depot) / H);
    if (dans(j.maquette) && j.paye !== undefined) dMaquette.push((j.maquette! - j.paye) / H);
    if (dans(j.livree) && j.depot !== undefined) dProduction.push((j.livree! - j.depot) / H);
  }

  const compte = compterEntonnoir(jalons, debut, fin);
  const payes = compte.paye;

  return {
    questionnaires: compte.cree,
    depots: compte.depot,
    apercus: compte.apercu,
    checkouts: compte.checkout,
    payes,
    validees: compte.validee,
    livrees: compte.livree,
    ca,
    panierMoyen: payes ? Math.round((ca / payes) * 10) / 10 : null,
    paliers,
    relances: relancesPar.filter((t) => t >= debut && t < fin).length,
    couverture: mesurer(dCouverture, PROMESSE_COUVERTURE_H),
    maquette: mesurer(dMaquette, PROMESSE_MAQUETTE_H),
    production: mesurer(dProduction, PROMESSE_PRODUCTION_H),
    etapes: dureesEtapes(jalons, debut, fin),
    seaux: reactiviteConversion(jalons, debut, fin),
  };
}

/* ─────────────────────────── lecture de la base ────────────────────────── */

/**
 * ⚠️ LE PIÈGE DU PLAFOND. La première version posait `.limit(5000)` : au-delà
 * de 5000 événements, les plus récents seraient tombés du calcul SANS que
 * rien ne le dise — des médianes justes sur un journal tronqué. On pagine
 * donc par tranches, ordonnées par (created_at, id) : le `id` départage les
 * lignes nées à la même milliseconde, sans quoi une tranche pourrait en
 * sauter une à la frontière. Le garde-fou MAX_PAGES borne le pire (100 000
 * événements) et se signale en console au lieu de tronquer en silence.
 */
const PAGE_EVENEMENTS = 1000;
const MAX_PAGES = 100;

async function chargerEvenements(supabase: SupabaseClient): Promise<EvenementMesure[]> {
  const tout: EvenementMesure[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const de = page * PAGE_EVENEMENTS;
    const { data, error } = await supabase
      .from("evenements")
      .select("numero_id, type, payload, created_at")
      .in("type", [...TYPES_MESURE])
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(de, de + PAGE_EVENEMENTS - 1)
      .returns<EvenementMesure[]>();
    if (error) {
      console.error("[metriques] lecture evenements échouée", error.code, error.message);
      break;
    }
    tout.push(...(data ?? []));
    if (!data || data.length < PAGE_EVENEMENTS) return tout;
  }
  console.error(`[metriques] plus de ${MAX_PAGES * PAGE_EVENEMENTS} événements : calcul sur un journal tronqué`);
  return tout;
}

type NumeroLeger = { id: string; token: string; palier: PalierCle | null };

type Matiere = {
  evts: EvenementMesure[];
  jalons: Map<string, Jalons>;
  numeros: NumeroLeger[];
  palierPar: Map<string, PalierCle | null>;
  relancesT: number[];
};

async function chargerMatiere(): Promise<Matiere> {
  const supabase = makeSupabase();
  const [evts, { data: numeros }, { data: relances }] = await Promise.all([
    chargerEvenements(supabase),
    supabase.from("numeros").select("id, token, palier").returns<NumeroLeger[]>(),
    supabase
      .from("mails_envoyes")
      .select("envoye_le")
      .eq("code", "M3b")
      .returns<Array<{ envoye_le: string }>>(),
  ]);

  return {
    evts,
    jalons: reconstruireJalons(evts),
    numeros: numeros ?? [],
    palierPar: new Map((numeros ?? []).map((n) => [n.id, n.palier])),
    relancesT: (relances ?? []).map((r) => Date.parse(r.envoye_le)),
  };
}

function bornes(periode: Periode): { def: (typeof PERIODES)[number]; debut: number; fin: number } {
  const fin = Date.now();
  const def = PERIODES.find((p) => p.cle === periode) ?? PERIODES[1];
  return { def, debut: def.jours ? fin - def.jours * J : 0, fin };
}

export async function chargerMetriques(periode: Periode): Promise<Metriques> {
  const { def, debut, fin } = bornes(periode);
  const { evts, jalons, palierPar, relancesT } = await chargerMatiere();

  const courant = calculer(jalons, palierPar, relancesT, debut, fin);

  /* La fenêtre juste avant, de même durée. « Tout » n'a rien derrière lui :
     comparer à une période vide produirait des « +100 % » absurdes. */
  const precedent = def.jours
    ? calculer(jalons, palierPar, relancesT, debut - def.jours * J, debut)
    : null;

  /* La courbe : arrivées et paiements par jour. Bornée à 30 points — au-delà
     une barre fait deux pixels et ne dit plus rien. */
  const jours = Math.min(def.jours ?? 30, 30);
  const compteArrivees = new Map<string, number>();
  const comptePaiements = new Map<string, number>();
  for (const j of jalons.values()) {
    if (j.cree) {
      const d = JOUR_PARIS.format(new Date(j.cree));
      compteArrivees.set(d, (compteArrivees.get(d) ?? 0) + 1);
    }
    if (j.paye) {
      const d = JOUR_PARIS.format(new Date(j.paye));
      comptePaiements.set(d, (comptePaiements.get(d) ?? 0) + 1);
    }
  }
  const parJour: Metriques["parJour"] = [];
  for (let i = jours - 1; i >= 0; i--) {
    const date = JOUR_PARIS.format(new Date(fin - i * J));
    parJour.push({
      date,
      arrivees: compteArrivees.get(date) ?? 0,
      paiements: comptePaiements.get(date) ?? 0,
    });
  }

  /* Les constats : la règle vit dans mesure.ts, on ne lui passe que les
     chiffres déjà calculés — rien n'est inventé ici. */
  const compte = compterEntonnoir(jalons, debut, fin);
  const lecture = composerConstats({
    seaux: courant.seaux,
    entonnoir: ENTONNOIR.map((e) => ({ label: e.label, n: compte[e.cle] })),
    boutEnBout: courant.etapes.depot_livree,
    checkoutPaye: courant.etapes.checkout_paye,
  });

  /* Le début mesurable : la première transition jamais journalisée. C'est
     lui qui justifie les « pas encore » de la page. */
  const premiere = evts.find((e) => e.type === "etat_change");

  return {
    periode: def.cle,
    label: def.label,
    courant,
    precedent,
    parJour,
    lecture,
    debutMesurable: premiere?.created_at ?? null,
    fetchedAt: new Date().toISOString(),
  };
}

/* ────────────────────────── le rapport (export CSV) ────────────────────── */

export type LigneDossier = {
  /** Le token COURT (6 caractères) : identifie sans ouvrir la porte — un
      token tronqué ne donne accès à rien. */
  reference: string;
  jalons: Jalons;
  palier: PalierCle | null;
  paye: boolean;
};

export type Rapport = {
  metriques: Metriques;
  /** Une ligne par dossier dont AU MOINS un jalon tombe dans la période. */
  lignes: LigneDossier[];
};

export async function chargerRapport(periode: Periode): Promise<Rapport> {
  const { debut, fin } = bornes(periode);
  /* Deux lectures de la base plutôt qu'une matière partagée : le rapport
     est un geste rare (un clic le vendredi), la simplicité gagne. */
  const [metriques, matiere] = await Promise.all([chargerMetriques(periode), chargerMatiere()]);

  const lignes: LigneDossier[] = [];
  for (const n of matiere.numeros) {
    const j = matiere.jalons.get(n.id);
    if (!j) continue;
    const dansFenetre = Object.values(j).some((t) => t !== undefined && t >= debut && t < fin);
    if (!dansFenetre) continue;
    lignes.push({
      reference: n.token.slice(0, 6),
      jalons: j,
      palier: n.palier,
      paye: j.paye !== undefined,
    });
  }
  /* Les plus récents d'abord : c'est l'ordre dans lequel on relit. */
  lignes.sort((a, b) => (b.jalons.cree ?? 0) - (a.jalons.cree ?? 0));

  return { metriques, lignes };
}
