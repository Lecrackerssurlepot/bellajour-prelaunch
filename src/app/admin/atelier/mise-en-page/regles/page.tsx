import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { REGISTRE, STATUTS, comptesParStatut, versionRegles } from "@/lib/mise-en-page/regles";
import { REGLAGES } from "@/lib/mise-en-page/editeur/reglages";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import ListeRegles, { type RegleVue } from "./ListeRegles";
import { NOM_STATUT } from "./libelles";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";
import "./regles.css";

/**
 * /admin/atelier/mise-en-page/regles (18/11, T-216) : le REGISTRE DES RÈGLES du tunnel, en lecture seule. La liste par domaine, des
 * filtres (statut, famille, profil), pour chaque règle son énoncé, sa condition, son action, sa source, son statut, ses réglages avec
 * leur valeur actuelle et le nombre de corrections de l'atelier (lu par la route des leçons ; sans table, zéro).
 * Page serveur : elle ne lit que les modules purs ; les corrections arrivent dans le navigateur. Rien n'est écrit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — règles", robots: { index: false, follow: false } };

export default async function PageRegles() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const comptes = comptesParStatut();
  const regles: RegleVue[] = REGISTRE.map((r) => ({
    ...r,
    reglagesVus: (r.reglages ?? []).map((n) => ({ nom: n, valeur: REGLAGES[n].valeur })),
  }));

  return (
    <div className="adm-root ate-root mep-outil mep-regles">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />

      <header className="mep-tete">
        <div>
          <h1 className="ate-h1">Règles</h1>
          <p className="mep-regles-version">
            Version <code>{versionRegles()}</code> · {REGISTRE.length} règles
          </p>
        </div>
        <div className="mep-tete-gestes">
          <Link href="/admin/atelier/mise-en-page" className="mep-lien-discret">
            Projets
          </Link>
          <Link href="/admin/atelier/mise-en-page/gabarits" className="mep-lien-discret">
            Gabarits
          </Link>
        </div>
      </header>

      <ul className="mep-regles-comptes" aria-label="Par statut">
        {STATUTS.map((s) => (
          <li key={s} className={`mep-regles-compte mep-regles-compte--${s}`}>
            <span className="mep-regles-compte-n">{comptes[s]}</span>
            <span>{NOM_STATUT[s]}</span>
          </li>
        ))}
      </ul>

      <ListeRegles regles={regles} />
    </div>
  );
}
