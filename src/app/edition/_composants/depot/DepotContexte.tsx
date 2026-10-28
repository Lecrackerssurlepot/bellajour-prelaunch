"use client";

/* Le moteur d'envoi du RESPONSABLE vit dans la coquille, pas dans la page
   (PRD §5.2.3) : il peut aller lire ses messages ou le mur des styles pendant
   que trois cents photos partent. Un seul moteur par espace ouvert.

   La FENÊTRE d'envoi vit ici aussi (retours du 14/10, point 6, maquette
   EnvoiPhotos) : « Déposer des photos » l'ouvre depuis n'importe quel écran,
   « Réduire et continuer » la ferme sans rien arrêter, et la pastille
   « Envoi en cours » de l'en-tête la rouvre. */

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { BOUTON_REPRENDRE, coupeesADire, phraseCoupees, progression } from "@/lib/collectif/depotParticipant";
import FenetreEnvoi from "./FenetreEnvoi";
import { MoteurDepot } from "./moteur";
import { useMoteur } from "./useMoteur";
import { useSelecteur, useSelecteurInterrompu } from "./useSelecteur";

/** Ce que la fenêtre sait en s'ouvrant : le dossier ou le LIEN (son id, 28/10) où l'on est (proposé d'emblée, avec « Changer »), ou « un nouveau dossier ». */
export type OuvertureEnvoi = { dossier?: string | null; lien?: string | null; nouveau?: boolean; interrompu?: boolean };

type Envoi = {
  moteur: MoteurDepot | null;
  token: string;
  tu: boolean;
  ouvert: OuvertureEnvoi | null;
  ouvrir: (o?: OuvertureEnvoi) => void;
  fermer: () => void;
  /** Combien de fois la fenêtre s'est fermée : une page qui montre les photos se relit à chaque fermeture. */
  fermetures: number;
  /** 2A : les photos d'un envoi coupé sur cet appareil, lues au chargement de l'espace. */
  coupees: number;
};

const Contexte = createContext<Envoi>({ moteur: null, token: "", tu: false, ouvert: null, ouvrir: () => {}, fermer: () => {}, fermetures: 0, coupees: 0 });

export function useMoteurDepot(): MoteurDepot | null {
  return useContext(Contexte).moteur;
}

/** Ouvrir la fenêtre d'envoi, et savoir quand elle s'est refermée. `ouvrir` est nul sans droit de déposer. */
export function useFenetreEnvoi(): { ouvrir: ((o?: OuvertureEnvoi) => void) | null; fermetures: number } {
  const c = useContext(Contexte);
  return { ouvrir: c.moteur ? c.ouvrir : null, fermetures: c.fermetures };
}

export function DepotFournisseur({ token, actif, tu, coupees = 0, children }: { token: string; actif: boolean; tu: boolean; coupees?: number; children: React.ReactNode }) {
  const moteur = useMemo(() => (actif ? new MoteurDepot({ token }) : null), [token, actif]);
  const [choix, setOuvert] = useState<OuvertureEnvoi | null>(null);
  /* La page s'est relancée pendant un choix de photos (iPhone, grande sélection) : la fenêtre s'ouvre et le dit, une fois. */
  const interrompu = useSelecteurInterrompu();
  const [interruptionVue, setInterruptionVue] = useState(false);
  const ouvert = useMemo(() => choix ?? (moteur && interrompu && !interruptionVue ? { interrompu: true } : null), [choix, moteur, interrompu, interruptionVue]);
  const [fermetures, setFermetures] = useState(0);
  const ouvrir = useCallback((o?: OuvertureEnvoi) => {
    setInterruptionVue(true);
    setOuvert(o ?? {});
  }, []);
  const fermer = useCallback(() => {
    setInterruptionVue(true);
    setOuvert(null);
    setFermetures((n) => n + 1);
  }, []);
  const valeur = useMemo(() => ({ moteur, token, tu, ouvert, ouvrir, fermer, fermetures, coupees }), [moteur, token, tu, ouvert, ouvrir, fermer, fermetures, coupees]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** La fenêtre d'envoi, posée DANS la colonne de contenu (elle la couvre, pas le menu). */
export function HoteFenetreEnvoi() {
  const c = useContext(Contexte);
  if (!c.moteur || !c.ouvert) return null;
  return <FenetreEnvoi moteur={c.moteur} token={c.token} tu={c.tu} ouverture={c.ouvert} fermer={c.fermer} />;
}

/** La pastille « Envoi en cours » de l'en-tête : visible depuis tous les écrans, elle rouvre la fenêtre. */
export function PastilleEnvoi() {
  const c = useContext(Contexte);
  const vue = useMoteur(c.moteur);
  /* 2A : l'envoi coupé (« 8 photos non arrivées · Reprendre ») tant que rien n'est choisi sur cette page.
     « Reprendre » ouvre DIRECTEMENT le choix des photos (aucune étape de plus) ; les mêmes photos repartent
     sur leur ligne et gardent leur dossier ; la fenêtre s'ouvre ensuite sur l'envoi. */
  const coupees = coupeesADire(c.coupees, vue.total);
  const { moteur, ouvrir } = c;
  const selecteur = useSelecteur((fichiers) => {
    if (!moteur) return;
    if (!moteur.provenanceChoisie()) moteur.definirProvenance({ type: "organisateur", libelle: "" });
    moteur.ajouter(fichiers);
    ouvrir();
  });
  if (c.moteur && coupees) {
    return (
      <>
        <button type="button" className="ec-pastille-envoi" onClick={selecteur.ouvrir}>
          {phraseCoupees(coupees)} · {BOUTON_REPRENDRE}
        </button>
        <input type="file" multiple accept="image/*,.heic,.heif" hidden {...selecteur.champ} />
      </>
    );
  }
  if (!c.moteur || (vue.enCours === 0 && vue.erreurs === 0)) return null;
  /* Le dernier envoi, sans ce qui était déjà là (21/10 : une déjà-là n'est pas une photo envoyée). */
  const prog = progression(vue.lot);
  const faites = prog.envoyees;
  const part = prog.part;
  return (
    <button type="button" className="ec-pastille-envoi" onClick={() => c.ouvrir()}>
      <span className="ec-pastille-envoi-barre" aria-hidden="true">
        <span style={{ width: `${part}%` }} />
      </span>
      {vue.enCours
        ? `Envoi en cours · ${faites.toLocaleString("fr-FR")} sur ${prog.total.toLocaleString("fr-FR")} · Ouvrir`
        : `Envoi : ${vue.erreurs} à reprendre · Ouvrir`}
    </button>
  );
}
