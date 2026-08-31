/**
 * GET /api/admin/atelier/metriques/export?p=30 — le rapport en CSV.
 *
 * LECTURE SEULE : aucune écriture, aucun mail, aucun état. La seule route
 * d'export de l'atelier — le pendant du CSV de la prévente côté /admin.
 *
 * Même défense en profondeur que toute route /api/admin/* : le middleware
 * vérifie le cookie HMAC, et la route re-vérifie via `quiEstConnecteRequete`.
 *
 * Le fichier vise EXCEL, pas un parseur : séparateur « ; » (la convention
 * des Excel francophones), BOM UTF-8 en tête (sans lui, Excel lit du
 * latin-1 et massacre les accents), décimales à la virgule. Deux sections :
 * les agrégats de la période, puis une ligne par dossier. Le dossier est
 * identifié par son token COURT (6 caractères) : il permet de le retrouver
 * dans le back-office sans qu'une fuite du fichier ouvre la moindre page —
 * un token tronqué ne donne accès à rien.
 *
 * Tous les chiffres viennent de metriques.ts, qui lit mesure.ts : le CSV ne
 * recalcule RIEN, il ne peut donc pas contredire l'écran.
 */

import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { PERIODES, chargerRapport, type Periode } from "@/app/admin/atelier/metriques";
import { ETAPES_VIE, dureeEtape, type JalonCle } from "@/lib/atelier/mesure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_PARIS = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/* Un champ CSV sûr : on ne fait confiance à aucun libellé pour ne pas
   contenir un « ; » un jour. */
function champ(v: string): string {
  return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function ligne(...champs: string[]): string {
  return champs.map(champ).join(";");
}

/** Une durée en heures pour Excel FR : une décimale, virgule. */
function heures(h: number | null): string {
  return h === null ? "" : h.toFixed(1).replace(".", ",");
}

function date(t: number | undefined): string {
  return t === undefined ? "" : DATE_PARIS.format(new Date(t));
}

const NOM_JALON: Record<JalonCle, string> = {
  cree: "Créé le",
  depot: "Dépôt terminé le",
  apercu: "Aperçu publié le",
  checkout: "Checkout ouvert le",
  paye: "Payé le",
  maquette: "Maquette publiée le",
  validee: "Validée le",
  production: "En production le",
  expediee: "Expédiée le",
  livree: "Livrée le",
};

/* L'ordre des colonnes de dates : la vie du dossier, de gauche à droite. */
const JALONS_COLONNES: JalonCle[] = [
  "cree", "depot", "apercu", "checkout", "paye",
  "maquette", "validee", "production", "expediee", "livree",
];

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams.get("p");
  const periode = (PERIODES.find((x) => x.cle === p)?.cle ?? "30") as Periode;

  try {
    const { metriques: m, lignes } = await chargerRapport(periode);
    const c = m.courant;

    const L: string[] = [];

    /* ── section 1 : les agrégats de la période ── */
    L.push(ligne("Bellajour — métriques de l'atelier"));
    L.push(ligne("Période", m.label));
    L.push(ligne("Exporté le", DATE_PARIS.format(new Date(m.fetchedAt))));
    if (m.debutMesurable) {
      L.push(
        ligne(
          "Réserve",
          `Les délais ne remontent pas avant le ${DATE_PARIS.format(new Date(m.debutMesurable))} : les dossiers avancés à la main en base n'ont pas journalisé leurs transitions.`,
        ),
      );
    }
    L.push("");

    L.push(ligne("Métrique", "Valeur"));
    L.push(ligne("Dossiers créés", String(c.questionnaires)));
    L.push(ligne("Dépôts terminés", String(c.depots)));
    L.push(ligne("Aperçus publiés", String(c.apercus)));
    L.push(ligne("Checkouts ouverts", String(c.checkouts)));
    L.push(ligne("Payés", String(c.payes)));
    L.push(ligne("Validées", String(c.validees)));
    L.push(ligne("Livrées", String(c.livrees)));
    L.push(ligne("Chiffre d'affaires (EUR)", String(c.ca)));
    L.push(ligne("Panier moyen (EUR)", c.panierMoyen === null ? "pas encore" : String(c.panierMoyen).replace(".", ",")));
    L.push(ligne("Répartition paliers", `${c.paliers.p30} x 30 EUR / ${c.paliers.p40} x 40 EUR / ${c.paliers.p45} x 45 EUR`));
    L.push(ligne("Relances envoyées (M3b)", String(c.relances)));
    L.push("");

    L.push(ligne("Étape", "Médiane (h)", "Effectif (n)"));
    for (const e of ETAPES_VIE) {
      const d = c.etapes[e.cle];
      L.push(ligne(e.label, d.mediane === null ? "pas encore" : heures(d.mediane), String(d.echantillon)));
    }
    L.push("");

    L.push(ligne("Réactivité (délai dépôt → aperçu)", "Taux de paiement (%)", "Payés", "Aperçus (n)"));
    for (const s of c.seaux) {
      L.push(ligne(s.label, s.taux === null ? "pas encore" : String(s.taux), String(s.payes), String(s.n)));
    }
    L.push("");

    L.push(ligne("Lecture"));
    for (const phrase of m.lecture) L.push(ligne(phrase));
    L.push("");

    /* ── section 2 : une ligne par dossier de la période ── */
    L.push(
      ligne(
        "Dossier",
        "Palier",
        "Payé",
        ...JALONS_COLONNES.map((j) => NOM_JALON[j]),
        ...ETAPES_VIE.map((e) => `${e.label} (h)`),
      ),
    );
    for (const d of lignes) {
      L.push(
        ligne(
          d.reference,
          d.palier ?? "",
          d.paye ? "oui" : "non",
          ...JALONS_COLONNES.map((j) => date(d.jalons[j])),
          ...ETAPES_VIE.map((e) => heures(dureeEtape(d.jalons, e.de, e.vers))),
        ),
      );
    }

    /* Le BOM en tête : sans lui, Excel ouvre le fichier en latin-1. */
    const corps = "\uFEFF" + L.join("\r\n") + "\r\n";
    const nom = `bellajour-metriques-${periode === "tout" ? "tout" : `${periode}j`}.csv`;

    return new NextResponse(corps, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nom}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[metriques/export] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
