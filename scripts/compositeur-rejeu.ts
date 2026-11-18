/**
 * LE REJEU DU COMPOSITEUR (C20, 18/11/2026) : la preuve de fidélité du portage TypeScript (`src/lib/mise-en-page/compositeur/`) au
 * compositeur Python du banc (`decider.py` + `poser/pose.ts`, passe 10).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/compositeur-rejeu.ts <dossier du banc> <projet> <dossier de sortie> [<passe de référence>]
 *
 *   <dossier du banc>      design-explorations/tunnel-2026-11-17 (lu seulement)
 *   <projet>               le sous-dossier de sorties/ du projet de test (passe-1/*.json, compo/passe-10/…)
 *   <dossier de sortie>    HORS GIT : rejeu.json, comparaison.md, et pour chaque taille premier-jet.json, selection.json et planche-contact.jpg
 *
 * Le script LIT le banc (photos.json, ia.json, voyage.json, ensembles.json, lieux-chapitres.json, et le titre et le style de la trame de
 * référence, pour rejouer à l'identique) et n'écrit QUE dans le dossier de sortie. Aucun réseau, aucun appel d'IA. Aucun nom de client
 * n'est écrit ici : tout vient des fichiers du banc.
 *
 * LA MATRICE (18/11, définition v2) : rejoue À COÛT NUL toute une liste de variantes, chacune avec ses RÉGLAGES et ses RÉPONSES :
 *   … compositeur-rejeu.ts <banc> <projet> <sortie> --matrice <matrice.json> [--jugement <jugement.html>]
 * matrice.json : [{ "nom": "2-v2-48-serree", "titre": "v2 · 48 pages · serrée", "version": 2, "taille": 48 | "tout" | "machine",
 *                   "reglages": { densite, lieux, entorses, dpiDouble150 } (fichier ou objet), "reponses": { … la fiche … } (fichier ou objet),
 *                   "corrections": { tags, marques, reponses } }]
 * Une variante peut aussi être lancée seule : --reglages <fichier.json> --reponses <fichier.json> [--taille 48] [--version 1|2].
 * Les lectures du complément (passe-2/ia-complement.json) sont fondues dans la lecture quand elles existent (la v1 les ignore).
 * Sortie par variante : planche-contact.jpg, magazine.pdf, photos-posees-et-laissees.html, selection.json ; puis COMPARAISON.html.
 */

import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { composer, composerSur, type EntreeCompo, type LieuxChapitres, type Luminance, type PhotoCompo, type ResultatCompo, type Voyage } from "@/lib/mise-en-page/compositeur";
import { lectureSuspecte, type VerdictLu } from "@/lib/mise-en-page/editeur";
import { cadresDe, type Magazine } from "@/lib/mise-en-page/magazine";
import { cadrer } from "@/lib/mise-en-page/recadrage";
import type { StyleMagazine } from "@/lib/mise-en-page/style";
import { REGLAGES_V2_DEFAUT, type CorrectionsAtelier, type Fiche, type ReglagesV2 } from "@/lib/mise-en-page/compositeur";
import { comparaison, magazinePdf, magazinePdfEditeur, planchesContact, planchesEnImages, posesEtLaissees, sectionRognes, type Sources, type Variante } from "./compositeur-planche-tests";

type J = Record<string, unknown>;
const lire = (f: string): J => JSON.parse(fs.readFileSync(f, "utf8")) as J;
const objet = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const liste = (v: unknown): J[] => (Array.isArray(v) ? (v as J[]) : []);
const chaine = (v: unknown): string | null => (typeof v === "string" ? v : null);
const nombre = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const ARGS = process.argv.slice(2);
const option = (nom: string): string | null => { const i = ARGS.indexOf(nom); return i >= 0 ? ARGS[i + 1] ?? null : null; };
const positionnels = ARGS.filter((a, i) => !a.startsWith("--") && !(i > 0 && ARGS[i - 1].startsWith("--")));
const [banc, projet, sortie, passe = "passe-10"] = positionnels;
if (!banc || !projet || !sortie) { console.error("usage : compositeur-rejeu.ts <dossier du banc> <projet> <dossier de sortie> [<passe>]"); process.exit(2); }
const ENTREES = path.join(banc, "sorties", projet, "passe-1");
const REF = path.join(banc, "sorties", projet, "compo", passe);
const CACHE = path.join(banc, "compositeur", "cache", projet);
const V1024 = path.join(banc, "cache", projet, "v1024");
if (path.resolve(sortie).startsWith(path.resolve(banc, "sorties"))) { console.error("le dossier de sortie ne doit pas être dans les sorties du banc"); process.exit(2); }
fs.mkdirSync(sortie, { recursive: true });

/* ─────────────── les entrées du banc, dans la forme du compositeur ─────────────── */

const idDe = (fichier: string) => fichier.slice(0, 3);
function entree(): Omit<EntreeCompo, "fiche" | "couverture"> {
  const photos = liste(lire(path.join(ENTREES, "photos.json")));
  const ia = new Map(liste(lire(path.join(ENTREES, "ia.json")).photos).map((x) => [String(x.fichier), x]));
  const voyageB = lire(path.join(ENTREES, "voyage.json"));
  const ens = lire(path.join(ENTREES, "ensembles.json"));
  const medNet = nombre(ens.medianeNettete) ?? 4000;
  const momentDe = new Map<string, string>();
  for (const m of liste(ens.moments)) for (const f of liste(m.photos)) momentDe.set(String(f), String(m.cle));
  const doublons = new Set(liste(ens.doublons).flatMap((d) => liste(d.autres).map(String)));
  const floues = new Set(liste(ens.floues).map(String));
  const iouB = (a: number[], b: number[]) => {
    const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
    const i = Math.max(0, x1 - x0) * Math.max(0, y1 - y0), u = a[2] * a[3] + b[2] * b[3] - i;
    return u > 0 ? i / u : 0;
  };
  const sortes: Record<string, "lieu" | "enseigne" | "autre"> = {};
  const lc = lire(path.join(banc, "compositeur", "lieux-chapitres.json"));
  for (const n of liste(lc.noms_lus)) sortes[String(n.nom).toUpperCase()] = n.sorte as "lieu" | "enseigne" | "autre";
  /* le complément de la passe 2 (définition v2, décision 11), s'il a été lu : fondu dans la lecture, ignoré par la v1 */
  const fComp = path.join(banc, "sorties", projet, "passe-2", "ia-complement.json");
  const comp = fs.existsSync(fComp) ? objet(lire(fComp).photos) : {};
  const out: PhotoCompo[] = photos.map((p) => {
    const c1 = objet(p.c1), c2 = objet(p.c2);
    const f = String(p.fichier);
    const a = objet(ia.get(f)), pl = objet(a.planche), rg = objet(a.regard);
    const k = objet(comp[f]), kp = objet(k.planche), kr = objet(k.regard), kc = objet(k.couverture);
    const sansVisage = (v: unknown) => (v === "sans_visage" ? null : v);
    const vis: number[][] = liste(c2.visages).map((v) => [Number(v.x), Number(v.y), Number(v.l), Number(v.h)]);
    for (const b of liste(objet(c2.visagesTuiles).boites)) {
      const bb = [Number(b.x), Number(b.y), Number(b.l), Number(b.h)];
      if ((nombre(b.score) ?? 0) >= 0.6 && !vis.some((v) => iouB(bb, v) > 0.2)) vis.push(bb);
    }
    const z = c2.zone ? objet(c2.zone) : null;
    const nouv = objet(c2.nouvelles);
    const pers = chaine(pl.personnes);
    return {
      id: idDe(f), nom: String(p.nom), l: Number(c1.l), h: Number(c1.h), date: chaine(c1.date), dateEstimee: chaine(c1.dateEstimee),
      netteteRel: (nombre(c2.netteteSujet) || nombre(c2.nettete) || 0) / medNet,
      visages: vis.map((v) => ({ x: v[0], y: v[1], l: v[2], h: v[3] })),
      zone: z ? { x: Number(z.x), y: Number(z.y), l: Number(z.l), h: Number(z.h) } : null,
      palette: liste(c2.palette).map(String),
      calme: (chaine(objet(nouv.zoneCalme).ou) as PhotoCompo["calme"]) ?? null,
      moment: momentDe.get(f) ?? null,
      ecart: doublons.has(f) ? { raison: "doublon exact d'une autre photo du dépôt", regle: "S-020" } : floues.has(f) ? { raison: "floue", regle: "S-023" } : null,
      ia: a.planche ? {
        interet: nombre(pl.interet) ?? 0, role: chaine(pl.role), sujet: chaine(pl.sujet), plan: chaine(pl.plan) as never,
        personnes: (pers === "0" || pers === "1" || pers === "2" || pers === "groupe" ? pers : null),
        momentJournee: chaine(pl.moment_journee) as never, ambiance: chaine(pl.ambiance) as never,
        lieuLu: chaine(rg.lieu)?.trim() || null, couverture: !!rg.couverture,
        ...(k.planche ? {
          personnesNombre: nombre(kp.personnes_nombre), sujetSpecial: kp.sujet_special === "animal" || kp.sujet_special === "document" ? kp.sujet_special : null,
          forceImage: nombre(kp.force_image), pose: kp.pose === "pose" || kp.pose === "spontane" ? kp.pose : null, geste: kp.geste === true, insolite: kp.insolite === true,
        } : {}),
        ...(k.regard ? {
          expression: sansVisage(kr.expression) as never, yeuxFermes: sansVisage(kr.yeux_fermes) as never, pointAccroche: kr.point_accroche === true, regardVers: sansVisage(kr.regard) as never,
        } : {}),
        ...(k.couverture ? { rangCouverture: nombre(kc.rang) } : {}),
      } : null,
      chapitre: null,
      empreinte: chaine(c2.dhash), numeroGalerie: nombre(c1.numeroGalerie), chaleur: chaine(c2.chaleur), recadrageConseil: chaine(rg.recadrage) || null,
    };
  });
  const voyage: Voyage = {
    pays: chaine(objet(voyageB.ou).pays), type: chaine(voyageB.type_voyage), qui: chaine(objet(voyageB.qui).type), profil: chaine(voyageB.profil) as Voyage["profil"],
    chapitres: liste(voyageB.chapitres).map((c) => ({ numero: Number(c.numero), titre: String(c.titre), photos: liste(c.photos).map((f) => idDe(String(f))) })),
  };
  const reperes = new Map(liste(lc.reperes).map((r) => [String(r.label), String(r.fichier)]));
  const lieux: LieuxChapitres = { sorte: sortes, sansDate: {}, ancre: {}, chapitres: {} };
  for (const s of liste(lc.sans_date)) {
    const f = chaine(s.fichier), ch = Number(s.chapitre);
    if (!f || !(ch > 0)) continue;
    lieux.sansDate[idDe(f)] = ch;
    const m = /C\d+-\d+/.exec(String(s.raison ?? ""));
    const rep = m ? reperes.get(m[0]) : undefined;
    if (rep) lieux.ancre[idDe(f)] = idDe(rep);
  }
  for (const c of liste(lc.chapitres)) lieux.chapitres[Number(c.numero)] = { lieu: String(c.lieu ?? ""), preuve: c.preuve as "panneau" | "reconnu" | "aucune", detail: String(c.detail ?? "") };
  const ref = lire(path.join(REF, "tout-garder", "trame.json"));
  const style = objet(ref.style);
  return {
    photos: out, voyage, lieux, titre: String(ref.titre ?? ""), piles: liste(ens.rafales).length + liste(ens.doublons).length,
    style: style.paire ? ({ paire: String(style.paire), couleurs: objet(style.couleurs) } as StyleMagazine) : null,
    quand: "2026-11-18T00:00:00.000Z",
  };
}

/** P2-05 : la luminance des photos du banc (64 × 64, images intégrales), comme `chargerLuminances` du poseur. */
async function luminances(ids: string[]): Promise<Map<string, Luminance>> {
  const out = new Map<string, Luminance>();
  const N = 64, W = N + 1;
  for (const id of ids) {
    const f = path.join(CACHE, `${id}.jpg`);
    if (!fs.existsSync(f)) continue;
    const { data } = await sharp(f).rotate().resize(N, N, { fit: "fill" }).greyscale().raw().toBuffer({ resolveWithObject: true });
    const s = new Float64Array(W * W), s2 = new Float64Array(W * W);
    for (let y = 0; y < N; y++) {
      let l1 = 0, l2 = 0;
      for (let x = 0; x < N; x++) { const v = data[y * N + x] / 255; l1 += v; l2 += v * v; s[(y + 1) * W + x + 1] = s[y * W + x + 1] + l1; s2[(y + 1) * W + x + 1] = s2[y * W + x + 1] + l2; }
    }
    out.set(id, { w: N, h: N, s, s2 });
  }
  return out;
}

/* ─────────────── une planche contact (photos recadrées comme l'éditeur, textes en blocs gris) ─────────────── */

async function contact(m: Magazine, nomDe: Map<string, string>, dims: Map<string, { l: number; h: number }>, fichier: string): Promise<void> {
  const K = 1.1, LP = Math.round(420 * K), HP = Math.round(297 * K), COL = 4, M = 10;
  const rangs = Math.ceil(m.planches.length / COL);
  const comp: OverlayOptions[] = [];
  for (const [i, pl] of m.planches.entries()) {
    const ox = M + (i % COL) * (LP + M), oy = M + Math.floor(i / COL) * (HP + M);
    comp.push({ input: { create: { width: LP, height: HP, channels: 3, background: "#ffffff" } }, left: ox, top: oy });
    for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
      if (!d) continue;
      let ip = 0, it = 0;
      for (const c of cadresDe(d, cible)) {
        const x = Math.round(ox + c.x * K), y = Math.round(oy + c.y * K), w = Math.max(1, Math.round(c.l * K)), h = Math.max(1, Math.round(c.h * K));
        if (c.role === "photo") {
          const a = d.photos[ip++];
          const nom = a?.photoId ? nomDe.get(a.photoId) : null;
          const px = a?.photoId ? dims.get(a.photoId) : null;
          if (!nom || !px || !fs.existsSync(path.join(V1024, nom))) continue;
          const cad = cadrer(px, { l: c.l, h: c.h }, a!.recadrage);
          const meta = await sharp(path.join(V1024, nom)).rotate().metadata();
          const sx = (meta.width ?? 1) / cad.l, sy = (meta.height ?? 1) / cad.h;
          const left = Math.max(0, Math.round(-cad.x * sx)), top = Math.max(0, Math.round(-cad.y * sy));
          const ext = { left, top, width: Math.max(1, Math.min((meta.width ?? 1) - left, Math.round(c.l * sx))), height: Math.max(1, Math.min((meta.height ?? 1) - top, Math.round(c.h * sy))) };
          const cx = Math.max(0, x), cy = Math.max(0, y);
          const ww = Math.min(w, ox + LP - cx), hh = Math.min(h, oy + HP - cy);
          if (ww < 1 || hh < 1) continue;
          const img = await sharp(path.join(V1024, nom)).rotate().extract(ext).resize(w, h, { fit: "fill" }).extract({ left: cx - x, top: cy - y, width: ww, height: hh }).toBuffer();
          comp.push({ input: img, left: cx, top: cy });
        } else {
          const t = d.textes[it++];
          if (!t?.contenu) continue;
          const ww = Math.min(w, ox + LP - Math.max(0, x)), hh = Math.min(h, oy + HP - Math.max(0, y));
          if (ww < 2 || hh < 2) continue;
          const corps = Math.max(5, Math.min(hh - 1, (t.taille ?? 10) * 0.35 * K));
          const esc = t.contenu.replace(/[<&>]/g, " ");
          comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ww}" height="${hh}"><text x="1" y="${Math.min(hh - 1, corps)}" font-family="Helvetica" font-size="${corps}" fill="#333">${esc}</text></svg>`), left: Math.max(0, x), top: Math.max(0, y) });
        }
      }
    }
    comp.push({ input: { create: { width: 1, height: HP, channels: 3, background: "#cccccc" } }, left: ox + Math.round(210 * K), top: oy });
  }
  await sharp({ create: { width: M + COL * (LP + M), height: M + rangs * (HP + M), channels: 3, background: "#e8e8e8" } }).composite(comp).jpeg({ quality: 80 }).toFile(fichier);
}

/* ─────────────── la comparaison ─────────────── */

type Ligne = { taille: string; ts: Record<string, number>; py: Record<string, number>; posees_communes: number; seulement_ts: string[]; seulement_py: string[] };

/* ─────────────── la matrice (définition v2) ─────────────── */

type LigneMatrice = { nom: string; titre?: string; version?: 1 | 2; taille?: "tout" | "machine" | number; reglages?: Partial<ReglagesV2> | string; reponses?: Fiche | string; corrections?: CorrectionsAtelier | string };
const lireOuObjet = <X>(v: X | string | undefined, base: string): X | undefined => (typeof v === "string" ? (JSON.parse(fs.readFileSync(path.resolve(base, v), "utf8")) as X) : v);

async function matrice(fichier: string | null, seule: LigneMatrice | null): Promise<void> {
  const e0 = entree();
  const lum = await luminances(e0.photos.map((p) => p.id));
  const fichierDe = new Map(liste(lire(path.join(ENTREES, "photos.json"))).map((p) => [idDe(String(p.fichier)), String(p.fichier)]));
  const s: Sources = {
    v1024: V1024, v320: path.join(banc, "cache", projet, "v320"), fichierDe, dims: new Map(e0.photos.map((p) => [p.id, { l: p.l, h: p.h }])),
    personnes: new Map(e0.photos.map((p) => [p.id, Math.max(p.visages.length, p.ia?.personnesNombre ?? 0, p.ia?.personnes === "groupe" ? 3 : Number(p.ia?.personnes ?? 0) || 0)])),
    chaleur: new Map(e0.photos.filter((p) => p.chaleur).map((p) => [p.id, p.chaleur!])),
  };
  const base = fichier ? path.dirname(path.resolve(fichier)) : process.cwd();
  const lignes: LigneMatrice[] = seule ? [seule] : (JSON.parse(fs.readFileSync(fichier!, "utf8")) as LigneMatrice[]);
  const vs: Variante[] = [];
  for (const l of lignes) {
    const reglages = { ...REGLAGES_V2_DEFAUT, ...(lireOuObjet(l.reglages, base) ?? {}) };
    const reponses = lireOuObjet(l.reponses, base) ?? {};
    const corrections = lireOuObjet(l.corrections, base) ?? null;
    const taille = l.taille ?? 48;
    const debut = Date.now();
    const i = composerSur({
      ...e0, luminances: lum, couverture: null, fiche: { theme: "road_trip", ...reponses, taille: taille === "machine" ? "machine" : taille },
      ...((l.version ?? 2) === 2 ? { v2: reglages, corrections } : {}),
    });
    const ms = Date.now() - debut;
    if (!i.ok) { console.log(`${l.nom} : ${i.phrase} ${i.cause} (${i.technique})`); continue; }
    const r = i.r;
    const d = path.join(sortie, l.nom);
    fs.rmSync(d, { recursive: true, force: true });
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "selection.json"), JSON.stringify({ reglages: (l.version ?? 2) === 2 ? reglages : "v1", reponses, chapitres: r.chapitres, doubles: r.doubles ?? null, zones: r.zones ?? null, selection: r.selection, controle: r.controle, decisions: r.decisions }, null, 1));
    fs.writeFileSync(path.join(d, "premier-jet.json"), JSON.stringify(r.jet, null, 1));
    const petites = await planchesEnImages(r.jet.magazine, s, 1.1);
    await planchesContact(petites, path.join(d, "planche-contact.jpg"), 1.1);
    await magazinePdf(await planchesEnImages(r.jet.magazine, s, 3), path.join(d, "magazine.pdf"));
    /* 18/11 soir : le VRAI rendu, par l'export PDF de l'éditeur (pdf.ts) */
    const vrai = await magazinePdfEditeur(r.jet.magazine, s, path.join(d, "magazine-editeur.pdf"));
    if (vrai.alertes.length) console.log(`   export PDF : ${vrai.alertes.join(" ; ")}`);
    await posesEtLaissees(l.titre ?? l.nom, r, s, petites, path.join(d, "photos-posees-et-laissees.html"));
    if (r.zones) await sectionRognes({ nom: l.nom, titre: l.titre ?? l.nom, r, images: petites }, s, path.join(d, "rognes.jpg"));
    vs.push({ nom: l.nom, titre: l.titre ?? l.nom, r, images: petites });
    console.log(`${l.nom} : ${r.pages} pages, ${r.selection.compte.posee} posées, ${r.selection.compte.couverture} couverture, ${r.selection.compte.reserve} réserve, ${r.selection.compte.ecartee} écartées, ${r.controle.fautes.length} faute(s) en ${ms} ms`);
    for (const f of r.controle.fautes) console.log(`   faute : ${f.faute} · ${f.ou} · ${f.detail} (${f.regle})`);
  }
  if (vs.length > 1) {
    const jug = option("--jugement");
    const n = Math.max(...vs.map((v) => v.images.length));
    const pas = Math.max(1, Math.floor((n - 2) / 12));
    const choisies = Array.from({ length: 12 }, (_, k) => 1 + k * pas).filter((x) => x < n - 1);
    await comparaison(vs, s, choisies, jug && fs.existsSync(jug) ? fs.readFileSync(jug, "utf8") : "", path.join(sortie, "COMPARAISON.html"));
    console.log(`COMPARAISON.html : ${vs.length} variantes, doubles expliquées ${choisies.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const fM = option("--matrice");
  if (fM || option("--reglages") || option("--reponses")) {
    const seule: LigneMatrice | null = fM ? null : {
      nom: "variante", version: option("--version") === "1" ? 1 : 2, taille: option("--taille") === "tout" ? "tout" : option("--taille") === "machine" ? "machine" : Number(option("--taille") ?? 48),
      ...(option("--reglages") ? { reglages: path.resolve(option("--reglages")!) } : {}), ...(option("--reponses") ? { reponses: path.resolve(option("--reponses")!) } : {}),
    };
    return matrice(fM, seule);
  }
  const e0 = entree();
  const lum = await luminances(e0.photos.map((p) => p.id));
  const fichierDe = new Map(liste(lire(path.join(ENTREES, "photos.json"))).map((p) => [idDe(String(p.fichier)), String(p.fichier)]));
  const dims = new Map(e0.photos.map((p) => [p.id, { l: p.l, h: p.h }]));
  const lignes: Ligne[] = [];
  for (const [nomTaille, taille] of [["tout-garder", "tout"], ["48-pages", 48]] as const) {
    const debut = Date.now();
    const r: ResultatCompo = composer({ ...e0, luminances: lum, fiche: { taille, theme: "road_trip" }, couverture: null });
    const ms = Date.now() - debut;
    const d = path.join(sortie, nomTaille);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "premier-jet.json"), JSON.stringify(r.jet, null, 1));
    fs.writeFileSync(path.join(d, "selection.json"), JSON.stringify({ chapitres: r.chapitres, selection: r.selection, controle: r.controle, decisions: r.decisions }, null, 1));
    await contact(r.jet.magazine, fichierDe, dims, path.join(d, "planche-contact.jpg"));
    const sel = lire(path.join(REF, nomTaille, "selection.json"));
    const mes = lire(path.join(REF, nomTaille, "mesures.json"));
    const postsTs = new Set(r.selection.photos.filter((p) => p.etat === "posee").map((p) => p.id));
    const postsPy = new Set(liste(sel.gardees).map((g) => String(g.id)));
    lignes.push({
      taille: nomTaille,
      ts: { pages: r.pages, posees: r.selection.compte.posee, couverture: r.selection.compte.couverture, reserve: r.selection.compte.reserve, ecartees: r.selection.compte.ecartee, fautes: r.controle.fautes.length, signaux: r.controle.signaux.length, ms },
      py: { pages: Number(mes.pages), posees: liste(sel.gardees).length, couverture: liste(sel.couvertures).length, reserve: liste(sel.reserve).length, ecartees: liste(sel.ecartees).length, fautes: Number(mes.fautes_dures), signaux: Number(mes.signaux) },
      posees_communes: [...postsTs].filter((x) => postsPy.has(x)).length,
      seulement_ts: [...postsTs].filter((x) => !postsPy.has(x)).sort(), seulement_py: [...postsPy].filter((x) => !postsTs.has(x)).sort(),
    });
    console.log(`${nomTaille} : TS ${r.pages} pages, ${r.selection.compte.posee} posées, ${r.selection.compte.reserve} en réserve, ${r.selection.compte.ecartee} écartées, ${r.controle.fautes.length} faute(s) dure(s) en ${ms} ms`);
    for (const f of r.controle.fautes) console.log(`   faute : ${f.faute} · ${f.ou} · ${f.detail} (${f.regle})`);
  }
  fs.writeFileSync(path.join(sortie, "rejeu.json"), JSON.stringify(lignes, null, 1));
  const md = ["# Rejeu du compositeur TypeScript contre le banc Python", "", "| Taille | | pages | posées | couverture | réserve | écartées | fautes dures |", "|---|---|---|---|---|---|---|---|"];
  for (const l of lignes) {
    md.push(`| ${l.taille} | Python | ${l.py.pages} | ${l.py.posees} | ${l.py.couverture} | ${l.py.reserve} | ${l.py.ecartees} | ${l.py.fautes} |`);
    md.push(`| | TS | ${l.ts.pages} | ${l.ts.posees} | ${l.ts.couverture} | ${l.ts.reserve} | ${l.ts.ecartees} | ${l.ts.fautes} |`);
  }
  md.push("");
  for (const l of lignes) md.push(`- ${l.taille} : ${l.posees_communes} posées en commun ; seulement TS : ${l.seulement_ts.join(", ") || "aucune"} ; seulement Python : ${l.seulement_py.join(", ") || "aucune"}`);
  /* 18/11 soir (M-13, M-14) : la LECTURE EMPOISONNÉE du vrai dossier de Mathias, rejouée sur le projet de test sans aucun appel :
     toutes les photos « à écarter » (des cases blanches lues par l'IA), 85 gardées par l'atelier, 60 pages demandées. Avant la correction,
     le compositeur jetait « aucune répartition des doubles (60) ». */
  md.push("", "## Lecture empoisonnée (toutes « à écarter », 85 gardées par l'atelier, 60 pages)", "", "| Cas | issue | pages | posées | réserve | ajustement | fautes dures |", "|---|---|---|---|---|---|---|");
  const poison: PhotoCompo[] = e0.photos.map((p) => ({ ...p, ia: { ...(p.ia ?? { role: null, sujet: null, plan: null, personnes: null, momentJournee: null, ambiance: null, lieuLu: null, couverture: false }), role: "a_ecarter", interet: 0.1 } }));
  const gardees = poison.filter((p) => !p.ecart && p.date).sort((a, b) => (a.date! < b.date! ? -1 : 1)).slice(0, 85).map((p) => p.id);
  const avecGardees = poison.map((p) => (gardees.includes(p.id) ? { ...p, gardee: true as const } : p));
  const verdicts: VerdictLu[][] = [];
  for (let i = 0; i < poison.length; i += 16) verdicts.push(poison.slice(i, i + 16).map((p) => ({ id: p.id, role: p.ia?.role ?? null, corrige: false })));
  const susp = lectureSuspecte(verdicts);
  const sansLecture = avecGardees.map((p) => (susp.douteuses.has(p.id) ? { ...p, ia: null } : p));
  const cas: [string, PhotoCompo[], Partial<EntreeCompo>][] = [
    ["lecture utilisée, aucune marque", poison, {}],
    ["lecture utilisée, 85 gardées (M-13 : la marque prime)", avecGardees, { marques: { coeurs: [], gardees } }],
    [`lecture vue douteuse (${susp.raisons.join(", ")}) et non utilisée, 85 gardées`, sansLecture, { marques: { coeurs: [], gardees }, lectureDouteuse: { photos: susp.douteuses.size, raison: susp.raisons.join(", ") } }],
  ];
  for (const [nom, photos, o] of cas) {
    const i = composerSur({ ...e0, photos, luminances: lum, fiche: { taille: 60, theme: "road_trip" }, couverture: null, ...o });
    if (!i.ok) { md.push(`| ${nom} | phrase : « ${i.phrase} » ${i.cause} ${i.geste} | | | | | |`); console.log(`empoisonnée · ${nom} : ${i.phrase} ${i.cause} ${i.geste}`); continue; }
    const r = i.r;
    md.push(`| ${nom} | magazine | ${r.pages} | ${r.selection.compte.posee} | ${r.selection.compte.reserve} | ${r.ajustement?.phrase ?? "aucun"} | ${r.controle.fautes.length} |`);
    console.log(`empoisonnée · ${nom} : ${r.pages} pages, ${r.selection.compte.posee} posées (dont ${gardees.filter((id) => r.selection.photos.find((p) => p.id === id)?.etat === "posee").length} gardées), ${r.selection.compte.reserve} en réserve${r.ajustement ? ` · ${r.ajustement.phrase}` : ""}`);
    const d = path.join(sortie, "empoisonnee", nom.startsWith("lecture vue") ? "douteuse-non-utilisee" : nom.includes("85") ? "gardees" : "brute");
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "premier-jet.json"), JSON.stringify(r.jet, null, 1));
    fs.writeFileSync(path.join(d, "selection.json"), JSON.stringify({ chapitres: r.chapitres, selection: r.selection, controle: r.controle, decisions: r.decisions }, null, 1));
    await contact(r.jet.magazine, fichierDe, dims, path.join(d, "planche-contact.jpg"));
  }
  fs.writeFileSync(path.join(sortie, "comparaison.md"), md.join("\n") + "\n");
  console.log(md.join("\n"));
}

void main();
