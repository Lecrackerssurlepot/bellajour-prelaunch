/* Noël 2026, lot 4 : la règle du 2e exemplaire et le compteur de places.
   Sans base ni réseau, appelé par verif-atelier.ts. Les montants attendus
   sont calculés à la main depuis la décision du 16/11 (−40 % / −20 %, 2 au
   plus, France, fenêtre) et la grille (36 p = 41 €). */
import { readFileSync } from "node:fs";
import {
  NOEL_EXEMPLAIRE_DEBUT,
  NOEL_EXEMPLAIRE_FIN,
  REGLE_ORDINAIRE,
  libelleLigne,
  normaliserCouverture,
  phraseRegle,
  regleExemplaires,
  totalExemplaires,
} from "@/lib/atelier/exemplaires";
import { totalCommande } from "@/lib/atelier/livraison";
import { compteurOuvert, placesRestantes, PLACES_NOEL } from "@/lib/atelier/noelPlaces";
import { montantCadeau, prenomCadeau } from "@/lib/atelier/carteCadeau";
import { cadeauDeSession, carteAjouteeDepuisSession } from "@/lib/atelier/carteServeur";
import type Stripe from "stripe";

type Ok = (n: string, c: boolean) => void;

export function verifierNoelExemplaires(ok: Ok, titre: (t: string) => void): void {
  titre("— Noël : le 2e exemplaire (lot 4, décision du 16/11) —");
  const jour = "2026-12-01";
  const meme = regleExemplaires({ pays: "FR", jour, couverture: "meme" });
  const autre = regleExemplaires({ pays: "FR", jour, couverture: "autre" });
  ok("France dans la fenêtre : règle de Noël, 2 au plus", meme.nom === "noel" && meme.max === 2 && autre.nom === "noel");
  ok("sans choix de couverture : même couverture (la remise la plus forte)", regleExemplaires({ pays: "fr", jour }).remiseDeuxiemePct === 40);
  ok("hors France, avant ou après la fenêtre : l'ordinaire, sans rien toucher",
    regleExemplaires({ pays: "BE", jour }) === REGLE_ORDINAIRE
      && regleExemplaires({ pays: "FR", jour: "2026-11-15" }) === REGLE_ORDINAIRE
      && regleExemplaires({ pays: "FR", jour: "2026-12-08" }) === REGLE_ORDINAIRE
      && regleExemplaires({ pays: null, jour }) === REGLE_ORDINAIRE);
  ok("bornes comprises : premier et dernier jour", regleExemplaires({ pays: "FR", jour: NOEL_EXEMPLAIRE_DEBUT }).nom === "noel"
    && regleExemplaires({ pays: "FR", jour: NOEL_EXEMPLAIRE_FIN }).nom === "noel");

  const m2 = totalExemplaires(4100, 2, meme);
  ok("41 € × 2, même couverture : 41 + 24,60 = 65,60 €", m2?.totalCentimes === 6560 && m2.regle === "noel");
  const a2 = totalExemplaires(4100, 2, autre);
  ok("41 € × 2, autre couverture : 41 + 32,80 = 73,80 €", a2?.totalCentimes === 7380);
  ok("un seul exemplaire : plein tarif dans les deux règles", totalExemplaires(4100, 1, meme)?.totalCentimes === 4100);
  const o3 = totalExemplaires(4100, 3, meme);
  ok("trois exemplaires pendant Noël : l'ordinaire (41 + 28,70 + 20,50 = 90,20 €)", o3?.totalCentimes === 9020 && o3.regle === "ordinaire");
  ok("hors Noël, deux exemplaires : −30 % (41 + 28,70 = 69,70 €)", totalExemplaires(4100, 2)?.totalCentimes === 6970);
  ok("les libellés disent la couverture et la remise",
    libelleLigne(m2!.lignes[1]) === "2e exemplaire, même couverture, −40 %"
      && libelleLigne(a2!.lignes[1]) === "2e exemplaire, autre couverture, −20 %"
      && libelleLigne(totalExemplaires(4100, 2)!.lignes[1]) === "2e exemplaire, −30 %");
  ok("la phrase de Noël : 1er acheté, −40 % / −20 %, 2 au plus, France ; sans prix barré, sans tiret cadratin",
    /1er exemplaire acheté/.test(phraseRegle(meme)) && /−40 %/.test(phraseRegle(meme)) && /−20 %/.test(phraseRegle(meme))
      && !/[—–]/.test(phraseRegle(meme)));
  ok("couverture : seules « meme » et « autre » passent", normaliserCouverture("autre") === "autre" && normaliserCouverture("AUTRE") === null && normaliserCouverture(1) === null);

  const c = totalCommande({ prixCentimes: 4100, quantite: 2, livraisonCentimes: 500, creditCentimes: 0, portOffert: false, regle: meme });
  ok("commande : la règle de Noël passe jusqu'au total (65,60 € ≥ 50 €, port offert)", c.prix === 6560 && c.livraison === 0 && c.total === 6560);
  const c24 = totalCommande({ prixCentimes: 2400, quantite: 2, livraisonCentimes: 500, creditCentimes: 0, portOffert: false, regle: meme });
  ok("commande 24 € × 2 même couverture : 24 + 14,40 = 38,40 €, port 5 € (sous le seuil)", c24.prix === 3840 && c24.livraison === 500 && c24.total === 4340);

  titre("— Noël : le compteur de places —");
  ok(`plafond ${PLACES_NOEL}, jamais négatif`, placesRestantes(0) === 25 && placesRestantes(24) === 1 && placesRestantes(30) === 0);
  ok("le compteur vit du 16/11 au 7/12 inclus", compteurOuvert("2026-11-16") && compteurOuvert("2026-12-07") && !compteurOuvert("2026-12-08") && !compteurOuvert("2026-11-15"));


  titre("— Noël : la carte cadeau ajoutée à la commande (16/11) —");
  const sans = totalCommande({ prixCentimes: 2400, livraisonCentimes: 500, creditCentimes: 0, portOffert: false });
  const avec = totalCommande({ prixCentimes: 2400, livraisonCentimes: 500, creditCentimes: 0, portOffert: false, cadeauCentimes: 3000 });
  ok("sans carte : 24 € + port 5 € = 29 €", sans.livraison === 500 && sans.total === 2900 && sans.cadeau === 0);
  ok("avec une carte de 30 € : 54 € au seuil, livraison OFFERTE, total 54 €", avec.livraisonOfferte && avec.livraison === 0 && avec.cadeau === 3000 && avec.total === 5400);
  const fond = totalCommande({ prixCentimes: 2400, livraisonCentimes: 500, creditCentimes: 3000, portOffert: true, cadeauCentimes: 5000 });
  ok("un crédit ne paie jamais la carte : fondateur 24 € − 24 € + carte 50 € = 50 €", fond.remise === 2400 && fond.total === 5000);
  ok("montants : 30 et 50 € seulement (« 5000 » de l'adresse compris)",
    montantCadeau("5000") === 5000 && montantCadeau(3000) === 3000 && montantCadeau("4000") === null && montantCadeau(2000) === null && montantCadeau("50") === null && montantCadeau(undefined) === null);
  ok("prénom : vide refusé, espaces ramassés", prenomCadeau("  ") === null && prenomCadeau("  Léa  Marie ") === "Léa Marie" && prenomCadeau("x".repeat(41)) === null);
  const sessionCadeau = (meta: Record<string, string>, extra: Partial<Stripe.Checkout.Session> = {}) => ({
    id: "cs_test_cadeau", payment_status: "paid", amount_total: 7900, livemode: false, created: 1794836000,
    customer_details: { email: "Acheteur@Exemple.fr" }, payment_intent: "pi_test_cadeau",
    metadata: { kind: "atelier", numero_id: "n1", ...meta }, ...extra,
  }) as unknown as Stripe.Checkout.Session;
  const lue = carteAjouteeDepuisSession(sessionCadeau({ cadeau_centimes: "5000", cadeau_prenom: "Camille" }), "Léa");
  ok("session payée : carte de 50 € pour Camille, remise « imprimer », chez l'acheteur, liée au paiement",
    lue !== null && "ligne" in lue && lue.ligne.montant_centimes === 5000 && lue.ligne.destinataire_prenom === "Camille"
      && lue.ligne.remise === "imprimer" && lue.ligne.acheteur_email === "acheteur@exemple.fr" && lue.ligne.acheteur_prenom === "Léa"
      && lue.ligne.stripe_payment_intent === "pi_test_cadeau" && lue.ligne.stripe_session_id === "cs_test_cadeau");
  ok("sans carte dans la session : rien", carteAjouteeDepuisSession(sessionCadeau({}), null) === null && cadeauDeSession(sessionCadeau({})) === 0);
  const incoh = carteAjouteeDepuisSession(sessionCadeau({ cadeau_centimes: "5000", cadeau_prenom: "Camille" }, { amount_total: 3000 }), null);
  ok("encaissé sous le montant de la carte : refusée", incoh !== null && "raison" in incoh && incoh.raison === "montant_incoherent");
  const impayee = carteAjouteeDepuisSession(sessionCadeau({ cadeau_centimes: "5000", cadeau_prenom: "Camille" }, { payment_status: "unpaid" }), null);
  ok("session impayée : pas de carte", impayee !== null && "raison" in impayee && impayee.raison === "non_payee");
  const route = readFileSync("src/app/api/atelier/checkout/route.ts", "utf8");
  ok("paiement : la carte entre dans totalCommande (seuil) ET dans les lignes Stripe, refusée sans drapeau",
    /cadeauCentimes: cadeau\?\.centimes/.test(route) && /Carte cadeau Bellajour/.test(route) && /cadeau_invalide/.test(route) && /NEXT_PUBLIC_GIFT_CARD_ENABLED/.test(route));
  ok("paiement : carte ajoutée + crédit fondateur, code de carte ou crédit de compte = refusé (Stripe répartirait le coupon sur la carte)",
    /if \(cadeau && remiseAppliquee\)/.test(route) && /cadeau && imputation && imputation\.remiseMagazinesCentimes > 0/.test(route) && /cadeau_refuse/.test(route));
  const webhook = readFileSync("src/app/api/webhook/route.ts", "utf8");
  ok("webhook : la carte ajoutée s'écrit après le paiement du magazine, et suit son remboursement",
    /enregistrerCarteAjoutee\(supabase, session\)/.test(webhook) && /traiterRemboursementCarte\(supabase, charge, \{ silencieux: true \}\)/.test(webhook));
  ok("fatura : une commande avec carte ajoutée part en revue manuelle (carte hors TVA)",
    /cadeau > 0\s*\n?\s*\? \{ statut: "manual_review"/.test(readFileSync("src/lib/atelier/jobFacture.ts", "utf8")));

  const lecteurs = [
    "src/app/numero/[token]/page.tsx",
    "src/app/api/atelier/checkout/route.ts",
    "src/app/api/atelier/livraison/route.ts",
    "src/app/api/admin/atelier/transition/route.ts",
  ];
  ok("tout lecteur d'argent des exemplaires lit la règle du dossier (regleDuDossier)",
    lecteurs.every((f) => readFileSync(f, "utf8").includes("regleDuDossier(")));
  const sql = readFileSync("supabase/migrations/20261117_noel_exemplaires.sql", "utf8");
  ok("migration : table à part, RLS activée, couverture contrainte", /create table if not exists public\.noel_exemplaires/.test(sql)
    && /enable row level security/.test(sql) && /check \(couverture in \('meme', 'autre'\)\)/.test(sql));
}
