/* Noël 2026 (16/11) : le PARCOURS d'une carte cadeau, joué de bout en bout
   sur la fausse base en mémoire et un faux Brevo qui note chaque mail.
   Ni base, ni réseau, ni vrai envoi : `globalThis.fetch` est remplacé le
   temps du test, puis rendu.

   Ce que ça prouve, et qu'une recette locale ne peut pas prouver (là,
   ATELIER_MAILS_COUPES fait échouer chaque envoi, donc la chaîne s'arrête
   au premier mail) :
   - qui reçoit quel mail, dans quel ordre, avec quels paramètres ;
   - que chaque bouton mène au vrai site, à la bonne page, avec le bon code ;
   - qu'un rejeu (webhook, relève) n'envoie jamais deux fois ;
   - que le code et le reste vont à la bonne personne. */
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { baseEnMemoire, type LigneMem } from "./fausseBase";
import {
  consommerCarteEtCredit,
  enregistrerCarte,
  envoyerCartesProgrammees,
  envoyerRappelsCartes,
  parametresM4Carte,
  type CarteLigne,
} from "@/lib/atelier/carteServeur";

type Ok = (n: string, c: boolean) => void;
type Mail = { templateId: number; email: string; params: Record<string, string> };

const GABARITS: Record<string, number> = { GC1: 901, GC1B: 902, GC2: 903, GC2B: 904, GC4: 905, GC4B: 906, GC5: 907, GC6: 908, GC7: 909 };
const code = (id: number) => Object.entries(GABARITS).find(([, v]) => v === id)?.[0].replace("B", "b") ?? `?${id}`;

export async function verifierNoelParcours(ok: Ok, titre: (t: string) => void): Promise<void> {
  titre("— Noël : le parcours d'une carte, de bout en bout (faux Brevo, fausse base) —");

  const sauve = { fetch: globalThis.fetch, env: { ...process.env } };
  const boite: Mail[] = [];
  let refuser: (m: Mail) => boolean = () => false;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (!u.startsWith("https://api.brevo.com/")) throw new Error(`réseau interdit dans le harnais : ${u}`);
    const corps = JSON.parse(String(init?.body ?? "{}"));
    const m: Mail = { templateId: corps.templateId, email: corps.to?.[0]?.email, params: corps.params ?? {} };
    if (refuser(m)) return new Response("refusé", { status: 500 });
    boite.push(m);
    return new Response(JSON.stringify({ messageId: `<m${boite.length}@faux>` }), { status: 201 });
  }) as typeof fetch;
  process.env.BREVO_API_KEY = "cle-du-harnais";
  delete process.env.ATELIER_MAILS_COUPES;
  delete process.env.NEXT_PUBLIC_SITE_URL;
  process.env.STRIPE_SECRET_KEY = "sk_test_harnais";
  for (const [c, id] of Object.entries(GABARITS)) process.env[`BREVO_TEMPLATE_${c}_ID`] = String(id);

  try {
    const tables: Record<string, LigneMem[]> = { cartes_cadeau: [], cartes_mails: [], credits_mouvements: [], numeros: [], evenements: [] };
    /* Les index uniques de la vraie base : le verrou d'un mail (carte_id, code)
       et le grand livre (numero_id, motif). */
    const { client } = baseEnMemoire(tables, ({ table, op, payload }) => {
      if (op !== "insert") return null;
      const p = payload as LigneMem;
      // Les valeurs par défaut de la vraie table (migration 20261116).
      if (table === "cartes_cadeau") Object.assign(p, { statut: p.statut ?? "payee", envoyee_le: p.envoyee_le ?? null });
      const doublon =
        (table === "cartes_mails" && tables.cartes_mails.some((l) => l.carte_id === p.carte_id && l.code === p.code)) ||
        (table === "credits_mouvements" && !!p.numero_id && tables.credits_mouvements.some((l) => l.numero_id === p.numero_id && l.motif === p.motif));
      return doublon ? { code: "23505", message: "doublon" } : null;
    });
    const sb = client as unknown as SupabaseClient;

    let n = 0;
    const session = (meta: Record<string, string>, acheteur = "lea@exemple.fr"): Stripe.Checkout.Session =>
      ({
        id: `cs_test_${++n}`,
        object: "checkout.session",
        payment_status: "paid",
        amount_total: Number(meta.montant_centimes),
        created: Math.floor(Date.parse("2026-11-16T10:00:00Z") / 1000),
        livemode: false,
        payment_intent: `pi_test_${n}`,
        customer_details: { email: acheteur },
        metadata: { kind: "carte_cadeau", acheteur_prenom: "Léa", destinataire_prenom: "Camille", ...meta },
      }) as unknown as Stripe.Checkout.Session;
    const depuis = (avant: number) => boite.slice(avant).map((m) => `${code(m.templateId)}>${m.email}`);
    const dernier = (c: string) => [...boite].reverse().find((m) => code(m.templateId) === c);

    /* ── 1. Par e-mail, tout de suite ── */
    let avant = boite.length;
    const a = await enregistrerCarte(sb, session({ montant_centimes: "5000", remise: "email", destinataire_email: "camille@exemple.fr", message: "Pour nos étés." }));
    const carteA = a.carte as CarteLigne;
    ok("tout de suite : GC2 à Camille D'ABORD, puis GC1 à Léa (rien d'autre)",
      JSON.stringify(depuis(avant)) === JSON.stringify(["GC2>camille@exemple.fr", "GC1>lea@exemple.fr"]));
    const gc1 = dernier("GC1");
    ok("GC1 dit à Léa où la carte est partie : « Envoyée à camille@exemple.fr »",
      gc1?.params.EMAIL_DEST === "camille@exemple.fr" && gc1?.params.PRENOM_DEST === "Camille" && gc1?.params.MONTANT === "50");
    const gc2 = dernier("GC2");
    ok("GC2 : le bouton mène au vrai site, applique le code, la carte vaut 12 mois",
      gc2?.params.LIEN_COMPOSER === `https://www.bellajour.fr/composer?nouveau=1&carte=${encodeURIComponent(carteA.code)}`
        && gc2?.params.CODE === carteA.code && gc2?.params.DATE === "16 novembre 2027" && gc2?.params.PRENOM_DONATEUR === "Léa");
    ok("GC1 : « Voir et imprimer la carte » mène à /carte/<token> du vrai site",
      gc1?.params.LIEN_CARTE === `https://www.bellajour.fr/carte/${carteA.token}`);
    ok("la carte est marquée partie", !!tables.cartes_cadeau.find((c) => c.id === carteA.id)?.envoyee_le);
    avant = boite.length;
    const rejeu = await enregistrerCarte(sb, { ...session({ montant_centimes: "5000", remise: "email", destinataire_email: "camille@exemple.fr" }), id: "cs_test_1" } as Stripe.Checkout.Session);
    ok("rejeu du webhook sur la même session : la même carte, aucun mail de plus",
      rejeu.carte?.id === carteA.id && boite.length === avant && tables.cartes_cadeau.filter((c) => c.stripe_session_id === "cs_test_1").length === 1);

    /* ── 2. Par e-mail, Brevo refuse GC2 au paiement ── */
    avant = boite.length;
    refuser = (m) => code(m.templateId) === "GC2";
    const b = await enregistrerCarte(sb, session({ montant_centimes: "3000", remise: "email", destinataire_email: "jules@exemple.fr", destinataire_prenom: "Jules" }));
    const carteB = b.carte as CarteLigne;
    ok("GC2 refusé : GC1 ne part PAS (Léa n'apprend jamais un départ qui n'a pas eu lieu), le verrou est rendu",
      depuis(avant).length === 0 && !tables.cartes_mails.some((l) => l.carte_id === carteB.id)
        && !tables.cartes_cadeau.find((c) => c.id === carteB.id)?.envoyee_le);
    refuser = () => false;
    avant = boite.length;
    await envoyerCartesProgrammees(sb, new Date("2026-11-17T07:00:00Z"));
    ok("la relève du lendemain la reprend : GC2 à Jules puis GC1 à Léa (pas GC2b)",
      JSON.stringify(depuis(avant)) === JSON.stringify(["GC2>jules@exemple.fr", "GC1>lea@exemple.fr"]));

    /* ── 3. Programmée au 24 décembre ── */
    avant = boite.length;
    const c = await enregistrerCarte(sb, session({ montant_centimes: "5000", remise: "email", destinataire_email: "nina@exemple.fr", destinataire_prenom: "Nina", envoi_le: "2026-12-24" }));
    const carteC = c.carte as CarteLigne;
    const gc1b = dernier("GC1b");
    ok("programmée : GC1b seul, à Léa, avec le jour et l'adresse",
      JSON.stringify(depuis(avant)) === JSON.stringify(["GC1b>lea@exemple.fr"])
        && gc1b?.params.DATE_ENVOI === "24 décembre" && gc1b?.params.EMAIL_DEST === "nina@exemple.fr");
    avant = boite.length;
    await envoyerCartesProgrammees(sb, new Date("2026-12-23T07:00:00Z"));
    ok("la veille : rien ne part", depuis(avant).length === 0);
    await envoyerCartesProgrammees(sb, new Date("2026-12-24T07:00:00Z"));
    ok("le 24 au matin : GC2 à Nina puis GC2b à Léa", JSON.stringify(depuis(avant)) === JSON.stringify(["GC2>nina@exemple.fr", "GC2b>lea@exemple.fr"]));
    avant = boite.length;
    await envoyerCartesProgrammees(sb, new Date("2026-12-25T07:00:00Z"));
    ok("le lendemain : plus rien (jamais deux fois)", depuis(avant).length === 0);

    /* ── 4. À imprimer ── */
    avant = boite.length;
    await enregistrerCarte(sb, session({ montant_centimes: "4000", remise: "imprimer", destinataire_prenom: "Paul" }));
    ok("à imprimer : GC1 seul, à Léa, sans adresse de destinataire (« Elle est prête »)",
      JSON.stringify(depuis(avant)) === JSON.stringify(["GC1>lea@exemple.fr"]) && dernier("GC1")?.params.EMAIL_DEST === "");

    /* ── 5. Une carte de test ne part jamais avec une clé live ── */
    process.env.STRIPE_SECRET_KEY = "sk_live_harnais";
    avant = boite.length;
    tables.cartes_cadeau.push({ ...tables.cartes_cadeau.find((x) => x.id === carteC.id)!, id: "carte-test-orpheline", envoyee_le: null, envoi_le: "2026-12-24" });
    await envoyerCartesProgrammees(sb, new Date("2026-12-24T07:00:00Z"));
    ok("clé live : une carte de test programmée ne reçoit rien", depuis(avant).length === 0);
    tables.cartes_cadeau.splice(tables.cartes_cadeau.findIndex((x) => x.id === "carte-test-orpheline"), 1);
    process.env.STRIPE_SECRET_KEY = "sk_test_harnais";

    /* ── 6. Camille paie son numéro de 38 € avec la carte de 50 € ── */
    tables.numeros.push({ id: "num-camille", email: "Camille@Exemple.fr", prenom: "Camille" });
    const paiement = {
      id: "cs_test_numero",
      livemode: false,
      metadata: { kind: "atelier", carte_id: carteA.id, carte_code: carteA.code, carte_centimes: "3800", credit_compte_centimes: "0", reliquat_centimes: "1200" },
    } as unknown as Stripe.Checkout.Session;
    avant = boite.length;
    await consommerCarteEtCredit(sb, paiement, { id: "num-camille", email: "Camille@Exemple.fr", prenom: "Camille" });
    const usee = tables.cartes_cadeau.find((x) => x.id === carteA.id);
    const reste = tables.credits_mouvements.filter((l) => l.numero_id === "num-camille" && l.motif === "reliquat_carte");
    ok("la carte devient « utilisée » par CE numéro", usee?.statut === "utilisee" && usee?.utilisee_numero_id === "num-camille");
    ok("les 12 € vont au compte de Camille (adresse canonique), jusqu'à la fin de la carte",
      reste.length === 1 && reste[0].montant_centimes === 1200 && reste[0].email_canonical === "camille@exemple.fr" && reste[0].expire_le === carteA.expire_le);
    ok("GC7 à Léa seulement (le reste se dit dans M4, pas dans un second mail à Camille)",
      JSON.stringify(depuis(avant)) === JSON.stringify(["GC7>lea@exemple.fr"]) && dernier("GC7")?.params.PRENOM_DEST === "Camille");
    const m4 = await parametresM4Carte(sb, "num-camille");
    ok("M4 de Camille : la carte de Léa −38, 12 pour le prochain, jusqu'au 16 novembre 2027",
      m4.RECAP_CARTE === "oui" && m4.CARTE_DE === "Léa" && m4.CARTE_MONTANT === "38" && m4.RELIQUAT === "12" && m4.RELIQUAT_JUSQU === "16 novembre 2027" && m4.CREDIT === "");
    avant = boite.length;
    await consommerCarteEtCredit(sb, paiement, { id: "num-camille", email: "Camille@Exemple.fr", prenom: "Camille" });
    ok("rejeu du paiement : ni second reste, ni second GC7",
      depuis(avant).length === 0 && tables.credits_mouvements.filter((l) => l.numero_id === "num-camille").length === 1);
    ok("M4 sans carte : bloc vide", (await parametresM4Carte(sb, "num-sans-carte")).RECAP_CARTE === "");

    /* Léa utilise elle-même la carte de Paul (à imprimer) : pas de GC7 à elle-même. */
    const carteP = tables.cartes_cadeau.find((x) => x.destinataire_prenom === "Paul") as unknown as CarteLigne;
    tables.numeros.push({ id: "num-lea", email: "lea@exemple.fr", prenom: "Léa" });
    avant = boite.length;
    await consommerCarteEtCredit(sb, { id: "cs_test_lea", livemode: false, metadata: { carte_id: carteP.id, carte_centimes: "4000", reliquat_centimes: "0" } } as unknown as Stripe.Checkout.Session,
      { id: "num-lea", email: "lea@exemple.fr", prenom: "Léa" });
    ok("une carte utilisée par son propre acheteur : pas de GC7", depuis(avant).length === 0);

    /* ── 7. Les rappels ── */
    avant = boite.length;
    await envoyerRappelsCartes(sb, new Date("2027-01-15T07:00:00Z"));
    const fetes = depuis(avant);
    ok("15 janvier : GC6 aux deux cartes reçues pendant les fêtes et jamais utilisées (Jules, Nina), pas à Camille qui l'a utilisée",
      fetes.length === 2 && fetes.includes("GC6>jules@exemple.fr") && fetes.includes("GC6>nina@exemple.fr"));
    ok("GC6 : le bouton applique le code de SA carte", dernier("GC6")?.params.LIEN_COMPOSER.includes("carte=BJ-CADEAU-") === true);
    avant = boite.length;
    await envoyerRappelsCartes(sb, new Date("2027-01-16T07:00:00Z"));
    ok("le lendemain : GC6 ne repart pas", depuis(avant).length === 0);
    avant = boite.length;
    await envoyerRappelsCartes(sb, new Date("2027-10-20T07:00:00Z"));
    const fin = depuis(avant);
    ok("J−30 : GC4 à Jules et Nina, GC4b (le reste) à Camille, à l'adresse de son numéro",
      fin.length === 3 && fin.includes("GC4>jules@exemple.fr") && fin.includes("GC4>nina@exemple.fr") && fin.includes("GC4b>Camille@Exemple.fr"));
    const gc4b = dernier("GC4b");
    ok("GC4b : « Encore 12 € pour vous », jusqu'au 16 novembre 2027, au prénom de Camille",
      gc4b?.params.RELIQUAT === "12" && gc4b?.params.DATE === "16 novembre 2027" && gc4b?.params.PRENOM === "Camille");
    avant = boite.length;
    await envoyerRappelsCartes(sb, new Date("2027-10-21T07:00:00Z"));
    ok("le lendemain : aucun rappel ne repart", depuis(avant).length === 0);

    /* Tous les liens de tous les mails partis visent le vrai site. */
    const liens = boite.flatMap((m) => Object.entries(m.params).filter(([k]) => k.startsWith("LIEN")).map(([, v]) => v));
    ok(`les ${liens.length} liens des ${boite.length} mails partis visent https://www.bellajour.fr`,
      liens.length > 0 && liens.every((l) => l.startsWith("https://www.bellajour.fr/")));
  } finally {
    globalThis.fetch = sauve.fetch;
    for (const k of Object.keys(process.env)) if (!(k in sauve.env)) delete process.env[k];
    Object.assign(process.env, sauve.env);
  }
}
