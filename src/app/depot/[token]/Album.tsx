"use client";

/* L'ALBUM DU LIEN, côté participant (planches 7, 8A et 9C du 20/10, T-199).

   L'en-tête dit le lien, combien de personnes et de photos, et sous quel nom
   on envoie ; deux onglets « Tout l'album » / « Mes photos » ; « Ajouter des
   photos » fixé en bas, sous le pouce, avec ce qu'il reste à envoyer. Pendant
   l'envoi, la barre du bas devient la progression PAR ARRIVÉE (une photo au
   coffre compte tout de suite, `progression`), et « Mes photos » montre
   chaque photo avec son anneau, puis sa coche (`apercus` du moteur). Après :
   le merci, avec le compte CONFIRMÉ par le serveur.

   Retours de Mathias du 21/10 (édition d'essai « Recette 1 ») :
   - le merci compte le DERNIER envoi (`vue.lot`), et seulement ce qui est
     ARRIVÉ : « Merci Mathias, 2 photos reçues. » Les « déjà là » se disent par
     cas (`phrasesDuLot` : déjà dans l'album, arrivées par « Bateau 2 »,
     revenues de la corbeille, retirées par l'organisateur), jamais comme
     reçues. Après une suppression, le bilan de l'envoi précédent s'efface : il
     ne décrit plus ce qui est là ;
   - « Envoyées depuis cet appareil » (un ordinateur n'est pas un téléphone),
     et les photos à mon nom envoyées d'un autre appareil se COMPTENT
     (`phraseAutresAppareils`), sans se montrer ni se supprimer ;
   - « Tout l'album » se relit toutes les 45 s onglet visible, et au retour sur
     l'onglet (au plus toutes les 20 s) : le compte suit, les photos des autres
     arrivent en tête, « nouvelle », sans faire sauter la grille pendant un
     envoi ou pendant qu'on coche (elles attendent la fin) ;
   - un 404 (le lien régénéré ou supprimé pendant que la page est ouverte) :
     toute la page devient « Ce lien ne fonctionne plus » (`CarteLienMort`),
     plus « L'album ne se charge pas ».

   Ce que la route rend (`depot/album`, contrat §2) fait foi : les photos des
   autres n'entrent dans l'album que sous l'accord du 20/10, avec leur PRÉNOM
   seulement ; « Mes photos », celles de CE téléphone. Une photo sans vignette
   n'a pas d'adresse d'image : la case dit « En préparation ».

   Supprimer (7D) : seulement depuis « Mes photos », seulement ce que la route
   dit `supprimable` (ce téléphone, cette personne, collecte ouverte), avec la
   feuille qui dit l'effet AVANT le geste ; la place libérée s'affiche tout de
   suite (`place` de la réponse). Sans la migration 20261023 (`personnes`
   faux), rien ne se supprime d'ici : aucune case n'est proposée.

   `lectureSeule` (9C) : la collecte est close, l'album se regarde, rien ne
   s'y ajoute ni ne s'y supprime. */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAndroid } from "@/hooks/useClient";
import { TAILLE_PAGE_ALBUM } from "@/lib/collectif/album";
import { DELAI_CORBEILLE_JOURS } from "@/lib/collectif/corbeille";
import { PHOTOS_SEULEMENT, phrasesIgnores } from "@/lib/collectif/depot";
import {
  bilanDuLot,
  cleDeVisite,
  derniereArrivee,
  enTete,
  initiales,
  nouvellesDepuis,
  photosDeLEnvoi,
  phraseAutresAppareils,
  phrasePlace,
  phraseRetour,
  phrasesDuLot,
  progression,
  SONDAGE_ALBUM_MS,
  SONDAGES_AVANT_RELECTURE,
} from "@/lib/collectif/depotParticipant";
import type { MoteurDepot } from "../../edition/_composants/depot/moteur";
import { useApercus, useMoteur } from "../../edition/_composants/depot/useMoteur";
import { useSondage } from "../../edition/_composants/useSondage";
import { lireAlbum, supprimerPhotos, type LectureAlbum, type PageAlbum, type PhotoAlbum } from "./appels";
import { IcoAttention, IcoCoche, IcoCorbeille, IcoPlus } from "./icones";
import { CarteLienMort } from "./LienMort";

export type Onglet = "album" | "miennes";

export type Tete = { organisation: string; evenement: string; lien: string | null; tu: boolean };

type Props = {
  token: string;
  p: string | null;
  tete: Tete;
  /** Sous quel nom ce téléphone envoie (la puce « moi ») ; `nom` seulement s'il vient d'être tapé ici. */
  qui: { prenom: string; nom: string | null } | null;
  /** « Ce n'est pas toi ? » (avec la migration seulement) ; absent : pas de lien. */
  pasMoi?: (() => void) | null;
  /** La suppression est-elle possible (migration 20261023 présente) ? */
  personnes: boolean;
  moteur: MoteurDepot | null;
  ajouter?: (() => void) | null;
  /** La place connue à l'ouverture (serveur) : nombre, `null` sans limite, `undefined` inconnue. */
  place: number | null | undefined;
  ongletInitial: Onglet;
  /** Le retour sur le même appareil (8A) : « Content de te revoir, Léa », une fois ; `surCeLien` : ses photos sur CE lien. */
  accueil: { prenom: string; surCeLien: number } | null;
  lectureSeule?: boolean;
  /** La collecte close (9C) : le chemin du retour vers la carte. */
  retour?: (() => void) | null;
};

/** `total` : combien en tout (« Mes photos », page 0), au-delà de la première page ; `null` sinon. */
type Liste = { photos: PhotoAlbum[]; suivante: number | null; charge: boolean; erreur: boolean; total: number | null };
const VIDE: Liste = { photos: [], suivante: null, charge: false, erreur: false, total: null };

function lireRepere(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function garderRepere(cle: string, v: string) {
  try {
    window.localStorage.setItem(cle, v);
  } catch {
    /* navigation privée : pas de « nouvelles » à la prochaine visite */
  }
}

export default function Album(props: Props) {
  const { tu } = props.tete;
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const vue = useMoteur(props.moteur);
  const apercus = useApercus(props.moteur);
  /* Le verre (`backdrop-filter`) sur une barre FIXE rame sur Chrome Android : un fond plein à la place (src/app/CLAUDE.md, piège 3). */
  const android = useAndroid();

  const [onglet, setOnglet] = useState<Onglet>(props.ongletInitial);
  const [album, setAlbum] = useState<Liste>(VIDE);
  const [miennes, setMiennes] = useState<Liste>(VIDE);
  const [compte, setCompte] = useState<{ photos: number; personnes: number | null } | null>(null);
  const [moiServeur, setMoiServeur] = useState<PageAlbum["moi"]>(null);
  /* Ce que le moteur avait confirmé au dernier chargement : le compte du serveur l'inclut déjà. */
  const [base, setBase] = useState(0);
  const [nouvelles, setNouvelles] = useState<Set<string>>(() => new Set());
  const [placeServeur, setPlaceServeur] = useState<{ valeur: number | null | undefined; le: number }>({ valeur: props.place, le: 0 });
  const [cocher, setCocher] = useState(false);
  const [cochees, setCochees] = useState<Set<string>>(() => new Set());
  const [feuille, setFeuille] = useState(false);
  const [suppression, setSuppression] = useState<{ enCours: boolean; erreur: string | null }>({ enCours: false, erreur: null });
  const [annonce, setAnnonce] = useState<{ titre: string; texte: string } | null>(null);
  /* Les photos supprimées d'ici : elles ne reviennent pas par l'envoi en cours (sa liste les garde). */
  const [retirees, setRetirees] = useState<Set<string>>(() => new Set());
  /* Le lien est mort (un 404) : toute la page le dit. */
  const [mort, setMort] = useState(false);
  /* Les photos des autres arrivées depuis la dernière lecture complète (la relecture de 45 s), la plus récente d'abord. */
  const [arriveesAutres, setArriveesAutres] = useState<PhotoAlbum[]>([]);
  /* Le lot dont le bilan ne se dit plus (une suppression d'ici l'a rendu faux). */
  const [bilanEfface, setBilanEfface] = useState<number | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  const bas = useRef<HTMLDivElement>(null);
  const premierChargement = useRef(true);

  const { token, p, moteur } = props;
  const accueilPrenom = props.accueil?.prenom ?? null;
  const accueilSurCeLien = props.accueil?.surCeLien ?? 0;
  const lienNom = props.tete.lien;
  /* Ce que la route a rendu, posé à l'écran (toujours APRÈS la réponse : jamais un setState dans le corps d'un effet). */
  const appliquer = useCallback(
    (quoi: Onglet, page: number, lecture: LectureAlbum, confirmeesAvant: number) => {
      const poser = quoi === "album" ? setAlbum : setMiennes;
      if (lecture.statut === "mort") {
        setMort(true);
        return;
      }
      if (lecture.statut !== "ok") {
        poser((l) => ({ ...l, charge: true, erreur: true }));
        return;
      }
      const lu: PageAlbum = lecture.page;
      poser((l) => ({
        photos: page === 0 ? lu.photos : [...l.photos, ...lu.photos.filter((x) => !l.photos.some((y) => y.id === x.id))],
        suivante: lu.suivante,
        charge: true,
        erreur: false,
        total: page === 0 ? lu.total : l.total,
      }));
      const placeLue = lu.moi ? (lu.moi.sansLimite ? null : lu.moi.place ?? undefined) : undefined;
      if (lu.moi) {
        setMoiServeur(lu.moi);
        setPlaceServeur({ valeur: placeLue, le: Date.now() });
      }
      if (quoi === "album" && page === 0) {
        setCompte(lu.album);
        setBase(confirmeesAvant);
        /* La relecture complète les contient : plus rien n'attend en tête. */
        setArriveesAutres([]);
        /* « Nouvelle » : arrivée depuis la dernière visite de ce lien sur cet appareil. */
        const cle = cleDeVisite(token, p);
        const neuves = nouvellesDepuis(lu.photos, lireRepere(cle));
        setNouvelles(neuves);
        const derniere = derniereArrivee(lu.photos);
        if (derniere) garderRepere(cle, derniere);
        if (premierChargement.current && accueilPrenom) {
          /* Ce qui est sur CE lien et ce qui reste (21/10), plus le total de l'édition. */
          setAnnonce({
            titre: tu ? `Content de te revoir, ${accueilPrenom}` : `Content de vous revoir, ${accueilPrenom}`,
            texte: [
              phraseRetour(accueilSurCeLien, placeLue, lienNom, tu),
              neuves.size ? `${neuves.size} nouvelle${neuves.size > 1 ? "s" : ""} dans l'album depuis ${tu ? "ta" : "votre"} visite.` : "",
            ]
              .filter(Boolean)
              .join(" "),
          });
        }
        premierChargement.current = false;
      }
    },
    [token, p, accueilPrenom, accueilSurCeLien, lienNom, tu]
  );

  const charger = useCallback(
    (quoi: Onglet, page: number): Promise<void> => {
      const confirmeesAvant = moteur?.vue().arrivees ?? 0;
      return lireAlbum(token, p, quoi, page).then((lu) => appliquer(quoi, page, lu, confirmeesAvant));
    },
    [token, p, moteur, appliquer]
  );

  /* « Tout l'album » sans recharger (21/10) : la page 0 toutes les 45 s onglet visible, et au retour
     sur l'onglet (au plus toutes les 20 s, `useSondage`). Le compte suit tout de suite ; les photos
     des autres arrivées depuis attendent en tête (`arriveesAutres`), montrées seulement quand rien ne
     part ni ne se coche. Un 404 : le lien est mort. */
  const repereSondage = useRef<{ depuis: string | null; tours: number }>({ depuis: null, tours: 0 });
  const sonder = useCallback(async (): Promise<void> => {
    const confirmeesAvant = moteur?.vue().arrivees ?? 0;
    /* Le serveur ne relit la page que si quelque chose est arrivé depuis (perf-1) ; un tour sur
       SONDAGES_AVANT_RELECTURE relit tout, pour le compte (une photo partie à la corbeille). */
    const r = repereSondage.current;
    r.tours = (r.tours + 1) % SONDAGES_AVANT_RELECTURE;
    const lecture = await lireAlbum(token, p, "album", 0, r.tours === 0 ? null : r.depuis);
    if (lecture.statut === "mort") {
      setMort(true);
      return;
    }
    if (lecture.statut !== "ok") return;
    const lu = lecture.page;
    setCompte(lu.album);
    setBase(confirmeesAvant);
    if (lu.moi) {
      setMoiServeur(lu.moi);
      setPlaceServeur({ valeur: lu.moi.sansLimite ? null : lu.moi.place ?? undefined, le: Date.now() });
    }
    const autres = lu.photos.filter((x) => !x.moi);
    /* Bornée à deux pages : la prochaine relecture complète (fin d'un envoi) les reprend toutes. */
    if (autres.length) setArriveesAutres((avant) => enTete(autres, avant).slice(0, 2 * TAILLE_PAGE_ALBUM));
    const derniere = derniereArrivee(lu.photos);
    r.depuis = derniere;
    if (derniere) garderRepere(cleDeVisite(token, p), derniere);
  }, [token, p, moteur]);
  useSondage(sonder, SONDAGE_ALBUM_MS, !mort);

  /* Les deux onglets se chargent ensemble : chacun porte son nombre. */
  useEffect(() => {
    void charger("album", 0);
    void charger("miennes", 0);
  }, [charger]);

  /* L'envoi vient de finir : le serveur a confirmé, on relit (le compte, les vignettes). */
  const enCoursAvant = useRef(vue.enCours);
  useEffect(() => {
    if (enCoursAvant.current > 0 && vue.enCours === 0) {
      void charger("album", 0);
      void charger("miennes", 0);
    }
    enCoursAvant.current = vue.enCours;
  }, [vue.enCours, charger]);

  /* L'annonce de retour s'efface seule. */
  useEffect(() => {
    if (!annonce) return;
    const t = setTimeout(() => setAnnonce(null), 6_000);
    return () => clearTimeout(t);
  }, [annonce]);

  /* La réserve sous la grille suit la barre du bas (elle grandit pendant l'envoi). */
  useEffect(() => {
    const b = bas.current;
    const r = racine.current;
    if (!b || !r || typeof ResizeObserver === "undefined") return;
    const poser = () => r.style.setProperty("--dp-bas-h", `${Math.ceil(b.getBoundingClientRect().height)}px`);
    poser();
    const o = new ResizeObserver(poser);
    o.observe(b);
    return () => o.disconnect();
  });

  /* ── les nombres ── */
  const nouvellesArrivees = Math.max(0, vue.arrivees + vue.auCoffre - base);
  /* « Déjà là » ne se montre pas ici : la liste du serveur la montre si elle est à moi (une photo
     d'une autre personne choisie sur cet appareil n'est pas « à moi »). La barre du bas dit où elle était. */
  const envoi = photosDeLEnvoi(apercus.filter((e) => e.etat !== "deja" && !(e.photoId && retirees.has(e.photoId))), miennes.photos);
  const nbMiennes =
    (miennes.suivante === null ? miennes.photos.length : Math.max(miennes.photos.length, miennes.total ?? 0)) +
    envoi.filter((e) => e.etat === "arrivee").length;
  const nbAlbum = (compte?.photos ?? album.photos.length) + nouvellesArrivees;
  /* Le DERNIER envoi (21/10) : sa barre, son merci, ses « déjà là ». Jamais le cumul de la page. */
  const lot = vue.lot;
  const bilan = bilanDuLot(lot);
  const prog = progression(lot);
  const enCours = vue.enCours > 0;
  const termine = lot.total > 0 && lot.enCours === 0 && lot.erreurs === 0;
  /* Reçues = ARRIVÉES par cet envoi : une « déjà là » n'est jamais comptée comme reçue. */
  const recues = bilan.recues;
  /* Une suppression d'ici rend faux le bilan de l'envoi précédent : il ne se dit plus. */
  const bilanVisible = lot.numero !== bilanEfface;
  const phrasesLot = bilanVisible ? phrasesDuLot(bilan, { tu }) : [];
  const ignores = phrasesIgnores(vue.ignores, vue.videos, vue.premiereVideo);
  /* Pendant un envoi ou pendant qu'on coche, la grille ne bouge pas : les photos arrivées des autres attendent. */
  const grilleFigee = enCours || cocher;
  const idsAlbum = new Set(album.photos.map((x) => x.id));
  const neuvesAutres = arriveesAutres.filter((x) => !idsAlbum.has(x.id));
  const photosAlbum = grilleFigee ? album.photos : enTete(neuvesAutres, album.photos);
  const arriveesVues = new Set(grilleFigee ? [] : neuvesAutres.map((x) => x.id));
  const autresAppareils = phraseAutresAppareils(moiServeur?.autresAppareils, tu);
  /* La place la plus récente : celle du moteur (dernière déclaration) ou celle du serveur (album, suppression). */
  const place = (vue.placeLe ?? 0) > placeServeur.le ? vue.place : placeServeur.valeur;
  const plein = typeof place === "number" && place <= 0;

  const peutSupprimer = props.personnes && !props.lectureSeule && Boolean(props.moteur);
  const supprimables = miennes.photos.filter((x) => x.supprimable);

  const basculer = (id: string) =>
    setCochees((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const finirCocher = () => {
    setCocher(false);
    setCochees(new Set());
    setFeuille(false);
    setSuppression({ enCours: false, erreur: null });
  };

  /* Ajouter : « Mes photos » s'ouvre, l'envoi s'y voit (planche 7B). */
  const ajouter = () => {
    setOnglet("miennes");
    finirCocher();
    props.ajouter?.();
  };

  const supprimer = async () => {
    const ids = [...cochees];
    if (!ids.length) return;
    setSuppression({ enCours: true, erreur: null });
    const r = await supprimerPhotos(props.token, props.p, ids);
    if (r.status === 404) {
      /* Le lien est mort pendant que la page était ouverte. */
      setMort(true);
      return;
    }
    if (r.status !== 200) {
      const message =
        typeof r.json.message === "string" && r.status !== 503
          ? r.json.message
          : r.status === 429
            ? v("Trop de demandes en même temps : rien n'a été supprimé. Réessayez dans une minute.", "Trop de demandes en même temps : rien n'a été supprimé. Réessaie dans une minute.")
            : r.status === 0
            ? v("Connexion interrompue : rien n'a été supprimé. Réessayez.", "Connexion interrompue : rien n'a été supprimé. Réessaie.")
            : v("La suppression n'a pas pu se faire. Rien n'a été supprimé.", "La suppression n'a pas pu se faire. Rien n'a été supprimé.");
      setSuppression({ enCours: false, erreur: message });
      return;
    }
    const parties = new Set(Array.isArray(r.json.ids) ? (r.json.ids as string[]) : []);
    setRetirees((avant) => new Set([...avant, ...parties]));
    /* Le moteur les oublie : choisies de nouveau, elles redemandent au serveur, qui les restaure. */
    props.moteur?.oublier(parties);
    /* Le merci et les « déjà là » de l'envoi précédent ne décrivent plus ce qui est là. */
    if (parties.size) setBilanEfface(lot.numero);
    const refusees = Array.isArray(r.json.refusees) ? r.json.refusees.length : 0;
    setMiennes((l) => ({ ...l, photos: l.photos.filter((x) => !parties.has(x.id)), total: l.total === null ? null : Math.max(0, l.total - parties.size) }));
    const dansAlbum = album.photos.filter((x) => parties.has(x.id)).length;
    setAlbum((l) => ({ ...l, photos: l.photos.filter((x) => !parties.has(x.id)) }));
    if (dansAlbum) setCompte((c) => (c ? { ...c, photos: Math.max(0, c.photos - dansAlbum) } : c));
    setMoiServeur((m) => (m ? { ...m, ceTelephone: m.ceTelephone === null ? null : Math.max(0, m.ceTelephone - parties.size), photos: m.photos === null ? null : Math.max(0, m.photos - parties.size) } : m));
    /* La place libérée, tout de suite (« tu peux encore en envoyer 39 »). */
    if (typeof r.json.place === "number" || r.json.place === null) setPlaceServeur({ valeur: r.json.place as number | null, le: Date.now() });
    finirCocher();
    setAnnonce({
      titre: `${parties.size} photo${parties.size > 1 ? "s" : ""} supprimée${parties.size > 1 ? "s" : ""}`,
      texte: refusees
        ? `${refusees} ${refusees > 1 ? "n'ont" : "n'a"} pas pu l'être.`
        : v(`L'organisateur peut encore les récupérer pendant ${DELAI_CORBEILLE_JOURS} jours.`, `L'organisateur peut encore les récupérer pendant ${DELAI_CORBEILLE_JOURS} jours.`),
    });
  };

  const lien = props.tete.lien;
  const titre = lien ?? props.tete.evenement;
  const marque = lien ? `${props.tete.organisation} · ${props.tete.evenement}` : props.tete.organisation;
  const listeCourante = onglet === "album" ? { ...album, photos: photosAlbum } : miennes;
  const nb = cochees.size;

  /* Un 404 (album, envoi, suppression) : le lien a été régénéré ou supprimé pendant que la page était
     ouverte. Toute la page le dit, avec le texte de la 404 du serveur. */
  if (mort || vue.lienMort) return <CarteLienMort />;

  return (
    <div className="ec-dp-al" ref={racine}>
      <header className="ec-dp-al-tete">
        <div className="ec-dp-al-marque">
          <b>Bellajour</b>
          <span>{marque}</span>
        </div>
        {props.retour ? (
          <button type="button" className="ec-dp-lien ec-dp-al-retour" onClick={props.retour}>
            Retour
          </button>
        ) : null}
        <h1 className="ec-dp-al-titre">{titre}</h1>
        <p className="ec-dp-al-compte">
          {compte === null
            ? " "
            : nbAlbum
              ? `${compte.personnes ? `${compte.personnes} personne${compte.personnes > 1 ? "s" : ""} · ` : ""}${nbAlbum} photo${nbAlbum > 1 ? "s" : ""}`
              : "Aucune photo pour l'instant"}
        </p>
        {props.qui ? (
          <div className="ec-dp-al-qui">
            <span className="ec-dp-moi">
              <i aria-hidden="true">{initiales(props.qui.prenom, props.qui.nom)}</i>
              {v("Vous envoyez en tant que", "Tu envoies en tant que")} <b>{props.qui.nom ? `${props.qui.prenom} ${props.qui.nom}` : props.qui.prenom}</b>
            </span>
            {props.pasMoi && !enCours && !props.lectureSeule ? (
              <button type="button" className="ec-dp-lien" onClick={props.pasMoi}>
                {v("Ce n'est pas vous ?", "Ce n'est pas toi ?")}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="ec-dp-al-onglets" role="tablist" aria-label="Les photos">
        <button
          type="button"
          role="tab"
          aria-selected={onglet === "album"}
          className={onglet === "album" ? "on" : ""}
          onClick={() => {
            setOnglet("album");
            finirCocher();
          }}
        >
          Tout l&apos;album{compte !== null ? ` · ${nbAlbum}` : ""}
        </button>
        <button type="button" role="tab" aria-selected={onglet === "miennes"} className={onglet === "miennes" ? "on" : ""} onClick={() => setOnglet("miennes")}>
          Mes photos{miennes.charge ? ` · ${nbMiennes}` : ""}
        </button>
      </div>

      {onglet === "miennes" && peutSupprimer && (supprimables.length > 0 || cocher) ? (
        <div className="ec-dp-al-mes">
          {cocher ? (
            <>
              <span>
                {nb} cochée{nb > 1 ? "s" : ""} sur {v("vos", "tes")} {supprimables.length} photo{supprimables.length > 1 ? "s" : ""}
              </span>
              <button type="button" className="ec-dp-lien" onClick={finirCocher}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <span>Envoyées depuis cet appareil</span>
              <button type="button" className="ec-dp-lien" onClick={() => setCocher(true)} disabled={enCours}>
                Supprimer des photos
              </button>
            </>
          )}
        </div>
      ) : null}
      {onglet === "miennes" && autresAppareils ? <p className="ec-dp-note ec-dp-al-autres">{autresAppareils}</p> : null}

      <div className="ec-dp-al-grille">
        {onglet === "miennes" && envoi.length ? (
          <ul className="ec-dp-g">
            {envoi.map((e) => (
              <li key={`envoi-${e.n}`} className={`ec-dp-t${e.etat === "refusee" || e.etat === "erreur" ? " ec-dp-t--refus" : ""}${e.apercu ? "" : " ec-dp-t--attente"}`}>
                {e.apercu ? <img src={e.apercu} alt="" decoding="async" /> : null}
                {e.etat === "envoi" || e.etat === "attente" ? (
                  <span className="ec-dp-t-envoi" aria-hidden="true">
                    <span className="ec-dp-anneau" style={{ ["--p" as string]: `${Math.round(e.progres * 100)}%` }} />
                  </span>
                ) : e.etat === "arrivee" ? (
                  <span className="ec-dp-t-arrivee" aria-label="Arrivée">
                    <IcoCoche taille={12} />
                  </span>
                ) : (
                  <span className="ec-dp-t-arrivee ec-dp-t-arrivee--refus" title={e.raison ?? undefined} aria-label={e.raison ?? "Pas partie"}>
                    <IcoAttention taille={12} />
                  </span>
                )}
                {props.qui ? <span className="ec-dp-t-qui">{props.qui.prenom}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {!listeCourante.charge ? (
          <ul className="ec-dp-g" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="ec-dp-t ec-dp-t--attente" />
            ))}
          </ul>
        ) : listeCourante.erreur && !listeCourante.photos.length ? (
          <div className="ec-dp-al-vide">
            <p>{v("L'album ne se charge pas pour l'instant.", "L'album ne se charge pas pour l'instant.")}</p>
            <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" onClick={() => void charger(onglet, 0)}>
              Réessayer
            </button>
          </div>
        ) : listeCourante.photos.length ? (
          <ul className="ec-dp-g">
            {listeCourante.photos.map((x) => {
              const cochable = cocher && onglet === "miennes" && x.supprimable;
              const cochee = cochable && cochees.has(x.id);
              const neuve = onglet === "album" && (nouvelles.has(x.id) || arriveesVues.has(x.id));
              return (
                <li key={x.id} className={`ec-dp-t${cochee ? " ec-dp-t--cochee" : ""}${neuve ? " ec-dp-t--neuve" : ""}${x.vignette ? "" : " ec-dp-t--prep"}`}>
                  {x.vignette ? <img src={x.vignette} alt="" loading="lazy" decoding="async" /> : <span className="ec-dp-t-prep">En préparation</span>}
                  {cochable ? (
                    <button
                      type="button"
                      className={`ec-dp-t-coche${cochee ? " on" : ""}`}
                      aria-pressed={cochee}
                      aria-label={cochee ? "Décocher cette photo" : "Cocher cette photo"}
                      onClick={() => basculer(x.id)}
                    >
                      <span>
                        <IcoCoche taille={13} />
                      </span>
                    </button>
                  ) : null}
                  {neuve ? <span className="ec-dp-t-neuve">nouvelle</span> : null}
                  <span className="ec-dp-t-qui">{x.prenom}</span>
                </li>
              );
            })}
          </ul>
        ) : !(onglet === "miennes" && envoi.length) ? (
          <div className="ec-dp-al-vide">
            {onglet === "album" ? (
              <>
                <p className="ec-dp-al-vide-titre">L&apos;album est vide pour l&apos;instant.</p>
                <p>
                  {lien
                    ? `Les photos envoyées par « ${lien} » s'afficheront ici, avec le prénom de chacun.`
                    : "Les photos envoyées par ce lien s'afficheront ici, avec le prénom de chacun."}
                </p>
              </>
            ) : (
              <p>{v("Aucune photo envoyée depuis cet appareil pour l'instant.", "Aucune photo envoyée depuis cet appareil pour l'instant.")}</p>
            )}
          </div>
        ) : null}

        {listeCourante.suivante !== null && listeCourante.photos.length ? (
          <button type="button" className="ec-dp-bouton ec-dp-bouton--clair ec-dp-al-plus" onClick={() => void charger(onglet, listeCourante.suivante as number)}>
            Voir plus
          </button>
        ) : null}
      </div>

      {annonce ? (
        <div className="ec-dp-annonce" role="status">
          {props.qui ? <span className="ec-dp-annonce-ini">{initiales(props.qui.prenom, props.qui.nom)}</span> : null}
          <span>
            <b>{annonce.titre}</b>
            {annonce.texte ? <span>{annonce.texte}</span> : null}
          </span>
        </div>
      ) : null}

      {props.lectureSeule ? null : (
        <div className={`ec-dp-bas${android ? " ec-dp-bas--plat" : ""}`} ref={bas}>
          {cocher ? (
            <div className="ec-dp-bas-in">
              <button type="button" className="ec-dp-bouton ec-dp-bouton--danger" disabled={!nb} onClick={() => setFeuille(true)}>
                <IcoCorbeille />
                {nb ? `Supprimer ${nb > 1 ? `les ${nb} photos` : "cette photo"}` : v("Cochez les photos à supprimer", "Coche les photos à supprimer")}
              </button>
            </div>
          ) : (
            <div className="ec-dp-bas-in" role="status" aria-live="polite">
              {enCours ? (
                <>
                  <div className="ec-dp-progres-l">
                    <b>
                      {prog.envoyees} <small>sur {prog.total} envoyée{prog.total > 1 ? "s" : ""}</small>
                    </b>
                    <span>
                      il en reste {prog.restent}
                    </span>
                  </div>
                  <div className="ec-dp-jauge" aria-hidden="true">
                    <i style={{ width: `${prog.part}%` }} />
                  </div>
                  <p className="ec-dp-note">
                    {v(
                      "Gardez cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées.",
                      "Garde cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées."
                    )}
                  </p>
                </>
              ) : termine && recues > 0 && bilanVisible ? (
                <div className="ec-dp-merci">
                  <b>
                    Merci{props.qui ? ` ${props.qui.prenom}` : ""}, {recues} photo{recues > 1 ? "s" : ""} reçue{recues > 1 ? "s" : ""}.
                  </b>
                  <span>
                    {recues > 1
                      ? lien
                        ? `Elles sont dans l'album de ${lien}.`
                        : "Elles sont dans l'album."
                      : lien
                        ? `Elle est dans l'album de ${lien}.`
                        : "Elle est dans l'album."}
                  </span>
                </div>
              ) : null}
              {/* Ce qui était déjà là, par cas, dès que le serveur l'a dit (pendant l'envoi aussi). */}
              {phrasesLot.map((t) => (
                <p key={t} className="ec-dp-note">
                  {t}
                </p>
              ))}
              {!enCours && vue.erreurs ? (
                <p className="ec-dp-note ec-dp-note--refus">
                  {vue.erreurs} photo{vue.erreurs > 1 ? "s" : ""} n&apos;{vue.erreurs > 1 ? "ont" : "a"} pas pu partir.
                </p>
              ) : null}
              {bilanVisible && lot.refusees ? (
                <p className="ec-dp-note">
                  {lot.refusees} photo{lot.refusees > 1 ? "s" : ""} refusée{lot.refusees > 1 ? "s" : ""} :
                </p>
              ) : null}
              {(bilanVisible ? lot.raisons : []).map((r) => (
                <p key={r} className="ec-dp-note ec-dp-note--refus">
                  {r}
                </p>
              ))}
              {vue.horsLigne ? <p className="ec-dp-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
              {vue.serveurLent ? <p className="ec-dp-note">Le serveur répond lentement : l&apos;envoi reprend tout seul.</p> : null}
              {vue.reseauBloque ? (
                <>
                  <p className="ec-dp-note ec-dp-note--refus">{vue.reseauBloque}</p>
                  <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" onClick={() => props.moteur?.reessayer()}>
                    Réessayer
                  </button>
                </>
              ) : null}
              {/* Les vidéos écartées se disent pendant l'envoi (planche 7B) ; le merci (7C) ne les redit pas. */}
              {(enCours || !termine ? ignores : []).map((t) => (
                <p key={t} className="ec-dp-note ec-dp-note--refus">
                  {t}
                </p>
              ))}
              {vue.ferme ? (
                <p className="ec-dp-note ec-dp-note--refus">{vue.ferme}</p>
              ) : enCours ? (
                props.ajouter ? (
                  <button type="button" className="ec-dp-lien ec-dp-bas-ajout" onClick={ajouter}>
                    Ajouter d&apos;autres photos
                  </button>
                ) : null
              ) : (
                <>
                  {vue.erreurs ? (
                    <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" onClick={() => props.moteur?.reessayer()}>
                      Réessayer ({vue.erreurs})
                    </button>
                  ) : null}
                  {props.ajouter ? (
                    <button type="button" className="ec-dp-bouton" onClick={ajouter} disabled={plein}>
                      <IcoPlus />
                      Ajouter des photos
                    </button>
                  ) : null}
                  <p className="ec-dp-reste">
                    {[PHOTOS_SEULEMENT.split(" : ")[0], phrasePlace(place, tu)].filter(Boolean).join(" · ")}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {feuille ? (
        <div className="ec-dp-voile" onClick={() => (suppression.enCours ? null : setFeuille(false))}>
          <div className="ec-dp-feuille" role="dialog" aria-modal="true" aria-labelledby="ec-dp-feuille-titre" onClick={(e) => e.stopPropagation()}>
            <span className="ec-dp-poignee" aria-hidden="true" />
            <h2 id="ec-dp-feuille-titre" className="ec-dp-feuille-titre">
              {nb > 1 ? `Supprimer ${nb} photos ?` : "Supprimer cette photo ?"}
            </h2>
            <p className="ec-dp-texte">
              {`${nb > 1 ? "Elles disparaissent" : "Elle disparaît"} de l'album${lien ? ` de ${lien}` : ""} et ${nb > 1 ? "ne vont pas" : "ne va pas"} dans le magazine. L'organisateur peut encore ${nb > 1 ? "les" : "la"} récupérer pendant ${DELAI_CORBEILLE_JOURS} jours.`}
            </p>
            {suppression.erreur ? <p className="ec-dp-note ec-dp-note--refus">{suppression.erreur}</p> : null}
            <button type="button" className="ec-dp-bouton ec-dp-bouton--plein-danger" disabled={suppression.enCours} onClick={() => void supprimer()}>
              <IcoCorbeille />
              {suppression.enCours ? "Suppression…" : nb > 1 ? `Supprimer les ${nb} photos` : "Supprimer la photo"}
            </button>
            <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" disabled={suppression.enCours} onClick={() => setFeuille(false)}>
              Garder
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
