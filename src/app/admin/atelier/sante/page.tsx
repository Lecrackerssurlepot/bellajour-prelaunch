import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { chargerSante } from "../sante";
import "../../admin.css";
import "../atelier.css";

/**
 * /admin/atelier/sante — ce qui a échoué sans bruit.
 *
 * Page serveur pure, sans interaction : elle n'a rien à piloter, seulement à
 * dire. Chaque constat porte son remède ; un diagnostic sans remède se relit
 * trois fois sans rien déclencher.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — santé", robots: { index: false, follow: false } };

export default async function PageSante() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const sante = await chargerSante();

  return (
    <div className="adm-root ate-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">Santé</h1>
        <p className="ate-bonjour">
          Ce qui a échoué sans bruit. Le reste du back-office montre le travail à faire ; cette
          page montre ce qui n&apos;arrivera jamais tout seul.
        </p>
      </header>

      {sante.toutVaBien ? (
        /* T-024 — deux calmes très différents. Sur une base vide, « tous les
           mails dus sont partis » se lirait comme une vérification qui n'a pas
           eu lieu : il n'y avait rien à vérifier. On le dit tel quel, sur le
           ton du « pas encore », pas sur celui du bilan. */
        sante.nbDossiers === 0 ? (
          <section className="ate-carte ate-sante-ok">
            <h2 className="ate-carte-titre">Rien à surveiller pour l&apos;instant</h2>
            <p>
              Aucun dossier n&apos;est encore ouvert : rien ne peut être en retard ni en échec.
              Cette page se remplira d&apos;elle-même quand les premiers clients arriveront.
            </p>
          </section>
        ) : (
          <section className="ate-carte ate-sante-ok">
            <h2 className="ate-carte-titre">Rien à signaler</h2>
            <p>
              Tous les mails dus sont partis, aucun dossier n&apos;attend un envoi impossible, et
              aucun n&apos;a dépassé le double de son délai.
            </p>
          </section>
        )
      ) : (
        sante.constats.map((c, i) => (
          <section key={i} className={`ate-carte ate-sante ate-sante--${c.gravite}`}>
            <h2 className="ate-carte-titre">{c.titre}</h2>
            <p className="ate-sante-remede">{c.remede}</p>
            <ul className="ate-sante-liste">
              {c.lignes.map((l, j) => (
                <li key={j}>
                  {l.token ? (
                    <Link href={`/admin/atelier/${l.token}`}>{l.quoi}</Link>
                  ) : (
                    <span>{l.quoi}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="adm-fetched ate-pied">
        Lu le{" "}
        {new Date(sante.fetchedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {sante.dernierMail
          ? ` · dernier mail parti le ${new Date(sante.dernierMail).toLocaleDateString("fr-FR")}`
          : sante.nbDossiers === 0
            ? " · aucun mail encore envoyé"
            : " · aucun mail jamais envoyé"}
      </p>
    </div>
  );
}
