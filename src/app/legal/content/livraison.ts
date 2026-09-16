import type { LocalizedDoc } from '../types'
import { FRANCO_CENTIMES, ZONES_PORT } from '@/lib/atelier/livraison'
import { PAYS_LIBELLE } from '@/lib/atelier/pays'
import { QUANTITE_MAX, REMISE_DEUXIEME_PCT, REMISE_SUIVANTS_PCT } from '@/lib/atelier/exemplaires'
import { JOURS_LIVRAISON } from '@/lib/atelier/urgence'

/* LA PAGE LIVRAISON (16/09/2026) — la politique de livraison du tableur
   « Prix & Marge v3 » de Mathias, validée par Louis, écrite pour le client.
   Trois langues, comme les autres pages légales ; le portugais fait foi.

   TOUS LES NOMBRES SONT DÉRIVÉS DU CODE : les zones et leurs montants de
   `livraison.ts` (ZONES_PORT, FRANCO_CENTIMES), le dégressif d'`exemplaires.ts`,
   le délai d'`urgence.ts`. Rien ne se recopie à la main : le jour où une zone
   bouge, cette page, le bon de commande, le checkout et les CGV bougent
   ensemble. Les délais de fabrication et d'acheminement viennent de la page
   « Production and shipping » de cloudprinter.com (relevé du 16/09/2026,
   docs/reference/SPECS-CLOUDPRINTER.md) : magazine 3 jours ouvrés, Ground 3 à
   7 jours avec suivi. */

const FRANCO = FRANCO_CENTIMES / 100
const ZONE_A = ZONES_PORT.A.centimes / 100
const ZONE_B = ZONES_PORT.B.centimes / 100
const PAYS_A_FR = ZONES_PORT.A.pays.map((c) => PAYS_LIBELLE[c]).join(', ')
const PAYS_B_FR = ZONES_PORT.B.pays.map((c) => PAYS_LIBELLE[c]).join(', ')
const PAYS_A_PT = 'França, Alemanha, Espanha, Países Baixos, Polónia, Reino Unido, Bélgica, Áustria, Chéquia, Hungria'
const PAYS_B_PT = 'Itália, Irlanda, Suécia, Dinamarca, Roménia, Luxemburgo, Portugal, Finlândia, Grécia, Estados Unidos'
const PAYS_A_EN = 'France, Germany, Spain, Netherlands, Poland, United Kingdom, Belgium, Austria, Czechia, Hungary'
const PAYS_B_EN = 'Italy, Ireland, Sweden, Denmark, Romania, Luxembourg, Portugal, Finland, Greece, United States'
const PAYS_C_FR = 'Suisse, Norvège, Chypre, Malte, Slovénie, Bulgarie, Croatie, Estonie, Lettonie, Lituanie, Slovaquie, Brésil'
const PAYS_C_PT = 'Suíça, Noruega, Chipre, Malta, Eslovénia, Bulgária, Croácia, Estónia, Letónia, Lituânia, Eslováquia, Brasil'
const PAYS_C_EN = 'Switzerland, Norway, Cyprus, Malta, Slovenia, Bulgaria, Croatia, Estonia, Latvia, Lithuania, Slovakia, Brazil'

export const LIVRAISON: LocalizedDoc = {
  fr: {
    title: `Livraison`,
    lastUpdated: `Version 1.0 — En vigueur le 16/09/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Ce que coûte la livraison, où nous livrons, et quand votre magazine arrive. Cette page reprend l'article 4 bis des Conditions générales de vente, qui fait foi.`,
    ],
    sections: [
      {
        heading: `1. Fabriqué à la commande`,
        blocks: [
          { kind: 'p', value: `Chaque magazine est imprimé après votre validation, pour vous seul. Il n'y a pas de stock : c'est ce qui explique le délai, et c'est aussi ce qui fait qu'aucun exemplaire n'est fabriqué avant que vous ayez dit oui.` },
        ],
      },
      {
        heading: `2. Les frais de livraison`,
        blocks: [
          { kind: 'p', value: `Les frais sont toutes taxes comprises, par commande, quel que soit le nombre d'exemplaires. Ils s'affichent sur votre page de commande, avant tout paiement.` },
          { kind: 'table', columns: [`Zone`, `Pays`, `Frais`], rows: [
            [`A`, PAYS_A_FR, `${ZONE_A} €`],
            [`B`, PAYS_B_FR, `${ZONE_B} €`],
            [`C`, PAYS_C_FR, `Chiffrés pour votre pays et votre colis, affichés avant paiement`],
          ] },
          { kind: 'p', value: `Livraison offerte dès ${FRANCO} € de magazines dans une même commande, remises déduites. En France, c'est à partir de 44 pages.` },
          { kind: 'p', value: `Plusieurs exemplaires du même numéro ? Jusqu'à ${QUANTITE_MAX}, depuis votre page de commande : le 2e à −${REMISE_DEUXIEME_PCT} %, le 3e et les suivants à −${REMISE_SUIVANTS_PCT} %. Les frais de livraison ne changent pas, et les exemplaires partent ensemble.` },
        ],
      },
      {
        heading: `3. Les délais`,
        blocks: [
          { kind: 'p', value: `Votre couverture vous est proposée sous 48 heures après le dépôt de vos photos. Après votre validation de la maquette, comptez ${JOURS_LIVRAISON} jours : 3 jours ouvrés de fabrication, puis 3 à 7 jours d'acheminement, avec un lien de suivi du colis dès l'expédition. Ce délai n'excède jamais 30 jours. Hors Union européenne, les formalités de douane peuvent s'y ajouter.` },
        ],
      },
      {
        heading: `4. Où nous livrons`,
        blocks: [
          { kind: 'p', value: `Dans les pays de l'Union européenne, au Royaume-Uni, en Suisse, en Norvège, aux États-Unis et au Brésil. Vous indiquez votre pays dans le questionnaire et pouvez en changer jusqu'au paiement : le prix du magazine (TVA de votre pays) et les frais de livraison sont recalculés. Pour le Royaume-Uni, la Suisse, la Norvège, les États-Unis et le Brésil, les droits et taxes d'importation éventuels sont à votre charge à l'arrivée.` },
        ],
      },
      {
        heading: `5. Un colis abîmé ou perdu`,
        blocks: [
          { kind: 'p', value: `Le risque ne vous est transféré qu'à la réception. Un magazine abîmé pendant le transport est réimprimé en priorité, ou remboursé : écrivez à contact@bellajour.com dans les 7 jours, avec une photo. Le détail est dans la Politique de remboursement.` },
        ],
      },
    ],
  },
  pt: {
    title: `Entrega`,
    lastUpdated: `Versão 1.0 — Em vigor em 16/09/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Quanto custa a entrega, onde entregamos e quando chega a sua revista. Esta página retoma o artigo 4.º-A das Condições Gerais de Venda, que prevalece.`,
    ],
    sections: [
      {
        heading: `1. Fabricada por encomenda`,
        blocks: [
          { kind: 'p', value: `Cada revista é impressa depois da sua validação, só para si. Não há stock: é isso que explica o prazo, e é também o que garante que nenhum exemplar é fabricado antes de dizer que sim.` },
        ],
      },
      {
        heading: `2. Os custos de entrega`,
        blocks: [
          { kind: 'p', value: `Os custos incluem todos os impostos, por encomenda, qualquer que seja o número de exemplares. São exibidos na sua página de encomenda, antes de qualquer pagamento.` },
          { kind: 'table', columns: [`Zona`, `Países`, `Custo`], rows: [
            [`A`, PAYS_A_PT, `${ZONE_A} €`],
            [`B`, PAYS_B_PT, `${ZONE_B} €`],
            [`C`, PAYS_C_PT, `Calculado para o seu país e a sua encomenda, exibido antes do pagamento`],
          ] },
          { kind: 'p', value: `Entrega oferecida a partir de ${FRANCO} € de revistas numa mesma encomenda, descontos deduzidos.` },
          { kind: 'p', value: `Vários exemplares do mesmo número? Até ${QUANTITE_MAX}, a partir da sua página de encomenda: o 2.º a −${REMISE_DEUXIEME_PCT} %, o 3.º e seguintes a −${REMISE_SUIVANTS_PCT} %. Os custos de entrega não mudam, e os exemplares seguem juntos.` },
        ],
      },
      {
        heading: `3. Os prazos`,
        blocks: [
          { kind: 'p', value: `A sua capa é-lhe proposta no prazo de 48 horas após o carregamento das fotografias. Após a validação da maquete, conte com ${JOURS_LIVRAISON} dias: 3 dias úteis de fabrico e 3 a 7 dias de transporte, com uma hiperligação de seguimento da encomenda a partir da expedição. Este prazo nunca excede 30 dias. Fora da União Europeia, podem acrescer as formalidades aduaneiras.` },
        ],
      },
      {
        heading: `4. Onde entregamos`,
        blocks: [
          { kind: 'p', value: `Nos países da União Europeia, no Reino Unido, na Suíça, na Noruega, nos Estados Unidos e no Brasil. Indica o seu país no questionário e pode alterá-lo até ao pagamento: o preço da revista (IVA do seu país) e os custos de entrega são recalculados. Para o Reino Unido, a Suíça, a Noruega, os Estados Unidos e o Brasil, os eventuais direitos e impostos de importação ficam a seu cargo à chegada.` },
        ],
      },
      {
        heading: `5. Uma encomenda danificada ou perdida`,
        blocks: [
          { kind: 'p', value: `O risco só é transferido para si na receção. Uma revista danificada durante o transporte é reimpressa com prioridade, ou reembolsada: escreva para contact@bellajour.com no prazo de 7 dias, com uma fotografia. O detalhe consta da Política de reembolso.` },
        ],
      },
    ],
  },
  en: {
    title: `Delivery`,
    lastUpdated: `Version 1.0 — Effective 16/09/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `What delivery costs, where we deliver, and when your magazine arrives. This page restates Article 4a of the Terms and Conditions of Sale, which prevail.`,
    ],
    sections: [
      {
        heading: `1. Made to order`,
        blocks: [
          { kind: 'p', value: `Each magazine is printed after your validation, for you alone. There is no stock: that is what explains the lead time, and it is also what guarantees that no copy is made before you say yes.` },
        ],
      },
      {
        heading: `2. Delivery costs`,
        blocks: [
          { kind: 'p', value: `Costs include all taxes, per order, whatever the number of copies. They are shown on your order page, before any payment.` },
          { kind: 'table', columns: [`Zone`, `Countries`, `Cost`], rows: [
            [`A`, PAYS_A_EN, `€${ZONE_A}`],
            [`B`, PAYS_B_EN, `€${ZONE_B}`],
            [`C`, PAYS_C_EN, `Quoted for your country and parcel, shown before payment`],
          ] },
          { kind: 'p', value: `Free delivery from €${FRANCO} of magazines in the same order, after discounts.` },
          { kind: 'p', value: `Several copies of the same issue? Up to ${QUANTITE_MAX}, from your order page: the 2nd at −${REMISE_DEUXIEME_PCT}%, the 3rd and following at −${REMISE_SUIVANTS_PCT}%. Delivery costs do not change, and the copies ship together.` },
        ],
      },
      {
        heading: `3. Lead times`,
        blocks: [
          { kind: 'p', value: `Your cover is proposed within 48 hours of uploading your photos. After you validate the proof, allow ${JOURS_LIVRAISON} days: 3 business days of manufacturing, then 3 to 7 days in transit, with a parcel tracking link from dispatch. This never exceeds 30 days. Outside the European Union, customs formalities may add to it.` },
        ],
      },
      {
        heading: `4. Where we deliver`,
        blocks: [
          { kind: 'p', value: `To the countries of the European Union, the United Kingdom, Switzerland, Norway, the United States and Brazil. You indicate your country in the questionnaire and may change it until payment: the magazine price (VAT of your country) and delivery costs are recalculated. For the United Kingdom, Switzerland, Norway, the United States and Brazil, any import duties and taxes are payable by you on arrival.` },
        ],
      },
      {
        heading: `5. A damaged or lost parcel`,
        blocks: [
          { kind: 'p', value: `Risk passes to you only on receipt. A magazine damaged in transit is reprinted as a priority, or refunded: write to contact@bellajour.com within 7 days, with a photo. Details are in the Refund Policy.` },
        ],
      },
    ],
  },
}
