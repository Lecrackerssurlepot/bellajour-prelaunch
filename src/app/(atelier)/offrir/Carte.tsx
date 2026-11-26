/* LA carte cadeau de la charte V2 (fiche H, duplicata « Essai photos » du 26/11) :
   face nuit, proportion 1,586, logo blanc, la phrase, le montant, le code et la
   validité sur une ligne, la couverture qui dépasse en bas à droite.
   Partagée par /offrir (aperçu qui suit la saisie), /offrir/merci et /carte/<token>.
   Rien d'interactif : pas d'état, le survol est du CSS (carte.css).
   Les classes sont courtes et scopées par `.ct` : aucune règle ne sort d'ici.
   La couverture vient de `--carte-visuel`, posée par la page (emplacement `offrir.carte`).
   noel-preview/CarteCadeau.tsx reste l'outil interne, intact. */

type Props = {
  phrase: string
  montant: string
  prenom: string
  message: string
  /* Le vrai code d'une carte, ou l'exemple de l'aperçu. */
  code: string
  /* « Valable jusqu'au 16 novembre 2027 » sur une vraie carte. */
  validite?: string
}

export default function Carte({ phrase, montant, prenom, message, code, validite = 'Valable 12 mois' }: Props) {
  const pour = prenom.trim()
  const mot = message.trim()
  return (
    <div className="ct">
      <div className="ct-face">
        <img className="ct-logo" src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} />
        <div className="ct-milieu" data-mot={mot ? '1' : '0'}>
          {pour && <span className="ct-pour">Pour {pour}</span>}
          <span className="ct-phrase">{phrase}</span>
          {mot && <span className="ct-message">{`« ${mot} »`}</span>}
        </div>
        <div className="ct-bas">
          <span className="ct-montant">{montant}</span>
          <span className="ct-infos">
            <span className="ct-code">{code}</span>
            <span>{validite}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
