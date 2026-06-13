import type { Metadata } from 'next'
import Footer from '../../sections/Footer'
import './charte.css'

/* Page charte — texte juridique du Cercle Ambassadeur (Vague 1).
   Server Component, page INDEXABLE (pas de noindex). Navbar légère :
   logo cliquable → /ambassadeurs. Contenu verbatim, aucune réécriture. */

export const metadata: Metadata = {
  title: 'Charte du Cercle Ambassadeur — Bellajour',
  description:
    'La charte du Cercle Ambassadeur Bellajour (Vague 1) : nature de l’engagement, mécanique des pages, récompenses, calendrier et conditions.',
  alternates: {
    canonical: 'https://www.bellajour.fr/ambassadeurs/charte',
  },
}

export default function ChartePage() {
  return (
    <main className="amb-charte">
      <nav className="amb-charte-nav" aria-label="Retour Cercle Ambassadeur">
        <a href="/ambassadeurs" className="amb-charte-logo-link" aria-label="Retour au Cercle Ambassadeur">
          <img
            src="/images/ui/logo.webp"
            className="amb-charte-logo"
            alt="Bellajour"
            decoding="sync"
          />
        </a>
        <a href="/ambassadeurs#inscription" className="amb-charte-back">
          ← Revenir à l&apos;inscription
        </a>
      </nav>

      <article className="amb-charte-body">
        <h1>Charte du Cercle Ambassadeur — Vague 1</h1>
        <p className="amb-charte-tagline">
          <em>Vivez, nous composons.</em>
        </p>

        <p>
          Le Cercle Ambassadeur n&apos;a rien d&apos;un contrat rigide. C&apos;est un programme que
          nous ouvrons à nos proches : vous partagez Bellajour autour de vous, et chaque proche
          que vous amenez vous fait gagner des pages, qui deviennent des albums offerts. Voici les
          repères clairs de cet engagement, pour que chacun joue le jeu et reçoive ce qu&apos;il
          mérite.
        </p>
        <p>
          En cochant la case d&apos;acceptation lors de votre inscription, vous reconnaissez avoir
          lu et accepté l&apos;ensemble de la présente charte.
        </p>

        <h2>1. Qui sommes-nous</h2>
        <p>
          Le programme Cercle Ambassadeur est édité par MISTÉRIO HERMÉTICO, LDA, société à
          responsabilité limitée de droit portugais (Sociedade por Quotas), immatriculée au
          Portugal sous le numéro fiscal (NIF) 519443284, dont le siège est situé Beco de Santa
          Helena, 21A, 2º, 1100-117 Lisboa, Portugal (ci-après «&nbsp;Bellajour&nbsp;»).
        </p>
        <p>Contact : contact@bellajour.com</p>

        <h2>2. Nature de l&apos;engagement</h2>
        <p>
          Le Cercle Ambassadeur est un programme de parrainage gratuit et volontaire. Il ne
          constitue pas un contrat de travail, ne crée aucun lien de subordination, et ne donne
          droit à aucune rémunération en argent. L&apos;ambassadeur agit librement, en son nom
          propre, sans obligation de résultat. Les avantages obtenus le sont exclusivement en
          nature (pages, albums, Instants), dans les conditions ci-dessous.
        </p>

        <h2>3. Comment rejoindre le Cercle</h2>
        <p>Pour devenir et rester ambassadeur, deux conditions sont requises :</p>
        <ol>
          <li>Être abonné au compte Instagram @bellajour pendant toute la durée du programme.</li>
          <li>S&apos;inscrire au Cercle via le formulaire dédié et accepter la présente charte.</li>
        </ol>
        <p>
          Un parrainage n&apos;est validé que lorsque le filleul a versé son acompte de prévente.
          Une simple inscription d&apos;un proche, sans acompte, ne compte pas.
        </p>

        <h2>4. La mécanique des pages</h2>
        <p>Le parrainage agit sur deux niveaux :</p>
        <ul>
          <li>
            Chaque filleul direct qui réserve via votre lien et verse son acompte vous rapporte 5
            pages.
          </li>
          <li>
            Lorsqu&apos;un de vos filleuls parraine à son tour un nouveau proche qui verse son
            acompte, vous gagnez 5 pages supplémentaires.
          </li>
        </ul>
        <p>
          La mécanique s&apos;arrête au niveau 2 : le filleul du filleul de votre filleul ne remonte
          plus jusqu&apos;à vous. Il n&apos;y a aucun plafond au nombre de pages que vous pouvez
          accumuler.
        </p>
        <p>Chaque filleul reçoit par ailleurs 3 pages offertes sur sa première commande.</p>
        <p>Une page correspond à une page d&apos;album. Un album Bellajour démarre à 30 pages.</p>

        <h2>5. Vos récompenses</h2>
        <ul>
          <li>6 parrainages validés : un album de 30 pages (valeur indicative 64 €).</li>
          <li>
            10 parrainages validés : un album jusqu&apos;à 50 pages (valeur indicative jusqu&apos;à
            82 €).
          </li>
          <li>
            20 parrainages validés : plusieurs albums au choix, par exemple deux de 30 pages et un
            de 40 (valeur indicative jusqu&apos;à 211 €).
          </li>
        </ul>
        <p>
          En dessous de 6 parrainages, vous ne débloquez pas d&apos;album offert, mais vos pages
          restent créditées sur votre compte et s&apos;appliquent à vos prochaines commandes.
        </p>
        <p>
          Les valeurs en euros sont indiquées à titre purement informatif, au tarif public, et ne
          représentent pas une somme due ou versable.
        </p>

        <h2>6. Nature des pages et des Instants</h2>
        <p>
          Les pages et les Instants sont des avantages en nature. Ils n&apos;ont aucune valeur
          monétaire et ne constituent pas une monnaie ; ne sont ni convertibles en argent, ni
          remboursables en numéraire ; ne sont ni cessibles ni transférables à un tiers ; et
          s&apos;appliquent uniquement à des commandes d&apos;albums Bellajour, dans les conditions
          du programme.
        </p>

        <h2>7. Calendrier et caducité</h2>
        <p>
          Votre compte est crédité de toutes vos pages le 15 août 2026. Vous disposez ensuite
          d&apos;une fenêtre pour composer et commander votre ou vos albums offerts : du 15 août
          2026 au 31 décembre 2026. Au-delà de cette date, les pages et Instants non utilisés sont
          annulés, sans contrepartie.
        </p>

        <h2>8. Votre lien personnel et la règle d&apos;unicité</h2>
        <p>
          Votre lien de parrainage est personnel et non transférable. Un même filleul ne peut être
          rattaché qu&apos;à un seul ambassadeur : il compte pour le premier lien qu&apos;il a
          utilisé.
        </p>

        <h2>9. Remboursement d&apos;un acompte</h2>
        <p>
          Si un filleul se fait rembourser son acompte, le parrainage correspondant n&apos;est plus
          considéré comme validé : les pages associées sont retirées de votre compte.
        </p>

        <h2>10. Loyauté, anti-fraude et retrait</h2>
        <p>
          Le Cercle repose sur la confiance. Sont notamment interdits : l&apos;auto-parrainage, la
          création de faux comptes ou de fausses inscriptions, et toute manipulation visant à
          générer des pages de manière artificielle.
        </p>
        <p>
          Bellajour se réserve le droit de retirer un membre du Cercle, d&apos;annuler les pages
          obtenues de façon abusive et, le cas échéant, de clôturer le compte concerné, en cas de
          fraude, de manquement à la présente charte ou de comportement nuisible à la marque.
        </p>

        <h2>11. Évolution du programme</h2>
        <p>
          Le Cercle Ambassadeur Vague 1 est un programme à durée et portée limitées. Bellajour peut
          le faire évoluer, suspendre, modifier ou clôturer, et en ajuster les paliers ou les
          conditions, en informant les membres de manière raisonnable. Les avantages déjà acquis à
          la date d&apos;une modification sont préservés.
        </p>

        <h2>12. Données personnelles</h2>
        <p>
          Dans le cadre du Cercle, Bellajour collecte votre prénom et votre adresse email. Ces
          données sont traitées aux seules fins de gestion du programme (création de votre compte
          ambassadeur, suivi de vos parrainages et de vos pages, communication liée au programme).
        </p>
        <ul>
          <li>Responsable du traitement : MISTÉRIO HERMÉTICO, LDA.</li>
          <li>Base légale : votre consentement, recueilli lors de l&apos;inscription.</li>
          <li>
            Durée de conservation : le temps du programme, puis selon les obligations légales
            applicables.
          </li>
          <li>
            Vos droits : accès, rectification, suppression et retrait du consentement, en écrivant à
            contact@bellajour.com.
          </li>
        </ul>

        <h2>13. Acceptation et preuve</h2>
        <p>
          L&apos;acceptation de la présente charte se fait en cochant la case prévue lors de
          l&apos;inscription au Cercle. Cette acceptation vaut signature. Sont enregistrés à cette
          occasion la date et l&apos;heure de l&apos;acceptation ainsi que la version de la charte
          (cercle-2026-vague-1), qui constituent la preuve de votre engagement.
        </p>

        <h2>14. Droit applicable et litiges</h2>
        <p>
          La présente charte est régie par le droit portugais. En cas de différend relatif à son
          interprétation ou à son exécution, les parties s&apos;efforceront de trouver une solution
          amiable. À défaut, le litige relèvera des tribunaux compétents du Portugal, sous réserve
          des dispositions protectrices applicables aux consommateurs.
        </p>

        <hr className="amb-charte-rule" />

        <p className="amb-charte-version">
          Bellajour — Cercle Ambassadeur, Vague 1. Version cercle-2026-vague-1.
        </p>
      </article>

      <Footer />
    </main>
  )
}
