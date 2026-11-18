/**
 * LA PLANCHE DE TESTS du compositeur (18/11, définition v2) : pour une variante composée, les trois fichiers que Mathias regarde, et la
 * comparaison de toutes les variantes. Appelé par `scripts/compositeur-rejeu.ts --matrice` ; rien n'est publié, tout reste HORS GIT.
 *
 *   planche-contact.jpg            toutes les planches, photos recadrées comme l'éditeur (textes en gris)
 *   magazine.pdf                   une page par planche (image de la planche, 426 × 303 mm) : une épreuve à l'œil, pas un fichier d'imprimeur
 *   photos-posees-et-laissees.html par chapitre : posées, en réserve, écartées, les CINQ notes en clair, la raison en mots d'atelier, et
 *                                  pour chaque double « N photos ici parce que… » (vignettes embarquées)
 *   COMPARAISON.html               le tableau des chiffres, les variantes côte à côte double par double, douze doubles expliquées
 * Aucun réseau, aucune base, aucun appel d'IA.
 */

import fs from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { PDFDocument } from "pdf-lib";
import { cadresDe, type Magazine } from "@/lib/mise-en-page/magazine";
import { cadrer } from "@/lib/mise-en-page/recadrage";
import { regleParId } from "@/lib/mise-en-page/regles";
import type { PhotoChoisie, ResultatCompo } from "@/lib/mise-en-page/compositeur";

export type Sources = { v1024: string; v320: string; fichierDe: Map<string, string>; dims: Map<string, { l: number; h: number }>; personnes: Map<string, number> };

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Une planche rendue en image (K pixels par mm), photos recadrées par `cadrer` (le recadrage de l'éditeur). */
export async function rendrePlanche(m: Magazine, i: number, s: Sources, K: number): Promise<Buffer> {
  const pl = m.planches[i];
  const LP = Math.round(420 * K), HP = Math.round(297 * K);
  const comp: OverlayOptions[] = [];
  const fond = (cote: "gauche" | "droite") => {
    const f = pl.fond?.[cote];
    return typeof f === "string" && /^#[0-9a-f]{6}$/i.test(f) ? f : f ? "#efe9df" : null;
  };
  for (const [cote, x0] of [["gauche", 0], ["droite", 210]] as const) {
    const f = fond(cote);
    if (f) comp.push({ input: { create: { width: Math.round(210 * K), height: HP, channels: 3, background: f } }, left: Math.round(x0 * K), top: 0 });
  }
  for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
    if (!d) continue;
    let ip = 0, it = 0;
    for (const c of cadresDe(d, cible)) {
      const x = Math.round(c.x * K), y = Math.round(c.y * K), w = Math.max(1, Math.round(c.l * K)), h = Math.max(1, Math.round(c.h * K));
      if (c.role === "photo") {
        const a = d.photos[ip++];
        const nom = a?.photoId ? s.fichierDe.get(a.photoId) : null;
        const px = a?.photoId ? s.dims.get(a.photoId) : null;
        if (!nom || !px || !fs.existsSync(path.join(s.v1024, nom))) continue;
        const cad = cadrer(px, { l: c.l, h: c.h }, a!.recadrage);
        const meta = await sharp(path.join(s.v1024, nom)).rotate().metadata();
        const sx = (meta.width ?? 1) / cad.l, sy = (meta.height ?? 1) / cad.h;
        const left = Math.max(0, Math.round(-cad.x * sx)), top = Math.max(0, Math.round(-cad.y * sy));
        const ext = { left, top, width: Math.max(1, Math.min((meta.width ?? 1) - left, Math.round(c.l * sx))), height: Math.max(1, Math.min((meta.height ?? 1) - top, Math.round(c.h * sy))) };
        const cx = Math.max(0, x), cy = Math.max(0, y);
        const ww = Math.min(w - (cx - x), LP - cx), hh = Math.min(h - (cy - y), HP - cy);
        if (ww < 1 || hh < 1) continue;
        const img = await sharp(path.join(s.v1024, nom)).rotate().extract(ext).resize(w, h, { fit: "fill" }).extract({ left: cx - x, top: cy - y, width: ww, height: hh }).toBuffer();
        comp.push({ input: img, left: cx, top: cy });
      } else {
        const t = d.textes[it++];
        if (!t?.contenu) continue;
        const cx = Math.max(0, x), cy = Math.max(0, y);
        const ww = Math.min(w, LP - cx), hh = Math.min(h, HP - cy);
        if (ww < 2 || hh < 2) continue;
        const corps = Math.max(5, Math.min(hh - 1, (t.taille ?? 10) * 0.35 * K));
        comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ww}" height="${hh}"><text x="1" y="${Math.min(hh - 1, corps)}" font-family="Helvetica" font-size="${corps}" fill="#333">${esc(t.contenu)}</text></svg>`), left: cx, top: cy });
      }
    }
  }
  comp.push({ input: { create: { width: 1, height: HP, channels: 3, background: "#cccccc" } }, left: Math.round(210 * K), top: 0 });
  /* la page 1 (seule, à droite) et la dernière (seule, à gauche) : la moitié vide en gris */
  if (i === 0) comp.push({ input: { create: { width: Math.round(210 * K), height: HP, channels: 3, background: "#d8d8d8" } }, left: 0, top: 0 });
  if (i === m.planches.length - 1 && m.derniere) comp.push({ input: { create: { width: Math.round(210 * K), height: HP, channels: 3, background: "#d8d8d8" } }, left: Math.round(210 * K), top: 0 });
  return sharp({ create: { width: LP, height: HP, channels: 3, background: "#ffffff" } }).composite(comp).jpeg({ quality: 82 }).toBuffer();
}

export async function planchesEnImages(m: Magazine, s: Sources, K: number): Promise<Buffer[]> {
  const out: Buffer[] = [];
  for (let i = 0; i < m.planches.length; i++) out.push(await rendrePlanche(m, i, s, K));
  return out;
}

export async function planchesContact(images: Buffer[], fichier: string, K: number): Promise<void> {
  const LP = Math.round(420 * K), HP = Math.round(297 * K), COL = 4, M = 10;
  const rangs = Math.ceil(images.length / COL);
  const comp: OverlayOptions[] = images.map((b, i) => ({ input: b, left: M + (i % COL) * (LP + M), top: M + Math.floor(i / COL) * (HP + M) }));
  for (let i = 0; i < images.length; i++) {
    comp.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="18"><rect width="40" height="18" fill="#111"/><text x="4" y="14" font-family="Helvetica" font-weight="bold" font-size="13" fill="#fff">${i === 0 ? "p1" : i === images.length - 1 ? "fin" : `D${i}`}</text></svg>`), left: M + (i % COL) * (LP + M), top: M + Math.floor(i / COL) * (HP + M) });
  }
  await sharp({ create: { width: M + COL * (LP + M), height: M + rangs * (HP + M), channels: 3, background: "#e8e8e8" } }).composite(comp).jpeg({ quality: 80 }).toFile(fichier);
}

export async function magazinePdf(images: Buffer[], fichier: string): Promise<void> {
  const doc = await PDFDocument.create();
  const pt = 72 / 25.4;
  for (const b of images) {
    const img = await doc.embedJpg(b);
    const page = doc.addPage([426 * pt, 303 * pt]);
    page.drawImage(img, { x: 3 * pt, y: 3 * pt, width: 420 * pt, height: 297 * pt });
  }
  fs.writeFileSync(fichier, await doc.save());
}

const vignettes = new Map<string, string>();
export async function vignette(s: Sources, id: string, px = 150): Promise<string> {
  const k = `${id}|${px}`;
  if (vignettes.has(k)) return vignettes.get(k)!;
  const f = s.fichierDe.get(id);
  const src = f && fs.existsSync(path.join(s.v320, f)) ? path.join(s.v320, f) : f ? path.join(s.v1024, f) : null;
  const v = src ? `data:image/jpeg;base64,${(await sharp(src).rotate().resize(px, px, { fit: "inside" }).jpeg({ quality: 70 }).toBuffer()).toString("base64")}` : "";
  vignettes.set(k, v);
  return v;
}
export const enData = async (b: Buffer, l: number): Promise<string> => `data:image/jpeg;base64,${(await sharp(b).resize(l).jpeg({ quality: 70 }).toBuffer()).toString("base64")}`;

const CSS = `:root{--papier:#f7f5f1;--encre:#1d1b18;--doux:#6b655c;--trait:#ddd6cb;--fort:#2f6b3a;--bon:#5d8a3a;--correct:#a07d22;--faible:#a5432f}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--papier:#1c1b19;--encre:#eeeae3;--doux:#a59e93;--trait:#3a3733}}
body{margin:0;padding:16px;background:var(--papier);color:var(--encre);font:14px/1.45 -apple-system,Helvetica,Arial,sans-serif;max-width:1500px}
h1{font-size:22px;margin:4px 0 8px}h2{font-size:18px;margin:26px 0 8px;border-bottom:1px solid var(--trait);padding-bottom:4px}h3{font-size:15px;margin:14px 0 6px}
table{border-collapse:collapse;margin:8px 0;font-size:13px}td,th{border:1px solid var(--trait);padding:4px 7px;text-align:left;vertical-align:top}
.grille{display:flex;flex-wrap:wrap;gap:8px}.ph{width:168px;font-size:11.5px;border:1px solid var(--trait);border-radius:6px;padding:5px;background:rgba(255,255,255,.03)}
.ph img{width:156px;height:110px;object-fit:contain;display:block;margin:0 auto 4px;background:#0001}.raison{font-weight:600;margin:2px 0}
.n{display:inline-block;padding:0 4px;border-radius:3px;margin:1px 2px 1px 0;color:#fff;font-size:10.5px}.forte{background:var(--fort)}.bonne{background:var(--bon)}.correcte{background:var(--correct)}.faible{background:var(--faible)}
.doux{color:var(--doux)}.dbl{display:flex;gap:10px;align-items:flex-start;margin:6px 0}.dbl img{width:300px;border:1px solid var(--trait)}
.cote{display:grid;gap:8px}.cote img{width:100%;border:1px solid var(--trait)}small{color:var(--doux)}`;

const NOMS = { technique: "Technique", histoire: "Histoire", image: "Image", gens: "Gens", unicite: "Unicité" } as const;
function notesHtml(p: PhotoChoisie): string {
  if (!p.notes) return `<div class="doux">note unique ${p.note.toFixed(2)} (v1)</div>`;
  return (Object.keys(NOMS) as (keyof typeof NOMS)[]).map((k) => `<span class="n ${p.notes![k].cran}" title="${esc(p.notes![k].phrase)}">${NOMS[k]} ${p.notes![k].cran}</span>`).join("")
    + `<details><summary class="doux">pourquoi</summary>${(Object.keys(NOMS) as (keyof typeof NOMS)[]).map((k) => `<div><b>${NOMS[k]}</b> ${p.notes![k].valeur.toFixed(2)} : ${esc(p.notes![k].phrase)}</div>`).join("")}</details>`;
}

/** Les doubles de la v1 n'ont pas de phrase « N photos parce que » : on reprend la décision de planche, telle qu'écrite. */
export function pourquoiDesDoubles(r: ResultatCompo): Map<number, { photos: number; phrase: string; regles: string[] }> {
  const out = new Map<number, { photos: number; phrase: string; regles: string[] }>();
  if (r.doubles) { for (const d of r.doubles) out.set(d.planche, d); return out; }
  for (const d of r.decisions) {
    const m = /^planche (\d+)$/.exec(d.quoi);
    if (!m || out.has(Number(m[1])) || !d.ou.startsWith("chapitre")) continue;
    const n = (d.detail.split(":").slice(1).join(":").match(/,/g)?.length ?? 0) + 1;
    out.set(Number(m[1]), { photos: d.detail.startsWith("ouverture") ? 1 : n, phrase: `(v1, sans table de densité) ${d.detail.replace(/ [A-Z] \d\.\d\d/g, "")}`, regles: d.regles });
  }
  return out;
}

export async function posesEtLaissees(nom: string, r: ResultatCompo, s: Sources, images: Buffer[], fichier: string): Promise<void> {
  const parChap = new Map<number | null, PhotoChoisie[]>();
  for (const p of r.selection.photos) parChap.set(p.chapitre, [...(parChap.get(p.chapitre) ?? []), p]);
  const titre = new Map(r.chapitres.map((c) => [c.numero, c.titre]));
  const pq = pourquoiDesDoubles(r);
  const morceaux: string[] = [`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Posées et laissées</title><style>${CSS}</style></head><body>`,
    `<h1>Posées et laissées · ${esc(nom)}</h1><p class="doux">${r.pages} pages · ${r.selection.compte.posee} posées · ${r.selection.compte.couverture} en couverture · ${r.selection.compte.reserve} en réserve · ${r.selection.compte.ecartee} écartées · ${r.controle.fautes.length} faute(s) dure(s). Document de travail, jamais publié.</p>`];
  morceaux.push(`<h2>Chaque double : combien de photos, et pourquoi</h2>`);
  for (let i = 1; i < images.length - 1; i++) {
    const d = pq.get(i);
    morceaux.push(`<div class="dbl"><img loading="lazy" src="${await enData(images[i], 300)}" alt="Double ${i}"><div><b>Double ${i}</b>${d ? ` · ${esc(d.phrase)}<br><small>règles : ${esc(d.regles.join(", "))}</small>` : ""}</div></div>`);
  }
  const ordre: Record<string, number> = { posee: 0, couverture: 1, reserve: 2, ecartee: 3 };
  const MOT: Record<string, string> = { posee: "Posées", couverture: "En couverture", reserve: "En réserve", ecartee: "Écartées" };
  for (const [c, l] of [...parChap].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99))) {
    morceaux.push(`<h2>Chapitre ${c ?? "?"}${c !== null && titre.get(c) ? ` · ${esc(titre.get(c)!)}` : ""} <small>${l.length} photos</small></h2>`);
    for (const etat of ["posee", "couverture", "reserve", "ecartee"]) {
      const ls = l.filter((p) => p.etat === etat).sort((a, b) => ordre[a.etat] - ordre[b.etat] || (a.place ?? "").localeCompare(b.place ?? ""));
      if (!ls.length) continue;
      morceaux.push(`<h3>${MOT[etat]} (${ls.length})</h3><div class="grille">`);
      for (const p of ls) {
        morceaux.push(`<div class="ph"><img loading="lazy" src="${await vignette(s, p.id)}" alt=""><div class="raison">${esc(p.raison)}</div>${p.placement ? `<div class="doux">${esc(p.placement)}</div>` : ""}${p.serie ? `<div class="doux">série ${esc(p.serie)}</div>` : ""}${notesHtml(p)}<div class="doux">${esc(s.fichierDe.get(p.id) ?? p.id)}</div></div>`);
      }
      morceaux.push(`</div>`);
    }
  }
  morceaux.push(`</body></html>`);
  fs.writeFileSync(fichier, morceaux.join("\n"));
}

export type Variante = { nom: string; titre: string; r: ResultatCompo; images: Buffer[] };

/** Les chiffres d'une variante (le tableau de tête de COMPARAISON.html). */
export function chiffres(v: Variante, s: Sources): Record<string, string | number> {
  const m = v.r.jet.magazine;
  const aires: number[] = [];
  let unes = 0, denses = 0;
  m.planches.forEach((pl, i) => {
    if (i === 0 || i === m.planches.length - 1) return;
    let n = 0;
    for (const [cible, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
      if (!d) continue;
      let ip = 0;
      for (const c of cadresDe(d, cible)) {
        if (c.role !== "photo") continue;
        const a = d.photos[ip++];
        if (!a?.photoId) continue;
        n++;
        if ((s.personnes.get(a.photoId) ?? 0) > 0) aires.push((c.l * c.h) / 100);
      }
    }
    if (n === 1) unes++;
    if (n >= 6) denses++;
  });
  aires.sort((a, b) => a - b);
  const med = aires.length ? aires[Math.floor(aires.length / 2)] : 0;
  return {
    pages: v.r.pages, posees: v.r.selection.compte.posee, couverture: v.r.selection.compte.couverture, reserve: v.r.selection.compte.reserve, ecartees: v.r.selection.compte.ecartee,
    personnes: aires.length, aire: `${Math.round(med)} cm²`, unes, denses, fautes: v.r.controle.fautes.length,
  };
}

export async function comparaison(vs: Variante[], s: Sources, choisies: number[], jugement: string, fichier: string): Promise<void> {
  const c = vs.map((v) => chiffres(v, s));
  const L: string[] = [`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comparaison des variantes</title><style>${CSS}</style></head><body>`,
    `<h1>Compositeur v2 : comparaison des variantes</h1><p class="doux">Projet de test (long voyage en famille, 164 photos). Rejoué sans IA à partir des lectures gardées (passe 1 et complément passe 2). Document de travail, jamais publié.</p>`,
    `<table><tr><th>Variante</th><th>pages</th><th>posées</th><th>couverture</th><th>en réserve</th><th>écartées</th><th>photos de personnes posées</th><th>leur taille médiane</th><th>doubles à une photo</th><th>doubles denses (6 et plus)</th><th>fautes du contrôle</th></tr>`,
    ...vs.map((v, i) => `<tr><td><b>${esc(v.titre)}</b></td>${["pages", "posees", "couverture", "reserve", "ecartees", "personnes", "aire", "unes", "denses", "fautes"].map((k) => `<td>${c[i][k]}</td>`).join("")}</tr>`), `</table>`];
  if (jugement) L.push(`<h2>Ce que j'en vois, à l'œil</h2>${jugement}`);
  L.push(`<h2>Fautes du contrôle</h2>`);
  for (const v of vs) L.push(`<p><b>${esc(v.titre)}</b> : ${v.r.controle.fautes.length ? v.r.controle.fautes.map((f) => esc(`${f.faute} (${f.ou}, ${f.regle})`)).join(" · ") : "aucune"}</p>`);
  L.push(`<h2>Douze doubles expliquées : « on l'a créée comme ça parce que… »</h2>`);
  const v2 = vs.filter((v) => v.r.doubles);
  for (const n of choisies) {
    L.push(`<h3>Double ${n}</h3><div class="cote" style="grid-template-columns:repeat(${vs.length},1fr)">`);
    for (const v of vs) {
      const d = pourquoiDesDoubles(v.r).get(n);
      const regles = (d?.regles ?? []).map((id) => { const r = regleParId(id); return r ? `<li><b>${id}</b> : ${esc(r.enonce)}</li>` : `<li><b>${id}</b></li>`; }).join("");
      L.push(`<div><small>${esc(v.titre)}</small>${v.images[n] ? `<img loading="lazy" src="${await enData(v.images[n], 360)}" alt="">` : "<p class='doux'>(pas de double à ce rang)</p>"}${d ? `<div><b>${esc(d.phrase)}</b></div><details><summary class="doux">les règles en clair</summary><ul>${regles}</ul></details>` : ""}</div>`);
    }
    L.push(`</div>`);
  }
  void v2;
  L.push(`<h2>Toutes les doubles, côte à côte</h2>`);
  const n = Math.max(...vs.map((v) => v.images.length));
  for (let i = 0; i < n; i++) {
    L.push(`<h3>${i === 0 ? "Page 1" : `Planche ${i}`}</h3><div class="cote" style="grid-template-columns:repeat(${vs.length},1fr)">`);
    for (const v of vs) { const d = pourquoiDesDoubles(v.r).get(i); L.push(`<div><small>${esc(v.titre)}</small>${v.images[i] ? `<img loading="lazy" src="${await enData(v.images[i], 300)}" alt="">` : ""}${d ? `<div class="doux">${esc(d.phrase)}</div>` : ""}</div>`); }
    L.push(`</div>`);
  }
  L.push(`</body></html>`);
  fs.writeFileSync(fichier, L.join("\n"));
}
