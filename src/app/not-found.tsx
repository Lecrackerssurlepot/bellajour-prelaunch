/* La page qu'on voit quand l'adresse n'existe pas.
   Jusqu'au 07/09, une faute de frappe dans un lien partagé sur Instagram
   (« /megazine ») tombait sur l'écran gris de Next : police système, fond
   blanc, aucun lien de retour. La première image du site, pour quelqu'un
   qui cherchait justement à le découvrir.

   Elle reprend la mise en page de `numero/not-found.tsx` (le seul 404 qui
   existait) et son ton : on dit ce qui s'est passé, on ne s'excuse pas, et
   on rouvre une porte. */

import Link from 'next/link'
import { cormorantCreme } from './creme-fonts'
import { CONTACT_EMAIL, CTA_HREF, CTA_MAGAZINE_LABEL } from './(atelier)/content'
import './(atelier)/theme.css'
import './not-found.css'

export default function Introuvable() {
  return (
    /* ⚠️ La police display N'EST PLUS sur <html> depuis T-064 : cette page
       vit à la racine, elle doit donc la poser elle-même, comme les pages
       crème. Sans ça le titre retombe en silence sur DM Sans. */
    <div className={`bj-atelier nf ${cormorantCreme.variable}`}>
      <div className="nf-in">
        <p className="nf-kicker">Bellajour</p>
        <h1 className="nf-mot">Cette page n’existe pas.</h1>
        <p className="nf-sub">
          Le lien est peut-être incomplet, ou la page a changé d’adresse. Rien
          n’est perdu : tout le magazine tient en deux pages.
        </p>
        <div className="nf-actions">
          <Link className="nf-cta" href={CTA_HREF}>
            {CTA_MAGAZINE_LABEL}
          </Link>
          <Link className="nf-skip" href="/">
            Revenir à l’accueil
          </Link>
        </div>
        <p className="nf-aide">
          Vous cherchiez votre numéro ? Son lien vous a été envoyé par mail. En
          cas de doute, écrivez-nous à <b>{CONTACT_EMAIL}</b>.
        </p>
      </div>
    </div>
  )
}
