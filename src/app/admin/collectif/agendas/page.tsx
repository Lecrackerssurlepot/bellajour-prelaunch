import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { headers } from "next/headers";
import { adresseDuCompte, cheminRetourOAuth, clientOAuth, VAR_COMPTE_AGENDA, VAR_OAUTH_ID, VAR_OAUTH_SECRET } from "@/lib/collectif/agenda";
import { origineDepuis } from "@/lib/collectif/liens";
import { MIGRATION_RDV } from "@/lib/collectif/migration";
import { lireConnexions, lireInterlocuteurs } from "@/lib/collectif/rendezvous";
import Agendas from "./Agendas";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/agendas — relier les agendas de l'atelier (D23, T-148).
 * Depuis le 18/11 : le client OAuth de l'atelier (deux variables posées par
 * Mathias, jamais collées dans une conversation), puis « Connecter Google »
 * pour chaque personne, et un bouton qui PROUVE la connexion. L'ancien
 * compte de service reste lu pour qui n'est pas connecté.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — agendas", robots: { index: false, follow: false } };

/* Ce que dit la page au retour de Google (`?google=`), en une phrase. */
const RETOURS: Record<string, { texte: string; ok: boolean }> = {
  ok: { texte: "Agenda connecté. « Tester la connexion » le prouve.", ok: true },
  refuse: { texte: "Connexion annulée sur la page de Google.", ok: false },
  portees: { texte: "Il faut cocher les deux accès à l'agenda sur la page de Google. Recommencer.", ok: false },
  etat: { texte: "La connexion a expiré en route (dix minutes). Recommencer.", ok: false },
  migration: { texte: "La mise à jour de la base (20261118_partenaires_rendez_vous.sql) n'est pas encore appliquée : rien n'a été gardé.", ok: false },
  non_configure: { texte: "Le client Google de l'atelier n'est pas encore posé (étape 1).", ok: false },
  echec: { texte: "Google n'a pas donné l'accès. Recommencer.", ok: false },
};

export default async function PageAgendas({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");
  const supabase = makeSupabase();
  const [lu, connexions, params, entetes] = await Promise.all([lireInterlocuteurs(supabase), lireConnexions(supabase), searchParams, headers()]);
  const adresse = adresseDuCompte();
  const oauth = clientOAuth() !== null;
  const retour = typeof params.google === "string" ? (RETOURS[params.google] ?? null) : null;
  const origine = origineDepuis(entetes.get("host"), entetes.get("x-forwarded-proto"));

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif liens={liensEditions("agendas")} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Les agendas</h1>
        <p className="ate-bonjour">Les créneaux de l&apos;espace client et de la page partenaires viennent de ces agendas : libre ou occupé, jamais leur contenu.</p>
      </header>

      {retour ? (
        <p className={retour.ok ? "eca-message" : "eca-message eca-message--erreur"} role={retour.ok ? "status" : "alert"}>
          {retour.texte}
        </p>
      ) : null}

      <section className="ate-carte">
        <h2 className="ate-carte-titre">1. La connexion Google de l&apos;atelier</h2>
        {oauth ? (
          <p>
            Posée. Chacun clique « Connecter Google » ci-dessous, une fois : les rendez-vous sont alors créés en son nom, avec une visio Meet neuve, et Google
            invite lui-même le client.
          </p>
        ) : (
          <>
            <p className="eca-sous">
              Pas encore posée : <code>{VAR_OAUTH_ID}</code> et <code>{VAR_OAUTH_SECRET}</code> sont absentes.{" "}
              Sans elles, la page partenaires montre l’adresse de contact à la place des créneaux.
            </p>
            <ol className="eca-etapes-agenda">
              <li>
                Sur <strong>console.cloud.google.com</strong>, avec ton compte Google : créer un projet, par exemple « Bellajour agenda ».
              </li>
              <li>
                « API et services » → « Bibliothèque » : activer <strong>Google Calendar API</strong>.
              </li>
              <li>
                « Écran de consentement OAuth » : type <strong>Externe</strong>, nom « Bellajour », ton adresse. Puis <strong>« Publier l&apos;application »</strong>{" "}
                (en production). En mode test, Google coupe la connexion au bout de sept jours.
              </li>
              <li>
                « Identifiants » → « Créer des identifiants » → <strong>ID client OAuth</strong>, type « Application Web ». Dans « URI de redirection
                autorisés », coller exactement :
                <span className="eca-adresse-compte">https://www.bellajour.fr{cheminRetourOAuth()}</span>
                {origine.startsWith("http://localhost") ? <span className="eca-adresse-compte">{origine + cheminRetourOAuth()}</span> : null}
              </li>
              <li>
                Sur Vercel (Settings → Environment Variables), en Production : <code>{VAR_OAUTH_ID}</code> (l&apos;ID client) et <code>{VAR_OAUTH_SECRET}</code>{" "}
                (le code secret). Les mêmes dans <code>.env.local</code> pour le local. Puis redéployer.
              </li>
              <li>Ne jamais coller le code secret dans une conversation ni dans un mail.</li>
              <li>
                À la connexion, Google affiche « Google n&apos;a pas validé cette application » : c&apos;est attendu (elle n&apos;est qu&apos;à nous). « Paramètres
                avancés » → « Accéder à Bellajour », puis cocher les deux accès à l&apos;agenda.
              </li>
            </ol>
          </>
        )}
        {adresse ? (
          <p className="eca-sous">
            L&apos;ancien compte de service (<code>{VAR_COMPTE_AGENDA}</code>, {adresse}) reste posé : il sert aux personnes pas encore connectées.
          </p>
        ) : null}
      </section>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">2. L&apos;agenda et la visio de chacun</h2>
        {lu.ok ? (
          <Agendas interlocuteurs={lu.valeur} compte={Boolean(adresse)} oauth={oauth} connexions={connexions} />
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
