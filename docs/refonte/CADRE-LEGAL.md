# Cadre légal du site

Écrit le 21/11/2026 pour la refonte. **Ce n'est pas un avis juridique** : c'est la liste de contrôle
qu'une maquette doit respecter, avec la source de chaque règle. Elle est à faire relire par un
juriste avant la mise en ligne. Aucun texte légal (CGV, confidentialité, mentions) ne change sans
l'accord explicite de Mathias (socle, interdit nº2).

## Qui vend à qui

Bellajour est une société portugaise (les CGV citent le droit portugais, DL 109-G/2021 pour la
directive Omnibus) qui vend surtout à des consommateurs en France. Quand un site vise un pays, le
consommateur garde la protection impérative de son pays (règlement Rome I, art. 6) : **on respecte
le droit portugais ET le Code de la consommation français**. Les deux transposent les mêmes
directives, les différences sont surtout de forme.

## La liste

| # | Obligation | Source | Ce que le site doit montrer | État au 21/11 |
|---|---|---|---|---|
| 1 | Informations avant la commande : identité, adresse, contact, caractéristiques, prix TTC, frais de port, délai de livraison, moyens de paiement, garanties | directive 2011/83/UE art. 6 ; C. conso L111-1, L221-5 | tout cela sur la page produit ou au récapitulatif, **avant** le bouton de paiement | à auditer sur le tunnel |
| 2 | Le bouton final dit clairement qu'on s'engage à payer | directive 2011/83/UE art. 8(2) ; C. conso L221-14 | « Commander et payer » ou « Payer 40 € » ; jamais « Continuer » ou « Valider » | à auditer |
| 3 | Pas de droit de rétractation pour un bien personnalisé, **et il faut le dire** avant la commande | directive 2011/83/UE art. 16 c) ; C. conso L221-28 3° | une ligne claire près du prix et au récapitulatif | à auditer ; **la carte cadeau n'est pas personnalisée au même titre : la question est ouverte** |
| 4 | Prix toujours TTC, frais de port annoncés avant l'engagement | directive 98/6/CE ; C. conso L112-1 | « Dès 25 € TTC France, hors livraison » (déjà en place, `content.ts`) | en place |
| 5 | **Annonce de réduction : le prix de référence est le plus bas des 30 derniers jours** | directive Omnibus 2019/2161 ; DL 109-G/2021 ; C. conso L112-1-1 | tout « −40 % » ou prix barré montre le prix de référence exact | CGV art. 4.6 l'écrit ; **les offres de Noël −40 % / −20 % sur le 2ᵉ magazine sont des offres de quantité : faire confirmer par le juriste qu'elles sortent bien de cette règle** |
| 6 | Avis clients : dire s'ils sont vérifiés et comment ; aucun faux avis, aucun avis acheté | directive Omnibus ; directive 2005/29/CE annexe I, points 23 ter et quater ; C. conso L111-7-2 | sous les avis : « Avis de clients ayant commandé, vérifiés par … » | pas d'avis sur le site aujourd'hui |
| 7 | Pas de fausse urgence ni de fausse rareté | directive 2005/29/CE annexe I point 7 ; C. conso L121-4 | un compte à rebours ou « plus que N places » doit être **vrai** et calculé | le bandeau de Noël affiche des places (`noel/places.ts`) : à confirmer qu'elles sont réelles |
| 8 | Pas de pièges d'interface : case précochée, option payante ajoutée d'office, résiliation plus dure que l'achat | directive 2011/83/UE art. 22 ; directive 2005/29/CE | l'upsell carte au paiement reste un choix actif, jamais coché par défaut | à auditer |
| 9 | Garantie légale de conformité de deux ans, avec l'encadré imposé en France | directive 2019/771 ; C. conso L217-3 s., D211-2 | encadré dans les CGV, rappel court sur `/magazine` | CGV art. 9 ; **l'encadré français à vérifier mot pour mot** |
| 10 | Médiateur de la consommation proposé | C. conso L612-1 ; Lei 144/2015 (PT) | nom et lien dans les CGV et le pied de page | à auditer |
| 11 | Livre de réclamations électronique (Portugal) | DL 156/2005 modifié | lien `livroreclamacoes.pt` en pied de page | écrit dans les mentions ; **le pied de page refondu doit le garder** |
| 12 | Mentions légales : raison sociale, siège, NIF / TVA, capital, contact, hébergeur | DL 7/2004 (PT) ; LCEN art. 6 (FR) | une page, liée en pied de page | en place |
| 13 | Confidentialité : finalités, bases légales, durées, sous-traitants, transferts hors UE, droits | RGPD art. 13 | une politique **exacte** | **périmée** : elle décrit encore une reconnaissance des visages, des données biométriques et une « couverture illustrée » (OpenAI, Fal.ai), abandonnées les 09/11 et 14/11 ; elle ne cite pas Geoapify. Mise à jour sur accord de Mathias |
| 14 | Traceurs : consentement avant tout traceur non essentiel ; refuser aussi simple qu'accepter | directive ePrivacy art. 5(3) ; lignes CNIL 2020 | bandeau seulement si on ajoute un pixel publicitaire ou une mesure d'audience non exemptée | aucun traceur trouvé dans le code au 21/11 ; **ajouter un pixel Meta ou TikTok pour la pub imposera le bandeau** |
| 15 | Mails commerciaux : accord préalable, sauf client pour un produit analogue ; désinscription dans chaque mail | directive ePrivacy art. 13 ; CPCE L34-5 | case non cochée à l'inscription newsletter | à auditer |
| 16 | Droit à l'image : montrer le magazine d'un client sur le site ou sur Instagram | RGPD ; C. civ. art. 9 | **accord écrit du client et des personnes reconnaissables**, sinon nos propres numéros | à prévoir pour les prises de vue |
| 17 | Droits sur les visuels et les polices | droit d'auteur | images à nous ou sous licence ; police dont la licence permet le web | leçons du 14/09 (masters Vogue, Tintin) et des typos (76 fichiers sur 136 interdits) |
| 18 | Ne pas tromper sur la fabrication | directive 2005/29/CE art. 6 | « l'atelier compose » doit rester vrai : si une machine propose la mise en page, ne pas écrire « fait à la main » | à relire sur chaque texte de la refonte |
| 19 | Accessibilité numérique | directive 2019/882 (en vigueur au 28/06/2025) | contrastes, clavier, textes alternatifs, mouvement coupable | les micro-entreprises (moins de 10 personnes et 2 M€) en sont exemptées ; on l'applique quand même comme règle de qualité |
| 20 | Langue | loi Toubon (FR) | tout le contractuel en français pour la France | en place |

## Ce que la refonte ne doit pas casser

- Le pied de page garde : CGV, confidentialité, mentions légales, livraison, remboursement, Livre
  de réclamations, contact.
- Le prix garde sa réserve à côté de lui (« TTC France, hors livraison »).
- Une offre de saison s'écrit dans la section prix, avec sa date de fin réelle et ses conditions.
