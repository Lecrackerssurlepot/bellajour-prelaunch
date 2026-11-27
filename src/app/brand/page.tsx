import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CSSProperties, ReactNode } from 'react'
import { jetons, versionCharte, requeteTelephone } from '../../../brand/build/tokens'
import Magazine from './Magazine'
import Motion from './Motion'

/* La page ne recopie AUCUNE valeur : tout vient de brand/build/tokens.ts, généré
   depuis brand/tokens.json. Changer un jeton, relancer le build, recharger. */

type Jeton = { valeur: unknown; css: string; variable: string; telephone?: string }

function estJeton(x: unknown): x is Jeton {
  return typeof x === 'object' && x !== null && 'variable' in x && 'css' in x
}

function aplatir(n: unknown, prefixe = ''): Array<[string, Jeton]> {
  if (estJeton(n)) return [[prefixe, n]]
  if (typeof n !== 'object' || n === null) return []
  return Object.entries(n).flatMap(([k, v]) => aplatir(v, prefixe ? `${prefixe}.${k}` : k))
}

const v = (j: Jeton) => `var(${j.variable})`

/* Contraste WCAG, le même calcul que brand/scripts/contrastes.mjs. */
function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function rapport(a: string, b: string): number {
  const [h, l] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (h + 0.05) / (l + 0.05)
}
const hex = (j: Jeton) => String(j.valeur)

function Section({ id, lettre, titre, children }: { id: string; lettre: string; titre: string; children: ReactNode }) {
  return (
    <section className="ch-section" id={id} aria-labelledby={`${id}-t`}>
      <p className="ch-etiquette">{lettre}</p>
      <h2 className="ch-h2" id={`${id}-t`}>{titre}</h2>
      {children}
    </section>
  )
}

function Nom({ chemin, j }: { chemin: string; j: Jeton }) {
  return (
    <span className="ch-nom">
      <code>{chemin}</code>
      <span>{j.css}{j.telephone ? ` · téléphone ${j.telephone}` : ''}</span>
    </span>
  )
}


/* Les textes de la charte (ton, vocabulaire, photo) sont lus dans les fiches .md au build :
   la page ne peut pas dire autre chose que la charte écrite. */
function fiche(nom: string): string {
  return readFileSync(join(process.cwd(), 'brand', 'charte', nom), 'utf8')
}
function partie(texte: string, titre: string): string {
  const i = texte.indexOf(`## ${titre}`)
  if (i < 0) return ''
  const reste = texte.slice(i + 3)
  const j = reste.search(/\n##? /)
  return j < 0 ? reste : reste.slice(0, j)
}
const nettoyer = (c: string) => c.trim().replace(/\*\*/g, '').replace(/`/g, '')
function tableau(bloc: string): { tete: string[]; lignes: string[][] } {
  const rangs = bloc.split('\n').filter((l) => l.trim().startsWith('|'))
  const cellules = (l: string) => l.trim().slice(1, -1).split('|').map(nettoyer)
  return { tete: rangs[0] ? cellules(rangs[0]) : [], lignes: rangs.slice(2).map(cellules) }
}
function puces(bloc: string): string[] {
  return bloc.split('\n').filter((l) => l.startsWith('- ')).map((l) => nettoyer(l.slice(2)))
}

function Tableau({ t }: { t: { tete: string[]; lignes: string[][] } }) {
  return (
    <div className="ch-tableau-cadre">
      <table className="ch-tableau">
        <thead><tr>{t.tete.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{t.lignes.map((l) => <tr key={l[0]}>{l.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const { couleur, police, taille, espace, rayon, ombre, duree, courbe, variation } = jetons

const SECTIONS = [
  ['ton', 'Ton'],
  ['couleurs', 'Couleurs'],
  ['typo', 'Typographie'],
  ['espaces', 'Espacements'],
  ['formes', 'Formes'],
  ['composants', 'Composants'],
  ['motion', 'Motion'],
  ['magazine', 'Magazine'],
  ['visuels', 'Photo et visuels'],
  ['variations', 'Variations'],
  ['logo', 'Logo'],
  ['declinaisons', 'Hors site'],
] as const

const FAVICONS = [
  { v: 'b', nom: 'Le b seul · défaut du site (blanc sur un onglet sombre)', alt: 'Favicon, le b seul' },
  { v: 'blanc', nom: 'Carré blanc, b noir · écran d’accueil (iPhone, Android)', alt: 'Favicon carré blanc, b noir' },
  { v: 'noir', nom: 'Carré noir, b blanc', alt: 'Favicon carré noir, b blanc' },
] as const

export default function PageCharte() {
  const fond = hex(couleur.papier.fond)
  const fondNuit = hex(couleur.nuit.fond)
  const etats = (['succes', 'erreur', 'alerte', 'info'] as const).map((e) => [e, couleur.etat[e]] as const)
  const tailles = aplatir(taille).filter(([k]) => !k.startsWith('exception.'))
  const exceptions = aplatir(taille).filter(([k]) => k.startsWith('exception.'))
  const espaces = aplatir(espace).filter(([k]) => /^\d+$/.test(k))
  const A = fiche('A-fondations.md')
  const G = fiche('G-iconographie.md')
  const parPublic = tableau(partie(A, 'Ton par public'))
  const parCanal = tableau(partie(A, 'Ton par canal'))
  const vocabulaire = tableau(partie(A, 'Vocabulaire'))
  const reglesPhoto = puces(partie(G, 'Règles photo'))
  const emplacements = tableau(partie(G, '# Les emplacements'))
  const libelleEtat: Record<string, string> = { succes: 'Succès', erreur: 'Erreur', alerte: 'Alerte', info: 'Info' }

  return (
    <main className="ch-page">
      <header className="ch-tete">
        <div className="ch-logo" role="img" aria-label="Bellajour" />
        <p className="ch-etiquette">Charte {versionCharte} · source brand/tokens.json</p>
        <h1 className="ch-h1">La charte, en vrai.</h1>
        <p className="ch-chapo">
          Chaque valeur de cette page est lue dans les jetons. Ce qui est marqué « proposé » attend votre œil.
        </p>
        <nav className="ch-sommaire" aria-label="Sommaire">
          {SECTIONS.map(([id, t]) => (
            <a key={id} href={`#${id}`}>{t}</a>
          ))}
        </nav>
      </header>


      <Section id="ton" lettre="A" titre="Ton et vocabulaire">
        <p className="ch-signature">Vivez. Nous composons.</p>
        <h3 className="ch-h3">Par public <span className="ch-propose">proposé</span></h3>
        <Tableau t={parPublic} />
        <h3 className="ch-h3">Par canal</h3>
        <Tableau t={parCanal} />
        <h3 className="ch-h3">Vocabulaire</h3>
        <Tableau t={vocabulaire} />
        <p className="ch-note">Lu dans brand/charte/A-fondations.md.</p>
      </Section>

      <Section id="couleurs" lettre="C" titre="Couleurs">
        <h3 className="ch-h3">Papier</h3>
        <div className="ch-grille ch-grille--nuancier">
          {aplatir(couleur.papier).map(([k, j]) => (
            <figure key={k} className="ch-nuance">
              <span className="ch-pastille" style={{ background: v(j) }} />
              <Nom chemin={`papier.${k}`} j={j} />
              {k.startsWith('texte') || k === 'champ-bord' ? (
                <span className="ch-contraste">{rapport(hex(j), fond).toFixed(2)}:1 sur le fond</span>
              ) : null}
            </figure>
          ))}
        </div>

        <h3 className="ch-h3">Nuit, le bloc ponctuel</h3>
        <div className="ch-bloc-nuit">
          <div className="ch-grille ch-grille--nuancier">
            {aplatir(couleur.nuit).map(([k, j]) => (
              <figure key={k} className="ch-nuance">
                <span className="ch-pastille" style={{ background: v(j) }} />
                <Nom chemin={`nuit.${k}`} j={j} />
                {k.startsWith('texte') || k === 'champ-bord' ? (
                  <span className="ch-contraste">{rapport(hex(j), fondNuit).toFixed(2)}:1 sur le fond</span>
                ) : null}
              </figure>
            ))}
          </div>
        </div>

        <h3 className="ch-h3">États <span className="ch-propose">proposé</span></h3>
        <div className="ch-grille ch-grille--etats">
          {etats.map(([e, j]) => (
            <div key={e} className="ch-etat" style={{ '--etat': v(j) } as CSSProperties}>
              <span className="ch-etat-point" />
              <strong>{libelleEtat[e]}</strong>
              <Nom chemin={`etat.${e}`} j={j} />
              <span className="ch-contraste">{rapport(hex(j), fond).toFixed(2)}:1</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="typo" lettre="D" titre="Typographie">
        <div className="ch-roles">
          <div className="ch-role">
            <p className="ch-etiquette">Titre · {police.titre.famille.css}</p>
            <p className="ch-ex-titre">Chaque moment mérite son numéro</p>
          </div>
          <div className="ch-role">
            <p className="ch-etiquette">Signature · {police.signature.famille.css} · {police.signature['taille-mini'].css} au moins</p>
            <p className="ch-ex-signature">Vivez. Nous composons.</p>
          </div>
          <div className="ch-role">
            <p className="ch-etiquette">Texte · {police.texte.famille.css}</p>
            <p className="ch-ex-texte">
              Vous envoyez vos photos, l’atelier compose un vrai magazine imprimé. Un numéro par moment, un aperçu avant de payer.
            </p>
          </div>
          <div className="ch-role">
            <p className="ch-etiquette">Étiquette · même famille, capitales espacées</p>
            <p className="ch-etiquette ch-etiquette--grande">Numéro 01 · Été 2026</p>
          </div>
          <div className="ch-role">
            <p className="ch-etiquette">Titre imprimé · {police.magazine.famille.css} · sur le magazine seulement</p>
            <p className="ch-ex-magazine">Lisbonne</p>
          </div>
        </div>

        <h3 className="ch-h3">L’échelle</h3>
        <div className="ch-echelle">
          {tailles.map(([k, j]) => (
            <div key={k} className="ch-palier">
              <Nom chemin={`taille.${k}`} j={j} />
              <span
                className={['h1', 'h2', 'h3', 'display'].includes(k) ? 'ch-palier-titre' : 'ch-palier-texte'}
                style={{ fontSize: v(j) }}
              >
                Bellajour
              </span>
            </div>
          ))}
        </div>

        <h3 className="ch-h3">Les exceptions nommées</h3>
        <ul className="ch-liste">
          {exceptions.map(([k, j]) => (
            <li key={k}><Nom chemin={`taille.${k}`} j={j} /></li>
          ))}
        </ul>
      </Section>

      <Section id="espaces" lettre="E" titre="Espacements et ruptures">
        <div className="ch-espaces">
          {espaces.map(([k, j]) => (
            <div key={k} className="ch-espace">
              <span className="ch-espace-barre" style={{ width: v(j) }} />
              <Nom chemin={`espace.${k}`} j={j} />
            </div>
          ))}
        </div>
        <ul className="ch-liste">
          <li><Nom chemin="espace.marge" j={espace.marge} /></li>
          <li><Nom chemin="espace.section" j={espace.section} /></li>
          <li><Nom chemin="rupture.telephone" j={jetons.rupture.telephone} /></li>
          <li><Nom chemin="rupture.large" j={jetons.rupture.large} /></li>
          <li><span className="ch-nom"><code>requeteTelephone</code><span>{requeteTelephone}</span></span></li>
        </ul>
      </Section>

      <Section id="formes" lettre="F" titre="Rayons, traits, ombres">
        <div className="ch-grille ch-grille--formes">
          {aplatir(rayon).map(([k, j]) => (
            <figure key={k} className="ch-forme">
              <span className="ch-forme-boite" style={{ borderRadius: v(j) }} />
              <Nom chemin={`rayon.${k}`} j={j} />
            </figure>
          ))}
        </div>
        <p className="ch-note">L’ombre est réservée aux objets imprimés. L’interface n’en porte pas.</p>
        <div className="ch-grille ch-grille--formes">
          {aplatir(ombre).map(([k, j]) => (
            <figure key={k} className="ch-forme">
              <span className="ch-objet" style={{ boxShadow: v(j) }} />
              <Nom chemin={`ombre.${k}`} j={j} />
            </figure>
          ))}
        </div>
      </Section>

      <Section id="composants" lettre="H" titre="Composants">
        <h3 className="ch-h3">Boutons</h3>
        <div className="ch-tableau">
          {(
            [
              ['Repos', ''],
              ['Survol', 'est-survol'],
              ['Focus clavier', 'est-focus'],
              ['Désactivé', 'est-desactive'],
              ['Chargement', 'est-charge'],
            ] as const
          ).map(([nom, cls]) => (
            <div key={nom} className="ch-ligne">
              <span className="ch-etiquette">
                {nom}
                {nom !== 'Repos' && nom !== 'Focus clavier' ? <span className="ch-propose">proposé</span> : null}
              </span>
              <button type="button" className={`m-btn ${cls}`} disabled={cls === 'est-desactive'} aria-busy={cls === 'est-charge' || undefined}>
                {cls === 'est-charge' ? <span className="m-points" aria-label="Chargement"><i /><i /><i /></span> : 'Composer mon numéro'}
              </button>
              <button type="button" className={`m-second ${cls}`} disabled={cls === 'est-desactive'}>
                Voir un numéro
              </button>
              <button type="button" className={`m-texte ${cls}`} disabled={cls === 'est-desactive'}>
                Offrir <span aria-hidden="true">→</span>
              </button>
            </div>
          ))}
        </div>
        <p className="ch-note">Survolez et tabulez sur les boutons du haut pour voir le vrai comportement.</p>

        <h3 className="ch-h3">Champs</h3>
        <div className="ch-grille ch-grille--champs">
          <label className="m-champ">
            <span>Prénom</span>
            <input placeholder="Camille" />
          </label>
          <label className="m-champ est-focus">
            <span>Focus</span>
            <input defaultValue="Lisbonne, été 2026" />
          </label>
          <label className="m-champ est-erreur">
            <span>Email <span className="ch-propose">proposé</span></span>
            <input defaultValue="camille@" aria-invalid="true" aria-describedby="err-mail" />
            <small id="err-mail">Adresse incomplète</small>
          </label>
          <label className="m-champ est-desactive">
            <span>Désactivé <span className="ch-propose">proposé</span></span>
            <input disabled defaultValue="Indisponible" />
          </label>
        </div>

        <h3 className="ch-h3">Pastilles, cartes, notification</h3>
        <div className="ch-grille ch-grille--divers">
          <div className="ch-pile">
            <span className="m-pastille">Nouveau</span>
            {etats.slice(0, 3).map(([e, j]) => (
              <span key={e} className="m-pastille" style={{ '--etat': v(j) } as CSSProperties}>
                <i className="m-pastille-point" />{libelleEtat[e]}
              </span>
            ))}
          </div>
          <div className="m-carte">
            <p className="ch-etiquette">Carte</p>
            <p>Bord fin, sans ombre.</p>
          </div>
          <figure className="m-carte-cadeau-cadre">
            <div className="m-carte-cadeau">
              <span className="m-carte-cadeau-visuel" aria-hidden="true" />
              <span className="ch-logo m-carte-cadeau-logo" role="img" aria-label="Bellajour" />
              <p className="m-carte-cadeau-titre">Vos photos deviennent un magazine.</p>
              <p className="m-carte-cadeau-bas"><span className="m-carte-cadeau-montant">50 €</span><span className="ch-etiquette">Code · validité</span></p>
            </div>
            <figcaption className="ch-note">Carte cadeau : visuel = emplacement <code>offrir.carte</code>, daté. Montant d’exemple.</figcaption>
          </figure>
          <div className="m-attente">Photo en attente</div>
          <div className="m-notification" role="status">Photo ajoutée <span className="ch-propose ch-propose--nuit">proposé</span></div>
        </div>

        <h3 className="ch-h3">Bandeau</h3>
        <p className="ch-note">Texte fixe ; seule la phrase du milieu change. « Voir l’offre » toujours là.</p>
        <div className="ch-alternance">
          <div className="m-bandeau ch-bandeau-noel">
            <span className="ch-bandeau-mot">Noël</span><i aria-hidden="true" />
            <span>Le 2<sup>e</sup> magazine à −40&nbsp;%</span><i aria-hidden="true" />
            <span>Photos avant le 7 décembre</span>
            <span className="ch-bandeau-lien">Voir l’offre</span>
          </div>
          <div className="ch-alternance-barre"><span className="ch-logo" role="img" aria-label="Bellajour" /><span className="ch-note">Le magazine · Offrir · Pour les groupes</span></div>
        </div>

        <h3 className="ch-h3">Alternance noir et blanc</h3>
        <p className="ch-note">Quand c’est blanc dessous, c’est noir au-dessus, et inversement (fiche C).</p>
        <div className="ch-alternance-grille">
          <figure className="ch-alt ch-alt-oui"><div className="ch-alt-haut ch-alt-nuit" /><div className="ch-alt-bas ch-alt-papier" /><figcaption>✅ Bandeau noir sur barre blanche</figcaption></figure>
          <figure className="ch-alt ch-alt-oui"><div className="ch-alt-bloc ch-alt-nuit"><span className="ch-alt-btn ch-alt-papier">Bouton</span></div><figcaption>✅ Bouton blanc dans un bloc noir</figcaption></figure>
          <figure className="ch-alt ch-alt-non"><div className="ch-alt-haut ch-alt-papier ch-alt-filet" /><div className="ch-alt-bas ch-alt-papier" /><figcaption>❌ Blanc sur blanc</figcaption></figure>
          <figure className="ch-alt ch-alt-non"><div className="ch-alt-bloc ch-alt-nuit"><span className="ch-alt-btn ch-alt-nuit ch-alt-filet-nuit">Bouton</span></div><figcaption>❌ Noir sur noir</figcaption></figure>
        </div>
      </Section>

      <Section id="motion" lettre="I" titre="Motion">
        <ul className="ch-liste">
          {aplatir(duree).map(([k, j]) => (
            <li key={k}><Nom chemin={`duree.${k}`} j={j} /></li>
          ))}
          {aplatir(courbe).map(([k, j]) => (
            <li key={k}><Nom chemin={`courbe.${k}`} j={j} /></li>
          ))}
        </ul>
        <Motion />
      </Section>

      <Section id="magazine" lettre="J" titre="Magazine">
        <Magazine />
      </Section>


      <Section id="visuels" lettre="G · J" titre="Photo et visuels">
        <h3 className="ch-h3">Règles photo</h3>
        <ul className="ch-liste ch-liste--texte">{reglesPhoto.map((r) => <li key={r}>{r}</li>)}</ul>
        <h3 className="ch-h3">Visuels datés <span className="ch-propose">proposé · construit en phase 4</span></h3>
        <div className="ch-rotations" aria-label="Exemple d’un emplacement et de ses rotations">
          <p className="ch-rotations-nom"><code>offrir.carte</code></p>
          <ol className="ch-rotations-liste">
            <li><span className="ch-etiquette">Par défaut</span><span>Toute l’année</span><span className="ch-rotation-etat ch-rotation-etat--en-ligne">en ligne</span></li>
            <li><span className="ch-etiquette">Noël</span><span>du 1er au 26 décembre</span><span className="ch-rotation-etat ch-rotation-etat--valide">validé</span></li>
            <li><span className="ch-etiquette">Été</span><span>du 15 juin au 31 août</span><span className="ch-rotation-etat">à valider</span></li>
          </ol>
          <p className="ch-note">Exemple. Une rotation « à valider » ne passe jamais en ligne. L’aperçu /brand/visuels montre le site à la date choisie.</p>
        </div>
        <h3 className="ch-h3">Emplacements</h3>
        <Tableau t={emplacements} />
        <p className="ch-note">Lu dans brand/charte/G-iconographie.md. Tout se règle dans src/content/media.ts.</p>
      </Section>

      <Section id="variations" lettre="B · F" titre="Variations du catalogue">
        <p className="ch-note">Désactivées par défaut sur le site, jamais dans les mails pour l’instant. Montrées ici pour choisir.</p>
        <div className="ch-grille ch-grille--variations">
          <figure className="ch-variation">
            <div className="ch-var" aria-hidden="true"><div className="ch-var-motif" /></div>
            <figcaption><Nom chemin="variation.signatures-fond" j={variation['signatures-fond']['tuile-largeur']} /></figcaption>
          </figure>
          <figure className="ch-variation">
            <div className="ch-var ch-var--points" />
            <figcaption><Nom chemin="variation.points-fins" j={variation['points-fins'].tuile} /></figcaption>
          </figure>
          <figure className="ch-variation">
            <div className="ch-var ch-var--frise"><span /></div>
            <figcaption><Nom chemin="variation.pointille-frise (active)" j={variation['pointille-frise'].pas} /></figcaption>
          </figure>
          <figure className="ch-variation">
            <div className="ch-var ch-var--grain">
              <svg aria-hidden="true">
                <filter id="ch-grain">
                  <feTurbulence type="fractalNoise" baseFrequency={String(variation.grain.frequence.valeur)} numOctaves={Number(variation.grain.octaves.valeur)} stitchTiles="stitch" />
                  <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#ch-grain)" />
              </svg>
            </div>
            <figcaption><Nom chemin="variation.grain" j={variation.grain.opacite} /></figcaption>
          </figure>
          <figure className="ch-variation">
            <div className="ch-var ch-var--pied"><span className="ch-var-pied-logo" /></div>
            <figcaption><Nom chemin="variation.signature-pied" j={variation['signature-pied'].angle} /></figcaption>
          </figure>
        </div>
      </Section>

      <Section id="logo" lettre="B" titre="Logo">
        <div className="ch-grille ch-grille--logo">
          <figure className="ch-forme">
            <div className="ch-logo-cadre"><div className="ch-logo ch-logo--grand" role="img" aria-label="Bellajour vectoriel sur papier" /></div>
            <figcaption className="ch-etiquette">Vectoriel · sur papier</figcaption>
          </figure>
          <figure className="ch-forme">
            <div className="ch-logo-cadre ch-logo-cadre--nuit"><div className="ch-logo ch-logo--grand" role="img" aria-label="Bellajour vectoriel sur nuit" /></div>
            <figcaption className="ch-etiquette">Vectoriel · sur nuit</figcaption>
          </figure>
          <figure className="ch-forme">
            <div className="ch-logo-cadre"><div className="ch-logo ch-logo--grand ch-logo--ancien" role="img" aria-label="Bellajour, image actuelle" /></div>
            <figcaption className="ch-etiquette">Image actuelle du site, pour comparer</figcaption>
          </figure>
        </div>
        <p className="ch-note">
          Tracé depuis votre PNG Procreate (brand/assets/logo/bellajour.svg). Il prend la couleur du texte : encre sur papier, blanc sur nuit.
        </p>
        <h3 className="ch-sous-titre">Favicon : le « b » du logo</h3>
        <div className="ch-grille ch-grille--favicon">
          {FAVICONS.map((f) => (
            <figure key={f.v} className="ch-forme">
              <div className="ch-favicon-cadre">
                <img src={`/brand/favicon/bellajour-${f.v}.svg`} alt={f.alt} width={96} height={96} />
                <img src={`/brand/favicon/bellajour-${f.v}-32.png`} alt="" width={32} height={32} />
                <img src={`/brand/favicon/bellajour-${f.v}-16.png`} alt="" width={16} height={16} />
              </div>
              <figcaption className="ch-etiquette">{f.nom}</figcaption>
            </figure>
          ))}
        </div>
        <p className="ch-note">
          Découpé dans le tracé, pas redessiné (brand/scripts/favicon.mjs). En 16 et 32 px le trait s&apos;épaissit pour rester lisible. Le site sert le b seul ; l’écran d’accueil d’un téléphone reçoit le carré blanc (iOS veut une icône opaque).
        </p>
      </Section>

      <Section id="declinaisons" lettre="N" titre="Hors site">
        <h3 className="ch-h3">Mail · {jetons.mail.largeur.css}, polices de secours</h3>
        <div className="ch-mail">
          <div className="ch-mail-corps">
            <div className="ch-logo" role="img" aria-label="Bellajour" />
            <p className="ch-mail-titre">Votre numéro est prêt</p>
            <p className="ch-mail-texte">L’aperçu vous attend. Vous pouvez le relire avant de commander.</p>
            <span className="ch-mail-bouton">Voir mon numéro</span>
          </div>
        </div>

        <h3 className="ch-h3">Les quatre structures de mails · un nouveau mail commence par choisir la sienne</h3>
        <div className="ch-grille ch-grille--divers">
          {[
            { img: "pile", nom: "Atelier", pour: "M0, M2, C0 · pile de numéros, bande nuit, trois étapes" },
            { img: "bande", nom: "Lettre", pour: "M3 à M10 · « Bonjour Prénom, », encarts, bande de couvertures" },
            { img: "arrivee", nom: "Magazine", pour: "M7b, M8 · grande photo, demi-photos, bande nuit « Offrez-en un »" },
            { img: "etape-3", nom: "Simple", pour: "C1, C2, M2b · un petit visuel, un titre, un bouton" },
          ].map((s) => (
            <figure key={s.nom} className="ch-structure">
              <img src={`/images/mails/charte/structures/${s.img}.jpg`} alt="" width={300} height={200} loading="lazy" />
              <p className="ch-mail-titre">{s.nom}</p>
              <figcaption className="ch-note">{s.pour}</figcaption>
            </figure>
          ))}
        </div>

        <h3 className="ch-h3">Réseaux <span className="ch-propose">zones proposées</span></h3>
        <div className="ch-grille ch-grille--reseaux">
          <figure className="ch-reseau ch-reseau--post">
            <div className="ch-reseau-photo" />
            <span className="ch-reseau-sur" />
            <p className="ch-reseau-titre">Été à Lisbonne</p>
            <figcaption className="ch-etiquette">Post 1080 × 1350</figcaption>
          </figure>
          <figure className="ch-reseau ch-reseau--story">
            <div className="ch-reseau-photo" />
            <span className="ch-reseau-sur" />
            <p className="ch-reseau-signature">Vivez. Nous composons.</p>
            <figcaption className="ch-etiquette">Story 1080 × 1920</figcaption>
          </figure>
        </div>

        <h3 className="ch-h3">Brochure PDF · A4 portrait</h3>
        <div className="ch-grille ch-grille--brochures">
          <figure className="ch-brochure ch-brochure--a4">
            <div className="ch-brochure-page">
              <div className="ch-logo" role="img" aria-label="Bellajour" />
              <p className="ch-brochure-titre">L’Édition collective</p>
              <div className="ch-brochure-photo" />
              <p className="ch-etiquette ch-brochure-num">01</p>
            </div>
            <figcaption><strong>A4 portrait</strong> · 210 × 297 mm, marges 15 mm</figcaption>
          </figure>
        </div>
      </Section>

      <footer className="ch-pied">
        <p className="ch-filigrane" aria-hidden="true">Bellajour</p>
        <p className="ch-etiquette">Charte {versionCharte}</p>
      </footer>
    </main>
  )
}
