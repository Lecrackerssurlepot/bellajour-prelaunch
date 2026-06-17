import type { LocalizedDoc } from '../types'

/* POLITIQUE DE REMBOURSEMENT ET RETOURS — transcription fidèle de
   legal-source/remboursement/FR/…docx (v3.0).
   PT : transcription fidèle de legal-source/remboursement/PT/…docx (clé `pt`
   ci-dessous), parité structurelle 1:1 avec le FR.
   EN : transcription fidèle de legal-source/remboursement/EN/REFUND AND RETURNS
   POLICY — BELLAJOUR.docx (clé `en` ci-dessous), parité 1:1 également. */

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
  pt: {
    title: `Política de reembolso e devoluções`,
    lastUpdated: `Versão 3.0 — Em vigor em 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Texto de referência (versão portuguesa), juridicamente prevalecente. As traduções para francês e inglês são meramente informativas. A ler em conjunto com as Condições Gerais de Venda (artigos 5.º, 8.º e 9.º) e a Política de Privacidade.`,
    ],
    sections: [
      {
        heading: `1. Espírito desta política`,
        blocks: [
          { kind: 'p', value: `Cada álbum Bellajour é um livro único, confecionado de acordo com as suas especificações. Esta política explica, com transparência, o que é reembolsável, o que não é, e como tratamos qualquer problema. Não reduz as suas garantias legais (ver §5), que são irrenunciáveis.` },
        ],
      },
      {
        heading: `2. Direito de livre resolução: porque não se aplica`,
        blocks: [
          { kind: 'p', value: `Nos termos do artigo 17.º, n.º 1, alínea c), do DL 24/2014 (que transpõe a Diretiva 2011/83/UE), o direito de livre resolução de 14 dias não se aplica aos álbuns Bellajour, que são bens manifestamente personalizados, criados a partir das suas fotografias e de uma capa gerada apenas para si.` },
          { kind: 'p', value: `A sua encomenda torna-se definitiva e não resolúvel no momento exato da validação da maquete (caixa de seleção dedicada + registo de data e hora). O cliente é informado desta exceção, de forma clara e legível, antes do pagamento do adiantamento e antes da validação da maquete.` },
        ],
      },
      {
        heading: `3. Reembolso do adiantamento (pré-venda)`,
        blocks: [
          { kind: 'p', value: `O momento em que solicita a interrupção da sua encomenda determina o reembolso:` },
          { kind: 'table', columns: [`Etapa`, `Reembolso`], rows: [
            [`Antes da validação da maquete (independentemente do estado de execução, incluindo o carregamento das fotografias)`, `100 % do adiantamento efetivamente pago — sem retenção, sem custos e sem penalização («reserva sem risco»)`],
            [`Após a validação da maquete`, `Encomenda definitiva: sem reembolso a este título, sem prejuízo das garantias legais (§5) e da impossibilidade de produzir/entregar (§7)`],
          ] },
          { kind: 'p', value: `Reembolso = montante efetivamente pago. O crédito (Instants) de 30 € é uma vantagem comercial; apenas o montante pago é reembolsado:` },
          { kind: 'list', items: [
            `Fundador: pagou 25 € → 25 € reembolsados; a bonificação de 5 €, nunca desembolsada, não é reembolsável.`,
            `Standard: pagou 30 € → 30 € reembolsados.`,
            `Código influenciador: pagou 25 € → 25 € reembolsados; a bonificação de 5 € não é reembolsável.`,
          ] },
          { kind: 'p', value: `O crédito (Instants) atribuído (30 €) é anulado em caso de reembolso em numerário.` },
        ],
      },
      {
        heading: `4. Defeitos: o que reparamos ou reembolsamos`,
        blocks: [
          { kind: 'p', value: `Independentemente da exceção acima, assumimos qualquer defeito que nos seja imputável. O nosso meio prioritário de reposição da conformidade é a reimpressão.` },
          { kind: 'table', columns: [`Situação`, `Compromisso`, `Prazo de comunicação`], rows: [
            [`Álbum danificado no transporte`, `Reimpressão prioritária ou reembolso`, `7 dias após a receção, com fotografias`],
            [`Álbum não conforme à maquete validada (erro de produção)`, `Reimpressão gratuita ou reembolso total`, `Até 30 dias`],
            [`Capa não conforme à validada`, `Reimpressão ou reembolso`, `Até 30 dias`],
            [`Qualidade de impressão manifestamente defeituosa (cores fora de tolerância, páginas em falta)`, `Reimpressão ou reembolso`, `Até 30 dias`],
            [`Não entrega do ficheiro digital HD incluído`, `Entrega do ficheiro ou reembolso da parte correspondente`, `De imediato`],
            [`Defeito menor (ligeira variação cromática dentro das tolerâncias anunciadas)`, `Gesto comercial possível — não é obrigação legal`, `—`],
          ] },
          { kind: 'p', value: `Importante — ecrã ≠ impressão. A variação cromática normal entre a exibição no ecrã (RGB retroiluminado) e a impressão em papel (CMYK), dentro das tolerâncias usuais, não constitui defeito (CGV artigo 6.º).` },
        ],
      },
      {
        heading: `5. As suas garantias legais (sempre aplicáveis)`,
        blocks: [
          { kind: 'p', value: `Nos termos do Decreto-Lei n.º 84/2021:` },
          { kind: 'list', items: [
            `Garantia de conformidade: 3 anos a contar da entrega (artigo 12.º).`,
            `Presunção de não conformidade: 2 anos — durante 24 meses cabe à Bellajour provar a conformidade (artigo 13.º).`,
            `Direito de rejeição: 30 dias — pode exigir diretamente a substituição ou a resolução, sem condição; este prazo conta-se da entrega ou da descoberta de um defeito não aparente.`,
            `Hierarquia dos meios: primeiro, reparação ou substituição (reimpressão); subsidiariamente, redução do preço ou resolução, se a reimpressão for impossível, desproporcionada, falhar ou se repetir.`,
          ] },
          { kind: 'p', value: `Nenhuma cláusula desta política pode excluir ou reduzir estas garantias.` },
        ],
      },
      {
        heading: `6. Procedimento — como nos contactar`,
        blocks: [
          { kind: 'list', items: [
            `Escreva para contact@bellajour.com com o seu número de encomenda e fotografias do defeito.`,
            `Respondemos no prazo de 5 dias úteis.`,
            `Solução: reimpressão prioritária ou reembolso (parcial ou total consoante a extensão do defeito).`,
            `Se for necessária uma devolução física (defeito grave), os custos de devolução são da nossa responsabilidade.`,
            `Reembolsos efetuados em numerário no meio de pagamento original, no prazo máximo de 14 dias após a aceitação da reclamação (artigo 12.º do DL 24/2014). No plano contabilístico, o reembolso de um adiantamento já faturado dá lugar a uma nota de crédito que anula a fatura; esta nota de crédito é um documento contabilístico e não um vale que substitua o reembolso em numerário.`,
            `Para evitar desperdício, um álbum personalizado não conforme geralmente não tem de ser devolvido: privilegia-se a reimpressão.`,
          ] },
          { kind: 'p', value: `Conservação de provas. A Bellajour conserva durante 10 anos (Código Comercial, artigo 40.º) os elementos de prova da encomenda e da validação (versão das CGV aceite, registos temporais de aceitação, carregamento e validação da maquete, identificador da transação Stripe).` },
        ],
      },
      {
        heading: `7. Bónus adquiridos, créditos e impossibilidade de produzir`,
        blocks: [
          { kind: 'p', value: `7.1 Elementos sempre adquiridos. Mesmo em caso de litígio ou anulação relativa ao álbum físico, mantêm-se definitivamente adquiridos: os Instants creditados, a ilustração de capa já entregue e o ficheiro digital HD já entregue (incluído em todas as encomendas). Apenas o álbum físico não produzido pode ser objeto de reembolso.` },
          { kind: 'p', value: `7.2 Páginas de indicação (apadrinhamento). As páginas oferecidas por indicação não são reembolsáveis em dinheiro; são utilizáveis em encomendas futuras nas condições do programa. São anuladas se o adiantamento associado for reembolsado (CGV art. 5.6).` },
          { kind: 'p', value: `7.3 Impossibilidade de produzir ou entregar. Se a Bellajour não puder produzir ou entregar (falha interna, falha do impressor parceiro, força maior, cessação de atividade), qualquer montante pago é integralmente reembolsado em numerário, sem condição.` },
        ],
      },
      {
        heading: `8. Reclamações e resolução alternativa de litígios (RAL)`,
        blocks: [
          { kind: 'list', items: [
            `Reclamação direta: contact@bellajour.com (resposta no prazo de 5 dias úteis).`,
            `Livro de Reclamações Eletrónico: https://www.livroreclamacoes.pt (ligação no rodapé do sítio).`,
            `Entidades de RAL portuguesas (Lei 144/2015): Centro de Arbitragem de Conflitos de Consumo de Lisboa (www.centroarbitragemlisboa.pt) — centro competente para a sede da Bellajour — ou, para as zonas não abrangidas por um centro regional, o CNIACC (www.cniacc.pt). A informação é obrigatória; a adesão da Bellajour é facultativa.`,
            `Tribunais: o consumidor pode recorrer aos tribunais do seu país de residência (direito português aplicável, sem prejuízo das disposições imperativas mais protetoras — Regulamento Roma I, artigo 6.º).`,
          ] },
        ],
      },
    ],
  },
  en: {
    title: `Refund and Returns Policy`,
    lastUpdated: `Version 3.0 — Effective 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `English translation for information only. The legally prevailing version is the Portuguese text; in the event of any discrepancy, the Portuguese text prevails. To be read together with the Terms and Conditions of Sale (Articles 5, 8 and 9) and the Privacy Policy.`,
    ],
    sections: [
      {
        heading: `1. Spirit of this policy`,
        blocks: [
          { kind: 'p', value: `Each Bellajour album is a unique book, made to your specifications. This policy explains, transparently, what is refundable, what is not, and how we handle any problem. It does not reduce your legal guarantees (see §5), which cannot be waived.` },
        ],
      },
      {
        heading: `2. Right of withdrawal: why it does not apply`,
        blocks: [
          { kind: 'p', value: `In accordance with Article 17(1)(c) of DL 24/2014 (transposing Directive 2011/83/EU), the 14-day right of withdrawal (direito de livre resolução) does not apply to Bellajour albums, which are clearly personalised goods, created from your photos and a cover generated for you alone.` },
          { kind: 'p', value: `Your order becomes definitive and non-cancellable at the precise moment the proof is validated (dedicated checkbox + timestamp). You are informed of this exception, clearly and legibly, before paying the deposit and before validating the proof.` },
        ],
      },
      {
        heading: `3. Refund of the deposit (pre-sale orders)`,
        blocks: [
          { kind: 'p', value: `The moment at which you request to stop your order determines the refund:` },
          { kind: 'table', columns: [`Stage`, `Refund`], rows: [
            [`Before validation of the proof (whatever the stage of progress, including uploading of photos)`, `100% of the deposit actually paid — no deduction, no charge and no penalty ("risk-free reservation")`],
            [`After validation of the proof`, `Definitive order: no further refund on this basis, without prejudice to the legal guarantees (§5) and to the impossibility of producing/delivering (§7)`],
          ] },
          { kind: 'p', value: `Amount refunded = amount actually paid. The €30 credit (Instants) is a commercial benefit; only the amount paid is refunded:` },
          { kind: 'list', items: [
            `Founder: you paid €25 → €25 refunded; the €5 bonus, never disbursed, is not refundable.`,
            `Standard: you paid €30 → €30 refunded.`,
            `Influencer code: you paid €25 → €25 refunded; the €5 bonus is not refundable.`,
          ] },
          { kind: 'p', value: `The credit (Instants) granted (€30) is cancelled in the event of a cash refund.` },
        ],
      },
      {
        heading: `4. Defects: what Bellajour repairs or refunds`,
        blocks: [
          { kind: 'p', value: `Regardless of the exception above, we take responsibility for any defect attributable to us. Our primary means of restoring conformity is reprinting.` },
          { kind: 'table', columns: [`Situation`, `Our commitment`, `Reporting deadline`], rows: [
            [`Album damaged in transit`, `Priority reprint or refund`, `7 days after receipt, with photos`],
            [`Album not matching the validated proof (production error)`, `Free reprint or full refund`, `Within 30 days`],
            [`Cover not matching the validated one`, `Reprint or refund`, `Within 30 days`],
            [`Manifestly defective print quality (colours out of tolerance, missing pages)`, `Reprint or refund`, `Within 30 days`],
            [`Non-delivery of the included HD digital file`, `Delivery of the file or refund of the corresponding share`, `Immediately`],
            [`Minor defect (slight colour variation within the announced tolerances)`, `Possible goodwill gesture — not a legal obligation`, `—`],
          ] },
          { kind: 'p', value: `Important — screen ≠ print. A normal colour variation between on-screen display (backlit RGB) and paper printing (CMYK), within usual tolerances, does not constitute a defect (T&Cs Article 6).` },
        ],
      },
      {
        heading: `5. Your legal guarantees (always applicable)`,
        blocks: [
          { kind: 'p', value: `In accordance with Decreto-Lei no. 84/2021:` },
          { kind: 'list', items: [
            `Conformity guarantee: 3 years from delivery (Article 12).`,
            `Presumption of non-conformity: 2 years — for 24 months, it is for Bellajour to prove conformity (Article 13).`,
            `Right of rejeição: 30 days — you may directly demand replacement or termination, without condition; this period runs from delivery or from the discovery of a non-apparent defect.`,
            `Hierarchy of remedies: first repair or replacement (reprint); subsidiarily, price reduction or termination, if reprinting is impossible, disproportionate, fails or recurs.`,
          ] },
          { kind: 'p', value: `No clause of this policy may exclude or reduce these guarantees.` },
        ],
      },
      {
        heading: `6. Procedure — how to contact us`,
        blocks: [
          { kind: 'list', items: [
            `Write to contact@bellajour.com with your order number and photos of the defect.`,
            `We respond within 5 business days.`,
            `Solution: priority reprint or refund (partial or full depending on the extent of the defect).`,
            `If a physical return is necessary (serious defect), return costs are at our expense.`,
            `Refunds made in cash to the original means of payment, no later than 14 days after acceptance of the claim (Article 12 of DL 24/2014). For accounting purposes, the refund of an already-invoiced deposit gives rise to a credit note cancelling the invoice; this credit note is an accounting document and not a voucher replacing the cash refund.`,
            `To limit waste, a non-conforming personalised album generally does not have to be returned: reprinting is preferred.`,
          ] },
          { kind: 'p', value: `Retention of evidence. Bellajour retains for 10 years (Commercial Code, Article 40) the evidence of the order and validation (version of the T&Cs accepted, timestamps of acceptance, upload and proof validation, Stripe transaction identifier).` },
        ],
      },
      {
        heading: `7. Earned bonuses, credits, and cases where we cannot produce`,
        blocks: [
          { kind: 'p', value: `7.1 Items always earned. Even in the event of a dispute or cancellation concerning the physical album, the following remain definitively earned: the credited Instants, the cover illustration already delivered, and the HD digital file already delivered (included with every order). Only the unproduced physical album may be refunded.` },
          { kind: 'p', value: `7.2 Referral pages. Pages granted through referral are not refundable in cash; they may be used on future orders under the conditions of the programme. They are cancelled if the associated deposit is refunded (T&Cs Art. 5.6).` },
          { kind: 'p', value: `7.3 Impossibility of producing or delivering. If Bellajour cannot produce or deliver (internal failure, failure of the partner printer, force majeure, cessation of business), any amount paid is refunded in full, in cash, without condition.` },
        ],
      },
      {
        heading: `8. Complaints and alternative dispute resolution (ADR)`,
        blocks: [
          { kind: 'list', items: [
            `Direct complaint: contact@bellajour.com (response within 5 business days).`,
            `Electronic Complaints Book (Livro de Reclamações Eletrónico): https://www.livroreclamacoes.pt (link in the website footer).`,
            `Portuguese ADR bodies (Law 144/2015): Lisbon Consumer Dispute Arbitration Centre (www.centroarbitragemlisboa.pt) — the body competent for Bellajour's registered office — or, for areas not covered by a regional centre, CNIACC (www.cniacc.pt). The information is mandatory; Bellajour's adherence is optional.`,
            `Courts: the consumer may bring proceedings before the courts of their country of residence (Portuguese law applicable, without prejudice to the more protective mandatory provisions — Rome I Regulation, Article 6).`,
          ] },
        ],
      },
    ],
  },
}
