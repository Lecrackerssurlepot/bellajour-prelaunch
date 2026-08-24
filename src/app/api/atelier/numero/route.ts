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
import { CHAMPS_MAIL, envoyerMailAtelier, type NumeroPourMail } from "@/lib/atelier/mails";

export const runtime = "nodejs";

/* Même garde-fou que /api/waitlist : mémoire de l'instance, suffisant pour
   décourager le rejeu, jamais présenté comme une protection forte. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 5 : 30;
/* PATCH ne crée rien et exige un token valide : le plafond y sert à couper un
   script, pas à rationner une cliente indécise. */
const RATE_LIMIT_MAX_PATCH = process.env.NODE_ENV === "production" ? 30 : 120;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Plafonds de saisie — coupent au lieu de rejeter : personne ne perd son
   texte parce qu'il a écrit trois lignes de trop. */
const MAX = { occasion: 120, histoire: 4000, titre: 34, prenom: 60, telephone: 30 };

/* Sorti du corps de POST pour servir aussi à PATCH : les deux écrivent en
   base et méritent le même garde-fou — mais pas le même plafond, et pas le
   même compteur. Créer un dossier est rare ; cocher, décocher et recocher une
   case de l'état 2 est le geste d'une cliente qui hésite avant de payer. Un
   compteur commun lui répondrait « votre accord n'a pas pu être enregistré »
   au troisième doute, juste avant l'acte d'achat. */
function depasseLePlafond(request: Request, max = RATE_LIMIT_MAX): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
  const ip = `${request.method}:${request.headers.get("x-forwarded-for") ?? "unknown"}`;
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= max) return true;
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
 * LES DEUX CASES DU PAIEMENT passent aussi par ici — `cgv_ok` et
 * `renonciation_retractation`, cochées sur la page d'état 2 (PRD §8). Elles
 * ont, elles, leur horodatage en colonne : c'est une mention légale opposable
 * (article L221-28 3° du code de la consommation) et elle doit se lire sans
 * dépouiller un journal. Elles ne sont acceptées que depuis l'état
 * `apercu_pret` : après paiement, la reconnaissance est acquise et ne se
 * rétracte pas d'un clic. Invariant nº3 — aucun paiement possible sans les
 * deux cases cochées ET horodatées ; c'est /api/atelier/checkout qui le
 * revérifie en base au moment de créer la session.
 *
 * Le token fait foi : pas de compte, pas de session (PRD §7.5).
 */
export async function PATCH(request: Request) {
  try {
    if (depasseLePlafond(request, RATE_LIMIT_MAX_PATCH)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const maj: Record<string, boolean | string | null> = {};
    /* consent_photos ne se retire pas ici : il conditionne un dépôt déjà
       fait. Un retrait est une demande de suppression, pas une case à
       décocher — elle passe par l'atelier, pas par une requête. */
    if (body.consent_photos === true) maj.consent_photos = true;
    if (typeof body.consent_communication === "boolean") {
      maj.consent_communication = body.consent_communication;
    }

    /* Les deux cases de l'état 2. Décocher efface l'horodatage : une date
       d'acceptation qui survivrait au retrait de l'accord ne prouverait rien
       et se retournerait contre nous. Le journal, lui, garde les deux gestes. */
    const maintenant = new Date().toISOString();
    let casesPaiement = false;
    if (typeof body.cgv_ok === "boolean") {
      casesPaiement = true;
      maj.cgv_ok = body.cgv_ok;
      maj.cgv_ok_at = body.cgv_ok ? maintenant : null;
    }
    if (typeof body.renonciation_retractation === "boolean") {
      casesPaiement = true;
      maj.renonciation_retractation = body.renonciation_retractation;
      maj.renonciation_at = body.renonciation_retractation ? maintenant : null;
    }

    if (!Object.keys(maj).length) {
      return NextResponse.json({ error: "rien_a_faire" }, { status: 400 });
    }

    const supabase = makeSupabase();

    /* On lit d'emblée de quoi écrire un mail : la branche consent_photos
       ci-dessous déclenche M1, et repasser une requête pour aller chercher le
       titre et le nombre de photos ne servirait qu'à doubler la latence du
       geste le plus fragile du parcours. */
    const { data: numero } = await supabase
      .from("numeros")
      .select(CHAMPS_MAIL)
      .eq("token", token)
      .maybeSingle<NumeroPourMail & { etat: string }>();

    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Les cases du paiement n'existent qu'à l'état 2. Ailleurs, la demande
       vient d'un onglet resté ouvert pendant que le dossier avançait. */
    if (casesPaiement && numero.etat !== "apercu_pret") {
      return NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    const { error } = await supabase.from("numeros").update(maj).eq("id", numero.id);
    if (error) {
      console.error("[atelier/numero] patch consentements échoué", error.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Invariant nº6 — et ici, c'est aussi l'horodatage. */
    await logEvenement(supabase, numero.id, "consentements", maj);

    /* M1 « {{titre}}, c'est parti » (PRD §10) — LA FIN DU DÉPÔT.
       C'est le seul signal serveur qui dit « elle a terminé » : le moteur
       d'upload pose consent_photos au clic sur « Envoyer à l'atelier »
       (depot/moteur.ts, finaliser()), après confirmation des photos et
       recomptage de nb_photos. Il n'y a rien d'autre à écouter.

       Le rejeu est inoffensif : le verrou de `mails_envoyes` fait qu'un
       réessai réseau du navigateur n'envoie pas un second mail. L'envoi ne
       throw jamais et n'est pas awaité pour sa valeur : quoi qu'il arrive,
       la cliente voit son écran 6. */
    if (maj.consent_photos === true && numero.etat === "photos_recues") {
      await envoyerMailAtelier(supabase, "M1", numero);
    }

    /* ── LE RETOUR DE L'ÉTAT 1b (PRD §6 : « 1b → retour à 1 ») ──────────
       Sans ce bloc, l'état 1b est un cul-de-sac : l'atelier demande plus de
       photos, la cliente en redépose, et le dossier reste marqué « photos
       insuffisantes ». Personne ne voit rien remonter dans la table de
       travail, elle attend une couverture qui ne viendra jamais.

       Le dépôt accepte déjà les états 1 et 1b (photos/presign) et sa page lui
       propose bien de reprendre — il ne manquait que le chemin du retour.

       `etat_maj_le` repart de zéro : c'est lui qui fait courir les 48 h de la
       promesse. Un dossier revenu doit avoir un délai neuf, pas celui de son
       premier passage.

       Pas de mail : M1 est déjà parti au premier dépôt et son verrou tient.
       Le signal, c'est la remontée dans /admin. */
    if (maj.consent_photos === true && numero.etat === "photos_insuffisantes") {
      const { data: retour } = await supabase
        .from("numeros")
        .update({ etat: "photos_recues", etat_maj_le: maintenant })
        .eq("id", numero.id)
        .eq("etat", "photos_insuffisantes")
        .select("id");

      /* Invariant nº6 — et zéro ligne touchée veut dire que l'atelier est
         passé entre-temps : on ne rejournalise pas une transition qui n'a
         pas eu lieu. */
      if (retour?.length) {
        await logEvenement(supabase, numero.id, "etat_change", {
          de: "photos_insuffisantes",
          vers: "photos_recues",
          par: "cliente",
          source: "depot_repris",
          nb_photos: numero.nb_photos,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[atelier/numero] exception PATCH", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
