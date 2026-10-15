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
import { ERREUR_MIGRATION_ABSENTE } from "./migration";

export function refusAcces(acces: Acces): NextResponse | null {
  if (acces.statut === "ferme" || acces.statut === "introuvable") {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }
  if (acces.statut === "migration_absente") {
    return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
  }
  if (acces.statut === "appareil_inconnu") {
    return NextResponse.json(
      { error: "appareil_inconnu", message: "Cet appareil n'est pas encore reconnu : rechargez la page pour recevoir un code." },
      { status: 401 }
    );
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
