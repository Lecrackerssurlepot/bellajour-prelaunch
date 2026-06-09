import { NextResponse } from "next/server";
import { canonicalizeEmail } from "@/lib/email";
import { makeSupabase } from "@/lib/supabase";
import { isValidRefCode } from "@/lib/validation";
import { createPendingReferralCredits } from "@/lib/referral-credits";
import { generateUniqueCode } from "@/lib/refcode";

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

async function sendReferralWelcomeEmailP1(
  email: string,
  prenom: string,
  prenomParrain: string,
  refCode: string,
  apiKey: string
): Promise<void> {
  const templateId = Number(process.env.BREVO_TEMPLATE_P1_ID);
  if (!templateId) {
    console.error("[brevo] P1 skip — BREVO_TEMPLATE_P1_ID manquant");
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
          PRENOM_PARRAIN: prenomParrain || "",
          REF_CODE: refCode,
          REF_LINK: `${W1_REF_LINK_BASE}/?ref=${refCode}`,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[brevo] P1 échec ${email} → ${res.status} ${body}`);
    } else {
      console.log(`[brevo] P1 envoyé ${email} (ref_code=${refCode}, parrain=${prenomParrain})`);
    }
  } catch (err) {
    console.error(`[brevo] P1 exception ${email}`, err);
  }
}

async function sendReferralNotifyEmailP2(
  parrainEmail: string,
  prenomParrain: string,
  prenomProche: string,
  nbProches: number,
  refCodeParrain: string,
  apiKey: string
): Promise<void> {
  const templateId = Number(process.env.BREVO_TEMPLATE_P2_ID);
  if (!templateId) {
    console.error("[brevo] P2 skip — BREVO_TEMPLATE_P2_ID manquant");
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
        to: [{ email: parrainEmail, name: prenomParrain || parrainEmail }],
        params: {
          PRENOM: prenomParrain || "",
          PRENOM_PROCHE: prenomProche || "",
          NB_PROCHES: nbProches,
          NB_PAGES_ACCUMULEES: nbProches * 5,
          REF_CODE: refCodeParrain,
          REF_LINK: `${W1_REF_LINK_BASE}/?ref=${refCodeParrain}`,
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[brevo] P2 échec ${parrainEmail} → ${res.status} ${body}`);
    } else {
      console.log(`[brevo] P2 envoyé ${parrainEmail} (proche=${prenomProche}, nb=${nbProches})`);
    }
  } catch (err) {
    console.error(`[brevo] P2 exception ${parrainEmail}`, err);
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

/**
 * Identifie la colonne en cause d'une violation de contrainte UNIQUE (PG 23505).
 * Inspecte `details` puis `message` (Supabase remonte typiquement
 * "Key (email_canonical)=(jane@gmail.com) already exists.").
 * Renvoie "ref_code" | "email_canonical" | "email" | "unknown".
 */
type UniqueCollisionTarget = "ref_code" | "email_canonical" | "email" | "unknown";
function detectUniqueCollision(err: { details?: string | null; message?: string | null }): UniqueCollisionTarget {
  const blob = `${err.details ?? ""} ${err.message ?? ""}`.toLowerCase();
  if (/\bref_code\b/.test(blob)) return "ref_code";
  if (/\bemail_canonical\b/.test(blob)) return "email_canonical";
  if (/\bemail\b/.test(blob)) return "email";
  return "unknown";
}

function randomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "BJ-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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

    // G2 — Format-check serveur du ref_code (isValidRefCode, partagé avec /api/referrer et /inviter).
    // Invalide → traité comme absent : inscription OK, 0 crédit, pas de stockage du déchet.
    const safeReferredBy =
      typeof referred_by === "string" && isValidRefCode(referred_by.trim())
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

    // Générer un ref_code unique et insérer avec retry CIBLÉ sur 23505.
    // - 23505 sur ref_code → régénère le ref_code et retry (race sur génération).
    // - 23505 sur email / email_canonical → un autre worker a inscrit le même
    //   email entre notre check d'existence et notre insert : court-circuiter
    //   vers le chemin "already_registered" (pas de 500, pas de boucle stérile).
    // - autre erreur → bail 500.
    let ref_code = await generateUniqueCode(supabase, cleanPrenom);
    const insertPayload: Record<string, unknown> = {
      email: normalizedEmail,
      email_canonical: emailCanonical,
      prenom: cleanPrenom || null,
    };
    if (safeReferredBy) insertPayload.referred_by = safeReferredBy;

    let insertError = null;
    let raceAlreadyRegistered = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await supabase.from("waitlist").insert({ ...insertPayload, ref_code });
      insertError = result.error;
      if (!insertError) break;
      if (insertError.code !== "23505") break;
      const collisionColumn = detectUniqueCollision(insertError);
      if (collisionColumn === "ref_code") {
        ref_code = await generateUniqueCode(supabase, cleanPrenom);
        continue;
      }
      if (collisionColumn === "email" || collisionColumn === "email_canonical") {
        raceAlreadyRegistered = true;
        break;
      }
      // Collision sur une autre colonne unique inconnue → ne pas boucler.
      break;
    }

    if (raceAlreadyRegistered) {
      const { data: existingRace } = await supabase
        .from("waitlist")
        .select("ref_code, prenom")
        .eq("email_canonical", emailCanonical)
        .maybeSingle();
      return NextResponse.json(
        {
          success: false,
          error: "already_registered",
          ref_code: existingRace?.ref_code ?? null,
          prenom: existingRace?.prenom ?? null,
        },
        { status: 200 }
      );
    }

    if (insertError) {
      return NextResponse.json(
        { message: "Une erreur s'est glissée. Réessayez dans un instant." },
        { status: 500 }
      );
    }

    // Créditer le parrain si referred_by valide + récupérer son prénom pour Brevo.
    // La CRÉATION des crédits pending (anti-auto-parrainage inclus) est factorisée dans
    // createPendingReferralCredits (source de vérité partagée avec /api/checkout).
    // Ici on garde les effets SPÉCIFIQUES au signup : count filleuls + Brevo + email P2.
    let prenomParrain = "";
    let parrainValide = false;
    if (safeReferredBy) {
      const credit = await createPendingReferralCredits({
        supabase,
        referredBy: safeReferredBy,
        filleulEmail: normalizedEmail,
        filleulEmailCanonical: emailCanonical,
        filleulRefCode: ref_code,
      });
      parrainValide = credit.parrainValide;
      prenomParrain = credit.prenomParrain;

      if (credit.parrainValide && credit.parrainEmail) {
        const parrainEmail = credit.parrainEmail;

        // Compter les filleuls du parrain (inclut le filleul qui vient d'être inséré)
        const { count: nbProches } = await supabase
          .from("waitlist")
          .select("id", { count: "exact", head: true })
          .eq("referred_by", safeReferredBy);

        const nb = nbProches ?? 1;
        console.log(`[parrainage] ${parrainEmail} → +1 filleul (${cleanPrenom || "?"}), total=${nb}`);

        await updateBrevoContact(
          parrainEmail,
          {
            PRENOM_PROCHE: cleanPrenom || "",
            NB_PROCHES: nb,
            NB_PAGES_ACCUMULEES: 5 * nb,
          },
          apiKey
        );

        // P2 — notif au parrain qu'un proche vient de le rejoindre.
        // Source unique de NB_PROCHES = count(waitlist where referred_by=...) ci-dessus,
        // donc même valeur que celle envoyée à Brevo via updateBrevoContact.
        await sendReferralNotifyEmailP2(
          parrainEmail,
          prenomParrain,
          cleanPrenom || "",
          nb,
          safeReferredBy,
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

    // W1 (sans parrain) XOR P1 (avec parrain valide) — un inscrit ne reçoit jamais les deux.
    if (!parrainValide) {
      await sendWelcomeEmailW1(normalizedEmail, cleanPrenom || "", ref_code, apiKey);
    } else {
      await sendReferralWelcomeEmailP1(
        normalizedEmail,
        cleanPrenom || "",
        prenomParrain,
        ref_code,
        apiKey
      );
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
