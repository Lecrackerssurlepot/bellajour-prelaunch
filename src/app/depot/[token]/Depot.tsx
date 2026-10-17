"use client";

/* Le dépôt d'un participant (PRD §5.1, maquette Participant) : d'abord sur
   téléphone. Prénom facultatif → accord → choisir des photos → l'envoi part
   tout seul → « Merci, N photos reçues ».

   ⚠️ Le texte de l'accord est un texte LÉGAL : celui-ci a été choisi par
   Mathias le 17/10/2026 (« version complète »). Ne pas le réécrire sans lui.
   Il ne promet AUCUNE durée de conservation : rien ne supprime encore les
   photos après la livraison.
   ⚠️ Aucune promesse que l'écran ne tient pas : l'envoi ne continue pas page
   fermée (iOS surtout), on le dit. Le plafond par personne est tenu par
   appareil, on ne prétend pas le contraire. */

import { useMemo, useRef, useState } from "react";
import { deNom } from "@/lib/collectif/espace";
import { MoteurDepot } from "../../edition/_composants/depot/moteur";
import { useMoteur } from "../../edition/_composants/depot/useMoteur";

type Props = {
  token: string;
  p: string | null;
  tu: boolean;
  plafond: number | null;
  sansPlafond: boolean;
  cloture: string;
  organisation: string;
  evenement: string;
};

export default function Depot(props: Props) {
  const [prenom, setPrenom] = useState("");
  const [accord, setAccord] = useState(false);
  const moteur = useMemo(() => new MoteurDepot({ token: props.token, p: props.p }), [props.token, props.p]);
  const vue = useMoteur(moteur);
  const fichier = useRef<HTMLInputElement>(null);
  const v = (vous: string, toi: string) => (props.tu ? toi : vous);

  const termine = vue.total > 0 && vue.enCours === 0;
  const recues = vue.arrivees + vue.dejaLa;
  const part = vue.total ? Math.round(((vue.total - vue.enCours) / vue.total) * 100) : 0;

  if (vue.ferme) {
    return <p className="ec-dp-texte">{vue.ferme}</p>;
  }

  return (
    <div className="ec-dp-form">
      <label className="ec-dp-champ">
        <span>{v("Votre prénom et votre nom", "Ton prénom et ton nom")} (facultatif)</span>
        <input
          className="ec-dp-input"
          value={prenom}
          onChange={(e) => {
            setPrenom(e.target.value);
            moteur.definirDeposant(e.target.value);
          }}
          autoComplete="name"
          maxLength={80}
        />
      </label>

      <label className="ec-dp-accord">
        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
        <span>
          J&apos;accepte que Bellajour utilise ces photos pour composer le magazine « {props.evenement} » {deNom(props.organisation)}, et je confirme
          avoir le droit de les partager, y compris pour les personnes qu&apos;on y voit.
        </span>
      </label>

      <input
        ref={fichier}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) moteur.ajouter(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className="ec-dp-bouton" disabled={!accord} onClick={() => fichier.current?.click()}>
        {vue.total ? v("Ajouter d'autres photos", "Ajouter d'autres photos") : v("Choisir mes photos", "Choisir mes photos")}
      </button>
      {!accord ? <p className="ec-dp-note">{v("Cochez l'accord pour choisir vos photos.", "Coche l'accord pour choisir tes photos.")}</p> : null}

      {vue.total ? (
        <div className="ec-dp-progres" role="status" aria-live="polite">
          <div className="ec-dp-compte">
            <span>
              <strong>{recues}</strong> photo{recues > 1 ? "s" : ""} reçue{recues > 1 ? "s" : ""}
            </span>
            {vue.enCours ? <span>{vue.enCours} en cours</span> : null}
          </div>
          <div className="ec-dp-barre" aria-hidden="true">
            <div style={{ width: `${part}%` }} />
          </div>
          {termine ? (
            <p className="ec-dp-merci">
              Merci{prenom.trim() ? ` ${prenom.trim().split(/\s+/)[0]}` : ""}, {recues} photo{recues > 1 ? "s" : ""} reçue{recues > 1 ? "s" : ""}.
            </p>
          ) : (
            <p className="ec-dp-note">
              {v(
                "Gardez cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées.",
                "Garde cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées."
              )}
            </p>
          )}
          {vue.horsLigne ? <p className="ec-dp-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
          {vue.raisons.map((r) => (
            <p key={r} className="ec-dp-note ec-dp-note--refus">
              {r}
            </p>
          ))}
          {vue.erreurs ? (
            <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" onClick={() => moteur.reessayer()}>
              Réessayer ({vue.erreurs})
            </button>
          ) : null}
          {vue.ignores ? <p className="ec-dp-note">{vue.ignores} fichier(s) ignoré(s) : ce ne sont pas des photos.</p> : null}
        </div>
      ) : null}

      <p className="ec-dp-pied">
        {props.sansPlafond
          ? "Sans plafond par personne"
          : props.plafond
            ? `${props.plafond} photos au plus par personne`
            : "Le nombre de photos par personne n'est pas encore réglé"}
        {props.cloture ? ` · dépôt ouvert jusqu'au ${props.cloture}` : ""}
      </p>
    </div>
  );
}
