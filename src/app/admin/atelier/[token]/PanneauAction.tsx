"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionVue, Fiche } from "../types";
import { SLOTS_IMPRESSION } from "@/lib/atelier/impression";
import { cleCadrageCouverture } from "@/lib/atelier/transitions";
/* `pays.ts` est un module PUR et SANS montant : l'importer ici ne fait pas
   descendre la grille de prix dans le bundle (invariant nº2), contrairement
   à `prix.ts` — c'est exactement pour ça que la liste y a déménagé. */
import { PAYS_LIVRAISON, PAYS_LIBELLE, paysValide } from "@/lib/atelier/pays";
/* ⚠️ RIEN N'EST IMPORTÉ DE `livraison.ts` ICI, ET C'EST VOLONTAIRE. Le
   montant du port vient du SERVEUR — devis Cloudprinter ou saisie relue par
   `preparerTransition` — et cet écran ne fait que l'afficher et le renvoyer.
   Valider la saisie en double côté navigateur ferait une seconde vérité sur
   un montant, exactement ce que l'invariant nº2 interdit. */
/* `grille.ts` est PUR ET PUBLIC : ces nombres sont ceux qu'affiche déjà la
   page produit, ils ne révèlent rien. L'invariant nº2 n'est pas « la grille
   reste secrète », c'est « le SERVEUR décide du montant débité » — et il le
   décide toujours : le champ ci-dessous ne fait que refuser tôt une saisie
   que le serveur refuserait de toute façon, avec les MÊMES bornes. */
import {
  eurosPourPages,
  reliurePour,
  PAGES_AGRAFE,
  PAGES_MAX,
  PAGES_MIN,
  PAS_PAGES,
  RELIURE_LIBELLE,
  type Reliure,
} from "@/lib/atelier/grille";

/**
 * L'action du moment — le geste que ce lot remplace.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX TEMPS, TOUJOURS : ON PRÉPARE, PUIS ON CONFIRME
 *
 * « Publier l'aperçu » ouvre une page de vente et envoie un mail avec un
 * prix. Ça ne se déclenche pas d'un clic distrait. Le premier bouton ne fait
 * qu'INTERROGER le serveur : il renvoie le palier, le prix et le nom de la
 * personne qui va recevoir le mail. Le second écrit.
 *
 * Le prix affiché n'est jamais calculé ici. Il vient du serveur, par le
 * chemin exact qui l'écrira : c'est ÇA, l'invariant nº2. La grille, elle, est
 * publique — la page produit l'affiche en entier — et le champ de saisie
 * emprunte ses bornes pour refuser 22 ou 61 avant l'aller-retour. Ce qu'un
 * écran ne fait jamais, c'est DÉCIDER du montant débité.
 * ══════════════════════════════════════════════════════════════════════════
 */

type Verif = {
  action: { cle: string; libelle: string; vers: string; note?: string };
  /* ── LE BROUILLON DE PRÉVISUALISATION (10/09/2026) ──────────────────
     Rendu par le dry-run de `publier_apercu` / `corriger_apercu` UNIQUEMENT :
     `true` = ce qui serait écrit est déposé au journal, la page du client est
     visible ; `false` = le journal a refusé, il n'y a rien à ouvrir ;
     `undefined` = une autre action, ou la démonstration (sans base). */
  brouillon?: boolean;
  resume: {
    nbPages?: number;
    palier?: string;
    euros?: number;
    reliure?: Reliure;
    pays?: string;
    livraisonCentimes?: number;
  };
  /* Le devis de port, demandé PAR LE SERVEUR pendant la vérification (lot 6).
     Rien n'a été écrit : c'est ce qui SERA écrit au second clic. */
  livraison?: {
    source: "admin" | "cloudprinter" | "echec";
    niveau: string | null;
    service: string | null;
    transporteur: string | null;
    niveauVouluAbsent: boolean;
    devisHtCentimes: number | null;
    devisTtcCentimes: number | null;
    client: number | null;
    absorbe: number;
    raison?: string;
    existant: number | null;
  };
  /* T2-3 — le mot de l'atelier tel que le serveur l'a retenu : c'est LUI qui
     partira dans M9, pas la saisie locale. */
  mot?: string;
  destinataire: { prenom: string | null; email: string | null; titre: string | null };
  /* Le récap d'impression, calculé par le serveur (jamais ici) : ce qui va
     réellement partir chez Cloudprinter au clic suivant. */
  impression?: {
    modeManuel: boolean;
    produit: string | null;
    produitLibelle: string | null;
    shippingLevel: string;
    fichiers: Array<{ type: string; cle: string; taille: number; md5: string }>;
    adresse: { nom: string; ville: string; pays: string } | null;
  };
};

type Erreur = { champ: string; message: string };

/* T-090 — une double page montée par l'atelier : la clé du coffre, sa vignette
   (objet local ou URL signée), et un id stable qui survit au réordonnancement. */
type DoubleItem = { id: string; key: string; preview: string };

/* Miroir client de MAX_DOUBLES (apercu.ts). On ne l'importe pas : apercu.ts tire
   r2 (AWS SDK) qui n'a rien à faire dans le bundle du navigateur. Le serveur
   borne de toute façon à la publication. */
const MAX_DOUBLES = 3;

/* Miroir client de MAX_PLANCHES (apercu.ts), pour la même raison. T-093 :
   jusqu'à trois couvertures proposées, la première étant celle que la cliente
   voit avant tout choix. */
const MAX_PLANCHES = 3;

/* T2-2 / T-090 — le format normal : LA PLANCHE à plat (l'export naturel de
   Canva, la 4e, le dos et la 1re côte à côte dans un seul fichier). La page
   cliente en découpe les deux faces PILE au centre, en CSS. Les doubles pages
   (0 à 3) se montent à côté, dans leur propre liste réordonnable. */
const SLOT_PLANCHE = {
  cle: "apercu_plat",
  json: "plat",
  label: "La planche : 4e · dos · 1re, en un seul fichier",
} as const;

/* L'ancien format, en trois fichiers. Il ne s'affiche QUE pour corriger un
   dossier publié avant la couverture à plat : deux formats au choix sur un
   dossier neuf, c'est un formulaire qui demande de choisir sans raison. */
const SLOTS_HISTORIQUE = [
  { cle: "apercu_c1", json: "c1", label: "Première de couverture" },
  { cle: "apercu_c4", json: "c4", label: "Quatrième de couverture" },
  { cle: "apercu_double", json: "double", label: "La double page" },
] as const;

export default function PanneauAction({ fiche, demo }: { fiche: Fiche; demo?: boolean }) {
  const router = useRouter();
  /* T2-6 — à l'état 2, la seule action est « Corriger l'aperçu » : une
     correction, pas l'étape suivante. La présélectionner déployait son
     formulaire en pleine page alors qu'on attend le paiement — le panneau
     dit d'abord QUI on attend, la correction se déplie derrière un lien. */
  const [choisie, setChoisie] = useState<ActionVue | null>(
    fiche.actions.length === 1 && fiche.actions[0].cle !== "corriger_apercu"
      ? fiche.actions[0]
      : null,
  );
  const [saisie, setSaisie] = useState<Record<string, string>>({
    nb_pages: fiche.ligne.nbPages ? String(fiche.ligne.nbPages) : "",
    /* Le pays vient du dossier, jamais d'un défaut : un dossier ouvert avant
       le 10/09 n'a pas eu la question, et le select reste alors sur « Choisir ».
       Préremplir « France » à sa place ferait passer une supposition pour une
       réponse du client, sur le champ dont dépendra le devis de port. */
    pays_livraison: fiche.paysLivraison ?? "",
    /* Le port DÉJÀ gelé, en euros, tel qu'un humain le lit (« 4,90 »). Vide
       quand rien n'a encore été devisé : la vérification ira le chercher chez
       Cloudprinter et remplira ce champ toute seule. Préremplir un montant à
       la place du devis ferait passer une supposition pour un tarif. */
    livraison_centimes:
      fiche.livraisonCentimes === null ? "" : eurosDeCentimes(fiche.livraisonCentimes),
    /* Le niveau d'expédition chiffré : jamais tapé, seulement transporté. */
    livraison_niveau: fiche.livraisonNiveau ?? "",
    apercu_plat: fiche.apercuBrut.plat ?? "",
    apercu_c1: fiche.apercuBrut.c1 ?? "",
    apercu_c4: fiche.apercuBrut.c4 ?? "",
    apercu_double: fiche.apercuBrut.double ?? "",
    canva_url: fiche.canvaUrl ?? "",
    maquette_pdf_url: fiche.maquettePdfUrl ?? "",
    pdf_produit: fiche.impressionFichiers.product ?? "",
    pdf_couverture: fiche.impressionFichiers.cover ?? "",
    pdf_interieur: fiche.impressionFichiers.book ?? "",
    transporteur: fiche.transporteur ?? "",
    /* Le champ accepte les deux formes : on repropose le numéro s'il
       existe, l'adresse sinon. */
    tracking_url: fiche.trackingCode ?? fiche.trackingUrl ?? "",
  });
  const [apercus, setApercus] = useState<Record<string, string>>({
    apercu_plat: fiche.apercu.plat ?? "",
    apercu_c1: fiche.apercu.c1 ?? "",
    apercu_c4: fiche.apercu.c4 ?? "",
    apercu_double: fiche.apercu.double ?? "",
  });
  /* T-093 — les couvertures proposées au choix, dans l'ordre de proposition.
     La PREMIÈRE est celle que la cliente voit d'emblée : ranger, ici, c'est
     décider ce qu'elle regarde en premier. Préremplies depuis la fiche, comme
     les doubles pages ; un dossier publié avec une seule planche en donne une,
     et l'écran se comporte exactement comme avant. */
  const [planches, setPlanches] = useState<DoubleItem[]>(() =>
    fiche.apercuBrut.plats.map((key, i) => ({
      id: crypto.randomUUID(),
      key,
      preview: fiche.apercu.plats[i] ?? "",
    })),
  );
  /* T-090 — les doubles pages, dans l'ordre montré à la cliente. Préremplies
     depuis la fiche : clé brute + vignette signée, appariées par rang. */
  const [doubles, setDoubles] = useState<DoubleItem[]>(() =>
    fiche.apercuBrut.doubles.map((key, i) => ({
      id: crypto.randomUUID(),
      key,
      preview: fiche.apercu.doubles[i] ?? "",
    })),
  );
  /* Le cadrage de chaque double page, indexé par sa CLÉ de coffre : la clé
     survit au réordonnancement, le rang non. Vide = centré. */
  const [cadrages, setCadrages] = useState<Record<string, string>>(
    () => fiche.apercuBrut.cadrages,
  );
  /* Le recadrage en cours : la vignette qu'on tient, et d'où on est parti.
     Une ref — elle ne pilote aucun rendu, elle survit juste au geste. */
  const recadre = useRef<{
    id: string;
    cle: string;
    x: number;
    y: number;
    px: number;
    py: number;
    bouge: boolean;
    /* T-090 (rouvert 07/09) — une FACE de planche n'a rien à régler à la
       verticale : la coupe est une ligne, pas un point. Verrouiller Y évite
       qu'un tremblement de doigt bascule la position en hauteur. */
    verrouY: boolean;
  } | null>(null);
  /* Vrai pendant qu'on recadre : le glissé de RÉORDONNANCEMENT est alors
     désarmé, sinon les deux gestes se disputent le même doigt. */
  const [recadrant, setRecadrant] = useState<string | null>(null);

  /* L'id de la double page qu'on est en train de glisser. Une ref, pas un
     état : elle ne pilote aucun rendu, elle survit juste au drag. */
  const glisse = useRef<string | null>(null);
  /* Deux listes glissables, deux refs : sans ça, lâcher une couverture sur
     une double page (ou l'inverse) déplacerait un élément dans la mauvaise
     liste. Chaque liste ne voit que son propre glissé. */
  const glissePlanche = useRef<string | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  /* Les noms lisibles des PDF d'impression déposés — une clé de coffre seule
     ne dit rien à l'écran. Préremplis depuis la fiche si un dépôt a eu lieu. */
  const [pdfNoms, setPdfNoms] = useState<Record<string, string>>(() => {
    const noms: Record<string, string> = {};
    for (const s of SLOTS_IMPRESSION) {
      const cle = fiche.impressionFichiers[s.type];
      if (cle) noms[s.cle] = cle.split("/").pop() ?? cle;
    }
    return noms;
  });
  const [erreurs, setErreurs] = useState<Erreur[]>([]);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const erreurDe = (champ: string) => erreurs.find((e) => e.champ === champ)?.message;
  const set = (champ: string, v: string) => {
    setSaisie((s) => ({ ...s, [champ]: v }));
    setVerif(null);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
  };

  /* ── le dépôt d'un visuel ───────────────────────────────────────────
     Le fichier part DIRECTEMENT vers le coffre : il ne traverse jamais
     Vercel. Le cœur renvoie la CLÉ (ou null en cas d'échec) et pose son
     erreur sous `slotId` — l'appelant décide quoi en faire (une couverture
     remplace, une double page s'ajoute ou se remplace). */
  async function envoyerVisuel(slotId: string, json: string, file: File): Promise<string | null> {
    setEnvoiEnCours(slotId);
    setErreurs((e) => e.filter((x) => x.champ !== slotId));
    try {
      const r = await fetch("/api/admin/atelier/apercu/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          slot: json,
          nom: file.name,
          type: file.type,
          taille: file.size,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          format_refuse: "Format refusé. JPEG, PNG, WebP ou HEIC.",
          taille_refusee: "Fichier trop lourd (50 Mo maximum).",
        };
        setErreurs((e) => [...e, { champ: slotId, message: messages[data?.error] ?? "Envoi impossible." }]);
        return null;
      }

      /* ⚠️ On ne pose PAS Content-Length à la main : le navigateur le calcule
         et il DOIT valoir exactement la taille déclarée à la signature. Un
         octet d'écart, R2 répond 403 sans en-tête CORS, ce qui s'affiche
         comme une trompeuse erreur d'accès (piège nº1 du mémo d'upload). */
      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!put.ok) {
        setErreurs((e) => [...e, { champ: slotId, message: "Le coffre a refusé le fichier." }]);
        return null;
      }

      return data.key as string;
    } catch {
      setErreurs((e) => [...e, { champ: slotId, message: "Envoi interrompu. Réessaie." }]);
      return null;
    } finally {
      setEnvoiEnCours(null);
    }
  }

  /* Les couvertures séparées du format historique (c1/c4) et la double page
     unique de ce format : dépôt simple, une clé dans `saisie`. */
  async function televerser(champ: string, json: string, file: File) {
    const key = await envoyerVisuel(champ, json, file);
    if (!key) return;
    set(champ, key);
    setApercus((a) => ({ ...a, [champ]: URL.createObjectURL(file) }));
  }


  /* T-093 — une couverture de plus dans la proposition. Toutes montent sous
     le slot « plat » : la route leur donne une clé unique, donc trois
     planches ne s'écrasent pas. */
  async function ajouterPlanche(file: File) {
    if (planches.length >= MAX_PLANCHES) return;
    const key = await envoyerVisuel("apercu_plat_new", "plat", file);
    if (!key) return;
    setPlanches((p) =>
      p.length >= MAX_PLANCHES ? p : [...p, { id: crypto.randomUUID(), key, preview: URL.createObjectURL(file) }],
    );
    /* Une planche déposée vide c1/c4 : le serveur les ignorerait de toute
       façon (le format à plat gagne), mais une saisie qui porte les deux
       formats à la fois finirait par mentir à quelqu'un. */
    setSaisie((s) => ({ ...s, apercu_c1: "", apercu_c4: "" }));
    setVerif(null);
  }

  async function remplacerPlanche(id: string, file: File) {
    const key = await envoyerVisuel(`planche-${id}`, "plat", file);
    if (!key) return;
    setPlanches((p) => p.map((x) => (x.id === id ? { ...x, key, preview: URL.createObjectURL(file) } : x)));
    setVerif(null);
  }

  function retirerPlanche(id: string) {
    /* Retirer = ne plus proposer. L'objet reste inerte dans le coffre. */
    setPlanches((p) => p.filter((x) => x.id !== id));
    setErreurs([]);
    setVerif(null);
  }

  function deposerPlancheSur(cibleId: string) {
    const src = glissePlanche.current;
    glissePlanche.current = null;
    if (!src || src === cibleId) return;
    setPlanches((p) => {
      const from = p.findIndex((x) => x.id === src);
      const to = p.findIndex((x) => x.id === cibleId);
      if (from < 0 || to < 0) return p;
      const copie = [...p];
      const [item] = copie.splice(from, 1);
      copie.splice(to, 0, item);
      return copie;
    });
    setVerif(null);
  }

  /* Une double page de plus, au bout de la liste. Toutes montent sous le même
     slot « double » : la route leur donne à chacune une clé unique. */
  async function ajouterDouble(file: File) {
    if (doubles.length >= MAX_DOUBLES) return;
    const key = await envoyerVisuel("apercu_double_new", "double", file);
    if (!key) return;
    setDoubles((d) =>
      d.length >= MAX_DOUBLES ? d : [...d, { id: crypto.randomUUID(), key, preview: URL.createObjectURL(file) }],
    );
    setVerif(null);
  }

  /* Remplacer une double page en place, sans changer son rang. */
  async function remplacerDouble(id: string, file: File) {
    const key = await envoyerVisuel(`double-${id}`, "double", file);
    if (!key) return;
    setDoubles((d) => d.map((x) => (x.id === id ? { ...x, key, preview: URL.createObjectURL(file) } : x)));
    setVerif(null);
  }

  function retirerDouble(id: string) {
    /* Retirer = ne plus montrer (décision de Mathias, 02/09). L'objet reste
       inerte dans le coffre ; seule la référence disparaît. */
    setDoubles((d) => d.filter((x) => x.id !== id));
    setErreurs([]);
    setVerif(null);
  }

  /* Réordonner par glissé : on déplace la double saisie à la place de la
     cible. Aucune librairie — HTML5 drag, comme le reste du dépôt. */
  /* ── LE RECADRAGE, AU DOIGT SUR LA VIGNETTE ────────────────────────────
     On tire l'image dans son cadre, comme partout ailleurs : pas de curseur
     à régler, pas de champ à remplir. Le déplacement est converti en
     pourcentages `object-position`, bornés à [0,100] — au-delà, l'image
     décollerait de son cadre et laisserait du vide.
     `setPointerCapture` : le doigt peut sortir de la vignette sans que le
     geste se coupe, ce qui arrive tout le temps sur une petite tuile. */
  function litCadrage(cle: string, defaut: [number, number] = [50, 50]): [number, number] {
    const v = cadrages[cle];
    if (!v) return defaut;
    const [x, y] = v.split(" ");
    return [parseFloat(x) || defaut[0], parseFloat(y ?? "") || defaut[1]];
  }

  function debutRecadrage(
    e: React.PointerEvent,
    id: string,
    cle: string,
    options?: { defaut?: [number, number]; verrouY?: boolean },
  ) {
    if (envoiEnCours !== null) return;
    const [px, py] = litCadrage(cle, options?.defaut);
    recadre.current = { id, cle, x: e.clientX, y: e.clientY, px, py, bouge: false, verrouY: options?.verrouY ?? false };
    setRecadrant(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function pendantRecadrage(e: React.PointerEvent) {
    const r = recadre.current;
    if (!r) return;
    const boite = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!boite.width || !boite.height) return;
    /* Tirer l'image vers la gauche montre sa DROITE : d'où le signe négatif.
       Le facteur 100 rapporte le déplacement à la taille de la vignette. */
    /* Un doigt tremble : sous 4 px on ne recadre pas, et le geste reste un
       clic — celui qui remplace l'image. */
    if (!r.bouge && Math.abs(e.clientX - r.x) < 4 && Math.abs(e.clientY - r.y) < 4) return;
    r.bouge = true;
    const dx = ((e.clientX - r.x) / boite.width) * -100;
    const dy = r.verrouY ? 0 : ((e.clientY - r.y) / boite.height) * -100;
    const x = Math.round(Math.min(100, Math.max(0, r.px + dx)));
    const y = r.verrouY ? 50 : Math.round(Math.min(100, Math.max(0, r.py + dy)));
    setCadrages((c) => ({ ...c, [r.cle]: `${x}% ${y}%` }));
  }

  function finRecadrage() {
    if (!recadre.current) return;
    recadre.current = null;
    setRecadrant(null);
    setVerif(null);
  }

  /* Le clic n'ouvre le sélecteur de fichier QUE si le doigt n'a pas recadré :
     sans ça, chaque recadrage finirait par une boîte de dialogue. */
  function clicVignette(id: string) {
    if (recadre.current?.bouge) return;
    inputs.current[`double-${id}`]?.click();
  }

  function deposerSur(cibleId: string) {
    const src = glisse.current;
    glisse.current = null;
    if (!src || src === cibleId) return;
    setDoubles((d) => {
      const from = d.findIndex((x) => x.id === src);
      const to = d.findIndex((x) => x.id === cibleId);
      if (from < 0 || to < 0) return d;
      const copie = [...d];
      const [item] = copie.splice(from, 1);
      copie.splice(to, 0, item);
      return copie;
    });
    setVerif(null);
  }

  /* ── le dépôt du PDF print-ready ───────────────────────────────────
     Même mécanique que les visuels, autre route : PDF seulement, plafond
     dédié, et l'envoi DOIT rester un seul PUT — l'empreinte md5 qui part
     chez Cloudprinter est l'ETag de cet objet. */
  async function televerserPdf(champ: string, slot: string, file: File) {
    setEnvoiEnCours(champ);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
    try {
      const r = await fetch("/api/admin/atelier/impression/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          slot,
          nom: file.name,
          type: file.type,
          taille: file.size,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          format_refuse: "PDF uniquement.",
          taille_refusee: "Fichier trop lourd (200 Mo maximum).",
        };
        setErreurs((e) => [...e, { champ, message: messages[data?.error] ?? "Envoi impossible." }]);
        return;
      }

      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!put.ok) {
        setErreurs((e) => [...e, { champ, message: "Le coffre a refusé le fichier." }]);
        return;
      }

      set(champ, data.key);
      setPdfNoms((n) => ({ ...n, [champ]: `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} Mo)` }));
    } catch {
      setErreurs((e) => [...e, { champ, message: "Envoi interrompu. Réessaie." }]);
    } finally {
      setEnvoiEnCours(null);
    }
  }

  async function appeler(verifier: boolean) {
    if (!choisie) return;
    if (demo) {
      /* En démonstration, la vérification est simulée pour que le parcours
         se déroule en entier ; rien ne part, ni en base, ni chez Brevo. */
      setVerif({
        action: { cle: choisie.cle, libelle: choisie.libelle, vers: choisie.vers, note: choisie.note },
        resume: simulerResume(choisie.cle, saisie.nb_pages, saisie.pays_livraison),
        destinataire: {
          prenom: fiche.ligne.prenom,
          email: fiche.ligne.email,
          titre: fiche.ligne.titre,
        },
      });
      if (!verifier) setFait("Rien n'a été écrit : c'est la démonstration.");
      return;
    }

    setOccupe(true);
    setErreurs([]);
    try {
      const r = await fetch("/api/admin/atelier/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          action: choisie.cle,
          /* T-090 — la liste ORDONNÉE des doubles pages part à côté de la
             saisie scalaire. Ignorée par le serveur en format historique
             (plat vide → il lit c1/c4/double). */
          /* T-093 — les couvertures dans l'ordre de proposition, à côté des
             doubles pages. Le serveur n'écrit `plats` que s'il y en a
             plusieurs : une seule publication reste `{ plat }`, comme avant. */
          saisie: {
            ...saisie,
            apercu_plats: planches.map((p) => p.key),
            apercu_doubles: doubles.map((d) => d.key),
            apercu_cadrages: cadrages,
          },
          verifier,
        }),
      });
      const data = await r.json();

      if (r.status === 422) {
        setErreurs(data.erreurs ?? []);
        setVerif(null);
        return;
      }
      if (r.status === 409) {
        setFait(
          data?.error === "deja_commande"
            ? `La commande d'impression est déjà passée (nº ${data.orderId}). La page se recharge.`
            : "Le dossier a changé pendant que tu remplissais. La page se recharge.",
        );
        router.refresh();
        return;
      }
      if (!r.ok) {
        setErreurs([
          {
            champ: "action",
            message:
              data?.error === "cloudprinter" && data?.message
                ? `${data.message} Rien n'a été écrit.`
                : "L'opération a échoué. Rien n'a été écrit.",
          },
        ]);
        return;
      }

      if (verifier) {
        const v = data as Verif;
        setVerif(v);
        /* ── LE DEVIS REMPLIT LE CHAMP, ET LE NIVEAU VOYAGE AVEC LUI ─────
           Deux gestes, une seule raison : ne pas rappeler Cloudprinter au
           second clic (leur API rationne sévèrement). Le montant devient une
           saisie ordinaire — donc RELISIBLE et corrigeable avant de publier —
           et le niveau chiffré part avec, pour que la commande d'impression
           achète exactement le service qui a été devisé.
           ⚠️ On ne préremplit QUE si le champ était vide : un montant tapé par
           l'atelier ne se fait jamais écraser par une machine. */
        if (v.livraison?.client !== null && v.livraison?.client !== undefined) {
          setSaisie((prec) =>
            prec.livraison_centimes.trim()
              ? prec
              : { ...prec, livraison_centimes: eurosDeCentimes(v.livraison!.client!) },
          );
        }
        if (v.livraison?.niveau) {
          const niveau = v.livraison.niveau;
          setSaisie((prec) => ({ ...prec, livraison_niveau: niveau }));
        }
        return;
      }

      const mail = data.mail;
      setFait(
        mail
          ? mail.statut === "envoye"
            ? `C'est fait. Le mail ${mail.code} est parti.`
            : mail.statut === "deja_envoye"
              ? `C'est fait. Le mail ${mail.code} était déjà parti.`
              : `C'est fait, mais le mail ${mail.code} n'est pas parti (${mail.statut}). La relève réessaiera.`
          : "C'est fait. Aucun mail n'était prévu à cette étape.",
      );

      /* Le PDF souvenir se fabrique dans la foulée de la commande (03/09) :
         les fichiers sont désormais en base, la fusion peut lire le coffre.
         BEST-EFFORT strict — un raté ne touche pas la transition : la carte
         Impression porte le bouton de reprise, et M7b attend le fichier. */
      if (choisie.cle === "envoyer_impression") {
        fetch("/api/admin/atelier/souvenir", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: fiche.ligne.token }),
        }).catch(() => {});
      }

      setVerif(null);
      router.refresh();
    } catch {
      setErreurs([{ champ: "action", message: "Réseau interrompu. Vérifie l'état avant de recommencer." }]);
    } finally {
      setOccupe(false);
    }
  }

  if (!fiche.actions.length) {
    return (
      <section className="ate-carte ate-action">
        <h2 className="ate-carte-titre">L&apos;action du moment</h2>
        <p className="ate-faint">
          Rien à faire depuis « {fiche.ligne.libelleEtat} ». La suite ne dépend pas de nous.
        </p>
      </section>
    );
  }

  const besoinApercu = choisie?.cle === "publier_apercu" || choisie?.cle === "corriger_apercu";

  /* ── CE QUE LE DEVIS A DIT, EN TOUTES LETTRES ────────────────────────
     Entièrement DÉRIVÉ du retour du serveur : ni tarif écrit ici, ni phrase
     qui pourrait vieillir. Avant toute vérification, on annonce seulement ce
     que le champ vide déclenchera. */
  const l = verif?.livraison;
  const aideLivraison = !l
    ? "Vide : le devis Cloudprinter est demandé à la vérification."
    : l.source === "cloudprinter" && l.devisHtCentimes !== null && l.devisTtcCentimes !== null
      ? [
          `Devis Cloudprinter${
            verif?.resume.pays && paysValide(verif.resume.pays)
              ? `, ${PAYS_LIBELLE[verif.resume.pays]}`
              : ""
          }${l.transporteur ? `, ${l.transporteur}` : ""}${
            l.niveau ? ` (${l.niveau})` : ""
          } : ${eurosLisibles(l.devisHtCentimes)} HT, ${eurosLisibles(l.devisTtcCentimes)} TTC.`,
          l.absorbe > 0
            ? `Plafond appliqué : ${eurosLisibles(l.client ?? 0)} (Bellajour absorbe ${eurosLisibles(l.absorbe)}).`
            : "",
          l.niveauVouluAbsent && l.niveau
            ? `cp_saver non proposé, niveau retenu : ${l.niveau}.`
            : "",
        ]
          .filter(Boolean)
          .join(" ")
      : l.source === "admin"
        ? "Montant saisi à la main : il remplace le devis."
        : `Devis indisponible : ${l.raison ?? "raison inconnue"}. Saisis le montant.`;

  /* T2-2 — quel jeu de cadres ? La planche + les doubles pages, sauf pour
     corriger un dossier publié en trois fichiers avant ce format (c1/c4 en
     base, pas de plat) : là, on corrige dans son format d'origine. */
  const modeHistorique = !fiche.apercuBrut.plat && Boolean(fiche.apercuBrut.c1 || fiche.apercuBrut.c4);

  return (
    <section className="ate-carte ate-action">
      <h2 className="ate-carte-titre">L&apos;action du moment</h2>

      {fiche.actions.length > 1 ? (
        <div className="ate-choix">
          {fiche.actions.map((a) => (
            <button
              key={a.cle}
              type="button"
              className={choisie?.cle === a.cle ? "ate-choix-btn ate-choix-btn--actif" : "ate-choix-btn"}
              onClick={() => {
                setChoisie(a);
                setVerif(null);
                setErreurs([]);
              }}
            >
              {a.libelle}
            </button>
          ))}
        </div>
      ) : null}

      {/* ── T2-6 : l'état 2 attend LE PAIEMENT, pas un geste de l'atelier.
          Les mots viennent de la même vérité que la page cliente (« c'est à
          elle ») ; la correction reste à un clic, repliée. */}
      {!choisie && fiche.actions.length === 1 && fiche.actions[0].cle === "corriger_apercu" ? (
        <>
          <p className="ate-attente">On attend son paiement.</p>
          <p className="ate-faint">
            Sa page montre la couverture, la pagination et le prix. La relance M3b
            partira toute seule si elle tarde.
          </p>
          <button
            type="button"
            className="ate-lien-discret"
            onClick={() => {
              setChoisie(fiche.actions[0]);
              setVerif(null);
              setErreurs([]);
            }}
          >
            Corriger l&apos;aperçu (visuels ou pagination)
          </button>
        </>
      ) : null}

      {choisie ? (
        <>
          <p className="ate-action-explication">{choisie.explication}</p>

          {besoinApercu ? (
            <>
              {modeHistorique ? (
                /* Correction d'un vieux dossier : ses trois fichiers d'origine,
                   inchangés. Un dossier neuf ne passe jamais par ici. */
                <div className="ate-slots">
                  {SLOTS_HISTORIQUE.map((s) => (
                    <div key={s.cle} className="ate-slot">
                      <span className="ate-slot-label">{s.label}</span>
                      <button
                        type="button"
                        className={apercus[s.cle] ? "ate-slot-zone ate-slot-zone--pleine" : "ate-slot-zone"}
                        onClick={() => inputs.current[s.cle]?.click()}
                        disabled={envoiEnCours !== null}
                      >
                        {apercus[s.cle] ? (
                          <img src={apercus[s.cle]} alt="" className="ate-slot-img" />
                        ) : envoiEnCours === s.cle ? (
                          <span className="ate-slot-vide">Envoi…</span>
                        ) : (
                          <span className="ate-slot-vide">Choisir le fichier</span>
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          inputs.current[s.cle] = el;
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) televerser(s.cle, s.json, f);
                          e.target.value = "";
                        }}
                      />
                      {erreurDe(s.cle) ? <span className="ate-erreur">{erreurDe(s.cle)}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ate-maquette">
                  {/* ── LES COUVERTURES PROPOSÉES (1 à 3) ────────────────
                      Une planche = un fichier large 4e · dos · 1re, que la
                      page cliente coupe pile au centre. Depuis T-093 on peut
                      en proposer jusqu'à trois : la PREMIÈRE est celle que la
                      cliente voit d'emblée, glisser pour changer cet ordre. */}
                  <div className="ate-doubles">
                    <span className="ate-slot-label">
                      {SLOT_PLANCHE.label}{" "}
                      <span className="ate-faint">
                        — jusqu&apos;à {MAX_PLANCHES}. La première est proposée par défaut ;
                        glisser pour ranger.
                      </span>
                    </span>
                    <div className="ate-doubles-liste">
                      {planches.map((pl, i) => (
                        <div
                          key={pl.id}
                          className="ate-double"
                          draggable={envoiEnCours === null}
                          onDragStart={() => {
                            glissePlanche.current = pl.id;
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            deposerPlancheSur(pl.id);
                          }}
                        >
                          <button
                            type="button"
                            className="ate-double-zone ate-slot-zone--pleine"
                            onClick={() => inputs.current[`planche-${pl.id}`]?.click()}
                            disabled={envoiEnCours !== null}
                            title="Remplacer cette couverture"
                          >
                            {envoiEnCours === `planche-${pl.id}` ? (
                              <span className="ate-slot-vide">Envoi…</span>
                            ) : pl.preview ? (
                              <img src={pl.preview} alt="" className="ate-slot-img" />
                            ) : (
                              <span className="ate-slot-vide">Couverture {i + 1}</span>
                            )}
                            {/* Le rang n'est pas décoratif : c'est l'ordre que
                                verra la cliente, et le premier est celui qu'elle
                                voit sans rien choisir. */}
                            <span className="ate-double-rang" aria-hidden="true">
                              {i === 0 ? "1 · par défaut" : i + 1}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="ate-double-retirer"
                            onClick={() => retirerPlanche(pl.id)}
                            aria-label={`Retirer la couverture ${i + 1}`}
                            disabled={envoiEnCours !== null}
                          >
                            ×
                          </button>
                          <input
                            ref={(el) => {
                              inputs.current[`planche-${pl.id}`] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) remplacerPlanche(pl.id, f);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      ))}

                      {planches.length < MAX_PLANCHES ? (
                        <div
                          className="ate-double ate-double--ajout"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const f = e.dataTransfer.files?.[0];
                            if (f) ajouterPlanche(f);
                          }}
                        >
                          <button
                            type="button"
                            className="ate-double-zone ate-double-zone--ajout"
                            onClick={() => inputs.current.apercu_plat_new?.click()}
                            disabled={envoiEnCours !== null}
                          >
                            {envoiEnCours === "apercu_plat_new" ? (
                              <span className="ate-slot-vide">Envoi…</span>
                            ) : (
                              <span className="ate-double-plus" aria-hidden="true">
                                +
                              </span>
                            )}
                          </button>
                          <input
                            ref={(el) => {
                              inputs.current.apercu_plat_new = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) ajouterPlanche(f);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    {erreurDe("apercu_plat") || erreurDe("apercu_plat_0") ? (
                      <span className="ate-erreur">
                        {erreurDe("apercu_plat") ?? erreurDe("apercu_plat_0")}
                      </span>
                    ) : null}
                  </div>

                  {/* ── LE CADRAGE DE CHAQUE PLANCHE (T-090, rouvert 07/09) ──
                      La coupe reste centrée automatiquement PAR DÉFAUT : sans
                      geste, les deux tuiles montrent exactement la même chose
                      que la page cliente aujourd'hui. Glisser une tuile ne
                      déplace QUE sa face, horizontalement — la ligne de coupe
                      n'a rien à régler à la verticale. */}
                  {planches
                    .filter((pl) => pl.preview)
                    .map((pl, i) => (
                      <div key={`cadrage-${pl.id}`} className="ate-plat-cadrage">
                        <span className="ate-slot-label">
                          Cadrage{planches.length > 1 ? ` — couverture ${i + 1}` : ""}{" "}
                          <span className="ate-faint">
                            — glisser pour ajuster la coupe, centrée par défaut.
                          </span>
                        </span>
                        <div className="ate-plat-faces">
                          {(
                            [
                              { face: "droite" as const, nom: "La couverture", defaut: [100, 50] as [number, number] },
                              { face: "gauche" as const, nom: "La quatrième", defaut: [0, 50] as [number, number] },
                            ]
                          ).map(({ face, nom, defaut }) => {
                            const cleFace = cleCadrageCouverture(pl.key, face);
                            const reglee = Boolean(cadrages[cleFace]);
                            const [x, y] = litCadrage(cleFace, defaut);
                            return (
                              <div key={face} className="ate-plat-face">
                                <span className="ate-plat-face-nom">{nom}</span>
                                <div
                                  className="ate-plat-face-zone"
                                  onPointerDown={(e) =>
                                    debutRecadrage(e, `plat-${pl.id}-${face}`, cleFace, { defaut, verrouY: true })
                                  }
                                  onPointerMove={pendantRecadrage}
                                  onPointerUp={finRecadrage}
                                  onPointerCancel={finRecadrage}
                                  title="Glisser pour ajuster la coupe"
                                >
                                  <img
                                    src={pl.preview}
                                    alt=""
                                    className="ate-plat-face-img"
                                    draggable={false}
                                    style={{ objectPosition: `${x}% ${y}%` }}
                                  />
                                </div>
                                {reglee ? (
                                  <button
                                    type="button"
                                    className="ate-plat-face-reset"
                                    onClick={() => {
                                      setCadrages((c) => {
                                        const copie = { ...c };
                                        delete copie[cleFace];
                                        return copie;
                                      });
                                      setVerif(null);
                                    }}
                                  >
                                    Centrer
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                  {/* ── LES DOUBLES PAGES (0 à 3) ─────────────────────────
                      Glissé pour réordonner, × pour retirer, une tuile pour
                      ajouter tant qu'on n'a pas atteint le maximum. */}
                  <div className="ate-doubles">
                    <span className="ate-slot-label">
                      Doubles pages{" "}
                      <span className="ate-faint">
                        — facultatif, jusqu&apos;à {MAX_DOUBLES}. Glisser la tuile pour ranger,
                        glisser l&apos;image pour la recadrer.
                      </span>
                    </span>
                    <div className="ate-doubles-liste">
                      {doubles.map((d, i) => (
                        <div
                          key={d.id}
                          className="ate-double"
                          draggable={envoiEnCours === null && recadrant === null}
                          onDragStart={() => {
                            glisse.current = d.id;
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            deposerSur(d.id);
                          }}
                        >
                          <button
                            type="button"
                            className="ate-double-zone ate-slot-zone--pleine"
                            onClick={() => clicVignette(d.id)}
                            onPointerDown={(e) => debutRecadrage(e, d.id, d.key)}
                            onPointerMove={pendantRecadrage}
                            onPointerUp={finRecadrage}
                            onPointerCancel={finRecadrage}
                            disabled={envoiEnCours !== null}
                            title="Glisser pour recadrer, cliquer pour remplacer"
                          >
                            {envoiEnCours === `double-${d.id}` ? (
                              <span className="ate-slot-vide">Envoi…</span>
                            ) : (
                              <img
                                src={d.preview}
                                alt=""
                                className="ate-slot-img"
                                draggable={false}
                                style={
                                  cadrages[d.key]
                                    ? { objectPosition: cadrages[d.key] }
                                    : undefined
                                }
                              />
                            )}
                            <span className="ate-double-rang" aria-hidden="true">
                              {i + 1}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="ate-double-retirer"
                            onClick={() => retirerDouble(d.id)}
                            aria-label={`Retirer la double page ${i + 1}`}
                            disabled={envoiEnCours !== null}
                          >
                            ×
                          </button>
                          <input
                            ref={(el) => {
                              inputs.current[`double-${d.id}`] = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) remplacerDouble(d.id, f);
                              e.target.value = "";
                            }}
                          />
                          {erreurDe(`apercu_double_${i}`) || erreurDe(`double-${d.id}`) ? (
                            <span className="ate-erreur">
                              {erreurDe(`apercu_double_${i}`) ?? erreurDe(`double-${d.id}`)}
                            </span>
                          ) : null}
                        </div>
                      ))}

                      {doubles.length < MAX_DOUBLES ? (
                        <div className="ate-double ate-double--ajout">
                          <button
                            type="button"
                            className="ate-double-zone ate-double-zone--ajout"
                            onClick={() => inputs.current.double_new?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const f = e.dataTransfer.files?.[0];
                              if (f) ajouterDouble(f);
                            }}
                            disabled={envoiEnCours !== null}
                          >
                            {envoiEnCours === "apercu_double_new" ? (
                              <span className="ate-slot-vide">Envoi…</span>
                            ) : (
                              <span className="ate-double-plus" aria-hidden="true">
                                +
                              </span>
                            )}
                          </button>
                          <input
                            ref={(el) => {
                              inputs.current.double_new = el;
                            }}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                            hidden
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) ajouterDouble(f);
                              e.target.value = "";
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                    {erreurDe("apercu_double_new") ? (
                      <span className="ate-erreur">{erreurDe("apercu_double_new")}</span>
                    ) : null}
                  </div>
                </div>
              )}

              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Nombre de pages composées</span>
                <input
                  className="adm-input"
                  type="number"
                  min={PAGES_MIN}
                  max={PAGES_MAX}
                  step={PAS_PAGES}
                  inputMode="numeric"
                  value={saisie.nb_pages}
                  onChange={(e) => set("nb_pages", e.target.value)}
                  placeholder="34"
                />
                <span className="ate-champ-aide">
                  Le prix en découle. De {PAGES_MIN} à {PAGES_MAX} pages, par
                  deux, {PAGES_AGRAFE + PAS_PAGES} exclu.
                </span>
                {erreurDe("nb_pages") ? <span className="ate-erreur">{erreurDe("nb_pages")}</span> : null}
              </label>

              {/* ── LE PAYS DE LIVRAISON (lot 3, 10/09/2026) ──────────────
                  Obligatoire ici, parce que publier l'aperçu, c'est annoncer
                  un prix, et que le port sera devisé par destination (lot 6).
                  L'option vide n'existe QUE pour les dossiers ouverts avant
                  le 10/09, qui n'ont jamais eu la question : ils obligent
                  l'atelier à trancher au lieu de partir sur un défaut. */}
              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Pays de livraison</span>
                <select
                  className="adm-input"
                  value={saisie.pays_livraison ?? ""}
                  onChange={(e) => set("pays_livraison", e.target.value)}
                >
                  {paysValide(saisie.pays_livraison) ? null : <option value="">Choisir</option>}
                  {PAYS_LIVRAISON.map((code) => (
                    <option key={code} value={code}>{PAYS_LIBELLE[code]}</option>
                  ))}
                </select>
                <span className="ate-champ-aide">
                  Demandé au client à l&apos;écran 4. Le devis de livraison en dépend.
                </span>
                {erreurDe("pays_livraison") ? (
                  <span className="ate-erreur">{erreurDe("pays_livraison")}</span>
                ) : null}
              </label>

              {/* ── LA LIVRAISON TTC (lot 6, 10/09/2026) ──────────────────
                  Laissé VIDE, c'est la vérification qui va chercher le devis
                  chez Cloudprinter et remplit ce champ. Rempli, il GAGNE : un
                  devis raté, une adresse hors zone raisonnable ou un geste
                  commercial se règlent à la main, et un montant tapé par un
                  humain ne se fait jamais écraser par une machine.
                  ⚠️ Aucun tarif n'est proposé par défaut : un port supposé
                  serait un montant que personne n'a décidé. */}
              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Livraison TTC (€)</span>
                <input
                  className="adm-input"
                  type="text"
                  inputMode="decimal"
                  value={saisie.livraison_centimes}
                  onChange={(e) => set("livraison_centimes", e.target.value)}
                  placeholder="laisser vide : devis automatique"
                />
                <span className="ate-champ-aide">{aideLivraison}</span>
                {erreurDe("livraison_centimes") ? (
                  <span className="ate-erreur">{erreurDe("livraison_centimes")}</span>
                ) : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "publier_maquette" ? (
            <>
              <label className="ate-champ">
                <span className="ate-champ-label">Lien Canva à PARTAGER</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.canva_url}
                  onChange={(e) => set("canva_url", e.target.value)}
                  placeholder="https://www.canva.com/design/…"
                />
                {/* PRD §11 : en édition, elle casse les fonds perdus, écrase une
                    police ou insère du 72 dpi, et ça se découvre à la livraison. */}
                <span className="ate-champ-aide ate-champ-aide--attention">
                  Mode COMMENTAIRE uniquement. Jamais le lien d&apos;édition.
                </span>
                {erreurDe("canva_url") ? <span className="ate-erreur">{erreurDe("canva_url")}</span> : null}
              </label>

              <label className="ate-champ">
                <span className="ate-champ-label">PDF feuilletable (facultatif)</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.maquette_pdf_url}
                  onChange={(e) => set("maquette_pdf_url", e.target.value)}
                  placeholder="https://…"
                />
                {erreurDe("maquette_pdf_url") ? (
                  <span className="ate-erreur">{erreurDe("maquette_pdf_url")}</span>
                ) : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "envoyer_impression" ? (
            fiche.cloudprinterOrderId ? (
              /* Jamais deux commandes : si le numéro en porte déjà une, le
                 bouton disparaît et l'écran dit laquelle. */
              <p className="ate-fait">
                Commande nº {fiche.cloudprinterOrderId} déjà passée chez l&apos;imprimeur.
              </p>
            ) : (
              <>
                <div className="ate-slots">
                  {/* Quels cadres ? Ceux du produit : l'agrafé (20 p.) prend UN
                      PDF complet, le dos carré prend la couverture enveloppante
                      ET le bloc. Le serveur revalide — ici on n'affiche que les
                      cadres utiles pour ne pas faire déposer un fichier de trop. */}
                  {SLOTS_IMPRESSION.filter((s) =>
                    fiche.ligne.nbPages === 20 ? s.type === "product" : s.type !== "product",
                  ).map((s) => (
                    <div key={s.cle} className="ate-slot">
                      <span className="ate-slot-label">{s.label}</span>
                      <button
                        type="button"
                        className={saisie[s.cle] ? "ate-slot-zone ate-slot-zone--pleine" : "ate-slot-zone"}
                        onClick={() => inputs.current[s.cle]?.click()}
                        disabled={envoiEnCours !== null}
                      >
                        {envoiEnCours === s.cle ? (
                          <span className="ate-slot-vide">Envoi…</span>
                        ) : pdfNoms[s.cle] ? (
                          <span className="ate-slot-vide">{pdfNoms[s.cle]}</span>
                        ) : (
                          <span className="ate-slot-vide">Choisir le fichier</span>
                        )}
                      </button>
                      <input
                        ref={(el) => {
                          inputs.current[s.cle] = el;
                        }}
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) televerserPdf(s.cle, s.slot, f);
                          e.target.value = "";
                        }}
                      />
                      {erreurDe(s.cle) ? <span className="ate-erreur">{erreurDe(s.cle)}</span> : null}
                    </div>
                  ))}
                </div>
                <span className="ate-champ-aide">
                  Les fichiers print-ready, pas le feuilletable : ce sont EUX qui partent chez
                  l&apos;imprimeur, avec l&apos;adresse collectée par Stripe.
                </span>
              </>
            )
          ) : null}

          {choisie.cle === "marquer_expediee" ? (
            <>
              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Transporteur</span>
                <input
                  className="adm-input"
                  value={saisie.transporteur}
                  onChange={(e) => set("transporteur", e.target.value)}
                  placeholder="Colissimo"
                />
                {erreurDe("transporteur") ? <span className="ate-erreur">{erreurDe("transporteur")}</span> : null}
              </label>
              <label className="ate-champ">
                <span className="ate-champ-label">Numéro ou lien de suivi (facultatif)</span>
                <input
                  className="adm-input"
                  value={saisie.tracking_url}
                  onChange={(e) => set("tracking_url", e.target.value)}
                  placeholder="6A123456789FR"
                />
                <span className="ate-champ-aide">
                  Le numéro suffit : il devient un lien de suivi quand le transporteur est connu,
                  et reste écrit sur sa page dans tous les cas.
                </span>
                {erreurDe("tracking_url") ? <span className="ate-erreur">{erreurDe("tracking_url")}</span> : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "photos_insuffisantes" ? (
            <label className="ate-champ">
              <span className="ate-champ-label">Un mot pour le client (facultatif)</span>
              <textarea
                className="adm-input ate-mot"
                rows={3}
                maxLength={500}
                value={saisie.mot ?? ""}
                onChange={(e) => set("mot", e.target.value)}
                placeholder="Ex. : vos photos sont belles mais trop sombres pour l'impression, si vous avez les originaux…"
              />
              {/* T2-3 — le cas réel : le problème était la QUALITÉ des photos,
                  pas leur nombre. Le mail générique tombait à côté. */}
              <span className="ate-champ-aide">
                Affiché dans M9, encart « Un mot de l&apos;atelier ». Vide : le mail part sans encart.
              </span>
            </label>
          ) : null}

          {erreurDe("action") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("action")}</p> : null}
          {erreurDe("etat") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("etat")}</p> : null}

          {/* ── l'écran de confirmation ─────────────────────────────────
              Ce que la cliente va recevoir, avant que ça parte. C'est la
              réponse à « est-ce que j'ai bien envoyé les bonnes infos au bon
              client ». */}
          {verif ? (
            <div className="ate-confirm">
              <h3 className="ate-confirm-titre">Avant de confirmer</h3>
              <dl className="ate-confirm-liste">
                {verif.resume.nbPages ? (
                  <>
                    <dt>Pagination</dt>
                    <dd>{verif.resume.nbPages} pages</dd>
                    <dt>Prix</dt>
                    <dd className="ate-confirm-prix">
                      {verif.resume.euros}&nbsp;€{" "}
                      {/* La RELIURE, pas le code de palier : « dos carré collé »
                          se relit, « p40 » ne nomme plus rien depuis le 10/09. */}
                      {verif.resume.reliure ? (
                        <span className="ate-faint">({RELIURE_LIBELLE[verif.resume.reliure]})</span>
                      ) : null}
                    </dd>
                  </>
                ) : null}
                {/* Le PORT et sa destination, sur la même ligne : c'est ce
                    qui s'ajoutera au prix chez Stripe, et un code ISO ne se
                    relit pas. En démonstration, aucun chiffre n'est inventé —
                    il n'y a ni base ni clé Cloudprinter derrière. */}
                {verif.resume.pays && paysValide(verif.resume.pays) ? (
                  <>
                    <dt>Livraison</dt>
                    <dd>
                      {demo
                        ? LIVRAISON_DEMO
                        : verif.livraison?.client !== null && verif.livraison?.client !== undefined
                          ? eurosLisibles(verif.livraison.client)
                          : LIVRAISON_DEMO}{" "}
                      <span className="ate-faint">· {PAYS_LIBELLE[verif.resume.pays]}</span>
                    </dd>
                  </>
                ) : null}
                {verif.impression ? (
                  <>
                    <dt>Produit</dt>
                    <dd>
                      {verif.impression.produitLibelle}{" "}
                      <span className="ate-faint">({verif.impression.produit})</span>
                    </dd>
                    <dt>{verif.impression.fichiers.length > 1 ? "Fichiers" : "Fichier"}</dt>
                    <dd>
                      {verif.impression.fichiers.length
                        ? verif.impression.fichiers
                            .map((f) => `${f.type} : ${(f.taille / (1024 * 1024)).toFixed(1)} Mo`)
                            .join(" · ") + ", empreintes vérifiées"
                        : "—"}
                    </dd>
                    <dt>Livraison</dt>
                    <dd>
                      {verif.impression.adresse
                        ? `${verif.impression.adresse.nom}, ${verif.impression.adresse.ville} (${verif.impression.adresse.pays})`
                        : "—"}{" "}
                      <span className="ate-faint">{verif.impression.shippingLevel}</span>
                    </dd>
                    {verif.impression.modeManuel ? (
                      <>
                        <dt>Imprimeur</dt>
                        <dd>
                          <span className="ate-alerte">
                            Cloudprinter n&apos;est pas branché (clé absente) : la commande est à
                            passer À LA MAIN sur leur interface. Seul l&apos;état changera ici.
                          </span>
                        </dd>
                      </>
                    ) : (
                      <>
                        <dt>Imprimeur</dt>
                        <dd>La commande partira chez Cloudprinter au clic suivant.</dd>
                      </>
                    )}
                  </>
                ) : null}
                {verif.mot ? (
                  <>
                    <dt>Votre mot</dt>
                    <dd>« {verif.mot} »</dd>
                  </>
                ) : null}
                <dt>Destinataire</dt>
                <dd>
                  {verif.destinataire.prenom || "—"}{" "}
                  <span className="ate-faint">{verif.destinataire.email}</span>
                </dd>
                <dt>Mail</dt>
                <dd>
                  {/* Le mail vient de la RÈGLE d'envoi, projetée sur ce
                      dossier : ce qui est annoncé ici est ce qui partira une
                      seconde plus tard, pas ce qu'une table déclarait. */}
                  {choisie.mail ? (
                    choisie.mail.absent ? (
                      <span className="ate-alerte">
                        {choisie.mail.code} n&apos;est pas encore câblé — elle ne sera PAS prévenue.
                        Préviens-la à la main.
                      </span>
                    ) : (
                      <>Le mail {choisie.mail.code} partira maintenant.</>
                    )
                  ) : (
                    "Aucun mail ne partira maintenant."
                  )}
                  {verif.action.note ? (
                    <span className="ate-faint"> {verif.action.note}</span>
                  ) : null}
                </dd>
              </dl>

              <div className="ate-confirm-boutons">
                <a
                  className="adm-btn adm-btn--ghost"
                  href={`/numero/${fiche.ligne.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir sa page
                </a>
                {/* ── PRÉVISUALISER, ENTRE PRÉPARER ET CONFIRMER ─────────
                    Demande de Mathias (10/09/2026) : voir la page telle
                    qu'elle sera, avec ce qui vient d'être saisi, avant que
                    le mail parte. C'est un LIEN, pas un bouton : nouvel
                    onglet, adresse visible au survol, rien à poster.
                    Le dry-run vient de déposer le brouillon au journal ; la
                    page d'état le superpose pour un porteur du cookie admin,
                    et pour personne d'autre.
                    ⚠️ ABSENT EN DÉMONSTRATION, et c'est normal :
                    /admin/atelier/demo n'écrit rien en base (`simulerResume`
                    ne rend pas `brouillon`), donc il n'y aurait aucun
                    brouillon à afficher au bout du lien. */}
                {besoinApercu && verif.brouillon === true ? (
                  <a
                    className="adm-btn adm-btn--ghost"
                    href={`/numero/${fiche.ligne.token}?brouillon=1`}
                    target="_blank"
                    rel="noopener"
                  >
                    Prévisualiser la page du client
                  </a>
                ) : null}
                <button
                  className="adm-btn ate-btn-valider"
                  type="button"
                  disabled={occupe}
                  onClick={() => appeler(false)}
                >
                  {occupe ? "…" : `Confirmer — ${choisie.libelle}`}
                </button>
              </div>

              {/* L'aide dit ce que le lien fait, ou POURQUOI il n'est pas là.
                  Un bouton qui disparaît sans un mot se lit comme une panne. */}
              {besoinApercu ? (
                <p className="ate-champ-aide">
                  {verif.brouillon === true
                    ? "S'ouvre dans un nouvel onglet, avec ce que tu viens de saisir. Rien n'est publié."
                    : demo
                      ? "Pas de prévisualisation en démonstration : elle a besoin d'un brouillon en base."
                      : "Prévisualisation indisponible : le brouillon n'a pas pu être écrit au journal."}
                </p>
              ) : null}
            </div>
          ) : choisie.cle === "envoyer_impression" && fiche.cloudprinterOrderId ? null : (
            <button
              className="adm-btn ate-btn-preparer"
              type="button"
              disabled={occupe || envoiEnCours !== null}
              onClick={() => appeler(true)}
            >
              {occupe ? "…" : "Préparer"}
            </button>
          )}

          {fait ? <p className="ate-fait">{fait}</p> : null}
        </>
      ) : (
        <p className="ate-faint">Choisis une action.</p>
      )}
    </section>
  );
}

/* Des CENTIMES vers ce qu'un humain tape : « 4,90 », « 12 ». Virgule
   française, décimales seulement quand elles disent quelque chose — c'est le
   champ qu'on relit, pas un tableur. */
function eurosDeCentimes(centimes: number): string {
  const e = Math.round(centimes) / 100;
  return Number.isInteger(e) ? String(e) : e.toFixed(2).replace(".", ",");
}

/* « 11,06 € ». Le jumeau navigateur de `formaterCentimes` (prix.ts, SERVEUR
   UNIQUEMENT parce qu'il porte la grille) : recopié plutôt qu'importé, comme
   `tokenForme.ts` l'est de `token.ts`. Trois lignes de mise en forme ne sont
   pas une décision de montant — l'invariant nº2 tient toujours, le serveur
   reste le seul à DÉCIDER de ce qui sera débité. */
function eurosLisibles(centimes: number): string {
  return `${eurosDeCentimes(centimes)} €`;
}

/* Le seul calcul de prix côté navigateur de tout le projet, et il n'existe
   QUE pour la démonstration (/admin/atelier/demo, sans base) : sans lui,
   l'écran de confirmation de la démo serait vide et le parcours ne se
   raconterait pas. Il ne sert JAMAIS sur un vrai dossier — là, le résumé vient
   du serveur, par le chemin exact qui écrira le prix en base. C'est ça,
   l'invariant : la grille est publique, la DÉCISION est au serveur. */
function simulerResume(cle: string, nbPagesBrut: string, paysBrut: string) {
  if (cle !== "publier_apercu" && cle !== "corriger_apercu") return {};
  /* Le pays part avec le reste : sur un vrai dossier, le serveur le rend
     dans `resume.pays` et la confirmation dit « Livraison en France ». Sans
     lui ici, la démonstration montrerait un écran de confirmation amputé de
     la ligne que l'atelier doit justement apprendre à relire. */
  const pays = paysValide(paysBrut) ? { pays: paysBrut } : {};
  const n = Number(nbPagesBrut);
  if (!Number.isInteger(n)) return pays;
  const euros = eurosPourPages(n);
  if (euros === null) return { ...pays, nbPages: n };
  return {
    ...pays,
    nbPages: n,
    /* Le bucket hérité, pour que la démonstration montre le même objet que le
       serveur — il n'entre plus dans aucun calcul de prix. */
    palier: n < 30 ? "p30" : n < 40 ? "p40" : "p45",
    euros,
    reliure: reliurePour(n) ?? undefined,
  };
}

/* ⚠️ LA DÉMONSTRATION N'INVENTE AUCUN PORT. Un devis Cloudprinter est un
   appel réseau vers un tiers, et /admin/atelier/demo tourne sans base et sans
   clé : afficher « 11,06 € » ici ferait croire à un tarif décidé, alors qu'il
   n'y en a aucun (interdit nº5). L'écran de confirmation de la démo dit donc
   « à saisir », ce qui est exactement ce qui se passerait en vrai si le devis
   échouait. */
const LIVRAISON_DEMO = "à saisir";
