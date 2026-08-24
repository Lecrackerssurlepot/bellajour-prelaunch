/**
 * POST /api/admin/atelier/apercu/presign — déposer les trois visuels de
 * l'état 2 depuis le back-office.
 *
 * L'atelier exporte trois images de Canva sur son Mac (première de
 * couverture, quatrième, double page) et les glisse dans les trois cadres de
 * la fiche. Cette route signe l'envoi ; le navigateur pousse ensuite le
 * fichier DIRECTEMENT vers le coffre, sans jamais traverser Vercel — un
 * export de couverture pèse plusieurs mégaoctets et n'a rien à faire dans la
 * mémoire d'une fonction serverless.
 *
 * Le coffre reste PRIVÉ. Les visuels sont signés à la demande au moment du
 * rendu de la page (cf. apercu.ts) : le rendre public exposerait, dans le
 * dossier voisin, les photos brutes de toutes les clientes.
 *
 * ⚠️ La signature porte le Content-Type ET le Content-Length : un octet
 * d'écart et R2 répond 403 sans en-tête CORS, ce que le navigateur affiche
 * comme une trompeuse « erreur d'accès » (piège nº1 du mémo d'upload). Le
 * client déclare donc la taille exacte du fichier, jamais une estimation.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { signerPut, MAX_FILE_BYTES, resoudreMime, extensionDepuisMime } from "@/lib/atelier/r2";

export const runtime = "nodejs";

const SLOTS = new Set(["c1", "c4", "double"]);

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
    const taille = Number(body.taille);

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    if (!SLOTS.has(slot)) {
      return NextResponse.json({ error: "slot_inconnu" }, { status: 400 });
    }

    const mime = resoudreMime(nom, typeof body.type === "string" ? body.type : "");
    if (!mime) {
      return NextResponse.json({ error: "format_refuse" }, { status: 415 });
    }
    if (!Number.isFinite(taille) || taille <= 0 || taille > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "taille_refusee" }, { status: 413 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Suffixe aléatoire plutôt qu'un nom fixe « c1.jpg ». Corriger un aperçu
       écraserait sinon l'objet sous une URL déjà signée et déjà en cache : la
       cliente qui recharge sa page verrait l'ancienne image, ou pire, une
       image à moitié remplacée. Un objet neuf à chaque dépôt, l'ancien reste
       inerte dans le coffre. */
    const suffixe = crypto.randomUUID().slice(0, 8);
    const key = `numeros/${numero.id}/apercu/${slot}-${suffixe}.${extensionDepuisMime(mime)}`;

    const url = await signerPut(key, mime, taille);

    return NextResponse.json({ ok: true, key, url, contentType: mime }, { status: 200 });
  } catch (err) {
    console.error("[admin/apercu/presign] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
