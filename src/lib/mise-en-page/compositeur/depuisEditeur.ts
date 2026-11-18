/**
 * Ce que l'éditeur sait déjà, dans la forme du compositeur (C20, 18/11/2026) : le catalogue, la lecture mesurée (netteté, visages, zone,
 * palette, chaleur, floues, piles), la lecture IA reliée (v2 ou v3 : rôles, sujets, tags de planche, lieux lus, voyage, lieux par
 * chapitre), le tri de l'atelier (ses écartées), la fiche. Module pur.
 */

import type { Catalogue } from "../editeur/types";
import type { Lecture } from "../editeur/mesures";
import type { LectureIAReliee } from "../editeur/lectureIA";
import { nomComparable } from "../editeur/premierJet";
import { decoupage } from "../editeur/moments";
import type { Boite } from "../editeur/saillance";
import type { EntreeCompo, Fiche, LieuxChapitres, Luminance, PhotoCompo, Voyage } from "./types";
import type { StyleMagazine } from "../style";

/** La bande la plus calme pour un titre, lue sur la carte de chaleur 16 × 16 (le banc y ajoutait la texture des pixels, que l'éditeur ne
 *  garde pas : APPROXIMATION, une bande est calme si sa chaleur moyenne reste sous 2 sur 9, sans chevaucher la zone importante). */
export function bandeCalme(chaleur: string | undefined, zone: Boite | null): PhotoCompo["calme"] {
  if (!chaleur || chaleur.length < 256) return null;
  const bandes: [NonNullable<PhotoCompo["calme"]>, (r: number, c: number) => boolean][] = [
    ["haut", (r) => r < 5], ["bas", (r) => r >= 11], ["gauche", (_r, c) => c < 6], ["droite", (_r, c) => c >= 10],
  ];
  let meilleure: { ou: PhotoCompo["calme"]; a: number } = { ou: null, a: 1 };
  for (const [ou, dedans] of bandes) {
    let a = 0, n = 0, chevauche = 0;
    for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) {
      if (!dedans(r, q)) continue;
      a += Number(chaleur[r * 16 + q]) / 9; n++;
      if (zone && (q + 0.5) / 16 >= zone.x && (q + 0.5) / 16 <= zone.x + zone.l && (r + 0.5) / 16 >= zone.y && (r + 0.5) / 16 <= zone.y + zone.h) chevauche++;
    }
    const ag = a / n + 0.5 * (chevauche / n);
    if (ag < meilleure.a) meilleure = { ou, a: ag };
  }
  return meilleure.a <= 2 / 9 ? meilleure.ou : null;
}

export type DonneesEditeur = {
  catalogue: Catalogue;
  lecture: Lecture;
  lectureIA: LectureIAReliee | null;
  ecarteesAtelier: ReadonlySet<string>;
  fiche: Fiche;
  titre: string;
  quand: string;
  luminances?: ReadonlyMap<string, Luminance>;
  couverture?: { premiere: string[]; quatrieme: string[] } | null;
  style?: StyleMagazine | null;
};

export function entreeDepuisEditeur(d: DonneesEditeur): EntreeCompo {
  const cat = d.catalogue;
  const mesures = d.lecture.mesures ?? {};
  const nets = [...cat.keys()].map((id) => mesures[id]?.netteteSujet ?? mesures[id]?.nettete).filter((v): v is number => typeof v === "number" && v > 0).sort((a, b) => a - b);
  const med = nets.length ? nets[Math.floor(nets.length / 2)] : 0;
  const floues = new Set(d.lecture.floues);
  const sousPile = new Map<string, string>();
  for (const p of d.lecture.piles) for (const id of p.autres) sousPile.set(id, p.raison);
  const parNom = new Map<string, string>();
  for (const p of cat.values()) { const k = nomComparable(p.nom); if (!parNom.has(k)) parNom.set(k, p.id); }
  const idDe = (nom: string) => parNom.get(nomComparable(nom));
  const decoupe = decoupage(cat);
  const src = d.lectureIA?.source ?? null;

  /* le voyage (couche 7), ses chapitres rendus aux photos de l'éditeur */
  let voyage: Voyage | null = null;
  if (src?.voyage) {
    const v = src.voyage;
    voyage = {
      pays: v.ou.pays.trim() || null, type: v.type_voyage, qui: v.qui.type, profil: v.profil,
      chapitres: v.chapitres.map((c, i) => ({ numero: i + 1, titre: c.titre, photos: c.photos.map(idDe).filter((x): x is string => !!x) })),
    };
  }
  let lieux: LieuxChapitres | null = null;
  if (src?.lieux) {
    const l = src.lieux;
    lieux = { sorte: {}, sansDate: {}, ancre: {}, chapitres: {} };
    for (const n of l.noms) lieux.sorte[n.nom.toUpperCase()] = n.sorte;
    for (const s of l.sansDate) { const id = idDe(s.photo); if (id && s.chapitre > 0) lieux.sansDate[id] = s.chapitre; }
    for (const r of l.reperes) { const a = idDe(r.photo), b = idDe(r.repere); if (a && b) lieux.ancre[a] = b; }
    for (const c of l.chapitres) lieux.chapitres[c.numero] = { lieu: c.lieu, preuve: c.preuve, detail: c.detail };
  }

  const chapDe = new Map<string, number>();
  for (const c of voyage?.chapitres ?? []) for (const id of c.photos) if (!chapDe.has(id)) chapDe.set(id, c.numero);
  const photos: PhotoCompo[] = [...cat.values()]
    .sort((a, b) => (a.date === b.date ? (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0) : a.date === null ? 1 : b.date === null ? -1 : a.date < b.date ? -1 : 1))
    .map((p) => {
      const m = mesures[p.id];
      const zone = (d.lecture.zones[p.id] ?? m?.zone ?? null) as Boite | null;
      const ia = d.lectureIA?.photos.get(p.id);
      const n = m?.netteteSujet ?? m?.nettete;
      const raisonPile = sousPile.get(p.id);
      const ecart = d.ecarteesAtelier.has(p.id) ? { raison: "écartée par l'atelier", regle: "atelier" }
        : raisonPile === "doublon" ? { raison: "doublon d'une autre photo du dépôt", regle: "S-020" }
        : floues.has(p.id) ? { raison: "floue", regle: "S-023" }
        : raisonPile === "rafale" ? { raison: "une autre de la rafale est gardée", regle: "S-027" } : null;
      return {
        id: p.id, nom: p.nom, l: p.l, h: p.h, date: p.date, dateEstimee: null,
        netteteRel: med && typeof n === "number" ? n / med : 1,
        visages: (m?.visages ?? []).map((v) => ({ x: v.x, y: v.y, l: v.l, h: v.h })),
        zone, palette: m?.palette ?? [], calme: bandeCalme(m?.chaleur, zone),
        moment: p.date ? decoupe.moment.get(p.id)?.cle ?? null : null,
        ecart,
        ia: ia?.role || ia?.sujet ? {
          interet: ia.role?.interet ?? 0.5, role: ia.role?.role ?? null, sujet: ia.sujet ?? null, plan: ia.plan ?? null, personnes: ia.personnes ?? null,
          momentJournee: ia.moment_journee ?? null, ambiance: ia.ambiance ?? null,
          lieuLu: ia.lieu && ia.lieu.source === "ia" && ia.lieu.preuve === "panneau" ? ia.lieu.nom : null, couverture: !!ia.role?.couverture,
        } : null,
        chapitre: chapDe.get(p.id) ?? null,
      };
    });
  return {
    photos, voyage, lieux, fiche: d.fiche, titre: d.titre, piles: d.lecture.piles.length, quand: d.quand,
    ...(d.luminances ? { luminances: d.luminances } : {}), ...(d.couverture !== undefined ? { couverture: d.couverture } : {}), ...(d.style !== undefined ? { style: d.style } : {}),
  };
}
