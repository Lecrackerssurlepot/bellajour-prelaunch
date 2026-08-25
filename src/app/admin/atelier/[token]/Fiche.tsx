"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PanneauAction from "./PanneauAction";
import Parcours from "./Parcours";
import Carnet from "./Carnet";
import type { EvenementVue, Fiche as FicheVue } from "../types";
import Loupe, { type VueLoupe } from "@/app/components/Loupe";
import EnCharge from "./EnCharge";
import { PRENOM_COMPTE } from "@/lib/admin-auth";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  choisirDossier,
  ecrireLot,
  listeDesLiens,
  supporteDossier,
  telechargerTexte,
  COMMANDE_REPLI,
  type PhotoLot,
} from "./telechargement";

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

/* Combien de vignettes avant de replier. Trois lignes de grille suffisent à
   juger d'un lot ; quarante vignettes repoussent le reste de la fiche sous la
   ligne de flottaison et transforment l'outil en galerie. */
const VIGNETTES_VISIBLES = 12;

/**
 * Les trois visuels de l'aperçu, nommés COMME LA CLIENTE LES VOIT.
 *
 * « C1 » et « C4 » sont du jargon d'imprimeur : à la recette du 25/08, l'encart
 * a été jugé « pas clair » des deux côtés. Deux personnes qui regardent le
 * même visuel doivent le nommer pareil, sinon le téléphone avec la cliente
 * devient une traduction.
 */
const APERCU_VUES = [
  { cle: "c1", legende: "La couverture" },
  { cle: "c4", legende: "La quatrième" },
  { cle: "double", legende: "Une double page" },
] as const;

/**
 * Ce que le téléchargement raconte à l'écran.
 *
 * Un lot de deux cents photos prend des minutes. Un bouton qui ne dit rien
 * pendant deux minutes est un bouton cassé : on le reclique, et on repart
 * pour un tour. La phase est donc affichée en toutes lettres, avec un moyen
 * d'arrêter.
 */
type EtatLot =
  | { phase: "repos" }
  | { phase: "prepare" }
  | { phase: "ecrit"; faites: number; total: number; enCours: string }
  | { phase: "fini"; dossier: string; ecrites: number; ratees: string[]; interrompu: boolean }
  | { phase: "repli"; fichier: string }
  | { phase: "erreur"; message: string };

/** La fiche vue par le brief. Le brief ne connaît pas la fiche : il demande. */
function matiereDe(fiche: FicheVue): MatiereBrief {
  const l = fiche.ligne;
  return {
    titre: l.titre,
    prenom: l.prenom,
    email: l.email,
    token: l.token,
    libelleEtat: l.libelleEtat,
    nbPhotos: fiche.photos.length,
    nbPages: l.nbPages,
    palier: fiche.palier,
    euros: l.euros,
    createdAt: l.createdAt,
    occasion: fiche.occasion,
    histoire: fiche.histoire,
    canvaTravail: fiche.canvaTravail,
    notes: fiche.notes.map((n) => ({ prenom: n.prenom, texte: n.texte, createdAt: n.createdAt })),
  };
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
  const [toutesLesPhotos, setToutesLesPhotos] = useState(false);
  const [lot, setLot] = useState<EtatLot>({ phase: "repos" });
  const [apercuOuvert, setApercuOuvert] = useState<number | null>(null);
  /* `supporteDossier()` lit `window` : appelé au rendu, il rendrait `false`
     côté serveur et `true` ensuite, et React refuserait l'hydratation. On
     décide donc APRÈS le premier rendu, ce qui affiche brièvement le libellé
     de repli et n'a jamais trompé personne. */
  const [ecritDirect, setEcritDirect] = useState(false);
  useEffect(() => setEcritDirect(supporteDossier()), []);
  const arret = useRef<AbortController | null>(null);

  const l = fiche.ligne;
  const base = demo ? "/admin/atelier/demo" : "/admin/atelier";
  const occupe = lot.phase === "prepare" || lot.phase === "ecrit";

  /* La loupe ne connaît que ce qui existe : un visuel manquant n'est pas une
     étape de la visite. Ses index ne sont donc PAS ceux de la grille. */
  const apercuAgrandissable: VueLoupe[] = APERCU_VUES.flatMap(({ cle, legende }) => {
    const src = fiche.apercu[cle];
    return src ? [{ src, legende }] : [];
  });

  /**
   * Les liens, refaits à l'instant.
   *
   * Ceux de la page ont été signés au rendu, pour deux heures. La fiche reste
   * ouverte toute la matinée : on ne télécharge JAMAIS avec les liens
   * affichés, sous peine d'écrire quarante fichiers de zéro octet sans que
   * rien ne le signale.
   *
   * En démonstration, les photos sont des images de /public : même origine,
   * aucune signature à refaire, et surtout aucun appel qui toucherait la base.
   */
  async function liensFrais(): Promise<PhotoLot[]> {
    if (demo) return fiche.photos;
    const r = await fetch("/api/admin/atelier/lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: l.token }),
    });
    if (!r.ok) throw new Error("Les liens du coffre n'ont pas pu être refaits.");
    const d = (await r.json()) as { photos?: PhotoLot[] };
    if (!d.photos?.length) throw new Error("Le coffre n'a rendu aucune photo.");
    return d.photos;
  }

  function leBrief(): string {
    return composerBrief(matiereDe(fiche), new Date());
  }

  /**
   * Le lot sur le disque (Chrome, Edge).
   *
   * ⚠️ Le sélecteur de dossier s'ouvre AVANT tout `await` : Chrome exige une
   * activation utilisateur fraîche, et un aller-retour réseau la consomme.
   */
  async function telechargerDossier() {
    const racine = await choisirDossier();
    if (!racine) return;

    const ctrl = new AbortController();
    arret.current = ctrl;
    setLot({ phase: "prepare" });
    try {
      const photos = await liensFrais();
      const r = await ecrireLot(racine, {
        prenom: l.prenom,
        titre: l.titre,
        token: l.token,
        photos,
        brief: leBrief(),
        signal: ctrl.signal,
        onProgres: (p) => setLot({ phase: "ecrit", ...p }),
      });
      setLot({ phase: "fini", ...r });
    } catch (err) {
      setLot({ phase: "erreur", message: (err as Error)?.message || "Le téléchargement a échoué." });
    } finally {
      arret.current = null;
    }
  }

  /** Le repli : une liste nue de liens, pour `curl`. */
  async function telechargerListe() {
    setLot({ phase: "prepare" });
    try {
      const photos = await liensFrais();
      const fichier = `photos-${l.token.slice(0, 8)}.txt`;
      telechargerTexte(fichier, listeDesLiens(photos));
      setLot({ phase: "repli", fichier });
    } catch (err) {
      setLot({ phase: "erreur", message: (err as Error)?.message || "Le téléchargement a échoué." });
    }
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

      {/* Qui s'en occupe, tout en haut : c'est la première chose à savoir
          avant de toucher au dossier, pas une information de bas de page.
          Absent tant que la migration 20260826 n'est pas passée. */}
      {fiche.enChargeAbsent ? null : (
        <EnCharge
          token={l.token}
          enCharge={l.enCharge}
          moi={moi}
          prenoms={PRENOM_COMPTE}
          demo={demo}
        />
      )}

      <Parcours parcours={fiche.parcours} />

      {l.rembourse ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          Ce numéro a été remboursé. Aucun état n&apos;a changé automatiquement — c&apos;est à
          nous de décider ce qu&apos;on en fait.
        </div>
      ) : null}

      {/* ── LE DÉPÔT N'EST PAS TERMINÉ ──────────────────────────────
          Le cas qui a coûté cher le 25/08 : 55 photos dans le coffre, un
          dossier en tête de pile « à faire », et personne pour remarquer que
          la cliente n'avait jamais cliqué « Envoyer ». Composer là-dessus,
          c'est utiliser des photos sans le droit d'usage.

          On AVERTIT, on ne bloque pas : un coup de téléphone peut très bien
          justifier d'avancer quand même, et une machine qui refuse sans
          pouvoir écouter finit contournée en SQL. */}
      {l.depot !== "termine" ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          <strong>Elle n&apos;a jamais envoyé son dépôt.</strong>{" "}
          {l.depot === "abandonne"
            ? `Les ${l.nbPhotos} photos sont bien arrivées dans le coffre, mais le droit d'usage n'a pas été donné : elle a fermé l'onglet avant le dernier bouton. Ne compose rien tant qu'elle n'a pas terminé.`
            : "Le questionnaire est rempli, aucune photo n'a été déposée."}{" "}
          Sa page lui propose de finir en un clic, et la relance part
          automatiquement le lendemain de l&apos;ouverture du dossier.
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
                  <button
                    className="adm-btn adm-btn--ghost"
                    type="button"
                    onClick={() => telechargerTexte(NOM_BRIEF, leBrief())}
                    title="L'occasion, son histoire et le carnet, en un fichier texte"
                  >
                    Le brief
                  </button>
                  <button
                    className="adm-btn"
                    type="button"
                    disabled={occupe}
                    onClick={ecritDirect ? telechargerDossier : telechargerListe}
                  >
                    {ecritDirect ? "Télécharger le lot" : "Télécharger les liens"}
                  </button>
                </div>
              ) : null}
            </div>

            {lot.phase !== "repos" ? (
              <div className={`ate-lot ate-lot--${lot.phase}`} role="status" aria-live="polite">
                {lot.phase === "prepare" ? <p>Préparation des liens...</p> : null}

                {lot.phase === "ecrit" ? (
                  <>
                    <div className="ate-lot-barre">
                      <span
                        className="ate-lot-jauge"
                        style={{ width: `${Math.round((lot.faites / Math.max(1, lot.total)) * 100)}%` }}
                      />
                    </div>
                    <p>
                      {`${lot.faites} / ${lot.total} photos écrites. En cours : ${lot.enCours}`}
                      <button
                        type="button"
                        className="ate-lot-arret"
                        onClick={() => arret.current?.abort()}
                      >
                        Arrêter
                      </button>
                    </p>
                  </>
                ) : null}

                {lot.phase === "fini" ? (
                  <p>
                    {lot.interrompu
                      ? `Arrêté. ${lot.ecrites} photos écrites dans « ${lot.dossier} ».`
                      : `${lot.ecrites} photos et le brief écrits dans « ${lot.dossier} ».`}
                    {lot.ratees.length ? (
                      <span className="ate-lot-ratees">
                        {` ${lot.ratees.length} n'ont pas pu être écrites : ${lot.ratees.join(", ")}. Relance le téléchargement, elles seules manqueront.`}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {/* Le repli. La commande vit ICI et non dans le fichier : une
                    ligne de commentaire dans le .txt le rendait inconsommable
                    par xargs, qui passait le dièse à curl comme une adresse. */}
                {lot.phase === "repli" ? (
                  <p>
                    {`${lot.fichier} téléchargé. Dans un dossier vide, ouvre le Terminal et colle :`}
                    <code className="ate-lot-cmd">{`${COMMANDE_REPLI} ~/Downloads/${lot.fichier}`}</code>
                    <span className="ate-faint">
                      Les noms de fichiers sont les mêmes que par le dossier. Les liens valent deux
                      heures.
                    </span>
                  </p>
                ) : null}

                {lot.phase === "erreur" ? <p className="ate-lot-ratees">{lot.message}</p> : null}
              </div>
            ) : null}

            {fiche.photos.length === 0 ? (
              <p className="ate-faint">Aucune photo déposée.</p>
            ) : (
              <div className="ate-photos">
                {(toutesLesPhotos ? fiche.photos : fiche.photos.slice(0, VIGNETTES_VISIBLES)).map((p) => (
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

            {fiche.photos.length > VIGNETTES_VISIBLES ? (
              <button
                type="button"
                className="ate-photos-plus"
                onClick={() => setToutesLesPhotos((v) => !v)}
              >
                {toutesLesPhotos
                  ? "Replier"
                  : `Voir les ${fiche.photos.length - VIGNETTES_VISIBLES} autres`}
              </button>
            ) : null}
          </section>

          {apercuAgrandissable.length ? (
            <section className="ate-carte">
              <h2 className="ate-carte-titre">L&apos;aperçu publié</h2>
              <p className="ate-carte-sous">
                Ce que la cliente voit sur sa page, dans le même ordre et avec les mêmes mots.
              </p>
              <div className="ate-apercu">
                {APERCU_VUES.map(({ cle, legende }) => {
                  const src = fiche.apercu[cle];
                  const rang = apercuAgrandissable.findIndex((v) => v.legende === legende);
                  return (
                    <figure key={cle} className="ate-apercu-item">
                      {src ? (
                        <button
                          type="button"
                          className="ate-apercu-clic"
                          onClick={() => setApercuOuvert(rang)}
                          aria-label={`Agrandir : ${legende}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={legende} />
                        </button>
                      ) : (
                        <span className="ate-photo-vide">manquant</span>
                      )}
                      <figcaption>{legende}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ) : null}

          <Loupe
            vues={apercuAgrandissable}
            index={apercuOuvert}
            onIndex={setApercuOuvert}
            onFermer={() => setApercuOuvert(null)}
          />
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
