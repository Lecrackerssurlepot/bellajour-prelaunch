import { cookies, draftMode } from "next/headers";
import { ADMIN_COOKIE, verifierCookieAdmin } from "@/lib/admin-auth";
import { COOKIE_APERCU_VISUELS, lireCookieApercu } from "@/lib/visuels/rotation";
import "./bandeau-apercu-visuels.css";

/* Le rappel « vous regardez le site à une autre date », posé dans le layout
   racine. Il ne rend RIEN hors du mode brouillon : `draftMode()` ne rend pas
   une page statique dynamique, et le cookie n'est lu qu'une fois l'aperçu ouvert
   par /api/admin/visuels/apercu (cookie admin revérifié ici). */

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function BandeauApercuVisuels() {
  try {
    if (!(await draftMode()).isEnabled) return null;
    const jar = await cookies();
    if (!(await verifierCookieAdmin(jar.get(ADMIN_COOKIE)?.value))) return null;
    const ap = lireCookieApercu(jar.get(COOKIE_APERCU_VISUELS)?.value);
    if (!ap) return null;
    return (
      <aside className="bav" aria-label="Aperçu des visuels">
        <span>
          Aperçu du {JOUR.format(new Date(`${ap.jour}T12:00:00Z`))}
          {ap.brouillons ? " · brouillons" : ""}
        </span>
        <a href="/api/admin/visuels/apercu?fin=1">Quitter</a>
      </aside>
    );
  } catch {
    return null;
  }
}
