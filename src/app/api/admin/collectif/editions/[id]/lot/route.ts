import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { LOT_TTL_SECONDS, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { clePersonne } from "@/lib/collectif/dossiers";
import { cleDuLien, dansLeLot, deposantsParLien, estCleDeLien, personneDeLaPhoto } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { dossierDuLot, nomsDuLotCollectif } from "@/lib/collectif/lotCollectif";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/editions/[id]/lot — les photos à télécharger,
 * toutes, celles d'UN LIEN, ou celles d'UNE PERSONNE d'un lien (PRD §8 :
 * « téléchargement du lot par provenance » ; T-193, le lien porte le nom que le
 * responsable lui a donné). `{ lien?: clé, personne?: nom comparé, selection?: true }` :
 * - `lien` est une clé de `cleDuLien` (`lien:<id>`, `participants`, `vous`,
 *   `atelier`), jamais un libellé : deux liens peuvent porter le même nom ;
 * - `personne` est un nom comparé (`clePersonne`), celui que la fiche a rendu ;
 * - `selection` ne rend que les photos de « Ma sélection » du client (T-182).
 *
 * Rend des URL signées (deux heures) et des NOMS de fichiers (`lotCollectif.ts` :
 * « <rang> - <lien> - <personne> - <date> - <nom d'origine> ») ; pour « tout le
 * lot », le sous-dossier de chaque lien. Le navigateur de l'atelier écrit
 * lui-même sur le disque : pas de zip, rien ne transite par une fonction Vercel
 * (même raison que le lot du B2C). `src/lib/atelier/lot.ts`, qui nomme le lot
 * d'un particulier, n'est pas touché.
 * Les photos signalées « à ne pas publier » sont incluses, marquées : c'est
 * l'atelier qui juge.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ligne = {
  id: string;
  r2_key: string;
  nom_origine: string | null;
  provenance_type: string;
  provenance_id: string | null;
  role_deposant: string;
  appareil_id: string | null;
  deposant: string | null;
  prise_le: string | null;
  signalee: boolean;
  preselection: boolean;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let lien: string | null = null;
  let personne: string | null = null;
  let selection = false;
  try {
    const b = (await request.json()) as { lien?: unknown; personne?: unknown; selection?: unknown; provenance?: unknown };
    if (b.lien !== undefined && b.lien !== null) {
      if (!estCleDeLien(b.lien)) return NextResponse.json({ error: "lien_inconnu", message: "Ce lien n'existe pas dans cette édition. Recharger la page." }, { status: 400 });
      lien = b.lien;
    }
    if (typeof b.personne === "string" && b.personne.trim()) personne = clePersonne(b.personne.slice(0, 200));
    selection = b.selection === true;
    /* Une page ouverte avant cette mise à jour envoie encore un LIBELLÉ. Le prendre pour « tout le
       lot » écrirait toutes les photos dans un dossier qui porterait le nom d'un seul lien. */
    if (lien === null && typeof b.provenance === "string" && b.provenance) {
      return NextResponse.json({ error: "page_ancienne", message: "Cette page date d'avant la mise à jour. La recharger, puis relancer le téléchargement." }, { status: 400 });
    }
  } catch {
    lien = null;
  }
  if (personne !== null && lien === null) return NextResponse.json({ error: "lien_inconnu", message: "Une personne se télécharge depuis son lien." }, { status: 400 });

  /* T-167 : le COMPTE d'abord, puis les lignes par tranches de 1 000 (le plafond de l'API).
     Lues d'un coup, les photos s'arrêtaient à 1 000 sans erreur et l'atelier composait le
     magazine sans les autres. Une photo arrivée PENDANT la lecture s'ajoute à la fin (tri
     par `confirmee_le`) : lire plus que le compte n'est pas une perte, lire moins en est une. */
  const supabase = makeSupabase();
  /* Hors corbeille (migration 20261023) : une photo supprimée ne part pas dans le lot ; sans la
     colonne, le compte et les lignes se lisent sans le filtre. Le compte et la lecture suivent
     LA MÊME règle (`avec` est retenu) : sinon `lot_incomplet` se tromperait. */
  const compte = await lireHorsCorbeille((avec) => {
    /* Le compte exact en GET `limit(0)` (aucune ligne), jamais `head` : un HEAD filtré sur la corbeille
       rend, sans la migration, une erreur sans code que le repli ne reconnaîtrait pas (horsCorbeille.ts). */
    const q = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", id).not("confirmee_le", "is", null);
    return (avec ? q.is("supprimee_le", null) : q).limit(0);
  });
  if (compte.error) {
    if (tableAbsente(compte.error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const [lues, liensLus, edition] = await Promise.all([
    lireToutesLesLignes<Ligne>(
      () => {
        const q = supabase
          .from("collectif_photos")
          .select("id, r2_key, nom_origine, provenance_type, provenance_id, role_deposant, appareil_id, deposant, prise_le, signalee, preselection")
          .eq("edition_id", id)
          .not("confirmee_le", "is", null);
        return (compte.avec ? q.is("supprimee_le", null) : q).returns<Ligne[]>();
      },
      { colonne: "confirmee_le", croissant: true },
      "photos du lot"
    ),
    /* Les NOMS des liens : un lot sans eux n'a ni dossier ni nom de fichier justes, il ne part pas. */
    supabase.from("collectif_provenances").select("id, libelle").eq("edition_id", id).order("created_at", { ascending: true }).returns<{ id: string; libelle: string | null }[]>(),
    supabase.from("collectif_editions").select("responsable_nom").eq("id", id).maybeSingle<{ responsable_nom: string | null }>(),
  ]);
  const { data, error } = lues;
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (liensLus.error || edition.error) {
    console.error("[collectif] lot : liens ou responsable illisibles", liensLus.error?.code ?? edition.error?.code);
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const total = compte.count;
  if (total === null || data.length < total) {
    const message =
      total === null
        ? "Le nombre de photos de l'édition est illisible : aucun lot n'est préparé. Réessayer."
        : `${data.length.toLocaleString("fr-FR")} photos lues sur ${total.toLocaleString("fr-FR")} arrivées : le lot serait incomplet, rien n'est écrit. Réessayer.`;
    console.error(`[collectif] lot de l'édition ${id} : ${data.length} lues, ${total ?? "?"} comptées`);
    return NextResponse.json({ error: "lot_incomplet", message, lues: data.length, total }, { status: 500 });
  }

  const responsable = edition.data?.responsable_nom ?? null;
  /* Le NOM de chaque lien et l'orthographe de chaque personne, les mêmes qu'à l'écran (`deposantsParLien` :
     unique, « Bateau 1 (2) » au besoin ; « Mathias » et « mathias » sont une personne, sous la graphie la
     plus fréquente). */
  const groupes = deposantsParLien(data, liensLus.data ?? [], responsable);
  const noms = new Map(groupes.map((g) => [g.cle, g.nom]));
  const graphies = new Map(groupes.flatMap((g) => g.personnes.map((x) => [`${g.cle}|${x.cle}`, x.nom] as const)));
  const nomDePersonneDe = (p: Ligne) => {
    const brut = personneDeLaPhoto(p, responsable);
    return graphies.get(`${cleDuLien(p)}|${clePersonne(brut)}`) ?? brut;
  };
  const lot = data.filter((p) => dansLeLot(p, lien, personne, responsable) && (!selection || p.preselection));
  /* « Tout le lot » : un sous-dossier par lien. Un lot déjà borné à un lien, une personne ou la sélection n'en a pas. */
  const separer = lien === null && !selection;
  const fichiers = nomsDuLotCollectif(
    lot.map((p) => ({
      nom: p.signalee ? `A-NE-PAS-PUBLIER ${p.nom_origine ?? "photo"}` : p.nom_origine,
      priseLe: p.prise_le,
      groupe: cleDuLien(p),
      lien: noms.get(cleDuLien(p)) ?? "Lien de contribution",
      personne: nomDePersonneDe(p),
    })),
    separer
  );
  const photos = await Promise.all(
    lot.map(async (p, i) => {
      try {
        return { nom: fichiers[i].nom, dossier: fichiers[i].dossier, url: await signerGet(p.r2_key, LOT_TTL_SECONDS, fichiers[i].nom) };
      } catch {
        return { nom: fichiers[i].nom, dossier: fichiers[i].dossier, url: null };
      }
    })
  );
  /* Le dossier du lot : le nom du lien et celui de la personne, tels que l'écran les montre. */
  const nomPersonne = personne === null ? null : (lot[0] ? nomDePersonneDe(lot[0]) : null);
  const dossier = dossierDuLot({ lien: lien === null ? null : (noms.get(lien) ?? null), personne: nomPersonne, selection });
  /* `total` : les photos arrivées de l'édition, comptées par la base (le lot d'un lien, d'une personne
     ou de la sélection en est une part) ; `lues` : celles que la lecture a rendues. */
  return NextResponse.json({ photos, dossier, lien, personne, selection, total, lues: data.length });
}
