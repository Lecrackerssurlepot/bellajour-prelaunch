"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MODELE_PLANCHE, MODELE_REGARD, MOT_ROLE, MOT_SUJET, ROLES_PLANCHE, SUJETS_IA, aEnvoyer, choisirPourRegard, cleDeRoute, corrigerTag, entonnoirA,
  estCleLibre, estRolePlanche, estimer, indiceDuProjet, motDollars, photosLues, planchesDe, relierLectureIA, triDe, versLectureIA,
  type Correction, type EtatEditeur, type LectureIA, type LuPlanche, type LuRegard, type PhotoIA,
} from "@/lib/mise-en-page/editeur";
import { cls, pluriel, useEd } from "./contexte";
import { grandeDe } from "./images";
import { garderLectureIA } from "./lectureIAClient";
import { composerPlanche, imageRegard, lirePlanche, regarder } from "./lireLesPhotosClient";

/* « Lire les photos » (17/11) : un bouton dans la tête du panneau Photos. Avant de lancer, une ligne dit ce que ça coûtera
   (« N photos · M lues par l'IA · ≈ X $ », d'après l'essai du 17/11) ; un clic lance. Les tags arrivent planche par planche sur les
   vignettes, puis le regard fin ; « Arrêter » à tout moment. Une photo déjà lue n'est jamais renvoyée (« Relire tout » sur demande).
   Le coût réel se dit une fois à la fin. Les photos de CLIENTS attendent leur accord (T-203) : le bouton est grisé et le dit. */

const EN_VOL = 3;
type Phase =
  | { type: "repos" }
  | { type: "planches"; fait: number; total: number }
  | { type: "regard"; fait: number; total: number }
  | { type: "fini"; texte: string }
  | { type: "erreur"; texte: string };

const MOT_ERREUR: Readonly<Record<string, string>> = {
  photos_clients_non_autorisees: "Photos de clients : accord à venir",
  openai_absente: "Clé OpenAI absente",
  non_authentifie: "Session expirée",
  openai_sature: "OpenAI saturé, réessayer",
};

export function BoutonLireLesPhotos() {
  const { etat, envoyer, adresses, cleProjet, lectureSeule: ro } = useEd();
  const etatRef = useRef<EtatEditeur>(etat);
  useEffect(() => { etatRef.current = etat; });
  const [ouvert, setOuvert] = useState(false);
  const [phase, setPhase] = useState<Phase>({ type: "repos" });
  const racine = useRef<HTMLSpanElement>(null);
  /* le panneau se referme d'un clic ailleurs (la lecture continue, le bouton dit où elle en est) */
  useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: PointerEvent) => { if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener("pointerdown", ailleurs);
    return () => document.removeEventListener("pointerdown", ailleurs);
  }, [ouvert]);
  const arret = useRef<AbortController | null>(null);
  const cle = cleProjet ? cleDeRoute(cleProjet) : "";
  const libre = estCleLibre(cle);
  const enCours = phase.type === "planches" || phase.type === "regard";

  /* l'annonce, recalculée à chaque rendu (rien n'est payé) */
  const cat = etat.catalogue;
  const lues = photosLues(etat.lectureIA?.source ?? null, cat);
  const A = entonnoirA(cat, etat.lecture, new Set(triDe(etat.magazine).ecartees));
  const nouvelles = aEnvoyer(A.lues, lues, false).length;
  const est = estimer(nouvelles);
  const estTout = estimer(A.lues.length);

  const publier = (l: LectureIA) => {
    envoyer({ type: "poserLectureIA", lecture: l });
    if (cleProjet) void garderLectureIA(cleProjet, l);
  };

  const lancer = async (toutRelire: boolean) => {
    const e0 = etatRef.current;
    const c0 = e0.catalogue;
    const a = entonnoirA(c0, e0.lecture, new Set(triDe(e0.magazine).ecartees));
    const ids = aEnvoyer(a.lues, photosLues(e0.lectureIA?.source ?? null, c0), toutRelire);
    const base = e0.lectureIA?.source ?? null;
    const ctrl = new AbortController();
    arret.current = ctrl;
    const planche = new Map<string, LuPlanche>(), regard = new Map<string, LuRegard>();
    const modeles = new Set<string>();
    let dollars = 0;
    let echecs = 0;
    let bloquant: string | null = null;
    const quand = () => new Date().toISOString();
    const maj = () => publier(versLectureIA(base, etatRef.current.catalogue, { planche, regard, dollars, modeles: [...modeles], quand: quand() }));

    /* B : les planches, trois en vol */
    const lots = planchesDe(ids);
    setPhase({ type: "planches", fait: 0, total: lots.length });
    let suivant = 0, faits = 0;
    const ouvrier = async () => {
      while (!ctrl.signal.aborted && !bloquant && suivant < lots.length) {
        const lot = lots[suivant++];
        const image = await composerPlanche(lot.ids.map((id) => grandeDe(adresses.get(id))), lot.n0, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const r = await lirePlanche(cle, image, lot.n0, lot.ids.length, ctrl.signal);
        dollars += r.dollars;
        if (r.ok) {
          modeles.add(r.modele || MODELE_PLANCHE);
          for (const x of r.resultat.photos) { const id = lot.ids[x.numero - lot.n0]; if (id) planche.set(id, x); }
          maj();
        } else if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur;
        else if (r.erreur !== "arrete") echecs += 1;
        faits += 1;
        setPhase({ type: "planches", fait: faits, total: lots.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(EN_VOL, lots.length) }, ouvrier));

    /* C : le regard fin, sur la lecture réunie (les photos lues avant comprises) */
    if (!ctrl.signal.aborted && !bloquant) {
      const tout = versLectureIA(base, etatRef.current.catalogue, { planche, regard, dollars, modeles: [...modeles], quand: quand() });
      const rel = relierLectureIA(tout, etatRef.current.catalogue);
      const avecB = [...rel.photos].filter(([, p]) => p.candidate !== undefined).map(([id, p]) => ({ id, candidate: p.candidate ?? "aucune", interet: p.role?.interet ?? 0, texte: !!p.texte }));
      const deja = new Set([...rel.photos].filter(([, p]) => p.regard).map(([id]) => id));
      const choix = choisirPourRegard(avecB, deja);
      const indice = indiceDuProjet(etatRef.current.projet?.nom);
      setPhase({ type: "regard", fait: 0, total: choix.length });
      let k = 0, fait = 0;
      const regardeur = async () => {
        while (!ctrl.signal.aborted && !bloquant && k < choix.length) {
          const x = choix[k++];
          const image = await imageRegard(grandeDe(adresses.get(x.id)), ctrl.signal);
          if (image && !ctrl.signal.aborted) {
            const r = await regarder(cle, image, x.pourquoi, indice, ctrl.signal);
            dollars += r.dollars;
            if (r.ok) { modeles.add(r.modele || MODELE_REGARD); regard.set(x.id, r.resultat); maj(); }
            else if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur;
            else if (r.erreur !== "arrete") echecs += 1;
          }
          fait += 1;
          setPhase({ type: "regard", fait, total: choix.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(EN_VOL, choix.length) }, regardeur));
    }
    /* le coût réel, même arrêté, même en échec : ce qui a été payé est compté */
    if (planche.size || regard.size || dollars) maj();
    arret.current = null;
    const bilan = `Lu : ${pluriel(planche.size, "photo")} · ${motDollars(dollars)}`;
    if (bloquant) setPhase({ type: "erreur", texte: MOT_ERREUR[bloquant] ?? "Lecture impossible" });
    else setPhase({ type: "fini", texte: ctrl.signal.aborted ? `Arrêté · ${bilan}` : echecs ? `${bilan} · ${pluriel(echecs, "échec")}` : bilan });
  };

  const arreter = () => arret.current?.abort();

  return (
    <span className="ed-lire" ref={racine}>

      <button type="button" className={cls("ed-bt", !libre && "ed-bt--gris")} aria-expanded={ouvert} aria-disabled={!libre || ro}
        title={libre ? "Tags rôle et sujet, par l'IA" : "Photos de clients : accord à venir"}
        onClick={() => setOuvert((o) => !o)}>
        {enCours ? (phase.type === "planches" ? `Planches ${phase.fait}/${phase.total}` : `Regard ${phase.fait}/${phase.total}`) : "Lire les photos"}
      </button>
      {ouvert ? (
        <div className="ed-lire-pan" role="dialog" aria-label="Lire les photos">
          {!libre ? <p className="ed-lire-l">Photos de clients : accord à venir</p> : enCours ? (
            <>
              <p className="ed-lire-l">{phase.type === "planches" ? `Planches ${phase.fait} sur ${phase.total}` : `Regard fin ${phase.fait} sur ${phase.total}`}</p>
              <span className="ed-lire-jauge" aria-hidden="true"><i style={{ width: `${phase.total ? (phase.fait / phase.total) * 100 : 0}%` }} /></span>
              <button type="button" className="ed-bt" onClick={arreter}>Arrêter</button>
            </>
          ) : (
            <>
              {phase.type === "fini" || phase.type === "erreur" ? <p className={cls("ed-lire-l", "ed-lire-fin", phase.type === "erreur" && "ed-lire-err")} role="status">{phase.texte}</p> : null}
              <p className="ed-lire-l">{pluriel(cat.size, "photo")} · {nouvelles} lues par l&apos;IA · ≈ {motDollars(est.dollars)}</p>
              <span className="ed-lire-gestes">
                <button type="button" className="ed-bt ed-bt--plein" disabled={ro || !nouvelles} onClick={() => { void lancer(false); }}>Lancer</button>
                {lues.size ? (
                  <button type="button" className="ed-lien" disabled={ro || !A.lues.length} title={`${A.lues.length} lues par l'IA · ≈ ${motDollars(estTout.dollars)}`}
                    onClick={() => { void lancer(true); }}>Relire tout</button>
                ) : null}
              </span>
            </>
          )}
        </div>
      ) : null}
    </span>
  );
}

/* ─── sur la vignette : le rôle et le sujet lus, un clic ouvre le petit choix qui les corrige (R193, R194) ─── */

const MENU_L = 280, MENU_H = 150;

export function TagsLus({ id, p }: { id: string; p: PhotoIA | undefined }) {
  const { etat, envoyer, cleProjet, lectureSeule: ro } = useEd();
  const [ouvert, setOuvert] = useState<{ x: number; y: number } | null>(null);
  if (!p?.role && !p?.sujet) return null;
  const role = p.role?.role;
  const montrerRole = estRolePlanche(role);
  const montrerSujet = !!p.sujet && p.sujet !== "autre";
  if (!montrerRole && !montrerSujet) return null;
  const corriger = (q: Correction) => {
    setOuvert(null);
    const src = etat.lectureIA?.source;
    if (!src) return;
    const r = corrigerTag(src, etat.catalogue, id, q);
    if (!r) return;
    envoyer({ type: "poserLectureIA", lecture: r.lecture });
    if (cleProjet) void garderLectureIA(cleProjet, r.lecture);
    if (r.lecon) envoyer({ type: "ajouterLecon", lecon: r.lecon });
  };
  const ouvrir = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    if (ro) return;
    /* le petit choix fait ≈ 270 × 150 px : il s'ouvre sous le tag, ou au-dessus s'il n'y a pas la place, sans sortir de l'écran */
    const b = e.currentTarget.getBoundingClientRect();
    const haut = b.bottom + 4 + MENU_H > window.innerHeight ? Math.max(4, b.top - 4 - MENU_H) : b.bottom + 4;
    setOuvert(ouvert ? null : { x: Math.max(4, Math.min(b.left, window.innerWidth - MENU_L - 4)), y: haut });
  };
  const corr = p.corrige;
  return (
    <>
      {montrerRole ? (
        <span className={cls("ed-rep ed-rep--lu", corr?.role && "ed-rep--corrige")} role="button" tabIndex={-1} title={corr?.role ? "Rôle corrigé" : "Rôle lu par l'IA · corriger"}
          onPointerDown={(e) => e.stopPropagation()} onClick={ouvrir}>{MOT_ROLE[role]}</span>
      ) : null}
      {montrerSujet && p.sujet ? (
        <span className={cls("ed-rep ed-rep--lu ed-rep--sujet", corr?.sujet && "ed-rep--corrige")} role="button" tabIndex={-1} title={corr?.sujet ? "Sujet corrigé" : "Sujet lu par l'IA · corriger"}
          onPointerDown={(e) => e.stopPropagation()} onClick={ouvrir}>{MOT_SUJET[p.sujet]}</span>
      ) : null}
      {/* en portail : la vignette coupe ce qui déborde, et le verre du panneau retient un `fixed` */}
      {ouvert && typeof document !== "undefined" ? createPortal(
        <span onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <span className="ed-ou-fond" onClick={() => setOuvert(null)} />
          <span className="ed-menu ed-tag-menu" role="menu" aria-label="Corriger" style={{ left: ouvert.x, top: ouvert.y }}>
            <span className="ed-tag-menu-t">Rôle</span>
            <span className="ed-tag-menu-l">
              {ROLES_PLANCHE.map((r) => (
                <button key={r} type="button" role="menuitemradio" aria-checked={role === r} onClick={() => corriger({ role: r })}>{MOT_ROLE[r]}</button>
              ))}
            </span>
            <span className="ed-tag-menu-t">Sujet</span>
            <span className="ed-tag-menu-l">
              {SUJETS_IA.map((s) => (
                <button key={s} type="button" role="menuitemradio" aria-checked={p.sujet === s} onClick={() => corriger({ sujet: s })}>{MOT_SUJET[s]}</button>
              ))}
            </span>
          </span>
        </span>,
        document.querySelector(".mep-editeur") ?? document.body,
      ) : null}

    </>
  );
}
