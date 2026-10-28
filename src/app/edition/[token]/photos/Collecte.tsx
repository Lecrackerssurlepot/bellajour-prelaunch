"use client";

/* La page Photos du responsable, « comme une application » (planches 8 à 13 du 22/10/2026, « Photos, en plus simple », validées par Mathias).
   L'écran d'avant (planches 1 à 5 des 20 et 21/10 : le haut chargé de boutons, les filtres Jour et Afficher, « Cocher », l'étoile et le nom sur
   chaque vignette, la fiche d'une personne, Renommer et Fusionner) est dans `archive/photos-simple-2026-10/` ; l'ancienne page « en rayons »
   dans `archive/photos-rayons-2026-10`.

   LA RÈGLE de Mathias : « si un bouton n'a pas sa place, s'il peut être remplacé ou mieux placé, s'il ajoute une étape, il n'a pas sa place ».
   Le téléphone a des PLACES FIXES : la barre du bas dit où l'on est (« Toutes · Par lien » et le rond « Personnes »), en haut à droite le « + » de
   dépôt (l'action la plus importante) et UN « … » (Sélectionner, Supprimées récemment, puis Terminer la collecte), les choix s'ouvrent en feuille
   du bas, l'appui long ouvre le menu d'une photo, et aucun texte ne s'ajoute quand l'écran est plein.

   - TOUTES : la grille rangée PAR JOUR de prise de vue, les plus récents en haut (`regrouperParJour`), un intertitre collant par jour. Des
     vignettes propres : une photo, rien d'autre. Toucher agrandit. La mise à jour en direct (« N nouvelles · Les voir ») et le chargement par
     pages (120 vignettes) restent.
   - PERSONNES : le rond de la barre du bas ouvre une feuille (une recherche, des pastilles, plusieurs possibles) ; les personnes choisies se voient
     en pastilles sous le titre, avec leur croix. Plus de page d'une personne, ni de Renommer, ni de Fusionner : l'atelier les garde sur sa fiche.
   - DEUX GESTES sur une photo : le CŒUR (favori ; toucher de nouveau le retire) et SUPPRIMER (la corbeille de 30 jours, « Supprimées récemment »).
     Ils vivent sur la photo agrandie, dans la barre de sélection et dans le menu de l'appui long. Le cœur s'écrit avec les marques existantes de
     « Ma sélection » (`preselection`) : l'atelier les retrouve dans son téléchargement. « Retirer » et « Ne pas publier » ont disparu de l'espace du
     client ; les marques déjà posées restent en base.
   - TERMINER LA COLLECTE : une feuille à deux choix (`ChoixFinCollecte`) ; « Choisir d'abord mes préférées » est un mode calme où l'on touche les
     photos à garder, puis « Envoyer ma sélection » écrit les cœurs PUIS termine (`envoyerMaSelection`, photosSimples.ts : si les cœurs ne passent
     pas, la collecte n'est pas terminée).
   - PAR LIEN : la mosaïque (« Nouveau lien » en dernière tuile), un lien ouvert (sa tuile, ses personnes en pastilles, la grille par jour).
     Partager ouvre la feuille de partage de l'iPhone, sans fenêtre ; sinon une petite fenêtre (« Copier le message », « QR code »).
   - ORDINATEUR : le dessin d'avant reste, avec les mêmes retraits : la colonne (Toutes, les liens, Personnes, « Supprimées récemment » en bas),
     la grille rangée par jour, « Tout sélectionner » seulement après une première photo, une barre avec le cœur et Supprimer.
   L'équipe (lecture seule) ne voit ni « + », ni « … », ni Sélectionner, ni corbeille, ni Terminer. */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { accueilDesArrivees, ceQuiABouge, corpsSondagePhotos, lireEtatSondage, phraseArrivees, SONDAGE_PHOTOS_MS, type EtatSondage, type Nouvelles, type SituationPhotos } from "@/lib/collectif/arrivees";
import { DELAI_CORBEILLE_JOURS } from "@/lib/collectif/corbeille";
import { pastilleCollecteTerminee } from "@/lib/collectif/finCollecte";
import { cheminDuNoeud, clePersonne, cleResp, DOSSIER_RESPONSABLE, noeudDe, QUI_RESPONSABLE, QUIS, type Arbre, type Noeud } from "@/lib/collectif/dossiers";
import { ERREUR_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { lienDeGroupe } from "@/lib/collectif/liens";
import { corpsModifierLien } from "@/lib/collectif/modifierLien";
import { figerLesPesees, peseesDesLiens, type Pesee } from "@/lib/collectif/mosaique";
import {
  basculerGardee,
  entreesDuMenuHaut,
  entreesDuMenuPhoto,
  envoyerMaSelection,
  estGardee,
  fixerGardees,
  gesteCoeur,
  nombreGardees,
  partagerSurLeTelephone,
  planDesPreferees,
  type Choix,
  type CleMenuPhoto,
} from "@/lib/collectif/photosSimples";
import { useFenetreEnvoi, useMoteurDepot } from "../../_composants/depot/DepotContexte";
import { useMoteur } from "../../_composants/depot/useMoteur";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import { ActionsFinCollecte, ChoixFinCollecte, ID_LIGNE_FIN, LigneFinCollecte, terminerLaCollecte, type FinDeCollecte } from "../../_composants/FinCollecte";
import { copierLeMessage, donneesDePartage, FenetreCreerLien, FenetrePartage, FenetreQr, FeuilleQr, type ContexteMessage, type LienCree, type LienPartage } from "../../_composants/LienContribution";
import { useSondage } from "../../_composants/useSondage";
import Agrandir from "./Agrandir";
import Corbeille, { BASE_PAS_A_JOUR, type PhotoCorbeille } from "./Corbeille";
import {
  adresseDe,
  annonceCourte,
  avecCorbeille,
  avecLien,
  avecPersonne,
  cleQui,
  enLots,
  estVueAlbums,
  filtreDuRetour,
  filtresDepuis,
  FILTRES_VIDES,
  initialesDe,
  lienDe as noeudDuLien,
  lienDeLaPhoto,
  liensDansLOrdre,
  LOT_ECRITURE,
  montreLesDernieres,
  nombre,
  personnesDe,
  personnesDeLaFeuille,
  phraseRetour,
  regrouperParJour,
  requeteDe,
  type Filtres,
  type GroupeJour,
} from "./filtres";
import FeuillePersonnes from "./FeuillePersonnes";
import Grille, { ICONES, Trace, type Photo } from "./Grille";
import { actionsDuLien, EtatSansLien, FenetreModifierLien, type Liens } from "./Liens";
import Listes from "./Listes";
import { MenuLien, useMenuLien, type ActionMenu } from "./MenuLien";
import MenuPhoto from "./MenuPhoto";
import { Mosaique, PastillesDePersonnes, TuileDeLAlbum, type PersonneDuLien, type TuileVue } from "./Mosaique";
import "./photos.css";
import "./simple.css";

type Compteurs = { dossier: number; liste: number; doublons: number; selection: number; choisissables: number; signalees: number };
type Stats = { photos: number; personnes: number; doublons: number; enCours: number; derniere: string | null; corbeille: number | null };
type Reponse = { photos: Photo[]; suivante: number | null; compteurs: Compteurs; stats: Stats; arbre: Arbre; couvertures?: Record<string, string>; couverturesPlus?: Record<string, { m: string | null; paysage: { v: string; m: string | null } | null }>; liens: Liens | null };
type Coches = { tout: boolean; ids: Set<string> };
type Avis = { texte: string; sous?: string; annuler?: () => void; voir?: () => void };
/** Des photos retirées de la vue, et leur place : « Annuler » les remet où elles étaient. */
type Retrait = { photo: Photo; index: number }[];
/** Ce qu'une écriture de la corbeille a rendu. */
type Issue = { statut: "ok"; ids: string[] } | { statut: "absente" } | { statut: "panne"; message: string };

/** Sans la migration 20261023 : la phrase sobre (la route nomme le fichier SQL, l'écran ne le montre pas). */
const MIGRATION_TEXTE = `${BASE_PAS_A_JOUR}. Rien n'a changé.`;

type Props = {
  token: string;
  ecrire: boolean;
  /** La collecte est ouverte : sinon ni dépôt ni lien, les cœurs restent. */
  ouverte: boolean;
  /** La fin de collecte (21/10) : qui peut la terminer, depuis quand elle l'est, si l'atelier peut encore rouvrir. */
  fin: FinDeCollecte;
  tu: boolean;
  /** L'adresse complète du lien général des participants ; un lien de contribution y ajoute `?p=`. */
  lienParticipants: string;
  max: number;
  organisation: string;
  evenement: string;
  cloture: string;
  /** `?dossier=` (depuis le tableau de bord) et `?mode=tout`. */
  dossierInitial: string;
  modeTout: boolean;
};

const REQUETE_TELEPHONE = "(max-width: 860px)";
const AUCUNE: Coches = { tout: false, ids: new Set() };
/** Aucune pastille de personne cochée (« Tout le monde »). */
const PASTILLES_VIDES: { lien: string | null; cles: ReadonlySet<string> } = { lien: null, cles: new Set() };
/** Le nom comparé d'une personne d'un lien : sa clé est `pers:<id|general>:<nom comparé>` (l'id n'a jamais de deux-points). */
const nomDeLaPersonne = (cle: string) => cle.slice(cle.indexOf(":", 5) + 1);
const rien = () => () => {};
const auMoins0 = (n: number) => Math.max(0, n);
/** La requête de la page 0 que lit une vue (la grille ne se relit que si elle change). */
const cleRequete = (f: Filtres) => {
  const r = requeteDe(f);
  return `${r.dossier}|${r.vue}`;
};
/** Le téléphone : la même règle que la feuille de style (`max-width: 860px`), lue sans état à écrire. */
function useTelephone(): boolean {
  return useSyncExternalStore(
    (rappel) => {
      const mq = window.matchMedia(REQUETE_TELEPHONE);
      mq.addEventListener("change", rappel);
      return () => mq.removeEventListener("change", rappel);
    },
    () => window.matchMedia(REQUETE_TELEPHONE).matches,
    () => false
  );
}

const TRACE = {
  plus: "M12 5v14M5 12h14",
  fermer: "M6 6l12 12M18 6 6 18",
  retour: "m15 6-6 6 6 6",
  chev: "m9 6 6 6-6 6",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  atelier: "M4 20V8l8-4 8 4v12M9 20v-6h6v6",
};

const Points = ({ taille = 22 }: { taille?: number }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="19" cy="12" r="1.9" />
  </svg>
);

/**
 * La fin de collecte se montre AU CLIC (21/10) : « Terminer la collecte » rend l'écran fermé tout de
 * suite (les boutons de dépôt s'éteignent, la ligne d'état dit quand), sans attendre que la relecture
 * de la page le repeigne. Le reste de l'écran lit `ouverte` comme avant.
 */
export default function Collecte(props: Props) {
  const router = useRouter();
  const [termineLe, setTermineLe] = useState<string | null>(null);
  const termine = (le: string) => {
    setTermineLe(le);
    router.refresh();
  };
  return <CollecteEcran {...props} ouverte={props.ouverte && termineLe === null} fin={{ ...props.fin, le: termineLe ?? props.fin.le, oubli: props.fin.oubli || termineLe !== null }} onTermine={termine} />;
}

function CollecteEcran(p: Props & { onTermine: (termineLe: string) => void }) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const client = useSyncExternalStore(rien, () => true, () => false);
  const telephone = useTelephone();
  /* L'équipe n'a pas de corbeille : `?dossier=corbeille` sur son lien rouvre « Toutes les photos ». */
  const [f, setF] = useState<Filtres>(() => {
    const d = filtresDepuis(p.dossierInitial, p.modeTout);
    return d.corbeille && !p.ecrire ? FILTRES_VIDES : d;
  });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [arbre, setArbre] = useState<Arbre | null>(null);
  /* La couverture de chaque lien (« Par lien » la lit avec ses photos) : une vignette signée par tuile, la plus récente. Gardée d'une vue à l'autre :
     le lien ouvert (3C) garde sa photo en tête sans la relire. */
  const [couvLiens, setCouvLiens] = useState<Record<string, string>>({});
  /* Leur version moyenne (1 600 px) et une variante paysage pour les tuiles en bandeau (28/10) : la vignette de 320 px agrandie était floue. */
  const [couvPlus, setCouvPlus] = useState<NonNullable<Reponse["couverturesPlus"]>>({});
  /* Les poids de la mosaïque, GELÉS à l'ouverture de la page (`figerLesPesees`) : la mise à jour en direct change les chiffres des
     pastilles, jamais la place ni la taille d'une tuile. Seul un ensemble de tuiles différent (un lien créé, supprimé) les reprend. */
  const [peseesLiens, setPeseesLiens] = useState<readonly Pesee[] | null>(null);
  const [liens, setLiens] = useState<Liens | null>(null);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  /* Sélectionner : `tout` = toute la vue, `ids` = les exceptions ; sinon `ids` = les sélectionnées. */
  const [coches, setCoches] = useState<Coches>(AUCUNE);
  const [modeCocher, setModeCocher] = useState(false);
  const dernierCoche = useRef<string | null>(null);
  const [agrandi, setAgrandi] = useState<string | null>(null);
  const [avis, setAvis] = useState<Avis | null>(null);
  const minuterieAvis = useRef(0);
  const [progres, setProgres] = useState<string | null>(null);
  /* Les dossiers du responsable (ordinateur) : renommer, ranger en glissant. */
  const [edite, setEdite] = useState<{ cle: string; valeur: string } | null>(null);
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  /* Les fenêtres des liens. `creerLien` : la fenêtre de création (le nom déjà écrit, ou vide) : UNE seule, pour la tuile « Nouveau lien », la colonne
     de l'ordinateur et l'état vide ; un lien créé ouvre « Partager » sur lui. */
  const [creerLien, setCreerLien] = useState<string | null>(null);
  /* Les personnes cochées en pastilles dans le lien ouvert (3C) : leurs noms comparés, et le lien auquel elles tiennent. */
  const [choixPastilles, setChoixPastilles] = useState<{ lien: string | null; cles: ReadonlySet<string> }>(PASTILLES_VIDES);
  const [partage, setPartage] = useState<LienPartage | null>(null);
  const [grandQr, setGrandQr] = useState<LienPartage | null>(null);
  /* « Modifier » un lien : son nom ET son nombre de photos, en une fois (`id` nul = le lien général : le nombre seul). */
  const [modifier, setModifier] = useState<{ id: string | null; nom: string; valeur: number; sansLimite: boolean } | null>(null);
  const [supprimer, setSupprimer] = useState<{ id: string; nom: string; n: number } | null>(null);
  /* Les arrivées en direct (T-181) : la dernière arrivée déjà montrée, et l'annonce de celles d'après. */
  const [vuJusqua, setVuJusqua] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<{ texte: string; court: string; noms: string[]; depuis: string | null } | null>(null);
  /* Les feuilles et menus du 22/10. */
  const [feuillePersonnes, setFeuillePersonnes] = useState(false);
  const [choixFin, setChoixFin] = useState(false);
  const [confirmerSelection, setConfirmerSelection] = useState(false);
  const [menuPhoto, setMenuPhoto] = useState<string | null>(null);
  /* « Choisir d'abord mes préférées » : `null` = le mode n'est pas ouvert ; sinon ce que le client a changé à ses favoris. */
  const [preferees, setPreferees] = useState<Choix | null>(null);
  const menuHaut = useMenuLien();
  const [copie, setCopie] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const version = useRef(0);
  /* Le nombre de photos de la dernière lecture de la page 0 : le sondage relit la grille quand le serveur n'en compte plus autant. */
  const photosDeLaGrille = useRef<number | null>(null);
  /* Le dernier nombre pour lequel le sondage a relu la grille (jamais deux fois pour le même : pas de boucle). */
  const dejaRelu = useRef<number | null>(null);
  /* La requête de la page 0 déjà lue : changer de vue ne relit la grille que si elle change. */
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
          setPeseesLiens((avant) => figerLesPesees(avant, peseesDesLiens(json.arbre, p.ecrire ? "Mes photos" : "Les dossiers du responsable")));
          if (estVueAlbums(nf)) {
            setCouvLiens(json.couvertures ?? {});
            setCouvPlus(json.couverturesPlus ?? {});
          }
          /* Tout ce qui est arrivé jusqu'ici est désormais compté : l'annonce s'efface. */
          setVuJusqua(json.stats.derniere);
          setAnnonce(null);
          photosDeLaGrille.current = json.stats.photos;
        }
        setLiens(json.liens);
        setErreur(null);
        return json.photos;
      } catch {
        if (v0 === version.current) setErreur("Chargement impossible. Rechargez la page.");
        return null;
      } finally {
        if (v0 === version.current) setChargement(false);
      }
    },
    [lirePage, p.ecrire]
  );

  /* L'adresse suit la vue : recharger la page, ou revenir en arrière depuis une autre page, rouvre le même endroit (replaceState : rien ne s'empile). */
  function garderAdresse(nf: Filtres) {
    window.history.replaceState(null, "", `${window.location.pathname}${adresseDe(nf)}`);
  }
  /** Changer de vue : la grille se relit seulement si la route lit autre chose. La corbeille ne lit pas la grille : en revenir ne relit rien si la grille d'avant est encore la bonne. */
  function appliquer(nf0: Filtres) {
    const nf = nf0.corbeille && !p.ecrire ? { ...nf0, corbeille: false } : nf0;
    /* Un autre lien (ou plus de lien) : les pastilles de personnes cochées dans celui d'avant sont oubliées. */
    if (nf.lien !== f.lien) setChoixPastilles(PASTILLES_VIDES);
    setF(nf);
    setCoches(AUCUNE);
    setModeCocher(false);
    setAgrandi(null);
    setPreferees(null);
    setErreur(null);
    garderAdresse(nf);
    if (nf.corbeille) return;
    if (cleRequete(nf) === chargee.current && photos.length) return;
    version.current++;
    setPhotos([]);
    setSuivante(0);
    void charger(0, nf);
  }
  /** Ouvrir un dossier par sa clé. */
  const relire = () => {
    version.current++;
    void charger(0, f);
  };

  useEffect(() => {
    void charger(0, filtresDepuis(p.dossierInitial, p.modeTout));
  }, [charger, p.dossierInitial, p.modeTout]);

  const r = requeteDe(f);
  const albums = estVueAlbums(f);
  /* Ce que la vue montre : le lien ouvert, un dossier, les personnes choisies. */
  const avecVous = p.ecrire;
  const ouvertNoeud = arbre ? noeudDuLien(arbre, f.lien, avecVous) : undefined;
  const dossierNoeud = arbre && f.dossier ? noeudDe(arbre, f.dossier) : undefined;
  const noeudsPersonnes: Noeud[] = arbre ? f.personnes.flatMap((c) => noeudDe(arbre, c) ?? []) : [];
  /* LES PERSONNES D'UN LIEN OUVERT, EN PASTILLES (3C ; retour de Mathias du 21/10 : « ça vient les afficher comme des filtres, et je peux en
     sélectionner un ou plusieurs »). Un lien de contribution ou « Sans groupe », ouvert tout seul (ni dossier) : ses personnes, la plus fournie
     d'abord. Chacune est cochée par son nom COMPARÉ ; le choix tient à CE lien (`appliquer` l'oublie quand le lien change) ; aucune cochée = « Tout le
     monde ». Les photos restent lues par pages et la grille se filtre dans le navigateur : le compte est la somme des pastilles cochées. */
  const lienDePastilles = ouvertNoeud && (ouvertNoeud.cle.startsWith("lien:") || ouvertNoeud.cle === "participants") && !f.dossier && !f.corbeille ? ouvertNoeud : undefined;
  const personnesDuLien: PersonneDuLien[] = (() => {
    if (!lienDePastilles) return [];
    const detail = liens?.liens.find((l) => `lien:${l.id}` === lienDePastilles.cle);
    const lues = detail ? detail.personnes : lienDePastilles.cle === "participants" && liens ? liens.general.personnes : null;
    return lues ? lues.map((x) => ({ cle: clePersonne(x.nom), nom: x.nom, n: x.n })) : lienDePastilles.enfants.map((e) => ({ cle: nomDeLaPersonne(e.cle), nom: e.nom, n: e.n }));
  })();
  const nomsChoisis: ReadonlySet<string> = choixPastilles.lien === f.lien && f.lien !== null && lienDePastilles ? choixPastilles.cles : PASTILLES_VIDES.cles;
  /** Une photo est dans la vue : les pastilles cochées (le navigateur filtre ce que la route rend par pages). */
  const dansLaVue = (x: Photo) => nomsChoisis.size === 0 || nomsChoisis.has(clePersonne(x.qui));
  const visibles = nomsChoisis.size ? photos.filter(dansLaVue) : photos;
  const groupes = regrouperParJour(visibles, suivante === null);
  /** Le nombre de photos de la vue, quand on le connaît (des pastilles cochées : la somme de leurs photos, ou le total une fois tout lu). */
  const totalVue = nomsChoisis.size
    ? suivante === null
      ? visibles.length
      : personnesDuLien.filter((x) => nomsChoisis.has(x.cle)).reduce((n, x) => n + x.n, 0)
    : (compteurs?.liste ?? null);

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

  /* Des pastilles cochées dans un lien : la grille se filtre dans le navigateur ; si la page lue n'en contient assez, les suivantes se lisent d'elles-mêmes
     (l'observateur ci-dessus regarde la fin de la grille, qui reste dans l'écran tant que la grille est courte). */

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

  /** « Les voir » : les photos d'UNE personne s'il n'y en a qu'une, sinon toutes ; la grille revient en haut (les plus récentes sont en tête). */
  function voirArrivees() {
    if (!annonce) return;
    const seule = annonce.noms.length === 1 ? `qui:${clePersonne(annonce.noms[0])}` : null;
    version.current++;
    const nf: Filtres = { ...FILTRES_VIDES, personnes: seule ? [seule] : [] };
    setF(nf);
    setCoches(AUCUNE);
    setPhotos([]);
    setSuivante(0);
    garderAdresse(nf);
    /* La grille revient en haut (la zone de la grille sur ordinateur, la page au téléphone). */
    zone.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    void charger(0, nf);
  }

  /** Un message qui passe ne reste pas sous une feuille qui s'ouvre : « Mise en favori » ne doit pas cacher un choix (fin de collecte, personnes, QR). */
  function fermerAvis() {
    window.clearTimeout(minuterieAvis.current);
    setAvis(null);
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
      setErreur("Pas de réseau. Rien n'a changé.");
      return null;
    } finally {
      setOccupe(false);
    }
  }

  /**
   * Poser ou retirer le CŒUR de photos : UNE requête par lot de 500 (`photoIds`, la règle de la route), jamais une par photo. Rend ce que la base a
   * écrit, et si une requête a échoué (le réseau, une erreur) : `envoyerMaSelection` ne termine alors RIEN. Une photo passée à la corbeille entre-temps
   * (la route répond « introuvable » quand tout le lot est parti) n'est pas un échec : il n'y a plus rien à marquer.
   */
  async function ecrireCoeurs(ids: readonly string[], preselection: boolean): Promise<{ faits: string[]; echec: boolean }> {
    const faits: string[] = [];
    let echec = false;
    const lots = enLots(ids);
    for (const [k, lot] of lots.entries()) {
      if (lots.length > 1) setProgres(`${nombre(k * LOT_ECRITURE)} sur ${nombre(ids.length)}`);
      try {
        const rep = await fetch("/api/collectif/photos/marquer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, photoIds: lot, preselection }) });
        const json = (await rep.json().catch(() => ({}))) as { ids?: unknown; error?: unknown };
        if (!rep.ok) {
          if (rep.status === 404 && json.error === "introuvable") continue;
          echec = true;
          break;
        }
        if (Array.isArray(json.ids)) faits.push(...json.ids.filter((x): x is string => typeof x === "string"));
      } catch {
        echec = true;
        break;
      }
    }
    setProgres(null);
    return { faits, echec };
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
        if (!rep.ok) return fin(faites.length ? { statut: "ok", ids: faites } : { statut: "panne", message: `${action === "supprimer" ? "Suppression" : "Restauration"} impossible.` });
        if (Array.isArray(json.ids)) faites.push(...json.ids.filter((x): x is string => typeof x === "string"));
      } catch {
        return fin(faites.length ? { statut: "ok", ids: faites } : { statut: "panne", message: "Pas de réseau. Rien n'a changé." });
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
      const vues = nomsChoisis.size ? photosVues.current.filter(dansLaVue) : photosVues.current;
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
    const sig = retrait.filter((x) => x.photo.signalee).length;
    const dbl = retrait.filter((x) => x.photo.doublonDe).length;
    const choix = retrait.filter((x) => !x.photo.preselection && !x.photo.signalee).length;
    setCompteurs((c) =>
      c
        ? { ...c, dossier: auMoins0(c.dossier + signe * n), liste: auMoins0(c.liste + signe * n), selection: auMoins0(c.selection + signe * sel), signalees: auMoins0(c.signalees + signe * sig), doublons: auMoins0(c.doublons + signe * dbl), choisissables: auMoins0(c.choisissables + signe * choix) }
        : c
    );
    setStats((s) => (s ? { ...s, photos: auMoins0(s.photos + signe * n), doublons: auMoins0(s.doublons + signe * dbl), corbeille: corbeille && s.corbeille !== null ? auMoins0(s.corbeille - signe * n) : s.corbeille } : s));
  }

  /**
   * Supprimer = mettre à la corbeille (30 jours, « Supprimées récemment »), sans fenêtre de confirmation : la photo disparaît de la vue, l'avis
   * propose « Annuler » quelques secondes (= `restaurer`, les mêmes ids). Sans la migration 20261023 : la phrase sobre, rien ne bouge.
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
      annoncer({ texte: BASE_PAS_A_JOUR, sous: ids.length > 1 ? "Rien supprimé." : "Rien supprimé." });
      return;
    }
    if (issue.statut === "panne") {
      setErreur(issue.message);
      return;
    }
    const faites = issue.ids;
    if (faites.length < ids.length) setErreur(`${nombre(ids.length - faites.length)} non supprimée${ids.length - faites.length > 1 ? "s" : ""}.`);
    if (!faites.length) return;
    const retrait = retirerDeLaVue(new Set(faites));
    compterLeRetrait(retrait, -1, true);
    setCoches(AUCUNE);
    setModeCocher(false);
    const n = faites.length;
    annoncer({
      texte: n > 1 ? `${nombre(n)} photos supprimées` : "Photo supprimée",
      sous: `Corbeille, ${DELAI_CORBEILLE_JOURS} jours`,
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
    annoncer({ texte: revenues.size > 1 ? `${nombre(revenues.size)} photos restaurées` : "Photo restaurée", sous: revenues.size > 1 ? "De retour à leur place" : "De retour à sa place" });
  }

  /** Des photos sont revenues de « Supprimées récemment » : les chiffres suivent, la grille se relira en sortant. */
  function restaureesDeLaCorbeille(revenues: PhotoCorbeille[]) {
    const n = revenues.length;
    if (!n) return;
    chargee.current = null;
    setStats((s) => (s ? { ...s, photos: s.photos + n, corbeille: s.corbeille === null ? null : auMoins0(s.corbeille - n) } : s));
    setCompteurs((c) => (c ? { ...c, selection: c.selection + revenues.filter((x) => x.selection).length } : c));
    const seule = n === 1 ? revenues[0] : null;
    annoncer(
      seule
        ? { texte: "Photo restaurée", sous: phraseRetour(seule.lien, seule.lienNom, seule.qui), voir: () => appliquer(filtreDuRetour(seule.lien)) }
        : { texte: `${nombre(n)} photos restaurées`, sous: "De retour à leur place" }
    );
  }

  /* « nouvelle » n'est plus écrit sur les vignettes (22/10 : une photo, rien d'autre) : la pastille « N nouvelles · Les voir » est la seule annonce. */
  const parId = new Map(photos.map((x) => [x.id, x]));
  const prefereesActif = preferees !== null;
  const estCochee = (id: string) => {
    if (preferees) {
      const ph = parId.get(id);
      return ph ? estGardee(preferees, ph) : false;
    }
    return coches.tout ? !coches.ids.has(id) : coches.ids.has(id);
  };
  const nbCoches = coches.tout ? Math.max(0, (totalVue ?? visibles.length) - coches.ids.size) : coches.ids.size;
  /* Sélectionner : le mode est ouvert (le « … », « Terminé »), ou au moins une photo est prise. */
  const cocherActif = p.ecrire && (modeCocher || nbCoches > 0) && !prefereesActif;
  /* Les ronds de sélection sont visibles : Sélectionner, ou « Choisir d'abord mes préférées ». */
  const rondsVisibles = cocherActif || prefereesActif;
  const nbGardees = preferees ? nombreGardees(compteurs?.selection ?? 0, preferees) : 0;

  function cocher(id: string, etendre: boolean) {
    if (preferees) {
      const ph = parId.get(id);
      if (ph) setPreferees((c) => (c ? basculerGardee(c, ph) : c));
      return;
    }
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
  /**
   * Les pages qui manquent pour que ce jour soit lu EN ENTIER (les jours sont rangés du plus récent au plus ancien : dès qu'une photo d'un jour plus
   * ancien arrive, le jour demandé est fini). Rend les photos du jour, celles des pastilles cochées seulement.
   */
  async function lireJusquALaFinDuJour(cleJour: string): Promise<Photo[]> {
    const jourDe = (k: string) => (k === "~" || !k.startsWith("~") ? k : k.slice(1));
    /* Les jours datés se suivent du plus récent au plus ancien, « Sans date » vient en fin : il ne clôt un jour que s'il le suit. */
    const encore = (k: string) => (cleJour === "~" ? true : k !== "~" && jourDe(k) >= cleJour);
    const v0 = version.current;
    let toutes = photosVues.current;
    let page = suivante;
    while (page !== null && page !== 0 && (toutes.length === 0 || encore(toutes[toutes.length - 1].jourCle))) {
      setProgres(`${nombre(toutes.length)} sur ${nombre(compteurs?.liste ?? toutes.length)}`);
      const json = await lirePage(page, f);
      if (v0 !== version.current) return [];
      toutes = [...toutes, ...json.photos];
      page = json.suivante;
      setPhotos(toutes);
      setSuivante(page);
    }
    setProgres(null);
    return toutes.filter((x) => jourDe(x.jourCle) === cleJour && dansLaVue(x));
  }
  /** Le rond d'un jour : toute la journée d'un toucher. Un jour pas encore lu en entier se lit d'abord (les pages qui manquent), puis se prend. */
  async function cocherLeJour(jour: GroupeJour<Photo>, tout: boolean) {
    let duJour = jour.photos;
    if (tout && !jour.complet && suivante !== null && suivante !== 0) {
      if (occupe) return;
      setOccupe(true);
      try {
        duJour = await lireJusquALaFinDuJour(jour.cle);
      } catch {
        setErreur("Lecture impossible.");
        return;
      } finally {
        setOccupe(false);
        setProgres(null);
      }
    }
    if (preferees) {
      setPreferees((c) => (c ? fixerGardees(c, duJour, tout) : c));
      return;
    }
    setCoches((c) => {
      const ids = new Set(c.tout ? [] : c.ids);
      for (const x of duJour) {
        if (tout) ids.add(x.id);
        else ids.delete(x.id);
      }
      return { tout: false, ids };
    });
  }

  /** Les photos sélectionnées, toutes lues : « Tout sélectionner » sur une vue qui n'est pas lue jusqu'au bout la lit d'abord. */
  async function cocheesLues(): Promise<Photo[]> {
    if (!coches.tout) return photos.filter((x) => coches.ids.has(x.id));
    let toutes = photos;
    let page = suivante;
    const v0 = version.current;
    while (page !== null && page !== 0) {
      setProgres(`${nombre(toutes.length)} sur ${nombre(compteurs?.liste ?? toutes.length)}`);
      const json = await lirePage(page, f);
      if (v0 !== version.current) return [];
      toutes = [...toutes, ...json.photos];
      page = json.suivante;
      setPhotos(toutes);
      setSuivante(page);
    }
    setProgres(null);
    return toutes.filter((x) => dansLaVue(x) && !coches.ids.has(x.id));
  }

  /** Le cœur pour des photos, l'état local d'abord (la route rend l'objet écrit, la relecture n'est pas sûre : 14/10). */
  function poserCoeurs(ids: ReadonlySet<string>, preselection: boolean, delta: number) {
    setPhotos((l) => l.map((x) => (ids.has(x.id) ? { ...x, preselection } : x)));
    setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + delta) } : c));
  }

  /** Le cœur d'UNE photo : il bascule (toucher de nouveau le retire). L'état change tout de suite, et revient si la route refuse. */
  async function coeurDe(photo: Photo) {
    const pose = !photo.preselection;
    poserCoeurs(new Set([photo.id]), pose, pose ? 1 : -1);
    if (!(await appeler("/api/collectif/photos/marquer", { photoId: photo.id, preselection: pose }))) {
      setPhotos((l) => (l.some((x) => x.id === photo.id) ? l.map((x) => (x.id === photo.id ? { ...x, preselection: !pose } : x)) : [photo, ...l]));
      setCompteurs((c) => (c ? { ...c, selection: c.selection + (pose ? -1 : 1) } : c));
      return;
    }
    annoncer({ texte: pose ? "Mise en favori" : "Plus en favori" });
  }

  /** Toutes les photos sélectionnées sont-elles déjà en cœur ? (« ♥ met en favori, ou retire si toutes le sont déjà ».) */
  function toutesEnCoeur(): boolean {
    if (!coches.tout) return gesteCoeur(photos.filter((x) => coches.ids.has(x.id))) === "retirer";
    /* Toute la vue sélectionnée : le dossier entier n'est lu que si l'on écrit ; ici on compare les comptes du serveur. */
    return coches.ids.size === 0 && nomsChoisis.size === 0 && compteurs !== null && compteurs.liste > 0 && r.dossier === "tout" && compteurs.selection >= compteurs.dossier;
  }

  /** La barre des sélectionnées : le CŒUR (pose, ou retire si toutes le sont déjà) et SUPPRIMER. */
  async function agir(geste: "poser" | "retirer" | "supprimer") {
    if (occupe || nbCoches === 0) return;
    if (geste === "supprimer") {
      /* Toute la vue sélectionnée : elle se lit d'abord jusqu'au bout (les ids partent par lots de 500). */
      setOccupe(true);
      let ids: string[] = [];
      try {
        ids = (await cocheesLues()).map((x) => x.id);
      } catch {
        setErreur("Lecture impossible.");
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
      const preselection = geste === "poser";
      /* Toute la vue sélectionnée, sans pastille de personne ni personnes choisies : UNE écriture pour tout le dossier (la règle de la route). */
      if (coches.tout && nomsChoisis.size === 0 && !r.dossier.startsWith(QUIS)) {
        const exceptions = photos.filter((x) => coches.ids.has(x.id) && x.preselection !== preselection);
        const rep = await fetch("/api/collectif/photos/marquer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: p.token, toutes: true, preselection, dossier: r.dossier }) });
        const json = (await rep.json().catch(() => ({}))) as { n?: number; message?: string };
        if (!rep.ok) {
          setErreur(typeof json.message === "string" ? json.message : `Non enregistré (erreur ${rep.status}).`);
          return;
        }
        /* Les photos laissées décochées gardent leur état d'avant (une requête par lot de 500). */
        const remises = exceptions.length ? (await ecrireCoeurs(exceptions.map((x) => x.id), !preselection)).faits : [];
        const n = (json.n ?? 0) - remises.length;
        const gardees = new Set(coches.ids);
        setPhotos((l) => l.map((x) => (gardees.has(x.id) || (preselection && x.signalee) ? x : { ...x, preselection })));
        setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + (preselection ? n : -n)) } : c));
        toutDecocher();
        annoncer({ texte: preselection ? `${nombre(n)} photo${n > 1 ? "s" : ""} mise${n > 1 ? "s" : ""} en favori` : `${nombre(n)} photo${n > 1 ? "s" : ""} plus en favori` });
        return;
      }
      const cochees = await cocheesLues();
      const a = cochees.filter((x) => x.preselection !== preselection);
      if (!a.length) {
        toutDecocher();
        annoncer({ texte: preselection ? "Déjà en favori" : "Pas en favori : rien à retirer" });
        return;
      }
      const ecrit = await ecrireCoeurs(a.map((x) => x.id), preselection);
      const faites = ecrit.faits;
      const ids = new Set(faites);
      poserCoeurs(ids, preselection, preselection ? faites.length : -faites.length);
      toutDecocher();
      if (ecrit.echec || faites.length < a.length) setErreur(`${nombre(a.length - faites.length)} non enregistrée${a.length - faites.length > 1 ? "s" : ""}.`);
      if (faites.length)
        annoncer({
          texte: preselection ? `${nombre(faites.length)} photo${faites.length > 1 ? "s" : ""} mise${faites.length > 1 ? "s" : ""} en favori` : `${nombre(faites.length)} photo${faites.length > 1 ? "s" : ""} plus en favori`,
          annuler: () => {
            setPhotos((l) => l.map((x) => (ids.has(x.id) ? { ...x, preselection: !preselection } : x)));
            setCompteurs((c) => (c ? { ...c, selection: Math.max(0, c.selection + (preselection ? -faites.length : faites.length)) } : c));
            void ecrireCoeurs(faites, !preselection);
          },
        });
    } finally {
      setOccupe(false);
      setProgres(null);
    }
  }

  /* ── « Choisir d'abord mes préférées » : un mode calme, les cœurs puis la fin de la collecte ── */
  function ouvrirPreferees() {
    fermerAvis();
    setChoixFin(false);
    setFeuillePersonnes(false);
    /* Le mode calme montre TOUTES les photos par jour : aucun filtre. */
    appliquer({ ...FILTRES_VIDES });
    setPreferees(new Map());
    window.scrollTo({ top: 0 });
  }
  async function envoyerPreferees() {
    if (!preferees || occupe) return;
    setOccupe(true);
    setErreur(null);
    const plan = planDesPreferees(preferees);
    let resultat;
    try {
      resultat = await envoyerMaSelection({
        plan,
        tu: p.tu,
        ecrire: async (ids, coeur) => {
          const e = await ecrireCoeurs(ids, coeur);
          /* Les cœurs écrits se voient tout de suite (la base les a posés, même si le lot suivant a échoué). */
          if (e.faits.length) poserCoeurs(new Set(e.faits), coeur, coeur ? e.faits.length : -e.faits.length);
          return { faits: e.faits.length, echec: e.echec };
        },
        terminer: () => terminerLaCollecte(p.token),
      });
    } finally {
      setOccupe(false);
      setProgres(null);
    }
    if (!resultat.ok) {
      /* Les cœurs n'ont pas passé : la collecte n'est PAS terminée, et l'écran le dit (le mode reste ouvert, on peut réessayer). */
      setErreur(resultat.message);
      return;
    }
    setPreferees(null);
    p.onTermine(resultat.termineLe);
    annoncer({ texte: "Collecte terminée", sous: `${nombre(nbGardees)} préférée${nbGardees > 1 ? "s" : ""} pour l'atelier` });
  }

  /* ── Les photos arrivent : un sondage LÉGER, des chiffres qui suivent, une grille qui s'ouvre d'elle-même ──
     (T-181, refait le 21/10/2026 après le test de Mathias : « il faut toujours refresh »).
     Toutes les 30 s, onglet visible (`useSondage`), une lecture légère : le nombre de photos, les personnes, les
     déclarations en route, et qui a envoyé quoi depuis le repère. Elle marche SANS repère (une édition qui part de zéro).
     - Les grands chiffres suivent chaque sondage.
     - La grille se relit d'elle-même (page 0, sans « Chargement… » ni erreur à l'écran) QUAND c'est sans risque :
       `accueilDesArrivees` (rien de sélectionné, aucune photo agrandie, la grille en haut, une vue qui range les dernières
       arrivées en tête). Sinon, la pastille « N nouvelles · Les voir ». La grille est rangée par jour (22/10) : une photo qui arrive y entre sous
       son jour, et celles qui n'ont pas de date de prise de vue viennent en tête.
     Ce qui est arrivé du responsable lui-même ne s'annonce pas : la grille se relit déjà à la fin de son envoi. */
  const instant = useRef<{ f: Filtres; photos: number | null; vide: boolean; coches: boolean; agrandie: boolean; occupe: boolean } | null>(null);
  useEffect(() => {
    instant.current = {
      f,
      photos: stats?.photos ?? null,
      vide: stats?.photos === 0 && !stats.corbeille,
      coches: modeCocher || coches.tout || coches.ids.size > 0 || preferees !== null || menuPhoto !== null,
      agrandie: agrandi !== null,
      occupe: occupe || chargement || progres !== null,
    };
  });
  /** La zone de défilement de la grille est tout en haut : une insertion ne pousse rien sous le doigt. */
  function grilleEnHaut(): boolean {
    const z = zone.current;
    if (!z) return true;
    if (window.matchMedia(REQUETE_TELEPHONE).matches) return z.getBoundingClientRect().top > -32;
    return z.scrollTop < 32;
  }
  /** Ce que l'écran montre À CET INSTANT, relu après chaque `await` (la fermeture du rendu d'avant a vieilli). */
  function situation(): SituationPhotos | null {
    const i = instant.current;
    if (!i) return null;
    return { vide: i.vide, grilleVisible: !i.f.corbeille, dernieresEnTete: montreLesDernieres(i.f), coches: i.coches, agrandie: i.agrandie, occupe: i.occupe, enHaut: grilleEnHaut() };
  }
  function annoncerArrivees(n: Nouvelles, depuis: string | null) {
    const texte = phraseArrivees(n);
    if (texte) setAnnonce({ texte, court: annonceCourte(n.participants, n.noms.map((x) => x.nom), n.personnes), noms: n.noms.map((x) => x.nom), depuis });
  }
  /**
   * Relire la page 0 de la vue SANS bruit : ni « Chargement… », ni erreur (une panne attend le prochain sondage).
   * Rien n'est posé si l'écran a bougé pendant la lecture (une photo sélectionnée, ouverte, une autre vue).
   * Rend `true` quand la grille a été remplacée.
   */
  async function relireSansBruit(nf: Filtres, repere: string | null, e: EtatSondage): Promise<boolean> {
    const v0 = version.current;
    try {
      const json = await lirePage(0, nf);
      const i = instant.current;
      const s = situation();
      if (v0 !== version.current || !i || !s || cleRequete(i.f) !== cleRequete(nf) || accueilDesArrivees(s) !== "inserer") return false;
      /* La version n'avance QU'ICI, quand la grille est vraiment remplacée : une page en route d'avant est écartée, et
         `chargement` retombe de lui-même (sa lecture ne le ferait plus, sa version n'est plus la bonne). */
      ++version.current;
      setChargement(false);
      chargee.current = cleRequete(nf);
      photosDeLaGrille.current = json.stats.photos;
      setPhotos(json.photos);
      setSuivante(json.suivante);
      setCompteurs(json.compteurs);
      setStats(json.stats);
      setArbre(json.arbre);
      if (estVueAlbums(nf)) {
            setCouvLiens(json.couvertures ?? {});
            setCouvPlus(json.couverturesPlus ?? {});
          }
      setLiens(json.liens);
      setErreur(null);
      setVuJusqua(json.stats.derniere);
      /* Une vue filtrée peut ne pas contenir tout ce qui est arrivé : la pastille reste pour le reste. */
      const dedans = json.photos.filter((x) => x.arrivee > (repere ?? "")).length;
      if (e.nouvelles && dedans < e.nouvelles.n && dedans < json.photos.length) annoncerArrivees(e.nouvelles, repere);
      else setAnnonce(null);
      return true;
    } catch {
      return false;
    }
  }
  async function apresSondage(e: EtatSondage, repere: string | null) {
    /* Les grands chiffres suivent chaque sondage, que la grille se relise ou non. */
    setStats((s) => (s ? { ...s, photos: e.photos, personnes: e.personnes ?? s.personnes, enCours: e.enCours ?? s.enCours } : s));
    if (!ceQuiABouge(e, photosDeLaGrille.current ?? e.photos, dejaRelu.current)) return;
    const s = situation();
    const i = instant.current;
    if (s && i && accueilDesArrivees(s) === "inserer" && (await relireSansBruit(i.f, repere, e))) {
      dejaRelu.current = e.photos;
      return;
    }
    if (e.nouvelles) annoncerArrivees(e.nouvelles, repere);
  }
  useSondage(
    async () => {
      if (!stats) return;
      const rep = await fetch("/api/collectif/photos/etat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpsSondagePhotos(p.token, vuJusqua, stats.photos)),
      });
      if (!rep.ok) return;
      const etat = lireEtatSondage(await rep.json().catch(() => null));
      if (etat) await apresSondage(etat, vuJusqua);
    },
    SONDAGE_PHOTOS_MS,
    p.ouverte
  );

  /* ── Ranger et renommer les dossiers du responsable (dans « Mes photos », ordinateur) ── */
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
  const nomVous = p.ecrire ? "Mes photos" : "Les dossiers du responsable";
  /* Le responsable, dans les listes et sur ses vignettes : « Vous » (ou « Toi ») pour lui-même. */
  const nomPersonne = (n: { cle: string; nom: string }) => (n.cle === QUI_RESPONSABLE && p.ecrire ? v("Vous", "Toi") : n.nom);
  const quiDe = (ph: Photo) => (ph.role === "responsable" && p.ecrire ? v("Vous", "Toi") : ph.qui);
  /* Rien reçu, et rien à la corbeille : l'accueil. Des photos à la corbeille gardent les listes (on y retourne). */
  const vide = stats?.photos === 0 && !stats.corbeille;
  /* La tuile en tête d'un lien (3C) : un lien ouvert qui a des photos. Sans aucune photo dans l'édition, l'écran d'accueil prend la place. */
  const tuileActive = Boolean(lienDePastilles) && !vide;
  const total = stats?.photos ?? 0;
  const nomOuvert = ouvertNoeud ? (ouvertNoeud.cle === "vous" ? nomVous : ouvertNoeud.nom) : "";
  const titre = prefereesActif
    ? "Mes préférées"
    : f.favoris && !f.personnes.length
      ? "Favoris"
      : albums
      ? "Par lien"
      : f.personnes.length
        ? f.personnes.length === 1
          ? noeudsPersonnes[0]
            ? nomPersonne(noeudsPersonnes[0])
            : "Les photos"
          : personnesDe(f.personnes.length)
        : dossierNoeud
          ? dossierNoeud.nom
          : f.mode === "liens" && ouvertNoeud
            ? nomOuvert
            : "Toutes les photos";
  const filtree = Boolean(f.lien || f.personnes.length || f.dossier || f.favoris);
  const note = albums
    ? ""
    : f.mode === "liens" && ouvertNoeud && !dossierNoeud
      ? ouvertNoeud.cle === "vous"
        ? `${nombre(arbre?.vous.length ?? 0)} dossier${(arbre?.vous.length ?? 0) > 1 ? "s" : ""} · ${nombre(ouvertNoeud.n)} photo${ouvertNoeud.n > 1 ? "s" : ""}`
        : ouvertNoeud.enfants.length
          ? `${personnesDe(ouvertNoeud.enfants.length)} · ${nombre(ouvertNoeud.n)} photo${ouvertNoeud.n > 1 ? "s" : ""}`
          : `${nombre(ouvertNoeud.n)} photo${ouvertNoeud.n > 1 ? "s" : ""}`
      : filtree && totalVue !== null
        ? `${nombre(totalVue)} photo${totalVue > 1 ? "s" : ""} sur ${nombre(total)}`
        : "";
  /* Un LIEN DE CONTRIBUTION se partage ; « Sans groupe » (les photos arrivées par l'adresse de base) ne se partage pas : ni bouton, ni QR. */
  const partageable = p.ecrire && p.ouverte && liens && f.mode === "liens" && f.lien?.startsWith("lien:");
  const lienPartage = (): LienPartage | null => {
    if (!liens) return null;
    const l = liens.liens.find((x) => `lien:${x.id}` === f.lien);
    return l ? lienDe(l.nom, l.cle, l.plafond, l.n) : null;
  };
  /**
   * PARTAGER (22/10, planche 12 vue 8) : au téléphone, la feuille de partage de l'iPhone s'ouvre d'un toucher (le message de la planche 4 et
   * l'adresse sont déjà écrits), sans fenêtre intermédiaire ; si le navigateur ne sait pas partager, ou si l'appel échoue (autrement que par un
   * renoncement), la petite fenêtre (« Copier le message », « QR code »). À l'ordinateur : la fenêtre.
   */
  async function partager(l: LienPartage) {
    const issue = await partagerSurLeTelephone(typeof navigator === "undefined" ? undefined : navigator, window.matchMedia(REQUETE_TELEPHONE).matches, donneesDePartage(l, contexte));
    if (issue === "repli") {
      fermerAvis();
      setPartage(l);
    }
  }
  async function copierMessageDuLien() {
    const l = lienPartage();
    if (!l) return;
    const ok = await copierLeMessage(l, contexte);
    if (ok) {
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2000);
    } else setPartage(l);
  }

  /* ── Les liens ── */
  const lienDe = (nom: string, cle: string | null, plafondTexte: string, n: number): LienPartage => ({
    libelle: nom,
    url: cle ? lienDeGroupe(p.lienParticipants, cle) : p.lienParticipants,
    plafond: plafondTexte,
    recues: n,
    general: cle === null,
  });
  const maxPlafond = liens?.reste !== null && liens?.reste !== undefined ? Math.max(1, Math.min(p.max, liens.reste)) : p.max;

  /* ── La photo agrandie ── */
  const iAgrandi = agrandi ? visibles.findIndex((x) => x.id === agrandi) : -1;
  const photoAgrandie = iAgrandi >= 0 ? visibles[iAgrandi] : null;
  /** « Voir ses photos » : toutes les photos de cette personne, dans la grille ; dans un lien ouvert, sa pastille. */
  function voirQui(ph: Photo) {
    const cle = cleQui(ph);
    if (!cle) return;
    setAgrandi(null);
    if (tuileActive && lienDePastilles && personnesDuLien.some((x) => x.cle === clePersonne(ph.qui))) {
      setCoches(AUCUNE);
      setModeCocher(false);
      setChoixPastilles({ lien: f.lien, cles: new Set([clePersonne(ph.qui)]) });
      return;
    }
    appliquer({ ...FILTRES_VIDES, personnes: [cle] });
    window.scrollTo({ top: 0 });
  }

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
    else if (ouvertNoeud && f.lien?.startsWith("lien:")) {
      const id = f.lien.slice(5);
      const l = liens?.liens.find((x) => x.id === id);
      setModifier({ id, nom: ouvertNoeud.nom, valeur: l?.plafondNombre ?? Math.min(30, p.max), sansLimite: l?.sansPlafond ?? false });
    }
  };
  const renommable = p.ecrire && f.personnes.length === 0 && (dossierNoeud?.renommable || (!f.dossier && f.mode === "liens" && f.lien?.startsWith("lien:") && ouvertNoeud?.renommable));

  const glisser = p.ecrire
    ? { glisser: propsGlisser, recevoir: propsRecevoir, survol, glisse, nouveau: p.ouverte && envoi.ouvrir ? () => envoi.ouvrir?.({ nouveau: true }) : null }
    : null;
  const listes = () => (
    <Listes
      f={f}
      changer={appliquer}
      arbre={arbre}
      ecrire={p.ecrire}
      tu={p.tu}
      nomPersonne={nomPersonne}
      corbeille={stats?.corbeille ?? null}
      voirCorbeille={p.ecrire}
      basculerPersonne={(cle) => appliquer({ ...avecPersonne(f, cle), mode: "tout", lien: null, dossier: null })}
      personnesDuLien={lienDePastilles ? personnesDuLien : null}
      choisiesDuLien={nomsChoisis}
      basculerDuLien={basculerPastille}
      toutLeMondeDuLien={() => setChoixPastilles({ lien: f.lien, cles: new Set() })}
      dossiers={glisser}
    />
  );
  /** Cocher, ou décocher, la pastille d'une personne d'un lien (la grille se filtre dans le navigateur). */
  function basculerPastille(cle: string) {
    const cles = new Set(nomsChoisis);
    if (cles.has(cle)) cles.delete(cle);
    else cles.add(cle);
    setCoches(AUCUNE);
    setModeCocher(false);
    setChoixPastilles({ lien: f.lien, cles });
  }

  /* LA MOSAÏQUE (planches 2D et 3 du 21/10) : « Par lien » en tuiles de tailles différentes. Ce que chaque tuile montre vient de la lecture du moment ;
     sa taille et sa place, des poids de l'ouverture (`peseesLiens`, gelés). « Mes photos » et l'atelier ne sont pas des liens : des lignes sous la mosaïque. */
  const sousAlbum = (n: Noeud) => (n.cle === "vous" ? (p.ecrire ? v("déposées par vous", "déposées par toi") : "déposées par le responsable") : "déposées par l'atelier");
  /** Le menu « … » d'un lien de contribution (jamais pour « Sans groupe » : lecture seule, jamais pour l'équipe). */
  const actionsDe = (cle: string) => {
    const l = p.ecrire ? liens?.liens.find((x) => `lien:${x.id}` === cle) : undefined;
    if (!l) return undefined;
    return actionsDuLien({
      ouverte: p.ouverte,
      partager: () => void partager(lienDe(l.nom, l.cle, l.plafond, l.n)),
      qr: () => {
        fermerAvis();
        setGrandQr(lienDe(l.nom, l.cle, l.plafond, l.n));
      },
      modifier: () => setModifier({ id: l.id, nom: l.nom, valeur: l.plafondNombre ?? Math.min(30, p.max), sansLimite: l.sansPlafond }),
      supprimer: () => setSupprimer({ id: l.id, nom: l.nom, n: l.n }),
    });
  };
  const tuileDuLien = (n: Noeud, couv: Record<string, string>): TuileVue => {
    /* « Mes photos » : une tuile comme les liens, sans « … », qui compte ses photos (pas des personnes). */
    if (n.cle === "vous") return { cle: n.cle, nom: nomVous, n: n.n, couverture: couv["vous"] ?? null, couvertureMoyenne: couvPlus["vous"]?.m ?? null, couvertureLarge: couvPlus["vous"]?.paysage ?? null, genre: "personne" };
    const detail = liens?.liens.find((x) => `lien:${x.id}` === n.cle);
    return { cle: n.cle, nom: n.nom, n: n.n, personnes: detail ? detail.personnes.length : n.enfants.length, couverture: couv[n.cle] ?? null, couvertureMoyenne: couvPlus[n.cle]?.m ?? null, couvertureLarge: couvPlus[n.cle]?.paysage ?? null, actions: actionsDe(n.cle) };
  };
  const noeudsDeLiens = arbre ? liensDansLOrdre(arbre, avecVous).filter((n) => n.cle.startsWith("lien:") || n.cle === "participants" || (n.cle === "vous" && n.n > 0)) : [];
  const tuilesLiens: TuileVue[] = noeudsDeLiens.map((n) => tuileDuLien(n, couvLiens));
  /** La tuile en tête d'un lien ouvert (3C) : la même, avec la couverture lue par la vue « Par lien » (sinon la dernière photo de la grille). */
  const tuileDeLAlbum: TuileVue | null = lienDePastilles ? { ...tuileDuLien(lienDePastilles, couvLiens), couverture: couvLiens[lienDePastilles.cle] ?? photos.find((x) => x.vignette)?.vignette ?? null } : null;
  /** Un lien est créé : « Partager » s'ouvre sur lui (le QR, « Copier le message »), et la page relit ses liens. */
  const quandCree = (l: LienCree) => {
    setCreerLien(null);
    setPartage(l.id && l.cle ? lienDe(l.libelle, l.cle, l.plafond, 0) : { libelle: l.libelle, url: l.url, plafond: l.plafond, recues: 0 });
    relire();
  };
  /** La ligne sous la mosaïque : l'atelier, qui n'est pas un lien (« Mes photos » est une tuile, en tête) ; sans photo, rien à ouvrir, elle ne se montre pas. */
  const lignesDessous = arbre ? liensDansLOrdre(arbre, avecVous).filter((n) => n.cle === "atelier" && n.n > 0) : [];
  const fenetres = (
    <>
      {creerLien !== null ? <FenetreCreerLien token={p.token} max={p.max} tu={p.tu} nomInitial={creerLien} onCree={quandCree} onFermer={() => setCreerLien(null)} /> : null}
      {partage ? (
        <FenetrePartage
          lien={partage}
          contexte={contexte}
          onFermer={() => setPartage(null)}
          onQr={() => {
            setGrandQr(partage);
            setPartage(null);
          }}
        />
      ) : null}
      {grandQr ? telephone ? <FeuilleQr lien={grandQr} contexte={contexte} onFermer={() => setGrandQr(null)} /> : <FenetreQr lien={grandQr} contexte={contexte} onFermer={() => setGrandQr(null)} /> : null}
      {modifier ? (
        <FenetreModifierLien
          nom={modifier.nom}
          general={modifier.id === null}
          max={maxPlafond}
          valeurInitiale={modifier.valeur}
          sansLimiteInitial={modifier.sansLimite}
          occupe={occupe}
          erreur={erreur}
          onFermer={() => setModifier(null)}
          onGarder={async (nom, valeur, sansLimite) => {
            /* Le nom ET le nombre partent ensemble (une seule requête) ; le lien général n'a pas de nom à changer. */
            const ok =
              modifier.id === null
                ? await appeler("/api/collectif/plafond", { valeur })
                : await appeler("/api/collectif/provenances", corpsModifierLien(modifier.id, nom, valeur, sansLimite));
            if (ok) {
              setModifier(null);
              relire();
            }
          }}
        />
      ) : null}
      {supprimer ? (
        <Fenetre titre={`Supprimer le lien « ${supprimer.nom} » ?`} onFermer={() => setSupprimer(null)}>
          <p className="ec-texte">
            Il ne recevra plus de photos.{supprimer.n > 0 ? (supprimer.n > 1 ? ` Ses ${nombre(supprimer.n)} photos restent.` : " Sa photo reste.") : ""}
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
      {confirmerSelection ? (
        <ChoixFinCollecte
          token={p.token}
          photos={null}
          telephone={telephone}
          confirmerSeul
          onFermer={() => setConfirmerSelection(false)}
          onFait={() => setConfirmerSelection(false)}
          onChoisir={() => setConfirmerSelection(false)}
          onConfirme={() => {
            setConfirmerSelection(false);
            void envoyerPreferees();
          }}
        />
      ) : null}
      {choixFin ? (
        <ChoixFinCollecte
          token={p.token}
          photos={stats ? stats.photos : null}
          telephone={telephone}
          onFermer={() => setChoixFin(false)}
          onFait={(le) => {
            setChoixFin(false);
            p.onTermine(le);
          }}
          onChoisir={ouvrirPreferees}
        />
      ) : null}
      {feuillePersonnes ? (
        <FeuillePersonnes personnes={personnesDeLaFeuille(arbre)} choisies={f.personnes} nomPersonne={nomPersonne} onBasculer={(cle) => appliquer(avecPersonne(f, cle))} onFermer={() => setFeuillePersonnes(false)} />
      ) : null}
    </>
  );

  /* Un message qui passe (après un geste), posé dans la colonne de contenu, au-dessus de la visionneuse. */
  const blocAvis = avis ? (
    <div className={photoAgrandie ? "ec-ph-avis ec-ph-avis--haut" : rondsVisibles ? "ec-ph-avis ec-ph-avis--barre" : "ec-ph-avis"} role="status">
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

  /* ─────────────────────────────── le « … » du haut ─────────────────────────────── */
  const grilleVisible = !albums && !f.corbeille && !prefereesActif;
  const entreesHaut = entreesDuMenuHaut({
    ecrire: p.ecrire,
    grille: grilleVisible,
    vide: Boolean(vide),
    corbeille: stats?.corbeille ?? null,
    terminer: p.fin.terminer && p.ouverte && (stats ? stats.photos > 0 : false),
    ordinateur: !telephone,
    ouverte: p.ouverte,
  });
  const actionsHaut: ActionMenu[] = entreesHaut.map((e) =>
    e.cle === "selectionner"
      ? { cle: e.cle, libelle: e.libelle, icone: ICONES.coche, filetAvant: e.filetAvant, faire: () => setModeCocher(true) }
      : e.cle === "supprimees"
        ? { cle: e.cle, libelle: e.libelle, icone: ICONES.corbeille, filetAvant: e.filetAvant, faire: () => appliquer(avecCorbeille(f)) }
        : { cle: e.cle, libelle: e.libelle, icone: ICONES.drapeau, filetAvant: e.filetAvant, faire: () => { fermerAvis(); setChoixFin(true); } }
  );
  const boutonPlus = (
    <>
      <button
        type="button"
        className="ec-s-rond"
        aria-label="Plus d'options"
        aria-haspopup="menu"
        aria-expanded={menuHaut.menu !== null}
        onClick={(e) => menuHaut.basculer("haut", e.currentTarget, actionsHaut.length)}
      >
        <Points />
      </button>
      {menuHaut.menu ? <MenuLien nom="" etiquette="Plus d'options" iconeADroite ouvert={menuHaut.menu} actions={actionsHaut} declencheur={menuHaut.declencheur} onFermer={menuHaut.fermer} /> : null}
    </>
  );

  /* ─────────────────────────────── le rendu ─────────────────────────────── */
  const telLienOuvert = f.mode === "liens" && ouvertNoeud && !f.corbeille;
  /* Téléphone : la corbeille et « Choisir d'abord mes préférées » ont leur propre titre ; l'en-tête ordinaire et la barre se taisent. */
  const ecranPropre = f.corbeille || prefereesActif;
  /* La barre flottante du bas (téléphone) : sauf une édition vide et les écrans qui portent leur propre titre. */
  const barreBas = !vide && !f.corbeille;
  /* Un lien de contribution (ou « Sans groupe ») ouvert au téléphone : sa tuile en tête (3C), le grand titre se tait ; la barre du bas ramène à « Par lien ». */
  const enTuile = tuileActive && f.mode === "liens" && !cocherActif && !prefereesActif;
  /* Le titre du téléphone : le nombre de sélectionnées, « Mes préférées », le lien ouvert ; sinon « Les photos ». */
  const titreTel = cocherActif ? `${nombre(nbCoches)} sélectionnée${nbCoches > 1 ? "s" : ""}` : prefereesActif ? "Mes préférées" : telLienOuvert ? (dossierNoeud?.nom ?? nomOuvert) : "Les photos";
  const retourTel: { texte: string; faire: () => void } | null = f.corbeille
    ? { texte: "Les photos", faire: () => appliquer({ ...f, corbeille: false }) }
    : prefereesActif
      ? { texte: "Les photos", faire: () => setPreferees(null) }
      : tuileActive && telLienOuvert && !cocherActif
        ? { texte: "Par lien", faire: () => appliquer(avecLien(f, null)) }
        : telLienOuvert && !tuileActive && !cocherActif
          ? { texte: "Par lien", faire: () => appliquer(avecLien(f, null)) }
          : null;
  const plusDeposer =
    p.ecrire && p.ouverte && envoi.ouvrir && !cocherActif && !ecranPropre ? (
      <button
        type="button"
        className="ec-ph-plus ec-ph-tel"
        aria-label="Déposer des photos"
        onClick={() => envoi.ouvrir?.({ dossier: f.dossier && arbre && f.dossier.startsWith("resp:organisateur:") ? cheminDuNoeud(arbre, f.dossier) : null })}
      >
        <Trace d={TRACE.plus} taille={22} epais={2} />
      </button>
    ) : null;
  /* Les photos prêtes à agir : « Terminer la collecte » n'est pas posé sur la page (il est dans le « … »). */
  const mligne = stats && !cocherActif && !ecranPropre && !enTuile && !albums ? (
    <p className="ec-ph-mligne ec-ph-tel">
      <span>
        {f.personnes.length || f.dossier ? (
          <>
            <b>{totalVue !== null ? nombre(totalVue) : "…"}</b> photo{totalVue !== null && totalVue > 1 ? "s" : ""}
          </>
        ) : (
          <>
            <b>{nombre(stats.photos)}</b> photo{stats.photos > 1 ? "s" : ""} · <b>{nombre(stats.personnes)}</b> personne{stats.personnes > 1 ? "s" : ""}
          </>
        )}
      </span>
    </p>
  ) : stats && albums && !ecranPropre ? (
    <p className="ec-ph-mligne ec-ph-tel">
      <span>
        <b>{nombre(stats.photos)}</b> photo{stats.photos > 1 ? "s" : ""} · <b>{nombre(stats.personnes)}</b> personne{stats.personnes > 1 ? "s" : ""}
      </span>
    </p>
  ) : null;
  const puces =
    f.personnes.length && grilleVisible ? (
      <div className="ec-s-puces" role="group" aria-label="Personnes choisies">
        {f.personnes.map((cle) => {
          const n = arbre ? noeudDe(arbre, cle) : undefined;
          const nom = n ? nomPersonne(n) : cle === QUI_RESPONSABLE ? v("Vous", "Toi") : cle.slice(4);
          return (
            <span key={cle} className="ec-s-puce">
              {nom}
              <button type="button" aria-label={`Retirer « ${nom} » du filtre`} onClick={() => appliquer({ ...f, personnes: f.personnes.filter((c) => c !== cle) })}>
                <Trace d={TRACE.fermer} taille={14} epais={2.4} />
              </button>
            </span>
          );
        })}
      </div>
    ) : null;

  return (
    <section
      className={`ec-ecran ec-collecte${telLienOuvert ? " ec-collecte--lien" : ""}${enTuile ? " ec-collecte--tuile" : ""}${cocherActif ? " ec-collecte--cocher" : ""}${prefereesActif ? " ec-collecte--preferees" : ""}${f.corbeille ? " ec-collecte--propre" : ""}${f.corbeille ? " ec-collecte--corbeille" : ""}${barreBas ? " ec-collecte--barre" : ""}`}
    >
      {retourTel && !enTuile ? (
        <div className="ec-s-ligne-haut ec-ph-tel">
          <button type="button" className="ec-s-retour" onClick={retourTel.faire}>
            <Trace d={TRACE.retour} taille={22} epais={2.2} />
            {retourTel.texte}
          </button>
        </div>
      ) : null}
      <EnTeteEcran
        titre={
          <>
            <span className="ec-ph-titre-ordi">Les photos</span>
            <span className="ec-ph-titre-tel">{titreTel}</span>
          </>
        }
      >
        {/* Un lien ouvert : la capsule « ‹ Par lien » est sur la MÊME ligne que le « + » et le « … » (planche 12) ; ailleurs elle a sa ligne. */}
        {retourTel && enTuile ? (
          <button type="button" className="ec-s-retour ec-ph-tel" onClick={retourTel.faire}>
            <Trace d={TRACE.retour} taille={22} epais={2.2} />
            {retourTel.texte}
          </button>
        ) : null}
        {/* Téléphone, Sélectionner : « Terminé » remplace le « + » et le « … ». */}
        {cocherActif ? (
          <button type="button" className="ec-s-pilule ec-s-pilule--plein ec-ph-tel" onClick={toutDecocher}>
            Terminé
          </button>
        ) : null}
        {/* « Déposer » : le « + » rond, VISIBLE (« l'action la plus importante »), puis UN « … » : Sélectionner, Supprimées récemment, Terminer la collecte. La collecte terminée : le « + » disparaît (planche 9, vue 11D). */}
        {!prefereesActif && !f.corbeille && !cocherActif ? plusDeposer : null}
        {/* Ordinateur : « Déposer des photos » reste LE bouton visible. */}
        {!prefereesActif && !f.corbeille && envoi.ouvrir && p.ouverte && p.ecrire ? (
          <button
            type="button"
            className="ec-bouton ec-bouton--petit ec-ph-ordi"
            onClick={() => envoi.ouvrir?.({ dossier: f.dossier && arbre && f.dossier.startsWith("resp:organisateur:") ? cheminDuNoeud(arbre, f.dossier) : null })}
          >
            Déposer des photos
          </button>
        ) : null}
        {!prefereesActif && !f.corbeille ? <ActionsFinCollecte ecrire={p.ecrire} ouverte={p.ouverte} variante="ordi" /> : null}
        {!cocherActif && !prefereesActif && !f.corbeille && entreesHaut.length ? boutonPlus : null}
      </EnTeteEcran>

      {/* La collecte est terminée : la page le DIT, sous le titre, pour tous les rôles (21/10). */}
      {!p.ouverte ? <LigneFinCollecte id={ID_LIGNE_FIN} le={p.fin.le} tu={p.tu} oubli={p.fin.terminer && p.fin.oubli} className="ec-ph-ordi" /> : null}

      {erreur && !supprimer && !modifier ? (
        <p className="ec-note ec-note--erreur ec-ph-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {/* Téléphone : sous le titre, la ligne de chiffres (« 45 photos · 2 personnes »), « 12 gardées sur 2 692 » dans « Mes préférées ». */}
      {mligne}
      {/* Téléphone (planche 9, vue 11D) : une pastille calme, « Collecte terminée le 15 novembre » ; rien ne s'ajoute plus. */}
      {!p.ouverte && !f.corbeille && !prefereesActif ? (
        <p className="ec-s-banniere ec-ph-tel" role="status">
          <span className="ec-ph-annonce-point" aria-hidden="true" />
          {pastilleCollecteTerminee(p.fin.le)}
        </p>
      ) : null}
      {prefereesActif ? (
        <p className="ec-ph-mligne ec-ph-tel" role="status">
          <span>
            <b>{nombre(nbGardees)}</b> gardée{nbGardees > 1 ? "s" : ""} sur {nombre(total)}
          </span>
        </p>
      ) : null}
      {annonce && !f.corbeille && !prefereesActif && !cocherActif ? (
        <button type="button" className="ec-s-nouvelles ec-ph-tel" onClick={voirArrivees}>
          <span className="ec-ph-annonce-point" aria-hidden="true" />
          <span className="ec-s-nouvelles-texte">{annonce.court}</span>
          <b>Les voir</b>
        </button>
      ) : null}
      {puces && !prefereesActif ? <div className="ec-ph-tel">{puces}</div> : null}

      {stats && !f.corbeille ? (
        <div className="ec-ph-chiffres ec-ph-ordi">
          <span className="ec-ph-chiffre">
            <strong>{nombre(stats.photos)}</strong> photo{stats.photos > 1 ? "s" : ""} · <strong>{nombre(stats.personnes)}</strong> personne{stats.personnes > 1 ? "s" : ""}
          </span>
          {stats.enCours ? <span className="ec-ph-chiffre ec-ph-chiffre--cours">{nombre(stats.enCours)} en cours</span> : null}
          {/* Ordinateur : « Nouveau lien », LE bouton, à côté des chiffres (la tuile et la ligne de la colonne n'existent plus ici). */}
          {p.ecrire && p.ouverte ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit ec-ph-nouveau" onClick={() => setCreerLien("")}>
              <Trace d={TRACE.plus} taille={16} epais={2.2} />
              Nouveau lien
            </button>
          ) : null}
          <span className="ec-ph-chiffres-fin">
            {p.cloture && p.ouverte ? <span className="ec-note">Clôture le {p.cloture}</span> : null}
          </span>
        </div>
      ) : null}

      <div className={`ec-ph-panneau${p.ecrire && nbCoches > 0 ? " ec-ph-panneau--barre" : ""}`}>
        <aside className="ec-ph-filtres ec-ph-ordi" aria-label="Regarder les photos">
          {arbre && !vide ? listes() : null}
        </aside>

        <div className="ec-ph-zone">
          {f.corbeille ? <Corbeille token={p.token} tu={p.tu} version={stats?.photos ?? 0} telephone={telephone} onRestaurees={restaureesDeLaCorbeille} /> : null}
          {!f.corbeille ? (
            <>
              {!vide && !albums ? (
                <div className="ec-ph-zone-tete ec-ph-ordi">
                  <div className="ec-ph-zone-titres">
                    {f.mode === "liens" && ouvertNoeud ? (
                      <nav className="ec-ph-fil" aria-label={v("Où vous êtes", "Où tu es")}>
                        <button type="button" className="ec-ph-lien" onClick={() => appliquer(avecLien(f, null))}>
                          Par lien
                        </button>
                        <Trace d={TRACE.chev} taille={14} epais={2} />
                        {f.dossier ? (
                          <>
                            <button type="button" className="ec-ph-lien" onClick={() => appliquer({ ...f, dossier: null })}>
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
                        title={renommable ? (dossierNoeud?.renommable ? "Double-cliquer pour changer le nom" : "Double-cliquer pour modifier le lien") : undefined}
                        onDoubleClick={() => renommable && commencerRenommer()}
                      >
                        {titre}
                        {renommable ? (
                          <button type="button" className="ec-ph-renommer" aria-label={dossierNoeud?.renommable ? `Changer le nom de « ${titre} »` : `Modifier le lien « ${titre} »`} title={dossierNoeud?.renommable ? "Changer le nom" : "Modifier le lien"} onClick={commencerRenommer}>
                            <Trace d={ICONES.crayon} taille={16} epais={1.7} />
                          </button>
                        ) : null}
                      </h2>
                    )}
                    {prefereesActif ? (
                      <span className="ec-note" role="status">
                        <b>{nombre(nbGardees)}</b> gardée{nbGardees > 1 ? "s" : ""} sur {nombre(total)}
                      </span>
                    ) : note ? (
                      <span className="ec-note">{note}</span>
                    ) : null}
                  </div>
                  <div className="ec-ph-outils">
                    {/* Partager : DEUX gestes à l'ordinateur, « Copier le message » et « QR code » (plus de fenêtre à retoucher, ni WhatsApp ni Mail). */}
                    {partageable && !prefereesActif ? (
                      <>
                        <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => void copierMessageDuLien()}>
                          {copie ? "Copié" : "Copier le message"}
                        </button>
                        <button
                          type="button"
                          className="ec-bouton ec-bouton--clair ec-bouton--petit"
                          onClick={() => {
                            const l = lienPartage();
                            if (l) setGrandQr(l);
                          }}
                        >
                          QR code
                        </button>
                      </>
                    ) : null}
                    {prefereesActif ? (
                      <>
                        <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => setPreferees(null)}>
                          Annuler
                        </button>
                        <button type="button" className="ec-bouton ec-bouton--petit" disabled={occupe || nbGardees === 0} onClick={() => setConfirmerSelection(true)}>
                          Envoyer ma sélection · {nombre(nbGardees)}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Les personnes et le lien choisis, avec leur croix (ordinateur) : pas de « Tout effacer », chaque puce se retire d'un toucher. */}
              {f.mode === "tout" && filtree && !vide ? (
                <div className="ec-ph-actifs ec-ph-ordi">
                  {f.favoris && !f.personnes.length ? (
                    <span className="ec-ph-puce">
                      Favoris
                      <button type="button" aria-label="Retirer le filtre « Favoris »" onClick={() => appliquer({ ...f, favoris: false })}>
                        <Trace d={TRACE.fermer} taille={12} epais={2.4} />
                      </button>
                    </span>
                  ) : null}
                  {f.dossier && dossierNoeud ? (
                    <span className="ec-ph-puce">
                      {dossierNoeud.nom}
                      <button type="button" aria-label={`Retirer le filtre « ${dossierNoeud.nom} »`} onClick={() => appliquer({ ...f, dossier: null })}>
                        <Trace d={TRACE.fermer} taille={12} epais={2.4} />
                      </button>
                    </span>
                  ) : null}
                  {f.personnes.map((cle) => {
                    const n = arbre ? noeudDe(arbre, cle) : undefined;
                    const nom = n ? nomPersonne(n) : cle.slice(4);
                    return (
                      <span key={cle} className="ec-ph-puce">
                        {nom}
                        <button type="button" aria-label={`Retirer le filtre « ${nom} »`} onClick={() => appliquer({ ...f, personnes: f.personnes.filter((c) => c !== cle) })}>
                          <Trace d={TRACE.fermer} taille={12} epais={2.4} />
                        </button>
                      </span>
                    );
                  })}
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
                {/* Téléphone : un lien ouvert (3C). SA TUILE en tête, plus basse, avec son « … » ; dessous, ses personnes en PASTILLES (« Tout le monde »,
                    puis une par personne : initiales, prénom, photos) qui filtrent la grille ci-dessous sans quitter la page, une ou plusieurs ; puis ses
                    photos, rangées par jour. Aucun lien souligné, aucune liste à part, aucune barre de plafond. */}
                {tuileActive && !cocherActif && tuileDeLAlbum ? (
                  <div className="ec-ph-tel">
                    <TuileDeLAlbum t={tuileDeLAlbum} />
                  </div>
                ) : null}
                {tuileActive && lienDePastilles && personnesDuLien.length >= 2 ? (
                  <div className="ec-ph-tel">
                    <PastillesDePersonnes personnes={personnesDuLien} total={lienDePastilles.n} choisies={nomsChoisis} toutes={() => setChoixPastilles({ lien: f.lien, cles: new Set() })} basculer={basculerPastille} />
                  </div>
                ) : null}

                {/* Téléphone : « Mes photos » ouvert : ses dossiers, en liste. */}
                {telLienOuvert && ouvertNoeud && ouvertNoeud.cle === "vous" && ouvertNoeud.enfants.length ? (
                  <div className="ec-ph-liste-verre ec-ph-tel">
                    <button type="button" className={!f.dossier ? "ec-ph-rangee ec-ph-rangee--on ec-ph-rangee--court" : "ec-ph-rangee ec-ph-rangee--court"} onClick={() => appliquer({ ...f, dossier: null })}>
                      <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                        <Trace d={TRACE.dossier} taille={16} epais={1.8} />
                      </span>
                      <span className="ec-ph-rangee-txt">
                        <b>{p.ecrire ? v("Tous vos dossiers", "Tous tes dossiers") : "Tous ses dossiers"}</b>
                      </span>
                      <span className="ec-ph-n">{nombre(ouvertNoeud.n)}</span>
                      <Trace d={TRACE.chev} taille={16} epais={2} />
                    </button>
                    {ouvertNoeud.enfants.flatMap((d) => [d, ...d.enfants]).map((x) => (
                      <button key={x.cle} type="button" className={f.dossier === x.cle ? "ec-ph-rangee ec-ph-rangee--on ec-ph-rangee--court" : "ec-ph-rangee ec-ph-rangee--court"} onClick={() => appliquer({ ...f, dossier: x.cle })}>
                        <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                          <Trace d={TRACE.dossier} taille={16} epais={1.8} />
                        </span>
                        <span className="ec-ph-rangee-txt">
                          <b>{nomPersonne(x)}</b>
                        </span>
                        <span className="ec-ph-n">{nombre(x.n)}</span>
                        <Trace d={TRACE.chev} taille={16} epais={2} />
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* « Par lien » : une mosaïque, une tuile par lien, « Nouveau lien » en dernière tuile. Sa taille et sa place sont celles de l'OUVERTURE de la page ;
                    « Mes photos » et l'atelier, qui ne sont pas des liens, sont deux lignes dessous. Sans aucun lien de groupe : l'état vide (5B). */}
                {albums && arbre && !vide ? (
                  <>
                    {peseesLiens && tuilesLiens.length ? (
                      <Mosaique genre="lien" variante="albums" tuiles={tuilesLiens} ordre={peseesLiens} etiquette="Les liens" ouvrir={(cle) => appliquer(avecLien(f, cle))} nouveau={p.ecrire && p.ouverte ? () => setCreerLien("") : undefined} />
                    ) : null}
                    {!tuilesLiens.length && p.ecrire ? <EtatSansLien tu={p.tu} ouverte={p.ouverte} creer={setCreerLien} /> : null}
                    {!tuilesLiens.length && !lignesDessous.length && !p.ecrire ? <p className="ec-note ec-ph-chargement">Aucun lien à montrer pour l&apos;instant.</p> : null}
                    {lignesDessous.length ? (
                      <div className="ec-mo-pied">
                        {lignesDessous.map((n) => (
                          <button key={n.cle} type="button" className="ec-mo-ligne" onClick={() => appliquer(avecLien(f, n.cle))}>
                            <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                              <Trace d={n.cle === "vous" ? TRACE.dossier : TRACE.atelier} taille={16} epais={1.8} />
                            </span>
                            <span className="ec-mo-ligne-txt">
                              <b>{n.cle === "vous" ? nomVous : n.nom}</b>
                              <span>{sousAlbum(n)}</span>
                            </span>
                            <span className="ec-ph-n">{nombre(n.n)}</span>
                            <Trace d={TRACE.chev} taille={16} epais={2} />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {vide ? (
                  <div className="ec-ph-accueil">
                    <strong className="ec-ph-accueil-titre">Les photos arriveront ici</strong>
                    <p className="ec-texte">
                      {p.ecrire
                        ? v("Déposez des photos ou invitez des participants.", "Dépose des photos ou invite des participants.")
                        : "Rien pour l'instant."}
                    </p>
                    {p.ecrire && p.ouverte ? (
                      <div className="ec-ph-accueil-gestes">
                        {envoi.ouvrir ? (
                          <button type="button" className="ec-bouton" onClick={() => envoi.ouvrir?.()}>
                            Déposer des photos
                          </button>
                        ) : null}
                        <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setCreerLien("")}>
                          Créer un lien pour les participants
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {/* Aucune photo, mais des liens : ils se partagent depuis leur tuile, sans attendre la première photo. */}
                {vide && arbre && p.ecrire && p.ouverte && peseesLiens && tuilesLiens.length ? (
                  <Mosaique
                    genre="lien"
                    variante="albums"
                    tuiles={tuilesLiens}
                    ordre={peseesLiens}
                    etiquette="Les liens"
                    ouvrir={(cle) => {
                      /* Un lien sans photo n'a rien à ouvrir : le toucher le PARTAGE (la feuille de l'iPhone, ou la petite fenêtre), ce qu'on en fait à ce moment-là. */
                      const l = liens?.liens.find((x) => `lien:${x.id}` === cle);
                      if (l) void partager(lienDe(l.nom, l.cle, l.plafond, l.n));
                    }}
                  />
                ) : null}

                {!albums && !vide && visibles.length === 0 && !chargement && stats ? (
                  <div className="ec-a-venir">
                    <p className="ec-texte">
                      {f.favoris ? "Aucun favori pour l'instant." : f.lien || f.personnes.length || f.dossier ? "Rien reçu ici pour l'instant." : "Aucune photo pour l'instant."}
                    </p>
                  </div>
                ) : null}

                {!vide && !albums ? (
                  <Grille
                    groupes={groupes}
                    ecrire={p.ecrire}
                    cocher={rondsVisibles}
                    coeurs={prefereesActif}
                    estCochee={estCochee}
                    attente={chargement && photos.length > 0 ? 8 : 0}
                    onOuvrir={setAgrandi}
                    onCocher={cocher}
                    onAppuiLong={(ph) => {
                      if (prefereesActif) return;
                      /* En mode « Sélectionner », l'appui long bascule la photo ; sinon il ouvre son menu (Favori, Voir qui l'a envoyée, Supprimer). */
                      if (cocherActif) cocher(ph.id, false);
                      else {
                        fermerAvis();
                        setMenuPhoto(ph.id);
                      }
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
                {suivante && !chargement && !albums ? (
                  <button type="button" className="ec-bouton ec-bouton--clair ec-ph-suite" onClick={() => void charger(suivante, f)}>
                    Voir la suite
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          <div className="ec-ph-zone-pied ec-ph-ordi" aria-hidden="true" />
        </div>

        {/* La barre d'actions (ordinateur) : en bas du panneau dès qu'une photo est prise. « Tout sélectionner » n'apparaît qu'APRÈS une première photo ;
            la barre n'a que le cœur et Supprimer. */}
        {p.ecrire && nbCoches > 0 && !prefereesActif ? (
          <div className="ec-ph-barre-actions ec-ph-ordi" role="toolbar" aria-label="Agir sur les photos sélectionnées">
            <span className="ec-ph-compte">
              <b>{nombre(nbCoches)}</b>
              {` sélectionnée${nbCoches > 1 ? "s" : ""}`}
            </span>
            {totalVue && nbCoches < totalVue ? (
              <button type="button" className="ec-ph-act" onClick={toutCocher}>
                Tout sélectionner ({nombre(totalVue)})
              </button>
            ) : null}
            <span className="ec-ph-sep" aria-hidden="true" />
            {progres ? <span className="ec-ph-progres">{progres}</span> : null}
            <button type="button" className="ec-ph-act" disabled={occupe} onClick={() => void agir(toutesEnCoeur() ? "retirer" : "poser")}>
              <Trace d={ICONES.coeur} taille={16} plein={toutesEnCoeur()} epais={1.7} />
              Favori
            </button>
            {/* « Supprimer » : la corbeille 30 jours, sans fenêtre de confirmation (« Annuler » quelques secondes). */}
            <button type="button" className="ec-ph-act ec-ph-act--danger" disabled={occupe} onClick={() => void agir("supprimer")}>
              <Trace d={ICONES.corbeille} taille={16} epais={1.7} />
              Supprimer
            </button>
            <button type="button" className="ec-ph-act ec-ph-act--x" aria-label="Terminer la sélection" onClick={toutDecocher}>
              <Trace d={TRACE.fermer} taille={16} epais={2} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Téléphone : la barre du bas. Elle dit OÙ l'on est (« Toutes · Par lien », deux choix avec leur icône) et porte le rond « Personnes » (la
          recherche) ; en « Sélectionner », la MÊME place devient la barre des deux gestes (le cœur et Supprimer) ; dans « Mes préférées », le seul
          bouton « Envoyer ma sélection ». */}
      {barreBas ? (
        <>
          <div className="ec-s-scrim ec-ph-tel" aria-hidden="true" />
          {prefereesActif ? (
            <div className="ec-fl ec-ph-tel">
              {progres ? <p className="ec-ph-progres ec-fl-progres">{progres}</p> : null}
              <button type="button" className="ec-s-envoyer" disabled={occupe || nbGardees === 0} aria-disabled={nbGardees === 0} onClick={() => setConfirmerSelection(true)}>
                <Trace d={ICONES.envoyer} taille={22} epais={1.8} />
                {occupe ? "Un instant…" : `Envoyer ma sélection · ${nombre(nbGardees)}`}
              </button>
            </div>
          ) : cocherActif ? (
            <div className="ec-fl ec-ph-tel">
              {progres ? <p className="ec-ph-progres ec-fl-progres">{progres}</p> : null}
              <div className="ec-s-bas" role="toolbar" aria-label="Agir sur les photos sélectionnées">
                <button type="button" disabled={occupe || !nbCoches} onClick={() => void agir(toutesEnCoeur() ? "retirer" : "poser")}>
                  <Trace d={ICONES.coeur} taille={24} plein={nbCoches > 0 && toutesEnCoeur()} epais={1.8} />
                  Favori
                </button>
                <button type="button" className="ec-s-danger" disabled={occupe || !nbCoches} onClick={() => void agir("supprimer")}>
                  <Trace d={ICONES.corbeille} taille={24} epais={1.8} />
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <div className="ec-fl ec-ph-tel" role="toolbar" aria-label="Regarder les photos">
              <div className={f.mode === "tout" ? "ec-s-onglets" : "ec-s-onglets ec-s-onglets--seul"} role="group" aria-label="Regarder">
                {/* Chaque choix ramène à SA vue d'ensemble, d'où qu'on vienne (un lien ouvert, une personne choisie) : « Toutes » = toutes les photos, « Par lien » = la
                    mosaïque des liens. Un seul toucher, jamais un retour à refaire plusieurs fois. */}
                <button type="button" aria-current={f.mode === "tout" && !f.favoris ? "true" : undefined} onClick={() => appliquer({ ...f, mode: "tout", lien: null, dossier: null, favoris: false })}>
                  <Trace d={ICONES.toutes} taille={24} plein={f.mode === "tout" && !f.favoris} epais={1.8} />
                  Toutes
                </button>
                {/* « Favoris » (28/10) : la même place que « Toutes » et « Par lien », sans bouton de plus ailleurs ; l'état se lit tout de suite (le segment est plein). */}
                <button type="button" aria-current={f.mode === "tout" && f.favoris && !f.personnes.length ? "true" : undefined} onClick={() => appliquer({ ...FILTRES_VIDES, favoris: true })}>
                  <Trace d={ICONES.coeur} taille={24} plein={f.mode === "tout" && f.favoris && !f.personnes.length} epais={1.8} />
                  Favoris
                </button>
                <button type="button" aria-current={f.mode === "liens" ? "true" : undefined} onClick={() => appliquer({ ...f, mode: "liens", lien: null, dossier: null, personnes: [], favoris: false })}>
                  <Trace d={ICONES.liens} taille={24} plein={f.mode === "liens"} epais={1.8} />
                  Par lien
                </button>
              </div>
              {f.mode === "tout" ? (
                <button type="button" className="ec-s-bas-rond" aria-haspopup="dialog" aria-expanded={feuillePersonnes} aria-label={f.personnes.length ? `Personnes (${f.personnes.length} choisie${f.personnes.length > 1 ? "s" : ""})` : "Personnes"} onClick={() => { fermerAvis(); setFeuillePersonnes(true); }}>
                  <Trace d={ICONES.personnes} taille={24} epais={1.8} />
                  {f.personnes.length ? <i aria-hidden="true" /> : null}
                </button>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      {photoAgrandie ? (
        <Agrandir
          photo={photoAgrandie}
          position={iAgrandi + 1}
          total={totalVue}
          contexte={f.mode === "liens" && ouvertNoeud ? nomOuvert : titre}
          qui={quiDe(photoAgrandie)}
          initiales={initialesDe(photoAgrandie.qui)}
          lien={lienDeLaPhoto(arbre, photoAgrandie, ouvertNoeud)}
          voirSes={(() => {
            const cle = cleQui(photoAgrandie);
            const n = cle && arbre ? noeudDe(arbre, cle) : undefined;
            if (!cle || !n) return null;
            return {
              libelle: photoAgrandie.role === "responsable" && p.ecrire ? v(`Voir vos ${nombre(n.n)} photos`, `Voir tes ${nombre(n.n)} photos`) : `Voir ses ${nombre(n.n)} photo${n.n > 1 ? "s" : ""}`,
              faire: () => voirQui(photoAgrandie),
            };
          })()}
          ecrire={p.ecrire}
          voisines={[visibles[iAgrandi - 1], visibles[iAgrandi + 1]].map((x) => x?.grande ?? x?.vignette).filter((x): x is string => Boolean(x))}
          onPrecedente={iAgrandi > 0 ? () => setAgrandi(visibles[iAgrandi - 1].id) : null}
          onSuivante={
            iAgrandi < visibles.length - 1
              ? () => setAgrandi(visibles[iAgrandi + 1].id)
              : suivante !== null && suivante !== 0 && !chargement
                ? () =>
                    void charger(suivante, f).then((nouvelles) => {
                      if (nouvelles?.length) setAgrandi(nouvelles[0].id);
                    })
                : null
          }
          onFermer={() => setAgrandi(null)}
          onCoeur={() => void coeurDe(photoAgrandie)}
          onSupprimer={p.ecrire ? () => void mettreALaCorbeille([photoAgrandie.id]) : undefined}
          occupe={occupe}
        />
      ) : null}

      {/* L'APPUI LONG sur une photo : le reste s'efface, la photo se soulève, trois lignes. */}
      {menuPhoto && p.ecrire && parId.get(menuPhoto) ? (
        <MenuPhoto
          photo={parId.get(menuPhoto) as Photo}
          entrees={entreesDuMenuPhoto({ ecrire: p.ecrire, favori: (parId.get(menuPhoto) as Photo).preselection, voirQui: cleQui(parId.get(menuPhoto) as Photo) !== null })}
          onFermer={() => setMenuPhoto(null)}
          onChoisir={(cle: CleMenuPhoto) => {
            const ph = parId.get(menuPhoto);
            setMenuPhoto(null);
            if (!ph) return;
            if (cle === "favori") void coeurDe(ph);
            else if (cle === "voirQui") voirQui(ph);
            else void mettreALaCorbeille([ph.id]);
          }}
        />
      ) : null}

      {blocAvis && hote ? createPortal(blocAvis, hote) : null}
      {fenetres}
    </section>
  );
}
