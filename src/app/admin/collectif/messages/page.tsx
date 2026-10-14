import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { quandRdv } from "@/lib/collectif/boite";
import { estUuid } from "@/lib/collectif/cles";
import { formaterJourParis } from "@/lib/collectif/dates";
import { LIBELLE_ETAT_EDITION } from "@/lib/collectif/etats";
import { liensEdition, origineDepuis } from "@/lib/collectif/liens";
import { MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { LIBELLE_CAMP, prochaineEtape } from "@/lib/collectif/prochaine";
import { lireInterlocuteurs, lireRendezVous } from "@/lib/collectif/rendezvous";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import ConversationAtelier from "../ConversationAtelier";
import { chargerBoite, chargerEdition, compterNonLus } from "../donnees";
import ListeConversations from "./ListeConversations";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/**
 * /admin/collectif/messages — la boîte de réception de l'atelier (T-152,
 * maquette « Atelier, la messagerie »). Trois colonnes : les conversations
 * (chercher, non lus, à traiter aujourd'hui), le fil au centre, le dossier
 * du client à droite. Les éditions seulement : les particuliers n'y sont
 * pas encore (Mathias, 14/10).
 *
 * `?e=<id>` ouvre une conversation ; sans lui, la plus urgente. Ouvrir une
 * conversation la marque lue (l'effet de `useMessagerie`) ; la liste, elle,
 * ne marque rien.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — messagerie", robots: { index: false, follow: false } };

const CLASSE_CAMP = {
  atelier: "ate-camp ate-camp--atelier",
  client: "ate-camp ate-camp--cliente",
  imprimeur: "ate-camp eca-ate-camp--imprimeur",
  aucun: "ate-camp",
} as const;

export default async function PageMessagerie({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { e: choisie } = await searchParams;
  const supabase = makeSupabase();
  const maintenant = new Date();
  const [boite, nonLus] = await Promise.all([chargerBoite(supabase, maintenant), compterNonLus(supabase)]);

  if (boite.absent) {
    return (
      <div className="adm-root ate-root eca-root">
        <BarreAtelier monde="editions" collectif liens={liensEditions("messages")} />
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Migration collectif absente</h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>.
          </p>
        </section>
      </div>
    );
  }

  const courant =
    (choisie && estUuid(choisie) ? boite.conversations.find((c) => c.id === choisie) : undefined) ??
    boite.conversations.find((c) => c.nonLus) ??
    boite.conversations[0] ??
    null;
  const lu = courant ? await chargerEdition(supabase, courant.id, maintenant) : null;
  const fiche = lu && !lu.absent ? lu.fiche : null;

  let dossier: React.ReactNode = null;
  if (fiche) {
    const { edition: e, etat, magazines, collecte, contenus, documents } = fiche;
    const h = await headers();
    const liens = liensEdition(origineDepuis(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto")), e);
    const prochaine = prochaineEtape(etat, e.cloture_le);
    const [rdvs, inters] = await Promise.all([lireRendezVous(supabase, e.id), lireInterlocuteurs(supabase)]);
    const prochainRdv = (rdvs.ok ? rdvs.valeur : []).find((r) => r.statut === "pris" && Date.parse(r.debut) > maintenant.getTime());
    const avec = prochainRdv ? ((inters.ok ? inters.valeur : []).find((i) => i.cle === prochainRdv.interlocuteur_cle)?.prenom ?? prochainRdv.interlocuteur_cle) : null;
    const recus = [...new Set(contenus.filter((c) => !c.ancienne).map((c) => c.libelle))];
    const briefs = magazines.filter((m) => m.brief_valide_le).length;
    const tours = magazines.reduce((n, m) => n + m.toursPublies, 0);
    const lignes: [string, React.ReactNode][] = [
      [
        "Prochaine étape",
        <span key="p" className="eca-prochaine">
          <span className={CLASSE_CAMP[prochaine.camp]}>{LIBELLE_CAMP[prochaine.camp]}</span>
          <span>{prochaine.texte}</span>
        </span>,
      ],
      ["Prochain rendez-vous", prochainRdv ? `${quandRdv(prochainRdv.debut)}, avec ${avec}` : "aucun"],
      ["Contenus reçus", recus.length ? recus.join(", ") : "rien encore"],
      ["Documents", documents.length ? `${documents.length} · ${documents[0].libelle}` : "aucun"],
      ["Responsable", [e.responsable_nom, e.responsable_email].filter(Boolean).join(" · ")],
    ];
    dossier = (
      <aside className="eca-boite-dossier" aria-label="Le dossier du client">
        <div className="eca-boite-dossier-tete">
          <span className="eca-boite-etiquette">Le dossier</span>
          <strong className="eca-boite-dossier-nom">{e.evenement}</strong>
          <span className="eca-sous">
            {LIBELLE_ETAT_EDITION[etat]}
            {e.cloture_le ? ` · clôture le ${formaterJourParis(e.cloture_le)}` : ""}
          </span>
        </div>
        <div className="eca-boite-chiffres">
          <span>
            <strong>{collecte.total.toLocaleString("fr-FR")}</strong>
            <span>photo{collecte.total > 1 ? "s" : ""}</span>
          </span>
          <span>
            <strong>
              {briefs} / {magazines.length}
            </strong>
            <span>brief{magazines.length > 1 ? "s" : ""} validé{briefs > 1 ? "s" : ""}</span>
          </span>
          <span>
            <strong>{tours}</strong>
            <span>tour{tours > 1 ? "s" : ""} de BAT</span>
          </span>
        </div>
        <ul className="eca-boite-lignes">
          {lignes.map(([cle, valeur]) => (
            <li key={cle}>
              <span className="eca-sous">{cle}</span>
              <span>{valeur}</span>
            </li>
          ))}
        </ul>
        <div className="eca-boite-gestes">
          <Link href={`/admin/collectif/${e.id}`} className="adm-btn eca-lien-bouton">
            Ouvrir la fiche
          </Link>
          <Link href={`/admin/collectif/${e.id}?onglet=documents`} className="adm-btn adm-btn--ghost eca-lien-bouton">
            Déposer un document
          </Link>
          <a href={liens.responsable} target="_blank" rel="noopener noreferrer" className="eca-boite-espace">
            Voir son espace comme lui ↗
          </a>
        </div>
      </aside>
    );
  }

  return (
    <div className="adm-root ate-root eca-root eca-root--large">
      <BarreAtelier monde="editions" collectif nonLus={nonLus} liens={liensEditions("messages", nonLus)} />
      <div className="eca-boite">
        <ListeConversations conversations={boite.conversations} aTraiter={boite.aTraiter} courant={courant?.id ?? null} />
        <section className="eca-boite-fil" aria-label="La conversation">
          {fiche && courant ? (
            <>
              <header className="eca-boite-fil-tete">
                <strong className="eca-boite-fil-nom">{courant.organisation}</strong>
                <span className="eca-sous">
                  {courant.evenement}
                  {fiche.edition.responsable_nom ? ` · ${fiche.edition.responsable_nom}, responsable` : ""}
                </span>
              </header>
              <ConversationAtelier key={courant.id} id={courant.id} initiaux={fiche.messages} pleine />
            </>
          ) : (
            <p className="eca-vide">Aucune conversation : les éditions ouvertes apparaissent ici dès leur création.</p>
          )}
        </section>
        {dossier}
      </div>
    </div>
  );
}
