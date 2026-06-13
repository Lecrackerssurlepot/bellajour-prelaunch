import type { LocalizedDoc } from '../types'

/* POLITIQUE DE REMBOURSEMENT ET RETOURS — transcription fidèle de
   legal-source/remboursement/FR/…docx (v3.0).
   EN / PT : sources présentes dans legal-source/remboursement/{EN,PT} — à brancher plus tard. */

export const REMBOURSEMENT: LocalizedDoc = {
  fr: {
    title: `Politique de remboursement et retours`,
    lastUpdated: `Version 3.0 — En vigueur le 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Traduction française à titre informatif. La version juridiquement prévalente est le texte portugais ; en cas de divergence, ce dernier prime. À lire avec les Conditions Générales de Vente (articles 5, 8 et 9) et la Politique de confidentialité.`,
    ],
    sections: [
      {
        heading: `1. Esprit de cette politique`,
        blocks: [
          { kind: 'p', value: `Chaque album Bellajour est un livre unique, confectionné selon vos spécifications. Cette politique explique, en toute transparence, ce qui est remboursable, ce qui ne l'est pas, et comment nous traitons tout problème. Elle ne réduit en rien vos garanties légales (voir §5), auxquelles vous ne pouvez renoncer.` },
        ],
      },
      {
        heading: `2. Droit de libre résolution : pourquoi il ne s'applique pas`,
        blocks: [
          { kind: 'p', value: `Conformément à l'article 17.º, n.º 1, alinéa c), du DL 24/2014 (transposant la directive 2011/83/UE), le droit de libre résolution de 14 jours ne s'applique pas aux albums Bellajour, qui sont des biens manifestement personnalisés, créés à partir de vos photos et d'une couverture générée pour vous seul.` },
          { kind: 'p', value: `Votre commande devient définitive et non résiliable au moment précis de la validation de la maquette (case à cocher dédiée + horodatage). Vous êtes informé de cette exception, de façon claire et lisible, avant le versement de l'acompte et avant la validation de la maquette.` },
        ],
      },
      {
        heading: `3. Remboursement de l'acompte (commandes en prévente)`,
        blocks: [
          { kind: 'p', value: `Le moment où vous demandez l'arrêt de votre commande détermine le remboursement :` },
          { kind: 'table', columns: [`Étape`, `Remboursement`], rows: [
            [`Avant la validation de la maquette (quel que soit l'état d'avancement, téléversement des photos compris)`, `100 % de l'acompte effectivement versé — sans retenue, sans frais et sans pénalité (« réservation sans risque »)`],
            [`Après la validation de la maquette`, `Commande définitive : plus de remboursement à ce titre, sous réserve des garanties légales (§5) et de l'impossibilité de produire/livrer (§7)`],
          ] },
          { kind: 'p', value: `Montant remboursé = montant effectivement payé. Le crédit (Instants) de 30 € est un avantage commercial ; seul le montant versé est remboursé :` },
          { kind: 'list', items: [
            `Fondateur : vous avez payé 25 € → 25 € remboursés ; la bonification de 5 €, jamais décaissée, n'est pas remboursable.`,
            `Standard : vous avez payé 30 € → 30 € remboursés.`,
            `Code influenceur : vous avez payé 25 € → 25 € remboursés ; la bonification de 5 € n'est pas remboursable.`,
          ] },
          { kind: 'p', value: `Le crédit (Instants) accordé (30 €) est annulé en cas de remboursement en numéraire.` },
        ],
      },
      {
        heading: `4. Défauts : ce que Bellajour répare ou rembourse`,
        blocks: [
          { kind: 'p', value: `Indépendamment de l'exception ci-dessus, nous prenons en charge tout défaut qui nous est imputable. Notre moyen prioritaire de remise en conformité est la réimpression.` },
          { kind: 'table', columns: [`Situation`, `Notre engagement`, `Délai de signalement`], rows: [
            [`Album endommagé au transport`, `Réimpression prioritaire ou remboursement`, `7 jours après réception, photos à l'appui`],
            [`Album non conforme à la maquette validée (erreur de production)`, `Réimpression gratuite ou remboursement total`, `Sous 30 jours`],
            [`Couverture non conforme à celle validée`, `Réimpression ou remboursement`, `Sous 30 jours`],
            [`Qualité d'impression manifestement défectueuse (couleurs hors tolérances, pages manquantes)`, `Réimpression ou remboursement`, `Sous 30 jours`],
            [`Non-livraison du fichier digital HD inclus`, `Livraison du fichier ou remboursement de la part correspondante`, `Dès constatation`],
            [`Défaut mineur (légère variation colorimétrique dans les tolérances annoncées)`, `Geste commercial possible — pas une obligation légale`, `—`],
          ] },
          { kind: 'p', value: `Important — écran ≠ impression. Une variation colorimétrique normale entre l'affichage écran (RVB rétroéclairé) et l'impression papier (CMJN), dans les tolérances usuelles, ne constitue pas un défaut (CGV article 6).` },
        ],
      },
      {
        heading: `5. Vos garanties légales (toujours applicables)`,
        blocks: [
          { kind: 'p', value: `Conformément au Decreto-Lei n.º 84/2021 :` },
          { kind: 'list', items: [
            `Garantie de conformité : 3 ans à compter de la livraison (article 12.º).`,
            `Présomption de non-conformité : 2 ans — pendant 24 mois, c'est à Bellajour de prouver la conformité (article 13.º).`,
            `Droit de rejet (rejeição) : 30 jours — vous pouvez exiger directement la substitution ou la résolution, sans condition ; ce délai court de la livraison ou de la découverte d'un défaut non apparent.`,
            `Hiérarchie des remèdes : d'abord réparation ou remplacement (réimpression) ; subsidiairement, réduction du prix ou résolution, si la réimpression est impossible, disproportionnée, échoue ou se répète.`,
          ] },
          { kind: 'p', value: `Aucune clause de la présente politique ne peut exclure ou réduire ces garanties.` },
        ],
      },
      {
        heading: `6. Procédure — comment nous contacter`,
        blocks: [
          { kind: 'list', items: [
            `Écrivez à contact@bellajour.com avec votre numéro de commande et des photos du défaut.`,
            `Nous répondons sous 5 jours ouvrés.`,
            `Solution : réimpression prioritaire ou remboursement (partiel ou total selon l'étendue du défaut).`,
            `Si un retour physique est nécessaire (défaut grave), les frais de retour sont à notre charge.`,
            `Remboursements effectués en numéraire sur le moyen de paiement initial, au plus tard 14 jours après acceptation de la réclamation (article 12.º du DL 24/2014). Sur le plan comptable, le remboursement d'un acompte déjà facturé donne lieu à une note de crédit annulant la facture ; cette note de crédit est un document comptable et non un avoir se substituant au remboursement en numéraire.`,
            `Pour limiter le gaspillage, un album personnalisé non conforme n'a en général pas à être renvoyé : la réimpression est privilégiée.`,
          ] },
          { kind: 'p', value: `Conservation des preuves. Bellajour conserve pendant 10 ans (Código Comercial, article 40.º) les éléments de preuve de la commande et de la validation (version des CGV acceptée, horodatages d'acceptation, de téléversement et de validation de la maquette, identifiant de transaction Stripe).` },
        ],
      },
      {
        heading: `7. Bonus acquis, crédits et cas où nous ne pouvons pas produire`,
        blocks: [
          { kind: 'p', value: `7.1 Éléments toujours acquis. Même en cas de litige ou d'annulation portant sur l'album physique, restent définitivement acquis : les Instants crédités, l'illustration de couverture déjà livrée et le fichier digital HD déjà livré (inclus dans toutes les commandes). Seul l'album physique non produit peut faire l'objet d'un remboursement.` },
          { kind: 'p', value: `7.2 Crédits de pages (parrainage). Les pages offertes par parrainage sont non remboursables en espèces ; elles sont utilisables sur les commandes futures dans les conditions du programme. Elles sont annulées si l'acompte associé est remboursé (CGV art. 5.6).` },
          { kind: 'p', value: `7.3 Impossibilité de produire ou livrer. Si Bellajour ne peut produire ou livrer (défaillance interne, défaillance de l'imprimeur partenaire, force majeure, cessation d'activité), toute somme versée est intégralement remboursée en numéraire, sans condition.` },
        ],
      },
      {
        heading: `8. Réclamations et règlement alternatif des litiges (RAL)`,
        blocks: [
          { kind: 'list', items: [
            `Réclamation directe : contact@bellajour.com (réponse sous 5 jours ouvrés).`,
            `Livro de Reclamações Eletrónico : https://www.livroreclamacoes.pt (lien en pied de page du site).`,
            `Entités de RAL portugaises (Lei 144/2015) : Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) — centre compétent pour le siège de Bellajour — ou, pour les zones non couvertes par un centre régional, le CNIACC (www.cniacc.pt). L'information est obligatoire ; l'adhésion de Bellajour est facultative.`,
            `Tribunaux : le consommateur peut saisir les tribunaux de son pays de résidence (droit portugais applicable, sous réserve des dispositions impératives plus protectrices — Règlement Rome I, article 6).`,
          ] },
        ],
      },
    ],
  },
}
