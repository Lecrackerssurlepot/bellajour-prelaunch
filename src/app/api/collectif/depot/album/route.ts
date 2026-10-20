import { NextResponse } from "next/server";
import { signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { estAMoi, filtreAlbum, lirePageAlbum, lireVueAlbum, personnesDeLAlbum, TAILLE_PAGE_ALBUM, type FiltreAlbum } from "@/lib/collectif/album";
import { appareilDeRequete, lireLienDeDepot, placeDuParticipant, type LienDeDepot } from "@/lib/collectif/collecte";
import { peutSupprimerSaPhoto } from "@/lib/collectif/corbeille";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { collecteOuverte } from "@/lib/collectif/etats";
import { lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { prenomPourAlbum, type LigneParticipant } from "@/lib/collectif/personnes";
import { comptesDeLaPersonne, participantDeLAppareil } from "@/lib/collectif/personnesServeur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/depot/album — l'ALBUM du lien (« l'album du bateau »,
 * planche 7 du 20/10, T-199). `{ token, p?, vue?: "album" | "miennes", page? }`,
 * token du lien des participants dans le CORPS. N'écrit rien.
 *
 * - `album` : les photos des personnes de CE lien (le lien général : celles du
 *   lien général), arrivées, hors corbeille, et seulement celles dont l'auteur a
 *   accepté l'accord qui le dit (`VERSIONS_ALBUM`, album.ts) ; le PRÉNOM de
 *   chacun ; « Ne pas publier » n'en retire rien. La plus récente d'abord.
 * - `miennes` : celles envoyées depuis CE téléphone sur ce lien (cookie
 *   `bj_depot_appareil`), quelle que soit la version de l'accord.
 * Chaque photo dit si elle est « à moi » et si CE téléphone peut la supprimer
 * (`peutSupprimerSaPhoto`). Après la clôture, l'album reste lisible
 * (`ferme: true`) : rien ne s'y ajoute, rien ne s'y supprime.
 *
 * Sans la migration 20261023 : aucune photo n'est à la corbeille, aucune
 * personne n'est connue (le filtre se rejoue sans elle).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LigneAlbum = {
  id: string;
  vignette_key: string | null;
  r2_key: string;
  mime: string | null;
  deposant: string | null;
  role_deposant: string;
  provenance_id: string | null;
  appareil_id: string | null;
  participant_id?: string | null;
  confirmee_le: string;
};

const COLONNES = "id, vignette_key, r2_key, mime, deposant, role_deposant, provenance_id, appareil_id, confirmee_le";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "depot");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_album")) return refusDroit();
  const { edition } = acces;
  const supabase = makeSupabase();
  const maintenant = new Date();
  const vue = lireVueAlbum(corps.vue);
  const page = lirePageAlbum(corps.page);

  let lien: LienDeDepot | null = null;
  if (corps.p !== undefined && corps.p !== null && corps.p !== "") {
    if (!estCleProvenance(corps.p)) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    const lu = await lireLienDeDepot(supabase, edition.id, corps.p);
    if (lu.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (lu.statut === "inconnu") return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    lien = lu.lien;
  }
  const provenanceId = lien?.id ?? null;

  /* Qui regarde : la personne de ce téléphone (sans la migration : personne, le téléphone seul). */
  const appareil = appareilDeRequete(request);
  let moi: LigneParticipant | null = null;
  if (appareil) {
    const lu = await participantDeLAppareil(supabase, edition.id, appareil);
    if (lu.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (lu.statut === "ok") moi = lu.valeur;
  }
  if (vue === "miennes" && !appareil) {
    return NextResponse.json({ vue, page: 0, suivante: null, photos: [], album: null, moi: null, lien: { nom: lien?.libelle?.trim() || null }, ferme: !collecteOuverte(edition.etat, edition.cloture_le, maintenant) }, { headers: { "cache-control": "private, no-store" } });
  }

  /* Le filtre, posé appel par appel (`filtreAlbum` pour l'album, le téléphone pour « miennes »). */
  const poser = <Q extends { eq(c: string, v: string): Q; is(c: string, v: null): Q; not(c: string, op: string, v: null): Q; in(c: string, v: string[]): Q }>(q: Q, f: FiltreAlbum, avec: boolean): Q => {
    if (f.methode === "eq") return q.eq(f.colonne, f.valeur);
    if (f.methode === "is") return f.colonne === "supprimee_le" && !avec ? q : q.is(f.colonne, null);
    if (f.methode === "not_is") return q.not(f.colonne, "is", null);
    return q.in(f.colonne, f.valeurs);
  };
  const filtres: FiltreAlbum[] =
    vue === "album"
      ? filtreAlbum(provenanceId)
      : [
          ...(provenanceId ? [{ methode: "eq", colonne: "provenance_id", valeur: provenanceId } as const] : [{ methode: "is", colonne: "provenance_id" } as const, { methode: "eq", colonne: "role_deposant", valeur: "participant" } as const]),
          { methode: "not_is", colonne: "confirmee_le" },
          { methode: "is", colonne: "supprimee_le" },
        ];
  const requete = (avec: boolean, colonnes: string) => {
    let q = supabase.from("collectif_photos").select(colonnes).eq("edition_id", edition.id);
    for (const f of filtres) q = poser(q, f, avec);
    if (vue === "miennes" && appareil) {
      q = q.eq("appareil_id", appareil);
      if (avec) q = q.or(moi ? `participant_id.is.null,participant_id.eq.${moi.id}` : "participant_id.is.null");
    }
    return q;
  };

  const [lus, tous] = await Promise.all([
    lireHorsCorbeille((avec) =>
      requete(avec, avec ? `${COLONNES}, participant_id` : COLONNES)
        .order("confirmee_le", { ascending: false })
        .order("id", { ascending: false })
        .range(page * TAILLE_PAGE_ALBUM, page * TAILLE_PAGE_ALBUM + TAILLE_PAGE_ALBUM)
        .returns<LigneAlbum[]>()
    ),
    /* Combien de photos et de personnes dans l'album : à la première page seulement (trois colonnes). */
    vue === "album" && page === 0
      ? lireHorsCorbeille((avec) =>
          lireToutesLesLignes<{ id: string; deposant: string | null; appareil_id: string | null; participant_id?: string | null; confirmee_le: string }>(
            () => requete(avec, avec ? "id, deposant, appareil_id, participant_id, confirmee_le" : "id, deposant, appareil_id, confirmee_le").returns<{ id: string; deposant: string | null; appareil_id: string | null; participant_id?: string | null; confirmee_le: string }[]>(),
            { colonne: "confirmee_le", croissant: true },
            "album du lien"
          )
        )
      : Promise.resolve(null),
  ]);
  if (lus.error || tous?.error) {
    console.error("[collectif] album illisible", lus.error?.code ?? tous?.error?.code);
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const lignes = lus.data ?? [];
  const suivante = lignes.length > TAILLE_PAGE_ALBUM ? page + 1 : null;
  const pageLue = lignes.slice(0, TAILLE_PAGE_ALBUM);

  /* Les prénoms des personnes de la page (jamais leur nom complet, jamais leur adresse). */
  const ids = [...new Set(pageLue.map((p) => p.participant_id).filter((x): x is string => Boolean(x)))];
  const prenoms = new Map<string, string>();
  if (ids.length) {
    const { data, error } = await supabase.from("collectif_participants").select("id, prenom").eq("edition_id", edition.id).in("id", ids).returns<{ id: string; prenom: string }[]>();
    if (error) console.error("[collectif] prénoms de l'album illisibles", error.code);
    for (const p of data ?? []) prenoms.set(p.id, p.prenom);
  }
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, maintenant);
  const photos = await Promise.all(
    pageLue.map(async (p) => {
      let vignette: string | null = null;
      try {
        if (p.vignette_key) vignette = await signerLectureVignette(p.vignette_key);
        else if (p.mime !== "image/heic" && p.mime !== "image/heif") vignette = await signerGet(p.r2_key);
      } catch {
        vignette = null;
      }
      return {
        id: p.id,
        vignette,
        prenom: prenomPourAlbum({ prenom: p.participant_id ? prenoms.get(p.participant_id) : null, deposant: p.deposant }),
        moi: estAMoi(p, moi?.id ?? null, appareil),
        /* Après la clôture, plus rien ne se supprime d'ici : l'album est en lecture. */
        supprimable: ouverte && peutSupprimerSaPhoto({ ...p, supprimee_le: null }, appareil, moi?.id ?? null),
        arrivee: p.confirmee_le,
      };
    })
  );

  const [comptes, place] = await Promise.all([
    comptesDeLaPersonne(supabase, edition.id, moi?.id ?? null, appareil),
    ouverte ? placeDuParticipant(supabase, edition, lien, appareil, moi?.id ?? null, maintenant) : Promise.resolve(null),
  ]);
  return NextResponse.json(
    {
      vue,
      page,
      suivante,
      photos,
      lien: { nom: lien?.libelle?.trim() || null },
      ferme: !ouverte,
      album: tous ? { photos: tous.data?.length ?? 0, personnes: personnesDeLAlbum(tous.data ?? []) } : null,
      moi: {
        participant: moi ? { prenom: moi.prenom, nom: moi.nom } : null,
        photos: comptes?.photos ?? null,
        ceTelephone: comptes?.ceTelephone ?? null,
        place: place && !place.illimitee ? place.place : null,
        sansLimite: Boolean(place?.illimitee),
      },
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
