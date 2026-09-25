---
id: T-138
titre: Le client tape son adresse en clair et personne ne la vérifie avant qu'elle parte chez l'imprimeur
etat: nouveau
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-09-25
---
## Ce que Mathias a dit
« Crée un ticket pour que quand le client met l'adresse, il ait des propositions de localisation
pour ne pas pouvoir se tromper. » Dit juste après avoir fait corriger à la main l'adresse
d'Eloïse, quinze minutes avant de lancer sa commande d'impression.

## Ce que j'ai vérifié
- L'adresse de livraison vient **de Stripe Checkout et de nulle part ailleurs** (PRD §9, rappelé
  dans `transition/route.ts`). C'est le formulaire d'adresse de Stripe que le client remplit, en
  champs libres.
- `adresseCloudprinter` (impression.ts) ne contrôle que la **présence** des champs (nom, rue,
  code postal, ville, pays, téléphone) : `adr.ok` est vrai dès qu'ils existent. Rien ne juge
  qu'ils désignent un lieu réel.
- Conséquence mesurée sur le dossier d'Eloïse (25/09) : « Rua antero de **quantal** n3,
  1150-041 Lisbonne ». Passé chez Geoapify, cette graphie rend **confiance 0**, et les deux
  seuls résultats sont à Almada et Amora, deux communes différentes. La rue s'écrit
  « Rua Antero de Quental » ; avec la bonne graphie et le même code postal, Geoapify rend
  **confiance 1**.
- Autrement dit, l'erreur était détectable automatiquement, avec une clé que nous possédons
  déjà : `GEOAPIFY_API_KEY` est en production depuis T-123 (métadonnées des photos) et
  `geocodage.ts` sait déjà distinguer « rien là » de « pas répondu ».
- Elle n'a été vue que parce qu'un humain a lu l'adresse ligne à ligne avant de commander. Sur
  un dossier où personne ne regarde, le colis part vers un lieu qui n'existe pas.

## Ce que je propose
Deux gestes, du moins cher au plus complet.

**1. Le filet, côté atelier (rien à changer dans le tunnel).** Au dry-run d'`envoyer_impression`,
géocoder l'adresse et afficher le verdict dans le panneau « Avant de confirmer », à côté de la
ligne Livraison : confiance haute, rien à dire ; confiance basse ou nulle, une phrase qui le dit
et propose la graphie trouvée. **Une REMARQUE, jamais un refus** — même règle que le contrôle
des bords : Geoapify ne connaît pas tout, et un refus finirait contourné en SQL. Best-effort
strict : Geoapify muet ne bloque rien (le patron de `canvaDistant.ts`).

**2. La suggestion à la saisie.** C'est ce que Mathias demande, et c'est le vrai correctif : on
ne rattrape pas, on empêche.

⚠️ **TRANCHÉ LE 25/09, ET C'EST UNE MAUVAISE NOUVELLE : Stripe ne couvre pas le Portugal.**
La question « Stripe le fait-il déjà ? » est réglée, et la réponse ferme la voie la plus simple.
L'autocomplétion d'adresse de Stripe s'appuie sur Google Places et n'est proposée que pour
26 pays (doc officielle, liste relevée le 25/09) : AU, BE, BR, CA, CH, DE, ES, FR, GB, IE, IN,
IT, JP, MX, MY, NL, NO, NZ, PH, PL, RU, SE, SG, TR, US, ZA.

Confronté à nos 32 destinations (`PAYS_LIVRAISON`) :
- **14 couverts** : Belgique, France, Allemagne, Irlande, Italie, Pays-Bas, Pologne, Espagne,
  Suède, Royaume-Uni, Suisse, Norvège, États-Unis, Brésil ;
- **18 NON couverts** : Autriche, Bulgarie, Croatie, Chypre, Tchéquie, Danemark, Estonie,
  Finlande, Grèce, Hongrie, Lettonie, Lituanie, Luxembourg, Malte, **Portugal**, Roumanie,
  Slovaquie, Slovénie.

Autrement dit : **même en passant à l'Address Element de Stripe, l'adresse d'Eloïse n'aurait pas
été autocomplétée.** Le cas qui a ouvert ce ticket est précisément un de ceux que Stripe ne sait
pas traiter. Et plus de la moitié de nos destinations sont dans le même cas.

Reste donc une seule voie sérieuse : collecter l'adresse **chez nous**, au bon de commande de
`/numero`, avec `geocode/autocomplete` de Geoapify, et la passer à Stripe pré-remplie. C'est
plus de travail et ça déplace une responsabilité, mais c'est la seule qui couvre le Portugal,
et Geoapify a fait la preuve qu'il le couvre (confiance 1 sur la bonne graphie, 0 sur la
mauvaise, mesuré le 25/09 sur cette adresse exacte).

⚠️ Dans les deux cas, le client doit pouvoir **passer outre** la suggestion. Une adresse réelle
absente d'une base de géocodage existe (lotissement neuf, lieu-dit, boîte postale) : une saisie
qui refuse ce que le client sait vrai est pire que le défaut qu'elle corrige.

## Ce qu'il reste à trancher
- ~~Ce que Stripe propose déjà~~ — **réglé le 25/09 : 18 de nos 32 destinations, Portugal
  compris, ne sont pas autocomplétées par Stripe.** La voie « ne rien écrire » est fermée.
- **Collecter l'adresse chez nous change le tunnel de paiement.** Aujourd'hui elle vient de
  Stripe Checkout et de nulle part ailleurs (PRD §9), et tout le code en dépend
  (`adresseCloudprinter`, le webhook, la page cliente). La déplacer est une décision de produit,
  pas un détail technique : à poser à Mathias avant d'écrire.
- Le quota Geoapify : le plan gratuit sert déjà les lieux des photos (un appel par LIEU, jamais
  par photo, T-123). Une autocomplétion tape beaucoup plus, une requête par frappe si on n'y
  prend pas garde — compter, et débouncer, avant de brancher.
- **Le filet côté atelier (geste 1) ne dépend d'aucune de ces décisions** et aurait suffi à
  attraper Eloïse. C'est ce qu'il faut faire en premier.
- Faut-il géocoder les adresses des dossiers DÉJÀ payés et pas encore imprimés, en lecture seule,
  pour voir combien d'autres Eloïse dorment en base ?

## Lié
Le geste du 25/09 est au journal du dossier d'Eloïse (`adresse_corrigee`), avec la graphie
d'avant, celle d'après, et la preuve Geoapify des deux.
