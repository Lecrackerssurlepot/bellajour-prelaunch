import type { LocalizedDoc } from '../types'

/* POLITIQUE DE CONFIDENTIALITÉ — transcription fidèle de
   legal-source/confidentialite/FR/…docx (v3.1). Remplace l'ancien contenu
   placeholder de src/app/confidentialite/page.tsx.
   EN / PT : sources présentes dans legal-source/confidentialite/{EN,PT} — à brancher plus tard. */

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
}
