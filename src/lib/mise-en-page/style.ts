/**
 * La feuille de style d'un magazine (lot C, 12/11) : UNE paire de polices pour tout le magazine, trois niveaux de texte
 * (titre, texte, légende) et un nuancier à six rôles. Changer la paire ou une couleur change tout le magazine d'un coup :
 * les gabarits ne connaissent que des RÔLES, jamais une couleur ni une police.
 *
 * Sources : la table des accords du typographe (`design-explorations/cycle-0-2026-11-10/regles/typographie.md` §3, paires
 * T-01 à T-17, sans T-04 : Cormorant Garamond est la police du site Bellajour, refusée par décision du 12/11) et les deux
 * paires proposées au cycle 1 (`cycle-1-2026-11-12/regles/intentions.json`, TW-1 et TW-2). Dix-huit paires, trente familles,
 * toutes sur Google Fonts sous licence OFL : utilisables sur un magazine vendu. Le catalogue est FERMÉ : une police hors de
 * cette liste n'existe pas pour l'éditeur (R-T-09 : on change de paire, jamais de police).
 *
 * Un magazine SANS `style` garde exactement son rendu d'avant le lot C (Arial, Helvetica, terracotta). Le style est une clé
 * facultative du `Magazine`, écrite seulement quand elle existe.
 *
 * Module PUR : ni React, ni réseau, ni horloge. Les octets des polices ne sont pas ici (le navigateur les lit dans
 * `public/polices/`, voir `cheminPolice`) ; les noms, les noms PostScript et les métriques, eux, sont ici et le harnais les
 * relit dans les fichiers.
 */

import { ROLES_COULEUR, estHex, type CouleursNuancier, type RoleCouleur } from "./nuancier";
import { typographieFrancaise } from "./francais";
import type { Cadre, RoleCadre, Teinte } from "./types";

export { ROLES_COULEUR, estHex };
export type Role = RoleCouleur;
export type Couleurs = CouleursNuancier;

/* ─────────────────────────── les polices ─────────────────────────── */

/** Un style d'une famille : son nom PostScript EXACT (celui du fichier) et son nom de style, tels que l'IDML les nomme. */
export type Facette = { ps: string; style: string };

/**
 * Une famille du catalogue. `id` = le nom du paquet `@fontsource/<id>` d'où viennent les octets (copiés dans `public/polices/`).
 * `famille` = le nom EXACT sur Google Fonts. `metriques` : unités em du fichier (tables hhea), pour calculer la première
 * ligne de base : le PDF pose le texte comme le navigateur (demi-interlignage + hauteur de montée).
 */
export type Police = {
  id: string;
  famille: string;
  /** La variable CSS que `polices.ts` (next/font/google) déclare pour cette famille. */
  variable: string;
  metriques: { upm: number; asc: number; desc: number };
  /** Les graisses du catalogue qui s'en servent, chacune avec son fichier. */
  graisses: Readonly<Record<number, Facette>>;
};

const police = (id: string, famille: string, upm: number, asc: number, desc: number, graisses: Record<number, Facette>): Police => ({
  id, famille, variable: `--pf-${id}`, metriques: { upm, asc, desc }, graisses,
});
const f = (ps: string, style: string): Facette => ({ ps, style });

export const POLICES: readonly Police[] = [
  police("bodoni-moda", "Bodoni Moda", 2000, 2250, 800, { 400: f("BodoniModa-Regular", "Regular") }),
  police("hanken-grotesk", "Hanken Grotesk", 1000, 1000, 303, { 400: f("HankenGrotesk-Regular", "Regular") }),
  police("instrument-serif", "Instrument Serif", 1000, 990, 310, { 400: f("InstrumentSerif-Regular", "Regular") }),
  police("instrument-sans", "Instrument Sans", 1000, 970, 250, { 400: f("InstrumentSans-Regular", "Regular") }),
  police("marcellus", "Marcellus", 2048, 1995, 573, { 400: f("Marcellus-Regular", "Regular") }),
  police("ysabeau", "Ysabeau", 1000, 1054, 289, { 400: f("Ysabeau-Regular", "Regular") }),
  police("archivo", "Archivo", 1000, 878, 210, { 400: f("Archivo-Regular", "Regular"), 900: f("Archivo-Black", "Black") }),
  police("barlow-condensed", "Barlow Condensed", 1000, 1000, 200, { 900: f("BarlowCondensed-Black", "Black") }),
  police("barlow", "Barlow", 1000, 1000, 200, { 400: f("Barlow-Regular", "Regular") }),
  police("anton", "Anton", 2048, 2409, 674, { 400: f("Anton-Regular", "Regular") }),
  police("source-serif-4", "Source Serif 4", 1000, 1036, 335, { 400: f("SourceSerif4-Regular", "Regular") }),
  police("fraunces", "Fraunces", 2000, 1956, 510, { 900: f("Fraunces-Black", "Black") }),
  police("work-sans", "Work Sans", 1000, 930, 243, { 400: f("WorkSans-Regular", "Regular") }),
  police("yellowtail", "Yellowtail", 2048, 1990, 617, { 400: f("Yellowtail-Regular", "Regular") }),
  police("permanent-marker", "Permanent Marker", 1024, 1136, 325, { 400: f("PermanentMarker-Regular", "Regular") }),
  police("space-grotesk", "Space Grotesk", 1000, 984, 292, { 400: f("SpaceGrotesk-Regular", "Regular") }),
  police("caveat", "Caveat", 1000, 960, 300, { 700: f("Caveat-Bold", "Bold") }),
  police("lora", "Lora", 1000, 1006, 274, { 400: f("Lora-Regular", "Regular") }),
  police("nunito", "Nunito", 1000, 1011, 353, { 400: f("Nunito-Regular", "Regular"), 900: f("Nunito-Black", "Black") }),
  police("alegreya", "Alegreya", 1000, 1016, 345, { 700: f("Alegreya-Bold", "Bold") }),
  police("alegreya-sans", "Alegreya Sans", 1000, 900, 300, { 400: f("AlegreyaSans-Regular", "Regular") }),
  police("ibm-plex-sans-condensed", "IBM Plex Sans Condensed", 1000, 1025, 275, { 400: f("IBMPlexSansCond-Regular", "Regular"), 600: f("IBMPlexSansCond-SemiBold", "SemiBold") }),
  police("ibm-plex-mono", "IBM Plex Mono", 1000, 1025, 275, { 400: f("IBMPlexMono-Regular", "Regular") }),
  police("libre-caslon-display", "Libre Caslon Display", 1000, 970, 266, { 400: f("LibreCaslonDisplay-Regular", "Regular") }),
  police("libre-franklin", "Libre Franklin", 1000, 966, 246, { 400: f("LibreFranklin-Regular", "Regular") }),
  police("italiana", "Italiana", 1000, 928, 250, { 400: f("Italiana-Regular", "Regular") }),
  police("jost", "Jost", 1000, 1070, 375, { 400: f("Jost-Regular", "Regular"), 700: f("Jost-Bold", "Bold") }),
  police("inter-tight", "Inter Tight", 2048, 1984, 494, { 800: f("InterTight-ExtraBold", "ExtraBold") }),
  police("newsreader", "Newsreader", 2000, 1470, 530, { 400: f("Newsreader-Regular", "Regular") }),
  police("eb-garamond", "EB Garamond", 1000, 1007, 298, { 400: f("EBGaramond-Regular", "Regular") }),
];

const POLICE_PAR_ID: ReadonlyMap<string, Police> = new Map(POLICES.map((p) => [p.id, p]));
export const policeParId = (id: string): Police | null => POLICE_PAR_ID.get(id) ?? null;

/** Où le navigateur lit les octets d'une police (le TrueType des fichiers `@fontsource`, voir `scripts/polices-pdf.ts`). */
export const DOSSIER_POLICES = "/polices";
export const nomFichierPolice = (id: string, graisse: number): string => `${id}-${graisse}.ttf`;
export const cheminPolice = (id: string, graisse: number): string => `${DOSSIER_POLICES}/${nomFichierPolice(id, graisse)}`;

/* ─────────────────────────── les niveaux ─────────────────────────── */

export type NiveauNom = "titre" | "texte" | "legende";
export const NIVEAUX: readonly NiveauNom[] = ["titre", "texte", "legende"];

/**
 * Un niveau de texte. `corps` est le corps de RÉFÉRENCE du niveau : un gabarit qui pose un titre plus grand (« mot géant »,
 * 110 pt) garde son échelle, calculée sur `REFERENCE_CORPS` (`corpsDe`). `interligne` en multiple du corps ; `approche` en em.
 */
export type Niveau = { police: string; graisse: number; corps: number; interligne: number; capitales: boolean; approche: number };

/** Les corps de référence : ceux des gabarits d'avant le style (`TAILLE_DEFAUT`), donc l'échelle des gabarits est conservée. */
export const REFERENCE_CORPS: Readonly<Record<NiveauNom, number>> = { titre: 16, texte: 10, legende: 7 };

/**
 * L'interlignage de tous les niveaux : 120 %. C'est le bas de la fourchette de R-112 et, surtout, ce qu'Affinity relit seul
 * (D28 : l'interlignage d'un IDML est « toujours relu en auto 120 % ») : l'écran, le PDF et Affinity montrent la même chose.
 */
export const INTERLIGNE_STYLE = 1.2;

/** Le corps réel d'un texte : le corps du niveau, à l'échelle que son gabarit lui donne (taille ÷ taille de référence du rôle). */
export function corpsDe(niveau: Niveau, role: NiveauNom, taille: number): number {
  if (!Number.isFinite(taille) || taille <= 0) return niveau.corps;
  return Math.round(((niveau.corps * taille) / REFERENCE_CORPS[role]) * 100) / 100;
}

/* ─────────────────────────── les paires ─────────────────────────── */

export type Paire = {
  /** L'id du typographe : T-01 à T-17 (jamais T-04), TW-1 et TW-2. Stable : un magazine sauvegardé le référence. */
  id: string;
  nom: string;
  /** La famille des titres, puis celle de tout le reste (R-T-01 : deux familles, jamais trois). */
  titre: string;
  texte: string;
  /** L'humeur, en quelques mots, telle que le typographe la dit. */
  humeur: string;
  /** Ce que l'index par humeur (typographie.md §3) range ensemble : voyage, tendre, chic, pop, bande, sport, enfance, famille, archive… */
  occasions: readonly string[];
  niveaux: Readonly<Record<NiveauNom, Niveau>>;
};

type Reglage = {
  id: string; titre: [string, number]; texte: string; humeur: string; occasions: readonly string[];
  /** Le titre en capitales (le typographe l'écrit ainsi : MADRID, PORTO, PARIS), avec son approche. */
  capitales?: boolean; approche?: number;
  /** La légende en capitales espacées (R-T-14 : le repère, date ou lieu, est ce qui fait « magazine »). */
  reperes?: boolean;
  /** T-14 : le texte courant n'est pas en chasse fixe : il reste dans la famille des titres, en romain ; la chasse fixe est la légende. */
  texteEnTitre?: boolean;
};

function paire(r: Reglage): Paire {
  const [police, graisse] = r.titre;
  const nomFamille = (id: string): string => policeParId(id)?.famille ?? id;
  const titre: Niveau = { police, graisse, corps: REFERENCE_CORPS.titre, interligne: INTERLIGNE_STYLE, capitales: !!r.capitales, approche: r.approche ?? 0 };
  const texte: Niveau = { police: r.texteEnTitre ? police : r.texte, graisse: 400, corps: REFERENCE_CORPS.texte, interligne: INTERLIGNE_STYLE, capitales: false, approche: 0 };
  const legende: Niveau = { police: r.texte, graisse: 400, corps: REFERENCE_CORPS.legende, interligne: INTERLIGNE_STYLE, capitales: !!r.reperes, approche: r.reperes ? 0.08 : 0 };
  const a = nomFamille(police), b = nomFamille(r.texte);
  return { id: r.id, nom: a === b ? a : `${a} + ${b}`, titre: police, texte: r.texte, humeur: r.humeur, occasions: r.occasions, niveaux: { titre, texte, legende } };
}

/** Dix-huit paires, dans l'ordre de la table du typographe. Aucune n'est T-04 (Cormorant Garamond). */
export const PAIRES: readonly Paire[] = [
  paire({ id: "T-01", titre: ["bodoni-moda", 400], texte: "hanken-grotesk", humeur: "chic, éditorial, grand magazine", occasions: ["voyage", "ville", "chic"], capitales: true, reperes: true }),
  paire({ id: "T-02", titre: ["instrument-serif", 400], texte: "instrument-sans", humeur: "tendre moderne, mode", occasions: ["tendre", "chic"] }),
  paire({ id: "T-03", titre: ["marcellus", 400], texte: "ysabeau", humeur: "voyage lumineux, lieux, mer", occasions: ["voyage", "mer", "chic"], capitales: true, reperes: true }),
  paire({ id: "T-05", titre: ["archivo", 900], texte: "archivo", humeur: "pop, été, aplats", occasions: ["pop", "mer"], capitales: true, reperes: true }),
  paire({ id: "T-06", titre: ["barlow-condensed", 900], texte: "barlow", humeur: "sport, rallye, course", occasions: ["sport"], capitales: true }),
  paire({ id: "T-07", titre: ["anton", 400], texte: "source-serif-4", humeur: "bande, fête, affiche", occasions: ["bande", "sport", "archive"], capitales: true }),
  paire({ id: "T-08", titre: ["fraunces", 900], texte: "work-sans", humeur: "rétro années 70, été, gourmand", occasions: ["pop", "voyage"], capitales: true }),
  paire({ id: "T-09", titre: ["yellowtail", 400], texte: "archivo", humeur: "carte postale, vacances, ville au soleil", occasions: ["voyage", "pop"] }),
  paire({ id: "T-10", titre: ["permanent-marker", 400], texte: "space-grotesk", humeur: "bande de copains, une année, blagues", occasions: ["bande"], reperes: true }),
  paire({ id: "T-11", titre: ["caveat", 700], texte: "lora", humeur: "carnet intime, lettre, voyage à deux", occasions: ["tendre", "carnet"] }),
  paire({ id: "T-12", titre: ["nunito", 900], texte: "nunito", humeur: "enfance, naissance", occasions: ["enfance"] }),
  paire({ id: "T-13", titre: ["alegreya", 700], texte: "alegreya-sans", humeur: "nature, montagne, île, maison de famille", occasions: ["nature", "mer", "famille"], reperes: true }),
  paire({ id: "T-14", titre: ["ibm-plex-sans-condensed", 600], texte: "ibm-plex-mono", humeur: "archive, nuit, journal heure par heure", occasions: ["archive", "nuit"], texteEnTitre: true }),
  paire({ id: "T-15", titre: ["libre-caslon-display", 400], texte: "libre-franklin", humeur: "famille, classique chaleureux", occasions: ["famille"], reperes: true }),
  paire({ id: "T-16", titre: ["italiana", 400], texte: "jost", humeur: "mariage, chic léger", occasions: ["chic", "mariage"], capitales: true, reperes: true }),
  paire({ id: "T-17", titre: ["inter-tight", 800], texte: "newsreader", humeur: "ville, contemporain, éditorial moderne", occasions: ["voyage", "ville"], capitales: true }),
  paire({ id: "TW-1", titre: ["eb-garamond", 400], texte: "jost", humeur: "calme, aéré, intime", occasions: ["galerie", "carnet"], capitales: true, approche: 0.2 }),
  paire({ id: "TW-2", titre: ["jost", 700], texte: "newsreader", humeur: "élégant et direct, culture, ville", occasions: ["éditorial", "voyage", "ville"] }),
];

const PAIRE_PAR_ID: ReadonlyMap<string, Paire> = new Map(PAIRES.map((p) => [p.id, p]));
export const paireParId = (id: string): Paire | null => PAIRE_PAR_ID.get(id) ?? null;

/** Les familles (et leurs graisses) qu'une paire met en jeu : ce que l'export nomme et ce que le PDF embarque. */
export function facettesDe(p: Paire): { police: Police; graisse: number; facette: Facette }[] {
  const vus = new Set<string>();
  const out: { police: Police; graisse: number; facette: Facette }[] = [];
  for (const n of NIVEAUX) {
    const { police: id, graisse } = p.niveaux[n];
    const k = `${id}|${graisse}`;
    const pol = policeParId(id);
    const fac = pol?.graisses[graisse];
    if (vus.has(k) || !pol || !fac) continue;
    vus.add(k);
    out.push({ police: pol, graisse, facette: fac });
  }
  return out;
}

/* ─────────────────────────── le style du magazine ─────────────────────────── */

export type StyleMagazine = { paire: string; couleurs: Couleurs };

/**
 * Le nuancier d'avant le style, rendu explicite : l'aplat terracotta de la marque (`--bj-terracotta`, l'ancienne nuance
 * « Aplat ») devient le rôle aplat sourd ; le noir de l'écran (#231f20) sert l'encre et la nuit ; le papier est blanc.
 */
export const COULEURS_ORIGINE: Readonly<Couleurs> = {
  papier: "#ffffff", encre: "#231f20", aplatClair: "#ebdace", aplatSourd: "#bc977d", accent: "#856045", nuit: "#231f20",
};

/** Le style d'une paire avec le nuancier d'origine (ou celui donné). */
export const styleDePaire = (id: string, couleurs: Couleurs = { ...COULEURS_ORIGINE }): StyleMagazine | null => (paireParId(id) ? { paire: id, couleurs: { ...couleurs } } : null);

/** Le style, relu EXACTEMENT : une paire du catalogue, six couleurs `#rrggbb` (minuscules), rien d'autre. */
export function styleValide(v: unknown): v is StyleMagazine {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  const cles = Object.keys(o);
  if (cles.length !== 2 || !cles.includes("paire") || !cles.includes("couleurs")) return false;
  if (typeof o.paire !== "string" || !paireParId(o.paire)) return false;
  const c = o.couleurs;
  if (typeof c !== "object" || c === null || Array.isArray(c)) return false;
  const k = Object.keys(c);
  return k.length === ROLES_COULEUR.length && ROLES_COULEUR.every((r) => k.includes(r) && estHex((c as Record<string, unknown>)[r]));
}

export const styleEgal = (a: StyleMagazine | undefined, b: StyleMagazine | undefined): boolean =>
  !a || !b ? a === b : a.paire === b.paire && ROLES_COULEUR.every((r) => a.couleurs[r] === b.couleurs[r]);

/* ─────────────────────────── les teintes et les couleurs de texte, lues par rôle ─────────────────────────── */

/** Le rôle d'une teinte d'aplat : les trois alias d'avant (aplat → aplat sourd, noir → nuit, blanc → papier) et les six rôles. */
export function roleDeTeinte(t: Teinte): Role {
  return t === "aplat" ? "aplatSourd" : t === "noir" ? "nuit" : t === "blanc" ? "papier" : t;
}
/** Sans style, une teinte qui est un RÔLE (un gabarit récent) retombe sur la teinte d'avant la plus proche : jamais un aplat qui disparaît. */
export function teinteAncienne(t: Teinte): "aplat" | "noir" | "blanc" {
  if (t === "aplat" || t === "noir" || t === "blanc") return t;
  return t === "papier" ? "blanc" : t === "encre" || t === "nuit" ? "noir" : "aplat";
}
/** Le rôle de la couleur d'un texte : absente = l'encre ; « blanc » = le papier (en réserve) ; un rôle = lui-même. */
export function roleDeCouleurTexte(c: Cadre["couleur"]): Role {
  return c === undefined ? "encre" : c === "blanc" ? "papier" : c;
}
export const couleurDeRole = (s: StyleMagazine, r: Role): string => s.couleurs[r];

/** Un nom lisible pour chaque rôle (la pastille, la nuance de l'IDML). */
export const NOM_ROLE: Readonly<Record<Role, string>> = {
  papier: "Papier", encre: "Encre", aplatClair: "Aplat clair", aplatSourd: "Aplat sourd", accent: "Accent", nuit: "Nuit",
};
/** Les nuances de l'IDML : « Self » sans espace ni accent, nom en français. */
export const NUANCE_ROLE: Readonly<Record<Role, { self: string; nom: string }>> = {
  papier: { self: "Color/Papier", nom: "Papier" },
  encre: { self: "Color/Encre", nom: "Encre" },
  aplatClair: { self: "Color/AplatClair", nom: "Aplat clair" },
  aplatSourd: { self: "Color/AplatSourd", nom: "Aplat sourd" },
  accent: { self: "Color/Accent", nom: "Accent" },
  nuit: { self: "Color/Nuit", nom: "Nuit" },
};

/** Les variables CSS qui portent le style sur la racine de l'éditeur : les six rôles, et les trois alias que le CSS d'avant lit. */
export function variablesStyle(s: StyleMagazine): Record<string, string> {
  const c = s.couleurs;
  return {
    "--mep-r-papier": c.papier, "--mep-r-encre": c.encre, "--mep-r-aplat-clair": c.aplatClair,
    "--mep-r-aplat-sourd": c.aplatSourd, "--mep-r-accent": c.accent, "--mep-r-nuit": c.nuit,
    "--mep-aplat": c.aplatSourd, "--mep-noir": c.nuit, "--mep-papier": c.papier,
  };
}
/** Le nom CSS du rôle d'une teinte : `aplatSourd` → `aplat-sourd`. */
export const classeRole = (r: Role): string => r.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/* ─────────────────────────── ce qu'un texte devient ─────────────────────────── */

export type TexteStyle = {
  niveau: NiveauNom;
  police: Police;
  graisse: number;
  facette: Facette;
  corps: number;
  interligne: number;
  capitales: boolean;
  approche: number;
  role: Role;
  couleur: string;
};

/** Le niveau d'un rôle de cadre texte (titre, texte, légende). */
export const niveauDeRole = (role: Exclude<RoleCadre, "photo">): NiveauNom => role;

/**
 * Tout ce qu'il faut pour écrire un texte sous un style : sa police, sa graisse, son corps (à l'échelle de son gabarit),
 * son interlignage, ses capitales, son approche et sa couleur (par rôle). Rend null si la paire ne se relit plus (un id
 * qui sortirait du catalogue : le texte retombe alors sur le rendu d'avant le style).
 */
export function texteStyle(s: StyleMagazine, role: Exclude<RoleCadre, "photo">, taille: number, couleur?: Cadre["couleur"]): TexteStyle | null {
  const p = paireParId(s.paire);
  if (!p) return null;
  const n = p.niveaux[niveauDeRole(role)];
  const pol = policeParId(n.police);
  const fac = pol?.graisses[n.graisse];
  if (!pol || !fac) return null;
  const r = roleDeCouleurTexte(couleur);
  return {
    niveau: niveauDeRole(role), police: pol, graisse: n.graisse, facette: fac, corps: corpsDe(n, niveauDeRole(role), taille),
    interligne: n.interligne, capitales: n.capitales, approche: n.approche, role: r, couleur: s.couleurs[r],
  };
}

/** Le texte du client, corrigé en français pour l'affichage et l'export (le texte gardé ne change jamais). */
export const texteTypo = (contenu: string): string => typographieFrancaise(contenu);
/** Les capitales d'un niveau : les accents restent (« été » → « ÉTÉ »). */
export const enCapitales = (texte: string): string => texte.toLocaleUpperCase("fr");
/** Le texte tel qu'il s'écrit sous un style : typographie française, puis capitales si le niveau les veut. */
export const texteSousStyle = (contenu: string, t: Pick<TexteStyle, "capitales">): string => (t.capitales ? enCapitales(texteTypo(contenu)) : texteTypo(contenu));

/** La première ligne de base, en multiples du corps, depuis le haut du cadre : demi-interlignage + montée de la police (le modèle CSS). */
export function premiereBase(pol: Police, interligne: number): number {
  const { upm, asc, desc } = pol.metriques;
  const contenu = (asc + desc) / upm;
  return (interligne - contenu) / 2 + asc / upm;
}
