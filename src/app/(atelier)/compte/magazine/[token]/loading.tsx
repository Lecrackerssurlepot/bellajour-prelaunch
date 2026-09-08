import '@/app/numero/numero.css'
import '../../compte.css'

/**
 * L'écran d'attente d'un numéro de la bibliothèque.
 *
 * Cette page-ci est la plus lente de l'espace, et pour une raison précise :
 * elle vérifie la session (Supabase Auth), relit TOUS les dossiers du compte
 * pour n'en garder qu'un, puis signe chaque visuel du numéro. Elle ne peut
 * pas être mise en cache — les URL signées expirent.
 *
 * La silhouette a donc la forme de ce qui arrive : le titre, la scène de la
 * visionneuse (à hauteur fixe, comme la vraie — sinon l'arrivée décale la
 * page), la fiche, puis le bloc du PDF. Voir le mot de `compte/loading.tsx`
 * pour la mesure et le raisonnement.
 */

export default function Chargement() {
  return (
    <div className="bj-atelier cpt cpt--mag cpt-squelette" aria-busy="true" aria-live="polite">
      <header className="cpt-top">
        <a className="cpt-retour" href="/compte?onglet=bibliotheque">
          <span aria-hidden="true">←</span> Ma bibliothèque
        </a>
        <span className="cpt-top-marque">
          <img
            className="cpt-top-logo"
            src="/images/ui/signature-blanche.webp"
            alt=""
            width={320}
            height={122}
            decoding="async"
          />
        </span>
        <span className="cpt-top-vide" />
      </header>

      <main className="cpt-mag">
        <span className="cpt-sr-only">Chargement de votre numéro…</span>
        <div className="cpt-sq cpt-sq--titre" />
        <div className="cpt-sq cpt-sq--sous" />
        <div className="cpt-sq cpt-sq--scene" />
        <div className="cpt-sq cpt-sq--bloc" />
      </main>
    </div>
  )
}
