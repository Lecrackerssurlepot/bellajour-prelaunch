/* La page qu'on voit quand l'adresse n'existe pas.
   Jusqu'au 07/09, une faute de frappe dans un lien partagé sur Instagram
   (« /megazine ») tombait sur l'écran gris de Next : police système, fond
   blanc, aucun lien de retour. La première image du site, pour quelqu'un
   qui cherchait justement à le découvrir.

   Elle reprend la mise en page de `numero/not-found.tsx` (le seul 404 qui
   existait) et son ton : on dit ce qui s'est passé, on ne s'excuse pas, et
   on rouvre une porte. */

import Link from 'next/link'
import { CONTACT_EMAIL, CTA_HREF, CTA_MAGAZINE_LABEL } from './(atelier)/content'
import './(atelier)/theme.css'
import './not-found.css'

/**
 * ⚠️ AUCUN MODULE next/font ICI, ET C'EST LE CŒUR DE CE FICHIER (09/09/2026).
 *
 * Cette page importait `cormorantCreme` (Cormorant Garamond 500/600, normal
 * et italique). Or Next range le 404 racine dans l'arbre du layout racine :
 * SA feuille de style part avec TOUTES les pages du site. Mesuré en
 * production, deux `<link rel="preload" as="font">` de 75 Ko partaient donc
 * sur `/`, `/magazine`, `/composer`, `/numero`, à la priorité la plus haute,
 * pour des faces que ces pages ne peignent JAMAIS — leur propre commentaire
 * le disait déjà (creme-fonts.ts, T-064). L'accueil préchargeait 202 Ko de
 * polices, dont 75 pour rien.
 *
 * Et le module n'était même pas le bon : `.nf-mot` demande `font-weight: 400`,
 * un poids que `cormorantCreme` ne contient pas. Le navigateur retombait donc
 * sur la 500. On payait 75 Ko sur tout le site pour dessiner un titre dans
 * une graisse qu'on n'avait pas demandée.
 *
 * Le titre suit maintenant la chaîne de repli que `not-found.css` déclarait
 * DÉJÀ, et qui n'était jamais atteinte : Cormorant Garamond si une autre
 * partie de la page l'a chargée, sinon Georgia. Sur un vrai 404 — une adresse
 * mal tapée, hors de tout groupe de routes — c'est donc Georgia : un serif,
 * sur une page rare, contre 75 Ko rendus à chaque visite de tout le site.
 *
 * ⚠️ Ne PAS « réparer » en réimportant une police ici. Toute déclaration
 * next/font dans ce fichier repart avec le site entier.
 */
export default function Introuvable() {
  return (
    <div className="bj-atelier nf">
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
