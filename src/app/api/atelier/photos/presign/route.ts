/**
 * POST /api/atelier/photos/presign — déclaration d'un lot de photos.
 *
 * Étape 2 de l'ordre imposé (piège nº1 du mémo) : réduire → DÉCLARER → envoyer.
 * Le client ne doit appeler cette route qu'APRÈS avoir réduit ses images, car
 * la taille annoncée fait partie de la signature : une taille déclarée avant
 * réduction produit un 403 R2 sans en-tête CORS, illisible côté navigateur.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import {
  MAX_FILE_BYTES, MIMES_ACCEPTES, TAILLE_TOLERANCE,
  cleR2, mimeDepuisNom, signerPut, tailleReelle,
} from "@/lib/atelier/r2";

export const runtime = "nodejs";

/* Piège nº20 : trois plafonds de lot différents se ressemblent et se
   confondent. Ici : au plus 100 fichiers DÉCLARÉS par appel (le maximum d'un
   numéro), la concurrence d'ENVOI étant de 5 côté client (PRD §7.4). */
const MAX_PAR_LOT = 100;
const MAX_PHOTOS_PAR_NUMERO = 100;

type Demande = { id?: string; nom?: string; taille?: number; type?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; fichiers?: Demande[] };
    const token = (body.token ?? "").trim();

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    const fichiers = Array.isArray(body.fichiers) ? body.fichiers : [];
    if (!fichiers.length || fichiers.length > MAX_PAR_LOT) {
      return NextResponse.json({ error: "lot_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: errNum } = await supabase
      .from("numeros")
      .select("id, etat")
      .eq("token", token)
      .maybeSingle();

    if (errNum) {
      console.error("[presign] lookup numero échoué", errNum.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Le dépôt n'est ouvert qu'avant publication de l'aperçu. Passé l'état 2,
       les photos servent déjà à composer : on ne les remplace plus en douce. */
    if (numero.etat !== "photos_recues" && numero.etat !== "photos_insuffisantes") {
      return NextResponse.json({ error: "depot_ferme" }, { status: 409 });
    }

    const { count: dejaPresentes } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("numero_id", numero.id);

    const resultats: Array<Record<string, unknown>> = [];
    let ordre = dejaPresentes ?? 0;

    for (const f of fichiers) {
      const nom = typeof f.nom === "string" ? f.nom.slice(0, 260) : "";
      const taille = Number(f.taille);

      if (!Number.isFinite(taille) || taille <= 0 || taille > MAX_FILE_BYTES) {
        resultats.push({ nom, erreur: "taille" });
        continue;
      }

      /* Piège nº17 : type MIME vide sur iCloud → repli par extension. */
      let mime = typeof f.type === "string" ? f.type.toLowerCase() : "";
      if (!MIMES_ACCEPTES.includes(mime as (typeof MIMES_ACCEPTES)[number])) {
        mime = mimeDepuisNom(nom) ?? "";
      }
      if (!MIMES_ACCEPTES.includes(mime as (typeof MIMES_ACCEPTES)[number])) {
        resultats.push({ nom, erreur: "format" });
        continue;
      }

      /* ---- reprise : le client renvoie l'id d'une photo déjà déclarée ---- */
      if (f.id) {
        const { data: ligne } = await supabase
          .from("photos")
          .select("id, r2_key, taille")
          .eq("id", f.id)
          .eq("numero_id", numero.id)
          .maybeSingle();

        if (ligne) {
          /* Piège nº8 : redonner une URL à une photo DÉJÀ ARRIVÉE écraserait
             l'objet référencé. On vérifie sur R2 avant de re-signer. */
          const presente = await tailleReelle(ligne.r2_key);
          if (presente !== null && ligne.taille !== null) {
            resultats.push({ photoId: ligne.id, key: ligne.r2_key, deja: true });
            continue;
          }
          /* Piège nº9 : une photo en échec est ROUVERTE, jamais rejetée —
             les identifiants sont stables par fichier, « rejouer avec un
             nouvel id » est intenable. Même clé, nouvelle signature. */
          resultats.push({
            photoId: ligne.id,
            key: ligne.r2_key,
            url: await signerPut(ligne.r2_key, mime, taille),
          });
          continue;
        }
      }

      if (ordre >= MAX_PHOTOS_PAR_NUMERO) {
        resultats.push({ nom, erreur: "plafond" });
        continue;
      }

      /* ---- première déclaration ---- */
      const photoId = crypto.randomUUID();
      const key = cleR2(numero.id, photoId, mime);

      const { error: errIns } = await supabase.from("photos").insert({
        id: photoId,
        numero_id: numero.id,
        r2_key: key,
        nom_origine: nom || null,
        /* `taille` reste la taille DÉCLARÉE jusqu'à la confirmation, où elle
           est remplacée par la taille réelle mesurée sur R2. */
        taille,
        ordre,
      });

      if (errIns) {
        console.error("[presign] insert photo échoué", errIns.code);
        resultats.push({ nom, erreur: "internal" });
        continue;
      }

      resultats.push({ photoId, key, url: await signerPut(key, mime, taille) });
      ordre++;
    }

    return NextResponse.json({ resultats, tolerance: TAILLE_TOLERANCE }, { status: 200 });
  } catch (err) {
    console.error("[presign] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
