import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

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
async function generateUniqueCode(supabase: any): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const { data } = await supabase
      .from("waitlist")
      .select("id")
      .eq("ref_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Impossible de générer un ref_code unique.");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, referred_by } = body as {
      email?: string;
      firstName?: string;
      referred_by?: string;
    };

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

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_WAITLIST_LIST_ID);
    if (!apiKey || !listId) {
      return NextResponse.json({ message: "Configuration Brevo manquante." }, { status: 500 });
    }

    const supabase = makeSupabase();

    // Vérifier si l'email est déjà enregistré
    const { data: existing } = await supabase
      .from("waitlist")
      .select("ref_code")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "already_registered", ref_code: existing.ref_code },
        { status: 200 }
      );
    }

    // Générer un ref_code unique
    const ref_code = await generateUniqueCode(supabase);

    // Insérer dans waitlist
    const insertPayload: Record<string, unknown> = {
      email: normalizedEmail,
      prenom: firstName || null,
      ref_code,
    };
    if (referred_by) insertPayload.referred_by = referred_by;

    const { error: insertError } = await supabase.from("waitlist").insert(insertPayload);
    if (insertError) {
      return NextResponse.json(
        { message: "Erreur lors de l'enregistrement." },
        { status: 500 }
      );
    }

    // Créditer le parrain si referred_by valide
    if (referred_by) {
      const { data: parrain } = await supabase
        .from("waitlist")
        .select("email")
        .eq("ref_code", referred_by)
        .maybeSingle();

      if (parrain?.email) {
        await supabase.from("credits").insert({
          email: parrain.email,
          montant: 5,
          source: ref_code,
          applique: false,
        });
      }
    }

    // Synchroniser avec Brevo
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        attributes: {
          PRENOM: firstName || "",
          REF_CODE: ref_code,
        },
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!brevoResponse.ok) {
      return NextResponse.json(
        { message: "Une erreur s'est glissée. Réessayez dans un instant." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ref_code }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Une erreur s'est glissée. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
