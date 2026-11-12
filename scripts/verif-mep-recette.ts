/**
 * Le harnais du LOT R (12/11) : les corrections de la recette croisée de l'éditeur (D1 à D9).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-recette.ts
 *
 * Appelé aussi par scripts/verif-atelier.ts. Sans base, sans réseau, sans écriture.
 *   - D2 : un cadre de texte vide n'est JAMAIS exporté (PDF, IDML, intérieur, couverture), sur chaque gabarit qui a un texte ;
 *   - D1 : les gabarits générés des DOUBLES (GD1) ; D3 : les questions de la machine lisibles ; D4 : la légende courte du tiroir.
 */

import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { textesInitiaux } from "@/lib/mise-en-page/editeur/outils";
import { GABARITS_COUVERTURE, couvertureNeuve, type Couverture } from "@/lib/mise-en-page/couverture";
import { construireIdml, construireIdmlCouverture, type PhotoExport } from "@/lib/mise-en-page/idml";
import { planPdf, planPdfCouverture } from "@/lib/mise-en-page/pdf";
import { ajouterDouble, cadresDe, disposer, nouveauMagazine, templateParId, tousLesTemplates, type Disposition, type Magazine, type PhotoRef, type TexteCadre } from "@/lib/mise-en-page/magazine";
import { COULEURS_ORIGINE, styleDePaire } from "@/lib/mise-en-page/style";
import { orientationCadre, orientationDe, signatureDe, type Orientation, type Template } from "@/lib/mise-en-page/types";
import { genereParId, idsDePage, partEnRupture, partVide } from "@/lib/mise-en-page/genere";
import { COTES_MAX, genereDoubleParId, genereesDoublesPour } from "@/lib/mise-en-page/genereDouble";
import { FOND_PERDU, MARGES, PAGE_L, PLANCHE_L } from "@/lib/mise-en-page/geometrie";

const EPS = 1e-6;
const um = (v: number): number => Math.round(v * 1e6);
const cadresUm = (t: Template): string => JSON.stringify(t.cadres.map((c) => [c.role, um(c.x), um(c.y), um(c.l), um(c.h), c.bord ?? null, c.rotation ?? null]));
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
/** Un hasard à graine (mulberry32) : les mêmes tirages à chaque passage. */
function hasard(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DIMS: [number, number][] = [[4000, 3000], [6000, 4000], [3000, 4000], [4000, 6000], [3000, 3000], [1920, 1080], [1080, 1920]];
const lotAleatoire = (h: () => number, n: number): PhotoRef[] => Array.from({ length: n }, (_, i) => { const d = DIMS[Math.floor(h() * DIMS.length)]; return { id: `p${i}`, nom: `p${i}`, l: d[0], h: d[1], date: null }; });
const neutre = { zoom: 1, dx: 0, dy: 0 };
const EMPREINTE_DOUBLES = "0b3cd4b6";
const LIBELLES = ["Titre", "Texte", "Légende"];

/** Les photos d'essai : p1 à p14, de formes variées (le contenu n'est jamais lu, seules les cotes comptent à l'export). */
const PHOTOS: Map<string, PhotoExport> = new Map(Array.from({ length: 14 }, (_, i) => {
  const id = `p${i + 1}`;
  return [id, { id, nomLien: `${id}.jpg`, l: i % 2 ? 3000 : 4000, h: i % 2 ? 4000 : 3000 }] as const;
}));
const LIEUX = new Map(Array.from({ length: 14 }, (_, i) => [`p${i + 1}`, { id: `p${i + 1}`, nom: `p${i + 1}`, l: 4000, h: 3000, date: null, ville: "Lisbonne", pays: "Portugal" }]));

/** Les fichiers de l'IDML qui contiennent des cadres texte, et leur histoire : le nombre de TextFrame et les textes des stories. */
function textesIdml(fichiers: readonly { chemin: string; contenu: string }[]): { cadres: number; stories: string[] } {
  let cadres = 0;
  const stories: string[] = [];
  for (const f of fichiers) {
    if (f.chemin.startsWith("Spreads/")) cadres += (f.contenu.match(/<TextFrame /g) ?? []).length;
    if (f.chemin.startsWith("Stories/")) stories.push([...f.contenu.matchAll(/<CharacterStyleRange[^>]*>(?:<Properties>.*?<\/Properties>)?(.*?)<\/CharacterStyleRange>/g)].map((m) => m[1].replace(/<Br\/>/g, "\n")).join(""));
  }
  return { cadres, stories };
}
const textesPdf = (pages: ReturnType<typeof planPdf>): string[] => pages.flatMap((p) => p.objets.flatMap((o) => (o.type === "texte" ? [o.contenu] : [])));

/** Une disposition d'un gabarit, ses textes tels que la pose les fait (les mots-repères), ses photos p1… */
function dispositionDe(t: Template, textes?: (i: number) => string | null): Disposition {
  const nP = t.cadres.filter((c) => c.role === "photo").length;
  const base = textesInitiaux(t);
  return {
    templateId: t.id,
    photos: Array.from({ length: nP }, (_, i) => ({ photoId: `p${i + 1}`, recadrage: { ...neutre } })),
    textes: base.map((x, i): TexteCadre => { const v = textes ? textes(i) : null; return v === null ? x : { ...x, contenu: v }; }),
  };
}

/** Un magazine à deux planches : la 1re page seule, puis la planche du gabarit (double, ou page droite). */
function magazineDe(t: Template, d: Disposition, style: boolean): Magazine {
  const m = nouveauMagazine("m", "Essai", "2026-11-12T10:00:00.000Z");
  const planches: Magazine["planches"] = t.portee === "double"
    ? [m.planches[0], { id: "pl-2", mode: "double", double: d, gauche: null, droite: null }]
    : [m.planches[0], { id: "pl-2", mode: "pages", double: null, gauche: null, droite: d }];
  const s = style ? styleDePaire("T-03", { ...COULEURS_ORIGINE }) : null;
  return { ...m, planches, ...(s ? { style: s } : {}) };
}

export function verifierMepRecette(rapporter: (nom: string, reussi: boolean) => void, titre: (t: string) => void): void {
  titre("— Mise en page : la recette croisée du 12/11 (lot R) —");

  /* ─── D2. un cadre de texte vide n'est JAMAIS exporté ─── */
  {
    const avecTexte = tousLesTemplates().filter((t) => t.cadres.some((c) => c.role !== "photo") && t.cadres.filter((c) => c.role === "photo").length <= 14);
    const defauts: string[] = [];
    let essais = 0;
    for (const t of avecTexte) for (const style of [false, true]) {
      const nT = t.cadres.filter((c) => c.role !== "photo").length;
      /* 1. rien d'écrit : ni mot-repère ni cadre, ni dans le PDF ni dans l'IDML */
      const vide = O.avecLieuxParDefaut(magazineDe(t, dispositionDe(t), style), new Map());
      const pdf = textesPdf(planPdf(vide));
      const idml = textesIdml(construireIdml(vide, PHOTOS, { liens: { mode: "absolu", dossier: "/x" } }));
      essais++;
      if (pdf.length) defauts.push(`${t.id}${style ? " (style)" : ""} : PDF « ${pdf.join(" | ")} »`);
      if (idml.cadres || idml.stories.length) defauts.push(`${t.id}${style ? " (style)" : ""} : IDML ${idml.cadres} cadre(s), ${idml.stories.length} story`);
      /* 2. le texte du premier cadre est écrit : lui seul part, tel qu'il est écrit */
      const ecrit = O.avecLieuxParDefaut(magazineDe(t, dispositionDe(t, (i) => (i === 0 ? "Nos vacances" : null)), style), new Map());
      const p2 = textesPdf(planPdf(ecrit));
      const i2 = textesIdml(construireIdml(ecrit, PHOTOS, { liens: { mode: "absolu", dossier: "/x" } }));
      essais++;
      if (p2.length !== 1 || !/nos vacances/i.test(p2[0])) defauts.push(`${t.id}${style ? " (style)" : ""} : un texte écrit → PDF ${JSON.stringify(p2)}`);
      if (i2.cadres !== 1 || i2.stories.length !== 1 || !/nos vacances/i.test(i2.stories[0])) defauts.push(`${t.id}${style ? " (style)" : ""} : un texte écrit → IDML ${i2.cadres} cadre(s) ${JSON.stringify(i2.stories)}`);
      if (nT > 1 && LIBELLES.some((l) => [...p2, ...i2.stories].some((x) => x === l))) defauts.push(`${t.id} : un mot-repère s'imprime à côté d'un texte écrit`);
    }
    rapporter(`D2 : sur chacun des ${avecTexte.length} gabarits qui ont un texte (intérieur, sans puis avec style : ${essais} exports), rien d'écrit = aucun mot-repère ni cadre dans le PDF ni dans l'IDML ; un texte écrit part seul${defauts.length ? ` — ${defauts.slice(0, 4).join(" ; ")}` : ""}`,
      avecTexte.length >= 20 && defauts.length === 0);

    /* le lieu reste le texte par défaut du premier titre ; les autres cadres vides ne partent pas */
    const avecTitre = avecTexte.find((t) => t.cadres.some((c) => c.role === "titre") && t.cadres.some((c) => c.role !== "titre" && c.role !== "photo"));
    if (avecTitre) {
      const m = O.avecLieuxParDefaut(magazineDe(avecTitre, dispositionDe(avecTitre), false), LIEUX);
      const p = textesPdf(planPdf(m));
      rapporter(`D2 : le lieu reste le texte par défaut du premier titre (${avecTitre.id} : ${JSON.stringify(p)}) ; un « Texte » ou une légende au même lieu ne s'imprime pas`,
        p.length >= 1 && p[0] === "Lisbonne" && p.every((x) => !LIBELLES.includes(x)));
    }
    rapporter("D2 : un export déjà prêt ne change plus (idempotent), un magazine sans texte vide revient identique",
      (() => {
        const t = avecTexte[0];
        const a = O.avecLieuxParDefaut(magazineDe(t, dispositionDe(t), false), new Map());
        const b = O.avecLieuxParDefaut(a, new Map());
        const sans = nouveauMagazine("m", "Essai", "2026-11-12T10:00:00.000Z");
        return b === a && O.avecLieuxParDefaut(sans, new Map()) === sans;
      })());
  }

  /* ─── D2, la couverture ─── */
  {
    const defauts: string[] = [];
    let essais = 0;
    for (const g of GABARITS_COUVERTURE) for (const style of [false, true]) for (const lieu of [false, true]) {
      const nTextes = g.cadres.filter((c) => c.role !== "photo").length;
      const premier = g.cadres.filter((c) => c.role !== "photo").findIndex((c) => c.motTitre);
      const m0 = nouveauMagazine("m", "Essai", "2026-11-12T10:00:00.000Z");
      const s = style ? styleDePaire("T-03", { ...COULEURS_ORIGINE }) : null;
      const photos = Array.from({ length: g.cadres.filter((c) => c.role === "photo").length }, (_, i) => ({ photoId: `p${i + 1}`, recadrage: { ...neutre } }));
      const base: Couverture = { ...couvertureNeuve(g.id), photos };
      const mag = (c: Couverture): Magazine => ({ ...m0, couverture: c, ...(s ? { style: s } : {}) });
      const dosMm = 2.56;
      const sorti = (c: Couverture) => {
        const pret = O.avecLieuxParDefaut(mag(c), lieu ? LIEUX : new Map());
        return { pdf: planPdfCouverture(pret.couverture!, dosMm, pret.style).objets.flatMap((o) => (o.type === "texte" ? [o.contenu] : [])),
          idml: textesIdml(construireIdmlCouverture(pret.couverture!, PHOTOS, { liens: { mode: "absolu", dossier: "/x" }, dosMm, style: pret.style })) };
      };
      essais += 2;
      /* rien d'écrit : seul le lieu (premier mot-titre, quand les photos le disent) peut partir, jamais un mot-repère */
      const v = sorti(base);
      const attendu = lieu ? 1 : 0;
      if (v.pdf.length !== attendu || v.idml.cadres !== attendu || v.idml.stories.length !== attendu) defauts.push(`${g.id}${style ? " (style)" : ""}${lieu ? " (lieu)" : ""} : rien d'écrit → PDF ${JSON.stringify(v.pdf)}, IDML ${v.idml.cadres} cadre(s)`);
      if ([...v.pdf, ...v.idml.stories].some((x) => LIBELLES.some((l) => x.toLowerCase().includes(l.toLowerCase())))) defauts.push(`${g.id} : un mot-repère sur la couverture`);
      /* le titre écrit dans le premier mot-titre : lui seul part, jamais le second titre du gabarit */
      const textes: TexteCadre[] = base.textes.map((t, i) => (i === premier ? { ...t, contenu: "La Geffroy family" } : t));
      const w = sorti({ ...base, textes });
      if (w.pdf.length !== 1 || !/geffroy/i.test(w.pdf[0]) || w.idml.cadres !== 1 || w.idml.stories.length !== 1) defauts.push(`${g.id}${style ? " (style)" : ""}${lieu ? " (lieu)" : ""} : titre écrit → PDF ${JSON.stringify(w.pdf)}, IDML ${w.idml.cadres} cadre(s)`);
      void nTextes;
    }
    rapporter(`D2 : sur chacun des ${GABARITS_COUVERTURE.length} gabarits de couverture (sans puis avec style, sans puis avec lieu : ${essais} exports), jamais de mot-repère ; le second mot-titre non écrit de « Les photos entre les mots » ne part pas ; le titre écrit part seul${defauts.length ? ` — ${defauts.slice(0, 4).join(" ; ")}` : ""}`,
      defauts.length === 0);
  }

  /* ─── D1. les gabarits générés des DOUBLES ─── */
  {
    const h = hasard(20261112);
    let lots = 0, generes = 0, nonDecodes = 0, mesuresKo = 0, pliKo = 0, compatKo = 0, nbKo = 0, doublons = 0, plafondKo = 0, textesKo = 0;
    const nonVides: number[] = [];
    for (let k = 0; k < 300; k++) {
      const n = 2 + Math.floor(h() * 11);
      const photos = lotAleatoire(h, n);
      const liste = O.gabaritsClasses("double", photos, null);
      const gen = liste.map((x) => x.template).filter((t) => t.origine === "genere");
      lots++;
      if (new Set(liste.map((x) => x.template.id)).size !== liste.length) doublons++;
      if (gen.length > 6 * COTES_MAX * COTES_MAX) plafondKo++;
      if (gen.length) nonVides.push(n);
      for (const t of gen) {
        generes++;
        const pages = idsDePage(t.id).map((id) => genereParId(id));
        const dec = genereDoubleParId(t.id);
        /* décodé SANS table : les mêmes cadres au micron, refabriqués à la main depuis les deux recettes (gauche en miroir, droite décalée) */
        if (!dec || dec.id !== t.id || cadresUm(dec) !== cadresUm(t) || templateParId(t.id)?.id !== t.id || pages.length !== 2 || pages.some((p) => !p)) { nonDecodes++; continue; }
        const [g, d] = pages as Template[];
        const attendu = [...g.cadres.map((c) => [c.role, um(PAGE_L - c.x - c.l), um(c.y), um(c.l), um(c.h), c.bord ?? null, c.rotation ?? null]), ...d.cadres.map((c) => [c.role, um(c.x + PAGE_L), um(c.y), um(c.l), um(c.h), c.bord ?? null, c.rotation ?? null])];
        if (JSON.stringify(attendu) !== cadresUm(t)) mesuresKo++;
        if (t.portee !== "double" || t.nbPhotos !== n || t.cadres.length !== n || t.signature !== signatureDe(t.cadres) || g.nbPhotos < 1 || d.nbPhotos < 1 || g.nbPhotos + d.nbPhotos !== n) nbKo++;
        if (t.cadres.some((c) => c.role !== "photo")) textesKo++;
        /* le pli : aucun cadre ne le traverse ; aucune photo à moins de 20 mm (la marge intérieure), sauf le fond plein d'une incrustation qui s'arrête AU pli ; tout reste dans la planche et son fond perdu */
        for (const c of t.cadres) {
          const gauche = c.x + c.l <= PAGE_L + EPS, droite = c.x >= PAGE_L - EPS;
          const fond = c.l > PAGE_L - 1;
          if (!(gauche || droite)) pliKo++;
          else if (!fond && (gauche ? c.x + c.l > PAGE_L - MARGES.interieure + EPS : c.x < PAGE_L + MARGES.interieure - EPS)) pliKo++;
          if (c.x < -FOND_PERDU - EPS || c.x + c.l > PLANCHE_L + FOND_PERDU + EPS || c.y < -FOND_PERDU - EPS || c.y + c.h > 297 + FOND_PERDU + EPS) pliKo++;
        }
        /* la photo i va au cadre i : la forme de chaque photo va à son cadre (un carré va partout) */
        const os = photos.map((p) => orientationDe(p.l, p.h));
        t.cadres.forEach((c, i) => { const o = orientationCadre(c); if (!(os[i] === o || os[i] === "C" || o === "C")) compatKo++; });
      }
    }
    console.log(`      doubles lues : ${generes} ; non décodées ${nonDecodes}, mesures ${mesuresKo}, nombres ${nbKo}, textes ${textesKo}, doublons ${doublons}`);
    rapporter(`D1 doubles générées : ${generes} gabarits lus sur ${lots} lots de 2 à 12 photos (${[...new Set(nonVides)].length} nombres différents) : chacun se décode SANS table et redonne ses cadres au micron (gauche en miroir, droite décalée), deux recettes de 1 à 6 photos, n photos pour n cadres, photos seulement`,
      generes > 5000 && nonDecodes === 0 && mesuresKo === 0 && nbKo === 0 && textesKo === 0 && doublons === 0);
    rapporter(`D1 doubles générées : le pli tient : aucun cadre ne le traverse, aucune photo à moins de ${MARGES.interieure} mm du pli (sauf le fond plein d'une incrustation, qui s'arrête au pli), tout dans la planche et son fond perdu ; la photo i va à un cadre de sa forme`,
      pliKo === 0 && compatKo === 0);
    rapporter(`D1 doubles générées : plafonnées (au plus ${6 * COTES_MAX * COTES_MAX} par lot : ${COTES_MAX} découpes par page, 64 appariements par répartition, 6 répartitions au plus) ; aucune double hors de 2 à 12 photos`,
      plafondKo === 0 && genereesDoublesPour([{ l: 4, h: 3 }], () => 0).length === 0 && genereesDoublesPour(Array.from({ length: 13 }, () => ({ l: 4, h: 3 })), () => 0).length === 0);
  }
  {
    /* des mesures figées : si la grille ou l'énumération bougent un jour, les vieux magazines bougeraient, le harnais le dit */
    const t = templateParId("GD1-EN-0066_EN-0066")!;
    const q = templateParId("GD1-HS-0063.0322.2322_MO-0033.3033.0363-p201")!;
    rapporter("D1 mesures figées : « GD1-EN-0066_EN-0066 » = une photo pleine zone par page, 15 → 190 à gauche et 230 → 405 à droite, 15 → 277 en hauteur, au micron ; le nom dit les deux pages",
      !!t && t.portee === "double" && t.nbPhotos === 2 && cadresUm(t) === JSON.stringify([["photo", 15e6, 15e6, 175e6, 262e6, null, null], ["photo", 230e6, 15e6, 175e6, 262e6, null, null]])
        && t.nom === "Gauche : Encadrée pleine zone | Droite : Encadrée pleine zone" && t.origine === "genere" && !!q && q.nbPhotos === 3 + 3);
    const refus = ["GD1-EN-0066", "GD1-EN-0066_", "GD1-_EN-0066", "GD1-EN-0066_EN-0066_EN-0066", "GD1-XX-0066_EN-0066", "GG1-EN-0066_EN-0066", "GD2-EN-0066_EN-0066", "GD1-EN-0066_EN-0077", "GD1-EN-0066-p0_EN-0066", "GD1-EN-0066_GG1-EN-0066", "GD1-EN-0066 _EN-0066", "GD1-"];
    rapporter(`D1 décodage : une seule recette, une de trop, un schéma inconnu, une autre version, des cases hors grille, un ordre non canonique : refusés (${refus.length} ids) ; un id de page (GG1) n'est pas une double`,
      refus.every((id) => genereDoubleParId(id) === null && templateParId(id) === null || id === "GG1-EN-0066_EN-0066" && genereDoubleParId(id) === null) && templateParId("GG1-EN-0066")?.portee === "page");
  }
  {
    /* déterminisme : deux lectures identiques ; l'énumération figée par une empreinte (cinq lots fixes) */
    const lotsFixes = [["P", "P"], ["L", "P", "P"], ["L", "L", "P", "P"], ["P", "L", "P", "P", "L"], ["L", "L", "L", "L", "L", "L", "L", "L", "L", "L"]] as const;
    const refsDe = (os: readonly ("P" | "L" | "C")[]): PhotoRef[] => os.map((o, i) => ({ id: `p${i}`, nom: `p${i}`, l: o === "L" ? 3000 : o === "P" ? 2000 : 2000, h: o === "L" ? 2000 : o === "P" ? 3000 : 2000, date: null }));
    const lecture = (os: readonly ("P" | "L" | "C")[]) => O.gabaritsClasses("double", refsDe(os), null).map((x) => `${x.template.id}:${Math.round(x.note * 1e6)}`).join("|");
    const a = lotsFixes.map(lecture).join("#"), b = lotsFixes.map(lecture).join("#");
    const empreinte = fnv(a);
    console.log(`      empreinte des classements de doubles (5 lots fixes) : ${empreinte}`);
    rapporter(`D1 déterminisme : deux classements du même lot sont identiques mot pour mot ; l'empreinte des cinq lots fixes est celle relevée le 12/11 (${EMPREINTE_DOUBLES})`, a === b && empreinte === EMPREINTE_DOUBLES);
  }
  {
    /* l'ordre : à qualité égale, les dessinés d'abord (jusqu'à 0,15 de note), puis les générées (jusqu'à 0,05), puis les grilles ; mêmes malus que les pages */
    const h = hasard(1112);
    let paires = 0, malRanges = 0;
    for (let k = 0; k < 150; k++) {
      const n = 2 + Math.floor(h() * 11);
      const photos = lotAleatoire(h, n);
      const classes = O.gabaritsClasses("double", photos, null);
      const rang = new Map(classes.map((x, i) => [x.template.id, i] as const));
      const brut = (t: Template) => O.noterGabarit(t, photos, null) + O.BONUS_ORIGINE[t.portee][t.origine];
      const tous = classes.map((x) => x.template);
      const des = tous.filter((t) => t.origine === "epingle" || t.origine === "annexe");
      const gen = tous.filter((t) => t.origine === "genere");
      const gri = tous.filter((t) => t.origine === "grille");
      for (const d of des) for (const x of gen) { paires++; if (brut(d) <= brut(x) + O.AVANCE_DESSINES + 1e-12 && rang.get(d.id)! > rang.get(x.id)!) malRanges++; }
      for (const x of gen) for (const r of gri) { paires++; if (brut(x) <= brut(r) + O.AVANCE_GENERES + 1e-12 && rang.get(x.id)! > rang.get(r.id)!) malRanges++; }
    }
    rapporter(`D1 ordre : à qualité égale, dessinés d'abord (jusqu'à ${O.AVANCE_DESSINES} de note), puis générées (jusqu'à ${O.AVANCE_GENERES}), puis grilles : ${paires} paires lues sur 150 lots, ${malRanges} mal rangée(s)`, malRanges === 0 && paires > 5000);
    /* mêmes malus que les pages : le vide (la moyenne des deux pages), la rupture (la part des pages en CH ou IN) */
    const pleine = templateParId("GD1-EN-0066_EN-0066")!, demi = templateParId("GD1-EN-1242_EN-0066")!;
    const incrust = templateParId("GD1-IN-0021_EN-0066")!, deuxCH = templateParId("GD1-CH-0133.2121_CH-0133.2121")!, page = templateParId("GG1-EN-1242")!;
    rapporter("D1 malus : le vide d'une double est la moyenne de ses deux pages (pleine zone 0, demi-page 4 × 2 sur l'autre 0,395, comme la page seule 0,79) ; la rupture, la part des pages en CH ou IN (0, ½, 1) ; les mêmes réglages que la page",
      O.videDe(pleine) < 1e-9 && Math.abs(O.videDe(demi) - (1 - (115 * 84) / (175 * 262)) / 2) < 1e-9 && Math.abs(partVide(page) - (1 - (115 * 84) / (175 * 262))) < 1e-9
        && partEnRupture(pleine) === 0 && partEnRupture(incrust) === 0.5 && partEnRupture(deuxCH) === 1 && partEnRupture(page) === 0 && partEnRupture(templateParId("E-S1")!) === 0
        && O.MALUS_VIDE > 0 && O.MALUS_RUPTURE > 0);
  }
  {
    /* la vitesse : la première liste d'un lot, puis le classement répété */
    const h = hasard(7);
    const photos = lotAleatoire(h, 7);
    const t0 = performance.now();
    const premiere = O.gabaritsClasses("double", photos, null);
    const msPremiere = performance.now() - t0;
    const six = lotAleatoire(h, 6);
    O.gabaritsClasses("double", six, null);
    const t1 = performance.now();
    for (let i = 0; i < 300; i++) O.gabaritsClasses("double", six, i % 2 ? null : "DP-01");
    const ms = performance.now() - t1;
    console.log(`      première liste d'une double de 7 photos (${premiere.length} gabarits) : ${Math.round(msPremiere)} ms ; 300 classements d'une double de 6 photos : ${Math.round(ms)} ms`);
    rapporter("D1 vitesse : la première liste d'une double de 7 photos en moins de 1,5 s et 300 classements d'une double de 6 photos en moins de 1,5 s (même sur une machine lente)", msPremiere < 1500 && ms < 1500);
  }

  {
    /* l'éditeur : « Poser » fabrique une double, R et le tiroir parcourent les générées, chaque pas passe les invariants et la sauvegarde, annuler revient */
    const os: Orientation[] = ["L", "P", "P", "L", "P", "L"];
    const catalogue: PhotoMaq[] = os.map((o, i) => ({
      id: String.fromCharCode(65 + i), nom: `${String.fromCharCode(65 + i)}.jpg`, l: o === "L" ? 3000 : 2000, h: o === "L" ? 2000 : 3000, date: `2026-06-11T08:${String(i).padStart(2, "0")}:00.000Z`,
      personne: "Inès", lien: "Lien général", type: "lien", coeur: false, signalee: false, autresMagazines: [], nouvelle: false, vignette: null,
    }));
    const ids = catalogue.map((p) => p.id);
    let e: EtatEditeur = O.creerEtat({ magazine: ajouterDouble(nouveauMagazine("mag-test", "Test", "2026-11-12T10:00:00.000Z")), catalogue });
    const pas = (g: O.Geste) => {
      const avant = e;
      e = O.appliquer(avant, g);
      const err = O.verifierInvariants(e, avant, g);
      if (err.length) throw new Error(`invariants après ${JSON.stringify(g)} : ${err.join(" ; ")}`);
    };
    let msg: string | null = null;
    let nbListe = 0, nbR = 0, vus = 0, nbGeneres = 0, valide = true, retour = true, pose = "", miroirOk = false, retireOk = false, nbPlus = 0;
    try {
      pas({ type: "poser", cible: { type: "double", plancheId: "pl-2" }, ids, confirme: true });
      pas({ type: "naviguer", plancheId: "pl-2" });
      pose = e.magazine.planches[1].double!.templateId;
      const liste = O.gabaritsPour(e, "pl-2", "double");
      nbListe = liste.length;
      nbGeneres = liste.filter((x) => x.id.startsWith("GD1-")).length;
      nbPlus = nbListe - O.PLAFOND_TIROIR;
      if (!liste.some((x) => x.courant && x.id === pose)) throw new Error("le gabarit courant n'est pas dans le tiroir");
      if (new Set(liste.map((x) => x.id)).size !== liste.length) throw new Error("un gabarit deux fois dans le tiroir");
      const vusIds = new Set<string>([pose]);
      for (let i = 0; i < liste.length; i++) {
        pas({ type: "touche", cle: "r", shift: false, meta: false, ctrl: false, alt: false, survol: { plancheId: "pl-2", cible: "double" } });
        nbR++;
        const t = e.magazine.planches[1].double!.templateId;
        vusIds.add(t);
        if (!templateParId(t)) valide = false;
        if (i % 9 === 0 && !O.contenuValide(JSON.parse(JSON.stringify(e.magazine)))) valide = false;
      }
      vus = vusIds.size;
      retour = e.magazine.planches[1].double!.templateId === pose;
      /* un gabarit généré choisi au tiroir : ses cadres sont ceux de l'id, le miroir les retourne et se relit, retirer une photo recompose */
      const choisi = liste.find((x) => x.id.startsWith("GD1-") && x.id !== pose)!;
      pas({ type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: choisi.id });
      const d = e.magazine.planches[1].double!;
      const base = cadresDe(d, "double").map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join();
      if (base !== choisi.template.cadres.map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join()) throw new Error("les cadres de la double ne sont pas ceux de son id");
      pas({ type: "miroir", plancheId: "pl-2" });
      const m = cadresDe(e.magazine.planches[1].double!, "double");
      miroirOk = e.magazine.planches[1].double!.miroir === true && m.every((c, i) => Math.abs(c.x - (PLANCHE_L - choisi.template.cadres[i].x - choisi.template.cadres[i].l)) < EPS) && O.contenuValide(JSON.parse(JSON.stringify(e.magazine)));
      pas({ type: "miroir", plancheId: "pl-2" });
      pas({ type: "retirer", ref: { plancheId: "pl-2", cible: "double", index: 2 }, confirme: true });
      const apres = e.magazine.planches[1].double!;
      retireOk = apres.photos.length === 5 && !!templateParId(apres.templateId) && templateParId(apres.templateId)!.nbPhotos === 5 && O.contenuValide(JSON.parse(JSON.stringify(e.magazine)));
      for (let i = 0; i < 3 + nbR; i++) pas({ type: "annuler" });
    } catch (x) { msg = x instanceof Error ? x.message : String(x); }
    if (msg) console.log(`   ${msg}`);
    rapporter(`D1 éditeur : « Poser » six photos sur une double : ${nbListe} gabarits au tiroir dont ${nbGeneres} générées ; R les parcourt tous (${nbR} pas, ${vus} différents) et revient au départ ; chaque pas passe les invariants et la sauvegarde ; le gabarit choisi donne les cadres de son id, le miroir les retourne, retirer une photo recompose ; annuler tout revient`,
      msg === null && nbGeneres > 100 && vus === nbListe && retour && valide && miroirOk && retireOk);
    rapporter(`D1 tiroir : le plafond (${O.PLAFOND_TIROIR}) est plus petit que la liste (${nbListe}) : « Plus » ajoute ${O.PAS_TIROIR} à chaque clic (${nbPlus} derrière le plafond)`, nbPlus > 0 && O.PAS_TIROIR >= O.PLAFOND_TIROIR);
    void pose;
  }
  {
    /* la sauvegarde : un magazine posé sur une double générée se relit tel quel ; un id abîmé, ou une page, est refusé */
    const photos = lotAleatoire(hasard(3), 4);
    const idGen = O.gabaritsClasses("double", photos, null).map((x) => x.template).find((t) => t.id.startsWith("GD1-"))!;
    const dispo = (t: Template) => disposer(t, photos.slice(0, t.nbPhotos));
    const m0 = ajouterDouble(nouveauMagazine("m", "Essai", "2026-11-12T10:00:00.000Z"));
    const avec = (d: Disposition, i = 1): Magazine => ({ ...m0, planches: m0.planches.map((p, k) => (k === i ? { ...p, mode: "double", double: d } : p)) });
    const bonne = avec(dispo(idGen));
    const relu = JSON.parse(JSON.stringify(bonne)) as Magazine;
    const surPage: Magazine = { ...m0, planches: [m0.planches[0], { id: "pl-2", mode: "pages", double: null, gauche: dispo(idGen), droite: null }] };
    const tAbime = (id: string): Magazine => avec({ ...dispo(idGen), templateId: id });
    const mauvaisNombre: Magazine = avec({ ...dispo(idGen), photos: dispo(idGen).photos.slice(1) });
    rapporter(`D1 sauvegarde : une double posée sur ${idGen.id} se relit telle quelle (mêmes cadres au micron) ; la même sur une page, un id abîmé, un nombre de photos faux sont refusés`,
      O.contenuValide(relu) && cadresDe(relu.planches[1].double!, "double").map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join() === cadresDe(bonne.planches[1].double!, "double").map((c) => [um(c.x), um(c.y), um(c.l), um(c.h)]).join()
        && !O.contenuValide(JSON.parse(JSON.stringify(surPage))) && !O.contenuValide(tAbime(idGen.id.replace("GD1-", "GD2-"))) && !O.contenuValide(tAbime(idGen.id.slice(0, -1))) && !O.contenuValide(tAbime(`${idGen.id}_EN-0066`))
        && !O.contenuValide(mauvaisNombre) && idGen.id.length < 200);
    /* l'export : une double générée part en IDML et en PDF comme n'importe quel cadre photo */
    const phE: Map<string, PhotoExport> = new Map(photos.map((p) => [p.id, { id: p.id, nomLien: `${p.id}.jpg`, l: p.l, h: p.h }] as [string, PhotoExport]));
    const fi = construireIdml(bonne, phE, { liens: { mode: "relatif" } });
    const xml = fi.filter((x) => x.chemin.startsWith("Spreads/")).map((x) => x.contenu).join("");
    const nbRect = (xml.match(/<Rectangle [^>]*ContentType="GraphicType"/g) ?? []).length;
    const pdf = planPdf(bonne);
    rapporter(`D1 export : une double générée (${idGen.id}) part en IDML (${nbRect} cadres photo pour ${photos.length}, aucun cadre texte) et en PDF (${pdf[1].objets.filter((o) => o.type === "photo").length} photos sur la planche)`,
      nbRect === photos.length && (xml.match(/<TextFrame /g) ?? []).length === 0 && pdf[1].objets.filter((o) => o.type === "photo").length === photos.length);
  }

}

/* lancé seul : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-recette.ts` */
if (process.argv[1] && /verif-mep-recette\.ts$/.test(process.argv[1])) {
  let ko = 0;
  verifierMepRecette((n, c) => { console.log(`${c ? "  ok " : "  KO "} ${n}`); if (!c) ko++; }, (t) => console.log(`\n${t}`));
  console.log(ko ? `\n${ko} échec(s)` : "\nTOUT PASSE");
  process.exit(ko ? 1 : 0);
}
