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
/* Les bornes de la grille, pour que le refus d'impression dise les vraies. */
import { PAGES_MAX, PAGES_MIN } from "@/lib/atelier/grille";
import { cloudprinterConfigure, creerCommande, devisLivraison, infoCommande } from "@/lib/atelier/cloudprinter";
import {
  livraisonClient,
  ttcDepuisHt,
  LIVRAISON_PLAFOND_CENTIMES,
} from "@/lib/atelier/livraison";
import {
  ACTIONS,
  preparerTransition,
  type ActionCle,
  type Etat,
  type Saisie,
} from "@/lib/atelier/transitions";
/* Le brouillon de prévisualisation (10/09/2026) : sa liste blanche de
   colonnes et le type d'événement qui le porte. Module PUR. */
import { TYPE_BROUILLON } from "@/lib/atelier/brouillon";

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

    type LigneNumero = {
      id: string;
      etat: Etat;
      titre: string | null;
      prenom: string | null;
      email: string | null;
      telephone: string | null;
      nb_pages: number | null;
      adresse_livraison: unknown;
      cloudprinter_order_id: string | null;
      retouches_demandees_le: string | null;
      /* Colonnes de la migration 20260910 (le prix gelé et la livraison à
         venir). Absentes tant qu'elle n'est pas passée : le select les
         demande, retombe en 42703, et elles restent `undefined`. */
      prix_centimes?: number | null;
      livraison_centimes?: number | null;
      pays_livraison?: string | null;
      livraison_niveau?: string | null;
    };

    const CHAMPS_BASE =
      "id, etat, titre, prenom, email, telephone, nb_pages, adresse_livraison, " +
      "cloudprinter_order_id, retouches_demandees_le";

    /* Même repli qu'en lecture partout ailleurs (`lireNumeros`, donnees.ts) :
       un select qui nomme une colonne absente ne dégrade pas, il échoue
       ENTIÈREMENT — toute la route tomberait pour trois colonnes que le geste
       n'exige même pas. On tente avec, on retombe sans. */
    const lireLigne = (champs: string) =>
      supabase.from("numeros").select(champs).eq("token", token).maybeSingle<LigneNumero>();

    let { data: lu, error: lecture } = await lireLigne(
      `${CHAMPS_BASE}, prix_centimes, livraison_centimes, pays_livraison, livraison_niveau`,
    );
    if (lecture?.code === "42703") {
      ({ data: lu, error: lecture } = await lireLigne(CHAMPS_BASE));
    }

    if (lecture) {
      console.error("[admin/transition] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!lu) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    /* Reliée à une constante : les fermetures plus bas (le repli d'écriture)
       ne peuvent pas la voir redevenir nulle. */
    const numero = lu;

    const prepa = preparerTransition(cle, numero.etat, saisie);
    if (!prepa.ok) {
      /* 422 et pas 400 : la requête est bien formée, c'est la SAISIE qui ne
         permet pas d'avancer. L'écran affiche chaque message sous son champ. */
      return NextResponse.json({ error: "saisie", erreurs: prepa.erreurs }, { status: 422 });
    }

    const action = prepa.action;

    /* ── les visuels sont-ils VRAIMENT dans le coffre ? ─────────────────
       Un envoi peut échouer en silence côté navigateur (onglet fermé, réseau
       coupé au dernier octet) et laisser une clé qui ne désigne rien. Publier
       dessus, c'est envoyer M3 « votre couverture » vers une page à cadres
       vides — exactement la garantie nº1 de mails.ts, mais un cran plus tôt.
       Un HEAD par visuel, sur une action qu'on déclenche trois fois par jour :
       le coût est nul, la protection est réelle.
       La planche et les faces séparées sont des clés simples ; les doubles
       pages (T-090) arrivent en TABLEAU sous `doubles` — chacune est vérifiée,
       et son erreur pointe la vignette exacte (`apercu_double_<rang>`).
       Les adresses absolues ne sont pas vérifiées : elles ne sont pas à nous. */
    if (prepa.patch.apercu_urls) {
      const visuels = prepa.patch.apercu_urls as Record<string, unknown>;
      const aVerifier: Array<{ champ: string; valeur: string }> = [];
      for (const [nom, valeur] of Object.entries(visuels)) {
        if ((nom === "doubles" || nom === "plats") && Array.isArray(valeur)) {
          /* T-093 — les couvertures proposées arrivent elles aussi en tableau
             et méritent la même garde : une planche absente du coffre ferait
             un cadre vide DANS LE CHOIX, ce qui est pire qu'une seule
             couverture. L'erreur pointe le rang exact. */
          const prefixe = nom === "doubles" ? "apercu_double" : "apercu_plat";
          valeur.forEach((v, i) => {
            if (typeof v === "string") aVerifier.push({ champ: `${prefixe}_${i}`, valeur: v });
          });
        } else if (typeof valeur === "string") {
          const champ =
            { plat: "apercu_plat", c1: "apercu_c1", c4: "apercu_c4", double: "apercu_double" }[nom] ?? nom;
          aVerifier.push({ champ, valeur });
        }
      }

      const absents: string[] = [];
      await Promise.all(
        aVerifier.map(async ({ champ, valeur }) => {
          if (/^https?:\/\//i.test(valeur)) return;
          if ((await tailleReelle(valeur)) === null) absents.push(champ);
        }),
      );
      if (absents.length) {
        return NextResponse.json(
          {
            error: "saisie",
            erreurs: absents.map((champ) => ({
              champ,
              message: "L'image n'est pas arrivée dans le coffre. Redépose-la.",
            })),
          },
          { status: 422 },
        );
      }
    }

    /* ⚠️ LE DEVIS PART APRÈS LE CONTRÔLE DU COFFRE, ET C'EST VOULU. Leur API
       rationne sévèrement (« Requests limit reached ») : chiffrer un port pour
       une publication qui va être refusée deux lignes plus bas parce qu'une
       image n'est jamais arrivée, c'est un appel gaspillé à chaque vignette
       ratée. On ne demande un prix que sur un dossier déjà complet. */
    /* ── LE DEVIS DE PORT (lot 6, 10/09/2026) ───────────────────────────
       Publier l'aperçu, c'est annoncer un prix. Depuis que la livraison se
       facture en sus, ce prix n'est complet qu'avec le port — et le port ne
       s'invente pas (interdit nº5) : on le DEMANDE à l'imprimeur, ici, au
       seul instant du parcours où l'on connaît à la fois le pays (écran 4) et
       la pagination (saisie juste au-dessus).

       TROIS SOURCES POSSIBLES, ET L'ÉCRAN LES NOMME :
         admin       — l'atelier a tapé un montant, il gagne, aucun appel
                       réseau n'est fait (leur API rationne) ;
         cloudprinter— le devis a répondu, on convertit HT → TTC au taux du
                       pays et on applique le plafond d'absorption ;
         echec       — pas de clé, refus, ou réponse illisible : on ne devine
                       PAS un montant, on demande une saisie.

       ⚠️ UN SEUL APPEL CLOUDPRINTER PAR VÉRIFICATION. Le dry-run devise et
       rend le montant à l'écran ; le second clic renvoie ce que l'écran a
       reçu (`livraison_centimes` + `livraison_niveau`), donc n'appelle plus
       personne. C'est ce qui tient le rationnement de leur API. */
    type Livraison = {
      source: "admin" | "cloudprinter" | "echec";
      niveau: string | null;
      /** « Ground - Tracked » : la famille de service telle qu'ils la nomment. */
      service: string | null;
      /** « Colissimo », « DPD - France » : ce que l'atelier reconnaît. */
      transporteur: string | null;
      niveauVouluAbsent: boolean;
      devisHtCentimes: number | null;
      devisTtcCentimes: number | null;
      client: number | null;
      absorbe: number;
      raison?: string;
      /** Ce qui est DÉJÀ en base, pour que l'écran ne l'écrase pas sans le dire. */
      existant: number | null;
    };
    let livraison: Livraison | null = null;

    if (cle === "publier_apercu" || cle === "corriger_apercu") {
      const pays = String(prepa.patch.pays_livraison ?? "");
      const pages = typeof prepa.patch.nb_pages === "number" ? prepa.patch.nb_pages : null;
      const produit = produitPour(pages);
      const existant =
        typeof numero.livraison_centimes === "number" ? numero.livraison_centimes : null;

      if ("livraison_centimes" in prepa.patch) {
        /* La main de l'atelier gagne, toujours, et sans appel réseau. */
        livraison = {
          source: "admin",
          niveau: typeof prepa.patch.livraison_niveau === "string" ? prepa.patch.livraison_niveau : null,
          service: null,
          transporteur: null,
          niveauVouluAbsent: false,
          devisHtCentimes: null,
          devisTtcCentimes: null,
          client: prepa.patch.livraison_centimes as number,
          absorbe: 0,
          existant,
        };
      } else if (!produit) {
        /* Sans produit (pagination hors grille), `preparerTransition` a déjà
           refusé plus haut : ce chemin ne devrait pas exister. Ceinture. */
        livraison = {
          source: "echec", niveau: null, service: null, transporteur: null,
          niveauVouluAbsent: false,
          devisHtCentimes: null, devisTtcCentimes: null, client: null, absorbe: 0,
          raison: "aucun produit d'impression pour cette pagination", existant,
        };
      } else {
        const d = await devisLivraison({ pays, produit, pages: pages! });
        if (!d.ok) {
          livraison = {
            source: "echec", niveau: null, service: null, transporteur: null,
            niveauVouluAbsent: false,
            devisHtCentimes: null, devisTtcCentimes: null, client: null, absorbe: 0,
            raison: d.message, existant,
          };
        } else {
          const ttc = ttcDepuisHt(d.devis.htCentimes, pays);
          if (ttc === null) {
            /* Pays hors de la table des taux : on ne convertit pas au hasard. */
            livraison = {
              source: "echec", niveau: d.devis.niveau,
              service: d.devis.service, transporteur: d.devis.transporteur,
              niveauVouluAbsent: d.niveauVouluAbsent,
              devisHtCentimes: d.devis.htCentimes, devisTtcCentimes: null,
              client: null, absorbe: 0,
              raison: `aucun taux connu pour ${pays || "ce pays"}`, existant,
            };
          } else {
            const { client, absorbe } = livraisonClient(ttc);
            livraison = {
              source: "cloudprinter",
              niveau: d.devis.niveau,
              service: d.devis.service,
              transporteur: d.devis.transporteur,
              niveauVouluAbsent: d.niveauVouluAbsent,
              devisHtCentimes: d.devis.htCentimes,
              devisTtcCentimes: ttc,
              client,
              absorbe,
              existant,
            };
            /* Le niveau CHIFFRÉ est gelé avec le montant : la commande
               d'impression doit partir avec exactement ce service-là. */
            prepa.patch.livraison_niveau = d.devis.niveau;
            /* Le service et le transporteur ne sont pas des colonnes : ils
               partent au journal, plus bas, par ce qu'on rend à l'écran. */
          }
        }
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
          /* Les bornes viennent de la grille, jamais recopiées : le jour où
             elle change, ce message change avec elle. */
          message: `${numero.nb_pages ?? "?"} pages : aucun produit d'impression ne correspond (${PAGES_MIN} à ${PAGES_MAX} pages).`,
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
        /* Ce qui partira VRAIMENT : le niveau gelé au devis, la constante à
           défaut. L'écran de confirmation ne doit pas annoncer `cp_saver`
           quand la commande partira en `cp_ground`. */
        shippingLevel: numero.livraison_niveau ?? SHIPPING_LEVEL,
        fichiers,
        adresse: adr.ok
          ? { nom: adr.adresse.firstname + " " + adr.adresse.lastname, ville: adr.adresse.city, pays: adr.adresse.country }
          : null,
      };
    }

    if (verifierSeulement) {
      /* ── LE BROUILLON, POUR VOIR LA PAGE AVANT DE L'ENVOYER ──────────
         Demande de Mathias (10/09/2026). La prévisualisation ne peut pas
         recevoir la saisie par l'URL : la page du client la lirait comme une
         donnée du navigateur, et il faudrait y recopier la grille, le devis
         et la résolution R2 — trois secondes vérités. On dépose donc CE QUI
         SERAIT ÉCRIT dans le journal, et la page d'état le superpose à la
         ligne réelle. Rien n'est écrit dans `numeros`, aucun mail ne part.

         Le montant du port rejoint le patch ICI : plus bas il n'y entre
         qu'au moment d'écrire (le dry-run s'arrête avant), et sans lui le
         bon de commande de la prévisualisation resterait muet — exactement
         ce que l'atelier veut relire avant de publier.

         ⚠️ Un journal qui refuse ne fait pas échouer la vérification (même
         contrat que `logEvenement` partout ailleurs) : on le DIT à l'écran,
         qui n'affichera pas le bouton plutôt que d'ouvrir un onglet vide. */
      let brouillon: boolean | null = null;
      if (cle === "publier_apercu" || cle === "corriger_apercu") {
        brouillon = await logEvenement(supabase, numero.id, TYPE_BROUILLON, {
          patch: {
            ...prepa.patch,
            ...(typeof livraison?.client === "number"
              ? { livraison_centimes: livraison.client }
              : {}),
          },
          resume: prepa.resume,
          livraison,
          par: prenomDe(qui),
        });
      }

      return NextResponse.json(
        {
          ok: true,
          verification: true,
          /* Absent sur les autres actions : il n'y a rien à prévisualiser
             ailleurs que sur la page qui vend. */
          ...(brouillon === null ? {} : { brouillon }),
          action: { cle: action.cle, libelle: action.libelle, vers: action.vers, note: action.note },
          resume: prepa.resume,
          ...(prepa.params?.MOT ? { mot: prepa.params.MOT } : {}),
          ...(impression ? { impression } : {}),
          /* Le devis, tel qu'il vient d'être demandé. L'écran le montre en
             toutes lettres, prérempli le champ si l'atelier l'avait laissé
             vide, et RENVOIE le niveau au second clic pour qu'on ne rappelle
             pas Cloudprinter. RIEN n'a été écrit ici. */
          ...(livraison ? { livraison } : {}),
          /* Ce que la cliente lira dans le mail, si mail il y a. Le vrai
             rendu est chez Brevo — ici on garantit au moins que le bon
             destinataire va recevoir les bons nombres. */
          destinataire: { prenom: numero.prenom, email: numero.email, titre: numero.titre },
        },
        { status: 200 },
      );
    }

    /* ── LA LIVRAISON ENTRE DANS LE PATCH, OU LA PUBLICATION S'ARRÊTE ───
       Publier une couverture sans port, c'est annoncer un prix incomplet :
       la page d'état 2 afficherait « à payer 37 € » et Stripe en demanderait
       48. On refuse donc d'écrire, et on NOMME le champ à remplir — l'atelier
       tape le montant, reclique, et la source devient « admin ».
       ⚠️ Jamais 0 par défaut : un port offert par accident ne se voit pas. */
    if (livraison) {
      if (livraison.client === null) {
        return NextResponse.json(
          {
            error: "saisie",
            erreurs: [
              {
                champ: "livraison_centimes",
                message: `Le devis Cloudprinter a échoué (${livraison.raison ?? "raison inconnue"}). Saisis la livraison TTC à la main.`,
              },
            ],
          },
          { status: 422 },
        );
      }
      prepa.patch.livraison_centimes = livraison.client;
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
        },
        /* Le niveau GELÉ au devis (`numeros.livraison_niveau`). `cp_saver`
           n'est pas proposé partout — relevé du 10/09 — donc commander sous
           la constante reviendrait à acheter un service qui n'a pas été
           chiffré. `null` (dossier d'avant ce lot, ou repli 42703) retombe
           sur `SHIPPING_LEVEL`, exactement comme avant. */
        numero.livraison_niveau ?? null);

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

    /* T2-13 — une REpublication de maquette après des retouches demandées.
       La garde sur la colonne compte : une republication de confort (sans
       retouches) ne doit pas faire repartir M5. */
    const republicationRetouches =
      cle === "publier_maquette" &&
      numero.etat === "maquette_prete" &&
      Boolean(numero.retouches_demandees_le);

    const maintenant = new Date().toISOString();

    /* Verrou atomique : le `.eq('etat', …)` fait de la mise à jour elle-même
       le test de l'état. Deux onglets ouverts sur le même dossier ne peuvent
       pas journaliser deux fois la même transition, ni faire reculer un
       dossier que l'autre vient d'avancer.
       Pour l'impression, un second verrou : `cloudprinter_order_id` doit
       encore être vide — la ceinture locale du verrou distant (référence
       unique chez Cloudprinter). */
    const ecrire = (patch: Record<string, unknown>) => {
      let q = supabase
        .from("numeros")
        .update({ ...patch, etat_maj_le: maintenant })
        .eq("id", numero.id)
        .eq("etat", numero.etat);
      if (cle === "envoyer_impression") q = q.is("cloudprinter_order_id", null);
      return q.select("id, etat");
    };

    /* ── LES COLONNES FRAÎCHES, ET CE QU'ON PERD QUAND ELLES MANQUENT ──
       Mathias applique les migrations lui-même : entre le déploiement et le
       passage, un UPDATE qui nomme une colonne absente échoue ENTIÈREMENT.
       Le geste métier (expédier, publier) ne doit pas tomber pour une colonne
       qui n'est pas encore là — on écrit sans elle, et on le DIT.

       ⚠️ DEUX CODES, PAS UN. Un SELECT rend `42703`, un INSERT/UPDATE rend
       `PGRST204` (prouvé en prod le 03/09/2026). Ce repli était borné à
       42703 : il ne se déclenchait donc jamais en écriture. Les deux sont
       attrapés désormais.

       ⚠️ CE REPLI EFFACE UNE DONNÉE. Il doit donc CRIER (T-001, 29/08/2026) :
       muet, il transforme une panne bruyante en donnée perdue. C'est
       exactement ce qui est arrivé avec `tracking_code` — la migration n'a
       jamais été appliquée, le geste réussissait, et aucun colis n'a eu son
       numéro de suivi pendant une semaine sans que rien ne le signale.
       Depuis le 10/09, ce n'est plus seulement un log Vercel (gardé une
       heure sur le plan Hobby) : ce qui a été perdu part AUSSI au journal du
       dossier, sous `colonnes_perdues_42703`, où il se relit dans six mois. */
    const COLONNES_FRAICHES: Record<string, string> = {
      prix_centimes: "supabase/migrations/20260910_atelier_prix_gele.sql",
      livraison_centimes: "supabase/migrations/20260910_atelier_prix_gele.sql",
      pays_livraison: "supabase/migrations/20260910_atelier_prix_gele.sql",
      livraison_niveau: "supabase/migrations/20260910_atelier_prix_gele.sql",
      tracking_code: "supabase/migrations/20260829_atelier_tracking_code.sql",
    };

    const colonnesPerdues: string[] = [];

    const ecrireAvecRepli = async (patch: Record<string, unknown>) => {
      const premier = await ecrire(patch);
      const code = premier.error?.code;
      if (code !== "42703" && code !== "PGRST204") return premier;

      const aRetirer = Object.keys(COLONNES_FRAICHES).filter((c) => c in patch);
      /* Aucune colonne fraîche dans ce patch : l'erreur parle d'autre chose,
         on la rend telle quelle plutôt que de réessayer à l'identique. */
      if (aRetirer.length === 0) return premier;

      const sansColonnes: Record<string, unknown> = { ...patch };
      for (const c of aRetirer) delete sansColonnes[c];
      colonnesPerdues.push(...aRetirer);

      console.error(
        `[admin/transition] ⚠️ REPLI ${code} : ${aRetirer.join(", ")} absente(s) en base, la donnée n'est PAS enregistrée. ` +
          `Appliquer ${[...new Set(aRetirer.map((c) => COLONNES_FRAICHES[c]))].join(" et ")}.`,
        { numero: numero.id, geste: cle },
      );
      return ecrire(sansColonnes);
    };

    const { data: maj, error } = await ecrireAvecRepli(prepa.patch);

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
        source: republicationRetouches ? "republication_retouches" : "admin",
        ...prepa.resume,
        /* ── LE PORT, DANS LE RÉCIT DU DOSSIER ──────────────────────────
           D'où vient le montant, quel service a été chiffré, ce que
           l'imprimeur demandait HT, ce qu'on a affiché TTC, ce que Bellajour
           a absorbé, et le plafond en vigueur ce jour-là. Six mois plus tard,
           « pourquoi ce dossier a-t-il payé 11,06 € de port ? » doit avoir une
           réponse ici, pas dans un log Vercel effacé au bout d'une heure. */
        ...(livraison
          ? {
              livraison_centimes: livraison.client,
              livraison_source: livraison.source,
              livraison_niveau: livraison.niveau,
              livraison_transporteur: livraison.transporteur,
              devis_ht_centimes: livraison.devisHtCentimes,
              devis_ttc_centimes: livraison.devisTtcCentimes,
              livraison_absorbee: livraison.absorbe,
              plafond: LIVRAISON_PLAFOND_CENTIMES,
            }
          : {}),
        /* Ce que le repli a effacé, dans le RÉCIT du dossier et pas seulement
           dans un log d'une heure. Absent quand rien n'a été perdu : une clé
           qui ne dit rien n'encombre pas la lecture du journal. */
        ...(colonnesPerdues.length ? { colonnes_perdues_42703: colonnesPerdues } : {}),
        /* T2-3 — le mot de M9 ne vit pas en base : le journal est sa seule
           trace pérenne (le mail, lui, peut être perdu par la cliente). */
        ...(prepa.params?.MOT ? { mot: prepa.params.MOT } : {}),
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

    /* T2-13 — republier après retouches doit RENVOYER M5 : la maquette a
       changé, et l'échéance d'auto-validation annoncée dans le mail aussi.
       Retirer le verrou est le mécanisme sanctionné (le même que celui d'un
       échec Brevo) : la relève ci-dessous renverra M5 avec la nouvelle
       DATE_LIMITE. Journalisé, sinon deux « Mail parti : M5 » se suivraient
       sans explication. */
    if (republicationRetouches) {
      await supabase.from("mails_envoyes").delete().eq("numero_id", numero.id).eq("code", "M5");
      await logEvenement(supabase, numero.id, "mail_reouvert", {
        code: "M5",
        cause: "republication_retouches",
        par: prenomDe(qui),
      });
    }

    /* Le mail, par le chemin partagé : même verrou, mêmes contrôles que le
       balayage. Ne throw jamais — une transition réussie ne doit pas être
       rendue en erreur parce que Brevo tousse. Le balayage rattrapera. */
    const releve = await releverDossier(supabase, numero.id, prepa.params);

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
