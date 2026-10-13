/* Une section de l'espace qui n'est pas encore construite (phases 3 à 6) ou
   pas encore ouverte (verrou). Composant serveur, aucune interaction.

   ⚠️ Le VERROU reprend mot pour mot la raison de `verrousPour` : une URL
   tapée à la main sur une étape fermée dit la même chose que le menu, jamais
   une erreur (PRD §3.2). */

export function Verrou({ titre, raison }: { titre: string; raison: string }) {
  return (
    <section className="ec-page">
      <p className="ec-surtitre">{titre}</p>
      <h1 className="ec-h1">{raison}.</h1>
    </section>
  )
}

export function AVenir({ titre, texte }: { titre: string; texte: string }) {
  return (
    <section className="ec-page">
      <p className="ec-surtitre">{titre}</p>
      <div className="ec-a-venir">
        <p className="ec-texte">{texte}</p>
      </div>
    </section>
  )
}
