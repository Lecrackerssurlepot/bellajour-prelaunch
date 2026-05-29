import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidRefCode } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get("code") || "").trim();

    if (!code || !isValidRefCode(code)) {
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
