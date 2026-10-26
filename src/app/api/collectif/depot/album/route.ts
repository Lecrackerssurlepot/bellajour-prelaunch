import { NextResponse } from "next/server";
import { signerLectureVignette } from "@/lib/atelier/r2";
import { creerFrein, ipDeConnexion, ipDuClient } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import {
  comptesDeLAlbum,
  COLONNES_VUE_ALBUM,
  estAMoi,
  filtreAlbum,
  filtreVueAlbum,
  lirePageAlbum,
  lireVueAlbum,
  TAILLE_PAGE_ALBUM,
  VUE_ALBUM,
  type FiltreAlbum,
  type LigneVueAlbum,
} from "@/lib/collectif/album";
import { appareilDeRequete, lireLienDeDepot, placeDuParticipant, type LienDeDepot } from "@/lib/collectif/collecte";
import { peutSupprimerSaPhoto } from "@/lib/collectif/corbeille";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { collecteOuverte } from "@/lib/collectif/etats";
import { cleFreinDepot, FREIN_LARGE, FREINS_DEPOT } from "@/lib/collectif/freins";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { colonneAbsente, tableAbsente } from "@/lib/collectif/migration";
import { prenomPourAlbum, vuePersonneConnue, type LigneParticipant } from "@/lib/collectif/personnes";
import { comptesDeLaPersonne, participantDeLAppareil } from "@/lib/collectif/personnesServeur";
import { lireDepuis } from "@/lib/collectif/depotParticipant";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { phrasePhotosEffacees } from "@/lib/collectif/retention";

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
 * Audit du 20/10 :
 * - S6 : l'album ne signe JAMAIS l'original (il porte l'EXIF, le GPS) : une
 *   photo sans vignette rend `vignette: null` ;
 * - S1 : `moi.participant` ne porte que le prénom (le téléphone parle pour la
 *   personne dont on a TAPÉ l'adresse) ;
 * - C1 : « 214 photos, 9 personnes » se lit dans la vue `collectif_photos_album`
 *   (quelques lignes), plus en relisant toutes les photos du lien ; sans la
 *   vue (migration 20261023 absente), un compte en GET `limit(0)` et
 *   `personnes: null` (jamais un nombre deviné). Un frein par adresse du client
 *   et par lien (`freins.ts`) ; une `Map` par instance, un frein seulement.
 *
 * Sans la migration 20261023 : aucune photo n'est à la corbeille, aucune
 * personne n'est connue (le filtre se rejoue sans elle).
 *
 * Retours du 21/10 : `moi.photos` et `moi.ceTelephone` comptent TOUTE
 * l'édition (tous liens) ; ce qui sert à « Mes photos » se compte PAR LIEN :
 * `total` (page 0 de « miennes ») et `moi.autresAppareils` (page 0 : mes photos
 * de ce lien dans « Tout l'album », envoyées d'un autre appareil, un nombre).
 * « Tout l'album » se relit toutes les 45 s (page 0) : un lien mort y répond
 * 404, et la page bascule sur « Ce lien ne fonctionne plus ».
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

const freinAlbum = creerFrein(FREINS_DEPOT.album);
const freinLarge = creerFrein(FREIN_LARGE);

/** Le filtre, posé appel par appel (`filtreAlbum` pour l'album, le téléphone pour « miennes »). */
function poser<Q extends { eq(c: string, v: string): Q; is(c: string, v: null): Q; not(c: string, op: string, v: null): Q; in(c: string, v: string[]): Q }>(q: Q, f: FiltreAlbum, avec: boolean): Q {
  if (f.methode === "eq") return q.eq(f.colonne, f.valeur);
  if (f.methode === "is") return f.colonne === "supprimee_le" && !avec ? q : q.is(f.colonne, null);
  if (f.methode === "not_is") return q.not(f.colonne, "is", null);
  /* Les versions d'accord sont des constantes du code (VERSIONS_ALBUM), jamais un texte de client. */
  return q.in(f.colonne, f.valeurs);
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  if (freinAlbum(cleFreinDepot(ipDuClient(request), corps.token)) || freinLarge(ipDeConnexion(request))) {
    return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });
  }

  const acces = await chargerAcces(String(corps.token ?? ""), "depot");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_album")) return refusDroit();
  const { edition } = acces;
  /* T-159 : une édition effacée ne signe plus rien (ses photos sont parties). */
  const effacees = phrasePhotosEffacees(edition.photos_supprimees_le);
  if (effacees) return NextResponse.json({ error: "photos_effacees", message: `${effacees}.` }, { status: 410 });
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

  /* Le sondage de « Tout l'album » (perf-1) : rien d'arrivé depuis sa dernière arrivée connue, une requête et
     « rien de neuf », sans relire la page ni signer ses vignettes. Une erreur relit tout, comme avant. */
  const depuis = vue === "album" && page === 0 ? lireDepuis(corps.depuis) : null;
  if (depuis) {
    const neuf = await lireHorsCorbeille((avec) => {
      let q = supabase.from("collectif_photos").select("id").eq("edition_id", edition.id);
      for (const f of filtreAlbum(provenanceId)) q = poser(q, f, avec);
      return q.gt("confirmee_le", depuis).limit(1);
    });
    if (!neuf.error && !neuf.data?.length) {
      return NextResponse.json({ vue, page, rienDeNeuf: true }, { headers: { "cache-control": "private, no-store" } });
    }
  }

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

  const filtres: FiltreAlbum[] =
    vue === "album"
      ? filtreAlbum(provenanceId)
      : [
          ...(provenanceId ? [{ methode: "eq", colonne: "provenance_id", valeur: provenanceId } as const] : [{ methode: "is", colonne: "provenance_id" } as const, { methode: "eq", colonne: "role_deposant", valeur: "participant" } as const]),
          { methode: "not_is", colonne: "confirmee_le" },
          { methode: "is", colonne: "supprimee_le" },
        ];
  const requete = (avec: boolean, colonnes: string, compte = false) => {
    let q = supabase.from("collectif_photos").select(colonnes, compte ? COMPTE_SANS_LIGNE : undefined).eq("edition_id", edition.id);
    for (const f of filtres) q = poser(q, f, avec);
    if (vue === "miennes" && appareil) {
      q = q.eq("appareil_id", appareil);
      if (avec) q = q.or(moi ? `participant_id.is.null,participant_id.eq.${moi.id}` : "participant_id.is.null");
    }
    return q;
  };

  /* Combien de photos et de personnes dans l'album, à la première page seulement (C1) : les lignes de la vue
     (une par personne, à peu près), jamais les photos. Sans la vue : un compte, et personne de deviné. */
  const comptesAlbum = async (): Promise<{ photos: number; personnes: number | null } | { erreur: string | undefined }> => {
    const lu = await lireToutesLesLignes<LigneVueAlbum>(
      () => {
        let q = supabase.from(VUE_ALBUM).select(COLONNES_VUE_ALBUM).eq("edition_id", edition.id);
        for (const f of filtreVueAlbum(provenanceId)) q = poser(q, f, true);
        return q.returns<LigneVueAlbum[]>();
      },
      { colonne: "id", croissant: true },
      "album du lien (vue)"
    );
    if (!lu.error) return comptesDeLAlbum(lu.data);
    if (!tableAbsente(lu.error.code) && !colonneAbsente(lu.error.code)) return { erreur: lu.error.code };
    /* GET `limit(0)`, jamais `head` : filtré sur la corbeille, un HEAD rend une erreur sans code (horsCorbeille.ts). */
    const c = await lireHorsCorbeille((avec) => requete(avec, "id", true).limit(0));
    if (c.error || c.count === null) return { erreur: c.error?.code ?? "compte" };
    return { photos: c.count, personnes: null };
  };

  /* « Mes photos » au-delà d'une page : combien en tout sur ce lien depuis cet appareil (page 0 seulement, un
     GET `limit(0)`) ; le compte de la personne (`moi.ceTelephone`) est celui de toute l'édition. */
  const totalMiennes = async (): Promise<number | null> => {
    const c = await lireHorsCorbeille((avec) => requete(avec, "id", true).limit(0));
    if (c.error) console.error("[collectif] « Mes photos » non comptées", c.error.code);
    return c.error ? null : (c.count ?? null);
  };

  /* Les photos de MA personne dans « Tout l'album » de ce lien, envoyées d'un AUTRE appareil (21/10) : la
     même règle que l'album (`filtreAlbum`), ma personne, un autre appareil. Un NOMBRE seulement : « Mes
     photos » ne montre et ne supprime que celles de cet appareil (l'adresse n'est pas vérifiée). Sans
     personne connue (ou sans la migration 20261023) : 0. */
  const autresAppareils = async (): Promise<number | null> => {
    if (!moi || !appareil) return 0;
    const personneId = moi.id;
    const c = await lireHorsCorbeille((avec) => {
      let q = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", edition.id);
      for (const f of filtreAlbum(provenanceId)) q = poser(q, f, avec);
      /* Sans la colonne de la personne, le compte n'a pas de sens : il est lu, puis jeté (0). */
      if (avec) q = q.eq("participant_id", personneId);
      /* Le cookie a la forme d'un appareil (22 caractères sûrs, `estAppareil`) : il entre tel quel dans le `or`. */
      return q.or(`appareil_id.is.null,appareil_id.neq.${appareil}`).limit(0);
    });
    if (c.error) {
      console.error("[collectif] photos d'un autre appareil non comptées", c.error.code);
      return null;
    }
    return c.avec ? (c.count ?? 0) : 0;
  };

  const [lus, tous, total, autres] = await Promise.all([
    lireHorsCorbeille((avec) =>
      requete(avec, avec ? `${COLONNES}, participant_id` : COLONNES)
        .order("confirmee_le", { ascending: false })
        .order("id", { ascending: false })
        .range(page * TAILLE_PAGE_ALBUM, page * TAILLE_PAGE_ALBUM + TAILLE_PAGE_ALBUM)
        .returns<LigneAlbum[]>()
    ),
    vue === "album" && page === 0 ? comptesAlbum() : Promise.resolve(null),
    vue === "miennes" && page === 0 ? totalMiennes() : Promise.resolve(null),
    page === 0 ? autresAppareils() : Promise.resolve(null),
  ]);
  if (lus.error || (tous && "erreur" in tous)) {
    console.error("[collectif] album illisible", lus.error?.code ?? (tous && "erreur" in tous ? tous.erreur : undefined));
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
      /* La VIGNETTE seulement (S6) : l'original porte l'EXIF et le GPS de la personne qui l'a prise ; il ne
         sort jamais par l'album, même pour un HEIC ou une photo dont la vignette manque encore. */
      let vignette: string | null = null;
      try {
        if (p.vignette_key) vignette = await signerLectureVignette(p.vignette_key);
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
  const personne = moi ? vuePersonneConnue(moi) : null;
  return NextResponse.json(
    {
      vue,
      page,
      suivante,
      photos,
      lien: { nom: lien?.libelle?.trim() || null },
      ferme: !ouverte,
      album: tous && !("erreur" in tous) ? tous : null,
      /* « Mes photos », page 0 : combien en tout (au-delà de la première page). */
      total,
      moi: {
        participant: personne ? { prenom: personne.prenom, nom: personne.nom } : null,
        photos: comptes?.photos ?? null,
        ceTelephone: comptes?.ceTelephone ?? null,
        place: place && !place.illimitee ? place.place : null,
        sansLimite: Boolean(place?.illimitee),
        /* Page 0 : mes photos de ce lien envoyées d'un autre appareil (un nombre, jamais les photos). */
        autresAppareils: autres,
      },
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
