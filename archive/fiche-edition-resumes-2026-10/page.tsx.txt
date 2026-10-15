import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { formaterHeureParis, formaterInstantParis, formaterJourParis, versChampParis } from "@/lib/collectif/dates";
import { formaterJour } from "@/lib/collectif/livraison";
import { extraitDe } from "@/lib/collectif/messages";
import { LIBELLE_ETAT_EDITION } from "@/lib/collectif/etats";
import { liensEdition, origineDepuis } from "@/lib/collectif/liens";
import { compteAgenda } from "@/lib/collectif/agenda";
import { libelleCreneau } from "@/lib/collectif/creneaux";
import { MIGRATION_COLLECTIF, MIGRATION_RDV } from "@/lib/collectif/migration";
import { lireInterlocuteurs, lireRendezVous } from "@/lib/collectif/rendezvous";
import { etapesEdition, LIBELLE_CAMP, prochaineEtape } from "@/lib/collectif/prochaine";
import { quandRdv } from "@/lib/collectif/boite";
import { PARTS_TEXTE } from "@/lib/collectif/brief";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import { chargerEdition, compterNonLus } from "../donnees";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import PanneauCollecte from "./PanneauCollecte";
import PanneauContenus from "./PanneauContenus";
import PanneauDocuments from "./PanneauDocuments";
import PanneauGestes from "./PanneauGestes";
import PanneauMessages from "./PanneauMessages";
import PanneauRendezVous from "./PanneauRendezVous";
import PanneauLiens from "./PanneauLiens";
import PanneauLivraison from "./PanneauLivraison";
import OngletsFiche from "./OngletsFiche";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/[id] — la fiche d'une édition (PRD §8 ; T-152, maquette
 * « Atelier, la fiche » : plus de longue colonne).
 *
 * En tête : l'organisation, l'événement, l'état et la prochaine étape, et
 * « Répondre » quand le client attend. Puis des ONGLETS : la vue d'ensemble
 * (les étapes, les gestes, les liens, un résumé de chaque sujet qui mène à
 * son onglet), les magazines et leurs briefs, les photos, le bon à tirer
 * (sa page), les messages, les documents et les envois du client, les
 * rendez-vous, la livraison, les réglages, le journal. `?onglet=` rouvre
 * le même. Tout se règle sans code.
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

const ONGLETS = ["apercu", "magazines", "photos", "messages", "documents", "rendezvous", "livraison", "reglages", "journal"] as const;

export default async function PageFiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  if (!estUuid(id)) notFound();
  const { onglet: ongletDemande } = await searchParams;
  const onglet = (ONGLETS as readonly string[]).includes(ongletDemande ?? "") ? (ongletDemande as string) : "apercu";

  const [lu, nonLus, nonLusEdition] = await Promise.all([chargerEdition(makeSupabase(), id, new Date()), compterNonLus(makeSupabase()), compterNonLus(makeSupabase(), id)]);
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
  const { edition: e, etat, magazines, journal, documents, messages, collecte, contenus } = lu.fiche;

  const h = await headers();
  const origine = origineDepuis(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  const liens = liensEdition(origine, e);
  const prochaine = prochaineEtape(etat, e.cloture_le);

  /* Les rendez-vous (D23) : sans la migration 20261015, le panneau le dit. */
  const supabaseRdv = makeSupabase();
  const [inters, rdvs] = await Promise.all([lireInterlocuteurs(supabaseRdv), lireRendezVous(supabaseRdv, e.id)]);
  const rdvAbsent = e.interlocuteur_cle === undefined || !inters.ok || !rdvs.ok;
  const listeInters = inters.ok ? inters.valeur.filter((i) => i.actif) : [];
  const maintenantRdv = new Date();

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

  /* La vue d'ensemble : ce que chaque onglet contient, en une ligne ou deux. */
  const briefs = magazines.filter((m) => m.brief_valide_le).length;
  const tours = magazines.reduce((n, m) => n + m.toursPublies, 0);
  const batValides = magazines.filter((m) => m.bat_valide_le).length;
  const detailEtape: Record<string, string> = {
    collecte: `${collecte.total.toLocaleString("fr-FR")} photo${collecte.total > 1 ? "s" : ""}${e.cloture_le ? `, jusqu'au ${formaterJourParis(e.cloture_le)}` : ""}`,
    composition: `${briefs} sur ${magazines.length} brief${magazines.length > 1 ? "s" : ""} validé${briefs > 1 ? "s" : ""}`,
    bat: batValides ? `${batValides} sur ${magazines.length} validé${batValides > 1 ? "s" : ""}` : tours ? `${tours} tour${tours > 1 ? "s" : ""} publié${tours > 1 ? "s" : ""}` : "après la composition",
    impression: e.tirage ? `${e.tirage} exemplaires` : "tirage à fixer",
    livraison: e.livraison?.livree_le
      ? `livrée le ${formaterJourParis(e.livraison.livree_le)}`
      : e.livraison?.expediee_le
        ? `expédiée le ${formaterJourParis(e.livraison.expediee_le)}`
        : e.livraison?.prevue_le
          ? `prévue le ${formaterJour(e.livraison.prevue_le)}`
          : "à confirmer",
  };
  const dernierClient = [...messages].reverse().find((m) => m.auteur === "client") ?? null;
  const recus = [...new Set(contenus.filter((c) => !c.ancienne).map((c) => c.libelle))];
  const prochainRdv = (rdvs.ok ? rdvs.valeur : [])
    .filter((r) => r.statut === "pris" && Date.parse(r.debut) > maintenantRdv.getTime())
    .sort((a, b) => a.debut.localeCompare(b.debut))[0];
  const avecRdv = prochainRdv ? ((inters.ok ? inters.valeur : []).find((i) => i.cle === prochainRdv.interlocuteur_cle)?.prenom ?? prochainRdv.interlocuteur_cle) : null;
  const resume = (titre: string, cible: string, lien: string, lignes: [string, React.ReactNode][], blocs = false) => (
    <section className="ate-carte eca-resume">
      <span className="eca-resume-tete">
        <h2 className="ate-carte-titre">{titre}</h2>
        <a href={`?onglet=${cible}`} data-onglet={cible} className="eca-resume-lien">
          {lien} →
        </a>
      </span>
      <ul className={blocs ? "eca-resume-lignes eca-resume-lignes--blocs" : "eca-resume-lignes"}>
        {lignes.map(([cle, valeur]) => (
          <li key={cle}>
            <span className="eca-sous">{cle}</span>
            <span>{valeur}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  const apercu = (
    <>
      <ol className="eca-etapes">
        {etapesEdition(etat).map((et, i) => (
          <li key={et.cle} className={`eca-etape eca-etape--${et.statut}`}>
            <span className="eca-etape-signe" aria-hidden="true">
              {et.statut === "fait" ? "✓" : i + 1}
            </span>
            <span className="eca-etape-texte">
              <strong>{et.nom}</strong>
              <span className="eca-sous">{detailEtape[et.cle]}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="eca-apercu">
        <PanneauGestes id={e.id} etat={etat} archivee={Boolean(e.archive_le)} />
        <PanneauLiens id={e.id} liens={liens} compact />
        {resume(
          "Magazines",
          "magazines",
          "Les briefs",
          [
            ...magazines.map((m): [string, React.ReactNode] => [
              `${m.rang}. ${m.nom}`,
              m.bat_valide_le ? "BAT validé" : m.toursPublies > 0 ? `Tour ${m.toursPublies} publié` : m.brief_valide_le ? "Brief validé" : m.brief.styles.length ? "Brief en cours" : "Brief à faire",
            ]),
            ["Tirage", e.tirage ? `${e.tirage} exemplaires` : "à fixer"],
          ]
        )}
        {resume("La collecte", "photos", "Les photos", [
          ["Photos", `${collecte.total.toLocaleString("fr-FR")} · ${collecte.participants} participant${collecte.participants > 1 ? "s" : ""}`],
          ["Sans aperçu (HEIC)", collecte.sansVignette.toLocaleString("fr-FR")],
          ["Clôture", e.cloture_le ? formaterJourParis(e.cloture_le) : "à fixer"],
        ])}
        {resume("Le dernier message", "messages", nonLusEdition ? `Répondre · ${nonLusEdition}` : "Les messages", [
          [dernierClient ? `${dernierClient.qui ?? "Le client"}, ${formaterJourParis(dernierClient.created_at)} à ${formaterHeureParis(dernierClient.created_at)}` : "Le client", dernierClient ? extraitDe(dernierClient.texte, 120) : "rien encore"],
        ], true)}
        {resume("Documents et envois", "documents", "Tout voir", [
          ["Documents de l'atelier", documents.length ? `${documents.length} · ${documents[0].libelle}` : "aucun"],
          ["Envois du client", recus.length ? recus.join(", ") : "rien encore"],
        ], true)}
        {resume("Rendez-vous", "rendezvous", "Le planning", [
          ["Prochain", prochainRdv ? quandRdv(prochainRdv.debut) : "aucun"],
          ...(avecRdv ? [["Avec", avecRdv] as [string, React.ReactNode]] : []),
        ])}
        {resume("Livraison", "livraison", "Régler", [
          ["Adresse", e.livraison?.adresse || "à confirmer"],
          ["Jour prévu", e.livraison?.prevue_le ? formaterJour(e.livraison.prevue_le) : "à confirmer"],
        ])}
      </div>
    </>
  );

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif nonLus={nonLus} liens={liensEditions(null, nonLus)} />
      <header className="eca-fiche-tete">
        <div className="eca-fiche-titres">
          <span className="eca-sous">
            {e.organisation}
            {e.responsable_nom ? ` · ${e.responsable_nom}` : ""}
          </span>
          <h1 className="ate-h1 eca-fiche-h1">{e.evenement}</h1>
          <span className="eca-sous">
            {LIBELLE_ETAT_EDITION[etat]}
            {e.dates_texte ? ` · ${e.dates_texte}` : ""}
            {e.archive_le ? " · archivée" : ""}
          </span>
        </div>
        <div className="eca-fiche-prochaine">
          <span className={CLASSE_CAMP[prochaine.camp]}>{LIBELLE_CAMP[prochaine.camp]}</span>
          <strong>{prochaine.texte}</strong>
        </div>
        <Link href={`/admin/collectif/messages?e=${e.id}`} className={nonLusEdition ? "adm-btn eca-lien-bouton" : "adm-btn adm-btn--ghost eca-lien-bouton"}>
          {nonLusEdition ? `Répondre · ${nonLusEdition}` : "Messagerie"}
        </Link>
      </header>

      <OngletsFiche
        initial={onglet}
        onglets={[
          { cle: "apercu", libelle: "Vue d'ensemble" },
          { cle: "magazines", libelle: "Magazines et briefs" },
          { cle: "photos", libelle: "Photos" },
          { cle: "bat", libelle: "Bon à tirer", href: `/admin/collectif/${e.id}/bat` },
          { cle: "messages", libelle: "Messages", badge: nonLusEdition },
          { cle: "documents", libelle: "Documents" },
          { cle: "rendezvous", libelle: "Rendez-vous" },
          { cle: "livraison", libelle: "Livraison" },
          { cle: "reglages", libelle: "Réglages" },
          { cle: "journal", libelle: "Journal" },
        ]}
        panneaux={{
          apercu,
          magazines: (
            <section className="ate-carte">
              <h2 className="ate-carte-titre">Magazines</h2>
              <ul className="eca-mag-liste">
                {magazines.map((m) => (
                  <li key={m.id} className="eca-mag-brief">
                    <span className="eca-mag-ligne">
                      <span>
                        {m.rang}. {m.nom}
                      </span>
                      <span className="eca-sous">
                        {m.bat_valide_le
                          ? "BAT validé"
                          : m.toursPublies > 0
                            ? `Tour ${m.toursPublies} publié`
                            : m.brief_valide_le
                              ? `Brief validé le ${formaterInstantParis(m.brief_valide_le)}`
                              : m.brief.styles.length
                                ? "Brief en cours"
                                : "Brief à faire"}
                      </span>
                    </span>
                    <Link href={`/admin/collectif/${e.id}/bat?m=${m.rang}`} className="eca-lien-bat">
                      Bon à tirer du magazine {m.rang} →
                    </Link>
                    {m.brief.styles.length ? (
                      <span className="eca-brief">
                        <span>
                          Composition : <strong>{m.brief.styles.join(", ")}</strong>
                          {m.brief.styles.length > 1 ? ` (${m.brief.styles.length} styles mêlés, à harmoniser)` : ""}
                        </span>
                        {m.brief.palette ? (
                          <span>
                            Palette {m.brief.palette.nom} ({m.brief.palette.style}){" "}
                            <span className="eca-bandes">
                              {m.brief.palette.couleurs.map((c, i) => (
                                <span key={i} style={{ background: c }} />
                              ))}
                            </span>
                          </span>
                        ) : (
                          <span>Palette : ?</span>
                        )}
                        <span>
                          Typographies : {m.brief.typos ? `${[m.brief.typos.titres, m.brief.typos.texte].filter(Boolean).join(" et ") || "?"} (${m.brief.typos.style})` : "?"}
                        </span>
                        <span>Texte : {PARTS_TEXTE.find((t) => t.cle === m.brief.texte)?.libelle ?? "?"}</span>
                        <span>Doubles : {m.brief.doubles.map((d) => `${d.libelle} (${d.style})`).join(", ") || "?"}</span>
                      </span>
                    ) : null}
                    {m.brief.aimees.length ? (
                      <span className="eca-aimees">
                        {m.brief.aimees.map((a, i) =>
                          a.url ? <img key={i} src={a.url} alt={`Couverture aimée (${a.style})`} title={a.style} /> : <span key={i}>{a.style}</span>
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ),
          photos: <PanneauCollecte id={e.id} {...collecte} />,
          messages: <PanneauMessages id={e.id} initiaux={messages} />,
          documents: (
            <div className="eca-deux">
              <PanneauDocuments id={e.id} documents={documents} />
              <PanneauContenus contenus={contenus} />
            </div>
          ),
          rendezvous: (
            <PanneauRendezVous
              id={e.id}
              absent={rdvAbsent}
              migration={MIGRATION_RDV}
              interlocuteurs={listeInters.map((i) => ({ cle: i.cle, prenom: i.prenom, relie: Boolean(i.agenda_id) }))}
              courant={e.interlocuteur_cle ?? null}
              compteRelie={compteAgenda() !== null}
              rendezVous={(rdvs.ok ? rdvs.valeur : []).map((r) => ({
                id: r.id,
                libelle: libelleCreneau(r.debut),
                avec: (inters.ok ? inters.valeur : []).find((i) => i.cle === r.interlocuteur_cle)?.prenom ?? r.interlocuteur_cle,
                motif: r.motif,
                statut: r.statut,
                aVenir: Date.parse(r.debut) > maintenantRdv.getTime(),
              }))}
            />
          ),
          livraison: (
            <PanneauLivraison
              id={e.id}
              livraison={e.livraison ?? {}}
              expedieeTexte={formaterInstantParis(e.livraison?.expediee_le ?? null)}
              livreeTexte={formaterInstantParis(e.livraison?.livree_le ?? null)}
            />
          ),
          reglages: (
            <div className="eca-reglages">
              <section className="ate-carte">
                <h2 className="ate-carte-titre">Réglages de l&apos;édition</h2>
                <FormulaireEdition mode="modification" id={e.id} initiales={initiales} plafondClient={e.plafond_participant_client} />
              </section>
              <PanneauLiens id={e.id} liens={liens} />
            </div>
          ),
          journal: (
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
          ),
        }}
      />
    </div>
  );
}
