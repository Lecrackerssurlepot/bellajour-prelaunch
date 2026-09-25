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
ne rattrape pas, on empêche. Deux voies, et **la première question est de savoir laquelle Stripe
permet** :
- si le formulaire d'adresse de Stripe Checkout propose déjà l'autocomplétion Google Places sur
  les pays qu'on sert, il n'y a peut-être rien à écrire : à vérifier dans le tableau de bord
  Stripe avant tout code ;
- sinon, collecter l'adresse **chez nous** (bon de commande de `/numero`, avec
  `geocode/autocomplete` de Geoapify) et la passer à Stripe en `shipping_address_collection`
  pré-remplie. Plus de travail, et ça déplace une responsabilité : à peser.

⚠️ Dans les deux cas, le client doit pouvoir **passer outre** la suggestion. Une adresse réelle
absente d'une base de géocodage existe (lotissement neuf, lieu-dit, boîte postale) : une saisie
qui refuse ce que le client sait vrai est pire que le défaut qu'elle corrige.

## Ce qu'il reste à trancher
- Ce que Stripe propose déjà (à regarder avant d'écrire une ligne).
- Le quota Geoapify : le plan gratuit sert déjà les lieux des photos (un appel par LIEU, jamais
  par photo, T-123). Une autocomplétion tape beaucoup plus — compter avant de brancher.
- Faut-il géocoder les adresses des dossiers DÉJÀ payés et pas encore imprimés, en lecture seule,
  pour voir combien d'autres Eloïse dorment en base ?

## Lié
Le geste du 25/09 est au journal du dossier d'Eloïse (`adresse_corrigee`), avec la graphie
d'avant, celle d'après, et la preuve Geoapify des deux.
