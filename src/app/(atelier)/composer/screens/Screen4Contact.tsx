/* Écran 4 — « Où vous envoyons-nous votre couverture ? »
   Fin de cet écran = première écriture en base + création du token (PRD §7.2).

   Aucun champ d'ADRESSE ici, ni nulle part dans le questionnaire : c'est
   Stripe qui collectera l'adresse de livraison le moment venu (PRD §9). Ça
   reste vrai depuis le 10/09/2026, malgré le select ci-dessous : on demande
   le PAYS, pas l'adresse. Les deux ne servent pas à la même chose et
   n'arrivent pas au même moment.

   POURQUOI LE PAYS, ET POURQUOI SI TÔT (lot 3). La livraison sera facturée en
   sus, sur devis de l'imprimeur (décision de Mathias du 10/09/2026). Un devis
   exige la destination AVANT qu'on puisse annoncer un montant ; l'adresse
   Stripe, elle, n'arrive qu'au paiement, c'est-à-dire après. Sans cette
   question, l'atelier devrait annoncer un prix de port qu'il ne connaît pas.
   Une ligne de select ici évite d'inventer un chiffre plus tard. */

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
          Un select et pas un champ libre : une saisie libre laisserait entrer
          « Fance » ou « Belgique » là où l'imprimeur attend un code. Le pays
          par défaut est visible et modifiable, donc rien n'est décidé à la
          place du client.
          ⚠️ TRENTE DESTINATIONS DEPUIS LE 11/09/2026 (toute l'Europe). L'ordre
          vient de `PAYS_TRIES`, jamais de la liste brute : France, Belgique,
          Luxembourg et Suisse d'abord — l'écrasante majorité des dossiers —
          puis le reste par ordre alphabétique du libellé. Trier sur le code
          ISO rangerait « Allemagne » entre le Danemark et l'Estonie. */}
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
          le port n'est pas encore chiffré, il le sera avec la couverture. */}
      <p className="at-hint at-hint--calme">
        Le prix de la livraison dépend du pays. Il vous sera indiqué avec votre
        couverture, avant tout paiement.
      </p>

      {erreur && <p key={erreurCle} className="at-erreur" role="alert">{erreur}</p>}
    </>
  )
}
