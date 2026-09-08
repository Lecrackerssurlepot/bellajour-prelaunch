/**
 * GET /api/admin/atelier/carnet/export — le carnet en un fichier.
 *
 * LECTURE SEULE : aucune écriture, aucun mail, aucun état. Et surtout, rien
 * ne « sort » de lui-même : le fichier descend sur le poste de la personne
 * qui clique, à sa demande. Aucun envoi, aucun tiers.
 *
 * Deux formats, deux usages :
 *   — `txt` (défaut) : les notes à la suite, pour LES LIRE. C'est le format
 *     qui sert à écrire le livre de règles de composition ;
 *   — `csv` : pour trier dans un tableur. Séparateur « ; » et BOM UTF-8, la
 *     convention des Excel francophones — même choix que l'export des
 *     métriques, sans lui Excel lit du latin-1 et massacre les accents.
 *
 * Le filtre passé en paramètres est appliqué ICI, par le MÊME module pur que
 * l'écran (`@/lib/atelier/carnet`). Sans ce partage, le fichier téléchargé
 * finirait par ne plus contenir ce que l'écran montrait.
 *
 * Même défense en profondeur que toute route /api/admin/* : le middleware
 * vérifie le cookie HMAC, et la route re-vérifie via `quiEstConnecteRequete`.
 */

import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { chargerCarnet } from "@/app/admin/atelier/carnet";
import {
  csvCarnet,
  filtreGenre,
  filtrerNotes,
  joursDePeriode,
  libelleGenre,
  periodeCarnet,
  texteCarnet,
  type GenreNote,
  type PeriodeCarnet,
} from "@/lib/atelier/carnet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function labelPeriode(p: PeriodeCarnet): string {
  return p === "tout" ? "depuis toujours" : `${p} derniers jours`;
}

/* Le titre du fichier texte dit le filtre appliqué : on relit un export trois
   semaines plus tard sans savoir ce qu'il contient. Rien quand tout passe. */
function labelGenre(g: GenreNote | "sans" | null): string {
  if (g === null) return "";
  return g === "sans" ? " · sans genre" : ` · ${libelleGenre(g).toLowerCase()}`;
}

function nomFichier(periode: PeriodeCarnet, ext: string): string {
  const jour = new Date().toISOString().slice(0, 10);
  const p = periode === "tout" ? "tout" : `${periode}j`;
  return `bellajour-carnet-${p}-${jour}.${ext}`;
}

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "txt";
  const periode = periodeCarnet(url.searchParams.get("p"));
  /* `filtreGenre` et pas la chaîne brute : un paramètre inconnu vaut « tous »
     plutôt que « aucune note », sinon un lien mal recopié rendrait un fichier
     vide qui se lirait « nous n'avons jamais rien noté ». */
  const genre = filtreGenre(url.searchParams.get("genre"));
  const filtre = {
    q: url.searchParams.get("q") ?? "",
    dossier: url.searchParams.get("dossier") ?? "",
    qui: url.searchParams.get("qui") ?? "",
    genre,
    jours: joursDePeriode(periode),
  };

  try {
    const vue = await chargerCarnet();
    /* La table manque : on refuse un fichier vide, qui se lirait « nous
       n'avons jamais rien noté » et vaudrait pire que rien. */
    if (vue.indisponible) {
      return NextResponse.json({ error: "carnet_indisponible" }, { status: 503 });
    }

    const notes = filtrerNotes(vue.notes, filtre);

    if (format === "csv") {
      /* Le BOM en tête : sans lui, Excel ouvre le fichier en latin-1. */
      const corps = "\uFEFF" + csvCarnet(notes);
      return new NextResponse(corps, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${nomFichier(periode, "csv")}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const label = labelPeriode(periode);
    const corps = texteCarnet(
      notes,
      `Bellajour · le carnet de l'atelier · ${label}${labelGenre(genre)} · ${notes.length} note${notes.length > 1 ? "s" : ""}`,
    );
    return new NextResponse(corps, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nomFichier(periode, "txt")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[carnet/export] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
