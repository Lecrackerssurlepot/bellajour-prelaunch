/**
 * POST /api/brevo/webhook — les rebonds, enfin écoutés.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL RÉPARE
 *
 * `sendBrevoEmail` ne sait qu'une chose : Brevo a ACCEPTÉ le mail. Le verrou
 * de `mails_envoyes` l'enregistrait donc comme « envoyé », alors que le
 * verdict réel (arrivé, rebondi, bloqué) tombe quelques secondes plus tard et
 * que personne ne l'écoutait.
 *
 * Conséquence, une faute de frappe sur l'adresse : M0 rebondit, la cliente ne
 * reçoit jamais son lien, ne dépose rien, M2 rebondit à son tour — et comme
 * une seule relance part à vie, le dossier meurt. Dans l'atelier il ressemble
 * à une cliente qui prend son temps. C'était le seul point du parcours qui
 * échouait sans laisser de trace nulle part.
 *
 * AUTH — le modèle du webhook Cloudprinter, qui est aussi celui de la relève :
 * cette route vit HORS du middleware (`/admin/*` et `/api/admin/*` seulement),
 * elle porte donc sa propre porte. Brevo ne signe pas ses webhooks, mais il
 * accepte des EN-TÊTES personnalisés : le secret passe donc par un en-tête, et
 * jamais par l'URL — une URL se retrouve dans les logs, l'historique du shell
 * et le referer. Secret absent de l'env → 404, fermée par défaut. Secret faux
 * → 404 aussi : une route d'administration n'a pas à confirmer son existence.
 *
 * CE QU'ELLE NE FAIT PAS — aucun changement d'état, aucun mail. Un rebond est
 * une INFORMATION pour l'atelier, pas une décision : selon le dossier, la
 * bonne suite est un coup de téléphone, une adresse corrigée à la main, ou
 * rien du tout. Une machine qui trancherait ça se tromperait, et le ferait en
 * silence.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { memeSecret } from "@/lib/atelier/secret";
import { logEvenement } from "@/lib/atelier/evenements";
import { lireSignal, suitePour, typeEvenement } from "@/lib/atelier/rebond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Une adresse peut porter plusieurs numéros (une cliente qui revient). Le
   rebond les concerne TOUS : c'est l'adresse qui est morte, pas le dossier.
   Le plafond n'est là que pour qu'un compte de test aux cent dossiers ne
   déclenche pas cent écritures sur un seul signal. */
const MAX_DOSSIERS = 20;

function autorise(request: Request): boolean {
  const attendu = process.env.BREVO_WEBHOOK_SECRET;
  if (!attendu) {
    console.error("[brevo/webhook] BREVO_WEBHOOK_SECRET absente — accès refusé");
    return false;
  }
  const entete = request.headers.get("authorization") ?? "";
  const bearer = entete.toLowerCase().startsWith("bearer ") ? entete.slice(7) : "";
  const direct = request.headers.get("x-bellajour-secret") ?? "";
  return memeSecret(bearer, attendu) || memeSecret(direct, attendu);
}

export async function POST(request: Request) {
  if (!autorise(request)) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const signal = lireSignal(corps);
  if (!signal) {
    return NextResponse.json({ error: "signal_incomplet" }, { status: 400 });
  }

  const suite = suitePour(signal.evenement);
  const type = typeEvenement(suite);

  /* AVANT TOUT ACCÈS EN BASE. Un webhook abonné trop largement (ou corrigé
     un jour à la main dans leur interface) enverrait un `delivered` par mail
     parti : ouvrir une connexion pour chacun serait payer cher un signal
     qu'on jette. */
  if (!type) {
    return NextResponse.json({ ok: true, ignore: signal.evenement }, { status: 200 });
  }

  try {
    const supabase = makeSupabase();

    /* `email_canonical` et non `email` : c'est la clé qui neutralise les
       points et le « + » de Gmail, et c'est déjà elle qui identifie une
       cliente partout ailleurs. Chercher sur `email` brut raterait le rebond
       d'une adresse écrite autrement à l'inscription. */
    const { data: dossiers, error: errSel } = await supabase
      .from("numeros")
      .select("id, token")
      .eq("email_canonical", canonicalizeEmail(signal.email))
      .order("created_at", { ascending: false })
      .limit(MAX_DOSSIERS)
      .returns<Array<{ id: string; token: string }>>();

    if (errSel) {
      console.error("[brevo/webhook] lecture échouée", errSel.code, errSel.message);
      /* 500 VOLONTAIRE : Brevo réessaie, et son retry est notre filet. */
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const lignes = dossiers ?? [];
    if (!lignes.length) {
      /* Adresse inconnue de l'atelier : un mail de la prévente, ou une
         adresse dont le dossier a été supprimé. Ce n'est pas une erreur, et
         surtout pas de quoi faire réessayer Brevo cent fois. */
      console.log("[brevo/webhook] adresse sans dossier", signal.evenement);
      return new NextResponse(null, { status: 204 });
    }

    /* ── IDEMPOTENCE ────────────────────────────────────────────────────
       Brevo rejoue ses webhooks (retry, renvoi depuis leur interface). Le
       journal est append-only : sans cette garde, un même rebond y écrirait
       trois lignes identiques et la page santé compterait trois alertes pour
       un seul problème. La clé est le `message-id` du mail concerné.
       Sans message-id (signal exotique), on écrit : mieux vaut une ligne en
       double qu'un rebond perdu. */
    let dejaVus = new Set<string>();
    if (signal.messageId) {
      const { data: connus, error: errDedup } = await supabase
        .from("evenements")
        .select("numero_id")
        .eq("type", type)
        .eq("payload->>message_id", signal.messageId)
        .in("numero_id", lignes.map((l) => l.id))
        .returns<Array<{ numero_id: string }>>();

      /* T-038 — son erreur était jetée. Une lecture en échec rendait un
         ensemble VIDE, donc une ligne en double, sans un mot. On préfère
         faire réessayer Brevo : un doublon silencieux dans le journal est
         plus difficile à voir qu'un retry. */
      if (errDedup) {
        console.error("[brevo/webhook] dédoublonnage échoué", errDedup.code, errDedup.message);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
      dejaVus = new Set((connus ?? []).map((c) => c.numero_id));
    }

    /* ── T-038 : ON LIT CE QUE L'ÉCRITURE RÉPOND ────────────────────────
       `logEvenement` est best-effort strict et ne throw JAMAIS. Ignorer sa
       valeur revenait à répondre 200 à Brevo sur une écriture ratée — et
       Brevo ne réessaie que sur un code d'erreur, donc le rebond était perdu
       DÉFINITIVEMENT. C'était le mode de panne exact que cette route existe
       pour supprimer, reproduit dans la route elle-même.
       Un seul échec suffit à faire rendre 500 : leur rejeu est le filet, et
       les lignes déjà écrites sont protégées du doublon par `message-id`. */
    const ecrits: string[] = [];
    let echec = false;
    for (const ligne of lignes) {
      if (dejaVus.has(ligne.id)) continue;
      const ok = await logEvenement(supabase, ligne.id, type, {
        evenement: signal.evenement,
        raison: signal.raison,
        sujet: signal.sujet,
        message_id: signal.messageId,
      });
      if (ok) ecrits.push(ligne.token);
      else echec = true;
    }

    if (echec) {
      console.error(
        `[brevo/webhook] ${signal.evenement} : écriture partielle (${ecrits.length}/${lignes.length}) — 500 pour que Brevo réessaie`,
      );
      return NextResponse.json({ error: "journal_incomplet" }, { status: 500 });
    }

    console.log(
      `[brevo/webhook] ${signal.evenement} → ${type}, ${ecrits.length} dossier(s), ${dejaVus.size} déjà connu(s)`,
    );
    return NextResponse.json({ ok: true, dossiers: ecrits.length }, { status: 200 });
  } catch (err) {
    console.error("[brevo/webhook] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
