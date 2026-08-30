import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { signToken, verifyTokenConfirmation } from "@/lib/ambassadeur-token";
import { sendBrevoEmail } from "@/lib/brevo";

/* POST /api/ambassadeur/confirmer  —  { token }
 *
 * C'est ICI, et nulle part ailleurs, qu'une personne DÉJÀ dans `waitlist`
 * devient ambassadrice (T-040).
 *
 * Pourquoi cette route existe : `register` promouvait n'importe quelle ligne
 * sur simple saisie de son adresse, sans aucune preuve de possession. Il
 * posait `ambassadeur_consent_at` et `ambassadeur_charte_version` à la date du
 * jour — une signature de charte que la personne n'avait jamais donnée, et
 * qu'on aurait produite comme preuve si elle contestait. Et si elle était
 * déjà ambassadrice, le mail A1 ne partait pas : elle ne l'apprenait jamais.
 *
 * Le token de confirmation ne voyage que par mail, donc l'ouvrir PROUVE la
 * possession de la boîte. Le consentement est écrit à cet instant-là, par
 * quelqu'un qui a la main sur l'adresse.
 *
 * ⚠️ `verifyTokenConfirmation` et pas `verifyToken` : un lien d'accès ordinaire
 * — que n'importe qui peut faire envoyer à n'importe quelle adresse via
 * `request-access` — ne doit JAMAIS pouvoir promouvoir sa destinataire.
 *
 * Idempotente : deux clics sur le même lien ne réécrivent pas le consentement
 * et ne renvoient pas deux fois le mail de bienvenue. */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";
const CHARTE_VERSION = "cercle-2026-vague-1";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
    }
    const token = (body as { token?: unknown })?.token;
    const emailCanonical = verifyTokenConfirmation(
      typeof token === "string" ? token : null,
    );
    if (!emailCanonical) {
      return NextResponse.json({ error: "token_invalide" }, { status: 401 });
    }

    const supabase = makeSupabase();

    const { data: ligne, error: errLecture } = await supabase
      .from("waitlist")
      .select("email, prenom, ref_code, is_ambassadeur")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    /* Une erreur de base n'est PAS une absence de ligne : la confondre dirait
       à la personne que son inscription n'existe pas, et elle n'aurait aucune
       raison de réessayer. Même piège que T-043. */
    if (errLecture) {
      console.error("[ambassadeur/confirmer] lecture échouée", errLecture.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!ligne) {
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    }

    /* Déjà ambassadrice : on ne réécrit RIEN. Réécrire `consent_at` écraserait
       la date de sa vraie signature par celle d'aujourd'hui. */
    if (ligne.is_ambassadeur === true) {
      return NextResponse.json({ ok: true, deja: true }, { status: 200 });
    }

    const { error: errMaj } = await supabase
      .from("waitlist")
      .update({
        is_ambassadeur: true,
        ambassadeur_consent_at: new Date().toISOString(),
        ambassadeur_charte_version: CHARTE_VERSION,
      })
      .eq("email_canonical", emailCanonical)
      /* Garde de concurrence : deux clics simultanés n'écrivent qu'une fois. */
      .or("is_ambassadeur.is.null,is_ambassadeur.eq.false");

    if (errMaj) {
      console.error("[ambassadeur/confirmer] promotion échouée", errMaj.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* A1, la bienvenue — envoyée MAINTENANT, à la vraie entrée dans le Cercle,
       et non plus au moment où quelqu'un tapait une adresse dans un formulaire.
       Best-effort : un mail ne doit jamais faire échouer une action métier. */
    try {
      const prenom = ligne.prenom || "";
      const shareUrl = ligne.ref_code
        ? `${SITE_URL}/preventes?ref=${ligne.ref_code}`
        : `${SITE_URL}/preventes`;
      await sendBrevoEmail({
        templateId: Number(process.env.BREVO_TEMPLATE_A1_ID) || undefined,
        email: ligne.email ?? "",
        name: prenom,
        params: {
          PRENOM: prenom,
          SHARE_URL: shareUrl,
          DASHBOARD_URL: `${SITE_URL}/ambassadeurs/espace?token=${signToken(emailCanonical)}`,
        },
        apiKey: process.env.BREVO_API_KEY,
        label: "A1",
      });
    } catch (err) {
      console.error("[ambassadeur/confirmer] A1 échec (non bloquant)", err);
    }

    return NextResponse.json({ ok: true, deja: false }, { status: 200 });
  } catch (err) {
    console.error("[ambassadeur/confirmer] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
