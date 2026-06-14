import { NextResponse } from "next/server";
import { canonicalizeEmail } from "@/lib/email";
import { makeSupabase } from "@/lib/supabase";
import { generateUniqueCode } from "@/lib/refcode";
import { signToken, signTokenShort } from "@/lib/ambassadeur-token";
import { sendBrevoEmail } from "@/lib/brevo";

/* POST /api/ambassadeur/register
   Inscription (ou ré-inscription) d'un ambassadeur du Cercle.
   - Upsert sur email_canonical : ne RECRÉE jamais la mécanique de crédit, ne
     downgrade JAMAIS un statut existant (founder/confirmed/pending intacts).
   - charte_version : décidé côté serveur (le front l'envoie pour affichage seulement).
   - Hooks mail : stub, branché plus tard sur Brevo. */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";
const CHARTE_VERSION = "cercle-2026-vague-1";

// Rate-limit in-memory (même pattern que /api/waitlist).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 3 : 20;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

export async function POST(request: Request) {
  try {
    const now = Date.now();
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt < now) rateLimitMap.delete(key);
    }
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const entry = rateLimitMap.get(ip);
    if (entry && entry.resetAt > now) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { message: "Trop de tentatives. Réessayez dans quelques instants." },
          { status: 429 },
        );
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await request.json().catch(() => ({}));
    // charte_version est envoyé par le front pour affichage, mais le serveur fait foi
    // (CHARTE_VERSION) : on ne le lit donc pas ici.
    const { prenom, email, charte_accepted } = body as {
      prenom?: string;
      email?: string;
      charte_accepted?: boolean;
    };

    // Acceptation de la charte OBLIGATOIRE (= signature).
    if (charte_accepted !== true) {
      return NextResponse.json(
        { message: "Vous devez accepter la charte du Cercle Ambassadeur." },
        { status: 400 },
      );
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Adresse email manquante." }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Cette adresse ne nous semble pas valide." },
        { status: 400 },
      );
    }

    const cleanPrenom = prenom ? prenom.replace(/<[^>]*>/g, "").trim().slice(0, 50) : "";
    if (!cleanPrenom) {
      return NextResponse.json({ message: "Votre prénom est requis." }, { status: 400 });
    }

    const emailCanonical = canonicalizeEmail(normalizedEmail);
    const supabase = makeSupabase();

    // Ligne existante ? (comparaison canonique anti-alias)
    const { data: existing } = await supabase
      .from("waitlist")
      .select("ref_code, prenom, is_ambassadeur")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    // État AVANT cet appel : la personne était-elle déjà ambassadeur ?
    // (le SELECT lit l'état antérieur à tout UPDATE ci-dessous → ordre correct)
    const wasAlreadyAmbassador = existing?.is_ambassadeur === true;

    let refCode: string;

    if (existing) {
      // UPDATE — on PROMEUT en ambassadeur sans toucher status / offer_type / numero_fondateur.
      // prenom seulement s'il était vide (on ne réécrit pas un prénom déjà saisi).
      const updatePayload: Record<string, unknown> = {
        is_ambassadeur: true,
        ambassadeur_consent_at: new Date().toISOString(),
        ambassadeur_charte_version: CHARTE_VERSION,
      };
      if (!existing.prenom) updatePayload.prenom = cleanPrenom;

      const { error: updateError } = await supabase
        .from("waitlist")
        .update(updatePayload)
        .eq("email_canonical", emailCanonical);
      if (updateError) {
        console.error("[ambassadeur] update échec", updateError);
        return NextResponse.json(
          { message: "Une erreur s'est glissée. Réessayez dans un instant." },
          { status: 500 },
        );
      }
      refCode = existing.ref_code;
    } else {
      // INSERT — nouvelle ligne waitlist directement marquée ambassadeur.
      // Retry ciblé sur collision ref_code (23505), comme /api/waitlist.
      let ref = await generateUniqueCode(supabase, cleanPrenom);
      let inserted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: insertError } = await supabase.from("waitlist").insert({
          email: normalizedEmail,
          email_canonical: emailCanonical,
          prenom: cleanPrenom,
          ref_code: ref,
          status: "waitlist",
          is_ambassadeur: true,
          consent_at: new Date().toISOString(),
          ambassadeur_consent_at: new Date().toISOString(),
          ambassadeur_charte_version: CHARTE_VERSION,
        });
        if (!insertError) {
          inserted = true;
          break;
        }
        // Collision ref_code → régénère et retry. Toute autre erreur → bail.
        if (insertError.code === "23505" && /ref_code/.test(insertError.message || "")) {
          ref = await generateUniqueCode(supabase, cleanPrenom);
          continue;
        }
        // Course possible : un autre chemin a inséré ce même email entre le check et l'insert.
        if (insertError.code === "23505") {
          const { data: race } = await supabase
            .from("waitlist")
            .select("ref_code")
            .eq("email_canonical", emailCanonical)
            .maybeSingle();
          if (race?.ref_code) {
            await supabase
              .from("waitlist")
              .update({
                is_ambassadeur: true,
                ambassadeur_consent_at: new Date().toISOString(),
                ambassadeur_charte_version: CHARTE_VERSION,
              })
              .eq("email_canonical", emailCanonical);
            ref = race.ref_code;
            inserted = true;
            break;
          }
        }
        console.error("[ambassadeur] insert échec", insertError);
        return NextResponse.json(
          { message: "Une erreur s'est glissée. Réessayez dans un instant." },
          { status: 500 },
        );
      }
      if (!inserted) {
        return NextResponse.json(
          { message: "Une erreur s'est glissée. Réessayez dans un instant." },
          { status: 500 },
        );
      }
      refCode = ref;
    }

    // Lien de partage : pointe directement vers /preventes (le filleul atterrit en haut,
    // découvre le parcours, convertit sur place ; S4Reservation capture ?ref= au mount →
    // attribution préservée). Forme identique au générateur de /api/ambassadeur/me.
    const shareUrl = refCode ? `${SITE_URL}/preventes?ref=${refCode}` : `${SITE_URL}/preventes`;

    // A1 (best-effort, jamais bloquant) — UNIQUEMENT pour un nouvel ambassadeur.
    // Dashboard via lien magique signé 7 j (builder existant signToken, inchangé).
    if (!wasAlreadyAmbassador) {
      try {
        const dashboardUrl = `${SITE_URL}/ambassadeurs/espace?token=${signToken(emailCanonical)}`;
        await sendBrevoEmail({
          templateId: Number(process.env.BREVO_TEMPLATE_A1_ID) || undefined,
          email: normalizedEmail,
          name: cleanPrenom,
          params: { PRENOM: cleanPrenom, SHARE_URL: shareUrl, DASHBOARD_URL: dashboardUrl },
          apiKey: process.env.BREVO_API_KEY,
          label: "A1",
        });
      } catch (err) {
        console.error("[ambassadeur] A1 échec (non bloquant)", err);
      }
    }

    // Accès direct « Voir mon espace » depuis l'écran de succès, sans attendre le mail.
    // URL RELATIVE (pas de SITE_URL) → le bouton reste sur l'origine courante (preview
    // ou prod), évitant un 404 en preview. Le mail, lui, garde l'URL absolue ci-dessus.
    // ⚠️ Sécurité : cet accès NE prouve PAS la possession de l'email. On l'accepte car
    // le dashboard ne révèle que des prénoms et un nombre de pages (jamais d'email), et
    // le token est court (1 h) pour limiter le risque. L'accès durable reste le lien
    // magique 7 j envoyé par mail.
    const dashboardUrlShort = `/ambassadeurs/espace?token=${signTokenShort(emailCanonical)}`;

    return NextResponse.json(
      {
        ref_code: refCode,
        share_url: shareUrl,
        already_ambassador: wasAlreadyAmbassador,
        dashboard_url: dashboardUrlShort,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[ambassadeur] register exception", err);
    return NextResponse.json(
      { message: "Une erreur s'est glissée. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
