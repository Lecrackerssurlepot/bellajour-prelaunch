/**
 * POST /api/atelier/numero — fin de l'écran 4 du questionnaire (PRD §7.2).
 *
 * Crée la ligne `numeros`, génère le token public et journalise l'événement
 * fondateur du dossier. C'est la PREMIÈRE écriture en base du parcours : les
 * écrans 1 à 3 ne vivent qu'en localStorage.
 *
 * Route distincte de /api/waitlist et /api/checkout, qui servent la prévente :
 * aucune table de la prévente n'est lue ni écrite ici.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { generateNumeroToken, isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

/* Même garde-fou que /api/waitlist : mémoire de l'instance, suffisant pour
   décourager le rejeu, jamais présenté comme une protection forte. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 5 : 30;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Plafonds de saisie — coupent au lieu de rejeter : personne ne perd son
   texte parce qu'il a écrit trois lignes de trop. */
const MAX = { occasion: 120, histoire: 4000, titre: 34, prenom: 60, telephone: 30 };

/* Sorti du corps de POST pour servir aussi à PATCH : les deux écrivent en
   base et méritent le même garde-fou. */
function depasseLePlafond(request: Request): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
  }
  rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    if (depasseLePlafond(request)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Trop de tentatives. Réessayez dans un instant." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const email = clean(body.email, 200).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const prenom = clean(body.prenom, MAX.prenom);
    if (!prenom) {
      return NextResponse.json({ error: "prenom_required" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const token = generateNumeroToken();

    /* Le titre peut être vide : l'écran 3 laisse explicitement le choix de
       « Je ne sais pas encore, choisissez pour moi ». L'atelier tranchera. */
    const { data, error } = await supabase
      .from("numeros")
      .insert({
        token,
        etat: "photos_recues",
        occasion: clean(body.occasion, MAX.occasion) || null,
        histoire: clean(body.histoire, MAX.histoire) || null,
        titre: clean(body.titre, MAX.titre) || null,
        prenom,
        email,
        email_canonical: canonicalizeEmail(email),
        telephone: clean(body.telephone, MAX.telephone) || null,
      })
      .select("id, token")
      .single();

    if (error || !data) {
      console.error("[atelier/numero] insert échoué", error?.code, error?.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Invariant nº6 — le dossier commence par une ligne de journal. */
    await logEvenement(supabase, data.id, "numero_cree", {
      etat: "photos_recues",
      source: "questionnaire_ecran_4",
    });

    return NextResponse.json({ token: data.token }, { status: 201 });
  } catch (err) {
    console.error("[atelier/numero] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * PATCH /api/atelier/numero — les consentements de la cliente.
 *
 * `consent_photos` est le droit d'usage des photos : la case obligatoire de
 * l'écran 5, posée au clic sur « Envoyer à l'atelier ». `consent_communication`
 * est la case FACULTATIVE de l'écran 6 — sans elle, aucun extrait du numéro ne
 * peut être publié (PRD §14), et elle doit donc pouvoir être décochée.
 *
 * HORODATAGE. La table ne porte pas de colonne `consent_photos_at` (seules les
 * deux cases du paiement en ont une, cgv_ok_at et renonciation_at). La date
 * fait foi par le journal : `evenements` est append-only et c'est, par
 * construction de la PRD §5, la seule trace opposable d'un dossier. Ajouter
 * une colonne dupliquerait une information que le journal porte déjà mieux.
 *
 * Le token fait foi : pas de compte, pas de session (PRD §7.5).
 */
export async function PATCH(request: Request) {
  try {
    if (depasseLePlafond(request)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const maj: Record<string, boolean> = {};
    /* consent_photos ne se retire pas ici : il conditionne un dépôt déjà
       fait. Un retrait est une demande de suppression, pas une case à
       décocher — elle passe par l'atelier, pas par une requête. */
    if (body.consent_photos === true) maj.consent_photos = true;
    if (typeof body.consent_communication === "boolean") {
      maj.consent_communication = body.consent_communication;
    }
    if (!Object.keys(maj).length) {
      return NextResponse.json({ error: "rien_a_faire" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle();

    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const { error } = await supabase.from("numeros").update(maj).eq("id", numero.id);
    if (error) {
      console.error("[atelier/numero] patch consentements échoué", error.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Invariant nº6 — et ici, c'est aussi l'horodatage. */
    await logEvenement(supabase, numero.id, "consentements", maj);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[atelier/numero] exception PATCH", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
