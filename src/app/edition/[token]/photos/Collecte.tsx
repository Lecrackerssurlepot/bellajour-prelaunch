"use client";

/* La page Photos du client (PRD §4.2, §5, maquette Photos validée le 14/10).

   - La grille se lit PAR PAGES (120 vignettes signées à la fois) et se
     complète en descendant : 2 000 photos ne se chargent jamais d'un coup,
     et chaque tuile hors écran ne coûte rien à peindre (content-visibility).
   - La présélection est FACULTATIVE. Une photo choisie se marque par un BORD,
     sans case ni coche (Mathias : « il y a trop de photos ») ; « Tout
     sélectionner » et « Tout désélectionner » d'un geste. Une photo signalée
     n'entre jamais dans un « Tout sélectionner ».
   - Signaler une photo (« à ne pas publier ») se voit côté atelier.
   - « Qui a déposé » et les liens au MÊME endroit (retours du 14/10, points 9
     et 10) : chaque source, son nombre de photos et, s'il y en a un, son lien
     (Copier, Partager avec un message écrit pour ce groupe, QR). L'en-tête
     ne porte plus de bouton de copie du lien général.
   - « Déposer des photos » ouvre la fenêtre d'envoi de la COQUILLE
     (DepotContexte) : on peut quitter la page pendant l'envoi, la pastille de
     l'en-tête la rouvre. La grille se relit quand la fenêtre se ferme ou que
     l'envoi se termine, si de nouvelles photos sont arrivées.
   - L'équipe voit tout, sans bouton qui écrive, et sans aucun lien.

   ⚠️ Le chargement par pages observe SA zone de défilement (`root` de
   l'IntersectionObserver) ; sur téléphone, la page défile : `root` nul. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Filtre } from "@/lib/collectif/grille";
import { sourceRenommable, type Source } from "@/lib/collectif/sources";
import { useFenetreEnvoi, useMoteurDepot } from "../../_composants/depot/DepotContexte";
import { useMoteur } from "../../_composants/depot/useMoteur";
import { EnTeteEcran } from "../../_composants/Ecran";
import NomDossier from "../../_composants/NomDossier";
import FenetreLien, { FenetrePartage, FenetreQr, type ContexteMessage, type LienPartage } from "../../_composants/LienContribution";

type Photo = {
  id: string;
  vignette: string | null;
  nom: string | null;
  provenance: string;
  jour: string;
  jourCle: string;
  preselection: boolean;
  signalee: boolean;
  motif: string | null;
  doublonDe: string | null;
  heic: boolean;
};

type Compteurs = { toutes: number; liste: number; preselection: number; doublons: number; signalees: number };

type Props = {
  token: string;
  ecrire: boolean;
  /** La collecte est ouverte : sinon ni dépôt ni lien, la présélection reste. */
  ouverte: boolean;
  tu: boolean;
  /** L'adresse complète du lien général des participants ; un lien de contribution y ajoute `?p=`. */
  lienParticipants: string;
  preselectionMax: number | null;
  /** La fenêtre du lien de contribution (`plafondLienMax`) et le message de partage. */
  max: number;
  organisation: string;
  evenement: string;
  cloture: string;
};

/* Sur téléphone la page défile de nouveau (espace.css, 860 px) : la grille
   n'est plus une zone de défilement. */
const REQUETE_TELEPHONE = "(max-width: 860px)";

const ONGLETS: { cle: Filtre; libelle: string }[] = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "jour", libelle: "Par jour" },
  { cle: "provenance", libelle: "Par source" },
  { cle: "doublons", libelle: "Doublons" },
  { cle: "preselection", libelle: "Présélection" },
  { cle: "signalees", libelle: "Signalées" },
];

export default function Collecte(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toutes, setToutes] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);
  const [fenetreLien, setFenetreLien] = useState(false);
  const [partage, setPartage] = useState<LienPartage | null>(null);
  const [qr, setQr] = useState<LienPartage | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const version = useRef(0);
  const envoi = useFenetreEnvoi();
  const vue = useMoteur(useMoteurDepot());
  const contexte: ContexteMessage = { organisation: p.organisation, evenement: p.evenement, cloture: p.cloture, tu: p.tu };

  const charger = useCallback(
    async (page: number, f: Filtre) => {
      const v0 = version.current;
      setChargement(true);
      try {
        const rep = await fetch("/api/collectif/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: p.token, filtre: f, page }),
        });
        if (!rep.ok) throw new Error(String(rep.status));
        const json = (await rep.json()) as { photos: Photo[]; suivante: number | null; compteurs: Compteurs; sources: Source[] };
        if (v0 !== version.current) return;
        setPhotos((deja) => (page === 0 ? json.photos : [...deja, ...json.photos]));
        setSuivante(json.suivante);
        setCompteurs(json.compteurs);
        setSources(json.sources);
        setErreur(null);
      } catch {
        if (v0 === version.current) setErreur("Les photos n'ont pas pu se charger. Réessayer en rechargeant la page.");
      } finally {
        if (v0 === version.current) setChargement(false);
      }
    },
    [p.token]
  );

  function changerFiltre(f: Filtre) {
    version.current++;
    setFiltre(f);
    setPhotos([]);
    setSuivante(0);
    void charger(0, f);
  }

  /* La première page, puis la suivante quand le bas de la grille approche. */
  useEffect(() => {
    void charger(0, "toutes");
  }, [charger]);
  useEffect(() => {
    const el = fin.current;
    if (!el || suivante === null || suivante === 0 || chargement) return;
    const racine = window.matchMedia(REQUETE_TELEPHONE).matches ? null : zone.current;
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) void charger(suivante, filtre);
    }, { root: racine, rootMargin: "800px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [suivante, chargement, filtre, charger]);

  /* Des photos sont arrivées : la grille se relit quand la fenêtre d'envoi se
     ferme ou que l'envoi se termine. Rien d'arrivé, rien ne bouge (la
     position dans la grille est gardée). */
  const fermeturesVues = useRef(envoi.fermetures);
  const enCoursAvant = useRef(vue.enCours);
  const arriveesLues = useRef(vue.arrivees);
  useEffect(() => {
    const ferme = envoi.fermetures !== fermeturesVues.current;
    const fini = enCoursAvant.current > 0 && vue.enCours === 0;
    fermeturesVues.current = envoi.fermetures;
    enCoursAvant.current = vue.enCours;
    if ((ferme || fini) && vue.arrivees !== arriveesLues.current) {
      arriveesLues.current = vue.arrivees;
      version.current++;
      void charger(0, filtre);
    }
  }, [envoi.fermetures, vue.enCours, vue.arrivees, filtre, charger]);

  async function marquer(photo: Photo, corps: Record<string, unknown>) {
    const avant = photos;
    setPhotos((l) => l.map((x) => (x.id === photo.id ? { ...x, ...(corps as Partial<Photo>) } : x)));
    try {
      const rep = await fetch("/api/collectif/photos/marquer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, photoId: photo.id, ...corps }),
      });
      if (!rep.ok) throw new Error(String(rep.status));
      setCompteurs((c) =>
        c && "preselection" in corps
          ? { ...c, preselection: c.preselection + (corps.preselection ? 1 : -1) }
          : c && "signalee" in corps
            ? { ...c, signalees: c.signalees + (corps.signalee ? 1 : -1) }
            : c
      );
    } catch {
      setPhotos(avant);
      setErreur("Le changement n'a pas été enregistré. Réessayer.");
    }
  }

  /** « Tout sélectionner » / « Tout désélectionner » : toute l'édition, d'un geste. */
  async function marquerToutes(preselection: boolean) {
    setToutes(true);
    try {
      const rep = await fetch("/api/collectif/photos/marquer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, toutes: true, preselection }),
      });
      if (!rep.ok) throw new Error(String(rep.status));
      const { n } = (await rep.json()) as { n: number };
      setPhotos((l) => l.map((x) => (preselection && x.signalee ? x : { ...x, preselection })));
      setCompteurs((c) => (c ? { ...c, preselection: preselection ? c.preselection + n : 0 } : c));
      if (filtre === "preselection") changerFiltre("preselection");
    } catch {
      setErreur("Le changement n'a pas été enregistré. Réessayer.");
    } finally {
      setToutes(false);
    }
  }

  async function copier(texte: string, cle: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(cle);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setErreur("Copie impossible : ouvrir « Partager » pour lire le lien.");
    }
  }

  function lienDe(s: Source): LienPartage | null {
    if (!s.lien) return null;
    return {
      libelle: s.libelle,
      url: s.lien.cle ? `${p.lienParticipants}?p=${s.lien.cle}` : p.lienParticipants,
      plafond: s.lien.plafond,
      recues: s.n,
      general: s.lien.cle === null,
    };
  }

  const groupe = filtre === "jour" ? (x: Photo) => x.jour : filtre === "provenance" ? (x: Photo) => x.provenance : null;
  const choisies = compteurs?.preselection ?? 0;
  const choisissables = compteurs ? compteurs.toutes - compteurs.signalees : 0;

  return (
    <section className="ec-ecran ec-collecte">
      <EnTeteEcran titre="Les photos" sous={compteurs ? `${compteurs.toutes.toLocaleString("fr-FR")} reçue${compteurs.toutes > 1 ? "s" : ""}` : undefined}>
        {envoi.ouvrir && p.ouverte ? (
          <button type="button" className="ec-bouton ec-bouton--petit" onClick={envoi.ouvrir}>
            Déposer des photos
          </button>
        ) : null}
      </EnTeteEcran>

      <div className="ec-ecran-corps ec-collecte-zone">
        <div className="ec-collecte-corps">
          <div className="ec-collecte-principal">
            <nav className="ec-onglets" aria-label="Filtrer les photos">
              {ONGLETS.map((o) => (
                <button key={o.cle} type="button" className="ec-onglet" aria-pressed={filtre === o.cle} onClick={() => changerFiltre(o.cle)}>
                  {o.libelle}
                  {o.cle === "toutes" && compteurs ? ` · ${compteurs.toutes.toLocaleString("fr-FR")}` : ""}
                  {o.cle === "doublons" && compteurs ? ` · ${compteurs.doublons}` : ""}
                  {o.cle === "preselection" && compteurs ? ` · ${compteurs.preselection}` : ""}
                  {o.cle === "signalees" && compteurs ? ` · ${compteurs.signalees}` : ""}
                </button>
              ))}
            </nav>

            {p.ecrire ? (
              <div className="ec-presel">
                <span className="ec-presel-texte">
                  <strong>
                    {v("Votre présélection", "Ta présélection")} : {choisies.toLocaleString("fr-FR")}
                    {p.preselectionMax ? ` sur ${p.preselectionMax}` : ""}
                  </strong>
                  <span className="ec-note">
                    {v(
                      "Facultative. Touchez une photo pour la choisir : un bord l'entoure. Sans présélection, l'atelier choisit parmi toutes.",
                      "Facultative. Touche une photo pour la choisir : un bord l'entoure. Sans présélection, l'atelier choisit parmi toutes."
                    )}
                    {p.preselectionMax && choisies > p.preselectionMax ? ` C'est plus que les ${p.preselectionMax} prévues : l'atelier choisira parmi elles.` : ""}
                  </span>
                </span>
                <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={toutes || !compteurs || choisies >= choisissables} onClick={() => marquerToutes(true)}>
                  Tout sélectionner
                </button>
                <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={toutes || choisies === 0} onClick={() => marquerToutes(false)}>
                  Tout désélectionner
                </button>
              </div>
            ) : null}

            <div className="ec-collecte-grille ec-defile" ref={zone}>
              {erreur ? (
                <p className="ec-note ec-note--erreur" role="alert">
                  {erreur}
                </p>
              ) : null}
              {photos.length === 0 && !chargement ? (
                <div className="ec-a-venir">
                  <p className="ec-texte">
                    {filtre === "toutes"
                      ? p.ouverte
                        ? v("Aucune photo pour l'instant. Déposez les vôtres, ou partagez un lien depuis « Qui a déposé ».", "Aucune photo pour l'instant. Dépose les tiennes, ou partage un lien depuis « Qui a déposé ».")
                        : "La collecte est close, sans photo reçue."
                      : "Rien dans ce filtre."}
                  </p>
                </div>
              ) : null}
              <div className="ec-grille">
                {photos.map((ph, i) => {
                  const titre = groupe && (i === 0 || groupe(photos[i - 1]) !== groupe(ph)) ? groupe(ph) : null;
                  return (
                    <div key={ph.id} className="ec-tuile-bloc" style={{ display: "contents" }}>
                      {titre ? <h2 className="ec-grille-titre">{titre}</h2> : null}
                      <figure className={`ec-tuile${ph.preselection ? " ec-tuile--choisie" : ""}${ph.doublonDe ? " ec-tuile--doublon" : ""}`}>
                        <button
                          type="button"
                          className="ec-tuile-image"
                          aria-pressed={ph.preselection}
                          aria-label={`${ph.nom ?? "Photo"}${ph.preselection ? ", présélectionnée" : ""}`}
                          disabled={!p.ecrire}
                          onClick={() => marquer(ph, { preselection: !ph.preselection })}
                        >
                          {ph.vignette ? (
                            <img src={ph.vignette} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span className="ec-tuile-sans">{ph.heic ? "HEIC · aperçu indisponible" : ph.nom ?? "Photo"}</span>
                          )}
                        </button>
                        <figcaption className="ec-tuile-legende">
                          {ph.doublonDe ? <span className="ec-badge">Doublon</span> : null}
                          {ph.signalee ? <span className="ec-badge ec-badge--signal">À ne pas publier</span> : null}
                          {p.ecrire ? (
                            <button
                              type="button"
                              className="ec-tuile-signal"
                              onClick={() => {
                                if (ph.signalee) void marquer(ph, { signalee: false });
                                else {
                                  const motif = window.prompt("Pourquoi ne pas publier cette photo ? (facultatif)") ?? "";
                                  void marquer(ph, { signalee: true, motif });
                                }
                              }}
                            >
                              {ph.signalee ? "Annuler" : "Signaler"}
                            </button>
                          ) : null}
                        </figcaption>
                      </figure>
                    </div>
                  );
                })}
              </div>
              <div ref={fin} />
              {chargement ? <p className="ec-note">Chargement des photos…</p> : null}
              {suivante && !chargement ? (
                <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => charger(suivante, filtre)}>
                  Voir la suite
                </button>
              ) : null}
            </div>
          </div>

          <aside className="ec-collecte-cote ec-defile" aria-labelledby="ec-qui-a-depose">
            <h2 className="ec-cote-titre" id="ec-qui-a-depose">
              Qui a déposé
            </h2>
            {p.ecrire ? (
              <p className="ec-note">
                {p.ouverte ? "Chaque source avec ses photos et son lien. Double-cliquez un nom pour le changer." : "La collecte est close : les liens ne reçoivent plus de photos."}
              </p>
            ) : null}
            {sources.length ? (
              <ul className="ec-sources">
                {sources.map((s) => {
                  const lien = p.ouverte ? lienDe(s) : null;
                  return (
                    <li key={s.cle} className="ec-source">
                      <span className="ec-source-tete">
                        <NomDossier
                          token={p.token}
                          cle={s.cle}
                          nom={s.libelle}
                          renommable={p.ecrire && sourceRenommable(s)}
                          onRenomme={() => {
                            version.current++;
                            void charger(0, filtre);
                          }}
                        />
                        <span>{s.n.toLocaleString("fr-FR")}</span>
                      </span>
                      <span className="ec-note">{s.detail}</span>
                      {lien ? (
                        <span className="ec-source-gestes">
                          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => copier(lien.url, s.cle)}>
                            {copie === s.cle ? "Copié" : "Copier le lien"}
                          </button>
                          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setPartage(lien)}>
                            Partager
                          </button>
                          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setQr(lien)}>
                            QR
                          </button>
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ec-note">{chargement ? "Chargement…" : "Personne encore."}</p>
            )}
            {p.ecrire && p.ouverte ? (
              <button type="button" className="ec-bouton ec-bouton--clair ec-source-creer" onClick={() => setFenetreLien(true)}>
                Créer un lien pour quelqu&apos;un
              </button>
            ) : null}
          </aside>
        </div>
      </div>

      {fenetreLien ? (
        <FenetreLien
          token={p.token}
          max={p.max}
          contexte={contexte}
          onFermer={() => {
            setFenetreLien(false);
            version.current++;
            void charger(0, filtre);
          }}
        />
      ) : null}
      {partage ? <FenetrePartage lien={partage} contexte={contexte} onFermer={() => setPartage(null)} /> : null}
      {qr ? <FenetreQr lien={qr} contexte={contexte} onFermer={() => setQr(null)} /> : null}
    </section>
  );
}
