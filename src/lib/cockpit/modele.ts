/**
 * Le modèle du cockpit : quand faut-il avoir lancé le développement pour ne
 * pas saturer l'atelier ?
 *
 * Module PUR et importable dans le navigateur : les curseurs de l'écran le
 * rejouent en direct, le serveur le rejoue au chargement, et le harnais
 * (scripts/verif-atelier.ts) le prouve. Aucune lecture de base ici.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LES FORMULES (celles du prototype, conservées telles quelles)
 *
 *   g            = (froides_S / froides_S-3)^(1/3) − 1      croissance lissée
 *   D_trigger    = capacite / (1+g)^(t_dev+buffer)          demande froide à
 *                                                           laquelle il faut
 *                                                           déclencher
 *   semaine_mur  = ln(capacite / froides_S) / ln(1+g)       dans combien de
 *                                                           semaines on sature
 *   date_limite  = semaine_mur − (t_dev+buffer)             dans combien de
 *                                                           semaines il faut
 *                                                           avoir commandé
 *   financement  = marge × volume_mensuel × reinvesti_pct   par mois
 *
 * `froides_S` = les commandes froides de la DERNIÈRE SEMAINE COMPLÈTE ;
 * `froides_S-3` = trois lignes avant. Le seul socle est le froid : le chaud
 * (réseau, fondateurs) ne dit rien de la demande qui vient.
 *
 * ⚠️ CE QUE LE MODÈLE REFUSE DE DIRE. Sans trois semaines d'écart, sans
 * commande froide au point de départ, ou sans croissance (g ≤ 0), il n'y a
 * pas de mur calculable : les champs rendent `null`, et le verdict est
 * « observation ». Un zéro à la place se lirait comme « saturé demain ».
 *
 * LES SEUILS SONT DES REPÈRES, PAS DES DEVIS. L'écran le répète en pied.
 * ══════════════════════════════════════════════════════════════════════════
 */

/* ─────────────────────────────── réglages ─────────────────────────────── */

export type Reglages = {
  /** Commandes froides par semaine que l'atelier absorbe sans le dev. */
  capacite: number;
  /** Durée du développement, en semaines. */
  t_dev: number;
  /** Marge de sécurité, en semaines. */
  buffer: number;
  /** Coût du développement, en euros. */
  cout_dev: number;
  /** Part de la marge réinvestie dans le dev, en %. */
  reinvesti_pct: number;
  /** Marge par commande retenue quand l'agrégat n'en a pas, en euros. */
  marge_defaut: number;
  /** Volume mensuel retenu pour le financement. */
  volume_mensuel: number;
};

/** Les bornes des curseurs : les mêmes que les `check` de la migration. */
export const BORNES: Record<keyof Reglages, { min: number; max: number; pas: number; unite: string; label: string }> = {
  capacite: { min: 1, max: 200, pas: 1, unite: "commandes froides / semaine", label: "Capacité de l’atelier" },
  t_dev: { min: 0, max: 52, pas: 1, unite: "semaines", label: "Durée du développement" },
  buffer: { min: 0, max: 26, pas: 1, unite: "semaines", label: "Marge de sécurité" },
  cout_dev: { min: 0, max: 100_000, pas: 500, unite: "€", label: "Coût du développement" },
  reinvesti_pct: { min: 0, max: 100, pas: 5, unite: "%", label: "Part de la marge réinvestie" },
  marge_defaut: { min: 0, max: 100, pas: 1, unite: "€ / commande", label: "Marge par défaut" },
  volume_mensuel: { min: 0, max: 500, pas: 1, unite: "commandes / mois", label: "Volume mensuel retenu" },
};

export const CLES_REGLAGES = Object.keys(BORNES) as Array<keyof Reglages>;

/**
 * Lit un corps inconnu et rend des réglages VALIDES, ou la première clé
 * fautive. Bornes inclusives ; un nombre hors bornes est refusé, pas
 * ramené : un curseur ne peut pas envoyer 10 000 commandes par semaine,
 * donc si ça arrive, c'est qu'on ne parle pas à l'écran.
 */
export function normaliserReglages(corps: unknown): { ok: true; reglages: Reglages } | { ok: false; champ: string } {
  if (!corps || typeof corps !== "object") return { ok: false, champ: "corps" };
  const o = corps as Record<string, unknown>;
  const out: Partial<Reglages> = {};
  for (const cle of CLES_REGLAGES) {
    const v = o[cle];
    const b = BORNES[cle];
    if (typeof v !== "number" || !Number.isFinite(v) || v < b.min || v > b.max) return { ok: false, champ: cle };
    out[cle] = v;
  }
  return { ok: true, reglages: out as Reglages };
}

/* ─────────────────────────────── l'agrégat ────────────────────────────── */

/** Une ligne de `weekly_metrics`, telle que la page la lit. */
export type LigneSemaine = {
  semaine: number;
  date_debut: string;
  commandes_totales: number;
  commandes_froides: number;
  commandes_chaudes: number;
  commandes_sans_origine: number;
  pages_moy: number | null;
  marge_moy: number | null;
  delai_moy_jours: number | null;
};

/* ─────────────────────────────── les seuils ───────────────────────────── */

/** Sous ce socle de commandes froides par semaine, rien n'est fiable. */
export const SOCLE_FROID_MIN = 5;
/** Le lissage : S comparée à S−3, racine cubique. */
export const LISSAGE_SEMAINES = 3;
/** « Fenêtre proche » : la date limite tombe dans moins de N semaines. */
export const FENETRE_PROCHE_SEMAINES = 4;

/* ─────────────────────────────── les formules ─────────────────────────── */

/** g = (S / S−3)^(1/3) − 1. `null` sans point de départ (S−3 absente ou à 0). */
export function croissanceLissee(froidesS: number, froidesS3: number | null): number | null {
  if (froidesS3 === null || froidesS3 <= 0 || froidesS < 0) return null;
  return Math.pow(froidesS / froidesS3, 1 / LISSAGE_SEMAINES) - 1;
}

/** D_trigger = capacite / (1+g)^(t_dev+buffer). Sans croissance, pas de seuil. */
export function demandeDeclenchement(capacite: number, g: number | null, tDev: number, buffer: number): number | null {
  if (g === null || g <= 0) return null;
  return capacite / Math.pow(1 + g, tDev + buffer);
}

/**
 * semaine_de_mur = ln(capacite / froides) / ln(1+g). Rend 0 dès que le froid
 * atteint la capacité (on y est), `null` sans croissance ou sans froid.
 */
export function semaineDeMur(capacite: number, froides: number, g: number | null): number | null {
  if (froides >= capacite) return 0;
  if (g === null || g <= 0 || froides <= 0) return null;
  return Math.log(capacite / froides) / Math.log(1 + g);
}

export function dateLimiteCommande(mur: number | null, tDev: number, buffer: number): number | null {
  return mur === null ? null : mur - (tDev + buffer);
}

/** Ce que la marge finance chaque mois, en euros. */
export function capaciteFinancement(marge: number, volumeMensuel: number, reinvestiPct: number): number {
  return marge * volumeMensuel * (reinvestiPct / 100);
}

/* ─────────────────────────────── le verdict ───────────────────────────── */

export type Verdict = "observation" | "marge" | "fenetre_proche" | "retard_sature";

export const LIBELLE_VERDICT: Record<Verdict, string> = {
  observation: "Observation",
  marge: "De la marge",
  fenetre_proche: "Fenêtre proche",
  retard_sature: "Retard ou saturé",
};

export type Fiabilite = { fiable: boolean; raisons: string[] };

/**
 * Le socle froid : moins de SOCLE_FROID_MIN commandes froides sur la dernière
 * semaine complète, et rien de ce qui suit n'est fiable. Les commandes sans
 * origine s'ajoutent aux raisons : elles auraient pu être froides.
 */
export function fiabilite(derniere: LigneSemaine | null): Fiabilite {
  if (!derniere) return { fiable: false, raisons: ["aucune semaine complète agrégée"] };
  const raisons: string[] = [];
  if (derniere.commandes_froides < SOCLE_FROID_MIN) {
    raisons.push(
      `${derniere.commandes_froides} commande${derniere.commandes_froides > 1 ? "s" : ""} froide${derniere.commandes_froides > 1 ? "s" : ""} sur la dernière semaine, il en faut ${SOCLE_FROID_MIN}`,
    );
  }
  if (derniere.commandes_sans_origine > 0) {
    raisons.push(
      `${derniere.commandes_sans_origine} commande${derniere.commandes_sans_origine > 1 ? "s" : ""} sans origine posée cette semaine-là`,
    );
  }
  return { fiable: raisons.length === 0, raisons };
}

export function verdict(args: {
  fiable: boolean;
  capacite: number;
  froides: number;
  g: number | null;
  dateLimite: number | null;
}): Verdict {
  /* La saturation est un FAIT, pas une projection : elle passe avant la
     fiabilité. Cinq commandes froides ou cinquante, si l'atelier n'absorbe
     plus, on le dit. */
  if (args.froides >= args.capacite) return "retard_sature";
  if (!args.fiable || args.g === null || args.g <= 0 || args.dateLimite === null) return "observation";
  if (args.dateLimite <= 0) return "retard_sature";
  if (args.dateLimite <= FENETRE_PROCHE_SEMAINES) return "fenetre_proche";
  return "marge";
}

/* ─────────────────────────── marge et pagination ──────────────────────── */

/**
 * « Marge et pagination se surveillent ensemble » : une baisse de pages fait
 * chuter la marge. Compare la dernière semaine complète à S−3 sur les deux,
 * quand les deux existent. Rend une phrase, ou rien.
 */
export function constatMargePages(lignes: LigneSemaine[]): string | null {
  if (lignes.length <= LISSAGE_SEMAINES) return null;
  const s = lignes[lignes.length - 1];
  const s3 = lignes[lignes.length - 1 - LISSAGE_SEMAINES];
  if (s.pages_moy === null || s3.pages_moy === null) return null;
  const pagesBaissent = s.pages_moy < s3.pages_moy;
  if (!pagesBaissent) return null;
  const margeBaisse = s.marge_moy !== null && s3.marge_moy !== null && s.marge_moy < s3.marge_moy;
  return margeBaisse
    ? `La pagination moyenne est passée de ${fr(s3.pages_moy)} à ${fr(s.pages_moy)} pages en ${LISSAGE_SEMAINES} semaines, et la marge de ${fr(s3.marge_moy as number)} à ${fr(s.marge_moy as number)} €.`
    : `La pagination moyenne est passée de ${fr(s3.pages_moy)} à ${fr(s.pages_moy)} pages en ${LISSAGE_SEMAINES} semaines : la marge suit, même si on ne la mesure pas encore.`;
}

/* ─────────────────────────────── le cockpit ───────────────────────────── */

export type Cockpit = {
  /** La dernière semaine complète, S. */
  derniere: LigneSemaine | null;
  /** S−3, le point de départ du lissage. */
  reference: LigneSemaine | null;
  froides: number;
  g: number | null;
  dTrigger: number | null;
  semaineMur: number | null;
  dateLimite: number | null;
  /** La marge retenue et d'où elle vient. */
  marge: { valeur: number; source: "agregat" | "defaut" };
  financementMensuel: number;
  /** Combien de mois pour financer le dev à ce rythme ; null si rien ne finance. */
  moisPourFinancer: number | null;
  fiabilite: Fiabilite;
  verdict: Verdict;
  constatMargePages: string | null;
};

/** `lignes` triées par semaine croissante, toutes complètes. */
export function calculerCockpit(lignes: LigneSemaine[], r: Reglages): Cockpit {
  const derniere = lignes.length ? lignes[lignes.length - 1] : null;
  const reference = lignes.length > LISSAGE_SEMAINES ? lignes[lignes.length - 1 - LISSAGE_SEMAINES] : null;
  const froides = derniere?.commandes_froides ?? 0;
  const g = derniere ? croissanceLissee(froides, reference?.commandes_froides ?? null) : null;
  const dTrigger = demandeDeclenchement(r.capacite, g, r.t_dev, r.buffer);
  const semaineMur = derniere ? semaineDeMur(r.capacite, froides, g) : null;
  const dateLimite = dateLimiteCommande(semaineMur, r.t_dev, r.buffer);

  const marge: Cockpit["marge"] =
    derniere?.marge_moy !== null && derniere?.marge_moy !== undefined
      ? { valeur: derniere.marge_moy, source: "agregat" }
      : { valeur: r.marge_defaut, source: "defaut" };
  const financementMensuel = capaciteFinancement(marge.valeur, r.volume_mensuel, r.reinvesti_pct);
  const moisPourFinancer = financementMensuel > 0 ? r.cout_dev / financementMensuel : null;

  const f = fiabilite(derniere);
  return {
    derniere,
    reference,
    froides,
    g,
    dTrigger,
    semaineMur,
    dateLimite,
    marge,
    financementMensuel,
    moisPourFinancer,
    fiabilite: f,
    verdict: verdict({ fiable: f.fiable, capacite: r.capacite, froides, g, dateLimite }),
    constatMargePages: constatMargePages(lignes),
  };
}

/** La phrase du verdict, avec les chiffres qui le justifient. */
export function phraseVerdict(c: Cockpit, r: Reglages): string {
  const delai = r.t_dev + r.buffer;
  switch (c.verdict) {
    case "retard_sature":
      return c.froides >= r.capacite
        ? `${c.froides} commandes froides par semaine, pour une capacité de ${r.capacite} : l’atelier est saturé.`
        : `Au rythme actuel, le mur arrive dans ${arrondi(c.semaineMur)} semaines et le développement en demande ${delai} : il aurait déjà dû être lancé.`;
    case "fenetre_proche":
      return `Le mur arrive dans ${arrondi(c.semaineMur)} semaines ; avec ${delai} semaines de développement et de marge, il reste ${arrondi(c.dateLimite)} semaines pour décider.`;
    case "marge":
      return `Le mur arrive dans ${arrondi(c.semaineMur)} semaines ; il reste ${arrondi(c.dateLimite)} semaines avant de devoir lancer le développement.`;
    case "observation":
      if (!c.fiabilite.fiable) return `Pas encore de socle : ${c.fiabilite.raisons.join(" ; ")}.`;
      if (c.g === null) return `Il faut ${LISSAGE_SEMAINES + 1} semaines complètes avec des commandes froides pour lire une tendance.`;
      return "Le froid ne croît pas sur trois semaines : aucun mur ne se dessine.";
  }
}

/* Décimales à la française : la phrase dit « 3,2 semaines ». */
function fr(v: number): string {
  return String(v).replace(".", ",");
}

function arrondi(v: number | null): string {
  if (v === null) return "—";
  return String(Math.round(v * 10) / 10).replace(".", ",");
}
