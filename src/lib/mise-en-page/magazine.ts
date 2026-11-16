/**
 * L'état d'un magazine en cours de mise en page, et ses transitions.
 *
 * Toutes les fonctions sont PURES : elles rendent un nouvel objet et ne touchent
 * jamais celui reçu (l'écran compare les références pour redessiner). Aucune
 * horloge dans les transitions : `modifieLe` est posé par la couche qui
 * sauvegarde (`horodater`), pas ici.
 *
 * Le paramètre `photos` des transitions est un CATALOGUE (recherche par id des
 * dimensions et des dates), sauf dans `poser` où c'est la sélection à poser.
 *
 * Règle tenue partout : la planche d'index 0 est une page droite seule (la
 * page 1 du magazine, en face de la couverture intérieure avant). Elle ne bascule
 * jamais en double et ne se supprime pas (elle se vide). Lot E (13/11) : la DERNIÈRE
 * planche est son pendant, une page GAUCHE seule (en face de la couverture intérieure
 * arrière) : le nombre de pages est toujours PAIR, elle existe toujours, ne bascule
 * pas, ne se supprime pas, et reste en dernier (rien ne s'insère après elle).
 */

import { PAGE_L, PLANCHE_L } from "./geometrie";
import { RECADRAGE_NEUTRE, ZOOM_MAX, ZOOM_MIN, recadrageParContenu, type Recadrage } from "./recadrage";
import { TEMPLATES_ANNEXE } from "./templates";
import { TEMPLATES_EPINGLES } from "./epingles";
import { MAX_PHOTOS_DOUBLE, MAX_PHOTOS_PAGE, grillesDouble, grillesPage, toutesLesGrilles } from "./grilles";
import { genereParId, genereesPour } from "./genere";
import { genereDoubleParId } from "./genereDouble";
import { decorPourCote, orientationCadre, orientationDe, type Aplat, type Cadre, type Orientation, type Portee, type RoleCadre, type Template } from "./types";
import type { StyleMagazine } from "./style";
import type { CouleurLibre, FondPlanche } from "./couleursLibres";
import type { Couverture } from "./couverture";

/* ─────────────────────────── Les données ─────────────────────────── */

/** l / h en px APRÈS orientation EXIF ; date ISO ou null (inconnue). */
/** `zone` (lot 2, facultative, écran seulement) : la zone importante de la photo en fractions, posée par la lecture (saillance.ts). */
export type PhotoRef = { id: string; nom: string; l: number; h: number; date: string | null; zone?: { x: number; y: number; l: number; h: number } | null };
/** L'hésitation (lot 3, 02/11) : une seconde photo DERRIÈRE celle du cadre. T les intervertit ; une fois tranchée (`tranchee`),
 *  la délaissée reste notée pour qu'on puisse revenir dessus. Seule la photo de devant (`photoId`) part à l'export. */
export type Hesitation = { photoId: string; recadrage: Recadrage; tranchee?: true };
export type Affectation = { photoId: string | null; recadrage: Recadrage; hesitation?: Hesitation };
/** `couleur` (lot G, 14/11, facultative, écrite seulement quand elle existe) : la couleur CHOISIE pour ce texte, un rôle du nuancier
 *  ou un hexa (couleursLibres.ts) ; absente, c'est celle du gabarit (l'encre, ou « blanc »). Elle suit le texte d'un gabarit à l'autre. */
export type TexteCadre = { contenu: string; taille: number; gras: boolean; couleur?: CouleurLibre };

export type Disposition = {
  templateId: string;
  /** Une par cadre photo, dans l'ordre des cadres. */
  photos: Affectation[];
  /** Une par cadre texte (titre, texte, légende), dans l'ordre des cadres. */
  textes: TexteCadre[];
  /** Lot 4 : les cadres RETOUCHÉS de cette disposition (déplacés, agrandis, posés en libre, calques), dans le repère du
   *  gabarit (page droite pour une page, planche pour une double). Présents, ils remplacent ceux du gabarit ; l'ordre du
   *  tableau est l'ordre des calques (le dernier devant). Écrits seulement s'ils existent. */
  cadres?: Cadre[];
  /** Lot 4 : une double retournée en miroir (gauche ↔ droite). Écrit seulement à `true`. */
  miroir?: true;
};

export type Planche = {
  id: string;
  mode: "double" | "pages";
  double: Disposition | null;
  gauche: Disposition | null;
  droite: Disposition | null;
  /** Lot G (14/11) : le FOND de couleur de la planche, un côté ou les deux (couleursLibres.ts), indépendant du gabarit et du mode :
   *  il reste quand on change de gabarit, sépare, fusionne ou déplace la planche. Facultatif, écrit seulement quand il existe. */
  fond?: FondPlanche;
};

/**
 * Le tri de l'atelier (lot 2, 31/10) : les photos pré-choisies et les écartées, jamais les deux à la fois, et le
 * nombre moyen de photos par page que Mathias fixera (null tant qu'il ne l'a pas fait : aucun chiffre inventé).
 * Absent d'un magazine qui n'a jamais été trié.
 */
/** Le tri : quatre listes disjointes. `coupsDeCoeur` et `reserve` (02/11) ne sont écrites que non vides : une sauvegarde
 *  d'avant elles reste valide telle quelle. */
/** Les étiquettes d'usage (05/11) : où la photo pourrait aller. Jamais exclusives, seulement sur une gardée ou un ✦. */
export type EtiquettesTri = { couverture?: string[]; double?: string[]; pleine?: string[] };
export type TriMagazine = { choisies: string[]; ecartees: string[]; visees: number | null; coupsDeCoeur?: string[]; reserve?: string[]; etiquettes?: EtiquettesTri };
/** Borne technique de l'objectif « photos visées » (pas une règle de produit : un garde-fou contre une saisie folle). */
export const VISEES_MAX = 5000;

/**
 * `tri` (lot 2), `style` (lot C, 12/11) et `couverture` (lot B, 12/11) sont FACULTATIFS : écrits seulement quand ils existent (jamais
 * `undefined`). `couverture` : la couverture à plat, à côté des planches (couverture.ts), écrite seulement quand on y a touché. Un magazine
 * sans `style` garde exactement son rendu d'avant : Arial dans l'IDML, Helvetica dans le PDF, le terracotta de la marque en aplat.
 *
 * `derniere` (lot E, 13/11) : `true` = la DERNIÈRE de `planches` est la page gauche seule de la fin (format d'après le lot E ; tout
 * magazine neuf l'a). Absente : un magazine d'AVANT, dont la dernière planche est une planche comme les autres ; on le lit tel quel,
 * et l'éditeur lui ajoute la planche manquante à l'ouverture (`avecDerniere`). Jamais écrite à `false`.
 */
export type Magazine = { version: 1; id: string; titre: string; planches: Planche[]; creeLe: string; modifieLe: string; tri?: TriMagazine; style?: StyleMagazine; couverture?: Couverture; derniere?: true };

/* ─────────────────────────── Les pages seules : la première et la dernière ─────────────────────────── */

/**
 * L'id de la dernière planche : jamais « pl-N » (la suite des ids de planche, `prochainId`, n'en est pas touchée : les doubles
 * ajoutées gardent leurs numéros, et la dernière page garde le sien quoi qu'on insère avant elle).
 */
export const ID_DERNIERE = "pl-fin";

/** Le côté de la page SEULE d'une planche : la première est une page droite, la dernière une page gauche. */
export type CoteSeul = "droite" | "gauche";

/** Ce magazine a-t-il sa dernière planche (page gauche seule) ? Faux pour un magazine d'avant le lot E. */
export const aDerniere = (m: Pick<Magazine, "derniere" | "planches">): boolean => m.derniere === true && m.planches.length >= 2;
/** La planche d'index `i` est-elle la dernière page, seule ? */
export const estDerniere = (m: Pick<Magazine, "derniere" | "planches">, i: number): boolean => aDerniere(m) && i === m.planches.length - 1;
/** `"droite"` pour la première planche, `"gauche"` pour la dernière, `null` pour une planche courante (double, ou deux pages). */
export const coteSeul = (m: Pick<Magazine, "derniere" | "planches">, i: number): CoteSeul | null => (i === 0 ? "droite" : estDerniere(m, i) ? "gauche" : null);

export type Cible = "gauche" | "droite" | "double";
/** Un cadre précis : `index` compte les cadres photo (ou texte pour `ecrireTexte`) de la disposition. */
export type RefCadre = { plancheId: string; cible: Cible; index: number };

/* ─────────────────────────── Le catalogue ─────────────────────────── */

/** Les gabarits dessinés (annexe du brief, puis épingles du 29/10), toujours avant les grilles de secours. */
export const TEMPLATES_DESSINES: Template[] = [...TEMPLATES_ANNEXE, ...TEMPLATES_EPINGLES];

/** Lot 4 : le gabarit d'une disposition composée à la main (photos posées en libre sur une page vide). Aucun cadre à lui :
 *  ceux de la disposition (`cadres`) font foi. */
export const TEMPLATE_LIBRE = "libre";

/** Lot 4 : les gabarits enregistrés par l'atelier (table `mep_gabarits`), chargés par l'écran. Ils passent AVANT les
 *  dessinés dans `candidats`. Une disposition qui en vient garde une copie de ses cadres : elle se relit sans eux. */
let enregistres: Template[] = [];
let versionEnregistres = 0;
let catalogue: Map<string, Template> | null = null;
const index = (): Map<string, Template> => {
  if (!catalogue) catalogue = new Map([...enregistres, ...TEMPLATES_DESSINES, ...toutesLesGrilles()].map((t) => [t.id, t]));
  return catalogue;
};

/** Remplace les gabarits enregistrés connus (rechargés par l'écran). */
export function enregistrerGabarits(liste: readonly Template[]): void {
  enregistres = liste.filter((t) => t.origine === "atelier").map((t) => ({ ...t, cadres: t.cadres.map((c) => ({ ...c })) }));
  versionEnregistres++;
  catalogue = null;
}
/** Change à chaque `enregistrerGabarits` : la clé d'une mémoïsation qui dépend des gabarits enregistrés (lot D, `gabaritsClasses`). */
export const versionGabaritsEnregistres = (): number => versionEnregistres;
export const gabaritsEnregistres = (): readonly Template[] => enregistres;

/** Tout le catalogue : enregistrés, annexe puis grilles. */
export const tousLesTemplates = (): Template[] => [...index().values()];
/** Les gabarits GÉNÉRÉS ne sont dans aucune table : l'id est leur recette. `GG1-…` (une page, lot D) ; `GD1-…` (une double : les recettes de ses deux pages, lot R). */
export const templateParId = (id: string): Template | null => index().get(id) ?? genereParId(id) ?? genereDoubleParId(id);

/** Le miroir d'un cadre dans une largeur (x' = L − x − l, rotation inversée) : involution. */
export function miroirCadre<C extends Cadre>(c: C, largeur: number): C {
  const m: C = { ...c, x: largeur - c.x - c.l };
  if (c.rotation !== undefined) m.rotation = c.rotation === 0 ? 0 : -c.rotation;
  return m;
}

/** Les cadres d'une disposition dans le repère de son GABARIT (retouchés s'il y en a), ou null s'ils ne vont pas à la cible. */
export function cadresPropres(d: Disposition, cible?: Cible): Cadre[] | null {
  if (d.cadres) return d.cadres;
  const t = templateParId(d.templateId);
  if (!t) return null;
  if (cible !== undefined && (t.portee === "double") !== (cible === "double")) return null;
  return t.cadres;
}

/** Repère du gabarit → repère planche (et retour : chaque branche est une involution ou une translation inverse). */
export function versPlanche(c: Cadre, cible: Cible, miroir: boolean): Cadre {
  if (cible === "double") return miroir ? miroirCadre(c, PLANCHE_L) : { ...c };
  return cible === "gauche" ? miroirCadre(c, PAGE_L) : { ...c, x: c.x + PAGE_L };
}
export function versGabarit(c: Cadre, cible: Cible, miroir: boolean): Cadre {
  if (cible === "droite") return { ...c, x: c.x - PAGE_L };
  return versPlanche(c, cible, miroir);
}

/**
 * Les cadres d'une disposition en repère PLANCHE : double telle quelle, page
 * droite décalée de +210, page gauche en miroir. Template inconnu : aucun cadre.
 */
/** Les aplats d'une disposition, repère planche, même règle que `cadresDe`. */
export function decorDe(disposition: Disposition, cible: Cible): Aplat[] {
  const t = templateParId(disposition.templateId);
  if (!t) return [];
  if (cible === "double") {
    if (t.portee !== "double") return [];
    const a = decorPourCote(t, "droite");
    return disposition.miroir ? a.map((x) => ({ ...x, x: PLANCHE_L - x.x - x.l })) : a;
  }
  if (t.portee !== "page") return [];
  return decorPourCote(t, cible).map((a) => (cible === "droite" ? { ...a, x: a.x + PAGE_L } : a));
}

export function cadresDe(disposition: Disposition, cible: Cible): Cadre[] {
  const base = cadresPropres(disposition, cible);
  if (!base) return [];
  return base.map((c) => versPlanche(c, cible, !!disposition.miroir));
}

/* ─────────────────────────── Le choix ─────────────────────────── */

export const maxPhotos = (portee: Portee): number => (portee === "page" ? MAX_PHOTOS_PAGE : MAX_PHOTOS_DOUBLE);

/** Ordre chronologique : date croissante, date inconnue après, puis nom, puis id. Déterministe. */
export function comparerChrono(a: PhotoRef, b: PhotoRef): number {
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date < b.date ? -1 : 1;
  }
  if (a.nom !== b.nom) return a.nom < b.nom ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Au-delà du maximum de la portée, seules les N premières (chronologiques) sont posées. */
export function retenir(portee: Portee, photos: PhotoRef[]): { retenues: PhotoRef[]; nonPosees: string[] } {
  const max = maxPhotos(portee);
  if (photos.length <= max) return { retenues: [...photos], nonPosees: [] };
  const triees = [...photos].sort(comparerChrono);
  return { retenues: triees.slice(0, max), nonPosees: triees.slice(max).map((p) => p.id) };
}

/**
 * Les signatures se comparent comme des multisets ; un carré (C), d'un côté
 * comme de l'autre, va partout. Les voisinages ne dépendant que du type, le
 * théorème de Hall se réduit à deux inégalités : assez de cases pour les P,
 * assez pour les L.
 */
export function signaturesCompatibles(cadres: Orientation[], photos: Orientation[]): boolean {
  if (cadres.length !== photos.length) return false;
  const n = (l: Orientation[], o: Orientation) => l.filter((x) => x === o).length;
  const tC = n(cadres, "C");
  return n(photos, "P") <= n(cadres, "P") + tC && n(photos, "L") <= n(cadres, "L") + tC;
}

const orientationsCadres = (t: Template): Orientation[] => t.cadres.filter((c) => c.role === "photo").map(orientationCadre);
const orientationPhoto = (p: PhotoRef): Orientation => orientationDe(p.l, p.h);

/**
 * Les templates candidats, dans l'ordre où « Autre disposition » les parcourt :
 * (a) dessinés (enregistrés, annexe, épingles) de même portée, même nombre, signature compatible ;
 * (b) dessinés de même nombre ;
 * (c) pages seulement (lot D) : les gabarits GÉNÉRÉS de la grammaire dont les cadres vont à ces photos, chacun rangé
 *     pour que la photo i aille au cadre i (genere.ts). Les doubles générées (lot R, genereDouble.ts) ne sont PAS ici : leur
 *     présélection passe par la note de page de l'éditeur, elles s'ajoutent dans `gabaritsClasses` (editeur/operations.ts) ;
 * (d) grilles de ce nombre (compatibles d'abord, ordre stable).
 * Toujours non vide pour 1 à 6 photos (page) et 1 à 12 (double). Au-delà du
 * maximum, seules les photos retenues (`retenir`) comptent.
 */
export function candidats(portee: Portee, photos: PhotoRef[]): Template[] {
  const { retenues } = retenir(portee, photos);
  const n = retenues.length;
  if (n === 0) return [];
  const os = retenues.map(orientationPhoto);
  const compat = (t: Template) => signaturesCompatibles(orientationsCadres(t), os);
  const annexe = [...enregistres, ...TEMPLATES_DESSINES].filter((t) => t.portee === portee && t.nbPhotos === n);
  const grilles = portee === "page" ? grillesPage(n) : grillesDouble(n);
  const generes = portee === "page" ? genereesPour(os) : [];
  return [
    ...annexe.filter(compat),
    ...annexe.filter((t) => !compat(t)),
    ...generes,
    ...grilles.filter(compat),
    ...grilles.filter((t) => !compat(t)),
  ];
}

const LIBELLE: Record<Exclude<RoleCadre, "photo">, string> = { titre: "Titre", texte: "Texte", legende: "Légende" };
const TAILLE_DEFAUT: Record<Exclude<RoleCadre, "photo">, number> = { titre: 16, texte: 10, legende: 7 };

const textesInitiaux = (t: Template): TexteCadre[] =>
  t.cadres.flatMap((c) => (c.role === "photo" ? [] : [{
    contenu: LIBELLE[c.role],
    taille: c.taille ?? TAILLE_DEFAUT[c.role],
    gras: c.gras ?? c.role === "titre",
  }]));

/**
 * Attribution photo → cadre (brief §7) : d'abord l'orientation identique (la
 * plus ancienne photo de cette orientation), puis l'ordre chronologique pour
 * les cadres restants. Recadrage neutre. Cadres en trop : vides. Photos en
 * trop : ignorées (l'appelant passe par `retenir`). Le suivi se fait par
 * position, pas par id : une photo présente deux fois est posée deux fois.
 */
export function disposer(template: Template, photos: PhotoRef[]): Disposition {
  const cadres = template.cadres.filter((c) => c.role === "photo");
  const triees = [...photos].sort(comparerChrono);
  const prise = triees.map(() => false);
  const choix: (PhotoRef | null)[] = cadres.map(() => null);
  cadres.forEach((c, i) => {
    const o = orientationCadre(c);
    const k = triees.findIndex((p, j) => !prise[j] && orientationPhoto(p) === o);
    if (k >= 0) { prise[k] = true; choix[i] = triees[k]; }
  });
  cadres.forEach((_, i) => {
    if (choix[i]) return;
    const k = prise.indexOf(false);
    if (k >= 0) { prise[k] = true; choix[i] = triees[k]; }
  });
  return {
    templateId: template.id,
    photos: choix.map((p, i) => ({ photoId: p ? p.id : null, recadrage: p ? recadrageParContenu(p, cadres[i], p.zone) : { ...RECADRAGE_NEUTRE } })),
    textes: textesInitiaux(template),
  };
}

/* ─────────────────────────── Outils internes ─────────────────────────── */

const plancheVide = (id: string, mode: Planche["mode"]): Planche => ({ id, mode, double: null, gauche: null, droite: null });

/** Ids de planche « pl-N », jamais réutilisés tant que la planche N existe. */
function prochainId(m: Magazine): string {
  const max = m.planches.reduce((acc, p) => {
    const k = /^pl-(\d+)$/.exec(p.id);
    return k ? Math.max(acc, Number(k[1])) : acc;
  }, 0);
  return `pl-${max + 1}`;
}

const avecPlanche = (m: Magazine, plancheId: string, f: (p: Planche, i: number) => Planche): Magazine => {
  const i = m.planches.findIndex((p) => p.id === plancheId);
  if (i < 0) return m;
  const suivante = f(m.planches[i], i);
  if (suivante === m.planches[i]) return m;
  const planches = [...m.planches];
  planches[i] = suivante;
  return { ...m, planches };
};

/** La disposition visée, si la cible correspond au mode de la planche. */
export function dispositionDe(p: Planche, cible: Cible): Disposition | null {
  if (cible === "double") return p.mode === "double" ? p.double : null;
  return p.mode === "pages" ? p[cible] : null;
}

const avecDisposition = (p: Planche, cible: Cible, d: Disposition | null): Planche =>
  cible === "double" ? { ...p, mode: "double", double: d, gauche: null, droite: null } : { ...p, mode: "pages", double: null, [cible]: d };

const idsDe = (d: Disposition | null): string[] => (d ? d.photos.flatMap((a) => (a.photoId ? [a.photoId] : [])) : []);

/** Résout des ids dans le catalogue ; un id inconnu est ignoré (photo retirée de la bibliothèque). */
const resoudre = (ids: string[], photos: PhotoRef[]): PhotoRef[] => {
  const parId = new Map(photos.map((p) => [p.id, p]));
  return ids.flatMap((id) => { const p = parId.get(id); return p ? [p] : []; });
};

/** Le premier candidat appliqué, ou null s'il n'y a rien à poser. */
const choisir = (portee: Portee, photos: PhotoRef[]): Disposition | null => {
  const t = candidats(portee, photos)[0];
  return t ? disposer(t, retenir(portee, photos).retenues) : null;
};

/* ─────────────────────────── Les transitions ─────────────────────────── */

/** Un magazine neuf : la première page (droite) et la dernière (gauche), toutes deux seules, vides (lot E : deux pages, toujours un nombre pair). */
export function nouveauMagazine(id: string, titre: string, maintenant: string = new Date().toISOString()): Magazine {
  return { version: 1, id, titre, planches: [plancheVide("pl-1", "pages"), plancheVide(ID_DERNIERE, "pages")], creeLe: maintenant, modifieLe: maintenant, derniere: true };
}

/**
 * Lot E : la lecture de l'ANCIEN format. Un magazine sauvegardé avant le lot E n'a pas de dernière page : on lui AJOUTE une planche
 * vide à la fin et on pose `derniere`. Rien d'existant ne bouge (les planches, leurs ids, leurs dispositions, le tri, le style, la
 * couverture restent tels quels) ; ce qui était la dernière planche devient une planche courante. Un magazine qui a déjà sa dernière
 * page est rendu tel quel (le MÊME objet) : idempotent. Appelé par l'écran à l'ouverture, jamais par une transition.
 */
export function avecDerniere(m: Magazine): Magazine {
  if (m.derniere === true && m.planches.length >= 2) return m;
  const id = m.planches.some((p) => p.id === ID_DERNIERE) ? `${ID_DERNIERE}-${prochainId(m).slice(3)}` : ID_DERNIERE;
  return { ...m, planches: [...m.planches, plancheVide(id, "pages")], derniere: true };
}

/** Posé par la couche de sauvegarde, jamais par une transition. */
export const horodater = (m: Magazine, maintenant: string): Magazine => ({ ...m, modifieLe: maintenant });

/** Une double de plus, à la fin du corps du magazine : AVANT la dernière page (lot E), qui reste en dernier. */
export function ajouterDouble(m: Magazine): Magazine {
  const planches = m.planches.slice();
  planches.splice(aDerniere(m) ? planches.length - 1 : planches.length, 0, plancheVide(prochainId(m), "double"));
  return { ...m, planches };
}

/** La première et la dernière planche ne se suppriment pas : elles se vident. */
export function supprimerPlanche(m: Magazine, plancheId: string): Magazine {
  const i = m.planches.findIndex((p) => p.id === plancheId);
  if (i < 0) return m;
  if (coteSeul(m, i)) return vider(m, plancheId);
  return { ...m, planches: m.planches.filter((p) => p.id !== plancheId) };
}

/** Vide la planche sans changer son mode. */
export function vider(m: Magazine, plancheId: string): Magazine {
  return avecPlanche(m, plancheId, (p) => ({ ...p, double: null, gauche: null, droite: null }));
}

/**
 * Pose une sélection. Sur une page d'une planche en double : la planche repasse
 * en mode pages (l'autre page vide). En double : la planche devient une double
 * (les deux pages fusionnent), son contenu est remplacé. Sur la planche 0,
 * toute cible devient la page droite ; sur la dernière (lot E), la page gauche. Au-delà du maximum, les plus récentes
 * sont rendues dans `nonPosees`.
 */
export function poser(m: Magazine, plancheId: string, cible: Cible, photos: PhotoRef[]): { magazine: Magazine; nonPosees: string[] } {
  const i = m.planches.findIndex((p) => p.id === plancheId);
  if (i < 0 || photos.length === 0) return { magazine: m, nonPosees: [] };
  const vraie: Cible = coteSeul(m, i) ?? cible;
  const portee: Portee = vraie === "double" ? "double" : "page";
  const { nonPosees } = retenir(portee, photos);
  const d = choisir(portee, photos);
  const magazine = avecPlanche(m, plancheId, (p) => {
    const base = vraie !== "double" && p.mode === "double" ? { ...plancheVide(p.id, "pages"), ...(p.fond ? { fond: p.fond } : {}) } : p;
    return avecDisposition(base, vraie, d);
  });
  return { magazine, nonPosees };
}

/** Un texte a-t-il été saisi (autre chose que le libellé par défaut) ? */
const saisi = (t: TexteCadre): boolean => !Object.values(LIBELLE).includes(t.contenu);

/**
 * Template suivant dans `candidats`, en boucle, mêmes photos. Les textes saisis
 * sont gardés par index (contenu seulement : le corps suit le nouveau cadre) ;
 * les recadrages repartent du neutre, le cadre ayant changé.
 */
export function autreDisposition(m: Magazine, plancheId: string, cible: Cible, photos: PhotoRef[]): Magazine {
  return avecPlanche(m, plancheId, (p) => {
    const d = dispositionDe(p, cible);
    if (!d) return p;
    const portee: Portee = cible === "double" ? "double" : "page";
    const refs = resoudre(idsDe(d), photos);
    const liste = candidats(portee, refs);
    if (liste.length === 0) return p;
    const k = liste.findIndex((t) => t.id === d.templateId);
    const suivant = liste[(k + 1) % liste.length];
    const neuve = disposer(suivant, retenir(portee, refs).retenues);
    neuve.textes = neuve.textes.map((t, j) => {
      const a = d.textes[j];
      if (!a) return t;
      /* lot G : la couleur choisie suit le texte, écrit ou non */
      const c = a.couleur ? { ...t, couleur: a.couleur } : t;
      return saisi(a) ? { ...c, contenu: a.contenu } : c;
    });
    return avecDisposition(p, cible, neuve);
  });
}

/**
 * Page ↔ double page (brief §7). Pages → double : fusion des photos des deux
 * pages, nouveau choix. Double → pages : partage chronologique (ceil à gauche,
 * floor à droite), nouveau choix de chaque côté. La planche 0 et la dernière ne basculent pas.
 */
export function basculer(m: Magazine, plancheId: string, photos: PhotoRef[]): Magazine {
  return avecPlanche(m, plancheId, (p, i) => {
    if (coteSeul(m, i)) return p;
    if (p.mode === "pages") {
      const refs = resoudre([...idsDe(p.gauche), ...idsDe(p.droite)], photos);
      return { ...plancheVide(p.id, "double"), ...(p.fond ? { fond: p.fond } : {}), double: choisir("double", refs) };
    }
    const refs = resoudre(idsDe(p.double), photos).sort(comparerChrono);
    const g = Math.ceil(refs.length / 2);
    return { ...plancheVide(p.id, "pages"), ...(p.fond ? { fond: p.fond } : {}), gauche: choisir("page", refs.slice(0, g)), droite: choisir("page", refs.slice(g)) };
  });
}

const affectationDe = (m: Magazine, r: RefCadre): Affectation | null => {
  const p = m.planches.find((x) => x.id === r.plancheId);
  const d = p ? dispositionDe(p, r.cible) : null;
  return d?.photos[r.index] ?? null;
};

const avecAffectation = (m: Magazine, r: RefCadre, f: (a: Affectation) => Affectation): Magazine =>
  avecPlanche(m, r.plancheId, (p) => {
    const d = dispositionDe(p, r.cible);
    if (!d || !d.photos[r.index]) return p;
    const ph = [...d.photos];
    ph[r.index] = f(ph[r.index]);
    return avecDisposition(p, r.cible, { ...d, photos: ph });
  });

/** Échange deux photos (même planche ou non). Les deux recadrages repartent du neutre. */
export function intervertir(m: Magazine, a: RefCadre, b: RefCadre): Magazine {
  const pa = affectationDe(m, a);
  const pb = affectationDe(m, b);
  if (!pa || !pb) return m;
  if (a.plancheId === b.plancheId && a.cible === b.cible && a.index === b.index) return m;
  const m1 = avecAffectation(m, a, () => ({ photoId: pb.photoId, recadrage: { ...RECADRAGE_NEUTRE } }));
  return avecAffectation(m1, b, () => ({ photoId: pa.photoId, recadrage: { ...RECADRAGE_NEUTRE } }));
}

/**
 * Enregistre un recadrage. Le bornage fin (décalage) se fait en amont par
 * `deplacer` / `zoomer`, qui connaissent les mesures ; ici on garantit
 * seulement des nombres finis et un zoom dans [1, 8].
 */
export function recadrer(m: Magazine, ref: RefCadre, recadrage: Recadrage): Magazine {
  const fini = (v: number) => (Number.isFinite(v) ? v : 0);
  const r: Recadrage = {
    zoom: Number.isFinite(recadrage.zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, recadrage.zoom)) : ZOOM_MIN,
    dx: fini(recadrage.dx),
    dy: fini(recadrage.dy),
  };
  return avecAffectation(m, ref, (a) => ({ ...a, recadrage: r }));
}

/** `ref.index` compte ici les cadres TEXTE de la disposition. */
export function ecrireTexte(m: Magazine, ref: RefCadre, texte: Partial<TexteCadre>): Magazine {
  return avecPlanche(m, ref.plancheId, (p) => {
    const d = dispositionDe(p, ref.cible);
    if (!d || !d.textes[ref.index]) return p;
    const textes = [...d.textes];
    textes[ref.index] = { ...textes[ref.index], ...texte };
    return avecDisposition(p, ref.cible, { ...d, textes });
  });
}

/** Combien de fois chaque photo est posée dans le magazine (badge « utilisée ×n »). La couverture compte (lot B) : sa
 *  photo sort des « libres » et des propositions de l'intérieur, et n'y revient qu'en écho voulu (×2). */
export function utilisations(m: Magazine): Map<string, number> {
  const compte = new Map<string, number>();
  for (const p of m.planches) {
    for (const d of [p.double, p.gauche, p.droite]) {
      for (const id of idsDe(d)) compte.set(id, (compte.get(id) ?? 0) + 1);
    }
  }
  for (const a of m.couverture?.photos ?? []) if (a.photoId) compte.set(a.photoId, (compte.get(a.photoId) ?? 0) + 1);
  return compte;
}
