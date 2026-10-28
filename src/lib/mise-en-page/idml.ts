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

import { PAGE_H, PAGE_L, PT_PAR_MM, FOND_PERDU, MARGES, GRILLE } from "./geometrie";
import { cadrer } from "./recadrage";
import { cadresDe, dispositionDe, type Disposition, type Magazine, type Planche } from "./magazine";
import type { Cadre, RoleCadre } from "./types";

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

type Element = { cadre: Cadre; disposition: Disposition; indexPhoto: number; indexTexte: number };

/** Les cadres d'une planche, repère planche, avec leur affectation (photo ou texte) par index. */
function elementsDe(p: Planche, premiere: boolean): Element[] {
  const parts: { d: Disposition; cible: "double" | "gauche" | "droite" }[] = [];
  if (premiere) {
    const d = dispositionDe(p, "droite");
    if (d) parts.push({ d, cible: "droite" });
  } else if (p.mode === "double") {
    if (p.double) parts.push({ d: p.double, cible: "double" });
  } else {
    if (p.gauche) parts.push({ d: p.gauche, cible: "gauche" });
    if (p.droite) parts.push({ d: p.droite, cible: "droite" });
  }
  return parts.flatMap(({ d, cible }) => {
    let iP = 0, iT = 0;
    return cadresDe(d, cible).map((cadre) => {
      const e: Element = { cadre, disposition: d, indexPhoto: cadre.role === "photo" ? iP : -1, indexTexte: cadre.role === "photo" ? -1 : iT };
      if (cadre.role === "photo") iP++; else iT++;
      return e;
    });
  });
}

/** Le contenu d'une Story : un saut de ligne devient un `<Br/>` IDML. */
const contenuStory = (texte: string): string =>
  texte.split(/\r\n|\r|\n/).map((l) => `<Content>${echapperXml(l)}</Content>`).join("<Br/>");

/**
 * Les fichiers XML du paquet IDML, dans l'ordre du Python (mimetype d'abord,
 * designmap en dernier). Planche 0 = une page droite seule ; les suivantes =
 * deux pages, même en mode pages avec une page vide.
 */
export function construireIdml(magazine: Magazine, photos: Map<string, PhotoExport>, options: { liens: OptionsLiens }): FichierIdml[] {
  let uid = 100;
  const nid = (p = "u"): string => { uid += 1; return `${p}${uid.toString(16)}`; };

  const planches: Planche[] = magazine.planches.length > 0
    ? magazine.planches
    : [{ id: "pl-1", mode: "pages", double: null, gauche: null, droite: null }];

  const stories: { sid: string; corps: string }[] = [];
  const spreads: { sid: string; pc: number; bl: number; corps: string }[] = [];
  let numeroPage = 0;

  const photoXml = (e: Element, nom: string): string => {
    const { x, y, w, h } = conv(e.cadre);
    const pli = cadreAuPli(x, w);
    const ouvre = `<Rectangle Self="${nid()}" Name="${echapperXml(nom)}" ContentType="GraphicType" StoryTitle="$ID/" StrokeWeight="0" ItemTransform="1 0 0 1 0 0">${geom(pli.x, y, pli.w, h)}`
      + `<FrameFittingOption FittingOnEmptyFrame="FillProportionally" FittingAlignment="CenterAnchor"/>`;
    const aff = e.disposition.photos[e.indexPhoto];
    const ph = aff?.photoId ? photos.get(aff.photoId) : undefined;
    if (!aff || !ph) return `${ouvre}</Rectangle>`;
    const cg = cadrer({ l: ph.l, h: ph.h }, { l: e.cadre.l, h: e.cadre.h }, aff.recadrage);
    const s = cg.echelle * K;
    const tx = x + cg.x * K;
    const ty = y + cg.y * K;
    const po = placementOriente(ph.tag, ph.l, ph.h, s, tx, ty);
    const it = po.m[1] === 0 && po.m[2] === 0 && po.m[0] === po.m[3]
      ? `${f(s, 6)} 0 0 ${f(s, 6)} ${f(tx, 4)} ${f(ty, 4)}`
      : `${po.m.slice(0, 4).map((v) => (v === 0 ? "0" : f(v, 6))).join(" ")} ${f(po.m[4], 4)} ${f(po.m[5], 4)}`;
    return `${ouvre}<Image Self="${nid()}" ItemTransform="${it}" ActualPpi="72 72"><Properties><Profile type="string">$ID/Embedded</Profile><GraphicBounds Left="0" Top="0" Right="${po.ls}" Bottom="${po.hs}"/></Properties>`
      + `<Link Self="${nid()}" LinkResourceURI="${echapperXml(uriDeLien(ph.nomLien, options.liens))}" LinkResourceFormat="$ID/JPEG" StoredState="Normal"/></Image></Rectangle>`;
  };

  const texteXml = (e: Element, nom: string): string => {
    const { x, y, w, h } = conv(e.cadre);
    const t = e.disposition.textes[e.indexTexte];
    const contenu = t?.contenu ?? "";
    const taille = t?.taille ?? e.cadre.taille ?? 10;
    const gras = t?.gras ?? e.cadre.gras ?? false;
    const sid = nid("st");
    stories.push({
      sid,
      corps: `<Story Self="${sid}" AppliedTOCStyle="n" StoryTitle="$ID/"><StoryPreference FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection"/>`
        + `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]" PointSize="${taille}" FontStyle="${gras ? "Bold" : "Regular"}"><Properties><AppliedFont type="string">Arial</AppliedFont></Properties>${contenuStory(contenu)}</CharacterStyleRange></ParagraphStyleRange></Story>`,
    });
    return `<TextFrame Self="${nid()}" Name="${echapperXml(nom)}" ParentStory="${sid}" ContentType="TextType" ItemTransform="${transformRotation(e.cadre.rotation, x, y, w, h)}">${geom(x, y, w, h)}<TextFramePreference TextColumnCount="1"/></TextFrame>`;
  };

  planches.forEach((p, i) => {
    const premiere = i === 0;
    let corps = "";
    if (premiere) {
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), false);
    } else {
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), true);
      numeroPage += 1;
      corps += page(`pg${numeroPage}`, String(numeroPage), false);
    }
    const elements = elementsDe(p, premiere);
    const total: Partial<Record<RoleCadre, number>> = {};
    for (const e of elements) total[e.cadre.role] = (total[e.cadre.role] ?? 0) + 1;
    const vus: Partial<Record<RoleCadre, number>> = {};
    for (const e of elements) {
      const r = e.cadre.role;
      vus[r] = (vus[r] ?? 0) + 1;
      const nom = r === "photo" || (total[r] ?? 0) > 1 ? `${LIBELLES[r]} ${vus[r]}` : LIBELLES[r];
      corps += r === "photo" ? photoXml(e, nom) : texteXml(e, nom);
    }
    spreads.push({ sid: `sp${i + 1}`, pc: premiere ? 1 : 2, bl: premiere ? 0 : 1, corps });
  });

  const nbPages = numeroPage;
  const fichiers: FichierIdml[] = [];
  const add = (chemin: string, contenu: string) => fichiers.push({ chemin, contenu });

  add("mimetype", MIMETYPE_IDML);
  add("META-INF/container.xml", `${PI}<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>`);
  add("Resources/Graphic.xml", `${PI}<idPkg:Graphic ${NS}><Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" Name="Black"/><Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" Name="Paper"/><Swatch Self="Swatch/None" Name="None"/></idPkg:Graphic>`);
  add("Resources/Fonts.xml", `${PI}<idPkg:Fonts ${NS}><FontFamily Self="di1" Name="Arial"><Font Self="di1Font1" FontFamily="Arial" Name="Arial Regular" PostScriptName="ArialMT" FontStyleName="Regular"/><Font Self="di1Font2" FontFamily="Arial" Name="Arial Bold" PostScriptName="Arial-BoldMT" FontStyleName="Bold"/></FontFamily></idPkg:Fonts>`);
  add("Resources/Styles.xml", `${PI}<idPkg:Styles ${NS}><RootCharacterStyleGroup Self="rcs"><CharacterStyle Self="CharacterStyle/$ID/[No character style]" Name="$ID/[No character style]"/></RootCharacterStyleGroup><RootParagraphStyleGroup Self="rps"><ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]"/><ParagraphStyle Self="ParagraphStyle/$ID/NormalParagraphStyle" Name="$ID/NormalParagraphStyle" PointSize="10" FillColor="Color/Black"><Properties><BasedOn type="object">ParagraphStyle/$ID/[No paragraph style]</BasedOn><AppliedFont type="string">Arial</AppliedFont></Properties></ParagraphStyle></RootParagraphStyleGroup><RootObjectStyleGroup Self="ros"><ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]"/></RootObjectStyleGroup></idPkg:Styles>`);
  add("Resources/Preferences.xml", `${PI}<idPkg:Preferences ${NS}><DocumentPreference PageHeight="${f(PH, 4)}" PageWidth="${f(PW, 4)}" PagesPerDocument="${nbPages}" FacingPages="true" DocumentBleedTopOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedBottomOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedInsideOrLeftOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedOutsideOrRightOffset="${f(FOND_PERDU * K, 4)}" DocumentBleedUniformSize="true" PageBinding="LeftToRight"/>${MP}</idPkg:Preferences>`);
  for (const sp of spreads) {
    add(`Spreads/Spread_${sp.sid}.xml`, `${PI}<idPkg:Spread ${NS}><Spread Self="${sp.sid}" PageCount="${sp.pc}" BindingLocation="${sp.bl}" ShowMasterItems="true" ItemTransform="1 0 0 1 0 0">${sp.corps}</Spread></idPkg:Spread>`);
  }
  for (const st of stories) add(`Stories/Story_${st.sid}.xml`, `${PI}<idPkg:Story ${NS}>${st.corps}</idPkg:Story>`);

  let dm = `${PI}<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="16.0(0)" ?>\n`
    + `<Document ${NS} Self="d" StoryList="${stories.map((s) => s.sid).join(" ")}" ZeroPoint="0 0" ActiveLayer="ly1">`;
  dm += `<Language Self="Language/$ID/French" Name="$ID/French" SingleQuotes="‘’" DoubleQuotes="«»" PrimaryLanguageName="$ID/French" SublanguageName="$ID/" Id="268" HyphenationVendor="Hunspell" SpellingVendor="Hunspell"/>`;
  dm += `<idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/>`;
  dm += `<Layer Self="ly1" Name="Calque 1" Visible="true" Locked="false" Printable="true"/>`;
  for (const sp of spreads) dm += `<idPkg:Spread src="Spreads/Spread_${sp.sid}.xml"/>`;
  dm += `<Section Self="sec1" Length="${nbPages}" Name="" PageNumberStyle="Arabic" ContinueNumbering="true" IncludeSectionPrefix="false" PageStart="pg1" SectionPrefix=""/>`;
  for (const st of stories) dm += `<idPkg:Story src="Stories/Story_${st.sid}.xml"/>`;
  dm += "</Document>";
  add("designmap.xml", dm);
  return fichiers;
}

/** Les photos posées, dans l'ordre du magazine, sans doublon (pour Links/ et photos-utilisees.txt). */
export function photosUtilisees(magazine: Magazine): string[] {
  const vus = new Set<string>();
  magazine.planches.forEach((p, i) => {
    for (const e of elementsDe(p, i === 0)) {
      if (e.cadre.role !== "photo") continue;
      const id = e.disposition.photos[e.indexPhoto]?.photoId;
      if (id) vus.add(id);
    }
  });
  return [...vus];
}
