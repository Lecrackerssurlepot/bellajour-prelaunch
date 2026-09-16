/**
 * Les Word de legal-source/ — générés depuis le TEXTE EXACT du site.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/legal-docx.ts            # tout (15 fichiers)
 *   npx tsx --tsconfig tsconfig.json scripts/legal-docx.ts cgv        # un seul document
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE SCRIPT EXISTE
 *
 * Le site affiche ses textes légaux depuis `src/app/legal/content/*.ts` : c'est
 * la seule source. `legal-source/` (hors git, décision D4) garde une copie Word
 * lisible par un tiers sans ouvrir le dépôt : le comptable, un juriste, et la
 * preuve de la version acceptée par un client (CGV art. 8.6, dix ans). Jusqu'au
 * 16/09/2026 ces Word étaient produits à la main et prenaient du retard à
 * chaque version ; ici, ils SORTENT du code, donc ils ne peuvent pas diverger.
 *
 * Un fichier par document et par langue, nommé « TITRE — BELLAJOUR (vX.Y,
 * JJ-MM-AAAA).docx », la version et la date lues dans `lastUpdated`. L'annexe
 * « Fiche produit » des CGV sort aussi seule. Les fichiers précédents ne sont
 * jamais effacés : une version différente est un nom différent.
 *
 * Sans danger : n'écrit que dans legal-source/, ne lit ni base ni réseau.
 * Contenu vérifiable sans Word : `unzip -p <fichier> word/document.xml`.
 * ══════════════════════════════════════════════════════════════════════════
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, LevelFormat, ShadingType,
} from "docx";
import { CGV } from "@/app/legal/content/cgv";
import { LIVRAISON } from "@/app/legal/content/livraison";
import { REMBOURSEMENT } from "@/app/legal/content/remboursement";
import { MENTIONS_LEGALES } from "@/app/legal/content/mentions-legales";
import type { LegalDoc, LocalizedDoc, Block, Para, Locale } from "@/app/legal/types";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS: Locale[] = ["fr", "pt", "en"];
const DOSSIER: Record<Locale, string> = { fr: "FR", pt: "PT", en: "EN" };

function para(p: Para, opts: { italics?: boolean; size?: number } = {}): Paragraph {
  const segs = typeof p === "string" ? [p] : p;
  return new Paragraph({
    spacing: { after: 140 },
    children: segs.map((s) =>
      typeof s === "string"
        ? new TextRun({ text: s, italics: opts.italics, size: opts.size })
        : new TextRun({ text: s.text, underline: {}, italics: opts.italics, size: opts.size }),
    ),
  });
}

const A4_LARGEUR = 11906 - 2 * 1134; // A4 moins marges de 2 cm

function tableau(columns: string[], rows: string[][]): Table {
  const n = columns.length;
  const larg = Math.floor(A4_LARGEUR / n);
  const widths = columns.map((_, i) => (i === n - 1 ? A4_LARGEUR - larg * (n - 1) : larg));
  const cell = (t: string, i: number, tete: boolean) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: tete ? { type: ShadingType.CLEAR, fill: "EDE7DD", color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: tete, size: 20 })] })],
    });
  return new Table({
    width: { size: A4_LARGEUR, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: columns.map((c, i) => cell(c, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

function blocs(b: Block): (Paragraph | Table)[] {
  switch (b.kind) {
    case "p": return [para(b.value)];
    case "h3": return [new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } })];
    case "list": return b.items.map((t) => new Paragraph({ text: t, numbering: { reference: "puces", level: 0 }, spacing: { after: 80 } }));
    case "table": return [tableau(b.columns, b.rows), new Paragraph({ spacing: { after: 120 } })];
  }
}

function document(d: LegalDoc, sections = d.sections): Document {
  const enfants: (Paragraph | Table)[] = [
    new Paragraph({ text: d.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: d.lastUpdated, italics: true })], spacing: { after: 200 } }),
    ...(d.intro ?? []).map((p) => para(p, { italics: true, size: 20 })),
  ];
  for (const s of sections) {
    enfants.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 } }));
    for (const b of s.blocks) enfants.push(...blocs(b));
  }
  return new Document({
    creator: "Bellajour (MISTÉRIO HERMÉTICO, LDA)",
    styles: {
      default: { document: { run: { font: "Georgia", size: 22 } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", run: { size: 40, bold: true, font: "Georgia" }, paragraph: { spacing: { after: 120 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Georgia" } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Georgia" } },
      ],
    },
    numbering: { config: [{ reference: "puces", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 560, hanging: 280 } } } }] }] },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: enfants,
    }],
  });
}

async function ecrire(dossier: string, nom: string, doc: Document) {
  const dir = resolve(RACINE, "legal-source", dossier);
  mkdirSync(dir, { recursive: true });
  const chemin = resolve(dir, `${nom}.docx`);
  writeFileSync(chemin, await Packer.toBuffer(doc));
  console.log("écrit", chemin.replace(RACINE + "/", ""));
}

const FICHE_TITRE: Record<Locale, string> = {
  fr: "FICHE PRODUIT — Magazine Bellajour, Offre Atelier",
  pt: "FICHA DE PRODUTO — Revista Bellajour, Oferta Atelier",
  en: "PRODUCT SHEET — Bellajour Magazine, Atelier Offer",
};
const CGV_TITRE: Record<Locale, string> = {
  fr: "CONDITIONS GÉNÉRALES DE VENTE — BELLAJOUR",
  pt: "CONDIÇÕES GERAIS DE VENDA — BELLAJOUR",
  en: "TERMS AND CONDITIONS OF SALE — BELLAJOUR",
};

/**
 * « Version 4.0 — En vigueur le 16/09/2026 » → « v4.0, 16-09-2026 ». La version
 * et la date ne se tapent pas ici : elles sont celles du texte publié. Un
 * `lastUpdated` illisible arrête le script plutôt que de nommer un fichier
 * « vundefined ».
 */
function versionEtDate(lastUpdated: string): string {
  const v = /(\d+\.\d+)/.exec(lastUpdated)?.[1];
  const d = /(\d{2})\/(\d{2})\/(\d{4})/.exec(lastUpdated);
  if (!v || !d) throw new Error(`lastUpdated illisible : « ${lastUpdated} »`);
  return `v${v}, ${d[1]}-${d[2]}-${d[3]}`;
}

async function main() {
  const voulu = process.argv[2] ?? null;
  const jeux: Array<{ dossier: string; doc: LocalizedDoc; titre?: Record<Locale, string> }> = [
    { dossier: "cgv", doc: CGV, titre: CGV_TITRE },
    { dossier: "livraison", doc: LIVRAISON },
    { dossier: "remboursement", doc: REMBOURSEMENT },
    { dossier: "mentions-legales", doc: MENTIONS_LEGALES },
  ];
  if (voulu && !jeux.some((j) => j.dossier === voulu)) {
    throw new Error(`document inconnu : ${voulu} (attendu : ${jeux.map((j) => j.dossier).join(", ")})`);
  }
  for (const jeu of jeux) {
    if (voulu && jeu.dossier !== voulu) continue;
    for (const lang of LANGS) {
      const d = jeu.doc[lang];
      if (!d) continue;
      const suffixe = versionEtDate(d.lastUpdated);
      const titre = jeu.titre?.[lang] ?? `${d.title.toUpperCase()} — BELLAJOUR`;
      await ecrire(`${jeu.dossier}/${DOSSIER[lang]}`, `${titre} (${suffixe})`, document(d));
      if (jeu.dossier === "cgv") {
        const fiche = d.sections.filter((s) => s.id === "fiche-produit");
        await ecrire(`cgv/${DOSSIER[lang]}`, `${FICHE_TITRE[lang]} (${suffixe})`, document({ ...d, title: fiche[0]?.heading ?? d.title }, fiche));
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
