/**
 * Ce que rend une page de la grille des photos (`POST /api/collectif/photos`),
 * de deux façons qui rendent la MÊME réponse (le harnais compare les deux sur
 * une édition simulée de 5 000 photos). Aucun accès direct à la base, au
 * réseau ni à l'environnement : la route passe les lectures et la signature
 * des vignettes (le patron de `lignes.ts`).
 *
 * - `grilleDepuisLignes` : la lecture d'AVANT T-168, déplacée telle quelle
 *   depuis la route. Toutes les photos arrivées sont lues (colonnes légères),
 *   l'arbre, les comptes et la page se calculent en mémoire. C'est le REPLI :
 *   sans la migration 20261022, ou pour un dossier que `planDuDossier` ne sait
 *   pas écrire en filtre.
 * - `grilleDepuisResume` (T-168) : l'arbre, les personnes, les comptes et les
 *   couvertures se calculent sur le résumé en base (`resumePhotos.ts`), et la
 *   base ne rend que la PAGE affichée (120 lignes), triée et découpée par elle.
 *   La vue « Doublons » lit les seules photos des groupes, par paquets d'ids.
 *
 * Les doublons arrivent tout calculés (`doublonsStockes.ts`, T-170) : la grille
 * ne les calcule plus.
 */

import type { GroupeDoublons } from "@/lib/atelier/empreinte";
import { arbreDesPhotos, cleDeDossierLisible, compterPersonnes, dansLeDossier, deParticipant, estVueEnsemble, noeudDe, nomDePersonne, personnesDe, plafondDuLien, type LienEdition } from "./dossiers";
import { indexDoublons } from "./doublons";
import { jourDePhoto, TAILLE_PAGE } from "./grille";
import { enPaquets } from "./lignes";
import { moyenneAbsente } from "./migration";
import { GROUPE_SANS_GROUPE } from "./partage";
import type { ReglagesPlafond } from "./plafonds";
import {
  couvertureDe,
  dansLeDossierResume,
  derniereArrivee,
  enLignesPesees,
  planDuDossier,
  somme,
  TRI_ARRIVEE,
  TRI_JOUR,
  TRI_TOUTES,
  trierCommeLaBase,
  type CleTri,
  type Condition,
  type LigneResume,
  type PlanFiltre,
} from "./resumePhotos";

/** Les dernières arrivées sous les albums d'une vue d'ensemble : une rangée. */
export const ARRIVEES = 8;

/** `signalees` (lot w2 du 20/10) : les photos « Ne pas publier » du dossier, la plus récente d'abord ; elle se croise avec le dossier, comme « Doublons ». */
export const VUES = ["toutes", "jour", "doublons", "signalees"] as const;
export type VueGrille = (typeof VUES)[number];

/** Une photo telle que la lecture COMPLÈTE la lit (le repli). */
export type LigneGrille = {
  id: string;
  vignette_key: string | null;
  r2_key: string;
  nom_origine: string | null;
  provenance_type: string;
  deposant: string | null;
  prise_le: string | null;
  confirmee_le: string;
  ordre: number | null;
  empreinte: string | null;
  preselection: boolean;
  signalee: boolean;
  mime: string | null;
  provenance_id: string | null;
  role_deposant: string;
  appareil_id: string | null;
  /** La version moyenne d'« Agrandir » (5A, migration 20261026) : absente sans la migration ou pour une photo d'avant. */
  moyenne_key?: string | null;
};

export const COLONNES_GRILLE =
  "id, vignette_key, r2_key, nom_origine, provenance_type, deposant, prise_le, confirmee_le, ordre, empreinte, preselection, signalee, mime, provenance_id, role_deposant, appareil_id";

/** Une photo d'une PAGE : ce que la tuile montre, rien de plus. */
export type LignePage = Pick<
  LigneGrille,
  "id" | "vignette_key" | "r2_key" | "nom_origine" | "provenance_type" | "deposant" | "prise_le" | "confirmee_le" | "preselection" | "signalee" | "mime" | "provenance_id" | "role_deposant" | "moyenne_key"
>;

export const COLONNES_PAGE = "id, vignette_key, r2_key, nom_origine, provenance_type, deposant, prise_le, confirmee_le, preselection, signalee, mime, provenance_id, role_deposant";

/* ─────────── la version moyenne d'« Agrandir » (5A, migration 20261026, écrite, pas appliquée) ───────────
   Les lectures de la grille demandent `moyenne_key` EN PLUS (`colonnesAvecMoyenne`) ; si la base
   répond que la colonne manque (`moyenneAbsente`, la colonne NOMMÉE), la même lecture repart sans
   elle, et l'absence est retenue une minute (par instance) pour ne pas payer deux requêtes à chaque
   page. La photo n'a alors pas de moyenne : « Agrandir » montre l'original, comme avant. */

/** Combien de temps l'absence de `moyenne_key` est retenue avant de la redemander. */
export const MEMOIRE_MOYENNE_ABSENTE_MS = 60_000;
let moyenneAbsenteJusqua = 0;

/** Les colonnes d'une lecture, `moyenne_key` en plus quand on la demande. */
export function colonnesAvecMoyenne(colonnes: string, avec: boolean): string {
  return avec ? `${colonnes}, moyenne_key` : colonnes;
}

/** Pour le harnais : oublier l'absence retenue. */
export function oublierMoyenneAbsente(): void {
  moyenneAbsenteJusqua = 0;
}

/**
 * Jouer une lecture AVEC `moyenne_key`, puis, si la base dit que la colonne manque, la même sans.
 * `lire` FABRIQUE une requête neuve à chaque appel ; toute autre erreur est rendue telle quelle.
 */
export async function lireAvecMoyenne<R extends { error: { code?: string | null; message?: string | null } | null }>(
  lire: (avecMoyenne: boolean) => PromiseLike<R>,
  maintenant: number = Date.now()
): Promise<R> {
  if (maintenant >= moyenneAbsenteJusqua) {
    const r = await lire(true);
    if (!moyenneAbsente(r.error)) return r;
    moyenneAbsenteJusqua = maintenant + MEMOIRE_MOYENNE_ABSENTE_MS;
  }
  return lire(false);
}

/**
 * `couverturesDe` (21/10, la mosaïque des liens et des personnes) : la réponse porte la couverture de CHAQUE lien (`liens`, une
 * vignette signée par lien, la plus récente, « Sans groupe » compris) ou de CHAQUE personne (`personnes`, sous sa clé
 * `qui:<nom>`) ; avec `seulementArbre`, rien d'autre n'est lu ni signé (aucune page, aucune vignette de grille). Le navigateur
 * ne le demande que pour peindre une mosaïque dont les couvertures n'ont pas encore été lues.
 */
export const COUVERTURES_DE = ["liens", "personnes"] as const;
export type CouverturesDe = (typeof COUVERTURES_DE)[number];
export type DemandeGrille = { dossier: string; vue: VueGrille; page: number; seulementArbre: boolean; couverturesDe?: CouverturesDe };

/** Lire la demande du navigateur (le dossier borné, une vue connue, une page de 0 à 1 000). */
export function lireDemandeGrille(corps: Record<string, unknown>): DemandeGrille {
  return {
    dossier: cleDeDossierLisible(corps.dossier) ? corps.dossier : "tout",
    vue: (VUES as readonly string[]).includes(corps.vue as string) ? (corps.vue as VueGrille) : "toutes",
    page: Math.max(0, Math.min(1000, Number(corps.page) || 0)),
    seulementArbre: corps.seulementArbre === true,
    couverturesDe: (COUVERTURES_DE as readonly unknown[]).includes(corps.couverturesDe) ? (corps.couverturesDe as CouverturesDe) : undefined,
  };
}

export type ContexteGrille = {
  edition: ReglagesPlafond & { responsable_nom: string | null };
  /** Les liens de l'édition (`lireProvenances`). */
  provenances: readonly (LienEdition & { cle: string })[];
  /** Les liens ne se montrent qu'à qui peut en créer (`regler_plafond_participant`). */
  partage: boolean;
  /** Les déclarations pas encore arrivées depuis 2 h (un compte `head`). */
  enCours: number;
  /** Signer une VIGNETTE : adresse stable à l'heure et gardée en cache (`signerLectureVignette`, T-176). Peut lever : la tuile ou la couverture s'en passe. */
  signer: (cle: string) => Promise<string>;
  /** Signer un ORIGINAL : la photo sans vignette, et la photo EN GRAND quand elle n'a pas de version moyenne (`signerGet`, une heure). Peut lever. */
  signerOriginal: (cle: string) => Promise<string>;
  /**
   * Combien de photos sont à la corbeille (migration 20261023, un compte sans ligne lu par la
   * route, `compterCorbeille`) ; `null` sans la migration. Repris tel quel dans `stats`.
   */
  corbeille?: number | null;
};

export type TuileGrille = {
  id: string;
  vignette: string | null;
  nom: string | null;
  qui: string;
  role: "participant" | "responsable" | "atelier";
  arrivee: string;
  jour: string;
  jourCle: string;
  preselection: boolean;
  /** « Ne pas publier » (lot w2 du 20/10) : l'état relu à chaque page, il survit au rechargement. */
  signalee: boolean;
  doublonDe: string | null;
  heic: boolean;
  /**
   * La photo EN GRAND (la visionneuse, planche 3) : la version moyenne quand elle existe (5A), sinon
   * l'original signé quand un navigateur sait l'afficher (`afficheEnGrand` : JPEG, PNG, WebP), la
   * vignette sinon (un HEIC). `null` : rien à montrer.
   */
  grande: string | null;
};

/** Les formats qu'un navigateur affiche à coup sûr dans une balise `<img>` (le HEIC, seulement Safari : la vignette suffit). */
const MIMES_EN_GRAND = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
export const afficheEnGrand = (mime: string | null | undefined): boolean => typeof mime === "string" && MIMES_EN_GRAND.has(mime.toLowerCase());

export type ReponseGrille = {
  photos: TuileGrille[];
  page: number;
  suivante: number | null;
  compteurs: { dossier: number; liste: number; doublons: number; selection: number; choisissables: number; signalees: number };
  stats: { photos: number; personnes: number; doublons: number; enCours: number; derniere: string | null; corbeille: number | null };
  arbre: ReturnType<typeof arbreDesPhotos>;
  couvertures: Record<string, string>;
  /** Pour chaque couverture : sa moyenne et sa variante paysage (28/10). Absent quand la lecture n'en sait rien. */
  couverturesPlus?: Record<string, CouvertureEnPlus>;
  liens: {
    /** Les photos arrivées par l'adresse de BASE (l'ancien lien général), sous « Sans groupe » : l'onglet
        « Les liens » ne la montre que si `n` > 0, en lecture seule, sans « Partager » ni QR (planche 5, 21/10). */
    general: { nom: string; plafond: string; n: number; personnes: { nom: string; n: number }[] };
    liens: { id: string; cle: string; nom: string; plafond: string; plafondNombre: number | null; sansPlafond: boolean; n: number; personnes: { nom: string; n: number }[] }[];
    reste: number | null;
  } | null;
};

/** La tuile d'une photo : sa vignette signée, qui l'a envoyée, son jour, son original si c'est une copie. */
async function tuile(p: LignePage, doublonDe: ReadonlyMap<string, string>, c: ContexteGrille): Promise<TuileGrille> {
  let vignette: string | null = null;
  try {
    /* Sans vignette (un HEIC lu par Chrome) : l'original, si le navigateur
       sait l'afficher ; un HEIC ne s'affiche pas, la tuile le dira. */
    if (p.vignette_key) vignette = await c.signer(p.vignette_key);
    else if (p.mime !== "image/heic" && p.mime !== "image/heif") vignette = await c.signerOriginal(p.r2_key);
  } catch {
    vignette = null;
  }
  /* En grand : la VERSION MOYENNE quand elle existe (5A : ≈ 1 600 px, JPEG, quel que soit l'original,
     HEIC compris ; signée comme une vignette, donc adresse stable et gardée en cache) ; sinon
     l'original quand il s'affiche (déjà signé s'il servait de vignette), la vignette sinon. */
  let grande: string | null = null;
  if (p.moyenne_key) {
    try {
      grande = await c.signer(p.moyenne_key);
    } catch {
      grande = null;
    }
  }
  /* L'original ne sert plus en grand qu'à une photo SANS moyenne (d'avant, plus petite, ou sans la migration). */
  if (!grande && afficheEnGrand(p.mime)) {
    if (!p.vignette_key) grande = vignette;
    else {
      try {
        grande = await c.signerOriginal(p.r2_key);
      } catch {
        grande = null;
      }
    }
  }
  const jour = jourDePhoto(p.prise_le);
  const responsable = c.edition.responsable_nom;
  /* Qui l'a envoyée (T-180) : le nom du participant, sinon le responsable ou l'atelier. */
  const role = p.role_deposant === "responsable" ? "responsable" : deParticipant(p) ? "participant" : "atelier";
  return {
    id: p.id,
    vignette,
    nom: p.nom_origine,
    qui: role === "participant" ? nomDePersonne(p.deposant) : role === "responsable" ? responsable?.trim() || "Le responsable" : "L'atelier",
    role,
    arrivee: p.confirmee_le,
    jour: jour.libelle,
    jourCle: jour.cle,
    preselection: p.preselection,
    signalee: Boolean(p.signalee),
    doublonDe: doublonDe.get(p.id) ?? null,
    heic: p.mime === "image/heic" || p.mime === "image/heif",
    grande: grande ?? vignette,
  };
}

/** Les personnes d'un lien : la règle de `dossiers.ts` (un nom comparé sans la casse, « Sans nom » sinon), la plus fournie d'abord. */
function personnesDu(lignes: readonly { deposant: string | null; poids?: number }[]): { nom: string; n: number }[] {
  return personnesDe(lignes).map(({ nom, n }) => ({ nom, n }));
}

/* ═════════════════════════ le repli : la lecture complète d'avant T-168 ═════════════════════════ */

/**
 * Toutes les photos ARRIVÉES de l'édition sont lues en colonnes légères (pour
 * l'arbre, les comptes, les doublons) ; seule la page demandée est signée
 * (vignette, une heure). `toutes` : de la plus ancienne à la plus récente
 * (`stats.derniere` est la dernière ligne).
 */
export async function grilleDepuisLignes(toutes: readonly LigneGrille[], groupes: readonly GroupeDoublons[], d: DemandeGrille, c: ContexteGrille): Promise<ReponseGrille> {
  const { dossier, vue, page } = d;
  const { edition, provenances, partage } = c;
  const { doublonDe, membres: dansUnGroupe } = indexDoublons(groupes);

  const responsable = edition.responsable_nom;
  const dansDossier = toutes.filter((p) => dansLeDossier(p, dossier, responsable));
  /* « Toutes » : la plus récente arrivée d'abord (T-181) ; ce qui vient d'arriver est en haut,
     pas à la dernière page. « Par jour » garde l'ordre des jours de prise de vue. */
  /* « Ne pas publier » (lot w2) : les signalées du dossier, dans l'ordre de « Toutes ». */
  const signaleesRecentes = () => [...dansDossier].reverse().filter((p) => p.signalee);
  let liste = vue === "doublons" ? dansDossier.filter((p) => dansUnGroupe.has(p.id)) : vue === "signalees" ? signaleesRecentes() : vue === "toutes" ? [...dansDossier].reverse() : dansDossier;
  /* « Par jour » : l'ordre de la base (`TRI_JOUR`, resumePhotos.ts), redit en mémoire : les jours de prise de vue les plus
     récents d'abord, les photos sans date en tête. Les deux lectures rendent le même ordre (le harnais les compare). */
  if (vue === "jour") liste = trierCommeLaBase(liste, TRI_JOUR);

  /* `seulementArbre` : la fenêtre de dépôt ne veut que les dossiers, aucune vignette à signer.
     Une vue d'ensemble (« Vos dossiers », « Les participants ») montre des vignettes de
     dossiers et, dessous, les DERNIÈRES ARRIVÉES (maquettes du 15/10) : les huit plus
     récentes de la vue, jamais une page de grille ni de page suivante. */
  const sansGrille = d.seulementArbre || estVueEnsemble(dossier);
  const tranche = d.seulementArbre ? [] : sansGrille ? dansDossier.slice(-ARRIVEES).reverse() : liste.slice(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE);
  const photos = await Promise.all(tranche.map((p) => tuile(p, doublonDe, c)));

  /* Sans le droit de partager (l'équipe, le responsable sur un appareil pas encore reconnu) : les liens restent dans
     l'arbre (noms, comptes, tuiles) mais SANS leur clé de partage (28/10 : « Par lien » disait « Aucun lien à montrer »
     alors que le lien avait des photos). L'arbre ne lit que l'id et le nom ; la clé ne sort que pour qui partage. */
  const liens = partage ? provenances : provenances.map((l) => ({ ...l, cle: "" }));
  const arbre = arbreDesPhotos(toutes, liens, edition, partage);
  /* La couverture de chaque dossier et de chaque lien (15/10) : la dernière photo arrivée qui
     a une vignette. Seulement dans les vues d'ensemble et dans un dossier qui en contient
     d'autres (ses sous-dossiers s'y montrent en vignettes). */
  const couvertures: Record<string, string> = {};
  const couverturesPlus: Record<string, CouvertureEnPlus> = {};
  if (!d.seulementArbre || d.couverturesDe !== undefined) {
    const courant = noeudDe(arbre, dossier);
    const aCouvrir = d.couverturesDe === "personnes" ? arbre.personnes : d.couverturesDe === "liens" ? avecVous(arbre) : dossier === "vous" ? arbre.vous : dossier === "liens" ? avecVous(arbre) : (courant?.enfants ?? []).filter((e) => e.cle.startsWith("resp:"));
    await Promise.all(
      aCouvrir.map(async (n) => {
        const recentes = [...toutes].reverse().filter((l) => l.vignette_key && dansLeDossier(l, n.cle, responsable));
        /* La plus récente QUI A une moyenne parmi les candidates (28/10) : sinon la tuile agrandirait une vignette. */
        const p = recentes.slice(0, CANDIDATES_COUVERTURE).find((l) => l.moyenne_key) ?? recentes[0];
        if (!p?.vignette_key) return;
        try {
          couvertures[n.cle] = await c.signer(p.vignette_key);
          /* La moyenne de la même photo (1 600 px) : la tuile large la sert au lieu d'agrandir la vignette. Pas de dimensions ici : pas de variante paysage. */
          if (p.moyenne_key) couverturesPlus[n.cle] = { m: await c.signer(p.moyenne_key).catch(() => null), paysage: null };
        } catch {
          /* une couverture manquée laisse l'icône du dossier */
        }
      })
    );
  }
  /* Le détail des liens (l'onglet « Les liens ») : chacun, ses personnes, son plafond. */
  const detailLiens = partage
    ? provenances
        .filter((l) => !l.retire_le)
        .map((l) => ({
          id: l.id,
          cle: l.cle,
          nom: l.libelle?.trim() || "Lien de contribution",
          plafond: plafondDuLien(l, edition),
          plafondNombre: l.sans_plafond ? null : l.plafond_par_personne,
          sansPlafond: l.sans_plafond,
          n: toutes.filter((p) => p.provenance_id === l.id).length,
          personnes: personnesDu(toutes.filter((p) => p.provenance_id === l.id)),
        }))
    : [];
  const general = toutes.filter((p) => !p.provenance_id && p.role_deposant === "participant");

  return {
    photos,
    page,
    suivante: !sansGrille && (page + 1) * TAILLE_PAGE < liste.length ? page + 1 : null,
    compteurs: {
      dossier: dansDossier.length,
      liste: liste.length,
      /* Le même compte que les chiffres d'en tête : les COPIES (la vue les montre à côté de leur original). */
      doublons: dansDossier.filter((p) => doublonDe.has(p.id)).length,
      selection: toutes.filter((p) => p.preselection).length,
      choisissables: dansDossier.filter((p) => !p.signalee && !p.preselection).length,
      /* « Ne pas publier » du dossier (la ligne de « Afficher », lot w2) : le même compte que la vue `signalees`. */
      signalees: dansDossier.filter((p) => p.signalee).length,
    },
    stats: {
      photos: toutes.length,
      personnes: compterPersonnes(toutes),
      doublons: doublonDe.size,
      enCours: c.enCours,
      /* La dernière arrivée : le point de départ de « N nouvelles photos » (T-181). */
      derniere: toutes.length ? toutes[toutes.length - 1].confirmee_le : null,
      corbeille: c.corbeille ?? null,
    },
    arbre,
    couvertures,
    couverturesPlus,
    liens: partage
      ? {
          general: { nom: GROUPE_SANS_GROUPE, plafond: plafondDuLien({ sans_plafond: false, plafond_par_personne: null }, edition), n: general.length, personnes: personnesDu(general) },
          liens: detailLiens,
          reste: edition.plafond_total === null ? null : Math.max(0, edition.plafond_total - toutes.length),
        }
      : null,
  };
}

/* ═════════════════════════ T-168 : le résumé en base, la page seule ═════════════════════════ */

/** Ce que la route sait lire en base pour `grilleDepuisResume`. `null` : lecture impossible (500). */
export type LectureGrille = {
  /** Les photos du dossier (le plan), triées, de `de` à `a` inclus (au plus `TAILLE_PAGE`). */
  page(conditions: Extract<PlanFiltre, { genre: "filtre" }>["conditions"], tri: readonly CleTri[], de: number, a: number): Promise<LignePage[] | null>;
  /** Les photos de ces ids (un paquet de `PAQUET_IN` au plus) qui sont dans le dossier (le plan), dans n'importe quel ordre. */
  parIds(ids: readonly string[], conditions: Extract<PlanFiltre, { genre: "filtre" }>["conditions"]): Promise<LignePage[] | null>;
  /** COMBIEN de ces ids (un paquet) sont dans le dossier : un compte `head`, aucune ligne. */
  compter(ids: readonly string[], conditions: Extract<PlanFiltre, { genre: "filtre" }>["conditions"]): Promise<number | null>;
  /** COMBIEN de photos passent ces conditions (le plan du dossier et « Ne pas publier », lot w2) : un compte sans ligne. */
  compterFiltre(conditions: Extract<PlanFiltre, { genre: "filtre" }>["conditions"]): Promise<number | null>;
  /**
   * Les `CANDIDATES_COUVERTURE` dernières photos arrivées du dossier qui ont une vignette, la plus récente d'abord, avec de quoi servir
   * la moyenne et choisir l'orientation (28/10). Absente (un harnais) ou `null` : la couverture reste la vignette, comme avant.
   */
  couvertures?(conditions: Extract<PlanFiltre, { genre: "filtre" }>["conditions"]): Promise<CandidateCouverture[] | null>;
};

/** Une photo qui peut servir de couverture : sa vignette, sa moyenne (1 600 px, migration 20261026) quand elle existe, ses dimensions quand elles sont connues. */
export type CandidateCouverture = { vignette_key: string; moyenne_key: string | null; largeur: number | null; hauteur: number | null };
/** Combien de dernières photos on regarde pour trouver une couverture à la bonne forme (les récentes d'abord : la couverture reste « la dernière »). */
export const CANDIDATES_COUVERTURE = 12;
/** Un paysage franc (3:2 fait 1,5) ; en dessous, la photo passe pour carrée ou portrait. */
export const RAPPORT_PAYSAGE = 1.15;

/** Ce que la réponse ajoute à la vignette d'une couverture : sa moyenne, et une variante PAYSAGE pour une tuile large. */
export type CouvertureEnPlus = { m: string | null; paysage: { v: string; m: string | null } | null };

export const estPaysage = (c: { largeur: number | null; hauteur: number | null }): boolean => !!c.largeur && !!c.hauteur && c.largeur / c.hauteur >= RAPPORT_PAYSAGE;

/**
 * Le choix, pur : `vignetteParDefaut` est la couverture d'avant (la vignette de la photo la plus récente). Une tuile large la montre à plus de 700 px :
 * seule une photo qui a sa MOYENNE (1 600 px) y est nette (28/10, recette Audencia : une couverture sans moyenne s'agrandissait ×3). Donc :
 * - la couverture est la photo la plus récente DU LIEN qui a une moyenne (la photo par défaut si elle en a une, sinon la première des candidates qui en a) ;
 *   aucune n'en a : la photo par défaut, vignette seule (rien de mieux à montrer) ;
 * - une tuile large est un bandeau (un portrait y est coupé aux deux tiers) : on joint la plus récente photo PAYSAGE qui a une moyenne ; si aucune candidate
 *   n'a de moyenne, la plus récente paysage telle quelle (comme avant). Dimensions inconnues : aucune variante.
 */
export function couvertureEnPlus(vignetteParDefaut: string, candidates: readonly CandidateCouverture[]): { defaut: CandidateCouverture | null; paysage: CandidateCouverture | null } {
  const nette = (c: CandidateCouverture) => Boolean(c.moyenne_key);
  const parDefaut = candidates.find((x) => x.vignette_key === vignetteParDefaut) ?? null;
  const defaut = parDefaut && nette(parDefaut) ? parDefaut : (candidates.find(nette) ?? parDefaut);
  if (defaut && estPaysage(defaut) && nette(defaut)) return { defaut, paysage: null };
  const paysageNet = candidates.find((x) => estPaysage(x) && nette(x));
  if (paysageNet) return { defaut, paysage: paysageNet };
  if (defaut && estPaysage(defaut)) return { defaut, paysage: null };
  return { defaut, paysage: candidates.some(nette) ? null : (candidates.find((x) => estPaysage(x)) ?? null) };
}

/** Les liens, et « Mes photos » (la tuile en tête de « Par lien ») quand le responsable a déposé : sa couverture se lit comme celle d'un lien, moyenne et bandeau compris (28/10). */
const avecVous = (arbre: ReturnType<typeof arbreDesPhotos>): { cle: string }[] => [...arbre.liens, ...(arbre.vous.length ? [{ cle: "vous" }] : [])];

/** Les paquets d'ids partent six par six (une latence par six paquets, sans inonder l'API). */
const PAQUETS_ENSEMBLE = 6;

async function parPaquets<T>(ids: readonly string[], lire: (paquet: string[]) => Promise<T | null>): Promise<T[] | null> {
  const paquets = enPaquets(ids);
  const rendus: T[] = [];
  for (let i = 0; i < paquets.length; i += PAQUETS_ENSEMBLE) {
    const lot = await Promise.all(paquets.slice(i, i + PAQUETS_ENSEMBLE).map(lire));
    for (const r of lot) {
      if (r === null) return null;
      rendus.push(r);
    }
  }
  return rendus;
}

/** Un dossier qui ne s'écrit pas en filtre : la route relit tout (`grilleDepuisLignes`). */
export const REPLI = "repli" as const;

export async function grilleDepuisResume(
  groupes: readonly LigneResume[],
  doublons: readonly GroupeDoublons[],
  d: DemandeGrille,
  c: ContexteGrille,
  lecture: LectureGrille
): Promise<ReponseGrille | typeof REPLI | null> {
  const { dossier, vue, page } = d;
  const { edition, provenances, partage } = c;
  const responsable = edition.responsable_nom;
  const { doublonDe, membres, copies } = indexDoublons(doublons);
  const plan = planDuDossier(dossier, groupes, responsable);
  if (plan.genre === "repli") return REPLI;
  const conditions = plan.genre === "filtre" ? plan.conditions : null;
  /* Les lignes du résumé dans ce dossier (`dansLeDossier`, « Ma sélection » à part) et ce qu'elles y mettent. */
  const dansDossier = dansLeDossierResume(groupes, dossier, responsable);
  const nDossier = dansDossier.photos;

  /* Les doublons d'un dossier, seulement là où il le faut. La vue « Doublons » LIT les photos
     des groupes qui sont dans le dossier (les seules qu'elle montre, dans l'ordre d'arrivée) ;
     un autre dossier COMPTE ses copies en base (`head`, aucune ligne) ; « tout » connaît déjà
     son compte. */
  const lireMembres = async (): Promise<LignePage[] | null> => {
    if (!conditions || !membres.size) return [];
    const lus = await parPaquets([...membres], (paquet) => lecture.parIds(paquet, conditions));
    return lus ? trierCommeLaBase(lus.flat(), TRI_ARRIVEE) : null;
  };
  const compterCopies = async (): Promise<number | null> => {
    if (dossier === "tout") return copies;
    if (!conditions || !copies) return 0;
    const comptes = await parPaquets([...doublonDe.keys()], (paquet) => lecture.compter(paquet, conditions));
    return comptes ? comptes.reduce((n, x) => n + x, 0) : null;
  };
  const sansGrille = d.seulementArbre || estVueEnsemble(dossier);
  /* « Ne pas publier » (lot w2) : le plan du dossier, déjà vérifié, et la colonne `signalee` en plus.
     Le résumé ne la porte pas : la vue et le compte de la ligne se lisent en base (un compte sans ligne). */
  const avecSignalee: Condition[] | null = conditions ? [...conditions, { op: "signalee" }] : null;
  const compterSignalees = async (): Promise<number | null> => (avecSignalee ? lecture.compterFiltre(avecSignalee) : 0);
  /* La page : triée et découpée par la base, en même temps que les comptes. */
  const lirePage = async (conds: Condition[] | null, tri: readonly CleTri[], nListe: number, membresDuDossier: readonly LignePage[] | null): Promise<LignePage[] | null> => {
    if (d.seulementArbre || !conditions || !conds) return [];
    if (sansGrille) return lecture.page(conditions, TRI_TOUTES, 0, ARRIVEES - 1);
    if (membresDuDossier) return membresDuDossier.slice(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE);
    if (page * TAILLE_PAGE >= nListe) return [];
    return lecture.page(conds, tri, page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE - 1);
  };
  let nListe = nDossier;
  let copiesDuDossier: number | null;
  let signaleesDuDossier: number | null;
  let tranche: LignePage[] | null;
  if (vue === "doublons") {
    const membresDuDossier = await lireMembres();
    if (!membresDuDossier) return null;
    nListe = membresDuDossier.length;
    copiesDuDossier = membresDuDossier.filter((p) => doublonDe.has(p.id)).length;
    [signaleesDuDossier, tranche] = await Promise.all([compterSignalees(), lirePage(conditions, TRI_ARRIVEE, nListe, membresDuDossier)]);
  } else if (vue === "signalees") {
    signaleesDuDossier = await compterSignalees();
    if (signaleesDuDossier === null) return null;
    nListe = signaleesDuDossier;
    [copiesDuDossier, tranche] = await Promise.all([compterCopies(), lirePage(avecSignalee, TRI_TOUTES, nListe, null)]);
  } else {
    [copiesDuDossier, signaleesDuDossier, tranche] = await Promise.all([compterCopies(), compterSignalees(), lirePage(conditions, vue === "toutes" ? TRI_TOUTES : TRI_JOUR, nListe, null)]);
  }
  if (copiesDuDossier === null || signaleesDuDossier === null || tranche === null) return null;
  const photos = await Promise.all(tranche.map((p) => tuile(p, doublonDe, c)));

  const pesees = enLignesPesees(groupes);
  /* Sans le droit de partager (l'équipe, le responsable sur un appareil pas encore reconnu) : les liens restent dans
     l'arbre (noms, comptes, tuiles) mais SANS leur clé de partage (28/10 : « Par lien » disait « Aucun lien à montrer »
     alors que le lien avait des photos). L'arbre ne lit que l'id et le nom ; la clé ne sort que pour qui partage. */
  const liens = partage ? provenances : provenances.map((l) => ({ ...l, cle: "" }));
  const arbre = arbreDesPhotos(pesees, liens, edition, partage);
  const couvertures: Record<string, string> = {};
  const couverturesPlus: Record<string, CouvertureEnPlus> = {};
  if (!d.seulementArbre || d.couverturesDe !== undefined) {
    const courant = noeudDe(arbre, dossier);
    const aCouvrir = d.couverturesDe === "personnes" ? arbre.personnes : d.couverturesDe === "liens" ? avecVous(arbre) : dossier === "vous" ? arbre.vous : dossier === "liens" ? avecVous(arbre) : (courant?.enfants ?? []).filter((e) => e.cle.startsWith("resp:"));
    await Promise.all(
      aCouvrir.map(async (n) => {
        const cle = couvertureDe(groupes, n.cle, responsable);
        if (!cle) return;
        try {
          couvertures[n.cle] = await c.signer(cle);
          const plan = lecture.couvertures ? planDuDossier(n.cle, groupes, responsable) : null;
          const candidates = plan && plan.genre === "filtre" ? await lecture.couvertures?.(plan.conditions) : null;
          if (candidates?.length) {
            const choix = couvertureEnPlus(cle, candidates);
            /* La couverture peut changer de photo (la plus récente qui a une moyenne) : la vignette suit. */
            if (choix.defaut && choix.defaut.vignette_key !== cle) couvertures[n.cle] = await c.signer(choix.defaut.vignette_key);
            const signe = (k: string | null | undefined) => (k ? c.signer(k).catch(() => null) : Promise.resolve(null));
            const [m, pv, pm] = await Promise.all([signe(choix.defaut?.moyenne_key), signe(choix.paysage?.vignette_key), signe(choix.paysage?.moyenne_key)]);
            if (m || pv) couverturesPlus[n.cle] = { m, paysage: pv ? { v: pv, m: pm } : null };
          }
        } catch {
          /* une couverture manquée laisse l'icône du dossier */
        }
      })
    );
  }
  const duLien = (id: string) => pesees.filter((g) => g.provenance_id === id);
  const detailLiens = partage
    ? provenances
        .filter((l) => !l.retire_le)
        .map((l) => ({
          id: l.id,
          cle: l.cle,
          nom: l.libelle?.trim() || "Lien de contribution",
          plafond: plafondDuLien(l, edition),
          plafondNombre: l.sans_plafond ? null : l.plafond_par_personne,
          sansPlafond: l.sans_plafond,
          n: somme(duLien(l.id)),
          personnes: personnesDu(duLien(l.id)),
        }))
    : [];
  const general = pesees.filter((g) => !g.provenance_id && g.role_deposant === "participant");
  const total = somme(groupes);

  return {
    photos,
    page,
    suivante: !sansGrille && (page + 1) * TAILLE_PAGE < nListe ? page + 1 : null,
    compteurs: {
      dossier: nDossier,
      liste: nListe,
      doublons: copiesDuDossier,
      selection: somme(groupes, () => true, "n_selection"),
      choisissables: dansDossier.choisissables,
      signalees: signaleesDuDossier,
    },
    stats: {
      photos: total,
      personnes: compterPersonnes(groupes),
      doublons: copies,
      enCours: c.enCours,
      derniere: derniereArrivee(groupes),
      corbeille: c.corbeille ?? null,
    },
    arbre,
    couvertures,
    couverturesPlus,
    liens: partage
      ? {
          general: { nom: GROUPE_SANS_GROUPE, plafond: plafondDuLien({ sans_plafond: false, plafond_par_personne: null }, edition), n: somme(general), personnes: personnesDu(general) },
          liens: detailLiens,
          reste: edition.plafond_total === null ? null : Math.max(0, edition.plafond_total - total),
        }
      : null,
  };
}
