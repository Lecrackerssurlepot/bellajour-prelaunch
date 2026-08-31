/**
 * POST /api/cloudprinter/webhook — les signaux de production CloudSignal.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * C'est le RETOUR de la phase 2 du PRD §13 : une fois la commande passée
 * (« Envoyer à l'impression »), Cloudprinter pousse ici l'avancement —
 * validation, production, emballage, expédition. Un seul signal change
 * l'état chez nous : `ItemShipped` (6 → 7), qui porte le transporteur et le
 * suivi, et fait partir M7. Tout le reste s'inscrit au journal du dossier.
 *
 * AUTH — le modèle de la relève (mails/relever) : cette route vit HORS du
 * middleware (`/api/admin/*` seulement), elle porte donc sa propre porte.
 * CloudSignal n'a pas de signature HMAC : chaque payload porte l'`apikey`
 * de l'interface webhook, comparée à durée constante. Clé absente de l'env
 * → 404, fermée par défaut. Clé fausse → 404 aussi : une route
 * d'administration n'a pas à confirmer son existence.
 *
 * CONTRAT CLOUDSIGNAL — 200 = reçu, 204 = commande inconnue chez nous,
 * tout autre code = ils réessaient (100 tentatives sur 7 jours). D'où le
 * 500 VOLONTAIRE sur une erreur de base : leur retry est notre filet.
 * IDEMPOTENT : leurs signaux se rejouent (retry, Resend du dashboard) —
 * l'update `.eq("etat", "en_production")` fait qu'un second ItemShipped ne
 * réécrit rien et ne renvoie pas M7 (verrou de mails_envoyes en second
 * rideau).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { memeSecret } from "@/lib/atelier/secret";
import { logEvenement } from "@/lib/atelier/evenements";
import { releverDossier } from "@/lib/atelier/mails";
import { interpreterSignal } from "@/lib/atelier/impression";
import { lireSuivi } from "@/lib/atelier/suivi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  const attendu = process.env.CLOUDPRINTER_WEBHOOK_KEY;
  if (!attendu) {
    /* Fermée par défaut : jamais d'ouverture sur un chemin qui change des
       états et envoie des mails à des clientes. */
    console.error("[cloudprinter/webhook] CLOUDPRINTER_WEBHOOK_KEY absente — accès refusé");
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  if (!memeSecret(s(body.apikey), attendu)) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  const type = s(body.type);
  const ordre = s(body.order);
  const item = s(body.item);
  if (!type || !ordre) {
    return NextResponse.json({ error: "signal_incomplet" }, { status: 400 });
  }

  try {
    const supabase = makeSupabase();

    /* La doc ne tranche pas ce que `order` porte : NOTRE référence (l'id du
       numéro), la référence de l'ITEM (« <id>-1 »), ou un identifiant à eux.
       On essaie donc les candidats du plus probable au moins probable —
       chaque forme uuid par la clé primaire, les autres par
       `cloudprinter_order_id`. Le premier signal réel du 26/08 est reparti
       en « commande inconnue » : c'est ce qui a payé cette liste. */
    const candidats = [
      ...new Set(
        [
          ordre,
          ordre.replace(/-\d+$/, ""),
          s(body.order_reference),
          s(body.reference),
          item.replace(/-\d+$/, ""),
        ].filter(Boolean),
      ),
    ];

    let numero: { id: string; etat: string } | null = null;
    for (const candidat of candidats) {
      const requete = supabase.from("numeros").select("id, etat");
      const { data } = await (UUID.test(candidat)
        ? requete.eq("id", candidat)
        : requete.eq("cloudprinter_order_id", candidat)
      ).maybeSingle<{ id: string; etat: string }>();
      if (data) {
        numero = data;
        break;
      }
    }

    if (!numero) {
      /* 204, le code CloudSignal pour « commande inconnue » : ils arrêtent
         de réessayer. Un signal d'un AUTRE client de la même interface
         atterrirait ici — rien à faire chez nous. Le payload est journalisé
         en console (SANS la clé) : si un signal légitime tombe ici, il faut
         pouvoir lire ce qu'il portait au lieu de le deviner. */
      const sansCle = { ...body };
      delete sansCle.apikey;
      console.log("[cloudprinter/webhook] signal sans dossier", JSON.stringify(sansCle).slice(0, 800));
      return new NextResponse(null, { status: 204 });
    }

    const { effet } = interpreterSignal(type);

    if (effet === "expedier") {
      /* Transporteur et suivi dans le MÊME update que l'état : M7 exige un
         transporteur (manquePour, mails.ts) — un update en deux temps
         laisserait la relève signaler un incomplet entre les deux.

         Tout ce qui est INTERPRÉTATION vit dans suivi.ts (pur, testé) :
         « dpd_france » devient « DPD », et le `tracking` — un NUMÉRO neuf
         fois sur dix, pas une adresse — est gardé tel quel ET transformé en
         lien cliquable. L'ancienne version ne gardait que les `https://…`,
         donc ne gardait rien du cas courant : ni la fiche, ni la page de la
         cliente, ni M7 n'avaient de suivi à montrer. */
      const suivi = lireSuivi(s(body.shipping_option), s(body.tracking));
      const transporteur = suivi.transporteur;
      const tracking = suivi.code ?? suivi.url ?? "";
      const maintenant = new Date().toISOString();

      const colonnes = {
        etat: "expediee",
        transporteur,
        tracking_url: suivi.url,
        tracking_code: suivi.code,
        etat_maj_le: maintenant,
      };

      const expedier = (patch: Record<string, unknown>) =>
        supabase
          .from("numeros")
          .update(patch)
          .eq("id", numero!.id)
          .eq("etat", "en_production")
          .select("id");

      let { data: maj, error } = await expedier(colonnes);

      if (error?.code === "42703") {
        /* 42703 = colonne absente : la migration `tracking_code` n'est pas
           encore passée. Le même repli que `lireNumeros` pour `en_charge` —
           entre le déploiement et la migration, l'expédition doit continuer
           d'arriver, quitte à perdre le numéro de suivi (le lien, lui, est
           déjà dans `tracking_url`). */
        /* ⚠️ Ce repli EFFACE une donnée : il doit CRIER (T-001, 29/08/2026).
           Muet, il a fait perdre le numéro de suivi de chaque colis pendant
           une semaine sans qu'aucune alerte ne se déclenche. */
        console.error(
          "[cloudprinter/webhook] ⚠️ REPLI 42703 : tracking_code absent en base, le numéro de suivi n'est PAS enregistré. Appliquer supabase/migrations/20260829_atelier_tracking_code.sql.",
          { numero: numero!.id },
        );
        const sansColonne: Record<string, unknown> = { ...colonnes };
        delete sansColonne.tracking_code;
        ({ data: maj, error } = await expedier(sansColonne));
      }

      if (error) {
        console.error("[cloudprinter/webhook] update échoué", error.code, error.message);
        /* 500 volontaire : Cloudprinter réessaie, la base se remettra. */
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }

      if (!maj?.length) {
        /* Le dossier n'était pas « en production ». Rejeu d'un signal déjà
           traité : silence. Autre état : anormal, ça se lit au journal —
           l'idiome de `paiement_inattendu`. */
        if (numero.etat !== "expediee" && numero.etat !== "livree") {
          /* T-038 — le journal est ici le SEUL effet : répondre 200 sur une
             écriture ratée perdrait le signal, Cloudprinter ne réessaie que
             sur un code d'erreur. */
          const ok = await logEvenement(supabase, numero.id, "cloudprinter_signal_inattendu", {
            type, etat: numero.etat, tracking, transporteur,
          });
          if (!ok) return NextResponse.json({ error: "journal_incomplet" }, { status: 500 });
        }
        return NextResponse.json({ received: true, ignored: true }, { status: 200 });
      }

      /* Invariant nº6 : chaque transition écrit dans `evenements`.
         Résultat VOLONTAIREMENT ignoré (pas de 500) : l'état est déjà écrit,
         et un rejeu tomberait sur la garde d'idempotence sans réécrire cette
         ligne — un 500 ferait réessayer Cloudprinter pour rien. logEvenement
         logge lui-même son échec. */
      await logEvenement(supabase, numero.id, "etat_change", {
        de: "en_production",
        vers: "expediee",
        par: "cloudprinter",
        source: "webhook",
        transporteur,
        ...(tracking ? { tracking } : {}),
      });

      /* M7 part par le chemin partagé — même verrou, mêmes contrôles que la
         relève. Ne throw jamais. */
      await releverDossier(supabase, numero.id);

      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (effet === "alerte") {
      /* Un problème d'impression ne recule JAMAIS un dossier tout seul :
         un remboursement avant impression et une réimpression après défaut
         se décident au téléphone, pas par une machine (même philosophie que
         le remboursement Stripe). Le journal alerte, l'atelier tranche.
         T-038 — cette ligne est le SEUL effet du signal : si elle rate, 500,
         et le retry de Cloudprinter (100 tentatives sur 7 jours) la réécrira. */
      const ok = await logEvenement(supabase, numero.id, "cloudprinter_erreur", {
        type,
        ...(s(body.cause) ? { cause: s(body.cause) } : {}),
        ...(s(body.message) ? { message: s(body.message) } : {}),
        ...(typeof body.delay === "number" ? { delay: body.delay } : {}),
        ...(item ? { item } : {}),
      });
      if (!ok) return NextResponse.json({ error: "journal_incomplet" }, { status: 500 });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    /* Le fil de production, pour le Parcours de la fiche : validé, en
       presse, emballé… Le premier signal de la sandbox est aussi notre
       vérité sur la forme réelle des payloads — d'où le brut conservé.
       T-038 — journal = seul effet : écriture ratée, 500, leur retry rejoue. */
    const inscrit = await logEvenement(supabase, numero.id, "cloudprinter_signal", {
      type,
      ...(s(body.datetime) ? { datetime: s(body.datetime) } : {}),
      ...(item ? { item } : {}),
    });
    if (!inscrit) return NextResponse.json({ error: "journal_incomplet" }, { status: 500 });
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[cloudprinter/webhook] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
