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
import { tailleReelle, empreinteObjet, signerGet, IMPRESSION_TTL_SECONDS } from "@/lib/atelier/r2";
import {
  adresseCloudprinter,
  payloadCommande,
  produitPour,
  EMAIL_CONTACT,
  SHIPPING_LEVEL,
  SLOTS_IMPRESSION,
} from "@/lib/atelier/impression";
import { cloudprinterConfigure, creerCommande, infoCommande } from "@/lib/atelier/cloudprinter";
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
      .select("id, etat, titre, prenom, email, telephone, nb_pages, adresse_livraison, cloudprinter_order_id")
      .eq("token", token)
      .maybeSingle<{
        id: string;
        etat: Etat;
        titre: string | null;
        prenom: string | null;
        email: string | null;
        telephone: string | null;
        nb_pages: number | null;
        adresse_livraison: unknown;
        cloudprinter_order_id: string | null;
      }>();

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

    /* ── l'impression : tout vérifier AVANT de commander ─────────────────
       Même logique que le bloc des aperçus, un cran plus loin : ici l'action
       déclenche un ACHAT chez un tiers. Rien ne part et rien ne s'écrit tant
       que le dossier n'est pas complet — et chaque manque est dit champ par
       champ, pas en erreur anonyme. */
    let impression: {
      modeManuel: boolean;
      produit: string | null;
      produitLibelle: string | null;
      shippingLevel: string;
      fichiers: Array<{ type: string; cle: string; taille: number; md5: string }>;
      adresse: { nom: string; ville: string; pays: string } | null;
    } | null = null;

    if (cle === "envoyer_impression") {
      /* Jamais deux commandes pour un dossier. Le verrou dur est sur
         l'update ; ce pré-contrôle évite surtout de payer un appel réseau
         pour un refus certain. */
      if (numero.cloudprinter_order_id) {
        return NextResponse.json(
          { error: "deja_commande", orderId: numero.cloudprinter_order_id },
          { status: 409 },
        );
      }

      const { pret } = cloudprinterConfigure();
      const produit = produitPour(numero.nb_pages);
      const fournis = prepa.patch.impression_fichiers as Record<string, string>;

      const erreurs: Array<{ champ: string; message: string }> = [];

      if (!produit) {
        erreurs.push({
          champ: "action",
          message: `${numero.nb_pages ?? "?"} pages : aucun produit d'impression ne correspond (20 à 50 pages).`,
        });
        return NextResponse.json({ error: "saisie", erreurs }, { status: 422 });
      }

      /* L'adresse vient de Stripe et de nulle part ailleurs (PRD §9). Si elle
         est incomplète, ça se corrige en base, pas en devinant ici. */
      const adr = adresseCloudprinter(numero.adresse_livraison, numero.email ?? "", numero.telephone);
      if (!adr.ok) {
        erreurs.push({
          champ: "action",
          message: `L'adresse de livraison Stripe est incomplète (${adr.manque.join(", ")}). Corrige-la avant d'imprimer.`,
        });
      }

      /* Les fichiers que CE produit exige (un `product` pour l'agrafé, le
         duo `cover` + `book` pour le dos carré), TOUS présents au coffre et
         d'un seul tenant : sans md5 fiable, Cloudprinter refuserait le
         fichier après l'avoir téléchargé, en silence pour nous. */
      const fichiers: Array<{ type: string; cle: string; taille: number; md5: string }> = [];
      for (const type of produit.fichiers) {
        const slot = SLOTS_IMPRESSION.find((s) => s.type === type)!;
        const cleFichier = fournis?.[type];
        if (!cleFichier) {
          erreurs.push({ champ: slot.cle, message: `Il manque ${slot.label.toLowerCase()}.` });
          continue;
        }
        const empreinte = await empreinteObjet(cleFichier);
        if (!empreinte) {
          erreurs.push({ champ: slot.cle, message: "Le PDF n'est pas arrivé dans le coffre. Redépose-le." });
        } else if (!empreinte.md5) {
          erreurs.push({
            champ: slot.cle,
            message: "Le fichier est arrivé en plusieurs morceaux, son empreinte est invérifiable. Redépose-le d'un seul tenant.",
          });
        } else {
          fichiers.push({ type, cle: cleFichier, taille: empreinte.taille, md5: empreinte.md5 });
        }
      }

      if (erreurs.length) {
        return NextResponse.json({ error: "saisie", erreurs }, { status: 422 });
      }

      impression = {
        /* Sans clé API, la transition passe comme avant ce lot : l'atelier
           commande à la main chez l'imprimeur. L'écran le dit. */
        modeManuel: !pret,
        produit: produit.produit,
        produitLibelle: produit.libelle,
        shippingLevel: SHIPPING_LEVEL,
        fichiers,
        adresse: adr.ok
          ? { nom: adr.adresse.firstname + " " + adr.adresse.lastname, ville: adr.adresse.city, pays: adr.adresse.country }
          : null,
      };
    }

    if (verifierSeulement) {
      return NextResponse.json(
        {
          ok: true,
          verification: true,
          action: { cle: action.cle, libelle: action.libelle, vers: action.vers, note: action.note },
          resume: prepa.resume,
          ...(impression ? { impression } : {}),
          /* Ce que la cliente lira dans le mail, si mail il y a. Le vrai
             rendu est chez Brevo — ici on garantit au moins que le bon
             destinataire va recevoir les bons nombres. */
          destinataire: { prenom: numero.prenom, email: numero.email, titre: numero.titre },
        },
        { status: 200 },
      );
    }

    /* ── la commande part MAINTENANT, avant l'écriture ───────────────────
       L'ordre est voulu : si Cloudprinter refuse, rien n'a bougé chez nous
       et l'écran affiche le refus. L'inverse — écrire puis commander —
       laisserait un dossier « en production » sans commande, exactement le
       mensonge d'écran que ce back-office est censé supprimer. */
    let orderIdCommande: string | null = null;
    if (impression && !impression.modeManuel) {
      const fichiersSignes: Partial<Record<"product" | "cover" | "book", { url: string; md5: string }>> = {};
      for (const f of impression.fichiers) {
        fichiersSignes[f.type as "product" | "cover" | "book"] = {
          url: await signerGet(f.cle, IMPRESSION_TTL_SECONDS),
          md5: f.md5,
        };
      }
      const adr = adresseCloudprinter(numero.adresse_livraison, numero.email ?? "", numero.telephone);
      if (!adr.ok) {
        /* Déjà contrôlée plus haut — ceinture pour le typage. */
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }

      const corpsPour = (reference: string) =>
        payloadCommande({
          /* La référence est NOTRE id (jamais le token, qui est le lien
             magique de la cliente). Son unicité chez Cloudprinter est le
             verrou distant contre le double-envoi. */
          reference,
          emailContact: EMAIL_CONTACT,
          adresse: adr.adresse,
          produit: produitPour(numero.nb_pages)!,
          pages: numero.nb_pages!,
          fichiers: fichiersSignes,
          titre: numero.titre,
        });

      let commande = await creerCommande(corpsPour(numero.id));

      if (!commande.ok && commande.code === "reference_existante") {
        /* La référence a déjà servi. Deux histoires possibles :
           — la commande est VIVANTE : deux clics en course, on adopte son
             numéro et rien n'est dupliqué ;
           — elle est ANNULÉE (fichiers refusés puis orders/cancel, vécu le
             26/08) : une référence ne se réutilise jamais chez eux, on
             recommande sous une référence dérivée, unique à cet essai. */
        const info = await infoCommande(numero.id);
        if (info.ok && /cancel/i.test(String(info.corps.state_code ?? ""))) {
          const referenceBis = `${numero.id}-r${Date.now().toString(36)}`;
          commande = await creerCommande(corpsPour(referenceBis));
        } else if (info.ok) {
          orderIdCommande = info.orderId;
        } else {
          await logEvenement(supabase, numero.id, "cloudprinter_echec", {
            etape: "orders/info", message: info.message,
          });
          return NextResponse.json(
            { error: "cloudprinter", message: "La commande semble déjà exister chez Cloudprinter mais son numéro est introuvable. Vérifie leur dashboard avant de réessayer." },
            { status: 502 },
          );
        }
      }

      if (commande.ok) {
        orderIdCommande = commande.orderId;
      } else if (!orderIdCommande) {
        await logEvenement(supabase, numero.id, "cloudprinter_echec", {
          etape: "orders/add", code: commande.code, message: commande.message,
        });
        return NextResponse.json(
          { error: "cloudprinter", message: `Cloudprinter a refusé la commande : ${commande.message}` },
          { status: 502 },
        );
      }

      prepa.patch.cloudprinter_order_id = orderIdCommande;
    }

    const maintenant = new Date().toISOString();

    /* Verrou atomique : le `.eq('etat', …)` fait de la mise à jour elle-même
       le test de l'état. Deux onglets ouverts sur le même dossier ne peuvent
       pas journaliser deux fois la même transition, ni faire reculer un
       dossier que l'autre vient d'avancer.
       Pour l'impression, un second verrou : `cloudprinter_order_id` doit
       encore être vide — la ceinture locale du verrou distant (référence
       unique chez Cloudprinter). */
    let majQuery = supabase
      .from("numeros")
      .update({ ...prepa.patch, etat_maj_le: maintenant })
      .eq("id", numero.id)
      .eq("etat", numero.etat);
    if (cle === "envoyer_impression") {
      majQuery = majQuery.is("cloudprinter_order_id", null);
    }
    const { data: maj, error } = await majQuery.select("id, etat");

    if (error) {
      console.error("[admin/transition] update échoué", cle, error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    if (!maj?.length) {
      /* Quelqu'un est passé entre la lecture et l'écriture. On ne réécrit
         rien et on le dit : l'écran recharge, l'atelier voit l'état réel.
         Cas résiduel de l'impression : la commande vient de partir chez
         Cloudprinter mais n'a pas pu être enregistrée — elle est ORPHELINE.
         Le journal la nomme, avec son numéro : elle s'annule au dashboard. */
      if (orderIdCommande) {
        await logEvenement(supabase, numero.id, "cloudprinter_orpheline", {
          orderId: orderIdCommande,
        });
      }
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

    /* La commande d'impression a son propre événement, en plus du changement
       d'état : dans six mois, « quel numéro de commande porte ce dossier ? »
       se lira dans le journal, pas dans les logs Vercel. */
    if (orderIdCommande) {
      await logEvenement(supabase, numero.id, "cloudprinter_commande", {
        orderId: orderIdCommande,
        produit: impression?.produit,
        shippingLevel: impression?.shippingLevel,
        par: prenomDe(qui),
      });
    } else if (impression?.modeManuel) {
      /* La trace que RIEN n'est parti chez un imprimeur : sans elle, un
         dossier « en production » sans commande ressemblerait à un bug. */
      await logEvenement(supabase, numero.id, "cloudprinter_manuel", {
        par: prenomDe(qui),
      });
    }

    /* Le mail, par le chemin partagé : même verrou, mêmes contrôles que le
       balayage. Ne throw jamais — une transition réussie ne doit pas être
       rendue en erreur parce que Brevo tousse. Le balayage rattrapera. */
    const releve = await releverDossier(supabase, numero.id);

    return NextResponse.json(
      {
        ok: true,
        etat: maj[0].etat,
        resume: prepa.resume,
        ...(orderIdCommande ? { cloudprinterOrderId: orderIdCommande } : {}),
        mail: releve.code ? { code: releve.code, statut: releve.resultat?.statut } : null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/transition] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
