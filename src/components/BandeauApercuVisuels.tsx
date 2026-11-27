import { apercuVisuels } from "@/content/visuel-du-jour";
import "./bandeau-apercu-visuels.css";

/* Le rappel « vous regardez le site à une autre date », posé dans le layout
   racine. Il ne rend RIEN hors du mode brouillon : `draftMode()` ne rend pas
   une page statique dynamique, et le cookie n'est lu qu'une fois l'aperçu ouvert
   par /api/admin/visuels/apercu (cookie admin revérifié ici). */

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function BandeauApercuVisuels() {
  /* `apercuVisuels` ne lève jamais : hors requête ou sans droit, elle rend null. */
  const ap = await apercuVisuels();
  /* Dans un cadre de la vue « Sur le site », la date est déjà écrite
     au-dessus du cadre : pas de bandeau dans la page. */
  if (!ap || ap.source === "adresse") return null;
  return (
    <aside className="bav" aria-label="Aperçu des visuels">
      <span>
        Aperçu du {JOUR.format(new Date(`${ap.jour}T12:00:00Z`))}
        {ap.brouillons ? " · brouillons" : ""}
      </span>
      <a href="/api/admin/visuels/apercu?fin=1">Quitter</a>
    </aside>
  );
}
