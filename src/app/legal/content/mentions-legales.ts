import type { LocalizedDoc } from '../types'

/* MENTIONS LÉGALES ET INFORMATIONS PRÉCONTRACTUELLES — transcription fidèle de
   legal-source/mentions-legales/FR/…docx (v1.0).
   PT : transcription fidèle de legal-source/mentions-legales/PT/…docx (clé `pt`
   ci-dessous). Normalisations source→gabarit FR : §1 « Direção da publicação »
   sortie de la liste en paragraphe ; §4 paragraphe fabricant sorti de la liste.
   EN : transcription fidèle de legal-source/mentions-legales/EN/LEGAL NOTICE AND
   PRE-CONTRACTUAL INFORMATION — BELLAJOUR.docx (clé `en` ci-dessous ; le fichier EN
   est bien le Legal Notice, mêmes normalisations §1/§4). */

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
  pt: {
    title: `Menções legais e informações pré-contratuais`,
    lastUpdated: `Versão 1.0 — Em vigor em 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Texto de referência (versão portuguesa), juridicamente prevalecente. As traduções para francês e inglês são meramente informativas.`,
    ],
    sections: [
      {
        heading: `1. Editor do sítio`,
        blocks: [
          { kind: 'p', value: `O sítio bellajour.fr (e a sua extensão bellajour.com) é editado por:` },
          { kind: 'list', items: [
            `MISTÉRIO HERMÉTICO, LDA (marca comercial «Bellajour»)`,
            `Forma: sociedade por quotas de direito português`,
            `Capital social: 1 000 €, integralmente realizado`,
            `Sede: Beco de Santa Helena, 21A, 2.º, 1100-117 Lisboa, Portugal`,
            `NIPC / matrícula: 519443284 — Conservatória do Registo Comercial de Odivelas`,
            `Número de identificação para efeitos de IVA: PT519443284`,
            `Contacto: contact@bellajour.com`,
          ] },
          { kind: 'p', value: `Direção da publicação: assegurada pela gerência da sociedade.` },
        ],
      },
      {
        heading: `2. Alojamento`,
        blocks: [
          { kind: 'p', value: `O sítio é alojado por:` },
          { kind: 'p', value: `Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, Estados Unidos.` },
          { kind: 'p', value: `Os dados pessoais e os conteúdos tratados no âmbito do serviço são, por sua vez, alojados e localizados nos termos da Política de Privacidade, para a qual se remete.` },
        ],
      },
      {
        heading: `3. Atividade e zona de comercialização`,
        blocks: [
          { kind: 'p', value: `A Bellajour exerce uma atividade de edição e venda em linha de álbuns de fotografias personalizados (capa ilustrada gerada por IA, paginação algorítmica sob controlo humano, versão digital HD incluída).` },
          { kind: 'p', value: `Os produtos são comercializados no território da União Europeia. Qualquer extensão a outros territórios será objeto de atualização das presentes menções e das condições aplicáveis.` },
        ],
      },
      {
        heading: `4. Segurança dos produtos (Regulamento (UE) 2023/988 — GPSR)`,
        blocks: [
          { kind: 'p', value: `Na aceção do Regulamento (UE) 2023/988 relativo à segurança geral dos produtos:` },
          { kind: 'p', value: `A Bellajour, que comercializa o álbum sob a sua marca, é o fabricante (artigos 3.º, n.º 8, e 13.º) e é ela própria a pessoa responsável estabelecida na União Europeia (artigo 16.º). As obrigações correspondentes não são delegadas; o fabrico físico é confiado a um subcontratante de produção estabelecido na União Europeia.` },
          { kind: 'list', items: [
            `Rastreabilidade: cada álbum é identificado pelo seu número de encomenda, constante da guia de entrega.`,
            `Contacto de segurança do produto: contact@bellajour.com. Qualquer problema de segurança pode ser-nos comunicado para este endereço.`,
            `Notificação às autoridades: em caso de incidente de segurança, a Bellajour procede às notificações exigidas através do portal europeu Safety Business Gateway (artigo 20.º).`,
            `Recolha: em caso de recolha, os clientes afetados são contactados por e-mail para o endereço indicado na encomenda; o cliente compromete-se a manter os seus dados de contacto atualizados.`,
          ] },
        ],
      },
      {
        heading: `5. Acessibilidade (Ato Europeu da Acessibilidade)`,
        blocks: [
          { kind: 'p', value: `A Diretiva (UE) 2019/882 («European Accessibility Act»), transposta em Portugal pelo Decreto-Lei n.º 82/2022 e pela Portaria n.º 220/2023, prevê uma isenção para as microempresas (menos de 10 pessoas e volume de negócios ou balanço anual inferior a 2 milhões de euros).` },
          { kind: 'p', value: `A Bellajour insere-se nesta categoria e está, por esse motivo, isenta das obrigações de acessibilidade previstas por este ato.` },
          { kind: 'p', value: `A Bellajour procura, ainda assim, no âmbito de uma obrigação de meios (e não de resultado), melhorar progressivamente a acessibilidade do seu sítio. Qualquer dificuldade de acesso pode ser comunicada para contact@bellajour.com; esforçamo-nos por responder num prazo razoável.` },
        ],
      },
      {
        heading: `6. Direito de livre resolução e a sua exceção`,
        blocks: [
          { kind: 'p', value: `Nos contratos à distância, o consumidor dispõe, em princípio, de um direito de livre resolução de 14 dias (artigo 10.º do DL 24/2014).` },
          { kind: 'p', value: `Contudo, nos termos do artigo 17.º, n.º 1, alínea c), do DL 24/2014, este direito não se aplica aos bens manifestamente personalizados — como é o caso dos álbuns Bellajour, confecionados a partir das suas fotografias e de uma capa criada apenas para si.` },
          { kind: 'p', value: `Esta exceção produz efeitos no momento exato da validação da maquete, concretizada por uma caixa de seleção dedicada e com registo de data e hora:` },
          { kind: 'list', items: [
            `antes desta validação, a sua encomenda não é definitiva e o adiantamento pago é integralmente reembolsável (sem custos nem penalização);`,
            `a partir desta validação, a encomenda é definitiva e não resolúvel.`,
          ] },
          { kind: 'p', value: `O detalhe deste mecanismo consta do artigo 8.º das Condições Gerais de Venda, para o qual se remete.` },
        ],
      },
      {
        heading: `7. Informações pré-contratuais`,
        blocks: [
          { kind: 'p', value: `Nos termos do artigo 4.º do DL 24/2014, as informações pré-contratuais essenciais são disponibilizadas antes da encomenda:` },
          { kind: 'list', items: [
            `Características essenciais do produto: ver a Ficha de Produto (formato, encadernação, paginação, impressão, ficheiros aceites).`,
            `Preços: exibidos em euros, com todos os impostos incluídos, segundo a grelha tarifária da Ficha de Produto; o regime de IVA e as modalidades de faturação constam do artigo 4.º das CGV.`,
            `Adiantamento, crédito (Instants) e pré-venda: artigo 5.º das CGV.`,
            `Modalidades de pagamento: por cartão através da Stripe (autenticação forte SCA / 3-D Secure 2) — artigo 7.º das CGV.`,
            `Entrega e prazo: artigo 10.º das CGV (o prazo é dado a conhecer antes da encomenda).`,
            `Transferência do risco: na receção física do bem — artigo 10.º das CGV.`,
            `Direito de livre resolução e a sua exceção: ver o §6 acima e o artigo 8.º das CGV.`,
            `Garantias legais: garantia de conformidade de 3 anos, presunção de 2 anos, direito de rejeição de 30 dias (DL n.º 84/2021) — artigo 9.º das CGV.`,
            `Duração e execução do contrato: a encomenda é executada até à entrega do álbum e à disponibilização do ficheiro HD.`,
          ] },
          { kind: 'p', value: `As Condições Gerais de Venda e a Ficha de Produto fazem parte integrante da relação contratual e prevalecem quanto ao detalhe dos pontos acima.` },
        ],
      },
      {
        heading: `8. Propriedade intelectual`,
        blocks: [
          { kind: 'p', value: `A marca «Bellajour», o nome de domínio, a identidade gráfica, os textos, a interface, bem como o estilo das capas ilustradas geradas por IA e a paginação dos álbuns, são propriedade da MISTÉRIO HERMÉTICO, LDA ou objeto de autorização de utilização.` },
          { kind: 'p', value: `É proibida qualquer reprodução, representação ou exploração, total ou parcial, sem autorização escrita prévia.` },
          { kind: 'p', value: `As fotografias fornecidas pelo cliente permanecem propriedade deste; o cliente garante deter todos os direitos sobre as mesmas (CGV, artigo 3.º).` },
        ],
      },
      {
        heading: `9. Dados pessoais`,
        blocks: [
          { kind: 'p', value: `O tratamento de dados pessoais (incluindo a análise automatizada das fotografias e o reconhecimento dos rostos) consta da Política de Privacidade (RGPD, artigos 13.º e 14.º).` },
          { kind: 'p', value: `A autoridade de controlo competente é a CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt), junto da qual pode ser apresentada qualquer reclamação.` },
        ],
      },
      {
        heading: `10. Litígios e resolução alternativa (RAL)`,
        blocks: [
          { kind: 'list', items: [
            `Reclamação direta: contact@bellajour.com.`,
            `Livro de Reclamações Eletrónico: https://www.livroreclamacoes.pt (obrigatório — ligação no rodapé do sítio).`,
            `Entidades de RAL portuguesas (Lei 144/2015): Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) ou, para as zonas não abrangidas por um centro regional, o CNIACC (www.cniacc.pt). A informação é obrigatória; a adesão da Bellajour é facultativa.`,
            `Lei aplicável: direito português, sem prejuízo das disposições imperativas mais protetoras da lei da residência do consumidor (Regulamento Roma I, artigo 6.º). O consumidor pode recorrer aos tribunais do seu país de residência.`,
          ] },
        ],
      },
    ],
  },
  en: {
    title: `Legal Notice and Pre-Contractual Information`,
    lastUpdated: `Version 1.0 — Effective 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `English translation for information only. The legally prevailing version is the Portuguese text; in the event of any discrepancy, the Portuguese text prevails.`,
    ],
    sections: [
      {
        heading: `1. Site publisher`,
        blocks: [
          { kind: 'p', value: `The website bellajour.fr (and its extension bellajour.com) is published by:` },
          { kind: 'list', items: [
            `MISTÉRIO HERMÉTICO, LDA (trading as "Bellajour")`,
            `Form: private limited company (sociedade por quotas) under Portuguese law`,
            `Share capital: €1,000, fully paid up`,
            `Registered office: Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbon, Portugal`,
            `NIPC / registration number: 519443284 — Commercial Registry of Odivelas`,
            `VAT identification number: PT519443284`,
            `Contact: contact@bellajour.com`,
          ] },
          { kind: 'p', value: `Publication management: carried out by the company's management.` },
        ],
      },
      {
        heading: `2. Hosting provider`,
        blocks: [
          { kind: 'p', value: `The website is hosted by:` },
          { kind: 'p', value: `Vercel Inc. — 440 N Barranca Ave #4133, Covina, CA 91723, United States.` },
          { kind: 'p', value: `Personal data and content processed in connection with the service are hosted and located in accordance with the Privacy Policy, to which reference is made.` },
        ],
      },
      {
        heading: `3. Activity and area of sale`,
        blocks: [
          { kind: 'p', value: `Bellajour carries out an activity of online publishing and sale of personalised photo albums (AI-generated illustrated cover, algorithmic layout under human control, HD digital version included).` },
          { kind: 'p', value: `The products are sold within the European Union. Any extension to other territories will be the subject of an update to this notice and the applicable terms.` },
        ],
      },
      {
        heading: `4. Product safety (Regulation (EU) 2023/988 — GPSR)`,
        blocks: [
          { kind: 'p', value: `Within the meaning of Regulation (EU) 2023/988 on general product safety:` },
          { kind: 'p', value: `Bellajour, which markets the album under its brand, is the manufacturer (Articles 3(8) and 13) and is itself the responsible person established in the European Union (Article 16). The corresponding obligations are not delegated; physical manufacturing is entrusted to a production subcontractor established in the European Union.` },
          { kind: 'list', items: [
            `Traceability: each album is identified by its order number, shown on the delivery slip.`,
            `Product safety contact: contact@bellajour.com. Any safety concern may be reported to us at this address.`,
            `Notification to authorities: in the event of a safety incident, Bellajour carries out the required notifications via the European Safety Business Gateway portal (Article 20).`,
            `Recall: in the event of a recall, the affected customers are contacted by email at the address provided with the order; the customer undertakes to keep their contact details up to date.`,
          ] },
        ],
      },
      {
        heading: `5. Accessibility (European Accessibility Act)`,
        blocks: [
          { kind: 'p', value: `Directive (EU) 2019/882 ("European Accessibility Act"), transposed in Portugal by Decreto-Lei no. 82/2022 and Portaria no. 220/2023, provides for an exemption for micro-enterprises (fewer than 10 persons and annual turnover or balance sheet below €2 million).` },
          { kind: 'p', value: `Bellajour falls within this category and is therefore exempt from the accessibility obligations laid down by this act.` },
          { kind: 'p', value: `Bellajour nonetheless endeavours, as an obligation of means (and not of result), to progressively improve the accessibility of its website. Any access difficulty may be reported to contact@bellajour.com; we strive to respond within a reasonable time.` },
        ],
      },
      {
        heading: `6. Right of withdrawal and its exception`,
        blocks: [
          { kind: 'p', value: `For distance contracts, the consumer in principle has a right of withdrawal of 14 days (Article 10 of DL 24/2014).` },
          { kind: 'p', value: `However, in accordance with Article 17(1)(c) of DL 24/2014, this right does not apply to clearly personalised goods — as is the case for Bellajour albums, made from your photos and a cover created for you alone.` },
          { kind: 'p', value: `This exception takes effect at the precise moment the proof is validated, evidenced by a dedicated, timestamped checkbox:` },
          { kind: 'list', items: [
            `before this validation, your order is not definitive and the deposit paid is fully refundable (no charge or penalty);`,
            `from this validation, the order is definitive and non-cancellable.`,
          ] },
          { kind: 'p', value: `The details of this mechanism appear in Article 8 of the Terms and Conditions of Sale, to which reference is made.` },
        ],
      },
      {
        heading: `7. Pre-contractual information`,
        blocks: [
          { kind: 'p', value: `In accordance with Article 4 of DL 24/2014, the essential pre-contractual information is made available before the order:` },
          { kind: 'list', items: [
            `Essential characteristics of the product: see the Product Sheet (format, binding, pagination, printing, accepted files).`,
            `Prices: displayed in euros, inclusive of all taxes, according to the price list in the Product Sheet; the VAT regime and invoicing arrangements appear in Article 4 of the T&Cs.`,
            `Deposit, credit (Instants) and pre-sale: Article 5 of the T&Cs.`,
            `Payment methods: by card via Stripe (strong authentication SCA / 3-D Secure 2) — Article 7 of the T&Cs.`,
            `Delivery and time: Article 10 of the T&Cs (the time is made known to you before the order).`,
            `Transfer of risk: upon physical receipt of the goods — Article 10 of the T&Cs.`,
            `Right of withdrawal and its exception: see §6 above and Article 8 of the T&Cs.`,
            `Legal guarantees: conformity guarantee of 3 years, presumption of 2 years, right of rejection of 30 days (DL no. 84/2021) — Article 9 of the T&Cs.`,
            `Duration and performance of the contract: the order is performed until delivery of the album and provision of the HD file.`,
          ] },
          { kind: 'p', value: `The Terms and Conditions of Sale and the Product Sheet form an integral part of the contractual relationship and prevail for the details of the above points.` },
        ],
      },
      {
        heading: `8. Intellectual property`,
        blocks: [
          { kind: 'p', value: `The "Bellajour" brand, the domain name, the graphic identity, the texts, the interface, as well as the style of the AI-generated illustrated covers and the layout of the albums, are the property of MISTÉRIO HERMÉTICO, LDA or are subject to a licence of use.` },
          { kind: 'p', value: `Any reproduction, representation or exploitation, in whole or in part, without prior written authorisation, is prohibited.` },
          { kind: 'p', value: `The photographs provided by the customer remain the customer's property; the customer warrants that they hold all rights to them (T&Cs, Article 3).` },
        ],
      },
      {
        heading: `9. Personal data`,
        blocks: [
          { kind: 'p', value: `The processing of personal data (including the automated analysis of photos and facial recognition) is described in the Privacy Policy (GDPR, Articles 13 and 14).` },
          { kind: 'p', value: `The competent supervisory authority is the CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt), with which any complaint may be lodged.` },
        ],
      },
      {
        heading: `10. Disputes and alternative resolution (ADR)`,
        blocks: [
          { kind: 'list', items: [
            `Direct complaint: contact@bellajour.com.`,
            `Electronic Complaints Book (Livro de Reclamações Eletrónico): https://www.livroreclamacoes.pt (mandatory — link in the website footer).`,
            `Portuguese ADR bodies (Law 144/2015): Lisbon Consumer Dispute Arbitration Centre (www.centroarbitragemlisboa.pt) or, for areas not covered by a regional centre, CNIACC (www.cniacc.pt). The information is mandatory; Bellajour's adherence is optional.`,
            `Governing law: Portuguese law, without prejudice to the more protective mandatory provisions of the consumer's country of residence (Rome I Regulation, Article 6). The consumer may bring proceedings before the courts of their country of residence.`,
          ] },
        ],
      },
    ],
  },
}
