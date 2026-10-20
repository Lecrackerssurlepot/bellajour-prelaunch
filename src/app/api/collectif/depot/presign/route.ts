import { NextResponse } from "next/server";
import { colonneAbsente, MIGRATION_ACCORD, MIGRATION_PERSONNES } from "@/lib/collectif/migration";
import { randomUUID } from "node:crypto";
import { MAX_VIGNETTE_BYTES, MIME_VIGNETTE, signerPut } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAccesDepot } from "@/lib/collectif/acces";
import { accordExige, colonnesAccord, ERREUR_ACCORD, lireAccord, messageAccord } from "@/lib/collectif/accord";
import { clePhoto, cleVignette } from "@/lib/collectif/cles";
import { appareilDeRequete, compterPourPlafond, COOKIE_APPAREIL, lireExistants, nouvelAppareil } from "@/lib/collectif/collecte";
import { estCleFichier, LOT_VERIFICATION, lireDeclaration, planDeclaration } from "@/lib/collectif/depot";
import { estCleProvenance, peut } from "@/lib/collectif/droits";
import { noterEchec } from "@/lib/collectif/echecsJournal";
import { collecteOuverte } from "@/lib/collectif/etats";
import { depotOuvert, ERREUR_PAS_OUVERT, messagePasOuvert } from "@/lib/collectif/ouverture";
import { nomAffiche, normaliserEmail, type LigneParticipant } from "@/lib/collectif/personnes";
import { participantDeLAppareil, trouverParEmail } from "@/lib/collectif/personnesServeur";
import { NOM_MAX } from "@/lib/collectif/participant";
import { nomDeLAppareil } from "@/lib/collectif/participantConnu";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { messagePlafond, placeRestante } from "@/lib/collectif/plafonds";
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
 * - `{ token, fichiers: [...], p?, deposant?, provenance?, accord?,
 *   accordVersion? }` : la déclaration. Chaque fichier repart avec sa
 *   décision (`depot.ts`) : déjà là, reprise sur la même clé, nouvelle, ou
 *   refusée par le plafond avec la phrase qui le dit.
 *
 * L'accord du participant (T-184, `accord.ts`) : un PARTICIPANT sans
 * `accord: true` et une version connue est refusé (400 `accord_requis`)
 * avant toute écriture ; la version et l'heure du serveur s'écrivent sur
 * chacune de ses photos nouvelles. Le responsable ne coche rien. La
 * vérification d'une reprise n'écrit rien : elle ne demande pas l'accord.
 *
 * Le plafond par personne est tenu PAR APPAREIL (cookie httpOnly posé ici) :
 * un frein honnête. Le plafond total est tenu ici, côté serveur. Après la
 * clôture, la route répond 409 `depot_ferme` (aucun cron : l'état effectif).
 *
 * T-160 : un refus pour une raison SERVEUR (une lecture ratée, une écriture
 * refusée) s'écrit aussi au journal de l'édition (`noterEchec`), jamais avec
 * le token ni le message brut. Les refus normaux (plafond, accord, lot
 * illisible, deux onglets qui se croisent) n'en sont pas.
 *
 * Planches du 20/10 (migration 20261023, contrat
 * `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md`) :
 * - avant `ouverture_le`, un participant reçoit 409 `depot_pas_ouvert` ;
 * - `email` (facultatif) : la personne déjà présentée par `depot/participant`
 *   (inconnue : 409 `participant_inconnu`, illisible : 400 `email_invalide`) ;
 *   sans lui, la personne de CE téléphone ; connue, son nom va sur la photo,
 *   `participant_id` aussi, et le plafond par personne se compte par elle ;
 * - une photo à la corbeille redéclarée reste « déjà là » (`corbeille: true`).
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
  /* L'ouverture (planche 9B, migration 20261023) : avant l'heure réglée, le lien des participants
     ne reçoit rien. Le responsable dépose quand il veut. Sans la migration, `ouverture_le` n'existe
     pas : ouvert, comme avant. */
  if (role === "participant" && !depotOuvert(edition.ouverture_le, maintenant)) {
    return NextResponse.json(
      { error: ERREUR_PAS_OUVERT, message: messagePasOuvert(edition.ouverture_le), ouverture_le: edition.ouverture_le ?? null },
      { status: 409 }
    );
  }

  const supabase = makeSupabase();

  /* ── la vérification d'une reprise ── */
  if (Array.isArray(corps.connues)) {
    const cles = corps.connues.filter(estCleFichier).slice(0, LOT_VERIFICATION);
    const existants = await lireExistants(supabase, edition.id, cles);
    if (!existants) {
      await noterEchec(supabase, edition.id, "declaration", { etape: "lecture", n: cles.length });
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    }
    return NextResponse.json({ confirmees: [...existants.entries()].filter(([, e]) => e.confirmee).map(([c]) => c) });
  }

  /* ── l'accord, avant toute écriture (T-184) ── */
  const accord = lireAccord(corps);
  if (accordExige(role) && !accord) {
    return NextResponse.json({ error: ERREUR_ACCORD, message: messageAccord(edition.registre) }, { status: 400 });
  }
  const champsAccord = accordExige(role) ? colonnesAccord(accord, maintenant) : {};

  const declaration = lireDeclaration(corps.fichiers);
  if (!declaration) return NextResponse.json({ error: "lot_invalide" }, { status: 400 });

  /* ── qui dépose, pour quelle provenance ── */
  let sansPlafond = false;
  let plafondLien: number | null = null;
  let provenanceId: string | null = null;
  let provenanceType: TypeProvenance = role === "responsable" ? "organisateur" : "participant";
  let deposant = typeof corps.deposant === "string" ? corps.deposant.trim().slice(0, NOM_MAX) || null : null;
  let libelleLien: string | null = null;
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
    if (error) {
      await noterEchec(supabase, edition.id, "declaration", { etape: "lecture", code: error.code, n: declaration.fichiers.length });
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    }
    /* Un lien supprimé (migration 20261018) ne reçoit plus rien. */
    if (!prov || prov.retire_le) return NextResponse.json({ error: "provenance_inconnue" }, { status: 404 });
    provenanceId = prov.id;
    provenanceType = prov.type;
    sansPlafond = prov.sans_plafond;
    plafondLien = prov.plafond_par_personne ?? null;
    libelleLien = prov.libelle;
  }
  const appareilLu = appareilDeRequete(request);
  /* La PERSONNE (planches du 20/10, migration 20261023) : celle de l'adresse envoyée (`email`,
     la page l'a présentée d'abord par `depot/participant`), sinon celle pour qui CE téléphone
     parle. Connue, elle donne son nom à la photo et son plafond se compte par elle (tous ses
     téléphones). Sans la migration, on reste à la règle d'avant (le nom et le plafond du
     téléphone), et le serveur le dit. */
  let participant: LigneParticipant | null = null;
  if (role === "participant") {
    const email = corps.email === undefined || corps.email === null || corps.email === "" ? null : normaliserEmail(corps.email);
    if (corps.email && !email) return NextResponse.json({ error: "email_invalide" }, { status: 400 });
    const lu = email
      ? await trouverParEmail(supabase, edition.id, email)
      : appareilLu
        ? await participantDeLAppareil(supabase, edition.id, appareilLu)
        : ({ statut: "ok", valeur: null } as const);
    if (lu.statut === "erreur") {
      await noterEchec(supabase, edition.id, "declaration", { etape: "lecture", code: lu.code, n: declaration.fichiers.length });
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    }
    if (lu.statut === "absente" && email) console.error(`[collectif] adresse du participant ignorée : ${MIGRATION_PERSONNES} absente`);
    if (lu.statut === "ok") participant = lu.valeur;
    if (email && lu.statut === "ok" && !participant) {
      const message = edition.registre === "ecole_tu" ? "Cette adresse n'est pas encore connue : indique d'abord ton prénom et ton nom." : "Cette adresse n'est pas encore connue : indiquez d'abord votre prénom et votre nom.";
      return NextResponse.json({ error: "participant_inconnu", message }, { status: 409 });
    }
  }
  /* Le nom ne change plus une fois donné (participant.ts, retours du 19/10 au soir) :
     celui que CET appareil a déjà donné dans l'édition passe avant celui que le
     navigateur envoie, même vidé ou retapé autrement. Sans nom, un lien de
     provenance prête son libellé, comme avant. Une personne connue porte le sien. */
  if (role === "participant" && appareilLu && !participant) {
    const connu = await nomDeLAppareil(supabase, edition.id, appareilLu, libelleLien);
    if (connu) deposant = connu;
  }
  if (participant) deposant = nomAffiche(participant);
  if (role === "participant") deposant = deposant ?? libelleLien;
  if (role === "responsable") {
    const demande = (corps.provenance ?? {}) as Record<string, unknown>;
    if (TYPES_PROVENANCE.some((t) => t.cle === demande.type)) provenanceType = demande.type as TypeProvenance;
    /* Le nom du dossier, sous-dossier compris (« La soirée / Photobooth », dossiers.ts). */
    const libelle = typeof demande.libelle === "string" ? demande.libelle.trim().slice(0, 170) : "";
    deposant = libelle || edition.responsable_nom || "Le responsable";
  }

  const appareil = appareilLu ?? nouvelAppareil();

  /* Les deux lectures sont indépendantes : en parallèle (T-168). */
  const [comptes, existants] = await Promise.all([
    compterPourPlafond(supabase, edition.id, appareil, maintenant, plafondLien !== null ? provenanceId : null, participant?.id ?? null),
    lireExistants(supabase, edition.id, declaration.fichiers.map((f) => f.cle)),
  ]);
  if (!comptes || !existants) {
    await noterEchec(supabase, edition.id, "declaration", { etape: "lecture", n: declaration.fichiers.length });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const place = placeRestante(edition, { role, sansPlafond, plafondLien, dejaParAppareil: comptes.parAppareil }, comptes.total);
  const decisions = planDeclaration(declaration.fichiers, existants, place);

  /* Les nouvelles s'écrivent en UNE insertion : 25 allers-retours de moins. */
  const ids = new Map<string, string>();
  const sansAccord = declaration.fichiers
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
        /* La personne (20261023) : seulement quand elle est connue, donc la migration passée. */
        ...(participant ? { participant_id: participant.id } : {}),
      };
    });
  const lignes = sansAccord.map((l) => ({ ...l, ...champsAccord }));
  if (lignes.length) {
    let { error } = await supabase.from("collectif_photos").insert(lignes);
    if (error && colonneAbsente(error.code) && "accord_version" in champsAccord) {
      /* Le repli tant que Mathias n'a pas appliqué la migration : le refus
         sans accord tient déjà, mais l'accord n'est PAS enregistré, et on le
         dit à chaque lot. */
      console.error(`[collectif] accord du participant NON enregistré : ${MIGRATION_ACCORD} absente`);
      ({ error } = await supabase.from("collectif_photos").insert(sansAccord));
    }
    if (error) {
      /* Deux onglets ont déclaré le même fichier en même temps : le lot se
         rejoue, et la reprise le reconnaîtra. */
      if (error.code === "23505") return NextResponse.json({ error: "reessayer" }, { status: 409 });
      console.error("[collectif] déclaration non écrite", error.code, error.message);
      await noterEchec(supabase, edition.id, "declaration", { etape: "ecriture", code: error.code, n: lignes.length });
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
  }

  const resultats = await Promise.all(
    declaration.fichiers.map(async (f, i) => {
      const d = decisions[i];
      /* À la corbeille (20261023) : elle ne repart pas ; `corbeille` le dit à la page. */
      if (d.sorte === "deja") return { cle: f.cle, deja: true, photoId: d.id, ...(d.corbeille ? { corbeille: true } : {}) };
      if (d.sorte === "double") return { cle: f.cle, double: true };
      /* La phrase suit le registre de l'édition (T-195) : « Tu as atteint… » sur une édition au tu. */
      if (d.sorte === "refusee") return { cle: f.cle, erreur: d.raison, message: messagePlafond(d.raison, edition.registre) };
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
