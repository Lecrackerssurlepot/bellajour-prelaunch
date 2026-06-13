import type { LocalizedDoc } from '../types'

/* MENTIONS LÉGALES ET INFORMATIONS PRÉCONTRACTUELLES — transcription fidèle de
   legal-source/mentions-legales/FR/…docx (v1.0).
   EN / PT : sources présentes dans legal-source/mentions-legales/{EN,PT} — à
   brancher plus tard (⚠ vérifier le fichier EN, nommé « TERMS AND CONDITIONS »). */

export const MENTIONS_LEGALES: LocalizedDoc = {
  fr: {
    title: `Mentions légales et informations précontractuelles`,
    lastUpdated: `Version 1.0 — En vigueur le 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Traduction française à titre informatif. La version juridiquement prévalente est le texte portugais ; en cas de divergence, ce dernier prime.`,
    ],
    sections: [
      {
        heading: `1. Éditeur du site`,
        blocks: [
          { kind: 'p', value: `Le site bellajour.fr (et son extension bellajour.com) est édité par :` },
          { kind: 'list', items: [
            `MISTÉRIO HERMÉTICO, LDA (marque commerciale « Bellajour »)`,
            `Forme : société par quotas (sociedade por quotas) de droit portugais`,
            `Capital social : 1 000 €, intégralement libéré`,
            `Siège social : Beco de Santa Helena, 21A, 2.º, 1100-117 Lisboa, Portugal`,
            `NIPC / matrícula : 519443284 — Conservatória do Registo Comercial d'Odivelas`,
            `Numéro d'identification TVA : PT519443284`,
            `Contact : contact@bellajour.com`,
          ] },
          { kind: 'p', value: `Direction de la publication : assurée par la gérance de la société.` },
        ],
      },
      {
        heading: `2. Hébergeur`,
        blocks: [
          { kind: 'p', value: `Le site est hébergé par :` },
          { kind: 'p', value: `Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.` },
          { kind: 'p', value: `Les données personnelles et les contenus traités dans le cadre du service sont, quant à eux, hébergés et localisés conformément à la Politique de confidentialité, à laquelle il est renvoyé.` },
        ],
      },
      {
        heading: `3. Activité et zone de commercialisation`,
        blocks: [
          { kind: 'p', value: `Bellajour exerce une activité d'édition et de vente en ligne d'albums photo personnalisés (couverture illustrée générée par IA, mise en page algorithmique sous contrôle humain, version digitale HD incluse).` },
          { kind: 'p', value: `Les produits sont commercialisés au sein de l'Union européenne. Toute extension à d'autres territoires fera l'objet d'une mise à jour des présentes mentions et des conditions applicables.` },
        ],
      },
      {
        heading: `4. Sécurité des produits (Règlement (UE) 2023/988 — GPSR)`,
        blocks: [
          { kind: 'p', value: `Au sens du Règlement (UE) 2023/988 relatif à la sécurité générale des produits :` },
          { kind: 'p', value: `Bellajour, qui commercialise l'album sous sa marque, est le fabricant (articles 3, §8, et 13) et est elle-même la personne responsable établie dans l'Union européenne (article 16). Les obligations correspondantes ne sont pas déléguées ; la fabrication physique est confiée à un sous-traitant de production établi dans l'Union européenne.` },
          { kind: 'list', items: [
            `Traçabilité : chaque album est identifié par son numéro de commande, figurant sur la fiche de livraison.`,
            `Contact sécurité produit : contact@bellajour.com. Tout problème de sécurité peut nous être signalé à cette adresse.`,
            `Signalement aux autorités : en cas d'incident de sécurité, Bellajour procède aux notifications requises via le portail européen Safety Business Gateway (article 20).`,
            `Rappel : en cas de rappel, les clients concernés sont contactés par e-mail à l'adresse fournie lors de la commande ; le client s'engage à maintenir ses coordonnées à jour.`,
          ] },
        ],
      },
      {
        heading: `5. Accessibilité (Acte européen sur l'accessibilité)`,
        blocks: [
          { kind: 'p', value: `La directive (UE) 2019/882 (« European Accessibility Act »), transposée au Portugal par le Decreto-Lei n.º 82/2022 et la Portaria n.º 220/2023, prévoit une exemption pour les micro-entreprises (moins de 10 personnes et chiffre d'affaires ou bilan annuel inférieur à 2 millions d'euros).` },
          { kind: 'p', value: `Bellajour relève de cette catégorie et est, à ce titre, exemptée des obligations d'accessibilité prévues par cet acte.` },
          { kind: 'p', value: `Bellajour s'attache néanmoins, dans le cadre d'une obligation de moyens (et non de résultat), à améliorer progressivement l'accessibilité de son site. Toute difficulté d'accès peut être signalée à contact@bellajour.com ; nous nous efforçons d'y répondre dans un délai raisonnable.` },
        ],
      },
      {
        heading: `6. Droit de libre résolution et son exception`,
        blocks: [
          { kind: 'p', value: `Pour les contrats à distance, le consommateur dispose en principe d'un droit de libre résolution de 14 jours (article 10.º du DL 24/2014).` },
          { kind: 'p', value: `Toutefois, conformément à l'article 17.º, n.º 1, alinéa c), du DL 24/2014, ce droit ne s'applique pas aux biens manifestement personnalisés — ce qui est le cas des albums Bellajour, confectionnés à partir de vos photos et d'une couverture créée pour vous seul.` },
          { kind: 'p', value: `Cette exception prend effet au moment précis de la validation de la maquette, matérialisée par une case à cocher dédiée et horodatée :` },
          { kind: 'list', items: [
            `avant cette validation, votre commande n'est pas définitive et l'acompte versé est intégralement remboursable (sans frais ni pénalité) ;`,
            `à compter de cette validation, la commande est définitive et non résiliable.`,
          ] },
          { kind: 'p', value: `Le détail de ce mécanisme figure à l'article 8 des Conditions Générales de Vente, auquel il est renvoyé.` },
        ],
      },
      {
        heading: `7. Informations précontractuelles`,
        blocks: [
          { kind: 'p', value: `Conformément à l'article 4.º du DL 24/2014, les informations précontractuelles essentielles sont mises à votre disposition avant la commande :` },
          { kind: 'list', items: [
            `Caractéristiques essentielles du produit : voir la Fiche produit (format, reliure, pagination, impression, fichiers acceptés).`,
            `Prix : affichés en euros, toutes taxes comprises, selon la grille tarifaire de la Fiche produit ; le régime de TVA et les modalités de facturation figurent à l'article 4 des CGV.`,
            `Acompte, crédit (Instants) et prévente : article 5 des CGV.`,
            `Modalités de paiement : par carte via Stripe (authentification forte SCA / 3-D Secure 2) — article 7 des CGV.`,
            `Livraison et délai : article 10 des CGV (le délai est porté à votre connaissance avant la commande).`,
            `Transfert du risque : à la réception physique du bien — article 10 des CGV.`,
            `Droit de libre résolution et son exception : voir le §6 ci-dessus et l'article 8 des CGV.`,
            `Garanties légales : garantie de conformité de 3 ans, présomption de 2 ans, droit de rejet de 30 jours (DL n.º 84/2021) — article 9 des CGV.`,
            `Durée et exécution du contrat : la commande est exécutée jusqu'à la livraison de l'album et la mise à disposition du fichier HD.`,
          ] },
          { kind: 'p', value: `Les Conditions Générales de Vente et la Fiche produit font partie intégrante de la relation contractuelle et prévalent pour le détail des points ci-dessus.` },
        ],
      },
      {
        heading: `8. Propriété intellectuelle`,
        blocks: [
          { kind: 'p', value: `La marque « Bellajour », le nom de domaine, la charte graphique, les textes, l'interface, ainsi que le style des couvertures illustrées générées par IA et la mise en page des albums, sont la propriété de MISTÉRIO HERMÉTICO, LDA ou font l'objet d'une autorisation d'usage.` },
          { kind: 'p', value: `Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite.` },
          { kind: 'p', value: `Les photographies fournies par le client demeurent la propriété de celui-ci ; il garantit en détenir tous les droits (CGV, article 3).` },
        ],
      },
      {
        heading: `9. Données personnelles`,
        blocks: [
          { kind: 'p', value: `Le traitement des données personnelles (y compris l'analyse automatisée des photos et la reconnaissance des visages) est décrit dans la Politique de confidentialité (RGPD, articles 13 et 14).` },
          { kind: 'p', value: `L'autorité de contrôle compétente est la CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt), auprès de laquelle toute réclamation peut être introduite.` },
        ],
      },
      {
        heading: `10. Litiges et règlement alternatif (RAL)`,
        blocks: [
          { kind: 'list', items: [
            `Réclamation directe : contact@bellajour.com.`,
            `Livro de Reclamações Eletrónico : https://www.livroreclamacoes.pt (obligatoire — lien en pied de page).`,
            `Entités de RAL portugaises (Lei 144/2015) : Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) ou, pour les zones non couvertes par un centre régional, le CNIACC (www.cniacc.pt). L'information est obligatoire ; l'adhésion de Bellajour est facultative.`,
            `Droit applicable : droit portugais, sous réserve des dispositions impératives plus protectrices de la loi de résidence du consommateur (Règlement Rome I, article 6). Le consommateur peut saisir les tribunaux de son pays de résidence.`,
          ] },
        ],
      },
    ],
  },
}
