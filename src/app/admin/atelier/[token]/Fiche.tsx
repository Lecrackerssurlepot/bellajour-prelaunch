"use client";

import { useState } from "react";
import Link from "next/link";
import PanneauAction from "./PanneauAction";
import Parcours from "./Parcours";
import Carnet from "./Carnet";
import type { EvenementVue, Fiche as FicheVue } from "../types";

/**
 * La fiche dossier — tout ce qu'il faut pour composer un numéro et le faire
 * avancer, sur un seul écran.
 *
 * L'ordre des blocs est l'ordre du travail : ce qu'on doit faire d'abord,
 * puis la matière (son histoire, ses photos), puis les preuves (mails,
 * journal). Ce n'est pas un formulaire d'administration, c'est un plan de
 * travail.
 */

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function poids(o: number | null): string {
  if (!o) return "";
  return o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(o / 1024)} Ko`;
}

/**
 * Une ligne du journal, en français.
 *
 * Le payload brut n'est pas supprimé, il est REPLIÉ : la phrase sert à
 * comprendre, le JSON sert à déboguer. Les deux ont leur usage, à deux
 * moments différents, et un seul doit être visible par défaut.
 */
function Evenement({ e }: { e: EvenementVue }) {
  const [ouvert, setOuvert] = useState(false);
  const details = Object.keys(e.payload ?? {}).length > 0;
  return (
    <li className={`ate-ev ate-ev--${e.recit.ton}`}>
      <button
        type="button"
        className="ate-ev-tete"
        onClick={() => details && setOuvert((o) => !o)}
        aria-expanded={ouvert}
        title={details ? "Voir le détail technique" : undefined}
      >
        <span className="ate-ev-point" aria-hidden />
        <span className="ate-ev-corps">
          <span className="ate-ev-texte">{e.recit.texte}</span>
          {e.recit.detail ? <span className="ate-ev-detail">{e.recit.detail}</span> : null}
        </span>
        <span className="ate-ev-date">{fmt(e.createdAt)}</span>
      </button>
      {ouvert ? <pre className="ate-ev-payload">{JSON.stringify(e.payload, null, 2)}</pre> : null}
    </li>
  );
}

export default function Fiche({
  fiche,
  moi,
  demo,
}: {
  fiche: FicheVue;
  /** Identifiant du compte connecté — décide qui peut supprimer ses notes. */
  moi: string;
  demo?: boolean;
}) {
  const [copie, setCopie] = useState(false);
  const l = fiche.ligne;
  const liens = fiche.photos.map((p) => p.url).filter(Boolean) as string[];
  const base = demo ? "/admin/atelier/demo" : "/admin/atelier";

  function copierLiens() {
    navigator.clipboard?.writeText(liens.join("\n")).then(
      () => {
        setCopie(true);
        setTimeout(() => setCopie(false), 2500);
      },
      () => setCopie(false),
    );
  }

  /* Le lot de photos en un fichier. Pas de ZIP côté serveur : 80 photos de
     5 Mo dans une fonction Vercel, c'est une panne à retardement. Un .txt de
     liens signés, une ligne de commande à coller, et le téléchargement se
     fait à pleine vitesse depuis le coffre. */
  function telechargerListe() {
    const contenu =
      `# ${l.titre ?? "numéro"} — ${fiche.photos.length} photos\n` +
      `# Liens valables une heure. Pour tout récupérer :\n` +
      `#   xargs -n1 curl -sO < photos.txt\n\n` +
      liens.join("\n");
    const url = URL.createObjectURL(new Blob([contenu], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `photos-${l.token.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="adm-root ate-root ate-fiche">
      {demo ? (
        <div className="ate-demo-bar">
          Mode démonstration — dossier fictif, aucune action ne part en base.{" "}
          <Link href="/admin/atelier">Revenir aux vrais dossiers</Link>
        </div>
      ) : null}

      <header className="ate-fiche-tete">
        <Link href={base} className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">{l.titre?.trim() || "Sans titre"}</h1>
        <p className="ate-fiche-sous">
          <span className={`ate-etat ate-etat--${l.etat}`}>
            <span className="ate-etape">{l.etape}</span>
            {l.libelleEtat}
          </span>
          <span className={l.urgence.enRetard ? "ate-delai-val ate-delai-val--retard" : "ate-delai-val"}>
            {l.urgence.libelle}
          </span>
          {l.urgence.promesse ? <span className="ate-faint">{l.urgence.promesse}</span> : null}
          <a className="ate-lien-page" href={`/numero/${l.token}`} target="_blank" rel="noreferrer">
            Voir sa page ↗
          </a>
        </p>
      </header>

      <Parcours parcours={fiche.parcours} />

      {l.rembourse ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          Ce numéro a été remboursé. Aucun état n&apos;a changé automatiquement — c&apos;est à
          nous de décider ce qu&apos;on en fait.
        </div>
      ) : null}

      {fiche.adresse?.dom ? (
        <div className="ate-bandeau ate-bandeau--attention">
          Adresse en {fiche.adresse.codePostal} — département d&apos;outre-mer. Stripe l&apos;a
          traitée comme la France métropolitaine : vérifie le coût du port AVANT de commander
          chez l&apos;imprimeur.
        </div>
      ) : null}

      <div className="ate-colonnes">
        <div className="ate-colonne">
          <PanneauAction fiche={fiche} demo={demo} />

          <Carnet
            token={l.token}
            notes={fiche.notes}
            indisponibles={fiche.notesIndisponibles}
            canvaTravail={fiche.canvaTravail}
            moi={moi}
            demo={demo}
          />

          {/* ── la matière première ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Le moment</h2>
            <dl className="ate-defs">
              <dt>Occasion</dt>
              <dd>{fiche.occasion || "—"}</dd>
            </dl>
            <p className="ate-histoire">{fiche.histoire || "Elle n'a rien écrit."}</p>
          </section>

          <section className="ate-carte">
            <div className="ate-carte-tete">
              <h2 className="ate-carte-titre">
                Les photos <span className="ate-compte">{fiche.photos.length}</span>
              </h2>
              {fiche.photos.length ? (
                <div className="ate-carte-outils">
                  <button className="adm-btn adm-btn--ghost" type="button" onClick={copierLiens}>
                    {copie ? "Copié" : "Copier les liens"}
                  </button>
                  <button className="adm-btn adm-btn--ghost" type="button" onClick={telechargerListe}>
                    Télécharger le lot
                  </button>
                </div>
              ) : null}
            </div>

            {fiche.photos.length === 0 ? (
              <p className="ate-faint">Aucune photo déposée.</p>
            ) : (
              <div className="ate-photos">
                {fiche.photos.map((p) => (
                  <a
                    key={p.id}
                    className="ate-photo"
                    href={p.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    title={`${p.nom ?? ""} ${poids(p.taille)}`}
                  >
                    {p.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.url} alt="" loading="lazy" />
                    ) : (
                      <span className="ate-photo-vide">?</span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </section>

          {fiche.apercu.c1 || fiche.apercu.c4 || fiche.apercu.double ? (
            <section className="ate-carte">
              <h2 className="ate-carte-titre">L&apos;aperçu publié</h2>
              <div className="ate-apercu">
                {[
                  ["C1", fiche.apercu.c1],
                  ["C4", fiche.apercu.c4],
                  ["Double", fiche.apercu.double],
                ].map(([nom, src]) => (
                  <figure key={nom as string} className="ate-apercu-item">
                    {src ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={src as string} alt="" />
                    ) : (
                      <span className="ate-photo-vide">manquant</span>
                    )}
                    <figcaption>{nom as string}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="ate-colonne ate-colonne--cote">
          {/* ── la cliente ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">{l.prenom || "La cliente"}</h2>
            <dl className="ate-defs">
              <dt>Email</dt>
              <dd className="ate-mono">{l.email || "—"}</dd>
              <dt>Téléphone</dt>
              <dd>{fiche.telephone || "—"}</dd>
              <dt>Dossier ouvert</dt>
              <dd>{fmt(l.createdAt)}</dd>
              {fiche.client.totalPaye > 0 ? (
                <>
                  <dt>Total réglé</dt>
                  <dd>
                    <strong>{fiche.client.totalPaye}&nbsp;€</strong>
                  </dd>
                </>
              ) : null}
            </dl>

            {fiche.client.autres.length ? (
              <>
                <h3 className="ate-sous-titre">Ses autres numéros</h3>
                <ul className="ate-autres">
                  {fiche.client.autres.map((a) => (
                    <li key={a.token}>
                      <Link href={`${base}/${a.token}`}>{a.titre?.trim() || "Sans titre"}</Link>
                      <span className="ate-faint">
                        {a.libelleEtat}
                        {a.euros ? ` · ${a.euros} €` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* Lecture seule de la prévente. Raison unique : CGV v3.0 art. 5 bis. */}
            {fiche.client.prevente ? (
              <div className="ate-prevente">
                <h3 className="ate-sous-titre">Prévente</h3>
                {fiche.client.prevente.numeroFondateur ? (
                  <p className="ate-credit">
                    Fondatrice nº{fiche.client.prevente.numeroFondateur} — <strong>30 € de crédit</strong>{" "}
                    à imputer (CGV art. 5 bis), code Stripe nominatif à usage unique.
                  </p>
                ) : (
                  <p className="ate-faint">
                    Inscrite en prévente ({fiche.client.prevente.status ?? "—"}), sans place de
                    fondatrice.
                  </p>
                )}
                {fiche.client.prevente.estAmbassadeur ? (
                  <p className="ate-faint">
                    Ambassadrice · {fiche.client.prevente.pagesCredits} pages de parrainage acquises.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ── ce qui engage ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Accords et paiement</h2>
            <ul className="ate-accords">
              <li className={fiche.consentPhotos ? "ate-oui" : "ate-non"}>
                Droit d&apos;usage des photos
              </li>
              <li className={fiche.consentCommunication ? "ate-oui" : "ate-non"}>
                Droit de montrer des extraits
                {!fiche.consentCommunication ? (
                  <span className="ate-faint"> — ne rien publier de ce numéro</span>
                ) : null}
              </li>
              <li className={fiche.cgvOk ? "ate-oui" : "ate-non"}>
                CGV {fiche.cgvOkAt ? <span className="ate-faint">{fmt(fiche.cgvOkAt)}</span> : null}
              </li>
              <li className={fiche.renonciation ? "ate-oui" : "ate-non"}>
                Fabrication immédiate{" "}
                {fiche.renonciationAt ? <span className="ate-faint">{fmt(fiche.renonciationAt)}</span> : null}
              </li>
            </ul>

            {fiche.adresse ? (
              <>
                <h3 className="ate-sous-titre">Livraison</h3>
                <address className="ate-adresse">
                  {fiche.adresse.nom ? <>{fiche.adresse.nom}<br /></> : null}
                  {fiche.adresse.ligne1}
                  {fiche.adresse.ligne2 ? <><br />{fiche.adresse.ligne2}</> : null}
                  <br />
                  {fiche.adresse.codePostal} {fiche.adresse.ville}
                  <br />
                  {fiche.adresse.pays}
                </address>
              </>
            ) : null}

            {fiche.stripePaymentIntent ? (
              <p className="ate-mono ate-faint ate-pi">{fiche.stripePaymentIntent}</p>
            ) : null}

            {fiche.canvaUrl ? (
              <p className="ate-canva-partage">
                <a href={fiche.canvaUrl} target="_blank" rel="noreferrer">
                  Canva partagé ↗
                </a>
                <span className="ate-faint"> — celui qu&apos;elle a reçu, en commentaire</span>
              </p>
            ) : null}
          </section>

          {/* ── les preuves ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Mails partis</h2>
            {fiche.mails.length === 0 ? (
              <p className="ate-faint">Aucun mail pour l&apos;instant.</p>
            ) : (
              <ul className="ate-mails">
                {fiche.mails.map((m) => (
                  <li key={m.code}>
                    <strong>{m.code}</strong>
                    <span className="ate-faint">{fmt(m.envoyeLe)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ate-carte">
            <h2 className="ate-carte-titre">Ce qui s&apos;est passé</h2>
            <ul className="ate-journal">
              {fiche.evenements.map((e) => (
                <Evenement key={e.id} e={e} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
