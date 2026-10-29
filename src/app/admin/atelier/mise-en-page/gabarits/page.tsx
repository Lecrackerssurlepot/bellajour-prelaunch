import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { TEMPLATES_ANNEXE } from "@/lib/mise-en-page/templates";
import { TEMPLATES_EPINGLES } from "@/lib/mise-en-page/epingles";
import { MAX_PHOTOS_DOUBLE, MAX_PHOTOS_PAGE, grillesDouble, grillesPage } from "@/lib/mise-en-page/grilles";
import type { Template } from "@/lib/mise-en-page/types";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import Planche from "./Planche";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/**
 * /admin/atelier/mise-en-page/gabarits — tout le catalogue de templates,
 * dessiné à l'échelle pour vérification visuelle.
 *
 * Page serveur pure, sans base ni interaction : elle ne lit que les modules
 * purs de `@/lib/mise-en-page`. Outil interne, ordinateur seulement.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — gabarits", robots: { index: false, follow: false } };

function Carte({ t }: { t: Template }) {
  return (
    <li className="mep-carte">
      <div className="mep-carte-tete">
        <span className="mep-id">{t.id}</span>
        <span className="mep-nom">{t.nom}</span>
      </div>
      <Planche t={t} />
      <dl className="mep-meta">
        <div><dt>Photos</dt><dd>{t.nbPhotos}</dd></div>
        <div><dt>Signature</dt><dd>{t.signature || "aucune"}</dd></div>
        <div><dt>Attribut</dt><dd>{t.attribut}</dd></div>
      </dl>
    </li>
  );
}

function Groupe({ titre, liste, portee }: { titre?: string; liste: readonly Template[]; portee: "double" | "page" }) {
  if (liste.length === 0) return null;
  return (
    <>
      {titre ? (
        <h3 className="mep-sous">
          {titre} <span>{liste.length}</span>
        </h3>
      ) : null}
      <ul className={`mep-grille mep-grille--${portee}`}>
        {liste.map((t) => (
          <Carte key={t.id} t={t} />
        ))}
      </ul>
    </>
  );
}

const plage = (max: number) => Array.from({ length: max }, (_, i) => i + 1);

export default async function PageGabarits() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const doubles = plage(MAX_PHOTOS_DOUBLE).map((n) => ({ n, liste: grillesDouble(n) }));
  const pages = plage(MAX_PHOTOS_PAGE).map((n) => ({ n, liste: grillesPage(n) }));
  const nbDoubles = doubles.reduce((s, g) => s + g.liste.length, 0);
  const nbPages = pages.reduce((s, g) => s + g.liste.length, 0);
  const epD = plage(MAX_PHOTOS_DOUBLE).map((n) => ({ n, liste: TEMPLATES_EPINGLES.filter((t) => t.portee === "double" && t.nbPhotos === n) }));
  const epP = plage(MAX_PHOTOS_PAGE).map((n) => ({ n, liste: TEMPLATES_EPINGLES.filter((t) => t.portee === "page" && t.nbPhotos === n) }));

  return (
    <div className="adm-root ate-root mep-gabarits">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />

      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Gabarits</h1>
        <p className="ate-bonjour">
          {TEMPLATES_ANNEXE.length + TEMPLATES_EPINGLES.length + nbDoubles + nbPages}{" "}templates, à l&apos;échelle.
        </p>
        <ul className="mep-legende" aria-label="Légende">
          <li><span className="mep-pastille mep-pastille--perdu" />Fond perdu</li>
          <li><span className="mep-pastille mep-pastille--coupe" />Coupe</li>
          <li><span className="mep-pastille mep-pastille--grille" />Marges et grille</li>
          <li><span className="mep-pastille mep-pastille--photo" />Photo</li>
          <li><span className="mep-pastille mep-pastille--texte" />Texte</li>
        </ul>
      </header>

      <section className="mep-section" id="annexe">
        <h2 className="mep-titre">
          Doubles pages de l&apos;annexe <span>{TEMPLATES_ANNEXE.length}</span>
        </h2>
        <Groupe liste={TEMPLATES_ANNEXE} portee="double" />
      </section>

      <section className="mep-section" id="epingles-double">
        <h2 className="mep-titre">
          Épingles : double page <span>{epD.reduce((s, g) => s + g.liste.length, 0)}</span>
        </h2>
        {epD.filter((g) => g.liste.length).map((g) => (
          <Groupe key={g.n} titre={`${g.n} photo${g.n > 1 ? "s" : ""}`} liste={g.liste} portee="double" />
        ))}
      </section>

      <section className="mep-section" id="epingles-page">
        <h2 className="mep-titre">
          Épingles : page <span>{epP.reduce((s, g) => s + g.liste.length, 0)}</span>
        </h2>
        {epP.filter((g) => g.liste.length).map((g) => (
          <Groupe key={g.n} titre={`${g.n} photo${g.n > 1 ? "s" : ""}`} liste={g.liste} portee="page" />
        ))}
      </section>

      <section className="mep-section" id="grilles-double">
        <h2 className="mep-titre">
          Grilles de secours : double page <span>{nbDoubles}</span>
        </h2>
        {doubles.map((g) => (
          <Groupe key={g.n} titre={`${g.n} photo${g.n > 1 ? "s" : ""}`} liste={g.liste} portee="double" />
        ))}
      </section>

      <section className="mep-section" id="grilles-page">
        <h2 className="mep-titre">
          Grilles de secours : page <span>{nbPages}</span>
        </h2>
        {pages.map((g) => (
          <Groupe key={g.n} titre={`${g.n} photo${g.n > 1 ? "s" : ""}`} liste={g.liste} portee="page" />
        ))}
      </section>
    </div>
  );
}
