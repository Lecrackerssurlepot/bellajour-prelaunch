import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { formaterHeureParis, formaterInstantParis, formaterJourParis, versChampParis } from "@/lib/collectif/dates";
import { A_FAIRE_DEVIS, demandesDuFil, devisAEnvoyer, formaterJour } from "@/lib/collectif/livraison";
import { depotRegle } from "@/lib/collectif/plafonds";
import { extraitDe } from "@/lib/collectif/messages";
import { LIBELLE_ETAT_EDITION } from "@/lib/collectif/etats";
import { liensEdition, origineDepuis } from "@/lib/collectif/liens";
import { compteAgenda } from "@/lib/collectif/agenda";
import { libelleCreneau } from "@/lib/collectif/creneaux";
import { MIGRATION_COLLECTIF, MIGRATION_RDV } from "@/lib/collectif/migration";
import { lireInterlocuteurs, lireRendezVous } from "@/lib/collectif/rendezvous";
import { etapesEdition, prochaineEtape } from "@/lib/collectif/prochaine";
import { plafondLienMax } from "@/lib/collectif/plafonds";
import { quandRdv } from "@/lib/collectif/boite";
import { PARTS_TEXTE } from "@/lib/collectif/brief";
import { premierNouveau } from "@/lib/collectif/nouveaux";
import { depotOuvert, quandOuvre } from "@/lib/collectif/ouverture";
import { etiquetteMagazine } from "@/lib/collectif/saisie";
import { phrasePhotosEffacees } from "@/lib/collectif/retention";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import { chargerEdition, compterConversationsEnAttente, compterNonLus } from "../donnees";
import FormulaireEdition, { type ValeursEdition } from "../FormulaireEdition";
import PanneauCollecte from "./PanneauCollecte";
import PanneauContenus from "./PanneauContenus";
import PanneauCorbeille from "./PanneauCorbeille";
import PanneauPersonnes from "./PanneauPersonnes";
import PanneauDocuments from "./PanneauDocuments";
import PanneauGestes from "./PanneauGestes";
import PanneauMessages from "./PanneauMessages";
import PanneauRendezVous from "./PanneauRendezVous";
import PanneauLiens from "./PanneauLiens";
import PanneauProvenances from "./PanneauProvenances";
import LienResponsable from "./LienResponsable";
import EnvoiLienResponsable from "./EnvoiLienResponsable";
import PanneauLivraison from "./PanneauLivraison";
import OngletsFiche from "./OngletsFiche";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/[id] — la fiche d'une édition (PRD §8 ; T-152, maquette
 * « Atelier, la fiche » : plus de longue colonne).
 *
 * 15/10, « la fiche d'une édition en cartes » (maquette validée par Mathias) :
 * le retour à la liste, puis UNE carte d'en-tête (initiales, organisation,
 * événement, la prochaine étape et son camp, les gestes rangés dans un menu,
 * « Répondre »). Puis des ONGLETS. La vue d'ensemble tient en deux rangs : la
 * bande des cinq étapes, et TROIS cartes de même hauteur (Magazines, La
 * collecte, Le dernier message), chacune avec un seul lien en haut qui dit où
 * il mène. Le reste (documents, rendez-vous, livraison, les trois liens et
 * leur régénération) vit dans son onglet. `?onglet=` rouvre le même.
 *
 * Les liens prennent l'origine de la requête : en local, ils s'ouvrent sur
 * le même localhost.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* T-194 : le rattrapage des photos tourne APRÈS la page (`after`), dans la même fonction.
   Littéral (Next le lit au build) ; égal à `FENETRE_VERROU_RATTRAPAGE_MS`, tenu au harnais. */
export const maxDuration = 60;

export const metadata = { title: "Atelier — édition collective", robots: { index: false, follow: false } };

const s = (n: number | null) => (n === null ? "" : String(n));

/** Les initiales de l'organisation, pour la vignette de l'en-tête : « Maison Aubier » → MA, « SKEMA » → SK. */
function initialesDe(nom: string): string {
  const mots = nom.normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

const LIBELLE_PROCHAINE = {
  atelier: "Prochaine étape, chez nous",
  client: "Prochaine étape, chez le client",
  imprimeur: "Prochaine étape, chez l'imprimeur",
  aucun: "Tout est fait",
} as const;

const COCHE = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12l5 5 9-10" />
  </svg>
);

const ONGLETS = ["apercu", "magazines", "photos", "messages", "documents", "rendezvous", "livraison", "reglages", "journal"] as const;

export default async function PageFiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ onglet?: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { id } = await params;
  if (!estUuid(id)) notFound();
  const { onglet: ongletDemande } = await searchParams;
  const onglet = (ONGLETS as readonly string[]).includes(ongletDemande ?? "") ? (ongletDemande as string) : "apercu";

  /* `rendu` : l'instant de la lecture, pris AVANT elle (la barre garde la valeur la plus récente ; « Aujourd'hui » du fil, T-188). */
  const rendu = new Date();
  const [lu, nonLus, nonLusEdition] = await Promise.all([chargerEdition(makeSupabase(), id, rendu), compterConversationsEnAttente(makeSupabase()), compterNonLus(makeSupabase(), id)]);
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
  /* T-159 : une édition dont les photos sont effacées (30 jours après la livraison) le DIT, ici et dans l'onglet Photos. */
  const effacees = phrasePhotosEffacees(e.photos_supprimees_le);
  /* T-194 : les photos arrivées au coffre sans confirmation, retrouvées après la réponse (sans ralentir la fiche).
     Le module (sharp, libheif, le coffre) ne se charge qu'à ce moment-là : jamais sur le chemin de la page. */
  after(() => import("@/lib/collectif/rattrapageServeur").then((m) => m.rattraperEdition(makeSupabase(), e.id, { declencheur: "fiche" })));

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

  /* L'ouverture du dépôt (migration 20261023) : `undefined` = la base n'a pas la colonne (le formulaire le dit et ne propose rien),
     `null` = ouvert dès la création, sinon le moment où les participants peuvent déposer. Une ouverture PASSÉE n'est qu'une date. */
  const ouvertureAbsente = e.ouverture_le === undefined;
  const ouverture: { etat: "aucune" | "avenir" | "passee"; quand: string } | null = ouvertureAbsente
    ? null
    : !e.ouverture_le
      ? { etat: "aucune", quand: "" }
      : { etat: depotOuvert(e.ouverture_le, rendu) ? "passee" : "avenir", quand: quandOuvre(e.ouverture_le) };

  const initiales: ValeursEdition = {
    organisation: e.organisation,
    evenement: e.evenement,
    dates_texte: e.dates_texte ?? "",
    registre: e.registre,
    cloture_local: versChampParis(e.cloture_le),
    ouverture_local: versChampParis(e.ouverture_le ?? null),
    livraison_prevue_le: e.livraison?.prevue_le ?? "",
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
    magazines: magazines.map((m) => ({
      id: m.id,
      nom: m.nom,
      vide: m.vide,
      etiquette: etiquetteMagazine({ ...m, briefCommence: m.brief.styles.length > 0 || Boolean(m.brief.texte) || m.brief.aimees.length > 0 }),
    })),
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
  const dernier = messages.length ? messages[messages.length - 1] : null;
  const derniereDemande = demandesDuFil(messages).at(-1) ?? null;
  const prochainRdv = (rdvs.ok ? rdvs.valeur : [])
    .filter((r) => r.statut === "pris" && Date.parse(r.debut) > maintenantRdv.getTime())
    .sort((a, b) => a.debut.localeCompare(b.debut))[0];
  const avecRdv = prochainRdv ? ((inters.ok ? inters.valeur : []).find((i) => i.cle === prochainRdv.interlocuteur_cle)?.prenom ?? prochainRdv.interlocuteur_cle) : null;

  /* L'état d'un magazine en une pastille : la plus avancée gagne. */
  const pastilleMag = (m: (typeof magazines)[number]): { texte: string; ton: "vert" | "bleu" | "ambre" | "gris" } =>
    m.bat_valide_le
      ? { texte: "BAT validé", ton: "vert" }
      : m.toursPublies > 0
        ? { texte: `Tour ${m.toursPublies} publié`, ton: "bleu" }
        : m.brief_valide_le
          ? { texte: "Brief validé", ton: "vert" }
          : m.brief.styles.length
            ? { texte: "Brief en cours", ton: "ambre" }
            : { texte: "Brief à faire", ton: "gris" };

  /* Ce qui bloque ou attend l'atelier, en tête de la vue d'ensemble.
     T-195 : un plafond PAR PERSONNE qui manque ferme le lien des participants (la règle de
     `placeRestante`, par `depotRegle`) ; tant que la collecte est ouverte, la fiche le dit. Un total
     vide, lui, ne bloque rien (D27 : pas de limite pour toute l'édition), donc pas d'alerte.
     D26 (T-152) : une proposition acceptée n'engage pas ; le devis à signer reste à envoyer. */
  const parPersonneManque = etat === "preparation" && !depotRegle(e, { sansPlafond: false });
  const devisEnAttente = devisAEnvoyer(documents);

  const pluriel = (n: number, mot: string) => `${n.toLocaleString("fr-FR")} ${mot}${n > 1 ? "s" : ""}`;
  const couverturesAimees = (n: number) => (n === 0 ? "aucune couverture aimée" : `${n} couverture${n > 1 ? "s" : ""} aimée${n > 1 ? "s" : ""}`);

  const apercu = (
    <>
      <ol className="eca-etapes">
        {etapesEdition(etat).map((et, i) => (
          <li key={et.cle} className={`eca-etape eca-etape--${et.statut}`}>
            <span className="eca-etape-signe" aria-hidden="true">
              {et.statut === "fait" ? COCHE : i + 1}
            </span>
            <span className="eca-etape-texte">
              <strong>{et.nom}</strong>
              <span className="eca-etape-detail">{detailEtape[et.cle]}</span>
            </span>
          </li>
        ))}
      </ol>

      {parPersonneManque || devisEnAttente.length ? (
        <div className="eca-alertes" role="status">
          {parPersonneManque ? (
            <a href="?onglet=reglages" data-onglet="reglages" className="eca-bandeau eca-bandeau--chaud">
              <span className="eca-point" aria-hidden="true" />
              <span>
                <strong>Photos par personne : à régler.</strong>
                {" "}Le lien des participants reste fermé ; seuls les liens de contribution qui ont leur propre nombre reçoivent des photos. Réglages et liens →
              </span>
            </a>
          ) : null}
          {devisEnAttente.map((d) => (
            <a key={d.id} href="?onglet=documents" data-onglet="documents" className="eca-bandeau eca-bandeau--chaud">
              <span className="eca-point" aria-hidden="true" />
              <span>
                <strong>{A_FAIRE_DEVIS}</strong>
                {` : « ${d.libelle} »${d.statut ? `, ${d.statut.charAt(0).toLowerCase()}${d.statut.slice(1)}` : ""}. Accepter n'engage pas le client : c'est le devis signé qui engage. Documents →`}
              </span>
            </a>
          ))}
        </div>
      ) : null}

      <div className="eca-cartes">
        <section className="eca-carte">
          <span className="eca-carte-tete">
            <h2 className="eca-carte-titre">Magazines</h2>
            <a href="?onglet=magazines" data-onglet="magazines" className="eca-carte-lien">
              Les briefs →
            </a>
          </span>
          <ul className="eca-mags">
            {magazines.map((m) => {
              const p = pastilleMag(m);
              const couverture = m.brief.aimees.find((a) => a.url)?.url ?? null;
              return (
                <li key={m.id} className="eca-mag">
                  {couverture ? (
                    <img className="eca-mag-couv" src={couverture} alt="" />
                  ) : m.brief.palette ? (
                    <span className="eca-mag-couv eca-mag-couv--palette" aria-hidden="true">
                      {m.brief.palette.couleurs.map((c, i) => (
                        <span key={i} style={{ background: c }} />
                      ))}
                    </span>
                  ) : (
                    <span className="eca-mag-couv eca-mag-couv--vide" aria-hidden="true">
                      {m.rang}
                    </span>
                  )}
                  <span className="eca-mag-texte">
                    <strong>
                      {m.rang}. {m.nom}
                    </strong>
                    <span className="eca-sous">
                      {m.brief.styles.length === 0 ? "Aucun style choisi" : m.brief.styles.length === 1 ? m.brief.styles[0] : `${m.brief.styles.length} styles mêlés`}
                    </span>
                  </span>
                  <span className={`eca-puce eca-puce--${p.ton}`}>{p.texte}</span>
                </li>
              );
            })}
          </ul>
          <span className="eca-carte-pied">Tirage : {e.tirage ? pluriel(e.tirage, "exemplaire") : "à fixer"}</span>
        </section>

        <section className="eca-carte">
          <span className="eca-carte-tete">
            <h2 className="eca-carte-titre">La collecte</h2>
            <a href="?onglet=photos" data-onglet="photos" className="eca-carte-lien">
              Les photos →
            </a>
          </span>
          <span className="eca-chiffre">
            <strong>{collecte.total.toLocaleString("fr-FR")}</strong>
            <span>
              photo{collecte.total > 1 ? "s" : ""} · {pluriel(collecte.participants, "personne")}
            </span>
          </span>
          {collecte.apercus.length ? (
            <div className="eca-mosaique">
              {collecte.apercus.map((u, i) => (
                <img key={i} src={u} alt="" />
              ))}
            </div>
          ) : (
            <p className="eca-vide">
              {effacees ? `${effacees}.` : collecte.total ? "Pas encore d'aperçu à montrer." : "Aucune photo encore. Le lien de dépôt est dans « Réglages et liens »."}
            </p>
          )}
          <span className="eca-carte-pied eca-puces">
            <span className="eca-puce">{e.cloture_le ? `Clôture le ${formaterJourParis(e.cloture_le)}` : "Clôture à fixer"}</span>
            {ouverture?.etat === "avenir" ? <span className="eca-puce eca-puce--ambre">Dépôt ouvert le {ouverture.quand}</span> : null}
            {collecte.doublons ? <span className="eca-puce">{pluriel(collecte.doublons, "doublon")}</span> : null}
            {collecte.sansVignette && !effacees ? <span className="eca-puce">{collecte.sansVignette.toLocaleString("fr-FR")} sans aperçu (HEIC)</span> : null}
            {collecte.signalees ? <span className="eca-puce eca-puce--ambre">{pluriel(collecte.signalees, "signalée")}</span> : null}
          </span>
        </section>

        <section className="eca-carte">
          <span className="eca-carte-tete">
            <h2 className="eca-carte-titre">Le dernier message</h2>
            <Link href={`/admin/collectif/messages?e=${e.id}`} className="eca-carte-lien">
              {nonLusEdition ? "Répondre →" : "La messagerie →"}
            </Link>
          </span>
          {dernier ? (
            <span className={dernier.auteur === "client" ? "eca-bulle" : "eca-bulle eca-bulle--atelier"}>
              <span className="eca-sous">
                {dernier.auteur === "client" ? (dernier.qui ?? "Le client") : `Vous${dernier.qui ? ` (${dernier.qui})` : ""}`}, {formaterJourParis(dernier.created_at)} à{" "}
                {formaterHeureParis(dernier.created_at)}
              </span>
              <span>{extraitDe(dernier.texte, 160)}</span>
            </span>
          ) : (
            <p className="eca-vide">Aucun message encore.</p>
          )}
          {derniereDemande ? (
            <span className="eca-bandeau eca-bandeau--chaud">
              <span className="eca-point" aria-hidden="true" />
              <span>
                Dernière demande : <strong>{derniereDemande.motif}</strong>, le {formaterJourParis(derniereDemande.quand)}
              </span>
            </span>
          ) : null}
          {prochainRdv ? (
            <a href="?onglet=rendezvous" data-onglet="rendezvous" className="eca-bandeau">
              <span className="eca-point eca-point--bleu" aria-hidden="true" />
              <span>
                Rendez-vous le <strong>{quandRdv(prochainRdv.debut)}</strong>
                {avecRdv ? `, avec ${avecRdv}` : ""}
              </span>
            </a>
          ) : null}
          <span className="eca-carte-pied eca-carte-pied--liens">
            <LienResponsable url={liens.responsable} />
            <a href="?onglet=reglages" data-onglet="reglages" className="eca-carte-lien">
              Lien de l&apos;équipe, lien de dépôt →
            </a>
          </span>
        </section>
      </div>
    </>
  );

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif nonLus={nonLus} nonLusLe={rendu.toISOString()} liens={liensEditions(null, nonLus)} />
      <Link href="/admin/collectif" className="eca-retour">
        <span aria-hidden="true">←</span> Les éditions
      </Link>
      <header className="eca-fiche-tete">
        <span className="eca-avatar" aria-hidden="true">
          {initialesDe(e.organisation)}
        </span>
        <div className="eca-fiche-titres">
          <span className="eca-sous">
            {e.organisation}
            {e.responsable_nom ? ` · ${e.responsable_nom}` : ""}
          </span>
          <h1 className="eca-fiche-h1">{e.evenement}</h1>
          <span className="eca-sous">
            {LIBELLE_ETAT_EDITION[etat]}
            {e.dates_texte ? ` · ${e.dates_texte}` : ""}
            {e.archive_le ? " · archivée" : ""}
          </span>
        </div>
        <div className={`eca-fiche-prochaine eca-fiche-prochaine--${prochaine.camp}`}>
          <span className="eca-fiche-prochaine-camp">{LIBELLE_PROCHAINE[prochaine.camp]}</span>
          <strong>{prochaine.texte}</strong>
        </div>
        <span className="eca-fiche-actions">
          <PanneauGestes id={e.id} etat={etat} archivee={Boolean(e.archive_le)} menu />
          <Link href={`/admin/collectif/messages?e=${e.id}`} className={nonLusEdition ? "eca-pilule eca-pilule--action" : "eca-pilule eca-pilule--claire"}>
            {nonLusEdition ? (
              <>
                Répondre <span className="eca-pilule-compte">{nonLusEdition}</span>
              </>
            ) : (
              "Messagerie"
            )}
          </Link>
        </span>
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
          { cle: "reglages", libelle: "Réglages et liens" },
          { cle: "journal", libelle: "Journal" },
        ]}
        panneaux={{
          apercu,
          /* T-185 (planche 7) : une carte par magazine, comme la vue d'ensemble ; le brief se VOIT
             (palette, typographies, doubles pages, couvertures aimées) au lieu d'une liste de mots. */
          magazines: (
            <div className="eca-cartes eca-cartes--deux">
              {magazines.map((m) => {
                const p = pastilleMag(m);
                const couverture = m.brief.aimees.find((a) => a.url)?.url ?? null;
                const vide = m.brief.styles.length === 0 && m.brief.aimees.length === 0;
                const infos = [
                  e.pagination_prevue ? pluriel(e.pagination_prevue, "page") : null,
                  m.brief.styles.length === 0 ? null : m.brief.styles.length === 1 ? `style ${m.brief.styles[0]}` : `${m.brief.styles.length} styles mêlés : ${m.brief.styles.join(", ")}`,
                  m.brief_valide_le ? `brief validé le ${formaterJourParis(m.brief_valide_le)}` : null,
                ].filter(Boolean);
                return (
                  <section key={m.id} className="eca-carte">
                    <span className="eca-carte-tete">
                      <h2 className="eca-carte-titre">
                        Magazine {m.rang} · {m.nom}
                      </h2>
                      <span className={`eca-puce eca-puce--${p.ton}`}>{p.texte}</span>
                    </span>
                    <span className="eca-mag-resume">
                      {couverture ? (
                        <img className="eca-mag-couv" src={couverture} alt="" />
                      ) : (
                        <span className="eca-mag-couv eca-mag-couv--vide" aria-hidden="true">
                          {m.rang}
                        </span>
                      )}
                      <span className="eca-sous">{infos.length ? infos.join(" · ") : "Aucune pièce choisie pour l'instant."}</span>
                    </span>
                    <ul className="eca-pieces" aria-label={`Le brief du magazine ${m.rang}`}>
                      <li className="eca-piece">
                        {m.brief.palette ? (
                          <span className="eca-piece-vis eca-piece-bandes" aria-hidden="true">
                            {m.brief.palette.couleurs.map((c, i) => (
                              <span key={i} style={{ background: c }} />
                            ))}
                          </span>
                        ) : (
                          <span className="eca-piece-vis eca-piece-vis--vide" aria-hidden="true" />
                        )}
                        <span className="eca-piece-nom">{m.brief.palette ? `Palette ${m.brief.palette.nom}` : "Palette"}</span>
                        <span className="eca-piece-style">{m.brief.palette?.style ?? "à choisir"}</span>
                      </li>
                      <li className="eca-piece">
                        <span className={m.brief.typos ? "eca-piece-vis eca-piece-aa" : "eca-piece-vis eca-piece-vis--vide"} aria-hidden="true">
                          {m.brief.typos ? "Aa" : null}
                        </span>
                        <span className="eca-piece-nom">{m.brief.typos ? [m.brief.typos.titres, m.brief.typos.texte].filter(Boolean).join(" et ") || "Typographies" : "Typographies"}</span>
                        <span className="eca-piece-style">{m.brief.typos?.style ?? "à choisir"}</span>
                      </li>
                      {(m.brief.doubles.length ? m.brief.doubles : [null]).slice(0, 3).map((d, i) => (
                        <li key={i} className="eca-piece">
                          <span className={d ? "eca-piece-vis eca-piece-double" : "eca-piece-vis eca-piece-vis--vide"} aria-hidden="true">
                            {d ? <span /> : null}
                            {d ? <span /> : null}
                          </span>
                          <span className="eca-piece-nom">{d ? d.libelle : "Doubles pages"}</span>
                          <span className="eca-piece-style">{d ? d.style : "au moins une"}</span>
                        </li>
                      ))}
                    </ul>
                    {m.brief.aimees.length ? (
                      <span className="eca-aimees">
                        {m.brief.aimees.map((a, i) =>
                          a.url ? <img key={i} src={a.url} alt={`Couverture aimée (${a.style})`} title={a.style} /> : <span key={i}>{a.style}</span>
                        )}
                      </span>
                    ) : null}
                    <span className="eca-carte-pied eca-mag-pied">
                      <span>
                        {vide
                          ? "Le client n'a encore rien choisi sur le mur."
                          : [couverturesAimees(m.brief.aimees.length), PARTS_TEXTE.find((t) => t.cle === m.brief.texte)?.libelle.toLowerCase()].filter(Boolean).join(" · ")}
                      </span>
                      {vide ? (
                        <Link href={`/admin/collectif/messages?e=${e.id}`} className="adm-btn adm-btn--ghost">
                          Lui écrire
                        </Link>
                      ) : (
                        <Link href={`/admin/collectif/${e.id}/bat?m=${m.rang}`} className="adm-btn adm-btn--ghost">
                          Bon à tirer →
                        </Link>
                      )}
                    </span>
                  </section>
                );
              })}
            </div>
          ),
          /* T-198, T-199 (planches 4C et 5 du 20/10) : sous la collecte, les personnes de l'édition (adresse entière, renommer,
             fusionner, défaire) puis la corbeille (restaurer, effacer maintenant). Chacune se lit à son affichage : la fiche n'attend pas leurs routes. */
          photos: (
            <>
              <PanneauCollecte id={e.id} {...collecte} effacees={effacees} />
              <div className="eca-cartes eca-cartes--une eca-photos-suite">
                <PanneauPersonnes id={e.id} liens={collecte.parLien.map((l) => ({ cle: l.cle, nom: l.nom }))} />
                <PanneauCorbeille id={e.id} migrationAbsente={ouvertureAbsente} />
              </div>
            </>
          ),
          messages: <PanneauMessages id={e.id} initiaux={messages} premierNouveau={premierNouveau(messages, lu.fiche.nonLusAtelier)} maintenant={rendu.toISOString()} />,
          documents: (
            <div className="eca-deux">
              <PanneauDocuments id={e.id} documents={documents} />
              <PanneauContenus contenus={contenus} demandes={lu.fiche.demandes} />
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
              {/* T-186 : les six étapes de la création, JAMAIS une carte dans une carte. */}
              <FormulaireEdition
                mode="modification"
                id={e.id}
                initiales={initiales}
                maintenant={maintenantRdv.toISOString()}
                ouverteLe={versChampParis(e.created_at).slice(0, 10)}
                plafondClient={e.plafond_participant_client}
                ouvertureIndisponible={ouvertureAbsente}
              />
              <div className="eca-pile">
                <PanneauLiens id={e.id} liens={liens} ouverture={ouverture} />
                {/* T-201 : les liens de contribution (un par bateau, par équipe), leur création, leur QR en grand (T-197). */}
                <PanneauProvenances
                  id={e.id}
                  liens={lu.fiche.liens.map(({ cle, ...l }) => ({ ...l, url: `${liens.depot}?p=${cle}` }))}
                  depot={liens.depot}
                  max={plafondLienMax(e)}
                  ouverte={etat === "preparation"}
                  archivee={Boolean(e.archive_le)}
                  cloture={e.cloture_le ? formaterJourParis(e.cloture_le) : ""}
                />
                <EnvoiLienResponsable id={e.id} />
              </div>
            </div>
          ),
          journal: (
            <section className="eca-carte">
              <span className="eca-carte-tete">
                <h2 className="eca-carte-titre">Journal</h2>
              </span>
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
