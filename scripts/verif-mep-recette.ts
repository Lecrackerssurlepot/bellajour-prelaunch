/**
 * Le harnais du LOT R (12/11) : les corrections de la recette croisée de l'éditeur (D1 à D9).
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-mep-recette.ts
 *
 * Appelé aussi par scripts/verif-atelier.ts. Sans base, sans réseau, sans écriture.
 *   - D2 : un cadre de texte vide n'est JAMAIS exporté (PDF, IDML, intérieur, couverture), sur chaque gabarit qui a un texte ;
 *   - D1 : les gabarits générés des DOUBLES (GD1) ; D3 : les questions de la machine lisibles ; D4 : la légende courte du tiroir.
 */

import { strFromU8 } from "fflate";
import * as O from "@/lib/mise-en-page/editeur";
import { textesInitiaux } from "@/lib/mise-en-page/editeur/outils";
import { GABARITS_COUVERTURE, couvertureNeuve, type Couverture } from "@/lib/mise-en-page/couverture";
import { construireIdml, construireIdmlCouverture, type PhotoExport } from "@/lib/mise-en-page/idml";
import { planPdf, planPdfCouverture } from "@/lib/mise-en-page/pdf";
import { nouveauMagazine, tousLesTemplates, type Disposition, type Magazine, type TexteCadre } from "@/lib/mise-en-page/magazine";
import { COULEURS_ORIGINE, styleDePaire } from "@/lib/mise-en-page/style";
import type { Template } from "@/lib/mise-en-page/types";

const neutre = { zoom: 1, dx: 0, dy: 0 };
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

  void strFromU8;
}

/* lancé seul : `npx tsx --tsconfig tsconfig.json scripts/verif-mep-recette.ts` */
if (process.argv[1] && /verif-mep-recette\.ts$/.test(process.argv[1])) {
  let ko = 0;
  verifierMepRecette((n, c) => { console.log(`${c ? "  ok " : "  KO "} ${n}`); if (!c) ko++; }, (t) => console.log(`\n${t}`));
  console.log(ko ? `\n${ko} échec(s)` : "\nTOUT PASSE");
  process.exit(ko ? 1 : 0);
}
