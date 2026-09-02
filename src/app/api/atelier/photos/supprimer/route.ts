/**
 * POST /api/atelier/photos/supprimer — retirer UNE photo déjà déposée.
 *
 * Pourquoi cette route existe. La grille de l'écran 5 permet de retirer une
 * vignette. Tant que la photo n'est pas confirmée, tout se règle dans le
 * navigateur. Une fois confirmée, elle est sur R2 et comptée dans
 * `nb_photos` : la retirer de l'écran sans le dire au serveur ferait mentir
 * le palier affiché, et l'atelier recevrait une photo que la cliente croit
 * avoir retirée. On supprime donc pour de bon — objet et ligne — et on
 * recalcule le compteur depuis la base.
 *
 * Le token fait foi, comme partout dans l'atelier : pas de compte, pas de
 * session. La suppression n'est ouverte que tant que le dépôt l'est.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { supprimer, cleVignetteR2 } from "@/lib/atelier/r2";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; photoId?: string };
    const token = (body.token ?? "").trim();
    const photoId = (body.photoId ?? "").trim();

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    if (!UUID.test(photoId)) {
      return NextResponse.json({ error: "photo_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: errNum } = await supabase
      .from("numeros")
      .select("id, etat")
      .eq("token", token)
      .maybeSingle();

    /* T-043 — une panne de base n'est PAS un token inconnu : un 404 dirait à
       la cliente que son dossier a disparu. Même règle que /presign. */
    if (errNum) {
      console.error("[supprimer] lookup numero échoué", errNum.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Passé l'état 2, les photos servent déjà à composer : on ne retire plus
       une pièce sous les mains de l'atelier. Même garde que /presign. */
    if (numero.etat !== "photos_recues" && numero.etat !== "photos_insuffisantes") {
      return NextResponse.json({ error: "depot_ferme" }, { status: 409 });
    }

    /* La double condition id + numero_id est la seule autorisation qui vaille :
       un photoId volé ne suffit pas, il faut aussi le token du bon dossier. */
    const { data: photo, error: errPhoto } = await supabase
      .from("photos")
      .select("id, r2_key")
      .eq("id", photoId)
      .eq("numero_id", numero.id)
      .maybeSingle();

    /* T-043 — même distinction : la panne se retente, l'absence est sèche. */
    if (errPhoto) {
      console.error("[supprimer] lookup photo échoué", errPhoto.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!photo) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* L'objet D'ABORD, la ligne ensuite. Dans l'autre ordre, un échec entre
       les deux laisserait un objet sans ligne — donc invisible, donc éternel :
       aucun ménage ne le retrouverait jamais. Une ligne sans objet, elle, se
       rattrape (la photo se re-déclare et se renvoie). */
    /* ET sa vignette (T-042). Depuis D7 chaque photo depose DEUX objets ; seul
       l'original etait efface. La ligne disparaissait, l'original aussi, et une
       copie 320 px restait dans le coffre sans plus aucune ligne pour la
       retrouver — donc invisible, donc eternelle, exactement ce que le
       commentaire ci-dessus cherche a eviter.
       Ce n'est pas qu'une question de menage : le jour ou quelqu'un demande
       l'effacement de ses donnees, « c'est supprime » doit etre VRAI.
       Sans condition sur `vignette_key` : la cle est deterministe, et un DELETE
       sur un objet absent ne coute rien et ne leve rien. */
    const objetParti = await supprimer(photo.r2_key);
    const vignettePartie = await supprimer(cleVignetteR2(numero.id, photo.id));

    /* T-048 — on ne retire la ligne QUE si les objets sont vraiment partis.
       Avant, la ligne disparaissait même sur un échec R2 réel (panne, pas
       absence) : l'objet restait alors sans ligne, invisible et éternel.
       Sur échec, 500 : la ligne reste (elle, se rattrape — la photo se
       re-déclare), la cliente réessaie, et rien n'est orphelin. L'opération
       est idempotente — un DELETE sur un objet déjà parti réussit. */
    if (!objetParti || !vignettePartie) {
      console.error("[supprimer] objet R2 non confirmé parti", photo.id);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const { error: errDel } = await supabase.from("photos").delete().eq("id", photo.id);
    if (errDel) {
      console.error("[supprimer] delete ligne échoué", errDel.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Même règle que /complete : on ne compte QUE les photos confirmées,
       et le compteur est recalculé depuis la base, jamais décrémenté à la
       main — deux suppressions concurrentes le feraient dériver. */
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("numero_id", numero.id)
      .not("taille", "is", null);

    const nbPhotos = count ?? 0;
    await supabase.from("numeros").update({ nb_photos: nbPhotos }).eq("id", numero.id);

    await logEvenement(supabase, numero.id, "photo_supprimee", {
      photo_id: photo.id,
      nb_photos: nbPhotos,
    });

    return NextResponse.json({ nbPhotos }, { status: 200 });
  } catch (err) {
    console.error("[supprimer] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
