/**
 * POST|GET /api/atelier/mails/relever — la relève des mails de l'atelier.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE RELÈVE ET PAS UN DÉCLENCHEUR
 *
 * M3 part « à l'état 2 » (PRD §10). Or le passage en état 2 se fait À LA MAIN
 * EN SQL tant que /admin n'existe pas (lot 7). Un envoi posé dans une route
 * ne se déclencherait donc jamais : il n'y a aucune route à traverser.
 *
 * Cette route balaie la base et envoie ce qui doit partir. Elle ne dépend
 * d'aucun chemin de code, donc elle marche quelle que soit la façon dont
 * l'état a changé : un UPDATE à la main aujourd'hui, le bouton « Publier
 * l'aperçu » de /admin demain, un correctif en base après-demain.
 *
 * TROIS FAÇONS DE LA DÉCLENCHER, sans rien changer ici :
 *   — un curl collé juste après ton UPDATE (le mode nominal aujourd'hui) ;
 *   — l'appel de /admin en fin de transition (lot 7) ;
 *   — un cron Vercel (⚠️ quotidien seulement sur le plan Hobby : à garder
 *     comme filet de sécurité, pas comme mode principal).
 *
 * Elle est IDEMPOTENTE et sans effet de bord si rien n'a bougé : la relancer
 * dix fois de suite ne renvoie rien. Le verrou vit dans `mails_envoyes`.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Elle relève DEUX mails :
 *   M1 — dossiers en état 1 dont le dépôt est terminé. Doublon volontaire du
 *        déclencheur de /api/atelier/numero : si Brevo était en panne au
 *        moment du dépôt, c'est ici que le mail est rattrapé.
 *   M3 — dossiers en état 2. Le déclencheur principal, et le seul chemin.
 *
 * M3b (relance J+3), M2, M5 à M9 viendront s'ajouter ici, pas ailleurs.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import {
  CHAMPS_MAIL,
  envoyerMailAtelier,
  manquePour,
  type CodeMail,
  type NumeroPourMail,
} from "@/lib/atelier/mails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Un balayage borné : au-delà, c'est qu'il s'est passé quelque chose
   d'anormal, et envoyer mille mails d'un coup serait le pire des remèdes.
   Le reste part à la relève suivante. */
const MAX_DOSSIERS = 200;

/* Comparaison à durée constante : un secret comparé avec === se devine
   caractère par caractère au chronomètre. Coût nul, réflexe systématique. */
function memeSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Le secret passe par un EN-TÊTE, jamais par l'URL : une URL se retrouve
   dans les logs Vercel, dans l'historique du shell et dans le referer.
   Deux formes acceptées — `Authorization: Bearer …` (ce qu'envoie le cron
   Vercel) et `x-atelier-secret` (plus court à taper dans un curl). */
function autorise(request: Request): boolean {
  const attendu = process.env.ATELIER_MAILS_SECRET;
  if (!attendu) {
    console.error("[atelier/relever] ATELIER_MAILS_SECRET absent — accès refusé");
    return false; // jamais d'ouverture par défaut
  }
  const entete = request.headers.get("authorization") ?? "";
  const bearer = entete.toLowerCase().startsWith("bearer ") ? entete.slice(7) : "";
  const direct = request.headers.get("x-atelier-secret") ?? "";
  return memeSecret(bearer, attendu) || memeSecret(direct, attendu);
}

type Ligne = NumeroPourMail & { etat: string; consent_photos: boolean | null };

async function relever(request: Request) {
  if (!autorise(request)) {
    /* 404 et pas 403 : une route d'administration n'a pas à confirmer son
       existence à qui ne connaît pas le secret. */
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  try {
    const supabase = makeSupabase();

    /* Les deux populations en une requête. `etat_maj_le` croissant : le
       dossier qui attend depuis le plus longtemps passe en premier, c'est
       aussi l'ordre d'urgence de /admin (PRD §12). */
    const { data: dossiers, error: errSel } = await supabase
      .from("numeros")
      .select(`${CHAMPS_MAIL}, consent_photos`)
      .in("etat", ["photos_recues", "apercu_pret"])
      .order("etat_maj_le", { ascending: true })
      .limit(MAX_DOSSIERS)
      .returns<Ligne[]>();

    if (errSel) {
      console.error("[atelier/relever] lecture échouée", errSel.code, errSel.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Un dossier en état 1 n'a terminé son dépôt que si consent_photos est
       posé : sans ça, elle est encore en train de choisir ses photos, et lui
       écrire « vos photos sont à l'atelier » serait faux. */
    const candidats = (dossiers ?? [])
      .map((d) => ({
        d,
        code: (d.etat === "photos_recues" ? "M1" : "M3") as CodeMail,
      }))
      .filter(({ d, code }) => code !== "M1" || d.consent_photos === true);

    /* Un seul aller-retour pour savoir ce qui est déjà parti. Sans ça, on
       tenterait une insertion de verrou par dossier à chaque relève : ça
       marcherait (le doublon est géré) mais ça écrirait pour rien. */
    const dejaPartis = new Set<string>();
    if (candidats.length) {
      const { data: envois } = await supabase
        .from("mails_envoyes")
        .select("numero_id, code")
        .in("numero_id", candidats.map(({ d }) => d.id))
        .returns<Array<{ numero_id: string; code: string }>>();
      for (const e of envois ?? []) dejaPartis.add(`${e.numero_id}:${e.code}`);
    }

    const envoyes: Array<{ code: string; token: string; titre: string | null }> = [];
    const incomplets: Array<{ code: string; token: string; manque: string[] }> = [];
    const echecs: Array<{ code: string; token: string }> = [];
    let deja = 0;

    for (const { d, code } of candidats) {
      if (dejaPartis.has(`${d.id}:${code}`)) {
        deja++;
        continue;
      }

      /* Signalé plutôt qu'envoyé. C'est le cas le plus utile de toute la
         route : un dossier passé en état 2 sans son aperçu ou sans son
         palier ressort ici, et l'atelier voit tout de suite ce qui manque
         au lieu d'attendre un mail qui ne partira jamais. */
      const manque = manquePour(code, d);
      if (manque.length) {
        incomplets.push({ code, token: d.token, manque });
        continue;
      }

      const r = await envoyerMailAtelier(supabase, code, d);
      if (r.statut === "envoye") envoyes.push({ code, token: d.token, titre: d.titre });
      else if (r.statut === "deja_envoye") deja++;
      else echecs.push({ code, token: d.token });
    }

    const resume = {
      examines: candidats.length,
      envoyes,
      deja,
      incomplets,
      echecs,
      /* Le balayage a-t-il été tronqué ? Un plafond silencieux se lirait
         comme « tout est traité ». */
      tronque: (dossiers?.length ?? 0) >= MAX_DOSSIERS,
    };
    console.log("[atelier/relever]", JSON.stringify(resume));

    return NextResponse.json(resume, { status: 200 });
  } catch (err) {
    console.error("[atelier/relever] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export const POST = relever;
/* Le cron Vercel n'émet que des GET. Même traitement, même verrou. */
export const GET = relever;
