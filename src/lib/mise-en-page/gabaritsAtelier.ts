/**
 * Les gabarits enregistrés par l'atelier (lot 4, table `mep_gabarits`) : ce qu'une page retouchée devient, ce que
 * le serveur accepte d'écrire, et comment une ligne redevient un `Template`. Module PUR : ni réseau, ni table.
 */

import { PLANCHE_L } from "./geometrie";
import { cadresPropres, miroirCadre, templateParId, type Cible, type Disposition } from "./magazine";
import { cadreValide } from "./sauvegarde";
import { signatureDe, type Aplat, type Cadre, type Portee, type Template } from "./types";

/** Le nom d'un gabarit : borne technique d'une ligne d'écran. */
export const NOM_GABARIT_MAX = 80;
export const MIGRATION_MEP_GABARITS = "supabase/migrations/20261103_mep_gabarits.sql";
export const ERREUR_MEP_GABARITS_ABSENTE = "migration_mep_gabarits_absente";

export type GabaritAEnregistrer = { nom: string; portee: Portee; cadres: Cadre[]; decor: Aplat[] | null };

const estAplat = (a: unknown): a is Aplat => {
  if (typeof a !== "object" || a === null) return false;
  const o = a as Record<string, unknown>;
  const fini = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  return Object.keys(o).every((k) => ["x", "y", "l", "h", "teinte"].includes(k)) && fini(o.x) && fini(o.y) && fini(o.l) && fini(o.h)
    && (o.l as number) > 0 && (o.h as number) > 0 && ["aplat", "noir", "blanc"].includes(o.teinte as string);
};

/** Ce que l'écran voit d'une disposition, en gabarit : ses cadres (miroir appliqué) et le décor de son gabarit d'origine. */
export function gabaritDepuisDisposition(d: Disposition, cible: Cible, nom: string): GabaritAEnregistrer | null {
  const cadres = cadresPropres(d, cible);
  if (!cadres || !cadres.some((c) => c.role === "photo")) return null;
  const t = templateParId(d.templateId);
  const portee: Portee = cible === "double" ? "double" : "page";
  const decorT = t && t.portee === portee ? t.decor ?? [] : [];
  const miroir = cible === "double" && !!d.miroir;
  return {
    nom,
    portee,
    cadres: cadres.map((c) => (miroir ? miroirCadre(c, PLANCHE_L) : { ...c })),
    decor: decorT.length ? decorT.map((a) => (miroir ? { ...a, x: PLANCHE_L - a.x - a.l } : { ...a })) : null,
  };
}

/** Le corps d'un POST, relu champ par champ : rien n'est cru du navigateur. */
export function gabaritValide(v: unknown): GabaritAEnregistrer | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const nom = typeof o.nom === "string" ? o.nom.trim() : "";
  if (!nom || nom.length > NOM_GABARIT_MAX) return null;
  if (o.portee !== "page" && o.portee !== "double") return null;
  if (!Array.isArray(o.cadres) || o.cadres.length === 0 || o.cadres.length > 40 || !o.cadres.every(cadreValide)) return null;
  const cadres = o.cadres as Cadre[];
  const n = cadres.filter((c) => c.role === "photo").length;
  if (n < 1 || n > (o.portee === "page" ? 6 : 12)) return null;
  const decor = o.decor === null || o.decor === undefined ? null : Array.isArray(o.decor) && o.decor.length <= 20 && o.decor.every(estAplat) ? (o.decor as Aplat[]) : undefined;
  if (decor === undefined) return null;
  return { nom, portee: o.portee, cadres, decor };
}

export type LigneGabarit = { id: string; nom: string; portee: string; cadres: unknown; decor: unknown };

/** Une ligne de la table, redevenue un gabarit de l'éditeur (id « M-<uuid> ») ; null si elle ne se relit plus. */
export function ligneEnTemplate(l: LigneGabarit): Template | null {
  const g = gabaritValide({ nom: l.nom, portee: l.portee, cadres: l.cadres, decor: l.decor });
  if (!g || typeof l.id !== "string") return null;
  return {
    id: `M-${l.id}`, nom: g.nom, portee: g.portee, nbPhotos: g.cadres.filter((c) => c.role === "photo").length, signature: signatureDe(g.cadres),
    attribut: "original", origine: "atelier", cadres: g.cadres, ...(g.decor ? { decor: g.decor } : {}),
  };
}
