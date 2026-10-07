import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { chargerFactures } from "../factures";
import "../../admin.css";
import "../atelier.css";

/**
 * /admin/atelier/factures — les faturas, une ligne par paiement (T-075).
 *
 * Lecture seule. Ce qui demande un geste (contrôle manuel, échec, brouillon
 * à relire) remonte en tête. La nota de crédito, l'émission d'un cas hors
 * table, la finalisation d'un brouillon : tout se fait DANS InvoiceXpress.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — factures", robots: { index: false, follow: false } };

const LIBELLE: Record<string, string> = {
  manual_review: "À facturer à la main",
  failed: "Échec (3 tentatives)",
  error: "Erreur, nouvel essai",
  draft: "Brouillon à relire",
  pending: "En attente",
  emitting: "En cours",
  emitted: "Émise",
  emitted_manual: "Émise à la main",
};

function euros(v: number | null): string {
  return v === null ? "" : `${v.toFixed(2).replace(".", ",")} €`;
}

export default async function PageFactures() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { jobs, migrationAbsente } = await chargerFactures();
  const compte = process.env.INVOICEXPRESS_ACCOUNT;
  const aTraiter = jobs.filter((j) => ["manual_review", "failed", "draft"].includes(j.status)).length;
  const auto = process.env.INVOICE_AUTO_FINALIZE;

  return (
    <div className="adm-root ate-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">Factures</h1>
        <p className="ate-bonjour">
          {aTraiter === 0
            ? "Rien à traiter à la main."
            : `${aTraiter} facture${aTraiter > 1 ? "s" : ""} à traiter à la main dans InvoiceXpress.`}{" "}
          Les brouillons se relisent et se finalisent dans InvoiceXpress ; cette page les voit passer
          « Émise » au passage suivant de l&apos;émetteur (5 minutes).
        </p>
        {auto !== undefined ? (
          <p className="ate-bonjour">
            Réglage lu côté site : INVOICE_AUTO_FINALIZE = {auto}. L&apos;émetteur, lui, lit le sien
            dans les secrets Supabase.
          </p>
        ) : null}
      </header>

      {migrationAbsente ? (
        <section className="ate-carte ate-sante ate-sante--orange">
          <h2 className="ate-carte-titre">Migration 20261007 non appliquée</h2>
          <p>Seules les colonnes historiques sont lisibles. Aucun job atelier ne peut être créé.</p>
        </section>
      ) : null}

      <section className="ate-carte ate-factures">
        <table>
          <thead>
            <tr>
              <th>Statut</th>
              <th>Date</th>
              <th>Paiement</th>
              <th>Pays</th>
              <th>Série</th>
              <th>Taux</th>
              <th>TTC</th>
              <th>Fatura</th>
              <th>Motif ou erreur</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className={`ate-facture--${j.status}`}>
                <td>{LIBELLE[j.status] ?? j.status}</td>
                <td>{new Date(j.created_at).toLocaleDateString("fr-FR")}</td>
                <td>
                  {j.numero_token ? (
                    <Link href={`/admin/atelier/${j.numero_token}`}>{j.stripe_payment_intent}</Link>
                  ) : (
                    j.stripe_payment_intent
                  )}
                  {j.origine ? <span className="ate-facture-origine"> {j.origine}</span> : null}
                </td>
                <td>
                  {j.pays_livraison ?? ""} {j.code_postal ?? ""}
                </td>
                <td>{j.serie ?? ""}</td>
                <td>{j.taux_tva !== null ? `${j.taux_tva} %` : ""}</td>
                <td>{euros(j.montant_ttc)}</td>
                <td>
                  {j.fatura_id && compte ? (
                    <a
                      href={`https://${compte}.app.invoicexpress.com/invoice_receipts/${j.fatura_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {j.fatura_numero ?? "brouillon"}
                    </a>
                  ) : (
                    j.fatura_numero ?? (j.fatura_id ? `brouillon ${j.fatura_id}` : "")
                  )}
                </td>
                <td>{j.motif_revue ?? j.error_message ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
