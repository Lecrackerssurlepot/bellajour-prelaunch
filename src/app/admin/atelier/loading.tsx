import "../admin.css";
import "./atelier.css";

/**
 * L'écran d'attente de la table de travail.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE
 *
 * Recette du 25/08 : « fluidité de l'admin, un retour pour retourner sur la
 * liste prend du temps ». Ce n'était pas une impression : la liste est un
 * composant serveur en `force-dynamic` — elle interroge `numeros`, les
 * événements, les mails envoyés et les marqueurs de lecture à CHAQUE affichage,
 * volontairement, parce qu'un tableau de bord d'urgences mis en cache afficherait
 * des délais faux.
 *
 * Ce qui était réparable, ce n'est donc pas la durée : c'est le fait que rien
 * ne se passait pendant ce temps-là. Sans `loading.tsx`, Next garde l'écran
 * PRÉCÉDENT figé jusqu'à ce que le serveur ait fini — on clique « retour », il
 * ne se passe rien, on reclique. Avec, la page bascule immédiatement sur cette
 * silhouette et le contenu la remplace en flux.
 *
 * D'où une silhouette qui a la FORME de la vraie liste, et pas un mot
 * « Chargement… » : ce qui doit disparaître, c'est l'impression de clic mort,
 * pas la durée elle-même. Un décalage de mise en page à l'arrivée la
 * recréerait.
 * ══════════════════════════════════════════════════════════════════════════
 */

/* Assez de lignes pour remplir un écran d'ordinateur sans en inventer une
   page entière : au-delà, la silhouette promet une liste plus longue que
   celle qui arrive. */
const LIGNES = 7;

export default function Chargement() {
  return (
    <div className="adm-root ate-root ate-squelette" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement des dossiers…</span>

      <header className="ate-header">
        <div>
          <h1 className="ate-h1">L&apos;Atelier</h1>
          <p className="ate-bonjour">
            <span className="ate-sq ate-sq--texte" />
          </p>
        </div>
      </header>

      <div className="ate-sq ate-sq--flux" />
      <div className="ate-sq ate-sq--barre" />

      <ul className="ate-sq-liste">
        {Array.from({ length: LIGNES }, (_, i) => (
          <li key={i} className="ate-sq ate-sq--ligne" />
        ))}
      </ul>
    </div>
  );
}
