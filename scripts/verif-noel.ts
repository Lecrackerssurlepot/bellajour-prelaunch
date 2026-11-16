/* Noël 2026 : les règles de la carte cadeau (src/lib/atelier/carteCadeau.ts).
   Sans base ni réseau, appelé par verif-atelier.ts. */
import { readFileSync } from "node:fs";
import {
  ALPHABET_CODE,
  codeDepuisOctets,
  expirationCarte,
  jourEnvoiValide,
  montantCarteValide,
  normaliserCode,
  reglementCommande,
  refusCarte,
  imputationCommande,
  soldeCredit,
  carteAEnvoyer,
} from "@/lib/atelier/carteCadeau";
import type Stripe from "stripe";
import { carteDepuisSession, estSessionCarte, genererCodeCarte, genererTokenCarte } from "@/lib/atelier/carteServeur";

type Ok = (n: string, c: boolean) => void;

export function verifierNoelCartes(ok: Ok, titre: (t: string) => void): void {
  titre("— Noël : la carte cadeau (décisions du 16/11) —");

  ok("alphabet : 31 signes, ni 0, O, 1, I, L", ALPHABET_CODE.length === 31 && !/[0O1IL]/.test(ALPHABET_CODE));
  const code = codeDepuisOctets([0, 1, 2, 3, 4, 30]);
  ok("code tiré d'octets : BJ-CADEAU-ABCDE9", code === "BJ-CADEAU-ABCDE9");
  ok("code : les octets >= 248 sont rejetés (loi uniforme), et trop peu d'octets rend null",
    codeDepuisOctets([255, 250, 248, 0, 0, 0, 0, 0, 0]) === "BJ-CADEAU-AAAAAA" && codeDepuisOctets([0, 0, 0]) === null);
  ok("saisie : minuscules, espaces et préfixe oublié pardonnés",
    normaliserCode("bj cadeau 7kq4mr") === "BJ-CADEAU-7KQ4MR" && normaliserCode(" 7KQ4MR ") === "BJ-CADEAU-7KQ4MR"
      && normaliserCode("BJ-CADEAU-7KQ4MR") === "BJ-CADEAU-7KQ4MR");
  ok("saisie : un signe hors alphabet est refusé, jamais corrigé (0, O, 1, I, L), comme une longueur fausse",
    ["7KQ4M0", "7KQ4MO", "7KQ4M1", "7KQ4MI", "7KQ4ML", "7KQ4M", "7KQ4MRR", "", null, 42].every((s) => normaliserCode(s) === null));

  ok("montants : 30, 50, 20 et 200 EUR passent",
    [3000, 5000, 2000, 20000, 12300].every(montantCarteValide));
  ok("montants : 19, 201 EUR, des centimes, un nombre écrit en texte ou négatif sont refusés",
    [1900, 20100, 2050, -3000, 0, NaN, "3000"].every((m) => !montantCarteValide(m)));

  ok("expiration : douze mois jour pour jour (16/11/2026 -> 16/11/2027)",
    expirationCarte(new Date("2026-11-16T10:00:00Z")).toISOString() === "2027-11-16T10:00:00.000Z");
  ok("expiration : un 29 février finit le 28 février de l'année suivante",
    expirationCarte(new Date("2028-02-29T09:00:00Z")).toISOString().startsWith("2029-02-28"));

  ok("jour d'envoi : vide = tout de suite (null)", jourEnvoiValide("", "2026-11-20") === null && jourEnvoiValide(undefined, "2026-11-20") === null);
  ok("jour d'envoi : du lendemain au 24 décembre",
    jourEnvoiValide("2026-11-21", "2026-11-20") === "2026-11-21" && jourEnvoiValide("2026-12-24", "2026-11-20") === "2026-12-24");
  ok("jour d'envoi : aujourd'hui, le passé, le 25 décembre et une date fausse sont refusés",
    [["2026-11-20"], ["2026-11-01"], ["2026-12-25"], ["2026-13-01"], ["24/12/2026"]].every(([j]) => jourEnvoiValide(j, "2026-11-20") === false));

  const r1 = reglementCommande(4600, 5000, 0);
  ok("règlement : carte de 50 EUR, commande de 46 EUR -> 0 à payer, 4 EUR au compte",
    r1 !== null && r1.carteCentimes === 4600 && r1.aPayerCentimes === 0 && r1.reliquatCentimes === 400 && r1.creditCentimes === 0);
  const r2 = reglementCommande(5900, 3000, 1000);
  ok("règlement : carte de 30 EUR + 10 EUR de crédit, commande de 59 EUR -> 19 EUR par Stripe",
    r2 !== null && r2.carteCentimes === 3000 && r2.creditCentimes === 1000 && r2.aPayerCentimes === 1900 && r2.reliquatCentimes === 0);
  const r3 = reglementCommande(2900, 0, 5000);
  ok("règlement : sans carte, le crédit paie jusqu'au total et rien de plus",
    r3 !== null && r3.creditCentimes === 2900 && r3.aPayerCentimes === 0 && r3.reliquatCentimes === 0);
  ok("règlement : une entrée négative ou décimale est refusée", reglementCommande(-1, 0, 0) === null && reglementCommande(100, 1.5, 0) === null);

  const maintenant = new Date("2026-12-01T12:00:00Z");
  const carte = { statut: "payee" as const, expire_le: "2027-11-16T10:00:00Z", livemode: true };
  ok("refus : une carte payée, valable, du bon mode passe", refusCarte(carte, maintenant, true) === null);
  ok("refus : une carte de TEST ne sert jamais en production, ni l'inverse",
    refusCarte(carte, maintenant, false) !== null && refusCarte({ ...carte, livemode: false }, maintenant, true) !== null);
  ok("refus : déjà servie, annulée, expirée (statut ou date) ont chacune leur phrase",
    refusCarte({ ...carte, statut: "utilisee" }, maintenant, true) === "Ce code a déjà servi."
      && refusCarte({ ...carte, statut: "remboursee" }, maintenant, true) === "Ce code a été annulé."
      && refusCarte({ ...carte, expire_le: "2026-11-30T00:00:00Z" }, maintenant, true) === "Ce code a expiré.");

  const src = readFileSync("src/lib/atelier/carteCadeau.ts", "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  ok("carteCadeau.ts reste PUR (ni crypto, ni réseau, ni horloge, ni base) : le navigateur le lit",
    !/node:crypto|fetch\(|Date\.now|new Date\(\)|process\.env|supabase/i.test(src));

  titre("— Noël : la session Stripe d'une carte, relue au paiement (lot 2) —");
  const base = {
    id: "cs_test_abc", created: 1794830400, livemode: false, payment_status: "paid", amount_total: 5000,
    customer_details: { email: "Acheteur@Exemple.fr" }, payment_intent: "pi_1",
    metadata: { kind: "carte_cadeau", montant_centimes: "5000", destinataire_prenom: "Camille", acheteur_prenom: "Léa",
      message: "Pour nos étés.", remise: "email", destinataire_email: "camille@exemple.fr", envoi_le: "" },
  };
  const sess = (patch: Record<string, unknown>, meta: Record<string, string> = {}) =>
    ({ ...base, ...patch, metadata: { ...base.metadata, ...meta } }) as unknown as Stripe.Checkout.Session;
  const lue = carteDepuisSession(sess({}));
  ok("session : une carte payée se relit (montant encaissé, acheteur en minuscules, test marqué)",
    lue.ok && lue.ligne.montant_centimes === 5000 && lue.ligne.acheteur_email === "acheteur@exemple.fr"
      && lue.ligne.livemode === false && lue.ligne.envoi_le === null && lue.ligne.stripe_payment_intent === "pi_1");
  ok("session : le tri ne reconnaît que kind = carte_cadeau", estSessionCarte(sess({})) && !estSessionCarte(sess({}, { kind: "atelier" })));
  const refus = (s: Stripe.Checkout.Session) => { const r = carteDepuisSession(s); return r.ok ? "" : r.raison; };
  ok("session : non payée, montant encaissé différent des métadonnées, ou hors bornes : refusée",
    refus(sess({ payment_status: "unpaid" })) === "non_payee" && refus(sess({ amount_total: 3000 })) === "montant_incoherent"
      && refus(sess({ amount_total: 25000 }, { montant_centimes: "25000" })) === "montant_incoherent");
  ok("session : par e-mail sans adresse du destinataire, ou sans prénom : refusée",
    refus(sess({}, { destinataire_email: "" })) === "destinataire_sans_email" && refus(sess({}, { destinataire_prenom: " " })) === "destinataire_sans_prenom");
  const imp = carteDepuisSession(sess({}, { remise: "imprimer", destinataire_email: "x@y.fr", envoi_le: "2026-12-24" }));
  ok("session : à imprimer, l'adresse du destinataire n'est pas gardée",
    imp.ok && imp.ligne.destinataire_email === null);
  ok("tirage serveur : un code de la bonne forme et un token de 32 caractères",
    normaliserCode(genererCodeCarte()) !== null && /^[A-Za-z0-9_-]{32}$/.test(genererTokenCarte()));

  titre("— Noël : la carte au paiement du magazine (lot 3) —");
  const i1 = imputationCommande(4100, 500, 5000, 0);
  ok("imputation : 50 EUR sur 41 + 5 de port -> magazines payés, port payé, 4 EUR au compte, 0 à payer",
    i1 !== null && i1.remiseMagazinesCentimes === 4100 && i1.livraisonCentimes === 0 && i1.aPayerCentimes === 0 && i1.reliquatCentimes === 400);
  const i2 = imputationCommande(5400, 0, 3000, 0);
  ok("imputation : 30 EUR sur 54 (port offert) -> 24 par Stripe, rien au compte",
    i2 !== null && i2.remiseMagazinesCentimes === 3000 && i2.aPayerCentimes === 2400 && i2.reliquatCentimes === 0);
  const i3 = imputationCommande(2400, 500, 2000, 1000);
  ok("imputation : carte de 20 + 10 de crédit sur 24 + 5 -> magazines couverts, 1 EUR de port, crédit pris 9",
    i3 !== null && i3.carteCentimes === 2000 && i3.creditCentimes === 900 && i3.remiseMagazinesCentimes === 2400
      && i3.livraisonCentimes === 0 && i3.aPayerCentimes === 0);
  const i4 = imputationCommande(4100, 500, 4300, 0);
  ok("imputation : ce que la carte laisse du port se paie (43 sur 41 + 5 -> 3 EUR de port)",
    i4 !== null && i4.livraisonCentimes === 300 && i4.aPayerCentimes === 300);
  const t = new Date("2026-12-01T00:00:00Z");
  ok("solde : reliquat moins dépense, du bon mode, sans l'expiré",
    soldeCredit([
      { montant_centimes: 400, expire_le: "2027-11-16T00:00:00Z", livemode: true },
      { montant_centimes: -100, expire_le: null, livemode: true },
      { montant_centimes: 900, expire_le: "2026-11-30T00:00:00Z", livemode: true },
      { montant_centimes: 5000, expire_le: null, livemode: false },
    ], t, true) === 300);
  const prog = { remise: "email", envoi_le: "2026-12-24", envoyee_le: null, statut: "payee" as const };
  ok("envoi programmé : part le jour choisi, pas la veille, jamais deux fois, jamais une carte annulée",
    carteAEnvoyer(prog, "2026-12-24") && !carteAEnvoyer(prog, "2026-12-23")
      && !carteAEnvoyer({ ...prog, envoyee_le: "2026-12-24T07:00:00Z" }, "2026-12-24")
      && !carteAEnvoyer({ ...prog, statut: "remboursee" }, "2026-12-24")
      && !carteAEnvoyer({ ...prog, envoi_le: null }, "2026-12-24"));
}
