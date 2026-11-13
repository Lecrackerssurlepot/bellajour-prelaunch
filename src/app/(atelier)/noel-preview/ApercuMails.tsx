'use client'

/* Partie 06 : chaque mail de MAILS.md, au ton choisi.

   Le rendu suit la forme d'un mail, pas celle du site : un tableau de 600 px
   au plus, styles EN LIGNE, cadre arrondi, accent #4A90D9. Les couleurs sont
   donc écrites ici en hexadécimal, comme dans un gabarit Brevo : c'est la
   seule exception de la planche, et elle reprend les valeurs de theme.css.
   Les variables `{{ params.X }}` restent visibles : c'est ce que Brevo
   remplacera. */

import { useState } from 'react'
import { MAILS, SIGNATURE, type Ton } from './contenu'

const C = {
  fond: '#070708',
  cadre: '#0e0e10',
  filet: '#29292e',
  texte: '#f5f0e7',
  doux: '#c7c2b8',
  faible: '#928d84',
  bouton: '#4A90D9',
}
/* Dans l'aperçu, les polices du site (next/font les renomme : le nom nu
   « Cormorant Garamond » n'y correspond à rien). Dans le vrai gabarit, la
   pile s'écrit avec les noms nus et Georgia / Arial en repli. */
const SERIF = 'var(--font-display)'
const SANS = 'var(--font-ui)'

export default function ApercuMails({ ton }: { ton: Ton }) {
  const [code, setCode] = useState(MAILS[0].code)
  const mail = MAILS.find((m) => m.code === code) ?? MAILS[0]
  const propose = mail.propose?.includes(ton) ?? false

  return (
    <div className="nl-mails">
      <div className="nl-onglets" role="tablist" aria-label="Mails">
        {MAILS.map((m) => (
          <button key={m.code} type="button" role="tab" aria-selected={m.code === code} className="nl-onglet" onClick={() => setCode(m.code)}>
            {m.code}
          </button>
        ))}
      </div>

      <div className="nl-mail-entete">
        <span className="nl-mail-nom">{mail.code} · {mail.nom}</span>
        {propose && <span className="nl-propose">Texte proposé, absent de MAILS.md</span>}
        <span><span className="nl-faible">Objet</span> {mail.objet}</span>
        {mail.preheader && <span><span className="nl-faible">Preheader</span> {mail.preheader}</span>}
      </div>

      <div className="nl-mail-fond" style={{ background: C.fond }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, margin: '0 auto', borderCollapse: 'separate' }}>
          <tbody>
            <tr>
              <td style={{ background: C.cadre, border: `1px solid ${C.filet}`, borderRadius: 16, padding: '32px 28px' }}>
                <div style={{ fontFamily: SERIF, fontSize: 26, color: C.texte, letterSpacing: '0.02em', marginBottom: 24 }}>Bellajour</div>
                {mail.corps[ton].map((ligne, i) => {
                  const bouton = /^\[(.+)\]$/.exec(ligne)
                  if (bouton) {
                    return (
                      <div key={i} style={{ margin: '24px 0' }}>
                        <span style={{ display: 'inline-block', background: C.bouton, color: '#ffffff', fontFamily: SANS, fontSize: 15, fontWeight: 500, padding: '13px 26px', borderRadius: 999 }}>
                          {bouton[1]}
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div key={i} style={{ fontFamily: SANS, fontSize: 16, lineHeight: 1.6, color: i === 0 ? C.texte : C.doux, margin: '0 0 14px', overflowWrap: 'break-word' }}>
                      {ligne}
                    </div>
                  )
                })}
                <div style={{ borderTop: `1px solid ${C.filet}`, marginTop: 24, paddingTop: 18, fontFamily: SERIF, fontSize: 19, fontStyle: 'italic', color: C.texte }}>
                  {SIGNATURE}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.faible, marginTop: 6 }}>bellajour.fr</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
