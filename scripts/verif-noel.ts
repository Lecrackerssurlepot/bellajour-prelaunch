/* Noël 2026 : les règles de la carte cadeau (src/lib/atelier/carteCadeau.ts).
   Sans base ni réseau, appelé par verif-atelier.ts. */
import { readFileSync } from "node:fs";
import {
  ALPHABET_CODE,
  codeDepuisOctets,
  expirationCarte,
  noelAuSite,
  DEPOT_NOEL_MAX,
  jourEnvoiValide,
  montantCarteValide,
  normaliserCode,
  prefixeCode,
  prenomPourCode,
  reglementCommande,
  refusCarte,
  imputationCommande,
  soldeCredit,
  carteAEnvoyer,
  dateNoelPourMail,
  decalerJour,
  doitRappelerCarte,
  doitRappelerFetes,
  rappelCredit,
  recapCarteM4,
} from "@/lib/atelier/carteCadeau";
import type Stripe from "stripe";
import { NOEL_EXEMPLAIRE_FIN } from "../src/lib/atelier/exemplaires";
import {
  carteDepuisSession,
  estSessionCarte,
  genererCodeCarte,
  genererTokenCarte,
  parametresCarte,
  type CarteLigne,
} from "@/lib/atelier/carteServeur";

type Ok = (n: string, c: boolean) => void;

export function verifierNoelCartes(ok: Ok, titre: (t: string) => void): void {
  titre("— Noël : la carte cadeau (décisions du 16/11) —");

  ok("code tiré d'octets : 0x0000 donne 1000, 0x2327 (8999) donne 9999",
    codeDepuisOctets([0, 0]) === "BJ-NOEL-1000" && codeDepuisOctets([0x23, 0x27]) === "BJ-NOEL-9999");
  ok("code : les paires >= 63000 sont rejetées (loi uniforme), et trop peu d'octets rend null",
    codeDepuisOctets([0xff, 0xff, 0xf6, 0x18, 0, 5]) === "BJ-NOEL-1005" && codeDepuisOctets([0xff, 0xff]) === null && codeDepuisOctets([7]) === null);
  ok("saisie : les premières cartes (BJ-CADEAU-XXXXXX) passent toujours, préfixe oublié pardonné",
    normaliserCode("bj cadeau 7kq4mr") === "BJ-CADEAU-7KQ4MR" && normaliserCode(" 7KQ4MR ") === "BJ-CADEAU-7KQ4MR"
      && normaliserCode("BJ-CADEAU-7KQ4MR") === "BJ-CADEAU-7KQ4MR" && ALPHABET_CODE.length === 31);
  ok("saisie : un signe hors alphabet d'une ancienne carte est refusé, jamais corrigé, comme une longueur fausse",
    ["7KQ4M0", "7KQ4MO", "7KQ4M1", "7KQ4MI", "7KQ4ML", "7KQ4M", "7KQ4MRR", "", null, 42].every((s) => normaliserCode(s) === null));

  ok("montants : 30, 50, 20 et 200 EUR passent",
    [3000, 5000, 2000, 20000, 12300].every(montantCarteValide));
  ok("montants : 19, 201 EUR, des centimes, un nombre écrit en texte ou négatif sont refusés",
    [1900, 20100, 2050, -3000, 0, NaN, "3000"].every((m) => !montantCarteValide(m)));

  ok("expiration : douze mois jour pour jour, jusqu'à 23 h 59 à Paris (16/11/2026 -> 16/11/2027)",
    expirationCarte(new Date("2026-11-16T10:00:00Z")).toISOString() === "2027-11-16T22:59:59.999Z");
  ok("expiration : un achat à 0 h 30 à Paris compte le jour de Paris, pas la veille UTC",
    expirationCarte(new Date("2026-11-15T23:30:00Z")).toISOString() === "2027-11-16T22:59:59.999Z");
  ok("expiration : en heure d'été, la fin reste 23 h 59 à Paris et le jour lu par les mails est le bon",
    expirationCarte(new Date("2026-06-10T12:00:00Z")).toISOString() === "2027-06-10T21:59:59.999Z");
  ok("expiration : un 29 février finit le 28 février de l'année suivante",
    expirationCarte(new Date("2028-02-29T09:00:00Z")).toISOString().startsWith("2029-02-28"));

  ok("Noël au site : le 25/12 à 23 h 30 à Paris, encore là",
    noelAuSite(new Date("2026-12-25T22:30:00Z")));
  ok("Noël au site : le 26/12 à 0 h 30 à Paris, éteint (bandeau, chapitre, bloc /magazine, carte sur /numero)",
    !noelAuSite(new Date("2026-12-25T23:30:00Z")));
  ok("la fin des dépôts de Noël et la fin du 2e exemplaire à −40/−20 sont le même jour",
    DEPOT_NOEL_MAX === NOEL_EXEMPLAIRE_FIN);
  {
    const achat = readFileSync("src/app/(atelier)/offrir/Achat.tsx", "utf8");
    ok("/offrir : « Un autre jour » n'est proposé que s'il reste un jour à proposer (après le 23/12, plus rien)",
      /\{jours\.length > 0 && \(\s*<button[^\n]*>Un autre jour<\/button>/.test(achat));
  }
  for (const page of ["src/app/(atelier)/page.tsx", "src/app/(atelier)/magazine/page.tsx"]) {
    const src = readFileSync(page, "utf8");
    ok(`${page} : Noël s'éteint seul après le 25/12 (noelAuSite + revalidate)`,
      src.includes(".ouvert && noelAuSite(new Date())") && /export const revalidate = \d+/.test(src));
  }
  {
    /* « Découvrir l'univers » : pendant Noël, une glissade courte vers la carte
       cadeau ; hors Noël (ou sans le chapitre), la descente d'origine vers #u1. */
    const ouv = readFileSync("src/app/(atelier)/components/Ouverture.tsx", "utf8");
    const corps = ouv.slice(ouv.indexOf("const descendre = () => {"));
    ok("Découvrir l'univers : vers la carte pendant Noël, vers #u1 après",
      /^const descendre = \(\) => \{[\s\S]*?if \(noel && glisserVers\('noel-accueil'\)\) return\n\s*const cible = document\.getElementById\('u1'\)/.test(corps));
  }
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

  titre("— Noël : le code, PRÉNOM-NOEL-1234 (Mathias, 16/11) —");
  ok("prénom : accents, tirets et espaces retirés, douze lettres au plus",
    prenomPourCode("Marie-Hélène") === "MARIEHELENE" && prenomPourCode("Zoé") === "ZOE" && prenomPourCode("Anne Sophie") === "ANNESOPHIE"
      && prenomPourCode("Maximilienne-Charlotte") === "MAXIMILIENNE" && prenomPourCode("Chloë") === "CHLOE" && prenomPourCode("Lætitia") === "LAETITIA");
  ok("prénom illisible (une lettre, chiffres, vide) : BJ-NOEL-",
    prenomPourCode("J.") === null && prenomPourCode("42") === null && prenomPourCode("") === null && prefixeCode(null) === "BJ-NOEL-");
  {
    const tires = Array.from({ length: 200 }, () => genererCodeCarte("Camille"));
    ok("tirage : CAMILLE-NOEL- puis quatre chiffres de 1000 à 9999, relu tel quel",
      tires.every((t) => /^CAMILLE-NOEL-[1-9][0-9]{3}$/.test(t) && normaliserCode(t) === t));
  }
  ok("tirage d'octets avec prénom : 0x0EED (3821) donne ZOE-NOEL-4821", codeDepuisOctets([0x0e, 0xed], "Zoé") === "ZOE-NOEL-4821");
  ok("saisie : « camille noël 4821 », « Camille-Noel-4821 », « CAMILLENOEL4821 » donnent CAMILLE-NOEL-4821",
    ["camille noël 4821", "Camille-Noel-4821", "CAMILLENOEL4821", " camille-noel-4821 ", "Camille Noël 4821"].every((s) => normaliserCode(s) === "CAMILLE-NOEL-4821"));
  ok("saisie : un prénom accentué tapé tel quel est pardonné (« Zoé Noël 4821 »)", normaliserCode("Zoé Noël 4821") === "ZOE-NOEL-4821");
  ok("saisie : un prénom NOEL ne trompe pas (« Noël Noël 4821 »)", normaliserCode("Noël Noël 4821") === "NOEL-NOEL-4821");
  ok("saisie : nombre à trois ou cinq chiffres, zéro en tête, sans NOEL, prénom trop long ou avec chiffre : refusé",
    ["CAMILLE-NOEL-482", "CAMILLE-NOEL-48210", "CAMILLE-NOEL-0821", "CAMILLE-4821", "MAXIMILIENNEC-NOEL-4821", "CAM1LLE-NOEL-4821", "4821"]
      .every((s) => normaliserCode(s) === null));
  {
    const sql = readFileSync("supabase/migrations/20261117_noel_code_prenom_noel.sql", "utf8");
    ok("base : la contrainte du code est celle du module (PRÉNOM-NOEL-1234, ou BJ-CADEAU-XXXXXX)",
      sql.includes("'^([A-Z]{2,12}-NOEL-[1-9][0-9]{3}|BJ-CADEAU-[A-HJKMNP-Z2-9]{6})$'"));
  }
  {
    const sql = readFileSync("supabase/migrations/20261117_noel_codes_et_mails.sql", "utf8");
    const serveurTs = readFileSync("src/lib/atelier/carteServeur.ts", "utf8");
    const CODES_MAIL_CARTE = (serveurTs.match(/export type CodeMailCarte = ([^;]+);/)?.[1] ?? "").match(/"([A-Za-z0-9]+)"/g)?.map((c) => c.slice(1, -1)) ?? [];
    const permis = (sql.match(/cartes_mails_code_check\s+check \(code in \(([^)]*)\)/) ?? [])[1] ?? "";
    ok("base : chaque mail de carte est permis par la contrainte de cartes_mails (GC4b, GC6, GC7 étaient refusés)",
      CODES_MAIL_CARTE.length === 9 && CODES_MAIL_CARTE.every((c) => permis.includes(`'${c}'`)));
  }

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
      && carteAEnvoyer({ ...prog, envoi_le: null }, "2026-12-24"));
  ok("envoi tout de suite raté au paiement : la relève la reprend (envoi_le vide, pas encore partie)",
    carteAEnvoyer({ ...prog, envoi_le: null }, "2026-11-20") && !carteAEnvoyer({ ...prog, envoi_le: null, remise: "imprimer" }, "2026-11-20"));

  titre("— Noël : les mails de la carte (16/11) —");
  ok("la date de Noël se dit jusqu'au 7 décembre inclus, plus après",
    dateNoelPourMail("2026-12-07") === "lundi 7 décembre" && dateNoelPourMail("2026-12-08") === "");
  ok("décaler un jour : 30 jours avant le 16/11/2027, en traversant un mois",
    decalerJour("2027-11-16", -30) === "2027-10-17" && decalerJour("2027-03-01", -1) === "2027-02-28");
  const recue = {
    statut: "payee" as const, remise: "email", destinataire_email: "camille@exemple.fr",
    envoyee_le: "2026-12-20T07:00:00Z", expire_le: "2027-11-16T10:00:00Z",
  };
  ok("GC4 : à J−30 pile, pas la veille, plus le jour de la fin",
    doitRappelerCarte(recue, "2027-10-17") && !doitRappelerCarte(recue, "2027-10-16") && !doitRappelerCarte(recue, "2027-11-16"));
  ok("GC4 : jamais une carte utilisée, à imprimer, ou pas encore partie",
    !doitRappelerCarte({ ...recue, statut: "utilisee" }, "2027-10-20")
      && !doitRappelerCarte({ ...recue, remise: "imprimer", destinataire_email: null }, "2027-10-20")
      && !doitRappelerCarte({ ...recue, envoyee_le: null }, "2027-10-20"));
  ok("GC6 : le 15 janvier pour une carte des fêtes, pas avant, pas pour une carte de février",
    doitRappelerFetes(recue, "2027-01-15") && !doitRappelerFetes(recue, "2027-01-14")
      && !doitRappelerFetes({ ...recue, envoyee_le: "2027-02-03T07:00:00Z" }, "2027-03-01"));
  ok("GC6 ne croise jamais GC4 : il s'arrête où GC4 commence",
    !doitRappelerFetes(recue, "2027-10-17") && doitRappelerFetes(recue, "2027-10-16"));
  const reste = { montant_centimes: 1200, expire_le: "2027-11-16T10:00:00Z" };
  ok("GC4b : le reste à J−30, borné au solde, rien si le compte est vide ou la fin passée",
    rappelCredit(reste, 5000, "2027-10-20") === 1200 && rappelCredit(reste, 700, "2027-10-20") === 700
      && rappelCredit(reste, 0, "2027-10-20") === 0 && rappelCredit(reste, 5000, "2027-10-16") === 0
      && rappelCredit(reste, 5000, "2027-11-16") === 0);
  const vide = recapCarteM4(null);
  ok("M4 sans carte ni crédit : tout vide, le bloc disparaît", Object.values(vide).every((v) => v === "") && vide.RECAP_CARTE === "");
  const r50 = recapCarteM4({ carteCentimes: 5000, donateur: "Léa", creditCentimes: 0, reliquatCentimes: 1200, reliquatJusqu: "16 novembre 2027" });
  ok("M4 : carte de 50 sur un numéro de 38 -> −38, 12 pour le prochain, la carte de Léa",
    r50.RECAP_CARTE === "oui" && r50.CARTE_MONTANT === "38" && r50.RELIQUAT === "12" && r50.CARTE_DE === "Léa" && r50.CREDIT === "");
  const rCredit = recapCarteM4({ carteCentimes: 0, donateur: null, creditCentimes: 1250, reliquatCentimes: 0, reliquatJusqu: "" });
  ok("M4 : crédit seul -> une ligne, au centime (12,50)", rCredit.CREDIT === "12,50" && rCredit.CARTE_MONTANT === "" && rCredit.RELIQUAT === "");

  const ligneCarte: CarteLigne = {
    id: "c", code: "CAMILLE-NOEL-4821", token: "t".repeat(32), montant_centimes: 5000,
    acheteur_email: "lea@exemple.fr", acheteur_prenom: "Léa", destinataire_prenom: "Camille",
    destinataire_email: "camille@exemple.fr", message: null, remise: "email", envoi_le: null, envoyee_le: null,
    livemode: false, statut: "payee", expire_le: "2027-11-16T10:00:00Z", created_at: "2026-11-16T10:00:00Z",
  };
  const p = parametresCarte(ligneCarte, new Date("2026-11-20T10:00:00Z"));
  ok("paramètres : la fin avec l'année, l'adresse du destinataire, la date de Noël avant le 7/12",
    p.DATE === "16 novembre 2027" && p.EMAIL_DEST === "camille@exemple.fr" && p.DATE_NOEL === "lundi 7 décembre");
  ok("paramètres : le bouton de GC2 applique le code (/composer?nouveau=1&carte=CODE)",
    p.LIEN_COMPOSER.endsWith("/composer?nouveau=1&carte=CAMILLE-NOEL-4821") && /\/carte\/t{32}$/.test(p.LIEN_CARTE));

  /* Le texte des mails (scripts/mails-noel.mjs) et le code doivent se répondre :
     chaque code a son gabarit, chaque variable d'un gabarit est fournie. */
  const texte = readFileSync("scripts/mails-noel.mjs", "utf8");
  const serveur = readFileSync("src/lib/atelier/carteServeur.ts", "utf8");
  const codes = (serveur.match(/export type CodeMailCarte = ([^;]+);/)?.[1] ?? "").match(/"([A-Z0-9a-z]+)"/g)?.map((c) => c.slice(1, -1)) ?? [];
  ok(`chaque mail de carte a son texte (${codes.join(", ")})`,
    codes.length === 9 && codes.every((c) => texte.includes(`code: "${c}"`)));
  const fournies = new Set([...Object.keys(p), "RELIQUAT", "PLACES"]);
  const demandees = new Set([...texte.matchAll(/\b(?:P|SI)\("([A-Z_]+)"/g)].map((m) => m[1]));
  const orphelines = [...demandees].filter((k) => !fournies.has(k));
  ok(`chaque variable des mails de Noël est fournie par le code${orphelines.length ? ` (manquent : ${orphelines.join(", ")})` : ""}`,
    orphelines.length === 0);
  ok("GC3 n'existe plus : son reste est un bloc de M4", !/"GC3"/.test(serveur) && /RECAP_CARTE/.test(readFileSync("scripts/mails-atelier.mjs", "utf8")));
}
