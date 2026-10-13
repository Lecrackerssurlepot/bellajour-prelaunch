import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { versChampParis, formaterInstantParis } from "@/lib/collectif/dates";
import { LIBELLE_ETAT_EDITION } from "@/lib/collectif/etats";
import { liensEdition, origineDepuis } from "@/lib/collectif/liens";
import { MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { LIBELLE_CAMP, prochaineEtape } from "@/lib/collectif/prochaine";
import { chargerEdition } from "../donnees";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import PanneauCollecte from "./PanneauCollecte";
import PanneauDocuments from "./PanneauDocuments";
import PanneauGestes from "./PanneauGestes";
import PanneauMessages from "./PanneauMessages";
import PanneauLiens from "./PanneauLiens";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/[id] — la fiche d'une édition (PRD §8, maquette Fiche).
 *
 * Phase 1 : les liens (copier, ouvrir, régénérer), les gestes sur l'état,
 * les réglages, les magazines, le journal. Tout se règle sans code. La
 * collecte, les briefs, les tours, les messages et la livraison viennent
 * avec leurs phases.
 *
 * Les liens prennent l'origine de la requête : en local, ils s'ouvrent sur
 * le même localhost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — édition collective", robots: { index: false, follow: false } };

const CLASSE_CAMP = {
  atelier: "ate-camp ate-camp--atelier",
  client: "ate-camp ate-camp--cliente",
  imprimeur: "ate-camp eca-ate-camp--imprimeur",
  aucun: "ate-camp",
} as const;

const s = (n: number | null) => (n === null ? "" : String(n));

export default async function PageFiche({ params }: { params: Promise<{ id: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  if (!estUuid(id)) notFound();

  const lu = await chargerEdition(makeSupabase(), id, new Date());
  if (lu.absent) {
    return (
      <div className="adm-root ate-root eca-root">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Migration collectif absente</h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>.
          </p>
        </section>
      </div>
    );
  }
  if (!lu.fiche) notFound();
  const { edition: e, etat, magazines, journal, documents, messages, collecte } = lu.fiche;

  const h = await headers();
  const origine = origineDepuis(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  const liens = liensEdition(origine, e);
  const prochaine = prochaineEtape(etat, e.cloture_le);

  const initiales: ValeursEdition = {
    organisation: e.organisation,
    evenement: e.evenement,
    dates_texte: e.dates_texte ?? "",
    registre: e.registre,
    cloture_local: versChampParis(e.cloture_le),
    plafond_participant_atelier: s(e.plafond_participant_atelier),
    plafond_total: s(e.plafond_total),
    preselection_max: s(e.preselection_max),
    pagination_prevue: s(e.pagination_prevue),
    tirage: s(e.tirage),
    tours_inclus: s(e.tours_inclus),
    nb_propositions_couverture: s(e.nb_propositions_couverture),
    couvertures_aimees_max: s(e.couvertures_aimees_max),
    styles_segment: e.styles_segment,
    contenus_demandes: e.contenus_demandes ?? [],
    invitation_texte: e.invitation_texte ?? "",
    responsable_email: e.responsable_email,
    responsable_nom: e.responsable_nom ?? "",
    rdv_url: e.rdv_url ?? "",
    magazines: magazines.map((m) => ({ id: m.id, nom: m.nom, vide: m.vide })),
  };

  return (
    <div className="adm-root ate-root eca-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/collectif" className="ate-retour">
          ← Éditions collectives
        </Link>
        <h1 className="ate-h1">{e.organisation}</h1>
        <p className="ate-bonjour">
          <strong>{e.evenement}</strong>
          {e.dates_texte ? ` · ${e.dates_texte}` : ""}
        </p>
        <div className="eca-etat">
          <span className={CLASSE_CAMP[prochaine.camp]}>{LIBELLE_CAMP[prochaine.camp]}</span>
          <span>{prochaine.texte}</span>
          <span>· {LIBELLE_ETAT_EDITION[etat]}</span>
          {e.archive_le ? <span className="ate-camp">Archivée</span> : null}
        </div>
      </header>

      <div className="eca-fiche">
        <div className="eca-colonne">
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Réglages de l&apos;édition</h2>
            <FormulaireEdition mode="modification" id={e.id} initiales={initiales} plafondClient={e.plafond_participant_client} />
          </section>
        </div>

        <aside className="eca-colonne">
          <PanneauLiens id={e.id} liens={liens} />
          <PanneauMessages id={e.id} initiaux={messages} />
          <PanneauGestes id={e.id} etat={etat} archivee={Boolean(e.archive_le)} />
          <PanneauCollecte id={e.id} {...collecte} />
          <PanneauDocuments id={e.id} documents={documents} />

          <section className="ate-carte">
            <h2 className="ate-carte-titre">Magazines</h2>
            <ul className="eca-mag-liste">
              {magazines.map((m) => (
                <li key={m.id}>
                  <span>
                    {m.rang}. {m.nom}
                  </span>
                  <span className="eca-sous">
                    {m.bat_valide_le
                      ? "BAT validé"
                      : m.toursPublies > 0
                        ? `Tour ${m.toursPublies} publié`
                        : m.brief_valide_le
                          ? "Brief validé"
                          : "Brief à faire"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="ate-carte">
            <h2 className="ate-carte-titre">Journal</h2>
            {journal.length === 0 ? (
              <p className="eca-vide">Rien encore.</p>
            ) : (
              <ul className="eca-journal">
                {journal.map((j) => (
                  <li key={j.id}>
                    <time dateTime={j.quand}>{formaterInstantParis(j.quand)}</time>
                    {j.phrase}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
