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
 * ══════════════════════════════════════════════════════════════════════════
 * ELLE FAIT DEUX CHOSES, ET RIEN D'AUTRE
 *
 * 1. ENVOYER CE QUI EST DÛ. La règle vit dans `codesPour` (mails.ts), pas
 *    ici : /admin l'utilise aussi après une transition, et deux copies de la
 *    règle finiraient par diverger. Ce fichier ne fait que balayer.
 *
 *    Les mails immédiats (M1, M3, M5, M6, M7, M9) partent déjà au moment du
 *    geste ; la relève est leur FILET, pour le jour où Brevo tousse. Les
 *    mails à retardement (M2 à J+1, M3b à J+3, M8 à J+3 après livraison)
 *    n'ont AUCUN déclencheur possible : ils n'existent que par ce balayage.
 *
 * 2. FERMER LA PRODUCTION. L'auto-validation à J+7 (PRD §11) : sans elle,
 *    « une part des dossiers payés dort indéfiniment et la production ne se
 *    ferme jamais ». C'est la seule ÉCRITURE d'état de cette route.
 *
 * ⚠️ ELLE DOIT DONC TOURNER TOUS LES JOURS. Sans cron, M2, M3b, M8 et
 * l'auto-validation ne partent jamais — et M3b est le mail qui rapporte le
 * plus de tout le système. Un cron Vercel quotidien suffit (plan Hobby).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import {
  CHAMPS_MAIL,
  codesPour,
  doitAutoValider,
  envoyerMailAtelier,
  manquePour,
  type CodeMail,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { logEvenement } from "@/lib/atelier/evenements";

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
  /* DEUX secrets acceptés, et c'est délibéré :
       ATELIER_MAILS_SECRET — le nôtre, pour un curl à la main ;
       CRON_SECRET          — celui que Vercel envoie AUTOMATIQUEMENT en
                              `Authorization: Bearer` sur ses tâches planifiées.
     Sans le second, il faudrait donner à CRON_SECRET la même valeur que la
     nôtre pour que le cron passe : une duplication de secret que personne ne
     penserait à refaire le jour d'une rotation. Ici, chacun garde le sien.

     ⚠️ Si AUCUN des deux n'est posé, la route est fermée. Jamais d'ouverture
     par défaut sur un chemin qui envoie des mails à des clientes. */
  const attendus = [process.env.ATELIER_MAILS_SECRET, process.env.CRON_SECRET].filter(
    (v): v is string => Boolean(v),
  );
  if (!attendus.length) {
    console.error("[atelier/relever] ni ATELIER_MAILS_SECRET ni CRON_SECRET — accès refusé");
    return false;
  }
  const entete = request.headers.get("authorization") ?? "";
  const bearer = entete.toLowerCase().startsWith("bearer ") ? entete.slice(7) : "";
  const direct = request.headers.get("x-atelier-secret") ?? "";
  return attendus.some((a) => memeSecret(bearer, a) || memeSecret(direct, a));
}

/* Tous les états où un mail peut être dû. `payee` en est absent : M4 part au
   webhook, et le rattraper ici enverrait « paiement reçu » avec des jours de
   retard aux dossiers passés à la main pendant les tests. */
const ETATS_BALAYES = [
  "photos_recues",
  "photos_insuffisantes",
  "apercu_pret",
  "maquette_prete",
  "validee",
  "expediee",
  "livree",
];

async function relever(request: Request) {
  if (!autorise(request)) {
    /* 404 et pas 403 : une route d'administration n'a pas à confirmer son
       existence à qui ne connaît pas le secret. */
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  try {
    const supabase = makeSupabase();

    /* `etat_maj_le` croissant : le dossier qui attend depuis le plus
       longtemps passe en premier — c'est aussi l'ordre d'urgence de /admin. */
    const { data: dossiers, error: errSel } = await supabase
      .from("numeros")
      .select(CHAMPS_MAIL)
      .in("etat", ETATS_BALAYES)
      .order("etat_maj_le", { ascending: true })
      .limit(MAX_DOSSIERS)
      .returns<NumeroPourReleve[]>();

    if (errSel) {
      console.error("[atelier/relever] lecture échouée", errSel.code, errSel.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const lignes = dossiers ?? [];

    /* Un seul aller-retour pour TOUT ce qui est déjà parti, avec les dates :
       M3b se décide sur l'âge de M3, et le garde-fou de chaîne sur la simple
       présence du prédécesseur. Sans ce pré-chargement, il faudrait une
       requête par dossier. */
    const envoyesParDossier = new Map<string, Envoyes>();
    if (lignes.length) {
      const { data: envois } = await supabase
        .from("mails_envoyes")
        .select("numero_id, code, envoye_le")
        .in("numero_id", lignes.map((d) => d.id))
        .returns<Array<{ numero_id: string; code: string; envoye_le: string }>>();
      for (const e of envois ?? []) {
        const m = envoyesParDossier.get(e.numero_id) ?? new Map<string, string>();
        m.set(e.code, e.envoye_le);
        envoyesParDossier.set(e.numero_id, m);
      }
    }

    const maintenant = new Date();
    const envoyes: Array<{ code: string; token: string; titre: string | null }> = [];
    const incomplets: Array<{ code: string; token: string; manque: string[] }> = [];
    const echecs: Array<{ code: string; token: string }> = [];
    const autoValides: Array<{ token: string; titre: string | null }> = [];

    for (const d of lignes) {
      const dejaPartis = envoyesParDossier.get(d.id) ?? new Map<string, string>();

      /* ── l'auto-validation, AVANT les mails ───────────────────────────
         Le dossier change d'état : lui envoyer M5 dans la même passe serait
         annoncer une maquette qu'on vient de valider d'office. M6 partira au
         balayage suivant, une fois l'état stabilisé — c'est le prix d'une
         règle simple, et il se compte en heures. */
      if (doitAutoValider(d, dejaPartis, maintenant)) {
        const quand = maintenant.toISOString();
        const { data: maj } = await supabase
          .from("numeros")
          .update({ etat: "validee", valide_le: quand, valide_par: "auto", etat_maj_le: quand })
          .eq("id", d.id)
          .eq("etat", "maquette_prete")
          .select("id");

        if (maj?.length) {
          /* Invariant nº6 — et ici, c'est la seule trace qu'une impression a
             été lancée sans réponse de la cliente. */
          await logEvenement(supabase, d.id, "etat_change", {
            de: "maquette_prete",
            vers: "validee",
            par: "auto",
            source: "releve_j7",
          });
          autoValides.push({ token: d.token, titre: d.titre });
        }
        continue;
      }

      for (const code of codesPour(d, dejaPartis, maintenant)) {
        /* Signalé plutôt qu'envoyé. C'est le cas le plus utile de toute la
           route : un dossier passé en état 2 sans son aperçu ou sans son
           palier ressort ici, et l'atelier voit tout de suite ce qui manque
           au lieu d'attendre un mail qui ne partira jamais. */
        const manque = manquePour(code as CodeMail, d);
        if (manque.length) {
          incomplets.push({ code, token: d.token, manque });
          continue;
        }

        const r = await envoyerMailAtelier(supabase, code as CodeMail, d);
        if (r.statut === "envoye") envoyes.push({ code, token: d.token, titre: d.titre });
        else if (r.statut !== "deja_envoye") echecs.push({ code, token: d.token });
      }
    }

    const resume = {
      examines: lignes.length,
      envoyes,
      autoValides,
      incomplets,
      echecs,
      /* Le balayage a-t-il été tronqué ? Un plafond silencieux se lirait
         comme « tout est traité ». */
      tronque: lignes.length >= MAX_DOSSIERS,
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
