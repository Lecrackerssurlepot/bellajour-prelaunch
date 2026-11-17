/**
 * Le harnais du LOT SIGNATURES (16/11, T-214) : le goût de la vitrine du 14/11 dans l'éditeur, appelé par verif-atelier.ts.
 *   1. le catalogue : onze signatures `SG-01` à `SG-11`, ids stables, doubles, sans aplat (T-209), relues par `templateParId` et la
 *      sauvegarde, tous leurs textes dans la marge de 10 mm (bords rognés et pli) ;
 *   2. les FAITS (R180) : le texte par défaut d'un cadre tiré des dates EXIF et du lieu sûr, à l'écran et à l'export, jamais stocké, vide
 *      sans date (D2) ; les gabarits d'avant gardent EXACTEMENT leurs textes par défaut ;
 *   3. le GÉANT (R181) : le corps qui remplit le cadre, une seule valeur pour l'écran, l'IDML et le PDF ; `ajusterTitre` le garde ;
 *   4. le FOND PROPOSÉ (R182) : posé à la pose si la planche n'en a pas, jamais par-dessus une couleur choisie, Annuler le retire ;
 *   5. le RANG (R183) : devant quand la signature convient aux photos, derrière sinon, jamais retirée ; une empreinte du classement ;
 *   6. l'OMBRE DOUCE (R184) : l'élément exact de l'essai du 29/10 dans l'IDML, des couches en produit dans le PDF, l'écran ;
 *      un magazine sans ombre ne change pas d'un octet ;
 *   7. la sauvegarde des cadres retouchés (`geant`, `fait`, `ombre`), relus exactement ;
 *   8. les FINITIONS du 16/11 : le géant vide montre un repère discret, jamais « TITRE » géant (R186) ; un texte ne se coupe plus à l'écran et
 *      celui que son cadre ne tient pas est marqué et dit avant l'export (R187).
 * Sans base, sans réseau, sans écriture.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, PDFRawStream, decodePDFRawStream, PDFArray } from "pdf-lib";
import * as O from "@/lib/mise-en-page/editeur";
import type { PhotoMaq } from "@/lib/mise-en-page/editeur";
import { TEMPLATES_DESSINES, cadresDe, nouveauMagazine, templateParId, type Disposition, type Magazine, type Planche } from "@/lib/mise-en-page/magazine";
import { cadreValide, contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { ecrirePdf, planPdf, OMBRE_COUCHES } from "@/lib/mise-en-page/pdf";
import { construireIdml, ombreXml, type PhotoExport } from "@/lib/mise-en-page/idml";
import { MARGE_TEXTE, OMBRE_DOUCE, TEMPLATES_SIGNATURES, convientSignature, fondPropose } from "@/lib/mise-en-page/signatures";
import { FAITS_DE_PHOTO, periodeDe, texteDeFait } from "@/lib/mise-en-page/editeur/faits";
import { corpsAffiche, largeurArialGras } from "@/lib/mise-en-page/editeur/lieuxTextes";
import { lieuCourt } from "@/lib/mise-en-page/editeur/moments";
import { REGLAGES_GEANT, REGLAGES_TITRE, ajusterTitre, corpsGeant, grossirSansStyle, placeDuTexte, styleDePaire, texteStyle } from "@/lib/mise-en-page/style";
import { PAGE_H, PAGE_L, PLANCHE_L, PT_PAR_MM } from "@/lib/mise-en-page/geometrie";
import { SORTES_FAIT, type Template } from "@/lib/mise-en-page/types";
import { AVANCE_SIGNATURES, BONUS_ORIGINE, MALUS_SIGNATURE_HORS } from "@/lib/mise-en-page/editeur/outils";

type Rapporter = (nom: string, reussi: boolean) => void;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const NB = " ";
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };

/* ─────────────────────────── les fixtures : une journée à Madère ─────────────────────────── */

const DATES = [
  "2026-08-21T20:27:05", "2026-08-22T12:04:48", "2026-08-22T12:02:18", "2026-08-22T12:03:47", "2026-08-22T12:12:14", "2026-08-22T12:33:32",
  "2026-08-22T12:37:32", "2026-08-22T12:45:29", "2026-08-22T13:21:43", "2026-08-22T19:06:30", "2026-08-22T20:18:30", "2026-08-30T11:15:06",
  "2026-08-22T18:51:46",
];
const maq = (id: string, date: string | null, o: Partial<PhotoMaq> = {}): PhotoMaq => ({
  id, nom: `${id}.jpg`, l: 3000, h: 4000, date, personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null, ...o,
});
const IDS = DATES.map((_, i) => `p${i + 1}`);
const CATALOGUE: Map<string, PhotoMaq> = new Map(IDS.map((id, i) => [id, maq(id, DATES[i], i === 0 ? { lieuIA: "Aéroport de Madère" } : { ville: "Funchal", pays: "Portugal" })]));
const SANS_DATE: Map<string, PhotoMaq> = new Map(IDS.map((id) => [id, maq(id, null)]));
const PHOTOS_EXPORT: Map<string, PhotoExport> = new Map(IDS.map((id) => [id, { id, nomLien: `${id}.jpg`, l: 3000, h: 4000 }]));

const lib = { titre: "Titre", texte: "Texte", legende: "Légende" } as const;
function dispo(t: Template, ids: string[], ecrits: Record<number, string> = {}): Disposition {
  const ct = t.cadres.filter((c) => c.role !== "photo");
  return {
    templateId: t.id, photos: ids.slice(0, t.nbPhotos).map((p) => ({ photoId: p, recadrage: { zoom: 1, dx: 0, dy: 0 } })),
    textes: ct.map((c, i) => ({ contenu: ecrits[i] ?? lib[c.role as keyof typeof lib], taille: c.taille ?? 10, gras: c.gras ?? false })),
  };
}
const planche = (id: string, d: Disposition, fond?: Planche["fond"]): Planche => ({ id, mode: "double", double: d, gauche: null, droite: null, ...(fond ? { fond } : {}) });
function magazineDe(planches: Planche[], style = true): Magazine {
  const m = nouveauMagazine("sig", "Madère", "2026-11-16T10:00:00.000Z");
  const s = styleDePaire("T-01");
  return { ...m, planches: [m.planches[0], ...planches, m.planches[m.planches.length - 1]], ...(style && s ? { style: s } : {}) };
}
const sg = (id: string): Template => templateParId(id)!;

/** Les textes des stories de l'IDML et leur corps (PointSize de la plage, sinon celui du style de paragraphe). */
function storiesDe(idml: ReturnType<typeof construireIdml>): string {
  return idml.filter((x) => x.chemin.startsWith("Stories/")).map((x) => x.contenu).join("\n");
}
function spreadsDe(idml: ReturnType<typeof construireIdml>): string {
  return idml.filter((x) => x.chemin.startsWith("Spreads/")).map((x) => x.contenu).join("\n");
}
async function fluxPdf(octets: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(octets);
  return doc.getPages().map((p) => {
    const c = p.node.Contents();
    const fl = c instanceof PDFArray ? c.asArray() : c ? [c] : [];
    return fl.map((f) => { const s = doc.context.lookup(f); return s instanceof PDFRawStream ? new TextDecoder("latin1").decode(decodePDFRawStream(s).decode()) : ""; }).join("\n");
  }).join("\n====\n");
}

/* ─────────────────────────── le harnais ─────────────────────────── */

export async function verifierMepSignatures(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot Signatures (16/11, T-214) : les doubles de la vitrine, les faits, le géant, le fond proposé, l'ombre douce —");

  /* ── 1. le catalogue ── */
  const ids = TEMPLATES_SIGNATURES.map((t) => t.id);
  ok(`catalogue : ${ids.length} signatures aux ids stables SG-01 à SG-11, uniques, toutes des DOUBLES d'origine « signature », relues par templateParId, sans aplat (T-209 : le fond est une couleur libre)`,
    ids.length === 11 && ids.every((id, i) => id === `SG-${String(i + 1).padStart(2, "0")}`) && new Set(ids).size === ids.length
      && TEMPLATES_SIGNATURES.every((t) => t.portee === "double" && t.origine === "signature" && templateParId(t.id) === t && !t.decor?.length));
  ok("catalogue : les signatures sont des gabarits DESSINÉS, à la SUITE de l'annexe et des épingles (l'ordre de `candidats` et le premier choix de `poser` ne changent pas)",
    TEMPLATES_SIGNATURES.every((t) => TEMPLATES_DESSINES.includes(t)) && TEMPLATES_DESSINES.slice(-TEMPLATES_SIGNATURES.length).every((t, i) => t === TEMPLATES_SIGNATURES[i]));
  const fautesMarge: string[] = [];
  for (const t of TEMPLATES_SIGNATURES) for (const c of t.cadres) {
    if (c.role === "photo") continue;
    const dedans = c.x >= MARGE_TEXTE - 1e-9 && c.y >= MARGE_TEXTE - 1e-9 && c.x + c.l <= PLANCHE_L - MARGE_TEXTE + 1e-9 && c.y + c.h <= PAGE_H - MARGE_TEXTE + 1e-9;
    const pli = c.x < PAGE_L + MARGE_TEXTE && c.x + c.l > PAGE_L - MARGE_TEXTE;
    if (!dedans || pli) fautesMarge.push(`${t.id} ${c.role} ${c.x},${c.y}`);
  }
  ok(`catalogue : chaque texte des signatures tient à 10 mm des bords rognés et du pli (la règle de la vitrine) : ${fautesMarge.length ? fautesMarge.join(" ; ") : "aucune faute"}`, fautesMarge.length === 0);
  const tousValides = TEMPLATES_SIGNATURES.every((t) => contenuValide(magazineDe([planche("pl-2", dispo(t, IDS))])) && contenuValide(magazineDe([planche("pl-2", dispo(t, IDS))], false)));
  ok("catalogue : un magazine qui pose chaque signature (avec et sans style) passe la sauvegarde ; chaque géant est un titre, chaque fait une sorte connue",
    tousValides && TEMPLATES_SIGNATURES.every((t) => t.cadres.every((c) => (!c.geant || c.role === "titre") && (!c.fait || (SORTES_FAIT as readonly string[]).includes(c.fait)) && (!c.ombre || c.role === "photo"))));

  /* ── 2. les faits (R180) ── */
  const pf = (d: string | null, lieu?: string) => ({ date: d, lieu: lieu ?? null });
  ok(`faits : le jour « 21 », la date courte « 22.08 », la date longue « 22${NB}août${NB}2026 », l'heure « 12${NB}h${NB}04 » (insécables : un géant ne se coupe qu'aux vraies espaces)`,
    texteDeFait("jour", null, [pf("2026-08-22T12:04:48"), pf("2026-08-21T20:27:05")], [], null) === "21"
      && texteDeFait("dateCourte", null, [pf("2026-08-22T12:04:48")], [], null) === "22.08"
      && texteDeFait("dateLongue", null, [pf("2026-08-01T12:04:48")], [], null) === `1er${NB}août${NB}2026`
      && texteDeFait("heure", pf("2026-08-22T12:04:48"), [], [], null) === `12${NB}h${NB}04`);
  ok("faits : le repère (mois, lieu sûr, heure), le lieu daté, le jour et l'heure, la date et l'heure ; sans lieu, la ligne se passe de lui",
    texteDeFait("repere", pf("2026-08-21T20:27:05", "Aéroport de Madère"), [], [], null) === `Août${NB}2026${NB}· Aéroport de Madère${NB}· 20${NB}h${NB}27`
      && texteDeFait("repere", pf("2026-08-21T20:27:05"), [], [], null) === `Août${NB}2026${NB}· 20${NB}h${NB}27`
      && texteDeFait("lieuDateHeure", pf("2026-08-24T12:31:45", "Sentier du Pico Ruivo"), [], [], null) === `Sentier du Pico Ruivo${NB}· 24${NB}août${NB}2026${NB}· 12${NB}h${NB}31`
      && texteDeFait("jourHeure", pf("2026-08-27T19:48:55"), [], [], null) === `27${NB}août${NB}· 19${NB}h${NB}48`
      && texteDeFait("dateHeure", pf("2026-08-22T12:04"), [], [], null) === `22${NB}août${NB}2026${NB}· 12${NB}h${NB}04`
      && texteDeFait("dateHeure", pf("2026-08-22"), [], [], null) === `22${NB}août${NB}2026`);
  ok("faits : la période du dossier (« Du 21 au 30 août 2026 », à cheval sur deux mois, deux années, un seul jour) ; les photos signalées n'y comptent pas",
    periodeDe(["2026-08-30T10:00", "2026-08-21T09:00", null]) === `Du 21 au 30${NB}août${NB}2026` && periodeDe(["2026-08-30", "2026-09-02"]) === `Du 30${NB}août au 2${NB}septembre${NB}2026`
      && periodeDe(["2025-12-30", "2026-01-02"]) === `Du 30${NB}décembre${NB}2025 au 2${NB}janvier${NB}2026` && periodeDe(["2026-08-22T10:00", "2026-08-22T12:00"]) === `22${NB}août${NB}2026`
      && texteDeFait("periode", null, [], [pf("2026-08-21"), { date: "2026-07-01", signalee: true }, pf("2026-08-30")], null) === `Du 21 au 30${NB}août${NB}2026`);
  ok("faits : jamais inventés : sans date, aucun fait (null), ni pour la photo ni pour la page ; le lieu de la page vient de l'appelant",
    SORTES_FAIT.filter((s) => s !== "lieu" && s !== "periode").every((s) => texteDeFait(s, pf(null), [pf(null)], [], "X") === null) && periodeDe([null]) === null
      && texteDeFait("lieu", null, [], [], "Funchal") === "Funchal" && texteDeFait("lieu", null, [], [], null) === null);
  {
    /* la planche du jour : la date et l'heure de la grande photo, puis l'heure de CHAQUE vignette dans l'ordre des cadres */
    const t = sg("SG-03");
    const d = dispo(t, IDS.slice(1, 11));
    const defauts = O.lieuxParDefaut(d, "double", CATALOGUE);
    const heures = DATES.slice(2, 11).map((x) => `${Number(x.slice(11, 13))}${NB}h${NB}${x.slice(14, 16)}`);
    ok(`faits sur la planche : le géant prend le lieu de la page (« Funchal »), la ligne la date et l'heure de la grande photo, chaque vignette SON heure (${defauts.slice(2).map((x) => x?.replace(/ /g, " ")).join(", ")})`,
      defauts[0] === "Funchal" && defauts[1] === `22${NB}août${NB}2026${NB}· 12${NB}h${NB}04` && defauts.slice(2).every((x, i) => x === heures[i]));
    const sansDate = O.lieuxParDefaut(d, "double", SANS_DATE);
    ok("faits sans date : tous les cadres à fait restent sans texte par défaut (l'écran montre le libellé, l'export les vide : D2)",
      sansDate.slice(1).every((x) => x === null));
    /* l'export : le fait remplace le libellé, un cadre sans fait est vidé, rien n'est écrit dans le magazine */
    const m = magazineDe([planche("pl-2", d)]);
    const pret = O.avecLieuxParDefaut(m, CATALOGUE);
    const tx = pret.planches[1].double!.textes;
    const vide = O.avecLieuxParDefaut(magazineDe([planche("pl-2", d)]), SANS_DATE).planches[1].double!.textes;
    ok("faits à l'export : les textes non écrits portent leur fait, rien n'est stocké (le magazine reçu garde ses libellés), sans date les cadres à fait sont vides",
      tx[1].contenu === defauts[1] && tx[5].contenu === defauts[5] && m.planches[1].double!.textes[1].contenu === "Légende" && vide.slice(1).every((x) => x.contenu === ""));
    const spreads = spreadsDe(construireIdml(O.avecLieuxParDefaut(magazineDe([planche("pl-2", d)]), SANS_DATE), PHOTOS_EXPORT, { liens: { mode: "relatif" } }));
    ok("faits à l'export, sans date ni lieu : l'IDML n'écrit aucun des onze cadres de texte (vides : D2), les dix photos partent", (spreads.match(/<TextFrame /g) ?? []).length === 0 && (spreads.match(/ContentType="GraphicType"/g) ?? []).length === 10);
  }
  {
    /* les gabarits d'avant : le même texte par défaut qu'avant le lot, cadre pour cadre (l'algorithme d'avant, recopié ici) */
    const avant = (d: Disposition, cible: "double" | "gauche" | "droite"): (string | null)[] => {
      const lieux = d.photos.map((a) => { const p = a.photoId ? CATALOGUE.get(a.photoId) : undefined; return p ? O.lieuDeTexte(p) : null; });
      const compte = new Map<string, number>();
      for (const l of lieux) if (l) compte.set(l, (compte.get(l) ?? 0) + 1);
      let principal: string | null = null;
      for (const l of lieux) if (l && (principal === null || (compte.get(l) ?? 0) > (compte.get(principal) ?? 0))) principal = l;
      const roles = cadresDe(d, cible).filter((c) => c.role !== "photo").map((c) => c.role);
      const avecTitre = roles.includes("titre");
      let k = 0, titreVu = false, legendeVue = false;
      return roles.map((r) => {
        if (r === "titre") { if (titreVu) return null; titreVu = true; return principal; }
        if (r === "legende") { const l = lieux[k++] ?? null; const premiere = !legendeVue; legendeVue = true; if (l && l !== principal) return l; return !avecTitre && premiere ? principal : null; }
        return null;
      });
    };
    let n = 0, fautes = 0;
    for (const t of TEMPLATES_DESSINES.filter((x) => x.origine !== "signature")) {
      for (const decale of [0, 1, 5]) {
        const ids2 = IDS.map((_, i) => IDS[(i + decale) % IDS.length]);
        const d = dispo(t, ids2);
        const cibles = t.portee === "double" ? ["double" as const] : ["gauche" as const, "droite" as const];
        for (const c of cibles) { n++; if (JSON.stringify(O.lieuxParDefaut(d, c, CATALOGUE)) !== JSON.stringify(avant(d, c))) fautes++; }
      }
    }
    ok(`faits : tous les gabarits d'avant (annexe, épingles) gardent EXACTEMENT leurs textes par défaut (${n} dispositions, ${fautes} écart(s))`, fautes === 0 && n > 150);
    void lieuCourt;
  }

  /* ── 3. le géant (R181) ── */
  const style = styleDePaire("T-01")!;
  {
    const c = sg("SG-01").cadres.find((x) => x.geant)!;
    const corps = corpsGeant("21", { role: "titre", l: c.l, h: c.h }, style, largeurArialGras);
    const ts = texteStyle(style, "titre", corps)!;
    const garde = ajusterTitre("21", ts, c);
    const plus = texteStyle(style, "titre", corps + REGLAGES_GEANT.PAS)!;
    ok(`géant : « 21 » dans le cadre du chiffre du jour prend ${corps} pt (Bodoni Moda), le plus grand corps qui tient au demi-point ; ajusterTitre le garde tel quel à l'export`,
      corps > 300 && corps <= REGLAGES_GEANT.CORPS_MAX && garde.corps === corps && !garde.trop && ajusterTitre("21", plus, c).corps < corps + REGLAGES_GEANT.PAS);
    const long = corpsGeant("Les montagnes de Madère", { role: "titre", l: c.l, h: c.h }, style, largeurArialGras);
    const sans = corpsGeant("21", { role: "titre", l: c.l, h: c.h }, null, largeurArialGras);
    ok(`géant : un texte plus long prend un corps plus petit (${long} pt) ; sans style, les chasses d'Arial Bold, le mot dans 96 % de la largeur (${sans} pt) ; jamais au-dessus de ${REGLAGES_GEANT.CORPS_MAX} pt`,
      long < corps && long >= REGLAGES_TITRE.CORPS_MIN && (largeurArialGras("21") * sans) / PT_PAR_MM <= c.l * REGLAGES_TITRE.REMPLISSAGE + 1e-6
        && corpsGeant("1", { role: "titre", l: 400, h: 290 }, style, largeurArialGras) === REGLAGES_GEANT.CORPS_MAX && corpsAffiche({ ...c, geant: undefined }, "21", style) === null);
    /* une seule valeur : l'écran (cadresPlanche), le magazine prêt à l'export, l'IDML, le PDF */
    const m = magazineDe([planche("pl-2", dispo(sg("SG-01"), IDS, { 0: "La mer et les montagnes, l'eau bleue." }))]);
    const e = O.creerEtat({ magazine: m, catalogue: CATALOGUE });
    const ecran = O.cadresPlanche(e, "pl-2").find((x) => x.role === "titre");
    const pret = O.avecLieuxParDefaut(m, CATALOGUE);
    const exporte = pret.planches[1].double!.textes[2];
    const stories = storiesDe(construireIdml(pret, PHOTOS_EXPORT, { liens: { mode: "relatif" } }));
    const plan = planPdf(pret).flatMap((pg) => pg.objets).find((o) => o.type === "texte" && o.contenu === "21");
    ok(`géant : UNE valeur partout : l'écran montre « 21 » à ${ecran && "taille" in ecran ? ecran.taille : "?"} pt, l'export écrit ${exporte.taille} pt, l'IDML PointSize="${corps}", le PDF ${plan && plan.type === "texte" ? plan.style?.corps : "?"} pt`,
      !!ecran && "style" in ecran && ecran.taille === corps && ecran.style?.corps === corps && exporte.contenu === "21" && exporte.taille === corps
        && stories.includes(`PointSize="${corps}"`) && !!plan && plan.type === "texte" && plan.style?.corps === corps);
    ok("géant : rien n'est stocké (le texte du magazine garde son corps de départ et son libellé)", m.planches[1].double!.textes[2].taille === 200 && m.planches[1].double!.textes[2].contenu === "Titre");
  }

  /* ── 4. le fond proposé (R182) ── */
  {
    const base = magazineDe([planche("pl-2", dispo(sg("SG-05"), IDS))]);
    const e0 = O.creerEtat({ magazine: base, catalogue: CATALOGUE });
    const pose = O.appliquer(e0, { type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: "SG-08" } as O.Geste);
    const p = pose.magazine.planches[1];
    ok("fond proposé : « Les mots sur l'aplat » posé sur une double SANS fond lui donne son fond (le sourd des photos, à droite), en UNE entrée d'historique ; Annuler retire la pose ET le fond",
      p.double?.templateId === "SG-08" && JSON.stringify(p.fond) === JSON.stringify({ droite: "aplatSourd" }) && pose.historique.passe.length === 1
        && O.appliquer(pose, { type: "annuler" } as O.Geste).magazine === base && contenuValide(pose.magazine) && O.verifierInvariants(pose, e0, { type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: "SG-08" } as O.Geste).length === 0);
    const colore = magazineDe([planche("pl-2", dispo(sg("SG-05"), IDS), { gauche: "#ca7749", droite: "#ca7749" })]);
    const garde = O.appliquer(O.creerEtat({ magazine: colore, catalogue: CATALOGUE }), { type: "choisirGabarit", plancheId: "pl-2", cible: "double", templateId: "SG-08" } as O.Geste);
    ok("fond proposé : jamais par-dessus une couleur choisie : une double déjà colorée garde SON fond", JSON.stringify(garde.magazine.planches[1].fond) === JSON.stringify({ gauche: "#ca7749", droite: "#ca7749" }));
    const retire = O.appliquer(pose, { type: "colorerFond", plancheId: "pl-2", cible: "double", couleur: null } as O.Geste);
    const recompose = O.composer(retire.magazine, "pl-2", "double", ["p2", "p1"], CATALOGUE, { templateId: "SG-08" }).magazine;
    ok("fond proposé : ensuite c'est une couleur libre comme une autre : retirée, elle ne revient pas tant que la signature reste posée (photos échangées, même gabarit)",
      !("fond" in retire.magazine.planches[1]) && recompose.planches[1].double?.templateId === "SG-08" && !("fond" in recompose.planches[1]));
    ok("fond proposé : un miroir échange les côtés ; une page reçoit le côté proposé ; un gabarit sans fond n'en propose aucun",
      JSON.stringify(fondPropose(sg("SG-08"), "double", true)) === JSON.stringify({ gauche: "aplatSourd" }) && JSON.stringify(fondPropose(sg("SG-08"), "gauche")) === JSON.stringify({ gauche: "aplatSourd" })
        && fondPropose(sg("SG-01"), "double") === null && JSON.stringify(fondPropose(sg("SG-09"), "double")) === JSON.stringify({ gauche: "accent", droite: "accent" }));
  }

  /* ── 5. le rang (R183) ── */
  {
    const avecDates = (n: number, jour = "2026-08-22") => Array.from({ length: n }, (_, i) => ({ id: `q${i}`, nom: `q${i}`, l: 3000, h: 4000, date: `${jour}T1${i % 10}:00:00` }));
    const sansDates = (n: number) => avecDates(n).map((p) => ({ ...p, date: null }));
    const deuxJours = (n: number) => avecDates(n).map((p, i) => ({ ...p, date: `2026-08-2${2 + (i % 2)}T10:00:00` }));
    ok("rang : une signature CONVIENT quand ses faits ont une date, quand sa journée est une seule journée, quand son miroir est fait de deux jours",
      convientSignature(sg("SG-01"), avecDates(1)) && !convientSignature(sg("SG-01"), sansDates(1)) && convientSignature(sg("SG-09"), sansDates(5))
        && convientSignature(sg("SG-03"), avecDates(10)) && !convientSignature(sg("SG-03"), deuxJours(10)) && convientSignature(sg("SG-11"), deuxJours(3))
        && !convientSignature(sg("SG-11"), avecDates(3)) && convientSignature(templateParId("E-D1")!, sansDates(2)));
    const date1 = O.gabaritsClasses("double", avecDates(1), null);
    const nu1 = O.gabaritsClasses("double", sansDates(1), null);
    ok(`rang : une photo datée en portrait sur une double : une signature EN TÊTE (${date1[0]?.template.id}) ; sans date, elle passe derrière les autres dessinés (${nu1[0]?.template.id} en tête) mais reste au tiroir`,
      date1[0]?.template.origine === "signature" && nu1[0]?.template.origine !== "signature" && nu1.some((x) => x.template.id === "SG-01"));
    const jour10 = O.gabaritsClasses("double", avecDates(10), null);
    const deux10 = O.gabaritsClasses("double", deuxJours(10), null);
    ok(`rang : dix photos d'une même journée : « La planche du jour » en tête (${jour10[0]?.template.id}) ; sur deux jours, plus en tête (${deux10[0]?.template.id})`,
      jour10[0]?.template.id === "SG-03" && deux10[0]?.template.id !== "SG-03" && deux10.some((x) => x.template.id === "SG-03"));
    ok("rang : les réglages nommés : l'avance des signatures sur les dessinés, et le malus qui la leur retire avec celle des dessinés quand elles ne conviennent pas",
      AVANCE_SIGNATURES > 0 && Math.abs(BONUS_ORIGINE.double.signature - BONUS_ORIGINE.double.epingle - AVANCE_SIGNATURES) < 1e-12 && MALUS_SIGNATURE_HORS > BONUS_ORIGINE.double.signature);
    const lots = [avecDates(1), avecDates(2), deuxJours(3), avecDates(5), avecDates(10), avecDates(12), sansDates(2)];
    const lecture = lots.map((l) => O.gabaritsClasses("double", l, null).slice(0, 12).map((x) => `${x.template.id}:${Math.round(x.note * 1e6)}`).join("|")).join("#");
    const empreinte = fnv(lecture);
    console.log(`      empreinte des classements avec signatures (7 lots datés) : ${empreinte}`);
    ok(`rang : déterministe, deux lectures identiques ; empreinte des sept lots relevée le 16/11 (${EMPREINTE_SIGNATURES})`, lecture === lots.map((l) => O.gabaritsClasses("double", l, null).slice(0, 12).map((x) => `${x.template.id}:${Math.round(x.note * 1e6)}`).join("|")).join("#") && empreinte === EMPREINTE_SIGNATURES);
  }

  /* ── 6. l'ombre douce (R184) ── */
  {
    const m = magazineDe([planche("pl-2", dispo(sg("SG-09"), IDS), { gauche: "accent", droite: "accent" })]);
    const spreads = spreadsDe(construireIdml(m, PHOTOS_EXPORT, { liens: { mode: "relatif" } }));
    const attendu = `<TransparencySetting><DropShadowSetting Mode="Drop" BlendMode="Multiply" Opacity="35" Size="14.1732" XOffset="0" YOffset="5.6693" EffectColor="Color/Black"/></TransparencySetting>`;
    const n = spreads.split(attendu).length - 1;
    ok(`ombre : l'IDML écrit l'élément de l'essai du 29/10 (« photo avec ombre portée ») mot pour mot, nos valeurs (35 %, 5 mm de flou, 2 mm sous le tirage), après la géométrie et avant le cadrage : ${n} tirages sur 5`,
      n === 5 && ombreXml(sg("SG-09").cadres[0]) === attendu && /<\/PathGeometry><\/Properties><TransparencySetting>/.test(spreads) && /<\/TransparencySetting><FrameFittingOption /.test(spreads));
    const sans = magazineDe([planche("pl-2", dispo(sg("SG-07"), IDS))]);
    ok("ombre : un cadre sans ombre n'écrit rien (aucun TransparencySetting) : les IDML d'avant restent identiques (empreintes au harnais)",
      !spreadsDe(construireIdml(sans, PHOTOS_EXPORT, { liens: { mode: "relatif" } })).includes("TransparencySetting") && ombreXml(sg("SG-07").cadres[0]) === "");
    const flux = await fluxPdf((await ecrirePdf(planPdf(m), new Map(), "Madère")).octets);
    const fluxSans = await fluxPdf((await ecrirePdf(planPdf(sans), new Map(), "Madère")).octets);
    const gs = (flux.match(/\/GS-\d+ gs|\/[A-Za-z0-9-]+ gs/g) ?? []).length;
    ok(`ombre : le PDF pose ${OMBRE_COUCHES} couches noires en produit sous chaque tirage (${gs} réglages d'opacité dans le flux), aucune sans ombre`,
      gs >= 5 * OMBRE_COUCHES && !/ gs/.test(fluxSans));
    const e = O.creerEtat({ magazine: m, catalogue: CATALOGUE });
    const ecran = O.cadresPlanche(e, "pl-2").filter((x) => x.role === "photo");
    ok("ombre : l'écran la reçoit sur les cinq tirages (cadresPlanche), les mêmes réglages nommés (OMBRE_DOUCE) pour l'écran, le PDF et l'IDML",
      ecran.length === 5 && ecran.every((x) => x.role === "photo" && x.ombre) && OMBRE_DOUCE.opacite > 0 && OMBRE_DOUCE.flou > 0);
  }

  /* ── 7. la sauvegarde des cadres retouchés ── */
  {
    const c = { x: 10, y: 10, l: 50, h: 20, role: "titre" };
    ok("sauvegarde : un cadre retouché garde `geant`, `fait` et `ombre` (un titre géant, un fait connu, une photo ombrée)",
      cadreValide({ ...c, geant: true, fait: "jour" }) && cadreValide({ ...c, role: "legende", fait: "periode" }) && cadreValide({ ...c, role: "photo", ombre: true }));
    ok("sauvegarde : refusés : `geant` sur une photo ou à false, un fait inconnu ou sur une photo, une ombre sur un texte",
      !cadreValide({ ...c, role: "photo", geant: true }) && !cadreValide({ ...c, geant: false }) && !cadreValide({ ...c, fait: "anniversaire" })
        && !cadreValide({ ...c, role: "photo", fait: "jour" }) && !cadreValide({ ...c, ombre: true }) && !cadreValide({ ...c, role: "photo", ombre: 1 }));
    const m = magazineDe([planche("pl-2", { ...dispo(sg("SG-09"), IDS), cadres: clone(sg("SG-09").cadres) })]);
    ok("sauvegarde : une signature retouchée à la main (ses cadres copiés dans la disposition) passe, ombres comprises", contenuValide(m) && contenuValide(clone(m)));
    void FAITS_DE_PHOTO;
  }

  /* ── 8. les finitions du 16/11 (R186, R187) ── */
  {
    const lire = (f: string): string => readFileSync(resolve(process.cwd(), f), "utf8");
    const scene = lire("src/app/admin/atelier/mise-en-page/[id]/Scene.tsx");
    const css = lire("src/app/admin/atelier/mise-en-page/mise-en-page.css");
    const exF = lire("src/app/admin/atelier/mise-en-page/[id]/ExportFeuille.tsx");

    /* R186 : le géant vide */
    /* des photos datées dont on ne connaît pas le lieu (la recette du 16/11 : sans base, aucun lieu) ; avec un lieu, le géant le prend (D2) */
    const SANS_LIEU: Map<string, PhotoMaq> = new Map(IDS.map((id, i) => [id, maq(id, DATES[i])]));
    const m = magazineDe([planche("pl-2", dispo(sg("SG-08"), IDS))]);
    const e = O.creerEtat({ magazine: m, catalogue: SANS_LIEU });
    const textes = O.cadresPlanche(e, "pl-2").filter((x): x is O.CadreTexte => x.role !== "photo");
    const geant = textes.find((x) => x.geant);
    const avecLieu = O.cadresPlanche(O.creerEtat({ magazine: m, catalogue: CATALOGUE }), "pl-2").find((x): x is O.CadreTexte => x.role !== "photo" && x.geant);
    ok(`R186 : le cadre géant de SG-08 sans texte ni lieu est un repère (geant, vide, sans défaut) ; les deux légendes à fait ne le sont pas ; avec un lieu connu, le géant le montre (« ${avecLieu?.parDefaut ?? "?"} »)`,
      !!geant && geant.vide && geant.parDefaut === null && textes.filter((x) => !x.geant).length === 2 && textes.filter((x) => !x.geant).every((x) => x.parDefaut !== null)
        && !!avecLieu && avecLieu.parDefaut !== null);
    ok(`R186 : l'écran montre « ${O.REPERE_GEANT} » sur une pastille (classe ed-txt--geant-vide, sa règle CSS), jamais le libellé « Titre » au corps du géant`,
      O.REPERE_GEANT === "Mot géant" && /const repereGeant = f\.geant && libelle && !f\.parDefaut;/.test(scene) && /ed-txt ed-txt--geant-vide/.test(scene)
        && /<span>\{REPERE_GEANT\}<\/span>/.test(scene) && /\.ed-txt--geant-vide > span \{[^}]*background:/.test(css));
    const pret = O.avecLieuxParDefaut(m, SANS_LIEU);
    const plan = planPdf(pret).flatMap((pg) => pg.objets).filter((o) => o.type === "texte");
    const stories = storiesDe(construireIdml(pret, PHOTOS_EXPORT, { liens: { mode: "relatif" } }));
    ok("R186 : à l'export, le géant vide ne part pas (D2) : ni « Titre » ni « Mot géant » dans le PDF ni dans l'IDML, les deux faits partent",
      plan.length === 2 && plan.every((o) => o.type === "texte" && !/Titre|Mot géant/.test(o.contenu)) && !/Mot géant|>Titre</.test(stories));

    /* R187 : un texte ne se coupe pas */
    const style = styleDePaire("T-01")!;
    const ts = texteStyle(style, "legende", 7)!;
    const petit = { l: 52, h: 4.5 };
    const court = placeDuTexte("16 h 58", ts, petit);
    const boite = (g: number): number => g * ts.corps * ts.interligne;
    ok(`R187 : « 16 h 58 » tient dans le cadre de 4,5 mm sous la vignette ; l'écran peut le grossir ×${court ? court.grossir.toFixed(2) : "?"} sans que sa ligne dépasse le cadre (avant : 9 px coupaient la ligne au milieu des lettres)`,
      !!court && court.tient && court.grossir >= 1 && boite(court.grossir) <= petit.h * PT_PAR_MM + 1e-6);
    const longue = "Les piscines naturelles de Porto Moniz, au bout de l'île, à marée haute";
    const trop = placeDuTexte(longue, ts, petit);
    ok("R187 : une légende longue ne tient pas dans ce cadre (deux lignes au moins) : elle n'y est pas rapetissée (R-T-18, le corps légende reste)",
      !!trop && !trop.tient && trop.grossir === 1 && placeDuTexte(longue, ts, { l: 52, h: 30 })?.tient === true);
    const avec = magazineDe([planche("pl-2", dispo(sg("SG-08"), IDS, { 1: longue }))]);
    const eL = O.creerEtat({ magazine: avec, catalogue: CATALOGUE });
    const av = O.avertissementsExport(eL);
    const leg = O.cadresPlanche(eL, "pl-2").filter((x): x is O.CadreTexte => x.role === "legende");
    ok(`R187 : avant l'export, « Légende trop longue · planche 2 » (${av.textesTropLongs.length} texte) ; l'écran la marque (tient = faux) ; la date à côté tient`,
      av.textesTropLongs.length === 1 && av.textesTropLongs[0].role === "legende" && av.textesTropLongs[0].numero === 2 && av.textesTropLongs[0].texte === longue
        && leg.length === 2 && leg[0].tient && !leg[1].tient && /ed-txt--trop/.test(scene) && /\.ed-txt--trop \{/.test(css)
        && /"Légende trop longue" : "Texte trop long"\} · planche \{z\.numero\}/.test(exF) && /av\.textesTropLongs\.length/.test(exF));
    const sansStyle = O.avertissementsExport(O.creerEtat({ magazine: magazineDe([planche("pl-2", dispo(sg("SG-08"), IDS, { 1: longue }))], false), catalogue: CATALOGUE }));
    const libelleSeul = O.avertissementsExport(O.creerEtat({ magazine: magazineDe([planche("pl-2", dispo(sg("SG-08"), IDS))]), catalogue: SANS_DATE }));
    ok("R187 : rien à dire pour les faits qui tiennent, pour un libellé qui ne part pas (photos sans date), ni sans style (comme les titres)",
      av.titresTropLongs.length === 0 && O.avertissementsExport(e).textesTropLongs.length === 0 && sansStyle.textesTropLongs.length === 0 && libelleSeul.textesTropLongs.length === 0);
    const g = grossirSansStyle("16 h 58", 7, O.REGLAGES_TEXTE_ECRAN.INTERLIGNE_SANS_STYLE, petit, largeurArialGras);
    ok(`R187 : sans style aussi, l'écran grossit au plus ×${g.toFixed(2)} (chasses d'Arial Bold, interligne de l'écran) : la ligne reste dans son cadre`,
      g >= 1 && g * 7 * O.REGLAGES_TEXTE_ECRAN.INTERLIGNE_SANS_STYLE <= petit.h * PT_PAR_MM + 1e-6 && grossirSansStyle("", 7, 1.15, petit, largeurArialGras) === 1);
    ok("R187 : l'écran lit le plancher nommé et le grossissement mesuré (plus aucun « max(9px, … ) » dans Scene.tsx), et ne descend jamais sous le corps vrai",
      !/max\(9px/.test(scene) && /REGLAGES_TEXTE_ECRAN\.PLANCHER_PX/.test(scene) && /max\(\$\{vrai\}cqw, min\(/.test(scene) && /\$\{vrai \* f\.grossir\}cqw/.test(scene));
  }
}

/** L'empreinte du classement des doubles AVEC les signatures, sept lots datés (relevée le 16/11). Un changement de note ou d'ordre la change. */
const EMPREINTE_SIGNATURES = "0247b0a0";
