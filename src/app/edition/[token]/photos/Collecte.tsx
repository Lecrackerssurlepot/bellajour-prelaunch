"use client";

/* La page Photos du client (PRD §4.2, §5, maquette Collecte).

   - La grille se lit PAR PAGES (120 vignettes signées à la fois) et se
     complète en descendant : 2 000 photos ne se chargent jamais d'un coup,
     et chaque tuile hors écran ne coûte rien à peindre (content-visibility).
   - La présélection est FACULTATIVE : toucher une photo l'ajoute ou la
     retire, jamais obligé, « Laisser l'atelier choisir » le dit.
   - Signaler une photo (« à ne pas publier ») se voit côté atelier.
   - Le dépôt du responsable s'ouvre SUR PLACE (panneau), et son moteur vit
     dans la coquille : on peut quitter la page pendant l'envoi.
   - L'équipe voit tout, sans bouton qui écrive. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Filtre } from "@/lib/collectif/grille";
import { useMoteurDepot } from "../../_composants/depot/DepotContexte";
import { useMoteur, fichiersDuDepot } from "../../_composants/depot/useMoteur";

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

type Lien = { libelle: string; chemin: string; sansPlafond: boolean };

type Props = {
  token: string;
  ecrire: boolean;
  tu: boolean;
  lienParticipants: string;
  preselectionMax: number | null;
  origine: string;
  liens: Lien[];
};

const ONGLETS: { cle: Filtre; libelle: string }[] = [
  { cle: "toutes", libelle: "Toutes" },
  { cle: "jour", libelle: "Par jour" },
  { cle: "provenance", libelle: "Par provenance" },
  { cle: "doublons", libelle: "Doublons" },
  { cle: "preselection", libelle: "Ma présélection" },
  { cle: "signalees", libelle: "Signalées" },
];

const PROVENANCES = [
  { cle: "organisateur", libelle: "Mes photos" },
  { cle: "photographe", libelle: "Le photographe" },
  { cle: "participant", libelle: "Un participant" },
  { cle: "autre", libelle: "Autre source" },
];

export default function Collecte(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [deposants, setDeposants] = useState<{ libelle: string; n: number }[]>([]);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [panneau, setPanneau] = useState(false);
  const [copie, setCopie] = useState<string | null>(null);
  const [liens, setLiens] = useState<Lien[]>(p.liens);
  const fin = useRef<HTMLDivElement>(null);
  const version = useRef(0);

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
        const json = (await rep.json()) as { photos: Photo[]; suivante: number | null; compteurs: Compteurs; deposants: { libelle: string; n: number }[] };
        if (v0 !== version.current) return;
        setPhotos((deja) => (page === 0 ? json.photos : [...deja, ...json.photos]));
        setSuivante(json.suivante);
        setCompteurs(json.compteurs);
        setDeposants(json.deposants);
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
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) void charger(suivante, filtre);
    }, { rootMargin: "800px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [suivante, chargement, filtre, charger]);

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

  async function copier(texte: string, cle: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(cle);
      setTimeout(() => setCopie(null), 2000);
    } catch {
      setErreur("Copie impossible : sélectionner le lien à la main.");
    }
  }

  const groupe = filtre === "jour" ? (x: Photo) => x.jour : filtre === "provenance" ? (x: Photo) => x.provenance : null;

  return (
    <section className="ec-page ec-collecte">
      <div className="ec-collecte-tete">
        <div>
          <p className="ec-surtitre">{compteurs ? `${compteurs.toutes} photo${compteurs.toutes > 1 ? "s" : ""} reçue${compteurs.toutes > 1 ? "s" : ""}` : "Les photos"}</p>
          <h1 className="ec-h1">Les photos</h1>
        </div>
        <div className="ec-actions">
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => copier(p.lienParticipants, "participants")}>
            {copie === "participants" ? "Copié" : "Copier le lien participants"}
          </button>
          {p.ecrire ? (
            <button type="button" className="ec-bouton" onClick={() => setPanneau(true)}>
              Déposer des photos
            </button>
          ) : null}
        </div>
      </div>

      <nav className="ec-onglets" aria-label="Filtrer les photos">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            className="ec-onglet"
            aria-pressed={filtre === o.cle}
            onClick={() => changerFiltre(o.cle)}
          >
            {o.libelle}
            {o.cle === "doublons" && compteurs ? ` · ${compteurs.doublons}` : ""}
            {o.cle === "preselection" && compteurs ? ` · ${compteurs.preselection}` : ""}
            {o.cle === "signalees" && compteurs ? ` · ${compteurs.signalees}` : ""}
          </button>
        ))}
      </nav>

      <div className="ec-collecte-corps">
        <div>
          {p.ecrire ? (
            <p className="ec-note">
              {v(
                "Facultatif : touchez une photo pour l'ajouter à votre présélection. Sans présélection, l'atelier choisit parmi toutes les photos.",
                "Facultatif : touche une photo pour l'ajouter à ta présélection. Sans présélection, l'atelier choisit parmi toutes les photos."
              )}
            </p>
          ) : null}
          {erreur ? <p className="ec-note ec-note--erreur" role="alert">{erreur}</p> : null}
          {photos.length === 0 && !chargement ? (
            <div className="ec-a-venir">
              <p className="ec-texte">
                {filtre === "toutes"
                  ? v("Aucune photo pour l'instant. Partagez le lien participants, ou déposez les vôtres.", "Aucune photo pour l'instant. Partage le lien participants, ou dépose les tiennes.")
                  : "Rien dans ce filtre."}
              </p>
            </div>
          ) : null}
          <div className="ec-grille">
            {photos.map((ph, i) => {
              const titre = groupe && (i === 0 || groupe(photos[i - 1]) !== groupe(ph)) ? groupe(ph) : null;
              return (
                <div key={ph.id} className="ec-tuile-bloc" style={titre ? { gridColumn: "1 / -1", display: "contents" } : { display: "contents" }}>
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

        <aside className="ec-collecte-cote">
          <section className="ec-carte">
            <div className="ec-carte-tete">
              <span>{v("Votre présélection · facultative", "Ta présélection · facultative")}</span>
            </div>
            <p className="ec-texte">
              <strong>{compteurs?.preselection ?? 0}</strong>
              {p.preselectionMax ? ` sur ${p.preselectionMax} photos` : " photos"}
            </p>
            <p className="ec-note">
              {v(
                "Rien d'obligatoire : laissez l'atelier choisir, il compose avec toutes les photos reçues.",
                "Rien d'obligatoire : laisse l'atelier choisir, il compose avec toutes les photos reçues."
              )}
            </p>
          </section>
          <section className="ec-carte">
            <div className="ec-carte-tete">
              <span>Qui a déposé</span>
            </div>
            {deposants.length ? (
              <ul className="ec-lignes">
                {deposants.slice(0, 8).map((d) => (
                  <li key={d.libelle}>
                    <span>{d.libelle}</span>
                    <strong>{d.n}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ec-note">Personne encore.</p>
            )}
          </section>
          {p.ecrire ? (
            <LiensProvenance token={p.token} origine={p.origine} liens={liens} onCree={(l) => setLiens((x) => [...x, l])} copie={copie} copier={copier} tu={p.tu} />
          ) : null}
        </aside>
      </div>

      {panneau ? <PanneauDepot tu={p.tu} fermer={() => { setPanneau(false); changerFiltre(filtre); }} /> : null}
    </section>
  );
}

/* ─────────────────────────── le panneau de dépôt ─────────────────────────── */

function PanneauDepot({ tu, fermer }: { tu: boolean; fermer: () => void }) {
  const moteur = useMoteurDepot();
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [provenance, setProvenance] = useState("organisateur");
  const [libelle, setLibelle] = useState("");
  const [survol, setSurvol] = useState(false);
  const fichiers = useRef<HTMLInputElement>(null);
  const dossier = useRef<HTMLInputElement>(null);

  /* `webkitdirectory` n'est pas typé par React : posé à la main. */
  useEffect(() => {
    dossier.current?.setAttribute("webkitdirectory", "");
  }, []);

  if (!moteur) return null;
  const regler = () => moteur.definirProvenance({ type: provenance, libelle });
  const ajouter = (liste: Iterable<File>) => {
    regler();
    moteur.ajouter(liste);
  };
  const recues = vue.arrivees + vue.dejaLa;

  return (
    <div className="ec-panneau-voile" role="presentation" onClick={fermer}>
      <div className="ec-panneau" role="dialog" aria-modal="true" aria-labelledby="ec-depot-titre" onClick={(e) => e.stopPropagation()}>
        <div className="ec-panneau-tete">
          <h2 className="ec-h2" id="ec-depot-titre">
            Déposer des photos
          </h2>
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={fermer}>
            Fermer
          </button>
        </div>

        <fieldset className="ec-fieldset">
          <legend className="ec-note">1. D&apos;où viennent ces photos ?</legend>
          <div className="ec-puces">
            {PROVENANCES.map((o) => (
              <label key={o.cle} className={`ec-puce${provenance === o.cle ? " ec-puce--active" : ""}`}>
                <input type="radio" name="provenance" value={o.cle} checked={provenance === o.cle} onChange={() => setProvenance(o.cle)} hidden />
                {o.libelle}
              </label>
            ))}
          </div>
          {provenance === "participant" || provenance === "autre" || provenance === "photographe" ? (
            <input
              className="ec-champ"
              placeholder={provenance === "participant" ? "Son nom" : provenance === "photographe" ? "Son nom (facultatif)" : "La source (ex. l'agence)"}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
            />
          ) : null}
        </fieldset>

        <div
          className={`ec-depose${survol ? " ec-depose--survol" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setSurvol(false);
            ajouter(await fichiersDuDepot(e.dataTransfer));
          }}
        >
          <p className="ec-texte">{v("2. Glissez des photos ou un dossier entier ici", "2. Glisse des photos ou un dossier entier ici")}</p>
          <div className="ec-actions">
            <button type="button" className="ec-bouton" onClick={() => fichiers.current?.click()}>
              Choisir des photos
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => dossier.current?.click()}>
              Choisir un dossier
            </button>
          </div>
          <p className="ec-note">JPEG, HEIC, PNG · sans plafond par personne pour {v("vous", "toi")} · un fichier déjà envoyé n&apos;est jamais renvoyé</p>
          <input ref={fichiers} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
          <input ref={dossier} type="file" multiple hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
        </div>

        {vue.total ? (
          <div className="ec-carte" role="status" aria-live="polite">
            <p className="ec-texte">
              <strong>{recues}</strong> sur {vue.total} arrivée{recues > 1 ? "s" : ""}
              {vue.dejaLa ? ` (dont ${vue.dejaLa} déjà là)` : ""}
              {vue.enCours ? ` · ${vue.enCours} en cours` : " · terminé"}
            </p>
            <div className="ec-dp-barre-espace" aria-hidden="true">
              <div style={{ width: `${vue.total ? Math.round(((vue.total - vue.enCours) / vue.total) * 100) : 0}%` }} />
            </div>
            <p className="ec-note">
              {v("Vous pouvez naviguer dans l'espace pendant l'envoi. Gardez l'onglet ouvert : les photos déjà arrivées sont gardées.", "Tu peux naviguer dans l'espace pendant l'envoi. Garde l'onglet ouvert : les photos déjà arrivées sont gardées.")}
            </p>
            {vue.horsLigne ? <p className="ec-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
            {vue.raisons.map((r) => <p key={r} className="ec-note ec-note--erreur">{r}</p>)}
            {vue.erreurs ? <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => moteur.reessayer()}>Réessayer ({vue.erreurs})</button> : null}
            {vue.ignores ? <p className="ec-note">{vue.ignores} fichier(s) ignoré(s) : ce ne sont pas des photos.</p> : null}
            {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ─────────────────────────── les liens de provenance ─────────────────────────── */

function LiensProvenance(p: {
  token: string;
  origine: string;
  liens: Lien[];
  onCree: (l: Lien) => void;
  copie: string | null;
  copier: (t: string, cle: string) => void;
  tu: boolean;
}) {
  const [libelle, setLibelle] = useState("");
  const [sansPlafond, setSansPlafond] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/collectif/provenances", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, type: "photographe", libelle, sansPlafond }),
      });
      const json = (await rep.json().catch(() => ({}))) as { chemin?: string; message?: string };
      if (!rep.ok || !json.chemin) {
        setMessage(json.message ?? `Lien non créé (erreur ${rep.status}).`);
        return;
      }
      p.onCree({ libelle, chemin: json.chemin, sansPlafond });
      setLibelle("");
    } catch {
      setMessage("Le réseau n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="ec-carte">
      <div className="ec-carte-tete">
        <span>Les photos sont chez quelqu&apos;un d&apos;autre ?</span>
      </div>
      <p className="ec-note">Un lien à son nom, par exemple pour le photographe. Ses photos se rangent sous son nom.</p>
      {p.liens.map((l) => (
        <div key={l.chemin} className="ec-lien-ligne">
          <span className="ec-texte" style={{ flex: 1, minWidth: 0 }}>
            {l.libelle}
            {l.sansPlafond ? " · sans plafond" : ""}
          </span>
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => p.copier(`${p.origine}${l.chemin}`, l.chemin)}>
            {p.copie === l.chemin ? "Copié" : "Copier"}
          </button>
        </div>
      ))}
      <form onSubmit={creer} className="ec-curseur">
        <input className="ec-champ" placeholder="Nom (ex. le photographe)" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
        <label className="ec-note">
          <input type="checkbox" checked={sansPlafond} onChange={(e) => setSansPlafond(e.target.checked)} /> Sans plafond par personne
        </label>
        <button type="submit" className="ec-bouton ec-bouton--clair" disabled={envoi || !libelle.trim()}>
          Créer le lien
        </button>
        {message ? <p className="ec-note ec-note--erreur">{message}</p> : null}
      </form>
    </section>
  );
}
