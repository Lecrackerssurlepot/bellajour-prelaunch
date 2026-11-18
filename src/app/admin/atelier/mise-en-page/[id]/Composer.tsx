"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MODELE_PLANCHE, MODELE_REGARD, aEnvoyer, arretIllisibles, choisirPourRegard, choisirReperes, cleDeRoute, entonnoirA, estCleLibre, estimerComposition,
  heriterPlanche, indiceDuProjet, lectureSuspecte, lireReponseVoyage, motDollars, photosLues, planDegradation, planchesDe, plancheSansVide, relierLectureIA,
  releveVoyage, triDe, verdictsDeLecture, versLectureIA,
  type CibleDepot, type EtatEditeur, type LectureIA, type LieuxIA, type LuPlanche, type LuRegard, type Suspicion, type VerdictLu, type VoyageIA,
} from "@/lib/mise-en-page/editeur";
import {
  REGLAGES_EDITEUR, appliquerCorrections, autresTailles, composerSur, devinerFiche, entreeDepuisEditeur, leconsDesDifferences, lieuxDeTexte,
  releverDifferences, titreImprimable,
  type CorrectionsAtelier, type Difference, type EntreeCompo, type Fiche, type IssueCompo, type Luminance, type PhotoChoisie, type ReglagesV2,
  type ResultatCompo,
} from "@/lib/mise-en-page/compositeur";
import { BANC_18_11_COMPLEMENT, REGARD_COMPLEMENT_MAX, relierLectureIA as relier, type Lecon } from "@/lib/mise-en-page/editeur";
import { VueAnalyse } from "./Analyse";
import { completerLecture, estimerComplement } from "./completerClient";
import { envoyerEcarts } from "./leconsClient";
import { cadresPhotoCouverture, gabaritCouverture } from "@/lib/mise-en-page/couverture";
import { cls, pluriel, useEd, type Adresse } from "./contexte";
import { vignetteDe } from "./images";
import { garderLectureIA } from "./lectureIAClient";
import { chargerImages, composerPlanche, controlerImages, imageRegard, lirePlanche, regarder } from "./lireLesPhotosClient";
import {
  charger, empreinte, garder, garderLuminances, lireLieux, lireVoyage, luminance, luminancesGardees, plancheLieux, useGarde,
  type AutreTaille, type Garde, type Proposition,
} from "./composerClient";

/* « Composer le magazine » (C20, 18/11) : les questions (quatre champs facultatifs, pré-remplis par ce que la machine devine ; ce que
   l'atelier saisit prime ; le NOMBRE DE PAGES n'est plus demandé, M-15), l'analyse sous ses yeux (coût annoncé avant, réel après), puis la
   proposition chargée par le chemin du premier jet (une entrée d'historique : « Annuler » rend l'état d'avant). Rien n'écrase un magazine
   commencé sans « Remplacer la mise en page ? ». Le bandeau dit ce qui est posé, la taille et d'où elle vient, et offre les autres tailles
   avec leurs vrais chiffres ; « Posées et laissées » montre chaque photo et sa raison en mots d'atelier (M-02, E). Une photo de couverture
   qui revient à l'intérieur fait recomposer l'intérieur sans elle (M-10).
   M-13 (18/11 soir) : jamais une case vide chez l'IA (adresses relues, chaque image essayée à toutes ses tailles, une illisible est retirée
   de la planche, au-delà de 10 % on s'arrête AVANT de payer) ; une lecture douteuse ne sert pas à écarter et l'écran propose de la relire.
   M-14 : jamais d'impasse, jamais un message technique. */

const EN_VOL = 3;
type Etape = "images" | "mesures" | "planches" | "regard" | "complement" | "voyage" | "lieux" | "composition";
const MOT_ETAPE: Readonly<Record<Etape, string>> = { images: "Les images", mesures: "Mesures locales", planches: "Planches", regard: "Regard fin", voyage: "Le voyage", lieux: "Les lieux", complement: "Tags manquants", composition: "La composition" };
type Avance = { etat: "attente" | "encours" | "fait" | "saute"; fait?: number; total?: number; note?: string };
type Phase =
  | { type: "questions" }
  | { type: "analyse"; etapes: Record<Etape, Avance>; dollars: number }
  | { type: "arret"; texte: string; dollars: number }
  | { type: "erreur"; phrase: string; cause: string; geste: string; technique: string };
type Mode = "normal" | "relire" | "tout";

const MOT_ERREUR: Readonly<Record<string, string>> = {
  photos_clients_non_autorisees: "IA fermée : composition locale",
  openai_absente: "Clé OpenAI absente : composition locale",
  non_authentifie: "Session expirée",
};
const QUAND = () => new Date().toISOString();
const posees = (e: EtatEditeur): Set<string> => new Set(e.magazine.planches.flatMap((p) => [p.double, p.gauche, p.droite]).flatMap((d) => d?.photos.map((a) => a.photoId) ?? []).filter((x): x is string => !!x));

/** Les photos de couverture, par face (M-10). */
function facesCouverture(e: EtatEditeur): { premiere: string[]; quatrieme: string[] } | null {
  const c = e.magazine.couverture;
  const g = c ? gabaritCouverture(c.templateId) : null;
  if (!c || !g) return null;
  const cadres = cadresPhotoCouverture(g);
  const premiere: string[] = [], quatrieme: string[] = [];
  c.photos.forEach((a, i) => { if (a.photoId) (cadres[i]?.face === "quatrieme" ? quatrieme : premiere).push(a.photoId); });
  return premiere.length || quatrieme.length ? { premiere, quatrieme } : null;
}

/** M-13 : la lecture gardée fait-elle foi ? (les planches rejouées dans l'ordre d'envoi) */
function suspicionDe(e: EtatEditeur): Suspicion {
  const A = entonnoirA(e.catalogue, e.lecture, new Set(triDe(e.magazine).ecartees));
  return lectureSuspecte(verdictsDeLecture(e.lectureIA?.source ?? null, e.catalogue, A.lues));
}

/** M-13 : les marques de L'ATELIER : ses coups de cœur, et ses gardées sans celles que la machine a posées elle-même en chargeant la
 *  dernière proposition (sauf si l'atelier les gardait déjà avant). */
function marquesAtelier(e: EtatEditeur, p: Proposition | null): { coeurs: string[]; gardees: string[] } {
  const t = triDe(e.magazine);
  if (!p?.machine) return { coeurs: t.coupsDeCoeur, gardees: t.choisies };
  const machine = new Set(p.machine.choisies), avant = new Set(p.machine.avant);
  return { coeurs: t.coupsDeCoeur, gardees: t.choisies.filter((id) => !machine.has(id) || avant.has(id)) };
}

/** 18/11 soir : ce que l'atelier a corrigé dans l'Analyse (D12) et sa réponse à « Les lieux : aux chapitres seulement, ou partout ? ».
 *  L'éditeur compose en v2.1 (`REGLAGES_EDITEUR`) ; la v1 reste rejouable par le script de rejeu. */
type Extra = { corrections?: CorrectionsAtelier; lieux?: ReglagesV2["lieux"] };
const reglagesDe = (x: Extra): ReglagesV2 => ({ ...REGLAGES_EDITEUR, ...(x.lieux ? { lieux: x.lieux } : {}) });

function composerLocal(e: EtatEditeur, fiche: Fiche, luminances: ReadonlyMap<string, Luminance> | undefined, couverture: { premiere: string[]; quatrieme: string[] } | null,
  marques: { coeurs: string[]; gardees: string[] }, x: Extra = {}): IssueCompo {
  return composerSur(entreeLocale(e, fiche, luminances, couverture, marques, x));
}

function entreeLocale(e: EtatEditeur, fiche: Fiche, luminances: ReadonlyMap<string, Luminance> | undefined, couverture: { premiere: string[]; quatrieme: string[] } | null,
  marques: { coeurs: string[]; gardees: string[] }, x: Extra = {}): EntreeCompo {
  const t = triDe(e.magazine);
  const s = suspicionDe(e);
  return (entreeDepuisEditeur({
    catalogue: e.catalogue, lecture: e.lecture, lectureIA: e.lectureIA, ecarteesAtelier: new Set(t.ecartees), fiche,
    /* E (18/11) : le titre de page 1 est le nom du projet, jamais un nom par défaut de l'outil */
    titre: titreImprimable(e.projet?.nom), quand: QUAND(),
    ...(luminances ? { luminances } : {}), couverture,
    marques,
    douteuse: s.suspecte ? { photos: s.douteuses, toute: s.toute, raison: s.raisons.join(", ") } : null,
    pagesCommandees: e.projet?.nbPagesCible ?? null,
    reglages: reglagesDe(x), corrections: x.corrections ?? null,
  }));
}

/** La version du registre des règles, posée par la page serveur sur la racine de l'éditeur (le navigateur n'importe pas le registre). */
const versionReglesEcran = (): string => (typeof document !== "undefined" ? document.querySelector<HTMLElement>(".mep-editeur")?.dataset.versionRegles ?? "" : "");

function resumer(r: ResultatCompo, dollars: number, autres: AutreTaille[], avant: { gardees: string[] }, x: Extra = {}, fiche: Fiche = {}): Proposition {
  const garde = new Set(avant.gardees);
  return {
    quand: QUAND(), dollars, pages: r.pages, empreinte: "", autres,
    /* M-30 : la proposition gardée telle quelle (le magazine est relevé APRÈS le chargement, par le bandeau), ses règles et ses réglages */
    versionRegles: versionReglesEcran(), reglages: { v2: reglagesDe(x), fiche }, decisions: r.decisions, ...(r.doubles ? { doubles: r.doubles } : {}),
    empreinteJet: empreinte(r.jet.magazine.planches),
    machine: { choisies: (r.jet.magazine.tri?.choisies ?? []).filter((id) => !garde.has(id)), avant: [...avant.gardees] },
    resultat: { selection: r.selection, chapitres: r.chapitres, controle: r.controle, couverture: r.couverture, profil: r.profil, sobre: r.sobre, taille: r.taille, origineTaille: r.origineTaille, ajustement: r.ajustement },
  };
}

/** M-15 : les autres tailles, COMPOSÉES (leurs chiffres sont ceux d'un vrai magazine, jamais une estimation). */
function composerAutres(e: EtatEditeur, fiche: Fiche, r: ResultatCompo, lums: ReadonlyMap<string, Luminance> | undefined, marques: { coeurs: string[]; gardees: string[] }, ex: Extra = {}): AutreTaille[] {
  const out: AutreTaille[] = [];
  for (const a of autresTailles(r.pages, r.origineTaille, e.projet?.nbPagesCible ?? null)) {
    const x = composerLocal(e, { ...fiche, taille: a.taille }, lums, null, marques, ex);
    if (x.ok && x.r.pages !== r.pages && !out.some((o) => o.pages === x.r.pages)) out.push({ mot: a.mot, taille: a.taille, pages: x.r.pages, posees: x.r.selection.compte.posee });
  }
  return out;
}

/* ─────────────────────────── le bouton et la feuille ─────────────────────────── */

export function BoutonComposer() {
  const { etat, cleProjet, lectureSeule: ro } = useEd();
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => { if (cleProjet) void charger(cleProjet); }, [cleProjet]);
  const vide = etat.catalogue.size === 0;
  return (
    <>
      <button type="button" className="ed-bt ed-bt--plein" disabled={vide} title={vide ? "Importez d'abord vos photos" : ro ? "Lecture seule" : "Lire, analyser, composer"} onClick={() => setOuvert(true)}>
        Analyse
      </button>
      {ouvert && typeof document !== "undefined" ? createPortal(<Feuille fermer={() => setOuvert(false)} />, document.querySelector(".mep-editeur") ?? document.body) : null}
    </>
  );
}

function Feuille({ fermer }: { fermer: () => void }) {
  const { etat, envoyer, adresses, cleProjet, rafraichirAdresses, lectureSeule: ro } = useEd();
  const etatRef = useRef<EtatEditeur>(etat);
  useEffect(() => { etatRef.current = etat; });
  const garde = useGarde(cleProjet);
  const [saisie, setSaisie] = useState<Fiche>(garde.fiche);
  const [lieuxTexte, setLieuxTexte] = useState((garde.fiche.lieux ?? []).join(", "));
  const [phase, setPhase] = useState<Phase>({ type: "questions" });
  /* l'Analyse : les corrections (D12) et la réponse aux lieux, gardées avec le projet ; la proposition à confirmer (rien n'écrase sans oui) */
  const [corrections, setCorrections] = useState<CorrectionsAtelier>(garde.corrections ?? {});
  const [repLieux, setLieuxR] = useState<ReglagesV2["lieux"]>(garde.lieux ?? REGLAGES_EDITEUR.lieux);
  const [confirmer, setConfirmer] = useState<{ r: ResultatCompo; dollars: number; autres: AutreTaille[]; marques: { coeurs: string[]; gardees: string[] } } | null>(null);
  const [paye, setPaye] = useState<number | null>(null);
  const extra: Extra = { corrections, lieux: repLieux };
  const arret = useRef<AbortController | null>(null);
  const dernierMode = useRef<Mode>("normal");
  const cle = cleProjet ? cleDeRoute(cleProjet) : "";
  const [iaOuverte, setIaOuverte] = useState(estCleLibre(cle));
  useEffect(() => {
    if (!cle || estCleLibre(cle)) return;
    let annule = false;
    void fetch(`/api/admin/atelier/mise-en-page/lecture-ia?cle=${encodeURIComponent(cle)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null)).then((j: { ouvert?: boolean } | null) => { if (!annule) setIaOuverte(!!j?.ouvert); }).catch(() => {});
    return () => { annule = true; };
  }, [cle]);

  /* ce que la machine devine déjà (sans rien payer), pour pré-remplir */
  const devinee = useMemo(() => {
    const e = etat;
    return devinerFiche(entreeDepuisEditeur({ catalogue: e.catalogue, lecture: e.lecture, lectureIA: e.lectureIA, ecarteesAtelier: new Set(), fiche: {}, titre: "", quand: "" }).photos,
      null);
  }, [etat]);
  const vaut = <K extends keyof Fiche>(k: K): Fiche[K] => (saisie[k] !== undefined ? saisie[k] : devinee[k]);
  const poser = (p: Partial<Fiche>) => setSaisie((s) => ({ ...s, ...p }));

  const A = entonnoirA(etat.catalogue, etat.lecture, new Set(triDe(etat.magazine).ecartees));
  const dejaLues = photosLues(etat.lectureIA?.source ?? null, etat.catalogue);
  const susp = lectureSuspecte(verdictsDeLecture(etat.lectureIA?.source ?? null, etat.catalogue, A.lues));
  const sansGps = [...etat.catalogue.values()].every((p) => !p.gps);
  const roadTrip = (vaut("theme") ?? null) === "road_trip" || (!vaut("theme") && etat.lectureIA?.source.voyage?.type_voyage === "road_trip");
  const fiables = A.lues.filter((id) => dejaLues.has(id) && !susp.douteuses.has(id)).length;
  const est = estimerComposition(A.lues.length, fiables, roadTrip && sansGps);
  const estTout = estimerComposition(A.lues.length, 0, roadTrip && sansGps);
  const aRelire = A.lues.filter((id) => susp.douteuses.has(id)).length;

  const lancer = async (mode: Mode) => {
    dernierMode.current = mode;
    /* M-15 : la taille n'est jamais une question : une taille gardée d'avant n'est pas reprise, la machine la propose */
    const { taille: _t, ...sansTaille } = saisie;
    void _t;
    const fiche: Fiche = { ...sansTaille, ...(lieuxDeTexte(lieuxTexte).length ? { lieux: lieuxDeTexte(lieuxTexte) } : {}) };
    if (!lieuxDeTexte(lieuxTexte).length) delete fiche.lieux;
    if (cleProjet) void garder(cleProjet, { ...(garde as Garde), fiche, corrections, lieux: repLieux });
    const ctrl = new AbortController();
    arret.current = ctrl;
    const etapes: Record<Etape, Avance> = { images: { etat: "attente" }, mesures: { etat: "encours" }, planches: { etat: "attente" }, regard: { etat: "attente" }, complement: { etat: "attente" }, voyage: { etat: "attente" }, lieux: { etat: "attente" }, composition: { etat: "attente" } };
    let dollars = 0;
    const maj = () => setPhase({ type: "analyse", etapes: { ...etapes }, dollars });
    const e0 = etatRef.current;
    const cat = e0.catalogue;
    etapes.mesures = { etat: "fait", note: `${e0.lecture.mesurees} sur ${cat.size}` };
    maj();

    const base: LectureIA | null = e0.lectureIA?.source ?? null;
    const planche = new Map<string, LuPlanche>(), regard = new Map<string, LuRegard>();
    const modeles = new Set<string>();
    let voyage: VoyageIA | undefined, lieux: LieuxIA | undefined;
    let bloquant: string | null = null;
    /* M-13 : une phrase d'arrêt (images illisibles) : on s'arrête avant de payer plus */
    let arretPhrase: string | null = null;
    let douteuseLue = false;
    let table: ReadonlyMap<string, Adresse> = adresses;
    const lecture = () => versLectureIA(base, etatRef.current.catalogue, { planche, regard, dollars, modeles: [...modeles], quand: QUAND(), ...(voyage ? { voyage } : {}), ...(lieux ? { lieux } : {}) });
    const publier = () => { const l = lecture(); envoyer({ type: "poserLectureIA", lecture: l }); if (cleProjet) void garderLectureIA(cleProjet, l); };

    if (iaOuverte) {
      /* B : les planches (jamais deux fois la même photo, sauf « Relire » ; au-delà de 600, les autres héritent de leur voisine) */
      const susp0 = suspicionDe(e0);
      const deja = mode === "tout" ? new Set<string>() : new Set([...dejaLues].filter((id) => !susp0.douteuses.has(id)));
      const aLireTout = aEnvoyer(A.lues, deja, false);
      const empreintes = new Map(Object.entries(e0.lecture.mesures ?? {}).map(([id, m]) => [id, m.dhash]));
      const deg = planDegradation(aLireTout, empreintes);

      /* M-13 : AVANT de payer, chaque image est essayée (adresses relues si besoin, puis relues de force pour celles qui échouent) */
      if (deg.aLire.length) {
        etapes.images = { etat: "encours", fait: 0, total: deg.aLire.length };
        maj();
        const ctl = await controlerImages(deg.aLire, adresses, rafraichirAdresses, ctrl.signal, (fait, total) => { etapes.images = { etat: "encours", fait, total }; maj(); });
        table = ctl.adresses;
        if (ctrl.signal.aborted) { arret.current = null; setPhase({ type: "questions" }); return; }
        const a = arretIllisibles(deg.aLire.length, ctl.illisibles.size);
        if (a.arreter) { arret.current = null; setPhase({ type: "arret", texte: a.phrase, dollars: 0 }); return; }
        etapes.images = { etat: "fait", fait: deg.aLire.length - ctl.illisibles.size, total: deg.aLire.length, note: ctl.illisibles.size ? `${ctl.illisibles.size} illisible${ctl.illisibles.size > 1 ? "s" : ""}, retirée${ctl.illisibles.size > 1 ? "s" : ""}` : undefined };
        deg.aLire = deg.aLire.filter((id) => !ctl.illisibles.has(id));
      } else etapes.images = { etat: "saute", note: "déjà lues" };
      const lots = planchesDe(deg.aLire);
      etapes.planches = { etat: lots.length ? "encours" : "saute", fait: 0, total: lots.length, note: lots.length ? undefined : "déjà lues" };
      maj();
      const lus: VerdictLu[][] = [];
      let suivant = 0, faits = 0;
      const ouvrier = async () => {
        while (!ctrl.signal.aborted && !bloquant && !arretPhrase && suivant < lots.length) {
          const lot = lots[suivant++];
          /* M-13 : jamais une case vide : une image qui ne vient pas est retirée (ni case, ni numéro) ; trop d'absentes : arrêt avant de payer */
          const ims = await chargerImages(lot.ids, (id) => table.get(id), ctrl.signal);
          if (ctrl.signal.aborted) { for (const im of ims.values()) im?.close(); return; }
          const p = plancheSansVide(lot.ids, (id) => !!ims.get(id), lot.n0);
          const a = arretIllisibles(lot.ids.length, p.illisibles.length);
          if (a.arreter) { for (const im of ims.values()) im?.close(); arretPhrase = a.phrase; return; }
          if (!p.ids.length) continue;
          const image = composerPlanche(p.ids.map((id) => ims.get(id)!), p.n0);
          const r = await lirePlanche(cle, image, p.n0, p.ids.length, ctrl.signal);
          dollars += r.dollars;
          if (r.ok) {
            modeles.add(r.modele || MODELE_PLANCHE);
            const v: VerdictLu[] = [];
            for (const x of r.resultat.photos) { const id = p.ids[x.numero - p.n0]; if (id) { planche.set(id, x); v.push({ id, role: x.role, corrige: false }); } }
            lus.push(v);
          } else if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur;
          faits += 1;
          etapes.planches = { etat: "encours", fait: faits, total: lots.length };
          maj();
        }
      };
      await Promise.all(Array.from({ length: Math.min(EN_VOL, lots.length) }, ouvrier));
      for (const [id, x] of heriterPlanche(planche, deg.heritage)) planche.set(id, x);
      if (lots.length) { etapes.planches = { ...etapes.planches, etat: arretPhrase ? "saute" : "fait", note: arretPhrase ? "arrêtées" : deg.heritage.size ? `${deg.heritage.size} héritées` : undefined }; if (planche.size) publier(); }
      /* M-13 : ce qui vient d'être lu est-il douteux ? Alors on ne paie pas la suite (regard, voyage, lieux) sur du faux */
      const s1 = lectureSuspecte(lus);
      if (s1.toute) { douteuseLue = true; etapes.planches = { ...etapes.planches, note: `lecture douteuse : ${s1.raisons.join(", ")}` }; }

      /* C : le regard fin (40 candidates et 20 textes au plus) */
      if (!ctrl.signal.aborted && !bloquant && !arretPhrase && !douteuseLue) {
        const rel = relierLectureIA(lecture(), etatRef.current.catalogue);
        const avecB = [...rel.photos].filter(([id, p]) => p.candidate !== undefined && !s1.douteuses.has(id)).map(([id, p]) => ({ id, candidate: p.candidate ?? "aucune", interet: p.role?.interet ?? 0, texte: !!p.texte }));
        const choix = choisirPourRegard(avecB, new Set([...rel.photos].filter(([, p]) => p.regard).map(([id]) => id)));
        etapes.regard = { etat: choix.length ? "encours" : "saute", fait: 0, total: choix.length };
        maj();
        const indice = indiceDuProjet(etatRef.current.projet?.nom);
        let k = 0, fait = 0, illisibles = 0;
        const regardeur = async () => {
          while (!ctrl.signal.aborted && !bloquant && !arretPhrase && k < choix.length) {
            const x = choix[k++];
            /* M-13 : une image qui ne vient pas n'est jamais envoyée ; au-delà de 10 % du regard, arrêt avant de payer plus */
            const image = await imageRegard(table.get(x.id), ctrl.signal);
            if (!image) { illisibles += 1; const a = arretIllisibles(choix.length, illisibles); if (a.arreter) arretPhrase = a.phrase; }
            else if (!ctrl.signal.aborted) {
              const r = await regarder(cle, image, x.pourquoi, indice, ctrl.signal);
              dollars += r.dollars;
              if (r.ok) { modeles.add(r.modele || MODELE_REGARD); regard.set(x.id, r.resultat); }
              else if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur;
            }
            fait += 1;
            etapes.regard = { etat: "encours", fait, total: choix.length };
            maj();
          }
        };
        await Promise.all(Array.from({ length: Math.min(EN_VOL, choix.length) }, regardeur));
        if (choix.length) { etapes.regard = { ...etapes.regard, etat: arretPhrase ? "saute" : "fait", note: illisibles ? `${illisibles} illisible${illisibles > 1 ? "s" : ""}` : undefined }; if (regard.size) publier(); }
      } else if (douteuseLue) etapes.regard = { etat: "saute", note: "lecture douteuse" };


      /* 7 : le voyage, un appel texte (seulement s'il manque, ou si des photos viennent d'être lues) */
      if (!ctrl.signal.aborted && !bloquant && !arretPhrase && !douteuseLue && (!base?.voyage || planche.size)) {
        etapes.voyage = { etat: "encours" };
        maj();
        const rel = relierLectureIA(lecture(), etatRef.current.catalogue);
        const ids = A.lues.filter((id) => rel.photos.get(id)?.role);
        const mes = etatRef.current.lecture.mesures ?? {};
        const { lignes, comptes } = releveVoyage(ids.map((id) => {
          const p = rel.photos.get(id)!;
          return { date: cat.get(id)?.date ?? null, role: p.role?.role ?? null, sujet: p.sujet ?? null, plan: p.plan ?? null, moment: p.moment_journee ?? null, ambiance: p.ambiance ?? null,
            personnes: p.personnes ?? null, visages: mes[id]?.visages?.length ?? 0, lieu: p.lieu?.preuve === "panneau" ? p.lieu.nom : "", raconte: p.regard?.moment ?? "" };
        }));
        if (lignes.length) {
          const r = await lireVoyage(cle, indiceDuProjet(etatRef.current.projet?.nom), comptes, lignes, ctrl.signal);
          dollars += r.dollars;
          if (r.ok) {
            const v = lireReponseVoyage(r.resultat, ids.map((id) => cat.get(id)!.nom));
            if (v.ok) { voyage = v.valeur; modeles.add(MODELE_REGARD); }
          } else if (r.statut === 401 || r.statut === 403 || r.statut === 503) bloquant = r.erreur;
          etapes.voyage = { etat: voyage ? "fait" : "saute", note: voyage ? `${voyage.chapitres.length} chapitres` : "non lu" };
          if (voyage) publier();
        } else etapes.voyage = { etat: "saute", note: "rien à lire" };
        maj();
      } else etapes.voyage = { etat: base?.voyage && !douteuseLue ? "fait" : "saute", note: douteuseLue ? "lecture douteuse" : base?.voyage ? "déjà lu" : undefined };

      /* M-05 : les lieux par chapitre, si road trip et sans GPS (au plus deux planches) */
      const v = voyage ?? base?.voyage;
      const themeVoyage = (saisie.theme ?? (v?.type_voyage === "road_trip" ? "road_trip" : devinee.theme)) === "road_trip";
      if (!ctrl.signal.aborted && !bloquant && !arretPhrase && !douteuseLue && v && themeVoyage && sansGps && !fiche.lieux && (!base?.lieux || voyage)) {
        etapes.lieux = { etat: "encours" };
        maj();
        const idDe = new Map([...cat.values()].map((p) => [p.nom, p.id]));
        const rel = relierLectureIA(lecture(), etatRef.current.catalogue);
        const chapitres = v.chapitres.map((c, i) => ({ numero: i + 1, photos: c.photos.map((n) => idDe.get(n)).filter((x): x is string => !!x) }));
        const info = new Map([...cat.values()].map((p) => { const ia = rel.photos.get(p.id); return [p.id, { date: p.date, sujet: ia?.sujet ?? null, interet: ia?.role?.interet ?? 0, lieuLu: ia?.lieu?.preuve === "panneau" ? ia.lieu.nom : "" }]; }));
        const ch = choisirReperes(chapitres, info);
        /* M-13 : les repères dont l'image ne vient pas ne sont pas posés (jamais une case vide) */
        const ims = await chargerImages([...ch.reperes, ...ch.sansDate].map((x) => x.id), (id) => table.get(id), ctrl.signal);
        for (const im of ims.values()) im?.close();
        const lisible = (x: { id: string }) => !!ims.get(x.id);
        const reperes = ch.reperes.filter(lisible), sansDateL = ch.sansDate.filter(lisible);
        if (reperes.length) {
          const url = (id: string) => table.get(id)?.moyenne ?? table.get(id)?.vignette ?? table.get(id)?.original ?? null;
          const images = [await plancheLieux(reperes.map((x) => ({ url: url(x.id), label: x.label })), ctrl.signal)];
          if (sansDateL.length) images.push(await plancheLieux(sansDateL.map((x) => ({ url: url(x.id), label: x.label })), ctrl.signal));
          const r = await lireLieux(cle, images, v.ou.pays, v.chapitres.map((c, i) => ({ numero: i + 1, titre: c.titre, debut: c.debut, fin: c.fin })), ch.noms, sansDateL.map((x) => x.label), ctrl.signal);
          dollars += r.dollars;
          if (r.ok) {
            const parLabel = new Map([...reperes, ...sansDateL].map((x) => [x.label, cat.get(x.id)!.nom]));
            lieux = {
              chapitres: r.resultat.chapitres, noms: r.resultat.noms,
              sansDate: r.resultat.sansDate.map((s) => ({ photo: parLabel.get(s.label)!, chapitre: s.chapitre, raison: s.raison })).filter((s) => s.photo),
              reperes: r.resultat.sansDate.flatMap((s) => { const m = /C\d+-\d+/.exec(s.raison); const rep = m ? parLabel.get(m[0]) : undefined; const ph = parLabel.get(s.label); return rep && ph ? [{ photo: ph, repere: rep }] : []; }),
            };
            modeles.add(MODELE_PLANCHE);
            publier();
          }
          etapes.lieux = { etat: lieux ? "fait" : "saute", note: lieux ? `${lieux.chapitres.filter((c) => c.preuve !== "aucune").length} lieux prouvés` : "non lus" };
        } else etapes.lieux = { etat: "saute", note: "aucun repère" };
        maj();
      } else etapes.lieux = { etat: "saute", note: douteuseLue ? "lecture douteuse" : fiche.lieux ? "saisis" : !themeVoyage ? "pas un road trip" : !sansGps ? "GPS" : undefined };

      /* 3 (18/11 soir) : TOUS les tags de la définition ; une lecture ancienne se complète, seuls les champs manquants sont demandés.
         EN DERNIER : la lecture publiée ensuite (voyage, lieux) repartirait de la lecture d'avant et effacerait le complément */
      if (!ctrl.signal.aborted && !bloquant && !arretPhrase && !douteuseLue) {
        const avant = lecture();
        const eC: EtatEditeur = { ...etatRef.current, lectureIA: relier(avant, etatRef.current.catalogue) };
        const plan = estimerComplement(eC, A.lues);
        if (plan.cout.appels) {
          etapes.complement = { etat: "encours", fait: 0, total: plan.cout.appels };
          maj();
          let fait = 0;
          const c = await completerLecture({
            cle, etat: eC, adresses: table, signal: ctrl.signal, lues: A.lues,
            surAvance: () => { fait += 1; etapes.complement = { etat: "encours", fait: Math.min(fait, plan.cout.appels), total: plan.cout.appels }; maj(); },
            poser: (l) => { envoyer({ type: "poserLectureIA", lecture: l }); if (cleProjet) void garderLectureIA(cleProjet, l); },
          });
          dollars += c.dollars;
          if (c.arret) arretPhrase = c.arret;
          if (c.bloquant) bloquant = c.bloquant;
          etapes.complement = { etat: c.arret ? "saute" : "fait", note: c.arret ? "arrêté" : `${motDollars(c.dollars)}` };
          maj();
        } else etapes.complement = { etat: "saute", note: "déjà lus" };
      } else etapes.complement = { etat: "saute", note: douteuseLue ? "lecture douteuse" : undefined };
    } else {
      for (const k of ["images", "planches", "regard", "complement", "voyage", "lieux"] as const) etapes[k] = { etat: "saute", note: k === "planches" ? "IA fermée" : undefined };
    }
    if (ctrl.signal.aborted) { arret.current = null; setPhase({ type: "questions" }); return; }
    if (arretPhrase) { arret.current = null; setPhase({ type: "arret", texte: arretPhrase, dollars }); return; }

    /* la composition : luminances des photos (lisibilité des textes), puis le compositeur */
    etapes.composition = { etat: "encours" };
    if (bloquant) etapes.planches = { ...etapes.planches, note: MOT_ERREUR[bloquant] ?? "IA indisponible" };
    maj();
    const e1 = etatRef.current;
    const ecartees = new Set(triDe(e1.magazine).ecartees);
    const ids = [...e1.catalogue.keys()].filter((id) => !ecartees.has(id));
    const lums = new Map<string, Luminance>();
    let j = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (j < ids.length && !ctrl.signal.aborted) { const id = ids[j++]; const l = await luminance(vignetteDe(table.get(id)), ctrl.signal); if (l) lums.set(id, l); }
    }));
    if (cleProjet) garderLuminances(cleProjet, lums);
    const marques = marquesAtelier(etatRef.current, garde.proposition);
    const issue = composerLocal(etatRef.current, fiche, lums, null, marques, extra);
    arret.current = null;
    setPaye(dollars);
    if (!issue.ok) { setPhase({ type: "erreur", phrase: issue.phrase, cause: issue.cause, geste: issue.geste, technique: issue.technique }); return; }
    const r = issue.r;
    etapes.composition = { etat: "fait", note: `${r.pages} pages` };
    maj();
    const autres = composerAutres(etatRef.current, fiche, r, lums, marques, extra);
    /* M-34 : l'analyse est là, la composition se lance SEULE ; un magazine commencé n'est jamais écrasé sans « Remplacer » */
    setPhase({ type: "questions" });
    if (touche(etatRef.current)) { setConfirmer({ r, dollars, autres, marques }); return; }
    charger_(r, dollars, autres, marques);
  };

  /** Le magazine a-t-il été retouché depuis la dernière proposition chargée (ou commencé à la main sans elle) ? */
  const touche = (e: EtatEditeur): boolean => {
    if (!posees(e).size) return false;
    const p = garde.proposition;
    return !p || !p.empreinte || p.empreinte !== empreinte(e.magazine.planches);
  };

  const ficheSaisie = (): Fiche => {
    const { taille: _t, ...sansTaille } = saisie;
    void _t;
    const f: Fiche = { ...sansTaille, ...(lieuxDeTexte(lieuxTexte).length ? { lieux: lieuxDeTexte(lieuxTexte) } : {}) };
    if (!lieuxDeTexte(lieuxTexte).length) delete f.lieux;
    return f;
  };
  const charger_ = (r: ResultatCompo, dollars: number, autres: AutreTaille[], marques: { gardees: string[] }) => {
    envoyer({ type: "chargerPremierJet", jet: r.jet });
    setConfirmer(null);
    if (cleProjet) void garder(cleProjet, { fiche: ficheSaisie(), proposition: resumer(r, dollars, autres, marques, extra, ficheSaisie()), corrections, lieux: repLieux });
  };

  /* l'Analyse, recomposée sans rien payer à chaque correction (la lecture est déjà là) */
  const ficheCourante = ficheSaisie();
  const cleFiche = JSON.stringify(ficheCourante);
  const marquesC = marquesAtelier(etat, garde.proposition);
  const cleMarques = JSON.stringify(marquesC);
  const ecarteesC = triDe(etat.magazine).ecartees.join();
  const vue = useMemo(() => {
    const lums = luminancesGardees(cleProjet);
    const e = entreeLocale(etat, JSON.parse(cleFiche) as Fiche, lums, null, JSON.parse(cleMarques) as { coeurs: string[]; gardees: string[] }, { corrections, lieux: repLieux });
    return { entree: appliquerCorrections(e), iaLue: new Map(e.photos.map((x) => [x.id, x.ia])), issue: composerSur(e) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat.catalogue, etat.lecture, etat.lectureIA, ecarteesC, cleFiche, cleMarques, corrections, repLieux, cleProjet]);
  const corriger = (c: CorrectionsAtelier) => { setCorrections(c); if (cleProjet) void garder(cleProjet, { ...garde, fiche: ficheSaisie(), corrections: c, lieux: repLieux }); };
  const setLieux = (l: ReglagesV2["lieux"]) => { setLieuxR(l); if (cleProjet) void garder(cleProjet, { ...garde, fiche: ficheSaisie(), corrections, lieux: l }); };
  const lecon = (l: Lecon) => envoyer({ type: "ajouterLecon", lecon: l });

  /* « Mise en page » : elle s'ouvre sur la proposition déjà faite ; une Analyse corrigée la recharge, jamais par-dessus des retouches sans oui */
  const versMiseEnPage = () => {
    if (!ro && vue.issue.ok && phase.type === "questions") {
      const r = vue.issue.r;
      const p = garde.proposition;
      const neuve = !p || p.empreinteJet !== empreinte(r.jet.magazine.planches);
      if (neuve) {
        if (touche(etat)) { setConfirmer({ r, dollars: p?.dollars ?? 0, autres: p?.autres ?? [], marques: marquesC }); return; }
        charger_(r, p?.dollars ?? 0, p?.autres ?? [], marquesC);
      }
    }
    fermer();
  };

  const enCours = phase.type === "analyse" && arret.current !== null;
  /* le coût ANNONCÉ avant tout appel payant : lecture des photos nouvelles, complément des lectures d'avant (chiffres du banc) et, pour
     les photos nouvelles, la borne haute de leur regard complémentaire et du classement des couvertures */
  const planC = estimerComplement(etat, A.lues);
  const nouvelles = Math.max(0, est.lues - fiables);
  const complementNeuf = nouvelles ? (Math.min(REGARD_COMPLEMENT_MAX, nouvelles) * BANC_18_11_COMPLEMENT.regard.dollars) / BANC_18_11_COMPLEMENT.regard.photos + BANC_18_11_COMPLEMENT.classement.dollars : 0;
  const annonce = est.dollars + planC.cout.dollars + complementNeuf;
  const aLire = nouvelles > 0 || planC.cout.appels > 0;
  const lu = { pays: etat.lectureIA?.source.voyage?.ou.pays?.trim() || null, qui: etat.lectureIA?.source.voyage?.qui.type ?? null };
  return (
    <div className="ed-ana-fond" role="dialog" aria-modal="true" aria-label="Analyse">
      <section className="ed-ana">
        <header className="ed-ana-tete">
          <span className="ed-seg" role="group" aria-label="Vue">
            <button type="button" aria-pressed="true" className="ed-seg-actif">Analyse</button>
            <button type="button" aria-pressed="false" disabled={enCours} onClick={versMiseEnPage}>Mise en page</button>
          </span>
          <span className="ed-ana-etat-lecture">
            {phase.type === "questions" && vue.issue.ok ? `${vue.issue.r.pages} pages · ${pluriel(vue.issue.r.selection.compte.posee, "photo posée", "photos posées")}` : ""}
            {paye !== null ? ` · Payé ${motDollars(paye)}` : ""}
          </span>
          {phase.type === "questions" && iaOuverte && !susp.suspecte && aLire && !ro ? (
            <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer("normal"); }}
              title={`${pluriel(nouvelles, "photo nouvelle", "photos nouvelles")} · ${pluriel(planC.cout.appels, "appel de complément", "appels de complément")}`}>Lire les photos · ≈ {motDollars(annonce)}</button>
          ) : phase.type === "questions" && iaOuverte && susp.suspecte && !ro ? (
            <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer("relire"); }}>Relire {pluriel(aRelire, "photo")} · ≈ {motDollars(est.dollars)}</button>
          ) : phase.type === "questions" && !iaOuverte ? <span className="ed-compo-sous">IA fermée · lecture locale</span> : null}
          {phase.type === "questions" && iaOuverte && dejaLues.size && !ro ? (
            <button type="button" className="ed-lien" title={`${pluriel(A.lues.length, "photo")} · ≈ ${motDollars(estTout.dollars)}`} onClick={() => { void lancer("tout"); }}>Relire tout</button>
          ) : null}
          {enCours ? <button type="button" className="ed-bt" onClick={() => arret.current?.abort()}>Arrêter</button> : null}
        </header>
        {confirmer ? (
          <div className="ed-ana-confirmer" role="alertdialog" aria-label="Remplacer la mise en page ?">
            <strong>Remplacer la mise en page ?</strong>
            <span>{confirmer.r.pages} pages · {pluriel(confirmer.r.selection.compte.posee, "photo posée", "photos posées")}</span>
            <button type="button" className="ed-bt" onClick={() => setConfirmer(null)}>Garder la mienne</button>
            <button type="button" className="ed-bt ed-bt--plein" onClick={() => charger_(confirmer.r, confirmer.dollars, confirmer.autres, confirmer.marques)}>Remplacer</button>
          </div>
        ) : null}
        {susp.suspecte && phase.type === "questions" ? (
          <div className="ed-compo-alerte" role="status"><strong>Lecture douteuse</strong><span>{susp.raisons.join(" · ")} : elle ne sert pas à écarter.</span></div>
        ) : null}
        {phase.type === "questions" ? (
          vue.issue.ok ? (
            <VueAnalyse r={vue.issue.r} entree={vue.entree} iaLue={vue.iaLue} saisie={saisie} poser={poser} devinee={devinee} lu={lu}
              lieuxTexte={lieuxTexte} setLieuxTexte={setLieuxTexte} corrections={corrections} corriger={corriger} lieux={repLieux} setLieux={setLieux}
              dossier={etat.projet?.dossier ?? null} pagesCommandees={etat.projet?.nbPagesCible ?? null} adresses={adresses}
              mesures={etat.lecture.mesures ?? {}} lecon={lecon} ro={ro} />
          ) : (
            <div className="ed-ana-vide">
              <p className="ed-compo-texte ed-lire-err" role="status">{vue.issue.phrase}</p>
              <p className="ed-compo-texte">{vue.issue.cause}</p>
              <p className="ed-compo-texte ed-compo-sous">{vue.issue.geste}</p>
            </div>
          )
        ) : phase.type === "analyse" ? (
          <div className="ed-ana-vide">
            <ol className="ed-compo-etapes">
              {(Object.keys(MOT_ETAPE) as Etape[]).map((k) => {
                const a = phase.etapes[k];
                return (
                  <li key={k} className={cls("ed-compo-etape", `ed-compo-etape--${a.etat}`)}>
                    <span className="ed-compo-pastille" aria-hidden="true" />
                    <span>{MOT_ETAPE[k]}</span>
                    <span className="ed-compo-note">{a.total ? `${a.fait ?? 0} / ${a.total}` : ""}{a.note ? `${a.total ? " · " : ""}${a.note}` : ""}</span>
                  </li>
                );
              })}
            </ol>
            <p className="ed-compo-cout">Payé · {motDollars(phase.dollars)}</p>
          </div>
        ) : phase.type === "arret" ? (
          <div className="ed-ana-vide">
            <p className="ed-compo-texte ed-lire-err" role="status">{phase.texte}</p>
            <p className="ed-compo-texte ed-compo-sous">Rien n&apos;a été envoyé pour ces photos.{phase.dollars ? ` Déjà payé : ${motDollars(phase.dollars)}.` : ""}</p>
            <footer className="ed-compo-pied">
              <button type="button" className="ed-bt" onClick={() => setPhase({ type: "questions" })}>Retour</button>
              <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer(dernierMode.current); }}>Réessayer</button>
            </footer>
          </div>
        ) : (
          <div className="ed-ana-vide">
            <p className="ed-compo-texte ed-lire-err" role="status">{phase.phrase}</p>
            <p className="ed-compo-texte">{phase.cause}</p>
            <p className="ed-compo-texte ed-compo-sous">{phase.geste}</p>
            <details className="ed-compo-trace"><summary>Trace</summary><code>{phase.technique}</code></details>
            <footer className="ed-compo-pied">
              <button type="button" className="ed-bt ed-bt--plein" onClick={() => setPhase({ type: "questions" })}>Retour</button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────── le bandeau, M-10, les autres tailles, « Posées et laissées » ─────────────────────────── */

export function BandeauProposition() {
  const { etat, envoyer, cleProjet, lectureSeule: ro } = useEd();
  const garde = useGarde(cleProjet);
  const p = garde.proposition;
  const [ouvert, setOuvert] = useState(false);
  const [ferme, setFerme] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState<AutreTaille | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const emp = empreinte(etat.magazine.planches);
  const magCourant = etat.magazine;
  /* l'empreinte de l'intérieur tel qu'il vient d'être chargé */
  /* M-30 : la proposition TELLE QUE CHARGÉE (le magazine de la machine, couverture comprise) : « Ce que j'ai changé » la compare */
  useEffect(() => { if (p && !p.empreinte && cleProjet) void garder(cleProjet, { ...garde, proposition: { ...p, empreinte: emp, magazine: p.magazine ?? (JSON.parse(JSON.stringify(magCourant)) as typeof magCourant) } }); }, [p, emp, cleProjet, garde, magCourant]);
  const extra: Extra = { corrections: garde.corrections, lieux: garde.lieux };
  const [releve, setReleve] = useState(false);
  /* M-10 : une photo de couverture posée aussi à l'intérieur : on recompose l'intérieur sans elle (sans demander si l'intérieur n'a pas bougé) */
  const faces = facesCouverture(etat);
  const dedans = posees(etat);
  const doublon = !!faces && [...faces.premiere, ...faces.quatrieme].some((id) => dedans.has(id));
  const ficheDe = (taille?: "tout" | number): Fiche => ({ ...garde.fiche, ...(taille !== undefined ? { taille } : p?.resultat.origineTaille === "choisie" ? { taille: p.resultat.taille } : {}) });
  /** M-10 : l'intérieur recomposé sans la couverture ; rend la phrase d'un refus (M-14), sinon null. */
  const tenterSansDoublon = (): string | null => {
    if (!faces) return null;
    const m = marquesAtelier(etat, p);
    const x = composerLocal(etat, ficheDe(), luminancesGardees(cleProjet), faces, m, extra);
    if (!x.ok) return x.phrase;
    const jet = { ...x.r.jet, magazine: { ...x.r.jet.magazine, couverture: etat.magazine.couverture } };
    envoyer({ type: "chargerPremierJet", jet });
    if (cleProjet) void garder(cleProjet, { ...garde, proposition: { ...resumer(x.r, p?.dollars ?? 0, p?.autres ?? [], m, extra, garde.fiche) } });
    return null;
  };
  const recomposer = () => setRefus(tenterSansDoublon());
  /* M-15 : une autre taille, recomposée d'un clic (sans rien payer : la lecture est déjà là) */
  const autreTaille = (a: AutreTaille) => {
    setConfirmer(null);
    const m = marquesAtelier(etat, p);
    const x = composerLocal(etat, ficheDe(a.taille), luminancesGardees(cleProjet), null, m, extra);
    if (!x.ok) { setRefus(x.phrase); return; }
    setRefus(null);
    envoyer({ type: "chargerPremierJet", jet: x.r.jet });
    const autres = [...(p?.autres ?? []).filter((o) => o.pages !== x.r.pages), ...(p ? [{ mot: p.resultat.origineTaille === "commandee" ? "Commandé" : "Proposé", taille: p.resultat.taille, pages: p.pages, posees: p.resultat.selection.compte.posee }] : [])]
      .sort((u, v) => u.pages - v.pages);
    if (cleProjet) void garder(cleProjet, { ...garde, proposition: resumer(x.r, p?.dollars ?? 0, autres, m, extra, garde.fiche) });
  };
  const auto = useRef<string | null>(null);
  useEffect(() => {
    if (!p || !doublon || ro || !p.empreinte || p.empreinte !== emp) return;
    const cle = `${emp}|${JSON.stringify(faces)}`;
    if (auto.current === cle) return;
    auto.current = cle;
    tenterSansDoublon();
  });
  if (!p || ferme === p.quand) return null;
  const c = p.resultat.selection.compte;
  const diffs: Difference[] = p.magazine ? releverDifferences({
    magazine: p.magazine, versionRegles: p.versionRegles ?? "", reglages: p.reglages ?? null, quand: p.quand, selection: p.resultat.selection,
    decisions: p.decisions ?? [], ...(p.doubles ? { doubles: p.doubles } : {}),
  }, etat.magazine) : [];
  const s = suspicionDe(etat);
  const origine = p.resultat.origineTaille === "commandee" ? "le nombre commandé" : p.resultat.origineTaille === "machine" ? "proposé par la machine" : "choisi";
  return (
    <>
      <div className="ed-bandeau ed-bandeau--bleu ed-compo-bandeau" role="status">
        <strong>Proposition prête · {p.pages} pages ({origine}) · {pluriel(c.posee, "photo posée", "photos posées")} · {c.reserve} en réserve · {motDollars(p.dollars)}</strong>
        {p.resultat.ajustement ? <span>{p.resultat.ajustement.phrase}</span> : null}
        {s.suspecte ? <span className="ed-compo-douteuse">Lecture douteuse : relire depuis « Composer le magazine »</span> : null}
        {p.resultat.controle.fautes.length ? <span>{pluriel(p.resultat.controle.fautes.length, "faute à revoir", "fautes à revoir")}</span> : null}
        {(p.autres ?? []).map((a) => (
          <button key={`${a.mot}-${a.pages}`} type="button" className="ed-bt" disabled={ro}
            onClick={() => { if (p.empreinte && p.empreinte !== emp) setConfirmer(a); else autreTaille(a); }}>
            {a.mot} : {a.pages} pages · {pluriel(a.posees, "photo")}
          </button>
        ))}
        {confirmer ? (
          <span className="ed-compo-confirmer">Tes retouches seront remplacées.
            <button type="button" className="ed-bt ed-bt--plein" onClick={() => autreTaille(confirmer)}>Remplacer</button>
            <button type="button" className="ed-bt" onClick={() => setConfirmer(null)}>Garder</button>
          </span>
        ) : null}
        {refus ? <span className="ed-lire-err">{refus}</span> : null}
        {doublon && p.empreinte !== emp ? <button type="button" className="ed-bt" disabled={ro} onClick={recomposer}>Recomposer sans doublon</button> : null}
        <button type="button" className="ed-bt" onClick={() => setOuvert(true)}>Posées et laissées</button>
        {diffs.length ? <button type="button" className="ed-bt" onClick={() => setReleve(true)}>Ce que j&apos;ai changé · {diffs.length}</button> : null}
        <button type="button" className="ed-bt" onClick={() => setFerme(p.quand)}>Fermer</button>
      </div>
      {ouvert && typeof document !== "undefined" ? createPortal(<PoseesEtLaissees p={p} fermer={() => setOuvert(false)} />, document.querySelector(".mep-editeur") ?? document.body) : null}
      {releve && typeof document !== "undefined" ? createPortal(<CeQueJaiChange p={p} diffs={diffs} fermer={() => setReleve(false)} />, document.querySelector(".mep-editeur") ?? document.body) : null}
    </>
  );
}

const MOT_ETAT: Readonly<Record<PhotoChoisie["etat"], string>> = { posee: "Posées", couverture: "Couverture", reserve: "En réserve", ecartee: "Écartées" };

function PoseesEtLaissees({ p, fermer }: { p: Proposition; fermer: () => void }) {
  const { etat, envoyer, adresses, lectureSeule: ro } = useEd();
  const dedans = posees(etat);
  const chapitres = new Map(p.resultat.chapitres.map((c) => [c.numero, c.titre]));
  const groupes = new Map<string, PhotoChoisie[]>();
  for (const x of p.resultat.selection.photos) {
    const k = x.chapitre !== null && chapitres.has(x.chapitre) ? `${x.chapitre}` : "-";
    groupes.set(k, [...(groupes.get(k) ?? []), x]);
  }
  /* faire entrer une photo de la réserve : sur la page la plus proche dans le temps de son chapitre, du côté le moins chargé */
  const entrer = (x: PhotoChoisie) => {
    const date = etat.catalogue.get(x.id)?.date ?? null;
    const memes = p.resultat.selection.photos.filter((y) => y.chapitre === x.chapitre && dedans.has(y.id)).map((y) => y.id);
    let cible: CibleDepot | null = null, meilleur = Infinity;
    for (const pl of etat.magazine.planches.slice(1, -1)) {
      for (const [cote, d] of (pl.mode === "double" ? [["double", pl.double]] : [["gauche", pl.gauche], ["droite", pl.droite]]) as ["double" | "gauche" | "droite", typeof pl.double][]) {
        const ids = d?.photos.map((a) => a.photoId).filter((v): v is string => !!v) ?? [];
        if (!ids.some((id) => memes.includes(id))) continue;
        const dt = Math.min(...ids.map((id) => { const dd = etat.catalogue.get(id)?.date; return date && dd ? Math.abs(Date.parse(dd) - Date.parse(date)) : 1e15; })) + ids.length;
        if (dt < meilleur) { meilleur = dt; cible = cote === "double" ? { type: "double", plancheId: pl.id } : { type: "page", plancheId: pl.id, cote }; }
      }
    }
    if (!cible && etat.magazine.planches.length > 2) cible = { type: "page", plancheId: etat.magazine.planches[1].id, cote: "droite" };
    if (cible) envoyer({ type: "deposer", source: { type: "bibliotheque", ids: [x.id] }, cible });
  };
  return (
    <div className="ed-compo-fond" onPointerDown={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <section className="ed-compo ed-compo--large" role="dialog" aria-modal="true" aria-label="Posées et laissées">
        <header className="ed-compo-tete">
          <h3>Posées et laissées</h3>
          <button type="button" className="ed-bt" onClick={fermer}>Fermer</button>
        </header>
        <div className="ed-compo-liste">
          {[...groupes].sort((a, b) => (a[0] === "-" ? 1 : b[0] === "-" ? -1 : Number(a[0]) - Number(b[0]))).map(([k, xs]) => (
            <section key={k} className="ed-compo-chap">
              <h4>{k === "-" ? "Hors chapitre" : `${k} · ${chapitres.get(Number(k))}`}</h4>
              {(["posee", "couverture", "reserve", "ecartee"] as const).map((et) => {
                const l = xs.filter((x) => x.etat === et);
                if (!l.length) return null;
                return (
                  <div key={et} className="ed-compo-groupe">
                    <span className="ed-compo-l">{MOT_ETAT[et]} · {l.length}</span>
                    <ul>
                      {l.map((x) => (
                        <li key={x.id} className={cls("ed-compo-photo", `ed-compo-photo--${et}`)}>
                          <img src={vignetteDe(adresses.get(x.id)) ?? undefined} alt="" loading="lazy" />
                          {/* E (18/11) : la raison en mots d'atelier ; la raison technique et les règles au survol seulement */}
                          <span className="ed-compo-raison" title={[x.detail, x.regles.join(", ")].filter(Boolean).join(" · ")}>{x.raison}</span>
                          {et === "reserve" ? (dedans.has(x.id) ? <span className="ed-compo-note">Entrée</span> : <button type="button" className="ed-bt" disabled={ro} onClick={() => entrer(x)}>Faire entrer</button>) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────── « Ce que j'ai changé » (M-30) ─────────────────────────── */

const MOT_TYPE_DIFF: Readonly<Record<Difference["type"], string>> = {
  double_ajoutee: "Double ajoutée", double_supprimee: "Double supprimée", gabarit_change: "Gabarit changé", photo_ajoutee: "Photo ajoutée",
  photo_retiree: "Photo retirée", photo_deplacee: "Photo déplacée", photo_agrandie: "Photo agrandie", photo_reduite: "Photo réduite",
  recadrage_change: "Recadrage changé", texte_change: "Texte changé", couverture_gabarit: "Couverture changée", couverture_photo: "Couverture changée",
};

function CeQueJaiChange({ p, diffs, fermer }: { p: Proposition; diffs: Difference[]; fermer: () => void }) {
  const { adresses, cleProjet, lectureSeule: ro } = useEd();
  const [envoi, setEnvoi] = useState<{ ok: boolean; phrase: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const envoyer = async () => {
    if (!cleProjet) return;
    setEnCours(true);
    const lecons = leconsDesDifferences(diffs, { versionRegles: p.versionRegles ?? "", reglages: p.reglages ?? null });
    setEnvoi(await envoyerEcarts(cleProjet, lecons));
    setEnCours(false);
  };
  const parType = new Map<string, number>();
  for (const d of diffs) parType.set(MOT_TYPE_DIFF[d.type], (parType.get(MOT_TYPE_DIFF[d.type]) ?? 0) + 1);
  return (
    <div className="ed-compo-fond" onPointerDown={(e) => { if (e.target === e.currentTarget) fermer(); }}>
      <section className="ed-compo ed-compo--large" role="dialog" aria-modal="true" aria-label="Ce que j'ai changé">
        <header className="ed-compo-tete">
          <h3>Ce que j&apos;ai changé</h3>
          <button type="button" className="ed-bt" onClick={fermer}>Fermer</button>
        </header>
        <p className="ed-compo-sous">{[...parType].map(([k, n]) => `${k} · ${n}`).join("  ·  ")}</p>
        <ul className="ed-releve">
          {diffs.map((d, i) => (
            <li key={`${d.type}-${d.plancheId}-${d.photo ?? ""}-${i}`} className="ed-releve-ligne">
              {d.photo ? <img src={vignetteDe(adresses.get(d.photo)) ?? undefined} alt="" loading="lazy" /> : <span className="ed-releve-sans" aria-hidden="true" />}
              <span className="ed-releve-ou">{d.ou}</span>
              <span className="ed-releve-phrase">{d.phrase}</span>
              <span className="ed-releve-regles" title={d.decision ?? ""}>{d.regles.join(", ")}</span>
            </li>
          ))}
        </ul>
        <footer className="ed-compo-pied">
          <span className={cls("ed-compo-cout", envoi && !envoi.ok && "ed-lire-err")}>{envoi?.phrase ?? `Règles ${p.versionRegles ? p.versionRegles.slice(0, 8) : "inconnues"}`}</span>
          <button type="button" className="ed-bt ed-bt--plein" disabled={ro || enCours || !!envoi?.ok} onClick={() => { void envoyer(); }}>
            {envoi?.ok ? "Envoyées" : "Envoyer en leçons"}
          </button>
        </footer>
      </section>
    </div>
  );
}
