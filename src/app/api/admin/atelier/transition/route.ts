/**
 * POST /api/admin/atelier/transition — LA route d'écriture du back-office.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNE ROUTE, SIX ACTIONS
 *
 * Le PRD §12 liste cinq boutons. Cinq routes, c'était cinq fois la même
 * séquence — vérifier l'état, valider, écrire, journaliser, envoyer — donc
 * cinq occasions d'oublier l'invariant nº6. La séquence est écrite ICI une
 * fois ; ce qui change d'une action à l'autre vit dans transitions.ts.
 *
 * DEUX MODES, LE MÊME CODE
 *   `verifier: true` → ne touche à rien, renvoie ce qui serait écrit.
 *   sinon            → écrit.
 * L'écran de confirmation affiche donc un prix calculé par le CHEMIN EXACT
 * qui l'écrira. Sans ce mode, il faudrait recalculer le palier côté
 * navigateur — c'est-à-dire embarquer la grille de prix dans le bundle et
 * casser l'invariant nº2 pour un affichage.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { releverDossier } from "@/lib/atelier/mails";
import { tailleReelle } from "@/lib/atelier/r2";
import {
  ACTIONS,
  preparerTransition,
  type ActionCle,
  type Etat,
  type Saisie,
} from "@/lib/atelier/transitions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  /* Défense en profondeur : le middleware couvre déjà /api/admin/*, mais une
     route qui publie des aperçus et envoie des mails ne doit pas dépendre
     d'une seule ligne de matcher. */
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      token?: unknown;
      action?: unknown;
      saisie?: unknown;
      verifier?: unknown;
    };

    const token = typeof body.token === "string" ? body.token.trim() : "";
    const cle = String(body.action ?? "") as ActionCle;
    const saisie = (body.saisie && typeof body.saisie === "object" ? body.saisie : {}) as Saisie;
    const verifierSeulement = body.verifier === true;

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    if (!ACTIONS[cle]) {
      return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: lecture } = await supabase
      .from("numeros")
      .select("id, etat, titre, prenom, email")
      .eq("token", token)
      .maybeSingle<{ id: string; etat: Etat; titre: string | null; prenom: string | null; email: string | null }>();

    if (lecture) {
      console.error("[admin/transition] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const prepa = preparerTransition(cle, numero.etat, saisie);
    if (!prepa.ok) {
      /* 422 et pas 400 : la requête est bien formée, c'est la SAISIE qui ne
         permet pas d'avancer. L'écran affiche chaque message sous son champ. */
      return NextResponse.json({ error: "saisie", erreurs: prepa.erreurs }, { status: 422 });
    }

    const action = prepa.action;

    /* ── les trois visuels sont-ils VRAIMENT dans le coffre ? ───────────
       Un envoi peut échouer en silence côté navigateur (onglet fermé, réseau
       coupé au dernier octet) et laisser une clé qui ne désigne rien. Publier
       dessus, c'est envoyer M3 « votre couverture » vers une page à cadres
       vides — exactement la garantie nº1 de mails.ts, mais un cran plus tôt.
       Un HEAD par visuel, sur une action qu'on déclenche trois fois par jour :
       le coût est nul, la protection est réelle.
       Les adresses absolues ne sont pas vérifiées : elles ne sont pas à nous. */
    if (prepa.patch.apercu_urls) {
      const visuels = prepa.patch.apercu_urls as Record<string, string>;
      const absents: string[] = [];
      await Promise.all(
        Object.entries(visuels).map(async ([nom, valeur]) => {
          if (/^https?:\/\//i.test(valeur)) return;
          if ((await tailleReelle(valeur)) === null) absents.push(nom);
        }),
      );
      if (absents.length) {
        return NextResponse.json(
          {
            error: "saisie",
            erreurs: absents.map((nom) => ({
              champ: { c1: "apercu_c1", c4: "apercu_c4", double: "apercu_double" }[nom] ?? nom,
              message: "L'image n'est pas arrivée dans le coffre. Redépose-la.",
            })),
          },
          { status: 422 },
        );
      }
    }

    if (verifierSeulement) {
      return NextResponse.json(
        {
          ok: true,
          verification: true,
          action: { cle: action.cle, libelle: action.libelle, vers: action.vers, mail: action.mail },
          resume: prepa.resume,
          /* Ce que la cliente lira dans le mail, si mail il y a. Le vrai
             rendu est chez Brevo — ici on garantit au moins que le bon
             destinataire va recevoir les bons nombres. */
          destinataire: { prenom: numero.prenom, email: numero.email, titre: numero.titre },
        },
        { status: 200 },
      );
    }

    const maintenant = new Date().toISOString();

    /* Verrou atomique : le `.eq('etat', …)` fait de la mise à jour elle-même
       le test de l'état. Deux onglets ouverts sur le même dossier ne peuvent
       pas journaliser deux fois la même transition, ni faire reculer un
       dossier que l'autre vient d'avancer. */
    const { data: maj, error } = await supabase
      .from("numeros")
      .update({ ...prepa.patch, etat_maj_le: maintenant })
      .eq("id", numero.id)
      .eq("etat", numero.etat)
      .select("id, etat");

    if (error) {
      console.error("[admin/transition] update échoué", cle, error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    if (!maj?.length) {
      /* Quelqu'un est passé entre la lecture et l'écriture. On ne réécrit
         rien et on le dit : l'écran recharge, l'atelier voit l'état réel. */
      return NextResponse.json({ error: "etat_change_entretemps" }, { status: 409 });
    }

    /* ── invariant nº6 ────────────────────────────────────────────────
       Chaque transition écrit dans `evenements`. `par` porte enfin un
       prénom : c'est tout l'intérêt des comptes nominatifs. */
    await logEvenement(
      supabase,
      numero.id,
      action.surPlace ? "apercu_corrige" : "etat_change",
      {
        action: cle,
        de: numero.etat,
        vers: action.vers,
        par: prenomDe(qui),
        source: "admin",
        ...prepa.resume,
      },
    );

    /* Le mail, par le chemin partagé : même verrou, mêmes contrôles que le
       balayage. Ne throw jamais — une transition réussie ne doit pas être
       rendue en erreur parce que Brevo tousse. Le balayage rattrapera. */
    const releve = await releverDossier(supabase, numero.id);

    return NextResponse.json(
      {
        ok: true,
        etat: maj[0].etat,
        resume: prepa.resume,
        mail: releve.code ? { code: releve.code, statut: releve.resultat?.statut } : null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/transition] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
