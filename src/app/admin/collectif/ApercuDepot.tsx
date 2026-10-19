/* La page qu'ouvrent les participants (le lien ou le QR code), en petit, à côté du
   message d'accueil (T-190, planche 11 du 19/10 au soir, validée par Mathias) :
   « Où va ce message ? » — sous le nom de l'événement, entouré d'un pointillé.

   Le patron est `src/app/depot/[token]/page.tsx` (Charbon) : la marque, « <organisation>
   vous invite » (« t'invite » en tu), le nom de l'événement, le message (sinon la phrase
   par défaut, `accueilParDefaut`), le champ du prénom et le bouton. Il suit la frappe :
   ce sont les valeurs du formulaire, rien n'est lu en base. Un aperçu, pas la page :
   rien n'y est cliquable. Les couleurs sont des jetons (`--eca-tel-*`, formulaire.css). */

import { accueilParDefaut } from "@/lib/collectif/saisie";

type Props = { organisation: string; evenement: string; message: string; registre: string };

export default function ApercuDepot({ organisation, evenement, message, registre }: Props) {
  const tu = registre === "ecole_tu";
  const org = organisation.trim();
  const titre = evenement.trim();
  const texte = message.trim();
  return (
    <div className="eca-fm-tel" role="img" aria-label="Aperçu de la page des participants">
      <div className="eca-fm-tel-ecran" aria-hidden="true">
        <span className="eca-fm-tel-marque">
          Bellajour<small>Édition collective</small>
        </span>
        <span className={org ? "eca-fm-tel-sur" : "eca-fm-tel-sur eca-fm-tel--attente"}>
          {`${org || "L'organisation"} ${tu ? "t’invite" : "vous invite"}`}
        </span>
        <span className={titre ? "eca-fm-tel-titre" : "eca-fm-tel-titre eca-fm-tel--attente"}>{titre || "Nom de l'événement"}</span>
        <span className={texte ? "eca-fm-tel-msg" : "eca-fm-tel-msg eca-fm-tel-msg--defaut"}>{texte || accueilParDefaut(registre)}</span>
        <span className="eca-fm-tel-lbl">{tu ? "Ton prénom et ton nom (facultatif)" : "Votre prénom et votre nom (facultatif)"}</span>
        <span className="eca-fm-tel-champ" />
        <span className="eca-fm-tel-bouton" />
      </div>
    </div>
  );
}
