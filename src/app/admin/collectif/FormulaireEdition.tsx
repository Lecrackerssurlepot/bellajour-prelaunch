"use client";

/* Le formulaire d'une édition, en SIX ÉTAPES (T-186, planche 5 du 19/10, validée
   par Mathias) : le même pour l'ouvrir (/nouvelle) et pour la régler (l'onglet
   « Réglages et liens » de la fiche). La règle est dans `@/lib/collectif/saisie`,
   relue par la route ; ce composant ne fait que la montrer.

   - Les étapes, dans l'ordre où l'on pense : le client, le calendrier, les
     magazines, les photos, ce que le client doit envoyer, le devis
     (`ETAPES_EDITION`). Un rail à gauche (horizontal sur téléphone), une étape
     à la fois, « ← étape précédente » et « étape suivante → » qui la nomment.
   - En création, « Créer l'édition » est là DÈS L'ÉTAPE 1 (planche 7 du 21/10,
     validée par Mathias) : activé quand les quatre champs obligatoires sont remplis
     (`CHAMPS_OBLIGATOIRES`, saisie.ts : l'organisation, l'événement, le NOM et l'e-mail
     du responsable), jamais par la touche Entrée (le bouton n'est pas un `submit` : au mieux Entrée avance d'une étape).
     Les cinq autres étapes sont facultatives et le disent (le rail, `eca-facultatif`) ;
     la fiche de l'édition garde la liste de ce qui manque (`aCompleter.ts`). La saisie
     est relue AVANT l'envoi par la même règle (`lireSaisieEdition`, module pur) : un
     champ fautif ramène à son étape et la nomme ; une erreur du serveur fait de même
     (`rangEtapeDuChamp`). Puis l'écran « L'édition est créée » (T-187).
   - En réglages, « Enregistrer » à chaque étape, et JAMAIS une carte dans une
     carte : le rail et le corps sont deux verres posés côte à côte, sans cadre
     autour ni cadres dedans (Mathias trouvait les cinq cadres brouillons).

   ⚠️ AUCUN CHIFFRE PRÉ-REMPLI. Un champ chiffré vide part vide, la base le garde
   à null et la fiche l'écrit [À FIXER] (PRD §0.3, §12).

   La clôture se choisit en un clic (« Dans 2 semaines »…) ou au calendrier, à
   23 h 59 heure de PARIS par défaut, et part en instant ISO avec fuseau
   (`instantDeParis`). L'instant présent vient du SERVEUR (prop `maintenant`) :
   les raccourcis ne dépendent pas du fuseau de l'ordinateur de l'atelier, et le
   rendu reste pur. En réglages, une clôture inchangée n'est pas renvoyée : une
   édition close reste réglable (saisie.ts).

   Planches 9, 10 et 11 du 19/10 au soir (T-189, T-190, validées par Mathias) :
   AUCUN champ du navigateur pour une date ou un chiffre. Le calendrier Bellajour
   (`Calendrier`) en plage pour les dates de l'événement (écrites « du 2 au 4
   octobre 2026 » dans `dates_texte`), en jour pour la clôture et la livraison ;
   les chiffres en pastille (`Pastille`) ; une poubelle par magazine
   (`ListeMagazines`) ; l'aperçu de la page des participants sous le message
   d'accueil (`ApercuDepot`). L'ancienne version : archive/formulaire-champs-navigateur-2026-10/. */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { suggestionEmail } from "@/lib/atelier/questionnaire";
import {
  champAvecHeure,
  champCloture,
  formaterHeure,
  formaterHeureCourte,
  formaterJourCourt,
  HEURE_CLOTURE,
  HEURE_OUVERTURE,
  joursEntre,
  libelleJour,
  lireChampCloture,
  lirePlage,
  phraseChampOuverture,
  phraseDepot,
  phraseDuree,
  phraseJoursPlage,
  pucesCloture,
  textePlage,
} from "@/lib/collectif/calendrier";
import { phraseMigrationAbsente } from "@/lib/collectif/atelierPhotos";
import { plafondLienMax } from "@/lib/collectif/plafonds";
import DemandesClient from "./DemandesClient";
import { instantDeParis, versChampParis } from "@/lib/collectif/dates";
import { formaterJour } from "@/lib/collectif/livraison";
import {
  accueilParDefaut,
  ETAPES_EDITION,
  lireSaisieEdition,
  obligatoiresManquants,
  phraseManque,
  rangEtape,
  rangEtapeDuChamp,
  SOUS_TITRE_ETAPE_CREATION,
  VALEURS_RAPIDES,
  type CleEtape,
} from "@/lib/collectif/saisie";
import type { DemandeEnBase } from "@/lib/collectif/demandes";
import ApercuDepot from "./ApercuDepot";
import Calendrier from "./Calendrier";
import { ecouterEtape, etapeDemandee, oublierEtape } from "./etapeDemandee";
import ListeMagazines, { type MagazineFormulaire } from "./ListeMagazines";
import Pastille from "./Pastille";
import "./formulaire.css";

export type { MagazineFormulaire };

/** Le calendrier ouvert, s'il y en a un (un seul à la fois). */
type Ouvert = "dates" | "cloture" | "livraison" | "ouverture";

export type ValeursEdition = {
  organisation: string;
  evenement: string;
  dates_texte: string;
  registre: string;
  cloture_local: string;
  /** « 2026-11-06T08:00 » (heure de Paris, sans fuseau) ; vide : le dépôt est ouvert dès la création (migration 20261023). */
  ouverture_local: string;
  /** `AAAA-MM-JJ`. Écrit seulement à la création ; en réglages, lu pour la frise (l'onglet Livraison le règle). */
  livraison_prevue_le: string;
  plafond_participant_atelier: string;
  plafond_total: string;
  preselection_max: string;
  pagination_prevue: string;
  tirage: string;
  tours_inclus: string;
  nb_propositions_couverture: string;
  couvertures_aimees_max: string;
  styles_segment: string;
  contenus_demandes: DemandeEnBase[];
  invitation_texte: string;
  responsable_email: string;
  responsable_nom: string;
  rdv_url: string;
  magazines: MagazineFormulaire[];
};

type Props =
  | { mode: "creation"; initiales: ValeursEdition; maintenant: string; ouvertureIndisponible?: boolean }
  | {
      mode: "modification";
      id: string;
      initiales: ValeursEdition;
      maintenant: string;
      /** Le jour où l'édition a été ouverte (`AAAA-MM-JJ`, Paris) : le premier jalon de la frise. */
      ouverteLe: string;
      plafondClient: number | null;
      /** La base n'a pas la colonne `ouverture_le` (migration 20261023) : le champ le dit et ne propose rien. */
      ouvertureIndisponible?: boolean;
      /** L'étape à ouvrir d'emblée (« Compléter », dans l'encart de la vue d'ensemble) : `?etape=devis`. */
      etapeInitiale?: CleEtape;
    };

type Erreurs = Record<string, string>;

const TONS = [
  { valeur: "entreprise_vous", libelle: "Vous · entreprise" },
  { valeur: "ecole_tu", libelle: "Tu · école" },
] as const;

const SEGMENTS_MUR = [
  { valeur: "tous", libelle: "Tous" },
  { valeur: "entreprise", libelle: "Entreprise" },
  { valeur: "ecole", libelle: "École" },
] as const;

const DERNIERE = ETAPES_EDITION.length - 1;

/** Ce que lit un chiffre vide du devis : jamais « à fixer », qui se lisait comme un reproche (planche 7). */
const A_COMPLETER_PLUS_TARD = "à compléter plus tard";

/** Une étape est « faite » si on l'a vue et que ses champs exigés sont remplis (seule la première en exige). */
function etapeComplete(i: number, v: ValeursEdition): boolean {
  if (i === 0) return obligatoiresManquants(v).length === 0;
  if (i === 2) return v.magazines.length > 0;
  return true;
}

/** « « Le client » », « « Le client » et « Le devis » ». */
function nommerEtapes(rangs: number[]): string {
  const noms = rangs.map((r) => `« ${ETAPES_EDITION[r].nom} »`);
  return noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}` : noms[0] ?? "";
}

export default function FormulaireEdition(props: Props) {
  const router = useRouter();
  const uid = useId();
  const haut = useRef<HTMLFormElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const creation = props.mode === "creation";
  const [v, setV] = useState<ValeursEdition>(props.initiales);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  /* « Compléter » (l'encart de la vue d'ensemble) ouvre d'emblée l'étape où vit le champ : par l'adresse (`?etape=`, lue
     par la page serveur) ou, si l'onglet n'était pas encore monté, par la demande qui l'attendait (`etapeDemandee`). */
  const [etape, setEtape] = useState(() => {
    const demandee = rangEtape(!creation && props.etapeInitiale ? props.etapeInitiale : etapeDemandee());
    return demandee ?? 0;
  });
  const [vues, setVues] = useState<number[]>(() => [0, etape].filter((x, i, l) => l.indexOf(x) === i));
  /* Le calendrier ouvert, et s'il prend le focus (ouvert au clavier ou par son bouton). */
  const [ouvert, setOuvert] = useState<Ouvert | null>(null);
  const [focusCalendrier, setFocusCalendrier] = useState(false);
  const zoneDates = useRef<HTMLDivElement>(null);
  const zoneCloture = useRef<HTMLDivElement>(null);
  const zoneLivraison = useRef<HTMLDivElement>(null);
  const zoneOuverture = useRef<HTMLDivElement>(null);
  const boutonDates = useRef<HTMLButtonElement>(null);
  const boutonCloture = useRef<HTMLButtonElement>(null);
  const boutonLivraison = useRef<HTMLButtonElement>(null);
  const boutonOuverture = useRef<HTMLButtonElement>(null);
  /* L'heure d'ouverture en cours de frappe : effacée un instant pour en taper une autre, elle ne change pas la valeur (null = on suit le champ). */
  const [heureSaisie, setHeureSaisie] = useState<string | null>(null);

  /* Les demandes d'étape suivantes (le formulaire est monté, l'onglet est masqué) : l'encart les envoie. */
  const demanderIci = useRef<(cle: string) => void>(() => undefined);
  useEffect(() => {
    demanderIci.current = (cle) => {
      const rang = rangEtape(cle);
      if (rang !== null) aller(rang);
    };
  });
  useEffect(() => {
    oublierEtape();
    return ecouterEtape((cle) => demanderIci.current(cle));
  }, []);

  const maintenantMs = Date.parse(props.maintenant);
  const aujourdhui = versChampParis(props.maintenant).slice(0, 10);
  const cloture = lireChampCloture(v.cloture_local);
  const puces = pucesCloture(aujourdhui, v.cloture_local);
  const suggestion = v.responsable_email.includes("@") ? suggestionEmail(v.responsable_email.trim().toLowerCase()) : null;
  /* Création : les quatre champs obligatoires encore vides. « Créer l'édition » s'active quand il n'en reste aucun. */
  const manquants = creation ? obligatoiresManquants(v) : [];
  const enErreur = [...new Set(Object.keys(erreurs).map(rangEtapeDuChamp))];

  const maj = <K extends keyof ValeursEdition>(champ: K, valeur: ValeursEdition[K]) => {
    setV((x) => ({ ...x, [champ]: valeur }));
    setMessage(null);
  };

  function ouvrir(quel: Ouvert, focus: boolean) {
    setOuvert(quel);
    setFocusCalendrier(focus);
  }

  /* Échap, « Garder », un jour choisi : le focus revient au bouton du champ ; un clic dehors le laisse où il est. */
  const fermer = useCallback(
    (rendreFocus: boolean) => {
      const bouton = ouvert === "dates" ? boutonDates : ouvert === "cloture" ? boutonCloture : ouvert === "ouverture" ? boutonOuverture : boutonLivraison;
      setOuvert(null);
      if (rendreFocus) bouton.current?.focus();
    },
    [ouvert]
  );

  function aller(i: number) {
    const cible = Math.max(0, Math.min(DERNIERE, i));
    setOuvert(null);
    setEtape(cible);
    setVues((x) => (x.includes(cible) ? x : [...x, cible]));
    /* Sur téléphone, l'étape suivante commence en haut : on y remonte si le haut du formulaire est sorti de l'écran,
       et le rail (qui y défile de côté) montre l'étape où l'on va. */
    const f = haut.current;
    if (f && f.getBoundingClientRect().top < 0) f.scrollIntoView({ block: "start" });
    rail.current?.children[cible]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function signaler(parChamp: Erreurs, partiel = false) {
    setErreurs(parChamp);
    const rangs = [...new Set(Object.keys(parChamp).map(rangEtapeDuChamp))].sort((a, b) => a - b);
    aller(rangs[0] ?? 0);
    setMessage({
      ok: false,
      texte: partiel ? `Le reste est enregistré ; à revoir dans ${nommerEtapes(rangs)}.` : `Rien n'est enregistré : à corriger dans ${nommerEtapes(rangs)}.`,
    });
  }

  /* Après l'écriture, la liste de la base (ne pas compter sur `router.refresh()` : l'état
     de l'écran ne la relirait pas, et un magazine ajouté repartirait en double). */
  function reprendreMagazines(relus?: { id: string; nom: string }[]) {
    if (!relus) return;
    setV((x) => ({
      ...x,
      magazines: relus.map((r) => {
        const avant = x.magazines.find((m) => m.id === r.id);
        return avant ? { ...avant, nom: r.nom } : { id: r.id, nom: r.nom, vide: true, etiquette: { texte: "vide", ton: "vide" } };
      }),
    }));
  }

  function choisirCloture(champ: string) {
    maj("cloture_local", champ);
    setErreurs((x) => {
      const reste = { ...x };
      delete reste.cloture_le;
      return reste;
    });
  }

  /* L'ouverture du dépôt : un jour du calendrier et une heure de Paris, « 2026-11-06T08:00 » ; vide = dès la création. */
  function choisirOuverture(champ: string) {
    maj("ouverture_local", champ);
    setHeureSaisie(null);
    setErreurs((x) => {
      const reste = { ...x };
      delete reste.ouverture_le;
      return reste;
    });
  }

  async function envoyer() {
    if (envoi) return;
    const locales: Erreurs = {};
    /* En réglages, une clôture inchangée ne repart pas : une édition close reste réglable. */
    const clotureChangee = creation || v.cloture_local !== props.initiales.cloture_local;
    let cloture_le = "";
    if (clotureChangee && v.cloture_local.trim()) {
      const iso = instantDeParis(v.cloture_local);
      if (!iso) locales.cloture_le = "Cette heure n'existe pas à Paris (changement d'heure) ou la date est illisible.";
      else cloture_le = iso;
    }
    /* L'ouverture du dépôt : en création seulement si elle est réglée, en réglages seulement si elle a changé
       (vide = l'effacer). Sans la colonne (migration 20261023), le champ n'est pas proposé et rien ne part. */
    const ouvertureChangee = !props.ouvertureIndisponible && (creation ? Boolean(v.ouverture_local) : v.ouverture_local !== props.initiales.ouverture_local);
    let ouverture_le = "";
    if (ouvertureChangee && v.ouverture_local) {
      const iso = instantDeParis(v.ouverture_local);
      if (heureSaisie === "") locales.ouverture_le = "Ouverture du dépôt : indiquer l'heure.";
      else if (!iso) locales.ouverture_le = "Cette heure n'existe pas à Paris (changement d'heure) ou la date est illisible.";
      else ouverture_le = iso;
    }

    const corps: Record<string, unknown> = {
      organisation: v.organisation,
      evenement: v.evenement,
      dates_texte: v.dates_texte,
      registre: v.registre,
      plafond_participant_atelier: v.plafond_participant_atelier,
      plafond_total: v.plafond_total,
      preselection_max: v.preselection_max,
      pagination_prevue: v.pagination_prevue,
      tirage: v.tirage,
      tours_inclus: v.tours_inclus,
      nb_propositions_couverture: v.nb_propositions_couverture,
      couvertures_aimees_max: v.couvertures_aimees_max,
      styles_segment: v.styles_segment,
      contenus_demandes: v.contenus_demandes,
      invitation_texte: v.invitation_texte,
      responsable_email: v.responsable_email,
      responsable_nom: v.responsable_nom,
      rdv_url: v.rdv_url,
      magazines: v.magazines.map((m) => ({ id: m.id, nom: m.nom })),
    };
    if (clotureChangee) corps.cloture_le = cloture_le;
    if (ouvertureChangee) corps.ouverture_le = ouverture_le;
    if (creation) corps.livraison_prevue_le = v.livraison_prevue_le;

    /* La même règle que la route, avant de rien envoyer : le champ fautif ramène à son étape. */
    if (creation && !Object.keys(locales).length) {
      const relue = lireSaisieEdition(corps, "creation", undefined, new Date());
      if (!relue.ok) for (const er of relue.erreurs) locales[er.champ] = locales[er.champ] ? `${locales[er.champ]} ${er.message}` : er.message;
    }
    if (Object.keys(locales).length) {
      signaler(locales);
      return;
    }

    setEnvoi(true);
    setErreurs({});
    setMessage(null);
    try {
      const rep = await fetch(
        props.mode === "creation" ? "/api/admin/collectif/editions" : `/api/admin/collectif/editions/${props.id}`,
        {
          method: props.mode === "creation" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(corps),
        }
      );
      const json = (await rep.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        message?: string;
        erreurs?: { champ: string; message: string }[];
        /** 409 d'un magazine commencé PENDANT l'enregistrement : le reste est écrit. */
        partiel?: boolean;
        /** Les magazines tels que la base les garde après l'écriture (réglages). */
        magazines?: { id: string; nom: string }[];
      };
      if (!rep.ok) {
        if (json.erreurs?.length) {
          const parChamp: Erreurs = {};
          for (const er of json.erreurs) parChamp[er.champ] = parChamp[er.champ] ? `${parChamp[er.champ]} ${er.message}` : er.message;
          signaler(parChamp, Boolean(json.partiel));
          if (json.partiel) {
            reprendreMagazines(json.magazines);
            router.refresh();
          }
        } else if (json.error === "migration_collectif_absente") {
          setMessage({ ok: false, texte: "La migration collectif n'est pas appliquée." });
        } else if (json.error === "migration_personnes_absente") {
          /* L'ouverture réglée sans la mise à jour de la base : rien n'est écrit (le serveur refuse avant), et on le dit
             à l'endroit du champ. Le reste du formulaire reste intact : retirer l'ouverture enregistre le reste. */
          const phrase = phraseMigrationAbsente("Le réglage de l'ouverture du dépôt");
          setErreurs({ ouverture_le: phrase });
          aller(rangEtapeDuChamp("ouverture_le"));
          setMessage({ ok: false, texte: "Rien n'est enregistré. Retirer l'ouverture pour enregistrer le reste." });
        } else {
          setMessage({ ok: false, texte: `Rien n'est enregistré (erreur ${rep.status}). Réessayer.` });
        }
        return;
      }
      if (props.mode === "creation" && json.id) {
        router.push(`/admin/collectif/creee/${json.id}`);
        return;
      }
      reprendreMagazines(json.magazines);
      setMessage({ ok: true, texte: "Enregistré." });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Le réseau n'a pas répondu. Rien n'est enregistré." });
    } finally {
      setEnvoi(false);
    }
  }

  const erreur = (champ: string) =>
    erreurs[champ] ? (
      <span className="eca-champ-erreur" role="alert">
        {erreurs[champ]}
      </span>
    ) : null;

  const texte = (
    champ: keyof ValeursEdition,
    label: string,
    opts: { requis?: boolean; facultatif?: boolean; aide?: string; type?: string; placeholder?: string; large?: boolean } = {}
  ) => (
    <label className={`eca-champ${opts.large ? " eca-champ--large" : ""}`}>
      <span className="eca-champ-label">
        {label}
        {opts.requis ? " *" : ""}
        {opts.facultatif ? <span className="eca-facultatif">facultatif</span> : null}
      </span>
      <input
        className="eca-input"
        type={opts.type ?? "text"}
        value={v[champ] as string}
        placeholder={opts.placeholder}
        onChange={(e) => maj(champ, e.target.value as never)}
        aria-invalid={erreurs[champ] ? true : undefined}
      />
      {opts.aide ? <span className="eca-champ-aide">{opts.aide}</span> : null}
      {erreur(champ)}
    </label>
  );

  /* Un chiffre en pastille « − 30 photos par personne + » (planche 11) : l'unité dedans,
     le clavier toujours possible, vide = « à fixer », « facultatif » ou « à compléter plus tard »
     (le devis, planche 7), jamais pré-rempli. */
  const chiffre = (champ: keyof ValeursEdition, label: string, unite: string, aide: string, min: number, vide = "à fixer") => (
    <div className="eca-champ">
      <label className="eca-champ-label" htmlFor={`${uid}-${champ}`}>
        {label}
      </label>
      <Pastille
        id={`${uid}-${champ}`}
        valeur={v[champ] as string}
        onChange={(x) => maj(champ, x as never)}
        unite={unite}
        min={min}
        vide={vide}
        libelle={label}
        invalide={Boolean(erreurs[champ])}
        rapides={VALEURS_RAPIDES[champ]}
      />
      {aide ? <span className="eca-champ-aide">{aide}</span> : null}
      {erreur(champ)}
    </div>
  );

  const choix = (
    champ: "registre" | "styles_segment",
    label: string,
    options: readonly { valeur: string; libelle: string }[],
    aide: string
  ) => (
    <div className="eca-champ">
      <span className="eca-champ-label" id={`${uid}-${champ}`}>
        {label}
      </span>
      <span className="eca-choix-liste" role="radiogroup" aria-labelledby={`${uid}-${champ}`}>
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={v[champ] === o.valeur}
            className="eca-choix"
            onClick={() => maj(champ, o.valeur)}
          >
            {o.libelle}
          </button>
        ))}
      </span>
      <span className="eca-champ-aide">{aide}</span>
      {erreur(champ)}
    </div>
  );

  /* ─────────────────────────────── les calendriers (planche 9) ─────────────────────────────── */
  const plage = lirePlage(v.dates_texte);
  const heureCloture = cloture?.heure ?? HEURE_CLOTURE;

  /* « Dates de l'événement » : un texte qu'on peut toujours taper, et le calendrier en plage. Un
     texte d'avant qui ne se relit pas (« début octobre ») reste tel quel, rien n'est sélectionné. */
  const champDates = (
    <div className="eca-champ">
      <label className="eca-champ-label" htmlFor={`${uid}-dates`}>
        {"Dates de l'événement"}
      </label>
      <div className="eca-cal-ancre" ref={zoneDates}>
        <span className={ouvert === "dates" ? "eca-cal-champ eca-cal-champ--ouvert" : "eca-cal-champ"}>
          <input
            id={`${uid}-dates`}
            className="eca-cal-saisie"
            value={v.dates_texte}
            placeholder="du 2 au 4 octobre 2026"
            autoComplete="off"
            onChange={(e) => maj("dates_texte", e.target.value)}
            onClick={() => {
              if (ouvert !== "dates") ouvrir("dates", false);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                ouvrir("dates", true);
              } else if (e.key === "Escape" && ouvert === "dates") {
                e.preventDefault();
                fermer(false);
              }
            }}
            aria-invalid={erreurs.dates_texte ? true : undefined}
          />
          <button
            ref={boutonDates}
            type="button"
            className="eca-cal-ico"
            aria-label="Choisir les dates au calendrier"
            aria-haspopup="dialog"
            aria-expanded={ouvert === "dates"}
            onClick={() => {
              if (ouvert === "dates") fermer(false);
              else ouvrir("dates", true);
            }}
          >
            ▾
          </button>
        </span>
        {ouvert === "dates" ? (
          <Calendrier
            mode="plage"
            libelle="Dates de l'événement"
            aujourdhui={aujourdhui}
            zone={zoneDates}
            focusAuDebut={focusCalendrier}
            onFermer={fermer}
            plage={plage}
            onPlage={(p) => maj("dates_texte", textePlage(p))}
            pied={
              <>
                <span>{plage ? phraseJoursPlage(plage) : "Le premier jour, puis le dernier"}</span>
                <span className="eca-cal-puces">
                  <button type="button" className="eca-cal-puce" onClick={() => maj("dates_texte", "")}>
                    Effacer
                  </button>
                  <button type="button" className="eca-cal-puce eca-cal-puce--on" onClick={() => fermer(true)}>
                    Garder
                  </button>
                </span>
              </>
            }
          />
        ) : null}
      </div>
      <span className="eca-champ-aide">{"Pour l'atelier seulement : elles s'affichent en tête de la fiche."}</span>
      {erreur("dates_texte")}
    </div>
  );

  /* ─────────────────────────────── la frise ─────────────────────────────── */
  const instantCloture = cloture ? Date.parse(instantDeParis(v.cloture_local) ?? "") : NaN;
  const ecart = cloture ? joursEntre(aujourdhui, cloture.jour) : null;
  /* L'ouverture du dépôt (migration 20261023) : réglée, elle devient le premier jalon de la frise, et la durée de
     la collecte part d'elle quand elle vient après aujourd'hui (le dépôt n'est pas ouvert avant). */
  const ouv = props.ouvertureIndisponible ? null : lireChampCloture(v.ouverture_local);
  const instantOuverture = ouv ? Date.parse(instantDeParis(v.ouverture_local) ?? "") : NaN;
  const ouvertureApresCloture = Number.isFinite(instantOuverture) && Number.isFinite(instantCloture) && instantOuverture >= instantCloture;
  const departDepot = ouv && ouv.jour > aujourdhui ? ouv.jour : aujourdhui;
  const ecartDepot = cloture ? joursEntre(departDepot, cloture.jour) : null;
  /* En création, la durée depuis l'ouverture du dépôt ; en réglages, ce qu'il reste (ou que c'est fini). */
  const duree =
    !cloture || ecart === null
      ? null
      : !creation && Number.isFinite(instantCloture) && instantCloture <= maintenantMs
        ? "La collecte est close"
        : !creation && ecart > 0
          ? `Encore ${phraseDuree(ecart)}`
          : phraseDuree(creation && ecartDepot !== null ? ecartDepot : ecart);
  const debut = props.mode === "creation" ? aujourdhui : props.ouverteLe;

  const frise = (
    <div className="eca-frise" role="list" aria-label="Le calendrier de l'édition">
      <span className="eca-jalon eca-jalon--plein" role="listitem">
        <i aria-hidden="true" />
        <b>{ouv ? "Ouverture du dépôt" : creation ? "Aujourd'hui" : "Ouverture"}</b>
        <span>{ouv ? `${formaterJourCourt(ouv.jour)}, ${formaterHeureCourte(ouv.heure)}` : formaterJourCourt(debut)}</span>
        <span>{ouv ? "les participants peuvent déposer" : creation ? "les liens s'ouvrent" : "les liens se sont ouverts"}</span>
      </span>
      <span className="eca-jalon" role="listitem">
        <i aria-hidden="true" />
        <b>L&apos;événement</b>
        <span>{v.dates_texte.trim() || "à préciser"}</span>
      </span>
      <span className={cloture ? "eca-jalon eca-jalon--plein" : "eca-jalon eca-jalon--alerte"} role="listitem">
        <i aria-hidden="true" />
        <b>Clôture</b>
        <span>{cloture ? `${formaterJourCourt(cloture.jour)}, ${formaterHeure(cloture.heure)}` : "à fixer"}</span>
        {cloture ? <span>les liens se ferment</span> : null}
      </span>
      <span className={v.livraison_prevue_le ? "eca-jalon" : "eca-jalon eca-jalon--creux"} role="listitem">
        <i aria-hidden="true" />
        <b>Livraison</b>
        <span>{v.livraison_prevue_le ? formaterJourCourt(v.livraison_prevue_le) : "facultatif"}</span>
        {creation ? null : <span>{"réglée dans l'onglet Livraison"}</span>}
      </span>
      {duree ? <span className="eca-duree">{duree}</span> : null}
    </div>
  );

  /* ─────────────────────────────── l'ouverture du dépôt ─────────────────────────────── */
  /* Un jour du calendrier Bellajour (en JOUR, comme la clôture) et une heure de Paris en pastille, jamais le champ
     du navigateur. Vide : le lien reçoit dès la création, comme avant. Le serveur la veut AVANT la clôture (422,
     `ouverture_le`) ; sans la migration 20261023 le champ le dit et ne propose rien. */
  const ecartOuverture = ouv ? joursEntre(aujourdhui, ouv.jour) : null;
  const champOuverture = (
    <div className="eca-champ">
      <span className="eca-champ-label" id={`${uid}-ouverture`}>
        Ouverture du dépôt
      </span>
      {props.ouvertureIndisponible ? (
        <>
          <span className="eca-choix-liste" role="group" aria-labelledby={`${uid}-ouverture`}>
            <button type="button" className="eca-choix" aria-pressed="true" disabled>
              Dès la création
            </button>
          </span>
          <span className="eca-champ-aide" role="note">
            {phraseMigrationAbsente("Ce réglage")}
          </span>
        </>
      ) : (
        <>
          <div className="eca-cal-ancre" ref={zoneOuverture}>
            <span className="eca-choix-liste" role="group" aria-labelledby={`${uid}-ouverture`}>
              <button
                type="button"
                className="eca-choix"
                aria-pressed={!ouv}
                onClick={() => {
                  setOuvert(null);
                  choisirOuverture("");
                }}
              >
                Dès la création
              </button>
              {ouv ? (
                <button type="button" className="eca-choix" aria-pressed="true" onClick={() => (ouvert === "ouverture" ? fermer(false) : ouvrir("ouverture", true))}>
                  {phraseChampOuverture(v.ouverture_local)}
                </button>
              ) : null}
              <button
                ref={boutonOuverture}
                type="button"
                className="eca-choix"
                aria-haspopup="dialog"
                aria-expanded={ouvert === "ouverture"}
                onClick={() => {
                  if (ouvert === "ouverture") fermer(false);
                  else ouvrir("ouverture", true);
                }}
              >
                Choisir au calendrier…
              </button>
            </span>
            {ouvert === "ouverture" ? (
              <Calendrier
                mode="jour"
                libelle="Ouverture du dépôt"
                aujourdhui={aujourdhui}
                min={aujourdhui}
                zone={zoneOuverture}
                focusAuDebut={focusCalendrier}
                onFermer={fermer}
                jour={ouv?.jour ?? null}
                onJour={(jour) => {
                  choisirOuverture(champCloture(jour, ouv?.heure ?? HEURE_OUVERTURE));
                  fermer(true);
                }}
                pied={
                  <>
                    <span className="eca-cal-heure">{`à ${formaterHeureCourte(ouv?.heure ?? HEURE_OUVERTURE)}, heure de Paris`}</span>
                    {ecartOuverture !== null && ecartOuverture >= 0 ? <span>{ecartOuverture === 0 ? "Aujourd'hui" : ecartOuverture === 1 ? "Demain" : `Dans ${ecartOuverture} jours`}</span> : null}
                  </>
                }
              />
            ) : null}
          </div>
          {ouv ? (
            <span className="eca-fm-heure">
              <label htmlFor={`${uid}-ouverture-heure`}>Heure</label>
              <Pastille
                id={`${uid}-ouverture-heure`}
                valeur={heureSaisie ?? String(Number(ouv.heure.slice(0, 2)))}
                onChange={(x) => {
                  setHeureSaisie(x === "" ? "" : null);
                  if (x !== "") maj("ouverture_local", champAvecHeure(v.ouverture_local, Number(x)));
                  setErreurs((e) => {
                    const reste = { ...e };
                    delete reste.ouverture_le;
                    return reste;
                  });
                }}
                unite={ouv.heure.endsWith(":00") ? "h" : `h ${ouv.heure.slice(3)}`}
                min={0}
                max={23}
                vide="à régler"
                libelle="Heure d'ouverture du dépôt"
                invalide={Boolean(erreurs.ouverture_le)}
              />
              <span className="eca-champ-aide">heure de Paris</span>
            </span>
          ) : null}
          <span className="eca-champ-aide">
            {ouv
              ? "Avant ce moment, les participants ne peuvent pas déposer ; le responsable et l'atelier, si. Les liens, eux, existent déjà."
              : "Le lien des participants reçoit des photos dès la création. Choisir un jour et une heure pour ne l'ouvrir que plus tard."}
          </span>
          {ouvertureApresCloture && !erreurs.ouverture_le ? (
            <p className="eca-avert" role="note">
              <b aria-hidden="true">!</b>
              <span>{"L'ouverture doit venir avant la clôture de la collecte."}</span>
            </p>
          ) : null}
        </>
      )}
      {erreur("ouverture_le")}
    </div>
  );

  /* ─────────────────────────────── les étapes ─────────────────────────────── */
  const etapes: React.ReactNode[] = [
    /* 1 · Le client */
    <>
      {/* Création : ce qui est obligatoire se dit en tête, et le reste peut attendre (planche 7). */}
      {creation ? (
        <p className="eca-oblig-ligne">
          <b>*</b>{" "}Obligatoire. Tout le reste peut attendre : la fiche de l&apos;édition vous dira ce qui manque.
        </p>
      ) : null}
      <div className="eca-deux-champs">
        {texte("organisation", "Organisation", { requis: true, placeholder: "Lycée Montaigne, Maison Aubier…" })}
        {texte("evenement", "Nom de l'événement", { requis: true, placeholder: "Promo 2026, Séminaire d'automne…" })}
      </div>
      {choix(
        "registre",
        "Le ton de l'espace",
        TONS,
        creation ? "Choisi d'office : « Vous ». Tout l'espace et les mails parlent ainsi." : "Tout l'espace et les mails parlent ainsi."
      )}
      <div className="eca-deux-champs">
        {texte("responsable_nom", "Nom du responsable", { requis: creation })}
        {texte("responsable_email", "E-mail du responsable", {
          requis: true,
          type: "email",
          aide: "Reçoit le lien de l'espace ; c'est lui qui valide le bon à tirer.",
        })}
      </div>
      {suggestion ? (
        <p className="eca-encart">
          Faute de frappe ? Vouliez-vous dire <strong>{suggestion}</strong> ?{" "}
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => maj("responsable_email", suggestion)}>
            Corriger
          </button>
        </p>
      ) : null}
      {texte("rdv_url", "Lien de rendez-vous (Google)", {
        facultatif: true,
        type: "url",
        placeholder: "https://calendar.app.google/…",
        aide: creation
          ? "Le client l'ouvre depuis son espace pour prendre rendez-vous. https:// seulement."
          : "Le client l'ouvre depuis son espace pour prendre rendez-vous, tant que les créneaux de l'atelier n'y sont pas reliés. https:// seulement.",
      })}
      {creation ? (
        <p className="eca-champ-aide">
          <label className="eca-case eca-case--eteinte">
            <input type="checkbox" disabled /> Édition de démonstration
          </label>{" "}
          Arrive plus tard (photos et notes fictives, aucun mail, hors chiffres).
        </p>
      ) : null}
    </>,

    /* 2 · Le calendrier */
    <>
      {frise}
      {champOuverture}
      <div className="eca-champ">
        <span className="eca-champ-label" id={`${uid}-cloture`}>
          Clôture de la collecte
        </span>
        {/* Les raccourcis, puis le calendrier en JOUR (planche 9) : les jours passés barrés, la
            clôture à 23 h 59 heure de Paris (une clôture d'une autre heure garde la sienne). */}
        <div className="eca-cal-ancre" ref={zoneCloture}>
          <span className="eca-choix-liste" role="group" aria-labelledby={`${uid}-cloture`}>
            {puces.map((p) => (
              <button
                key={p.cle}
                type="button"
                className="eca-choix"
                aria-pressed={p.actif}
                onClick={() => {
                  if (p.cle !== "choisie") {
                    setOuvert(null);
                    choisirCloture(p.champ);
                  } else if (ouvert === "cloture") fermer(false);
                  else ouvrir("cloture", true);
                }}
              >
                {p.libelle}
              </button>
            ))}
            <button
              ref={boutonCloture}
              type="button"
              className="eca-choix"
              aria-haspopup="dialog"
              aria-expanded={ouvert === "cloture"}
              onClick={() => {
                if (ouvert === "cloture") fermer(false);
                else ouvrir("cloture", true);
              }}
            >
              Choisir au calendrier…
            </button>
          </span>
          {ouvert === "cloture" ? (
            <Calendrier
              mode="jour"
              libelle="Clôture de la collecte"
              aujourdhui={aujourdhui}
              min={aujourdhui}
              zone={zoneCloture}
              focusAuDebut={focusCalendrier}
              onFermer={fermer}
              jour={cloture?.jour ?? null}
              onJour={(jour) => {
                choisirCloture(champCloture(jour, heureCloture));
                fermer(true);
              }}
              pied={
                <>
                  <span className="eca-cal-heure">{`à ${formaterHeure(heureCloture)}, heure de Paris`}</span>
                  {ecart !== null && ecart >= 0 ? <span>{phraseDepot(ecart)}</span> : null}
                </>
              }
            />
          ) : null}
        </div>
        <span className="eca-champ-aide">
          {`À ${formaterHeure(cloture?.heure ?? HEURE_CLOTURE)}, heure de Paris. Les liens des participants se ferment seuls ; vous pouvez clore plus tôt depuis la fiche, ou le client peut terminer lui-même.`}
          {cloture ? (
            <>
              {" "}
              <button type="button" className="eca-lien-texte" onClick={() => choisirCloture("")}>
                Retirer la date
              </button>
            </>
          ) : null}
        </span>
        {erreur("cloture_le")}
      </div>
      <div className="eca-deux-champs">
        {champDates}
        {creation ? (
          <div className="eca-champ">
            <span className="eca-champ-label" id={`${uid}-livraison`}>
              Livraison souhaitée
            </span>
            {/* Le même calendrier, en JOUR et sans heure (planche 9). */}
            <div className="eca-cal-ancre" ref={zoneLivraison}>
              <button
                ref={boutonLivraison}
                type="button"
                className={`eca-cal-champ eca-cal-champ--bouton${ouvert === "livraison" ? " eca-cal-champ--ouvert" : ""}${erreurs.livraison_prevue_le ? " eca-cal-champ--erreur" : ""}`}
                aria-haspopup="dialog"
                aria-expanded={ouvert === "livraison"}
                aria-labelledby={`${uid}-livraison ${uid}-livraison-valeur`}
                onClick={() => {
                  if (ouvert === "livraison") fermer(false);
                  else ouvrir("livraison", true);
                }}
              >
                <span id={`${uid}-livraison-valeur`} className={v.livraison_prevue_le ? "eca-cal-valeur" : "eca-cal-valeur eca-cal-valeur--vide"}>
                  {v.livraison_prevue_le ? formaterJour(v.livraison_prevue_le) : "Choisir un jour"}
                </span>
                <span className="eca-cal-ico" aria-hidden="true">
                  ▾
                </span>
              </button>
              {ouvert === "livraison" ? (
                <Calendrier
                  mode="jour"
                  libelle="Livraison souhaitée"
                  aujourdhui={aujourdhui}
                  min={aujourdhui}
                  zone={zoneLivraison}
                  focusAuDebut={focusCalendrier}
                  onFermer={fermer}
                  jour={v.livraison_prevue_le || null}
                  onJour={(jour) => {
                    maj("livraison_prevue_le", jour);
                    fermer(true);
                  }}
                  pied={
                    <>
                      <span>{v.livraison_prevue_le ? libelleJour(v.livraison_prevue_le) : "Un jour, sans heure"}</span>
                      {v.livraison_prevue_le ? (
                        <span className="eca-cal-puces">
                          <button type="button" className="eca-cal-puce" onClick={() => maj("livraison_prevue_le", "")}>
                            Effacer
                          </button>
                        </span>
                      ) : null}
                    </>
                  }
                />
              ) : null}
            </div>
            <span className="eca-champ-aide">Facultatif. Le client la voit dans « Livraison ».</span>
            {erreur("livraison_prevue_le")}
          </div>
        ) : (
          <div className="eca-champ">
            <span className="eca-champ-label">Livraison souhaitée</span>
            <span className="eca-input eca-input--lu">{v.livraison_prevue_le ? formaterJour(v.livraison_prevue_le) : "Pas encore fixée"}</span>
            <span className="eca-champ-aide">
              {"Elle se règle dans l'onglet "}
              <a href="?onglet=livraison" data-onglet="livraison" className="eca-lien-texte">
                Livraison
              </a>
              {", avec l'adresse. Le client la voit dans « Livraison »."}
            </span>
          </div>
        )}
      </div>
      {cloture ? null : (
        <p className="eca-avert" role="note">
          <b aria-hidden="true">!</b>
          <span>{"Sans date de clôture, la collecte reste ouverte jusqu'à ce que quelqu'un la ferme."}</span>
        </p>
      )}
    </>,

    /* 3 · Les magazines */
    <>
      {/* Une poubelle par ligne (planche 10) : la règle est `retraitMagazine`, relue par le PATCH. */}
      <div className="eca-champ eca-fm-champ-mags">
        <ListeMagazines magazines={v.magazines} onChange={(m) => maj("magazines", m)} invalide={Boolean(erreurs.magazines)} nomsAuto={creation} />
        <span className="eca-champ-aide">
          {creation
            ? "Chaque magazine a son brief : le client le compose pièce par pièce sur le mur (palette, typographies, doubles pages, couvertures), d'un seul style ou de plusieurs. Il s'appelle « Magazine 1 » d'office : le renommer se fait ici ou plus tard, dans les réglages."
            : "Chaque magazine a son brief : le client le compose pièce par pièce sur le mur. Un magazine encore vide se retire ; à l'enregistrement, les suivants prennent son numéro."}
        </span>
        {erreur("magazines")}
      </div>
      <div className="eca-deux-champs">
        {chiffre(
          "couvertures_aimees_max",
          "Couvertures que le client peut aimer",
          "couvertures par magazine",
          "Il les marque sur le mur ; au-delà, il en retire une. Vide : il ne peut en aimer aucune.",
          0
        )}
        {choix(
          "styles_segment",
          "Styles proposés sur le mur",
          SEGMENTS_MUR,
          "Le mur ne montre que les styles publiés pour ce public, et ceux faits pour tous. « Tous » les montre tous."
        )}
      </div>
    </>,

    /* 4 · Les photos */
    <>
      <div className="eca-deux-champs">
        {chiffre(
          "plafond_participant_atelier",
          "Par personne",
          "photos par personne",
          `Facultatif, un plafond de sécurité : sans lui, un lien porte jusqu'à ${plafondLienMax({ plafond_participant_atelier: null })} photos par personne. Le responsable peut baisser ce nombre, jamais le dépasser.`,
          1,
          "facultatif"
        )}
        {/* D27 (T-195, Mathias le 20/10) : vide = pas de limite pour toute l'édition, jamais un chiffre deviné. */}
        {chiffre("plafond_total", "Pour toute l'édition", "photos au total", "Compte tout le monde, sauf l'atelier. Laisser vide : pas de limite pour toute l'édition.", 1, "sans limite")}
      </div>
      {props.mode === "modification" ? (
        <p className="eca-champ-aide">
          Réglé par le responsable au curseur :{" "}
          {props.plafondClient === null ? `pas encore${v.plafond_participant_atelier.trim() ? " (le plafond de l'atelier s'applique)" : ""}` : `${props.plafondClient} photos par personne`}.
        </p>
      ) : null}
      {chiffre(
        "preselection_max",
        "La sélection du client",
        "photos qu'il peut mettre de côté",
        "Facultatif. Il lit « Ma sélection, 12 sur ce nombre » : un repère, pas une limite.",
        0,
        "facultatif"
      )}
      {/* Où va ce message (planche 11) : la page des participants en petit, qui suit la frappe. */}
      <div className="eca-fm-apercu-zone">
        <div className="eca-champ">
          <label className="eca-champ-label" htmlFor={`${uid}-invitation`}>
            {"Message d'accueil des participants"}
          </label>
          <textarea
            id={`${uid}-invitation`}
            className="eca-textarea"
            value={v.invitation_texte}
            onChange={(e) => maj("invitation_texte", e.target.value)}
            aria-invalid={erreurs.invitation_texte ? true : undefined}
          />
          <span className="eca-champ-aide">
            {`Il s'affiche sous le nom de l'événement, sur la page qu'ouvrent les participants avec le lien ou le QR code. Vide : « ${accueilParDefaut(v.registre)} »`}
          </span>
          {erreur("invitation_texte")}
        </div>
        <ApercuDepot organisation={v.organisation} evenement={v.evenement} message={v.invitation_texte} registre={v.registre} />
      </div>
    </>,

    /* 5 · À envoyer par le client : les demandes sur mesure (T-191, planche 12), dans leur propre composant. */
    <DemandesClient key="envoyer" valeur={v.contenus_demandes} onChange={(d) => maj("contenus_demandes", d)} erreur={erreurs.contenus_demandes} />,

    /* 6 · Le devis */
    <>
      {/* Rien n'est obligatoire ici : la fiche de l'édition garde la liste de ce qui manque (planche 7). */}
      <p className="eca-encart eca-encart--doux">
        {"Rien n'est obligatoire dans cette étape. Remplissez ce que vous savez : "}
        <b>la fiche de l&apos;édition liste ce qui manque</b>
        {", et le devis se complète quand le client a répondu."}
      </p>
      <div className="eca-deux-champs">
        {chiffre("pagination_prevue", "Pagination prévue au devis", "pages", "Indicative : la pagination réelle se lit dans chaque PDF déposé.", 1, A_COMPLETER_PLUS_TARD)}
        {chiffre("tirage", "Tirage prévu au devis", "exemplaires", "Le client le lit dans ses documents.", 1, A_COMPLETER_PLUS_TARD)}
        {chiffre("tours_inclus", "Tours de corrections inclus", "tours", "Les tours de bon à tirer compris dans le devis.", 1, A_COMPLETER_PLUS_TARD)}
        {chiffre(
          "nb_propositions_couverture",
          "Propositions de couverture au premier tour",
          "propositions",
          "Montrées avec le premier bon à tirer. Vide : le premier tour ne se publie pas.",
          1,
          A_COMPLETER_PLUS_TARD
        )}
      </div>
      <p className="eca-champ-aide">{`Aucun chiffre n'est proposé d'avance : un champ vide reste « ${A_COMPLETER_PLUS_TARD} ».`}</p>
    </>,
  ];

  const precedente = etape > 0 ? ETAPES_EDITION[etape - 1] : null;
  const suivante = etape < DERNIERE ? ETAPES_EDITION[etape + 1] : null;

  return (
    <form
      ref={haut}
      className={creation ? "eca-form-grille" : "eca-form-grille eca-form-grille--reglages"}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        /* Entrée dans un champ : en création, l'étape suivante, JAMAIS la création (« Créer l'édition » est un geste voulu,
           planche 7) ; en réglages, l'enregistrement. */
        if (creation) {
          if (etape < DERNIERE) aller(etape + 1);
        } else void envoyer();
      }}
    >
      <ol ref={rail} className="eca-form-rail" aria-label="Les étapes">
        {ETAPES_EDITION.map((et, i) => {
          const statut = i === etape ? "on" : enErreur.includes(i) ? "erreur" : creation && vues.includes(i) && etapeComplete(i, v) ? "fait" : "";
          return (
            <li key={et.cle}>
              <button
                type="button"
                className={statut ? `eca-form-pas eca-form-pas--${statut}` : "eca-form-pas"}
                aria-current={i === etape ? "step" : undefined}
                onClick={() => aller(i)}
              >
                <span className="eca-form-signe" aria-hidden="true">
                  {statut === "fait" ? "✓" : statut === "erreur" ? "!" : i + 1}
                </span>
                {creation ? (
                  <span className="eca-pas-txt">
                    {et.nom}
                    <small>{SOUS_TITRE_ETAPE_CREATION[et.cle]}</small>
                  </span>
                ) : (
                  <span>{et.nom}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="eca-form-corps">
        <h2 className="eca-form-titre">{ETAPES_EDITION[etape].nom}</h2>
        {etapes[etape]}
        <div className="eca-form-pied">
          <span className="eca-form-nav">
            {precedente ? (
              <button type="button" className="eca-bouton" aria-label={`Étape précédente : ${precedente.nom}`} onClick={() => aller(etape - 1)}>
                ← {precedente.nom}
              </button>
            ) : null}
            {!creation && suivante ? (
              <button type="button" className="eca-bouton" aria-label={`Étape suivante : ${suivante.nom}`} onClick={() => aller(etape + 1)}>
                {suivante.nom} →
              </button>
            ) : null}
          </span>
          {/* ⚠️ Chaque bouton a sa CLÉ et son type FIXE : sans elles, React garde le même <button> et le passe
              en `submit` pendant le clic sur « Le devis → », et le navigateur envoie le formulaire (vu à la recette
              du 19/10 : l'édition se créait sans passer par la dernière étape). Depuis la planche 7 (21/10),
              « Créer l'édition » est là à CHAQUE étape, et c'est un `button` qui n'envoie que par son clic :
              la touche Entrée ne crée jamais par erreur. */}
          {creation ? (
            <span className="eca-form-actions">
              {suivante ? (
                <button key="suivante" type="button" className="eca-bouton" aria-label={`Étape suivante : ${suivante.nom}`} onClick={() => aller(etape + 1)}>
                  {suivante.nom} →
                </button>
              ) : null}
              <button
                key="creer"
                type="button"
                className="eca-bouton eca-bouton--plein"
                disabled={envoi || manquants.length > 0}
                aria-describedby={`${uid}-creer-aide`}
                onClick={() => void envoyer()}
              >
                {envoi ? "Enregistrement…" : "Créer l'édition"}
              </button>
            </span>
          ) : (
            <button key="envoyer" type="submit" className="eca-bouton eca-bouton--plein" disabled={envoi}>
              {envoi ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          )}
        </div>
        {creation ? (
          <p id={`${uid}-creer-aide`} className="eca-champ-aide eca-form-rien">
            {manquants.length > 0
              ? phraseManque(manquants)
              : etape === 0
                ? "Les cinq étapes suivantes sont facultatives : vous pouvez créer l'édition dès maintenant. Rien ne part chez le client."
                : "Rien ne part chez le client à cette étape : l'écran suivant vous propose d'envoyer les liens."}
          </p>
        ) : null}
        {message ? (
          <p className={`eca-message ${message.ok ? "eca-message--ok" : "eca-message--erreur"}`} role="status">
            {message.texte}
          </p>
        ) : null}
      </div>
    </form>
  );
}
