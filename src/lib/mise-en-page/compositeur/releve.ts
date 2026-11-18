/**
 * LE RELEVÉ DES DIFFÉRENCES (18/11/2026, retour de Mathias : « Je repasserai après toi pour qu'on puisse analyser les différences »).
 *
 * La proposition de la machine est gardée TELLE QUELLE avec le projet (magazine chargé, couverture comprise, version des règles et des
 * réglages). `releverDifferences` compare l'état courant du magazine à cette proposition et rend chaque différence en mots d'atelier,
 * RATTACHÉE à la décision de la machine qui l'avait posée, donc à sa règle :
 *   - une photo → sa `PhotoChoisie` (état, raison, règles) ;
 *   - une double → son `PourquoiDouble` (« N photos ici parce que… ») ;
 *   - un gabarit → les décisions de pose de cette planche (`Decision.quoi === "planche N"`) ;
 *   - sinon une règle par défaut NOMMÉE (`REGLES_PAR_DEFAUT`).
 * Les planches se reconnaissent par leur `id` (le premier jet garde les ids de la machine ; une double insérée prend un id neuf, une
 * double supprimée disparaît), les photos par `photoId`.
 * `leconsDesDifferences` en fait des leçons `ecart_proposition` (une par différence, la règle principale en `regle`).
 *
 * Module pur : ni React, ni réseau, ni horloge. Déterministe : l'ordre suit les planches de l'état courant, puis le type, puis la photo.
 */

import { cadresDe, ID_DERNIERE, type Affectation, type Disposition, type Magazine, type Planche } from "../magazine";
import type { Lecon } from "../editeur/lecons";
import { valeursReglages, versionReglages } from "../editeur/reglages";
import type { Decision, PhotoChoisie, PourquoiDouble, Selection } from "./types";

/** La proposition gardée avec le projet : ce que la machine a chargé, et de quoi rattacher chaque écart à sa décision. */
export type PropositionGardee = {
  magazine: Magazine;
  versionRegles: string;
  /** Les réglages v2 et la fiche en vigueur à la composition (gardés tels quels, résumés dans les leçons). */
  reglages: unknown;
  quand: string;
  selection: Selection;
  decisions: Decision[];
  doubles?: PourquoiDouble[];
};

export const TYPES_DIFFERENCE = [
  "double_ajoutee", "double_supprimee", "gabarit_change", "photo_ajoutee", "photo_retiree", "photo_deplacee", "photo_agrandie", "photo_reduite",
  "recadrage_change", "texte_change", "couverture_gabarit", "couverture_photo",
] as const;
export type TypeDifference = (typeof TYPES_DIFFERENCE)[number];

export type Difference = {
  type: TypeDifference;
  /** En mots d'atelier : « Page 1 », « Double 3 », « Dernière page », « Couverture ». */
  ou: string;
  /** L'id de la planche concernée (ou « couverture »). */
  plancheId: string;
  photo?: string;
  avant?: string;
  apres?: string;
  /** 2 à 6 mots, sans cadratin. */
  phrase: string;
  /** Les règles de la décision de la machine (la première est la principale). */
  regles: string[];
  /** La décision de la machine, en clair (la raison de la photo, la phrase de la double, le détail de pose). */
  decision?: string;
};

/** Les seuils du relevé (valeur, raison) : sous eux, un écart n'est pas un geste de l'atelier mais un arrondi. */
export const SEUILS_RELEVE = {
  /** Une photo dont le cadre gagne ou perd plus de 20 % de surface est agrandie ou réduite. */
  AIRE: { valeur: 0.2, raison: "au-delà de 20 % de surface, l'œil voit une autre taille" },
  ZOOM: { valeur: 0.05, raison: "un zoom qui bouge de 5 % change ce qu'on voit" },
  /** En mm du cadre. */
  DECALAGE: { valeur: 1, raison: "un glissement d'un millimètre au moins" },
} as const;

/** Les règles par défaut quand aucune décision de la machine ne nomme la sienne. */
export const REGLES_PAR_DEFAUT: Readonly<Record<TypeDifference, string[]>> = {
  double_ajoutee: ["M-15", "N-48"],
  double_supprimee: ["N-48"],
  gabarit_change: ["P-08"],
  photo_ajoutee: ["M-09"],
  photo_retiree: ["S-001"],
  photo_deplacee: ["N-48"],
  photo_agrandie: ["N-49"],
  photo_reduite: ["N-49"],
  recadrage_change: ["M-29", "N-55"],
  texte_change: ["M-24", "I-06"],
  couverture_gabarit: ["M-03"],
  couverture_photo: ["M-03", "M-04", "M-10"],
};

const PHRASE: Readonly<Record<TypeDifference, string>> = {
  double_ajoutee: "Double ajoutée",
  double_supprimee: "Double supprimée",
  gabarit_change: "Gabarit changé",
  photo_ajoutee: "Photo ajoutée",
  photo_retiree: "Photo retirée",
  photo_deplacee: "Photo déplacée",
  photo_agrandie: "Photo agrandie",
  photo_reduite: "Photo réduite",
  recadrage_change: "Recadrage changé",
  texte_change: "Texte changé",
  couverture_gabarit: "Gabarit de couverture changé",
  couverture_photo: "Photo de couverture changée",
};

type Cote = "double" | "gauche" | "droite";
type Place = { plancheId: string; index: number; cote: Cote; k: number; aire: number; aff: Affectation; templateId: string };

const dispositionsDe = (p: Planche): [Cote, Disposition][] =>
  (p.mode === "double" ? [["double", p.double]] : [["gauche", p.gauche], ["droite", p.droite]] as [Cote, Disposition | null][])
    .filter((x): x is [Cote, Disposition] => !!x[1]);

/** Où est chaque photo d'un magazine (la première occurrence), avec la surface de son cadre en mm². */
function places(m: Magazine): Map<string, Place> {
  const out = new Map<string, Place>();
  m.planches.forEach((p, index) => {
    for (const [cote, d] of dispositionsDe(p)) {
      const cadres = cadresDe(d, cote).filter((c) => c.role === "photo");
      d.photos.forEach((a, k) => {
        if (!a.photoId || out.has(a.photoId)) return;
        const c = cadres[k];
        out.set(a.photoId, { plancheId: p.id, index, cote, k, aire: c ? c.l * c.h : 0, aff: a, templateId: d.templateId });
      });
    }
  });
  return out;
}

/** « Page 1 », « Double 3 », « Dernière page » : le nom d'une planche par sa place dans son magazine. */
export function nomPlanche(m: Magazine, index: number): string {
  const p = m.planches[index];
  if (index === 0) return "Page 1";
  if (p?.id === ID_DERNIERE || (m.derniere && index === m.planches.length - 1)) return "Dernière page";
  return `Double ${index}`;
}

const signature = (p: Planche): string => (p.mode === "double" ? `double:${p.double?.templateId ?? "-"}` : `pages:${p.gauche?.templateId ?? "-"}|${p.droite?.templateId ?? "-"}`);
const textes = (p: Planche): string => dispositionsDe(p).flatMap(([, d]) => d.textes.map((t) => t.contenu.trim())).filter(Boolean).join(" / ");
const court = (s: string, n = 80): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const uniques = (l: readonly string[]): string[] => [...new Set(l.filter(Boolean))];

export function releverDifferences(proposition: PropositionGardee, courant: Magazine): Difference[] {
  const prop = proposition.magazine;
  const choisie = new Map<string, PhotoChoisie>(proposition.selection.photos.map((x) => [x.id, x]));
  /* la double (PourquoiDouble) et les décisions de pose, par INDEX de planche dans le magazine proposé */
  const pourquoi = new Map<number, PourquoiDouble>((proposition.doubles ?? []).map((d) => [d.planche, d]));
  const decisionsDe = new Map<number, Decision[]>();
  for (const d of proposition.decisions) {
    const k = /^planche (\d+)$/.exec(d.quoi);
    if (!k) continue;
    const n = Number(k[1]);
    decisionsDe.set(n, [...(decisionsDe.get(n) ?? []), d]);
  }
  const indexProp = new Map(prop.planches.map((p, i) => [p.id, i]));
  const indexCour = new Map(courant.planches.map((p, i) => [p.id, i]));
  const reglesPlanche = (i: number | undefined, defaut: TypeDifference): { regles: string[]; decision?: string } => {
    if (i === undefined) return { regles: REGLES_PAR_DEFAUT[defaut] };
    const pq = pourquoi.get(i);
    if (pq) return { regles: uniques(pq.regles).length ? uniques(pq.regles) : REGLES_PAR_DEFAUT[defaut], decision: pq.phrase };
    const ds = decisionsDe.get(i) ?? [];
    const r = uniques(ds.flatMap((d) => d.regles));
    return r.length ? { regles: r, decision: court(ds.map((d) => d.detail).join(" ; ")) } : { regles: REGLES_PAR_DEFAUT[defaut] };
  };
  const reglesGabarit = (i: number | undefined): { regles: string[]; decision?: string } => {
    const ds = i === undefined ? [] : decisionsDe.get(i) ?? [];
    const r = uniques(ds.flatMap((d) => d.regles));
    return r.length ? { regles: r, decision: court(ds.map((d) => d.detail).join(" ; ")) } : reglesPlanche(i, "gabarit_change");
  };
  const reglesPhoto = (id: string, defaut: TypeDifference): { regles: string[]; decision?: string } => {
    const c = choisie.get(id);
    return c && c.regles.length ? { regles: uniques(c.regles), decision: c.raison } : { regles: REGLES_PAR_DEFAUT[defaut], ...(c ? { decision: c.raison } : {}) };
  };

  const out: (Difference & { _ordre: number; _sous: number })[] = [];
  const ordreDe = (plancheId: string): number => indexCour.get(plancheId) ?? (indexProp.has(plancheId) ? indexProp.get(plancheId)! + 0.5 : 1e6);
  const pousser = (d: Difference) => out.push({ ...d, _ordre: d.plancheId === "couverture" ? -1 : ordreDe(d.plancheId), _sous: TYPES_DIFFERENCE.indexOf(d.type) });
  const ouDe = (plancheId: string): string => (indexCour.has(plancheId) ? nomPlanche(courant, indexCour.get(plancheId)!) : indexProp.has(plancheId) ? nomPlanche(prop, indexProp.get(plancheId)!) : "Magazine");

  /* 1. les doubles ajoutées ou supprimées */
  for (const p of courant.planches) if (!indexProp.has(p.id)) pousser({ type: "double_ajoutee", ou: ouDe(p.id), plancheId: p.id, phrase: PHRASE.double_ajoutee, regles: REGLES_PAR_DEFAUT.double_ajoutee });
  for (const p of prop.planches) {
    if (indexCour.has(p.id)) continue;
    const r = reglesPlanche(indexProp.get(p.id), "double_supprimee");
    pousser({ type: "double_supprimee", ou: ouDe(p.id), plancheId: p.id, phrase: PHRASE.double_supprimee, ...r });
  }
  /* 2. les planches gardées : gabarit, textes */
  for (const p of courant.planches) {
    const i = indexProp.get(p.id);
    if (i === undefined) continue;
    const q = prop.planches[i];
    if (signature(p) !== signature(q)) pousser({ type: "gabarit_change", ou: ouDe(p.id), plancheId: p.id, avant: signature(q), apres: signature(p), phrase: PHRASE.gabarit_change, ...reglesGabarit(i) });
    const ta = textes(q), tb = textes(p);
    if (ta !== tb) pousser({ type: "texte_change", ou: ouDe(p.id), plancheId: p.id, avant: court(ta), apres: court(tb), phrase: PHRASE.texte_change, regles: REGLES_PAR_DEFAUT.texte_change });
  }
  /* 3. les photos */
  const pa = places(prop), pb = places(courant);
  for (const [id, a] of pa) {
    if (pb.has(id)) continue;
    pousser({ type: "photo_retiree", ou: ouDe(a.plancheId), plancheId: a.plancheId, photo: id, phrase: PHRASE.photo_retiree, ...reglesPhoto(id, "photo_retiree") });
  }
  for (const [id, b] of pb) {
    const a = pa.get(id);
    if (!a) {
      const c = choisie.get(id);
      const phrase = c?.etat === "reserve" ? "Photo ajoutée depuis la réserve" : c?.etat === "ecartee" ? "Photo écartée remise" : c?.etat === "couverture" ? "Photo de couverture ajoutée" : PHRASE.photo_ajoutee;
      pousser({ type: "photo_ajoutee", ou: ouDe(b.plancheId), plancheId: b.plancheId, photo: id, ...(c ? { avant: c.etat } : {}), phrase, ...reglesPhoto(id, "photo_ajoutee") });
      continue;
    }
    if (a.plancheId !== b.plancheId) {
      const r = reglesPhoto(id, "photo_deplacee");
      const rp = reglesPlanche(a.index, "photo_deplacee");
      pousser({ type: "photo_deplacee", ou: ouDe(b.plancheId), plancheId: b.plancheId, photo: id, avant: ouDe(a.plancheId), apres: ouDe(b.plancheId), phrase: `Photo déplacée en ${ouDe(b.plancheId).toLowerCase()}`, regles: uniques([...rp.regles, ...r.regles]), ...(rp.decision ? { decision: rp.decision } : r.decision ? { decision: r.decision } : {}) });
      continue;
    }
    const rapport = a.aire > 0 ? b.aire / a.aire : 1;
    if (rapport > 1 + SEUILS_RELEVE.AIRE.valeur || rapport < 1 / (1 + SEUILS_RELEVE.AIRE.valeur)) {
      const type: TypeDifference = rapport > 1 ? "photo_agrandie" : "photo_reduite";
      const rp = reglesPlanche(a.index, type);
      pousser({ type, ou: ouDe(b.plancheId), plancheId: b.plancheId, photo: id, avant: `${Math.round(a.aire / 100)} cm²`, apres: `${Math.round(b.aire / 100)} cm²`, phrase: PHRASE[type], ...rp });
      continue;
    }
    /* le recadrage : seulement dans le même cadre (un autre gabarit recadre de lui-même, ce n'est pas un geste de recadrage) */
    if (a.templateId === b.templateId && a.k === b.k) {
      const ra = a.aff.recadrage, rb = b.aff.recadrage;
      if (Math.abs(ra.zoom - rb.zoom) > SEUILS_RELEVE.ZOOM.valeur || Math.abs(ra.dx - rb.dx) >= SEUILS_RELEVE.DECALAGE.valeur || Math.abs(ra.dy - rb.dy) >= SEUILS_RELEVE.DECALAGE.valeur) {
        const r = reglesPhoto(id, "recadrage_change");
        pousser({ type: "recadrage_change", ou: ouDe(b.plancheId), plancheId: b.plancheId, photo: id, avant: `×${ra.zoom.toFixed(2)}`, apres: `×${rb.zoom.toFixed(2)}`, phrase: PHRASE.recadrage_change, regles: uniques([...REGLES_PAR_DEFAUT.recadrage_change, ...r.regles]), ...(r.decision ? { decision: r.decision } : {}) });
      }
    }
  }
  /* 4. la couverture */
  const ca = prop.couverture, cb = courant.couverture;
  if ((ca?.templateId ?? null) !== (cb?.templateId ?? null)) pousser({ type: "couverture_gabarit", ou: "Couverture", plancheId: "couverture", avant: ca?.templateId ?? "aucune", apres: cb?.templateId ?? "aucune", phrase: PHRASE.couverture_gabarit, regles: REGLES_PAR_DEFAUT.couverture_gabarit });
  const photosCouv = (c: Magazine["couverture"]): string[] => (c?.photos ?? []).map((x) => x.photoId).filter((x): x is string => !!x);
  const la = photosCouv(ca), lb = photosCouv(cb);
  if (la.join("|") !== lb.join("|")) {
    const nouvelle = lb.find((id) => !la.includes(id));
    pousser({ type: "couverture_photo", ou: "Couverture", plancheId: "couverture", ...(nouvelle ? { photo: nouvelle } : {}), avant: la.join(", ") || "aucune", apres: lb.join(", ") || "aucune", phrase: PHRASE.couverture_photo, regles: REGLES_PAR_DEFAUT.couverture_photo });
  }
  return out
    .sort((x, y) => x._ordre - y._ordre || x._sous - y._sous || (x.photo ?? "").localeCompare(y.photo ?? ""))
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ _ordre: _o, _sous: _s, ...d }) => d);
}

/** Le résumé des réglages gardés (pour la leçon : 200 signes au plus). */
function resumeReglages(r: unknown): string {
  if (!r || typeof r !== "object") return "";
  const o = r as Record<string, unknown>;
  const v2 = o.v2 && typeof o.v2 === "object" ? (o.v2 as Record<string, unknown>) : o;
  return ["densite", "lieux", "recadrage", "entorses"].map((k) => (typeof v2[k] === "string" ? `${k} ${v2[k]}` : "")).filter(Boolean).join(", ");
}

/** Le contexte d'une leçon d'écart : la version des règles et les réglages de la proposition. */
export type ContexteEcarts = { versionRegles: string; reglages: unknown };

/** Une règle tient dans la colonne `regle` (8 signes) : sinon la première par défaut du type. */
const regleCourte = (d: Difference): string => [...d.regles, ...REGLES_PAR_DEFAUT[d.type]].find((r) => r.length > 0 && r.length <= 8) ?? "P-08";

/**
 * Les leçons des différences : une par différence, de type `ecart_proposition`, la règle principale en `regle` (`correctionsParRegle` les
 * compte par règle), la version des règles et les réglages de la composition dans `proposition`, ce que l'atelier a fait dans `geste`.
 */
export function leconsDesDifferences(diffs: readonly Difference[], contexte: ContexteEcarts): Lecon[] {
  const reglages = valeursReglages(), version = versionReglages();
  const rs = resumeReglages(contexte.reglages);
  return diffs.map((d) => ({
    type: "ecart_proposition",
    regle: regleCourte(d),
    photos: d.photo ? [d.photo] : [],
    proposition: court(`${d.type} · ${d.ou}${d.avant ? ` · ${d.avant}` : ""} · règles ${contexte.versionRegles}${rs ? ` · ${rs}` : ""}${d.regles.length > 1 ? ` · aussi ${d.regles.slice(1, 6).join(", ")}` : ""}`, 200),
    geste: court(`${d.phrase}${d.apres ? ` : ${d.apres}` : ""}`, 200),
    reglages, version,
  }));
}
