"use client";

/* Le bon à tirer, IMMERSIF (retour de Mathias du 28/10, maquettes BAT du 27/10).

   « On arrive dans une étape où le plus important est de contempler le
   magazine » : ni menu ni barre du site (la coquille s'efface, le menu reste à
   un geste par le bouton ≡ de l'en-tête), la DOUBLE PAGE au centre, au
   téléphone aussi, et aucun bouton qui n'a rien à faire là.

   - L'en-tête est une barre de verre : ≡, « Bon à tirer », le tour (des
     segments seulement s'il y en a plusieurs), Avant / Après dès le tour 2,
     l'échéance, et « Valider » SEULEMENT au dernier tour inclus : au tour 1 d'un
     BAT qui en compte plusieurs, personne ne valide, on envoie ses notes.
   - Toucher la page pose une épingle et ouvre « Que changer ? » : quatre
     gestes (la photo, le texte, retirer, une idée). La page reste visible :
     une bulle à côté de l'épingle à l'ordinateur, une feuille BASSE au
     téléphone (la double page est en haut de l'écran). « La photo » ouvre
     directement le choix parmi les photos de l'édition, rangées par lien :
     « Remplacer » enregistre la note, rien de plus à remplir.
   - Les notes : une colonne à droite à l'ordinateur, sous la bande au
     téléphone, avec la photo choisie en vignette (« Photo remplacée ») ; une
     barre flottante « n notes · Envoyer à l'atelier » au téléphone.
   - La couverture se CONTEMPLE : les propositions en grand, posées, et le
     choix d'un toucher.

   Les pages sont des IMAGES rendues par l'atelier depuis son PDF (le PDF ne
   sort jamais du coffre). Zones et épingles sont en % de la page. Une note
   s'affiche AVANT la réponse du serveur et revient, avec une phrase, si
   l'écriture échoue. Le numéro d'une note est son rang dans le magazine,
   tours confondus : la note 4 reste la note 4 au tour suivant. L'ancienne
   liseuse à panneau est dans archive/bat-liseuse-panneau-2026-10/. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { doublesPages, etatNote, libelleBande, libelleDouble, rappelValidation, resumeNote, resumeTour, validationOuverte, type Zone } from "@/lib/collectif/bat";
import { useEchap } from "@/components/couche/useEchap";
import { useRetourFerme } from "@/components/couche/useRetourFerme";
import { useVerrouDefilement } from "@/components/couche/useVerrouDefilement";
import Fenetre from "../../_composants/Fenetre";
import { ouvrirMenuEspace } from "../Coquille";
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
  /** Les tours inclus au devis (`null` : pas encore fixé). « Valider » n'apparaît qu'au dernier. */
  toursInclus: number | null;
  tu: boolean;
};

type TypeNote = "photo" | "texte" | "retirer" | "idee";

type Brouillon = {
  id: string | null;
  page_index: number | null;
  x: number | null;
  y: number | null;
  /** `null` : « Que changer ? », le type n'est pas encore choisi. */
  type: TypeNote | null;
  contenu: Record<string, string>;
  erreur: string | null;
  /** Où ouvrir la bulle, en px dans la scène, et la taille de la scène au toucher (ordinateur). */
  ancre: { x: number; y: number; l: number; h: number } | null;
};

type PhotoChoix = { id: string; vignette: string | null };

/* Un téléphone : la coquille passe en tiroir, la scène défile, la note est une feuille basse. */
const REQUETE_TELEPHONE = "(max-width: 860px)";
function abonnerTelephone(rappel: () => void) {
  const m = window.matchMedia(REQUETE_TELEPHONE);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
}

const GESTES: { cle: TypeNote; libelle: string; icone: ReactNode }[] = [
  {
    cle: "photo",
    libelle: "La photo",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="M21 16l-5-5-8 8" />
      </svg>
    ),
  },
  {
    cle: "texte",
    libelle: "Le texte",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M5 7h14M12 7v12M9 19h6" />
      </svg>
    ),
  },
  {
    cle: "retirer",
    libelle: "Retirer",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M5 7h14M10 11v6M14 11v6M7 7l1 12h8l1-12M9 7V4h6v3" />
      </svg>
    ),
  },
  {
    cle: "idee",
    libelle: "Une idée",
    icone: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" />
      </svg>
    ),
  },
];

const Croix = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const Retour = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

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
    return { ok: false, json: { message: "Pas de réseau. Rien n'a changé." } };
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
  const [photosNotes, setPhotosNotes] = useState<Record<string, string>>(p.bat.photosNotes);
  const [voirResolues, setVoirResolues] = useState(false);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [choixPhoto, setChoixPhoto] = useState(false);
  const [choix, setChoix] = useState({ id: magazine.couverture_choisie_id, sans: magazine.couverture_sans_preference });
  const [noteCouv, setNoteCouv] = useState(magazine.couverture_note ?? "");
  const [valideLe, setValideLe] = useState<string | null>(magazine.bat_valide_le ? magazine.valideTexte || "ce jour" : null);
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [vueNoteId, setVueNoteId] = useState<string | null>(null);
  const bande = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);

  const telephone = useSyncExternalStore(abonnerTelephone, () => window.matchMedia(REQUETE_TELEPHONE).matches, () => false);

  const tour: TourBat | null = tours.find((t) => t.id === tourId) ?? courant;
  const estCourant = Boolean(tour && courant && tour.id === courant.id);
  const precedent = tour ? tours.filter((t) => t.numero < tour.numero).sort((a, b) => b.numero - a.numero)[0] ?? null : null;
  const modifiable = p.ecrire && estCourant && !valideLe;
  const avant = vue === "avant" && precedent !== null && estCourant;
  /* La double page partout, téléphone compris (Mathias : « sur mobile, on ne voit qu'une seule page »). */
  const doubles = useMemo(() => doublesPages(tour?.pages.length ?? 0), [tour]);
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
  const resolues = notesListees.filter((n) => etatNote(n) === "resolue");
  const ouvertes = notesListees.filter((n) => etatNote(n) === "brouillon" || etatNote(n) === "a_traiter");
  const montrees = voirResolues ? resolues : ouvertes;
  const brouillons = notesDuTour.filter((n) => etatNote(n) === "brouillon");
  const couvChoisie = p.bat.couvertures.find((c) => c.id === choix.id) ?? null;
  const couvInterieur = couvChoisie ?? p.bat.couvertures[0] ?? null;
  const peutValider = p.ecrire && estCourant && !valideLe && tour !== null && validationOuverte(tour.numero, p.toursInclus);

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

  /* Le clavier : flèches pour tourner (Échap ferme la note, par sa couche). */
  const nbDoubles = doubles.length;
  const libre = !brouillon && !choixPhoto && !confirmer;
  useEffect(() => {
    if (!libre) return;
    function touche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setIDouble((k) => Math.max(-1, Math.min(nbDoubles - 1, k + (e.key === "ArrowRight" ? 1 : -1))));
      }
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [nbDoubles, libre]);

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
    const s = scene.current?.getBoundingClientRect();
    setMessage(null);
    setBrouillon({ id: null, page_index: index, x, y, type: null, contenu: {}, erreur: null, ancre: s ? { x: e.clientX - s.left, y: e.clientY - s.top, l: s.width, h: s.height } : null });
  }

  function noteGenerale() {
    setBrouillon({ id: null, page_index: null, x: null, y: null, type: "idee", contenu: {}, erreur: null, ancre: null });
  }

  function modifierBrouillon(n: NoteBat) {
    const type = (["photo", "texte", "retirer", "idee"] as const).find((t) => t === n.type) ?? "idee";
    setBrouillon({ id: n.id, page_index: n.page_index, x: n.x_pct, y: n.y_pct, type, contenu: { ...n.contenu }, erreur: null, ancre: null });
  }

  function choisirType(type: TypeNote | null) {
    setBrouillon((b) => (b ? { ...b, type, erreur: null } : b));
    if (type === "photo") setChoixPhoto(true);
  }

  function champ(cle: string, valeur: string) {
    setBrouillon((b) => (b ? { ...b, contenu: { ...b.contenu, [cle]: valeur }, erreur: null } : b));
  }

  async function enregistrer(b: Brouillon) {
    if (!tour || !b.type) return;
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
    setChoixPhoto(false);
    setVoirResolues(false);
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "noter", tourId: tour.id, noteId: b.id, ...corps });
    if (r.ok && r.json.note) {
      const serveur = r.json.note as NoteBat;
      const propre: NoteBat = { ...optimiste, id: serveur.id, created_at: serveur.created_at };
      setNotes((l) => l.map((n) => (n.id === optimiste.id ? propre : n)));
      return;
    }
    /* Échec : la note revient à l'écran, rien n'est perdu. */
    setNotes((l) => (b.id && avantEdition ? l.map((n) => (n.id === b.id ? avantEdition : n)) : l.filter((n) => n.id !== temporaire)));
    setBrouillon({ ...b, erreur: String(r.json.message ?? "Non enregistrée.") });
  }

  function remplacerPar(ph: PhotoChoix) {
    if (!brouillon) return;
    if (ph.vignette) setPhotosNotes((m) => ({ ...m, [ph.id]: ph.vignette as string }));
    void enregistrer({ ...brouillon, type: "photo", contenu: { ...brouillon.contenu, photo: ph.id } });
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
    const n = Number(r.json.n);
    setMessage({ texte: `${n} note${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} à l'atelier.`, erreur: false });
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
    setMessage({ texte: "Bon à tirer validé. L'atelier prend le relais.", erreur: false });
    router.refresh();
  }

  /** Une note de la liste : sa double page, son épingle mise en avant. */
  function montrerNote(n: NoteBat) {
    setVueNoteId(n.id);
    if (n.tour_id !== tour?.id) changerTour(n.tour_id);
    if (n.page_index !== null) {
      const k = doubles.findIndex((d) => d.includes(n.page_index as number));
      if (k >= 0) aller(k);
    }
    if (telephone) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ─────────────────────────── l'affichage ─────────────────────────── */

  const tete = (contenu: ReactNode) => (
    <header className="ec-b3-tete">
      <button type="button" className="ec-b3-menu" aria-label="Ouvrir le menu" onClick={ouvrirMenuEspace}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <h1 className="ec-b3-titre">Bon à tirer</h1>
      {contenu}
    </header>
  );
  const onglets = <OngletsMagazines token={p.token} magazines={magazines} rang={magazine.rang} />;

  if (!tour || !courant) {
    return (
      <section className="ec-bat3">
        {tete(null)}
        <div className="ec-b3-attente">
          <p className="ec-texte">L&apos;atelier compose ce magazine. Son bon à tirer s&apos;affichera ici.</p>
          {onglets}
        </div>
      </section>
    );
  }

  const suivantTour = tours.find((t) => t.numero > tour.numero);
  const zonesIci = avant || enCouverture ? 0 : visibles.reduce((n, idx) => n + (tour.pages[idx]?.zones.length ?? 0), 0);
  const nouvelleIci = !avant && !enCouverture && precedent !== null && visibles.some((idx) => tour.pages[idx]?.apparie_a === null);

  /* La légende sous la double page : où l'on est, et une seule précision (textes courts). */
  const ou = enCouverture ? "La couverture" : libelleDouble(visibles);
  const precision = enCouverture
    ? modifiable
      ? v("Touchez celle que vous préférez", "Touche celle que tu préfères")
      : ""
    : valideLe
      ? `Validé ${valideLe === "à l'instant" ? "à l'instant" : `le ${valideLe}`}`
      : !estCourant
        ? `Tour archivé${suivantTour ? `, remplacé par le tour ${suivantTour.numero}` : ""}`
        : avant
          ? `Tour ${precedent?.numero} · en pointillé, ce qui a changé`
          : p.lectureSeule
            ? "Lecture seule"
            : zonesIci
              ? `${zonesIci} zone${zonesIci > 1 ? "s" : ""} modifiée${zonesIci > 1 ? "s" : ""}`
              : resumeOuIndice(nouvelleIci, precedent?.numero ?? null, resume, modifiable && notesListees.length === 0 ? v("Touchez la page pour noter", "Touche la page pour noter") : "");

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
        className={`ec-b3-feuille${modifiable && !avant ? " ec-b3-feuille--note" : ""}`}
        onClick={(e) => cliquerPage(e, idx)}
        role={modifiable && !avant ? "button" : undefined}
        aria-label={modifiable && !avant ? `Noter sur la page ${idx + 1}` : undefined}
      >
        {url ? (
          <img src={url} alt={`Page ${idx + 1}${avant ? ` (tour ${precedent?.numero})` : ""}`} decoding="async" draggable={false} />
        ) : (
          <span className="ec-b3-sans-image">{avant ? `Nouvelle page au tour ${tour.numero}` : "Image indisponible"}</span>
        )}
        {zones.map((z, k) => (
          <span key={k} className={avant ? "ec-b3-zone ec-b3-zone--avant" : "ec-b3-zone"} style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.l}%`, height: `${z.h}%` }} />
        ))}
        {epingles.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`ec-b3-epingle ec-b3-epingle--${etatNote(n)}${vueNoteId === n.id ? " ec-b3-epingle--vue" : ""}`}
            style={{ left: `${n.x_pct}%`, top: `${n.y_pct}%` }}
            aria-label={`Note ${numero.get(n.id)}`}
            onClick={(e) => {
              e.stopPropagation();
              setVueNoteId(n.id);
              setVoirResolues(etatNote(n) === "resolue");
              document.getElementById(`ec-b3-note-${n.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          >
            {numero.get(n.id)}
          </button>
        ))}
        {brouillon && brouillon.page_index === idx && !brouillon.id && brouillon.x !== null && brouillon.y !== null ? (
          <span className="ec-b3-epingle ec-b3-epingle--nouvelle" style={{ left: `${brouillon.x}%`, top: `${brouillon.y}%` }} aria-hidden="true">
            {notes.length + 1}
          </span>
        ) : null}
      </div>
    );
  };

  const nbEnvoi = brouillons.length;
  const listeNotes = (
    <aside className="ec-b3-notes" aria-label="Les notes">
      <div className="ec-b3-notes-tete">
        <h2 className="ec-b3-notes-titre">
          Notes <span className="ec-b3-gris">· {ouvertes.length}</span>
        </h2>
        {estCourant && tour.echeanceTexte && !valideLe ? <span className="ec-b3-gris ec-b3-echeance-tel">Avant le {tour.echeanceTexte}</span> : null}
        {resolues.length ? (
          <button type="button" className="ec-lien-discret" aria-pressed={voirResolues} onClick={() => setVoirResolues((x) => !x)}>
            {voirResolues ? "À traiter" : `Résolues · ${resolues.length}`}
          </button>
        ) : null}
      </div>
      {message ? (
        <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note ec-b3-accent"} role={message.erreur ? "alert" : "status"}>
          {message.texte}
        </p>
      ) : null}
      <ol className="ec-b3-liste">
        {montrees.map((n) => {
          const etat = etatNote(n);
          const photo = n.type === "photo" && n.contenu.photo ? photosNotes[n.contenu.photo] ?? null : null;
          const brouillonIci = modifiable && etat === "brouillon" && n.tour_id === tour.id && !n.id.startsWith("tmp-");
          return (
            <li key={n.id} id={`ec-b3-note-${n.id}`} className={`ec-b3-carte ec-b3-carte--${etat}${vueNoteId === n.id ? " ec-b3-carte--vue" : ""}`}>
              <button type="button" className="ec-b3-carte-main" onClick={() => montrerNote(n)}>
                <span className={`ec-b3-numero ec-b3-numero--${etat}`}>{numero.get(n.id)}</span>
                <span className="ec-b3-carte-texte">
                  <span>{n.type === "photo" && n.contenu.photo ? "Photo remplacée" : resumeNote(n.type, n.contenu) || "…"}</span>
                  {n.reponse_atelier ? <span className="ec-b3-reponse">{n.reponse_atelier}</span> : null}
                </span>
                {photo ? <img className="ec-b3-carte-photo" src={photo} alt="La photo choisie" loading="lazy" /> : null}
                <span className="ec-b3-gris ec-b3-carte-page">{n.page_index === null ? "tout" : `p. ${n.page_index + 1}`}</span>
              </button>
              {brouillonIci ? (
                <span className="ec-b3-carte-gestes">
                  <button type="button" className="ec-lien-discret" onClick={() => modifierBrouillon(n)}>
                    Modifier
                  </button>
                  <button type="button" className="ec-lien-discret" onClick={() => retirer(n)}>
                    Retirer
                  </button>
                </span>
              ) : modifiable && (etat === "resolue" || (etat === "a_traiter" && (n.reponse_atelier || n.tour_id !== tour.id))) ? (
                <span className="ec-b3-carte-gestes">
                  <button type="button" className="ec-lien-discret" onClick={() => basculer(n)}>
                    {etat === "resolue" ? "Rouvrir" : "Résolue"}
                  </button>
                </span>
              ) : null}
            </li>
          );
        })}
        {montrees.length === 0 ? <li className="ec-note ec-b3-vide">{voirResolues ? "Aucune note résolue." : modifiable ? v("Touchez la page pour noter.", "Touche la page pour noter.") : "Aucune note."}</li> : null}
      </ol>
      {modifiable ? (
        <div className="ec-b3-notes-pied">
          <button type="button" className="ec-lien-discret" onClick={noteGenerale}>
            Une note sur tout le magazine
          </button>
          <button type="button" className="ec-bouton ec-bouton--plein ec-b3-envoyer" disabled={occupe || nbEnvoi === 0} onClick={envoyer}>
            {nbEnvoi ? `Envoyer ${nbEnvoi} note${nbEnvoi > 1 ? "s" : ""} à l'atelier` : "Envoyer à l'atelier"}
          </button>
        </div>
      ) : null}
    </aside>
  );

  return (
    <section className="ec-bat3">
      {tete(
        <>
          {tours.length > 1 ? (
            <div className="ec-b3-segments" role="group" aria-label="Tours">
              {tours.map((t) => (
                <button key={t.id} type="button" aria-pressed={t.id === tour.id} onClick={() => changerTour(t.id)}>
                  Tour {t.numero}
                </button>
              ))}
            </div>
          ) : (
            <span className="ec-b3-tour">Tour {tour.numero}</span>
          )}
          {precedent && estCourant ? (
            <div className="ec-b3-segments" role="group" aria-label="Avant ou après">
              <button type="button" aria-pressed={!avant} onClick={() => setVue("apres")}>
                Après
              </button>
              <button type="button" aria-pressed={avant} onClick={() => setVue("avant")}>
                Avant
              </button>
            </div>
          ) : null}
          <span className="ec-b3-espace" />
          {estCourant && tour.echeanceTexte && !valideLe ? <span className="ec-b3-echeance">Avant le {tour.echeanceTexte}</span> : null}
          {valideLe ? <span className="ec-pilule">Validé</span> : null}
          {peutValider ? (
            <button type="button" className="ec-bouton ec-bouton--petit ec-b3-valider" onClick={() => setConfirmer(true)}>
              Valider
            </button>
          ) : null}
        </>
      )}

      <div className="ec-b3-corps">
        <div className="ec-b3-colonne">
          <div className="ec-b3-scene" ref={scene}>
            <button type="button" className="ec-b3-fleche ec-b3-fleche--g" aria-label="Pages précédentes" disabled={iDouble <= -1} onClick={() => aller(iDouble - 1)}>
              ‹
            </button>
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
              />
            ) : (
              <div className="ec-b3-double">{visibles.map(feuille)}</div>
            )}
            <button type="button" className="ec-b3-fleche ec-b3-fleche--d" aria-label="Pages suivantes" disabled={iDouble >= doubles.length - 1} onClick={() => aller(iDouble + 1)}>
              ›
            </button>
            {brouillon && !telephone && !choixPhoto ? (
              <Bulle ancre={brouillon.ancre}>
                <Noter b={brouillon} numero={brouillon.id ? numero.get(brouillon.id) ?? null : notes.length + 1} tu={p.tu} onType={choisirType} onChamp={champ} onFermer={() => setBrouillon(null)} onEnregistrer={() => enregistrer(brouillon)} onPhotos={() => setChoixPhoto(true)} photo={brouillon.contenu.photo ? photosNotes[brouillon.contenu.photo] ?? null : null} />
              </Bulle>
            ) : null}
          </div>

          <p className="ec-b3-legende">
            <button type="button" className="ec-b3-rond" aria-label="Pages précédentes" disabled={iDouble <= -1} onClick={() => aller(iDouble - 1)}>
              ‹
            </button>
            <strong>{ou}</strong>
            {precision ? <span className="ec-b3-gris">{precision}</span> : null}
            <button type="button" className="ec-b3-rond" aria-label="Pages suivantes" disabled={iDouble >= doubles.length - 1} onClick={() => aller(iDouble + 1)}>
              ›
            </button>
          </p>

          <div className="ec-b3-bande" ref={bande} aria-label="Les pages">
            <button type="button" className="ec-b3-vignette" aria-current={enCouverture ? "true" : undefined} onClick={() => aller(-1)} aria-label="La couverture">
              <span className="ec-b3-vignette-couv">{(couvChoisie ?? p.bat.couvertures[0])?.c1 ? <img src={(couvChoisie ?? p.bat.couvertures[0])?.c1 ?? ""} alt="" loading="lazy" /> : null}</span>
            </button>
            {doubles.map((d, k) => {
              const modif = estCourant && d.some((idx) => (tour.pages[idx]?.zones.length ?? 0) > 0 || (precedent && tour.pages[idx]?.apparie_a === null));
              const nb = notesDuTour.filter((n) => n.page_index !== null && d.includes(n.page_index) && etatNote(n) !== "resolue").length;
              return (
                <button key={k} type="button" className="ec-b3-vignette" aria-current={!enCouverture && k === i ? "true" : undefined} onClick={() => aller(k)} aria-label={`Pages ${libelleBande(d)}`}>
                  <span className="ec-b3-vignette-pages">
                    {d.map((idx) => {
                      const src = tour.pages[idx]?.vignette ?? null;
                      return src ? <img key={idx} src={src} alt="" loading="lazy" /> : <span key={idx} />;
                    })}
                    {modif ? <span className="ec-b3-vignette-point" aria-label="modifiée" /> : null}
                    {nb ? <span className="ec-b3-vignette-n">{nb}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {onglets}
        </div>

        {listeNotes}
      </div>

      {/* Le téléphone : la barre flottante d'envoi, sous le pouce. */}
      {telephone && modifiable && nbEnvoi > 0 && !brouillon && !choixPhoto ? (
        <div className="ec-b3-flottante">
          <span>
            {nbEnvoi} note{nbEnvoi > 1 ? "s" : ""}
          </span>
          <button type="button" className="ec-bouton ec-bouton--plein" disabled={occupe} onClick={envoyer}>
            Envoyer à l&apos;atelier
          </button>
        </div>
      ) : null}

      {brouillon && telephone && !choixPhoto ? (
        <FeuilleBasse onFermer={() => setBrouillon(null)}>
          <Noter b={brouillon} numero={brouillon.id ? numero.get(brouillon.id) ?? null : notes.length + 1} tu={p.tu} onType={choisirType} onChamp={champ} onFermer={() => setBrouillon(null)} onEnregistrer={() => enregistrer(brouillon)} onPhotos={() => setChoixPhoto(true)} photo={brouillon.contenu.photo ? photosNotes[brouillon.contenu.photo] ?? null : null} />
        </FeuilleBasse>
      ) : null}

      {choixPhoto && brouillon ? (
        <ChoixPhoto
          token={p.token}
          choisie={brouillon.contenu.photo ?? null}
          onRetour={() => setChoixPhoto(false)}
          onFermer={() => {
            setChoixPhoto(false);
            setBrouillon(null);
          }}
          onRemplacer={remplacerPar}
          onDecrire={() => {
            setChoixPhoto(false);
            setBrouillon((b) => (b ? { ...b, type: "photo" } : b));
          }}
        />
      ) : null}

      {confirmer ? (
        <Fenetre titre={`Valider « ${magazine.nom} » ?`} onFermer={() => setConfirmer(false)}>
          <p className="ec-texte">
            <strong>{rappel.resume}</strong>
          </p>
          <p className="ec-texte">{rappel.tirage}</p>
          {!choix.id && !choix.sans ? (
            <p className="ec-note ec-note--erreur">
              {v("Choisissez d'abord une couverture.", "Choisis d'abord une couverture.")}{" "}
              <button
                type="button"
                className="ec-lien-discret"
                onClick={() => {
                  setConfirmer(false);
                  aller(-1);
                }}
              >
                Voir les couvertures
              </button>
            </p>
          ) : null}
          {brouillons.length ? (
            <p className="ec-note ec-note--erreur">
              {brouillons.length} note{brouillons.length > 1 ? "s" : ""} pas encore envoyée{brouillons.length > 1 ? "s" : ""}.
            </p>
          ) : null}
          {message?.erreur ? <p className="ec-note ec-note--erreur">{message.texte}</p> : null}
          <div className="ec-b3-confirmer">
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setConfirmer(false)}>
              Pas encore
            </button>
            <button type="button" className="ec-bouton" disabled={occupe || brouillons.length > 0 || (!choix.id && !choix.sans)} onClick={valider}>
              Valider définitivement
            </button>
          </div>
        </Fenetre>
      ) : null}
    </section>
  );
}

function resumeOuIndice(
  nouvelle: boolean,
  precedent: number | null,
  resume: { modifiees: number; retirees: number[] } | null,
  indice: string
): string {
  if (nouvelle) return "Nouvelle page";
  if (precedent !== null && resume) return resume.modifiees === 0 ? `Rien de modifié depuis le tour ${precedent}` : `${resume.modifiees} page${resume.modifiees > 1 ? "s" : ""} modifiée${resume.modifiees > 1 ? "s" : ""} depuis le tour ${precedent}`;
  return indice;
}

/* Les magazines en onglets, sous la bande ; l'actif bien marqué. */
function OngletsMagazines({ token, magazines, rang }: { token: string; magazines: MagazineBat[]; rang: number }) {
  if (magazines.length < 2) return null;
  return (
    <nav className="ec-b3-magazines" aria-label="Magazines">
      {magazines.map((m) => (
        <Link key={m.id} href={`/edition/${token}/bat?m=${m.rang}`} prefetch={false} className="ec-b3-magazine" aria-current={m.rang === rang ? "page" : undefined}>
          {m.nom}
          <span className="ec-b3-gris">{m.bat_valide_le ? "validé" : m.toursPublies ? `tour ${m.toursPublies}` : "en composition"}</span>
        </Link>
      ))}
    </nav>
  );
}

/* La bulle de la note, à côté de l'épingle (ordinateur) : la page reste visible. */
function Bulle({ ancre, children }: { ancre: Brouillon["ancre"]; children: ReactNode }) {
  const LARGEUR = 320;
  let style: React.CSSProperties = { right: 16, bottom: 16 };
  if (ancre) {
    const { l, h } = ancre;
    const aDroite = ancre.x + 28 + LARGEUR < l - 8;
    style = {
      left: aDroite ? ancre.x + 28 : Math.max(8, ancre.x - 28 - LARGEUR),
      top: Math.max(8, Math.min(ancre.y - 40, h - 360)),
    };
  }
  return (
    <div className="ec-b3-bulle" style={style} role="dialog" aria-label="La note">
      {children}
    </div>
  );
}

/* La feuille basse du téléphone : elle laisse voir la double page en haut. */
function FeuilleBasse({ onFermer, children }: { onFermer: () => void; children: ReactNode }) {
  useRetourFerme(onFermer);
  useEchap(onFermer);
  return (
    <>
      <button type="button" className="ec-b3-voile" aria-label="Fermer" onClick={onFermer} />
      <div className="ec-b3-feuille-basse" role="dialog" aria-label="La note">
        <span className="ec-b3-poignee" aria-hidden="true" />
        {children}
      </div>
    </>
  );
}

/* « Que changer ? » puis, selon le geste, le moins de champs possible. */
function Noter(f: {
  b: Brouillon;
  numero: number | null;
  tu: boolean;
  photo: string | null;
  onType: (t: TypeNote | null) => void;
  onChamp: (cle: string, valeur: string) => void;
  onFermer: () => void;
  onEnregistrer: () => void;
  onPhotos: () => void;
}) {
  const v = (vous: string, toi: string) => (f.tu ? toi : vous);
  const c = f.b.contenu;
  const generale = f.b.page_index === null;
  useEchap(f.onFermer);
  const titre = !f.b.type ? "Que changer ?" : generale ? "Tout le magazine" : GESTES.find((g) => g.cle === f.b.type)?.libelle ?? "La note";
  const pret =
    f.b.type === "texte" ? Boolean(c.cible?.trim() || c.remplacement?.trim()) : f.b.type === "photo" ? Boolean(c.photo || c.description?.trim()) : f.b.type === "idee" ? Boolean(c.texte?.trim()) : f.b.type === "retirer";
  return (
    <div className="ec-b3-noter">
      <div className="ec-b3-noter-tete">
        {f.b.type && !generale && !f.b.id ? (
          <button type="button" className="ec-b3-icone" aria-label="Autre geste" onClick={() => f.onType(null)}>
            <Retour />
          </button>
        ) : (
          <span className="ec-b3-numero ec-b3-numero--brouillon">{f.numero ?? "·"}</span>
        )}
        <strong className="ec-b3-noter-titre">{titre}</strong>
        <button type="button" className="ec-b3-icone" aria-label="Fermer" onClick={f.onFermer}>
          <Croix />
        </button>
      </div>

      {!f.b.type ? (
        <div className="ec-b3-gestes">
          {GESTES.map((g) => (
            <button key={g.cle} type="button" className="ec-b3-geste" onClick={() => f.onType(g.cle)}>
              {g.icone}
              {g.libelle}
            </button>
          ))}
        </div>
      ) : null}

      {f.b.type === "texte" ? (
        <>
          <input className="ec-champ" value={c.cible ?? ""} placeholder="Le texte actuel" aria-label="Le texte actuel" onChange={(e) => f.onChamp("cible", e.target.value)} />
          <input className="ec-champ" value={c.remplacement ?? ""} placeholder="Le bon texte" aria-label="Le bon texte" autoFocus onChange={(e) => f.onChamp("remplacement", e.target.value)} />
        </>
      ) : null}
      {f.b.type === "photo" ? (
        c.photo ? (
          <button type="button" className="ec-b3-photo-choisie" onClick={f.onPhotos}>
            {f.photo ? <img src={f.photo} alt="" /> : null}
            <span>Photo choisie</span>
            <span className="ec-b3-accent">Changer</span>
          </button>
        ) : (
          <>
            <textarea className="ec-champ" rows={2} value={c.description ?? ""} placeholder={v("Décrivez la photo voulue", "Décris la photo voulue")} aria-label="La photo voulue" autoFocus onChange={(e) => f.onChamp("description", e.target.value)} />
            <button type="button" className="ec-lien-discret" onClick={f.onPhotos}>
              Choisir parmi les photos
            </button>
          </>
        )
      ) : null}
      {f.b.type === "idee" ? <textarea className="ec-champ" rows={3} value={c.texte ?? ""} placeholder={v("Ce que vous aimeriez", "Ce que tu aimerais")} aria-label="L'idée" autoFocus onChange={(e) => f.onChamp("texte", e.target.value)} /> : null}
      {f.b.type === "retirer" ? <input className="ec-champ" value={c.raison ?? ""} placeholder="Pourquoi ? (facultatif)" aria-label="Pourquoi" onChange={(e) => f.onChamp("raison", e.target.value)} /> : null}

      {f.b.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {f.b.erreur}
        </p>
      ) : null}
      {f.b.type ? (
        <button type="button" className="ec-bouton ec-bouton--plein ec-b3-ajouter" disabled={!pret} onClick={f.onEnregistrer}>
          {f.b.id ? "Enregistrer" : f.b.type === "retirer" ? "Retirer" : "Ajouter la note"}
        </button>
      ) : null}
    </div>
  );
}

type Dossier = { cle: string; nom: string; n: number };

/* « Remplacer par » : les photos de l'édition, rangées par lien comme sur la page Photos.
   Feuille presque pleine au téléphone, fenêtre centrée à l'ordinateur. « Remplacer » enregistre. */
function ChoixPhoto(c: {
  token: string;
  choisie: string | null;
  onRetour: () => void;
  onFermer: () => void;
  onRemplacer: (ph: PhotoChoix) => void;
  onDecrire: () => void;
}) {
  useRetourFerme(c.onRetour);
  useEchap(c.onRetour);
  useVerrouDefilement();
  const [dossier, setDossier] = useState("tout");
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [liste, setListe] = useState<PhotoChoix[]>([]);
  const [suivante, setSuivante] = useState<number | null>(0);
  const [charge, setCharge] = useState(false);
  const [choisie, setChoisie] = useState<PhotoChoix | null>(null);

  async function charger(cle: string, page: number, ajouter: boolean) {
    setCharge(true);
    try {
      const rep = await fetch("/api/collectif/photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: c.token, dossier: cle, page }),
      });
      const json = (await rep.json()) as { photos?: PhotoChoix[]; suivante?: number | null; arbre?: { vous?: Dossier[]; liens?: Dossier[] } };
      setListe((l) => [...(ajouter ? l : []), ...(json.photos ?? [])]);
      setSuivante(json.suivante ?? null);
      if (json.arbre && cle === "tout" && page === 0) {
        setDossiers([...(json.arbre.vous ?? []), ...(json.arbre.liens ?? [])].filter((d) => d.n > 0).map((d) => ({ cle: d.cle, nom: d.nom, n: d.n })));
      }
    } catch {
      setSuivante(null);
    }
    setCharge(false);
  }

  useEffect(() => {
    void charger("tout", 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function filtrer(cle: string) {
    setDossier(cle);
    setListe([]);
    void charger(cle, 0, false);
  }

  return (
    <>
      <button type="button" className="ec-b3-voile" aria-label="Fermer" onClick={c.onRetour} />
      <div className="ec-b3-choix" role="dialog" aria-label="Remplacer par">
        <span className="ec-b3-poignee" aria-hidden="true" />
        <div className="ec-b3-noter-tete">
          <button type="button" className="ec-b3-icone" aria-label="Retour" onClick={c.onRetour}>
            <Retour />
          </button>
          <strong className="ec-b3-noter-titre">Remplacer par</strong>
          <button type="button" className="ec-b3-icone" aria-label="Fermer" onClick={c.onFermer}>
            <Croix />
          </button>
        </div>
        {dossiers.length > 1 ? (
          <div className="ec-b3-puces" role="group" aria-label="Les liens">
            <button type="button" aria-pressed={dossier === "tout"} onClick={() => filtrer("tout")}>
              Toutes
            </button>
            {dossiers.map((d) => (
              <button key={d.cle} type="button" aria-pressed={dossier === d.cle} onClick={() => filtrer(d.cle)}>
                {d.nom}
              </button>
            ))}
          </div>
        ) : null}
        <div className="ec-b3-grille">
          {liste.map((ph) => {
            const coche = (choisie?.id ?? c.choisie) === ph.id;
            return (
              <button key={ph.id} type="button" aria-pressed={coche} aria-label={coche ? "Photo choisie" : "Choisir cette photo"} onClick={() => setChoisie(ph)}>
                {ph.vignette ? <img src={ph.vignette} alt="" loading="lazy" /> : <span />}
                {coche ? (
                  <span className="ec-b3-coche" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {charge ? <p className="ec-note">Chargement…</p> : null}
        {!charge && liste.length === 0 ? <p className="ec-note">Aucune photo ici.</p> : null}
        {suivante !== null && !charge ? (
          <button type="button" className="ec-lien-discret ec-b3-plus" onClick={() => charger(dossier, suivante, true)}>
            Voir plus
          </button>
        ) : null}
        <div className="ec-b3-choix-pied">
          <button type="button" className="ec-lien-discret" onClick={c.onDecrire}>
            La décrire plutôt
          </button>
          <button type="button" className="ec-bouton ec-bouton--plein" disabled={!choisie} onClick={() => choisie && c.onRemplacer(choisie)}>
            Remplacer
          </button>
        </div>
      </div>
    </>
  );
}

/* La couverture se CONTEMPLE : les propositions en grand, posées ; le choix d'un toucher. */
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
}) {
  const [noter, setNoter] = useState(Boolean(c.noteCouv));
  if (c.couvertures.length === 0) {
    return <p className="ec-texte ec-b3-scene-vide">Aucune proposition de couverture avec ce bon à tirer.</p>;
  }
  return (
    <div className="ec-b3-couv">
      {c.interieurs && c.couvInterieur ? (
        <div className="ec-b3-ouvert" aria-label={`Intérieur de la couverture ${c.couvInterieur.rang}`}>
          <span className="ec-b3-ouvert-g">{c.couvInterieur.c2 ? <img src={c.couvInterieur.c2} alt="2e de couverture" /> : null}</span>
          <span className="ec-b3-ouvert-d">{c.couvInterieur.c3 ? <img src={c.couvInterieur.c3} alt="3e de couverture" /> : null}</span>
        </div>
      ) : (
        <div className="ec-b3-propositions">
          {c.couvertures.map((p) => {
            const retenue = c.choixId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className="ec-b3-proposition"
                aria-pressed={retenue}
                disabled={!c.modifiable}
                aria-label={`Couverture ${p.rang}${retenue ? ", votre choix" : ""}`}
                onClick={() => c.onChoisir(p.id)}
              >
                <span className="ec-b3-livre">
                  {p.c1 ? <img src={p.c1} alt="" /> : null}
                  <span className="ec-b3-livre-reflet" />
                  {retenue ? (
                    <span className="ec-b3-coche" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    </span>
                  ) : null}
                </span>
                <span className="ec-b3-proposition-nom">{p.legende || `Couverture ${p.rang}`}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="ec-b3-couv-gestes">
        {c.couvInterieur ? (
          <button type="button" className="ec-lien-discret" onClick={c.onInterieurs}>
            {c.interieurs ? "Les couvertures" : "Voir l'intérieur"}
          </button>
        ) : null}
        {c.modifiable ? (
          <button type="button" className="ec-lien-discret" aria-pressed={c.sans} onClick={c.onSans}>
            {c.sans ? "Sans préférence ✓" : "Sans préférence"}
          </button>
        ) : null}
        {c.modifiable && !noter ? (
          <button type="button" className="ec-lien-discret" onClick={() => setNoter(true)}>
            Une note
          </button>
        ) : null}
      </div>
      {c.modifiable && noter ? (
        <span className="ec-b3-couv-note">
          <input className="ec-champ" value={c.noteCouv} maxLength={2000} placeholder="Une note sur la couverture" aria-label="Une note sur la couverture" onChange={(e) => c.setNoteCouv(e.target.value)} />
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={c.occupe} onClick={c.onNote}>
            Enregistrer
          </button>
        </span>
      ) : null}
    </div>
  );
}
