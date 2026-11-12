/**
 * Le harnais du lot C (12/11) : la FEUILLE DE STYLE du magazine (src/lib/mise-en-page/style.ts, nuancier.ts, francais.ts), ses
 * exports (IDML : polices nommées, nuances, styles de paragraphe ; PDF : polices embarquées) et son écran.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-style.ts
 *
 * Appelé aussi par scripts/verif-atelier.ts. Sans base, sans réseau, sans écriture. Ce qu'il tient :
 *   - le catalogue FERMÉ : 18 paires (T-01 à T-17 sans T-04, TW-1, TW-2), jamais la police du site, deux familles au plus par paire ;
 *   - chaque famille a son fichier dans `public/polices/` (octet pour octet le TrueType tiré du paquet @fontsource), son nom
 *     PostScript EXACT lu dans le fichier, ses métriques, et toutes les lettres du français (les trous connus sont listés) ;
 *   - le validateur `styleValide` (paire du catalogue, six couleurs #rrggbb) et la clé facultative `style` de `contenuValide` ;
 *   - un magazine SANS style garde exactement son rendu d'avant : l'IDML et le PDF d'un magazine fixe ont les empreintes
 *     relevées AVANT le lot C, au bit près ; aplat, noir et blanc restent des alias (aucun gabarit sauvegardé ne perd son aplat) ;
 *   - le nuancier proposé : CIEDE2000 contre les valeurs de référence, contraste du texte, jamais un gris, jamais plus saturé que
 *     sa source, une teinte à 10° d'une couleur RÉELLE d'une photo ;
 *   - la typographie française, mot pour mot ;
 *   - l'IDML sous un style (noms PostScript, nuances, styles de paragraphe, aucune nuance orpheline) et le PDF sous un style
 *     (polices embarquées relues, alerte quand une police manque) ;
 *   - l'écran : variables CSS des rôles, une règle CSS pour CHAQUE teinte (sinon un aplat disparaît en silence), polices
 *     déclarées une à une dans polices.ts, rien chez Google.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { construireIdml, fontsDuStyle, nuancesDuStyle, stylesDuStyle, STYLE_PARAGRAPHE, type PhotoExport } from "@/lib/mise-en-page/idml";
import { clePolice, ecrirePdf, FINE_EM, largeurLigne, planPdf, policesDuPlan, textePourPoliceStyle } from "@/lib/mise-en-page/pdf";
import { enregistrerGabarits, templateParId, type Magazine } from "@/lib/mise-en-page/magazine";
import { cadreValide, contenuValide, NOMS_CLES_FACULTATIVES } from "@/lib/mise-en-page/sauvegarde";
import { gabaritValide } from "@/lib/mise-en-page/gabaritsAtelier";
import { TEINTES, type Template } from "@/lib/mise-en-page/types";
import {
  COULEURS_ORIGINE, DOSSIER_POLICES, INTERLIGNE_STYLE, NIVEAUX, NUANCE_ROLE, PAIRES, POLICES, REFERENCE_CORPS, ROLES_COULEUR, cheminPolice, classeRole,
  corpsDe, enCapitales, facettesDe, nomFichierPolice, paireParId, policeParId, premiereBase, roleDeCouleurTexte, roleDeTeinte, styleDePaire, styleEgal,
  styleValide, teinteAncienne, texteSousStyle, texteStyle, texteTypo, variablesStyle, type StyleMagazine,
} from "@/lib/mise-en-page/style";
import {
  REGLAGES_NUANCIER, chromaImprimable, contraste, deltaE00, deltaE00Lab, ecartTeinte, estHex, hexDeLch, lchDeHex, luminance, normaliserHex, proposerNuancier,
} from "@/lib/mise-en-page/nuancier";
import { FINE, INSECABLE, typographieFrancaise } from "@/lib/mise-en-page/francais";
import { DOSSIER_COPIE, fichierDuPaquet, woffVersTtf } from "./polices-pdf";

type Rapporter = (nom: string, reussi: boolean) => void;

const lire = (f: string): string => readFileSync(resolve(process.cwd(), f), "utf8");
const sansComm = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const sha = (s: string | Uint8Array): string => createHash("sha256").update(s).digest("hex");

/** Un XML bien formé : chaque balise ouverte est refermée dans l'ordre (les attributs sont échappés par `echapperXml`). */
function bienForme(xml: string): boolean {
  const pile: string[] = [];
  const corps = xml.replace(/<\?[\s\S]*?\?>/g, "");
  for (const m of corps.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [, ferme, nom, , auto] = m;
    if (auto) continue;
    if (ferme) { if (pile.pop() !== nom) return false; } else pile.push(nom);
  }
  return pile.length === 0;
}

/* ─────────────────────────── les fixtures ─────────────────────────── */

const neutre = { zoom: 1, dx: 0, dy: 0 };
const PHOTOS: Map<string, PhotoExport> = new Map([
  ["p1", { id: "p1", nomLien: "un.jpg", l: 4000, h: 3000 }],
  ["p2", { id: "p2", nomLien: "deux & co.jpg", l: 3000, h: 4000 }],
]);

/** Le magazine fixe dont l'IDML et le PDF ont été relevés AVANT le lot C (sur origin/main 98b68bad). */
function magazineFixe(): Magazine {
  const avecDecor = templateParId("E-D8c");
  if (!avecDecor) throw new Error("E-D8c absent");
  return {
    version: 1, id: "m", titre: "Été à Lisbonne", creeLe: "x", modifieLe: "x",
    planches: [
      { id: "pl-1", mode: "pages", double: null, gauche: null, droite: { templateId: "G-P1-a", photos: [{ photoId: "p2", recadrage: neutre }], textes: [] } },
      { id: "pl-2", mode: "double", gauche: null, droite: null, double: {
        templateId: "DP-04",
        photos: [{ photoId: "p1", recadrage: neutre }, { photoId: null, recadrage: neutre }, { photoId: "p1", recadrage: { zoom: 2, dx: 10, dy: 0 } }],
        textes: [{ contenu: `L'été <à> "Lisbonne" & co 🌞`, taille: 30, gras: true }, { contenu: "ligne 1\nligne 2", taille: 8, gras: false }],
      } },
      { id: "pl-3", mode: "double", gauche: null, droite: null, double: {
        templateId: avecDecor.id, photos: Array.from({ length: avecDecor.nbPhotos }, () => ({ photoId: "p2", recadrage: neutre })),
        textes: avecDecor.cadres.filter((c) => c.role !== "photo").map((c, i) => ({ contenu: `Texte ${i} « à l'été »`, taille: c.taille ?? 10, gras: c.gras ?? false })),
      } },
    ],
  };
}
const EMPREINTE_IDML_SANS_STYLE = "252ceda54cef7e0b76a42cb5ad6d6f735487dcab06ea19951d76c7b10c4fa305";
const EMPREINTE_PDF_SANS_STYLE = "107ed6ada1f05eb49bfd85ab7d7e883aa8af54e97aea3cb16771e8971a582426";

/** Un magazine qui porte du texte de chaque niveau, des aplats de chaque nature, du texte blanc sur photo et un bord blanc. */
function magazineStyle(style: StyleMagazine): Magazine {
  const textes = ["A notre rythme : coeur de Lisbonne !", "L'été à Lisbonne ! « co » 18H02", "Madrid", "Lisbonne - Porto", "Été 2026"];
  const disp = (id: string) => {
    const t = templateParId(id);
    if (!t) throw new Error(`${id} absent`);
    return {
      templateId: id,
      photos: Array.from({ length: t.nbPhotos }, (_, i) => ({ photoId: i % 2 ? "p1" : "p2", recadrage: neutre })),
      textes: t.cadres.filter((c) => c.role !== "photo").map((c, i) => ({ contenu: textes[i % textes.length], taille: c.taille ?? 10, gras: c.gras ?? false })),
    };
  };
  return {
    version: 1, id: "s", titre: "Essai style", creeLe: "x", modifieLe: "x", style,
    planches: [
      { id: "pl-1", mode: "pages", double: null, gauche: null, droite: disp("E-S1") },
      { id: "pl-2", mode: "double", gauche: null, droite: null, double: disp("DP-01") },
      { id: "pl-3", mode: "double", gauche: null, droite: null, double: disp("E-D14a") },
      { id: "pl-4", mode: "double", gauche: null, droite: null, double: disp("E-D6a") },
    ],
  };
}

/* ─────────────────────────── l'entrée ─────────────────────────── */

export async function verifierMepStyle(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— Mise en page, lot C : la feuille de style (paires, nuancier, typographie française, exports, écran) —");

  /* ═════ 1. le catalogue fermé ═════ */
  const ids = PAIRES.map((p) => p.id);
  ok("catalogue : dix-huit paires, T-01 à T-17 SANS T-04 (Cormorant Garamond, la police du site), plus TW-1 et TW-2, ids uniques",
    PAIRES.length === 18 && new Set(ids).size === 18 && !ids.includes("T-04")
      && ids.join() === "T-01,T-02,T-03,T-05,T-06,T-07,T-08,T-09,T-10,T-11,T-12,T-13,T-14,T-15,T-16,T-17,TW-1,TW-2" && paireParId("T-04") === null);
  ok("catalogue : trente familles Google Fonts, aucune Cormorant, DM Sans ni Playfair (les polices du site), noms uniques",
    POLICES.length === 30 && new Set(POLICES.map((p) => p.famille)).size === 30 && new Set(POLICES.map((p) => p.id)).size === 30
      && !POLICES.some((p) => /cormorant|dm sans|playfair/i.test(p.famille)));
  ok("catalogue : chaque paire met en jeu une ou deux familles, jamais trois (R-T-01) ; chaque niveau (famille, graisse) existe au catalogue",
    PAIRES.every((p) => {
      const familles = new Set(NIVEAUX.map((n) => p.niveaux[n].police));
      return familles.size <= 2 && familles.has(p.titre) && NIVEAUX.every((n) => !!policeParId(p.niveaux[n].police)?.graisses[p.niveaux[n].graisse]) && facettesDe(p).length >= 2;
    }));
  ok("catalogue : T-05 et T-12 sont des familles seules (Black pour les titres, Regular pour le reste), T-14 met la chasse fixe en légende, T-09 le script en titre seulement",
    paireParId("T-05")?.titre === "archivo" && paireParId("T-05")?.texte === "archivo" && paireParId("T-05")?.niveaux.titre.graisse === 900
      && paireParId("T-12")?.niveaux.titre.police === "nunito" && paireParId("T-12")?.niveaux.texte.police === "nunito"
      && paireParId("T-14")?.niveaux.legende.police === "ibm-plex-mono" && paireParId("T-14")?.niveaux.texte.police === "ibm-plex-sans-condensed"
      && paireParId("T-09")?.niveaux.titre.police === "yellowtail" && paireParId("T-09")?.niveaux.texte.police === "archivo" && paireParId("T-09")?.niveaux.legende.police === "archivo");
  ok("niveaux : trois niveaux, corps de référence 16 / 10 / 7 (ceux des gabarits d'avant), interlignage 120 % (ce qu'Affinity relit seul, D28), approche et capitales par paire",
    NIVEAUX.join() === "titre,texte,legende" && REFERENCE_CORPS.titre === 16 && REFERENCE_CORPS.texte === 10 && REFERENCE_CORPS.legende === 7 && INTERLIGNE_STYLE === 1.2
      && PAIRES.every((p) => NIVEAUX.every((n) => p.niveaux[n].corps === REFERENCE_CORPS[n] && p.niveaux[n].interligne === 1.2 && p.niveaux[n].approche >= 0 && p.niveaux[n].approche <= 0.25))
      && paireParId("TW-1")?.niveaux.titre.capitales === true && paireParId("TW-1")?.niveaux.titre.approche === 0.2 && paireParId("T-02")?.niveaux.titre.capitales === false);
  ok("niveaux : l'échelle du gabarit est gardée (corps = corps du niveau × taille ÷ taille de référence) : 16 → 16, mot géant 110 → 110, texte 11 → 11, légende 6 → 6",
    corpsDe(PAIRES[0].niveaux.titre, "titre", 16) === 16 && corpsDe(PAIRES[0].niveaux.titre, "titre", 110) === 110 && corpsDe(PAIRES[0].niveaux.texte, "texte", 11) === 11
      && corpsDe(PAIRES[0].niveaux.legende, "legende", 6) === 6 && corpsDe(PAIRES[0].niveaux.texte, "texte", NaN) === 10 && corpsDe(PAIRES[0].niveaux.texte, "texte", -3) === 10);
  ok("paires : chaque paire porte son humeur et ses occasions (le typographe : voyage, tendre, chic, pop, bande, sport, enfance, famille, archive…)",
    PAIRES.every((p) => p.humeur.length > 3 && p.occasions.length >= 1 && p.nom.includes(policeParId(p.titre)?.famille ?? "?")));

  /* ═════ 2. les fichiers de police ═════ */
  {
    let fichiersOk = true, octetsOk = true, nomsOk = true, metriquesOk = true;
    const trous: string[] = [];
    const LETTRES = "ÉÈÊÀÇÙŒœ«»’…–—ÂÎÔÛËÏÜéèêàçùâîôûëïü";
    for (const p of POLICES) {
      for (const g of Object.keys(p.graisses).map(Number)) {
        const copie = `${DOSSIER_COPIE}/${nomFichierPolice(p.id, g)}`;
        const paquet = fichierDuPaquet(p.id, g);
        if (!existsSync(copie) || !existsSync(paquet)) { fichiersOk = false; continue; }
        const lu = new Uint8Array(readFileSync(copie));
        const attendu = woffVersTtf(new Uint8Array(readFileSync(paquet)));
        if (sha(lu) !== sha(attendu)) octetsOk = false;
        const f = fontkit.create(Buffer.from(lu)) as unknown as { postscriptName: string; unitsPerEm: number; ascent: number; descent: number; hasGlyphForCodePoint(c: number): boolean };
        if (f.postscriptName !== p.graisses[g].ps) { nomsOk = false; console.log(`   nom PostScript : ${p.id} ${g} → ${f.postscriptName}, catalogue ${p.graisses[g].ps}`); }
        if (f.unitsPerEm !== p.metriques.upm || f.ascent !== p.metriques.asc || -f.descent !== p.metriques.desc) { metriquesOk = false; console.log(`   métriques : ${p.id} ${g}`); }
        for (const c of LETTRES) if (!f.hasGlyphForCodePoint(c.codePointAt(0) ?? 0)) trous.push(`${p.famille} ${g} : ${c}`);
      }
    }
    ok("polices : chaque famille et graisse du catalogue a son fichier dans public/polices/ et son paquet @fontsource", fichiersOk && existsSync(`${DOSSIER_COPIE}/LICENCES.md`) && DOSSIER_POLICES === "/polices");
    ok("polices : chaque fichier est, octet pour octet, le TrueType tiré du WOFF du paquet (copie périmée = échec ; relancer scripts/polices-pdf.ts)", octetsOk);
    ok("polices : le nom PostScript de chaque fichier est EXACTEMENT celui du catalogue (ce que l'IDML nomme)", nomsOk);
    ok("polices : les métriques du catalogue (unités em, montée, descente) sont celles des fichiers", metriquesOk);
    /* Les trous connus, listés : Italiana n'a ni « œ » ni l'espace insécable ; aucune police n'a l'espace fine insécable (U+202F, non testée ici).
       Le PDF les ramène à « oe » et à l'espace (`textePourPoliceStyle`). Tout autre trou fait échouer le harnais. */
    ok(`polices : toutes les lettres du français sont là (É È Ê À Ç Ù Œ œ « » ’ … – —), sauf le trou connu d'Italiana (œ, Œ) : ${trous.length ? trous.join(" ; ") : "aucun"}`,
      trous.every((t) => t.startsWith("Italiana") && /[œŒ]$/.test(t)));
    ok("polices : un seul dossier d'octets, jamais assets/typo (licences qui interdisent de redistribuer), licences OFL ou Apache jointes",
      !lire("scripts/polices-pdf.ts").split("\n").some((l) => /^\s*(import|const|export).*assets\/typo/.test(l)) && /SIL Open Font License|Apache License/.test(lire(`${DOSSIER_COPIE}/LICENCES.md`)));
  }
  {
    const pj = JSON.parse(lire("package.json")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    ok("dépendances : @pdf-lib/fontkit épinglé (dependencies), un paquet @fontsource/<famille> épinglé par famille du catalogue (devDependencies)",
      /^\d+\.\d+\.\d+$/.test(pj.dependencies["@pdf-lib/fontkit"] ?? "") && POLICES.every((p) => /^\d+\.\d+\.\d+$/.test(pj.devDependencies[`@fontsource/${p.id}`] ?? "")));
  }

  /* ═════ 3. l'écran : polices, layout, CSS ═════ */
  {
    const pol = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/polices.ts"));
    const appels = [...pol.matchAll(/\b([A-Z][A-Za-z_0-9]*)\(\{([^}]*)\}\)/g)];
    const STATIQUES: Record<string, number[]> = {
      "alegreya-sans": [400], anton: [400], barlow: [400], "barlow-condensed": [900], "ibm-plex-mono": [400], "ibm-plex-sans-condensed": [400, 600],
      "instrument-serif": [400], italiana: [400], "libre-caslon-display": [400], marcellus: [400], "permanent-marker": [400], yellowtail: [400],
    };
    const parVariable = new Map(appels.map((m) => [/variable: "([^"]+)"/.exec(m[2])?.[1] ?? "", m[2]]));
    ok("polices.ts : une ligne next/font/google LITTÉRALE par famille du catalogue (30), la variable CSS qu'en nomme le catalogue, preload: false, latin",
      appels.length === 30 && POLICES.every((p) => parVariable.has(p.variable) && /preload: false/.test(parVariable.get(p.variable) ?? "") && /subsets: \["latin"\]/.test(parVariable.get(p.variable) ?? ""))
        && /from "next\/font\/google"/.test(pol) && !/\.\.\.|\$\{/.test(appels.map((m) => m[2]).join("")));
    ok("polices.ts : une famille NON variable déclare les graisses que le catalogue emploie (Archivo en Black, Plex en SemiBold…), une famille variable aucune (toutes disponibles)",
      POLICES.every((p) => {
        const decl = parVariable.get(p.variable) ?? "";
        const graisses = Object.keys(p.graisses).map(Number);
        const stat = STATIQUES[p.id];
        if (!stat) return !/weight:/.test(decl);
        const dites = [...decl.matchAll(/"(\d{3})"/g)].map((m) => Number(m[1]));
        return graisses.every((g) => dites.includes(g));
      }));
    ok("polices.ts : la variable de chaque famille est `--pf-<id>` (Police.variable), classesPolices les pose toutes ; layout.tsx PROPRE à l'éditeur les applique, display: contents",
      POLICES.every((p) => p.variable === `--pf-${p.id}`) && /export const classesPolices/.test(pol)
        && /classesPolices/.test(lire("src/app/admin/atelier/mise-en-page/[id]/layout.tsx")) && /display: "contents"/.test(lire("src/app/admin/atelier/mise-en-page/[id]/layout.tsx")));
    const fichiersEcran = ["EditeurMagazine.tsx", "Scene.tsx", "StylePanneau.tsx", "Barre.tsx", "polices.ts", "layout.tsx", "exporterPdf.ts"].map((f) => sansComm(lire(`src/app/admin/atelier/mise-en-page/[id]/${f}`))).join("\n");
    ok("écran : aucun <link> Google, aucune adresse fonts.googleapis dans l'éditeur (CSP font-src 'self' data:, les polices sont auto-hébergées)",
      !/fonts\.googleapis|fonts\.gstatic|<link[^>]*font/i.test(fichiersEcran) && /\["font-src", \["'self'", "data:"\]\]/.test(lire("next.config.ts")));
  }
  {
    const css = lire("src/app/admin/atelier/mise-en-page/mise-en-page.css");
    const racine = /\.mep-editeur \{ --mep-r-papier:[^}]*\}/.exec(css)?.[0] ?? "";
    ok("CSS : les six rôles ont leur variable `--mep-r-<rôle>` (valeurs d'origine sur .mep-editeur), le rôle nuit n'est PAS `--mep-nuit` (déjà pris par le grand écran de tri), qui n'est défini qu'une fois",
      ROLES_COULEUR.every((r) => racine.includes(`--mep-r-${classeRole(r)}:`)) && (css.match(/--mep-nuit:/g) ?? []).length === 1 && !racine.includes("--mep-nuit:"));
    ok("CSS : les valeurs d'origine des rôles sont COULEURS_ORIGINE (style.ts) : l'ancien terracotta #bc977d est l'aplat sourd",
      ROLES_COULEUR.every((r) => racine.includes(`--mep-r-${classeRole(r)}: ${COULEURS_ORIGINE[r]};`)) && /--mep-aplat: #bc977d/.test(css) && COULEURS_ORIGINE.aplatSourd === "#bc977d");
    /* Une teinte sans règle CSS est un aplat TRANSPARENT en silence : chaque teinte a sa règle, à l'écran, dans le tiroir et sur la page des gabarits. */
    ok("CSS : CHAQUE teinte (aplat, noir, blanc et les six rôles) a sa règle d'aplat à l'écran, dans le tiroir des gabarits et sur la page des gabarits",
      TEINTES.every((t) => css.includes(`.ed-aplat--${t} {`) && (t === "aplat" ? /\.ed-gab-dessin i\.a \{/.test(css) : css.includes(`.ed-gab-dessin i.a--${t} {`)) && new RegExp(`\\.mep-aplat--${t}\\b`).test(css)));
    ok("CSS : sous un style, la feuille, la miniature et le dessin d'un gabarit prennent le papier ; le panneau Style existe",
      /\.ed-racine--style \.ed-feuille/.test(css) && /\.ed-racine--style \.ed-mini/.test(css) && /\.ed-racine--style \.ed-gab-dessin/.test(css) && /\.mep-editeur \.ed-style \{/.test(css) && /\.ed-sty-paire\[aria-checked="true"\]/.test(css));
    const em = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/EditeurMagazine.tsx"));
    const sc = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/Scene.tsx"));
    ok("écran : la racine pose les variables du style (variablesStyle) et la classe ed-racine--style ; le texte lit police, graisse, corps, interlignage, capitales, approche et couleur du style ; l'édition garde le texte tel que tapé",
      /variablesStyle\(etat\.magazine\.style\)/.test(em) && /ed-racine--style/.test(em) && /<StylePanneau \/>/.test(em)
        && /ts\.police\.variable/.test(sc) && /textTransform: ts\.capitales/.test(sc) && /letterSpacing: `\$\{ts\.approche\}em`/.test(sc) && /mep-r-\$\{classeRole\(ts\.role\)\}/.test(sc) && /texteTypo\(/.test(sc)
        && /n\.textContent = libelle \? f\.parDefaut \?\? "" : f\.contenu/.test(sc));
    const v = variablesStyle({ paire: "T-01", couleurs: { ...COULEURS_ORIGINE, aplatSourd: "#7a8fa6", nuit: "#16202c", papier: "#f8ecdd" } });
    ok("variablesStyle : les six rôles, plus les trois alias que le CSS d'avant lit (aplat = aplat sourd, noir = nuit, papier = papier)",
      v["--mep-r-aplat-sourd"] === "#7a8fa6" && v["--mep-aplat"] === "#7a8fa6" && v["--mep-noir"] === "#16202c" && v["--mep-r-nuit"] === "#16202c" && v["--mep-papier"] === "#f8ecdd" && Object.keys(v).length === 9);
  }

  /* ═════ 4. le validateur et la clé facultative ═════ */
  const bon = styleDePaire("T-05", { ...COULEURS_ORIGINE, papier: "#f8ecdd" });
  ok("styleValide : une paire du catalogue et six couleurs #rrggbb passent, quelle que soit la paire", !!bon && styleValide(bon) && PAIRES.every((p) => styleValide(styleDePaire(p.id))) && styleValide(JSON.parse(JSON.stringify(bon))));
  const cassures: [string, unknown][] = [
    ["T-04", { paire: "T-04", couleurs: COULEURS_ORIGINE }], ["paire inconnue", { paire: "Z-99", couleurs: COULEURS_ORIGINE }], ["sans couleurs", { paire: "T-01" }],
    ["sans paire", { couleurs: COULEURS_ORIGINE }], ["clé en trop", { paire: "T-01", couleurs: COULEURS_ORIGINE, police: "Arial" }],
    ["rôle manquant", { paire: "T-01", couleurs: { papier: "#ffffff", encre: "#000000" } }], ["rôle en trop", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, secondaire: "#123456" } }],
    ["hexa en majuscules", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, papier: "#FFFFFF" } }], ["hexa court", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, papier: "#fff" } }],
    ["nom de couleur", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, accent: "red" } }], ["rgb()", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, accent: "rgb(1,2,3)" } }],
    ["couleur non chaîne", { paire: "T-01", couleurs: { ...COULEURS_ORIGINE, nuit: 0 } }], ["null", null], ["chaîne", "T-01"], ["tableau", []], ["nombre", 12], ["couleurs tableau", { paire: "T-01", couleurs: [] }],
  ];
  ok(`styleValide : refuse ${cassures.length} formes cassées (T-04, paire inconnue, clé ou rôle en trop ou manquant, hexa majuscule, court, nommé, rgb(), null, tableau…)`, cassures.every(([, v]) => !styleValide(v)));
  const vrai = { version: 1, id: "m", titre: "t", creeLe: "2026-11-12T00:00:00Z", modifieLe: "2026-11-12T00:00:00Z", planches: [{ id: "pl-1", mode: "pages", double: null, gauche: null, droite: null }] };
  const triOk = { choisies: ["a"], ecartees: ["b"], visees: null };
  ok("contenuValide : `style` est ACCEPTÉE quand elle est valide (seule, avec `tri`, relue depuis JSON), refusée sinon : undefined, null, vide, T-04, clé en trop",
    NOMS_CLES_FACULTATIVES.join() === "tri,style,couverture"
      && contenuValide({ ...vrai, style: bon }) && contenuValide({ ...vrai, tri: triOk, style: bon }) && contenuValide(JSON.parse(JSON.stringify({ ...vrai, style: bon })))
      && !contenuValide({ ...vrai, style: undefined }) && !contenuValide({ ...vrai, style: null }) && !contenuValide({ ...vrai, style: {} })
      && !contenuValide({ ...vrai, style: { paire: "T-04", couleurs: COULEURS_ORIGINE } }) && !contenuValide({ ...vrai, style: { ...bon, pirate: 1 } })
      && cassures.every(([, v]) => !contenuValide({ ...vrai, style: v })));
  ok("contenuValide : une sauvegarde d'avant le lot C (sans style) reste valide ; `couverture` reste refusée jusqu'à son lot, seule ou à côté d'un style valide",
    contenuValide(vrai) && contenuValide({ ...vrai, tri: triOk }) && !contenuValide({ ...vrai, couverture: {} }) && !contenuValide({ ...vrai, style: bon, couverture: {} }));
  ok("cadreValide : la couleur d'un texte est « blanc » (d'avant) ou un des six rôles, rien d'autre ; gabaritValide accepte les neuf teintes d'aplat et refuse une teinte inconnue",
    ["blanc", ...ROLES_COULEUR].every((c) => cadreValide({ x: 0, y: 0, l: 10, h: 5, role: "texte", couleur: c })) && !cadreValide({ x: 0, y: 0, l: 10, h: 5, role: "texte", couleur: "noir" })
      && !cadreValide({ x: 0, y: 0, l: 10, h: 5, role: "texte", couleur: "#fff" }) && cadreValide({ x: 0, y: 0, l: 10, h: 5, role: "texte" })
      && TEINTES.every((t) => !!gabaritValide({ nom: "g", portee: "page", cadres: [{ x: 0, y: 0, l: 50, h: 50, role: "photo" }], decor: [{ x: 0, y: 0, l: 10, h: 10, teinte: t }] }))
      && !gabaritValide({ nom: "g", portee: "page", cadres: [{ x: 0, y: 0, l: 50, h: 50, role: "photo" }], decor: [{ x: 0, y: 0, l: 10, h: 10, teinte: "rose" }] }));

  /* ═════ 5. les teintes : alias et rôles ═════ */
  ok("teintes : neuf valeurs (les trois alias d'avant, les six rôles) ; aplat → aplat sourd, noir → nuit, blanc → papier ; un rôle est son propre rôle",
    TEINTES.length === 9 && roleDeTeinte("aplat") === "aplatSourd" && roleDeTeinte("noir") === "nuit" && roleDeTeinte("blanc") === "papier"
      && ROLES_COULEUR.every((r) => roleDeTeinte(r) === r) && TEINTES.every((t) => (ROLES_COULEUR as readonly string[]).includes(roleDeTeinte(t))));
  ok("teintes : sans style, un rôle retombe sur l'alias d'avant le plus proche (papier → blanc, encre et nuit → noir, les aplats et l'accent → aplat) ; les alias restent eux-mêmes",
    teinteAncienne("papier") === "blanc" && teinteAncienne("encre") === "noir" && teinteAncienne("nuit") === "noir" && teinteAncienne("aplatClair") === "aplat"
      && teinteAncienne("aplatSourd") === "aplat" && teinteAncienne("accent") === "aplat" && (["aplat", "noir", "blanc"] as const).every((t) => teinteAncienne(t) === t));
  ok("couleur du texte : absente = l'encre, « blanc » = le papier (en réserve), un rôle = lui-même ; texteStyle lit la couleur du RÔLE dans le style",
    roleDeCouleurTexte(undefined) === "encre" && roleDeCouleurTexte("blanc") === "papier" && roleDeCouleurTexte("accent") === "accent"
      && texteStyle({ paire: "T-01", couleurs: { ...COULEURS_ORIGINE, encre: "#101820", papier: "#f8ecdd" } }, "texte", 10)?.couleur === "#101820"
      && texteStyle({ paire: "T-01", couleurs: { ...COULEURS_ORIGINE, encre: "#101820", papier: "#f8ecdd" } }, "titre", 16, "blanc")?.couleur === "#f8ecdd");
  ok("origine : l'ancien terracotta de la marque est l'aplat sourd par défaut ; les six couleurs d'origine sont valides et l'encre n'est jamais 0/0/0",
    COULEURS_ORIGINE.aplatSourd === "#bc977d" && ROLES_COULEUR.every((r) => estHex(COULEURS_ORIGINE[r])) && COULEURS_ORIGINE.encre !== "#000000" && contraste(COULEURS_ORIGINE.encre, COULEURS_ORIGINE.papier) >= 7
      && contraste(COULEURS_ORIGINE.accent, COULEURS_ORIGINE.papier) >= 3 && styleEgal(styleDePaire("T-01") ?? undefined, styleDePaire("T-01") ?? undefined) && !styleEgal(styleDePaire("T-01") ?? undefined, styleDePaire("T-02") ?? undefined));

  /* ═════ 6. un magazine SANS style garde son rendu, au bit près ═════ */
  {
    const fixe = magazineFixe();
    ok("sans style : aucune clé style, le magazine fixe est une sauvegarde valide (avec de vraies dates)", !("style" in fixe) && contenuValide({ ...fixe, creeLe: "2026-11-12T00:00:00Z", modifieLe: "2026-11-12T00:00:00Z" }));
    const idml = construireIdml(fixe, PHOTOS, { liens: { mode: "relatif" } });
    ok("sans style : l'IDML est, au bit près, celui d'avant le lot C (empreinte relevée sur origin/main 98b68bad : Arial, nuance « Aplat », texte blanc en Paper)",
      sha(idml.map((f) => f.chemin + "\n" + f.contenu).join("\n----\n")) === EMPREINTE_IDML_SANS_STYLE);
    const pages = planPdf(fixe);
    const jpeg = new Uint8Array(readFileSync("archive/images-v1/divers/decor-album-email.jpg"));
    const images = new Map(pages.flatMap((p) => p.objets.flatMap((o) => (o.type === "photo" && o.photoId ? [[o.cle, jpeg] as const] : []))));
    const r = await ecrirePdf(pages, images, fixe.titre);
    ok("sans style : le PDF est, au bit près, celui d'avant le lot C (Helvetica, interlignage 1,15 et ligne de base 0,92 d'Arial, terracotta) ; aucune police embarquée, aucune alerte",
      sha(r.octets) === EMPREINTE_PDF_SANS_STYLE && r.polices.length === 0 && r.alertes.length === 0 && policesDuPlan(pages).length === 0
        && pages.every((p) => p.fond === undefined && p.objets.every((o) => (o.type !== "texte" || !o.style) && (o.type !== "aplat" || !o.couleur) && (o.type !== "photo" || !o.couleurBord))));
    const idmlBis = construireIdml({ ...fixe }, PHOTOS, { liens: { mode: "relatif" } });
    ok("sans style : déterministe (deux exports du même magazine, mêmes octets)", sha(idml.map((f) => f.contenu).join()) === sha(idmlBis.map((f) => f.contenu).join()));
  }

  /* ═════ 7. toutes les teintes, avec et sans style : aucun aplat ne disparaît, aucune nuance orpheline ═════ */
  {
    const t: Template = {
      id: "M-teintes-lot-c", nom: "Toutes les teintes", portee: "double", nbPhotos: 1, signature: "L", attribut: "original", origine: "atelier",
      cadres: [{ role: "photo", x: 20, y: 20, l: 100, h: 70 }, { role: "titre", x: 150, y: 20, l: 100, h: 12, taille: 16, couleur: "accent" }, { role: "texte", x: 150, y: 40, l: 100, h: 20, taille: 10, couleur: "blanc" }],
      decor: TEINTES.map((te, i) => ({ x: 10 + i * 40, y: 150, l: 30, h: 30, teinte: te })),
    };
    enregistrerGabarits([t]);
    try {
      const m: Magazine = {
        version: 1, id: "t", titre: "t", creeLe: "x", modifieLe: "x",
        planches: [
          { id: "pl-1", mode: "pages", double: null, gauche: null, droite: null },
          { id: "pl-2", mode: "double", gauche: null, droite: null, double: { templateId: t.id, photos: [{ photoId: "p1", recadrage: neutre }], textes: [{ contenu: "Titre", taille: 16, gras: true }, { contenu: "Texte", taille: 10, gras: false }] } },
        ],
      };
      const nuancesOk = (fichiers: { chemin: string; contenu: string }[]): { definies: boolean; orphelines: string[] } => {
        const graphic = fichiers.find((f) => f.chemin === "Resources/Graphic.xml")?.contenu ?? "";
        const definies = new Set([...graphic.matchAll(/<Color Self="([^"]+)"/g)].map((x) => x[1]));
        const utilisees = fichiers.filter((f) => /^(Spreads|Stories|Resources\/Styles)/.test(f.chemin)).flatMap((f) => [...f.contenu.matchAll(/(?:FillColor|StrokeColor)="(Color\/[^"]+)"/g)].map((x) => x[1]));
        return { definies: definies.size >= 3, orphelines: utilisees.filter((u) => !definies.has(u)) };
      };
      const sans = construireIdml(m, PHOTOS, { liens: { mode: "relatif" } });
      const sp = sans.find((f) => f.chemin === "Spreads/Spread_sp2.xml")?.contenu ?? "";
      ok("teintes sans style : les neuf aplats sont écrits, chacun sur une nuance qui existe (jamais d'orpheline) ; un rôle retombe sur Aplat, Black ou Paper",
        (sp.match(/Name="Aplat \d+"/g) ?? []).length === 9 && nuancesOk(sans).orphelines.length === 0 && nuancesOk(sans).definies);
      const stylee = construireIdml({ ...m, style: styleDePaire("T-03", { ...COULEURS_ORIGINE, papier: "#f8ecdd", aplatSourd: "#7a8fa6" })! }, PHOTOS, { liens: { mode: "relatif" } });
      const sp2 = stylee.find((f) => f.chemin === "Spreads/Spread_sp2.xml")?.contenu ?? "";
      ok("teintes sous style : les neuf aplats sont écrits sur la nuance NOMMÉE de leur rôle, aucune nuance orpheline ; aplat → Aplat sourd, noir → Nuit, blanc → Papier",
        nuancesOk(stylee).orphelines.length === 0 && ROLES_COULEUR.every((r) => sp2.includes(`FillColor="${NUANCE_ROLE[r].self}"`)) && !stylee.find((f) => f.chemin === "Resources/Graphic.xml")?.contenu.includes('Self="Color/Aplat"'));
      const pdf = planPdf({ ...m, style: styleDePaire("T-03")! });
      const aplats = pdf.flatMap((p) => p.objets.filter((o) => o.type === "aplat"));
      ok("teintes au PDF : sous un style chaque aplat porte la couleur de son rôle ; sans style, aucun n'en porte (la teinte d'avant) ; l'écriture ne lève pas",
        aplats.length === 9 && aplats.every((o) => o.type === "aplat" && o.couleur === styleDePaire("T-03")!.couleurs[roleDeTeinte(o.teinte)])
          && planPdf(m).flatMap((p) => p.objets).every((o) => o.type !== "aplat" || o.couleur === undefined)
          && (await ecrirePdf(planPdf(m), new Map(), "t")).pages === 2);
    } finally { enregistrerGabarits([]); }
  }

  /* ═════ 8. le nuancier proposé ═════ */
  {
    const ref = (l1: [number, number, number], l2: [number, number, number], attendu: number) => Math.abs(deltaE00Lab(l1, l2) - attendu) < 5e-4;
    ok("CIEDE2000 : les valeurs de référence de Sharma, Wu et Dalal (2005), 4 des 34 paires : 2,0425 ; 2,8615 ; 4,3065 ; 1,2644",
      ref([50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425) && ref([50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615)
        && ref([50, 2.5, 0], [50, 0, -2.5], 4.3065) && ref([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644));
    ok("mesures : contraste WCAG noir sur blanc 21 et blanc sur blanc 1 ; ΔE00 noir-blanc 100, identique 0 ; hexa ↔ Lab ↔ LCh sans perte à ±1 ; normaliserHex (#ABC, abcdef, espaces) ; limite d'impression plus basse sur les bleus que sur les terres",
      Math.abs(contraste("#000000", "#ffffff") - 21) < 1e-9 && contraste("#ffffff", "#ffffff") === 1 && Math.abs(deltaE00("#000000", "#ffffff") - 100) < 0.01 && deltaE00("#bc977d", "#bc977d") < 1e-9
        && ["#bc977d", "#2f6f9f", "#a34a3a", "#808080"].every((h) => { const l = lchDeHex(h); const b = hexDeLch(l.L, l.C, l.h); return deltaE00(h, b) < 0.5; })
        && normaliserHex("#ABC") === "#aabbcc" && normaliserHex(" 7A8FA6 ") === "#7a8fa6" && normaliserHex("zzz") === null && normaliserHex("#12345") === null
        && chromaImprimable(280) < chromaImprimable(45) && Math.abs(luminance("#ffffff") - 1) < 1e-9);
    {
      const hors = hexDeLch(60, 120, 280);
      const lch = lchDeHex(hors);
      ok("hexDeLch : hors gamut, la SATURATION baisse (la clarté et la teinte restent) ; jamais plus saturé que demandé", lch.C < 120 && Math.abs(lch.L - 60) < 2 && ecartTeinte(lch.h, 280) < 3 && estHex(hors));
    }

    const MER = [["#2f6f9f", "#9cc3dd", "#e9dcc6", "#27493d", "#b89b72"], ["#3a7fb0", "#b9d4e6", "#d8c7a5", "#2b3f55", "#7a6a52"], ["#245e8a", "#8fb7d3", "#efe6d3", "#33523f", "#c9ad84"]];
    const BRIQUE = [["#a8483a", "#e3cdb0", "#7b8da1", "#d7a67b", "#4b3f36"], ["#9d4638", "#dcc2a1", "#88a0b8", "#c98f66", "#3a322c"], ["#b25140", "#efd9bf", "#6e8197", "#c9a07a", "#51443a"]];
    const DORE = [["#d9a441", "#c4793a", "#8a5a2c", "#f1d9a8", "#5b4426"], ["#cf9a3a", "#b86f35", "#7a4f28", "#ecd3a0", "#4f3b22"], ["#dba94a", "#c07d3c", "#946033", "#f4dcae", "#5d4729"]];
    const SOMBRE = [["#16202c", "#2b3b52", "#e0b765", "#0b0f16", "#4a5d78"], ["#1a2433", "#33465f", "#d9a84e", "#0e131b", "#56698a"]];
    const OPPOSES = [["#d9822b", "#2b6fd9", "#888888", "#d9822b", "#2b6fd9"], ["#2b6fd9", "#d9822b", "#777777", "#2b6fd9", "#d9822b"]];
    const GRIS = [["#202020", "#7a7a7a", "#e0e0e0", "#4a4a4a", "#aaaaaa"], ["#1c1c1c", "#808080", "#d8d8d8", "#555555", "#b0b0b0"], ["#2a2a2a", "#707070", "#e8e8e8", "#404040", "#a0a0a0"]];
    /* De VRAIES palettes : 8 photos de cache/merisa (Madère) et de cache/klervie (Madrid), lues le 12/11 par `paletteDePixels` (les cinq
       couleurs de chaque vignette, la plus présente d'abord), une photo sur sept. Leur piège : la couleur la plus présente d'une photo est
       souvent son OMBRE (brun, bleu nuit), qui ne doit jamais devenir l'aplat. */
    const MERISA = [["#9aafcd", "#d8d8de", "#d89373", "#8e695f", "#422e27"], ["#e1dcd0", "#282010", "#836c4c", "#c69b5d", "#bfb6a9"], ["#cbcdd1", "#4d5147", "#878887", "#275396", "#df9e65"], ["#e6e3e6", "#6f7454", "#4a4429", "#aaaba2", "#d76f5e"], ["#918781", "#666461", "#e2dfe4", "#3b3a36", "#aeafb8"], ["#e3e3e8", "#837445", "#b2946c", "#e6ba91", "#564828"], ["#99c4f6", "#46472d", "#1a1c1c", "#747350", "#93a097"], ["#97bced", "#5e85be", "#221f1d", "#ae8b7a", "#63554c"]];
    const KLERVIE = [["#a58465", "#e1d3c2", "#bba794", "#765d48", "#3f2b20"], ["#765d4f", "#a59585", "#351c25", "#d1d1d2", "#0e3f7f"], ["#9cbeed", "#dbc5ac", "#6b574b", "#382c26", "#a08c7d"], ["#776455", "#422e24", "#a8927f", "#d7ccb9", "#8a2b29"], ["#352b1d", "#72664a", "#ae9c82", "#7eb3f4", "#ebdbcc"], ["#e9b788", "#412c23", "#8a7a77", "#afbecb", "#b27143"], ["#3b3f19", "#858452", "#dbc2ac", "#f47cb0", "#cb3e6f"], ["#3d1c0e", "#77452a", "#a67354", "#d1a074", "#e4cfb0"]];
    /* le bleu nuit (L 12, teinte 257-261°) est la couleur la plus présente de chaque photo, dans la MÊME famille que le bleu de mer (rang 5) */
    const OMBRES = [["#002439", "#c9ad84", "#101722", "#9cc3dd", "#3a7fb0"], ["#002235", "#d8c7a5", "#0c1018", "#a9cbe2", "#4488b8"], ["#002034", "#e9dcc6", "#0e131b", "#8fb7d3", "#3278a8"]];
    const lots: [string, string[][]][] = [["mer", MER], ["brique", BRIQUE], ["doré", DORE], ["soirée", SOMBRE], ["deux pôles", OPPOSES], ["Madère (réel)", MERISA], ["Madrid (réel)", KLERVIE], ["ombres", OMBRES]];
    const R = REGLAGES_NUANCIER;
    const props = lots.map(([nom, p]) => ({ nom, p, prop: proposerNuancier(p) }));
    ok("nuancier : null quand aucune palette n'est lisible (aucune photo mesurée, hexa cassés) ; déterministe (même lecture, même nuancier)",
      proposerNuancier([]) === null && proposerNuancier([[], ["nope", "#12"]]) === null
        && JSON.stringify(proposerNuancier(MER)) === JSON.stringify(proposerNuancier(MER)) && props.every((x) => x.prop !== null));
    ok("nuancier : six rôles exactement, tous en #rrggbb, jamais un noir pur (encre et nuit entre L 5 et 25), nuit plus sombre que l'encre (R-C-27)",
      props.every(({ prop }) => !!prop && ROLES_COULEUR.every((r) => estHex(prop.couleurs[r])) && Object.keys(prop.couleurs).length === 6
        && prop.couleurs.encre !== "#000000" && prop.couleurs.nuit !== "#000000" && lchDeHex(prop.couleurs.encre).L > 5 && lchDeHex(prop.couleurs.encre).L < 25
        && lchDeHex(prop.couleurs.nuit).L < lchDeHex(prop.couleurs.encre).L + 0.01 && styleValide(styleDePaire("T-01", prop.couleurs))));
    ok("nuancier : le contraste du texte est vérifié (R-C-25, I-01) : l'encre sur le papier 7:1 au moins, le texte sur l'aplat clair 7:1, l'accent sur le papier 3:1 au moins (titre), le papier sur la nuit 7:1, et le texte se lit sur l'aplat sourd (3:1, 4,5:1 sauf exception)",
      props.every(({ prop }) => {
        const c = prop!.couleurs;
        return contraste(c.encre, c.papier) >= 7 && contraste(c.encre, c.aplatClair) >= 7 && contraste(c.accent, c.papier) >= R.CONTRASTE_TITRE && contraste(c.papier, c.nuit) >= 7
          && Math.max(contraste(c.encre, c.aplatSourd), contraste(c.papier, c.aplatSourd)) >= 3;
      }) && props.filter(({ prop }) => Math.max(contraste(prop!.couleurs.encre, prop!.couleurs.aplatSourd), contraste(prop!.couleurs.papier, prop!.couleurs.aplatSourd)) >= R.CONTRASTE_TEXTE).length >= 4);
    ok("nuancier : un aplat n'est JAMAIS un gris neutre (saturation de 8 au moins avant l'arrondi, 6 après) quand les photos ont de la couleur ; un aplat n'est jamais collé au papier (ΔE00 ≥ 5, R-C-08)",
      props.every(({ prop }) => lchDeHex(prop!.couleurs.aplatSourd).C >= 6 && lchDeHex(prop!.couleurs.aplatClair).C >= 6 && deltaE00(prop!.couleurs.aplatClair, prop!.couleurs.papier) >= R.APLAT_DE_PAPIER_MIN
        && deltaE00(prop!.couleurs.aplatSourd, prop!.couleurs.papier) >= R.APLAT_DE_PAPIER_MIN));
    ok("nuancier : l'aplat est PRIS DANS UNE PHOTO (R-C-06) : sa teinte est à 10° au plus d'une couleur réelle de la palette d'une photo, et il n'est pas plus saturé qu'elle (sourd ET clair)",
      props.every(({ prop, p }) => {
        const src = prop!.sources.aplatSourd;
        if (!src || !p.some((ph) => ph.includes(src))) return false;
        const s = lchDeHex(src);
        return (["aplatSourd", "aplatClair"] as const).every((r) => { const a = lchDeHex(prop!.couleurs[r]); return ecartTeinte(a.h, s.h) <= 10 && a.C <= s.C + 1.5; });
      }));
    {
      const ma = proposerNuancier(MERISA)!, mad = proposerNuancier(KLERVIE)!, om = proposerNuancier(OMBRES)!;
      const h = (hex: string) => lchDeHex(hex).h;
      ok("nuancier sur de vraies photos : Madère donne un aplat bleu de mer (teinte 240-290°), l'accent est une touche chaude (tuile, 20-70°), le papier reste blanc ; Madrid donne des aplats chauds (30-80°) et un papier crème",
        h(ma.couleurs.aplatSourd) > 240 && h(ma.couleurs.aplatSourd) < 290 && h(ma.couleurs.accent) > 20 && h(ma.couleurs.accent) < 70 && ma.couleurs.papier === "#ffffff"
          && h(mad.couleurs.aplatSourd) > 30 && h(mad.couleurs.aplatSourd) < 80 && mad.couleurs.papier !== "#ffffff");
      ok("nuancier : une OMBRE n'est jamais l'aplat (les palettes de la lecture ont pour couleur la plus présente l'ombre d'une photo, brun ou bleu nuit) : un bleu nuit (L 11) dominant donne l'aplat du bleu de mer qui est dans la photo, clair (L ≥ 30)",
        lchDeHex(om.sources.aplatSourd ?? "#000000").L > 30 && lchDeHex(om.couleurs.aplatSourd).L >= 30 && lchDeHex(om.couleurs.aplatSourd).h > 250 && lchDeHex(om.couleurs.aplatSourd).h < 270
          && [...MERISA, ...KLERVIE].every((ph) => proposerNuancier([ph]) === null || lchDeHex(proposerNuancier([ph])!.couleurs.aplatSourd).L >= 30));
    }
    {
      const o = proposerNuancier(OPPOSES)!;
      const h = lchDeHex(o.couleurs.aplatSourd).h;
      ok("nuancier : des DOMINANTES, pas une moyenne : deux pôles orange et bleu à parts égales donnent l'un des deux, jamais le vert terne de leur moyenne (R-C-01)",
        Math.min(ecartTeinte(h, lchDeHex("#d9822b").h), ecartTeinte(h, lchDeHex("#2b6fd9").h)) <= 10 && lchDeHex(o.couleurs.aplatSourd).C >= 15);
    }
    {
      const g = proposerNuancier(GRIS)!;
      ok("nuancier : des photos presque sans couleur donnent « papier seul » (A-01), aucun gris proposé en aplat : le terracotta d'origine reste ; l'encre et la nuit sont neutres",
        /Papier seul/.test(g.accord) && g.couleurs.aplatSourd === COULEURS_ORIGINE.aplatSourd && g.couleurs.aplatClair === COULEURS_ORIGINE.aplatClair
          && lchDeHex(g.couleurs.encre).C < 3 && g.sources.aplatSourd === undefined);
    }
    {
      const d = proposerNuancier(DORE)!, b = proposerNuancier(BRIQUE)!, m = proposerNuancier(MER)!;
      ok("nuancier : un lot chaud peut avoir un papier crème (ΔE00 ≥ 7 du blanc, R-C-30), un lot froid garde le blanc ; la mer donne des aplats froids, la brique des aplats chauds",
        d.couleurs.papier !== "#ffffff" && deltaE00(d.couleurs.papier, "#ffffff") >= R.CREME_DE_MIN && m.couleurs.papier === "#ffffff"
          && lchDeHex(m.couleurs.aplatSourd).h > 150 && lchDeHex(m.couleurs.aplatSourd).h < 300 && (lchDeHex(b.couleurs.aplatSourd).h < 100 || lchDeHex(b.couleurs.aplatSourd).h > 330));
      ok("nuancier : l'accord est nommé (R-C-10) en une phrase, le nombre de photos qui ont voté est dit, et chaque couleur dit pourquoi",
        props.every(({ prop, p }) => prop!.accord.length > 12 && prop!.photos === p.length && ROLES_COULEUR.every((r) => prop!.pourquoi[r].length > 5)) && /Terre sourde/.test(b.accord));
    }
    {
      const base = proposerNuancier(MER)!, avec = proposerNuancier([...MER, ["#ffffff", "#fefefe", "#000000", "#020202", "#f9f9f9"]])!;
      ok("nuancier : un blanc brûlé et un noir bouché ne votent pas (R-C-02) : ajouter une photo brûlée ne change ni le papier, ni l'aplat, ni l'accent",
        avec.couleurs.papier === base.couleurs.papier && avec.couleurs.aplatSourd === base.couleurs.aplatSourd && avec.couleurs.aplatClair === base.couleurs.aplatClair && avec.couleurs.accent === base.couleurs.accent && avec.photos === base.photos + 1);
    }
  }

  /* ═════ 9. la typographie française ═════ */
  {
    const cas: [string, string][] = [
      ["Tout simplement!", `Tout simplement${FINE}!`], ["Pourquoi ?", `Pourquoi${FINE}?`], ["Quoi ?!", `Quoi${FINE}?!`], ["a ; b", `a${FINE}; b`],
      ["Date: 12", `Date${INSECABLE}: 12`], ["Date : 12", `Date${INSECABLE}: 12`], ["12:30", "12:30"], ["http://x.fr", "http://x.fr"],
      [`Il a dit "Lisbonne"`, `Il a dit «${FINE}Lisbonne${FINE}»`], ["« co »", `«${FINE}co${FINE}»`], [`"un" et "deux"`, `«${FINE}un${FINE}» et «${FINE}deux${FINE}»`], [`un "guillemet seul`, `un "guillemet seul`],
      ["l'été", "l’été"], ["n'a", "n’a"], ["aujourd'hui", "aujourd’hui"], ["été '26", "été ’26"],
      ["A notre rythme", "À notre rythme"], ["A NOTRE RYTHME", "À NOTRE RYTHME"], ["A day in Lisbon", "A day in Lisbon"], ["Il a vu", "Il a vu"],
      ["Ete 2026", "Été 2026"], ["ETE", "ÉTÉ"], ["ete", "ete"], ["Été", "Été"], ["CA", "CA"], ["Ca va", "Ça va"], ["Ile de Ré", "Île de Ré"], ["Fevrier", "Février"], ["AOUT", "AOÛT"], ["Hotel Riu", "Hotel Riu"], ["Noel", "Noel"],
      ["coeur", "cœur"], ["Coeur de Lisbonne", "Cœur de Lisbonne"], ["COEUR", "CŒUR"], ["soeurs", "sœurs"], ["voeux", "vœux"], ["poème", "poème"], ["moelle", "moelle"], ["boeuf", "bœuf"],
      ["Wait...", "Wait…"], ["Et alors....", "Et alors…"],
      ["25 juin - 1ER juillet", `25 juin${INSECABLE}– 1er juillet`], ["1ere", "1re"], ["2eme", "2e"], ["2ÈME", "2e"], ["3 ème", "3 ème"],
      ["18H02", `18${INSECABLE}h${INSECABLE}02`], ["18 h 02", `18${INSECABLE}h${INSECABLE}02`], ["24h", `24${INSECABLE}h`], ["3 hommes", "3 hommes"], ["25 heures", "25 heures"], ["25h", "25h"], ["18h61", "18h61"],
      ["12345", `12${FINE}345`], ["1234567", `1${FINE}234${FINE}567`], ["2026", "2026"], ["0612345678", "0612345678"], ["2136 photos", "2136 photos"], ["15%", `15${FINE}%`], ["3km", `3${FINE}km`], ["12,5 kg", `12,5${FINE}kg`],
      ["¡Degustación local!", "¡Degustación local!"], ["¿Qué tal?", "¿Qué tal?"], ["Love", "Love"], ["", ""], ["   ", "   "],
      ["un  deux", "un deux"], ["mot , autre .", "mot, autre."], [" Lisbonne ", " Lisbonne "],
      ["Ligne 1 !\nLigne 2 ?", `Ligne 1${FINE}!\nLigne 2${FINE}?`], ["Madrid\r\nGran via", "Madrid\r\nGran via"],
    ];
    const ratees = cas.filter(([e, s]) => typographieFrancaise(e) !== s);
    for (const [e, s] of ratees.slice(0, 6)) console.log(`   typo : « ${JSON.stringify(e)} » → ${JSON.stringify(typographieFrancaise(e))}, attendu ${JSON.stringify(s)}`);
    ok(`typographie française : ${cas.length} cas, mot pour mot (espaces fines avant ; ! ?, insécable avant :, guillemets, apostrophe courbe, À et É, œ, …, intervalle, heures, nombres, unités ; l'espagnol et l'anglais intacts)`, ratees.length === 0);
    ok("typographie française : idempotente (corriger un texte déjà corrigé ne change rien), jamais d'espace en tête ni en queue perdue, les retours à la ligne du client gardés",
      cas.every(([, s]) => typographieFrancaise(s) === s) && typographieFrancaise("a\n\nb") === "a\n\nb" && typographieFrancaise("a ?\r\nb").includes("\r\n"));
    ok("typographie française : on change des signes, jamais des mots (hors listes fermées d'accents et de ligatures) : un texte quelconque garde ses lettres",
      ["Le soir, on a marché jusqu'à la mer ; il faisait doux !", "Gran Vía, São Paulo, Budapest", "Nous avons vu 3 îles en 12 jours: superbe"].every((t) => typographieFrancaise(t).replace(/[\s  ’'«»:;!?,.\-–]/g, "") === t.replace(/[\s  ’'«»:;!?,.\-–]/g, "")));
    const ts = texteStyle(styleDePaire("T-01")!, "titre", 16)!;
    ok("texte sous un style : typographie française puis capitales quand le niveau les veut (les accents restent : « été » → « ÉTÉ ») ; sans capitales, le texte est celui du client corrigé",
      texteSousStyle("ete à Lisbonne !", ts) === `ETE À LISBONNE${FINE}!` && enCapitales("été œuvre") === "ÉTÉ ŒUVRE" && texteTypo("coeur !") === `cœur${FINE}!`
        && texteSousStyle("Ete à Lisbonne !", { capitales: false }) === `Été à Lisbonne${FINE}!`);
  }

  /* ═════ 10. métriques et mesures du texte ═════ */
  {
    const arial = { id: "arial", famille: "Arial", variable: "", graisses: {}, metriques: { upm: 2048, asc: 1854, desc: 434 } };
    ok("première ligne de base : la formule du navigateur (demi-interlignage + montée) redonne la constante d'Arial calée à la main (0,92 à 1,15)", Math.abs(premiereBase(arial, 1.15) - 0.92) < 0.003);
    const archivo = policeParId("archivo")!;
    ok("première ligne de base : tirée des métriques de la police (Archivo 878 / 210 : (1,2 − 1,088) ÷ 2 + 0,878 = 0,934) ; un interlignage plus serré remonte la première ligne",
      Math.abs(premiereBase(archivo, 1.2) - 0.934) < 1e-9 && premiereBase(archivo, 1.0) < premiereBase(archivo, 1.2) && premiereBase(policeParId("yellowtail")!, 1.2) !== premiereBase(archivo, 1.2));
    const mesure = (s: string) => s.length * 5;
    ok("largeur d'une ligne : la police, l'approche après CHAQUE lettre, l'espace fine posée comme une avance d'un cinquième de cadratin (aucune police du catalogue n'a U+202F)",
      largeurLigne("abc", 10, 0, mesure) === 15 && Math.abs(largeurLigne("abc", 10, 0.1, mesure) - 18) < 1e-9 && Math.abs(largeurLigne(`ab${FINE}c`, 10, 0, mesure) - (15 - 0 + FINE_EM * 10 - 0)) < 1e-9 && FINE_EM === 0.2);
    const connus = (t: string): Set<number> => new Set([...t].map((c) => c.codePointAt(0) ?? 0));
    ok("texte pour une police : ce qui manque est ramené à son équivalent sûr (œ → oe et Œ → OE comme Italiana, insécable → espace, apostrophe courbe → droite) ; l'espace fine passe telle quelle",
      textePourPoliceStyle("cœur Œuf", connus("coeur OEuf")) === "coeur OEuf" && textePourPoliceStyle(`a${INSECABLE}b`, connus("ab ")) === "a b"
        && textePourPoliceStyle("l’été", connus("l'été")) === "l'été" && textePourPoliceStyle(`x${FINE}!`, connus("x!")) === `x${FINE}!` && textePourPoliceStyle("cœur", connus("cœur")) === "cœur");
    ok("texte pour une police : un émoji est retiré, le français reste, les sauts de ligne restent",
      textePourPoliceStyle("été 🌞\nà", new Set([..."été à"].map((c) => c.codePointAt(0) ?? 0))) === "été \nà");
  }

  /* ═════ 11. l'IDML sous un style ═════ */
  {
    const creme = { ...COULEURS_ORIGINE, papier: "#f8ecdd", encre: "#1d242c", aplatSourd: "#7a8fa6", aplatClair: "#dde4ec", accent: "#a3432e", nuit: "#16202c" };
    const st = styleDePaire("T-05", creme)!;
    const fichiers = construireIdml(magazineStyle(st), PHOTOS, { liens: { mode: "relatif" } });
    const par = new Map(fichiers.map((f) => [f.chemin, f.contenu]));
    const graphic = par.get("Resources/Graphic.xml") ?? "", fonts = par.get("Resources/Fonts.xml") ?? "", styles = par.get("Resources/Styles.xml") ?? "";
    const stories = fichiers.filter((f) => f.chemin.startsWith("Stories/")).map((f) => f.contenu);
    const spreads = fichiers.filter((f) => f.chemin.startsWith("Spreads/")).map((f) => f.contenu);
    ok("IDML style : tous les fichiers sont du XML bien formé (ordre du paquet inchangé : mimetype d'abord, designmap en dernier)",
      fichiers.every((f) => f.chemin === "mimetype" || bienForme(f.contenu)) && fichiers[0].chemin === "mimetype" && fichiers[fichiers.length - 1].chemin === "designmap.xml"
        && fichiers.slice(2, 6).map((f) => f.chemin).join() === "Resources/Graphic.xml,Resources/Fonts.xml,Resources/Styles.xml,Resources/Preferences.xml");
    ok("IDML polices : les polices de la paire sont NOMMÉES avec leur nom PostScript exact (Archivo-Regular, Archivo-Black) et leur style (Regular, Black) ; plus d'Arial nulle part",
      fonts.includes('PostScriptName="Archivo-Regular"') && fonts.includes('PostScriptName="Archivo-Black"') && fonts.includes('FontStyleName="Black"') && fonts.includes('FontFamily="Archivo"')
        && !/Arial/.test(fonts + styles + stories.join("")) && (fonts.match(/<FontFamily /g) ?? []).length === 1);
    ok("IDML polices : pour CHAQUE paire, Fonts.xml nomme chaque famille et chaque style que les trois niveaux emploient, avec les noms PostScript du catalogue",
      PAIRES.every((p) => {
        const x = fontsDuStyle(p);
        return bienForme(`<r>${x}</r>`) && facettesDe(p).every((f) => x.includes(`PostScriptName="${f.facette.ps}"`) && x.includes(`FontFamily="${f.police.famille}"`) && x.includes(`FontStyleName="${f.facette.style}"`))
          && (x.match(/<FontFamily /g) ?? []).length === new Set(facettesDe(p).map((f) => f.police.id)).size;
      }));
    ok("IDML nuances : une nuance NOMMÉE par rôle (Papier, Encre, Aplat clair, Aplat sourd, Accent, Nuit), la valeur RVB du nuancier, l'ancienne « Aplat » remplacée ; Black et Paper restent",
      ROLES_COULEUR.every((r) => {
        const [R, G, B] = [1, 3, 5].map((i) => parseInt(creme[r].slice(i, i + 2), 16));
        return graphic.includes(`<Color Self="${NUANCE_ROLE[r].self}" Model="Process" Space="RGB" ColorValue="${R} ${G} ${B}" Name="${NUANCE_ROLE[r].nom}"/>`);
      }) && !graphic.includes('Self="Color/Aplat"') && graphic.includes('Self="Color/Black"') && graphic.includes('Self="Color/Paper"') && nuancesDuStyle(st).split("<Color ").length === 7);
    ok("IDML styles : trois styles de paragraphe nommés Titre, Texte, Légende, qui héritent du style normal, avec police, graisse, corps de référence (16, 10, 7), capitales et approche de la paire, l'encre pour couleur",
      styles.includes('Name="Titre"') && styles.includes('Name="Texte"') && styles.includes('Name="Légende"')
        && new RegExp(`Self="${STYLE_PARAGRAPHE.titre.self}" Name="Titre" PointSize="16" FontStyle="Black" FillColor="Color/Encre" Justification="LeftAlign" Capitalization="AllCaps"`).test(styles)
        && new RegExp(`Self="${STYLE_PARAGRAPHE.texte.self}" Name="Texte" PointSize="10" FontStyle="Regular" FillColor="Color/Encre" Justification="LeftAlign"[^C]`).test(styles)
        && new RegExp(`Self="${STYLE_PARAGRAPHE.legende.self}" Name="Légende" PointSize="7" FontStyle="Regular" FillColor="Color/Encre" Justification="LeftAlign" Capitalization="AllCaps" Tracking="80"`).test(styles)
        && (styles.match(/<BasedOn type="object">ParagraphStyle\/\$ID\/NormalParagraphStyle<\/BasedOn>/g) ?? []).length === 3 && (styles.match(/<AppliedFont type="string">Archivo<\/AppliedFont>/g) ?? []).length === 4
        && NIVEAUX.every((n) => stylesDuStyle(paireParId("T-14")!).includes(STYLE_PARAGRAPHE[n].self)) && !/Leading=/.test(styles));
    ok("IDML interlignage : aucun Leading écrit (Affinity le relit toujours en auto 120 %, D28) : c'est justement l'interlignage de tous les niveaux",
      !fichiers.some((f) => /\bLeading=/.test(f.contenu)) && PAIRES.every((p) => NIVEAUX.every((n) => p.niveaux[n].interligne === 1.2)));
    const toutes = stories.join("");
    ok("IDML textes : chaque texte porte le style de paragraphe de SON rôle (Titre, Texte, Légende), plus de police ni de graisse locale ; le corps n'est écrit que s'il s'écarte du style (échelle du gabarit) ; la langue reste française",
      /AppliedParagraphStyle="ParagraphStyle\/Titre"/.test(toutes) && /AppliedParagraphStyle="ParagraphStyle\/Texte"/.test(toutes) && /AppliedParagraphStyle="ParagraphStyle\/Legende"/.test(toutes)
        && !/NormalParagraphStyle"><CharacterStyleRange/.test(toutes) && !/<AppliedFont/.test(toutes) && !/FontStyle=/.test(toutes) && stories.every((s) => s.includes(`AppliedLanguage="$ID/French"`))
        && /PointSize="60"/.test(toutes) && /PointSize="11"/.test(toutes) && !/ PointSize="16"/.test(toutes));
    ok("IDML couleur du texte : l'encre vient du style, un texte « blanc » sur photo prend le PAPIER du style (nuance Papier), jamais Paper",
      stories.some((s) => s.includes('FillColor="Color/Papier"')) && !/Color\/Paper"/.test(toutes) && !/FillColor="Color\/Encre"/.test(toutes));
    ok("IDML typographie : le texte écrit est le texte du client corrigé en français (cœur, À, espace fine avant !, insécable avant :, 18 h 02) ; les capitales sont un attribut du style, pas un texte modifié",
      toutes.includes(`À notre rythme${INSECABLE}: cœur de Lisbonne${FINE}!`) && toutes.includes(`18${INSECABLE}h${INSECABLE}02`) && !/LISBONNE/.test(toutes));
    const sp = spreads.join("");
    ok("IDML aplats et bords : un aplat « aplat » = Aplat sourd (l'alias d'avant), le bord blanc d'une photo = Papier ; la page teintée est un aplat Papier sous tout (planche 0 : une page, les autres : deux, fond perdu compris)",
      /FillColor="Color\/AplatSourd"/.test(sp) && /StrokeColor="Color\/Papier" StrokeAlignment="InsideAlignment"/.test(sp) && !/Color\/Paper"/.test(sp) && !/Color\/Aplat"/.test(sp)
        && (sp.match(/Name="Papier"/g) ?? []).length === 4 && spreads.every((s) => s.indexOf('Name="Papier"') < s.indexOf('Name="Photo 1"')));
    const blanc = construireIdml(magazineStyle({ ...st, couleurs: { ...creme, papier: "#ffffff" } }), PHOTOS, { liens: { mode: "relatif" } });
    ok("IDML papier blanc : aucune page teintée écrite (rien à imprimer de plus), les nuances nommées restent", !blanc.filter((f) => f.chemin.startsWith("Spreads/")).some((f) => f.contenu.includes('Name="Papier"')) && blanc.find((f) => f.chemin === "Resources/Graphic.xml")!.contenu.includes('Name="Papier"'));
    ok("IDML : le même magazine, deux exports, mêmes octets ; la paire change tout (T-01 ne laisse rien de T-05) ; une paire retirée du catalogue retombe sur le rendu d'avant sans lever",
      sha(construireIdml(magazineStyle(st), PHOTOS, { liens: { mode: "relatif" } }).map((f) => f.contenu).join()) === sha(fichiers.map((f) => f.contenu).join())
        && !construireIdml(magazineStyle(styleDePaire("T-01", creme)!), PHOTOS, { liens: { mode: "relatif" } }).map((f) => f.contenu).join().includes("Archivo")
        && construireIdml({ ...magazineStyle(st), style: { paire: "T-04", couleurs: creme } as StyleMagazine }, PHOTOS, { liens: { mode: "relatif" } }).find((f) => f.chemin === "Resources/Fonts.xml")!.contenu.includes('Name="Arial"'));
  }

  /* ═════ 12. le PDF sous un style ═════ */
  {
    const creme = { ...COULEURS_ORIGINE, papier: "#f8ecdd", encre: "#1d242c", aplatSourd: "#7a8fa6", nuit: "#16202c" };
    const st = styleDePaire("T-01", creme)!;
    const mag = magazineStyle(st);
    const pages = planPdf(mag);
    const textes = pages.flatMap((p) => p.objets.flatMap((o) => (o.type === "texte" ? [o] : [])));
    ok("PDF plan : chaque texte porte son style (famille, graisse, corps à l'échelle du gabarit, interlignage 1,2, capitales, approche, couleur du rôle) et son contenu corrigé ; le papier teinté est le fond de chaque page",
      textes.length > 0 && textes.every((o) => !!o.style && o.style.interligne === 1.2 && estHex(o.style.couleur)) && pages.every((p) => p.fond === "#f8ecdd")
        && textes.some((o) => o.style?.police === "bodoni-moda" && o.style.capitales) && textes.some((o) => o.style?.police === "hanken-grotesk" && o.style.approche === 0.08)
        && textes.some((o) => o.contenu.includes(`cœur de Lisbonne${FINE}!`)) && textes.some((o) => o.contenu === "MADRID") && textes.some((o) => o.style?.couleur === "#f8ecdd"));
    const besoins = policesDuPlan(pages);
    ok("PDF polices demandées : une fois chacune (Bodoni Moda 400, Hanken Grotesk 400), jamais en double", besoins.length === 2 && new Set(besoins.map((b) => clePolice(b.id, b.graisse))).size === 2 && besoins.some((b) => b.id === "bodoni-moda"));
    const jpeg = new Uint8Array(readFileSync("archive/images-v1/divers/decor-album-email.jpg"));
    const images = new Map(pages.flatMap((p) => p.objets.flatMap((o) => (o.type === "photo" && o.photoId ? [[o.cle, jpeg] as const] : []))));
    const octets = new Map(besoins.map((b) => [clePolice(b.id, b.graisse), new Uint8Array(readFileSync(`public${cheminPolice(b.id, b.graisse)}`))]));
    const r = await ecrirePdf(pages, images, "Style", octets);
    const lu = await PDFDocument.load(r.octets, { updateMetadata: false });
    const noms: string[] = [];
    for (const [, obj] of lu.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFDict && obj.get(PDFName.of("Type")) === PDFName.of("Font")) noms.push(String(obj.get(PDFName.of("BaseFont"))));
    }
    ok("PDF polices EMBARQUÉES : le PDF relu porte les deux polices de la paire en sous-ensemble (sous-ensemble TrueType, Type0, noms PostScript BodoniModa-Regular et HankenGrotesk-Regular), l'export les nomme, aucune alerte",
      [...r.polices].sort().join() === "Bodoni Moda 400,Hanken Grotesk 400" && r.alertes.length === 0
        && noms.some((n) => /^\/BodoniModa-Regular(-\d+)?$/.test(n)) && noms.some((n) => /^\/HankenGrotesk-Regular(-\d+)?$/.test(n)));
    const sansImages = await ecrirePdf(pages, new Map(), "Style", octets);
    ok("PDF poids : une page par planche ; avec deux polices embarquées et sans photo le fichier reste léger (sous-ensemble : seulement les lettres écrites)",
      r.pages === 4 && lu.getPageCount() === 4 && sansImages.octets.byteLength < 250_000);
    const sans = await ecrirePdf(pages, images, "Style", new Map());
    const nomsSans: string[] = [];
    const luSans = await PDFDocument.load(sans.octets, { updateMetadata: false });
    for (const [, obj] of luSans.context.enumerateIndirectObjects()) if (obj instanceof PDFDict && obj.get(PDFName.of("Type")) === PDFName.of("Font")) nomsSans.push(String(obj.get(PDFName.of("BaseFont"))));
    ok("PDF police absente : l'export ne casse pas, Helvetica remplace, ET l'alerte le dit, police par police (jamais un changement de police silencieux)",
      sans.polices.length === 0 && sans.alertes.length === 2 && sans.alertes.every((a) => /Helvetica/.test(a) && /absent/.test(a)) && sans.alertes.some((a) => /Bodoni Moda 400/.test(a)) && nomsSans.some((n) => /Helvetica/.test(n)) && sans.pages === 4);
    const casse = await ecrirePdf(pages, images, "Style", new Map(besoins.map((b) => [clePolice(b.id, b.graisse), new Uint8Array([1, 2, 3, 4])])));
    ok("PDF police illisible : même chose, alerte « illisible », Helvetica, pas d'exception", casse.alertes.length === 2 && casse.alertes.every((a) => /illisible/.test(a) && /Helvetica/.test(a)) && casse.polices.length === 0);
    const partiel = await ecrirePdf(pages, images, "Style", new Map([[clePolice("bodoni-moda", 400), octets.get(clePolice("bodoni-moda", 400))!]]));
    ok("PDF une police sur deux : celle qui est là est embarquée, l'autre est remplacée et nommée dans l'alerte", partiel.polices.join() === "Bodoni Moda 400" && partiel.alertes.length === 1 && /Hanken Grotesk 400/.test(partiel.alertes[0]));
    const toutes = await Promise.all(PAIRES.map(async (p) => {
      const m = magazineStyle({ paire: p.id, couleurs: { ...COULEURS_ORIGINE } });
      const pg = planPdf(m);
      const ob = new Map(policesDuPlan(pg).map((b) => [clePolice(b.id, b.graisse), new Uint8Array(readFileSync(`public${cheminPolice(b.id, b.graisse)}`))]));
      const res = await ecrirePdf(pg, new Map(), "t", ob);
      return { id: p.id, alertes: res.alertes, n: res.polices.length, voulues: policesDuPlan(pg).length };
    }));
    const mauvaises = toutes.filter((x) => x.alertes.length || x.n !== x.voulues);
    if (mauvaises.length) console.log(`   PDF paires en échec : ${JSON.stringify(mauvaises)}`);
    ok("PDF : les dix-huit paires s'écrivent toutes, polices embarquées, sans alerte (Italiana sans œ, Plex Mono et ses glyphes d'espace en dernier, Yellowtail, Anton…)", mauvaises.length === 0 && toutes.length === 18);
    const sansStyleNiPapier = planPdf({ ...mag, style: { ...st, couleurs: { ...creme, papier: "#ffffff" } } });
    ok("PDF papier blanc : pas de fond écrit ; la couleur de chaque aplat et le bord des photos viennent du style (papier)",
      sansStyleNiPapier.every((p) => p.fond === undefined) && pages.flatMap((p) => p.objets).filter((o) => o.type === "photo").every((o) => o.type === "photo" && o.couleurBord === "#f8ecdd"));
  }

  /* ═════ 13. l'écran : le panneau et la feuille d'export ═════ */
  {
    const pan = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/StylePanneau.tsx"));
    const ex = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/ExportFeuille.tsx"));
    const exp = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/exporterPdf.ts"));
    const barre = sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/Barre.tsx"));
    ok("panneau Style : la paire avec son humeur (dix-huit lignes du catalogue), six pastilles modifiables, le nuancier proposé (proposerNuancier) avec son accord et « Appliquer », « Retirer » ; tout passe par le geste styler",
      /PAIRES\.map/.test(pan) && /p\.humeur/.test(pan) && /ROLES_COULEUR\.map/.test(pan) && /type="color"/.test(pan) && /proposerNuancier\(/.test(pan) && /prop\.accord/.test(pan) && /Appliquer/.test(pan) && /Retirer/.test(pan)
        && (pan.match(/type: "styler"/g) ?? []).length >= 3 && !/localStorage|fetch\(/.test(pan));
    ok("panneau Style : un bouton « Aa » de la barre l'ouvre (ui.style, écran seulement) ; le choix d'une couleur n'écrit qu'une fois la main posée (minuteur), pas à chaque pixel du sélecteur",
      /majUi\(\{ style: !ui\.style \}\)/.test(barre) && /aria-label="Style"/.test(barre) && /setTimeout\(/.test(pan) && /450/.test(pan));
    ok("export PDF : les polices du plan sont lues dans /polices/ AVANT l'écriture, ecrirePdf reçoit leurs octets ; la feuille dit les polices embarquées et chaque alerte en rouge",
      /policesDuPlan\(pages\)/.test(exp) && /cheminPolice\(id, graisse\)/.test(exp) && /ecrirePdf\(pages, images, args\.titre \|\| args\.magazine\.titre, polices\)/.test(exp)
        && /etape\.r\.alertes\.map/.test(ex) && /ed-ex-rouge/.test(ex) && /Polices embarquées/.test(ex) && /polices: r\.polices, alertes: r\.alertes/.test(exp));
    ok("export Affinity : la feuille dit les familles à installer sur le Mac (sans elles Affinity les remplace) et ce qui arrive quand même (noms, nuances, styles) ; l'IDML n'a besoin d'aucune route ni d'aucun fichier de police",
      /Installer \{famillesDuStyle\.join\(" et "\)\} sur ce Mac/.test(ex) && /Styles Titre · Texte · Légende, six nuances/.test(ex) && !/polices/.test(sansComm(lire("src/app/admin/atelier/mise-en-page/[id]/exporter.ts")).replace(/Polices/g, "")));
  }

  /* ═════ 14. rien ne sort du périmètre ═════ */
  {
    const fichiers = ["src/lib/mise-en-page/style.ts", "src/lib/mise-en-page/nuancier.ts", "src/lib/mise-en-page/francais.ts"].map((f) => sansComm(lire(f))).join("\n");
    ok("modules purs : style.ts, nuancier.ts et francais.ts n'importent ni React, ni réseau, ni horloge, ni src/lib/atelier ; aucun fichier lu au runtime",
      !/from "react"|fetch\(|Date\.now|new Date|process\.env|@\/lib\/atelier|node:fs|require\(/.test(fichiers));
    ok("catalogue : T-04 n'apparaît dans aucune table de polices (seulement dans un commentaire qui la refuse), jamais « Cormorant » dans le code du style",
      !/Cormorant/.test(sansComm(lire("src/lib/mise-en-page/style.ts"))) && !PAIRES.some((p) => p.id === "T-04"));
    void DOSSIER_POLICES;
  }
}

/* seul : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-style.ts` */
if (process.argv[1] && /verif-mep-style\.ts$/.test(process.argv[1])) {
  let ko = 0;
  void verifierMepStyle((n, c) => { console.log(`  ${c ? "ok " : "KO "} ${n}`); if (!c) ko += 1; }, (t) => console.log(`\n${t}`)).then(() => {
    console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
    process.exit(ko === 0 ? 0 : 1);
  });
}
