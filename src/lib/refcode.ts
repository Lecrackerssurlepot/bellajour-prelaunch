import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Génère un ref_code unique basé sur le prénom (préfixe "BJ-").
 *
 * Source UNIQUE — réutilisé par /api/waitlist (inscription) ET /api/checkout
 * (pré-commande), pour que le code affiché soit humain (BJ-MARIE) et cohérent
 * entre les deux parcours. Extrait verbatim de l'historique waitlist.
 *
 * Unicité : nettoyage du prénom (NFD → sans diacritiques → [A-Za-z] → MAJ),
 * base "BJ-<PRENOM>" vérifiée en base, sinon suffixe "-2"…"-99". Prénom vide
 * (ou nettoyé vide) → code aléatoire "BJ-XXXX" (10 tentatives, check collision).
 * Lève si épuisement — l'appelant décide du fallback.
 */
export async function generateUniqueCode(supabase: SupabaseClient, prenom?: string): Promise<string> {
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
