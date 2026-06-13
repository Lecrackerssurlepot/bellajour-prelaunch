import type { LocalizedDoc } from '../types'

/* CONDITIONS GÉNÉRALES DE VENTE — transcription fidèle de
   legal-source/cgv/FR/CONDITIONS GÉNÉRALES DE VENTE — BELLAJOUR.docx (v2.5).
   Annexe « Fiche produit » (legal-source/cgv/FR/FICHE PRODUIT …docx) intégrée en
   dernière section, id='fiche-produit'. Le lien interne de l'article 3.1 pointe
   dessus (#fiche-produit) — UNIQUEMENT cette occurrence.
   EN / PT : sources présentes dans legal-source/cgv/{EN,PT} — à brancher plus tard. */

export const CGV: LocalizedDoc = {
  fr: {
    title: `Conditions générales de vente`,
    lastUpdated: `Version 2.5 — En vigueur le 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Traduction française à titre informatif. La version juridiquement prévalente est le texte portugais ; en cas de divergence, ce dernier prime.`,
    ],
    sections: [
      {
        heading: `Préambule — Qui nous sommes`,
        blocks: [
          { kind: 'p', value: `Bellajour est une marque exploitée par MISTÉRIO HERMÉTICO, LDA, société par quotas de droit portugais, au capital de 1 000 € entièrement libéré, immatriculée à la Conservatória do Registo Comercial d'Odivelas sous le NIPC 519443284, dont le siège est situé Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbonne (freguesia de Santa Maria Maior), numéro d'identification TVA PT519443284 (ci-après « Bellajour », « nous »). Contact : contact@bellajour.com.` },
          { kind: 'p', value: `Bellajour se définit comme une maison d'édition du souvenir : nous n'imprimons pas un livre photo, nous éditons votre histoire. Devise : « Vivez, nous composons. » Chaque album est un livre relié unique, doté d'une couverture illustrée créée spécifiquement pour vous et d'une mise en page composée pour vos seuls souvenirs. Ce caractère sur-mesure est au cœur des présentes conditions et fonde l'exception au droit de libre résolution (voir article 8).` },
        ],
      },
      {
        heading: `Article 1 — Objet et champ d'application`,
        blocks: [
          { kind: 'p', value: `1.1 Les présentes Conditions Générales de Vente (« Conditions ») régissent toute commande passée par un consommateur sur le site bellajour.fr et l'application future de Bellajour.` },
          { kind: 'p', value: `1.2 Elles s'appliquent à la vente d'albums photo fortement personnalisés et de leurs composantes : l'album physique relié, la couverture illustrée générée sur mesure, la mise en page composée par notre moteur algorithmique sous contrôle humain et le fichier numérique haute définition (« version digitale HD »), inclus pour toutes les commandes.` },
          { kind: 'p', value: `1.3 Le système de points internes « Instants » est régi par les présentes Conditions et, le cas échéant, par des conditions spécifiques affichées sur le site.` },
          { kind: 'p', value: `1.4 Toute commande implique l'acceptation intégrale des Conditions dans leur version en vigueur à la date de la commande (voir article 13).` },
          { kind: 'p', value: `Renvoi : pour le traitement de vos données personnelles et de vos photos, voir notre Politique de confidentialité (RGPD, art. 13 et 14), partie intégrante de la relation contractuelle.` },
        ],
      },
      {
        heading: `Article 2 — Capacité et compte client`,
        blocks: [
          { kind: 'p', value: `2.1 Âge. Le client déclare être âgé d'au moins 18 ans (majorité au Portugal) et disposer de la pleine capacité juridique pour contracter. Toute commande passée par un mineur est annulable (anulável, article 125.º du Código Civil).` },
          { kind: 'p', value: `2.2 Le client garantit l'exactitude des informations fournies lors de la création de son compte et de la commande.` },
        ],
      },
      {
        heading: `Article 3 — Produits, personnalisation et traitement automatisé des photos`,
        blocks: [
          {
            kind: 'p',
            value: [
              `3.1 Description. L'album Bellajour est un livre relié à couverture rigide, imprimé en haute définition au format A4 portrait, comprenant une couverture illustrée unique (générée par IA), une mise en page composée par algorithme sous contrôle humain, et une version digitale HD incluse. Les caractéristiques techniques détaillées (format, pagination, papier, finitions) et la grille tarifaire par palier de pages figurent dans la `,
              { text: `Fiche produit`, href: `#fiche-produit` },
              `, document annexé aux présentes et reproduit en annexe ci-dessous. Ce document fait partie intégrante du contrat dans sa version en vigueur à la date de la commande (art. 13).`,
            ],
          },
          { kind: 'p', value: `3.2 Traitement automatisé des photos. Pour composer votre album, vos photos font l'objet d'une analyse automatisée : tri, sélection, scoring de qualité et mise en page. Ces étapes ne reposent pas sur une identification des personnes. Une étape distincte — le regroupement des photos par personne, au moyen d'une reconnaissance des visages, qui permet l'étape de « Casting » (hiérarchisation et mise en avant des personnes clés) — constitue un traitement de données biométriques (article 9 du RGPD) soumis à votre consentement explicite et distinct, recueilli avant l'analyse. Ce consentement est facultatif : en son absence, le regroupement par personne et le Casting ne sont pas réalisés, et votre album est composé à partir des seules autres étapes. Les modalités de ce consentement, la possibilité de le refuser, la logique générale, la finalité et vos droits sont décrits dans la Politique de confidentialité. Cette composition ne constitue pas une décision exclusivement automatisée produisant des effets juridiques au sens de l'article 22 du RGPD, le client gardant le contrôle puisqu'il valide la maquette finale. Le moteur de Bellajour n'est pas, à la date des présentes, classé comme système d'IA à haut risque au sens du Règlement (UE) 2024/1689 (Règlement IA) ; il met en œuvre une catégorisation biométrique soumise à une obligation de transparence, satisfaite par la présente information et par la Politique de confidentialité.` },
          { kind: 'p', value: `3.3 Droits sur le contenu. Le client garantit détenir l'ensemble des droits sur les photos transmises (droit à l'image des personnes représentées, y compris l'autorité parentale pour les mineurs photographiés ; droits de propriété intellectuelle). En cas de réclamation d'un tiers relative au contenu fourni, le client garantit et indemnise Bellajour de toute conséquence.` },
        ],
      },
      {
        heading: `Article 4 — Prix, TVA et facturation`,
        blocks: [
          { kind: 'p', value: `4.1 Prix toutes taxes comprises. Les prix sont affichés en euros, toutes taxes comprises. Le prix de l'album dépend du palier de pagination choisi, selon la grille tarifaire figurant dans la Fiche produit. Le nombre de pages est défini sur mesure.` },
          { kind: 'p', value: `4.2 Transparence — pas de frais cachés. Le prix TTC affiché avant validation est complet ; aucun coût n'est ajouté après la validation de la commande. Hors prévente, les frais de port éventuels sont indiqués clairement avant la validation de la commande. Dans le cadre de la prévente, les frais de port sont offerts.` },
          { kind: 'p', value: `4.3 Régime de TVA. Bellajour relève du régime normal de TVA au Portugal. Pour les ventes aux consommateurs (B2C) :` },
          { kind: 'list', items: [
            `tant que le seuil de 10 000 € annuels de ventes à distance intracommunautaires n'est pas dépassé, la TVA portugaise au taux normal en vigueur s'applique (23 % au Portugal continental ; 22 % à Madère ; 16 % aux Açores) ;`,
            `au-delà de ce seuil, la TVA du pays de résidence du consommateur s'applique, déclarée par Bellajour via le régime du guichet unique (OSS-Union) ou, le cas échéant, par immatriculation directe dans l'État membre concerné.`,
          ] },
          { kind: 'p', value: `Le taux effectivement appliqué à chaque commande figure sur la facture.` },
          { kind: 'p', value: `4.4 Exigibilité et facturation de l'acompte. La TVA est exigible à l'encaissement, y compris à l'encaissement de l'acompte. À l'encaissement de l'acompte, une facture est émise avec le descriptif « Acompte sur la commande [n°] » pour le montant effectivement versé. En cas de remboursement, une note de crédit est émise (jamais de facture négative). Les documents sont émis via un logiciel de facturation certifié par l'Administration fiscale, avec ATCUD et code QR.` },
          { kind: 'p', value: `4.5 Erreur manifeste de prix. Une commande à prix manifestement erroné (erreur d'affichage grossière) peut être annulée par Bellajour ; le client est informé et intégralement remboursé.` },
          { kind: 'p', value: `4.6 Règle Omnibus. En cas d'annonce de réduction de prix, le prix de référence affiché est le plus bas pratiqué au cours des 30 derniers jours (DL 109-G/2021).` },
        ],
      },
      {
        heading: `Article 5 — Commande, prévente, acompte et crédit (Instants)`,
        blocks: [
          { kind: 'p', value: `5.1 Formation du contrat. La commande est conclue lorsque le client valide son paiement après acceptation des présentes Conditions. Un e-mail de confirmation récapitule la commande.` },
          { kind: 'p', value: `5.2 Nature du versement initial (acompte). La somme versée à la réservation (Fondateur : 25 € ; Standard : 30 € ; Code influenceur : 25 €) est un acompte — paiement partiel anticipé imputé sur le prix total. Elle ne constitue pas un sinal (arrhes) au sens des articles 440.º à 442.º du Código Civil : aucune partie ne peut s'en prévaloir à titre de pénalité et sa remise n'emporte aucun effet de double restitution.` },
          { kind: 'p', value: `5.3 Conversion en crédit (Instants). Dès son encaissement, l'acompte est immédiatement converti en crédit (Instants) porté sur le compte du client rattaché à son adresse e-mail, à hauteur de 30 € quelle que soit l'offre. Ce crédit de 30 € est un avantage commercial, et non un paiement : seul le montant effectivement versé au titre de l'acompte (25 € ou 30 € selon l'offre) fait l'objet d'un encaissement et d'une facture ; la fraction de bonus (5 € pour les offres Fondateur et influenceur) constitue une remise commerciale conditionnelle, jamais encaissée et non facturée. Ce crédit : (i) est nominatif et non cessible ; (ii) n'est pas remboursable en numéraire, sauf dans les conditions prévues aux articles 5.4 et 8.2 ; (iii) expire 12 mois après son attribution ; (iv) s'impute sur le prix de la commande finale. Les offres et codes ne sont pas cumulables entre eux.` },
          { kind: 'p', value: `5.4 Réserve impérative de remboursement (avant la maquette). Par exception au caractère non remboursable du crédit, et conformément aux articles 10.º et 12.º du DL 24/2014, le client qui en fait la demande expresse avant la validation de sa maquette obtient le remboursement en numéraire de l'acompte effectivement versé (voir article 8). Cette faculté disparaît à la validation de la maquette.` },
          { kind: 'p', value: `5.5 Acompte non finalisé — expiration du crédit. Si le client ne valide jamais sa maquette, le crédit demeure utilisable jusqu'à son expiration (12 mois). Bellajour adresse une relance par e-mail avant l'échéance. Le délai de 12 mois est suspendu pendant toute période où l'impossibilité d'utiliser le crédit est imputable à Bellajour (notamment retard dans la mise à disposition de la maquette). À l'expiration, le crédit non utilisé est perdu, sans qu'aucune somme ne reste due à titre de pénalité, et sous réserve de la faculté de remboursement du 5.4 exercée en temps utile.` },
          { kind: 'p', value: `5.6 Régimes d'offres. Les conditions spécifiques de chaque offre — dont les dates et heures exactes d'ouverture et de clôture — figurent sur la page de l'offre concernée ; Bellajour conserve une copie horodatée des conditions de chaque offre (article 8.6). Les principales offres sont les suivantes :` },
          { kind: 'list', items: [
            `Offre Fondateur (places #1 à #100) : ouverte du 13 juin au 15 août 2026, limitée à 100 places. Acompte de 25 €, converti en crédit de 30 €. Les Fondateurs ouvrent la prévente deux jours avant l'offre Standard. Bonus acquis à la validation de la maquette : couverture illustrée, 200 Instants et livraison offerte.`,
            `Offre Standard : ouverte du 15 juin au 15 août 2026, sans quota. Acompte de 30 €, converti en crédit de 30 €. Bonus : 100 Instants et livraison offerte.`,
            `Code influenceur : ouvert du 15 juin au 15 août 2026. Acompte de 25 €, converti en crédit de 30 € (remise effective de 5 €). La commission éventuellement versée à l'influenceur n'est pas supportée par le client.`,
            `Parrainage : à compter du 15 août 2026. Le parrainage donne 5 pages offertes au parrain et 3 pages offertes au filleul. Ces pages sont mises en attente sur le compte dès l'inscription et définitivement acquises lorsque les deux acomptes ont été versés et ne sont plus remboursables (c'est-à-dire après validation de la maquette de chacun). Tant que cette condition n'est pas remplie, les pages restent en attente ; elles sont annulées si l'un des deux acomptes est remboursé.`,
          ] },
          { kind: 'p', value: `Le fichier digital HD est inclus pour toutes les offres.` },
        ],
      },
      {
        heading: `Article 6 — Spécifications techniques du contenu fourni par le client`,
        blocks: [
          { kind: 'p', value: `6.1 Le client fournit des photographies conformes aux spécifications affichées (résolution minimale, formats acceptés, marges de coupe) détaillées dans la Fiche produit. Le rendu de l'album est apprécié au regard de ces spécifications.` },
          { kind: 'p', value: `6.2 Ne constituent pas un défaut : (i) les écarts colorimétriques entre l'affichage écran (RVB rétroéclairé) et l'impression papier (CMJN), dans les tolérances normales du procédé ; (ii) les limites de rendu imputables à un fichier source non conforme (faible résolution, compression, flou).` },
          { kind: 'p', value: `6.3 Le client est seul responsable des photographies qu'il transmet et garantit en détenir tous les droits (article 3.3).` },
        ],
      },
      {
        heading: `Article 7 — Paiement`,
        blocks: [
          { kind: 'p', value: `7.1 Prestataire. Les paiements sont traités par Stripe, certifié PCI-DSS. Bellajour ne conserve aucune donnée de carte.` },
          { kind: 'p', value: `7.2 Authentification forte (SCA / 3-D Secure 2). Conformément à la DSP2, le paiement peut requérir une authentification forte auprès de la banque du client.` },
          { kind: 'p', value: `7.3 Impayé du solde. En cas de défaut de paiement du solde après validation de la maquette, Bellajour peut suspendre la production puis, après relance restée sans suite, résoudre la commande. Dans ce cas, l'acompte est retenu uniquement à hauteur des coûts effectivement et justifiablement engagés (notamment la conception de la maquette validée), de manière proportionnée et sans excéder le montant de l'acompte ; tout surplus éventuel est remboursé. Cette stipulation est sans préjudice de l'article 8.` },
          { kind: 'p', value: `7.4 Chargebacks. Toute contestation de paiement (chargeback) infondée, portant sur une commande dont la maquette a été validée (commande définitive — article 8), pourra être contestée par Bellajour auprès de Stripe sur la base des présentes Conditions et de l'horodatage de la validation.` },
        ],
      },
      {
        heading: `Article 8 — Droit de libre résolution et son exception`,
        blocks: [
          { kind: 'p', value: `8.1 Principe. Pour les contrats à distance, le consommateur dispose en principe d'un droit de libre résolution de 14 jours, sans motif (article 10.º du DL 24/2014).` },
          { kind: 'p', value: `8.2 Avant la validation de la maquette — remboursement intégral. Tant que le client n'a pas validé sa maquette, la commande n'est pas définitive. Quel que soit l'état d'avancement (téléversement des photos compris), il peut demander le remboursement en numéraire de l'acompte effectivement versé, à 100 %, sans retenue, sans frais et sans pénalité, par exception au caractère non remboursable du crédit (5.3). Le droit de résolution est ouvert par l'article 10.º du DL 24/2014 et ses effets (remboursement) sont régis par l'article 12.º du même décret-loi. Cette faculté peut être exercée tant que la maquette n'a pas été validée et que le crédit n'a pas expiré (article 5.5) ; la plus proche de ces deux échéances prévaut.` },
          { kind: 'p', value: `8.3 Exception de personnalisation et sa cristallisation. Conformément à l'article 17.º, n.º 1, alinéa c), du DL 24/2014 (transposant la directive 2011/83/UE), le droit de libre résolution ne s'applique pas aux biens confectionnés selon les spécifications du consommateur ou manifestement personnalisés. Pour l'album Bellajour, cette exception prend effet au moment précis de la validation de la maquette par le client, matérialisée par une case à cocher dédiée et horodatée, par laquelle le client : (i) reconnaît que son album est confectionné selon ses spécifications ; (ii) reconnaît expressément perdre son droit de libre résolution ; (iii) demande le lancement de la production. À compter de cette validation, la commande est définitive et non résiliable, et plus aucun remboursement (numéraire ou crédit) n'est dû à ce titre, sous réserve des garanties légales (article 9) et de la défaillance de Bellajour (articles 8.7 et 12).` },
          { kind: 'p', value: `8.4 Maquette validée = référence contractuelle. La maquette validée et horodatée constitue la référence de la commande. Toute appréciation de conformité de l'album livré s'effectue par comparaison avec cette maquette validée, à l'exclusion de toute attente subjective non reflétée dans la maquette.` },
          { kind: 'p', value: `8.5 Information préalable. La perte du droit de libre résolution est portée à la connaissance du client de façon claire et lisible, dans un encadré distinct, dès la page de l'offre et dans le récapitulatif précédant le bouton « Commander avec obligation de paiement », conformément à l'article 4.º, n.º 1, alinéa n), du DL 24/2014. À défaut d'information préalable, l'exception n'est pas opposable.` },
          { kind: 'p', value: `8.6 Preuve. Bellajour conserve, pendant 10 ans (Código Comercial, article 40.º), les éléments de preuve : version des Conditions acceptée et horodatage de l'acceptation à l'acompte, horodatage du téléversement, horodatage et version de la validation de la maquette, et identifiant de transaction Stripe.` },
          { kind: 'p', value: `8.7 Montant et défaillance de Bellajour. Le remboursement porte sur le montant effectivement versé (Fondateur 25 € ; influenceur 25 €) ; les bonifications jamais décaissées (5 €) ne sont pas remboursables. Si Bellajour ne peut produire ou livrer (défaillance interne, défaillance de l'imprimeur partenaire, force majeure, cessation d'activité), toute somme versée est intégralement remboursée en numéraire sur le moyen de paiement initial, au plus tard 14 jours après acceptation de la demande ou constatation de la défaillance (article 12.º du DL 24/2014). Sur le plan comptable, ce remboursement donne lieu à l'émission d'une note de crédit annulant la facture d'acompte ; la note de crédit est un document comptable et non un mode de remboursement se substituant au versement en numéraire.` },
          { kind: 'p', value: `8.8 Versioning. La version des présentes Conditions opposable au client est celle qu'il a acceptée à la commande ; pour les préventes Fondateurs, celle acceptée au versement de l'acompte. Toute modification ultérieure est sans effet rétroactif sur sa commande.` },
        ],
      },
      {
        heading: `Article 9 — Garanties légales`,
        blocks: [
          { kind: 'p', value: `9.1 Garantie de conformité — 3 ans (DL n.º 84/2021, article 12.º, n.º 1), à compter de la livraison.` },
          { kind: 'p', value: `9.2 Présomption — 2 ans (article 13.º) : pendant 24 mois, c'est à Bellajour de prouver la conformité.` },
          { kind: 'p', value: `9.3 Droit de rejet (rejeição) — 30 jours : substitution ou résolution immédiates, sans condition. Ce délai court à compter de la livraison ou, pour un défaut non apparent à la réception, de la date à laquelle il est ou aurait raisonnablement dû être constaté (DL 84/2021).` },
          { kind: 'p', value: `9.4 Hiérarchie des remèdes. En cas de non-conformité, le client a droit, en premier lieu, à la remise en conformité par réparation ou remplacement (réimpression) ; subsidiairement, à la réduction du prix ou à la résolution, lorsque la réimpression est impossible ou disproportionnée, ou lorsqu'elle échoue, se répète ou n'est pas réalisée dans un délai raisonnable. Délai de remise en conformité : 30 jours, sauf complexité particulière.` },
          { kind: 'p', value: `9.5 Non-renonciation : toute clause contraire est réputée non écrite.` },
          { kind: 'p', value: `9.6 Les garanties s'appliquent indépendamment de l'exception au droit de libre résolution (article 8).` },
        ],
      },
      {
        heading: `Article 10 — Livraison, transfert du risque et sécurité du produit (GPSR)`,
        blocks: [
          { kind: 'p', value: `10.1 Livraison à l'adresse indiquée par le client. La fabrication est confiée à un imprimeur partenaire établi dans l'Union européenne, sans que cette sous-traitance n'altère la responsabilité de Bellajour envers le client. Le délai de livraison court à compter de la validation de la maquette ; il est porté à la connaissance du client avant la commande (estimation : 10 à 15 jours ouvrés selon la charge de production) et n'excède pas 30 jours, sauf accord exprès du client, conformément à l'article 9.º du DL 24/2014.` },
          { kind: 'p', value: `10.2 Transfert du risque. Les risques de perte ou de détérioration sont transférés au consommateur au moment de la réception physique du bien (par lui ou par un tiers qu'il désigne, distinct du transporteur), conformément à l'article 20 de la directive 2011/83/UE et au DL 24/2014. Le risque n'est jamais transféré à la remise au transporteur.` },
          { kind: 'p', value: `10.3 Achat-cadeau : le consommateur au sens des présentes Conditions est l'acheteur, qui exerce les garanties et reçoit les communications, même si l'album est livré à un tiers bénéficiaire.` },
          { kind: 'p', value: `10.4 Livraisons hors UE : des droits de douane et taxes à l'importation peuvent s'appliquer à la charge du destinataire, selon les règles du pays de destination.` },
          { kind: 'p', value: `10.5 Fabricant et traçabilité (GPSR). Au sens du Règlement (UE) 2023/988, Bellajour, qui commercialise l'album sous sa marque, conserve la qualité de fabricant (articles 3, §8, et 13.1) et est elle-même la personne responsable établie dans l'UE (article 16) ; les obligations de l'article 9 du Règlement ne sont pas délégables, l'imprimeur partenaire intervenant comme sous-traitant de production. Chaque album est identifié par son numéro de commande, figurant sur la fiche de livraison. En cas de rappel ou d'alerte de sécurité, Bellajour contacte les clients concernés à l'adresse e-mail fournie lors de la commande ; le client s'engage à maintenir ses coordonnées à jour.` },
        ],
      },
      {
        heading: `Article 11 — Responsabilité et sécurité des contenus`,
        blocks: [
          { kind: 'p', value: `11.1 Bellajour est responsable des dommages directs et prévisibles résultant d'un manquement avéré à ses obligations.` },
          { kind: 'p', value: `11.2 Dans les limites permises par la loi, Bellajour exclut sa responsabilité pour les dommages indirects (perte de revenus ou de données, manque à gagner). Cette limitation ne s'applique pas aux dommages corporels, ni en cas de dol ou de faute lourde.` },
          { kind: 'p', value: `11.3 Sécurité et stockage des contenus. Les photos transmises et le fichier HD sont stockés sur une infrastructure située dans l'Union européenne ; aucun transfert hors UE n'a lieu au titre du stockage. La reconnaissance des visages est également effectuée au sein de l'UE. En revanche, certaines opérations de traitement (analyse et génération de la couverture illustrée) font appel à des prestataires établis aux États-Unis ; ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne (et, le cas échéant, le Data Privacy Framework lorsque le prestataire est certifié). Les mesures de sécurité et la liste à jour des prestataires figurent dans la Politique de confidentialité, à laquelle il est expressément renvoyé.` },
        ],
      },
      {
        heading: `Article 12 — Force majeure, indisponibilité et rappel de sécurité`,
        blocks: [
          { kind: 'p', value: `12.1 Force majeure. Bellajour n'est pas responsable d'un manquement résultant d'un cas de force majeure, c'est-à-dire un événement extérieur, imprévisible et irrésistible échappant à son contrôle (notamment catastrophe naturelle, pénurie générale de matières premières, incident technique majeur d'un fournisseur d'infrastructure, conflit armé). Les délais sont suspendus pendant l'empêchement. Si celui-ci se prolonge au-delà de 60 jours ou rend l'exécution définitivement impossible, chaque partie peut résoudre la commande ; les sommes versées sont alors intégralement remboursées, sans autre indemnité. La défaillance de l'imprimeur partenaire, choisi par Bellajour, n'est pas un cas de force majeure ; elle est traitée à l'article 8.7 (remboursement intégral).` },
          { kind: 'p', value: `12.2 Indisponibilité. Si un format ou produit devient indisponible de façon définitive et non substituable après la commande, Bellajour rembourse le client ; aucune substitution n'est imposée sans son accord.` },
          { kind: 'p', value: `12.3 Rappel de sécurité (GPSR). En cas de rappel au titre du Règlement (UE) 2023/988, Bellajour contacte les clients concernés par e-mail et publie l'information sur son site ; les modalités (retour, remplacement, remboursement) sont définies au cas par cas conformément aux obligations légales.` },
        ],
      },
      {
        heading: `Article 13 — Versions, droit applicable et litiges`,
        blocks: [
          { kind: 'p', value: `13.1 Version opposable : celle acceptée à la date de la commande. Les préventes Fondateurs demeurent régies par la version acceptée au versement de l'acompte. Toute modification ultérieure est sans effet rétroactif.` },
          { kind: 'p', value: `13.2 Évolution du catalogue. Bellajour peut faire évoluer son offre (nouveaux styles, application mobile, produits complémentaires) sans engager rétroactivement les clients ayant déjà commandé ; les Instants et crédits restent valables dans les conditions de leur acquisition.` },
          { kind: 'p', value: `13.3 Droit applicable : droit portugais, sous réserve des dispositions impératives plus protectrices de la loi de la résidence habituelle du consommateur (Règlement Rome I, article 6).` },
          { kind: 'p', value: `13.4 Juridiction : le consommateur peut saisir les tribunaux de son pays de résidence.` },
          { kind: 'p', value: `13.5 Réclamations et règlement alternatif des litiges (RAL). Avant toute action, le client peut adresser une réclamation à contact@bellajour.com. Il peut également : utiliser le Livro de Reclamações Eletrónico (https://www.livroreclamacoes.pt) ; saisir une entité de RAL portugaise (Lei 144/2015), notamment le Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) — centre territorialement compétent pour le siège de Bellajour — ou, pour les zones non couvertes par un centre régional, le CNIACC (www.cniacc.pt). L'information est obligatoire ; l'adhésion de Bellajour est facultative.` },
          { kind: 'p', value: `13.6 Nullité partielle : si une clause est jugée nulle, les autres demeurent en vigueur.` },
          { kind: 'p', value: `13.7 Renvoi RGPD et cookies : le traitement des données personnelles est décrit dans la Politique de confidentialité (RGPD, articles 13 et 14) et l'usage des cookies dans la Politique cookies, accessible via le bandeau de consentement du site. Ces documents font partie intégrante de la relation contractuelle.` },
        ],
      },
      {
        heading: `Annexe — Fiche produit (Album Bellajour au Lancement, offre de base)`,
        id: `fiche-produit`,
        blocks: [
          { kind: 'h3', text: `Caractéristiques techniques` },
          { kind: 'table', columns: [`Paramètre`, `Valeur`], rows: [
            [`Type`, `Livre photo relié, imprimé à la commande`],
            [`Format`, `A4 portrait — 210 × 297 mm`],
            [`Reliure`, `Couverture rigide (hardcover)`],
            [`Pagination de base`, `30 pages`],
            [`Pagination min. / max.`, `30 pages min. — 200 pages max. (nombre de pages pair obligatoire)`],
            [`Couverture`, `Illustrée, unique, générée par IA dans un style propre à la marque`],
            [`Impression`, `Quadrichromie, 300 DPI, profil colorimétrique FOGRA 39`],
          ] },
          { kind: 'h3', text: `Ce que comprend l'offre de base` },
          { kind: 'list', items: [
            `L'album physique relié (livre, composé à partir de vos photos)`,
            `La couverture illustrée sur mesure`,
            `La mise en page composée par algorithme nourri des retours clients, avec intervention humaine`,
            `La version digitale HD (fichier numérique haute définition de votre album, inclus)`,
          ] },
          { kind: 'h3', text: `Spécifications des fichiers fournis par le client` },
          { kind: 'p', value: `Résolution minimum : 800 × 800 pixels. En deçà du seuil, la photo est rejetée ou rétrogradée vers un emplacement plus petit. Un écart colorimétrique normal existe entre l'affichage écran (RVB) et l'impression papier ; il ne constitue pas un défaut.` },
          { kind: 'p', value: `Formats de fichiers acceptés : JPEG, PNG, HEIC, HEIF, WebP.` },
          { kind: 'h3', text: `Grille tarifaire — Album Bellajour Lancement (offre de base)` },
          { kind: 'p', value: `Prix catalogue standard, hors offre promotionnelle. Prix affichés en euros, toutes taxes comprises. TVA appliquée au taux du pays de résidence du consommateur (régime OSS-Union) après le seuil des 10 000 € de chiffre d'affaires.` },
          { kind: 'table', columns: [`Pagination`, `Prix TTC`], rows: [
            [`30 pages (base)`, `64 €`],
            [`50 pages`, `82 €`],
            [`80 pages`, `120 €`],
            [`100 pages`, `146 €`],
            [`150 pages`, `211 €`],
          ] },
        ],
      },
    ],
  },
}
