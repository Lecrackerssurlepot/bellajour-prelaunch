/**
 * Les réponses communes des routes publiques du B2B (`/api/collectif/*`).
 * Serveur uniquement.
 *
 * Un token inconnu, archivé, ou d'une autre porte rend la MÊME réponse qu'un
 * interrupteur fermé : 404, sans corps qui distingue (pas d'annuaire, PRD
 * §10). La migration absente rend un vrai 503 qui le dit.
 */

import { NextResponse } from "next/server";
import type { Acces } from "./acces";
import { ERREUR_MIGRATION_ABSENTE, ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "./migration";
import type { Changement } from "./personnesServeur";

export function refusAcces(acces: Acces): NextResponse | null {
  if (acces.statut === "ferme" || acces.statut === "introuvable") {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }
  if (acces.statut === "migration_absente") {
    return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
  }
  return null;
}

/** Le lien d'équipe (ou tout rôle sans le droit) : 403, et la phrase le dit. */
export function refusDroit(): NextResponse {
  return NextResponse.json(
    { error: "lecture_seule", message: "Ce lien permet de tout voir, sans rien modifier." },
    { status: 403 }
  );
}

/** Le corps JSON d'une requête, ou `null` s'il est illisible. */
export async function lireCorps(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const c = (await request.json()) as unknown;
    return c && typeof c === "object" ? (c as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Une issue de renommage, de fusion ou de défusion (`personnesServeur.ts`), en
 * réponse HTTP : la même pour la route du responsable et celle de l'atelier.
 */
export function repondreChangement(r: Changement & { evenement?: string }): NextResponse {
  if (r.statut === "ok") return NextResponse.json({ ok: true, n: r.n, nom: r.nom, journal: r.journal, ...(r.evenement ? { evenement: r.evenement } : {}) });
  if (r.statut === "introuvable") return NextResponse.json({ error: "personne_introuvable", message: "Cette personne n'existe plus dans l'édition. Recharger la page." }, { status: 404 });
  if (r.statut === "refuse") return NextResponse.json({ error: "refuse", message: r.message }, { status: 409 });
  if (r.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
  return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
}
