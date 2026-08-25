/**
 * Les métriques de l'atelier.
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
 * ══════════════════════════════════════════════════════════════════════════
 */

import { makeSupabase } from "@/lib/supabase";
import { eurosPour, type PalierCle } from "@/lib/atelier/prix";

export type Periode = "7" | "30" | "90" | "tout";

export const PERIODES: Array<{ cle: Periode; label: string; jours: number | null }> = [
  { cle: "7", label: "7 jours", jours: 7 },
  { cle: "30", label: "30 jours", jours: 30 },
  { cle: "90", label: "90 jours", jours: 90 },
  { cle: "tout", label: "Tout", jours: null },
];

/** Une mesure de durée : sans échantillon, on ne rend PAS un zéro. */
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
  payes: number;
  ca: number;
  panierMoyen: number | null;
  paliers: Record<PalierCle, number>;
  relances: number;
  couverture: Duree; // dépôt terminé → aperçu publié
  maquette: Duree; // paiement → maquette publiée
  production: Duree; // dépôt terminé → livré
};

export type Metriques = {
  periode: Periode;
  label: string;
  courant: Chiffres;
  /** La même fenêtre, juste avant. `null` pour « Tout » : rien à comparer. */
  precedent: Chiffres | null;
  parJour: Array<{ date: string; arrivees: number; paiements: number }>;
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

type Evt = {
  numero_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

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

/**
 * Les jalons datés d'un dossier, reconstruits depuis le journal.
 *
 * `depot` vient de l'événement `consentements` porteur de consent_photos —
 * le seul signal serveur de fin de dépôt (cf. mails.ts). Les autres viennent
 * des `etat_change`. Un jalon absent reste absent : c'est ce qui permet de
 * distinguer « pas encore mesurable » de « zéro ».
 */
type Jalons = {
  cree?: number;
  depot?: number;
  apercu?: number;
  paye?: number;
  maquette?: number;
  livre?: number;
};

function reconstruire(evts: Evt[]): Map<string, Jalons> {
  const par = new Map<string, Jalons>();
  /* Chronologique : sur un aller-retour (1b puis retour en 1), c'est le
     DERNIER passage qui compte — c'est celui qui a produit la couverture. */
  for (const e of [...evts].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const j = par.get(e.numero_id) ?? {};
    const t = Date.parse(e.created_at);
    if (e.type === "numero_cree") j.cree = t;
    else if (e.type === "consentements" && e.payload?.consent_photos === true) j.depot = t;
    else if (e.type === "etat_change") {
      const vers = e.payload?.vers;
      if (vers === "apercu_pret") j.apercu = t;
      else if (vers === "payee") j.paye = t;
      else if (vers === "maquette_prete") j.maquette = t;
      else if (vers === "livree") j.livre = t;
    }
    par.set(e.numero_id, j);
  }
  return par;
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

  let questionnaires = 0;
  let depots = 0;
  let apercus = 0;
  let payes = 0;
  let ca = 0;
  const paliers: Record<PalierCle, number> = { p30: 0, p40: 0, p45: 0 };
  const dCouverture: number[] = [];
  const dMaquette: number[] = [];
  const dProduction: number[] = [];

  for (const [id, j] of jalons) {
    if (dans(j.cree)) questionnaires++;
    if (dans(j.depot)) depots++;
    if (dans(j.apercu)) apercus++;
    if (dans(j.paye)) {
      payes++;
      const p = palierPar.get(id) ?? null;
      const e = eurosPour(p);
      if (e) ca += e;
      if (p) paliers[p]++;
    }

    /* Une durée est comptée dans la fenêtre où elle S'ACHÈVE : c'est là
       qu'on a appris si la promesse était tenue. */
    if (dans(j.apercu) && j.depot !== undefined) dCouverture.push((j.apercu! - j.depot) / H);
    if (dans(j.maquette) && j.paye !== undefined) dMaquette.push((j.maquette! - j.paye) / H);
    if (dans(j.livre) && j.depot !== undefined) dProduction.push((j.livre! - j.depot) / H);
  }

  return {
    questionnaires,
    depots,
    apercus,
    payes,
    ca,
    panierMoyen: payes ? Math.round((ca / payes) * 10) / 10 : null,
    paliers,
    relances: relancesPar.filter((t) => t >= debut && t < fin).length,
    couverture: mesurer(dCouverture, PROMESSE_COUVERTURE_H),
    maquette: mesurer(dMaquette, PROMESSE_MAQUETTE_H),
    production: mesurer(dProduction, PROMESSE_PRODUCTION_H),
  };
}

export async function chargerMetriques(periode: Periode): Promise<Metriques> {
  const supabase = makeSupabase();
  const maintenant = new Date();
  const fin = maintenant.getTime();

  const def = PERIODES.find((p) => p.cle === periode) ?? PERIODES[1];
  const debut = def.jours ? fin - def.jours * J : 0;

  const [{ data: evts }, { data: numeros }, { data: relances }] = await Promise.all([
    supabase
      .from("evenements")
      .select("numero_id, type, payload, created_at")
      .in("type", ["numero_cree", "consentements", "etat_change"])
      .order("created_at", { ascending: true })
      .limit(5000)
      .returns<Evt[]>(),
    supabase.from("numeros").select("id, palier").returns<Array<{ id: string; palier: PalierCle | null }>>(),
    supabase
      .from("mails_envoyes")
      .select("envoye_le")
      .eq("code", "M3b")
      .returns<Array<{ envoye_le: string }>>(),
  ]);

  const jalons = reconstruire(evts ?? []);
  const palierPar = new Map((numeros ?? []).map((n) => [n.id, n.palier]));
  const relancesT = (relances ?? []).map((r) => Date.parse(r.envoye_le));

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

  /* Le début mesurable : la première transition jamais journalisée. C'est
     lui qui justifie les « pas encore » de la page. */
  const premiere = (evts ?? []).find((e) => e.type === "etat_change");

  return {
    periode: def.cle,
    label: def.label,
    courant,
    precedent,
    parJour,
    debutMesurable: premiere?.created_at ?? null,
    fetchedAt: maintenant.toISOString(),
  };
}
