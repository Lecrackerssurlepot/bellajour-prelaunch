"use client";

/* La page Photos du responsable (planches 1, 2 et 3 du 20/10/2026, Audencia :
   huit bateaux ; T-193, T-199). L'ancienne page « en rayons » est dans
   archive/photos-rayons-2026-10.

   Deux onglets, un seul écran :
   - LES PHOTOS : les grands chiffres, puis un panneau de verre : à gauche une
     colonne de LISTES qui trient et filtrent (Lien, Personne avec recherche,
     Jour, Afficher : `Listes.tsx`, traduites pour la route par `filtres.ts`),
     à droite la grille. « Tout » montre la grille filtrée ; « Par lien », un
     album par lien, puis le lien ouvert et ses personnes.
     On COCHE des photos (la case au survol, l'appui long au téléphone) et une
     barre d'actions agit sur elles : Ajouter à ma sélection, Retirer de ma
     sélection, Ne pas publier. « Cocher » est le geste du moment, « Ma
     sélection » (l'étoile) ce qui va au magazine. Toucher une photo
     l'AGRANDIT (`Agrandir.tsx`) ; l'étoile au survol garde l'ajout en un clic.
   - LES LIENS : inchangé (`Liens.tsx`).

   Téléphone (planche 2) : rien ne défile de côté. Une ligne de chiffres, une
   seule barre (Tout / Par lien, Filtrer, Cocher) qui reste collée en haut, les
   filtres dans une feuille du bas, 4 colonnes avec les initiales, la barre
   d'actions fixe sous le pouce.

   La grille se lit PAR PAGES (120 vignettes signées à la fois) et se complète
   en descendant ; le chargement par pages observe SA zone de défilement
   (`root` de l'IntersectionObserver), nul sur téléphone. « 12 nouvelles · Les
   voir » garde la lecture légère de 30 s, onglet visible (T-181). L'équipe
   voit tout, sans un geste qui écrive et sans aucun lien.

   Lot w2 (planches 3, 4 et 5 du 20/10, T-198, T-199) :
   - SUPPRIMER (corbeille 30 jours) dans la photo agrandie, dans la barre des
     cochées et au téléphone, sans fenêtre de confirmation : « Photo mise à la
     corbeille · Annuler » (Annuler = `restaurer`, les mêmes ids) ;
   - la CORBEILLE (`Corbeille.tsx`), une ligne de « Afficher » ;
   - une PERSONNE a sa fiche (`Personne.tsx`) : renommer, les doublons proposés,
     fusionner en choisissant le nom gardé ;
   - les gestes des cochées partent en UNE requête par lot de 500 (`photoIds`),
     plus une par photo ;
   - sans la migration 20261023, ces gestes répondent 503 : l'écran dit « La mise
     à jour de la base n'est pas encore appliquée », jamais l'erreur brute.
   Le lien d'équipe ne reçoit aucun de ces gestes, ni la corbeille. */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { phraseArrivees, SONDAGE_PHOTOS_MS, type Nouvelles } from "@/lib/collectif/arrivees";
import { DELAI_CORBEILLE_JOURS } from "@/lib/collectif/corbeille";
import { cheminDuNoeud, clePersonne, cleResp, DOSSIER_RESPONSABLE, noeudDe, QUI_RESPONSABLE, SANS_NOM, type Arbre, type Noeud } from "@/lib/collectif/dossiers";
import { ERREUR_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { useFenetreEnvoi, useMoteurDepot } from "../../_composants/depot/DepotContexte";
import { useMoteur } from "../../_composants/depot/useMoteur";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import FenetreLien, { FenetrePartage, FenetreQr, type ContexteMessage, type LienPartage } from "../../_composants/LienContribution";
import { useSondage } from "../../_composants/useSondage";
import Agrandir from "./Agrandir";
import Corbeille, { BASE_PAS_A_JOUR, type PhotoCorbeille } from "./Corbeille";
import {
  adresseDe,
  annonceCourte,
  avecLien,
  cleDeLaPersonne,
  cleQui,
  enLots,
  estVueAlbums,
  ficheDe,
  filtreDuRetour,
  filtresDepuis,
  filtreSousLeNom,
  FILTRES_VIDES,
  initialesDe,
  jourCourt,
  jourEncoreALire,
  joursVus,
  lienDe as noeudDuLien,
  lienDeLaPhoto,
  liensDansLOrdre,
  LOT_ECRITURE,
  nombre,
  nombreDeFiltres,
  personnesDe,
  photosDe,
  phraseRetour,
  requeteDe,
  type Filtres,
  type ListePersonnes,
  type PersonneVue,
} from "./filtres";
import Grille, { ICONES, Trace, type Photo } from "./Grille";
import { FenetreNom, FenetrePlafond, OngletLiens, type Liens } from "./Liens";
import Listes from "./Listes";
import { FenetreFusion, FenetreRenommer, FichePersonne } from "./Personne";
import "./photos.css";

type Compteurs = { dossier: number; liste: number; doublons: number; selection: number; choisissables: number; signalees: number };
type Stats = { photos: number; personnes: number; doublons: number; enCours: number; derniere: string | null; corbeille: number | null };
type Onglet = "photos" | "liens";
type Reponse = { photos: Photo[]; suivante: number | null; compteurs: Compteurs; stats: Stats; arbre: Arbre; couvertures?: Record<string, string>; liens: Liens | null };
type Coches = { tout: boolean; ids: Set<string> };
type Avis = { texte: string; sous?: string; annuler?: () => void; voir?: () => void };
/** Des photos retirées de la vue, et leur place : « Annuler » les remet où elles étaient. */
type Retrait = { photo: Photo; index: number }[];
/** Ce qu'une écriture de la corbeille a rendu. */
type Issue = { statut: "ok"; ids: string[] } | { statut: "absente" } | { statut: "panne"; message: string };

/** Sans la migration 20261023 : la phrase sobre (la route nomme le fichier SQL, l'écran ne le montre pas). */
const MIGRATION_TEXTE = `${BASE_PAS_A_JOUR} : rien n'a changé.`;

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
  /** `?dossier=` (depuis le tableau de bord), `?mode=tout` et `?onglet=liens`. */
  dossierInitial: string;
  modeTout: boolean;
  ongletInitial: Onglet;
};

const REQUETE_TELEPHONE = "(max-width: 860px)";
const AUCUNE: Coches = { tout: false, ids: new Set() };
const rien = () => () => {};
const auMoins0 = (n: number) => Math.max(0, n);
/** La requête de la page 0 que lit une vue (la grille ne se relit que si elle change). */
const cleRequete = (f: Filtres) => {
  const r = requeteDe(f);
  return `${r.dossier}|${r.vue}`;
};

const TRACE = {
  lien: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  ordre: "M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4",
  filtre: "M4 6h16M7 12h10M10 18h4",
  crayon: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  partage: "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5",
  plus: "M12 5v14M5 12h14",
  retirer: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9zM4 4l16 16",
  fermer: "M6 6l12 12M18 6 6 18",
  retour: "m15 6-6 6 6 6",
  chev: "m9 6 6 6-6 6",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  atelier: "M4 20V8l8-4 8 4v12M9 20v-6h6v6",
};

export default function Collecte(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const client = useSyncExternalStore(rien, () => true, () => false);
  const [onglet, setOnglet] = useState<Onglet>(p.ecrire ? p.ongletInitial : "photos");
  /* L'équipe n'a pas de corbeille : `?dossier=corbeille` sur son lien rouvre « Toutes les photos ». */
  const [f, setF] = useState<Filtres>(() => {
    const d = filtresDepuis(p.dossierInitial, p.modeTout);
    return d.corbeille && !p.ecrire ? FILTRES_VIDES : d;
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [arbre, setArbre] = useState<Arbre | null>(null);
  const [couvertures, setCouvertures] = useState<Record<string, string>>({});
  const [couvVous, setCouvVous] = useState<string | null>(null);
  const [liens, setLiens] = useState<Liens | null>(null);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  /* Cocher (le geste du moment) : `tout` = toute la vue, `ids` = les exceptions ; sinon `ids` = les cochées. */
  const [coches, setCoches] = useState<Coches>(AUCUNE);
  const [modeCocher, setModeCocher] = useState(false);
  const dernierCoche = useRef<string | null>(null);
  /* « Ne pas publier » écrit ici (la route de la grille ne le rend pas encore). */
  const [signalees, setSignalees] = useState<Record<string, boolean>>({});
  const [agrandi, setAgrandi] = useState<string | null>(null);
  const [avis, setAvis] = useState<Avis | null>(null);
  const minuterieAvis = useRef(0);
  const [feuille, setFeuille] = useState(false);
  const [progres, setProgres] = useState<string | null>(null);
  /* Les dossiers du responsable : renommer, ranger en glissant. */
  const [edite, setEdite] = useState<{ cle: string; valeur: string } | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  /* Les fenêtres des liens. */
  const [fenetreLien, setFenetreLien] = useState(false);
  const [partage, setPartage] = useState<LienPartage | null>(null);
  const [grandQr, setGrandQr] = useState<LienPartage | null>(null);
  const [renommer, setRenommer] = useState<{ id: string; nom: string } | null>(null);
  const [plafond, setPlafond] = useState<{ id: string | null; nom: string; valeur: number; sansLimite: boolean } | null>(null);
  const [supprimer, setSupprimer] = useState<{ id: string; nom: string; n: number } | null>(null);
  /* Les arrivées en direct (T-181) : la dernière arrivée déjà montrée, l'annonce de celles
     d'après, et le seuil au-delà duquel une vignette est marquée « nouvelle ». */
  const [vuJusqua, setVuJusqua] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<{ texte: string; court: string; noms: string[] } | null>(null);
  const [seuilNouvelles, setSeuilNouvelles] = useState<string | null>(null);
  /* Les personnes de l'édition (planche 4) : lues à la première fiche ouverte, relues après un renommage ou une fusion. */
  const [personnes, setPersonnes] = useState<ListePersonnes | null>(null);
  const [personnesLues, setPersonnesLues] = useState<"non" | "lecture" | "oui" | "erreur">("non");
  /* Renommer : la personne, et l'autre nom tapé avec son adresse quand on part de lui (pré-rempli, jamais écrit sans le geste). */
  const [renommerP, setRenommerP] = useState<{ personne: PersonneVue; propose: string | null } | null>(null);
  const [fusion, setFusion] = useState<{ autre: PersonneVue | null } | null>(null);
  const [erreurFenetre, setErreurFenetre] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const version = useRef(0);
  /* La requête de la page 0 déjà lue : changer de liste ne relit la grille que si elle change. */
  const chargee = useRef<string | null>(null);
  /* Les photos de la dernière peinture, pour un geste qui reprend après une requête. */
  const photosVues = useRef<Photo[]>([]);
  useEffect(() => {
    photosVues.current = photos;
  });
  const envoi = useFenetreEnvoi();
  const moteur = useMoteur(useMoteurDepot());
  const contexte: ContexteMessage = { organisation: p.organisation, evenement: p.evenement, cloture: p.cloture, tu: p.tu };

  /** Une page de la route, sans rien poser à l'écran. */
  const lirePage = useCallback(
    async (page: number, nf: Filtres, dossier?: string): Promise<Reponse> => {
      const r = requeteDe(nf);
      const rep = await fetch("/api/collectif/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, dossier: dossier ?? r.dossier, vue: r.vue, page }),
      });
      if (!rep.ok) throw new Error(String(rep.status));
      return (await rep.json()) as Reponse;
    },
    [p.token]
  );

  const charger = useCallback(
    async (page: number, nf: Filtres): Promise<Photo[] | null> => {
      const v0 = version.current;
      if (page === 0) chargee.current = cleRequete(nf);
      setChargement(true);
      try {
        const json = await lirePage(page, nf);
        if (v0 !== version.current) return null;
        setPhotos((deja) => (page === 0 ? json.photos : [...deja, ...json.photos]));
        setSuivante(json.suivante);
        setCompteurs(json.compteurs);
        setStats(json.stats);
        setArbre(json.arbre);
        if (page === 0) {
          setCouvertures(json.couvertures ?? {});
          /* Tout ce qui est arrivé jusqu'ici est désormais compté : l'annonce s'efface. */
          setVuJusqua(json.stats.derniere);
          setAnnonce(null);
        }
        setLiens(json.liens);
        setErreur(null);
        /* « Mes photos » en album : la couverture d'un de ses dossiers (la route n'en signe qu'une par dossier). */
        if (page === 0 && estVueAlbums(nf) && json.arbre.vous.length) {
          lirePage(0, nf, "vous")
            .then((r) => {
              if (v0 !== version.current) return;
              const c = r.couvertures ?? {};
              setCouvVous(c[cleResp("organisateur", "")] ?? Object.values(c)[0] ?? null);
            })
            .catch(() => {});
        }
        return json.photos;
      } catch {
        if (v0 === version.current) setErreur("Les photos n'ont pas pu se charger. Réessayer en rechargeant la page.");
        return null;
      } finally {
        if (v0 === version.current) setChargement(false);
      }
    },
    [lirePage]
  );

  /* L'adresse suit les listes et l'onglet : recharger la page, ou revenir en arrière
     depuis une autre page, rouvre le même endroit (replaceState : rien ne s'empile). */
  function garderAdresse(nf: Filtres, o: Onglet) {
    const q = o === "liens" ? "?onglet=liens" : adresseDe(nf);
    window.history.replaceState(null, "", `${window.location.pathname}${q}`);
  }
  function changerOnglet(o: Onglet) {
    setOnglet(o);
    garderAdresse(f, o);
  }
  /** Changer les listes : la grille se relit seulement si la route lit autre chose (un jour se filtre ici).
      La corbeille ne lit pas la grille : en revenir ne relit rien si la grille d'avant est encore la bonne. */
  function appliquer(nf0: Filtres) {
    const nf = nf0.corbeille && !p.ecrire ? { ...nf0, corbeille: false } : nf0;
    setF(nf);
    setCoches(AUCUNE);
    setModeCocher(false);
    setAgrandi(null);
    setOnglet("photos");
    setErreur(null);
    garderAdresse(nf, "photos");
    if (nf.corbeille) {
      setFeuille(false);
      return;
    }
    if (cleRequete(nf) === chargee.current && photos.length) return;
    version.current++;
    setPhotos([]);
    setSuivante(0);
    void charger(0, nf);
  }
  /** Ouvrir une personne sous son nom (après un renommage ou une fusion) : la grille se relit toujours. */
  function ouvrirPersonne(cle: string) {
    const nf: Filtres = { ...f, personne: cle, corbeille: false, selection: false };
    setF(nf);
    setCoches(AUCUNE);
    setModeCocher(false);
    setAgrandi(null);
    garderAdresse(nf, "photos");
    version.current++;
    setPhotos([]);
    setSuivante(0);
    void charger(0, nf);
  }
  /** Ouvrir un dossier par sa clé (depuis l'onglet des liens). */
  const ouvrir = (cle: string) => appliquer(filtresDepuis(cle));
  const relire = () => {
    version.current++;
    void charger(0, f);
  };

  useEffect(() => {
    void charger(0, filtresDepuis(p.dossierInitial, p.modeTout));
  }, [charger, p.dossierInitial, p.modeTout]);

  const r = requeteDe(f);
  const parJour = r.vue === "jour";
  const albums = estVueAlbums(f);
  const visibles = f.jour ? photos.filter((x) => x.jourCle === f.jour) : photos;
  const jours = parJour ? joursVus(photos, suivante === null) : null;
  const jourVu = f.jour ? jours?.find((j) => j.cle === f.jour) : undefined;
  /** Le nombre de photos de la vue, quand on le connaît (un jour choisi : une fois lu jusqu'au bout). */
  const totalVue = f.jour ? (jourVu?.complet || suivante === null ? visibles.length : null) : (compteurs?.liste ?? null);
  /* Une personne choisie a sa fiche au-dessus de ses photos (planche 4) ; ni le responsable, ni « Sans nom ». */
  const cleFiche = onglet === "photos" && !albums && !f.corbeille && !f.selection ? cleDeLaPersonne(f.personne) : null;
  const fiche = ficheDe(personnes, cleFiche);

  useEffect(() => {
    const el = fin.current;
    if (!el || suivante === null || suivante === 0 || chargement || albums) return;
    const racine = window.matchMedia(REQUETE_TELEPHONE).matches ? null : zone.current;
    const obs = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) void charger(suivante, f);
    }, { root: racine, rootMargin: "800px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [suivante, chargement, f, albums, charger]);

  /* Un jour choisi : les pages rangées par jour se lisent jusqu'à son dernier cliché. */
  useEffect(() => {
    if (!f.jour || chargement || suivante === null || suivante === 0) return;
    if (jourEncoreALire(photos, f.jour, suivante, parJour)) void charger(suivante, f);
  }, [f, photos, suivante, chargement, parJour, charger]);

  /* La feuille « Filtrer » : Échap la ferme, et la page derrière ne défile pas sous le doigt. */
  useEffect(() => {
    if (!feuille) return;
    const html = document.documentElement;
    const avant = html.style.overflow;
    html.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFeuille(false);
    };
    window.addEventListener("keydown", touche);
    return () => {
      html.style.overflow = avant;
      window.removeEventListener("keydown", touche);
    };
  }, [feuille]);

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
      void charger(0, f);
    }
  }, [envoi.fermetures, moteur.enCours, moteur.arrivees, f, charger]);

  /* Les photos arrivent-elles ? Une lecture LÉGÈRE toutes les 30 s, onglet visible (T-181) ;
     la grille ne se relit qu'au clic sur « Les voir ». Les envois du responsable lui-même ne
     s'annoncent pas : la grille se relit déjà à la fin de son envoi. */
  useSondage(
    async () => {
      if (!vuJusqua) return;
      const rep = await fetch("/api/collectif/photos/etat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, depuis: vuJusqua }),
      });
      if (!rep.ok) return;
      const j = (await rep.json()) as { photos: number; nouvelles: Nouvelles | null };
      if (!j.nouvelles?.n) return;
      setStats((s) => (s ? { ...s, photos: j.photos } : s));
      const texte = phraseArrivees(j.nouvelles);
      if (texte) setAnnonce({ texte, court: annonceCourte(j.nouvelles.participants, j.nouvelles.noms.map((x) => x.nom), j.nouvelles.personnes), noms: j.nouvelles.noms.map((x) => x.nom) });
    },
    SONDAGE_PHOTOS_MS,
    p.ouverte
  );

  /** « Les voir » : les photos d'UNE personne s'il n'y en a qu'une, sinon toutes ; les plus récentes en haut, marquées. */
  function voirArrivees() {
    if (!annonce) return;
    setSeuilNouvelles(vuJusqua);
    const seule = annonce.noms.length === 1 ? `qui:${clePersonne(annonce.noms[0])}` : null;
    version.current++;
    const nf: Filtres = { ...FILTRES_VIDES, personne: seule };
    setF(nf);
    setCoches(AUCUNE);
    setPhotos([]);
    setSuivante(0);
    garderAdresse(nf, "photos");
    void charger(0, nf);
  }

  function annoncer(a: Avis) {
    window.clearTimeout(minuterieAvis.current);
    setAvis(a);
    minuterieAvis.current = window.setTimeout(() => setAvis(null), 6500);
  }

  async function appeler(url: string, corps: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, ...corps }) });
      const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
      if (!rep.ok) {
        setErreur(json.error === ERREUR_PERSONNES_ABSENTE ? MIGRATION_TEXTE : typeof json.message === "string" ? json.message : `Non enregistré (erreur ${rep.status}).`);
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

  /**
   * Marquer des photos cochées (Ma sélection, Ne pas publier) : UNE requête par lot de 500
   * (`photoIds`, la règle de la route), jamais une par photo. Rend les ids que la base a écrits
   * (une photo passée à la corbeille entre-temps n'en est pas).
   */
  async function marquerLot(ids: readonly string[], corps: { preselection: boolean } | { signalee: boolean }): Promise<string[]> {
    const faites: string[] = [];
    const lots = enLots(ids);
    for (const [k, lot] of lots.entries()) {
      if (lots.length > 1) setProgres(`${nombre(k * LOT_ECRITURE)} sur ${nombre(ids.length)}`);
      try {
        const rep = await fetch("/api/collectif/photos/marquer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, photoIds: lot, ...corps }) });
        if (!rep.ok) continue;
        const json = (await rep.json().catch(() => ({}))) as { ids?: unknown };
        if (Array.isArray(json.ids)) faites.push(...json.ids.filter((x): x is string => typeof x === "string"));
      } catch {
        /* le lot compte comme raté : la phrase d'après le dit */
      }
    }
    setProgres(null);
    return faites;
  }

  /** La corbeille, par lots de 500 : ce que la base a écrit, ou la migration qui manque, ou la panne. */
  async function ecrireCorbeille(action: "supprimer" | "restaurer", ids: readonly string[]): Promise<Issue> {
    const faites: string[] = [];
    const lots = enLots(ids);
    const fin = (i: Issue): Issue => {
      setProgres(null);
      return i;
    };
    for (const [k, lot] of lots.entries()) {
      if (lots.length > 1) setProgres(`${nombre(k * LOT_ECRITURE)} sur ${nombre(ids.length)}`);
      try {
        const rep = await fetch("/api/collectif/photos/corbeille", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, action, photoIds: lot }) });
        const json = (await rep.json().catch(() => ({}))) as { error?: unknown; ids?: unknown };
        if (rep.status === 503 && json.error === ERREUR_PERSONNES_ABSENTE) return fin({ statut: "absente" });
        if (!rep.ok) return fin(faites.length ? { statut: "ok", ids: faites } : { statut: "panne", message: `${action === "supprimer" ? "La suppression" : "La restauration"} n'a pas abouti (erreur ${rep.status}). Réessayer.` });
        if (Array.isArray(json.ids)) faites.push(...json.ids.filter((x): x is string => typeof x === "string"));
      } catch {
        return fin(faites.length ? { statut: "ok", ids: faites } : { statut: "panne", message: "Le réseau n'a pas répondu. Rien n'a changé." });
      }
    }
    return fin({ statut: "ok", ids: faites });
  }

  /** Retirer des photos de la vue (et passer la photo agrandie à la suivante) ; rend leur place, pour « Annuler ». */
  function retirerDeLaVue(ids: ReadonlySet<string>): Retrait {
    const retrait: Retrait = [];
    photosVues.current.forEach((x, index) => {
      if (ids.has(x.id)) retrait.push({ photo: x, index });
    });
    if (agrandi && ids.has(agrandi)) {
      const vues = f.jour ? photosVues.current.filter((x) => x.jourCle === f.jour) : photosVues.current;
      const i = vues.findIndex((x) => x.id === agrandi);
      const reste = vues.filter((x) => !ids.has(x.id));
      setAgrandi(reste.length && i >= 0 ? reste[Math.min(i, reste.length - 1)].id : null);
    }
    setPhotos((l) => l.filter((x) => !ids.has(x.id)));
    return retrait;
  }
  /** Les chiffres suivent un retrait (`signe` -1) ou son annulation (+1), sans relire la grille. */
  function compterLeRetrait(retrait: Retrait, signe: 1 | -1, corbeille: boolean) {
    const n = retrait.length;
    const sel = retrait.filter((x) => x.photo.preselection).length;
    const sig = retrait.filter((x) => estCachee(x.photo)).length;
    const dbl = retrait.filter((x) => x.photo.doublonDe).length;
    const choix = retrait.filter((x) => !x.photo.preselection && !estCachee(x.photo)).length;
    setCompteurs((c) =>
      c
        ? { ...c, dossier: auMoins0(c.dossier + signe * n), liste: auMoins0(c.liste + signe * n), selection: auMoins0(c.selection + signe * sel), signalees: auMoins0(c.signalees + signe * sig), doublons: auMoins0(c.doublons + signe * dbl), choisissables: auMoins0(c.choisissables + signe * choix) }
        : c
    );
    setStats((s) => (s ? { ...s, photos: auMoins0(s.photos + signe * n), doublons: auMoins0(s.doublons + signe * dbl), corbeille: corbeille && s.corbeille !== null ? auMoins0(s.corbeille - signe * n) : s.corbeille } : s));
  }

  /**
   * Supprimer = mettre à la corbeille (30 jours), sans fenêtre de confirmation (planches 3C et 2F) :
   * la photo disparaît de la vue, l'avis propose « Annuler » quelques secondes (= `restaurer`, les
   * mêmes ids). Sans la migration 20261023 : la phrase sobre, rien ne bouge.
   */
  async function mettreALaCorbeille(ids: readonly string[]) {
    if (occupe || !ids.length || !p.ecrire) return;
    setOccupe(true);
    setErreur(null);
    const v0 = version.current;
    let issue: Issue;
    try {
      issue = await ecrireCorbeille("supprimer", ids);
    } finally {
      setOccupe(false);
    }
    if (issue.statut === "absente") {
      annoncer({ texte: BASE_PAS_A_JOUR, sous: ids.length > 1 ? "Rien n'a été supprimé : les photos sont toujours là." : "Rien n'a été supprimé : la photo est toujours là." });
      return;
    }
    if (issue.statut === "panne") {
      setErreur(issue.message);
      return;
    }
    const faites = issue.ids;
    if (faites.length < ids.length) setErreur(`${nombre(ids.length - faites.length)} photo${ids.length - faites.length > 1 ? "s n'ont" : " n'a"} pas pu être supprimée${ids.length - faites.length > 1 ? "s" : ""}. Réessayer.`);
    if (!faites.length) return;
    const retrait = retirerDeLaVue(new Set(faites));
    compterLeRetrait(retrait, -1, true);
    setCoches(AUCUNE);
    setModeCocher(false);
    const n = faites.length;
    annoncer({
      texte: n > 1 ? `${photosDe(n)} mises à la corbeille` : "Photo mise à la corbeille",
      sous: `${n > 1 ? "Récupérables" : "Récupérable"} pendant ${DELAI_CORBEILLE_JOURS} jours`,
      annuler: () => void annulerSuppression(faites, retrait, v0),
    });
  }
  /** « Annuler » : `restaurer` les mêmes ids ; elles reviennent à leur place dans la vue (relue si la vue a changé). */
  async function annulerSuppression(ids: string[], retrait: Retrait, v0: number) {
    setOccupe(true);
    let issue: Issue;
    try {
      issue = await ecrireCorbeille("restaurer", ids);
    } finally {
      setOccupe(false);
    }
    if (issue.statut !== "ok") {
      setErreur(issue.statut === "absente" ? MIGRATION_TEXTE : issue.message);
      return;
    }
    const revenues = new Set(issue.ids);
    if (!revenues.size) return;
    if (v0 !== version.current) {
      relire();
    } else {
      const remis = retrait.filter((x) => revenues.has(x.photo.id)).sort((a, b) => a.index - b.index);
      setPhotos((l) => {
        const r = [...l];
        for (const { photo, index } of remis) r.splice(Math.min(index, r.length), 0, photo);
        return r;
      });
      compterLeRetrait(remis, 1, true);
    }
    annoncer({ texte: revenues.size > 1 ? `${photosDe(revenues.size)} restaurées` : "Photo restaurée", sous: revenues.size > 1 ? "De retour à leur place" : "De retour à sa place" });
  }

  /** Des photos sont revenues de la corbeille (planche 5C) : les chiffres suivent, la grille se relira en sortant. */
  function restaureesDeLaCorbeille(revenues: PhotoCorbeille[]) {
    const n = revenues.length;
    if (!n) return;
    chargee.current = null;
    setStats((s) => (s ? { ...s, photos: s.photos + n, corbeille: s.corbeille === null ? null : auMoins0(s.corbeille - n) } : s));
    setCompteurs((c) => (c ? { ...c, selection: c.selection + revenues.filter((x) => x.selection).length } : c));
    const seule = n === 1 ? revenues[0] : null;
    annoncer(
      seule
        ? { texte: "Photo restaurée", sous: phraseRetour(seule.lien, seule.lienNom, seule.qui), voir: () => appliquer(filtreDuRetour(seule.lien, seule.qui)) }
        : { texte: `${photosDe(n)} restaurées`, sous: "De retour à leur place" }
    );
  }

  const estCachee = (ph: Photo) => signalees[ph.id] ?? ph.signalee ?? false;
  const estCochee = (id: string) => (coches.tout ? !coches.ids.has(id) : coches.ids.has(id));
  const nbCoches = coches.tout ? Math.max(0, (totalVue ?? visibles.length) - coches.ids.size) : coches.ids.size;
  const cocherActif = p.ecrire && (modeCocher || nbCoches > 0);

  function cocher(id: string, etendre: boolean) {
    const mettre = !estCochee(id);
    let cibles = [id];
    if (etendre && dernierCoche.current) {
      const a = visibles.findIndex((x) => x.id === dernierCoche.current);
      const b = visibles.findIndex((x) => x.id === id);
      if (a >= 0 && b >= 0) cibles = visibles.slice(Math.min(a, b), Math.max(a, b) + 1).map((x) => x.id);
    }
    dernierCoche.current = id;
    setCoches((c) => {
      const ids = new Set(c.ids);
      for (const x of cibles) {
        if (c.tout ? !mettre : mettre) ids.add(x);
        else ids.delete(x);
      }
      return { tout: c.tout, ids };
    });
  }
  function toutCocher() {
    setCoches({ tout: true, ids: new Set() });
    setModeCocher(true);
  }
  function toutDecocher() {
    setCoches(AUCUNE);
    setModeCocher(false);
  }
  function cocherLeJour(cle: string) {
    setCoches((c) => {
      const ids = new Set(c.tout ? [] : c.ids);
      for (const x of photos) if (x.jourCle === cle) ids.add(x.id);
      return { tout: false, ids };
    });
  }

  /** Les photos cochées, toutes lues : « Tout cocher » sur une vue qui n'est pas lue jusqu'au bout la lit d'abord. */
  async function cocheesLues(): Promise<Photo[]> {
    if (!coches.tout) return photos.filter((x) => coches.ids.has(x.id));
    let toutes = photos;
    let page = suivante;
    const v0 = version.current;
    while (page !== null && page !== 0) {
      /* Un jour choisi, pages rangées par jour : une fois ce jour passé, le reste n'en contient plus. */
      if (f.jour && !jourEncoreALire(toutes, f.jour, page, parJour)) break;
      setProgres(`Lecture des photos : ${nombre(toutes.length)} sur ${nombre(compteurs?.liste ?? toutes.length)}`);
      const json = await lirePage(page, f);
      if (v0 !== version.current) return [];
      toutes = [...toutes, ...json.photos];
      page = json.suivante;
      setPhotos(toutes);
      setSuivante(page);
    }
    setProgres(null);
    return toutes.filter((x) => (!f.jour || x.jourCle === f.jour) && !coches.ids.has(x.id));
  }

  /** Ma sélection pour des photos, l'état local d'abord (la route rend l'objet écrit, la relecture n'est pas sûre : 14/10). */
  function poserSelection(ids: ReadonlySet<string>, preselection: boolean, delta: number) {
    setPhotos((l) => (f.selection && !preselection ? l.filter((x) => !ids.has(x.id)) : l.map((x) => (ids.has(x.id) ? { ...x, preselection } : x))));
    setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + delta), ...(f.selection && !preselection ? { liste: Math.max(0, c.liste - ids.size), dossier: Math.max(0, c.dossier - ids.size) } : {}) } : c));
  }

  async function basculer(photo: Photo) {
    const choisie = !photo.preselection;
    poserSelection(new Set([photo.id]), choisie, choisie ? 1 : -1);
    if (!(await appeler("/api/collectif/photos/marquer", { photoId: photo.id, preselection: choisie }))) {
      setPhotos((l) => (l.some((x) => x.id === photo.id) ? l.map((x) => (x.id === photo.id ? { ...x, preselection: !choisie } : x)) : [photo, ...l]));
      setCompteurs((c) => (c ? { ...c, selection: c.selection + (choisie ? -1 : 1) } : c));
    }
  }

  /** « Ne pas publier » compté dans la vue (la ligne de « Afficher »). */
  const compterSignalees = (delta: number) => setCompteurs((c) => (c ? { ...c, signalees: auMoins0(c.signalees + delta) } : c));

  async function cacher(photo: Photo, oui: boolean, annonceSeule = true) {
    if (estCachee(photo) === oui) return;
    setSignalees((s) => ({ ...s, [photo.id]: oui }));
    compterSignalees(oui ? 1 : -1);
    if (!(await appeler("/api/collectif/photos/marquer", { photoId: photo.id, signalee: oui }))) {
      setSignalees((s) => ({ ...s, [photo.id]: !oui }));
      compterSignalees(oui ? -1 : 1);
      return;
    }
    if (annonceSeule)
      annoncer(
        oui
          ? { texte: "Elle ne sera pas publiée", sous: "Elle reste visible ici", annuler: () => void cacher(photo, false, false) }
          : { texte: "Elle pourra être publiée", annuler: () => void cacher(photo, true, false) }
      );
  }

  /** La barre d'actions : Ajouter à ma sélection, Retirer de ma sélection, Ne pas publier, Supprimer. */
  async function agir(geste: "ajouter" | "retirer" | "cacher" | "supprimer") {
    if (occupe || nbCoches === 0) return;
    if (geste === "supprimer") {
      /* Toute la vue cochée : elle se lit d'abord jusqu'au bout (les ids partent par lots de 500). */
      setOccupe(true);
      let ids: string[] = [];
      try {
        ids = (await cocheesLues()).map((x) => x.id);
      } catch {
        setErreur("Les photos n'ont pas pu se lire. Rien n'a changé.");
      } finally {
        setOccupe(false);
        setProgres(null);
      }
      if (ids.length) await mettreALaCorbeille(ids);
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const preselection = geste === "ajouter";
      /* Toute la vue cochée, sans jour ni doublons : UNE écriture pour tout le dossier (la règle de la route). */
      if (geste !== "cacher" && coches.tout && !f.jour && r.vue !== "doublons") {
        const exceptions = photos.filter((x) => coches.ids.has(x.id) && x.preselection !== preselection);
        const rep = await fetch("/api/collectif/photos/marquer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, toutes: true, preselection, dossier: r.dossier }) });
        const json = (await rep.json().catch(() => ({}))) as { n?: number; message?: string };
        if (!rep.ok) {
          setErreur(typeof json.message === "string" ? json.message : `Non enregistré (erreur ${rep.status}).`);
          return;
        }
        /* Les photos laissées décochées gardent leur état d'avant (une requête par lot de 500). */
        const remises = exceptions.length ? await marquerLot(exceptions.map((x) => x.id), { preselection: !preselection }) : [];
        const n = (json.n ?? 0) - remises.length;
        const gardees = new Set(coches.ids);
        setPhotos((l) =>
          f.selection && !preselection
            ? l.filter((x) => gardees.has(x.id))
            : l.map((x) => (gardees.has(x.id) || (preselection && estCachee(x)) ? x : { ...x, preselection }))
        );
        setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + (preselection ? n : -n)), ...(f.selection && !preselection ? { liste: gardees.size, dossier: gardees.size } : {}) } : c));
        toutDecocher();
        annoncer({ texte: preselection ? `${photosDe(n)} ${n > 1 ? "ajoutées" : "ajoutée"} à ${v("votre", "ta")} sélection` : `${photosDe(n)} ${n > 1 ? "retirées" : "retirée"} de ${v("votre", "ta")} sélection` });
        return;
      }
      const cochees = await cocheesLues();
      if (geste === "cacher") {
        const a = cochees.filter((x) => !estCachee(x));
        if (!a.length) {
          toutDecocher();
          annoncer({ texte: cochees.length > 1 ? "Elles sont déjà marquées « Ne pas publier »" : "Elle est déjà marquée « Ne pas publier »" });
          return;
        }
        const faites = await marquerLot(a.map((x) => x.id), { signalee: true });
        setSignalees((s) => ({ ...s, ...Object.fromEntries(faites.map((id) => [id, true])) }));
        compterSignalees(faites.length);
        toutDecocher();
        if (faites.length < a.length) setErreur(`${nombre(a.length - faites.length)} photo${a.length - faites.length > 1 ? "s n'ont" : " n'a"} pas pu être marquée${a.length - faites.length > 1 ? "s" : ""}. Réessayer.`);
        if (faites.length)
          annoncer({
            texte: faites.length > 1 ? `${photosDe(faites.length)} ne seront pas publiées` : "Elle ne sera pas publiée",
            sous: faites.length > 1 ? "Elles restent visibles ici" : "Elle reste visible ici",
            annuler: () => {
              setSignalees((s) => ({ ...s, ...Object.fromEntries(faites.map((id) => [id, false])) }));
              compterSignalees(-faites.length);
              void marquerLot(faites, { signalee: false });
            },
          });
        return;
      }
      const a = cochees.filter((x) => x.preselection !== preselection);
      if (!a.length) {
        toutDecocher();
        annoncer({ texte: preselection ? `Déjà dans ${v("votre", "ta")} sélection` : `Pas dans ${v("votre", "ta")} sélection : rien à retirer` });
        return;
      }
      const faites = await marquerLot(a.map((x) => x.id), { preselection });
      const ids = new Set(faites);
      poserSelection(ids, preselection, preselection ? faites.length : -faites.length);
      toutDecocher();
      if (faites.length < a.length) setErreur(`${nombre(a.length - faites.length)} photo${a.length - faites.length > 1 ? "s n'ont" : " n'a"} pas pu être enregistrée${a.length - faites.length > 1 ? "s" : ""}. Réessayer.`);
      annoncer({
        texte: preselection ? `${photosDe(faites.length)} ${faites.length > 1 ? "ajoutées" : "ajoutée"} à ${v("votre", "ta")} sélection` : `${photosDe(faites.length)} ${faites.length > 1 ? "retirées" : "retirée"} de ${v("votre", "ta")} sélection`,
        annuler: faites.length
          ? () => {
              const retour = photos.filter((x) => ids.has(x.id));
              if (f.selection && !preselection) setPhotos((l) => [...retour.map((x) => ({ ...x, preselection: true })), ...l]);
              else setPhotos((l) => l.map((x) => (ids.has(x.id) ? { ...x, preselection: !preselection } : x)));
              setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + (preselection ? -faites.length : faites.length)) } : c));
              void marquerLot(faites, { preselection: !preselection });
            }
          : undefined,
      });
    } finally {
      setOccupe(false);
      setProgres(null);
    }
  }

  /* ── Une personne (planche 4) : sa fiche, renommer, fusionner ── */
  const lirePersonnes = useCallback(async () => {
    setPersonnesLues("lecture");
    try {
      const rep = await fetch("/api/collectif/personnes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, action: "lister" }) });
      const json = (await rep.json().catch(() => null)) as ListePersonnes | null;
      if (!rep.ok || !json || !Array.isArray(json.personnes)) throw new Error(String(rep.status));
      setPersonnes({ personnes: json.personnes, proposees: Array.isArray(json.proposees) ? json.proposees : [], avecAdresses: json.avecAdresses === true });
      setPersonnesLues("oui");
    } catch {
      setPersonnesLues("erreur");
    }
  }, [p.token]);
  /* La liste se lit à la première fiche ouverte (une lecture du résumé et des personnes, jamais la grille). */
  useEffect(() => {
    if (cleFiche && personnesLues === "non") void lirePersonnes();
  }, [cleFiche, personnesLues, lirePersonnes]);

  /** Renommer ou fusionner : la route, puis la fiche se rouvre sous le nom gardé (la grille est rangée par nom). */
  async function ecrirePersonne(corps: Record<string, unknown>): Promise<{ nom: string; n: number } | null> {
    setOccupe(true);
    setErreurFenetre(null);
    try {
      const rep = await fetch("/api/collectif/personnes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, ...corps }) });
      const json = (await rep.json().catch(() => ({}))) as { error?: unknown; message?: unknown; nom?: unknown; n?: unknown };
      if (!rep.ok) {
        /* Sans la migration : la phrase sobre, jamais le message de la route (il nomme le fichier SQL). */
        setErreurFenetre(json.error === ERREUR_PERSONNES_ABSENTE ? MIGRATION_TEXTE : typeof json.message === "string" ? json.message : `Non enregistré (erreur ${rep.status}).`);
        return null;
      }
      return { nom: typeof json.nom === "string" ? json.nom : "", n: typeof json.n === "number" ? json.n : 0 };
    } catch {
      setErreurFenetre("Le réseau n'a pas répondu. Rien n'a changé.");
      return null;
    } finally {
      setOccupe(false);
    }
  }
  async function renommerPersonne(qui: PersonneVue, prenom: string, nom: string) {
    const r = await ecrirePersonne({ action: "renommer", personne: qui.ref, prenom, nom });
    if (!r) return;
    setRenommerP(null);
    void lirePersonnes();
    if (r.nom && f.personne) ouvrirPersonne(filtreSousLeNom(f.personne, r.nom));
    annoncer({ texte: `Nom changé : ${r.nom}`, sous: "Ses photos suivent, sur tous les liens" });
  }
  /** Fusionner, jamais d'office : `cible` = la personne de la fiche, `source` = l'autre, `garder` = le nom choisi. */
  async function fusionnerPersonnes(cible: PersonneVue, source: PersonneVue, garder: "cible" | "source") {
    const r = await ecrirePersonne({ action: "fusionner", source: source.ref, cible: cible.ref, garder });
    if (!r) return;
    setFusion(null);
    void lirePersonnes();
    if (r.nom && f.personne) ouvrirPersonne(filtreSousLeNom(f.personne, r.nom));
    annoncer({ texte: "Fusion faite", sous: `Toutes les photos sont rangées sous « ${r.nom} »` });
  }

  async function viderSelection() {
    if (await appeler("/api/collectif/photos/marquer", { toutes: true, preselection: false, dossier: "selection" })) relire();
  }

  /* ── Ranger et renommer les dossiers du responsable (dans « Mes photos ») ── */
  const nouvelleCle = (apres: unknown) => (typeof apres === "string" ? cleResp("organisateur", apres === DOSSIER_RESPONSABLE ? "" : apres) : null);
  async function ranger(cle: string, dans: string | null) {
    setGlisse(null);
    setSurvol(null);
    if (dans === cle) return;
    const json = await appeler("/api/collectif/dossiers", { cle, dans });
    if (!json) return;
    if (f.dossier === cle) appliquer({ ...f, dossier: nouvelleCle(json.apres) });
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
    if (f.dossier === cle && cle.startsWith("resp:")) appliquer({ ...f, dossier: nouvelleCle(json.apres) });
    else relire();
  }
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

  /* ── Ce que la vue montre ── */
  const avecVous = p.ecrire;
  const ouvertNoeud = arbre ? noeudDuLien(arbre, f.lien, avecVous) : undefined;
  const dossierNoeud = arbre && f.dossier ? noeudDe(arbre, f.dossier) : undefined;
  const personneNoeud = arbre && f.personne ? noeudDe(arbre, f.personne) : undefined;
  const nomVous = p.ecrire ? "Mes photos" : "Les dossiers du responsable";
  /* Le responsable, dans les listes et sur ses vignettes : « Vous » (ou « Toi ») pour lui-même. */
  const nomPersonne = (n: { cle: string; nom: string }) => (n.cle === QUI_RESPONSABLE && p.ecrire ? v("Vous", "Toi") : n.nom);
  const quiDe = (ph: Photo) => (ph.role === "responsable" && p.ecrire ? v("Vous", "Toi") : ph.qui);
  /* Rien reçu, et rien à la corbeille : l'accueil. Des photos à la corbeille gardent les listes (on y retourne). */
  const vide = stats?.photos === 0 && !stats.corbeille;
  const total = stats?.photos ?? 0;
  const liensListe = arbre ? liensDansLOrdre(arbre, avecVous) : [];
  const nomOuvert = ouvertNoeud ? (ouvertNoeud.cle === "vous" ? nomVous : ouvertNoeud.nom) : "";
  const titre = f.selection
    ? "Ma sélection"
    : albums
      ? "Par lien"
      : personneNoeud
        ? nomPersonne(personneNoeud)
        : dossierNoeud
          ? dossierNoeud.nom
          : f.mode === "liens" && ouvertNoeud
            ? nomOuvert
            : "Toutes les photos";
  const contexteVue = f.mode === "liens" && ouvertNoeud ? nomOuvert : titre;
  const filtree = !f.selection && (Boolean(f.lien || f.personne || f.dossier || f.jour) || f.doublons || f.signalees);
  const nbContributions = liensListe.filter((x) => x.cle.startsWith("lien:")).length;
  const note = f.selection
    ? `${photosDe(compteurs?.selection ?? 0)}${p.preselectionMax ? ` · ${p.preselectionMax} prévues, facultatif` : ""}`
    : albums
      ? `${nombre(nbContributions)} lien${nbContributions > 1 ? "s" : ""}${liensListe.some((x) => x.cle === "participants") ? ", le lien général" : ""}${p.ecrire && liensListe.some((x) => x.cle === "vous" && x.n) ? ` et ${v("vos", "tes")} photos` : ""} · ${photosDe(total)}`
      : f.mode === "liens" && ouvertNoeud && !personneNoeud && !dossierNoeud
        ? ouvertNoeud.cle === "vous"
          ? `${nombre(arbre?.vous.length ?? 0)} dossier${(arbre?.vous.length ?? 0) > 1 ? "s" : ""} · ${photosDe(ouvertNoeud.n)}`
          : ouvertNoeud.enfants.length
            ? `${personnesDe(ouvertNoeud.enfants.length)} · ${photosDe(ouvertNoeud.n)}`
            : photosDe(ouvertNoeud.n)
        : filtree && totalVue !== null
          ? `${photosDe(totalVue)} sur ${nombre(total)}`
          : totalVue !== null
            ? photosDe(totalVue)
            : "";
  const partageable = p.ecrire && p.ouverte && liens && f.mode === "liens" && (f.lien === "participants" || f.lien?.startsWith("lien:"));
  const lienPartage = (): LienPartage | null => {
    if (!liens) return null;
    if (f.lien === "participants") return lienDe(liens.general.nom, null, liens.general.plafond, liens.general.n);
    const l = liens.liens.find((x) => `lien:${x.id}` === f.lien);
    return l ? lienDe(l.nom, l.cle, l.plafond, l.n) : null;
  };
  const renommable = p.ecrire && !f.personne && (dossierNoeud?.renommable || (!f.dossier && f.mode === "liens" && f.lien?.startsWith("lien:") && ouvertNoeud?.renommable));

  /* ── Les liens (l'onglet) ── */
  const lienDe = (nom: string, cle: string | null, plafondTexte: string, n: number): LienPartage => ({
    libelle: nom,
    url: cle ? `${p.lienParticipants}?p=${cle}` : p.lienParticipants,
    plafond: plafondTexte,
    recues: n,
    general: cle === null,
  });
  const nbLiens = (liens?.liens.length ?? 0) + 1;
  const maxPlafond = liens?.reste !== null && liens?.reste !== undefined ? Math.max(1, Math.min(p.max, liens.reste)) : p.max;

  /* ── La photo agrandie ── */
  const iAgrandi = agrandi ? visibles.findIndex((x) => x.id === agrandi) : -1;
  const photoAgrandie = iAgrandi >= 0 ? visibles[iAgrandi] : null;
  const envoiVisible = moteur.enCours > 0 || moteur.erreurs > 0;

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
  const commencerRenommer = () => {
    if (dossierNoeud?.renommable) setEdite({ cle: dossierNoeud.cle, valeur: dossierNoeud.nom });
    else if (ouvertNoeud && f.lien?.startsWith("lien:")) setRenommer({ id: f.lien.slice(5), nom: ouvertNoeud.nom });
  };

  const glisser = p.ecrire
    ? { glisser: propsGlisser, recevoir: propsRecevoir, survol, glisse, nouveau: p.ouverte && envoi.ouvrir ? () => envoi.ouvrir?.({ nouveau: true }) : null }
    : null;
  const listes = (variante: "colonne" | "feuille") => (
    <Listes
      variante={variante}
      f={f}
      changer={appliquer}
      arbre={arbre}
      ecrire={p.ecrire}
      tu={p.tu}
      nomPersonne={nomPersonne}
      doublons={compteurs?.doublons ?? null}
      selection={compteurs?.selection ?? null}
      signalees={compteurs?.signalees ?? null}
      corbeille={stats?.corbeille ?? null}
      voirCorbeille={p.ecrire}
      jours={jours}
      suite={suivante !== null}
      dossiers={glisser}
    />
  );

  /* La fiche d'une personne : les autres de l'édition, à qui la fusionner (les doublons proposés d'abord ; ni « Sans nom »). */
  const candidates = (() => {
    if (!fiche || !personnes) return [];
    const proposees = new Set(fiche.propositions.map((x) => x.personne.ref));
    return personnes.personnes
      .filter((x) => x.ref !== fiche.personne.ref && x.cle !== clePersonne(SANS_NOM))
      .sort((a, b) => Number(proposees.has(b.ref)) - Number(proposees.has(a.ref)) || b.n - a.n);
  })();
  const filFiche =
    f.mode === "liens" && ouvertNoeud ? (
      <nav className="ec-ph-fil ec-pe-fil ec-ph-ordi" aria-label={v("Où vous êtes", "Où tu es")}>
        <button type="button" className="ec-ph-lien" onClick={() => appliquer(avecLien(f, null))}>
          Par lien
        </button>
        <Trace d={TRACE.chev} taille={14} epais={2} />
        <button type="button" className="ec-ph-lien" onClick={() => appliquer({ ...f, personne: null, dossier: null })}>
          {nomOuvert}
        </button>
        <Trace d={TRACE.chev} taille={14} epais={2} />
      </nav>
    ) : (
      <nav className="ec-ph-fil ec-pe-fil ec-ph-ordi" aria-label={v("Où vous êtes", "Où tu es")}>
        <button type="button" className="ec-ph-lien" onClick={() => appliquer({ ...f, personne: null })}>
          Toutes les photos
        </button>
        <Trace d={TRACE.chev} taille={14} epais={2} />
      </nav>
    );

  /* Les albums des liens (« Par lien ») : une carte par lien sur ordinateur, une rangée au téléphone. */
  const sousAlbum = (n: Noeud) =>
    n.cle === "vous"
      ? p.ecrire
        ? v("déposées par vous", "déposées par toi")
        : "déposées par le responsable"
      : n.cle === "atelier"
        ? "déposées par l'atelier"
        : n.cle === "participants"
          ? "le lien général"
          : n.n
            ? personnesDe(Math.max(1, n.enfants.length))
            : "rien reçu pour l'instant";
  const couvDe = (n: Noeud) => (n.cle === "vous" ? couvVous : couvertures[n.cle]);
  const icone = (n: Noeud) => (n.cle === "vous" ? TRACE.dossier : n.cle === "atelier" ? TRACE.atelier : TRACE.lien);

  const fenetres = (
    <>
      {renommerP ? (
        <FenetreRenommer
          personne={renommerP.personne}
          propose={renommerP.propose}
          tu={p.tu}
          occupe={occupe}
          erreur={erreurFenetre}
          onFermer={() => {
            setRenommerP(null);
            setErreurFenetre(null);
          }}
          onGarder={(prenom, nom) => void renommerPersonne(renommerP.personne, prenom, nom)}
        />
      ) : null}
      {fusion && fiche ? (
        <FenetreFusion
          personne={fiche.personne}
          autre={fusion.autre}
          candidates={candidates}
          arbre={arbre}
          avecAdresses={personnes?.avecAdresses ?? false}
          occupe={occupe}
          erreur={erreurFenetre}
          onFermer={() => {
            setFusion(null);
            setErreurFenetre(null);
          }}
          onFusionner={(autre, garder) => void fusionnerPersonnes(fiche.personne, autre, garder)}
        />
      ) : null}
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
      {grandQr ? <FenetreQr lien={grandQr} contexte={contexte} onFermer={() => setGrandQr(null)} /> : null}
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
                  if (f.lien === `lien:${supprimer.id}`) appliquer({ ...FILTRES_VIDES });
                  else relire();
                }
              }}
            >
              Supprimer le lien
            </button>
          </div>
        </Fenetre>
      ) : null}
    </>
  );

  /* Un message qui passe (après un geste), posé dans la colonne de contenu, au-dessus de la visionneuse. */
  const blocAvis = avis ? (
    <div className={photoAgrandie ? "ec-ph-avis ec-ph-avis--haut" : cocherActif ? "ec-ph-avis ec-ph-avis--barre" : "ec-ph-avis"} role="status">
      <span>
        {avis.texte}
        {avis.sous ? <small>{avis.sous}</small> : null}
      </span>
      {avis.annuler ? (
        <button
          type="button"
          className="ec-ph-lien"
          disabled={occupe}
          onClick={() => {
            avis.annuler?.();
            setAvis(null);
          }}
        >
          Annuler
        </button>
      ) : avis.voir ? (
        <button
          type="button"
          className="ec-ph-lien"
          onClick={() => {
            avis.voir?.();
            setAvis(null);
          }}
        >
          La voir
        </button>
      ) : null}
    </div>
  ) : null;
  const hote = client ? document.querySelector(".ec-contenu") : null;

  /* ─────────────────────────────── le rendu ─────────────────────────────── */
  const telLienOuvert = f.mode === "liens" && ouvertNoeud && !f.selection && !f.corbeille;
  /* Téléphone : la fiche d'une personne et la corbeille ont leur propre titre ; l'en-tête de l'écran et la barre se taisent. */
  const ecranPropre = onglet === "photos" && (f.corbeille || (Boolean(cleFiche) && !cocherActif));
  const retourTel: { texte: string; faire: () => void } | null =
    onglet !== "photos"
      ? null
      : f.corbeille
        ? { texte: "Les photos", faire: () => appliquer({ ...FILTRES_VIDES, ordre: f.ordre }) }
        : cleFiche && f.mode === "liens" && ouvertNoeud
          ? { texte: nomOuvert, faire: () => appliquer({ ...f, personne: null, dossier: null }) }
          : cleFiche
            ? { texte: "Les photos", faire: () => appliquer({ ...f, personne: null }) }
            : telLienOuvert
              ? { texte: "Par lien", faire: () => appliquer(avecLien(f, null)) }
              : null;
  return (
    <section
      className={`ec-ecran ec-collecte${telLienOuvert ? " ec-collecte--lien" : ""}${cocherActif ? " ec-collecte--cocher" : ""}${ecranPropre ? " ec-collecte--propre" : ""}${f.corbeille ? " ec-collecte--corbeille" : ""}`}
    >
      {retourTel ? (
        <button type="button" className="ec-ph-retour ec-ph-tel" onClick={retourTel.faire}>
          <Trace d={TRACE.retour} taille={16} epais={2} />
          {retourTel.texte}
        </button>
      ) : null}
      <EnTeteEcran
        titre={
          <>
            <span className="ec-ph-titre-ordi">Les photos</span>
            <span className="ec-ph-titre-tel">{onglet === "photos" && telLienOuvert ? (dossierNoeud?.nom ?? nomOuvert) : "Les photos"}</span>
          </>
        }
        sous={stats ? `${nombre(stats.photos)} reçue${stats.photos > 1 ? "s" : ""}` : undefined}
      >
        {p.ecrire ? (
          <nav className="ec-ph-onglets ec-ph-ordi" aria-label="Photos ou liens">
            <button type="button" aria-pressed={onglet === "photos"} onClick={() => changerOnglet("photos")}>
              Les photos
            </button>
            <button type="button" aria-pressed={onglet === "liens"} onClick={() => changerOnglet("liens")}>
              Les liens · {nbLiens}
            </button>
          </nav>
        ) : null}
        {p.ecrire && onglet === "photos" && telLienOuvert && partageable ? (
          <button
            type="button"
            className="ec-ph-pilule ec-ph-tel"
            onClick={() => {
              const l = lienPartage();
              if (l) setPartage(l);
            }}
          >
            <Trace d={TRACE.partage} taille={15} epais={1.8} />
            Partager
          </button>
        ) : p.ecrire && !(onglet === "photos" && telLienOuvert) ? (
          <button type="button" className="ec-ph-pilule ec-ph-tel" onClick={() => changerOnglet(onglet === "photos" ? "liens" : "photos")}>
            {onglet === "photos" ? (
              <>
                <Trace d={TRACE.lien} taille={15} epais={1.8} />
                Les liens · {nbLiens}
              </>
            ) : (
              "Les photos"
            )}
          </button>
        ) : null}
        {onglet === "photos" && envoi.ouvrir && p.ouverte ? (
          <button
            type="button"
            className="ec-bouton ec-bouton--petit ec-ph-ordi"
            onClick={() => envoi.ouvrir?.({ dossier: f.dossier && arbre && f.dossier.startsWith("resp:organisateur:") ? cheminDuNoeud(arbre, f.dossier) : null })}
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

      {erreur && !supprimer && !renommer && !plafond ? (
        <p className="ec-note ec-note--erreur ec-ph-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {onglet === "photos" ? (
        <>
          {stats ? (
            <div className="ec-ph-chiffres ec-ph-ordi">
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

          {/* Téléphone : la ligne des chiffres, puis la seule barre (ni dans la fiche d'une personne, ni dans la corbeille). */}
          {stats && !cocherActif && !ecranPropre ? (
            <p className="ec-ph-mligne ec-ph-tel">
              {telLienOuvert && ouvertNoeud ? (
                <>
                  {ouvertNoeud.enfants.length ? (
                    <>
                      <b>{nombre(ouvertNoeud.enfants.length)}</b> personne{ouvertNoeud.enfants.length > 1 ? "s" : ""} ·{" "}
                    </>
                  ) : null}
                  <b>{nombre(ouvertNoeud.n)}</b> photo{ouvertNoeud.n > 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <b>{nombre(stats.photos)}</b> photos · <b>{nombre(stats.personnes)}</b> personne{stats.personnes > 1 ? "s" : ""} · <b>{nombre(stats.doublons)}</b> doublon{stats.doublons > 1 ? "s" : ""}
                </>
              )}
            </p>
          ) : null}
          {!vide ? (
            cocherActif ? (
              <div className="ec-ph-barre-cocher ec-ph-tel">
                <button type="button" className="ec-ph-x" aria-label="Quitter le mode cocher" onClick={toutDecocher}>
                  <Trace d={TRACE.fermer} taille={18} epais={2} />
                </button>
                <b>
                  {nombre(nbCoches)} cochée{nbCoches > 1 ? "s" : ""}
                </b>
                {totalVue ? (
                  <button type="button" className="ec-ph-lien ec-ph-droite" onClick={toutCocher}>
                    Tout cocher ({nombre(totalVue)})
                  </button>
                ) : null}
              </div>
            ) : ecranPropre ? null : (
              <div className="ec-ph-moutils ec-ph-tel">
                <div className="ec-ph-seg" role="group" aria-label="Regarder">
                  <button type="button" aria-pressed={f.mode === "tout"} onClick={() => appliquer({ ...f, mode: "tout" })}>
                    Tout
                  </button>
                  <button type="button" aria-pressed={f.mode === "liens"} onClick={() => appliquer({ ...f, mode: "liens", selection: false, personne: f.lien ? f.personne : null })}>
                    Par lien
                  </button>
                </div>
                <button type="button" className="ec-ph-pilule ec-ph-pilule--filtre" onClick={() => setFeuille(true)} aria-haspopup="dialog">
                  <Trace d={TRACE.filtre} taille={15} epais={2} />
                  Filtrer
                  {nombreDeFiltres(f) ? <span className="ec-ph-rond">{nombreDeFiltres(f)}</span> : null}
                </button>
                {p.ecrire && !albums ? (
                  <button type="button" className="ec-ph-pilule ec-ph-droite" onClick={() => setModeCocher(true)}>
                    Cocher
                  </button>
                ) : null}
              </div>
            )
          ) : null}
          {cocherActif ? (
            <p className="ec-ph-mligne ec-ph-tel">
              {contexteVue} · {v("touchez d'autres photos pour les cocher.", "touche d'autres photos pour les cocher.")}
            </p>
          ) : null}
          {annonce ? (
            <div className="ec-ph-annonce ec-ph-annonce--tel ec-ph-tel" role="status">
              <span className="ec-ph-annonce-point" aria-hidden="true" />
              <strong>{annonce.court}</strong>
              <button type="button" className="ec-bouton ec-bouton--petit" onClick={voirArrivees}>
                Les voir
              </button>
            </div>
          ) : null}

          <div className={`ec-ph-panneau${cocherActif && nbCoches > 0 ? " ec-ph-panneau--barre" : ""}`}>
            <aside className="ec-ph-filtres ec-ph-ordi" aria-label="Trier et filtrer">
              {arbre && !vide ? listes("colonne") : null}
            </aside>

            <div className="ec-ph-zone">
              {f.corbeille ? <Corbeille token={p.token} tu={p.tu} onRestaurees={restaureesDeLaCorbeille} /> : null}
              {!f.corbeille ? (
              <>
              {!vide && !cleFiche ? (
                <div className="ec-ph-zone-tete ec-ph-ordi">
                  <div className="ec-ph-zone-titres">
                    {f.mode === "liens" && ouvertNoeud && !f.selection ? (
                      <nav className="ec-ph-fil" aria-label={v("Où vous êtes", "Où tu es")}>
                        <button type="button" className="ec-ph-lien" onClick={() => appliquer(avecLien(f, null))}>
                          Par lien
                        </button>
                        <Trace d={TRACE.chev} taille={14} epais={2} />
                        {f.personne || f.dossier ? (
                          <>
                            <button type="button" className="ec-ph-lien" onClick={() => appliquer({ ...f, personne: null, dossier: null })}>
                              {nomOuvert}
                            </button>
                            <Trace d={TRACE.chev} taille={14} epais={2} />
                          </>
                        ) : null}
                      </nav>
                    ) : null}
                    {edite && edite.cle === f.dossier ? (
                      champNom(edite.cle)
                    ) : (
                      <h2
                        className="ec-ph-zone-titre"
                        title={renommable ? "Double-cliquer pour changer le nom" : undefined}
                        onDoubleClick={() => renommable && commencerRenommer()}
                      >
                        {titre}
                        {renommable ? (
                          <button type="button" className="ec-ph-renommer" aria-label={`Changer le nom de « ${titre} »`} title="Changer le nom" onClick={commencerRenommer}>
                            <Trace d={TRACE.crayon} taille={16} epais={1.7} />
                          </button>
                        ) : null}
                      </h2>
                    )}
                    {note ? <span className="ec-note">{note}</span> : null}
                  </div>
                  <div className="ec-ph-outils">
                    {!albums ? (
                      <button
                        type="button"
                        className="ec-ph-pilule"
                        aria-label={`Ordre : ${parJour ? "par jour de prise de vue" : "plus récentes d'abord"}. Changer.`}
                        onClick={() => appliquer({ ...f, ordre: parJour ? "recentes" : "jour", jour: null })}
                        disabled={f.doublons || f.signalees}
                      >
                        <Trace d={TRACE.ordre} taille={15} epais={1.8} />
                        {parJour ? "Par jour de prise de vue" : "Plus récentes d'abord"}
                      </button>
                    ) : null}
                    {partageable ? (
                      <button
                        type="button"
                        className="ec-bouton ec-bouton--clair ec-bouton--petit"
                        onClick={() => {
                          const l = lienPartage();
                          if (l) setPartage(l);
                        }}
                      >
                        <Trace d={TRACE.partage} taille={15} epais={1.8} />
                        Partager ce lien
                      </button>
                    ) : null}
                    {p.ecrire && f.selection && (compteurs?.selection ?? 0) > 0 ? (
                      <button type="button" className="ec-ph-lien" disabled={occupe} onClick={viderSelection}>
                        Vider la sélection
                      </button>
                    ) : null}
                    {p.ecrire && !albums && totalVue ? (
                      <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={coches.tout && coches.ids.size === 0 ? toutDecocher : toutCocher}>
                        {coches.tout && coches.ids.size === 0 ? "Tout décocher" : `Tout cocher (${nombre(totalVue)})`}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* La fiche d'une personne dit déjà qui : ses puces ne restent que pour les autres filtres. */}
              {f.mode === "tout" && filtree && !vide && (!cleFiche || f.lien || f.dossier || f.jour || f.doublons || f.signalees) ? (
                <div className="ec-ph-actifs ec-ph-ordi">
                  {f.lien && ouvertNoeud ? <Puce texte={nomOuvert} retirer={() => appliquer(avecLien(f, null))} /> : null}
                  {f.dossier && dossierNoeud ? <Puce texte={dossierNoeud.nom} retirer={() => appliquer({ ...f, dossier: null })} /> : null}
                  {f.personne && personneNoeud && !cleFiche ? <Puce texte={nomPersonne(personneNoeud)} retirer={() => appliquer({ ...f, personne: null })} /> : null}
                  {f.jour ? <Puce texte={jourCourt(f.jour)} retirer={() => appliquer({ ...f, jour: null })} /> : null}
                  {f.doublons ? <Puce texte="Doublons" retirer={() => appliquer({ ...f, doublons: false })} /> : null}
                  {f.signalees ? <Puce texte="Ne pas publier" retirer={() => appliquer({ ...f, signalees: false })} /> : null}
                  <button type="button" className="ec-ph-lien ec-ph-lien--doux" onClick={() => appliquer({ ...FILTRES_VIDES, ordre: f.ordre })}>
                    Tout effacer
                  </button>
                </div>
              ) : null}

              {annonce ? (
                <div className="ec-ph-annonce ec-ph-ordi" role="status">
                  <span className="ec-ph-annonce-point" aria-hidden="true" />
                  <span>
                    <strong>{annonce.texte}</strong>, à l&apos;instant
                  </span>
                  <button type="button" className="ec-bouton ec-bouton--petit" onClick={voirArrivees}>
                    Les voir
                  </button>
                </div>
              ) : null}

              <div className="ec-collecte-grille ec-ph-defile ec-defile" ref={zone}>
                {/* Une personne : sa fiche au-dessus de ses photos (planche 4A, 4D). */}
                {cleFiche && !vide ? (
                  <FichePersonne
                    key={cleFiche}
                    nomGrille={personneNoeud ? nomPersonne(personneNoeud) : titre}
                    fiche={fiche}
                    erreur={personnesLues === "erreur"}
                    avecAdresses={p.ecrire && (personnes?.avecAdresses ?? false)}
                    arbre={arbre}
                    ecrire={p.ecrire}
                    totalVue={totalVue}
                    fil={filFiche}
                    tu={p.tu}
                    onRenommer={(propose) => {
                      setErreurFenetre(null);
                      if (fiche) setRenommerP({ personne: fiche.personne, propose: propose ?? null });
                    }}
                    onFusionner={(autre) => {
                      setErreurFenetre(null);
                      setFusion({ autre });
                    }}
                    onToutCocher={toutCocher}
                    onCocher={() => setModeCocher(true)}
                  />
                ) : null}

                {/* Téléphone : le lien ouvert et ses personnes, en liste (planche 2D) ; pas sous la fiche d'une personne. */}
                {telLienOuvert && !cleFiche && ouvertNoeud && (ouvertNoeud.enfants.length || ouvertNoeud.cle === "vous") ? (
                  <div className="ec-ph-liste-verre ec-ph-tel">
                    <button type="button" className={!f.personne && !f.dossier ? "ec-ph-rangee ec-ph-rangee--on ec-ph-rangee--court" : "ec-ph-rangee ec-ph-rangee--court"} onClick={() => appliquer({ ...f, personne: null, dossier: null })}>
                      <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                        <Trace d={ouvertNoeud.cle === "vous" ? TRACE.dossier : TRACE.lien} taille={16} epais={1.8} />
                      </span>
                      <span className="ec-ph-rangee-txt">
                        <b>{ouvertNoeud.cle === "vous" ? (p.ecrire ? v("Tous vos dossiers", "Tous tes dossiers") : "Tous ses dossiers") : "Tout le monde"}</b>
                      </span>
                      <span className="ec-ph-n">{nombre(ouvertNoeud.n)}</span>
                      <Trace d={TRACE.chev} taille={16} epais={2} />
                    </button>
                    {(ouvertNoeud.cle === "vous" ? ouvertNoeud.enfants.flatMap((d) => [d, ...d.enfants]) : ouvertNoeud.enfants).map((x) => {
                      const on = f.personne === x.cle || f.dossier === x.cle;
                      return (
                        <button
                          key={x.cle}
                          type="button"
                          className={on ? "ec-ph-rangee ec-ph-rangee--on ec-ph-rangee--court" : "ec-ph-rangee ec-ph-rangee--court"}
                          onClick={() => appliquer(x.cle.startsWith("resp:") ? { ...f, dossier: x.cle, personne: null } : { ...f, personne: x.cle, dossier: null })}
                        >
                          <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                            {x.cle.startsWith("resp:") ? <Trace d={TRACE.dossier} taille={16} epais={1.8} /> : initialesDe(x.nom)}
                          </span>
                          <span className="ec-ph-rangee-txt">
                            <b>{nomPersonne(x)}</b>
                          </span>
                          <span className="ec-ph-n">{nombre(x.n)}</span>
                          <Trace d={TRACE.chev} taille={16} epais={2} />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {albums && arbre && !vide ? (
                  <>
                    <div className="ec-ph-cartes">
                      {liensListe.map((n) => {
                        const couv = couvDe(n);
                        return (
                          <button key={n.cle} type="button" className={n.n ? "ec-ph-carte" : "ec-ph-carte ec-ph-carte--vide"} onClick={() => appliquer(avecLien(f, n.cle))} {...propsRecevoir(n.cle, false)}>
                            <span className="ec-ph-mosa" aria-hidden="true">
                              {couv ? <img src={couv} alt="" loading="lazy" decoding="async" /> : <Trace d={icone(n)} taille={22} epais={1.6} />}
                            </span>
                            <span className="ec-ph-carte-txt">
                              <b>{n.cle === "vous" ? nomVous : n.nom}</b>
                              {/* Ordinateur : le nombre de photos, puis ce qu'il y a dedans ; téléphone : le nombre est à droite. */}
                              <span className="ec-ph-ordi">
                                {!n.n ? "Rien reçu pour l'instant" : n.cle === "vous" || n.cle === "atelier" ? photosDe(n.n) : `${photosDe(n.n)} · ${personnesDe(Math.max(1, n.enfants.length))}`}
                              </span>
                              {n.cle === "vous" || n.cle === "participants" || n.cle === "atelier" ? <span className="ec-ph-ordi">{sousAlbum(n)}</span> : null}
                              <span className="ec-ph-tel">
                                {n.cle === "vous" || n.cle === "atelier"
                                  ? sousAlbum(n)
                                  : !n.n
                                    ? "Rien reçu pour l'instant"
                                    : n.cle === "participants"
                                      ? `${personnesDe(Math.max(1, n.enfants.length))} · le lien général`
                                      : personnesDe(Math.max(1, n.enfants.length))}
                              </span>
                            </span>
                            <span className="ec-ph-n ec-ph-tel">{nombre(n.n)}</span>
                            <span className="ec-ph-tel ec-ph-chev-carte">
                              <Trace d={TRACE.chev} taille={16} epais={2} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {photos.length ? (
                      <div className="ec-ph-arrivees">
                        <strong className="ec-ph-arrivees-titre">Dernières arrivées</strong>
                        <span className="ec-note">{v("Touchez une photo pour l'agrandir", "Touche une photo pour l'agrandir")}</span>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {vide ? (
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

                {!albums && !vide && visibles.length === 0 && !chargement && stats ? (
                  <div className="ec-a-venir">
                    <p className="ec-texte">
                      {f.selection
                        ? v("Rien dans votre sélection : l'étoile d'une photo l'y ajoute.", "Rien dans ta sélection : l'étoile d'une photo l'y ajoute.")
                        : f.doublons
                          ? "Aucun doublon ici."
                          : f.signalees
                            ? "Aucune photo marquée « Ne pas publier » ici."
                          : f.jour
                            ? "Aucune photo ce jour-là ici."
                            : f.lien || f.personne || f.dossier
                              ? "Rien reçu ici pour l'instant."
                              : v("Aucune photo pour l'instant. Déposez les vôtres, ou partagez un lien.", "Aucune photo pour l'instant. Dépose les tiennes, ou partage un lien.")}
                    </p>
                  </div>
                ) : null}

                {!vide ? (
                  <Grille
                    photos={visibles}
                    parJour={parJour && !albums}
                    jours={jours ?? []}
                    ecrire={p.ecrire && !albums}
                    cocher={cocherActif}
                    estCochee={estCochee}
                    estCachee={estCachee}
                    seuilNouvelles={seuilNouvelles}
                    quiDe={quiDe}
                    attente={chargement && photos.length > 0 && !albums ? 8 : 0}
                    onOuvrir={setAgrandi}
                    onCocher={cocher}
                    onEtoile={(ph) => void basculer(ph)}
                    onAppuiLong={(id) => {
                      setModeCocher(true);
                      if (!estCochee(id)) cocher(id, false);
                    }}
                    onCocherJour={p.ecrire ? cocherLeJour : null}
                  />
                ) : null}
                <div ref={fin} />
                {chargement && photos.length === 0 && !vide ? <p className="ec-note ec-ph-chargement">Chargement des photos…</p> : null}
                {chargement && photos.length > 0 ? (
                  <p className="ec-note ec-ph-chargement">
                    Chargement des suivantes · {nombre(photos.length)} affichées{compteurs ? ` sur ${nombre(compteurs.liste)}` : ""}
                  </p>
                ) : null}
                {suivante && !chargement && !f.jour ? (
                  <button type="button" className="ec-bouton ec-bouton--clair ec-ph-suite" onClick={() => void charger(suivante, f)}>
                    Voir la suite
                  </button>
                ) : null}
              </div>
              </>
              ) : null}
              <div className="ec-ph-zone-pied ec-ph-ordi" aria-hidden="true" />
            </div>

            {/* La barre d'actions (ordinateur) : en bas du panneau dès qu'une photo est cochée. */}
            {p.ecrire && nbCoches > 0 ? (
              <div className="ec-ph-barre-actions ec-ph-ordi" role="toolbar" aria-label="Agir sur les photos cochées">
                <span className="ec-ph-compte">
                  <b>{nombre(nbCoches)}</b>
                  <span className="ec-ph-act-long">{` photo${nbCoches > 1 ? "s" : ""}`}</span>
                  {` cochée${nbCoches > 1 ? "s" : ""}`}
                </span>
                <button type="button" className="ec-ph-lien ec-ph-lien--doux ec-ph-tout-decocher" onClick={toutDecocher}>
                  Tout décocher
                </button>
                <span className="ec-ph-sep" aria-hidden="true" />
                {progres ? <span className="ec-ph-progres">{progres}</span> : null}
                <button type="button" className="ec-ph-act ec-ph-act--prem" disabled={occupe} onClick={() => void agir("ajouter")}>
                  <Trace d={ICONES.etoile} taille={16} plein epais={1.6} />
                  <span className="ec-ph-act-long">Ajouter à ma sélection</span>
                  <span className="ec-ph-act-court">Ma sélection</span>
                </button>
                <button type="button" className="ec-ph-act" disabled={occupe} onClick={() => void agir("retirer")}>
                  <Trace d={TRACE.retirer} taille={16} epais={1.7} />
                  Retirer<span className="ec-ph-act-long"> de ma sélection</span>
                </button>
                <button type="button" className="ec-ph-act" disabled={occupe} onClick={() => void agir("cacher")}>
                  <Trace d={ICONES.cache} taille={16} epais={1.7} />
                  Ne pas publier
                </button>
                {/* « Supprimer » : la corbeille 30 jours, sans fenêtre de confirmation (« Annuler » quelques secondes). */}
                <button type="button" className="ec-ph-act ec-ph-act--danger" disabled={occupe} onClick={() => void agir("supprimer")}>
                  <Trace d={ICONES.corbeille} taille={16} epais={1.7} />
                  Supprimer
                </button>
                <button type="button" className="ec-ph-act ec-ph-act--x" aria-label="Fermer la barre et tout décocher" onClick={toutDecocher}>
                  <Trace d={TRACE.fermer} taille={16} epais={2} />
                </button>
              </div>
            ) : null}
          </div>

          {/* Téléphone : « Déposer » sous le pouce (la pastille d'envoi prend sa place pendant un envoi). */}
          {p.ecrire && p.ouverte && envoi.ouvrir && !cocherActif && !envoiVisible && !ecranPropre ? (
            <button
              type="button"
              className="ec-ph-fab ec-ph-tel"
              onClick={() => envoi.ouvrir?.({ dossier: f.dossier && arbre && f.dossier.startsWith("resp:organisateur:") ? cheminDuNoeud(arbre, f.dossier) : null })}
            >
              <Trace d={TRACE.plus} taille={18} epais={2.2} />
              Déposer
            </button>
          ) : null}
          {/* Téléphone : la barre d'actions fixe, sous le pouce. */}
          {cocherActif ? (
            <div className="ec-ph-bas ec-ph-tel" role="toolbar" aria-label="Agir sur les photos cochées">
              {progres ? <p className="ec-ph-progres">{progres}</p> : null}
              <div className="ec-ph-bas-actions">
                <button type="button" disabled={occupe || !nbCoches} onClick={() => void agir("ajouter")}>
                  <Trace d={ICONES.etoile} taille={20} plein epais={1.6} />
                  Ma sélection
                </button>
                <button type="button" disabled={occupe || !nbCoches} onClick={() => void agir("retirer")}>
                  <Trace d={TRACE.retirer} taille={20} epais={1.7} />
                  Retirer
                </button>
                <button type="button" disabled={occupe || !nbCoches} onClick={() => void agir("cacher")}>
                  <Trace d={ICONES.cache} taille={20} epais={1.7} />
                  Ne pas publier
                </button>
                <button type="button" className="ec-ph-bas-danger" disabled={occupe || !nbCoches} onClick={() => void agir("supprimer")}>
                  <Trace d={ICONES.corbeille} taille={20} epais={1.7} />
                  Supprimer
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <OngletLiens
          liens={liens}
          tu={p.tu}
          ouverte={p.ouverte}
          cloture={p.cloture}
          lienParticipants={p.lienParticipants}
          plafondGeneral={p.plafondGeneral}
          max={p.max}
          maxPlafond={maxPlafond}
          lienDe={lienDe}
          setPartage={setPartage}
          setGrandQr={setGrandQr}
          ouvrir={ouvrir}
          setRenommer={setRenommer}
          setPlafond={setPlafond}
          setSupprimer={setSupprimer}
        />
      )}

      {/* Téléphone : les filtres dans une feuille du bas (planche 2E). */}
      {feuille && hote
        ? createPortal(
            <div className="ec-ph-feuille-voile" role="presentation" onClick={() => setFeuille(false)}>
              <div className="ec-ph-feuille" role="dialog" aria-modal="true" aria-label="Filtrer" onClick={(e) => e.stopPropagation()}>
                <div className="ec-ph-poignee" aria-hidden="true" />
                <div className="ec-ph-feuille-tete">
                  <h2>Filtrer</h2>
                  <button type="button" className="ec-ph-lien ec-ph-lien--doux" onClick={() => appliquer({ ...FILTRES_VIDES, mode: f.mode })}>
                    Tout effacer
                  </button>
                </div>
                <div className="ec-ph-feuille-corps">{arbre ? listes("feuille") : null}</div>
                <div className="ec-ph-feuille-pied">
                  <button type="button" className="ec-bouton ec-ph-large" onClick={() => setFeuille(false)}>
                    {albums ? "Voir les liens" : totalVue !== null ? `Voir ${photosDe(totalVue)}` : chargement ? "Lecture…" : "Voir les photos"}
                  </button>
                </div>
              </div>
            </div>,
            hote
          )
        : null}

      {photoAgrandie ? (
        <Agrandir
          photo={photoAgrandie}
          position={iAgrandi + 1}
          total={totalVue}
          contexte={contexteVue}
          qui={quiDe(photoAgrandie)}
          initiales={initialesDe(photoAgrandie.qui)}
          lien={lienDeLaPhoto(arbre, photoAgrandie, ouvertNoeud)}
          voirSes={(() => {
            const cle = cleQui(photoAgrandie);
            const n = cle && arbre ? noeudDe(arbre, cle) : undefined;
            if (!cle || !n) return null;
            return {
              libelle: photoAgrandie.role === "responsable" && p.ecrire ? v(`Voir vos ${nombre(n.n)} photos`, `Voir tes ${nombre(n.n)} photos`) : `Voir ses ${photosDe(n.n)}`,
              faire: () => appliquer({ ...FILTRES_VIDES, ordre: f.ordre, personne: cle }),
            };
          })()}
          ecrire={p.ecrire}
          tu={p.tu}
          cachee={estCachee(photoAgrandie)}
          voisines={[visibles[iAgrandi - 1], visibles[iAgrandi + 1]].map((x) => x?.grande ?? x?.vignette).filter((x): x is string => Boolean(x))}
          onPrecedente={iAgrandi > 0 ? () => setAgrandi(visibles[iAgrandi - 1].id) : null}
          onSuivante={
            iAgrandi < visibles.length - 1
              ? () => setAgrandi(visibles[iAgrandi + 1].id)
              : suivante !== null && suivante !== 0 && !chargement && !f.jour
                ? () =>
                    void charger(suivante, f).then((nouvelles) => {
                      if (nouvelles?.length) setAgrandi(nouvelles[0].id);
                    })
                : null
          }
          onFermer={() => setAgrandi(null)}
          onSelection={() => void basculer(photoAgrandie)}
          onCacher={() => void cacher(photoAgrandie, !estCachee(photoAgrandie))}
          onSupprimer={p.ecrire ? () => void mettreALaCorbeille([photoAgrandie.id]) : undefined}
          occupe={occupe}
        />
      ) : null}

      {blocAvis && hote ? createPortal(blocAvis, hote) : null}
      {fenetres}
    </section>
  );
}

function Puce({ texte, retirer }: { texte: string; retirer: () => void }) {
  return (
    <span className="ec-ph-puce">
      {texte}
      <button type="button" aria-label={`Retirer le filtre « ${texte} »`} onClick={retirer}>
        <Trace d="M6 6l12 12M18 6 6 18" taille={12} epais={2.4} />
      </button>
    </span>
  );
}
