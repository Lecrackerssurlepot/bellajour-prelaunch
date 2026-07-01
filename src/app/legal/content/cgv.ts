import type { LocalizedDoc } from '../types'

/* CONDITIONS GÉNÉRALES DE VENTE — transcription fidèle de
   legal-source/cgv/FR/CONDITIONS GÉNÉRALES DE VENTE — BELLAJOUR.docx (v2.5).
   Annexe « Fiche produit » (legal-source/cgv/FR/FICHE PRODUIT …docx) intégrée en
   dernière section, id='fiche-produit'. Le lien interne de l'article 3.1 pointe
   dessus (#fiche-produit) — UNIQUEMENT cette occurrence.
   PT : transcription fidèle de legal-source/cgv/PT/{CONDIÇÕES GERAIS DE VENDA,
   FICHA DE PRODUTO}.docx (clé `pt` ci-dessous). Deux points signalés à relire :
   - art. 3.1 : la source PT portait « [A COMPLETAR: ligação PDF] » ; aligné sur le
     FR (lien interne #fiche-produit, annexe reproduite en page).
   - art. 4.1 : la source PT contient une phrase dupliquée (copier-coller) ;
     transcrite verbatim, à dédupliquer après validation juridique.
   EN : transcription fidèle de legal-source/cgv/EN/{TERMS AND CONDITIONS OF SALE,
   PRODUCT SHEET}.docx (clé `en` ci-dessous). Mêmes deux points qu'en PT :
   - art. 3.1 : source EN « [TO BE COMPLETED: PDF link] » → aligné FR/PT (#fiche-produit).
   - art. 4.1 : phrase dupliquée dans la source EN → dédupliquée comme le PT (commit a8efedb). */

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
              `3.1 Description. L'album Bellajour est un livre relié à couverture rigide, imprimé en haute définition au format portrait, comprenant une couverture illustrée unique (générée par IA), une mise en page composée par algorithme sous contrôle humain, et une version digitale HD incluse. Les caractéristiques techniques détaillées (format, pagination, papier, finitions) et la grille tarifaire par palier de pages figurent dans la `,
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
            [`Format`, `Portrait — 210 × 280 mm`],
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
            [`30 pages (base)`, `49 €`],
            [`50 pages`, `82 €`],
            [`80 pages`, `120 €`],
            [`100 pages`, `146 €`],
            [`150 pages`, `211 €`],
          ] },
        ],
      },
    ],
  },
  pt: {
    title: `Condições gerais de venda`,
    lastUpdated: `Versão 2.5 — Em vigor em 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Texto de referência (versão portuguesa), juridicamente prevalecente. As traduções para francês e inglês são meramente informativas; em caso de divergência, prevalece o presente texto português.`,
    ],
    sections: [
      {
        heading: `Preâmbulo — Quem somos`,
        blocks: [
          { kind: 'p', value: `A Bellajour é uma marca explorada pela MISTÉRIO HERMÉTICO, LDA, sociedade por quotas de direito português, com o capital social de 1 000 €, integralmente realizado, matriculada na Conservatória do Registo Comercial de Odivelas sob o NIPC 519443284, com sede no Beco de Santa Helena, 21A, 2.º, 1100-117 Lisboa (freguesia de Santa Maria Maior), número de identificação para efeitos de IVA PT519443284 (doravante «Bellajour», «nós»). Contacto: contact@bellajour.com.` },
          { kind: 'p', value: `A Bellajour define-se como uma casa de edição da memória: não imprimimos um livro de fotografias, editamos a sua história. Lema: «Viva, nós compomos.» Cada álbum é um livro encadernado único, com uma capa ilustrada criada especificamente para si e uma paginação composta apenas para as suas memórias. Este carácter à medida está no cerne das presentes condições e fundamenta a exceção ao direito de livre resolução (ver artigo 8.º).` },
        ],
      },
      {
        heading: `Artigo 1.º — Objeto e âmbito`,
        blocks: [
          { kind: 'p', value: `1.1 As presentes Condições Gerais de Venda («Condições») regem qualquer encomenda efetuada por um consumidor no sítio bellajour.fr e na futura aplicação da Bellajour.` },
          { kind: 'p', value: `1.2 Aplicam-se à venda de álbuns de fotografias altamente personalizados e respetivos componentes: o álbum físico encadernado, a capa ilustrada gerada à medida, a paginação composta pelo nosso motor algorítmico sob controlo humano e o ficheiro digital de alta definição («versão digital HD»), incluído em todas as encomendas.` },
          { kind: 'p', value: `1.3 O sistema de pontos internos «Instants» rege-se pelas presentes Condições e, quando aplicável, por condições específicas exibidas no sítio.` },
          { kind: 'p', value: `1.4 Qualquer encomenda implica a aceitação integral das Condições na versão em vigor à data da encomenda (ver artigo 13.º).` },
          { kind: 'p', value: `Remissão: para o tratamento dos seus dados pessoais e das suas fotografias, ver a nossa Política de Privacidade (RGPD, art. 13.º e 14.º), parte integrante da relação contratual.` },
        ],
      },
      {
        heading: `Artigo 2.º — Capacidade e conta de cliente`,
        blocks: [
          { kind: 'p', value: `2.1 Idade. O cliente declara ter pelo menos 18 anos (maioridade em Portugal) e dispor de plena capacidade jurídica para contratar. Qualquer encomenda efetuada por menor é anulável (artigo 125.º do Código Civil).` },
          { kind: 'p', value: `2.2 O cliente garante a exatidão das informações prestadas no registo da conta e na encomenda.` },
        ],
      },
      {
        heading: `Artigo 3.º — Produtos, personalização e tratamento automatizado das fotografias`,
        blocks: [
          {
            kind: 'p',
            value: [
              `3.1 Descrição. O álbum Bellajour é um livro encadernado de capa dura, impresso em alta definição no formato retrato, composto por uma capa ilustrada única (gerada por IA), uma paginação composta por algoritmo sob controlo humano e uma versão digital HD incluída. As características técnicas detalhadas (formato, paginação, papel, acabamentos) e a tabela de preços por escalão de páginas constam da `,
              { text: `Ficha de Produto`, href: `#fiche-produit` },
              `, documento anexo às presentes e reproduzido em anexo abaixo. Este documento faz parte integrante do contrato na versão em vigor à data da encomenda (art. 13.º).`,
            ],
          },
          { kind: 'p', value: `3.2 Tratamento automatizado das fotografias. Para compor o seu álbum, as suas fotografias são objeto de uma análise automatizada: triagem, seleção, classificação de qualidade e paginação. Estas etapas não assentam numa identificação das pessoas. Uma etapa distinta — o agrupamento das fotografias por pessoa, mediante reconhecimento dos rostos, que permite a etapa de «Casting» (hierarquização e destaque das pessoas-chave) — constitui um tratamento de dados biométricos (artigo 9.º do RGPD) sujeito ao seu consentimento explícito e distinto, recolhido antes da análise. Este consentimento é facultativo: na sua ausência, o agrupamento por pessoa e o Casting não são realizados, sendo o seu álbum composto apenas a partir das restantes etapas. As modalidades deste consentimento, a possibilidade de o recusar, a lógica geral, a finalidade e os seus direitos constam da Política de Privacidade. Esta composição não constitui uma decisão exclusivamente automatizada com efeitos jurídicos na aceção do artigo 22.º do RGPD, mantendo o cliente o controlo, uma vez que valida a maquete final. O motor da Bellajour não se encontra, à data das presentes, classificado como sistema de IA de risco elevado na aceção do Regulamento (UE) 2024/1689 (Regulamento da IA); aplica todavia uma categorização biométrica sujeita a uma obrigação de transparência, satisfeita pela presente informação e pela Política de Privacidade.` },
          { kind: 'p', value: `3.3 Direitos sobre o conteúdo. O cliente garante deter todos os direitos sobre as fotografias transmitidas (direito à imagem das pessoas retratadas, incluindo a autoridade parental quanto a menores fotografados; direitos de propriedade intelectual). Em caso de reclamação de terceiro relativa ao conteúdo fornecido, o cliente garante e indemniza a Bellajour por qualquer consequência.` },
        ],
      },
      {
        heading: `Artigo 4.º — Preços, IVA e faturação`,
        blocks: [
          { kind: 'p', value: `4.1 Preços com impostos incluídos. Os preços são exibidos em euros, com todos os impostos incluídos. O preço do álbum depende do escalão de paginação escolhido, de acordo com a grelha tarifária constante da Ficha de Produto. O número de páginas é definido à medida.` },
          { kind: 'p', value: `4.2 Transparência — sem custos ocultos. O preço com impostos exibido antes da validação é completo; nenhum custo é acrescentado após a validação da encomenda. Fora do período de pré-venda, os portes eventuais são indicados claramente antes da validação da encomenda. No âmbito da pré-venda, os portes são oferecidos.` },
          { kind: 'p', value: `4.3 Regime de IVA. A Bellajour encontra-se enquadrada no regime normal de IVA em Portugal. Para as vendas a consumidores (B2C):` },
          { kind: 'list', items: [
            `enquanto não for ultrapassado o limiar de 10 000 € anuais de vendas à distância intracomunitárias, aplica-se o IVA português à taxa normal em vigor (23 % no Continente; 22 % na Madeira; 16 % nos Açores);`,
            `a partir desse limiar, aplica-se o IVA do país de residência do consumidor, declarado pela Bellajour através do regime do balcão único (OSS-União) ou, se for caso disso, mediante registo direto no Estado-Membro em causa.`,
          ] },
          { kind: 'p', value: `A taxa efetivamente aplicada a cada encomenda consta da fatura.` },
          { kind: 'p', value: `4.4 Exigibilidade e faturação do adiantamento. O IVA é exigível no momento do recebimento, incluindo no recebimento do adiantamento. No recebimento do adiantamento é emitida uma fatura com o descritivo «Adiantamento sobre a encomenda [n.º]», pelo montante efetivamente pago. Em caso de reembolso, é emitida uma nota de crédito (nunca uma fatura negativa). Os documentos são emitidos através de programa de faturação certificado pela Autoridade Tributária, com ATCUD e código QR.` },
          { kind: 'p', value: `4.5 Erro manifesto de preço. Uma encomenda a preço manifestamente errado (lapso grosseiro de exibição) pode ser anulada pela Bellajour; o cliente é informado e integralmente reembolsado.` },
          { kind: 'p', value: `4.6 Regra Omnibus. Em caso de anúncio de redução de preço, o preço de referência exibido é o mais baixo praticado nos últimos 30 dias (DL 109-G/2021).` },
        ],
      },
      {
        heading: `Artigo 5.º — Encomenda, pré-venda, adiantamento e crédito (Instants)`,
        blocks: [
          { kind: 'p', value: `5.1 Formação do contrato. A encomenda conclui-se quando o cliente valida o pagamento após aceitação das presentes Condições. Um e-mail de confirmação resume a encomenda.` },
          { kind: 'p', value: `5.2 Natureza do pagamento inicial (adiantamento). A quantia paga na reserva (Fundador: 25 €; Standard: 30 €; Código influenciador: 25 €) é um adiantamento — pagamento parcial antecipado imputado no preço total. Não constitui sinal na aceção dos artigos 440.º a 442.º do Código Civil: nenhuma das partes a pode invocar a título de penalização e a sua entrega não produz qualquer efeito de restituição em dobro.` },
          { kind: 'p', value: `5.3 Conversão em crédito (Instants). Logo que recebido, o adiantamento é imediatamente convertido em crédito (Instants) lançado na conta do cliente associada ao seu endereço de correio eletrónico, no valor de 30 € independentemente da oferta. Este crédito de 30 € é uma vantagem comercial e não um pagamento: apenas o montante efetivamente pago a título de adiantamento (25 € ou 30 € consoante a oferta) é objeto de recebimento e de fatura; a fração de bónus (5 € nas ofertas Fundador e influenciador) constitui um desconto comercial condicional, nunca recebido e não faturado. Este crédito: (i) é nominativo e não cessível; (ii) não é reembolsável em numerário, salvo nas condições previstas nos artigos 5.4 e 8.2; (iii) caduca 12 meses após a sua atribuição; (iv) é imputado no preço da encomenda final. As ofertas e códigos não são cumuláveis entre si.` },
          { kind: 'p', value: `5.4 Reserva imperativa de reembolso (antes da maquete). Por exceção ao carácter não reembolsável do crédito, e nos termos dos artigos 10.º e 12.º do DL 24/2014, o cliente que o solicite expressamente antes da validação da sua maquete obtém o reembolso em numerário do adiantamento efetivamente pago (ver artigo 8.º). Esta faculdade extingue-se com a validação da maquete.` },
          { kind: 'p', value: `5.5 Adiantamento não finalizado — caducidade do crédito. Se o cliente nunca validar a sua maquete, o crédito permanece utilizável até à sua caducidade (12 meses). A Bellajour envia uma interpelação por correio eletrónico antes do termo. O prazo de 12 meses é suspenso durante qualquer período em que a impossibilidade de utilizar o crédito seja imputável à Bellajour (nomeadamente atraso na disponibilização da maquete). Na caducidade, o crédito não utilizado perde-se, sem que qualquer quantia continue a ser devida a título de penalização, e sem prejuízo da faculdade de reembolso do n.º 5.4 exercida atempadamente.` },
          { kind: 'p', value: `5.6 Regimes de oferta. As condições específicas de cada oferta — incluindo as datas e horas exatas de abertura e de encerramento — constam da página da oferta em causa; a Bellajour conserva uma cópia com registo temporal das condições de cada oferta (artigo 8.6). As principais ofertas são as seguintes:` },
          { kind: 'list', items: [
            `Oferta Fundador (lugares #1 a #100): aberta de 13 de junho a 15 de agosto de 2026, limitada a 100 lugares. Adiantamento de 25 €, convertido em crédito de 30 €. Os Fundadores abrem a pré-venda dois dias antes da oferta Standard. Bónus adquiridos na validação da maquete: capa ilustrada, 200 Instants e portes oferecidos.`,
            `Oferta Standard: aberta de 15 de junho a 15 de agosto de 2026, sem quota. Adiantamento de 30 €, convertido em crédito de 30 €. Bónus: 100 Instants e portes oferecidos.`,
            `Código influenciador: aberto de 15 de junho a 15 de agosto de 2026. Adiantamento de 25 €, convertido em crédito de 30 € (desconto efetivo de 5 €). A comissão eventualmente paga ao influenciador não é suportada pelo cliente.`,
            `Indicação (apadrinhamento): a partir de 15 de agosto de 2026. A indicação confere 5 páginas oferecidas ao padrinho e 3 páginas oferecidas ao afilhado. Estas páginas ficam em espera na conta desde a inscrição e são definitivamente adquiridas quando ambos os adiantamentos tiverem sido pagos e deixarem de ser reembolsáveis (ou seja, após a validação da maquete de cada um). Enquanto esta condição não estiver preenchida, as páginas permanecem em espera; são anuladas se um dos dois adiantamentos for reembolsado.`,
          ] },
          { kind: 'p', value: `O ficheiro digital HD está incluído em todas as ofertas.` },
        ],
      },
      {
        heading: `Artigo 6.º — Especificações técnicas do conteúdo fornecido pelo cliente`,
        blocks: [
          { kind: 'p', value: `6.1 O cliente fornece fotografias conformes às especificações exibidas (resolução mínima, formatos aceites, margens de corte) detalhadas na Ficha de Produto. O resultado do álbum é apreciado à luz dessas especificações.` },
          { kind: 'p', value: `6.2 Não constituem defeito: (i) as diferenças de cor entre a exibição no ecrã (RGB retroiluminado) e a impressão em papel (CMYK), dentro das tolerâncias normais do processo; (ii) as limitações de resultado imputáveis a um ficheiro de origem não conforme (baixa resolução, compressão, desfocagem).` },
          { kind: 'p', value: `6.3 O cliente é o único responsável pelas fotografias que transmite e garante deter todos os direitos sobre as mesmas (artigo 3.3).` },
        ],
      },
      {
        heading: `Artigo 7.º — Pagamento`,
        blocks: [
          { kind: 'p', value: `7.1 Prestador. Os pagamentos são processados pela Stripe, certificada PCI-DSS. A Bellajour não conserva dados do cartão.` },
          { kind: 'p', value: `7.2 Autenticação forte (SCA / 3-D Secure 2). Nos termos da DSP2, o pagamento pode exigir autenticação forte junto do banco do cliente.` },
          { kind: 'p', value: `7.3 Falta de pagamento do remanescente. Em caso de não pagamento do remanescente após a validação da maquete, a Bellajour pode suspender a produção e, após interpelação sem resposta, resolver a encomenda. Nesse caso, o adiantamento é retido apenas na medida dos custos efetiva e justificadamente incorridos (nomeadamente a conceção da maquete validada), de forma proporcionada e sem exceder o montante do adiantamento; qualquer excedente é reembolsado. Esta estipulação não prejudica o artigo 8.º.` },
          { kind: 'p', value: `7.4 Chargebacks. Qualquer contestação de pagamento (chargeback) infundada, relativa a encomenda cuja maquete foi validada (encomenda definitiva — artigo 8.º), poderá ser contestada pela Bellajour junto da Stripe com base nas presentes Condições e no registo temporal da validação.` },
        ],
      },
      {
        heading: `Artigo 8.º — Direito de livre resolução e a sua exceção`,
        blocks: [
          { kind: 'p', value: `8.1 Princípio. Nos contratos à distância, o consumidor dispõe, em princípio, de um direito de livre resolução de 14 dias, sem necessidade de indicar motivo (artigo 10.º do DL 24/2014).` },
          { kind: 'p', value: `8.2 Antes da validação da maquete — reembolso integral. Enquanto o cliente não tiver validado a sua maquete, a encomenda não é definitiva. Independentemente do estado de execução (incluindo o carregamento das fotografias), pode solicitar o reembolso em numerário do adiantamento efetivamente pago, a 100 %, sem retenção, sem custos e sem penalização, por exceção ao carácter não reembolsável do crédito (5.3). O direito de resolução é conferido pelo artigo 10.º do DL 24/2014 e os seus efeitos (reembolso) regem-se pelo artigo 12.º do mesmo decreto-lei. Esta faculdade pode ser exercida enquanto a maquete não tiver sido validada e o crédito não tiver caducado (artigo 5.5); prevalece a mais próxima destas duas datas.` },
          { kind: 'p', value: `8.3 Exceção de personalização e a sua cristalização. Nos termos do artigo 17.º, n.º 1, alínea c), do DL 24/2014 (que transpõe a Diretiva 2011/83/UE), o direito de livre resolução não se aplica aos bens confecionados de acordo com especificações do consumidor ou manifestamente personalizados. Para o álbum Bellajour, esta exceção produz efeitos no momento exato da validação da maquete pelo cliente, concretizada por uma caixa de seleção própria e com registo de data e hora, pela qual o cliente: (i) reconhece que o seu álbum é confecionado de acordo com as suas especificações; (ii) reconhece expressamente perder o seu direito de livre resolução; (iii) solicita o início da produção. A partir desta validação, a encomenda é definitiva e não resolúvel, e nenhum reembolso (em numerário ou em crédito) é devido a este título, sem prejuízo das garantias legais (artigo 9.º) e do incumprimento da Bellajour (artigos 8.7 e 12.º).` },
          { kind: 'p', value: `8.4 Maquete validada = referência contratual. A maquete validada e datada constitui a referência da encomenda. Qualquer apreciação de conformidade do álbum entregue é efetuada por comparação com essa maquete validada, com exclusão de qualquer expectativa subjetiva não refletida na maquete.` },
          { kind: 'p', value: `8.5 Informação prévia. A perda do direito de livre resolução é dada a conhecer ao cliente de forma clara e legível, em destaque próprio, desde a página da oferta e no resumo que antecede o botão «Encomendar com obrigação de pagamento», nos termos do artigo 4.º, n.º 1, alínea n), do DL 24/2014. Na falta de informação prévia, a exceção não é oponível.` },
          { kind: 'p', value: `8.6 Prova. A Bellajour conserva, durante 10 anos (Código Comercial, artigo 40.º), os elementos de prova: versão das Condições aceite e registo temporal da aceitação no adiantamento, registo temporal do carregamento, registo temporal e versão da validação da maquete, e identificador da transação Stripe.` },
          { kind: 'p', value: `8.7 Montante e incumprimento da Bellajour. O reembolso incide sobre o montante efetivamente pago (Fundador 25 €; influenciador 25 €); as bonificações nunca desembolsadas (5 €) não são reembolsáveis. Se a Bellajour não puder produzir ou entregar (falha interna, falha do impressor parceiro, força maior, cessação de atividade), qualquer quantia paga é integralmente reembolsada em numerário no meio de pagamento original, no prazo máximo de 14 dias após a aceitação do pedido ou a constatação da falha (artigo 12.º do DL 24/2014). No plano contabilístico, este reembolso dá lugar à emissão de uma nota de crédito que anula a fatura de adiantamento; a nota de crédito é um documento contabilístico e não um modo de reembolso que substitua o pagamento em numerário.` },
          { kind: 'p', value: `8.8 Versionamento. A versão das presentes Condições oponível ao cliente é a que aceitou no momento da encomenda; nas pré-vendas Fundadores, a aceite no momento do pagamento do adiantamento. Qualquer alteração posterior não tem efeito retroativo sobre a sua encomenda.` },
        ],
      },
      {
        heading: `Artigo 9.º — Garantias legais`,
        blocks: [
          { kind: 'p', value: `9.1 Garantia de conformidade — 3 anos (DL n.º 84/2021, artigo 12.º, n.º 1), a contar da entrega.` },
          { kind: 'p', value: `9.2 Presunção — 2 anos (artigo 13.º): durante 24 meses cabe à Bellajour provar a conformidade.` },
          { kind: 'p', value: `9.3 Direito de rejeição — 30 dias: substituição ou resolução imediatas, sem condição. Este prazo conta-se da entrega ou, tratando-se de defeito não aparente na receção, da data em que é ou deveria razoavelmente ter sido constatado (DL 84/2021).` },
          { kind: 'p', value: `9.4 Hierarquia dos meios. Em caso de desconformidade, o cliente tem direito, em primeiro lugar, à reposição da conformidade por reparação ou substituição (reimpressão); subsidiariamente, à redução do preço ou à resolução, quando a reimpressão for impossível ou desproporcionada, ou quando falhe, se repita ou não seja realizada num prazo razoável. Prazo de reposição: 30 dias, salvo complexidade especial.` },
          { kind: 'p', value: `9.5 Irrenunciabilidade: qualquer cláusula em contrário tem-se por não escrita.` },
          { kind: 'p', value: `9.6 As garantias aplicam-se independentemente da exceção ao direito de livre resolução (artigo 8.º).` },
        ],
      },
      {
        heading: `Artigo 10.º — Entrega, transferência do risco e segurança do produto (GPSR)`,
        blocks: [
          { kind: 'p', value: `10.1 Entrega na morada indicada pelo cliente. O fabrico é confiado a um impressor parceiro estabelecido na União Europeia, sem que esta subcontratação altere a responsabilidade da Bellajour perante o cliente. O prazo de entrega conta-se a partir da validação da maquete; é dado a conhecer ao cliente antes da encomenda (estimativa: 10 a 15 dias úteis consoante a carga de produção) e não excede 30 dias, salvo acordo expresso do cliente, nos termos do artigo 9.º do DL 24/2014.` },
          { kind: 'p', value: `10.2 Transferência do risco. Os riscos de perda ou deterioração transferem-se para o consumidor no momento da receção física do bem (por si ou por terceiro que designe, distinto da transportadora), nos termos do artigo 20.º da Diretiva 2011/83/UE e do DL 24/2014. O risco nunca se transfere com a entrega à transportadora.` },
          { kind: 'p', value: `10.3 Compra-presente: o consumidor na aceção das presentes Condições é o comprador, que exerce as garantias e recebe as comunicações, ainda que o álbum seja entregue a um terceiro beneficiário.` },
          { kind: 'p', value: `10.4 Entregas fora da UE: podem aplicar-se direitos aduaneiros e impostos de importação a cargo do destinatário, segundo as regras do país de destino.` },
          { kind: 'p', value: `10.5 Fabricante e rastreabilidade (GPSR). Na aceção do Regulamento (UE) 2023/988, a Bellajour, que comercializa o álbum sob a sua marca, mantém a qualidade de fabricante (artigos 3.º, n.º 8, e 13.º, n.º 1) e é ela própria a pessoa responsável estabelecida na UE (artigo 16.º); as obrigações do artigo 9.º do Regulamento não são delegáveis, atuando o impressor parceiro como subcontratante de produção. Cada álbum é identificado pelo número de encomenda, constante da guia de entrega. Em caso de recolha ou alerta de segurança, a Bellajour contacta os clientes afetados através do e-mail indicado na encomenda; o cliente compromete-se a manter os seus dados de contacto atualizados.` },
        ],
      },
      {
        heading: `Artigo 11.º — Responsabilidade e segurança dos conteúdos`,
        blocks: [
          { kind: 'p', value: `11.1 A Bellajour responde pelos danos diretos e previsíveis decorrentes de incumprimento comprovado das suas obrigações.` },
          { kind: 'p', value: `11.2 Nos limites permitidos por lei, exclui-se a responsabilidade por danos indiretos (perda de rendimentos ou de dados, lucros cessantes). Esta limitação não se aplica a danos pessoais, nem em caso de dolo ou culpa grave.` },
          { kind: 'p', value: `11.3 Segurança e armazenamento dos conteúdos. As fotografias transmitidas e o ficheiro HD são armazenados numa infraestrutura situada na União Europeia; não há qualquer transferência fora da UE a título do armazenamento. O reconhecimento dos rostos é igualmente efetuado na UE. Em contrapartida, certas operações de tratamento (análise e geração da capa ilustrada) recorrem a prestadores estabelecidos nos Estados Unidos; estas transferências são enquadradas pelas cláusulas contratuais-tipo da Comissão Europeia (e, se for caso disso, pelo Data Privacy Framework quando o prestador esteja certificado). As medidas de segurança e a lista atualizada dos prestadores constam da Política de Privacidade, para a qual se remete expressamente.` },
        ],
      },
      {
        heading: `Artigo 12.º — Força maior, indisponibilidade e recolha de segurança`,
        blocks: [
          { kind: 'p', value: `12.1 Força maior. A Bellajour não é responsável por incumprimento resultante de caso de força maior, isto é, um evento exterior, imprevisível e irresistível que escape ao seu controlo (nomeadamente catástrofe natural, escassez geral de matérias-primas, incidente técnico grave de um fornecedor de infraestrutura, conflito armado). Os prazos suspendem-se durante o impedimento. Se este se prolongar por mais de 60 dias ou tornar a execução definitivamente impossível, qualquer das partes pode resolver a encomenda; as quantias pagas são integralmente reembolsadas, sem outra indemnização. A falha do impressor parceiro, escolhido pela Bellajour, não é um caso de força maior; é tratada no artigo 8.7 (reembolso integral).` },
          { kind: 'p', value: `12.2 Indisponibilidade. Se um formato ou produto ficar indisponível de forma definitiva e não substituível após a encomenda, a Bellajour reembolsa o cliente; nenhuma substituição é imposta sem o seu acordo.` },
          { kind: 'p', value: `12.3 Recolha de segurança (GPSR). Em caso de recolha ao abrigo do Regulamento (UE) 2023/988, a Bellajour contacta os clientes afetados por e-mail e publica a informação no seu sítio; as modalidades (devolução, substituição, reembolso) são definidas caso a caso nos termos legais.` },
        ],
      },
      {
        heading: `Artigo 13.º — Versões, lei aplicável e litígios`,
        blocks: [
          { kind: 'p', value: `13.1 Versão oponível: a aceite à data da encomenda. As pré-vendas Fundadores regem-se pela versão aceite no pagamento do adiantamento. Qualquer alteração posterior é sem efeito retroativo.` },
          { kind: 'p', value: `13.2 Evolução do catálogo. A Bellajour pode fazer evoluir a sua oferta (novos estilos, aplicação móvel, produtos complementares) sem vincular retroativamente os clientes que já tenham encomendado; os Instants e créditos mantêm-se nas condições da sua aquisição.` },
          { kind: 'p', value: `13.3 Lei aplicável: direito português, sem prejuízo das disposições imperativas mais protetoras da lei da residência habitual do consumidor (Regulamento Roma I, artigo 6.º).` },
          { kind: 'p', value: `13.4 Foro: o consumidor pode recorrer aos tribunais do seu país de residência.` },
          { kind: 'p', value: `13.5 Reclamações e resolução alternativa de litígios (RAL). Antes de qualquer ação, o cliente pode reclamar para contact@bellajour.com. Pode ainda: utilizar o Livro de Reclamações Eletrónico (https://www.livroreclamacoes.pt); recorrer a uma entidade de RAL portuguesa (Lei 144/2015), designadamente o Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) — centro territorialmente competente para a sede da Bellajour — ou, para as zonas não abrangidas por um centro regional, o CNIACC (www.cniacc.pt). A informação é obrigatória; a adesão da Bellajour é facultativa.` },
          { kind: 'p', value: `13.6 Nulidade parcial: se uma cláusula for considerada nula, as demais mantêm-se em vigor.` },
          { kind: 'p', value: `13.7 Remissão RGPD e cookies: o tratamento de dados pessoais consta da Política de Privacidade (RGPD, artigos 13.º e 14.º) e a utilização de cookies da Política de Cookies, acessível através do banner de consentimento do sítio. Estes documentos fazem parte integrante da relação contratual.` },
        ],
      },
      {
        heading: `Anexo — Ficha de produto (Álbum Bellajour no Lançamento, oferta de base)`,
        id: `fiche-produit`,
        blocks: [
          { kind: 'h3', text: `Características técnicas` },
          { kind: 'table', columns: [`Parâmetro`, `Valor`], rows: [
            [`Tipo`, `Livro de fotografias encadernado, impresso por encomenda`],
            [`Formato`, `Retrato — 210 × 280 mm`],
            [`Encadernação`, `Capa dura (hardcover)`],
            [`Paginação de base`, `30 páginas`],
            [`Paginação mín. / máx.`, `mín. 30 páginas — máx. 200 páginas (número de páginas obrigatoriamente par)`],
            [`Capa`, `Ilustrada, única, gerada por IA num estilo próprio da marca`],
            [`Impressão`, `Quadricromia, 300 DPI, perfil colorimétrico FOGRA 39`],
          ] },
          { kind: 'h3', text: `O que inclui a oferta de base` },
          { kind: 'list', items: [
            `O álbum físico encadernado (livro, composto a partir das suas fotografias)`,
            `A capa ilustrada à medida`,
            `A paginação composta por algoritmo enriquecido com os retornos dos clientes, com intervenção humana`,
            `A versão digital HD (ficheiro digital de alta definição do seu álbum, incluído)`,
          ] },
          { kind: 'h3', text: `Especificações dos ficheiros fornecidos pelo cliente` },
          { kind: 'p', value: `Resolução mínima: 800 × 800 píxeis. Abaixo deste limiar, a fotografia é rejeitada ou remetida para um espaço mais pequeno. Existe uma diferença de cor normal entre a exibição no ecrã (RGB) e a impressão em papel; esta não constitui um defeito.` },
          { kind: 'p', value: `Formatos de ficheiro aceites: JPEG, PNG, HEIC, HEIF, WebP.` },
          { kind: 'h3', text: `Grelha tarifária — Álbum Bellajour Lançamento (oferta de base)` },
          { kind: 'p', value: `Preços de catálogo padrão, fora de oferta promocional. Preços exibidos em euros, com todos os impostos incluídos. IVA aplicado à taxa do país de residência do consumidor (regime OSS-União) após o limiar de 10 000 € de volume de negócios.` },
          { kind: 'table', columns: [`Paginação`, `Preço c/ IVA`], rows: [
            [`30 páginas (base)`, `49 €`],
            [`50 páginas`, `82 €`],
            [`80 páginas`, `120 €`],
            [`100 páginas`, `146 €`],
            [`150 páginas`, `211 €`],
          ] },
        ],
      },
    ],
  },
  en: {
    title: `Terms and Conditions of Sale`,
    lastUpdated: `Version 2.5 — Effective 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `English translation for information only. The legally prevailing version is the Portuguese text; in the event of any discrepancy, the Portuguese text prevails.`,
    ],
    sections: [
      {
        heading: `Preamble — Who we are`,
        blocks: [
          { kind: 'p', value: `Bellajour is a brand operated by MISTÉRIO HERMÉTICO, LDA, a private limited company (sociedade por quotas) under Portuguese law, with a fully paid-up share capital of €1,000, registered with the Commercial Registry of Odivelas under tax number (NIPC) 519443284, with registered office at Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbon (Santa Maria Maior parish), VAT identification number PT519443284 (hereinafter "Bellajour", "we"). Contact: contact@bellajour.com.` },
          { kind: 'p', value: `Bellajour describes itself as a publishing house of memories: we do not print a photo book, we edit your story. Motto: "Live, we compose." Each album is a unique bound book, with an illustrated cover created specifically for you and a layout composed solely for your memories. This bespoke nature is central to these terms and underpins the exception to the right of withdrawal (see Article 8).` },
        ],
      },
      {
        heading: `Article 1 — Subject matter and scope`,
        blocks: [
          { kind: 'p', value: `1.1 These Terms and Conditions of Sale ("Terms") govern any order placed by a consumer on the website bellajour.fr and Bellajour's future application.` },
          { kind: 'p', value: `1.2 They apply to the sale of highly personalised photo albums and their components: the bound physical album, the bespoke illustrated cover, the layout composed by our algorithmic engine under human control, and the high-definition digital file ("HD digital version"), included with every order.` },
          { kind: 'p', value: `1.3 The internal points system "Instants" is governed by these Terms and, where applicable, by specific conditions displayed on the website.` },
          { kind: 'p', value: `1.4 Any order implies full acceptance of the Terms in the version in force on the date of the order (see Article 13).` },
          { kind: 'p', value: `Cross-reference: for the processing of your personal data and photographs, see our Privacy Policy (GDPR, Arts. 13–14), an integral part of the contractual relationship.` },
        ],
      },
      {
        heading: `Article 2 — Capacity and customer account`,
        blocks: [
          { kind: 'p', value: `2.1 Age. The customer declares that they are at least 18 years old (age of majority in Portugal) and have full legal capacity to contract. Any order placed by a minor is voidable (anulável, Article 125 of the Civil Code).` },
          { kind: 'p', value: `2.2 The customer guarantees the accuracy of the information provided when creating their account and placing the order.` },
        ],
      },
      {
        heading: `Article 3 — Products, personalisation and automated processing of photos`,
        blocks: [
          {
            kind: 'p',
            value: [
              `3.1 Description. The Bellajour album is a hardcover bound book, printed in high definition in portrait format, comprising a unique illustrated cover (AI-generated), a layout composed by algorithm under human control, and an included HD digital version. The detailed technical specifications (format, pagination, paper, finishes) and the price list per page tier are set out in the `,
              { text: `Product Sheet`, href: `#fiche-produit` },
              `, a document annexed to these Terms and reproduced in the annex below. This document forms an integral part of the contract in the version in force on the date of the order (Art. 13).`,
            ],
          },
          { kind: 'p', value: `3.2 Automated processing of photos. To compose your album, your photos undergo automated analysis: sorting, selection, quality scoring and layout. These steps do not rely on identifying individuals. A separate step — grouping photos by person, by means of facial recognition, which enables the "Casting" step (ranking and highlighting of key people) — constitutes processing of biometric data (Article 9 GDPR) subject to your explicit and separate consent, collected before the analysis. This consent is optional: in its absence, grouping by person and Casting are not carried out, and your album is composed from the other steps only. The terms of this consent, the option to refuse it, the general logic, the purpose and your rights are described in the Privacy Policy. This composition does not constitute a solely automated decision producing legal effects within the meaning of Article 22 GDPR, as the customer retains control by validating the final proof. Bellajour's engine is not, as at the date hereof, classified as a high-risk AI system within the meaning of Regulation (EU) 2024/1689 (AI Act); it does, however, carry out biometric categorisation subject to a transparency obligation, met by this information and by the Privacy Policy.` },
          { kind: 'p', value: `3.3 Rights to the content. The customer warrants that they hold all rights to the photos submitted (image rights of the persons depicted, including parental authority for photographed minors; intellectual property rights). In the event of a third-party claim relating to the content provided, the customer indemnifies and holds Bellajour harmless from any consequence.` },
        ],
      },
      {
        heading: `Article 4 — Prices, VAT and invoicing`,
        blocks: [
          { kind: 'p', value: `4.1 Prices inclusive of all taxes. Prices are displayed in euros, inclusive of all taxes. The album price depends on the chosen pagination tier, according to the price list set out in the Product Sheet. The number of pages is defined bespoke.` },
          { kind: 'p', value: `4.2 Transparency — no hidden costs. The tax-inclusive price displayed before validation is complete; no cost is added after validation of the order. Outside the pre-sale period, any shipping costs are clearly indicated before order validation. During the pre-sale, shipping is free of charge.` },
          { kind: 'p', value: `4.3 VAT regime. Bellajour is registered under the standard VAT regime in Portugal. For consumer (B2C) sales:` },
          { kind: 'list', items: [
            `until the €10,000 annual threshold of intra-EU distance sales is exceeded, Portuguese VAT at the standard rate in force applies (23% in mainland Portugal; 22% in Madeira; 16% in the Azores);`,
            `beyond that threshold, the VAT of the consumer's country of residence applies, declared by Bellajour via the One-Stop Shop (OSS-Union) scheme or, where applicable, by direct registration in the Member State concerned.`,
          ] },
          { kind: 'p', value: `The rate actually applied to each order appears on the invoice.` },
          { kind: 'p', value: `4.4 Chargeability and invoicing of the deposit. VAT is chargeable upon receipt, including upon receipt of the deposit. Upon receipt of the deposit, an invoice is issued with the description "Deposit on order [no.]", for the amount actually paid. In the event of a refund, a credit note is issued (never a negative invoice). Documents are issued via invoicing software certified by the Tax Authority, with ATCUD and QR code.` },
          { kind: 'p', value: `4.5 Manifest pricing error. An order at a manifestly incorrect price (gross display error) may be cancelled by Bellajour; the customer is informed and fully refunded.` },
          { kind: 'p', value: `4.6 Omnibus rule. Where a price reduction is announced, the reference price displayed is the lowest applied during the previous 30 days (DL 109-G/2021).` },
        ],
      },
      {
        heading: `Article 5 — Order, pre-sale, deposit and credit (Instants)`,
        blocks: [
          { kind: 'p', value: `5.1 Formation of the contract. The order is concluded when the customer validates payment after accepting these Terms. A confirmation email summarises the order.` },
          { kind: 'p', value: `5.2 Nature of the initial payment (deposit). The amount paid at reservation (Founder: €25; Standard: €30; Influencer code: €25) is a deposit — an advance partial payment credited against the total price. It does not constitute a sinal (earnest money) within the meaning of Articles 440 to 442 of the Civil Code: neither party may invoke it as a penalty, and its payment produces no double-restitution effect.` },
          { kind: 'p', value: `5.3 Conversion into credit (Instants). As soon as it is received, the deposit is immediately converted into credit (Instants) posted to the customer's account linked to their email address, in the amount of €30 regardless of the offer. This €30 credit is a commercial benefit and not a payment: only the amount actually paid as a deposit (€25 or €30 depending on the offer) is collected and invoiced; the bonus portion (€5 on the Founder and influencer offers) constitutes a conditional commercial discount, never collected and not invoiced. This credit: (i) is personal and non-transferable; (ii) is not refundable in cash, except under the conditions set out in Articles 5.4 and 8.2; (iii) expires 12 months after it is granted; (iv) is credited against the price of the final order. Offers and codes cannot be combined with one another.` },
          { kind: 'p', value: `5.4 Mandatory refund reserve (before the proof). By exception to the non-refundable nature of the credit, and in accordance with Articles 10 and 12 of DL 24/2014, a customer who expressly requests it before validating their proof obtains a cash refund of the deposit actually paid (see Article 8). This option ceases upon validation of the proof.` },
          { kind: 'p', value: `5.5 Unfinalised deposit — expiry of the credit. If the customer never validates their proof, the credit remains usable until it expires (12 months). Bellajour sends an email reminder before the deadline. The 12-month period is suspended for any period during which the inability to use the credit is attributable to Bellajour (in particular a delay in making the proof available). On expiry, the unused credit is forfeited, with no amount remaining due by way of penalty, and without prejudice to the refund option under 5.4 exercised in due time.` },
          { kind: 'p', value: `5.6 Offer schemes. The specific conditions of each offer — including the exact dates and times of opening and closing — appear on the relevant offer page; Bellajour retains a timestamped copy of the conditions of each offer (Article 8.6). The main offers are as follows:` },
          { kind: 'list', items: [
            `Founder offer (places #1 to #100): open from 13 June to 15 August 2026, limited to 100 places. Deposit of €25, converted into a €30 credit. Founders open the pre-sale two days before the Standard offer. Bonuses earned on proof validation: illustrated cover, 200 Instants and free shipping.`,
            `Standard offer: open from 15 June to 15 August 2026, no quota. Deposit of €30, converted into a €30 credit. Bonus: 100 Instants and free shipping.`,
            `Influencer code: open from 15 June to 15 August 2026. Deposit of €25, converted into a €30 credit (effective €5 discount). Any commission paid to the influencer is not borne by the customer.`,
            `Referral: from 15 August 2026. The referral grants 5 free pages to the referrer and 3 free pages to the referred customer. These pages are placed on hold in the account from sign-up and are definitively earned once both deposits have been paid and are no longer refundable (i.e. after each party's proof has been validated). Until this condition is met, the pages remain on hold; they are cancelled if either of the two deposits is refunded.`,
          ] },
          { kind: 'p', value: `The HD digital file is included with all offers.` },
        ],
      },
      {
        heading: `Article 6 — Technical specifications of customer-provided content`,
        blocks: [
          { kind: 'p', value: `6.1 The customer provides photographs that comply with the displayed specifications (minimum resolution, accepted formats, trim margins) detailed in the Product Sheet. The album result is assessed against these specifications.` },
          { kind: 'p', value: `6.2 The following do not constitute defects: (i) colour differences between on-screen display (backlit RGB) and paper printing (CMYK), within the normal tolerances of the process; (ii) output limitations attributable to a non-compliant source file (low resolution, compression, blur).` },
          { kind: 'p', value: `6.3 The customer is solely responsible for the photographs they submit and warrants that they hold all rights to them (Article 3.3).` },
        ],
      },
      {
        heading: `Article 7 — Payment`,
        blocks: [
          { kind: 'p', value: `7.1 Provider. Payments are processed by Stripe, PCI-DSS certified. Bellajour stores no card data.` },
          { kind: 'p', value: `7.2 Strong authentication (SCA / 3-D Secure 2). In accordance with PSD2, payment may require strong authentication with the customer's bank.` },
          { kind: 'p', value: `7.3 Non-payment of the balance. In the event of failure to pay the balance after validation of the proof, Bellajour may suspend production and, after an unanswered reminder, terminate the order. In that case, the deposit is retained only to the extent of the costs actually and justifiably incurred (in particular the design of the validated proof), in a proportionate manner and without exceeding the amount of the deposit; any surplus is refunded. This provision is without prejudice to Article 8.` },
          { kind: 'p', value: `7.4 Chargebacks. Any unfounded payment dispute (chargeback) relating to an order whose proof has been validated (definitive order — Article 8) may be contested by Bellajour with Stripe on the basis of these Terms and the timestamp of validation.` },
        ],
      },
      {
        heading: `Article 8 — Right of withdrawal and its exception`,
        blocks: [
          { kind: 'p', value: `8.1 Principle. For distance contracts, the consumer in principle has a right of withdrawal (direito de livre resolução) of 14 days, without reason (Article 10 of DL 24/2014).` },
          { kind: 'p', value: `8.2 Before validation of the proof — full refund. As long as the customer has not validated their proof, the order is not definitive. Whatever the stage of progress (including uploading of photos), they may request a cash refund of the deposit actually paid, in full, with no deduction, no charge and no penalty, by exception to the non-refundable nature of the credit (5.3). The right of withdrawal is granted by Article 10 of DL 24/2014 and its effects (refund) are governed by Article 12 of the same decree-law. This option may be exercised as long as the proof has not been validated and the credit has not expired (Article 5.5); the earlier of these two dates prevails.` },
          { kind: 'p', value: `8.3 Personalisation exception and its crystallisation. In accordance with Article 17(1)(c) of DL 24/2014 (transposing Directive 2011/83/EU), the right of withdrawal does not apply to goods made to the consumer's specifications or clearly personalised. For the Bellajour album, this exception takes effect at the precise moment the customer validates the proof, evidenced by a dedicated, timestamped checkbox by which the customer: (i) acknowledges that their album is made to their specifications; (ii) expressly acknowledges losing their right of withdrawal; (iii) requests the start of production. From this validation, the order is definitive and cannot be cancelled, and no further refund (cash or credit) is due on this basis, without prejudice to the legal guarantees (Article 9) and to Bellajour's default (Articles 8.7 and 12).` },
          { kind: 'p', value: `8.4 Validated proof = contractual reference. The validated, timestamped proof constitutes the reference for the order. Any assessment of conformity of the delivered album is carried out by comparison with this validated proof, excluding any subjective expectation not reflected in the proof.` },
          { kind: 'p', value: `8.5 Prior information. The loss of the right of withdrawal is brought to the customer's attention clearly and legibly, in a separate box, from the offer page and in the summary preceding the "Order with obligation to pay" button, in accordance with Article 4(1)(n) of DL 24/2014. Without prior information, the exception is not enforceable.` },
          { kind: 'p', value: `8.6 Evidence. Bellajour retains, for 10 years (Commercial Code, Article 40), the evidence: version of the Terms accepted and timestamp of acceptance at deposit, timestamp of upload, timestamp and version of proof validation, and Stripe transaction identifier.` },
          { kind: 'p', value: `8.7 Amount and Bellajour's default. The refund covers the amount actually paid (Founder €25; influencer €25); bonuses never disbursed (€5) are not refundable. If Bellajour cannot produce or deliver (internal failure, failure of the partner printer, force majeure, cessation of business), any amount paid is refunded in full, in cash, to the original means of payment, no later than 14 days after acceptance of the request or finding of the default (Article 12 of DL 24/2014). For accounting purposes, this refund gives rise to the issuance of a credit note cancelling the deposit invoice; the credit note is an accounting document and not a method of refund replacing the cash payment.` },
          { kind: 'p', value: `8.8 Versioning. The version of these Terms enforceable against the customer is the one they accepted at the order; for Founder pre-sales, the one accepted at payment of the deposit. Any subsequent amendment has no retroactive effect on their order.` },
        ],
      },
      {
        heading: `Article 9 — Legal guarantees`,
        blocks: [
          { kind: 'p', value: `9.1 Conformity guarantee — 3 years (DL no. 84/2021, Article 12(1)), from delivery.` },
          { kind: 'p', value: `9.2 Presumption — 2 years (Article 13): for 24 months, it is for Bellajour to prove conformity.` },
          { kind: 'p', value: `9.3 Right of rejeição — 30 days: immediate replacement or termination, without condition. This period runs from delivery or, for a defect not apparent on receipt, from the date on which it is or should reasonably have been discovered (DL 84/2021).` },
          { kind: 'p', value: `9.4 Hierarchy of remedies. In the event of non-conformity, the customer is entitled, first, to restoration of conformity by repair or replacement (reprint); subsidiarily, to a price reduction or termination, where the reprint is impossible or disproportionate, or where it fails, recurs or is not carried out within a reasonable time. Time to restore conformity: 30 days, save particular complexity.` },
          { kind: 'p', value: `9.5 Non-waiver: any clause to the contrary is deemed unwritten.` },
          { kind: 'p', value: `9.6 The guarantees apply independently of the exception to the right of withdrawal (Article 8).` },
        ],
      },
      {
        heading: `Article 10 — Delivery, transfer of risk and product safety (GPSR)`,
        blocks: [
          { kind: 'p', value: `10.1 Delivery to the address indicated by the customer. Manufacturing is entrusted to a partner printer established in the European Union, without this subcontracting altering Bellajour's liability towards the customer. The delivery time runs from validation of the proof; it is made known to the customer before the order (estimate: 10 to 15 business days depending on production load) and does not exceed 30 days, save express agreement of the customer, in accordance with Article 9 of DL 24/2014.` },
          { kind: 'p', value: `10.2 Transfer of risk. The risks of loss or deterioration transfer to the consumer at the time of physical receipt of the goods (by the consumer or a third party they designate, other than the carrier), in accordance with Article 20 of Directive 2011/83/EU and DL 24/2014. Risk is never transferred upon handover to the carrier.` },
          { kind: 'p', value: `10.3 Gift purchase: the consumer within the meaning of these Terms is the buyer, who exercises the guarantees and receives communications, even if the album is delivered to a third-party beneficiary.` },
          { kind: 'p', value: `10.4 Deliveries outside the EU: customs duties and import taxes may apply at the recipient's expense, according to the rules of the destination country.` },
          { kind: 'p', value: `10.5 Manufacturer and traceability (GPSR). Within the meaning of Regulation (EU) 2023/988, Bellajour, which markets the album under its brand, retains the status of manufacturer (Articles 3(8) and 13(1)) and is itself the responsible person established in the EU (Article 16); the obligations of Article 9 of the Regulation are non-delegable, with the partner printer acting as a production subcontractor. Each album is identified by its order number, shown on the delivery slip. In the event of a recall or safety alert, Bellajour contacts the affected customers at the email address provided with the order; the customer undertakes to keep their contact details up to date.` },
        ],
      },
      {
        heading: `Article 11 — Liability and security of content`,
        blocks: [
          { kind: 'p', value: `11.1 Bellajour is liable for direct and foreseeable damage resulting from a proven breach of its obligations.` },
          { kind: 'p', value: `11.2 To the extent permitted by law, Bellajour excludes liability for indirect damage (loss of income or data, loss of profit). This limitation does not apply to personal injury, nor in the event of wilful misconduct or gross negligence.` },
          { kind: 'p', value: `11.3 Security and storage of content. The photos submitted and the HD file are stored on infrastructure located in the European Union; no transfer outside the EU takes place in respect of storage. Facial recognition is also performed within the EU. By contrast, certain processing operations (analysis and generation of the illustrated cover) use providers established in the United States; these transfers are framed by the European Commission's Standard Contractual Clauses (and, where applicable, the Data Privacy Framework where the provider is certified). The security measures and the up-to-date list of providers are described in the Privacy Policy, to which express reference is made.` },
        ],
      },
      {
        heading: `Article 12 — Force majeure, unavailability and safety recall`,
        blocks: [
          { kind: 'p', value: `12.1 Force majeure. Bellajour is not liable for a breach resulting from force majeure, that is, an external, unforeseeable and irresistible event beyond its control (in particular natural disaster, general shortage of raw materials, major technical incident of an infrastructure provider, armed conflict). Deadlines are suspended during the impediment. If it continues beyond 60 days or makes performance permanently impossible, either party may terminate the order; amounts paid are then refunded in full, with no further compensation. Failure of the partner printer, chosen by Bellajour, is not a case of force majeure; it is dealt with in Article 8.7 (full refund).` },
          { kind: 'p', value: `12.2 Unavailability. If a format or product becomes unavailable definitively and non-substitutably after the order, Bellajour refunds the customer; no substitution is imposed without their agreement.` },
          { kind: 'p', value: `12.3 Safety recall (GPSR). In the event of a recall under Regulation (EU) 2023/988, Bellajour contacts the affected customers by email and publishes the information on its website; the terms (return, replacement, refund) are defined on a case-by-case basis in accordance with legal obligations.` },
        ],
      },
      {
        heading: `Article 13 — Versions, governing law and disputes`,
        blocks: [
          { kind: 'p', value: `13.1 Enforceable version: the one accepted on the date of the order. Founder pre-sales remain governed by the version accepted at payment of the deposit. Any subsequent amendment has no retroactive effect.` },
          { kind: 'p', value: `13.2 Catalogue evolution. Bellajour may develop its offering (new styles, mobile application, complementary products) without retroactively binding customers who have already ordered; Instants and credits remain valid under the conditions of their acquisition.` },
          { kind: 'p', value: `13.3 Governing law: Portuguese law, without prejudice to the mandatory provisions more protective of the law of the consumer's habitual residence (Rome I Regulation, Article 6).` },
          { kind: 'p', value: `13.4 Jurisdiction: the consumer may bring proceedings before the courts of their country of residence.` },
          { kind: 'p', value: `13.5 Complaints and alternative dispute resolution (ADR). Before any action, the customer may submit a complaint to contact@bellajour.com. They may also: use the Electronic Complaints Book (Livro de Reclamações Eletrónico, https://www.livroreclamacoes.pt); refer the matter to a Portuguese ADR body (Law 144/2015), in particular the Lisbon Consumer Dispute Arbitration Centre (www.centroarbitragemlisboa.pt) — the body territorially competent for Bellajour's registered office — or, for areas not covered by a regional centre, CNIACC (www.cniacc.pt). The information is mandatory; Bellajour's adherence is optional.` },
          { kind: 'p', value: `13.6 Partial nullity: if a clause is held void, the others remain in force.` },
          { kind: 'p', value: `13.7 GDPR and cookies cross-reference: the processing of personal data is described in the Privacy Policy (GDPR, Articles 13–14) and the use of cookies in the Cookie Policy, accessible via the site's consent banner. These documents form an integral part of the contractual relationship.` },
        ],
      },
      {
        heading: `Annex — Product Sheet (Bellajour Album at Launch, base offer)`,
        id: `fiche-produit`,
        blocks: [
          { kind: 'h3', text: `Technical specifications` },
          { kind: 'table', columns: [`Parameter`, `Value`], rows: [
            [`Type`, `Bound photo book, printed on demand`],
            [`Format`, `Portrait — 210 × 280 mm`],
            [`Binding`, `Hardcover`],
            [`Base pagination`, `30 pages`],
            [`Pagination min. / max.`, `min. 30 pages — max. 200 pages (page count must be even)`],
            [`Cover`, `Illustrated, unique, AI-generated in a style specific to the brand`],
            [`Printing`, `Four-colour (CMYK), 300 DPI, FOGRA 39 colour profile`],
          ] },
          { kind: 'h3', text: `What the base offer includes` },
          { kind: 'list', items: [
            `The bound physical album (book, composed from your photos)`,
            `The bespoke illustrated cover`,
            `The layout composed by an algorithm enriched with customer feedback, with human intervention`,
            `The HD digital version (high-definition digital file of your album, included)`,
          ] },
          { kind: 'h3', text: `Specifications for customer-provided files` },
          { kind: 'p', value: `Minimum resolution: 800 × 800 pixels. Below this threshold, the photo is rejected or downgraded to a smaller slot. A normal colour difference exists between on-screen display (RGB) and paper printing; this does not constitute a defect.` },
          { kind: 'p', value: `Accepted file formats: JPEG, PNG, HEIC, HEIF, WebP.` },
          { kind: 'h3', text: `Price list — Bellajour Album Launch (base offer)` },
          { kind: 'p', value: `Standard catalogue prices, excluding promotional offers. Prices displayed in euros, inclusive of all taxes. VAT applied at the rate of the consumer's country of residence (OSS-Union scheme) after the €10,000 turnover threshold.` },
          { kind: 'table', columns: [`Pagination`, `Price incl. VAT`], rows: [
            [`30 pages (base)`, `49 €`],
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
