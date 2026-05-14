import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Bellajour',
  description: 'Comment Bellajour collecte et utilise vos données personnelles.',
}

export default function PolitiqueConfidentialite() {
  return (
    <main style={{
      backgroundColor: '#EAE3D8',
      minHeight: '100vh',
      padding: '6vh 5vw',
      fontFamily: '"DM Sans", sans-serif',
      color: '#1C1C1C',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        <a href="/" style={{
          display: 'inline-block',
          marginBottom: '3rem',
          fontSize: '0.85rem',
          color: '#A89880',
          textDecoration: 'none',
          letterSpacing: '0.05em',
        }}>
          ← Retour
        </a>

        <h1 style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 400,
          fontSize: 'clamp(2rem, 4vw, 2.8rem)',
          lineHeight: 1.2,
          marginBottom: '0.5rem',
        }}>
          Politique de confidentialité
        </h1>

        <p style={{ color: '#A89880', fontSize: '0.85rem', marginBottom: '3.5rem' }}>
          Dernière mise à jour : mai 2026
        </p>

        <Section titre="Responsable du traitement">
          <p><strong>Bellajour</strong></p>
          <p>Contact : <a href="mailto:contact@bellajour.fr" style={{ color: '#1C1C1C' }}>contact@bellajour.fr</a></p>
        </Section>

        <Section titre="Données collectées">
          <p>Lors de votre inscription à la liste d&apos;attente, nous collectons :</p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Adresse email</strong> — obligatoire</li>
            <li><strong>Prénom</strong> — optionnel</li>
          </ul>
          <p><strong>Finalité :</strong> vous informer des actualités de Bellajour — ouverture de la prévente,
          offre Fondateurs, lancement du service. Nous ne vous écrirons que lorsque nous aurons
          quelque chose d&apos;important à vous montrer.</p>
          <p><strong>Base légale :</strong> votre consentement explicite, donné lors de l&apos;inscription
          (article 6.1.a du RGPD).</p>
          <p><strong>Durée de conservation :</strong> jusqu&apos;à votre désinscription, ou pendant 3 ans
          à compter du dernier contact, selon ce qui survient en premier.</p>
        </Section>

        <Section titre="Vos droits">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li><strong>Accès</strong> — consulter les données que nous détenons sur vous</li>
            <li><strong>Rectification</strong> — corriger des données inexactes</li>
            <li><strong>Suppression</strong> — demander l&apos;effacement de vos données</li>
            <li><strong>Opposition</strong> — vous opposer au traitement de vos données</li>
            <li><strong>Portabilité</strong> — recevoir vos données dans un format structuré</li>
          </ul>
          <p>
            Pour exercer ces droits, écrivez-nous à{' '}
            <a href="mailto:contact@bellajour.fr" style={{ color: '#1C1C1C' }}>contact@bellajour.fr</a>.
            Nous répondrons dans un délai de 30 jours.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
            auprès de la{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: '#1C1C1C' }}>CNIL</a>.
          </p>
        </Section>

        <Section titre="Hébergement des données">
          <ul style={{ paddingLeft: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <li>
              <strong>Supabase</strong> — stockage des inscriptions, hébergé dans l&apos;Union Européenne
              (région eu-west-1, Irlande)
            </li>
            <li>
              <strong>Brevo</strong> — plateforme d&apos;envoi d&apos;emails marketing,
              société française (SAS Sendinblue, Paris)
            </li>
          </ul>
          <p>Vos données ne sont jamais revendues ni transmises à des tiers à des fins commerciales.</p>
        </Section>

        <Section titre="Cookies">
          <p>
            Ce site n&apos;utilise pas de cookies de tracking ou publicitaires.
            Aucun outil d&apos;analyse comportementale n&apos;est actif sur cette page.
          </p>
        </Section>

        <Section titre="Contact">
          <p>
            Pour toute question relative à cette politique :{' '}
            <a href="mailto:contact@bellajour.fr" style={{ color: '#1C1C1C' }}>contact@bellajour.fr</a>
          </p>
        </Section>

        <p style={{
          marginTop: '4rem',
          paddingTop: '2rem',
          borderTop: '1px solid #C8BFB3',
          color: '#A89880',
          fontSize: '0.8rem',
        }}>
          © 2026 Bellajour. Vivez. Nous composons.
        </p>

      </div>
    </main>
  )
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{
        fontFamily: '"Playfair Display", serif',
        fontWeight: 400,
        fontSize: '1.25rem',
        marginBottom: '0.9rem',
        color: '#1C1C1C',
      }}>
        {titre}
      </h2>
      <div style={{
        fontSize: '0.95rem',
        lineHeight: 1.8,
        color: '#3A3A3A',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
      }}>
        {children}
      </div>
    </section>
  )
}
