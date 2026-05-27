import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
  return createClient(url, key);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") || "").trim();

    if (!code || !/^[A-Z0-9-]{3,30}$/i.test(code)) {
      return NextResponse.json({ prenom: null }, { status: 200 });
    }

    const supabase = makeSupabase();
    const { data } = await supabase
      .from("waitlist")
      .select("prenom")
      .eq("ref_code", code)
      .maybeSingle();

    return NextResponse.json({ prenom: data?.prenom ?? null }, { status: 200 });
  } catch (error) {
    console.error("[/api/referrer] ERREUR:", error);
    return NextResponse.json({ prenom: null }, { status: 200 });
  }
}
