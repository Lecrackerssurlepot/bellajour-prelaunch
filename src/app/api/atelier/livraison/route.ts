/**
 * POST /api/atelier/livraison — LE CLIENT CHOISIT SA DESTINATION (11/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE ROUTE EXISTE
 *
 * Depuis le lot 6 (10/09), le port se facture en sus et se DEVISE chez
 * l'imprimeur, destination par destination. Le pays est demandé à l'écran 4
 * du questionnaire : pour ces dossiers-là, tout est chiffré à la publication
 * de l'aperçu, et cette route ne sert à rien.
 *
 * Restent tous les dossiers ouverts AVANT l'écran 4. Ils n'ont aucun pays, et
 * jusqu'ici l'atelier devait en choisir un À LEUR PLACE pour pouvoir publier,
 * puis taper un port. C'est-à-dire deviner. Mathias a tranché le 11/09 :
 * l'atelier ne devine jamais une destination. Quand elle est inconnue, c'est
 * le CLIENT qui la choisit, sur sa page de commande, et la livraison est
 * chiffrée à cet instant précis — avant le paiement, jamais après.
 *
 * LES QUATRE GARDES, DANS L'ORDRE
 *   1. le token de 32 caractères EST l'identité (comme tout /api/atelier/*) ;
 *   2. le rate-limit du dépôt, même patron que le PATCH des consentements :
 *      il freine un script, il n'arrête pas une attaque, et on ne le présente
 *      pas autrement ;
 *   3. l'état DOIT être `apercu_pret` : ailleurs, ou bien il n'y a rien à
 *      vendre, ou bien c'est déjà payé et le port est figé dans une facture ;
 *   4. le pays doit être un code de la zone (`normaliserPays`) : on ne
 *      devine pas une destination à partir d'une chaîne illisible.
 *
 * CE QU'ELLE N'EST PAS : un endroit où un prix se négocie. Le client n'envoie
 * QUE son token et un code pays. Le montant vient du devis de l'imprimeur,
 * converti au taux du pays, plafonné par la règle d'absorption — exactement
 * la même chaîne que celle du back-office, et par les mêmes fonctions pures.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { normaliserPays } from "@/lib/atelier/pays";
import { finitionDuDossier, produitPour } from "@/lib/atelier/impression";
import { devisLivraison } from "@/lib/atelier/cloudprinter";
import {
  livraisonClient,
  ttcDepuisHt,
  LIVRAISON_PLAFOND_CENTIMES,
} from "@/lib/atelier/livraison";
import { creditDuPourMail } from "@/lib/atelier/fondatrice";

export const runtime = "nodejs";

/* Même garde-fou que le reste du tunnel : une `Map` de l'instance. Sur Vercel
   elle n'est PAS partagée entre instances — elle décourage le rejeu, elle ne
   protège de rien d'autre, et on ne la présente pas comme une protection.
   Le plafond est celui du PATCH des consentements : hésiter entre trois pays
   avant d'acheter est le geste d'un client normal, pas celui d'un robot. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 30 : 120;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

function depasseLePlafond(request: Request): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
  const ip = `livraison:${request.headers.get("x-forwarded-for") ?? "unknown"}`;
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
  }
  rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

export async function POST(request: Request) {
  try {
    if (depasseLePlafond(request)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    /* On ne répare pas un pays inventé : « FRANCE », « fr » et «  be  »
       passent (normalisation), tout le reste est un refus franc. Un repli sur
       PAYS_DEFAUT ferait facturer un port français à quelqu'un qui n'a pas
       choisi la France. */
    const pays = normaliserPays(body.pays);
    if (!pays) {
      return NextResponse.json({ error: "pays_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    type Ligne = {
      id: string;
      etat: string;
      prenom: string | null;
      email: string | null;
      email_canonical: string | null;
      nb_pages: number | null;
      prix_centimes: number | null;
      pays_livraison: string | null;
      livraison_centimes: number | null;
      /* Le pelliculage (migration 20260911), absent tant qu'elle n'est pas
         passée : `finitionDuDossier` retombe alors sur le brillant. */
      finition?: string | null;
    };

    const CHAMPS =
      "id, etat, prenom, email, email_canonical, nb_pages, prix_centimes, pays_livraison, livraison_centimes";

    const lire = (champs: string) =>
      supabase.from("numeros").select(champs).eq("token", token).maybeSingle<Ligne>();

    /* Le repli habituel (donnees.ts, transition) : un select qui nomme une
       colonne absente échoue ENTIÈREMENT. Sans lui, le client ne pourrait
       plus choisir sa destination du tout entre le déploiement et la
       migration — pour une finition qui, elle, a un défaut sûr. */
    let { data: numero, error: lecture } = await lire(`${CHAMPS}, finition`);
    if (lecture?.code === "42703") {
      ({ data: numero, error: lecture } = await lire(CHAMPS));
    }

    /* T-043 — une panne de base n'est PAS un token inconnu : répondre 404 ici
       dirait au client que son dossier n'existe pas, au moment où il essaie
       d'acheter. Même règle que /valider, /checkout et /presign. */
    if (lecture) {
      console.error("[atelier/livraison] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Le choix du pays n'existe qu'à l'état 2, devant le bon de commande.
       Avant, il n'y a rien à vendre ; après, c'est payé, et le port figure
       dans une facture qu'on ne réécrit pas. */
    if (numero.etat !== "apercu_pret") {
      return NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    /* Le produit d'impression décide du devis (un agrafé et un dos carré ne
       pèsent pas pareil). Hors grille, aucun produit ne correspond : ce
       dossier n'aurait jamais dû être publié, et on ne devise pas au hasard. */
    const produit = produitPour(numero.nb_pages);
    if (!produit || !numero.nb_pages) {
      console.error("[atelier/livraison] aucun produit pour", numero.id, numero.nb_pages);
      return NextResponse.json({ error: "devis_indisponible" }, { status: 502 });
    }

    /* ── LE DEVIS, EN DIRECT ────────────────────────────────────────────
       Le seul appel réseau de la route, et il part APRÈS toutes les gardes :
       l'API de Cloudprinter rationne (« Requests limit reached »), on ne la
       sollicite pas pour un dossier qu'on va refuser. */
    const d = await devisLivraison({
      pays,
      produit,
      pages: numero.nb_pages,
      /* Les mêmes options que la commande, pelliculage compris : un devis
         qui chiffre autre chose que ce qu'on achètera est un prix faux. */
      finition: finitionDuDossier(numero.finition),
    });
    if (!d.ok) {
      /* 502 et pas 500 : ce n'est pas NOUS qui sommes en panne, c'est le
         chiffrage qui n'a pas répondu. La page le dit et propose de
         réessayer — jamais un montant de repli (interdit nº5). */
      console.error("[atelier/livraison] devis refusé", numero.id, pays, d.message);
      return NextResponse.json({ error: "devis_indisponible" }, { status: 502 });
    }

    const ttc = ttcDepuisHt(d.devis.htCentimes, pays);
    if (ttc === null) {
      /* Un pays de la zone sans taux dans la table : impossible aujourd'hui
         (les trente en ont un), mais le jour où l'un s'ajoute sans son taux,
         on préfère un refus visible à un montant approximatif. */
      console.error("[atelier/livraison] aucun taux pour", pays);
      return NextResponse.json({ error: "devis_indisponible" }, { status: 502 });
    }

    const { client, absorbe } = livraisonClient(ttc);

    /* ── L'ÉCRITURE, SANS REPLI SILENCIEUX ──────────────────────────────
       Ailleurs dans le dépôt, un UPDATE qui nomme une colonne fraîche
       retombe sur un UPDATE sans elle (42703 en lecture, PGRST204 en
       écriture) : c'est ce qui évite qu'un geste métier tombe entre le
       déploiement et la migration.

       ⚠️ PAS ICI, ET C'EST DÉLIBÉRÉ. La migration 20260910 est appliquée
       depuis le 10/09 : ces trois colonnes existent. Un repli rendrait « ok »
       à un client qui verrait ensuite la même page lui redemander son pays,
       indéfiniment, sans que rien ne le signale. On préfère un 500 franc, qui
       se voit dans les logs et à l'écran (cf. le revers du repli, supabase/CLAUDE.md).

       Le `.eq("etat", "apercu_pret")` est le verrou : si l'atelier a fait
       avancer le dossier pendant que le client hésitait, zéro ligne bouge et
       on répond 409 plutôt que d'écrire un port sur une commande déjà payée. */
    const { data: maj, error: ecriture } = await supabase
      .from("numeros")
      .update({
        pays_livraison: pays,
        livraison_centimes: client,
        livraison_niveau: d.devis.niveau,
      })
      .eq("id", numero.id)
      .eq("etat", "apercu_pret")
      .select("id");

    if (ecriture) {
      console.error(
        "[atelier/livraison] écriture échouée",
        ecriture.code,
        ecriture.message,
        ecriture.code === "42703" || ecriture.code === "PGRST204"
          ? "⚠️ colonne absente : appliquer supabase/migrations/20260910_atelier_prix_gele.sql"
          : "",
      );
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!maj?.length) {
      return NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    /* ── INVARIANT Nº6 : TOUTE ÉCRITURE SE RACONTE ──────────────────────
       Six mois plus tard, « pourquoi ce dossier a-t-il payé 14,80 € de port
       vers l'Allemagne ? » doit avoir une réponse ici : qui a choisi, quel
       devis, quel taux appliqué, ce que Bellajour a absorbé. `par: "client"`
       distingue ce geste de celui de l'atelier (`etat_change`). */
    await logEvenement(supabase, numero.id, "livraison_choisie", {
      pays,
      livraison_centimes: client,
      niveau: d.devis.niveau,
      transporteur: d.devis.transporteur,
      devis_ht: d.devis.htCentimes,
      devis_ttc: ttc,
      absorbe,
      plafond: LIVRAISON_PLAFOND_CENTIMES,
      par: "client",
      /* Un changement d'avis se lit : le pays précédent, s'il y en avait un. */
      ...(numero.pays_livraison ? { precedent: numero.pays_livraison } : {}),
    });

    /* ── LE PORT OFFERT D'UN FONDATEUR, EN LECTURE SEULE ────────────────
       `creditDuPourMail` relit `waitlist` et le journal ; elle ne frappe
       AUCUN coupon chez Stripe (c'est son contrat, et c'est ce qui permet de
       l'appeler ici). Un doute rend `null` : on n'annonce alors pas de port
       offert, ce qui est le sens sûr — l'inverse promettrait une gratuité que
       le checkout n'appliquerait pas.

       ⚠️ ON NE GÈLE PAS ZÉRO. Le montant écrit reste le VRAI coût devisé,
       même pour un fondateur : c'est ce qui permet de savoir plus tard ce
       qu'un port offert a coûté. C'est l'affichage et Stripe qui le mettent à
       zéro (`portOffert`), au même endroit et par la même règle que le
       crédit de 30 €. */
    const creditEuros = await creditDuPourMail(supabase, {
      id: numero.id,
      prenom: numero.prenom,
      email: numero.email,
      email_canonical: numero.email_canonical,
    });

    return NextResponse.json(
      {
        ok: true,
        pays,
        livraisonCentimes: client,
        portOffert: creditEuros !== null,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[atelier/livraison] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
