import type { LocalizedDoc } from '../types'

/* POLITIQUE DE CONFIDENTIALITÉ — transcription fidèle de
   legal-source/confidentialite/FR/…docx (v3.1). Remplace l'ancien contenu
   placeholder de src/app/confidentialite/page.tsx.
   PT : transcription fidèle de legal-source/confidentialite/PT/…docx (clé `pt`
   ci-dessous). Normalisations source→gabarit FR : §1 et §4, paragraphes sortis
   des listes pour coller au FR.
   EN : transcription fidèle de legal-source/confidentialite/EN/PRIVACY POLICY —
   BELLAJOUR.docx (clé `en` ci-dessous ; mêmes normalisations §1/§4). */

export const CONFIDENTIALITE: LocalizedDoc = {
  fr: {
    title: `Politique de confidentialité`,
    lastUpdated: `Version 3.1 — En vigueur le 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Traduction française à titre informatif. La version juridiquement prévalente est le texte portugais ; en cas de divergence, ce dernier prime. Cette politique complète les Conditions Générales de Vente, auxquelles elle est liée (RGPD, art. 13 et 14).`,
    ],
    sections: [
      {
        heading: `1. Qui est responsable de vos données`,
        blocks: [
          { kind: 'p', value: `Le responsable du traitement est MISTÉRIO HERMÉTICO, LDA (marque Bellajour), NIPC 519443284, dont le siège est situé Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbonne, Portugal.` },
          { kind: 'p', value: `Bellajour est responsable de traitement pour l'ensemble de ses opérations, y compris le traitement des photos que vous nous transmettez pour produire votre album : c'est Bellajour qui décide des finalités et des moyens. Bellajour n'est pas le sous-traitant du client.` },
          { kind: 'p', value: `Contact en matière de protection des données : contact@bellajour.com.` },
          { kind: 'p', value: `Délégué à la protection des données (DPO) : la désignation d'un DPO n'est pas obligatoire au lancement (pas de traitement à grande échelle au sens de l'article 37 du RGPD). Toute demande relative à vos données est traitée via contact@bellajour.com.` },
        ],
      },
      {
        heading: `2. Vos responsabilités sur le contenu que vous nous confiez`,
        blocks: [
          { kind: 'p', value: `Lorsque vous téléversez des photos, vous garantissez disposer de tous les droits nécessaires : droit à l'image des personnes figurant sur les clichés, autorité parentale ou autorisations pour les mineurs photographiés, et droits de propriété intellectuelle. Pour un usage purement personnel, vos photos relèvent en principe de l'exemption domestique (art. 2.2.c RGPD) ; mais dès leur transmission à Bellajour pour production, c'est Bellajour qui traite la donnée et en répond.` },
        ],
      },
      {
        heading: `3. Quelles données, pour quelles finalités, sur quelle base légale`,
        blocks: [
          { kind: 'table', columns: [`Catégorie de données`, `Finalité`, `Base légale (RGPD)`], rows: [
            [`Nom, e-mail, adresse postale`, `Commande, livraison, facturation, SAV`, `Exécution du contrat (art. 6.1.b)`],
            [`Données de paiement (via Stripe)`, `Traitement du paiement, prévention de la fraude`, `Exécution du contrat / obligation légale (6.1.b / 6.1.c)`],
            [`Photos et contenus téléversés`, `Production de l'album selon vos spécifications (tri, sélection, composition, génération de la couverture, fichier HD)`, `Exécution du contrat (6.1.b)`],
            [`Données biométriques (gabarit facial calculé à partir de vos photos)`, `Regroupement des photos par personne et étape de « Casting » (hiérarchisation des personnes)`, `Consentement explicite (art. 9.2.a) — voir §5`],
            [`Historique de commandes`, `Compte client, SAV, garanties légales`, `Exécution du contrat / obligation légale`],
            [`Données de facturation (nom, adresse, NIF si fourni, montant)`, `Émission des factures certifiées`, `Obligation légale (6.1.c)`],
            [`Preuves de commande et de validation (version des CGV acceptée et horodatage de l'acceptation, horodatage du téléversement, horodatage et version de la validation de la maquette, identifiant de transaction Stripe)`, `Preuve du consentement, gestion des litiges et obligations comptables`, `Obligation légale (6.1.c) et intérêt légitime (6.1.f)`],
            [`Logs de connexion, adresse IP`, `Sécurité technique, prévention des fraudes`, `Intérêt légitime (6.1.f)`],
            [`E-mail (newsletter)`, `Prospection commerciale`, `Consentement (case dédiée) — ou soft opt-in pour un client existant (voir §8)`],
            [`Données de session (panier)`, `Fonctionnement du site`, `Nécessité technique`],
            [`Cookies / pixel marketing (Meta)`, `Publicité ciblée et mesure publicitaire`, `Consentement (art. 6.1.a) — voir §8`],
          ] },
        ],
      },
      {
        heading: `4. Le traitement automatisé de vos photos (transparence)`,
        blocks: [
          { kind: 'p', value: `Pour composer votre album, vos photos font l'objet d'une analyse automatisée : tri, scoring de qualité, sélection et mise en page. Une couverture illustrée est générée par IA dans un style propre à la marque.` },
          { kind: 'p', value: `La base légale est l'exécution du contrat (art. 6.1.b) pour ces opérations, à l'exception du regroupement par visage, qui relève du consentement explicite (art. 9 — voir §5).` },
          { kind: 'p', value: `Cette composition ne produit pas d'effet juridique ni d'effet significatif sur vous au sens de l'art. 22 RGPD : un contrôle humain intervient et vous validez la maquette finale.` },
          { kind: 'p', value: `Conformité AI Act (Règl. (UE) 2024/1689) : le moteur n'est pas, à ce jour, un système à haut risque ; il met en œuvre une catégorisation biométrique soumise à une obligation de transparence, satisfaite par la présente information.` },
          { kind: 'p', value: `Pas de réutilisation de vos photos à d'autres fins (marketing, entraînement d'IA, portfolio) sans votre consentement séparé, explicite et spécifique.` },
        ],
      },
      {
        heading: `5. Données biométriques — reconnaissance des visages`,
        blocks: [
          { kind: 'p', value: `5.1 Ce que nous faisons. Si vous y consentez, Bellajour calcule à partir de vos photos une empreinte faciale (gabarit) permettant de regrouper les photos par personne. Ce regroupement alimente l'étape de « Casting » (hiérarchisation et mise en avant des personnes clés dans l'album). Il s'agit d'un traitement de données biométriques au sens de l'article 9 du RGPD.` },
          { kind: 'p', value: `5.2 Base légale : votre consentement explicite (art. 9.2.a), recueilli avant l'analyse via une case à cocher dédiée, distincte des CGV et de la validation de la maquette.` },
          { kind: 'p', value: `5.3 Caractère facultatif. Ce consentement est libre. Si vous le refusez, votre album est composé normalement, sans l'étape de Casting ; aucune autre fonctionnalité n'est dégradée. Vous pouvez retirer votre consentement à tout moment, sans effet sur la licéité du traitement déjà effectué.` },
          { kind: 'p', value: `5.4 Traitement réalisé exclusivement dans l'Union européenne. La reconnaissance des visages est effectuée via le service Amazon Web Services (AWS) Rekognition, dans la région UE d'Irlande (eu-west-1). Le calcul de l'empreinte faciale et son traitement ont intégralement lieu au sein de l'Union européenne : aucun transfert de vos données biométriques n'a lieu en dehors de l'UE.` },
          { kind: 'p', value: `5.5 Durée — suppression dès la composition. L'empreinte faciale est conservée dans un espace de traitement temporaire, supprimé dès que la composition de votre album est terminée. Le gabarit n'est pas conservé au-delà et aucune base d'empreintes ou d'identités n'est constituée ni réutilisée d'une commande à l'autre.` },
          { kind: 'p', value: `5.6 Pas d'identification nominative. Bellajour ne rattache aucune identité civile aux visages ; le regroupement est purement technique et interne à votre commande.` },
        ],
      },
      {
        heading: `6. Photos potentiellement « révélatrices » et photos d'enfants`,
        blocks: [
          { kind: 'p', value: `6.1 Une photo peut révéler indirectement une origine, des convictions, un état de santé ou une orientation. Hors reconnaissance des visages (§5), Bellajour traite ces contenus sur la base de l'exécution du contrat (art. 6.1.b), sans en exploiter ni en déduire aucun attribut sensible, et applique des mesures de minimisation et d'accès restreint renforcées.` },
          { kind: 'p', value: `6.2 Pour les photos d'enfants fournies par un adulte : le client garantit disposer de l'autorité parentale ou des autorisations nécessaires ; Bellajour applique des mesures de sécurité et des durées de conservation renforcées (§7).` },
          { kind: 'p', value: `6.3 Mineurs. Le service n'est pas destiné aux personnes de moins de 18 ans ; aucun compte ni commande n'est ouvert à un mineur (CGV, art. 2).` },
        ],
      },
      {
        heading: `7. Combien de temps nous conservons vos données`,
        blocks: [
          { kind: 'p', value: `Les durées ci-dessous distinguent les obligations légales portugaises des choix de conservation documentés par Bellajour (RGPD, art. 5.1.e).` },
          { kind: 'table', columns: [`Donnée`, `Conservation`], rows: [
            [`Photos téléversées + fichier HD`, `Supprimées 90 jours après la livraison (sauf option de sauvegarde long terme future, qui ferait l'objet d'un consentement séparé)`],
            [`Gabarit biométrique`, `Supprimé dès la composition de l'album (voir §5.5)`],
            [`Compte client`, `Suppression 3 ans après le dernier achat ou contact`],
            [`Commandes, factures et preuves de validation`, `10 ans — obligation comptable et fiscale portugaise (Código Comercial, art. 40 ; CIVA / SAF-T)`],
            [`Données marketing (prospects)`, `3 ans après le dernier contact, ou jusqu'au retrait du consentement`],
            [`Logs techniques`, `12 mois`],
          ] },
        ],
      },
      {
        heading: `8. Cookies et communications marketing`,
        blocks: [
          { kind: 'p', value: `8.1 Cookies (directive ePrivacy ; Lei 41/2004). Le site utilise :` },
          { kind: 'list', items: [
            `des cookies strictement nécessaires (session, panier) — pas de consentement requis, mais déclarés ;`,
            `le pixel publicitaire Meta (Meta Ads / Meta Pixel), cookie marketing soumis à consentement préalable.`,
          ] },
          { kind: 'p', value: `Le bandeau de consentement permet d'accepter, refuser ou personnaliser avec la même facilité (pas de dark patterns). Le pixel Meta n'est activé qu'après votre consentement. La preuve du choix (date, version) est conservée et le consentement est re-sollicité périodiquement. Une politique cookies détaillée est accessible via le bandeau.` },
          { kind: 'p', value: `8.2 Partage avec Meta. Lorsque vous y consentez, certaines données de navigation sont transmises à Meta Platforms Ireland à des fins de mesure et de ciblage publicitaires ; Meta peut les transférer aux États-Unis, transfert couvert par le Data Privacy Framework (DPF). Pour ces opérations, Bellajour et Meta peuvent agir en responsables conjoints dans les limites définies par Meta.` },
          { kind: 'p', value: `8.3 Newsletter. L'inscription à la newsletter (gérée via Brevo) repose sur une case de consentement dédiée, non pré-cochée ; pour un client existant, un soft opt-in est possible (Lei 41/2004, art. 13.º, n.º 2). Chaque message comporte un lien de désinscription simple.` },
        ],
      },
      {
        heading: `9. À qui vos données sont transmises (sous-traitants et transferts)`,
        blocks: [
          { kind: 'p', value: `Chaque sous-traitant est lié par un contrat conforme à l'art. 28 RGPD (DPA).` },
          { kind: 'table', columns: [`Sous-traitant`, `Rôle`, `Localisation`, `Transfert hors UE`], rows: [
            [`AWS (Amazon Web Services)`, `Reconnaissance des visages (biométrie)`, `UE — Irlande (eu-west-1)`, `Non`],
            [`Stripe`, `Paiement (certifié PCI-DSS)`, `UE / États-Unis`, `Oui — DPF / CCT`],
            [`InvoiceXpress`, `Facturation certifiée`, `UE (Portugal)`, `Non`],
            [`Supabase`, `Base de données / registres de preuve`, `Union européenne`, `Non`],
            [`Cloudflare R2`, `Stockage des photos et du fichier HD`, `UE (restriction de juridiction UE) ; Cloudflare, Inc. établie aux États-Unis`, `Encadré DPF / CCT par précaution`],
            [`Vercel`, `Hébergement du site`, `États-Unis`, `Oui — DPF / CCT`],
            [`Brevo`, `E-mails transactionnels et newsletter`, `UE (France)`, `Non`],
            [`Imprimeur / sous-traitant de production`, `Production physique des albums`, `Union européenne`, `Non`],
            [`OpenAI`, `Analyse et préparation de la couverture illustrée`, `États-Unis`, `Oui — CCT`],
            [`Fal.ai`, `Génération de la couverture illustrée`, `États-Unis`, `Oui — CCT`],
            [`Meta (Pixel / Ads)`, `Publicité et mesure`, `Meta Ireland / États-Unis`, `Oui — DPF (sous consentement, §8)`],
          ] },
          { kind: 'p', value: `Transferts hors UE. Les transferts vers les États-Unis (Stripe, Vercel, OpenAI, Fal.ai, Meta, et le cas échéant Cloudflare) sont couverts par la décision d'adéquation EU-US Data Privacy Framework (DPF) lorsque le prestataire est certifié et, à défaut ou en complément, par les Clauses Contractuelles Types (CCT) de la Commission européenne. Vos données biométriques font exception : elles sont traitées intégralement au sein de l'UE (AWS, Irlande) et ne font l'objet d'aucun transfert hors UE (§5).` },
          { kind: 'p', value: `Bellajour ne vend pas vos données.` },
        ],
      },
      {
        heading: `10. Sécurité (art. 32 RGPD)`,
        blocks: [
          { kind: 'p', value: `Chiffrement en transit et au repos, accès restreint aux photos et aux contenus, authentification forte interne, politique d'habilitation des accès, journalisation des accès et procédure de notification des violations de données (CNPD sous 72 heures ; personnes concernées en cas de risque élevé).` },
        ],
      },
      {
        heading: `11. Vos droits`,
        blocks: [
          { kind: 'p', value: `Vous disposez des droits d'accès, rectification, effacement, limitation, opposition (immédiate pour le marketing direct), portabilité et retrait du consentement à tout moment (notamment pour la reconnaissance des visages et la newsletter).` },
          { kind: 'p', value: `Exercice : contact@bellajour.com (une vérification d'identité peut être demandée) ; réponse dans un délai d'un mois (prorogeable jusqu'à trois). Pour les mineurs photographiés, les droits sont exercés par les représentants légaux.` },
          { kind: 'p', value: `Vous avez le droit d'introduire une réclamation auprès de la CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt).` },
        ],
      },
      {
        heading: `12. Documentation interne et évolution`,
        blocks: [
          { kind: 'p', value: `Bellajour tient un registre des activités de traitement (art. 30) et réalise une analyse d'impact (AIPD/DPIA, art. 35) sur le traitement biométrique des photos.` },
          { kind: 'p', value: `Toute évolution future — notamment une « mémoire des visages » (conservation des gabarits d'une commande à l'autre pour le confort du compte) ou une application mobile — fera l'objet d'une information actualisée et, le cas échéant, d'un nouveau consentement spécifique avant sa mise en œuvre.` },
          { kind: 'p', value: `Le service est proposé au sein de l'Union européenne ; toute extension hors UE donnera lieu à une mise à jour de la présente politique.` },
        ],
      },
    ],
  },
  pt: {
    title: `Política de privacidade`,
    lastUpdated: `Versão 3.1 — Em vigor em 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `Texto de referência (versão portuguesa), juridicamente prevalecente. As traduções para francês e inglês são meramente informativas. Esta política complementa as Condições Gerais de Venda, às quais está ligada (RGPD, art. 13.º e 14.º).`,
    ],
    sections: [
      {
        heading: `1. Quem é responsável pelos seus dados`,
        blocks: [
          { kind: 'p', value: `O responsável pelo tratamento é a MISTÉRIO HERMÉTICO, LDA (marca Bellajour), NIPC 519443284, com sede no Beco de Santa Helena, 21A, 2.º, 1100-117 Lisboa, Portugal.` },
          { kind: 'p', value: `A Bellajour é responsável pelo tratamento de todas as suas operações, incluindo o tratamento das fotografias que nos transmite para produzir o seu álbum: é a Bellajour que decide as finalidades e os meios. A Bellajour não é subcontratante do cliente.` },
          { kind: 'p', value: `Contacto em matéria de proteção de dados: contact@bellajour.com.` },
          { kind: 'p', value: `Encarregado da Proteção de Dados (EPD/DPO): a designação de um EPD não é obrigatória no lançamento (não existe tratamento em larga escala na aceção do artigo 37.º do RGPD). Qualquer pedido relativo aos seus dados é tratado através de contact@bellajour.com.` },
        ],
      },
      {
        heading: `2. As suas responsabilidades sobre o conteúdo que nos confia`,
        blocks: [
          { kind: 'p', value: `Ao carregar fotografias, garante dispor de todos os direitos necessários: direito à imagem das pessoas retratadas, autoridade parental ou autorizações relativas a menores fotografados, e direitos de propriedade intelectual. Para um uso puramente pessoal, as suas fotografias estão, em princípio, abrangidas pela exceção doméstica (art. 2.º, n.º 2, al. c) do RGPD); mas a partir da sua transmissão à Bellajour para produção, é a Bellajour que trata os dados e por eles responde.` },
        ],
      },
      {
        heading: `3. Que dados, para que finalidades, com que base legal`,
        blocks: [
          { kind: 'table', columns: [`Categoria de dados`, `Finalidade`, `Base legal (RGPD)`], rows: [
            [`Nome, e-mail, morada postal`, `Encomenda, entrega, faturação, apoio ao cliente`, `Execução do contrato (art. 6.1.b)`],
            [`Dados de pagamento (via Stripe)`, `Processamento do pagamento, prevenção da fraude`, `Execução do contrato / obrigação legal (6.1.b / 6.1.c)`],
            [`Fotografias e conteúdos carregados`, `Produção do álbum de acordo com as suas especificações (triagem, seleção, composição, geração da capa, ficheiro HD)`, `Execução do contrato (6.1.b)`],
            [`Dados biométricos (gabarito facial calculado a partir das suas fotografias)`, `Agrupamento das fotografias por pessoa e etapa de «Casting» (hierarquização das pessoas)`, `Consentimento explícito (art. 9.2.a) — ver §5`],
            [`Histórico de encomendas`, `Conta de cliente, apoio ao cliente, garantias legais`, `Execução do contrato / obrigação legal`],
            [`Dados de faturação (nome, morada, NIF se fornecido, montante)`, `Emissão das faturas certificadas`, `Obrigação legal (6.1.c)`],
            [`Provas de encomenda e de validação (versão das CGV aceite e registo temporal da aceitação, registo temporal do carregamento, registo temporal e versão da validação da maquete, identificador da transação Stripe)`, `Prova do consentimento, gestão de litígios e obrigações contabilísticas`, `Obrigação legal (6.1.c) e interesse legítimo (6.1.f)`],
            [`Registos de ligação, endereço IP`, `Segurança técnica, prevenção de fraudes`, `Interesse legítimo (6.1.f)`],
            [`E-mail (newsletter)`, `Marketing direto`, `Consentimento (caixa dedicada) — ou soft opt-in para cliente existente (ver §8)`],
            [`Dados de sessão (carrinho)`, `Funcionamento do sítio`, `Necessidade técnica`],
            [`Cookies / pixel de marketing (Meta)`, `Publicidade direcionada e medição publicitária`, `Consentimento (art. 6.1.a) — ver §8`],
          ] },
        ],
      },
      {
        heading: `4. O tratamento automatizado das suas fotografias (transparência)`,
        blocks: [
          { kind: 'p', value: `Para compor o seu álbum, as suas fotografias são objeto de uma análise automatizada: triagem, classificação de qualidade, seleção e paginação. Uma capa ilustrada é gerada por IA num estilo próprio da marca.` },
          { kind: 'p', value: `A base legal é a execução do contrato (art. 6.1.b) para estas operações, com exceção do agrupamento por rosto, que assenta no consentimento explícito (art. 9.º — ver §5).` },
          { kind: 'p', value: `Esta composição não produz efeito jurídico nem efeito significativo sobre si na aceção do art. 22.º do RGPD: existe controlo humano e o cliente valida a maquete final.` },
          { kind: 'p', value: `Conformidade Regulamento da IA (Reg. (UE) 2024/1689): o motor não é, à data, um sistema de risco elevado; aplica uma categorização biométrica sujeita a uma obrigação de transparência, satisfeita pela presente informação.` },
          { kind: 'p', value: `Sem reutilização das suas fotografias para outros fins (marketing, treino de IA, portefólio) sem o seu consentimento separado, explícito e específico.` },
        ],
      },
      {
        heading: `5. Dados biométricos — reconhecimento dos rostos`,
        blocks: [
          { kind: 'p', value: `5.1 O que fazemos. Se consentir, a Bellajour calcula a partir das suas fotografias um gabarito facial que permite agrupar as fotografias por pessoa. Este agrupamento alimenta a etapa de «Casting» (hierarquização e destaque das pessoas-chave no álbum). Trata-se de um tratamento de dados biométricos na aceção do artigo 9.º do RGPD.` },
          { kind: 'p', value: `5.2 Base legal: o seu consentimento explícito (art. 9.2.a), recolhido antes da análise através de uma caixa de seleção dedicada, distinta das CGV e da validação da maquete.` },
          { kind: 'p', value: `5.3 Carácter facultativo. Este consentimento é livre. Se o recusar, o seu álbum é composto normalmente, sem a etapa de Casting; nenhuma outra funcionalidade é degradada. Pode retirar o seu consentimento a qualquer momento, sem efeito sobre a licitude do tratamento já efetuado.` },
          { kind: 'p', value: `5.4 Tratamento realizado exclusivamente na União Europeia. O reconhecimento dos rostos é efetuado através do serviço Amazon Web Services (AWS) Rekognition, na região da UE na Irlanda (eu-west-1). O cálculo do gabarito facial e o seu tratamento têm lugar integralmente na União Europeia: não ocorre qualquer transferência dos seus dados biométricos para fora da UE.` },
          { kind: 'p', value: `5.5 Duração — eliminação na composição. O gabarito facial é conservado num espaço de tratamento temporário, eliminado assim que a composição do seu álbum estiver concluída. O gabarito não é conservado para além disso e nenhuma base de gabaritos ou de identidades é constituída ou reutilizada de uma encomenda para outra.` },
          { kind: 'p', value: `5.6 Sem identificação nominativa. A Bellajour não associa qualquer identidade civil aos rostos; o agrupamento é puramente técnico e interno à sua encomenda.` },
        ],
      },
      {
        heading: `6. Fotografias potencialmente «reveladoras» e fotografias de crianças`,
        blocks: [
          { kind: 'p', value: `6.1 Uma fotografia pode revelar indiretamente uma origem, convicções, um estado de saúde ou uma orientação. Fora do reconhecimento dos rostos (§5), a Bellajour trata estes conteúdos com base na execução do contrato (art. 6.1.b), sem explorar nem deduzir qualquer atributo sensível, e aplica medidas reforçadas de minimização e de acesso restrito.` },
          { kind: 'p', value: `6.2 Quanto às fotografias de crianças fornecidas por um adulto: o cliente garante dispor da autoridade parental ou das autorizações necessárias; a Bellajour aplica medidas de segurança e prazos de conservação reforçados (§7).` },
          { kind: 'p', value: `6.3 Menores. O serviço não se destina a pessoas com menos de 18 anos; não é aberta qualquer conta ou encomenda a menor (CGV, art. 2.º).` },
        ],
      },
      {
        heading: `7. Durante quanto tempo conservamos os seus dados`,
        blocks: [
          { kind: 'p', value: `Os prazos abaixo distinguem as obrigações legais portuguesas dos prazos de conservação documentados pela Bellajour (RGPD, art. 5.1.e).` },
          { kind: 'table', columns: [`Dado`, `Conservação`], rows: [
            [`Fotografias carregadas + ficheiro HD`, `Eliminados 90 dias após a entrega (salvo opção futura de salvaguarda a longo prazo, que seria objeto de consentimento separado)`],
            [`Gabarito biométrico`, `Eliminado assim que o álbum estiver composto (ver §5.5)`],
            [`Conta de cliente`, `Eliminação 3 anos após a última compra ou contacto`],
            [`Encomendas, faturas e provas de validação`, `10 anos — obrigação contabilística e fiscal portuguesa (Código Comercial, art. 40.º; CIVA / SAF-T)`],
            [`Dados de marketing (potenciais clientes)`, `3 anos após o último contacto, ou até à retirada do consentimento`],
            [`Registos técnicos (logs)`, `12 meses`],
          ] },
        ],
      },
      {
        heading: `8. Cookies e comunicações de marketing`,
        blocks: [
          { kind: 'p', value: `8.1 Cookies (Diretiva ePrivacy; Lei 41/2004). O sítio utiliza:` },
          { kind: 'list', items: [
            `cookies estritamente necessários (sessão, carrinho) — sem necessidade de consentimento, mas declarados;`,
            `o pixel publicitário Meta (Meta Ads / Meta Pixel), cookie de marketing sujeito a consentimento prévio.`,
          ] },
          { kind: 'p', value: `O banner de consentimento permite aceitar, recusar ou personalizar com a mesma facilidade (sem dark patterns). O pixel Meta só é ativado após o seu consentimento. A prova da escolha (data, versão) é conservada e o consentimento é novamente solicitado periodicamente. Uma política de cookies detalhada está acessível através do banner.` },
          { kind: 'p', value: `8.2 Partilha com a Meta. Quando consente, certos dados de navegação são transmitidos à Meta Platforms Ireland para fins de medição e de direcionamento publicitário; a Meta pode transferi-los para os Estados Unidos, transferência coberta pelo Data Privacy Framework (DPF). Para estas operações, a Bellajour e a Meta podem agir como responsáveis conjuntos nos limites definidos pela Meta.` },
          { kind: 'p', value: `8.3 Newsletter. A inscrição na newsletter (gerida através da Brevo) assenta numa caixa de consentimento dedicada, não pré-selecionada; para um cliente existente, é possível um soft opt-in (Lei 41/2004, art. 13.º, n.º 2). Cada mensagem inclui uma ligação de cancelamento de subscrição simples.` },
        ],
      },
      {
        heading: `9. A quem os seus dados são transmitidos (subcontratantes e transferências)`,
        blocks: [
          { kind: 'p', value: `Cada subcontratante está vinculado por um contrato conforme ao art. 28.º do RGPD (DPA).` },
          { kind: 'table', columns: [`Subcontratante`, `Função`, `Localização`, `Transferência fora da UE`], rows: [
            [`AWS (Amazon Web Services)`, `Reconhecimento dos rostos (biometria)`, `UE — Irlanda (eu-west-1)`, `Não`],
            [`Stripe`, `Pagamento (certificado PCI-DSS)`, `UE / Estados Unidos`, `Sim — DPF / CCT`],
            [`InvoiceXpress`, `Faturação certificada`, `UE (Portugal)`, `Não`],
            [`Supabase`, `Base de dados / registos de prova`, `União Europeia`, `Não`],
            [`Cloudflare R2`, `Armazenamento das fotografias e do ficheiro HD`, `UE (restrição de jurisdição UE); Cloudflare, Inc. estabelecida nos Estados Unidos`, `Enquadrado DPF / CCT por precaução`],
            [`Vercel`, `Alojamento do sítio`, `Estados Unidos`, `Sim — DPF / CCT`],
            [`Brevo`, `E-mails transacionais e newsletter`, `UE (França)`, `Não`],
            [`Impressor / subcontratante de produção`, `Produção física dos álbuns`, `União Europeia`, `Não`],
            [`OpenAI`, `Análise e preparação da capa ilustrada`, `Estados Unidos`, `Sim — CCT`],
            [`Fal.ai`, `Geração da capa ilustrada`, `Estados Unidos`, `Sim — CCT`],
            [`Meta (Pixel / Ads)`, `Publicidade e medição`, `Meta Ireland / Estados Unidos`, `Sim — DPF (sob consentimento, §8)`],
          ] },
          { kind: 'p', value: `Transferências fora da UE. As transferências para os Estados Unidos (Stripe, Vercel, OpenAI, Fal.ai, Meta e, se aplicável, Cloudflare) estão cobertas pela decisão de adequação EU-US Data Privacy Framework (DPF) quando o prestador está certificado e, na sua falta ou em complemento, pelas Cláusulas Contratuais-Tipo (CCT) da Comissão Europeia. Os seus dados biométricos constituem exceção: são tratados integralmente na UE (AWS, Irlanda) e não são objeto de qualquer transferência para fora da UE (§5).` },
          { kind: 'p', value: `A Bellajour não vende os seus dados.` },
        ],
      },
      {
        heading: `10. Segurança (art. 32.º do RGPD)`,
        blocks: [
          { kind: 'p', value: `Cifragem em trânsito e em repouso, acesso restrito às fotografias e aos conteúdos, autenticação forte interna, política de habilitação de acessos, registo dos acessos e procedimento de notificação de violações de dados (CNPD no prazo de 72 horas; titulares dos dados em caso de risco elevado).` },
        ],
      },
      {
        heading: `11. Os seus direitos`,
        blocks: [
          { kind: 'p', value: `Dispõe dos direitos de acesso, retificação, apagamento, limitação, oposição (imediata para o marketing direto), portabilidade e retirada do consentimento a qualquer momento (nomeadamente quanto ao reconhecimento dos rostos e à newsletter).` },
          { kind: 'p', value: `Exercício: contact@bellajour.com (pode ser solicitada uma verificação de identidade); resposta no prazo de um mês (prorrogável até três). Quanto a menores fotografados, os direitos são exercidos pelos representantes legais.` },
          { kind: 'p', value: `Tem o direito de apresentar uma reclamação junto da CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt).` },
        ],
      },
      {
        heading: `12. Documentação interna e evolução`,
        blocks: [
          { kind: 'p', value: `A Bellajour mantém um registo das atividades de tratamento (art. 30.º) e realiza uma avaliação de impacto (AIPD/DPIA, art. 35.º) sobre o tratamento biométrico das fotografias.` },
          { kind: 'p', value: `Qualquer evolução futura — nomeadamente uma «memória dos rostos» (conservação dos gabaritos de uma encomenda para outra, para conforto da conta) ou uma aplicação móvel — será objeto de informação atualizada e, se for caso disso, de um novo consentimento específico antes da sua implementação.` },
          { kind: 'p', value: `O serviço é proposto no território da União Europeia; qualquer extensão fora da UE dará lugar a uma atualização da presente política.` },
        ],
      },
    ],
  },
  en: {
    title: `Privacy Policy`,
    lastUpdated: `Version 3.1 — Effective 13/06/2026`,
    intro: [
      `MISTÉRIO HERMÉTICO, LDA · NIPC 519443284`,
      `English translation for information only. The legally prevailing version is the Portuguese text; in the event of any discrepancy, the Portuguese text prevails. This policy complements the Terms and Conditions of Sale, to which it is linked (GDPR, Arts. 13 and 14).`,
    ],
    sections: [
      {
        heading: `1. Who is responsible for your data`,
        blocks: [
          { kind: 'p', value: `The data controller is MISTÉRIO HERMÉTICO, LDA (Bellajour brand), NIPC 519443284, with registered office at Beco de Santa Helena, 21A, 2.º, 1100-117 Lisbon, Portugal.` },
          { kind: 'p', value: `Bellajour is the controller for all of its operations, including the processing of the photos you send us to produce your album: it is Bellajour that decides the purposes and means. Bellajour is not the customer's processor.` },
          { kind: 'p', value: `Data protection contact: contact@bellajour.com.` },
          { kind: 'p', value: `Data Protection Officer (DPO): appointing a DPO is not mandatory at launch (no large-scale processing within the meaning of Article 37 GDPR). Any request regarding your data is handled via contact@bellajour.com.` },
        ],
      },
      {
        heading: `2. Your responsibilities for the content you entrust to us`,
        blocks: [
          { kind: 'p', value: `When you upload photos, you warrant that you hold all necessary rights: image rights of the persons depicted, parental authority or authorisations for photographed minors, and intellectual property rights. For purely personal use, your photos are in principle covered by the household exemption (Art. 2.2.c GDPR); but from the moment they are transmitted to Bellajour for production, it is Bellajour that processes the data and is accountable for it.` },
        ],
      },
      {
        heading: `3. What data, for what purposes, on what legal basis`,
        blocks: [
          { kind: 'table', columns: [`Data category`, `Purpose`, `Legal basis (GDPR)`], rows: [
            [`Name, email, postal address`, `Order, delivery, invoicing, customer service`, `Performance of the contract (Art. 6.1.b)`],
            [`Payment data (via Stripe)`, `Payment processing, fraud prevention`, `Performance of the contract / legal obligation (6.1.b / 6.1.c)`],
            [`Uploaded photos and content`, `Production of the album to your specifications (sorting, selection, composition, cover generation, HD file)`, `Performance of the contract (6.1.b)`],
            [`Biometric data (facial template computed from your photos)`, `Grouping photos by person and "Casting" step (ranking of people)`, `Explicit consent (Art. 9.2.a) — see §5`],
            [`Order history`, `Customer account, customer service, legal guarantees`, `Performance of the contract / legal obligation`],
            [`Invoicing data (name, address, tax number if provided, amount)`, `Issuance of certified invoices`, `Legal obligation (6.1.c)`],
            [`Order and validation evidence (version of the T&Cs accepted and timestamp of acceptance, timestamp of upload, timestamp and version of proof validation, Stripe transaction identifier)`, `Proof of consent, dispute management and accounting obligations`, `Legal obligation (6.1.c) and legitimate interest (6.1.f)`],
            [`Connection logs, IP address`, `Technical security, fraud prevention`, `Legitimate interest (6.1.f)`],
            [`Email (newsletter)`, `Marketing`, `Consent (dedicated checkbox) — or soft opt-in for an existing customer (see §8)`],
            [`Session data (cart)`, `Operation of the site`, `Technical necessity`],
            [`Marketing cookies / pixel (Meta)`, `Targeted advertising and ad measurement`, `Consent (Art. 6.1.a) — see §8`],
          ] },
        ],
      },
      {
        heading: `4. The automated processing of your photos (transparency)`,
        blocks: [
          { kind: 'p', value: `To compose your album, your photos undergo automated analysis: sorting, quality scoring, selection and layout. An illustrated cover is AI-generated in a style specific to the brand.` },
          { kind: 'p', value: `The legal basis is performance of the contract (Art. 6.1.b) for these operations, except for grouping by face, which relies on explicit consent (Art. 9 — see §5).` },
          { kind: 'p', value: `This composition does not produce legal or significant effects on you within the meaning of Art. 22 GDPR: there is human control and you validate the final proof.` },
          { kind: 'p', value: `AI Act compliance (Reg. (EU) 2024/1689): the engine is not, to date, a high-risk system; it carries out biometric categorisation subject to a transparency obligation, met by this information.` },
          { kind: 'p', value: `No reuse of your photos for other purposes (marketing, AI training, portfolio) without your separate, explicit and specific consent.` },
        ],
      },
      {
        heading: `5. Biometric data — facial recognition`,
        blocks: [
          { kind: 'p', value: `5.1 What we do. If you consent, Bellajour computes from your photos a facial template that allows photos to be grouped by person. This grouping feeds the "Casting" step (ranking and highlighting of key people in the album). This is processing of biometric data within the meaning of Article 9 GDPR.` },
          { kind: 'p', value: `5.2 Legal basis: your explicit consent (Art. 9.2.a), collected before the analysis via a dedicated checkbox, separate from the T&Cs and from proof validation.` },
          { kind: 'p', value: `5.3 Optional. This consent is freely given. If you refuse it, your album is composed normally, without the Casting step; no other feature is degraded. You may withdraw your consent at any time, without affecting the lawfulness of processing already carried out.` },
          { kind: 'p', value: `5.4 Processing carried out exclusively within the European Union. Facial recognition is performed via the Amazon Web Services (AWS) Rekognition service, in the EU Ireland region (eu-west-1). The computation of the facial template and its processing take place entirely within the European Union: no transfer of your biometric data takes place outside the EU.` },
          { kind: 'p', value: `5.5 Retention — deletion upon composition. The facial template is kept in a temporary processing space, deleted as soon as the composition of your album is complete. The template is not retained beyond that, and no database of templates or identities is built or reused from one order to another.` },
          { kind: 'p', value: `5.6 No nominative identification. Bellajour does not link any civil identity to faces; the grouping is purely technical and internal to your order.` },
        ],
      },
      {
        heading: `6. Potentially "revealing" photos and photos of children`,
        blocks: [
          { kind: 'p', value: `6.1 A photo may indirectly reveal an origin, beliefs, a health condition or an orientation. Outside facial recognition (§5), Bellajour processes this content on the basis of performance of the contract (Art. 6.1.b), without exploiting or inferring any sensitive attribute, and applies enhanced minimisation and restricted-access measures.` },
          { kind: 'p', value: `6.2 For photos of children provided by an adult: the customer warrants that they hold parental authority or the necessary authorisations; Bellajour applies enhanced security measures and retention periods (§7).` },
          { kind: 'p', value: `6.3 Minors. The service is not intended for persons under 18; no account or order is opened for a minor (T&Cs, Art. 2).` },
        ],
      },
      {
        heading: `7. How long we keep your data`,
        blocks: [
          { kind: 'p', value: `The periods below distinguish Portuguese legal obligations from retention choices documented by Bellajour (GDPR, Art. 5.1.e).` },
          { kind: 'table', columns: [`Data`, `Retention`], rows: [
            [`Uploaded photos + HD file`, `Deleted 90 days after delivery (save for a future long-term backup option, which would be subject to separate consent)`],
            [`Biometric template`, `Deleted as soon as the album is composed (see §5.5)`],
            [`Customer account`, `Deletion 3 years after the last purchase or contact`],
            [`Orders, invoices and validation evidence`, `10 years — Portuguese accounting and tax obligation (Commercial Code, Art. 40; CIVA / SAF-T)`],
            [`Marketing data (prospects)`, `3 years after the last contact, or until consent is withdrawn`],
            [`Technical logs`, `12 months`],
          ] },
        ],
      },
      {
        heading: `8. Cookies and marketing communications`,
        blocks: [
          { kind: 'p', value: `8.1 Cookies (ePrivacy Directive; Law 41/2004). The site uses:` },
          { kind: 'list', items: [
            `strictly necessary cookies (session, cart) — no consent required, but declared;`,
            `the Meta advertising pixel (Meta Ads / Meta Pixel), a marketing cookie subject to prior consent.`,
          ] },
          { kind: 'p', value: `The consent banner allows you to accept, refuse or customise with the same ease (no dark patterns). The Meta pixel is activated only after your consent. Proof of the choice (date, version) is kept and consent is re-requested periodically. A detailed cookie policy is accessible via the banner.` },
          { kind: 'p', value: `8.2 Sharing with Meta. When you consent, certain browsing data is transmitted to Meta Platforms Ireland for ad measurement and targeting purposes; Meta may transfer it to the United States, a transfer covered by the Data Privacy Framework (DPF). For these operations, Bellajour and Meta may act as joint controllers within the limits defined by Meta.` },
          { kind: 'p', value: `8.3 Newsletter. Subscription to the newsletter (managed via Brevo) relies on a dedicated consent checkbox, not pre-ticked; for an existing customer, a soft opt-in is possible (Law 41/2004, Art. 13(2)). Each message includes a simple unsubscribe link.` },
        ],
      },
      {
        heading: `9. To whom your data is transmitted (processors and transfers)`,
        blocks: [
          { kind: 'p', value: `Each processor is bound by a contract compliant with Art. 28 GDPR (DPA).` },
          { kind: 'table', columns: [`Processor`, `Role`, `Location`, `Transfer outside the EU`], rows: [
            [`AWS (Amazon Web Services)`, `Facial recognition (biometrics)`, `EU — Ireland (eu-west-1)`, `No`],
            [`Stripe`, `Payment (PCI-DSS certified)`, `EU / United States`, `Yes — DPF / SCC`],
            [`InvoiceXpress`, `Certified invoicing`, `EU (Portugal)`, `No`],
            [`Supabase`, `Database / evidence records`, `European Union`, `No`],
            [`Cloudflare R2`, `Storage of photos and HD file`, `EU (EU jurisdiction restriction); Cloudflare, Inc. established in the United States`, `Framed by DPF / SCC as a precaution`],
            [`Vercel`, `Website hosting`, `United States`, `Yes — DPF / SCC`],
            [`Brevo`, `Transactional emails and newsletter`, `EU (France)`, `No`],
            [`Printer / production subcontractor`, `Physical production of the albums`, `European Union`, `No`],
            [`OpenAI`, `Analysis and preparation of the illustrated cover`, `United States`, `Yes — SCC`],
            [`Fal.ai`, `Generation of the illustrated cover`, `United States`, `Yes — SCC`],
            [`Meta (Pixel / Ads)`, `Advertising and measurement`, `Meta Ireland / United States`, `Yes — DPF (subject to consent, §8)`],
          ] },
          { kind: 'p', value: `Transfers outside the EU. Transfers to the United States (Stripe, Vercel, OpenAI, Fal.ai, Meta, and where applicable Cloudflare) are covered by the EU-US Data Privacy Framework (DPF) adequacy decision where the provider is certified and, failing that or in addition, by the European Commission's Standard Contractual Clauses (SCC). Your biometric data is an exception: it is processed entirely within the EU (AWS, Ireland) and is not subject to any transfer outside the EU (§5).` },
          { kind: 'p', value: `Bellajour does not sell your data.` },
        ],
      },
      {
        heading: `10. Security (Art. 32 GDPR)`,
        blocks: [
          { kind: 'p', value: `Encryption in transit and at rest, restricted access to photos and content, internal strong authentication, access authorisation policy, access logging and a data breach notification procedure (CNPD within 72 hours; data subjects in the event of high risk).` },
        ],
      },
      {
        heading: `11. Your rights`,
        blocks: [
          { kind: 'p', value: `You have the rights of access, rectification, erasure, restriction, objection (immediate for direct marketing), portability and withdrawal of consent at any time (in particular for facial recognition and the newsletter).` },
          { kind: 'p', value: `Exercise: contact@bellajour.com (an identity check may be requested); response within one month (extendable up to three). For photographed minors, the rights are exercised by the legal representatives.` },
          { kind: 'p', value: `You have the right to lodge a complaint with the CNPD (Comissão Nacional de Proteção de Dados, www.cnpd.pt).` },
        ],
      },
      {
        heading: `12. Internal documentation and evolution`,
        blocks: [
          { kind: 'p', value: `Bellajour maintains a record of processing activities (Art. 30) and carries out a data protection impact assessment (DPIA, Art. 35) on the biometric processing of photos.` },
          { kind: 'p', value: `Any future evolution — in particular a "face memory" (retention of templates from one order to another for account convenience) or a mobile application — will be the subject of updated information and, where applicable, a new specific consent before its implementation.` },
          { kind: 'p', value: `The service is offered within the European Union; any extension outside the EU will give rise to an update of this policy.` },
        ],
      },
    ],
  },
}
