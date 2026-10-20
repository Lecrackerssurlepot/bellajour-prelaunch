# Conditions de l'Édition collective : projet

> **Statut : PROJET, À FAIRE RELIRE. Rien n'est en ligne, rien n'a été envoyé à un client.**
> Décision Q9 de Mathias (20/10/2026) : un document à part, « Conditions de l'Édition
> collective », avec l'accord sur les données en annexe, joint à chaque devis. Les CGV ne visent
> que le consommateur (art. 1.1) : aucun texte ne régit aujourd'hui la relation avec une
> entreprise, seul le devis signé.
>
> Écrit sur le ton des CGV, pour un client professionnel. **Chaque chiffre qui manque est
> [À FIXER]** : aucun n'est inventé. Ce qui vient du code est vérifié (les références sont dans
> les notes, jamais dans le texte destiné au client). Toute qualification juridique est une
> proposition, à faire relire. Le portugais fera foi s'il est retenu comme pour les CGV
> (article 18) : la version PT sera écrite avec la relecture.
>
> L'outil range déjà ces pièces : l'espace du client a un type de document « Conditions
> générales » et un type « Accord sur les données » (`src/lib/collectif/documents.ts:14-15`), que
> l'effacement des 30 jours ne touche pas (`retention.ts:175-179`).

---

**Conditions de l'Édition collective**

Version [À FIXER : numéro], en vigueur le [À FIXER : date]

MISTÉRIO HERMÉTICO, LDA · NIPC 519443284

## Préambule. Qui nous sommes

Bellajour est une marque exploitée par MISTÉRIO HERMÉTICO, LDA, société par quotas de droit
portugais, au capital de 1 000 € entièrement libéré, immatriculée à la Conservatória do Registo
Comercial d'Odivelas sous le NIPC 519443284, dont le siège est situé Beco de Santa Helena, 21A,
2.º, 1100-117 Lisbonne (freguesia de Santa Maria Maior), numéro d'identification TVA PT519443284
(ci-après « Bellajour », « nous »). Contact : contact@bellajour.com.

L'Édition collective est l'offre de Bellajour aux organisations : à partir des photos d'un
événement, réunies par ceux qui l'ont vécu, l'atelier compose et fait imprimer un ou plusieurs
magazines.

> Note : identité reprise du préambule des CGV (`cgv.ts`, FR, préambule), à jour au 16/09.

## Article 1. Objet et champ d'application

1.1 Les présentes conditions (« les Conditions ») régissent toute commande d'une Édition
collective passée par une entreprise, une école, une association ou toute autre organisation
agissant à des fins professionnelles (« le Client »). Elles ne s'appliquent pas aux consommateurs,
dont les commandes relèvent des Conditions Générales de Vente.

1.2 Une Édition collective (« l'édition ») comprend un ou plusieurs magazines d'un même
événement, décrits au devis : leur nombre, leur tirage, leur pagination, leur format, les réglages
de la collecte des photos et du bon à tirer, l'adresse et le délai de livraison, et le prix.

1.3 Le contrat se compose, par ordre de priorité décroissant : le devis signé ; l'accord de
sous-traitance des données personnelles (annexe A), pour tout ce qui touche aux données ; les
présentes Conditions. [À faire relire : l'ordre de priorité, et la place de l'annexe A.]

1.4 Le traitement des données personnelles est décrit à l'article 14, à l'annexe A et dans la
Politique de confidentialité (section « L'Édition collective »).

## Article 2. Commande

2.1 Formation du contrat. La commande est formée par la signature du devis par une personne
habilitée à engager le Client. Le devis signé vaut acceptation des présentes Conditions et de
l'annexe A, qui lui sont jointes.

2.2 Propositions complémentaires. Au cours de l'édition, l'atelier peut proposer une prestation
complémentaire dans l'espace du Client. Accepter une proposition dans l'espace informe l'atelier
de l'accord du Client pour la suite, sans l'engager : seul un nouveau devis signé engage le Client
et Bellajour.

2.3 Le responsable. Le Client désigne au devis une personne, « le responsable », qui le représente
auprès de l'atelier pendant l'édition : il règle la collecte, choisit le style, envoie les
contenus, relit et valide le bon à tirer. Ses choix dans l'espace engagent le Client pour
l'édition en cours, dans les limites du devis signé.

> Note : 2.2 reprend la décision D26 (20/10). 2.3 : à faire relire (portée du mandat du
> responsable, notamment pour la validation du bon à tirer, article 7.4).

## Article 3. L'espace en ligne et les liens

3.1 Après la signature, l'atelier ouvre l'édition et remet au Client trois liens personnels,
secrets, sans compte ni mot de passe :
- le lien du responsable, qui ouvre l'espace de l'édition ;
- le lien de l'équipe, qui ouvre le même espace en lecture seule, pour les collègues du
  responsable ;
- le lien des participants, par lequel les personnes invitées envoient leurs photos.

L'atelier peut aussi créer, à la demande du Client, des liens de contribution propres à un groupe
(une équipe, un bateau, une classe), chacun avec son nom et, le cas échéant, son propre nombre de
photos par personne.

3.2 Le Client garde ces liens confidentiels et ne les remet qu'aux personnes qu'il entend inviter.
Quiconque détient un lien en a l'usage : le Client répond de leur diffusion. Sur simple demande,
l'atelier remplace un lien ; l'ancien cesse alors de fonctionner, et avec le lien des
participants, les liens de contribution qui en dépendent.

3.3 Le lien de l'équipe ne permet aucune modification. Le lien du responsable peut exiger, pour
modifier l'espace depuis un appareil qu'il n'a pas encore utilisé, un code envoyé à son adresse
e-mail.

> Note : vérifié : trois tokens de 32 caractères par édition (`src/lib/collectif/CLAUDE.md`, « Les
> tokens ») ; l'équipe n'écrit rien (`droits.ts`) ; régénérer le lien des participants fait tomber
> les liens de contribution (T-196). 3.3, deuxième phrase : le code par mail existe mais il est
> COUPÉ (`COLLECTIF_CODE_APPAREIL` et `COLLECTIF_MAILS`), d'où « peut exiger ».

## Article 4. La collecte des photos

4.1 Période de collecte. Le lien des participants s'ouvre à la date d'ouverture prévue, ou dès sa
remise si aucune n'est prévue, et se ferme à la date de clôture fixée au devis ou dans l'espace. Le
responsable peut terminer la collecte plus tôt depuis l'espace : les liens des participants se
ferment alors. Seul l'atelier peut rouvrir une collecte, tant qu'aucun bon à tirer n'a été
publié.

4.2 Ce qui est accepté. Seules les photos sont acceptées ; les vidéos ne le sont pas.

4.3 Les participants. Avant son premier envoi, chaque participant indique son prénom, son nom et
son adresse e-mail, et coche le texte d'accord affiché sur la page, qui lui dit qui verra ses
photos et combien de temps elles sont gardées. Cet accord est enregistré, avec sa version et son
heure, sur chaque photo. Chaque participant voit les photos envoyées par le même lien, avec le
prénom de leur auteur ; il peut supprimer les photos envoyées depuis son téléphone tant que la
collecte est ouverte.

4.4 Ce que fait le responsable. Pendant la collecte, le responsable voit toutes les photos avec le
nom de qui les a envoyées. Il peut en présélectionner, en marquer « Ne pas publier », en supprimer
(elles passent 30 jours au plus dans une corbeille, où il peut les restaurer, puis sont
effacées), et
corriger le nom d'un participant.

4.5 Les participants mineurs. Le Client n'invite que des personnes de 18 ans ou plus, et le
confirme par écrit à l'atelier avant l'ouverture de la collecte. Aucune collecte n'est ouverte à
des participants mineurs [À FIXER après relecture juridique : le cadre d'une édition avec des
participants mineurs]. Des mineurs peuvent figurer sur les photos ; le Client garantit alors les
autorisations nécessaires (article 11.2).

> Note : 4.1 : `ouverture_le` facultatif (contrat, §1, « L'ouverture » ; exige la migration
> 20261023) ; D25 (le responsable termine la collecte) ; rouvrir sans tour publié (règle du 13/10).
> 4.2 : T-200 (« Photos seulement : les vidéos ne partent pas »). 4.3 : `accord.ts`, migration
> 20261020 ; l'album et la suppression par le téléphone : contrat, §1. 4.4 : corbeille de 30 jours
> (`corbeille.ts:52`). 4.5 : décision Q3.

## Article 5. Le nombre de photos

5.1 Le devis fixe, s'il y a lieu, un nombre maximal de photos par personne et un nombre total pour
l'édition : [À FIXER au devis]. Un nombre total laissé vide signifie qu'aucune limite ne s'applique
à l'édition entière ; sans nombre par personne, le lien général des participants reste fermé.

5.2 Dans la limite fixée par l'atelier, le responsable règle depuis l'espace le nombre de photos
par personne de chaque lien, ou le lève pour un lien. Au-delà, l'envoi est refusé et la page le
dit à la personne.

5.3 Le nombre de photos par personne se compte par personne quand elle s'est présentée par son
adresse, sinon par téléphone. C'est un frein, pas une garantie : l'adresse n'est pas vérifiée.

> Note : D27 (total vide = pas de limite), `plafonds.ts` (sans plafond par personne, le dépôt du
> participant est fermé), contrat §1 « Le plafond ». Aucun chiffre par défaut en base : tout
> chiffre vient du devis.

## Article 6. Le style et les contenus du Client

6.1 Le cas échéant, le responsable choisit dans l'espace le style de chaque magazine (palette,
typographies, doubles pages, couvertures aimées) et le valide. L'atelier harmonise l'ensemble et
le montre au bon à tirer.

6.2 L'atelier peut demander au Client des contenus (logo, programme, mot du dirigeant, liste des
participants…), nommés dans l'espace. Le Client les envoie avant [À FIXER : échéance, au devis].
Un contenu manquant à cette date peut retarder la composition, sans que ce retard soit imputable à
Bellajour.

> Note : le choix des styles est aujourd'hui fermé dans l'espace (`COLLECTIF_STYLES`, « Bientôt ») :
> d'où « le cas échéant ». Les demandes de contenus : T-191. La conséquence d'un contenu en retard
> est une proposition, à faire relire.

## Article 7. Composition et bon à tirer

7.1 Après la clôture, l'atelier compose chaque magazine à partir des photos reçues, du style
choisi et des contenus envoyés. Le choix des photos et la mise en page relèvent de l'atelier, qui
tient compte de la présélection et des photos marquées « Ne pas publier ».

7.2 Le bon à tirer. L'atelier publie dans l'espace une première version de chaque magazine (« un
tour »), avec le nombre de propositions de couverture prévu au devis. Le responsable la feuillette,
pose ses remarques page par page et choisit sa couverture. L'atelier publie ensuite un nouveau tour
qui répond aux remarques. Le devis fixe le nombre de tours compris : [À FIXER au devis] ; un tour
au-delà donne lieu à [À FIXER : un nouveau devis, ou un prix par tour].

7.3 Délai de relecture. Le responsable relit chaque tour dans un délai de [À FIXER] jours.
[À FIXER : ce qui se passe sans réponse dans ce délai.]

7.4 Validation. Le responsable valide le bon à tirer de chaque magazine dans l'espace, en deux
gestes, après avoir choisi une couverture ou indiqué « Sans préférence ». La validation est
définitive : elle vaut accord du Client sur le contenu du magazine (photos, textes, noms,
orthographe), confirme le tirage prévu et lance l'impression. Aucune modification n'est possible
après la validation ; une erreur présente dans le bon à tirer validé n'est pas un défaut au sens de
l'article 9.

7.5 Demande de modification. Jusqu'à la validation, le responsable peut demander une modification
qui dépasse les remarques d'un tour ; elle fait l'objet d'un échange avec l'atelier puis, s'il y a
lieu, d'une proposition complémentaire (article 2.2).

> Note : vérifié : publication d'un tour, notes, propositions de couverture sur le premier tour,
> validation en deux gestes qui exige une couverture ou « Sans préférence » et aucune note en
> brouillon (`src/lib/collectif/CLAUDE.md`, phase 5) ; « La validation est définitive. Elle
> confirme le tirage prévu et lance l'impression de ce magazine. » (`gestes.ts:123`). Aucun
> nombre de tours ni délai de relecture par défaut dans le code. Pour les particuliers, une
> maquette sans réponse est réputée validée après 7 jours (CGV, art. 4 bis.2) : rien de tel
> n'existe pour les éditions, d'où le [À FIXER] de 7.3.

## Article 8. Impression et livraison

8.1 Les magazines sont imprimés par un imprimeur partenaire [À FIXER : nom ou « établi dans
l'Union européenne », à confirmer], sans que cette sous-traitance n'altère la responsabilité de
Bellajour envers le Client.

8.2 Ils sont livrés en une fois à l'adresse indiquée au devis ou dans l'espace, dans un délai de
[À FIXER] à compter de la validation du dernier bon à tirer. L'espace indique le transporteur et le
numéro de suivi dès l'expédition.

8.3 Transfert des risques : [À FIXER avec la relecture : à la remise au transporteur ou à la
réception].

8.4 Réception. Le Client vérifie les magazines à leur réception et signale tout défaut apparent à
contact@bellajour.com, avec des photos, dans un délai de [À FIXER] jours.

8.5 La date de livraison est celle que l'atelier constate dans son outil. Elle fait courir le délai
d'effacement des photos (article 14.3).

> Note : aucune API d'imprimeur pour les éditions : l'atelier saisit le transporteur et le numéro
> (PRD §3, point 9 ; `livraison.ts`) puis « Marquer livrée » écrit `livraison.livree_le`
> (`gestes.ts:371`). Pour les particuliers, les CGV transfèrent le risque à la réception
> (art. 10.2, règle du consommateur) : pour un professionnel, la règle n'est pas imposée,
> d'où la question.

## Article 9. Défaut d'impression

9.1 Un magazine qui présente un défaut d'impression ou de façonnage imputable à Bellajour ou à son
imprimeur, signalé dans le délai de l'article 8.4 [À FIXER avec la relecture : délai pour un défaut
caché], est réimprimé aux frais de Bellajour, pour les exemplaires concernés.
[À FIXER avec la relecture : les autres remèdes, si la réimpression est impossible.]

9.2 Ne constituent pas un défaut : les écarts de couleur entre l'écran et le papier, dans les
tolérances normales du procédé ; les limites de rendu dues à une photo fournie (faible résolution,
compression, flou) ; tout élément présent dans le bon à tirer validé.

> Note : 9.2 reprend l'esprit de l'article 6.2 des CGV. La garantie de conformité du DL 84/2021
> (art. 9 des CGV) vise le consommateur : le régime d'un client professionnel est à faire relire.

## Article 10. Prix, facturation et paiement

10.1 Le prix est celui du devis signé, hors taxes. La TVA est appliquée selon les règles en vigueur
à la date de facturation [À FIXER avec le comptable : le régime d'un client professionnel établi
au Portugal, dans un autre État membre, ou hors de l'Union].

10.2 Échéances : [À FIXER : acompte à la signature, montant et échéance du solde].

10.3 Retard de paiement : [À FIXER avec la relecture : intérêts, indemnité, suspension]. Bellajour
peut suspendre l'impression tant qu'une échéance échue n'est pas payée.

10.4 Les factures sont émises par un logiciel de facturation certifié et déposées dans l'espace du
Client.

> Note : l'échéance de la facture de solde est une décision ouverte (PRD §12.6). 10.4 : les
> factures sont un type de document de l'espace (`documents.ts:13`) ; leur émission se fait hors de
> l'outil des éditions (aucune trace d'InvoiceXpress dans `src/lib/collectif`) : à confirmer par
> Mathias et Louis.

## Article 11. Propriété et droits sur les photos et les contenus

11.1 Les photos restent la propriété de leurs auteurs, et les contenus (logo, programme, textes)
celle du Client ou de leurs titulaires. Bellajour ne reçoit que le droit de les reproduire et de
les adapter pour composer, faire imprimer et livrer les magazines de l'édition, et pour les
réimprimer à la demande du Client (article 12). Bellajour n'en fait aucun autre usage
(prospection, portfolio, entraînement d'un modèle d'intelligence artificielle) sans un accord
écrit et séparé [À faire relire : l'accord du Client suffit-il, ou faut-il aussi celui des
auteurs et des personnes photographiées ?].

11.2 Le Client garantit que les photos et contenus envoyés pour l'édition peuvent l'être : droits
d'auteur, droit à l'image des personnes photographiées, et, pour les mineurs photographiés,
autorisation de leurs représentants légaux. Chaque participant le confirme aussi en cochant le
texte d'accord. Le Client garantit Bellajour contre toute réclamation d'un tiers portant sur ces
photos et contenus.

11.3 Les styles, les gabarits, les typographies, la mise en page et les couvertures créées par
l'atelier restent la propriété de Bellajour. Le Client dispose librement des magazines imprimés
qui lui sont livrés. [À FIXER : remise au Client d'une version numérique du magazine, et ce qu'il
peut en faire (diffusion interne, publication).]

11.4 Bellajour ne cite le Client comme référence, et ne montre un magazine de l'édition, qu'avec
son accord écrit.

> Note : le fichier source du magazine n'est jamais servi au client aujourd'hui (le PDF d'un tour
> et ses gris ne sont jamais servis, `src/lib/collectif/CLAUDE.md`, phase 5) : d'où le [À FIXER]
> de 11.3. 11.1 et 11.4 traduisent la décision Q5 (« on ne l'utilise pas sans leur accord »).

## Article 12. Réimpression

12.1 Bellajour conserve le fichier du magazine terminé pendant 10 ans à
compter de la livraison, pour permettre au Client de commander de nouveaux exemplaires. Une
réimpression fait l'objet d'un nouveau devis. Ce fichier n'est jamais réutilisé à une autre fin
sans l'accord du Client.

12.2 Les photos étant effacées 30 jours après la livraison (article 14.3), une réimpression
reproduit le magazine tel qu'il a été validé ; il ne peut plus être modifié.

12.3 Le Client peut demander à tout moment que ce fichier soit effacé avant la fin de cette durée ;
aucune réimpression n'est alors possible.

> Note : décision Q5. 12.3 est une proposition (le droit du responsable du traitement de demander
> l'effacement, annexe A, article 10).

## Article 13. Responsabilité

13.1 Bellajour répond des dommages directs et prévisibles résultant d'un manquement prouvé à ses
obligations, dans la limite de [À FIXER avec la relecture : plafond].

13.2 Dans les limites permises par la loi, Bellajour n'est pas responsable des dommages indirects
(perte d'exploitation, perte de données, manque à gagner, atteinte à l'image). Ces limites ne
s'appliquent pas en cas de dol ou de faute lourde, ni aux dommages corporels.

13.3 Bellajour n'est pas un service d'archivage : les photos sont effacées après la livraison
(article 14.3). Le Client et les participants gardent leurs originaux.

13.4 Force majeure. Bellajour n'est pas responsable d'un manquement dû à un événement extérieur,
imprévisible et irrésistible. Les délais sont suspendus pendant l'empêchement ; s'il dure plus de
[À FIXER], chaque partie peut résoudre la commande pour la partie non exécutée. La défaillance de
l'imprimeur choisi par Bellajour n'est pas un cas de force majeure.

> Note : 13.2 et 13.4 reprennent les articles 11.2 et 12.1 des CGV ; les CGV disent 60 jours pour
> la force majeure, chiffre pensé pour un consommateur, non repris d'office.

## Article 14. Données personnelles

14.1 Pour les photos des participants, leurs noms, leurs adresses e-mail et les informations qui
accompagnent les photos, le Client est responsable du traitement et Bellajour son sous-traitant
(RGPD, art. 28). Leurs obligations sont fixées par l'accord de sous-traitance de l'annexe A.

14.2 Pour ses propres données de gestion (le contact du responsable, les échanges, la facturation,
le journal des actions et la sécurité de ses services), Bellajour est responsable du traitement,
comme le décrit sa Politique de confidentialité.

14.3 Durées. Les photos et leurs informations, les pages du bon à tirer, les versions
intermédiaires du magazine, les contenus envoyés et les pièces jointes sont effacés 30 jours après
la livraison, avec les adresses e-mail des participants. Restent le fichier du magazine terminé
(article 12), la preuve de l'accord de chaque participant, et les pièces que la loi oblige à
garder. Le détail est à l'article 10 de l'annexe A.

14.4 Le Client informe les personnes qu'il invite. Le texte d'accord de la page de dépôt et la
section « L'Édition collective » de la Politique de confidentialité l'y aident ; ils ne le
dispensent pas de son obligation.

> Note : décision Q8 (hypothèse A) et Q4. 14.3 n'est vrai qu'une fois l'effacement en service
> (`A-RELIRE.md`, partie C).

## Article 15. Confidentialité

Chaque partie garde confidentielles les informations non publiques reçues de l'autre pour
l'édition, pendant l'édition et [À FIXER] après sa fin. Les liens de l'article 3 sont des
informations confidentielles.

## Article 16. Durée et fin

16.1 Le contrat court de la signature du devis jusqu'à la livraison du dernier magazine, et, pour
la conservation du fichier du magazine terminé, jusqu'à la fin de la durée de l'article 12.

16.2 Annulation par le Client avant la validation du bon à tirer : [À FIXER avec la relecture : ce
qui reste dû (travail déjà réalisé, acompte)]. Après la validation, le prix des magazines validés
reste dû en entier.

16.3 Archiver une édition dans l'outil de l'atelier ne prolonge aucune durée de conservation.

> Note : l'archive est un marqueur, rien n'est effacé ni prolongé (`gestes.ts:160`,
> `retention.ts` : « l'archive n'épargne rien »).

## Article 17. Droit applicable et litiges

[À FIXER avec la relecture : le droit applicable et la juridiction compétente.]

> Note : les CGV retiennent le droit portugais, sous réserve des règles protectrices du
> consommateur (art. 13.3) ; pour un client professionnel, le choix est libre et se fait avec la
> relecture.

## Article 18. Langue

[À FIXER avec la relecture : la version qui fait foi. Les CGV font foi en portugais ; un client
français signera probablement la version française.]

## Annexes

- **Annexe A** : accord de sous-traitance des données personnelles (`accord-sous-traitance.md`).
- **Annexe B** : liste des sous-traitants ultérieurs (dans l'annexe A, article 8).
