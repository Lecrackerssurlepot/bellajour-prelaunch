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
        { message: "Cette adresse ne nous semble pas valide." },
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
        attributes: { PRENOM: firstName || '' },
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

    const alreadyRegistered = brevoResponse.status === 204;

    return NextResponse.json(
      { alreadyRegistered },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: "Une erreur s'est glissée. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}