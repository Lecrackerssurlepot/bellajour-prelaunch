"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PanneauAction from "./PanneauAction";
import Parcours from "./Parcours";
import Carnet from "./Carnet";
import Impression, { type FichierImpression } from "./Impression";
import { SLOTS_IMPRESSION } from "@/lib/atelier/impression";
import type { EvenementVue, Fiche as FicheVue } from "../types";
import Loupe, { type VueLoupe } from "@/app/components/Loupe";
import EnCharge from "./EnCharge";
import { PRENOM_COMPTE } from "@/lib/admin-auth";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  choisirDossier,
  ecrireLot,
  listeDesLiens,
  supporteDossier,
  telechargerTexte,
  COMMANDE_REPLI,
  type PhotoLot,
} from "./telechargement";

/**
 * La fiche dossier — tout ce qu'il faut pour composer un numéro et le faire
 * avancer, sur un seul écran.
 *
 * L'ordre des blocs est l'ordre du travail : ce qu'on doit faire d'abord,
 * puis la matière (son histoire, ses photos), puis les preuves (mails,
 * journal). Ce n'est pas un formulaire d'administration, c'est un plan de
 * travail.
 */

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function poids(o: number | null): string {
  if (!o) return "";
  return o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(o / 1024)} Ko`;
}

/**
 * Une ligne du journal, en français.
 *
 * Le payload brut n'est pas supprimé, il est REPLIÉ : la phrase sert à
 * comprendre, le JSON sert à déboguer. Les deux ont leur usage, à deux
 * moments différents, et un seul doit être visible par défaut.
 */
/**
 * T-021 — le code Stripe de 30 € des fondatrices (CGV art. 5 bis).
 *
 * ⚠️ CE BOUTON N'EST PLUS NÉCESSAIRE AU PARCOURS NORMAL. Depuis le 01/09, la
 * remise s'applique toute seule au moment du paiement : la cliente clique
 * « Commander » et voit « -30,00 € » chez Stripe, sans rien taper. Ce bouton
 * reste le FILET — pour dicter le code au téléphone, ou le donner à une
 * fondatrice qui commande autrement.
 *
 * Le clic appelle /api/admin/atelier/fondatrice-code, qui re-vérifie
 * `waitlist` côté serveur avant de frapper le code : la fiche PROPOSE, le
 * serveur DÉCIDE. Un code déjà créé (journal `code_fondatrice_cree`) arrive
 * par la prop `existant` et le bouton disparaît — un crédit contractuel ne
 * se frappe qu'une fois, et le même code sert au checkout automatique.
 */
function CodeFondatrice({
  token,
  existant,
  demo,
}: {
  token: string;
  existant: { code: string; creeLe: string } | null;
  demo?: boolean;
}) {
  const [code, setCode] = useState(existant?.code ?? null);
  const [creeLe, setCreeLe] = useState(existant?.creeLe ?? null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [sansJournal, setSansJournal] = useState(false);
  /* Le crédit a déjà servi (Stripe dit `times_redeemed >= max_redemptions`).
     On montre quand même le code : c'est la réponse à « pourquoi a-t-elle
     payé plein tarif sur ce numéro-ci ». */
  const [consomme, setConsomme] = useState(false);

  async function creer() {
    if (demo) {
      setErreur("Démonstration : rien n'est créé.");
      return;
    }
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/fondatrice-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const corps = (await r.json().catch(() => ({}))) as {
        code?: string;
        creeLe?: string;
        journalEcrit?: boolean;
        consomme?: boolean;
        error?: string;
        pourquoi?: string;
      };
      if (!r.ok || !corps.code) {
        if (corps.error === "config") {
          setErreur("Clé Stripe absente sur le serveur (STRIPE_SECRET_KEY) : rien n'a été créé.");
        } else if (corps.error === "pas_fondatrice") {
          setErreur(
            "Le serveur ne trouve pas de fondateur confirmé pour cet email : rien n'a été créé.",
          );
        } else if (corps.error === "indisponible") {
          setErreur(
            `Impossible de vérifier le crédit (${corps.pourquoi ?? "sans détail"}) : rien n'a été créé. Réessayez.`,
          );
        } else {
          setErreur("Le code n'a pas pu être créé.");
        }
        return;
      }
      setCode(corps.code);
      setCreeLe(corps.creeLe ?? null);
      setSansJournal(corps.journalEcrit === false);
      setConsomme(corps.consomme === true);
    } catch {
      setErreur("Réseau interrompu.");
    } finally {
      setOccupe(false);
    }
  }

  async function copier() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* Le code reste affiché : la sélection à la main marche toujours. */
    }
  }

  if (code) {
    return (
      <div className="ate-code-fondatrice">
        <p className="ate-code-ligne">
          <code className="ate-mono">{code}</code>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={copier}>
            {copie ? "Copié" : "Copier"}
          </button>
        </p>
        <p className="ate-faint">
          {consomme
            ? "Ce crédit a déjà été dépensé sur une commande. Il ne s'appliquera plus."
            : "Créé le " +
              fmt(creeLe) +
              ". Rien à envoyer : la remise de 30 € s'applique toute seule au moment du paiement. Ce code ne sert qu'à l'annoncer de vive voix."}
        </p>
        {sansJournal ? (
          <p className="ate-erreur">
            Le journal n&apos;a pas enregistré ce code : notez-le maintenant, un nouveau clic en
            créerait un second.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="ate-code-fondatrice">
      <button type="button" className="adm-btn" onClick={creer} disabled={occupe}>
        {occupe ? "Création chez Stripe…" : "Créer le code de 30 €"}
      </button>
      {erreur ? <p className="ate-erreur">{erreur}</p> : null}
    </div>
  );
}

function Evenement({ e }: { e: EvenementVue }) {
  const [ouvert, setOuvert] = useState(false);
  const details = Object.keys(e.payload ?? {}).length > 0;
  return (
    <li className={`ate-ev ate-ev--${e.recit.ton}`}>
      <button
        type="button"
        className="ate-ev-tete"
        onClick={() => details && setOuvert((o) => !o)}
        aria-expanded={ouvert}
        title={details ? "Voir le détail technique" : undefined}
      >
        <span className="ate-ev-point" aria-hidden />
        <span className="ate-ev-corps">
          <span className="ate-ev-texte">{e.recit.texte}</span>
          {e.recit.detail ? <span className="ate-ev-detail">{e.recit.detail}</span> : null}
        </span>
        <span className="ate-ev-date">{fmt(e.createdAt)}</span>
      </button>
      {ouvert ? <pre className="ate-ev-payload">{JSON.stringify(e.payload, null, 2)}</pre> : null}
    </li>
  );
}

/* Combien de vignettes avant de replier. Trois lignes de grille suffisent à
   juger d'un lot ; quarante vignettes repoussent le reste de la fiche sous la
   ligne de flottaison et transforment l'outil en galerie. */
const VIGNETTES_VISIBLES = 12;

/* Combien de vignettes s'ajoutent a chaque clic. Voir le commentaire de
   `visibles` plus bas : tant que la grille sert les originaux, deplier tout
   un lot d'un coup fige l'onglet. */
const TRANCHE_PHOTOS = 12;

/**
 * Les trois visuels de l'aperçu, nommés COMME LA CLIENTE LES VOIT.
 *
 * « C1 » et « C4 » sont du jargon d'imprimeur : à la recette du 25/08, l'encart
 * a été jugé « pas clair » des deux côtés. Deux personnes qui regardent le
 * même visuel doivent le nommer pareil, sinon le téléphone avec la cliente
 * devient une traduction.
 */
const APERCU_VUES = [
  { cle: "c1", legende: "La couverture" },
  { cle: "c4", legende: "La quatrième" },
  { cle: "double", legende: "Une double page" },
] as const;

/* Une vue de l'encart aperçu. `loupe` est la légende de la vue que le clic
   agrandit : en mode à plat (T2-2), les deux faces découpées ouvrent le même
   objet entier, et la loupe navigue par légende — il lui faut des légendes
   uniques. */
type ApercuVue = {
  cle: string;
  src: string | null;
  legende: string;
  loupe: string;
  decoupe?: "droite" | "gauche";
};

/* Le même choix de rendu que la page cliente (Apercu.tsx) : un dossier au
   format à plat montre deux faces DÉCOUPÉES du même fichier plus l'objet
   entier ; un dossier historique montre ses trois fichiers. Mêmes mots des
   deux côtés, toujours. */
function vuesDeLApercu(apercu: FicheVue["apercu"]): ApercuVue[] {
  if (apercu.plat) {
    /* T-090 — la planche découpée en trois faces, puis 0 à trois doubles
       pages dans l'ordre. Les légendes sont uniques (« Double page 1/2/… »
       s'il y en a plusieurs) : la loupe navigue par légende. */
    const vues: ApercuVue[] = [
      { cle: "plat-c1", src: apercu.plat, legende: "La couverture", loupe: "La couverture à plat", decoupe: "droite" },
      { cle: "plat-c4", src: apercu.plat, legende: "La quatrième", loupe: "La couverture à plat", decoupe: "gauche" },
      { cle: "plat", src: apercu.plat, legende: "La couverture à plat", loupe: "La couverture à plat" },
    ];
    apercu.doubles.forEach((src, i) => {
      const nom = apercu.doubles.length > 1 ? `Double page ${i + 1}` : "Une double page";
      vues.push({ cle: `double-${i}`, src, legende: nom, loupe: nom });
    });
    return vues;
  }
  return APERCU_VUES.map(({ cle, legende }) => ({ cle, src: apercu[cle], legende, loupe: legende }));
}

/**
 * Ce que le téléchargement raconte à l'écran.
 *
 * Un lot de deux cents photos prend des minutes. Un bouton qui ne dit rien
 * pendant deux minutes est un bouton cassé : on le reclique, et on repart
 * pour un tour. La phase est donc affichée en toutes lettres, avec un moyen
 * d'arrêter.
 */
type EtatLot =
  | { phase: "repos" }
  | { phase: "prepare" }
  | { phase: "ecrit"; faites: number; total: number; enCours: string }
  | { phase: "fini"; dossier: string; ecrites: number; ratees: string[]; interrompu: boolean }
  | { phase: "repli"; fichier: string }
  | { phase: "erreur"; message: string };

/** La fiche vue par le brief. Le brief ne connaît pas la fiche : il demande. */
function matiereDe(fiche: FicheVue): MatiereBrief {
  const l = fiche.ligne;
  return {
    titre: l.titre,
    prenom: l.prenom,
    email: l.email,
    token: l.token,
    libelleEtat: l.libelleEtat,
    nbPhotos: fiche.photos.length,
    nbPages: l.nbPages,
    palier: fiche.palier,
    euros: l.euros,
    createdAt: l.createdAt,
    occasion: fiche.occasion,
    histoire: fiche.histoire,
    sousTitre: fiche.sousTitre,
    motQuatrieme: fiche.motQuatrieme,
    canvaTravail: fiche.canvaTravail,
    notes: fiche.notes.map((n) => ({ prenom: n.prenom, texte: n.texte, createdAt: n.createdAt })),
  };
}

export default function Fiche({
  fiche,
  moi,
  demo,
}: {
  fiche: FicheVue;
  /** Identifiant du compte connecté — décide qui peut supprimer ses notes. */
  moi: string;
  demo?: boolean;
}) {
  /* Un COMPTE, pas un booleen. La grille servait les ORIGINAUX R2 (plafond
     5200 px, plusieurs Mo piece) dans des cases de 84 px : deplier d'un coup
     un lot de cent, c'etait des centaines de Mo a decoder sur le thread
     principal, et l'onglet qui se fige. On deplie par tranches.
     ⚠️ LA CAUSE EST REGLEE DEPUIS LE 30/08 (D7) : le navigateur depose sa
     vignette de 320 px a cote de l'original, et `urlVignette` la sert ici.
     Ce depliage par tranches RESTE, parce que les dossiers anterieurs n'ont
     pas de vignette tant que `scripts/vignettes-rattrapage.ts` n'est pas
     passe, et parce qu'un HEIC que le navigateur n'a pas su decoder n'en
     aura jamais. Le retirer, c'est parier que toutes les photos de toutes
     les fiches sont legeres. */
  const [visibles, setVisibles] = useState(VIGNETTES_VISIBLES);
  const [lot, setLot] = useState<EtatLot>({ phase: "repos" });
  const [apercuOuvert, setApercuOuvert] = useState<number | null>(null);
  /* `supporteDossier()` lit `window` : appelé au rendu, il rendrait `false`
     côté serveur et `true` ensuite, et React refuserait l'hydratation. On
     décide donc APRÈS le premier rendu, ce qui affiche brièvement le libellé
     de repli et n'a jamais trompé personne. */
  const [ecritDirect, setEcritDirect] = useState(false);
  useEffect(() => setEcritDirect(supporteDossier()), []);
  const arret = useRef<AbortController | null>(null);

  const l = fiche.ligne;
  const base = demo ? "/admin/atelier/demo" : "/admin/atelier";
  const occupe = lot.phase === "prepare" || lot.phase === "ecrit";

  /* ── T2-5 : le premier dépôt et les AJOUTS ────────────────────────
     Toute photo arrivée après la fin du premier dépôt (l'événement
     `consentements`, cf. donnees.ts) est un ajout : reprise 1b, complément.
     Comparaison lexicographique volontaire — deux ISO 8601 UTC s'ordonnent
     comme des chaînes. */
  const finDepot = fiche.depotInitialJusqua;
  const nouvelles = finDepot
    ? fiche.photos.filter((p) => p.ajouteLe && p.ajouteLe > finDepot)
    : [];
  const premiereNouvelle = nouvelles.length
    ? fiche.photos.findIndex((p) => p.id === nouvelles[0].id)
    : -1;

  /* La loupe ne connaît que ce qui existe, une fois chacun : un visuel
     manquant n'est pas une étape de la visite, et l'objet à plat n'y figure
     qu'une fois même s'il remplit trois cadres. Ses index ne sont donc PAS
     ceux de la grille. */
  const apercuVues = vuesDeLApercu(fiche.apercu);
  const apercuAgrandissable: VueLoupe[] = apercuVues
    .filter((v): v is ApercuVue & { src: string } => Boolean(v.src))
    .filter((v, i, tous) => tous.findIndex((a) => a.loupe === v.loupe) === i)
    .map((v) => ({ src: v.src, legende: v.loupe }));

  /**
   * Les liens, refaits à l'instant.
   *
   * Ceux de la page ont été signés au rendu, pour deux heures. La fiche reste
   * ouverte toute la matinée : on ne télécharge JAMAIS avec les liens
   * affichés, sous peine d'écrire quarante fichiers de zéro octet sans que
   * rien ne le signale.
   *
   * En démonstration, les photos sont des images de /public : même origine,
   * aucune signature à refaire, et surtout aucun appel qui toucherait la base.
   */
  async function liensFrais(ids?: string[]): Promise<PhotoLot[]> {
    if (demo) return ids ? fiche.photos.filter((p) => ids.includes(p.id)) : fiche.photos;
    const r = await fetch("/api/admin/atelier/lot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      /* T2-5 — `ids` restreint aux nouvelles ; la route calcule les noms
         sur le lot COMPLET avant de filtrer, la numérotation tient. */
      body: JSON.stringify({ token: l.token, ...(ids ? { ids } : {}) }),
    });
    if (!r.ok) throw new Error("Les liens du coffre n'ont pas pu être refaits.");
    const d = (await r.json()) as { photos?: PhotoLot[] };
    if (!d.photos?.length) throw new Error("Le coffre n'a rendu aucune photo.");
    return d.photos;
  }

  function leBrief(): string {
    return composerBrief(matiereDe(fiche), new Date());
  }

  /**
   * Le lot sur le disque (Chrome, Edge).
   *
   * ⚠️ Le sélecteur de dossier s'ouvre AVANT tout `await` : Chrome exige une
   * activation utilisateur fraîche, et un aller-retour réseau la consomme.
   */
  async function telechargerDossier(ids?: string[]) {
    const racine = await choisirDossier();
    if (!racine) return;

    const ctrl = new AbortController();
    arret.current = ctrl;
    setLot({ phase: "prepare" });
    try {
      const photos = await liensFrais(ids);
      const r = await ecrireLot(racine, {
        prenom: l.prenom,
        titre: l.titre,
        token: l.token,
        photos,
        brief: leBrief(),
        signal: ctrl.signal,
        onProgres: (p) => setLot({ phase: "ecrit", ...p }),
      });
      setLot({ phase: "fini", ...r });
    } catch (err) {
      setLot({ phase: "erreur", message: (err as Error)?.message || "Le téléchargement a échoué." });
    } finally {
      arret.current = null;
    }
  }

  /** Le repli : une liste nue de liens, pour `curl`. */
  async function telechargerListe(ids?: string[]) {
    setLot({ phase: "prepare" });
    try {
      const photos = await liensFrais(ids);
      const fichier = `photos-${l.token.slice(0, 8)}.txt`;
      telechargerTexte(fichier, listeDesLiens(photos));
      setLot({ phase: "repli", fichier });
    } catch (err) {
      setLot({ phase: "erreur", message: (err as Error)?.message || "Le téléchargement a échoué." });
    }
  }

  return (
    <div className="adm-root ate-root ate-fiche">
      {demo ? (
        <div className="ate-demo-bar">
          Mode démonstration — dossier fictif, aucune action ne part en base.{" "}
          <Link href="/admin/atelier">Revenir aux vrais dossiers</Link>
        </div>
      ) : null}

      <header className="ate-fiche-tete">
        <Link href={base} className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">{l.titre?.trim() || "Sans titre"}</h1>
        <p className="ate-fiche-sous">
          <span className={`ate-etat ate-etat--${l.etat}`}>
            <span className="ate-etape">{l.etape}</span>
            {l.libelleEtat}
          </span>
          <span className={l.urgence.enRetard ? "ate-delai-val ate-delai-val--retard" : "ate-delai-val"}>
            {l.urgence.libelle}
          </span>
          {l.urgence.promesse ? <span className="ate-faint">{l.urgence.promesse}</span> : null}
          <a className="ate-lien-page" href={`/numero/${l.token}`} target="_blank" rel="noreferrer">
            Voir sa page ↗
          </a>
        </p>
      </header>

      {/* Qui s'en occupe, tout en haut : c'est la première chose à savoir
          avant de toucher au dossier, pas une information de bas de page.
          Absent tant que la migration 20260826 n'est pas passée. */}
      {fiche.enChargeAbsent ? null : (
        <EnCharge
          token={l.token}
          enCharge={l.enCharge}
          moi={moi}
          prenoms={PRENOM_COMPTE}
          demo={demo}
        />
      )}

      <Parcours parcours={fiche.parcours} />

      {l.rembourse ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          Ce numéro a été remboursé. Aucun état n&apos;a changé automatiquement — c&apos;est à
          nous de décider ce qu&apos;on en fait.
        </div>
      ) : null}

      {/* ── L'ADRESSE NE REÇOIT PAS ──────────────────────────────────
          Le bandeau le plus important de la fiche, parce que c'est le seul
          problème que RIEN d'autre ne montre. Tant qu'on ne l'écoutait pas,
          une faute de frappe sur l'adresse produisait un dossier parfaitement
          normal à l'écran, et un silence total chez la cliente.

          Il porte le téléphone, quand il y en a un : sans lui, le bandeau
          annonce un problème et laisse chercher la solution ailleurs. Le
          téléphone est obligatoire depuis le 28/08, donc les dossiers récents
          l'ont tous. */}
      {l.emailRebond ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          <b>Cette adresse ne reçoit pas nos mails.</b> Un envoi a définitivement
          rebondi sur {l.email || "cette adresse"} — elle n&apos;a donc reçu aucun
          de nos messages, et n&apos;en recevra aucun. Le détail est dans le journal,
          en bas de cette fiche.
          {fiche.telephone ? (
            <>
              {" "}
              Son téléphone : <b>{fiche.telephone}</b>.
            </>
          ) : (
            " Ce dossier ne porte pas de téléphone : il n'y a aucun autre moyen de le joindre."
          )}
        </div>
      ) : null}

      {/* ── LE DÉPÔT N'EST PAS TERMINÉ ──────────────────────────────
          Le cas qui a coûté cher le 25/08 : 55 photos dans le coffre, un
          dossier en tête de pile « à faire », et personne pour remarquer que
          la cliente n'avait jamais cliqué « Envoyer ». Composer là-dessus,
          c'est utiliser des photos sans le droit d'usage.

          On AVERTIT, on ne bloque pas : un coup de téléphone peut très bien
          justifier d'avancer quand même, et une machine qui refuse sans
          pouvoir écouter finit contournée en SQL. */}
      {l.depot !== "termine" ? (
        <div className="ate-bandeau ate-bandeau--alerte">
          <strong>Le client n&apos;a jamais envoyé son dépôt.</strong>{" "}
          {l.depot === "abandonne"
            ? `Les ${l.nbPhotos} photos sont bien arrivées dans le coffre, mais le droit d'usage n'a pas été donné : il a fermé l'onglet avant le dernier bouton. Ne compose rien tant qu'il n'a pas terminé.`
            : "Le questionnaire est rempli, aucune photo n'a été déposée."}{" "}
          Sa page lui propose de finir en un clic, et la relance part
          automatiquement le lendemain de l&apos;ouverture du dossier.
        </div>
      ) : null}

      {/* ── LE DÉPÔT EST VALIDÉ, MAIS IL EN MANQUE ──────────────────
          Nouveau le 01/09. Le bouton « Envoyer à l'atelier » s'ouvre dès que
          le seuil de photos CONFIRMÉES est atteint, sans attendre la fin des
          transferts. Le reste monte en tâche de fond depuis le navigateur de
          la cliente : si elle ferme l'onglet, ces photos-là ne viendront
          jamais, et personne ne peut les reprendre à sa place.

          Le dossier, lui, est bien à nous : elle a donné le droit d'usage, il
          y a de quoi composer. Ce n'est donc PAS l'alerte du dépôt non
          terminé, et surtout pas un blocage — c'est une information, et la
          seule qui existe. Sans elle, « 42 photos » se lit comme un choix.

          ⚠️ Silencieux quand `photosAttendues` est nul : les dossiers
          antérieurs au 01/09 n'ont jamais porté ce témoin, et un écart
          fabriqué à partir d'une absence ferait crier la fiche pour rien —
          une fiche qui crie pour rien cesse d'être crue. */}
      {l.depot === "termine" &&
      fiche.photosAttendues !== null &&
      fiche.photosAttendues > l.nbPhotos ? (
        <div className="ate-bandeau ate-bandeau--attention">
          <strong>
            Son dépôt s&apos;est interrompu : {l.nbPhotos} photos sur les{" "}
            {fiche.photosAttendues} qu&apos;il envoyait.
          </strong>{" "}
          Il a bien validé (le droit d&apos;usage est donné, le dossier est à
          nous), puis il a quitté la page avant la fin du transfert. Les{" "}
          {fiche.photosAttendues - l.nbPhotos} manquantes sont restées sur son
          téléphone et ne reviendront pas toutes seules. Compose avec ce qu&apos;on
          a, ou propose-lui d&apos;en redéposer (« Demander plus de photos »).
        </div>
      ) : null}

      {fiche.adresse?.dom ? (
        <div className="ate-bandeau ate-bandeau--attention">
          Adresse en {fiche.adresse.codePostal} — département d&apos;outre-mer. Stripe l&apos;a
          traitée comme la France métropolitaine : vérifie le coût du port AVANT de commander
          chez l&apos;imprimeur.
        </div>
      ) : null}

      {/* ── T2-13 : DES RETOUCHES ATTENDENT ─────────────────────────
          L'auto-validation à J+7 est suspendue tant que la maquette n'est
          pas republiée — republier lève la suspension et renvoie M5 avec la
          nouvelle échéance. */}
      {l.etat === "maquette_prete" && fiche.retouchesLe ? (
        <div className="ate-bandeau ate-bandeau--attention">
          <strong>Le client a noté des retouches dans le Canva</strong> le{" "}
          {new Date(fiche.retouchesLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}.
          L&apos;auto-validation à J+7 est suspendue : relis ses commentaires, corrige, puis
          republie la maquette — M5 repartira avec la nouvelle échéance.
        </div>
      ) : null}

      <div className="ate-colonnes">
        <div className="ate-colonne">
          <PanneauAction fiche={fiche} demo={demo} />

          {/* Les PDF print-ready déposés, enfin VISIBLES avant d'appuyer sur
              « Envoyer à l'impression ». La carte n'existe que s'il y a au
              moins un fichier au coffre — les labels viennent de la même
              table que les cadres de dépôt (SLOTS_IMPRESSION). */}
          <Impression
            token={l.token}
            fichiers={SLOTS_IMPRESSION.flatMap((s): FichierImpression[] => {
              const cle = fiche.impressionFichiers[s.type];
              return cle
                ? [{ type: s.type, label: s.label, cle, url: fiche.impressionUrls[s.type] }]
                : [];
            })}
            souvenir={fiche.souvenir}
            demo={demo}
          />

          <Carnet
            token={l.token}
            notes={fiche.notes}
            indisponibles={fiche.notesIndisponibles}
            canvaTravail={fiche.canvaTravail}
            moi={moi}
            demo={demo}
          />

          {/* ── la matière première ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Le moment</h2>
            <dl className="ate-defs">
              <dt>Occasion</dt>
              <dd>{fiche.occasion || "—"}</dd>
              {/* Les mots de couverture facultatifs (03/09) : rien à afficher
                  quand il n'y en a pas — la plupart des dossiers n'en ont pas,
                  deux lignes de tirets diraient qu'il manque quelque chose. */}
              {fiche.sousTitre && (
                <>
                  <dt>Sous-titre (1re de couverture)</dt>
                  <dd>{fiche.sousTitre}</dd>
                </>
              )}
              {fiche.motQuatrieme && (
                <>
                  <dt>Quatrième de couverture</dt>
                  <dd>{fiche.motQuatrieme}</dd>
                </>
              )}
            </dl>
            <p className="ate-histoire">{fiche.histoire || "Le client n'a rien écrit."}</p>
          </section>

          <section className="ate-carte">
            <div className="ate-carte-tete">
              <h2 className="ate-carte-titre">
                Les photos <span className="ate-compte">{fiche.photos.length}</span>
              </h2>
              {fiche.photos.length ? (
                <div className="ate-carte-outils">
                  <button
                    className="adm-btn adm-btn--ghost"
                    type="button"
                    onClick={() => telechargerTexte(NOM_BRIEF, leBrief())}
                    title="L'occasion, son histoire et le carnet, en un fichier texte"
                  >
                    Le brief
                  </button>
                  {/* T2-5 — après un ajout, on ne veut souvent QUE les
                      nouvelles : même mécanique, filtrée, et la numérotation
                      reste celle du lot complet (la route y veille). */}
                  {nouvelles.length > 0 && nouvelles.length < fiche.photos.length ? (
                    <button
                      className="adm-btn adm-btn--ghost"
                      type="button"
                      disabled={occupe}
                      onClick={() => {
                        const ids = nouvelles.map((p) => p.id);
                        if (ecritDirect) telechargerDossier(ids);
                        else telechargerListe(ids);
                      }}
                    >
                      Les {nouvelles.length} nouvelles
                    </button>
                  ) : null}
                  <button
                    className="adm-btn"
                    type="button"
                    disabled={occupe}
                    onClick={() => (ecritDirect ? telechargerDossier() : telechargerListe())}
                  >
                    {ecritDirect ? "Télécharger le lot" : "Télécharger les liens"}
                  </button>
                </div>
              ) : null}
            </div>

            {lot.phase !== "repos" ? (
              <div className={`ate-lot ate-lot--${lot.phase}`} role="status" aria-live="polite">
                {lot.phase === "prepare" ? <p>Préparation des liens...</p> : null}

                {lot.phase === "ecrit" ? (
                  <>
                    <div className="ate-lot-barre">
                      <span
                        className="ate-lot-jauge"
                        style={{ width: `${Math.round((lot.faites / Math.max(1, lot.total)) * 100)}%` }}
                      />
                    </div>
                    <p>
                      {`${lot.faites} / ${lot.total} photos écrites. En cours : ${lot.enCours}`}
                      <button
                        type="button"
                        className="ate-lot-arret"
                        onClick={() => arret.current?.abort()}
                      >
                        Arrêter
                      </button>
                    </p>
                  </>
                ) : null}

                {lot.phase === "fini" ? (
                  <p>
                    {lot.interrompu
                      ? `Arrêté. ${lot.ecrites} photos écrites dans « ${lot.dossier} ».`
                      : `${lot.ecrites} photos et le brief écrits dans « ${lot.dossier} ».`}
                    {lot.ratees.length ? (
                      <span className="ate-lot-ratees">
                        {` ${lot.ratees.length} n'ont pas pu être écrites : ${lot.ratees.join(", ")}. Relance le téléchargement, elles seules manqueront.`}
                      </span>
                    ) : null}
                  </p>
                ) : null}

                {/* Le repli. La commande vit ICI et non dans le fichier : une
                    ligne de commentaire dans le .txt le rendait inconsommable
                    par xargs, qui passait le dièse à curl comme une adresse. */}
                {lot.phase === "repli" ? (
                  <p>
                    {`${lot.fichier} téléchargé. Dans un dossier vide, ouvre le Terminal et colle :`}
                    <code className="ate-lot-cmd">{`${COMMANDE_REPLI} ~/Downloads/${lot.fichier}`}</code>
                    <span className="ate-faint">
                      Les noms de fichiers sont les mêmes que par le dossier. Les liens valent deux
                      heures.
                    </span>
                  </p>
                ) : null}

                {lot.phase === "erreur" ? <p className="ate-lot-ratees">{lot.message}</p> : null}
              </div>
            ) : null}

            {fiche.photos.length === 0 ? (
              <p className="ate-faint">Aucune photo déposée.</p>
            ) : (
              <div className="ate-photos">
                {fiche.photos.slice(0, visibles).map((p, i) => (
                  <Fragment key={p.id}>
                    {/* T2-5 — le filet qui sépare le premier dépôt des
                        ajouts. Grille triée par ordre de dépôt : les ajouts
                        arrivent après, un seul filet suffit. */}
                    {i === premiereNouvelle && i > 0 && p.ajouteLe ? (
                      <span className="ate-photos-filet">
                        Ajoutées le{" "}
                        {new Date(p.ajouteLe).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
                      </span>
                    ) : null}
                    <a
                      className="ate-photo"
                      href={p.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      title={`${p.nom ?? ""} ${poids(p.taille)}`}
                    >
                      {/* D7 — la vignette de 320 px si elle existe, l'original
                          sinon (dossiers antérieurs au 30/08, photos que le
                          navigateur n'a pas su décoder). Le lien du cadre,
                          lui, pointe TOUJOURS l'original : on clique pour voir
                          la photo, pas son timbre-poste. */}
                      {p.urlVignette ?? p.url ? (
                        <img
                          src={(p.urlVignette ?? p.url) as string}
                          alt=""
                          width="84"
                          height="84"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="ate-photo-vide">?</span>
                      )}
                    </a>
                  </Fragment>
                ))}
              </div>
            )}

            {fiche.photos.length > VIGNETTES_VISIBLES ? (
              <button
                type="button"
                className="ate-photos-plus"
                onClick={() =>
                  setVisibles((n) =>
                    n >= fiche.photos.length ? VIGNETTES_VISIBLES : n + TRANCHE_PHOTOS,
                  )
                }
              >
                {visibles >= fiche.photos.length
                  ? "Replier"
                  : `Voir ${Math.min(TRANCHE_PHOTOS, fiche.photos.length - visibles)} de plus` +
                    ` (${fiche.photos.length - visibles} restantes)`}
              </button>
            ) : null}
          </section>

          {apercuAgrandissable.length ? (
            <section className="ate-carte">
              <h2 className="ate-carte-titre">L&apos;aperçu publié</h2>
              <p className="ate-carte-sous">
                Ce que le client voit sur sa page, dans le même ordre et avec les mêmes mots.
              </p>
              <div className="ate-apercu">
                {apercuVues.map(({ cle, src, legende, loupe, decoupe }) => {
                  const rang = apercuAgrandissable.findIndex((v) => v.legende === loupe);
                  return (
                    <figure key={cle} className="ate-apercu-item">
                      {src ? (
                        <button
                          type="button"
                          className={
                            decoupe
                              ? `ate-apercu-clic ate-apercu-decoupe ate-apercu-decoupe--${decoupe}`
                              : "ate-apercu-clic"
                          }
                          onClick={() => setApercuOuvert(rang)}
                          aria-label={`Agrandir : ${legende}`}
                        >
                          <img src={src} alt={legende} />
                        </button>
                      ) : (
                        <span className="ate-photo-vide">manquant</span>
                      )}
                      <figcaption>{legende}</figcaption>
                    </figure>
                  );
                })}
              </div>
            </section>
          ) : null}

          <Loupe
            vues={apercuAgrandissable}
            index={apercuOuvert}
            onIndex={setApercuOuvert}
            onFermer={() => setApercuOuvert(null)}
          />
        </div>

        <div className="ate-colonne ate-colonne--cote">
          {/* ── la cliente ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">{l.prenom || "Le client"}</h2>
            <dl className="ate-defs">
              <dt>Email</dt>
              <dd className="ate-mono">{l.email || "—"}</dd>
              <dt>Téléphone</dt>
              <dd>{fiche.telephone || "—"}</dd>
              <dt>Dossier ouvert</dt>
              <dd>{fmt(l.createdAt)}</dd>
              {fiche.client.totalPaye > 0 ? (
                <>
                  <dt>Total réglé</dt>
                  <dd>
                    <strong>{fiche.client.totalPaye}&nbsp;€</strong>
                  </dd>
                </>
              ) : null}
            </dl>

            {fiche.client.autres.length ? (
              <>
                <h3 className="ate-sous-titre">Ses autres numéros</h3>
                <ul className="ate-autres">
                  {fiche.client.autres.map((a) => (
                    <li key={a.token}>
                      <Link href={`${base}/${a.token}`}>{a.titre?.trim() || "Sans titre"}</Link>
                      <span className="ate-faint">
                        {a.libelleEtat}
                        {a.euros ? ` · ${a.euros} €` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {/* Lecture seule de la prévente. Raison unique : CGV v3.0 art. 5 bis. */}
            {fiche.client.prevente ? (
              <div className="ate-prevente">
                <h3 className="ate-sous-titre">Prévente</h3>
                {fiche.client.prevente.numeroFondateur ? (
                  <>
                    <p className="ate-credit">
                      Fondateur nº{fiche.client.prevente.numeroFondateur} —{" "}
                      <strong>30 € de crédit</strong> à imputer (CGV art. 5 bis), code Stripe
                      nominatif à usage unique.
                    </p>
                    <CodeFondatrice
                      token={l.token}
                      existant={fiche.codeFondatrice}
                      demo={demo}
                    />
                  </>
                ) : (
                  <p className="ate-faint">
                    Inscrit en prévente ({fiche.client.prevente.status ?? "—"}), sans place de
                    fondateur.
                  </p>
                )}
                {fiche.client.prevente.estAmbassadeur ? (
                  <p className="ate-faint">
                    Ambassadeur · {fiche.client.prevente.pagesCredits} pages de parrainage acquises.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ── ce qui engage ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Accords et paiement</h2>
            <ul className="ate-accords">
              <li className={fiche.consentPhotos ? "ate-oui" : "ate-non"}>
                Droit d&apos;usage des photos
              </li>
              <li className={fiche.consentCommunication ? "ate-oui" : "ate-non"}>
                Droit de montrer des extraits
                {!fiche.consentCommunication ? (
                  <span className="ate-faint"> — ne rien publier de ce numéro</span>
                ) : null}
              </li>
              <li className={fiche.cgvOk ? "ate-oui" : "ate-non"}>
                CGV {fiche.cgvOkAt ? <span className="ate-faint">{fmt(fiche.cgvOkAt)}</span> : null}
              </li>
              <li className={fiche.renonciation ? "ate-oui" : "ate-non"}>
                Fabrication immédiate{" "}
                {fiche.renonciationAt ? <span className="ate-faint">{fmt(fiche.renonciationAt)}</span> : null}
              </li>
            </ul>

            {fiche.adresse ? (
              <>
                <h3 className="ate-sous-titre">Livraison</h3>
                <address className="ate-adresse">
                  {fiche.adresse.nom ? <>{fiche.adresse.nom}<br /></> : null}
                  {fiche.adresse.ligne1}
                  {fiche.adresse.ligne2 ? <><br />{fiche.adresse.ligne2}</> : null}
                  <br />
                  {fiche.adresse.codePostal} {fiche.adresse.ville}
                  <br />
                  {fiche.adresse.pays}
                </address>
              </>
            ) : null}

            {/* ── le colis ──
                Rempli tout seul par le webhook Cloudprinter (ItemShipped) :
                le transporteur, le lien de suivi, et le NUMÉRO de suivi qui
                se recopie. Affiché ici, à côté de l'adresse : c'est la même
                question — où va ce colis, et où en est-il ? */}
            {fiche.transporteur || fiche.trackingUrl || fiche.trackingCode ? (
              <>
                <h3 className="ate-sous-titre">Le colis</h3>
                <dl className="ate-defs">
                  <dt>Transporteur</dt>
                  <dd>{fiche.transporteur || "—"}</dd>
                  {fiche.trackingCode ? (
                    <>
                      <dt>Numéro de suivi</dt>
                      <dd className="ate-mono">{fiche.trackingCode}</dd>
                    </>
                  ) : null}
                  {fiche.trackingUrl ? (
                    <>
                      <dt>Suivi</dt>
                      <dd>
                        <a href={fiche.trackingUrl} target="_blank" rel="noreferrer">
                          Suivre le colis ↗
                        </a>
                      </dd>
                    </>
                  ) : null}
                </dl>
                {fiche.cloudprinterOrderId && !fiche.trackingUrl && fiche.trackingCode ? (
                  <p className="ate-faint">
                    Pas de lien de suivi pour ce transporteur : c&apos;est le numéro qui part chez
                    elle, sur sa page.
                  </p>
                ) : null}
              </>
            ) : null}

            {fiche.stripePaymentIntent ? (
              <p className="ate-mono ate-faint ate-pi">{fiche.stripePaymentIntent}</p>
            ) : null}

            {fiche.canvaUrl ? (
              <p className="ate-canva-partage">
                <a href={fiche.canvaUrl} target="_blank" rel="noreferrer">
                  Canva partagé ↗
                </a>
                <span className="ate-faint"> — celui qu&apos;il a reçu, en commentaire</span>
              </p>
            ) : null}
          </section>

          {/* ── les preuves ── */}
          <section className="ate-carte">
            <h2 className="ate-carte-titre">Mails partis</h2>
            {fiche.mails.length === 0 ? (
              <p className="ate-faint">Aucun mail pour l&apos;instant.</p>
            ) : (
              <ul className="ate-mails">
                {fiche.mails.map((m) => (
                  <li key={m.code}>
                    <strong>{m.code}</strong>
                    <span className="ate-faint">{fmt(m.envoyeLe)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ate-carte">
            <h2 className="ate-carte-titre">Ce qui s&apos;est passé</h2>
            <ul className="ate-journal">
              {fiche.evenements.map((e) => (
                <Evenement key={e.id} e={e} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
