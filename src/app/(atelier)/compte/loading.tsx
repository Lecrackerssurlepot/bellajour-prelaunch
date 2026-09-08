import './compte.css'

/**
 * L'écran d'attente de l'espace.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Mathias, 08/09 : « quand je clique sur un bouton, il y a un temps de
 * chargement avant d'arriver sur l'autre page que je trouve beaucoup trop
 * long, et qui ne dépend pas forcément de la connexion ».
 *
 * MESURÉ en production : `/magazine` répond en 93 à 183 ms, `/compte` en 288
 * à 538 ms — et ces 288 ms sont le plancher, relevé SANS session, quand la
 * page ne fait que vérifier qui appelle avant de rediriger. Connectée, elle
 * enchaîne encore la lecture des dossiers et la signature des couvertures.
 *
 * Cette page est `force-dynamic`, et elle doit le rester : un espace client
 * mis en cache montrerait l'état d'hier. Ce qui était réparable n'est donc
 * pas la durée, c'est le fait que rien ne se passait pendant ce temps-là.
 * Sans `loading.tsx`, Next garde l'écran PRÉCÉDENT figé jusqu'à la fin du
 * travail serveur : on clique, il ne se passe rien, on reclique.
 *
 * D'où une silhouette qui a la FORME de l'espace, et pas un mot
 * « Chargement… ». La barre du haut est rendue POUR DE VRAI — elle ne dépend
 * d'aucune donnée, donc la faire clignoter serait mentir sur ce qu'on attend.
 * ══════════════════════════════════════════════════════════════════════════
 */

/* Deux cartes : de quoi occuper l'écran sans promettre une liste plus longue
   que celle qui arrive. */
const CARTES = 2

export default function Chargement() {
  return (
    <div className="bj-atelier cpt cpt-squelette" aria-busy="true" aria-live="polite">
      <header className="cpt-top">
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
        <nav className="cpt-onglets" aria-hidden="true">
          <span className="cpt-sq cpt-sq--onglet" />
          <span className="cpt-sq cpt-sq--onglet" />
        </nav>
        <span className="cpt-top-vide" />
      </header>

      <main className="cpt-main">
        <span className="cpt-sr-only">Chargement de votre espace…</span>
        <div className="cpt-sq cpt-sq--titre" />
        <div className="cpt-sq cpt-sq--sous" />
        <div className="cpt-grille cpt-sq-liste" style={{ marginTop: '2rem' }}>
          {Array.from({ length: CARTES }, (_, i) => (
            <div key={i} className="cpt-sq cpt-sq--carte" />
          ))}
        </div>
      </main>
    </div>
  )
}
