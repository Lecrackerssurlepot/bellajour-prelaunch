/* ════════════════════════════════════════════════════════════
   L'ACCUEIL, charte V2 : port fidèle du banc validé (duplicata 14BmVZ v4).
   Ouverture du livre avec l'écran d'essai « Avant d'ouvrir », la pile qui
   devient une année, la matière, les trois portes, les questions.

   Balisage rendu ICI (serveur) ; AccueilMotion pose le mouvement une fois
   monté. Les classes viennent du banc, toutes scopées sous `.m-banc`
   (accueil.css) : le retirer dépeindrait tout.

   Images : TOUTES via la librairie (src/content/media.ts). Chiffres : TOUS
   depuis le code (grille, livraison, carte cadeau), jamais recopiés du banc.
   - format 21 × 29,7 cm : CGV, fiche produit (« Portrait A4 — 210 × 297 mm ») ;
   - « environ 10 jours » : mentions légales, « délai estimé à 10 jours » ;
   - « sous 48 h » : la promesse déjà tenue sur /numero.
   ════════════════════════════════════════════════════════════ */

import type { CSSProperties, ReactNode } from 'react'
import { FondsTelephone, ImageSite, lireVisuel, visuelsDuJour } from '@/components/Visuel'
import VideoNative from '@/components/VideoNative'
import { BANDES_PHOTOS, EUROS_MIN, PAGES_MIN, PAGES_MAX_PUBLIC, RELIURE_LIBELLE } from '@/lib/atelier/grille'
import { ZONES_PORT, FRANCO_CENTIMES } from '@/lib/atelier/livraison'
import { LIBRE_MIN_CENTIMES, LIBRE_MAX_CENTIMES, VALIDITE_MOIS } from '@/lib/atelier/carteCadeau'
import AccueilMotion, { type PhotoExemple } from './AccueilMotion'
import './accueil.css'

const NOMS = [
  'accueil.couverture', 'accueil.couverture-2', 'accueil.couverture-3', 'accueil.couverture-4', 'accueil.couverture-5',
  'accueil.double-page-1', 'accueil.double-page-2', 'accueil.photo-exemple', 'accueil.hero',
  'accueil.porte-offrir', 'accueil.porte-groupes',
] as const

const RELIURE = RELIURE_LIBELLE.dos_carre.charAt(0).toUpperCase() + RELIURE_LIBELLE.dos_carre.slice(1)
const PORT_MIN = Math.min(ZONES_PORT.A.centimes, ZONES_PORT.B.centimes) / 100
const FRANCO = FRANCO_CENTIMES / 100
const CARTE_MIN = LIBRE_MIN_CENTIMES / 100
const CARTE_MAX = LIBRE_MAX_CENTIMES / 100
const VALIDITE = VALIDITE_MOIS
const PHOTOS_MIN = BANDES_PHOTOS[0].photosMin
const PHOTOS_MAX = BANDES_PHOTOS[BANDES_PHOTOS.length - 1].photosMax

export default async function Accueil({ apresOuverture }: { apresOuverture?: ReactNode }) {
  const VV = await visuelsDuJour(NOMS)
  const V = Object.fromEntries(NOMS.map((n) => [n, VV[n]?.fichier ?? ''])) as Record<(typeof NOMS)[number], string>
  const matiere = await lireVisuel('accueil.matiere')
  /* Les photos d'exemple, dans l'ordre du banc (DEF) : remplacées par celles du client s'il en met. */
  const PH: PhotoExemple[] = [
    { s: V['accueil.double-page-1'], p: '22% 50%' },
    { s: V['accueil.double-page-2'], p: '0% 40%' },
    { s: V['accueil.photo-exemple'], p: '12% 60%' },
    { s: V['accueil.double-page-1'], p: '85% 50%' },
    { s: V['accueil.hero'], p: '40% 60%' },
    { s: V['accueil.double-page-2'], p: '22% 70%' },
  ]
  const photo = (n: number) => PH[n % PH.length].s
  const fonds = {
    '--mb-dp1': `url(${V['accueil.double-page-1']})`,
    '--mb-dp2': `url(${V['accueil.double-page-2']})`,
    '--mb-table': `url(${V['accueil.hero']})`,
  } as CSSProperties

  return (
    <main className="m-banc" data-u="votre" data-e2="rien" style={fonds}>
      <FondsTelephone
        selecteur=".m-banc"
        fonds={{ '--mb-dp1': VV['accueil.double-page-1'], '--mb-dp2': VV['accueil.double-page-2'], '--mb-table': VV['accueil.hero'] }}
      />
      {/* 01 OUVERTURE : le magazine qu'on voit est celui qui s'ouvre */}
      <section className="ouv" id="ouv" aria-label="Ouverture">
        <svg className="traits" data-n="6" data-seed="3" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div className="texte">
          <h1 className="titre seul sign"><span className="s1">Vivez.</span><span className="s2"><em>Nous composons.</em></span></h1>
          <p className="acc sub">Vos photos deviennent un vrai magazine, composé par l’atelier, imprimé et livré chez vous.</p>
          <div className="ctas"><a className="btn" href="/magazine">Découvrir les magazines</a><a className="lien" href="/offrir">Offrir un numéro</a></div>
        </div>
        <div className="t-feuille" id="t-feuille" hidden><form className="t-boite" id="t-form"><label className="lab sub" htmlFor="t-champ">Le titre de votre numéro</label><input id="t-champ" maxLength={24} autoComplete="off" autoCapitalize="sentences" enterKeyHint="done" placeholder="Un été en Grèce" /><div className="t-actions"><button className="quitter" type="button" id="t-annuler">Annuler</button><button className="btn" type="submit">Valider</button></div></form></div>
        <div className="suiveur" id="suiveur" aria-hidden="true"><b>+</b><span className="s-a">Essayez avec vos photos</span><span className="s-b">Changer mes photos</span></div>
        <input id="f-photos" type="file" accept="image/*" multiple hidden />
        <div className="e2" id="e2">
          <div className="e2-haut"><span className="lab sub e2-lab">Avant d’ouvrir</span><h2 className="titre e2-h">Essayez avec vos photos.</h2></div>
          <div className="e2-bas">
            <div className="e2-btns"><label className="e2-btn e2-photos" htmlFor="f-photos"><span className="eventail-mini" aria-hidden="true"><i></i><i></i><i></i></span><span className="e2-pt">Choisir mes photos</span></label><button className="e2-btn e2-titre" type="button"><b aria-hidden="true">Aa</b><span>Écrire mon titre</span></button></div>
            <p className="sub e2-s">Jusqu’à 5 photos, pour vivre l’expérience Bellajour.</p>
          </div>
        </div>
        <div className="scene-livre">
          <div className="livre">
            <div className="base" role="img" aria-label="Double page d’un numéro"><div className="face"><div className="page-perso plein perso"><img data-ph="5" src={photo(5)} style={{'objectPosition': '22% 70%'}} alt="" /></div></div></div>
            <div className="feuille f2"><div className="face recto"><div className="page-perso titre-photo perso"><div className="p-titre">Un été en Grèce</div><img data-ph="2" src={photo(2)} style={{'objectPosition': '12% 60%'}} alt="" /><span className="p-leg">Page 3 · composée par l’atelier</span></div></div><div className="face verso"><div className="page-perso deux perso"><img data-ph="3" src={photo(3)} style={{'objectPosition': '85% 50%'}} alt="" /><img data-ph="4" src={photo(4)} style={{'objectPosition': '40% 60%'}} alt="" /></div></div></div>
            <div className="feuille f1"><div className="face recto">
              <ImageSite v={VV['accueil.couverture']} nom="accueil.couverture" className="on" fetchPriority="high" decoding="auto" alt="Couverture d’un numéro sur l’Australie" />
              <div className="couv-perso perso">
                <label className="photo" htmlFor="f-photos" aria-label="Mettre vos photos sur la couverture"><img data-ph="0" src={photo(0)} style={{'objectPosition': '22% 50%'}} alt="Votre photo de couverture" /></label>
                <div className="couv-zone"><span className="couv-titre" id="couv-titre" contentEditable={true} suppressContentEditableWarning spellCheck="false" role="textbox" aria-label="Le titre de votre numéro">Un été en Grèce</span><span className="construit" aria-hidden="true"><i className="c1"></i><i className="c2"></i><i className="c3"></i><i className="v"></i><b>Corps 120 · approche −20</b></span></div>

                <div className="couv-pied"><span>Bellajour</span><span>N°01</span></div>
              </div>
            </div><div className="face verso"><div className="page-perso plein perso"><img data-ph="1" src={photo(1)} style={{'objectPosition': '0% 40%'}} alt="" /></div></div></div>
            <i className="repere a"></i><i className="repere b"></i><i className="repere c"></i><i className="repere d"></i>
            <div className="note nA" style={{'left': '57%', 'top': '14%'}}><i className="pt"></i><i className="tr"></i><span>Votre titre, en grand</span></div>
            <div className="note nA inv" style={{'right': '57%', 'top': '36%'}}><i className="pt"></i><i className="tr"></i><span>Vos photos, posées par l’atelier</span></div>
            <div className="note nB" style={{'left': '58%', 'top': '22%'}}><i className="pt"></i><i className="tr"></i><span>{`${PAGES_MIN} à ${PAGES_MAX_PUBLIC} pages`}</span></div>
            <div className="note nB inv" style={{'right': '58%', 'top': '68%'}}><i className="pt"></i><i className="tr"></i><span>Mat ou brillant</span></div>
          </div>
        </div>
        <div className="legende" aria-hidden="true"><span className="titre seul l1" data-numero="Ouvrez-le." data-votre="Vous déposez vos photos.">Ouvrez-le.</span><span className="titre seul l2" data-numero="Page après page." data-votre="Nous composons, page après page.">Page après page.</span></div>
      </section>
      {apresOuverture}

      {/* 02 VOTRE VIE : la pile devient une année */}
      <section className="vie" id="vie" aria-label="La meilleure des collections, votre vie">
        <svg className="traits" data-n="5" data-seed="11" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
        <span className="titre seul mot m1">La meilleure</span>
        <span className="titre seul mot m2">des collections,</span>
        <span className="titre seul mot m3">votre vie.</span>
        <div className="vie-tete"><span className="lab sub">Une année entre les mains</span><h2 className="titre">Chaque moment a le sien.</h2></div>
        <div className="rail"><div className="piste">
          <figure className="moment"><ImageSite v={VV['accueil.couverture']} nom="accueil.couverture" className="cv" loading="lazy" alt="Numéro Australie" /><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Février</span><span className="titre seul nom">Australie</span><span className="quoi sub">Le grand voyage</span></figcaption></figure>
          <figure className="moment"><ImageSite v={VV['accueil.couverture-2']} nom="accueil.couverture-2" className="cv" loading="lazy" alt="Numéro Sicile" /><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Mai</span><span className="titre seul nom">Sicile</span><span className="quoi sub">Le pont de mai</span></figcaption></figure>
          <figure className="moment"><ImageSite v={VV['accueil.couverture-3']} nom="accueil.couverture-3" className="cv" loading="lazy" alt="Numéro Côte d’Azur" /><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Juillet</span><span className="titre seul nom">Côte d’Azur</span><span className="quoi sub">L’été en famille</span></figcaption></figure>
          <figure className="moment"><ImageSite v={VV['accueil.couverture-4']} nom="accueil.couverture-4" className="cv" loading="lazy" alt="Numéro Rio" /><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Octobre</span><span className="titre seul nom">Rio</span><span className="quoi sub">Une ville, un ami</span></figcaption></figure>
          <figure className="moment"><ImageSite v={VV['accueil.couverture-5']} nom="accueil.couverture-5" className="cv" loading="lazy" alt="Numéro Mon année" /><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Décembre</span><span className="titre seul nom">Mon année</span><span className="quoi sub">Tout, en un numéro</span></figcaption></figure>
          <figure className="moment m-perso"><div className="cv mini"><img loading="lazy" decoding="async" data-ph="0" src={photo(0)} style={{'objectPosition': '22% 50%'}} alt="Votre numéro" /><span className="mini-titre">Un été en Grèce</span></div><figcaption><i className="trait"></i><i className="pt"></i><span className="lab date">Aujourd’hui</span><span className="titre seul nom">Votre numéro</span><span className="quoi sub">En haut de la pile</span></figcaption></figure>
        </div></div>
      </section>



      {/* 05 MATIÈRE */}
      <section className="bloc matiere" id="matiere" aria-label="La matière">{/* patch12 */}
        <div className="cadre mat-grille">
          <div className="mat-tete"><span className="lab sub">La matière</span><h2 className="titre">Un vrai magazine, entre les mains.</h2><p className="chapo sub">Mat ou brillant, au choix. De {PAGES_MIN} à {PAGES_MAX_PUBLIC} pages.</p></div>
          <figure className="mat-video">{matiere && matiere.video ? <VideoNative poster={matiere.fichier} mp4={matiere.video.mp4} webm={matiere.video.webm} label={matiere.alt} /> : null}</figure>
          <ul className="mat-infos"><li><span className="lab sub">Format</span><b>21 × 29,7 cm</b></li><li><span className="lab sub">Reliure</span><b>{RELIURE}</b></li></ul>
        </div>
      </section>

      {/* 06 CONCLUSION : sa couverture revient et s'ouvre, puis trois portes au même endroit */}
      <section className="bloc fin" id="prix" aria-label="Commencer votre numéro">
        <div className="cadre">
          <div className="fin-haut">
            <div className="fin-texte">
              <span className="lab sub">Et maintenant</span>
              <h2 className="titre">Le premier numéro commence ici.</h2>
              <p className="promesses sub">L’atelier compose · couverture offerte sous 48 h · vous décidez après</p>
            </div>
          </div>
          <div className="portes">
            <div className="porte p-vous">
              <span className="lab">Pour vous</span>
              <span className="titre p-t">Votre numéro</span>
              <span className="p-s">{`Dès ${EUROS_MIN} € TTC`}</span>
              <a className="btn" href="/composer">Composer avec l’atelier</a>
            </div>
            <a className="porte p-lien" id="offrir" href="/offrir">
              <ImageSite v={VV['accueil.porte-offrir']} nom="accueil.porte-offrir" alt="" loading="lazy" />
              <span className="p-txt"><span className="lab sub">Pour offrir</span><span className="titre p-t">Le plus beau cadeau</span><span className="p-s sub">Un numéro ou une carte cadeau</span></span>
              <span className="fl" aria-hidden="true">→</span>
            </a>
            <a className="porte p-lien" id="groupes" href="/partenaires">
              <ImageSite v={VV['accueil.porte-groupes']} nom="accueil.porte-groupes" alt="" loading="lazy" />
              <span className="p-txt"><span className="lab sub">Pour un groupe</span><span className="titre p-t">Tous ensemble</span><span className="p-s sub">École, équipe, association</span></span>
              <span className="fl" aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* 09 QUESTIONS */}
      <section className="bloc faq" id="faq" aria-label="Questions">
        <div className="cadre" style={{'maxWidth': '860px'}}>
          <span className="lab sub">Questions</span>
          <h2 className="titre">Avant de commencer.</h2>
          <details><summary>Combien ça coûte ?</summary><p className="sub">Dès {EUROS_MIN} € TTC pour {PAGES_MIN} pages, jusqu’à {PAGES_MAX_PUBLIC} pages. Le prix suit le nombre de pages. Vous le connaissez avant de payer.</p></details>
          <details><summary>Combien de photos faut-il ?</summary><p className="sub">De {PHOTOS_MIN} à {PHOTOS_MAX}. Celles du téléphone suffisent, en qualité d’origine.</p></details>
          <details><summary>Et si la couverture ne me plaît pas ?</summary><p className="sub">Vous ne payez rien. Ou on l’ajuste, sans frais.</p></details>
          <details><summary>Je le reçois quand ?</summary><p className="sub">La couverture sous 48 h. Le magazine environ 10 jours après validation, avec le suivi du colis.</p></details>
          <details><summary>Et la livraison ?</summary><p className="sub">Dès {PORT_MIN} € selon le pays. Offerte dès {FRANCO} € de magazines. <a href="/livraison">Tous les pays</a></p></details>
          <details><summary>Je peux l’offrir ?</summary><p className="sub">Oui, avec une carte cadeau de {CARTE_MIN} à {CARTE_MAX} €, valable {VALIDITE} mois. <a href="/offrir">Offrir</a></p></details>
          </div>
      </section>


      {/* ===================== PAGE PRODUIT ===================== */}
      <AccueilMotion photos={PH} />
    </main>
  )
}
