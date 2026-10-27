import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../BarreAtelier";
import { chargerDossiersMep } from "./donnees";
import { libelleEtat, nomDossier, rangEtat } from "./libelles";
import CreationLibre from "./CreationLibre";
import ListeDossiers, { type FiltreEtatMep, type LigneDossierMep } from "./ListeDossiers";
import "../../admin.css";
import "../atelier.css";
import "./mise-en-page.css";

/**
 * /admin/atelier/mise-en-page — l'entrée de l'outil interne (brief §2) :
 * « Création libre », puis les dossiers qui ont des photos, tous états
 * confondus, archivés compris. LECTURE seule : rien n'est écrit, pas même
 * la marque « vu » de la fiche. Ordinateur seulement.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — mise en page", robots: { index: false, follow: false } };

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });

export default async function PageMiseEnPage() {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const dossiers = await chargerDossiersMep();

  const lignes: LigneDossierMep[] = dossiers.map((d) => ({
    token: d.token,
    nom: nomDossier(d),
    etat: d.etat,
    libelle: libelleEtat(d.etat),
    nbPhotos: d.nbPhotos,
    date: JOUR.format(new Date(d.creeLe)),
    archive: d.archive,
  }));

  /* Une puce par état PRÉSENT, dans l'ordre du parcours. */
  const comptes = new Map<string, number>();
  for (const d of dossiers) comptes.set(d.etat, (comptes.get(d.etat) ?? 0) + 1);
  const filtres: FiltreEtatMep[] = [...comptes.entries()]
    .sort(([a], [b]) => rangEtat(a) - rangEtat(b))
    .map(([etat, n]) => ({ etat, libelle: libelleEtat(etat), n }));

  const liens = liensParticuliers(false).map((l) => (l.href === "/admin/atelier/mise-en-page" ? { ...l, courant: true } : l));

  return (
    <div className="adm-root ate-root mep-outil">
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liens} />

      <header className="mep-tete">
        <h1 className="ate-h1">Mise en page</h1>
        <div className="mep-tete-gestes">
          <Link href="/admin/atelier/mise-en-page/gabarits" className="mep-lien-discret">
            Gabarits
          </Link>
          <CreationLibre />
        </div>
      </header>

      <ListeDossiers lignes={lignes} filtres={filtres} />
    </div>
  );
}
