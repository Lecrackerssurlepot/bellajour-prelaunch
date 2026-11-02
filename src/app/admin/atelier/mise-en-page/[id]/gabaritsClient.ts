/**
 * Les gabarits enregistrés (lot 4), vus du navigateur : les charger à l'ouverture, en enregistrer un depuis une page
 * retouchée. Les règles vivent dans `@/lib/mise-en-page/gabaritsAtelier` (pur) ; ici seulement le réseau.
 */

import { enregistrerGabarits, gabaritsEnregistres, type Cible, type Disposition } from "@/lib/mise-en-page/magazine";
import { gabaritDepuisDisposition, ligneEnTemplate, type LigneGabarit } from "@/lib/mise-en-page/gabaritsAtelier";

const ROUTE = "/api/admin/atelier/mise-en-page/gabarits";

/** Charge les gabarits actifs dans le catalogue de l'éditeur. Muet en cas d'échec : l'éditeur marche sans eux. */
export async function chargerGabarits(): Promise<boolean> {
  try {
    const r = await fetch(ROUTE, { cache: "no-store" });
    if (!r.ok) return false;
    const j = (await r.json()) as { gabarits?: LigneGabarit[] };
    if (!Array.isArray(j.gabarits)) return false;
    enregistrerGabarits(j.gabarits.flatMap((l) => { const t = ligneEnTemplate(l); return t ? [t] : []; }));
    return true;
  } catch {
    return false;
  }
}

/** Le nom proposé : la portée, le nombre de photos et le jour (« Page · 3 photos · 03/11 »). */
export function nomParDefaut(cible: Cible, n: number, maintenant = new Date()): string {
  const jour = maintenant.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });
  return `${cible === "double" ? "Double" : "Page"} · ${n} photo${n > 1 ? "s" : ""} · ${jour}`;
}

/** Enregistre la page retouchée comme gabarit. Rend le mot à afficher. */
export async function enregistrerGabarit(d: Disposition, cible: Cible): Promise<{ ok: boolean; texte: string }> {
  const n = d.photos.filter((a) => a.photoId).length;
  const g = gabaritDepuisDisposition(d, cible, nomParDefaut(cible, n));
  if (!g) return { ok: false, texte: "Rien à enregistrer" };
  try {
    const r = await fetch(ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(g) });
    if (r.status === 503) return { ok: false, texte: "Table des gabarits absente" };
    if (!r.ok) return { ok: false, texte: "Gabarit non enregistré" };
    const j = (await r.json()) as { gabarit?: LigneGabarit };
    const t = j.gabarit ? ligneEnTemplate(j.gabarit) : null;
    if (t) enregistrerGabarits([t, ...gabaritsEnregistres()]);
    return { ok: true, texte: "Gabarit enregistré" };
  } catch {
    return { ok: false, texte: "Hors ligne : gabarit non enregistré" };
  }
}
