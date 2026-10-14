"use client";

/* Le bon à tirer en plein écran (PRD §6.2, révision §14.4, maquette BAT).

   UN écran, rien ne défile : l'en-tête (tours, Avant / Après, échéance,
   « Valider ce magazine »), une ligne d'information, la double page à la
   taille de la scène, la bande des pages, et les magazines en onglets SOUS
   la bande. Les notes vivent dans un panneau à droite qui se replie et se
   rouvre par l'onglet vertical « Notes · n » ; cliquer sur la page pose une
   épingle et ouvre la nouvelle note DANS ce panneau, « Annuler / Ajouter la
   note » toujours visibles. La vignette « Couverture » montre les
   propositions dans la scène, pas dans une autre page.

   Les pages sont des IMAGES rendues par l'atelier depuis son PDF (le PDF ne
   sort jamais du coffre). Zones et épingles sont en % de la page : elles se
   dessinent à n'importe quelle taille. Les pages gardent leurs vraies
   couleurs de jour comme de nuit.

   Fluidité (PRD §6.3) : rien ne recharge le document entre deux pages ; les
   doubles pages voisines (± 2) se préchargent ; une note s'affiche AVANT la
   réponse du serveur et revient dans le panneau, avec une phrase, si
   l'écriture échoue. Le numéro d'une note est son rang dans le magazine,
   tours confondus : la note 4 reste la note 4 au tour suivant. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { doublesPages, etatNote, libelleBande, libelleDouble, rappelValidation, resumeNote, resumeTour, type Zone } from "@/lib/collectif/bat";
import { TYPES_NOTE } from "@/lib/collectif/types";
import { EnTeteEcran } from "../../_composants/Ecran";
import Fenetre from "../../_composants/Fenetre";
import type { Bat, MagazineBat, NoteBat, TourBat } from "../donnees";
import "./bat.css";

type Props = {
  token: string;
  bat: Bat;
  /** Le responsable, pendant l'étape « bon à tirer ». */
  ecrire: boolean;
  /** Le lien d'équipe : tout voir, rien modifier. */
  lectureSeule: boolean;
  tirage: number | null;
  responsable: string | null;
  tu: boolean;
};

type Brouillon = {
  id: string | null;
  page_index: number | null;
  x: number | null;
  y: number | null;
  type: string;
  contenu: Record<string, string>;
  erreur: string | null;
};

type PhotoChoix = { id: string; vignette: string | null };
type Filtre = "a_traiter" | "resolues";

/* Un téléphone lit page par page ; un écran large, double page par double page. */
const REQUETE_ETROIT = "(max-width: 760px)";
function abonnerEtroit(rappel: () => void) {
  const m = window.matchMedia(REQUETE_ETROIT);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
}
/* Sur téléphone (la coquille passe en tiroir), les notes sont une feuille du
   bas : fermée tant qu'on ne l'ouvre pas, la page d'abord. */
const REQUETE_TELEPHONE = "(max-width: 860px)";
function abonnerTelephone(rappel: () => void) {
  const m = window.matchMedia(REQUETE_TELEPHONE);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
}

const LIBELLE_ETAT = { brouillon: "Pas encore envoyée", a_traiter: "À traiter", resolue: "Résolue", retiree: "Retirée" } as const;

async function appeler(corps: Record<string, unknown>): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const rep = await fetch("/api/collectif/bat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
    });
    const json = (await rep.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: rep.ok, json: rep.ok ? json : { ...json, message: json.message ?? `Non enregistré (erreur ${rep.status}).` } };
  } catch {
    return { ok: false, json: { message: "Le réseau n'a pas répondu. Rien n'a changé." } };
  }
}

export default function Liseuse(p: Props) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const { magazines, tours } = p.bat;
  const magazine = p.bat.magazine as MagazineBat;
  const courant = tours[tours.length - 1] ?? null;

  const [tourId, setTourId] = useState<string | null>(courant?.id ?? null);
  const [vue, setVue] = useState<"apres" | "avant">("apres");
  /* -1 = la couverture (les propositions dans la scène), sinon l'index de la double page. */
  const [iDouble, setIDouble] = useState(0);
  const [interieurs, setInterieurs] = useState(false);
  const [notes, setNotes] = useState<NoteBat[]>(p.bat.notes);
  const [filtre, setFiltre] = useState<Filtre>("a_traiter");
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  /* `null` = le réglage par défaut : ouvert sur ordinateur, fermé sur téléphone. */
  const [panneauChoisi, setPanneau] = useState<boolean | null>(null);
  const [choix, setChoix] = useState({ id: magazine.couverture_choisie_id, sans: magazine.couverture_sans_preference });
  const [noteCouv, setNoteCouv] = useState(magazine.couverture_note ?? "");
  const [valideLe, setValideLe] = useState<string | null>(magazine.bat_valide_le ? magazine.valideTexte || "ce jour" : null);
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [photos, setPhotos] = useState<{ liste: PhotoChoix[]; suivante: number | null; ouvert: boolean; charge: boolean }>({ liste: [], suivante: 0, ouvert: false, charge: false });
  const [photoChoisie, setPhotoChoisie] = useState<PhotoChoix | null>(null);
  const bande = useRef<HTMLDivElement>(null);

  const etroit = useSyncExternalStore(abonnerEtroit, () => window.matchMedia(REQUETE_ETROIT).matches, () => false);
  const telephone = useSyncExternalStore(abonnerTelephone, () => window.matchMedia(REQUETE_TELEPHONE).matches, () => false);
  const panneau = panneauChoisi ?? !telephone;

  const tour: TourBat | null = tours.find((t) => t.id === tourId) ?? courant;
  const estCourant = Boolean(tour && courant && tour.id === courant.id);
  const precedent = tour ? tours.filter((t) => t.numero < tour.numero).sort((a, b) => b.numero - a.numero)[0] ?? null : null;
  const modifiable = p.ecrire && estCourant && !valideLe;
  const avant = vue === "avant" && precedent !== null && estCourant;
  const doubles = useMemo(() => {
    const n = tour?.pages.length ?? 0;
    return etroit ? Array.from({ length: n }, (_, i) => [i]) : doublesPages(n);
  }, [tour, etroit]);
  const enCouverture = iDouble < 0;
  const i = Math.min(Math.max(iDouble, 0), Math.max(0, doubles.length - 1));
  const visibles = doubles[i] ?? [];
  const resume = tour ? resumeTour(tour.pages, precedent ? precedent.pages.length : null) : null;

  /* Les numéros : le rang de la note dans le magazine, tours confondus. */
  const numero = useMemo(() => {
    const m = new Map<string, number>();
    [...notes].sort((a, b) => a.created_at.localeCompare(b.created_at)).forEach((n, k) => m.set(n.id, k + 1));
    return m;
  }, [notes]);
  const numeroTour = (id: string) => tours.find((t) => t.id === id)?.numero ?? 0;
  const notesDuTour = notes.filter((n) => n.tour_id === tour?.id);
  const notesListees = estCourant
    ? notes.filter((n) => n.tour_id === tour?.id || (n.envoyee_le && numeroTour(n.tour_id) < (tour?.numero ?? 0)))
    : notesDuTour;
  const aTraiter = (n: NoteBat) => etatNote(n) === "brouillon" || etatNote(n) === "a_traiter";
  const nbATraiter = notesListees.filter(aTraiter).length;
  const nbResolues = notesListees.filter((n) => etatNote(n) === "resolue").length;
  const filtrees = notesListees.filter((n) => (filtre === "a_traiter" ? aTraiter(n) : etatNote(n) === "resolue"));
  const brouillons = notesDuTour.filter((n) => etatNote(n) === "brouillon");
  const couvChoisie = p.bat.couvertures.find((c) => c.id === choix.id) ?? null;
  const couvInterieur = couvChoisie ?? p.bat.couvertures[0] ?? null;

  /* Précharger les doubles pages voisines (± 2) : changer de page est immédiat. */
  useEffect(() => {
    if (!tour) return;
    for (let k = i - 2; k <= i + 2; k++) {
      for (const idx of doubles[k] ?? []) {
        const url = tour.pages[idx]?.url;
        if (url) new Image().src = url;
      }
    }
  }, [i, doubles, tour]);

  /* La vignette active reste visible dans la bande. */
  useEffect(() => {
    bande.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [iDouble, tourId]);

  /* Le clavier : flèches pour tourner, Échap pour annuler une note. */
  const nbDoubles = doubles.length;
  useEffect(() => {
    function touche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "Escape") setBrouillon(null);
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setBrouillon(null);
        setIDouble((k) => Math.max(-1, Math.min(nbDoubles - 1, k + (e.key === "ArrowRight" ? 1 : -1))));
      }
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [nbDoubles]);

  function aller(k: number) {
    setBrouillon(null);
    setInterieurs(false);
    setIDouble(Math.max(-1, Math.min(doubles.length - 1, k)));
  }

  function changerTour(id: string) {
    setTourId(id);
    setVue("apres");
    setIDouble(0);
    setBrouillon(null);
  }

  /* ─────────────────────────── poser une note ─────────────────────────── */

  function cliquerPage(e: MouseEvent<HTMLDivElement>, index: number) {
    if (!modifiable || avant) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 10000) / 100;
    const y = Math.round(((e.clientY - r.top) / r.height) * 10000) / 100;
    setPhotoChoisie(null);
    setPanneau(true);
    setBrouillon({ id: null, page_index: index, x, y, type: "texte", contenu: {}, erreur: null });
  }

  function noteGenerale() {
    setPhotoChoisie(null);
    setPanneau(true);
    setBrouillon({ id: null, page_index: null, x: null, y: null, type: "idee", contenu: {}, erreur: null });
  }

  function modifierBrouillon(n: NoteBat) {
    setPhotoChoisie(null);
    setBrouillon({ id: n.id, page_index: n.page_index, x: n.x_pct, y: n.y_pct, type: n.type, contenu: { ...n.contenu }, erreur: null });
  }

  function champ(cle: string, valeur: string) {
    setBrouillon((b) => (b ? { ...b, contenu: { ...b.contenu, [cle]: valeur }, erreur: null } : b));
  }

  async function enregistrer(b: Brouillon) {
    if (!tour) return;
    const corps = { page_index: b.page_index, x_pct: b.x, y_pct: b.y, type: b.type, contenu: b.contenu };
    const temporaire = `tmp-${Date.now()}`;
    const avantEdition = b.id ? notes.find((n) => n.id === b.id) ?? null : null;
    const optimiste: NoteBat = {
      id: b.id ?? temporaire,
      tour_id: tour.id,
      page_index: b.page_index,
      x_pct: b.x,
      y_pct: b.y,
      type: b.type,
      contenu: b.contenu,
      envoyee_le: null,
      resolue_le: null,
      retiree_le: null,
      reponse_atelier: null,
      created_at: avantEdition?.created_at ?? new Date().toISOString(),
    };
    setNotes((l) => (b.id ? l.map((n) => (n.id === b.id ? optimiste : n)) : [...l, optimiste]));
    setBrouillon(null);
    setFiltre("a_traiter");
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "noter", tourId: tour.id, noteId: b.id, ...corps });
    if (r.ok && r.json.note) {
      const serveur = r.json.note as NoteBat;
      const propre: NoteBat = { ...optimiste, id: serveur.id, created_at: serveur.created_at };
      setNotes((l) => l.map((n) => (n.id === optimiste.id ? propre : n)));
      return;
    }
    /* Échec : la note revient dans le panneau, rien n'est perdu. */
    setNotes((l) => (b.id && avantEdition ? l.map((n) => (n.id === b.id ? avantEdition : n)) : l.filter((n) => n.id !== temporaire)));
    setBrouillon({ ...b, erreur: String(r.json.message ?? "Non enregistrée.") });
  }

  async function retirer(n: NoteBat) {
    setNotes((l) => l.filter((x) => x.id !== n.id));
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "retirer", noteId: n.id });
    if (!r.ok) {
      setNotes((l) => [...l, n]);
      setMessage({ texte: String(r.json.message), erreur: true });
    }
  }

  async function basculer(n: NoteBat) {
    const resoudre = etatNote(n) !== "resolue";
    const iso = new Date().toISOString();
    setNotes((l) => l.map((x) => (x.id === n.id ? { ...x, resolue_le: resoudre ? iso : null } : x)));
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: resoudre ? "resoudre" : "rouvrir", noteId: n.id });
    if (!r.ok) {
      setNotes((l) => l.map((x) => (x.id === n.id ? n : x)));
      setMessage({ texte: String(r.json.message), erreur: true });
    }
  }

  async function envoyer() {
    if (!tour) return;
    setOccupe(true);
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "envoyer", tourId: tour.id });
    setOccupe(false);
    if (!r.ok) return setMessage({ texte: String(r.json.message), erreur: true });
    const iso = String(r.json.envoyee_le);
    setNotes((l) => l.map((n) => (n.tour_id === tour.id && !n.envoyee_le ? { ...n, envoyee_le: iso } : n)));
    setMessage({ texte: `${String(r.json.n)} note(s) envoyée(s) à l'atelier.`, erreur: false });
  }

  async function choisirCouverture(corps: { couvertureId?: string; sans_preference?: boolean }) {
    const avantChoix = choix;
    setChoix({ id: corps.couvertureId ?? null, sans: corps.sans_preference === true });
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "couverture", ...corps });
    if (!r.ok) {
      setChoix(avantChoix);
      setMessage({ texte: String(r.json.message), erreur: true });
    }
  }

  async function enregistrerNoteCouv() {
    setOccupe(true);
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "couverture_note", note: noteCouv });
    setOccupe(false);
    setMessage(r.ok ? { texte: "Note sur la couverture enregistrée.", erreur: false } : { texte: String(r.json.message), erreur: true });
  }

  async function valider() {
    setOccupe(true);
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "valider" });
    setOccupe(false);
    if (!r.ok) return setMessage({ texte: String(r.json.message), erreur: true });
    setConfirmer(false);
    setValideLe("à l'instant");
    setMessage({ texte: "Bon à tirer validé. Merci : l'atelier prend le relais.", erreur: false });
    router.refresh();
  }

  function ouvrirPhotos() {
    setPhotos((x) => ({ ...x, ouvert: true }));
    if (photos.liste.length === 0) void chargerPhotos();
  }

  async function chargerPhotos() {
    if (photos.suivante === null || photos.charge) return;
    setPhotos((x) => ({ ...x, ouvert: true, charge: true }));
    try {
      const rep = await fetch("/api/collectif/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, page: photos.suivante }),
      });
      const json = (await rep.json()) as { photos?: PhotoChoix[]; suivante?: number | null };
      setPhotos((x) => ({ liste: [...x.liste, ...(json.photos ?? [])], suivante: json.suivante ?? null, ouvert: true, charge: false }));
    } catch {
      setPhotos((x) => ({ ...x, charge: false }));
    }
  }

  /* ─────────────────────────── l'affichage ─────────────────────────── */

  const onglets = <OngletsMagazines token={p.token} magazines={magazines} rang={magazine.rang} />;

  if (!tour || !courant) {
    return (
      <section className="ec-ecran ec-bat2">
        <EnTeteEcran titre="Bon à tirer" sous={`Magazine ${magazine.rang} · ${magazine.nom}`} />
        <div className="ec-ecran-corps ec-ecran-corps--centre">
          <p className="ec-verrou">{v("L'atelier compose ce magazine. Son premier bon à tirer s'affichera ici.", "L'atelier compose ce magazine. Son premier bon à tirer s'affichera ici.")}</p>
        </div>
        {onglets}
      </section>
    );
  }

  const suivantTour = tours.find((t) => t.numero > tour.numero);
  const zonesIci = avant || enCouverture ? 0 : visibles.reduce((n, idx) => n + (tour.pages[idx]?.zones.length ?? 0), 0);
  const nouvelleIci = !avant && !enCouverture && precedent !== null && visibles.some((idx) => tour.pages[idx]?.apparie_a === null);
  const actionIci = modifiable ? v("cliquez sur la page pour noter", "clique sur la page pour noter") : "";

  /* UNE ligne d'information, selon l'état (révision §14.4). */
  const ligneBrute = enCouverture
    ? modifiable
      ? v("Cliquez sur celle que vous préférez · changement possible jusqu'à la validation", "Clique sur celle que tu préfères · changement possible jusqu'à la validation")
      : "Les propositions de couverture"
    : valideLe
      ? `Bon à tirer validé ${valideLe === "à l'instant" ? "à l'instant" : `le ${valideLe}`} · il ne change plus`
      : !estCourant
        ? `Tour archivé${suivantTour ? `, remplacé par le tour ${suivantTour.numero} le ${suivantTour.publieTexte}` : ""} · lecture seule`
        : avant
          ? `Version du tour ${precedent?.numero} · les zones en pointillé ont changé`
          : p.lectureSeule
            ? v("Lecture seule : vous voyez tout, sans rien modifier", "Lecture seule : tu vois tout, sans rien modifier")
            : [
                zonesIci ? `${zonesIci} zone${zonesIci > 1 ? "s" : ""} modifiée${zonesIci > 1 ? "s" : ""} ici` : null,
                nouvelleIci ? "nouvelle page" : null,
                !zonesIci && !nouvelleIci && precedent && resume
                  ? `${resume.modifiees === 0 ? "Aucune page modifiée" : `${resume.modifiees} page${resume.modifiees > 1 ? "s" : ""} modifiée${resume.modifiees > 1 ? "s" : ""}`} depuis le tour ${precedent.numero}${resume.retirees.length ? `, ${resume.retirees.length} retirée${resume.retirees.length > 1 ? "s" : ""}` : ""}`
                  : null,
                actionIci,
              ]
                .filter(Boolean)
                .join(" · ") || "Bon à tirer";
  const ligne = ligneBrute.charAt(0).toUpperCase() + ligneBrute.slice(1);

  const rappel = rappelValidation(p.tirage, tour.numero, { sansPreference: choix.sans, rang: couvChoisie?.rang ?? null });

  const feuille = (idx: number) => {
    const page = tour.pages[idx];
    const ancienne = avant && page ? (page.apparie_a !== null ? precedent?.pages[page.apparie_a] ?? null : null) : null;
    const url = avant ? ancienne?.url ?? null : page?.url ?? null;
    const zones: Zone[] = page && page.apparie_a !== null && precedent && estCourant ? page.zones : [];
    const epingles = avant ? [] : notesDuTour.filter((n) => n.page_index === idx && n.x_pct !== null && n.y_pct !== null);
    return (
      <div
        key={idx}
        className={`ec-bat-feuille${modifiable && !avant ? " ec-bat-feuille--note" : ""}`}
        onClick={(e) => cliquerPage(e, idx)}
        role={modifiable && !avant ? "button" : undefined}
        aria-label={modifiable && !avant ? `Poser une note sur la page ${idx + 1}` : undefined}
      >
        {url ? (
          <img src={url} alt={`Page ${idx + 1}${avant ? ` (tour ${precedent?.numero})` : ""}`} decoding="async" draggable={false} />
        ) : (
          <span className="ec-bat-sans-image">{avant ? `Nouvelle page au tour ${tour.numero}` : "Image indisponible"}</span>
        )}
        {zones.map((z, k) => (
          <span key={k} className={avant ? "ec-bat-zone ec-bat-zone--avant" : "ec-bat-zone"} style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.l}%`, height: `${z.h}%` }} />
        ))}
        {epingles.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`ec-bat-epingle ec-bat-epingle--${etatNote(n)}`}
            style={{ left: `${n.x_pct}%`, top: `${n.y_pct}%` }}
            aria-label={`Note ${numero.get(n.id)}, ${LIBELLE_ETAT[etatNote(n)].toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation();
              setPanneau(true);
              setBrouillon(null);
              setFiltre(etatNote(n) === "resolue" ? "resolues" : "a_traiter");
              setTimeout(() => document.getElementById(`ec-note-${n.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
            }}
          >
            {numero.get(n.id)}
          </button>
        ))}
        {brouillon && brouillon.page_index === idx && !brouillon.id && brouillon.x !== null && brouillon.y !== null ? (
          <span className="ec-bat-epingle ec-bat-epingle--nouvelle" style={{ left: `${brouillon.x}%`, top: `${brouillon.y}%` }} aria-hidden="true">
            {notes.length + 1}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <section className={`ec-ecran ec-bat2${panneau ? "" : " ec-bat2--replie"}`}>
      <EnTeteEcran titre="Bon à tirer">
        <div className="ec-bat-segments" role="group" aria-label="Tours">
          {tours.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === tour.id} onClick={() => changerTour(t.id)}>
              Tour {t.numero}
              {t.id === courant.id && !valideLe ? " · en cours" : ""}
            </button>
          ))}
        </div>
        {precedent && estCourant ? (
          <div className="ec-bat-segments" role="group" aria-label="Avant ou après">
            <button type="button" aria-pressed={avant} onClick={() => setVue("avant")}>
              Avant
            </button>
            <button type="button" aria-pressed={!avant} onClick={() => setVue("apres")}>
              Après
            </button>
          </div>
        ) : null}
        {estCourant && tour.echeanceTexte && !valideLe ? <span className="ec-ecran-sous">Retours avant le {tour.echeanceTexte}</span> : null}
        {valideLe ? (
          <span className="ec-pilule">Validé {valideLe === "à l'instant" ? "à l'instant" : `le ${valideLe}`}</span>
        ) : p.ecrire && estCourant ? (
          <button type="button" className="ec-bouton ec-bouton--petit ec-bat-valider" onClick={() => setConfirmer(true)}>
            Valider ce magazine
          </button>
        ) : null}
      </EnTeteEcran>

      <div className="ec-bat-corps">
        <div className="ec-bat-gauche">
          <div className="ec-bat-info">
            <button type="button" className="ec-bat-rond" aria-label={etroit ? "Page précédente" : "Pages précédentes"} disabled={iDouble <= -1} onClick={() => aller(iDouble - 1)}>
              ‹
            </button>
            <strong className="ec-bat-info-titre">
              {enCouverture ? "La couverture" : libelleDouble(visibles)} {enCouverture ? null : <span className="ec-bat-gris">sur {tour.pages.length}</span>}
            </strong>
            <button type="button" className="ec-bat-rond" aria-label={etroit ? "Page suivante" : "Pages suivantes"} disabled={iDouble >= doubles.length - 1} onClick={() => aller(iDouble + 1)}>
              ›
            </button>
            <span className="ec-bat-info-ligne">{ligne}</span>
          </div>

          <div className="ec-bat-scene">
            {enCouverture ? (
              <SceneCouverture
                couvertures={p.bat.couvertures}
                choixId={choix.id}
                sans={choix.sans}
                modifiable={modifiable}
                interieurs={interieurs}
                couvInterieur={couvInterieur}
                noteCouv={noteCouv}
                setNoteCouv={setNoteCouv}
                occupe={occupe}
                onChoisir={(id) => choisirCouverture({ couvertureId: id })}
                onSans={() => choisirCouverture({ sans_preference: true })}
                onInterieurs={() => setInterieurs((x) => !x)}
                onNote={enregistrerNoteCouv}
                tu={p.tu}
              />
            ) : (
              <div className={`ec-bat-double${visibles.length === 1 && !etroit ? (visibles[0] === 0 ? " ec-bat-double--droite" : " ec-bat-double--gauche") : ""}`}>{visibles.map(feuille)}</div>
            )}
          </div>

          <div className="ec-bat-bande" ref={bande} aria-label="Les pages">
            <button type="button" className="ec-bat-vignette" aria-current={enCouverture ? "true" : undefined} onClick={() => aller(-1)}>
              <span className="ec-bat-vignette-couv">{couvChoisie?.c1 ? <img src={couvChoisie.c1} alt="" loading="lazy" /> : null}</span>
              <span>Couverture</span>
            </button>
            {doubles.map((d, k) => {
              const modif = estCourant && d.some((idx) => (tour.pages[idx]?.zones.length ?? 0) > 0 || (precedent && tour.pages[idx]?.apparie_a === null));
              return (
                <button key={k} type="button" className="ec-bat-vignette" aria-current={!enCouverture && k === i ? "true" : undefined} onClick={() => aller(k)}>
                  <span className={d.length === 1 ? "ec-bat-vignette-pages ec-bat-vignette-pages--seule" : "ec-bat-vignette-pages"}>
                    {d.map((idx) => {
                      const src = tour.pages[idx]?.vignette ?? null;
                      return src ? <img key={idx} src={src} alt="" loading="lazy" /> : <span key={idx} />;
                    })}
                    {modif ? <span className="ec-bat-vignette-point" aria-label="modifiée" /> : null}
                  </span>
                  <span>{libelleBande(d)}</span>
                </button>
              );
            })}
          </div>

          {onglets}
        </div>

        <button
          type="button"
          className="ec-bat-onglet-notes"
          aria-pressed={panneau}
          aria-controls="ec-bat-panneau"
          title={panneau ? "Replier les notes" : "Ouvrir les notes"}
          onClick={() => {
            setPanneau(!panneau);
            setBrouillon(null);
          }}
        >
          <span className="ec-bat-onglet-fleche" aria-hidden="true">
            {panneau ? "›" : "‹"}
          </span>
          <span className="ec-bat-onglet-texte">Notes</span>
          <span className="ec-bat-onglet-n">{nbATraiter}</span>
        </button>

        <aside className="ec-bat-panneau" id="ec-bat-panneau" aria-label="Les notes" hidden={!panneau}>
          {brouillon ? (
            <NoteEnCours
              b={brouillon}
              numero={brouillon.id ? numero.get(brouillon.id) ?? null : notes.length + 1}
              tu={p.tu}
              photo={photoChoisie}
              onChamp={champ}
              onType={(type) => setBrouillon((b) => (b ? { ...b, type, erreur: null } : b))}
              onAnnuler={() => setBrouillon(null)}
              onEnregistrer={() => enregistrer(brouillon)}
              onPhotos={ouvrirPhotos}
            />
          ) : (
            <>
              <div className="ec-bat-panneau-tete">
                <h2 className="ec-bat-panneau-titre">Notes</h2>
                <div className="ec-puces">
                  <button type="button" className="ec-onglet" aria-pressed={filtre === "a_traiter"} onClick={() => setFiltre("a_traiter")}>
                    À traiter · {nbATraiter}
                  </button>
                  <button type="button" className="ec-onglet" aria-pressed={filtre === "resolues"} onClick={() => setFiltre("resolues")}>
                    Résolues · {nbResolues}
                  </button>
                </div>
                {message ? (
                  <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note ec-bat-accent"} role={message.erreur ? "alert" : "status"}>
                    {message.texte}
                  </p>
                ) : null}
              </div>
              <ol className="ec-bat-liste ec-defile">
                {filtrees.map((n) => {
                  const etat = etatNote(n);
                  return (
                    <li key={n.id} id={`ec-note-${n.id}`} className={`ec-bat-carte ec-bat-carte--${etat}`}>
                      <span className={`ec-bat-numero ec-bat-numero--${etat}`}>{numero.get(n.id)}</span>
                      <div className="ec-bat-carte-corps">
                        <span>{resumeNote(n.type, n.contenu) || "…"}</span>
                        <span className="ec-note">
                          {n.page_index === null ? "Note générale" : `Page ${n.page_index + 1}`} · tour {numeroTour(n.tour_id)}
                          {etat === "brouillon" ? " · pas encore envoyée" : ""}
                        </span>
                        {n.reponse_atelier ? <span className="ec-bat-reponse">{n.reponse_atelier}</span> : null}
                        {modifiable && etat === "brouillon" && n.tour_id === tour.id && !n.id.startsWith("tmp-") ? (
                          <span className="ec-bat-carte-gestes">
                            <button type="button" className="ec-lien-discret" onClick={() => modifierBrouillon(n)}>
                              Modifier
                            </button>
                            <button type="button" className="ec-lien-discret" onClick={() => retirer(n)}>
                              Retirer
                            </button>
                          </span>
                        ) : null}
                        {modifiable && (etat === "a_traiter" || etat === "resolue") ? (
                          <span className="ec-bat-carte-gestes">
                            <button type="button" className="ec-lien-discret" onClick={() => basculer(n)}>
                              {etat === "resolue" ? "Rouvrir" : "Marquer résolue"}
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
                {filtrees.length === 0 ? <li className="ec-note">{filtre === "a_traiter" ? "Aucune note à traiter." : "Aucune note résolue."}</li> : null}
                {modifiable ? <li className="ec-note ec-bat-indice">{v("Cliquez sur la page pour ajouter une note.", "Clique sur la page pour ajouter une note.")}</li> : null}
              </ol>
              {modifiable ? (
                <div className="ec-bat-panneau-pied">
                  <button type="button" className="ec-lien-discret" onClick={noteGenerale}>
                    Une note sur tout le magazine
                  </button>
                  <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe || brouillons.length === 0} onClick={envoyer}>
                    Envoyer mes notes à l&apos;atelier · {brouillons.length}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {confirmer ? (
        <Fenetre titre={`Valider « ${magazine.nom} » ?`} onFermer={() => setConfirmer(false)}>
          <p className="ec-texte">
            <strong>{rappel.resume}</strong>
          </p>
          <p className="ec-texte">{rappel.tirage}</p>
          {!choix.id && !choix.sans ? (
            <p className="ec-note ec-note--erreur">
              {v("Choisissez d'abord une couverture, ou « Sans préférence ».", "Choisis d'abord une couverture, ou « Sans préférence ».")}{" "}
              <button
                type="button"
                className="ec-lien-discret"
                onClick={() => {
                  setConfirmer(false);
                  aller(-1);
                }}
              >
                Voir les propositions
              </button>
            </p>
          ) : null}
          {brouillons.length ? (
            <p className="ec-note ec-note--erreur">
              {brouillons.length} note{brouillons.length > 1 ? "s" : ""} pas encore envoyée{brouillons.length > 1 ? "s" : ""} : {v("envoyez-les ou retirez-les d'abord", "envoie-les ou retire-les d'abord")}.
            </p>
          ) : null}
          {message?.erreur ? <p className="ec-note ec-note--erreur">{message.texte}</p> : null}
          <div className="ec-bat-confirmer">
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setConfirmer(false)}>
              Pas encore
            </button>
            <button type="button" className="ec-bouton" disabled={occupe || brouillons.length > 0 || (!choix.id && !choix.sans)} onClick={valider}>
              Valider définitivement
            </button>
          </div>
        </Fenetre>
      ) : null}

      {photos.ouvert && brouillon ? (
        <Fenetre titre="Choisir une photo" onFermer={() => setPhotos((x) => ({ ...x, ouvert: false }))} large>
          <div className="ec-bat-photos-grille">
            {photos.liste.map((ph) => (
              <button
                key={ph.id}
                type="button"
                aria-pressed={brouillon.contenu.photo === ph.id}
                onClick={() => {
                  champ("photo", ph.id);
                  setPhotoChoisie(ph);
                  setPhotos((x) => ({ ...x, ouvert: false }));
                }}
              >
                {ph.vignette ? <img src={ph.vignette} alt="" loading="lazy" /> : <span>Sans aperçu</span>}
              </button>
            ))}
          </div>
          {photos.charge ? <p className="ec-note">Chargement…</p> : null}
          {photos.suivante !== null && !photos.charge ? (
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={chargerPhotos}>
              Voir plus de photos
            </button>
          ) : null}
          {!photos.charge && photos.liste.length === 0 ? <p className="ec-note">Aucune photo dans cette édition.</p> : null}
        </Fenetre>
      ) : null}
    </section>
  );
}

/* Les magazines en onglets, SOUS la bande des pages ; l'actif bien marqué. */
function OngletsMagazines({ token, magazines, rang }: { token: string; magazines: MagazineBat[]; rang: number }) {
  if (magazines.length < 2) return null;
  return (
    <nav className="ec-bat-magazines" aria-label="Magazines">
      {magazines.map((m) => (
        <Link key={m.id} href={`/edition/${token}/bat?m=${m.rang}`} prefetch={false} className="ec-bat-magazine" aria-current={m.rang === rang ? "page" : undefined}>
          Magazine {m.rang} · {m.nom}
          <span className="ec-bat-gris">{m.bat_valide_le ? "validé" : m.toursPublies ? `tour ${m.toursPublies}` : "en composition"}</span>
        </Link>
      ))}
    </nav>
  );
}

/* La couverture DANS la scène (révision §14.4) : les propositions posées en
   3D, le choix d'un clic, « Sans préférence », les 2e et 3e de couverture de
   la proposition retenue, et la note sur la couverture. */
function SceneCouverture(c: {
  couvertures: Bat["couvertures"];
  choixId: string | null;
  sans: boolean;
  modifiable: boolean;
  interieurs: boolean;
  couvInterieur: Bat["couvertures"][number] | null;
  noteCouv: string;
  setNoteCouv: (v: string) => void;
  occupe: boolean;
  onChoisir: (id: string) => void;
  onSans: () => void;
  onInterieurs: () => void;
  onNote: () => void;
  tu: boolean;
}) {
  if (c.couvertures.length === 0) {
    return <p className="ec-texte ec-bat-scene-vide">Aucune proposition de couverture n&apos;est arrivée avec ce bon à tirer.</p>;
  }
  return (
    <div className="ec-bat-couv">
      {c.interieurs && c.couvInterieur ? (
        <div className="ec-bat-ouvert" aria-label={`Intérieur de la couverture, proposition ${c.couvInterieur.rang}`}>
          <figure>
            <span className="ec-bat-ouvert-g">{c.couvInterieur.c2 ? <img src={c.couvInterieur.c2} alt="2e de couverture" /> : null}</span>
            <figcaption>2e de couverture</figcaption>
          </figure>
          <figure>
            <span className="ec-bat-ouvert-d">{c.couvInterieur.c3 ? <img src={c.couvInterieur.c3} alt="3e de couverture" /> : null}</span>
            <figcaption>3e de couverture</figcaption>
          </figure>
        </div>
      ) : (
        <div className="ec-bat-propositions">
          {c.couvertures.map((p) => {
            const retenue = c.choixId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className="ec-bat-proposition"
                aria-pressed={retenue}
                disabled={!c.modifiable}
                aria-label={`Proposition ${p.rang}${retenue ? ", votre choix" : ""}`}
                onClick={() => c.onChoisir(p.id)}
              >
                <span className="ec-bat-livre">
                  <span className="ec-bat-livre-couv">
                    {p.c1 ? <img src={p.c1} alt="" /> : null}
                    <span className="ec-bat-livre-reflet" />
                  </span>
                </span>
                <span className="ec-bat-proposition-nom">
                  Couverture {p.rang}
                  {retenue ? " · votre choix" : ""}
                </span>
                {p.legende ? <span className="ec-note">{p.legende}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      <div className="ec-bat-couv-gestes">
        {c.modifiable ? (
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" aria-pressed={c.sans} onClick={c.onSans}>
            Sans préférence, l&apos;atelier choisit
          </button>
        ) : null}
        {c.couvInterieur ? (
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={c.onInterieurs}>
            {c.interieurs ? "Revoir les couvertures" : "Voir les 2e et 3e de couverture"}
          </button>
        ) : null}
        {c.modifiable ? (
          <span className="ec-bat-couv-note">
            <input
              className="ec-champ"
              value={c.noteCouv}
              maxLength={2000}
              placeholder="Une note sur la couverture"
              onChange={(e) => c.setNoteCouv(e.target.value)}
              aria-label="Une note sur la couverture"
            />
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={c.occupe} onClick={c.onNote}>
              Enregistrer
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* La nouvelle note, DANS le panneau : en-tête fixe, corps qui défile, et
   « Annuler / Ajouter la note » toujours visibles. */
function NoteEnCours(f: {
  b: Brouillon;
  numero: number | null;
  tu: boolean;
  photo: PhotoChoix | null;
  onChamp: (cle: string, valeur: string) => void;
  onType: (type: string) => void;
  onAnnuler: () => void;
  onEnregistrer: () => void;
  onPhotos: () => void;
}) {
  const v = (vous: string, toi: string) => (f.tu ? toi : vous);
  const c = f.b.contenu;
  const generale = f.b.page_index === null;
  return (
    <div className="ec-bat-note">
      <div className="ec-bat-note-tete">
        <span className="ec-bat-numero ec-bat-numero--a_traiter">{f.numero ?? "·"}</span>
        <strong>
          {f.b.id ? "Modifier la note" : generale ? "Une note sur tout le magazine" : "Nouvelle note"}
          {generale ? "" : ` · page ${(f.b.page_index ?? 0) + 1}`}
        </strong>
      </div>
      <div className="ec-bat-note-corps ec-defile">
        {generale ? null : (
          <div className="ec-bat-types">
            {TYPES_NOTE.map((t) => (
              <button key={t.cle} type="button" aria-pressed={f.b.type === t.cle} onClick={() => f.onType(t.cle)}>
                {t.libelle}
              </button>
            ))}
          </div>
        )}
        {f.b.type === "texte" && !generale ? (
          <>
            <label className="ec-curseur">
              Le texte à corriger
              <input className="ec-champ" value={c.cible ?? ""} placeholder={v("Recopiez quelques mots", "Recopie quelques mots")} onChange={(e) => f.onChamp("cible", e.target.value)} />
            </label>
            <label className="ec-curseur">
              Remplacer par
              <textarea className="ec-champ ec-zone-texte" rows={3} value={c.remplacement ?? ""} placeholder={v("Collez ou écrivez le nouveau texte", "Colle ou écris le nouveau texte")} onChange={(e) => f.onChamp("remplacement", e.target.value)} />
            </label>
          </>
        ) : null}
        {f.b.type === "photo" && !generale ? (
          <>
            <button type="button" className="ec-bat-choisir-photo" onClick={f.onPhotos}>
              {c.photo ? (
                <>
                  {f.photo?.vignette ? <img src={f.photo.vignette} alt="" /> : null}
                  Photo choisie · en changer
                </>
              ) : (
                v("Choisir une autre photo parmi les vôtres", "Choisir une autre photo parmi les tiennes")
              )}
            </button>
            <label className="ec-curseur">
              {v("Ou décrivez-la", "Ou décris-la")}
              <textarea className="ec-champ ec-zone-texte" rows={3} value={c.description ?? ""} placeholder="Une photo où l'on voit toute l'équipe" onChange={(e) => f.onChamp("description", e.target.value)} />
            </label>
          </>
        ) : null}
        {f.b.type === "idee" || generale ? (
          <label className="ec-curseur">
            {v("Ce que vous aimeriez", "Ce que tu aimerais")}
            <textarea className="ec-champ ec-zone-texte" rows={5} value={c.texte ?? ""} placeholder="Un texte qui raconte la remise des prix, par exemple" onChange={(e) => f.onChamp("texte", e.target.value)} />
          </label>
        ) : null}
        {f.b.type === "retirer" && !generale ? (
          <label className="ec-curseur">
            {v("L'élément touché sera retiré. Une raison, si vous voulez :", "L'élément touché sera retiré. Une raison, si tu veux :")}
            <textarea className="ec-champ ec-zone-texte" rows={3} value={c.raison ?? ""} onChange={(e) => f.onChamp("raison", e.target.value)} />
          </label>
        ) : null}
        {f.b.erreur ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {f.b.erreur}
          </p>
        ) : null}
        <p className="ec-note">{v("Enregistrée tout de suite. L'atelier la reçoit quand vous envoyez vos notes.", "Enregistrée tout de suite. L'atelier la reçoit quand tu envoies tes notes.")}</p>
      </div>
      <div className="ec-bat-note-pied">
        <button type="button" className="ec-bouton ec-bouton--clair" onClick={f.onAnnuler}>
          Annuler
        </button>
        <button type="button" className="ec-bouton" onClick={f.onEnregistrer}>
          {f.b.id ? "Enregistrer" : "Ajouter la note"}
        </button>
      </div>
    </div>
  );
}
