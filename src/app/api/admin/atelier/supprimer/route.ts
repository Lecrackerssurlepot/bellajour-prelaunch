import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { prefixeCoffre, verdictSuppression } from "@/lib/atelier/archive";
import { supprimerPrefixe } from "@/lib/atelier/r2";
import type { Etat } from "@/lib/atelier/transitions";

/**
 * Supprimer un dossier POUR DE BON (T-113, 14/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'ORDRE, ET IL NE SE NÉGOCIE PAS
 *
 *   1. la règle (archive.ts) : archivé d'abord, jamais pendant une
 *      impression ;
 *   2. le coffre R2 : tout ce qui vit sous numeros/<id>/ ;
 *   3. la ligne `numeros`, dont photos, journal, mails, notes et marques de
 *      lecture cascadent (vérifié dans information_schema le 10/09).
 *
 * Le coffre AVANT la base, et la base SEULEMENT si le coffre est vide : un
 * objet qui survit à sa ligne n'a plus rien qui pointe vers lui, il est
 * invisible et éternel (T-048). Si un seul objet résiste, on s'arrête, rien
 * n'est retiré en base, et l'écran dit combien restent : on réessaie.
 *
 * Aucune trace en base après coup, par construction (le journal part avec la
 * ligne). La console de Vercel garde une ligne : qui, quel dossier, combien
 * d'objets. Le paiement Stripe et la facture, eux, ne bougent pas : ce sont
 * d'autres maisons, et l'écran l'a dit avant le clic.
 * ══════════════════════════════════════════════════════════════════════════
 */
export const runtime = "nodejs";
export const maxDuration = 60;

type Ligne = {
  id: string;
  etat: Etat;
  titre: string | null;
  nb_photos: number | null;
  stripe_payment_intent: string | null;
  cloudprinter_order_id: string | null;
  archive_le: string | null;
};

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero, error: lecture } = await supabase
      .from("numeros")
      .select("id, etat, titre, nb_photos, stripe_payment_intent, cloudprinter_order_id, archive_le")
      .eq("token", token)
      .maybeSingle<Ligne>();
    if (lecture) {
      /* Sans la colonne, on ne peut pas savoir si le dossier est archivé :
         on ne supprime pas à l'aveugle. */
      if (lecture.code === "42703") return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
      console.error("[admin/supprimer] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const verdict = verdictSuppression({
      etat: numero.etat,
      archiveLe: numero.archive_le,
      paye: Boolean(numero.stripe_payment_intent),
      commandeImpression: Boolean(numero.cloudprinter_order_id),
    });
    if (!verdict.possible) {
      return NextResponse.json({ error: "refus", raison: verdict.raison }, { status: 422 });
    }

    const coffre = await supprimerPrefixe(prefixeCoffre(numero.id));
    if (coffre.echecs > 0) {
      console.error("[admin/supprimer] coffre incomplet", numero.id, coffre);
      return NextResponse.json(
        { error: "coffre", supprimes: coffre.supprimes, echecs: coffre.echecs },
        { status: 502 },
      );
    }

    const { data: parti, error } = await supabase.from("numeros").delete().eq("id", numero.id).select("id");
    if (error) {
      console.error("[admin/supprimer] delete échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!parti?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    console.log(
      `[admin/supprimer] ${prenomDe(qui)} a supprimé définitivement le dossier ${numero.id} ` +
        `(« ${numero.titre ?? "sans titre"} », état ${numero.etat}, ${coffre.supprimes} objet(s) du coffre)`,
    );
    return NextResponse.json({ ok: true, objets: coffre.supprimes });
  } catch (err) {
    console.error("[admin/supprimer] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
