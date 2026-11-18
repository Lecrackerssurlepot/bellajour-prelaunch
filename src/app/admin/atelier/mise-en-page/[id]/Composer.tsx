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
  MOT_AMBIANCE, MOT_THEME, THEMES, AMBIANCES_FICHE, autresTailles, composerSur, devinerFiche, entreeDepuisEditeur, lieuxDeTexte, titreImprimable,
  type Fiche, type IssueCompo, type Luminance, type PhotoChoisie, type ResultatCompo, type Theme,
} from "@/lib/mise-en-page/compositeur";
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
type Etape = "images" | "mesures" | "planches" | "regard" | "voyage" | "lieux" | "composition";
const MOT_ETAPE: Readonly<Record<Etape, string>> = { images: "Les images", mesures: "Mesures locales", planches: "Planches", regard: "Regard fin", voyage: "Le voyage", lieux: "Les lieux", composition: "La composition" };
type Avance = { etat: "attente" | "encours" | "fait" | "saute"; fait?: number; total?: number; note?: string };
type Phase =
  | { type: "questions" }
  | { type: "analyse"; etapes: Record<Etape, Avance>; dollars: number }
  | { type: "arret"; texte: string; dollars: number }
  | { type: "remplacer"; r: ResultatCompo; dollars: number; autres: AutreTaille[]; marques: { coeurs: string[]; gardees: string[] } }
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

function composerLocal(e: EtatEditeur, fiche: Fiche, luminances: ReadonlyMap<string, Luminance> | undefined, couverture: { premiere: string[]; quatrieme: string[] } | null,
  marques: { coeurs: string[]; gardees: string[] }): IssueCompo {
  const t = triDe(e.magazine);
  const s = suspicionDe(e);
  return composerSur(entreeDepuisEditeur({
    catalogue: e.catalogue, lecture: e.lecture, lectureIA: e.lectureIA, ecarteesAtelier: new Set(t.ecartees), fiche,
    /* E (18/11) : le titre de page 1 est le nom du projet, jamais un nom par défaut de l'outil */
    titre: titreImprimable(e.projet?.nom), quand: QUAND(),
    ...(luminances ? { luminances } : {}), couverture,
    marques,
    douteuse: s.suspecte ? { photos: s.douteuses, toute: s.toute, raison: s.raisons.join(", ") } : null,
    pagesCommandees: e.projet?.nbPagesCible ?? null,
  }));
}

function resumer(r: ResultatCompo, dollars: number, autres: AutreTaille[], avant: { gardees: string[] }): Proposition {
  const garde = new Set(avant.gardees);
  return {
    quand: QUAND(), dollars, pages: r.pages, empreinte: "", autres,
    machine: { choisies: (r.jet.magazine.tri?.choisies ?? []).filter((id) => !garde.has(id)), avant: [...avant.gardees] },
    resultat: { selection: r.selection, chapitres: r.chapitres, controle: r.controle, couverture: r.couverture, profil: r.profil, sobre: r.sobre, taille: r.taille, origineTaille: r.origineTaille, ajustement: r.ajustement },
  };
}

/** M-15 : les autres tailles, COMPOSÉES (leurs chiffres sont ceux d'un vrai magazine, jamais une estimation). */
function composerAutres(e: EtatEditeur, fiche: Fiche, r: ResultatCompo, lums: ReadonlyMap<string, Luminance> | undefined, marques: { coeurs: string[]; gardees: string[] }): AutreTaille[] {
  const out: AutreTaille[] = [];
  for (const a of autresTailles(r.pages, r.origineTaille, e.projet?.nbPagesCible ?? null)) {
    const x = composerLocal(e, { ...fiche, taille: a.taille }, lums, null, marques);
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
      <button type="button" className="ed-bt ed-bt--plein" disabled={ro || vide} title={vide ? "Importez d'abord vos photos" : "Questions, analyse, magazine proposé"} onClick={() => setOuvert(true)}>
        Composer le magazine
      </button>
      {ouvert && typeof document !== "undefined" ? createPortal(<Feuille fermer={() => setOuvert(false)} />, document.querySelector(".mep-editeur") ?? document.body) : null}
    </>
  );
}

function Feuille({ fermer }: { fermer: () => void }) {
  const { etat, envoyer, adresses, cleProjet, rafraichirAdresses } = useEd();
  const etatRef = useRef<EtatEditeur>(etat);
  useEffect(() => { etatRef.current = etat; });
  const garde = useGarde(cleProjet);
  const [saisie, setSaisie] = useState<Fiche>(garde.fiche);
  const [lieuxTexte, setLieuxTexte] = useState((garde.fiche.lieux ?? []).join(", "));
  const [phase, setPhase] = useState<Phase>({ type: "questions" });
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
    if (cleProjet) void garder(cleProjet, { ...(garde as Garde), fiche });
    const ctrl = new AbortController();
    arret.current = ctrl;
    const etapes: Record<Etape, Avance> = { images: { etat: "attente" }, mesures: { etat: "encours" }, planches: { etat: "attente" }, regard: { etat: "attente" }, voyage: { etat: "attente" }, lieux: { etat: "attente" }, composition: { etat: "attente" } };
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
    } else {
      for (const k of ["images", "planches", "regard", "voyage", "lieux"] as const) etapes[k] = { etat: "saute", note: k === "planches" ? "IA fermée" : undefined };
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
    const issue = composerLocal(etatRef.current, fiche, lums, null, marques);
    arret.current = null;
    if (!issue.ok) { setPhase({ type: "erreur", phrase: issue.phrase, cause: issue.cause, geste: issue.geste, technique: issue.technique }); return; }
    const r = issue.r;
    etapes.composition = { etat: "fait", note: `${r.pages} pages` };
    maj();
    const autres = composerAutres(etatRef.current, fiche, r, lums, marques);
    if (posees(etatRef.current).size) { setPhase({ type: "remplacer", r, dollars, autres, marques }); return; }
    charger_(r, dollars, autres, marques);
  };

  const charger_ = (r: ResultatCompo, dollars: number, autres: AutreTaille[], marques: { gardees: string[] }) => {
    envoyer({ type: "chargerPremierJet", jet: r.jet });
    const { taille: _t, ...sansTaille } = saisie;
    void _t;
    if (cleProjet) void garder(cleProjet, { fiche: { ...sansTaille, ...(lieuxDeTexte(lieuxTexte).length ? { lieux: lieuxDeTexte(lieuxTexte) } : {}) }, proposition: resumer(r, dollars, autres, marques) });
    fermer();
  };

  const enCours = phase.type === "analyse" && arret.current !== null;
  const titre = phase.type === "questions" ? "Les questions" : phase.type === "analyse" ? "Analyse en cours" : phase.type === "remplacer" ? "Remplacer la mise en page ?" : phase.type === "arret" ? "Lecture arrêtée" : "Composition";
  return (
    <div className="ed-compo-fond" onPointerDown={(e) => { if (e.target === e.currentTarget && !enCours) fermer(); }}>
      <section className="ed-compo" role="dialog" aria-modal="true" aria-label="Composer le magazine">
        <header className="ed-compo-tete">
          <h3>{titre}</h3>
          {!enCours ? <button type="button" className="ed-bt" onClick={fermer}>Fermer</button> : null}
        </header>
        {phase.type === "questions" ? (
          <>
            {susp.suspecte ? (
              <div className="ed-compo-alerte" role="status">
                <strong>Lecture douteuse</strong>
                <span>{susp.raisons.join(" · ")} : elle ne servira pas à écarter.</span>
              </div>
            ) : null}
            <div className="ed-compo-champ">
              <span className="ed-compo-l">Type d&apos;album</span>
              <span className="ed-compo-choix">
                {THEMES.map((t: Theme) => (
                  <button key={t} type="button" aria-pressed={vaut("theme") === t} className={cls(saisie.theme === undefined && devinee.theme === t && "ed-compo-devine")}
                    onClick={() => poser({ theme: saisie.theme === t ? undefined : t })}>{MOT_THEME[t]}</button>
                ))}
              </span>
            </div>
            <label className="ed-compo-champ">
              <span className="ed-compo-l">Personnes du groupe</span>
              <input type="number" min={1} max={60} inputMode="numeric" value={saisie.personnes ?? ""} placeholder={devinee.personnes ? String(devinee.personnes) : "?"}
                onChange={(e) => { const n = Number(e.currentTarget.value); poser({ personnes: Number.isInteger(n) && n >= 1 && n <= 60 ? n : undefined }); }} />
            </label>
            <div className="ed-compo-champ">
              <span className="ed-compo-l">Ambiance</span>
              <span className="ed-compo-choix">
                {AMBIANCES_FICHE.map((a) => (
                  <button key={a} type="button" aria-pressed={vaut("ambiance") === a} className={cls(saisie.ambiance === undefined && devinee.ambiance === a && "ed-compo-devine")}
                    onClick={() => poser({ ambiance: saisie.ambiance === a ? undefined : a })}>{MOT_AMBIANCE[a]}</button>
                ))}
              </span>
            </div>
            <label className="ed-compo-champ">
              <span className="ed-compo-l">Lieux à faire apparaître</span>
              <input type="text" value={lieuxTexte} placeholder="Facultatif" maxLength={400} onChange={(e) => setLieuxTexte(e.currentTarget.value)} />
            </label>
            <p className="ed-compo-taille">Taille : {etat.projet?.nbPagesCible ? `${etat.projet.nbPagesCible} pages, le nombre commandé` : "la machine la propose"}</p>
            <footer className="ed-compo-pied">
              <span className="ed-compo-cout">
                {!iaOuverte ? "IA fermée · composition locale" : susp.suspecte ? "" : `${pluriel(est.lues, "photo")} lues · ≈ ${motDollars(est.dollars)}`}
              </span>
              {iaOuverte && dejaLues.size ? (
                <button type="button" className="ed-lien" title={`${pluriel(A.lues.length, "photo")} · ≈ ${motDollars(estTout.dollars)}`} onClick={() => { void lancer("tout"); }}>Relire tout</button>
              ) : null}
              {iaOuverte && susp.suspecte ? (
                <>
                  <button type="button" className="ed-bt" onClick={() => { void lancer("normal"); }} title="Composer sans cette lecture">Composer sans elle</button>
                  <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer("relire"); }}>Relire {pluriel(aRelire, "photo")} · ≈ {motDollars(est.dollars)}</button>
                </>
              ) : (
                <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer("normal"); }}>Composer</button>
              )}
            </footer>
          </>
        ) : phase.type === "analyse" ? (
          <>
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
            <footer className="ed-compo-pied">
              <span className="ed-compo-cout">Payé · {motDollars(phase.dollars)}</span>
              {enCours ? <button type="button" className="ed-bt" onClick={() => arret.current?.abort()}>Arrêter</button> : null}
            </footer>
          </>
        ) : phase.type === "arret" ? (
          <>
            <p className="ed-compo-texte ed-lire-err" role="status">{phase.texte}</p>
            <p className="ed-compo-texte ed-compo-sous">Rien n&apos;a été envoyé pour ces photos.{phase.dollars ? ` Déjà payé : ${motDollars(phase.dollars)}.` : ""}</p>
            <footer className="ed-compo-pied">
              <button type="button" className="ed-bt" onClick={() => setPhase({ type: "questions" })}>Retour</button>
              <button type="button" className="ed-bt ed-bt--plein" onClick={() => { void lancer(dernierMode.current); }}>Réessayer</button>
            </footer>
          </>
        ) : phase.type === "remplacer" ? (
          <>
            <p className="ed-compo-texte">{phase.r.pages} pages proposées · {pluriel(phase.r.selection.compte.posee, "photo posée", "photos posées")}</p>
            <footer className="ed-compo-pied">
              <button type="button" className="ed-bt" onClick={fermer}>Garder la mienne</button>
              <button type="button" className="ed-bt ed-bt--plein" onClick={() => charger_(phase.r, phase.dollars, phase.autres, phase.marques)}>Remplacer</button>
            </footer>
          </>
        ) : (
          <>
            <p className="ed-compo-texte ed-lire-err" role="status">{phase.phrase}</p>
            <p className="ed-compo-texte">{phase.cause}</p>
            <p className="ed-compo-texte ed-compo-sous">{phase.geste}</p>
            <details className="ed-compo-trace"><summary>Trace</summary><code>{phase.technique}</code></details>
            <footer className="ed-compo-pied">
              <button type="button" className="ed-bt ed-bt--plein" onClick={() => setPhase({ type: "questions" })}>Retour aux questions</button>
            </footer>
          </>
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
  /* l'empreinte de l'intérieur tel qu'il vient d'être chargé */
  useEffect(() => { if (p && !p.empreinte && cleProjet) void garder(cleProjet, { ...garde, proposition: { ...p, empreinte: emp } }); }, [p, emp, cleProjet, garde]);
  /* M-10 : une photo de couverture posée aussi à l'intérieur : on recompose l'intérieur sans elle (sans demander si l'intérieur n'a pas bougé) */
  const faces = facesCouverture(etat);
  const dedans = posees(etat);
  const doublon = !!faces && [...faces.premiere, ...faces.quatrieme].some((id) => dedans.has(id));
  const ficheDe = (taille?: "tout" | number): Fiche => ({ ...garde.fiche, ...(taille !== undefined ? { taille } : p?.resultat.origineTaille === "choisie" ? { taille: p.resultat.taille } : {}) });
  /** M-10 : l'intérieur recomposé sans la couverture ; rend la phrase d'un refus (M-14), sinon null. */
  const tenterSansDoublon = (): string | null => {
    if (!faces) return null;
    const m = marquesAtelier(etat, p);
    const x = composerLocal(etat, ficheDe(), luminancesGardees(cleProjet), faces, m);
    if (!x.ok) return x.phrase;
    const jet = { ...x.r.jet, magazine: { ...x.r.jet.magazine, couverture: etat.magazine.couverture } };
    envoyer({ type: "chargerPremierJet", jet });
    if (cleProjet) void garder(cleProjet, { ...garde, proposition: { ...resumer(x.r, p?.dollars ?? 0, p?.autres ?? [], m) } });
    return null;
  };
  const recomposer = () => setRefus(tenterSansDoublon());
  /* M-15 : une autre taille, recomposée d'un clic (sans rien payer : la lecture est déjà là) */
  const autreTaille = (a: AutreTaille) => {
    setConfirmer(null);
    const m = marquesAtelier(etat, p);
    const x = composerLocal(etat, ficheDe(a.taille), luminancesGardees(cleProjet), null, m);
    if (!x.ok) { setRefus(x.phrase); return; }
    setRefus(null);
    envoyer({ type: "chargerPremierJet", jet: x.r.jet });
    const autres = [...(p?.autres ?? []).filter((o) => o.pages !== x.r.pages), ...(p ? [{ mot: p.resultat.origineTaille === "commandee" ? "Commandé" : "Proposé", taille: p.resultat.taille, pages: p.pages, posees: p.resultat.selection.compte.posee }] : [])]
      .sort((u, v) => u.pages - v.pages);
    if (cleProjet) void garder(cleProjet, { ...garde, proposition: resumer(x.r, p?.dollars ?? 0, autres, m) });
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
        <button type="button" className="ed-bt" onClick={() => setFerme(p.quand)}>Fermer</button>
      </div>
      {ouvert && typeof document !== "undefined" ? createPortal(<PoseesEtLaissees p={p} fermer={() => setOuvert(false)} />, document.querySelector(".mep-editeur") ?? document.body) : null}
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
