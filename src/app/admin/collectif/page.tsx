import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { makeSupabase } from "@/lib/supabase";
import { formaterJour } from "@/lib/atelier/dates";
import { MIGRATION_COLLECTIF, TABLES_COLLECTIF } from "@/lib/collectif/migration";
import { LIBELLE_CAMP } from "@/lib/collectif/prochaine";
import { etatMigration } from "@/lib/collectif/sante";
import BarreAtelier, { liensEditions } from "../BarreAtelier";
import { phraseEnAttente } from "@/lib/collectif/nouveaux";
import { compterConversationsEnAttente, listerEditions } from "./donnees";
import "../admin.css";
import "../atelier/atelier.css";
import "./collectif.css";

/**
 * /admin/collectif — la liste des éditions (PRD §8, maquette Atelier).
 *
 * Client, magazines, état EFFECTIF (la clôture se calcule à la lecture),
 * prochaine étape et camp, échéance, messages non lus. Les archivées sont
 * derrière leur filtre. Sans la migration, la page nomme les tables qui
 * manquent au lieu de tomber.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — éditions collectives", robots: { index: false, follow: false } };

const CLASSE_CAMP = {
  atelier: "ate-camp ate-camp--atelier",
  client: "ate-camp ate-camp--cliente",
  imprimeur: "ate-camp eca-ate-camp--imprimeur",
  aucun: "ate-camp",
} as const;

export default async function PageCollectif({
  searchParams,
}: {
  searchParams: Promise<{ archivees?: string }>;
}) {
  const qui = await quiEstConnecte();
  /* Le middleware a déjà filtré ; ce garde-fou existe pour le cas où le
     matcher changerait sans que personne n'y pense. */
  if (!qui) redirect("/admin/login");

  const archivees = (await searchParams).archivees === "1";
  const supabase = makeSupabase();
  /* L'instant de la lecture, pris AVANT elle : la barre garde la plus récente des valeurs qu'elle connaît (T-188). */
  const lu = new Date();
  const [liste, nonLus] = await Promise.all([listerEditions(supabase, archivees, lu), compterConversationsEnAttente(supabase)]);

  if (liste.absent) {
    const etat = await etatMigration(supabase);
    return (
      <div className="adm-root ate-root eca-root">
        <BarreAtelier monde="editions" collectif liens={liensEditions("liste")} />
        <header className="ate-fiche-tete">
          <h1 className="ate-h1">Éditions collectives</h1>
        </header>
        <section className="ate-carte">
          <h2 className="ate-carte-titre">
            {etat.absentes.length === TABLES_COLLECTIF.length ? "Migration collectif absente" : "Migration collectif incomplète"}
          </h2>
          <p>
            À appliquer : <code>{MIGRATION_COLLECTIF}</code>.{" "}
            {etat.absentes.length < TABLES_COLLECTIF.length ? `Tables manquantes : ${etat.absentes.join(", ")}.` : null}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="adm-root ate-root eca-root">
      <BarreAtelier monde="editions" collectif nonLus={nonLus} nonLusLe={lu.toISOString()} rafraichir liens={liensEditions("liste", nonLus)} />

      {/* La même tête que les particuliers : une phrase, le geste principal à droite. */}
      <header className="ate-header">
        <div>
          <h1 className="adm-sr">L&apos;Atelier, les éditions</h1>
          <p className="ate-bonjour">
            Bonjour {prenomDe(qui)}.{" "}
            {liste.lignes.length === 0 ? (
              archivees ? (
                "Aucune édition archivée."
              ) : (
                "Aucune édition ouverte pour l'instant."
              )
            ) : (
              <>
                <strong>
                  {liste.lignes.length} édition{liste.lignes.length > 1 ? "s" : ""} {archivees ? `archivée${liste.lignes.length > 1 ? "s" : ""}` : "en cours"}
                </strong>
                {nonLus ? (
                  <>
                    <span className="ate-sep">·</span>
                    <Link href="/admin/collectif/messages" className="eca-lien-messages">
                      {phraseEnAttente(nonLus)}
                    </Link>
                  </>
                ) : null}
                .
              </>
            )}
          </p>
        </div>
        <Link href="/admin/collectif/nouvelle" className="adm-btn eca-lien-bouton">
          Ouvrir une édition
        </Link>
      </header>

      <div className="ate-barre">
        <nav className="ate-seg" aria-label="Filtrer">
          <Link href="/admin/collectif" className={archivees ? "ate-seg-btn" : "ate-seg-btn ate-seg-btn--actif"} aria-current={archivees ? undefined : "page"}>
            En cours
          </Link>
          <Link href="/admin/collectif?archivees=1" className={archivees ? "ate-seg-btn ate-seg-btn--actif" : "ate-seg-btn"} aria-current={archivees ? "page" : undefined}>
            Archivées
          </Link>
        </nav>
      </div>

      {liste.lignes.length === 0 ? (
        <section className="ate-carte">
          <p className="eca-vide">
            {archivees
              ? "Rien ici : une édition archivée quitte la liste sans rien perdre, et revient d'un clic depuis sa fiche."
              : "« Ouvrir une édition » crée ses trois liens. Aucun mail ne part : vous les envoyez vous-même."}
          </p>
        </section>
      ) : (
        <section className="ate-carte">
          <table className="eca-table">
            <thead>
              <tr>
                <th scope="col">Organisation et événement</th>
                <th scope="col">Magazines</th>
                <th scope="col">Prochaine étape</th>
                <th scope="col">Collecte</th>
                <th scope="col">Tirage</th>
                <th scope="col">Messages</th>
              </tr>
            </thead>
            <tbody>
              {liste.lignes.map((l) => (
                <tr key={l.id}>
                  <td>
                    <Link href={`/admin/collectif/${l.id}`}>
                      <span className="eca-orga">{l.organisation}</span>
                      <span className="eca-sous">{l.evenement}</span>
                    </Link>
                  </td>
                  <td>{l.nbMagazines}</td>
                  <td>
                    <div className="eca-prochaine">
                      <span className={CLASSE_CAMP[l.prochaine.camp]}>{LIBELLE_CAMP[l.prochaine.camp]}</span>
                      <span>{l.prochaine.texte}</span>
                      <span className="eca-sous">{l.libelleEtat}</span>
                    </div>
                  </td>
                  <td>
                    {/* La pastille dit l'état d'un coup d'œil ; la date dessous est la clôture (celle d'un geste, pour une collecte terminée à la main). */}
                    <div className="eca-collecte-cellule">
                      <span className={`eca-puce eca-puce--${l.collecte.ton}`}>{l.collecte.texte}</span>
                      <span className="eca-sous">
                        {l.clotureLe ? `${l.collecte.texte === "Collecte ouverte" ? "jusqu'au" : "le"} ${formaterJour(l.clotureLe)}` : <span className="eca-afixer">[À FIXER]</span>}
                      </span>
                    </div>
                  </td>
                  <td>{l.tirage ?? <span className="eca-afixer">[À FIXER]</span>}</td>
                  <td>
                    {l.nonLus > 0 ? (
                      <Link href={`/admin/collectif/messages?e=${l.id}`} className="eca-pastille" aria-label={`${l.nonLus} message${l.nonLus > 1 ? "s" : ""} à lire`}>
                        {l.nonLus}
                      </Link>
                    ) : (
                      <span className="eca-sous">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
