import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { adresseDuCompte, VAR_COMPTE_AGENDA } from "@/lib/collectif/agenda";
import { MIGRATION_RDV } from "@/lib/collectif/migration";
import { lireInterlocuteurs } from "@/lib/collectif/rendezvous";
import Agendas from "./Agendas";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/agendas — relier les agendas de l'atelier (D23, T-148).
 * Le compte de service Google (la variable `GOOGLE_AGENDA_COMPTE`, posée par
 * Mathias, jamais collée dans une conversation), puis, pour chaque personne,
 * son agenda et son lien visio, et un bouton qui PROUVE la connexion.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — agendas", robots: { index: false, follow: false } };

export default async function PageAgendas() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  const lu = await lireInterlocuteurs(makeSupabase());
  const adresse = adresseDuCompte();

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions("agendas")} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Les agendas</h1>
        <p className="ate-bonjour">Les créneaux que les clients voient dans leur espace viennent de ces agendas : libre ou occupé, jamais leur contenu.</p>
      </header>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">1. Le compte Google de l&apos;atelier</h2>
        {adresse ? (
          <>
            <p>
              Posé. Chacun partage son agenda avec cette adresse, permission <strong>« Apporter des modifications aux événements »</strong> :
            </p>
            <p className="eca-adresse-compte">{adresse}</p>
          </>
        ) : (
          <>
            <p className="eca-sous">
              Pas encore posé : <code>{VAR_COMPTE_AGENDA}</code> est absente. Sans elle, les clients voient le lien de rendez-vous des réglages.
            </p>
            <ol className="eca-etapes-agenda">
              <li>
                Sur <strong>console.cloud.google.com</strong>, avec ton compte Google : créer un projet, par exemple « Bellajour agenda ».
              </li>
              <li>
                « API et services » → « Bibliothèque » : activer <strong>Google Calendar API</strong>.
              </li>
              <li>
                « IAM et administration » → « Comptes de service » → « Créer un compte de service » (nom : bellajour-agenda), sans rôle.
              </li>
              <li>
                Sur ce compte : « Clés » → « Ajouter une clé » → « Créer une clé » → <strong>JSON</strong>. Un fichier se télécharge.
              </li>
              <li>
                Sur Vercel (Settings → Environment Variables), créer <code>{VAR_COMPTE_AGENDA}</code> en Production et Preview, valeur : tout le contenu du fichier.
                Le même dans <code>.env.local</code> pour le local (sur une ligne : le fichier passé en base64 convient aussi). Puis redéployer.
              </li>
              <li>Ne jamais coller cette clé dans une conversation ni dans un mail. Le fichier téléchargé peut ensuite être supprimé.</li>
            </ol>
          </>
        )}
      </section>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">2. L&apos;agenda et la visio de chacun</h2>
        {lu.ok ? (
          <Agendas interlocuteurs={lu.valeur} compte={Boolean(adresse)} />
        ) : lu.absent ? (
          <p className="eca-sous">
            Migration à appliquer : <code>{MIGRATION_RDV}</code>.
          </p>
        ) : (
          <p className="eca-sous">Lecture impossible.</p>
        )}
      </section>
    </div>
  );
}
