/**
 * L'export IDML (brief §8) : le magazine en fichiers XML d'un paquet que
 * Affinity ouvre avec de vrais cadres photo et des textes modifiables.
 *
 * Portage FIDÈLE de `idml-test-generator.py`, validé dans Affinity le 27/10 :
 * mêmes éléments, mêmes attributs, même ordre de paquet. Ne pas « améliorer »
 * un attribut sans refaire l'essai dans Affinity (`scripts/idml-essai.ts`).
 *
 * Repère IDML : points (PT_PAR_MM), origine de chaque planche au milieu du pli,
 * Y centré sur la hauteur. Page gauche à x = −210 mm, page droite à 0.
 *
 * Module pur : ni fs, ni réseau, ni horloge. Tourne dans le navigateur.
 * Le zip est fait à part (`paquet.ts`).
 */

import { PAGE_H, PAGE_L, PT_PAR_MM, FOND_PERDU, MARGES, GRILLE, largeurCouverture } from "./geometrie";
import { cadrer } from "./recadrage";
import { cadresDe, coteSeul, decorDe, dispositionDe, type CoteSeul, type Disposition, type Magazine, type Planche } from "./magazine";
import type { Aplat, Cadre, RoleCadre, Teinte } from "./types";
import {
  NIVEAUX, NUANCE_ROLE, ROLES_COULEUR, facettesDe, paireParId, roleDeTeinte, teinteAncienne, texteStyle, texteTypo,
  type NiveauNom, type Paire, type StyleMagazine,
} from "./style";
import { hexVersRgb } from "./nuancier";
import { cadresCouverture, contenuImprime, decorCouverture, idsCouverture, type Couverture } from "./couverture";
import { nuanceIdml, piecesDuFond, type CouleurLibre, type PieceFond } from "./couleursLibres";

/** Une photo prête à l'export : l / h en px APRÈS orientation EXIF, `nomLien` unique dans Links/. */
/** `l` × `h` : dimensions DROITES. `tag` : orientation EXIF du fichier (1 ou absent = stocké droit). */
export type PhotoExport = { id: string; nomLien: string; l: number; h: number; tag?: number };

/**
 * Le placement d'une image dont le fichier est stocké tourné (tag EXIF 2 à 8). Affinity IGNORE ce tag (essai
 * Australie du 28/10 : portraits couchés et étirés) : on décrit donc l'image telle qu'elle est STOCKÉE
 * (GraphicBounds = pixels du fichier) et la matrice fait la rotation ou le miroir vers l'image droite, posée à
 * l'échelle `s` en (tx, ty). Image droite l × h ; stockée ls × hs (permutées pour 5 à 8).
 * x' = a·x + c·y + tx, y' = b·x + d·y + ty (Y vers le bas).
 */
export function placementOriente(tag: number | undefined, l: number, h: number, s: number, tx: number, ty: number): { m: [number, number, number, number, number, number]; ls: number; hs: number } {
  const t = typeof tag === "number" && Number.isInteger(tag) && tag >= 1 && tag <= 8 ? tag : 1;
  const ls = t >= 5 ? h : l;
  const hs = t >= 5 ? l : h;
  const m: Record<number, [number, number, number, number, number, number]> = {
    1: [s, 0, 0, s, tx, ty],
    2: [-s, 0, 0, s, tx + s * ls, ty],
    3: [-s, 0, 0, -s, tx + s * ls, ty + s * hs],
    4: [s, 0, 0, -s, tx, ty + s * hs],
    5: [0, s, s, 0, tx, ty],
    6: [0, s, -s, 0, tx + s * hs, ty],
    7: [0, -s, -s, 0, tx + s * hs, ty + s * ls],
    8: [0, -s, s, 0, tx, ty + s * ls],
  };
  return { m: m[t], ls, hs };
}

export type OptionsLiens =
  | { mode: "relatif" }
  | { mode: "relatif-file" }
  | { mode: "absolu"; dossier: string };

export type FichierIdml = { chemin: string; contenu: string };

export const MIMETYPE_IDML = "application/vnd.adobe.indesign-idml-package";

/* ─────────────────────────── Les noms de liens ─────────────────────────── */

/** Interdits dans un nom de fichier (Windows compris) et caractères de contrôle. */
const INTERDITS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;

const decouper = (nom: string): { base: string; ext: string } => {
  const i = nom.lastIndexOf(".");
  return i > 0 ? { base: nom.slice(0, i), ext: nom.slice(i) } : { base: nom, ext: "" };
};

/**
 * Un nom unique par photo dans Links/ : le nom d'origine est gardé, les
 * caractères interdits deviennent « _ », un doublon (insensible à la casse)
 * prend « (2) », « (3) »… avant l'extension. Ordre d'entrée respecté : le
 * premier garde son nom.
 */
export function nomsDeLiens(noms: { id: string; nom: string }[]): Map<string, string> {
  const pris = new Set<string>();
  const sortie = new Map<string, string>();
  for (const { id, nom } of noms) {
    if (sortie.has(id)) continue;
    const propre = nom.replace(INTERDITS, "_").trim() || "photo";
    const { base, ext } = decouper(propre);
    let candidat = propre;
    for (let k = 2; pris.has(candidat.toLowerCase()); k++) candidat = `${base} (${k})${ext}`;
    pris.add(candidat.toLowerCase());
    sortie.set(id, candidat);
  }
  return sortie;
}

/* ─────────────────────────── Les outils XML ─────────────────────────── */

const K = PT_PAR_MM;
const PW = PAGE_L * K;
const PH = PAGE_H * K;
const HH = PH / 2;
const NS = 'xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="16.0"';
const PI = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
/** Essais du 29/10 dans Affinity (D28) : sans `ItemLayer`, l'objet tombe hors de « Calque 1 » ;
 *  la `<Language>` du designmap ne suffit pas, le texte arrive en en-US sans `AppliedLanguage` ;
 *  sans `CMYKProfile`, Affinity prend U.S. Web Coated (SWOP). */
export const CALQUE = "ly1";
export const LANGUE = "$ID/French";
export const PROFILS_COULEUR = 'CMYKProfile="Coated FOGRA39 (ISO 12647-2:2004)" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk"';

/** Échappement XML, contenus ET attributs. */
export const echapperXml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Le `:.Nf` du Python, sans « -0.0000 ». */
const f = (v: number, n: number): string => {
  const s = (Number.isFinite(v) ? v : 0).toFixed(n);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
};

/** `urllib.parse.quote` (UTF-8, `/` gardé, `_.-~` gardés, tout le reste encodé). */
export const quoteUri = (chemin: string): string =>
  chemin.split("/").map((seg) => encodeURIComponent(seg).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join("/");

export function uriDeLien(nomLien: string, liens: OptionsLiens): string {
  const nom = quoteUri(nomLien.replace(/\//g, "_"));
  if (liens.mode === "relatif") return `Links/${nom}`;
  if (liens.mode === "relatif-file") return `file:Links/${nom}`;
  const dossier = liens.dossier.replace(/\/+$/, "");
  return `file:${quoteUri(`${dossier}/Links/${nomLien.replace(/\//g, "_")}`)}`;
}

const rectPts = (x: number, y: number, w: number, h: number): string =>
  ([[x, y], [x, y + h], [x + w, y + h], [x + w, y]] as const)
    .map(([a, b]) => `<PathPointType Anchor="${f(a, 4)} ${f(b, 4)}" LeftDirection="${f(a, 4)} ${f(b, 4)}" RightDirection="${f(a, 4)} ${f(b, 4)}"/>`)
    .join("");

const geom = (x: number, y: number, w: number, h: number): string =>
  `<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>${rectPts(x, y, w, h)}</PathPointArray></GeometryPathType></PathGeometry></Properties>`;

/** Repère planche mm → points IDML (le `conv` du Python, planche double comme planche 0 décalée de +210). */
export const conv = (c: { x: number; y: number; l: number; h: number }): { x: number; y: number; w: number; h: number } =>
  ({ x: (c.x - PAGE_L) * K, y: c.y * K - HH, w: c.l * K, h: c.h * K });

/**
 * Un cadre photo qui part EXACTEMENT du pli (x = 0, page droite) est décollé de 0,01 pt (0,004 mm, invisible).
 * Affinity (essai Australie du 28/10) double ce cadre et son image en largeur quand l'image recadrée dépasse
 * aussi le bord gauche de la planche ; à 0,01 pt du pli, plus rien. L'image, elle, ne bouge pas.
 */
export const DECOLLEMENT_PLI_PT = 0.01;
export function cadreAuPli(x: number, w: number): { x: number; w: number } {
  return Math.abs(x) < 1e-6 ? { x: DECOLLEMENT_PLI_PT, w: w - DECOLLEMENT_PLI_PT } : { x, w };
}

/**
 * Rotation autour du centre du cadre (degrés, sens horaire à l'écran, Y vers
 * le bas) : x' = a·x + c·y + tx, y' = b·x + d·y + ty. Sans rotation : identité
 * écrite comme le Python.
 */
export function transformRotation(deg: number | undefined, x: number, y: number, w: number, h: number): string {
  if (!deg || !Number.isFinite(deg) || deg % 360 === 0) return "1 0 0 1 0 0";
  const r = (deg * Math.PI) / 180;
  const a = Math.cos(r), b = Math.sin(r), c = -Math.sin(r), d = Math.cos(r);
  const cx = x + w / 2, cy = y + h / 2;
  const tx = cx - (a * cx + c * cy);
  const ty = cy - (b * cx + d * cy);
  return `${f(a, 6)} ${f(b, 6)} ${f(c, 6)} ${f(d, 6)} ${f(tx, 4)} ${f(ty, 4)}`;
}

const MP = `<MarginPreference ColumnCount="${GRILLE.colonnes}" ColumnGutter="${GRILLE.gouttiere * K}" Top="${MARGES.haut * K}" Bottom="${MARGES.bas * K}" Left="${MARGES.interieure * K}" Right="${MARGES.exterieure * K}"/>`;

const page = (pid: string, nom: string, gauche: boolean): string =>
  `<Page Self="${pid}" Name="${nom}" AppliedMaster="n" GeometricBounds="0 0 ${f(PH, 4)} ${f(PW, 4)}" ItemTransform="1 0 0 1 ${f(gauche ? -PW : 0, 4)} ${f(-HH, 4)}">${MP}</Page>`;

/* ─────────────────────────── La construction ─────────────────────────── */

const LIBELLES: Record<RoleCadre, string> = { photo: "Photo", titre: "Titre", texte: "Texte", legende: "Légende" };

/** Ce qu'un cadre lit : une disposition de planche, ou la couverture (lot B), qui portent toutes deux photos et textes. */
type Porteur = Pick<Disposition, "photos" | "textes">;
type Element = { cadre: Cadre; disposition: Porteur; indexPhoto: number; indexTexte: number };

/** Les dispositions posées sur une planche, avec leur cible. `seul` : le côté de la page seule (la première : droite ; la dernière, lot E : gauche), `null` pour une planche courante. */
function partsDe(p: Planche, seul: CoteSeul | null): { d: Disposition; cible: "double" | "gauche" | "droite" }[] {
  const parts: { d: Disposition; cible: "double" | "gauche" | "droite" }[] = [];
  if (seul) {
    const d = dispositionDe(p, seul);
    if (d) parts.push({ d, cible: seul });
  } else if (p.mode === "double") {
    if (p.double) parts.push({ d: p.double, cible: "double" });
  } else {
    if (p.gauche) parts.push({ d: p.gauche, cible: "gauche" });
    if (p.droite) parts.push({ d: p.droite, cible: "droite" });
  }
  return parts;
}

/** Les cadres d'une planche, repère planche, avec leur affectation (photo ou texte) par index. */
function elementsDe(p: Planche, seul: CoteSeul | null): Element[] {
  return partsDe(p, seul).flatMap(({ d, cible }) => {
    let iP = 0, iT = 0;
    return cadresDe(d, cible).map((cadre) => {
      const e: Element = { cadre, disposition: d, indexPhoto: cadre.role === "photo" ? iP : -1, indexTexte: cadre.role === "photo" ? -1 : iT };
      if (cadre.role === "photo") iP++; else iT++;
      return e;
    });
  });
}

/** La nuance d'un aplat (D28 : un fond de couleur est relu fidèlement). Sans style : les trois nuances d'avant le lot C. */
const NUANCE: Record<"aplat" | "noir" | "blanc", string> = { aplat: "Color/Aplat", noir: "Color/Black", blanc: "Color/Paper" };
/** Sans style, une teinte qui est un RÔLE du nuancier (un gabarit récent) retombe sur la nuance d'avant la plus proche. */
const nuanceSansStyle = (t: Teinte): string => NUANCE[teinteAncienne(t)];
/** Avec un style : la nuance NOMMÉE du rôle de la teinte (aplat → aplat sourd, noir → nuit, blanc → papier). */
const nuanceSousStyle = (t: Teinte): string => NUANCE_ROLE[roleDeTeinte(t)].self;


/**
 * « Aplat » : UNE nuance nommée pour tous les aplats du magazine, à changer d'un coup dans Affinity. Sa valeur par
 * défaut est la terracotta de la marque (`--bj-terracotta` #bc977d, tokens.css) tant que le nuancier n'est pas choisi.
 */
export const COULEUR_APLAT = `<Color Self="Color/Aplat" Model="Process" Space="RGB" ColorValue="188 151 125" Name="Aplat"/>`;

/** Bord blanc (intérieur) et coins arrondis d'un cadre photo, en attributs IDML. */
export function habillagePhoto(c: Cadre, couleurBord = "Color/Paper"): string {
  const bord = c.bord && c.bord > 0 ? `StrokeWeight="${f(c.bord * K, 4)}" StrokeColor="${couleurBord}" StrokeAlignment="InsideAlignment"` : `StrokeWeight="0"`;
  if (!c.rayon || !(c.rayon > 0)) return bord;
  const r = f(c.rayon * K, 4);
  const coins = ["TopLeft", "TopRight", "BottomLeft", "BottomRight"].map((k) => `${k}CornerOption="RoundedCorner" ${k}CornerRadius="${r}"`).join(" ");
  return `${bord} ${coins}`;
}

/** Le contenu d'une Story : un saut de ligne devient un `<Br/>` IDML. */
const contenuStory = (texte: string): string =>
  texte.split(/\r\n|\r|\n/).map((l) => `<Content>${echapperXml(l)}</Content>`).join("<Br/>");

/* ─────────────────────────── Le style du magazine (lot C) ─────────────────────────── */

/** Le style qui s'applique à un export : celui du magazine et sa paire, ou null (le rendu d'avant le lot C). */
export type StyleActif = { style: StyleMagazine; paire: Paire };
/** Le style qui s'applique : celui du magazine si sa paire est encore au catalogue, sinon aucun (le rendu d'avant). */
export const styleActif = (style: StyleMagazine | null | undefined): StyleActif | null => {
  const paire = style ? paireParId(style.paire) : null;
  return style && paire ? { style, paire } : null;
};

/** Les six nuances nommées, une par rôle (RVB, comme l'ancienne nuance « Aplat »). */
export const nuancesDuStyle = (s: StyleMagazine): string =>
  ROLES_COULEUR.map((r) => `<Color Self="${NUANCE_ROLE[r].self}" Model="Process" Space="RGB" ColorValue="${hexVersRgb(s.couleurs[r]).join(" ")}" Name="${echapperXml(NUANCE_ROLE[r].nom)}"/>`).join("");

/**
 * Les polices NOMMÉES de la paire : chaque famille avec ses styles, chaque style avec son nom PostScript EXACT (lu dans le
 * fichier de police, relu par le harnais). Une police absente du poste est substituée sans bruit par Affinity : on ne peut
 * que la nommer juste.
 */
export function fontsDuStyle(p: Paire): string {
  const familles = new Map<string, { famille: string; faces: { ps: string; style: string }[] }>();
  for (const { police, facette } of facettesDe(p)) {
    const g = familles.get(police.id) ?? { famille: police.famille, faces: [] };
    g.faces.push(facette);
    familles.set(police.id, g);
  }
  let i = 0;
  return [...familles.values()].map((g) => {
    i += 1;
    const faces = g.faces.map((fc, k) => `<Font Self="di${i}Font${k + 1}" FontFamily="${echapperXml(g.famille)}" Name="${echapperXml(`${g.famille} ${fc.style}`)}" PostScriptName="${echapperXml(fc.ps)}" FontStyleName="${echapperXml(fc.style)}"/>`).join("");
    return `<FontFamily Self="di${i}" Name="${echapperXml(g.famille)}">${faces}</FontFamily>`;
  }).join("");
}

/** Le nom du style de paragraphe d'un niveau (« Titre », « Texte », « Légende »). */
export const STYLE_PARAGRAPHE: Readonly<Record<NiveauNom, { self: string; nom: string }>> = {
  titre: { self: "ParagraphStyle/Titre", nom: "Titre" },
  texte: { self: "ParagraphStyle/Texte", nom: "Texte" },
  legende: { self: "ParagraphStyle/Legende", nom: "Légende" },
};

/**
 * Les styles de paragraphe Titre, Texte et Légende, qui héritent du style normal : police, style de la police, corps,
 * capitales, approche et couleur (l'encre). Pas d'interlignage écrit : Affinity le relit toujours en auto 120 % (D28), qui est
 * justement l'interlignage de tous les niveaux (`INTERLIGNE_STYLE`).
 */
export function stylesDuStyle(p: Paire): string {
  const niveaux = NIVEAUX.map((n) => {
    const nv = p.niveaux[n];
    const pol = facettesDe(p).find((x) => x.police.id === nv.police && x.graisse === nv.graisse);
    if (!pol) return "";
    const ps = STYLE_PARAGRAPHE[n];
    const attrs = `PointSize="${nv.corps}" FontStyle="${echapperXml(pol.facette.style)}" FillColor="${NUANCE_ROLE.encre.self}" Justification="LeftAlign"`
      + (nv.capitales ? ` Capitalization="AllCaps"` : "") + (nv.approche ? ` Tracking="${Math.round(nv.approche * 1000)}"` : "");
    return `<ParagraphStyle Self="${ps.self}" Name="${echapperXml(ps.nom)}" ${attrs}><Properties><BasedOn type="object">ParagraphStyle/$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">${echapperXml(pol.police.famille)}</AppliedFont></Properties></ParagraphStyle>`;
  }).join("");
  const base = facettesDe(p).find((x) => x.police.id === p.niveaux.texte.police && x.graisse === p.niveaux.texte.graisse);
  return `<RootCharacterStyleGroup Self="rcs"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/></RootCharacterStyleGroup>`
    + `<RootParagraphStyleGroup Self="rps"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/>`
    + `<ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" PointSize="${p.niveaux.texte.corps}" FillColor="${NUANCE_ROLE.encre.self}"><Properties><BasedOn type="object">ParagraphStyle/$ID/[No paragraph style]</BasedOn><AppliedFont type="string">${echapperXml(base?.police.famille ?? "Arial")}</AppliedFont></Properties></ParagraphStyle>`
    + `${niveaux}</RootParagraphStyleGroup><RootObjectStyleGroup Self="ros"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/></RootObjectStyleGroup>`;
}

/** Le fond de la page quand le papier du style n'est pas blanc : un aplat « Papier » sous tout, fond perdu compris. */
const FOND_PAGE_BLANC = "#ffffff";

/**
 * Les fabriques d'objets d'UN paquet (lot B : sorties de `construireIdml` pour que la couverture écrive ses photos et ses
 * textes avec EXACTEMENT les mêmes éléments ; l'IDML intérieur n'a pas changé d'un octet, empreinte au harnais).
 * `convertir` passe du repère mm de l'élément aux points du Spread.
 */
type Spread = { sid: string; pc: number; bl: number; corps: string };
function fabrique(photos: Map<string, PhotoExport>, options: { liens: OptionsLiens }, convertir: (c: { x: number; y: number; l: number; h: number }) => { x: number; y: number; w: number; h: number }, sty: StyleActif | null = null, ajusterTitres = false) {
  let uid = 100;
  const nid = (p = "u"): string => { uid += 1; return `${p}${uid.toString(16)}`; };
  const stories: { sid: string; corps: string }[] = [];
  /* lot G : les nuances que les couleurs LIBRES demandent (un hexa, ou un rôle sans style), déclarées dans Graphic.xml dans l'ordre
     de leur premier usage ; aucune tant que le magazine n'a ni fond ni couleur de texte (l'IDML d'avant, octet pour octet) */
  const libres = new Map<string, string>();
  const nuance = (c: CouleurLibre): string => {
    const n = nuanceIdml(c, !!sty);
    if (n.declarer && !libres.has(n.self)) libres.set(n.self, n.declarer);
    return n.self;
  };

  const photoXml = (e: Element, nom: string): string => {
    const { x, y, w, h } = convertir(e.cadre);
    const pli = cadreAuPli(x, w);
    /* Cadre tourné : la rotation va dans la matrice du CADRE, l'image garde sa matrice non tournée (repère intérieur
       du cadre), comme l'essai Affinity du 29/10 « cadre photo tourné 15° ». */
    const ouvre = `<Rectangle Self="${nid()}" Name="${echapperXml(nom)}" ItemLayer="${CALQUE}" ContentType="GraphicType" StoryTitle="$ID/" ${habillagePhoto(e.cadre, sty ? NUANCE_ROLE.papier.self : undefined)} ItemTransform="${transformRotation(e.cadre.rotation, pli.x, y, pli.w, h)}">${geom(pli.x, y, pli.w, h)}`
      + `<FrameFittingOption FittingOnEmptyFrame="FillProportionally" FittingAlignment="CenterAnchor"/>`;
    const aff = e.disposition.photos[e.indexPhoto];
    const ph = aff?.photoId ? photos.get(aff.photoId) : undefined;
    if (!aff || !ph) return `${ouvre}</Rectangle>`;
    const cg = cadrer({ l: ph.l, h: ph.h }, { l: e.cadre.l, h: e.cadre.h }, aff.recadrage);
    const s = cg.echelle * K;
    const tx = x + cg.x * K;
    const ty = y + cg.y * K;
    const po = placementOriente(ph.tag, ph.l, ph.h, s, tx, ty);
    /* L'écriture courte ne vaut que pour une image DROITE (tag 1) : le demi-tour (tag 3) a aussi m[0] === m[3]. */
    const it = po.m[1] === 0 && po.m[2] === 0 && po.m[0] === s && po.m[3] === s
      ? `${f(s, 6)} 0 0 ${f(s, 6)} ${f(tx, 4)} ${f(ty, 4)}`
      : `${po.m.slice(0, 4).map((v) => (v === 0 ? "0" : f(v, 6))).join(" ")} ${f(po.m[4], 4)} ${f(po.m[5], 4)}`;
    return `${ouvre}<Image Self="${nid()}" ItemTransform="${it}" ActualPpi="72 72"><Properties><Profile type="string">$ID/Embedded</Profile><GraphicBounds Left="0" Top="0" Right="${po.ls}" Bottom="${po.hs}"/></Properties>`
      + `<Link Self="${nid()}" LinkResourceURI="${echapperXml(uriDeLien(ph.nomLien, options.liens))}" LinkResourceFormat="$ID/JPEG" StoredState="Normal"/></Image></Rectangle>`;
  };

  const texteXml = (e: Element, nom: string): string => {
    const { x, y, w, h } = convertir(e.cadre);
    const t = e.disposition.textes[e.indexTexte];
    const contenu = t?.contenu ?? "";
    const taille = t?.taille ?? e.cadre.taille ?? 10;
    const gras = t?.gras ?? e.cadre.gras ?? false;
    const sid = nid("st");
    /* un titre s'ajuste à son cadre avec les chasses de sa police (l'intérieur ; le mot-titre de la couverture a son propre calcul) */
    const ts = sty && e.cadre.role !== "photo"
      ? texteStyle(sty.style, e.cadre.role, taille, t?.couleur ?? e.cadre.couleur, ajusterTitres ? { contenu, l: e.cadre.l, h: e.cadre.h } : undefined)
      : null;
    const ouvreStory = `<Story Self="${sid}" AppliedTOCStyle="n" StoryTitle="$ID/"><StoryPreference FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>`;
    if (sty && ts && e.cadre.role !== "photo") {
      /* sous un style : le style de paragraphe du rôle du cadre porte tout ; la plage ne redit que ce qui s'écarte de lui
         (le corps à l'échelle du gabarit, une couleur de texte qui n'est pas l'encre). Capitales : l'attribut du style, le texte reste le sien. */
      const nv = sty.paire.niveaux[e.cadre.role];
      /* lot G : une couleur choisie en hexa n'a pas de rôle : sa nuance « Libre » est déclarée et nommée */
      const remplissage = ts.role === null ? nuance(t?.couleur ?? (ts.couleur as CouleurLibre)) : ts.role !== "encre" ? NUANCE_ROLE[ts.role].self : null;
      const ecart = (Math.abs(ts.corps - nv.corps) > 0.005 ? ` PointSize="${ts.corps}"` : "") + (remplissage ? ` FillColor="${remplissage}"` : "");
      stories.push({
        sid,
        corps: `${ouvreStory}<ParagraphStyleRange AppliedParagraphStyle="${STYLE_PARAGRAPHE[e.cadre.role].self}"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"${ecart} AppliedLanguage="${LANGUE}">${contenuStory(texteTypo(contenu))}</CharacterStyleRange></ParagraphStyleRange></Story>`,
      });
    } else {
    stories.push({
      sid,
      corps: `<Story Self="${sid}" AppliedTOCStyle="n" StoryTitle="$ID/"><StoryPreference FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>`
        + `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" PointSize="${taille}" FontStyle="${gras ? "Bold" : "Regular"}"${t?.couleur ? ` FillColor="${nuance(t.couleur)}"` : e.cadre.couleur === "blanc" ? ` FillColor="Color/Paper"` : ""} AppliedLanguage="${LANGUE}"><Properties><AppliedFont type="string">Arial</AppliedFont></Properties>${contenuStory(contenu)}</CharacterStyleRange></ParagraphStyleRange></Story>`,
    });
    }
    return `<TextFrame Self="${nid()}" Name="${echapperXml(nom)}" ItemLayer="${CALQUE}" ParentStory="${sid}" ContentType="TextType" ItemTransform="${transformRotation(e.cadre.rotation, x, y, w, h)}">${geom(x, y, w, h)}<TextFramePreference TextColumnCount="1"/></TextFrame>`;
  };

  /** Un aplat (D28 : un fond de couleur est relu fidèlement). */
  const aplatXml = (a: Aplat, n: number): string => {
    const r = convertir(a);
    return `<Rectangle Self="${nid()}" Name="Aplat ${n}" ItemLayer="${CALQUE}" ContentType="Unassigned" StoryTitle="$ID/" FillColor="${sty ? nuanceSousStyle(a.teinte) : nuanceSansStyle(a.teinte)}" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">${geom(r.x, r.y, r.w, r.h)}</Rectangle>`;
  };

  /** Lot G : le fond de couleur d'une page ou d'une double, sous les aplats du gabarit, rempli de sa nuance NOMMÉE (le rôle ou « Libre »). */
  const fondXml = (f: PieceFond): string => {
    const r = convertir(f.rect);
    const nom = f.cote === "double" ? "Fond" : f.cote === "gauche" ? "Fond gauche" : "Fond droite";
    return `<Rectangle Self="${nid()}" Name="${nom}" ItemLayer="${CALQUE}" ContentType="Unassigned" StoryTitle="$ID/" FillColor="${nuance(f.couleur)}" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">${geom(r.x, r.y, r.w, r.h)}</Rectangle>`;
  };

  /** Le papier teinté d'un style : un aplat « Papier » sous tout, de x sur la largeur donnée, fond perdu `bl` (pt) compris en hauteur. */
  const papierXml = (x: number, largeur: number, bl: number): string =>
    `<Rectangle Self="${nid()}" Name="Papier" ItemLayer="${CALQUE}" ContentType="Unassigned" StoryTitle="$ID/" FillColor="${NUANCE_ROLE.papier.self}" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">${geom(x, -HH - bl, largeur, PH + 2 * bl)}</Rectangle>`;

  /** Les cadres d'un morceau, dans l'ordre des calques, nommés « Photo 1 », « Titre », « Légende 2 »… */
  const elementsXml = (tous: Element[]): string => {
    /* lot R (D2, 12/11) : un cadre de texte VIDE n'est jamais écrit. Le mot-repère (« Titre », « Texte ») reste à l'écran ; à l'export, `avecLieuxParDefaut`
       l'a vidé, et le cadre vide ne part pas (ni story, ni TextFrame). Les photos, elles, partent toujours (un cadre photo vide reste un cadre). */
    const elements = tous.filter((e) => e.cadre.role === "photo" || (e.disposition.textes[e.indexTexte]?.contenu ?? "").trim() !== "");
    const total: Partial<Record<RoleCadre, number>> = {};
    for (const e of elements) total[e.cadre.role] = (total[e.cadre.role] ?? 0) + 1;
    const vus: Partial<Record<RoleCadre, number>> = {};
    let corps = "";
    for (const e of elements) {
      const r = e.cadre.role;
      vus[r] = (vus[r] ?? 0) + 1;
      const nom = r === "photo" || (total[r] ?? 0) > 1 ? `${LIBELLES[r]} ${vus[r]}` : LIBELLES[r];
      corps += r === "photo" ? photoXml(e, nom) : texteXml(e, nom);
    }
    return corps;
  };

  return { nid, stories, photoXml, texteXml, aplatXml, elementsXml, papierXml, fondXml, libres };
}

/** Le paquet autour des spreads et des stories, dans l'ordre du Python (mimetype d'abord, designmap en dernier). */
function paquet(spreads: Spread[], stories: { sid: string; corps: string }[], doc: { largeurPt: number; nbPages: number; vis: boolean; marges: string; sty?: StyleActif | null; libres?: ReadonlyMap<string, string> }): FichierIdml[] {
  const { nbPages } = doc;
  const sty = doc.sty ?? null;
  /* lot G : les nuances des couleurs libres, après celles du nuancier (vide sans couleur libre : Graphic.xml d'avant) */
  const libres = [...(doc.libres?.values() ?? [])].join("");
  const fichiers: FichierIdml[] = [];
  const add = (chemin: string, contenu: string) => fichiers.push({ chemin, contenu });

  add("mimetype", MIMETYPE_IDML);
  add("META-INF/container.xml", `${PI}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>`);
  if (sty) {
    /* lot C : Noir et Papier restent (le style normal d'InDesign les attend), l'ancienne « Aplat » laisse la place aux six rôles */
    add("Resources/Graphic.xml", `${PI}<idPkg:Graphic ${NS}><Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" Name="Black"/><Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" Name="Paper"/>${nuancesDuStyle(sty.style)}${libres}<Swatch Self="Swatch/None" Name="None"/></idPkg:Graphic>`);
    add("Resources/Fonts.xml", `${PI}<idPkg:Fonts ${NS}>${fontsDuStyle(sty.paire)}</idPkg:Fonts>`);
    add("Resources/Styles.xml", `${PI}<idPkg:Styles ${NS}>${stylesDuStyle(sty.paire)}</idPkg:Styles>`);
  } else {
    add("Resources/Graphic.xml", `${PI}<idPkg:Graphic ${NS}><Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" Name="Black"/><Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" Name="Paper"/>${COULEUR_APLAT}${libres}<Swatch Self="Swatch/None" Name="None"/></idPkg:Graphic>`);
    add("Resources/Fonts.xml", `${PI}<idPkg:Fonts ${NS}><FontFamily Self="di1" Name="Arial"><Font Self="di1Font1" FontFamily="Arial" Name="Arial Regular" PostScriptName="ArialMT" FontStyleName="Regular"/><Font Self="di1Font2" FontFamily="Arial" Name="Arial Bold" PostScriptName="Arial-BoldMT" FontStyleName="Bold"/></FontFamily></idPkg:Fonts>`);
    add("Resources/Styles.xml", `${PI}<idPkg:Styles ${NS}><RootCharacterStyleGroup Self="rcs"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/></RootCharacterStyleGroup><RootParagraphStyleGroup Self="rps"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/><ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" PointSize="10" FillColor="Color/Black"><Properties><BasedOn type="object">ParagraphStyle/$ID/[No paragraph style]</BasedOn><AppliedFont type="string">Arial</AppliedFont></Properties></ParagraphStyle></RootParagraphStyleGroup><RootObjectStyleGroup Self="ros"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/></RootObjectStyleGroup></idPkg:Styles>`);
  }
  add("Resources/Preferences.xml", `${PI}<idPkg:Preferences ${NS}><DocumentPreference PageHeight="${f(PH, 4)}" PageWidth="${f(doc.largeurPt, 4)}" PagesPerDocument="${nbPages}" FacingPages="${doc.vis ? "true" : "false"}" DocumentBleedTopOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedBottomOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedInsideOrLeftOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedOutsideOrRightOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedUniformSize="true" PageBinding="LeftToRight"/>${doc.marges}</idPkg:Preferences>`);
  for (const sp of spreads) {
    add(`Spreads/Spread_${sp.sid}.xml`, `${PI}<idPkg:Spread ${NS}><Spread Self="${sp.sid}" PageCount="${sp.pc}" BindingLocation="${sp.bl}" ShowMasterItems="true" ItemTransform="1 0 0 1 0 0">${sp.corps}</Spread></idPkg:Spread>`);
  }
  for (const st of stories) add(`Stories/Story_${st.sid}.xml`, `${PI}<idPkg:Story ${NS}>${st.corps}</idPkg:Story>`);

  let dm = `${PI}<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="16.0(0)" ?>\n`
    + `<Document ${NS} Self="d" StoryList="${stories.map((s) => s.sid).join(" ")}" ZeroPoint="0 0" ActiveLayer="${CALQUE}" ${PROFILS_COULEUR}>`;
  dm += `<Language Self="Language/$ID/French" Name="$ID/French" SingleQuotes="‘’" DoubleQuotes="«»" PrimaryLanguageName="$ID/French" SublanguageName="$ID/" Id="268" HyphenationVendor="Hunspell" SpellingVendor="Hunspell"/>`;
  dm += `<idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/>`;
  dm += `<Layer Self="${CALQUE}" Name="Calque 1" Visible="true" Locked="false" Printable="true"/>`;
  for (const sp of spreads) dm += `<idPkg:Spread src="Spreads/Spread_${sp.sid}.xml"/>`;
  dm += `<Section Self="sec1" Length="${nbPages}" Name="" PageNumberStyle="Arabic" ContinueNumbering="true" IncludeSectionPrefix="false" PageStart="pg1" SectionPrefix=""/>`;
  for (const st of stories) dm += `<idPkg:Story src="Stories/Story_${st.sid}.xml"/>`;
  dm += "</Document>";
  add("designmap.xml", dm);
  return fichiers;
}

/**
 * Les fichiers XML du paquet IDML, dans l'ordre du Python (mimetype d'abord,
 * designmap en dernier). Planche 0 = une page droite seule ; les suivantes =
 * deux pages, même en mode pages avec une page vide ; la dernière (lot E,
 * `magazine.derniere`) = une page GAUCHE seule, en face de la couverture
 * intérieure arrière (un spread d'une page, binding à sa droite).
 */
export function construireIdml(magazine: Magazine, photos: Map<string, PhotoExport>, options: { liens: OptionsLiens }): FichierIdml[] {
  /* Lot C : avec un style, polices et nuances nommées, styles de paragraphe ; sans, exactement l'export d'avant. */
  const sty = styleActif(magazine.style);
  const { stories, aplatXml, elementsXml, papierXml, fondXml, libres } = fabrique(photos, options, conv, sty, true);

  const planches: Planche[] = magazine.planches.length > 0
    ? magazine.planches
    : [{ id: "pl-1", mode: "pages", double: null, gauche: null, droite: null }];

  const spreads: Spread[] = [];
  let numeroPage = 0;

  planches.forEach((p, i) => {
    const seul = coteSeul(magazine, i);
    let corps = "";
    if (seul === "droite") {
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), false);
    } else if (seul === "gauche") {
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), true);
    } else {
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), true);
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), false);
    }
    /* le papier teinté d'un style (crème) : un aplat sous tout, la page entière et son fond perdu ; blanc : rien, comme avant */
    if (sty && sty.style.couleurs.papier !== FOND_PAGE_BLANC) {
      const bl = FOND_PERDU * K;
      const x0 = seul === "droite" ? 0 : -PW - bl, x1 = seul === "gauche" ? 0 : PW + bl;
      corps += papierXml(x0, x1 - x0, bl);
    }
    /* lot G : le fond de couleur de la planche, au-dessus du papier, sous les aplats du gabarit ; une page seule s'arrête au pli, comme le papier */
    for (const f of piecesDuFond(p.fond, seul, { perdu: true })) corps += fondXml(f);
    let nA = 0;
    for (const { d, cible } of partsDe(p, seul)) {
      for (const a of decorDe(d, cible)) {
        nA += 1;
        corps += aplatXml(a, nA);
      }
    }
    corps += elementsXml(elementsDe(p, seul));
    spreads.push({ sid: `sp${i + 1}`, pc: seul ? 1 : 2, bl: seul === "droite" ? 0 : 1, corps });
  });

  return paquet(spreads, stories, { largeurPt: PW, nbPages: numeroPage, vis: true, marges: MP, sty, libres });
}

/* ─────────────────────────── La couverture (lot B, 12/11) ─────────────────────────── */

/**
 * Les marges de la couverture : 15 mm sur les quatre bords et DEUX colonnes séparées par le dos et ses deux marges
 * (30 + dos). Les repères de colonne d'Affinity tombent ainsi sur la zone sûre de chaque face, de part et d'autre des
 * plis : mêmes attributs que l'intérieur, autres valeurs.
 */
export const margesCouverture = (dosMm: number): string =>
  `<MarginPreference ColumnCount="2" ColumnGutter="${f((2 * MARGES.exterieure + dosMm) * K, 4)}" Top="${MARGES.exterieure * K}" Bottom="${MARGES.exterieure * K}" Left="${MARGES.exterieure * K}" Right="${MARGES.exterieure * K}"/>`;

/** Repère couverture mm → points : la page unique commence à x = 0 (bord gauche de la 4e), Y centré comme l'intérieur. */
export const convCouverture = (c: { x: number; y: number; l: number; h: number }): { x: number; y: number; w: number; h: number } =>
  ({ x: c.x * K, y: c.y * K - HH, w: c.l * K, h: c.h * K });

/**
 * L'IDML de la couverture À PART : un document d'UNE page non vis-à-vis (FacingPages="false"), large de 420 + dos, fond
 * perdu de 3 mm sur les quatre bords (la cote de Cloudprinter : 426 + dos × 303). Le dos se peint de sa couleur, les
 * cadres de chaque face sont posés à leur place pour CE dos ; textes prêts (`couverturePourExport`, appelé par
 * `avecLieuxParDefaut`), le texte répété écrit ligne à ligne. Mêmes photos, mêmes liens que l'intérieur (Links/ partagé).
 */
export function construireIdmlCouverture(couverture: Couverture, photos: Map<string, PhotoExport>, options: { liens: OptionsLiens; dosMm: number; style?: StyleMagazine | null }): FichierIdml[] {
  const dos = options.dosMm;
  const largeur = largeurCouverture(dos) * K;
  /* Lot C : la couverture parle la langue du magazine (R-T-23) : mêmes polices nommées, mêmes nuances, mêmes styles de paragraphe. */
  const sty = styleActif(options.style);
  const { aplatXml, elementsXml, stories, papierXml, libres } = fabrique(photos, options, convCouverture, sty);
  const marges = margesCouverture(dos);
  let corps = `<Page Self="pg1" Name="1" AppliedMaster="n" GeometricBounds="0 0 ${f(PH, 4)} ${f(largeur, 4)}" ItemTransform="1 0 0 1 0 ${f(-HH, 4)}">${marges}</Page>`;
  /* le papier teinté d'un style : un aplat sous tout, la couverture entière et son fond perdu ; blanc : rien, comme avant */
  if (sty && sty.style.couleurs.papier !== FOND_PAGE_BLANC) corps += papierXml(-FOND_PERDU * K, largeur + 2 * FOND_PERDU * K, FOND_PERDU * K);
  decorCouverture(couverture, dos).forEach((a, i) => { corps += aplatXml(a, i + 1); });
  /* le texte répété (titre en motif) part en lignes, comme l'écran le montre */
  const cadres = cadresCouverture(couverture, dos);
  const textes = cadres.filter((c) => c.role !== "photo");
  const porteur: Porteur = { photos: couverture.photos, textes: couverture.textes.map((t, i) => ({ ...t, contenu: contenuImprime(t.contenu, textes[i] ?? {}) })) };
  let iP = 0, iT = 0;
  corps += elementsXml(cadres.map(({ face: _f, motTitre: _m, repeter: _r, ...cadre }) => {
    void _f; void _m; void _r;
    const e: Element = { cadre, disposition: porteur, indexPhoto: cadre.role === "photo" ? iP : -1, indexTexte: cadre.role === "photo" ? -1 : iT };
    if (cadre.role === "photo") iP++; else iT++;
    return e;
  }));
  return paquet([{ sid: "sp1", pc: 1, bl: 0, corps }], stories, { largeurPt: largeur, nbPages: 1, vis: false, marges, sty, libres });
}

/** Les photos posées, dans l'ordre du magazine, sans doublon (pour Links/ et photos-utilisees.txt). Celles de la
 *  couverture (lot B) viennent APRÈS l'intérieur : les noms de Links/ des photos intérieures ne changent pas. */
export function photosUtilisees(magazine: Magazine): string[] {
  const vus = new Set<string>();
  magazine.planches.forEach((p, i) => {
    for (const e of elementsDe(p, coteSeul(magazine, i))) {
      if (e.cadre.role !== "photo") continue;
      const id = e.disposition.photos[e.indexPhoto]?.photoId;
      if (id) vus.add(id);
    }
  });
  for (const id of idsCouverture(magazine.couverture)) vus.add(id);
  return [...vus];
}
