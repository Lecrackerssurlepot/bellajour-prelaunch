/* La page qu'on voit quand l'adresse n'existe pas (charte V2, fiche K).
   Signature Interlope, une phrase, un bouton vers l'accueil.
   L'ancienne version (deux boutons, l'aide mail) est dans
   archive/ancienne-charte/not-found.tsx.

   ⚠️ AUCUN MODULE next/font ICI : ce fichier vit dans l'arbre du layout
   racine, une police déclarée ici partirait avec tout le site (09/09/2026).
   Les quatre polices de la charte sont déjà posées sur <html> par
   src/app/polices.ts : la page s'en sert sans rien charger. */

import Link from 'next/link'
import './not-found.css'

export default function Introuvable() {
  return (
    <main className="nf">
      <span className="nf-logo m-logo" role="img" aria-label="Bellajour" />
      <h1 className="nf-mot">Cette page n’existe pas.</h1>
      <p className="nf-sub">Le lien est incomplet ou périmé.</p>
      <Link className="m-btn" href="/">
        Revenir à l’accueil
      </Link>
    </main>
  )
}
