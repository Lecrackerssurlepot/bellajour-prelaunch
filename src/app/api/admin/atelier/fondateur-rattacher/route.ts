/**
 * POST /api/admin/atelier/fondateur-rattacher — « ce dossier est celui du
 * fondateur nº N », dit à la main par un admin (10/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE TROU QU'ELLE BOUCHE
 *
 * Un fondateur peut composer son numéro sous une AUTRE adresse que celle de
 * sa prévente : adresse professionnelle, adresse de son conjoint, adresse
 * changée depuis mars. La détection automatique passe par
 * `waitlist.email_canonical` et ne le voit pas ; le filet manuel
 * (`/api/admin/atelier/fondatrice-code`) passe par la MÊME détection et ne le
 * voit pas davantage. Ce fondateur n'était atteignable par aucun des deux
 * chemins, et un code dicté au téléphone ne couvrirait de toute façon jamais
 * les frais de port à venir.
 *
 * Cette route ne fait donc qu'une chose : écrire au journal QUELLE ligne
 * `waitlist` ce dossier désigne. Ensuite, tout le reste — la remise de 30 €
 * sur la session Stripe, la phrase du mail M3, le port offert quand la
 * livraison sera facturée — s'applique tout seul, parce que
 * `numeroFondateurDuDossier` lit ce journal.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ELLE NE FRAPPE AUCUN COUPON, VOLONTAIREMENT. Rattacher n'est pas
 * créditer : le code de 30 € reste frappé par le bouton « Créer le code »
 * (filet) ou par le checkout (chemin normal), tous deux passés par la même
 * détection. Une route qui ferait les deux d'un coup rendrait impossible de
 * corriger un numéro mal saisi sans laisser un coupon orphelin chez Stripe.
 *
 * ⚠️ ELLE NE CRÉE AUCUN DROIT (borne nº6 de `fondatrice.ts`). Le numéro
 * frappé doit correspondre à une ligne `waitlist` `founder` + `confirmed`,
 * vérifiée ici avant l'écriture ET re-vérifiée à chaque crédit. Un numéro
 * fantaisiste est refusé net.
 *
 * ⚠️ UNE ÉCRITURE RATÉE REND 500 (T-038). Le journal EST la persistance du
 * rattachement : répondre « c'est fait » sur un insert en échec afficherait un
 * rattachement qui n'existe pas, et l'admin croirait le crédit acquis.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import {
  EVT_FONDATEUR_RATTACHE,
  numeroFondatricePour,
  type LigneWaitlist,
} from "@/lib/atelier/fondatrice";

export const runtime = "nodejs";

/** La ligne de prévente visée, plus le prénom pour l'accusé de réception. */
type LigneVisee = LigneWaitlist & { prenom: string | null };

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    /* Le champ arrive d'un `<input type="number">` : la valeur peut être un
       nombre, une chaîne, ou rien du tout. On accepte les deux formes et on
       exige un entier strictement positif — la même borne que
       `numeroFondatricePour`, parce qu'un 0 n'est pas une place. */
    const brut = body.numero_fondateur;
    const numeroFondateur =
      typeof brut === "number"
        ? brut
        : typeof brut === "string" && brut.trim() !== ""
          ? Number(brut.trim())
          : Number.NaN;
    if (!Number.isInteger(numeroFondateur) || numeroFondateur <= 0) {
      return NextResponse.json({ error: "numero_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: lectureErr } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (lectureErr) {
      console.error("[admin/fondateur-rattacher] lecture échouée", lectureErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* La prévente, relue à l'instant du geste. `limit(1)` plutôt que
       `maybeSingle` : si deux lignes portaient le même numéro (elles ne le
       devraient pas), `maybeSingle` ferait tomber la route au lieu de
       rattacher. On préfère servir la première et rester debout. */
    const { data: lignes, error: wlErr } = await supabase
      .from("waitlist")
      .select("prenom, offer_type, status, numero_fondateur")
      .eq("numero_fondateur", numeroFondateur)
      .limit(1)
      .returns<LigneVisee[]>();

    if (wlErr) {
      console.error("[admin/fondateur-rattacher] waitlist illisible", wlErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const wl = (lignes ?? [])[0] ?? null;
    /* Les trois conditions, décidées par le module et par lui seul : ni
       `founder`, ni `confirmed`, ni numéro attribué ne se re-vérifient ici à
       la main — deux endroits qui décident finiraient par diverger. */
    if (numeroFondatricePour(wl) !== numeroFondateur) {
      return NextResponse.json({ error: "fondateur_inconnu" }, { status: 404 });
    }

    const ecrit = await logEvenement(supabase, numero.id, EVT_FONDATEUR_RATTACHE, {
      numero_fondateur: numeroFondateur,
      par: prenomDe(qui),
    });
    if (!ecrit) {
      /* T-038 : le journal EST la persistance. Sans la ligne, il ne s'est
         rien passé, et le dire serait mentir à l'admin. */
      console.error("[admin/fondateur-rattacher] journal en échec", numero.id, numeroFondateur);
      return NextResponse.json({ error: "journal" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        numeroFondateur,
        prenomFondateur: wl?.prenom?.trim() || null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/fondateur-rattacher] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
