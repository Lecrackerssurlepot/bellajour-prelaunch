/* Écran 5 — LE DÉPÔT. Placeholder du lot 3.
   ────────────────────────────────────────────────────────────────────────
   ⚠️ CET ÉCRAN EST UN PLACEHOLDER — il est remplacé intégralement au lot 4.
   Le vrai dépôt (40 à 100 photos, URLs pré-signées R2, lots de 5 en parallèle,
   reprise sur coupure, compteur en requestAnimationFrame, jauge, vignettes,
   palier d'orientation, case consent_photos) est le lot le plus lourd du
   chantier et n'a rien à faire ici.
   Il est laissé traversable pour que le questionnaire soit testable de bout
   en bout dès le lot 3.
   ──────────────────────────────────────────────────────────────────────── */

export default function Screen5Depot({ token }: { token: string | null }) {
  return (
    <>
      <p className="at-kicker">Étape 5 sur 6</p>
      <h2>Vos photos,<br />maintenant.</h2>
      <p className="at-lede at-q-lede">
        Entre 40 et 100. Ne triez pas trop — le tri, c’est notre métier.
      </p>

      <div className="at-stub">
        <b>Le dépôt arrive au lot 4</b>
        <small>
          Envoi vers R2, compteur, jauge, vignettes et palier.
          {token ? ' Le dossier est déjà créé en base.' : ' Aucun dossier créé.'}
        </small>
      </div>
    </>
  )
}
