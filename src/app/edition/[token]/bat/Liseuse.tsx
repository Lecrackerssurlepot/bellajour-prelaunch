"use client";

/* La liseuse du bon à tirer (PRD §6.2, maquette BAT).

   Les pages sont des IMAGES rendues par l'atelier depuis son PDF (le PDF ne
   sort jamais du coffre). Les zones modifiées sont des rectangles en % de la
   page, calculés à la publication ; les notes sont posées en % aussi : tout
   se dessine à n'importe quelle taille d'écran.

   Fluidité (PRD §6.3) : rien ne recharge le document entre deux pages ; les
   images des doubles pages voisines (± 2) se préchargent ; une note s'affiche
   AVANT la réponse du serveur, et revient dans sa fenêtre avec une phrase si
   l'écriture échoue.

   Le numéro d'une note est son rang dans tout le magazine (tours confondus),
   comme dans la maquette : la note 4 reste la note 4 au tour suivant. */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import {
  doublesPages,
  etatNote,
  FILTRES_NOTES,
  libelleDouble,
  resumeNote,
  resumeTour,
  texteValidationBat,
  type FiltreNotes,
  type Zone,
} from "@/lib/collectif/bat";
import { TYPES_NOTE } from "@/lib/collectif/types";
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
  /** Où ouvrir la fenêtre dans la scène, en px. */
  ancre: { left: number; top: number } | null;
  erreur: string | null;
};

type PhotoChoix = { id: string; vignette: string | null };

/* Un téléphone lit page par page ; un écran large, double page par double page. */
const REQUETE_ETROIT = "(max-width: 760px)";
function abonnerEtroit(rappel: () => void) {
  const m = window.matchMedia(REQUETE_ETROIT);
  m.addEventListener("change", rappel);
  return () => m.removeEventListener("change", rappel);
}

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
  const [iDouble, setIDouble] = useState(0);
  const [notes, setNotes] = useState<NoteBat[]>(p.bat.notes);
  const [filtre, setFiltre] = useState<FiltreNotes>("toutes");
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [noteGenerale, setNoteGenerale] = useState("");
  const [couvOuverte, setCouvOuverte] = useState(false);
  const [choix, setChoix] = useState({ id: magazine.couverture_choisie_id, sans: magazine.couverture_sans_preference });
  const [noteCouv, setNoteCouv] = useState(magazine.couverture_note ?? "");
  const [valideLe, setValideLe] = useState<string | null>(magazine.bat_valide_le ? magazine.valideTexte || "ce jour" : null);
  const [plein, setPlein] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [photos, setPhotos] = useState<{ liste: PhotoChoix[]; suivante: number | null; ouvert: boolean; charge: boolean }>({ liste: [], suivante: 0, ouvert: false, charge: false });
  const [photoChoisie, setPhotoChoisie] = useState<PhotoChoix | null>(null);
  const scene = useRef<HTMLDivElement>(null);

  const etroit = useSyncExternalStore(abonnerEtroit, () => window.matchMedia(REQUETE_ETROIT).matches, () => false);

  const tour: TourBat | null = tours.find((t) => t.id === tourId) ?? courant;
  const estCourant = Boolean(tour && courant && tour.id === courant.id);
  const precedent = tour ? tours.filter((t) => t.numero < tour.numero).sort((a, b) => b.numero - a.numero)[0] ?? null : null;
  const modifiable = p.ecrire && estCourant && !valideLe;
  const avant = vue === "avant" && precedent !== null;
  const doubles = useMemo(() => {
    const n = tour?.pages.length ?? 0;
    return etroit ? Array.from({ length: n }, (_, i) => [i]) : doublesPages(n);
  }, [tour, etroit]);
  const i = Math.min(iDouble, Math.max(0, doubles.length - 1));
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
  const compte = { toutes: notesListees.length, a_traiter: notesListees.filter(aTraiter).length, resolues: notesListees.filter((n) => etatNote(n) === "resolue").length };
  const filtrees = notesListees.filter((n) => filtre === "toutes" || (filtre === "a_traiter" ? aTraiter(n) : etatNote(n) === "resolue"));
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

  /* Le clavier : flèches pour tourner, Échap pour fermer. */
  const nbDoubles = doubles.length;
  useEffect(() => {
    function touche(e: KeyboardEvent) {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "Escape") {
        setBrouillon(null);
        setCouvOuverte(false);
        setPlein(false);
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        setBrouillon(null);
        setIDouble((k) => Math.max(0, Math.min(nbDoubles - 1, k + (e.key === "ArrowRight" ? 1 : -1))));
      }
    }
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [nbDoubles]);

  function aller(k: number) {
    setBrouillon(null);
    setIDouble(Math.max(0, Math.min(doubles.length - 1, k)));
  }

  function changerTour(id: string) {
    setTourId(id);
    setVue("apres");
    setIDouble(0);
    setFiltre("toutes");
    setBrouillon(null);
  }

  /* ─────────────────────────── poser une note ─────────────────────────── */

  function cliquerPage(e: MouseEvent<HTMLDivElement>, index: number) {
    if (!modifiable || avant) return;
    const r = e.currentTarget.getBoundingClientRect();
    const s = scene.current?.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 10000) / 100;
    const y = Math.round(((e.clientY - r.top) / r.height) * 10000) / 100;
    setPhotoChoisie(null);
    setBrouillon({
      id: null,
      page_index: index,
      x,
      y,
      type: "texte",
      contenu: {},
      ancre: s ? { left: e.clientX - s.left, top: e.clientY - s.top } : null,
      erreur: null,
    });
  }

  function modifierBrouillon(n: NoteBat) {
    setPhotoChoisie(null);
    setBrouillon({ id: n.id, page_index: n.page_index, x: n.x_pct, y: n.y_pct, type: n.type, contenu: { ...n.contenu }, ancre: null, erreur: null });
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
    const r = await appeler({ token: p.token, magazineId: magazine.id, action: "noter", tourId: tour.id, noteId: b.id, ...corps });
    if (r.ok && r.json.note) {
      const serveur = r.json.note as NoteBat & { x_pct: unknown; y_pct: unknown };
      const propre: NoteBat = { ...optimiste, id: serveur.id, created_at: serveur.created_at };
      setNotes((l) => l.map((n) => (n.id === optimiste.id ? propre : n)));
      return;
    }
    /* Échec : la note revient dans sa fenêtre (ou dans le champ de la note
       générale), rien n'est perdu. */
    setNotes((l) => (b.id && avantEdition ? l.map((n) => (n.id === b.id ? avantEdition : n)) : l.filter((n) => n.id !== temporaire)));
    if (b.page_index === null) {
      setNoteGenerale(b.contenu.texte ?? "");
      setMessage({ texte: String(r.json.message ?? "Note non enregistrée."), erreur: true });
    } else {
      setBrouillon({ ...b, erreur: String(r.json.message ?? "Non enregistrée.") });
    }
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

  async function ajouterGenerale() {
    const texte = noteGenerale.trim();
    if (!texte) return;
    setNoteGenerale("");
    await enregistrer({ id: null, page_index: null, x: null, y: null, type: "idee", contenu: { texte }, ancre: null, erreur: null });
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
    setConfirmer(false);
    if (!r.ok) return setMessage({ texte: String(r.json.message), erreur: true });
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

  if (!tour || !courant) {
    return (
      <section className="ec-page">
        <p className="ec-surtitre">Magazine {magazine.rang} · {magazine.nom}</p>
        <h1 className="ec-h1">Bon à tirer</h1>
        <SelecteurMagazine token={p.token} magazines={magazines} rang={magazine.rang} />
        <p className="ec-texte">{v("L'atelier compose ce magazine. Le premier bon à tirer s'affichera ici dès sa publication.", "L'atelier compose ce magazine. Le premier bon à tirer s'affichera ici dès sa publication.")}</p>
      </section>
    );
  }

  const suivantTour = tours.find((t) => t.numero > tour.numero);
  const zonesVisibles = avant ? 0 : visibles.reduce((n, idx) => n + (tour.pages[idx]?.zones.length ?? 0), 0);
  const ligne = !estCourant
    ? "Ce tour est archivé : on ne peut plus y poser de note."
    : avant
      ? `Vous regardez la version du tour ${precedent?.numero}. Les zones en pointillé ont changé au tour ${tour.numero}.`
      : [
          modifiable ? v("Cliquez sur la page pour poser une note", "Clique sur la page pour poser une note") : p.lectureSeule ? "Ce lien permet de tout voir, sans rien modifier" : null,
          precedent && zonesVisibles ? `${zonesVisibles} zone${zonesVisibles > 1 ? "s" : ""} modifiée${zonesVisibles > 1 ? "s" : ""} ici, entourée${zonesVisibles > 1 ? "s" : ""} en orange` : null,
          precedent && resume ? `${resume.modifiees} page${resume.modifiees > 1 ? "s" : ""} modifiée${resume.modifiees > 1 ? "s" : ""} depuis le tour ${precedent.numero}` : null,
          resume?.nouvelles ? `${resume.nouvelles} nouvelle${resume.nouvelles > 1 ? "s" : ""} page${resume.nouvelles > 1 ? "s" : ""}` : null,
          resume?.retirees.length ? `retirée${resume.retirees.length > 1 ? "s" : ""} depuis le tour ${precedent?.numero} : ${resume.retirees.map((r) => r + 1).join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const feuille = (idx: number) => {
    const page = tour.pages[idx];
    const ancienne = avant && page ? (page.apparie_a !== null ? precedent?.pages[page.apparie_a] ?? null : null) : null;
    const url = avant ? ancienne?.url ?? null : page?.url ?? null;
    const zones: Zone[] = page && page.apparie_a !== null && precedent ? page.zones : [];
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
        {!avant && precedent && page && page.apparie_a === null ? <span className="ec-bat-tag">Nouvelle page</span> : null}
        {epingles.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`ec-bat-epingle ec-bat-epingle--${etatNote(n)}`}
            style={{ left: `${n.x_pct}%`, top: `${n.y_pct}%` }}
            aria-label={`Note ${numero.get(n.id)}, ${LIBELLE_ETAT[etatNote(n)].toLowerCase()}`}
            onClick={(e) => {
              e.stopPropagation();
              setFiltre("toutes");
              document.getElementById(`ec-note-${n.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            {numero.get(n.id)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="ec-bat">
      {!estCourant && suivantTour ? (
        <p className="ec-bat-bandeau">
          Vous consultez le tour {tour.numero}, remplacé par le tour {suivantTour.numero} le {suivantTour.publieTexte}. Il reste visible, mais on ne peut plus l&apos;annoter.
        </p>
      ) : null}
      {valideLe ? (
        <p className="ec-bat-bandeau ec-bat-bandeau--ok">
          Bon à tirer du magazine {magazine.rang} validé {valideLe === "à l'instant" ? "à l'instant" : `le ${valideLe}`}. Il ne change plus.
        </p>
      ) : null}

      <header className="ec-bat-tete">
        <div className="ec-bat-tete-gauche">
          <h1 className="ec-h2 ec-bat-titre">Bon à tirer</h1>
          <div className="ec-bat-segments" role="group" aria-label="Tours">
            {tours.map((t) => (
              <button key={t.id} type="button" aria-pressed={t.id === tour.id} onClick={() => changerTour(t.id)}>
                Tour {t.numero}
                {t.id === courant.id && !valideLe ? " · en cours" : ""}
              </button>
            ))}
          </div>
          {p.responsable ? (
            <span className="ec-note">
              Responsable : <strong>{p.responsable}</strong>
            </span>
          ) : null}
        </div>
        <div className="ec-bat-tete-droite">
          {estCourant && tour.echeanceTexte && !valideLe ? (
            <span className="ec-note">
              Retours attendus avant le <strong>{tour.echeanceTexte}</strong>
            </span>
          ) : null}
          <Link href={`/edition/${p.token}/atelier`} prefetch={false} className="ec-bouton ec-bouton--clair">
            Relire avec l&apos;atelier en appel
          </Link>
        </div>
      </header>
      <SelecteurMagazine token={p.token} magazines={magazines} rang={magazine.rang} />

      <div className="ec-bat-corps">
        <div className={plein ? "ec-bat-lecteur ec-bat-lecteur--plein" : "ec-bat-lecteur"}>
          <div className="ec-bat-commandes">
            <div className="ec-bat-nav">
              <button type="button" className="ec-bat-rond" aria-label={etroit ? "Page précédente" : "Double page précédente"} disabled={i === 0} onClick={() => aller(i - 1)}>
                ‹
              </button>
              <span>
                {libelleDouble(visibles)} <span className="ec-bat-gris">sur {tour.pages.length}</span>
              </span>
              <button type="button" className="ec-bat-rond" aria-label={etroit ? "Page suivante" : "Double page suivante"} disabled={i >= doubles.length - 1} onClick={() => aller(i + 1)}>
                ›
              </button>
            </div>
            <div className="ec-bat-nav">
              {precedent ? (
                <div className="ec-bat-segments ec-bat-segments--orange" role="group" aria-label="Avant ou après">
                  <button type="button" aria-pressed={avant} onClick={() => setVue("avant")}>
                    Avant · tour {precedent.numero}
                  </button>
                  <button type="button" aria-pressed={!avant} onClick={() => setVue("apres")}>
                    Après · tour {tour.numero}
                  </button>
                </div>
              ) : null}
              <button type="button" className="ec-bouton ec-bouton--clair ec-bat-plein" onClick={() => setPlein((x) => !x)}>
                {plein ? "Quitter le plein écran" : "Plein écran"}
              </button>
            </div>
          </div>

          <div className="ec-bat-scene" ref={scene}>
            <div className={`ec-bat-double${visibles.length === 1 && !etroit ? " ec-bat-double--droite" : ""}`}>{visibles.map(feuille)}</div>

            {brouillon && brouillon.page_index !== null ? (
              <FenetreNote
                b={brouillon}
                numero={brouillon.id ? numero.get(brouillon.id) ?? null : notes.length + 1}
                tu={p.tu}
                photo={photoChoisie}
                onChamp={champ}
                onType={(type) => setBrouillon((b) => (b ? { ...b, type, erreur: null } : b))}
                onFermer={() => setBrouillon(null)}
                onEnregistrer={() => enregistrer(brouillon)}
                onPhotos={ouvrirPhotos}
              />
            ) : null}
          </div>

          <p className="ec-bat-ligne">{ligne}</p>

          <div className="ec-bat-bande" aria-label="Pages">
            <button type="button" className="ec-bat-vignette ec-bat-vignette--couv" onClick={() => setCouvOuverte(true)}>
              <span className="ec-bat-vignette-couv">{couvChoisie?.c1 ? <img src={couvChoisie.c1} alt="" loading="lazy" /> : null}</span>
              <span>{choix.sans ? "Couverture · sans préférence" : couvChoisie ? `Couverture ${couvChoisie.rang} · votre choix` : "Couverture · à choisir"}</span>
              <span className="ec-bat-orange">{p.bat.couvertures.length ? "Voir les propositions" : "Couverture"}</span>
            </button>
            {doubles.map((d, k) => {
              const nb = notesDuTour.filter((n) => n.page_index !== null && d.includes(n.page_index)).length;
              const modif = d.some((idx) => (tour.pages[idx]?.zones.length ?? 0) > 0 || (precedent && tour.pages[idx]?.apparie_a === null));
              return (
                <button key={k} type="button" className="ec-bat-vignette" aria-current={k === i ? "true" : undefined} onClick={() => aller(k)}>
                  <span className={d.length === 1 ? "ec-bat-vignette-pages ec-bat-vignette-pages--seule" : "ec-bat-vignette-pages"}>
                    {d.map((idx) => {
                      const page = tour.pages[idx];
                      const src = page?.vignette ?? null;
                      return src ? <img key={idx} src={src} alt="" loading="lazy" /> : <span key={idx} />;
                    })}
                  </span>
                  <span>
                    {d.map((x) => x + 1).join(" et ")}
                    {nb ? ` · ${nb} note${nb > 1 ? "s" : ""}` : ""}
                  </span>
                  {modif ? <span className="ec-bat-orange">modifiée</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="ec-bat-notes" aria-labelledby="ec-bat-notes-titre">
          <div className="ec-bat-notes-tete">
            <h2 className="ec-h2" id="ec-bat-notes-titre">
              Notes
            </h2>
            <span className="ec-note">
              {compte.a_traiter} à traiter · {compte.resolues} résolue{compte.resolues > 1 ? "s" : ""}
            </span>
          </div>
          <p className="ec-note">
            Seul le responsable du bon à tirer peut noter et valider. Les autres personnes de l&apos;équipe voient la maquette sans pouvoir l&apos;annoter.
          </p>
          <div className="ec-puces">
            {FILTRES_NOTES.map((f) => (
              <button key={f.cle} type="button" className="ec-onglet" aria-pressed={filtre === f.cle} onClick={() => setFiltre(f.cle)}>
                {f.libelle} · {compte[f.cle]}
              </button>
            ))}
          </div>
          {message ? (
            <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note ec-bat-orange"} role={message.erreur ? "alert" : "status"}>
              {message.texte}
            </p>
          ) : null}

          <ol className="ec-bat-liste">
            {filtrees.length === 0 ? <li className="ec-note">Aucune note ici.</li> : null}
            {filtrees.map((n) => {
              const etat = etatNote(n);
              const nt = numeroTour(n.tour_id);
              return (
                <li key={n.id} id={`ec-note-${n.id}`} className={`ec-bat-carte ec-bat-carte--${etat}`}>
                  <span className={`ec-bat-epingle ec-bat-epingle--${etat} ec-bat-epingle--fixe`}>{numero.get(n.id)}</span>
                  <div className="ec-bat-carte-corps">
                    <span className="ec-bat-carte-type">{TYPES_NOTE.find((t) => t.cle === n.type)?.libelle ?? n.type}</span>
                    <span>{resumeNote(n.type, n.contenu) || "…"}</span>
                    <span className="ec-note">
                      {n.page_index === null ? "Note générale" : `Page ${n.page_index + 1}`} · posée au tour {nt} ·{" "}
                      <strong className={etat === "resolue" ? undefined : "ec-bat-orange"}>{LIBELLE_ETAT[etat]}</strong>
                    </span>
                    {n.reponse_atelier ? (
                      <span className="ec-bat-reponse">
                        {n.reponse_atelier}
                        <span className="ec-note">L&apos;atelier Bellajour</span>
                      </span>
                    ) : null}
                    {modifiable && etat === "brouillon" && n.tour_id === tour.id && !n.id.startsWith("tmp-") ? (
                      <span className="ec-actions">
                        {n.page_index !== null ? (
                          <button type="button" className="ec-bouton ec-bouton--clair ec-bat-petit" onClick={() => modifierBrouillon(n)}>
                            Modifier
                          </button>
                        ) : null}
                        <button type="button" className="ec-bouton ec-bouton--clair ec-bat-petit" onClick={() => retirer(n)}>
                          Retirer
                        </button>
                      </span>
                    ) : null}
                    {modifiable && (etat === "a_traiter" || etat === "resolue") ? (
                      <button type="button" className="ec-bouton ec-bouton--clair ec-bat-petit" onClick={() => basculer(n)}>
                        {etat === "resolue" ? "Rouvrir la note" : "Marquer comme résolue"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>

          {modifiable ? (
            <div className="ec-bat-pied">
              <label className="ec-curseur">
                Note générale
                <textarea
                  className="ec-champ ec-bat-zone-texte"
                  rows={2}
                  value={noteGenerale}
                  placeholder="Une note qui concerne tout le magazine"
                  onChange={(e) => setNoteGenerale(e.target.value)}
                />
              </label>
              {noteGenerale.trim() ? (
                <button type="button" className="ec-bouton ec-bouton--clair" onClick={ajouterGenerale}>
                  Ajouter la note générale
                </button>
              ) : null}
              <button type="button" className="ec-bouton ec-bat-large" disabled={occupe || brouillons.length === 0} onClick={envoyer}>
                Envoyer mes notes à l&apos;atelier{brouillons.length ? ` (${brouillons.length})` : ""}
              </button>
              {!confirmer ? (
                <button type="button" className="ec-bouton ec-bouton--clair ec-bat-large" disabled={occupe} onClick={() => setConfirmer(true)}>
                  Tout est bon : valider le bon à tirer
                </button>
              ) : (
                <div className="ec-bat-confirmer" role="group" aria-label="Confirmer la validation">
                  {brouillons.length ? (
                    <p className="ec-note ec-note--erreur">
                      {brouillons.length} note{brouillons.length > 1 ? "s" : ""} pas encore envoyée{brouillons.length > 1 ? "s" : ""} : {v("envoyez-les ou retirez-les d'abord", "envoie-les ou retire-les d'abord")}.
                    </p>
                  ) : null}
                  {!choix.id && !choix.sans ? (
                    <p className="ec-note ec-note--erreur">
                      {v("Choisissez d'abord une couverture, ou « Sans préférence ».", "Choisis d'abord une couverture, ou « Sans préférence ».")}{" "}
                      <button type="button" className="ec-lien-texte" onClick={() => setCouvOuverte(true)}>
                        Voir les propositions
                      </button>
                    </p>
                  ) : null}
                  <p className="ec-texte">{texteValidationBat(p.tirage)}</p>
                  <div className="ec-actions">
                    <button type="button" className="ec-bouton" disabled={occupe || brouillons.length > 0 || (!choix.id && !choix.sans)} onClick={valider}>
                      Valider définitivement
                    </button>
                    <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setConfirmer(false)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {!confirmer ? <p className="ec-note">{texteValidationBat(p.tirage)}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>

      {couvOuverte ? (
        <div className="ec-bat-couv" role="dialog" aria-modal="true" aria-label="Vos couvertures">
          <div className="ec-bat-couv-tete">
            <div>
              <p className="ec-bat-surtitre">Arrivées avec le premier bon à tirer</p>
              <h2 className="ec-h1 ec-bat-couv-titre">{v("Vos propositions de couverture", "Tes propositions de couverture")}</h2>
              <p className="ec-texte">
                {modifiable
                  ? v("Cliquez sur celle que vous préférez. Vous pouvez changer d'avis jusqu'à la validation du bon à tirer.", "Clique sur celle que tu préfères. Tu peux changer d'avis jusqu'à la validation du bon à tirer.")
                  : "Les propositions de l'atelier pour ce magazine."}
              </p>
            </div>
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setCouvOuverte(false)}>
              Fermer
            </button>
          </div>

          {p.bat.couvertures.length === 0 ? (
            <p className="ec-texte">Aucune proposition de couverture n&apos;est arrivée avec ce bon à tirer.</p>
          ) : (
            <div className="ec-bat-propositions">
              {p.bat.couvertures.map((c) => {
                const retenue = choix.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="ec-bat-proposition"
                    aria-pressed={retenue}
                    disabled={!modifiable}
                    aria-label={`Proposition ${c.rang}${retenue ? ", votre choix" : ""}`}
                    onClick={() => choisirCouverture({ couvertureId: c.id })}
                  >
                    <span className="ec-bat-livre">
                      <span className="ec-bat-livre-couv">
                        {c.c1 ? <img src={c.c1} alt="" loading="lazy" /> : null}
                        <span className="ec-bat-livre-dos" />
                        <span className="ec-bat-livre-reflet" />
                      </span>
                      <span className="ec-bat-livre-sol" />
                    </span>
                    <span className="ec-bat-proposition-nom">
                      <span>Proposition {c.rang}</span>
                      <span className={retenue ? "ec-bat-pastille ec-bat-pastille--oui" : "ec-bat-pastille"}>{retenue ? "Votre choix" : modifiable ? "Choisir" : ""}</span>
                    </span>
                    {c.legende ? <span className="ec-note">{c.legende}</span> : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="ec-bat-couv-bas">
            {couvInterieur ? (
              <div>
                <p className="ec-bat-surtitre">L&apos;intérieur de la couverture · proposition {couvInterieur.rang}{couvChoisie ? "" : ", en attendant le choix"}</p>
                <div className="ec-bat-ouvert">
                  <figure>
                    <span className="ec-bat-ouvert-g">{couvInterieur.c2 ? <img src={couvInterieur.c2} alt="2e de couverture" loading="lazy" /> : null}</span>
                    <figcaption>2e de couverture</figcaption>
                  </figure>
                  <figure>
                    <span className="ec-bat-ouvert-d">{couvInterieur.c3 ? <img src={couvInterieur.c3} alt="3e de couverture" loading="lazy" /> : null}</span>
                    <figcaption>3e de couverture</figcaption>
                  </figure>
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="ec-bat-couv-choix">
              <button
                type="button"
                className="ec-bouton ec-bouton--clair"
                aria-pressed={choix.sans}
                disabled={!modifiable}
                onClick={() => choisirCouverture({ sans_preference: true })}
              >
                Sans préférence, l&apos;atelier choisit
              </button>
              <p className="ec-texte">
                {choix.sans
                  ? v("L'atelier choisira pour vous.", "L'atelier choisira pour toi.")
                  : couvChoisie
                    ? `L'atelier finalise le magazine avec la proposition ${couvChoisie.rang}.`
                    : "Aucune couverture choisie pour l'instant."}
              </p>
              <label className="ec-curseur">
                Une note sur la couverture
                <textarea
                  className="ec-champ ec-bat-zone-texte"
                  rows={2}
                  value={noteCouv}
                  disabled={!modifiable}
                  placeholder="Le titre, la photo, un détail à changer"
                  onChange={(e) => setNoteCouv(e.target.value)}
                />
              </label>
              {modifiable ? (
                <button type="button" className="ec-bouton ec-bouton--clair" disabled={occupe} onClick={enregistrerNoteCouv}>
                  Enregistrer la note
                </button>
              ) : null}
              <p className="ec-note">Le choix et la note sont enregistrés tout de suite ; l&apos;atelier les lit avec le bon à tirer.</p>
              {message ? <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note"}>{message.texte}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {photos.ouvert && brouillon ? (
        <div className="ec-panneau-voile" onClick={() => setPhotos((x) => ({ ...x, ouvert: false }))}>
          <div className="ec-panneau ec-bat-photos" role="dialog" aria-modal="true" aria-label="Choisir une photo" onClick={(e) => e.stopPropagation()}>
            <div className="ec-panneau-tete">
              <h2 className="ec-h2">Choisir une photo</h2>
              <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setPhotos((x) => ({ ...x, ouvert: false }))}>
                Fermer
              </button>
            </div>
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
          </div>
        </div>
      ) : null}
    </section>
  );
}

const LIBELLE_ETAT = { brouillon: "Pas encore envoyée", a_traiter: "À traiter", resolue: "Résolue", retiree: "Retirée" } as const;

function SelecteurMagazine({ token, magazines, rang }: { token: string; magazines: MagazineBat[]; rang: number }) {
  if (magazines.length < 2) return null;
  return (
    <nav className="ec-onglets ec-bat-magazines" aria-label="Magazines">
      {magazines.map((m) => (
        <Link
          key={m.id}
          href={`/edition/${token}/bat?m=${m.rang}`}
          prefetch={false}
          className="ec-onglet"
          aria-current={m.rang === rang ? "page" : undefined}
        >
          Magazine {m.rang} · {m.nom}
          {m.bat_valide_le ? " · validé" : m.toursPublies ? "" : " · en composition"}
        </Link>
      ))}
    </nav>
  );
}

/* La fenêtre d'une note : à l'endroit du clic sur un écran large, en bas de
   l'écran sur un téléphone (bat.css). */
function FenetreNote(f: {
  b: Brouillon;
  numero: number | null;
  tu: boolean;
  photo: PhotoChoix | null;
  onChamp: (cle: string, valeur: string) => void;
  onType: (type: string) => void;
  onFermer: () => void;
  onEnregistrer: () => void;
  onPhotos: () => void;
}) {
  const v = (vous: string, toi: string) => (f.tu ? toi : vous);
  const c = f.b.contenu;
  const style = f.b.ancre ? { left: `min(${Math.max(8, f.b.ancre.left - 40)}px, calc(100% - 396px))`, top: `${Math.max(8, f.b.ancre.top + 16)}px` } : undefined;
  return (
    <div className="ec-bat-fenetre" role="dialog" aria-label="Nouvelle note" style={style} onClick={(e) => e.stopPropagation()}>
      <div className="ec-bat-fenetre-tete">
        <span className="ec-bat-epingle ec-bat-epingle--brouillon ec-bat-epingle--fixe">{f.numero ?? "·"}</span>
        <strong>
          {f.b.id ? "Modifier la note" : "Nouvelle note"} · page {(f.b.page_index ?? 0) + 1}
        </strong>
        <button type="button" className="ec-bat-fermer" aria-label="Annuler la note" onClick={f.onFermer}>
          ×
        </button>
      </div>
      <div className="ec-bat-types">
        {TYPES_NOTE.map((t) => (
          <button key={t.cle} type="button" aria-pressed={f.b.type === t.cle} onClick={() => f.onType(t.cle)}>
            {t.libelle}
          </button>
        ))}
      </div>
      {f.b.type === "texte" ? (
        <>
          <label className="ec-curseur">
            Le texte à corriger
            <input className="ec-champ" value={c.cible ?? ""} placeholder="Recopiez quelques mots" onChange={(e) => f.onChamp("cible", e.target.value)} />
          </label>
          <label className="ec-curseur">
            Remplacer par
            <textarea className="ec-champ ec-bat-zone-texte" rows={2} value={c.remplacement ?? ""} placeholder="Collez ou écrivez le nouveau texte" onChange={(e) => f.onChamp("remplacement", e.target.value)} />
          </label>
        </>
      ) : null}
      {f.b.type === "photo" ? (
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
            {v("Ou décrivez la photo voulue", "Ou décris la photo voulue")}
            <textarea className="ec-champ ec-bat-zone-texte" rows={2} value={c.description ?? ""} placeholder="Une photo où l'on voit toute l'équipe" onChange={(e) => f.onChamp("description", e.target.value)} />
          </label>
        </>
      ) : null}
      {f.b.type === "idee" ? (
        <label className="ec-curseur">
          {v("Ce que vous aimeriez", "Ce que tu aimerais")}
          <textarea className="ec-champ ec-bat-zone-texte" rows={3} value={c.texte ?? ""} placeholder="Un texte qui raconte la remise des prix, par exemple" onChange={(e) => f.onChamp("texte", e.target.value)} />
        </label>
      ) : null}
      {f.b.type === "retirer" ? (
        <label className="ec-curseur">
          {v("L'élément touché sera retiré de la page. Une raison, si vous voulez :", "L'élément touché sera retiré de la page. Une raison, si tu veux :")}
          <textarea className="ec-champ ec-bat-zone-texte" rows={2} value={c.raison ?? ""} placeholder="Une personne ne souhaite pas apparaître" onChange={(e) => f.onChamp("raison", e.target.value)} />
        </label>
      ) : null}
      {f.b.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {f.b.erreur}
        </p>
      ) : null}
      <div className="ec-actions ec-bat-fenetre-actions">
        <button type="button" className="ec-bouton ec-bouton--clair" onClick={f.onFermer}>
          Annuler
        </button>
        <button type="button" className="ec-bouton" onClick={f.onEnregistrer}>
          {f.b.id ? "Enregistrer" : "Ajouter la note"}
        </button>
      </div>
      <p className="ec-note">{v("Enregistrée tout de suite. L'atelier la reçoit quand vous envoyez vos notes.", "Enregistrée tout de suite. L'atelier la reçoit quand tu envoies tes notes.")}</p>
    </div>
  );
}
