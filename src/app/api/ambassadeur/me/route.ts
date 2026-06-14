import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { verifyToken } from "@/lib/ambassadeur-token";

/* GET /api/ambassadeur/me?token=...
   Données du dashboard ambassadeur. Vérifie le token signé à CHAQUE appel.
   ⚠️ Confidentialité : ne renvoie JAMAIS d'email — uniquement des prénoms.
   Ne compte QUE le confirmé (jamais le "pending"). */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const emailCanonical = verifyToken(token);
  if (!emailCanonical) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  try {
    const supabase = makeSupabase();

    // Ambassadeur : on récupère l'email d'AFFICHAGE (= la valeur stockée dans
    // pages_credits.email) + le ref_code. Doit être is_ambassadeur=true.
    const { data: amb } = await supabase
      .from("waitlist")
      .select("email, prenom, ref_code, is_ambassadeur")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    if (!amb?.is_ambassadeur || !amb.email) {
      return NextResponse.json({ error: "not_ambassadeur" }, { status: 401 });
    }

    // Crédits de PARRAINAGE confirmés (niveau 1 direct + niveau 2 indirect, +5 chacun).
    // On exclut volontairement le niveau 0 (+3 bonus de bienvenue perso) pour que
    // parrainages = pages / 5 tombe exact et colle au calculateur public.
    const { data: credits } = await supabase
      .from("pages_credits")
      .select("montant, niveau, filleul_email")
      .eq("email", amb.email)
      .eq("status", "confirmed")
      .in("niveau", [1, 2]);

    const rows = credits ?? [];
    const pagesConfirmees = rows.reduce((sum, r) => sum + (r.montant ?? 0), 0);
    const parrainages = Math.floor(pagesConfirmees / 5);

    // Filleuls DIRECTS confirmés (niveau 1) → prénoms uniquement.
    const filleulEmails = rows
      .filter((r) => r.niveau === 1 && r.filleul_email)
      .map((r) => r.filleul_email as string);

    let filleuls: string[] = [];
    if (filleulEmails.length > 0) {
      const { data: filleulRows } = await supabase
        .from("waitlist")
        .select("prenom")
        .in("email", filleulEmails);
      filleuls = (filleulRows ?? [])
        .map((f) => (f.prenom || "").trim())
        .filter((p) => p.length > 0);
    }

    return NextResponse.json(
      {
        prenom: amb.prenom || "",
        ref_code: amb.ref_code,
        share_url: amb.ref_code
          ? `${SITE_URL}/preventes?ref=${amb.ref_code}`
          : `${SITE_URL}/preventes`,
        pages_confirmees: pagesConfirmees,
        parrainages,
        filleuls, // prénoms only — aucun email
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[ambassadeur] me exception", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
