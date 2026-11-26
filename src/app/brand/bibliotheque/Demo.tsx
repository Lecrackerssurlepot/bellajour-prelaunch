'use client'

import { useState } from 'react'
import Espace, { type DossierVue, type LivreVue } from '../../(atelier)/compte/Espace'

/* De faux numéros pour voir la bibliothèque pleine. Titres, dates et pages
   sont fictifs ; les couvertures sont les visuels provisoires du site. */

const C = '/images/v2'

const LIVRES: LivreVue[] = [
  { titre: 'Lisbonne à deux', annee: '2026', livreLe: '12 octobre 2026', couverture: `${C}/accueil/couverture-lisbonne-640.webp`, nbPages: 36 },
  { titre: 'Un été en Sicile', annee: '2026', livreLe: '4 septembre 2026', couverture: `${C}/magazine/couverture-sicile-900.webp`, nbPages: 48 },
  { titre: 'Notre année', annee: '2025', livreLe: '20 décembre 2025', couverture: `${C}/composer/modele-mon-annee-grand-900.webp`, nbPages: 60 },
  { titre: 'Rio, enfin', annee: '2025', livreLe: '2 mai 2025', couverture: `${C}/accueil/couverture-rio-700.webp`, nbPages: 32 },
  { titre: 'La côte en famille', annee: '2025', livreLe: '18 août 2025', couverture: `${C}/accueil/couverture-cote-azur-640.webp`, nbPages: 28 },
  { titre: 'Australie', annee: '2024', livreLe: '9 mars 2024', couverture: `${C}/accueil/couverture-aussie-640.webp`, nbPages: 52 },
  { titre: 'Noosa', annee: '2024', livreLe: '30 janvier 2024', couverture: `${C}/magazine/couverture-noosa-1000.webp`, nbPages: 24 },
  { titre: 'Retour en Sicile', annee: '2023', livreLe: '1 octobre 2023', couverture: `${C}/composer/modele-sicile-900.webp`, nbPages: 40 },
  { titre: 'Les vacances de Léo', annee: '2023', livreLe: '28 juillet 2023', couverture: null, nbPages: 24 },
].map((l, i) => ({ ...l, token: `demo-livre-${i}`, couvertureEstPlanche: false }))

const DOSSIERS: DossierVue[] = [
  { titre: 'Mariage de Camille et Hugo', libelleEtat: 'Maquette prête', camp: 'Un geste vous attend', avancement: 3, cta: 'Voir ma maquette', transporteur: null, depotEnPlan: false, nbPhotos: 84 },
  { titre: 'Japon 2026', libelleEtat: 'Photos reçues', camp: 'Entre nos mains', avancement: 1, cta: 'Suivre mon numéro', transporteur: null, depotEnPlan: false, nbPhotos: 62 },
  { titre: 'Les 40 ans de Marc', libelleEtat: 'Photos reçues', camp: '', avancement: 0, cta: 'Ajouter des photos', transporteur: null, depotEnPlan: true, nbPhotos: 12 },
  { titre: 'Week-end à Rome', libelleEtat: 'Expédiée', camp: 'En route vers vous', avancement: 4, cta: 'Suivre mon colis', transporteur: 'Colissimo', depotEnPlan: false, nbPhotos: 45 },
].map((d, i) => ({ ...d, token: `demo-dossier-${i}` }))

type Cas = 'plein' | 'un' | 'vide'
const CAS: ReadonlyArray<[Cas, string]> = [
  ['plein', 'Bien remplie'],
  ['un', 'Un seul numéro'],
  ['vide', 'Vide'],
]

export default function Demo() {
  const [cas, setCas] = useState<Cas>('plein')
  const livres = cas === 'plein' ? LIVRES : cas === 'un' ? LIVRES.slice(0, 1) : []
  const dossiers = cas === 'plein' ? DOSSIERS : cas === 'un' ? DOSSIERS.slice(1, 2) : []
  const aTerminer = dossiers.filter((d) => d.depotEnPlan || d.camp === 'Un geste vous attend')
  const enCours = dossiers.filter((d) => !aTerminer.includes(d))

  return (
    <>
      <div className="bib-demo-barre" role="group" aria-label="Exemple">
        <span>Exemple fictif</span>
        {CAS.map(([c, libelle]) => (
          <button key={c} type="button" className={`bib-vue${cas === c ? ' est-active' : ''}`} aria-pressed={cas === c} onClick={() => setCas(c)}>
            {libelle}
          </button>
        ))}
      </div>
      <Espace
        key={cas}
        demo
        email="client@exemple.fr"
        photo={null}
        initiale="C"
        aTerminer={aTerminer}
        enCours={enCours}
        livres={livres}
        ongletInitial="bibliotheque"
        credit={null}
      />
    </>
  )
}
