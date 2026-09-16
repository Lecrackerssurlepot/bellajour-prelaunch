/* Écran 4 — « Où vous envoyons-nous votre couverture ? »
   Fin de cet écran = première écriture en base + création du token (PRD §7.2).

   Aucun champ d'ADRESSE ici, ni nulle part dans le questionnaire : c'est
   Stripe qui collectera l'adresse de livraison le moment venu (PRD §9).

   LE PAYS EST DE RETOUR (15/09/2026), et la raison est plus forte que celle
   qui l'avait fait partir le 11/09 (« on s'en fiche ») : depuis la grille
   HORS TAXES, LE PRIX LUI-MÊME dépend du pays de livraison (HT × TVA du
   pays, arrondi à l'euro). Sans pays, M3 ne peut pas annoncer le vrai
   montant. Mathias : « on demande dans le questionnaire le pays de
   livraison pour avoir la bonne info dans M3 ». On demande le PAYS, pas
   l'adresse : les deux ne servent pas à la même chose et n'arrivent pas au
   même moment. Le client peut encore en changer sur sa page de commande. */

import { suggestionEmail } from '@/lib/atelier/questionnaire'
import { PAYS_TRIES, PAYS_LIBELLE } from '@/lib/atelier/pays'

export default function Screen4Contact({
  prenom, email, telephone, pays, onChange, erreur, erreurCle,
}: {
  prenom: string
  email: string
  telephone: string
  pays: string
  onChange: (champ: 'prenom' | 'email' | 'telephone' | 'pays', v: string) => void
  erreur: string | null
  /** T-051 — change à chaque refus : le même message est ré-annoncé. */
  erreurCle: number
}) {
  /* Calculé à chaque frappe : la fonction sort sur une comparaison de chaîne
     pour l'immense majorité des saisies (domaine déjà courant), et ne calcule
     de distance que sur les quelques autres. */
  const suggestion = suggestionEmail(email)

  return (
    <>
      <p className="at-kicker">Vous</p>
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

      {/* ── T-053 : DES LIBELLÉS VISIBLES, PAS DES PLACEHOLDERS ─────────
          « Prénom », « Email », « Téléphone » n'existaient qu'en placeholder
          (1,90:1 de contraste, pour un seuil de 4,5:1) et en aria-label que
          l'œil ne lit pas. Trois traits gris au soleil : on inversait email
          et téléphone sans savoir lequel corriger. Les mêmes mots, désormais
          en <label> — qui reste affiché quand le champ est rempli, ce qu'un
          placeholder ne sait pas faire. Les placeholders, devenus redondants,
          sont partis. */}
      <label className="at-lbl" htmlFor="at-c-prenom">Prénom</label>
      <input
        id="at-c-prenom"
        className="at-inp"
        value={prenom}
        onChange={(e) => onChange('prenom', e.target.value)}
        autoComplete="given-name"
      />
      <label className="at-lbl" htmlFor="at-c-email">Email</label>
      <input
        id="at-c-email"
        className="at-inp"
        type="email"
        value={email}
        onChange={(e) => onChange('email', e.target.value)}
        autoComplete="email"
        inputMode="email"
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

      <label className="at-lbl" htmlFor="at-c-telephone">Téléphone</label>
      <input
        id="at-c-telephone"
        className="at-inp"
        type="tel"
        value={telephone}
        onChange={(e) => onChange('telephone', e.target.value)}
        autoComplete="tel"
        inputMode="tel"
      />

      <p className="at-hint at-hint--calme">
        Le téléphone sert au transporteur, le jour où votre numéro arrive chez
        vous. Il ne part nulle part ailleurs, et personne ne vous appellera
        pour vous vendre quoi que ce soit.
      </p>

      {/* ── LE PAYS DE LIVRAISON ─────────────────────────────────────────
          Un select et pas un champ libre : trente-deux destinations, et une
          saisie libre laisserait entrer « Fance » là où le prix attend un
          code. L'ordre est celui de PAYS_TRIES (France, Belgique, Luxembourg,
          Suisse, puis l'alphabet). Le pays par défaut est visible et
          modifiable, donc rien n'est décidé à la place du client. */}
      <label className="at-lbl" htmlFor="at-c-pays">Pays de livraison</label>
      <select
        id="at-c-pays"
        className="at-inp at-inp--select"
        value={pays}
        onChange={(e) => onChange('pays', e.target.value)}
        autoComplete="country"
      >
        {PAYS_TRIES.map((code) => (
          <option key={code} value={code}>{PAYS_LIBELLE[code]}</option>
        ))}
      </select>

      {/* Ce que le select engage, dit ici plutôt que découvert au paiement :
          le prix et le port dépendent du pays, et ils s'affichent avec la
          couverture. */}
      <p className="at-hint at-hint--calme">
        Le prix et la livraison dépendent du pays. Ils vous seront indiqués
        avec votre couverture, avant tout paiement.
      </p>

      {erreur && <p key={erreurCle} className="at-erreur" role="alert">{erreur}</p>}
    </>
  )
}
