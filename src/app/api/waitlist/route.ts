import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 3 : 20;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === 'production' ? 60_000 : 10_000;

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

    const supabase = makeSupabase();

    // Vérifier si l'email est déjà enregistré
    const { data: existing } = await supabase
      .from("waitlist")
      .select("ref_code, prenom")
      .eq("email", normalizedEmail)
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
      prenom: cleanPrenom || null,
    };
    if (referred_by) insertPayload.referred_by = referred_by;

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
    if (referred_by) {
      const { data: parrain } = await supabase
        .from("waitlist")
        .select("email, prenom")
        .eq("ref_code", referred_by)
        .maybeSingle();

      if (parrain?.email && parrain.email !== normalizedEmail) {
        prenomParrain = parrain.prenom || "";
        await supabase.from("credits").insert({
          email: parrain.email,
          montant: 5,
          source: ref_code,
          applique: false,
        });
      }
    }

    // Synchroniser avec Brevo
    const brevoAttributes: Record<string, string> = {
      PRENOM: cleanPrenom || "",
      REF_CODE: ref_code,
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
      console.error("[/api/waitlist] Brevo sync failed:", brevoResponse.status);
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
