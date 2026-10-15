"use client";

/* La page Photos du client (T-152, maquettes « Photos rangées en dossiers » et
   « Les liens », validées par Mathias le 14/10 au soir ; simplifiée le 15/10).

   Deux onglets, un seul écran :
   - LES PHOTOS : les grands chiffres en tête, puis des RAYONS (Toutes les
     photos, Ma sélection, Vos dossiers, Les participants, L'atelier) au lieu
     de la grande colonne d'avant (archive/photos-colonne-2026-10) : avec
     beaucoup de liens, elle devenait longue et peu lisible. « Vos dossiers »
     et « Les participants » s'ouvrent en VIGNETTES, comme des albums (la
     dernière photo en couverture) ; un dossier montre ses sous-dossiers en
     petites vignettes puis ses photos, un lien ses personnes en pastilles.
     Un fil d'Ariane dit où l'on est. On range un dossier en le glissant sur
     un autre (sur « Vos dossiers » du fil pour l'en sortir), on le renomme au
     crayon. Une photo choisie : un bord et une pastille cochée.
   - LES LIENS : une carte par lien, chaque personne avec sa barre, un seul
     « Partager » et un menu (le nom, le nombre de photos, supprimer).

   La grille se lit PAR PAGES (120 vignettes signées à la fois) et se complète
   en descendant ; le chargement par pages observe SA zone de défilement
   (`root` de l'IntersectionObserver), nul sur téléphone. L'équipe voit tout,
   sans bouton qui écrive et sans aucun lien. */

import { useCallback, useEffect, useRef, useState } from "react";
import { cheminDuNoeud, cleResp, DOSSIER_RESPONSABLE, estVueEnsemble, noeudDe, rayonDe, type Arbre, type Noeud } from "@/lib/collectif/dossiers";
import { CURSEUR_LIEN, RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import { useFenetreEnvoi, useMoteurDepot } from "../../_composants/depot/DepotContexte";
import { useMoteur } from "../../_composants/depot/useMoteur";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import FenetreLien, { FenetrePartage, type ContexteMessage, type LienPartage } from "../../_composants/LienContribution";
import QrCode from "../../_composants/QrCode";

type Photo = {
  id: string;
  vignette: string | null;
  nom: string | null;
  jour: string;
  jourCle: string;
  preselection: boolean;
  doublonDe: string | null;
  heic: boolean;
};

type Compteurs = { dossier: number; liste: number; doublons: number; selection: number; choisissables: number };
type Stats = { photos: number; personnes: number; doublons: number; enCours: number };
type Personne = { nom: string; n: number };
type LienDetail = { id: string; cle: string; nom: string; plafond: string; plafondNombre: number | null; sansPlafond: boolean; n: number; personnes: Personne[] };
type Liens = { general: { nom: string; plafond: string; n: number; personnes: Personne[] }; liens: LienDetail[]; reste: number | null };
type Vue = "toutes" | "jour" | "doublons";
type Onglet = "photos" | "liens";

type Props = {
  token: string;
  ecrire: boolean;
  /** La collecte est ouverte : sinon ni dépôt ni lien, la sélection reste. */
  ouverte: boolean;
  tu: boolean;
  /** L'adresse complète du lien général des participants ; un lien de contribution y ajoute `?p=`. */
  lienParticipants: string;
  preselectionMax: number | null;
  /** Le plus haut plafond d'un lien (`plafondLienMax`) et le plafond actuel du lien général. */
  max: number;
  plafondGeneral: number | null;
  organisation: string;
  evenement: string;
  cloture: string;
  /** `?dossier=` (depuis le tableau de bord) et `?onglet=liens`. */
  dossierInitial: string;
  ongletInitial: Onglet;
};

const REQUETE_TELEPHONE = "(max-width: 860px)";
const TRACE = {
  tout: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  selection: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  lien: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  personne: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  atelier: "M4 20V8l8-4 8 4v12M9 20v-6h6v6",
  crayon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
};

function Icone({ trace }: { trace: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={trace} />
    </svg>
  );
}

const nombre = (n: number) => n.toLocaleString("fr-FR");

/** Les initiales d'une personne, pour sa pastille (« Léa Martin » → LM, « Sans nom » → ?). */
function initialesDe(nom: string): string {
  if (nom === "Sans nom") return "?";
  const mots = nom.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (mots.length === 0) return "?";
  return (mots.length === 1 ? mots[0].slice(0, 2) : mots[0][0] + mots[1][0]).toUpperCase();
}

export default function Collecte(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [onglet, setOnglet] = useState<Onglet>(p.ecrire ? p.ongletInitial : "photos");
  const [dossier, setDossier] = useState(p.dossierInitial);
  const [vue, setVue] = useState<Vue>("toutes");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [arbre, setArbre] = useState<Arbre | null>(null);
  const [couvertures, setCouvertures] = useState<Record<string, string>>({});
  const [liens, setLiens] = useState<Liens | null>(null);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [edite, setEdite] = useState<{ cle: string; valeur: string } | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const [fenetreLien, setFenetreLien] = useState(false);
  const [partage, setPartage] = useState<LienPartage | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [renommer, setRenommer] = useState<{ id: string; nom: string } | null>(null);
  const [plafond, setPlafond] = useState<{ id: string | null; nom: string; valeur: number; sansLimite: boolean } | null>(null);
  const [supprimer, setSupprimer] = useState<{ id: string; nom: string; n: number } | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const version = useRef(0);
  const envoi = useFenetreEnvoi();
  const moteur = useMoteur(useMoteurDepot());
  const contexte: ContexteMessage = { organisation: p.organisation, evenement: p.evenement, cloture: p.cloture, tu: p.tu };

  const charger = useCallback(
    async (page: number, d: string, vu: Vue) => {
      const v0 = version.current;
      setChargement(true);
      try {
        const rep = await fetch("/api/collectif/photos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: p.token, dossier: d, vue: vu, page }),
        });
        if (!rep.ok) throw new Error(String(rep.status));
        const json = (await rep.json()) as {
          photos: Photo[];
          suivante: number | null;
          compteurs: Compteurs;
          stats: Stats;
          arbre: Arbre;
          couvertures?: Record<string, string>;
          liens: Liens | null;
        };
        if (v0 !== version.current) return;
        setPhotos((deja) => (page === 0 ? json.photos : [...deja, ...json.photos]));
        setSuivante(json.suivante);
        setCompteurs(json.compteurs);
        setStats(json.stats);
        setArbre(json.arbre);
        if (page === 0) setCouvertures(json.couvertures ?? {});
        setLiens(json.liens);
        setErreur(null);
      } catch {
        if (v0 === version.current) setErreur("Les photos n'ont pas pu se charger. Réessayer en rechargeant la page.");
      } finally {
        if (v0 === version.current) setChargement(false);
      }
    },
    [p.token]
  );

  /* L'adresse suit le dossier ouvert et l'onglet : recharger la page, ou revenir en arrière
     depuis une autre page, rouvre le même endroit (replaceState : rien ne s'empile). */
  function garderAdresse(d: string, o: Onglet) {
    const q = o === "liens" ? "?onglet=liens" : d === "tout" ? "" : `?dossier=${encodeURIComponent(d)}`;
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
  }
  function changerOnglet(o: Onglet) {
    setOnglet(o);
    garderAdresse(dossier, o);
  }
  function ouvrir(d: string, vu: Vue = vue) {
    version.current++;
    setDossier(d);
    setVue(vu);
    setPhotos([]);
    setSuivante(0);
    setOnglet("photos");
    garderAdresse(d, "photos");
    void charger(0, d, vu);
  }
  const relire = () => {
    version.current++;
    void charger(0, dossier, vue);
  };

  useEffect(() => {
    void charger(0, p.dossierInitial, "toutes");
  }, [charger, p.dossierInitial]);
  useEffect(() => {
    const el = fin.current;
    if (!el || suivante === null || suivante === 0 || chargement) return;
    const racine = window.matchMedia(REQUETE_TELEPHONE).matches ? null : zone.current;
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) void charger(suivante, dossier, vue);
    }, { root: racine, rootMargin: "800px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [suivante, chargement, dossier, vue, charger]);

  /* Des photos sont arrivées : la grille se relit quand la fenêtre d'envoi se
     ferme ou que l'envoi se termine. Rien d'arrivé, rien ne bouge. */
  const fermeturesVues = useRef(envoi.fermetures);
  const enCoursAvant = useRef(moteur.enCours);
  const arriveesLues = useRef(moteur.arrivees);
  useEffect(() => {
    const ferme = envoi.fermetures !== fermeturesVues.current;
    const fini = enCoursAvant.current > 0 && moteur.enCours === 0;
    fermeturesVues.current = envoi.fermetures;
    enCoursAvant.current = moteur.enCours;
    if ((ferme || fini) && moteur.arrivees !== arriveesLues.current) {
      arriveesLues.current = moteur.arrivees;
      version.current++;
      void charger(0, dossier, vue);
    }
  }, [envoi.fermetures, moteur.enCours, moteur.arrivees, dossier, vue, charger]);

  async function appeler(url: string, corps: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, ...corps }) });
      const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
      if (!rep.ok) {
        setErreur(typeof json.message === "string" ? json.message : `Non enregistré (erreur ${rep.status}).`);
        return null;
      }
      return json;
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
      return null;
    } finally {
      setOccupe(false);
    }
  }

  async function basculer(photo: Photo) {
    const avant = photos;
    const choisie = !photo.preselection;
    setPhotos((l) => l.map((x) => (x.id === photo.id ? { ...x, preselection: choisie } : x)));
    setCompteurs((c) => (c ? { ...c, selection: c.selection + (choisie ? 1 : -1) } : c));
    if (!(await appeler("/api/collectif/photos/marquer", { photoId: photo.id, preselection: choisie }))) {
      setPhotos(avant);
      setCompteurs((c) => (c ? { ...c, selection: c.selection + (choisie ? -1 : 1) } : c));
    }
  }

  async function toutLeDossier(preselection: boolean) {
    if (await appeler("/api/collectif/photos/marquer", { toutes: true, preselection, dossier })) relire();
  }

  /* ── Ranger et renommer les dossiers ── */
  const nouvelleCle = (apres: unknown) => (typeof apres === "string" ? cleResp("organisateur", apres === DOSSIER_RESPONSABLE ? "" : apres) : null);
  async function ranger(cle: string, dans: string | null) {
    setGlisse(null);
    setSurvol(null);
    if (dans === cle) return;
    const json = await appeler("/api/collectif/dossiers", { cle, dans });
    if (!json) return;
    if (dossier === cle) ouvrir(nouvelleCle(json.apres) ?? "tout");
    else relire();
  }
  async function garderNom() {
    if (!edite) return;
    const { cle, valeur } = edite;
    setEdite(null);
    const n = arbre ? noeudDe(arbre, cle) : undefined;
    if (!valeur.trim() || !n || valeur.trim() === n.nom) return;
    const json = await appeler("/api/collectif/dossiers", { cle, nom: valeur });
    if (!json) return;
    if (dossier === cle && cle.startsWith("resp:")) ouvrir(nouvelleCle(json.apres) ?? "tout");
    else relire();
  }

  /* ── Les rayons, les dossiers, les liens (15/10 : plus de grande colonne) ── */
  const rayon = rayonDe(dossier);
  const ensemble = estVueEnsemble(dossier);
  const courant = arbre ? noeudDe(arbre, dossier) : undefined;
  const chemin = arbre && dossier.startsWith("resp:") ? cheminDuNoeud(arbre, dossier) : null;
  const parentResp = arbre && dossier.startsWith("resp:") ? arbre.vous.find((h) => h.enfants.some((e) => e.cle === dossier)) : undefined;
  const lienDuDossier = !arbre
    ? undefined
    : dossier.startsWith("pers:")
      ? arbre.liens.find((l) => l.enfants.some((e) => e.cle === dossier))
      : dossier.startsWith("lien:") || dossier === "participants"
        ? courant
        : undefined;
  /* Une édition sans aucune photo : pas de rayons à zéro, un accueil avec les deux gestes. */
  const vide = stats?.photos === 0;
  const totalVous = arbre ? arbre.vous.reduce((n, h) => n + h.n, 0) : 0;
  const totalLiens = arbre ? arbre.liens.reduce((n, l) => n + l.n, 0) : 0;
  const nomVous = p.ecrire ? v("Vos dossiers", "Tes dossiers") : "Les dossiers du responsable";
  const titre =
    dossier === "tout" ? "Toutes les photos" : dossier === "selection" ? "Ma sélection" : dossier === "vous" ? nomVous : dossier === "liens" ? "Les participants" : courant?.nom ?? "Toutes les photos";
  /* Le fil d'Ariane : d'où l'on vient, chaque étape cliquable. */
  const fil: { cle: string; nom: string }[] = [];
  if (rayon === "vous" && !ensemble) {
    fil.push({ cle: "vous", nom: nomVous });
    if (parentResp) fil.push({ cle: parentResp.cle, nom: parentResp.nom });
  } else if (rayon === "liens" && !ensemble) {
    fil.push({ cle: "liens", nom: "Les participants" });
    if (dossier.startsWith("pers:") && lienDuDossier) fil.push({ cle: lienDuDossier.cle, nom: lienDuDossier.nom });
  }
  const sousDossiers = dossier.startsWith("resp:") ? (courant?.enfants ?? []) : [];
  const personnes = lienDuDossier && lienDuDossier.enfants.length > 1 ? lienDuDossier.enfants : [];
  const sousGlisse = Boolean(glisse && arbre?.vous.some((h) => h.enfants.some((x) => x.cle === glisse)));

  /* Glisser un dossier sur un autre (le ranger dedans) ou sur « Vos dossiers » du fil (l'en sortir). */
  const propsGlisser = (n: Noeud) =>
    p.ecrire && n.deplacable
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.dataTransfer.setData("text/plain", n.cle);
            e.dataTransfer.effectAllowed = "move";
            setGlisse(n.cle);
          },
          onDragEnd: () => {
            setGlisse(null);
            setSurvol(null);
          },
        }
      : {};
  const propsRecevoir = (cible: string, accepte: boolean) =>
    p.ecrire && accepte && glisse !== null && glisse !== cible
      ? {
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            setSurvol(cible);
          },
          onDragLeave: () => setSurvol((x) => (x === cible ? null : x)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            if (glisse) void ranger(glisse, cible === "vous" ? null : cible);
          },
        }
      : {};

  function champNom(cle: string) {
    return (
      <input
        className="ec-champ ec-ph-nom-champ"
        value={edite?.valeur ?? ""}
        maxLength={80}
        autoFocus
        aria-label="Nouveau nom du dossier"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setEdite({ cle, valeur: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void garderNom();
          } else if (e.key === "Escape") {
            setEdite(null);
          }
        }}
        onBlur={() => void garderNom()}
      />
    );
  }

  /* Un dossier ou un lien en vignette, comme un album : sa dernière photo en couverture. */
  function album(n: Noeud, sous: string, trace: string, petit = false) {
    const couv = couvertures[n.cle];
    const cible = survol === n.cle && glisse !== null && glisse !== n.cle && n.accueille;
    return (
      <div
        key={n.cle}
        className={`ec-ph-album${petit ? " ec-ph-album--petit" : ""}${cible ? " ec-ph-album--cible" : ""}${n.n === 0 ? " ec-ph-album--vide" : ""}`}
        {...propsRecevoir(n.cle, n.accueille)}
      >
        <button type="button" className="ec-ph-album-couv" onClick={() => ouvrir(n.cle, "toutes")} aria-label={`Ouvrir « ${n.nom} »`} {...propsGlisser(n)}>
          {couv ? <img src={couv} alt="" loading="lazy" decoding="async" /> : <Icone trace={trace} />}
          {n.n ? <span className="ec-ph-album-n">{nombre(n.n)}</span> : null}
        </button>
        <span className="ec-ph-album-texte">
          {edite?.cle === n.cle ? (
            champNom(n.cle)
          ) : (
            <button type="button" className="ec-ph-album-nom" onClick={() => ouvrir(n.cle, "toutes")}>
              {n.nom}
            </button>
          )}
          <span className="ec-note">{sous}</span>
        </span>
        {p.ecrire && n.renommable && edite?.cle !== n.cle ? (
          <button type="button" className="ec-ph-album-renommer" aria-label={`Changer le nom de « ${n.nom} »`} title="Changer le nom" onClick={() => setEdite({ cle: n.cle, valeur: n.nom })}>
            <Icone trace={TRACE.crayon} />
          </button>
        ) : null}
      </div>
    );
  }
  const photosDe = (n: number) => `${nombre(n)} photo${n > 1 ? "s" : ""}`;
  /* Le nombre est sur la couverture (la pastille) : la ligne dit ce qu'il y a DEDANS. */
  const sousDossier = (n: Noeud) => (n.enfants.length ? `${n.enfants.length} sous-dossier${n.enfants.length > 1 ? "s" : ""}` : photosDe(n.n));
  const sousLien = (n: Noeud) => (n.n ? (n.enfants.length > 1 ? `${n.enfants.length} personnes` : photosDe(n.n)) : "Rien reçu pour l'instant");
  function rayonBouton(cle: "tout" | "selection" | "vous" | "liens" | "atelier", nom: string, trace: string, n: number | null, apres = "") {
    return (
      <button type="button" className="ec-ph-rayon" aria-pressed={rayon === cle} onClick={() => ouvrir(cle, "toutes")}>
        <Icone trace={trace} />
        {nom}
        {n !== null ? <span className="ec-ph-rayon-n">{nombre(n)}{apres}</span> : null}
      </button>
    );
  }

  /* ── Les liens ── */
  const lienDe = (nom: string, cle: string | null, plafondTexte: string, n: number): LienPartage => ({
    libelle: nom,
    url: cle ? `${p.lienParticipants}?p=${cle}` : p.lienParticipants,
    plafond: plafondTexte,
    recues: n,
    general: cle === null,
  });
  const nbLiens = (liens?.liens.length ?? 0) + 1;
  const maxPlafond = liens?.reste !== null && liens?.reste !== undefined ? Math.max(1, Math.min(p.max, liens.reste)) : p.max;

  return (
    <section className="ec-ecran ec-collecte">
      <EnTeteEcran titre="Les photos" sous={stats ? `${nombre(stats.photos)} reçue${stats.photos > 1 ? "s" : ""}` : undefined}>
        {p.ecrire ? (
          <nav className="ec-ph-onglets" aria-label="Photos ou liens">
            <button type="button" aria-pressed={onglet === "photos"} onClick={() => changerOnglet("photos")}>
              Les photos
            </button>
            <button type="button" aria-pressed={onglet === "liens"} onClick={() => changerOnglet("liens")}>
              Les liens · {nbLiens}
            </button>
          </nav>
        ) : null}
        {onglet === "photos" && envoi.ouvrir && p.ouverte ? (
          <button
            type="button"
            className="ec-bouton ec-bouton--petit"
            onClick={() => envoi.ouvrir?.({ dossier: chemin && courant?.cle.startsWith("resp:organisateur:") ? chemin : null })}
          >
            Déposer des photos
          </button>
        ) : null}
        {onglet === "liens" && p.ouverte ? (
          <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => setFenetreLien(true)}>
            Créer un lien
          </button>
        ) : null}
      </EnTeteEcran>

      {erreur && !supprimer ? (
        <p className="ec-note ec-note--erreur ec-ph-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {onglet === "photos" ? (
        <>
          {stats ? (
            <div className="ec-ph-chiffres">
              <span className="ec-ph-chiffre">
                <strong>{nombre(stats.photos)}</strong> photos reçues
              </span>
              <span className="ec-ph-chiffre">
                <strong>{nombre(stats.personnes)}</strong> personne{stats.personnes > 1 ? "s" : ""}
              </span>
              <span className="ec-ph-chiffre">
                <strong>{nombre(stats.doublons)}</strong> doublon{stats.doublons > 1 ? "s" : ""} repéré{stats.doublons > 1 ? "s" : ""}
              </span>
              <span className="ec-ph-chiffres-fin">
                {stats.enCours ? <span>{nombre(stats.enCours)} en cours d&apos;arrivée</span> : null}
                {p.cloture ? <span className="ec-note">{p.ouverte ? `Clôture le ${p.cloture}` : `Collecte close le ${p.cloture}`}</span> : null}
              </span>
            </div>
          ) : null}


          <div className="ec-ph-corps">
            <div className={vide && dossier === "tout" ? "ec-ph-principal ec-ph-principal--vide" : "ec-ph-principal"}>
              {!vide ? (
              <nav className="ec-ph-rayons" aria-label="Ranger les photos">
                {rayonBouton("tout", "Toutes les photos", TRACE.tout, stats?.photos ?? null)}
                {p.ecrire || (compteurs?.selection ?? 0) > 0
                  ? rayonBouton("selection", "Ma sélection", TRACE.selection, compteurs?.selection ?? 0, p.preselectionMax ? ` sur ${p.preselectionMax}` : "")
                  : null}
                {arbre && (arbre.vous.length || p.ecrire) ? rayonBouton("vous", nomVous, TRACE.dossier, totalVous) : null}
                {arbre?.liens.length ? rayonBouton("liens", "Les participants", TRACE.lien, totalLiens) : null}
                {arbre?.atelier ? rayonBouton("atelier", "L'atelier", TRACE.atelier, arbre.atelier.n) : null}
              </nav>
              ) : null}
              <div className="ec-ph-tete">
                <span className="ec-ph-titres">
                  {fil.length ? (
                    <nav className="ec-ph-fil" aria-label={v("Où vous êtes", "Où tu es")}>
                      {fil.map((f) => (
                        <span key={f.cle} className="ec-ph-fil-etape">
                          <button
                            type="button"
                            className={`ec-ph-lien${survol === f.cle && f.cle === "vous" && sousGlisse ? " ec-ph-fil--cible" : ""}`}
                            onClick={() => ouvrir(f.cle, "toutes")}
                            {...propsRecevoir(f.cle, f.cle === "vous" && sousGlisse)}
                          >
                            {f.nom}
                          </button>
                          <span aria-hidden="true">›</span>
                        </span>
                      ))}
                    </nav>
                  ) : null}
                  {edite?.cle === dossier ? (
                    champNom(dossier)
                  ) : (
                    <strong
                      className="ec-ph-titre"
                      title={p.ecrire && courant?.renommable ? "Double-cliquez pour changer le nom" : undefined}
                      onDoubleClick={() => p.ecrire && courant?.renommable && setEdite({ cle: courant.cle, valeur: courant.nom })}
                    >
                      {titre}
                      {p.ecrire && courant?.renommable ? (
                        <button type="button" className="ec-ph-album-renommer ec-ph-titre-renommer" aria-label={`Changer le nom de « ${courant.nom} »`} title="Changer le nom" onClick={() => setEdite({ cle: courant.cle, valeur: courant.nom })}>
                          <Icone trace={TRACE.crayon} />
                        </button>
                      ) : null}
                    </strong>
                  )}
                  <span className="ec-note">
                    {dossier === "vous"
                      ? `${arbre?.vous.length ?? 0} dossier${(arbre?.vous.length ?? 0) > 1 ? "s" : ""} · ${photosDe(totalVous)}`
                      : dossier === "liens"
                        ? `${arbre?.liens.length ?? 0} lien${(arbre?.liens.length ?? 0) > 1 ? "s" : ""} · ${photosDe(totalLiens)}`
                        : compteurs
                          ? photosDe(compteurs.dossier)
                          : ""}
                    {dossier === "selection" && p.preselectionMax ? ` · ${p.preselectionMax} prévues, facultatif` : ""}
                  </span>
                </span>
                {!ensemble && !vide ? (
                  <span className="ec-ph-vues" role="group" aria-label="Afficher">
                    <button type="button" className="ec-onglet" aria-pressed={vue === "toutes"} onClick={() => ouvrir(dossier, "toutes")}>
                      Toutes
                    </button>
                    <button type="button" className="ec-onglet" aria-pressed={vue === "jour"} onClick={() => ouvrir(dossier, "jour")}>
                      Par jour
                    </button>
                    <button type="button" className="ec-onglet" aria-pressed={vue === "doublons"} onClick={() => ouvrir(dossier, "doublons")}>
                      Doublons{compteurs ? ` · ${compteurs.doublons}` : ""}
                    </button>
                  </span>
                ) : null}
              </div>
              {p.ecrire && !ensemble && !vide ? (
                <div className="ec-ph-aide-selection">
                  <span>{v("Touchez une photo pour l'ajouter à votre sélection (facultatif).", "Touche une photo pour l'ajouter à ta sélection (facultatif).")}</span>
                  {dossier === "selection" ? (
                    compteurs?.selection ? (
                      <button type="button" className="ec-ph-lien" disabled={occupe} onClick={() => toutLeDossier(false)}>
                        Vider la sélection
                      </button>
                    ) : null
                  ) : compteurs?.choisissables ? (
                    <button type="button" className="ec-ph-lien" disabled={occupe} onClick={() => toutLeDossier(true)}>
                      Sélectionner tout ce dossier
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="ec-collecte-grille ec-defile" ref={zone}>
                {dossier === "vous" && arbre ? (
                  <>
                    <div className="ec-ph-albums">
                      {arbre.vous.map((h) => album(h, sousDossier(h), TRACE.dossier))}
                      {p.ecrire && p.ouverte && envoi.ouvrir ? (
                        <button type="button" className="ec-ph-album ec-ph-album--nouveau" onClick={() => envoi.ouvrir?.({ nouveau: true })}>
                          <span className="ec-ph-album-couv" aria-hidden="true">
                            +
                          </span>
                          <span className="ec-ph-album-texte">
                            <strong>Nouveau dossier</strong>
                            <span className="ec-note">{v("Donnez-lui un nom, déposez", "Donne-lui un nom, dépose")}</span>
                          </span>
                        </button>
                      ) : null}
                    </div>
                    {!arbre.vous.length ? <p className="ec-note">{v("Rien déposé par vous pour l'instant.", "Rien déposé par toi pour l'instant.")}</p> : null}
                    {p.ecrire && arbre.vous.length > 1 ? (
                      <p className="ec-note ec-ph-aide">
                        {v(
                          "Glissez un dossier sur un autre pour le ranger dedans ; sur « Vos dossiers », en haut d'un dossier, pour l'en sortir.",
                          "Glisse un dossier sur un autre pour le ranger dedans ; sur « Tes dossiers », en haut d'un dossier, pour l'en sortir."
                        )}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {dossier === "liens" && arbre ? (
                  <>
                    <div className="ec-ph-albums">{arbre.liens.map((l) => album(l, sousLien(l), TRACE.lien))}</div>
                    {p.ecrire ? (
                      <p className="ec-note ec-ph-aide">
                        {v("Partager un lien, changer son nombre de photos : l'onglet « Les liens », en haut.", "Partager un lien, changer son nombre de photos : l'onglet « Les liens », en haut.")}
                      </p>
                    ) : null}
                  </>
                ) : null}
                {sousDossiers.length ? <div className="ec-ph-albums ec-ph-albums--petits">{sousDossiers.map((e) => album(e, photosDe(e.n), TRACE.dossier, true))}</div> : null}
                {personnes.length && lienDuDossier ? (
                  <div className="ec-ph-personnes" role="group" aria-label="Filtrer par personne">
                    <button type="button" className="ec-ph-personne" aria-pressed={dossier === lienDuDossier.cle} onClick={() => ouvrir(lienDuDossier.cle, "toutes")}>
                      <span className="ec-ph-initiales" aria-hidden="true">
                        Tout
                      </span>
                      Tout le lien · {nombre(lienDuDossier.n)}
                    </button>
                    {personnes.map((x) => (
                      <button key={x.cle} type="button" className="ec-ph-personne" aria-pressed={dossier === x.cle} onClick={() => ouvrir(x.cle, "toutes")}>
                        <span className="ec-ph-initiales" aria-hidden="true">
                          {initialesDe(x.nom)}
                        </span>
                        {x.nom} · {nombre(x.n)}
                      </button>
                    ))}
                  </div>
                ) : null}
                {vide && dossier === "tout" ? (
                  <div className="ec-ph-accueil">
                    <strong className="ec-ph-accueil-titre">Les photos arriveront ici</strong>
                    <p className="ec-texte">
                      {p.ecrire
                        ? v(
                            "Déposez les vôtres, et invitez les participants : chacun dépose depuis son téléphone, sans compte. Vous les rangerez ensuite en dossiers.",
                            "Dépose les tiennes, et invite les participants : chacun dépose depuis son téléphone, sans compte. Tu les rangeras ensuite en dossiers."
                          )
                        : "Le responsable et les participants déposent leurs photos ; elles s'afficheront ici."}
                    </p>
                    {p.ecrire && p.ouverte ? (
                      <div className="ec-ph-accueil-gestes">
                        {envoi.ouvrir ? (
                          <button type="button" className="ec-bouton" onClick={() => envoi.ouvrir?.()}>
                            Déposer des photos
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="ec-bouton ec-bouton--clair"
                          onClick={() => {
                            changerOnglet("liens");
                            setFenetreLien(true);
                          }}
                        >
                          Créer un lien pour les participants
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {!ensemble && !(vide && dossier === "tout") && photos.length === 0 && !chargement ? (
                  <div className="ec-a-venir">
                    <p className="ec-texte">
                      {dossier === "selection"
                        ? v("Rien dans votre sélection : touchez une photo pour l'y ajouter.", "Rien dans ta sélection : touche une photo pour l'y ajouter.")
                        : vue === "doublons"
                          ? "Aucun doublon dans ce dossier."
                          : dossier === "tout"
                            ? v("Aucune photo pour l'instant. Déposez les vôtres, ou partagez un lien.", "Aucune photo pour l'instant. Dépose les tiennes, ou partage un lien.")
                            : "Ce dossier est vide."}
                    </p>
                  </div>
                ) : null}
                {ensemble && photos.length ? (
                  <div className="ec-ph-arrivees-tete">
                    <strong className="ec-ph-arrivees-titre">Dernières arrivées</strong>
                    {p.ecrire ? <span className="ec-note">{v("Touchez une photo pour la choisir", "Touche une photo pour la choisir")}</span> : null}
                  </div>
                ) : null}
                <div className={ensemble ? "ec-grille ec-grille--arrivees" : "ec-grille"}>
                  {photos.map((ph, i) => {
                    const jour = vue === "jour" && (i === 0 || photos[i - 1].jour !== ph.jour) ? ph.jour : null;
                    return (
                      <div key={ph.id} style={{ display: "contents" }}>
                        {jour ? <h2 className="ec-grille-titre">{jour}</h2> : null}
                        <button
                          type="button"
                          className={`ec-tuile-image ec-ph-tuile${ph.preselection ? " ec-ph-tuile--choisie" : ""}${ph.doublonDe ? " ec-ph-tuile--doublon" : ""}`}
                          aria-pressed={ph.preselection}
                          aria-label={`${ph.nom ?? "Photo"}${ph.preselection ? ", dans votre sélection" : ""}${ph.doublonDe ? ", doublon" : ""}`}
                          disabled={!p.ecrire}
                          onClick={() => basculer(ph)}
                        >
                          {ph.vignette ? (
                            <img src={ph.vignette} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span className="ec-tuile-sans">{ph.heic ? "HEIC · aperçu indisponible" : ph.nom ?? "Photo"}</span>
                          )}
                          {ph.preselection ? (
                            <span className="ec-ph-coche" aria-hidden="true">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12l5 5 9-10" />
                              </svg>
                            </span>
                          ) : null}
                          {ph.doublonDe ? <span className="ec-ph-badge">Doublon</span> : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div ref={fin} />
                {chargement ? <p className="ec-note">Chargement des photos…</p> : null}
                {suivante && !chargement ? (
                  <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => charger(suivante, dossier, vue)}>
                    Voir la suite
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="ec-ecran-corps ec-li ec-defile">
          <div className="ec-li-intro">
            <span>{v("Un lien par personne ou par groupe : chacun dépose depuis son téléphone, sans compte, et vous suivez qui a envoyé quoi.", "Un lien par personne ou par groupe : chacun dépose depuis son téléphone, sans compte, et tu suis qui a envoyé quoi.")}</span>
            {liens?.reste !== null && liens?.reste !== undefined ? <span className="ec-note">Il reste {nombre(liens.reste)} photos avant le plafond de l&apos;édition</span> : null}
          </div>
          {!p.ouverte ? <p className="ec-note">La collecte est close : les liens ne reçoivent plus de photos.</p> : null}
          <div className="ec-li-cartes">
            {liens ? (
              <CarteLien
                genre="Lien général"
                nom={liens.general.nom}
                n={liens.general.n}
                plafondTexte={liens.general.plafond}
                cap={p.plafondGeneral}
                personnes={liens.general.personnes}
                url={p.lienParticipants}
                cloture={p.cloture}
                ouverte={p.ouverte}
                menuOuvert={menu === "general"}
                onMenu={() => setMenu((m) => (m === "general" ? null : "general"))}
                onPartager={() => setPartage(lienDe(liens.general.nom, null, liens.general.plafond, liens.general.n))}
                onVoir={() => ouvrir("participants")}
                actions={[{ libelle: "Changer le nombre de photos", note: "pour chaque personne", faire: () => setPlafond({ id: null, nom: liens.general.nom, valeur: p.plafondGeneral ?? Math.min(30, p.max), sansLimite: false }) }]}
              />
            ) : null}
            {liens?.liens.map((l) => (
              <CarteLien
                key={l.id}
                genre="Lien de contribution"
                nom={l.nom}
                n={l.n}
                plafondTexte={l.plafond}
                cap={l.plafondNombre}
                personnes={l.personnes}
                url={`${p.lienParticipants}?p=${l.cle}`}
                cloture={p.cloture}
                ouverte={p.ouverte}
                menuOuvert={menu === l.id}
                onMenu={() => setMenu((m) => (m === l.id ? null : l.id))}
                onPartager={() => setPartage(lienDe(l.nom, l.cle, l.plafond, l.n))}
                onVoir={() => ouvrir(`lien:${l.id}`)}
                actions={[
                  { libelle: "Changer le nom", faire: () => setRenommer({ id: l.id, nom: l.nom }) },
                  {
                    libelle: "Changer le nombre de photos",
                    note: liens.reste !== null ? `jusqu'à ${maxPlafond} par personne, selon ce qu'il reste` : undefined,
                    faire: () => setPlafond({ id: l.id, nom: l.nom, valeur: l.plafondNombre ?? Math.min(30, p.max), sansLimite: l.sansPlafond }),
                  },
                  { libelle: "Supprimer le lien", note: `il ne reçoit plus rien ; ses ${nombre(l.n)} photos restent`, danger: true, faire: () => setSupprimer({ id: l.id, nom: l.nom, n: l.n }) },
                ]}
              />
            ))}
          </div>
        </div>
      )}

      {fenetreLien ? (
        <FenetreLien
          token={p.token}
          max={p.max}
          contexte={contexte}
          onFermer={() => {
            setFenetreLien(false);
            relire();
          }}
        />
      ) : null}
      {partage ? <FenetrePartage lien={partage} contexte={contexte} onFermer={() => setPartage(null)} /> : null}
      {renommer ? (
        <FenetreNom
          nom={renommer.nom}
          occupe={occupe}
          erreur={erreur}
          onFermer={() => setRenommer(null)}
          onGarder={async (nom) => {
            if (await appeler("/api/collectif/dossiers", { cle: `lien:${renommer.id}`, nom })) {
              setRenommer(null);
              relire();
            }
          }}
        />
      ) : null}
      {plafond ? (
        <FenetrePlafond
          nom={plafond.nom}
          general={plafond.id === null}
          max={maxPlafond}
          valeurInitiale={plafond.valeur}
          sansLimiteInitial={plafond.sansLimite}
          occupe={occupe}
          erreur={erreur}
          onFermer={() => setPlafond(null)}
          onGarder={async (valeur, sansLimite) => {
            const ok =
              plafond.id === null
                ? await appeler("/api/collectif/plafond", { valeur })
                : await appeler("/api/collectif/provenances", sansLimite ? { action: "plafond", id: plafond.id, sansPlafond: true } : { action: "plafond", id: plafond.id, plafond: valeur });
            if (ok) {
              setPlafond(null);
              relire();
            }
          }}
        />
      ) : null}
      {supprimer ? (
        <Fenetre titre={`Supprimer le lien « ${supprimer.nom} » ?`} onFermer={() => setSupprimer(null)}>
          <p className="ec-texte">
            Il ne recevra plus aucune photo : qui l&apos;ouvre verra une page introuvable. Ses {nombre(supprimer.n)} photos restent, dans le dossier « {supprimer.nom} ».
          </p>
          {erreur ? (
            <p className="ec-note ec-note--erreur" role="alert">
              {erreur}
            </p>
          ) : null}
          <div className="ec-envoi-gestes">
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setSupprimer(null)}>
              Garder le lien
            </button>
            <button
              type="button"
              className="ec-bouton ec-bouton--danger"
              disabled={occupe}
              onClick={async () => {
                if (await appeler("/api/collectif/provenances", { action: "supprimer", id: supprimer.id })) {
                  setSupprimer(null);
                  if (dossier === `lien:${supprimer.id}`) ouvrir("tout");
                  else relire();
                }
              }}
            >
              Supprimer le lien
            </button>
          </div>
        </Fenetre>
      ) : null}
    </section>
  );
}

/* ─────────────────────────── une carte de lien ─────────────────────────── */

function CarteLien(c: {
  genre: string;
  nom: string;
  n: number;
  plafondTexte: string;
  cap: number | null;
  personnes: Personne[];
  url: string;
  cloture: string;
  ouverte: boolean;
  menuOuvert: boolean;
  onMenu: () => void;
  onPartager: () => void;
  onVoir: () => void;
  actions: { libelle: string; note?: string; danger?: boolean; faire: () => void }[];
}) {
  const visibles = c.personnes.slice(0, 3);
  const autres = c.personnes.length - visibles.length;
  return (
    <article className="ec-li-carte">
      <div className="ec-li-tete">
        <span className="ec-li-titres">
          <span className="ec-li-genre">{c.genre}</span>
          <strong className="ec-li-nom">{c.nom}</strong>
          <span className="ec-note">
            {c.n ? `${nombre(c.n)} photo${c.n > 1 ? "s" : ""} · ${c.personnes.length} personne${c.personnes.length > 1 ? "s" : ""}` : "Rien reçu pour l'instant"}
          </span>
        </span>
        <QrCode texte={c.url} taille={64} etiquette={`QR code du lien « ${c.nom} »`} />
      </div>
      {visibles.length ? (
        <ul className="ec-li-personnes">
          {visibles.map((pe) => {
            const part = c.cap ? Math.min(100, Math.round((pe.n / c.cap) * 100)) : 100;
            return (
              <li key={pe.nom}>
                <span className="ec-li-personne-nom">{pe.nom}</span>
                <span className="ec-li-barre" aria-hidden="true">
                  <span className={c.cap && pe.n >= c.cap ? "ec-li-barre-plein" : undefined} style={{ width: `${part}%` }} />
                </span>
                <span className="ec-li-compte">{c.cap ? `${pe.n} / ${c.cap}` : `${pe.n} photo${pe.n > 1 ? "s" : ""}`}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {c.n ? (
        <button type="button" className="ec-ph-lien ec-li-voir" onClick={c.onVoir}>
          {autres > 0 ? `Voir les ${autres} autres personnes et leurs photos` : "Voir ses photos"}
        </button>
      ) : null}
      <div className="ec-li-pied">
        <span className="ec-note ec-li-regle">
          {c.plafondTexte}
          {c.cloture ? ` · jusqu'au ${c.cloture}` : ""}
        </span>
        {c.ouverte ? (
          <>
            <button type="button" className="ec-bouton ec-bouton--petit" onClick={c.onPartager}>
              Partager
            </button>
            <button type="button" className="ec-li-plus" aria-label={`Plus d'actions sur le lien « ${c.nom} »`} aria-expanded={c.menuOuvert} onClick={c.onMenu}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
      {c.menuOuvert ? (
        <div className="ec-li-menu" role="menu" aria-label={`Actions sur le lien « ${c.nom} »`}>
          {c.actions.map((a) => (
            <button
              key={a.libelle}
              type="button"
              role="menuitem"
              className={a.danger ? "ec-li-menu-danger" : undefined}
              onClick={() => {
                c.onMenu();
                a.faire();
              }}
            >
              <span>{a.libelle}</span>
              {a.note ? <span className="ec-note">{a.note}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function FenetreNom({ nom, occupe, erreur, onFermer, onGarder }: { nom: string; occupe: boolean; erreur: string | null; onFermer: () => void; onGarder: (nom: string) => void }) {
  const [valeur, setValeur] = useState(nom);
  return (
    <Fenetre titre="Changer le nom du lien" sous="Ses photos se rangent sous ce nom." onFermer={onFermer}>
      <label className="ec-curseur">
        Le nom
        <input className="ec-champ" value={valeur} maxLength={80} autoFocus onChange={(e) => setValeur(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onGarder(valeur)} />
      </label>
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe || !valeur.trim()} onClick={() => onGarder(valeur)}>
        Enregistrer
      </button>
    </Fenetre>
  );
}

function FenetrePlafond(f: {
  nom: string;
  general: boolean;
  max: number;
  valeurInitiale: number;
  sansLimiteInitial: boolean;
  occupe: boolean;
  erreur: string | null;
  onFermer: () => void;
  onGarder: (valeur: number, sansLimite: boolean) => void;
}) {
  const min = Math.min(CURSEUR_LIEN.min, f.max);
  const [valeur, setValeur] = useState(Math.min(Math.max(f.valeurInitiale, min), f.max));
  const [sansLimite, setSansLimite] = useState(f.sansLimiteInitial && !f.general);
  return (
    <Fenetre titre={`Combien de photos pour « ${f.nom} » ?`} sous="Par personne : chacun dépose depuis son téléphone." onFermer={f.onFermer}>
      <div className="ec-lien-plafond">
        <div className="ec-lien-plafond-tete">
          <span className="ec-texte">Par personne</span>
          <strong className="ec-lien-valeur">{sansLimite ? "Sans limite" : `${valeur} photo${valeur > 1 ? "s" : ""}`}</strong>
        </div>
        <input
          type="range"
          min={min}
          max={f.max}
          step={1}
          value={valeur}
          disabled={sansLimite}
          aria-label="Nombre de photos par personne"
          onChange={(e) => {
            setValeur(Number(e.target.value));
            setSansLimite(false);
          }}
        />
        <div className="ec-puces">
          {RACCOURCIS_LIEN.filter((n) => n <= f.max).map((n) => (
            <button
              key={n}
              type="button"
              className="ec-onglet"
              aria-pressed={!sansLimite && valeur === n}
              onClick={() => {
                setValeur(n);
                setSansLimite(false);
              }}
            >
              {n}
            </button>
          ))}
          {!f.general ? (
            <button type="button" className="ec-onglet" aria-pressed={sansLimite} onClick={() => setSansLimite(true)}>
              Sans limite
            </button>
          ) : null}
        </div>
      </div>
      {f.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {f.erreur}
        </p>
      ) : null}
      <button type="button" className="ec-bouton ec-bouton--plein" disabled={f.occupe} onClick={() => f.onGarder(valeur, sansLimite)}>
        Enregistrer
      </button>
    </Fenetre>
  );
}
