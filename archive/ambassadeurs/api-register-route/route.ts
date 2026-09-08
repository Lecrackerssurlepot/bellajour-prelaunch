import { NextResponse } from "next/server";
import { canonicalizeEmail } from "@/lib/email";
import { makeSupabase } from "@/lib/supabase";
import { generateUniqueCode } from "@/lib/refcode";
import { signToken, signTokenShort, signTokenConfirmation } from "@/lib/ambassadeur-token";
import { sendBrevoEmail, upsertBrevoContact } from "@/lib/brevo";

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

    /* ════════════════════════════════════════════════════════════════════
       UNE ADRESSE DÉJÀ CONNUE NE SE PROMEUT PLUS ICI (T-040, 29/08/2026)
       ════════════════════════════════════════════════════════════════════
       Avant : ce formulaire posait `is_ambassadeur`, `ambassadeur_consent_at`
       et `ambassadeur_charte_version` sur la ligne de N'IMPORTE QUELLE
       adresse saisie, sans aucune preuve de possession, et rendait dans la
       réponse HTTP un lien d'accès valable une heure.
       Deux dommages, dont le second est le plus grave :
       - on lisait le tableau de bord d'une cliente (son prénom, son code, les
         prénoms de ses filleules) en une requête ;
       - on FABRIQUAIT une signature de charte horodatée qu'elle n'avait jamais
         donnée, et qu'on aurait produite comme preuve si elle contestait. Et
         si elle était déjà ambassadrice, A1 ne partait pas : elle ne
         l'apprenait jamais.
       Le commentaire de l'ancien `dashboard_url` assumait le premier risque
       (« le dashboard ne révèle que des prénoms »). Il ne disait rien du
       second, et c'est celui-là qui n'était pas défendable.

       Désormais : aucune écriture, aucun `ref_code` rendu (ce serait le même
       aveu d'existence que T-045), et le lien part par MAIL. La promotion a
       lieu dans /api/ambassadeur/confirmer, quand la personne ouvre le lien —
       donc quand elle a prouvé qu'elle tient la boîte.
       La réponse est la MÊME que la ligne existe ou non côté « déjà inscrite »,
       pour ne rien révéler à qui sonderait des adresses. */
    if (existing) {
      try {
        const lienConfirmation =
          `${SITE_URL}/ambassadeurs/espace` +
          `?token=${signTokenConfirmation(emailCanonical)}&confirmer=1`;
        await sendBrevoEmail({
          templateId: Number(process.env.BREVO_TEMPLATE_A2_ID) || undefined,
          email: normalizedEmail,
          name: existing.prenom || cleanPrenom,
          params: { PRENOM: existing.prenom || cleanPrenom, DASHBOARD_URL: lienConfirmation },
          apiKey: process.env.BREVO_API_KEY,
          label: "A2-confirmation",
        });
      } catch (err) {
        /* Best-effort, comme tout envoi : ne jamais faire échouer l'action
           métier. ⚠️ Contrepartie connue : un mail qui ne part pas ne remonte
           que dans les journaux Vercel. */
        console.error("[ambassadeur] A2 de confirmation échec (non bloquant)", err);
      }
      return NextResponse.json({ pending_confirmation: true }, { status: 200 });
    }

    /* À partir d'ici, la ligne n'existait PAS : on la crée. Rien à usurper,
       donc le consentement saisi dans le formulaire est bien celui de la
       personne qui vient d'ouvrir ce compte. */
    let refCode: string;

    {
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

    // Contact Brevo — cet endpoint insère en waitlist sans passer par /api/waitlist,
    // donc sans /v3/contacts. Sans ceci l'ambassadeur reste hors de toute campagne.
    await upsertBrevoContact({
      label: "contact",
      email: normalizedEmail,
      prenom: cleanPrenom || null,
      refCode: refCode || null,
      refLink: shareUrl,
      listId: Number(process.env.BREVO_WAITLIST_LIST_ID) || undefined,
      apiKey: process.env.BREVO_API_KEY,
    });

    // A1 (best-effort, jamais bloquant) — UNIQUEMENT pour un nouvel ambassadeur.
    // Dashboard via lien magique signé 7 j (builder existant signToken, inchangé).
    {
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
    // ⚠️ Sécurité : cet accès ne prouve pas la possession de l'email. Le risque
    // était réel tant que ce chemin servait AUSSI les adresses déjà connues —
    // on lisait alors le tableau de bord d'une cliente en une requête (T-040).
    // Depuis le 29/08 il n'est atteint que pour une ligne qu'on vient de CRÉER :
    // il n'y a rien à usurper, la personne consulte ce qu'elle vient de saisir.
    // Une adresse déjà connue passe par le mail et /api/ambassadeur/confirmer.
    // Le token reste court (1 h) ; l'accès durable est le lien magique 7 j.
    const dashboardUrlShort = `/ambassadeurs/espace?token=${signTokenShort(emailCanonical)}`;

    return NextResponse.json(
      {
        ref_code: refCode,
        share_url: shareUrl,
        already_ambassador: false,
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
