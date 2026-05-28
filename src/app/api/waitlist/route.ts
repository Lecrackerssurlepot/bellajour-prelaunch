import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canonicalizeEmail } from "@/lib/email";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";
const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";
const W1_REF_LINK_BASE = "https://www.bellajour.fr";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 3 : 20;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === 'production' ? 60_000 : 10_000;

async function sendWelcomeEmailW1(
  email: string,
  prenom: string,
  refCode: string,
  apiKey: string
): Promise<void> {
  const templateId = Number(process.env.BREVO_TEMPLATE_W1_ID);
  if (!templateId) {
    console.error("[brevo] W1 skip — BREVO_TEMPLATE_W1_ID manquant");
    return;
  }
  try {
    const res = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        templateId,
        to: [{ email, name: prenom || email }],
        params: {
          PRENOM: prenom || "",
          REF_CODE: refCode,
          REF_LINK: `${W1_REF_LINK_BASE}/?ref=${refCode}`,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[brevo] W1 échec ${email} → ${res.status} ${body}`);
    } else {
      console.log(`[brevo] W1 envoyé ${email} (ref_code=${refCode})`);
    }
  } catch (err) {
    console.error(`[brevo] W1 exception ${email}`, err);
  }
}

async function updateBrevoContact(
  email: string,
  attributes: Record<string, string | number>,
  apiKey: string
): Promise<void> {
  try {
    const res = await fetch(`${BREVO_API_URL}/${encodeURIComponent(email)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({ attributes }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[brevo] update échec ${email} → ${res.status} ${body}`);
    } else {
      console.log(`[brevo] update OK ${email}`, attributes);
    }
  } catch (err) {
    console.error(`[brevo] update exception ${email}`, err);
  }
}

function makeSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
  return createClient(url, key);
}

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BJ-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateUniqueCode(supabase: any, prenom?: string): Promise<string> {
  const clean = prenom
    ? prenom.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase()
    : "";

  if (!clean) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let attempt = 0; attempt < 10; attempt++) {
      let suffix = "";
      for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
      const code = "BJ-" + suffix;
      const { data } = await supabase.from("waitlist").select("id").eq("ref_code", code).maybeSingle();
      if (!data) return code;
    }
    throw new Error("Impossible de générer un ref_code unique.");
  }

  const base = "BJ-" + clean;
  const { data: first } = await supabase.from("waitlist").select("id").eq("ref_code", base).maybeSingle();
  if (!first) return base;

  for (let n = 2; n <= 99; n++) {
    const code = base + "-" + n;
    const { data } = await supabase.from("waitlist").select("id").eq("ref_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Impossible de générer un ref_code unique.");
}

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
          { status: 429 }
        );
      }
      entry.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    const body = await request.json();
    const { email, prenom, referred_by, check_only } = body as {
      email?: string;
      prenom?: string;
      referred_by?: string;
      check_only?: boolean;
    };

    const cleanPrenom = prenom ? prenom.replace(/<[^>]*>/g, '').trim().slice(0, 50) : undefined;

    // G2 — Format-check serveur du ref_code (même regex que /api/referrer).
    // Invalide → traité comme absent : inscription OK, 0 crédit, pas de stockage du déchet.
    const safeReferredBy =
      typeof referred_by === "string" && /^[A-Z0-9-]{3,30}$/i.test(referred_by.trim())
        ? referred_by.trim()
        : undefined;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Adresse email manquante." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Cette adresse ne nous semble pas valide." },
        { status: 400 }
      );
    }

    // Forme canonique anti-alias (Gmail dots + tags). Sert UNIQUEMENT à la
    // déduplication et à l'anti-auto-parrainage. L'email d'origine reste la
    // valeur stockée pour l'affichage et envoyée à Brevo.
    const emailCanonical = canonicalizeEmail(normalizedEmail);

    const supabase = makeSupabase();

    // Vérifier si l'email est déjà enregistré (comparaison canonique)
    const { data: existing } = await supabase
      .from("waitlist")
      .select("ref_code, prenom")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    if (existing) {
      if (check_only) {
        return NextResponse.json({ error: "already_registered", ref_code: existing.ref_code }, { status: 200 });
      }
      return NextResponse.json(
        { success: false, error: "already_registered", ref_code: existing.ref_code, prenom: existing.prenom ?? null },
        { status: 200 }
      );
    }

    // Mode vérification seule — pas d'insertion
    if (check_only) {
      return NextResponse.json({ available: true }, { status: 200 });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_WAITLIST_LIST_ID);
    if (!apiKey || !listId) {
      return NextResponse.json({ message: "Une erreur s'est glissée. Réessayez dans un instant." }, { status: 500 });
    }

    // Générer un ref_code unique et insérer avec retry sur contrainte UNIQUE (race condition)
    let ref_code = await generateUniqueCode(supabase, cleanPrenom);
    const insertPayload: Record<string, unknown> = {
      email: normalizedEmail,
      email_canonical: emailCanonical,
      prenom: cleanPrenom || null,
    };
    if (safeReferredBy) insertPayload.referred_by = safeReferredBy;

    let insertError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase.from("waitlist").insert({ ...insertPayload, ref_code });
      insertError = result.error;
      if (!insertError) break;
      if (insertError.code !== "23505") break;
      ref_code = await generateUniqueCode(supabase, cleanPrenom);
    }

    if (insertError) {
      return NextResponse.json(
        { message: "Une erreur s'est glissée. Réessayez dans un instant." },
        { status: 500 }
      );
    }

    // Créditer le parrain si referred_by valide + récupérer son prénom pour Brevo
    let prenomParrain = "";
    let parrainValide = false;
    if (safeReferredBy) {
      const { data: parrain } = await supabase
        .from("waitlist")
        .select("email, email_canonical, prenom")
        .eq("ref_code", safeReferredBy)
        .maybeSingle();

      // Anti-auto-parrainage : compare sur la forme canonique pour bloquer
      // les alias Gmail (jane+1@gmail.com → jane@gmail.com).
      if (parrain?.email && parrain.email_canonical !== emailCanonical) {
        parrainValide = true;
        prenomParrain = parrain.prenom || "";
        // Upsert idempotent : si un crédit existe déjà pour ce filleul (replay,
        // retry, race condition), on ne crée pas de doublon. La contrainte
        // UNIQUE(source) en base garantit qu'un filleul = 1 crédit max.
        const { error: creditError } = await supabase
          .from("pages_credits")
          .upsert(
            {
              email: parrain.email,
              montant: 5,
              source: ref_code,
              applique: false,
              status: "pending",
            },
            { onConflict: "source", ignoreDuplicates: true }
          );
        if (creditError) {
          console.error(`[parrainage] crédit échec source=${ref_code}`, creditError);
        } else {
          console.log(`[parrainage] crédit OK (upsert) → parrain=${parrain.email} source=${ref_code}`);
        }

        // Compter les filleuls du parrain (inclut le filleul qui vient d'être inséré)
        const { count: nbProches } = await supabase
          .from("waitlist")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", safeReferredBy);

        const nb = nbProches ?? 1;
        console.log(`[parrainage] ${parrain.email} → +1 filleul (${cleanPrenom || "?"}), total=${nb}`);

        await updateBrevoContact(
          parrain.email,
          {
            PRENOM_PROCHE: cleanPrenom || "",
            NB_PROCHES: nb,
            NB_PAGES_ACCUMULEES: 5 * nb,
          },
          apiKey
        );
      }
    }

    // Synchroniser avec Brevo
    const brevoAttributes: Record<string, string> = {
      PRENOM: cleanPrenom || "",
      REF_CODE: ref_code,
      REF_LINK: `${SITE_URL}/?ref=${ref_code}`,
    };
    if (prenomParrain) brevoAttributes.PRENOM_PARRAIN = prenomParrain;

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        attributes: brevoAttributes,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!brevoResponse.ok) {
      const body = await brevoResponse.text().catch(() => "");
      console.error(`[brevo] create échec ${normalizedEmail} → ${brevoResponse.status} ${body}`);
    } else {
      console.log(`[brevo] create OK ${normalizedEmail}`, brevoAttributes);
    }

    // W1 — bienvenue waitlist : uniquement si inscription SANS parrain valide
    if (!parrainValide) {
      await sendWelcomeEmailW1(normalizedEmail, cleanPrenom || "", ref_code, apiKey);
    }

    return NextResponse.json({ success: true, ref_code }, { status: 200 });
  } catch (error) {
    console.error("[/api/waitlist] ERREUR:", error);
    return NextResponse.json(
      { message: "Une erreur s'est glissée. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
