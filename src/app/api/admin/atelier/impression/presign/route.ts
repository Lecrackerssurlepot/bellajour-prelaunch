/**
 * POST /api/admin/atelier/impression/presign — déposer le PDF print-ready
 * depuis le back-office, avant « Envoyer à l'impression ».
 *
 * Même mécanique que le dépôt des aperçus (apercu/presign) : la route signe,
 * le navigateur pousse DIRECTEMENT vers le coffre — un PDF de magazine pèse
 * des dizaines de mégaoctets et n'a rien à faire dans la mémoire d'une
 * fonction serverless.
 *
 * ⚠️ L'envoi doit rester SINGLE-PART (un seul PUT) : l'ETag de l'objet est
 * alors le md5 du fichier, et c'est cette empreinte qui part chez
 * Cloudprinter avec la commande. Un envoi multipart la casserait — la route
 * de transition le détecte et exige un redépôt.
 *
 * PDF uniquement : `MIMES_ACCEPTES` (formats.ts) est le contrat des PHOTOS
 * et n'est pas modifié — le contrôle est local à cette route.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { signerPut } from "@/lib/atelier/r2";
import { MAX_PDF_BYTES } from "@/lib/atelier/impression";

export const runtime = "nodejs";

/* Un slot par fichier possible : `produit` (agrafé, PDF unique) ou le duo
   `couverture` / `interieur` (dos carré). Le produit du dossier décide
   desquels la transition exigera — ici on signe, on ne juge pas. */
const SLOTS = new Set(["produit", "couverture", "interieur"]);

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      token?: unknown;
      slot?: unknown;
      nom?: unknown;
      type?: unknown;
      taille?: unknown;
    };

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const slot = String(body.slot ?? "");
    const nom = typeof body.nom === "string" ? body.nom : "";
    const type = typeof body.type === "string" ? body.type : "";
    const taille = Number(body.taille);

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    if (!SLOTS.has(slot)) {
      return NextResponse.json({ error: "slot_inconnu" }, { status: 400 });
    }

    /* Certains navigateurs laissent le type vide sur un glisser-déposer :
       l'extension fait foi dans ce cas, comme pour les photos. */
    const estPdf = type === "application/pdf" || (!type && /\.pdf$/i.test(nom));
    if (!estPdf) {
      return NextResponse.json({ error: "format_refuse" }, { status: 415 });
    }
    if (!Number.isFinite(taille) || taille <= 0 || taille > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "taille_refusee" }, { status: 413 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Suffixe aléatoire, même raison que les aperçus : redéposer une version
       corrigée ne doit jamais écraser un objet dont l'URL signée est peut-être
       déjà partie chez Cloudprinter. */
    const suffixe = crypto.randomUUID().slice(0, 8);
    const key = `numeros/${numero.id}/impression/${slot}-${suffixe}.pdf`;

    const url = await signerPut(key, "application/pdf", taille);

    return NextResponse.json({ ok: true, key, url, contentType: "application/pdf" }, { status: 200 });
  } catch (err) {
    console.error("[admin/impression/presign] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
