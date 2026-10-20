"use client";

/* Le dépôt d'un participant (PRD §5.1, maquette Participant) : d'abord sur
   téléphone. Prénom et nom → accord → choisir des photos → l'envoi part
   tout seul → « Merci, N photos reçues ».

   ⚠️ Le texte de l'accord est un texte LÉGAL : celui-ci a été choisi par
   Mathias le 17/10/2026 (« version complète »). Ne pas le réécrire sans lui.
   Il ne promet AUCUNE durée de conservation : rien ne supprime encore les
   photos après la livraison. Sa VERSION est `VERSION_ACCORD` (accord.ts) :
   changer un mot, c'est une nouvelle version (le harnais compare). Cocher la
   case donne la version au moteur, qui l'envoie avec chaque photo ; le
   serveur refuse un participant sans elle et l'enregistre horodatée (T-184).
   ⚠️ Aucune promesse que l'écran ne tient pas : l'envoi ne continue pas page
   fermée (iOS surtout), on le dit. Le plafond par personne est tenu par
   appareil, on ne prétend pas le contraire.
   Le nom se GARDE sur le téléphone (T-180) et ne se CHANGE plus une fois des
   photos choisies (participant.ts, retours du 19/10 au soir : « sinon ça va
   faire beaucoup de liens bizarres ») : prénom ET nom exigés la première fois,
   puis « Tu envoies en tant que … ». Le serveur fait foi (`nomConnu`, lu par
   le cookie de l'appareil) : un téléphone dont le navigateur a oublié le nom
   le retrouve, et la route le reprend même si on le retapait. */

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { VERSION_ACCORD } from "@/lib/collectif/accord";
import { PHOTOS_SEULEMENT, phrasesIgnores } from "@/lib/collectif/depot";
import { deNom } from "@/lib/collectif/espace";
import { NOM_MAX, nomComplet, premierMot } from "@/lib/collectif/participant";
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
  /** Le nom que CE téléphone a déjà donné dans l'édition (lu au serveur), ou `null`. */
  nomConnu: string | null;
  /** Ses photos déjà arrivées dans l'édition. */
  dejaArrivees: number;
};

/** Le nom gardé sur ce téléphone (localStorage peut manquer : navigation privée, refus). */
const CLE_PRENOM = "bj-depot-prenom";
function prenomGarde(): string {
  try {
    return window.localStorage.getItem(CLE_PRENOM) ?? "";
  } catch {
    return "";
  }
}
function garderPrenom(v: string) {
  try {
    if (v.trim()) window.localStorage.setItem(CLE_PRENOM, v.trim());
    else window.localStorage.removeItem(CLE_PRENOM);
  } catch {
    /* rien de gardé : on le redemandera */
  }
}
const sansAbonnement = () => () => {};

export default function Depot(props: Props) {
  /* Le nom gardé sur le téléphone, lu par useSyncExternalStore (rien côté serveur),
     jamais par un setState d'hydratation. Le serveur passe avant lui. */
  const garde = useSyncExternalStore(sansAbonnement, prenomGarde, () => "");
  const [fige, setFige] = useState<string | null>(null);
  const nomFixe = props.nomConnu ?? fige ?? (garde || null);
  const [prenomSaisi, setPrenomSaisi] = useState("");
  const [nomSaisi, setNomSaisi] = useState("");
  const nomPret = Boolean(nomFixe ?? nomComplet(prenomSaisi, nomSaisi));
  const [accord, setAccord] = useState(false);
  const moteur = useMemo(() => new MoteurDepot({ token: props.token, p: props.p, tu: props.tu }), [props.token, props.p, props.tu]);
  const vue = useMoteur(moteur);
  const fichier = useRef<HTMLInputElement>(null);
  const v = (vous: string, toi: string) => (props.tu ? toi : vous);

  /* « Merci » seulement quand TOUT est parti : une photo en erreur se dit, avec « Réessayer ». */
  const termine = vue.total > 0 && vue.enCours === 0 && vue.erreurs === 0;
  const recues = vue.arrivees + vue.dejaLa;
  const part = vue.total ? Math.round(((vue.total - vue.enCours) / vue.total) * 100) : 0;
  /* Les fichiers écartés à l'ajout : la vidéo nommée comme telle (T-200). */
  const ignores = phrasesIgnores(vue.ignores, vue.videos, vue.premiereVideo);

  if (vue.ferme) {
    return <p className="ec-dp-texte">{vue.ferme}</p>;
  }

  return (
    <div className="ec-dp-form">
      {nomFixe ? (
        <div className="ec-dp-qui">
          <p>
            {v("Vous envoyez en tant que", "Tu envoies en tant que")} <strong>{nomFixe}</strong>
          </p>
          {props.dejaArrivees ? (
            <p className="ec-dp-note">
              {props.dejaArrivees} photo{props.dejaArrivees > 1 ? "s" : ""} déjà reçue{props.dejaArrivees > 1 ? "s" : ""} depuis ce téléphone.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="ec-dp-nom">
          <div className="ec-dp-duo">
            <label className="ec-dp-champ">
              <span>{v("Votre prénom", "Ton prénom")}</span>
              <input
                className="ec-dp-input"
                value={prenomSaisi}
                onChange={(e) => setPrenomSaisi(e.target.value)}
                autoComplete="given-name"
                autoCapitalize="words"
                maxLength={NOM_MAX}
                required
              />
            </label>
            <label className="ec-dp-champ">
              <span>{v("Votre nom", "Ton nom")}</span>
              <input
                className="ec-dp-input"
                value={nomSaisi}
                onChange={(e) => setNomSaisi(e.target.value)}
                autoComplete="family-name"
                autoCapitalize="words"
                maxLength={NOM_MAX}
                required
              />
            </label>
          </div>
          <p className="ec-dp-note">
            {v(
              "Pour que l'organisateur sache de qui viennent les photos. Écrivez-le bien : il ne se change plus ensuite.",
              "Pour que l'organisateur sache de qui viennent les photos. Écris-le bien : il ne se change plus ensuite."
            )}
          </p>
        </div>
      )}

      <label className="ec-dp-accord">
        <input
          type="checkbox"
          checked={accord}
          onChange={(e) => {
            setAccord(e.target.checked);
            moteur.definirAccord(e.target.checked ? VERSION_ACCORD : null);
          }}
        />
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
          /* Le nom part avec les photos, puis il est FIGÉ sur ce téléphone. */
          const nomEnvoye = nomFixe ?? nomComplet(prenomSaisi, nomSaisi);
          if (!nomEnvoye) return;
          garderPrenom(nomEnvoye);
          setFige(nomEnvoye);
          moteur.definirDeposant(nomEnvoye);
          if (e.target.files) moteur.ajouter(e.target.files);
          e.target.value = "";
        }}
      />
      <button type="button" className="ec-dp-bouton" disabled={!accord || !nomPret} onClick={() => fichier.current?.click()}>
        {vue.total ? v("Ajouter d'autres photos", "Ajouter d'autres photos") : v("Choisir mes photos", "Choisir mes photos")}
      </button>
      <p className="ec-dp-note">{PHOTOS_SEULEMENT}</p>
      {!nomPret ? (
        <p className="ec-dp-note">{v("Indiquez votre prénom et votre nom pour choisir vos photos.", "Indique ton prénom et ton nom pour choisir tes photos.")}</p>
      ) : !accord ? (
        <p className="ec-dp-note">{v("Cochez l'accord pour choisir vos photos.", "Coche l'accord pour choisir tes photos.")}</p>
      ) : null}
      {!vue.total
        ? ignores.map((t) => (
            <p key={t} className="ec-dp-note ec-dp-note--refus">
              {t}
            </p>
          ))
        : null}

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
              Merci{premierMot(nomFixe) ? ` ${premierMot(nomFixe)}` : ""}, {recues} photo{recues > 1 ? "s" : ""} reçue{recues > 1 ? "s" : ""}.
            </p>
          ) : vue.enCours ? (
            <p className="ec-dp-note">
              {v(
                "Gardez cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées.",
                "Garde cette page ouverte pendant l'envoi. Les photos déjà arrivées sont gardées."
              )}
            </p>
          ) : (
            <p className="ec-dp-note ec-dp-note--refus">
              {vue.erreurs} photo{vue.erreurs > 1 ? "s" : ""} n&apos;{vue.erreurs > 1 ? "ont" : "a"} pas pu partir.
            </p>
          )}
          {vue.refusees ? (
            <p className="ec-dp-note">
              {vue.refusees} photo{vue.refusees > 1 ? "s" : ""} refusée{vue.refusees > 1 ? "s" : ""} :
            </p>
          ) : null}
          {vue.horsLigne ? <p className="ec-dp-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
          {vue.serveurLent ? <p className="ec-dp-note">Le serveur répond lentement : l&apos;envoi reprend tout seul.</p> : null}
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
          {ignores.map((t) => (
            <p key={t} className="ec-dp-note">
              {t}
            </p>
          ))}
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
