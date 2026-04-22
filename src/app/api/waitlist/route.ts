import { NextResponse } from "next/server";

const BREVO_API_URL = "https://api.brevo.com/v3/contacts";

export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Adresse email manquante." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Adresse email invalide." },
        { status: 400 }
      );
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_WAITLIST_LIST_ID);

    if (!apiKey || !listId) {
      return NextResponse.json(
        { message: "Configuration Brevo manquante." },
        { status: 500 }
      );
    }

    const brevoResponse = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        attributes: { FIRSTNAME: firstName || '' },
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!brevoResponse.ok) {
      const error = await brevoResponse.json().catch(() => null);

      return NextResponse.json(
        {
          message: "Impossible d'ajouter cet email à la waitlist.",
          error,
        },
        { status: brevoResponse.status }
      );
    }

    return NextResponse.json(
      { message: "Inscription à la waitlist confirmée." },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur serveur.", error },
      { status: 500 }
    );
  }
}