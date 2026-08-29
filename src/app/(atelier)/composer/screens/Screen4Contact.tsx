/* Écran 4 — « Où vous envoyons-nous votre couverture ? »
   Fin de cet écran = première écriture en base + création du token (PRD §7.2).

   Aucun champ d'adresse ici, ni nulle part dans le questionnaire : c'est Stripe
   qui collectera l'adresse de livraison le moment venu (PRD §9). */

import { suggestionEmail } from '@/lib/atelier/questionnaire'

export default function Screen4Contact({
  prenom, email, telephone, onChange, erreur,
}: {
  prenom: string
  email: string
  telephone: string
  onChange: (champ: 'prenom' | 'email' | 'telephone', v: string) => void
  erreur: string | null
}) {
  /* Calculé à chaque frappe : la fonction sort sur une comparaison de chaîne
     pour l'immense majorité des saisies (domaine déjà courant), et ne calcule
     de distance que sur les quelques autres. */
  const suggestion = suggestionEmail(email)

  return (
    <>
      <p className="at-kicker">Étape 4 sur 6</p>
      <h2>Où vous envoyons-nous<br />votre couverture ?</h2>
      {/* ── CE QUI RESTE À FAIRE, DIT ICI ────────────────────────────────
          « Vous la recevez sous 48 h, gratuitement, sans engagement » se
          lisait comme une FIN : on donne ses coordonnées, on reçoit sa
          couverture. Le 27/08, une cliente a rempli cet écran et n'a jamais
          déposé une photo. Son dossier est arrivé complet côté texte, vide
          côté matière, et elle n'avait aucune raison de se douter qu'il
          manquait quelque chose.
          La promesse reste, mais elle ne se referme plus sur elle-même : la
          phrase suivante annonce l'étape, et le bouton la nomme. */}
      <p className="at-lede at-q-lede">
        Vous la recevez sous 48 h. Gratuitement, sans engagement.
        <br />
        <b>Il reste une étape après celle-ci : vos photos.</b> C’est avec elles
        que l’atelier compose.
      </p>

      <input
        className="at-inp"
        value={prenom}
        onChange={(e) => onChange('prenom', e.target.value)}
        placeholder="Prénom"
        autoComplete="given-name"
        aria-label="Prénom"
      />
      <input
        className="at-inp"
        type="email"
        value={email}
        onChange={(e) => onChange('email', e.target.value)}
        placeholder="Email"
        autoComplete="email"
        inputMode="email"
        aria-label="Email"
      />
      {/* ── LA FAUTE DE FRAPPE, ATTRAPÉE AVANT L'ENVOI ────────────────
          Une adresse mal tapée est le seul échec du parcours qui ne se voit
          nulle part : le dossier se crée, elle ne reçoit rien, et elle croit
          que c'est nous qui ne répondons pas. Le webhook Brevo le rattrape
          APRÈS coup ; ceci l'évite avant.
          ⚠️ C'est un bouton, pas un blocage : la correction ne s'applique que
          si elle clique. Refuser une adresse valide mais rare coûterait bien
          plus cher que le rebond qu'on évite. */}
      {suggestion && (
        <p className="at-d-suggestion" role="status">
          Vouliez-vous dire{' '}
          <button type="button" onClick={() => onChange('email', suggestion)}>
            {suggestion}
          </button>{' '}
          ?
        </p>
      )}

      <input
        className="at-inp"
        type="tel"
        value={telephone}
        onChange={(e) => onChange('telephone', e.target.value)}
        placeholder="Téléphone"
        autoComplete="tel"
        inputMode="tel"
        aria-label="Téléphone"
      />

      <p className="at-hint at-hint--calme">
        Le téléphone sert au transporteur, le jour où votre numéro arrive chez
        vous. Il ne part nulle part ailleurs, et personne ne vous appellera
        pour vous vendre quoi que ce soit.
      </p>

      {erreur && <p className="at-erreur" role="alert">{erreur}</p>}
    </>
  )
}
