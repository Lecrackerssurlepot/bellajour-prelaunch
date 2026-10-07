/**
 * L'alerte interne de facturation (T-075, 07/10/2026).
 *
 * Trois cas l'envoient : un job en `manual_review`, un job en `failed`, et le
 * remboursement d'un paiement déjà facturé (la nota de crédito reste à faire
 * à la main). L'Edge Function `emit-invoices` a sa propre copie de cet envoi,
 * en Deno : elle ne peut pas importer ce fichier.
 *
 * Le destinataire est `ALERTE_FACTURATION_EMAIL`, OBLIGATOIRE et sans valeur
 * par défaut : aucune adresse n'est écrite dans le code. Absente, on le dit
 * fort dans les journaux et on n'envoie rien. L'expéditeur est le seul
 * expéditeur validé du compte Brevo.
 *
 * Ne lève JAMAIS : une alerte ratée ne doit pas faire échouer un paiement.
 */
const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";
const EXPEDITEUR = { email: "contact@bellajour.com", name: "Bellajour facturation" };

function echapper(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function envoyerAlerteFacturation(
  sujet: string,
  lignes: Record<string, string | number | null | undefined>,
): Promise<boolean> {
  const destinataire = (process.env.ALERTE_FACTURATION_EMAIL || "").trim();
  if (!destinataire) {
    console.error(
      `[facturation/alerte] ⚠️ ALERTE_FACTURATION_EMAIL absente : alerte NON envoyée (« ${sujet} »)`,
      lignes,
    );
    return false;
  }
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error(`[facturation/alerte] ⚠️ BREVO_API_KEY absente : alerte NON envoyée (« ${sujet} »)`);
    return false;
  }

  const corps = Object.entries(lignes)
    .map(([k, v]) => `<tr><td><b>${echapper(k)}</b></td><td>${echapper(String(v ?? ""))}</td></tr>`)
    .join("");

  try {
    const res = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: EXPEDITEUR,
        to: [{ email: destinataire }],
        subject: `[Facturation] ${sujet}`,
        htmlContent: `<p>${echapper(sujet)}</p><table cellpadding="4">${corps}</table>
<p>Détail : https://www.bellajour.fr/admin/atelier/factures</p>`,
      }),
    });
    if (!res.ok) {
      console.error("[facturation/alerte] Brevo a refusé l'alerte", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[facturation/alerte] envoi impossible", e instanceof Error ? e.message : e);
    return false;
  }
}
