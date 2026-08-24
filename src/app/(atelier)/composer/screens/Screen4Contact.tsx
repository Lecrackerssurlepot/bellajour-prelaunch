/* Écran 4 — « Où vous envoyons-nous votre couverture ? »
   Fin de cet écran = première écriture en base + création du token (PRD §7.2).

   Aucun champ d'adresse ici, ni nulle part dans le questionnaire : c'est Stripe
   qui collectera l'adresse de livraison le moment venu (PRD §9). */

export default function Screen4Contact({
  prenom, email, telephone, onChange, erreur,
}: {
  prenom: string
  email: string
  telephone: string
  onChange: (champ: 'prenom' | 'email' | 'telephone', v: string) => void
  erreur: string | null
}) {
  return (
    <>
      <p className="at-kicker">Étape 4 sur 6</p>
      <h2>Où vous envoyons-nous<br />votre couverture ?</h2>
      <p className="at-lede at-q-lede">
        Vous la recevez sous 48 h. Gratuitement, sans engagement.
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
      <input
        className="at-inp"
        type="tel"
        value={telephone}
        onChange={(e) => onChange('telephone', e.target.value)}
        placeholder="Téléphone (facultatif)"
        autoComplete="tel"
        aria-label="Téléphone, facultatif"
      />

      {erreur && <p className="at-erreur" role="alert">{erreur}</p>}
    </>
  )
}
