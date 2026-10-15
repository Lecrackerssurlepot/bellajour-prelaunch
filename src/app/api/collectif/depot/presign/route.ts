import { NextResponse } from "next/server";
import { colonneAbsente } from "@/lib/collectif/migration";
import { randomUUID } from "node:crypto";
import { MAX_VIGNETTE_BYTES, MIME_VIGNETTE, signerPut } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAccesDepot } from "@/lib/collectif/acces";
import { clePhoto, cleVignette } from "@/lib/collectif/cles";
import { appareilDeRequete, compterPourPlafond, COOKIE_APPAREIL, lireExistants, nouvelAppareil } from "@/lib/collectif/collecte";
import { estCleFichier, LOT_VERIFICATION, lireDeclaration, planDeclaration } from "@/lib/collectif/depot";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { collecteOuverte } from "@/lib/collectif/etats";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { MESSAGE_PLAFOND, placeRestante } from "@/lib/collectif/plafonds";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { TYPES_PROVENANCE, type TypeProvenance } from "@/lib/collectif/types";

/**
 * POST /api/collectif/depot/presign — déclarer un lot de photos et recevoir
 * les URL signées pour les envoyer DIRECTEMENT au coffre (navigateur → R2).
 *
 * Deux usages, un corps :
 * - `{ token, connues: [clés] }` : la VÉRIFICATION d'une reprise. Rend les
 *   clés déjà arrivées, sans rien signer : le navigateur ne réduit pas pour
 *   rien trois cents photos déjà là.
 * - `{ token, fichiers: [...], p?, deposant?, provenance? }` : la
 *   déclaration. Chaque fichier repart avec sa décision (`depot.ts`) : déjà
 *   là, reprise sur la même clé, nouvelle, ou refusée par le plafond avec la
 *   phrase qui le dit.
 *
 * Le plafond par personne est tenu PAR APPAREIL (cookie httpOnly posé ici) :
 * un frein honnête. Le plafond total est tenu ici, côté serveur. Après la
 * clôture, la route répond 409 `depot_ferme` (aucun cron : l'état effectif).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAccesDepot(String(corps.token ?? ""));
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "deposer_photos") || acces.role === "equipe") return refusDroit();
  const { edition } = acces;
  const role: "responsable" | "participant" = acces.role === "responsable" ? "responsable" : "participant";
  const maintenant = new Date();

  if (!collecteOuverte(edition.etat, edition.cloture_le, maintenant)) {
    return NextResponse.json(
      { error: "depot_ferme", message: "Le dépôt est fermé : l'atelier compose avec les photos reçues." },
      { status: 409 }
    );
  }

  const supabase = makeSupabase();

  /* ── la vérification d'une reprise ── */
  if (Array.isArray(corps.connues)) {
    const cles = corps.connues.filter(estCleFichier).slice(0, LOT_VERIFICATION);
    const existants = await lireExistants(supabase, edition.id, cles);
    if (!existants) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    return NextResponse.json({ confirmees: [...existants.entries()].filter(([, e]) => e.confirmee).map(([c]) => c) });
  }

  const declaration = lireDeclaration(corps.fichiers);
  if (!declaration) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });

  /* ── qui dépose, pour quelle provenance ── */
  let sansPlafond = false;
  let plafondLien: number | null = null;
  let provenanceId: string | null = null;
  let provenanceType: TypeProvenance = role === "responsable" ? "organisateur" : "participant";
  let deposant = typeof corps.deposant === "string" ? corps.deposant.trim().slice(0, 80) || null : null;
  if (role === "participant" && corps.p !== undefined && corps.p !== null && corps.p !== "") {
    if (!estCleProvenance(corps.p)) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    type Prov = { id: string; type: TypeProvenance; libelle: string | null; sans_plafond: boolean; plafond_par_personne?: number | null; retire_le?: string | null };
    const lire = (colonnes: string) =>
      supabase.from("collectif_provenances").select(colonnes).eq("edition_id", edition.id).eq("cle", corps.p as string).maybeSingle<Prov>();
    /* Repli tant que la migration de la révision n'est pas passée : le lien
       garde alors la règle de l'édition. */
    let lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne, retire_le");
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne");
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond");
    const { data: prov, error } = lu;
    if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    /* Un lien supprimé (migration 20261018) ne reçoit plus rien. */
    if (!prov || prov.retire_le) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    provenanceId = prov.id;
    provenanceType = prov.type;
    sansPlafond = prov.sans_plafond;
    plafondLien = prov.plafond_par_personne ?? null;
    deposant = deposant ?? prov.libelle;
  }
  if (role === "responsable") {
    const demande = (corps.provenance ?? {}) as Record<string, unknown>;
    if (TYPES_PROVENANCE.some((t) => t.cle === demande.type)) provenanceType = demande.type as TypeProvenance;
    /* Le nom du dossier, sous-dossier compris (« La soirée / Photobooth », dossiers.ts). */
    const libelle = typeof demande.libelle === "string" ? demande.libelle.trim().slice(0, 170) : "";
    deposant = libelle || edition.responsable_nom || "Le responsable";
  }

  const appareilLu = appareilDeRequete(request);
  const appareil = appareilLu ?? nouvelAppareil();

  const comptes = await compterPourPlafond(supabase, edition.id, appareil, maintenant, plafondLien !== null ? provenanceId : null);
  if (!comptes) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const place = placeRestante(edition, { role, sansPlafond, plafondLien, dejaParAppareil: comptes.parAppareil }, comptes.total);

  const existants = await lireExistants(supabase, edition.id, declaration.fichiers.map((f) => f.cle));
  if (!existants) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const decisions = planDeclaration(declaration.fichiers, existants, place);

  /* Les nouvelles s'écrivent en UNE insertion : 25 allers-retours de moins. */
  const ids = new Map<string, string>();
  const lignes = declaration.fichiers
    .filter((f, i) => decisions[i].sorte === "nouvelle")
    .map((f) => {
      const id = randomUUID();
      ids.set(f.cle, id);
      return {
        id,
        edition_id: edition.id,
        r2_key: clePhoto(edition.id, id, f.type),
        cle_fichier: f.cle,
        nom_origine: f.nom,
        mime: f.type,
        ordre: f.ordre,
        provenance_id: provenanceId,
        provenance_type: provenanceType,
        role_deposant: role,
        deposant,
        appareil_id: appareil,
      };
    });
  if (lignes.length) {
    const { error } = await supabase.from("collectif_photos").insert(lignes);
    if (error) {
      /* Deux onglets ont déclaré le même fichier en même temps : le lot se
         rejoue, et la reprise le reconnaîtra. */
      if (error.code === "23505") return NextResponse.json({ error: "reessayer" }, { status: 409 });
      console.error("[collectif] déclaration non écrite", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
  }

  const resultats = await Promise.all(
    declaration.fichiers.map(async (f, i) => {
      const d = decisions[i];
      if (d.sorte === "deja") return { cle: f.cle, deja: true, photoId: d.id };
      if (d.sorte === "double") return { cle: f.cle, double: true };
      if (d.sorte === "refusee") return { cle: f.cle, erreur: d.raison, message: MESSAGE_PLAFOND[d.raison] };
      const photoId = d.sorte === "reprise" ? d.id : (ids.get(f.cle) as string);
      const key = d.sorte === "reprise" ? d.r2_key : clePhoto(edition.id, photoId, f.type);
      const vignetteKey = cleVignette(edition.id, photoId);
      const [url, urlVignette] = await Promise.all([
        signerPut(key, f.type, f.taille),
        f.tailleVignette && f.tailleVignette <= MAX_VIGNETTE_BYTES
          ? signerPut(vignetteKey, MIME_VIGNETTE, f.tailleVignette)
          : Promise.resolve(null),
      ]);
      return { cle: f.cle, photoId, url, urlVignette };
    })
  );

  const reponse = NextResponse.json({
    resultats: [...resultats, ...declaration.refus.map((r) => ({ nom: r.nom, erreur: r.erreur }))],
    place: place.illimitee ? null : Math.max(0, place.place - lignes.length),
  });
  if (!appareilLu) {
    reponse.cookies.set(COOKIE_APPAREIL, appareil, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return reponse;
}
